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

const syncSheetToDb = async (triggerType = 'MANUAL') => {
    if (isSyncing) {
        console.warn('⚠️ Sync already in progress. Skipping this request.');
        throw new Error('SYNC_IN_PROGRESS');
    }

    isSyncing = true;
    try {
        console.log(`🔒 Acquired Sync Lock. Trigger: ${triggerType}`);

        // Step 1: Connection Check
        try {
            const client = await db.connect();
            console.log('✅ Step 1: Database connection verified.');
            client.release();
        } catch (dbError) {
            console.error('❌ Step 1: Database connection failed. Stopping sync.', dbError);
            throw new Error('DATABASE_CONNECTION_FAILED');
        }

        // Fetch last sync for validation (Rule 3)
        const stats = await getStats();
        const lastSyncTimestamp = stats.last_sync ? new Date(stats.last_sync.sync_timestamp) : new Date(0);
        const currentSyncTime = new Date();

        if (currentSyncTime <= lastSyncTimestamp) {
            console.error(`❌ Sync aborted: current sync time (${currentSyncTime.toISOString()}) is not strictly greater than previous sync time (${lastSyncTimestamp.toISOString()}).`);
            throw new Error('BACKWARD_OR_DUPLICATE_TIME_SYNC');
        }

        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        const sheets = meta.sheets;
        const batchId = uuidv4();
        const results = [];

        console.log(`Starting sync for Spreadsheet: ${meta.properties.title} (Batch: ${batchId})`);

        const targetTableName = 'leads';
        const batchTempSuffix = batchId.replace(/-/g, '_');
        const tempTableName = `temp_leads_${batchTempSuffix}`;

        for (const sheet of sheets) {
            const sheetTitle = sheet.properties.title;

            // ⚠️ CRITICAL: Small delay to avoid Google Sheets API Rate Limits (429)
            // Google Tier 1 quota is ~60-100 requests per minute.
            await sleep(1500);

            let logId = null;
            try {
                // Log START as Pending so user sees it in history immediately
                logId = await logSync(sheetTitle, targetTableName, {}, batchId, 'PENDING', triggerType);

                // Read Data
                const data = await getSheetValues(SPREADSHEET_ID, `'${sheetTitle}'!A:ZZ`);

                if (!data || data.length === 0) {
                    await updateSyncLog(logId, {}, 'EMPTY');
                    results.push({ sheet: sheetTitle, status: 'EMPTY' });
                    continue;
                }

                const headers = data[0];
                const rows = data.slice(1);

                if (headers.length === 0) continue;

                // --- DATA VALIDATION (Rules 1, 2, 4, 5) ---
                const createdTimeIndex = headers.findIndex(h => sanitizeIdentifier(h) === 'created_time');
                const validatedRows = [];
                let skippedCount = 0;

                for (const row of rows) {
                    if (createdTimeIndex !== -1 && row[createdTimeIndex]) {
                        try {
                            const rawDate = row[createdTimeIndex].toString().trim();
                            const createdDate = new Date(rawDate);

                            if (isNaN(createdDate.getTime())) {
                                console.warn(`[Skip] Invalid date format for created_time: "${rawDate}"`);
                                skippedCount++;
                                continue;
                            }

                            // Rule 1: Convert to UTC string
                            const createdUtcStr = createdDate.toISOString();
                            row[createdTimeIndex] = createdUtcStr;

                            // Rule 2: sync_time strictly greater than created_time
                            if (currentSyncTime <= createdDate) {
                                console.warn(`[Skip] sync_time earlier than created_time (created: ${createdUtcStr}, sync: ${currentSyncTime.toISOString()})`);
                                skippedCount++;
                                continue;
                            }
                        } catch (err) {
                            console.warn(`[Skip] Error processing created_time validation: ${err.message}`);
                            skippedCount++;
                            continue;
                        }
                    }
                    validatedRows.push(row);
                }

                if (skippedCount > 0) {
                    console.log(`⚠️ Skipped ${skippedCount} records in sheet "${sheetTitle}" due to validation rules.`);
                }
                // --- END VALIDATION ---

                // 1. Prepare Temp Table
                await db.query(`DROP TABLE IF EXISTS "${tempTableName}"`);
                await ensureTableExists(tempTableName, headers);

                // 2. Insert Records into temp_leads (Using Validated Rows)
                const insertedTempCount = await insertNewRecords(tempTableName, headers, validatedRows, batchId);
                console.log(`Inserted ${insertedTempCount} rows into ${tempTableName}.`);

                // 3. Merge temp_leads -> Leads (Differential Sync)
                // Ensure target table exists (with headers from this sheet)
                await ensureTableExists(targetTableName, headers);

                const mergeResult = await mergeTempToLeads(tempTableName, targetTableName);

                // 4. Update Log with results
                await updateSyncLog(
                    logId,
                    {
                        tempInserted: insertedTempCount,
                        leadsDeleted: mergeResult.deletedCount,
                        leadsInserted: mergeResult.insertedCount
                    },
                    mergeResult.success ? 'SUCCESS' : 'FAILED'
                );

                results.push({
                    sheet: sheetTitle,
                    table: targetTableName,
                    found: insertedTempCount,
                    inserted: mergeResult.insertedCount,
                    status: 'SUCCESS',
                    columns: headers
                });

                console.log(`Synced ${sheetTitle} to ${targetTableName} (+${mergeResult.insertedCount} records).`);
            } catch (sheetError) {
                console.error(`❌ Error syncing sheet "${sheetTitle}":`, sheetError.message);
                results.push({ sheet: sheetTitle, status: 'FAILED', error: sheetError.message });
            } finally {
                // 5. Clear Temp
                try { await db.query(`DROP TABLE IF EXISTS "${tempTableName}"`); } catch (e) { }
            }
        }

        return { batchId, results };

    } catch (error) {
        if (error.code === 404 || error.message.includes('NOT_FOUND')) {
            console.error('❌ ERROR: Spreadsheet Not Found or Permission Denied.');
        } else if (error.message !== 'SYNC_IN_PROGRESS') {
            console.error('Sync Error:', error);
        }
        throw error;
    } finally {
        isSyncing = false;
        console.log('🔓 Released Sync Lock.');
    }
};

module.exports = { syncSheetToDb };
