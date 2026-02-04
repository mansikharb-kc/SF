const { db } = require('./server/db');

async function fixExistingRecords() {
    try {
        console.log('--- Starting Migration for Existing Records ---');

        // 1. Fetch records that likely have timezone offsets or need UTC conversion
        // We look for anything that doesn't end with 'Z' or has a +/- offset
        const query = `
            SELECT sheet_id, created_time, _created_at 
            FROM leads 
            WHERE created_time IS NOT NULL 
            AND (created_time ~ '[+-][0-9]{2}:[0-9]{2}$' OR created_time !~ 'Z$')
        `;

        const { rows } = await db.query(query);
        console.log(`Found ${rows.length} records potentially needing adjustment.`);

        let updatedCount = 0;
        let deletedCount = 0;

        for (const row of rows) {
            try {
                const createdDate = new Date(row.created_time);
                const syncDate = new Date(row._created_at);

                if (isNaN(createdDate.getTime())) {
                    console.warn(`[Skip] Record ${row.sheet_id} has unparseable date: ${row.created_time}`);
                    continue;
                }

                const createdUtcStr = createdDate.toISOString();

                // Rule 2 Check: sync_time must be > created_time
                if (syncDate <= createdDate) {
                    console.log(`[Delete] Record ${row.sheet_id} violates chronological rule (Created: ${createdUtcStr}, Sync: ${syncDate.toISOString()})`);
                    await db.query('DELETE FROM leads WHERE sheet_id = $1', [row.sheet_id]);
                    deletedCount++;
                    continue;
                }

                // Rule 1: Update to UTC if changed
                if (row.created_time !== createdUtcStr) {
                    await db.query('UPDATE leads SET created_time = $1 WHERE sheet_id = $2', [createdUtcStr, row.sheet_id]);
                    updatedCount++;
                }

            } catch (err) {
                console.error(`Error processing record ${row.sheet_id}:`, err.message);
            }
        }

        console.log(`--- Migration Complete ---`);
        console.log(`Updated to UTC: ${updatedCount}`);
        console.log(`Deleted (Rule Violation): ${deletedCount}`);

    } catch (err) {
        console.error('Fatal Migration Error:', err);
    } finally {
        process.exit();
    }
}

fixExistingRecords();
