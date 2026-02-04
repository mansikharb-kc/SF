const { db } = require('./server/db');

async function checkSyncLogs() {
    try {
        const query = "SELECT id, sync_timestamp, trigger_type FROM sync_logs WHERE sync_timestamp >= '2026-02-03T00:00:00Z' ORDER BY sync_timestamp DESC LIMIT 50";
        const result = await db.query(query);
        console.log('Sync Logs:');
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSyncLogs();
