const { getSpreadsheetMetadata, getSheetValues } = require('./sheetService');
const { ensureTableExists, insertNewRecords, logSync, truncateTable, mergeTempToLeads } = require('./dbService');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

// Concurrency Lock
let isSyncing = false;

// Hardcoded Spreadsheet ID
// Spreadsheet ID from Env or hardcoded fallback
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

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

        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        const sheets = meta.sheets;
        const batchId = uuidv4();
        const results = [];

        console.log(`Starting sync for Spreadsheet: ${meta.properties.title} (Batch: ${batchId})`);

        for (const sheet of sheets) {
            const sheetTitle = sheet.properties.title;
            console.log(`Processing Sheet: ${sheetTitle}`);

            // Read Data
            const data = await getSheetValues(SPREADSHEET_ID, `'${sheetTitle}'!A:ZZ`);

            if (!data || data.length === 0) {
                console.log(`Sheet ${sheetTitle} is empty.`);
                results.push({ sheet: sheetTitle, status: 'EMPTY' });
                continue;
            }

            // Assume first row is Headers
            const headers = data[0];
            const rows = data.slice(1);

            if (headers.length === 0) continue;

            const targetTableName = 'leads';
            const tempTableName = 'temp_leads';

            // Ensure Target Table Exists before starting (using first sheet with headers if available, or just a safe check)
            // We'll detect headers for each sheet but they should be consistent.

            for (const sheet of sheets) {
                const sheetTitle = sheet.properties.title;
                console.log(`Processing Sheet: ${sheetTitle}`);

                try {
                    // Read Data
                    const data = await getSheetValues(SPREADSHEET_ID, `'${sheetTitle}'!A:ZZ`);

                    if (!data || data.length === 0) {
                        console.log(`Sheet ${sheetTitle} is empty.`);
                        results.push({ sheet: sheetTitle, status: 'EMPTY' });
                        continue;
                    }

                    const headers = data[0];
                    const rows = data.slice(1);

                    if (headers.length === 0) continue;

                    // 1. Prepare Temp Table
                    await db.query(`DROP TABLE IF EXISTS "${tempTableName}"`);
                    await ensureTableExists(tempTableName, headers);

                    // 2. Insert Records into temp_leads
                    const insertedTempCount = await insertNewRecords(tempTableName, headers, rows, batchId);
                    console.log(`Inserted ${insertedTempCount} rows into ${tempTableName}.`);

                    // 3. Merge temp_leads -> Leads (Differential Sync)
                    // Ensure target table exists (with headers from this sheet)
                    await ensureTableExists(targetTableName, headers);

                    const mergeResult = await mergeTempToLeads(tempTableName, targetTableName);

                    // 4. Log
                    await logSync(
                        sheetTitle,
                        targetTableName,
                        {
                            tempInserted: insertedTempCount,
                            leadsDeleted: mergeResult.deletedCount,
                            leadsInserted: mergeResult.insertedCount
                        },
                        batchId,
                        mergeResult.success ? 'SUCCESS' : 'FAILED',
                        triggerType
                    );

                    results.push({
                        sheet: sheetTitle,
                        table: targetTableName,
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
