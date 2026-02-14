const { getSpreadsheetMetadata, getSheetValues } = require('./sheetService');
const { ensureTableExists, insertNewRecords, logSync, updateSyncLog, truncateTable, mergeTempToLeads, getStats, sanitizeIdentifier } = require('./dbService');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

// Concurrency Lock
let isSyncing = false;

// Spreadsheet ID from Env or hardcoded fallback
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

/**
 * Helper for throttle/quota management
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const processSheetSync = async (sheet, batchId, triggerType, currentSyncTime) => {
    const sheetTitle = sheet.properties.title;
    const targetTableName = 'leads';
    // Unique temp table for this specific sheet execution
    // Postgres has a 63-byte limit for identifiers. 
    // "temp_" (5) + sanitized title (max 40) + "_" (1) + batch suffix (8) = 54 chars max
    const safeSheetPart = sanitizeIdentifier(sheetTitle).substring(0, 40);
    const tempTableName = `temp_${safeSheetPart}_${batchId.replace(/-/g, '').substring(0, 8)}`;

    let logId = null;
    try {
        // Log START as Pending
        logId = await logSync(sheetTitle, targetTableName, {}, batchId, 'PENDING', triggerType);

        // Read Data
        const data = await getSheetValues(SPREADSHEET_ID, `'${sheetTitle}'!A:ZZ`);

        if (!data || data.length === 0) {
            await updateSyncLog(logId, {}, 'EMPTY');
            return { sheet: sheetTitle, status: 'EMPTY' };
        }

        const headers = data[0];
        const rows = data.slice(1);

        if (headers.length === 0) return { sheet: sheetTitle, status: 'EMPTY' };

        // --- DATA VALIDATION ---
        const createdTimeIndex = headers.findIndex(h => sanitizeIdentifier(h) === 'created_time');
        const validatedRows = [];
        let skippedCount = 0;

        for (const row of rows) {
            if (createdTimeIndex !== -1 && row[createdTimeIndex]) {
                try {
                    const rawDate = row[createdTimeIndex].toString().trim();
                    const createdDate = new Date(rawDate);

                    if (isNaN(createdDate.getTime())) {
                        skippedCount++;
                        continue;
                    }

                    // Rule 1: Convert to UTC string
                    const createdUtcStr = createdDate.toISOString();
                    row[createdTimeIndex] = createdUtcStr;

                    // Rule 2: sync_time strictly greater than created_time
                    if (currentSyncTime <= createdDate) {
                        skippedCount++;
                        continue;
                    }
                } catch (err) {
                    skippedCount++;
                    continue;
                }
            }
            validatedRows.push(row);
        }

        if (skippedCount > 0) {
            console.log(`⚠️ Skipped ${skippedCount} records in sheet "${sheetTitle}"`);
        }

        // 1. Prepare Temp Table
        await db.query(`DROP TABLE IF EXISTS "${tempTableName}"`);
        await ensureTableExists(tempTableName, headers);

        // 2. Insert Records into temp
        const insertedTempCount = await insertNewRecords(tempTableName, headers, validatedRows, batchId);

        // 3. Merge temp -> Leads
        await ensureTableExists(targetTableName, headers);
        const mergeResult = await mergeTempToLeads(tempTableName, targetTableName);

        // 4. Update Log
        await updateSyncLog(
            logId,
            {
                tempInserted: insertedTempCount,
                leadsDeleted: mergeResult.deletedCount,
                leadsInserted: mergeResult.insertedCount
            },
            mergeResult.success ? 'SUCCESS' : 'FAILED'
        );

        console.log(`Synced ${sheetTitle} (+${mergeResult.insertedCount} records).`);

        return {
            sheet: sheetTitle,
            table: targetTableName,
            found: insertedTempCount,
            inserted: mergeResult.insertedCount,
            status: 'SUCCESS'
        };

    } catch (sheetError) {
        console.error(`❌ Error syncing sheet "${sheetTitle}":`, sheetError.message);
        if (logId) await updateSyncLog(logId, {}, 'FAILED');
        return { sheet: sheetTitle, status: 'FAILED', error: sheetError.message };
    } finally {
        try { await db.query(`DROP TABLE IF EXISTS "${tempTableName}"`); } catch (e) { }
    }
};

const syncSheetToDb = async (triggerType = 'MANUAL') => {
    if (isSyncing) {
        console.warn('⚠️ Sync already in progress. Skipping this request.');
        throw new Error('SYNC_IN_PROGRESS');
    }

    isSyncing = true;
    try {
        console.log(`🔒 Acquired Sync Lock. Trigger: ${triggerType}`);

        // Step 1: Connection Check
        const client = await db.connect();
        client.release();

        const stats = await getStats();
        const lastSyncTimestamp = stats.last_sync ? new Date(stats.last_sync.sync_timestamp) : new Date(0);
        const currentSyncTime = new Date();

        if (currentSyncTime <= lastSyncTimestamp) {
            throw new Error('BACKWARD_OR_DUPLICATE_TIME_SYNC');
        }

        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        const sheets = meta.sheets;
        const batchId = uuidv4();
        const results = [];

        console.log(`Starting sync for Spreadsheet: ${meta.properties.title} (Batch: ${batchId})`);

        // Process in batches of 3
        const BATCH_SIZE = 3;
        for (let i = 0; i < sheets.length; i += BATCH_SIZE) {
            const batch = sheets.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sheets.length / BATCH_SIZE)} (Sheets: ${batch.map(s => s.properties.title).join(', ')})`);

            const batchResults = await Promise.all(
                batch.map(sheet => processSheetSync(sheet, batchId, triggerType, currentSyncTime))
            );
            results.push(...batchResults);

            // Small delay between batches to respect rate limits
            if (i + BATCH_SIZE < sheets.length) await sleep(1000);
        }

        return { batchId, results };

    } catch (error) {
        console.error('Sync Error:', error);
        throw error;
    } finally {
        isSyncing = false;
        console.log('🔓 Released Sync Lock.');
    }
};

module.exports = { syncSheetToDb };
