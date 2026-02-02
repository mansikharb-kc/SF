const { db } = require('./db');

async function checkIndiaSheets() {
    try {
        const result = await db.query("SELECT sheet_name, temp_inserted_count, leads_inserted_count, sync_timestamp FROM sync_logs WHERE sheet_name LIKE '%INDIA%' ORDER BY sync_timestamp DESC LIMIT 10");
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (error) {
        console.error('Error querying logs:', error);
    }
}

checkIndiaSheets().then(() => process.exit());
