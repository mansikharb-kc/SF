const { db } = require('./db');
const fs = require('fs');

async function checkRecentLogs() {
    try {
        const result = await db.query("SELECT sheet_name, temp_inserted_count, leads_inserted_count, status, sync_timestamp FROM sync_logs ORDER BY sync_timestamp DESC LIMIT 20");
        const json = JSON.stringify(result.rows, null, 2);
        console.log(json);
        fs.writeFileSync('logs_output.json', json);
    } catch (error) {
        console.error('Error querying logs:', error);
    }
}

checkRecentLogs().then(() => process.exit());
