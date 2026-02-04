const { db } = require('./server/db');

async function checkSyncLogs() {
    try {
        const query = "SELECT id, sync_timestamp, trigger_type FROM sync_logs WHERE sync_timestamp BETWEEN '2026-02-03T18:00:00Z' AND '2026-02-04T02:00:00Z' ORDER BY sync_timestamp ASC";
        const result = await db.query(query);
        console.log('Sync Logs found:');
        result.rows.forEach(row => {
            console.log(`ID: ${row.id}, Time: ${row.sync_timestamp}, Type: ${row.trigger_type}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSyncLogs();
