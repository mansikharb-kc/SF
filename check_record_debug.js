const { db } = require('./server/db');

async function checkRecord() {
    try {
        const query = "SELECT created_time, _created_at, _batch_id FROM leads WHERE created_time = '2026-02-03T13:57:40-05:00' LIMIT 1";
        const result = await db.query(query);
        console.log('Record details:');
        console.log(JSON.stringify(result.rows, null, 2));

        if (result.rows.length > 0) {
            const batchId = result.rows[0]._batch_id;
            const logQuery = "SELECT * FROM sync_logs WHERE batch_id = $1";
            const logResult = await db.query(logQuery, [batchId]);
            console.log('\nSync log for this batch:');
            console.log(JSON.stringify(logResult.rows, null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkRecord();
