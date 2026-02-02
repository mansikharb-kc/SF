const { db } = require('./db');

async function checkLatestBatch() {
    try {
        const batchRes = await db.query("SELECT batch_id FROM sync_logs ORDER BY sync_timestamp DESC LIMIT 1");
        if (batchRes.rows.length === 0) {
            console.log('No logs found.');
            return;
        }
        const batchId = batchRes.rows[0].batch_id;
        console.log('Latest Batch ID:', batchId);

        const logs = await db.query("SELECT sheet_name, temp_inserted_count, leads_inserted_count FROM sync_logs WHERE batch_id = $1 ORDER BY sync_timestamp ASC", [batchId]);
        const india2Logs = logs.rows.filter(l => l.sheet_name.includes('INDIA 2'));
        console.log(JSON.stringify(india2Logs, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLatestBatch().then(() => process.exit());
