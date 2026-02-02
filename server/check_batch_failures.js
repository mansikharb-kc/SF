const { db } = require('./db');

async function checkBatchFailures() {
    try {
        const batchRes = await db.query("SELECT batch_id FROM sync_logs ORDER BY sync_timestamp DESC LIMIT 1");
        const batchId = batchRes.rows[0].batch_id;
        console.log('Batch ID:', batchId);

        const logs = await db.query("SELECT sheet_name, status, error_message FROM sync_logs WHERE batch_id = $1 AND status != 'SUCCESS'", [batchId]);
        console.log(JSON.stringify(logs.rows, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkBatchFailures().then(() => process.exit());
