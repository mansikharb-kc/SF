const { db } = require('./server/db');

async function check() {
    try {
        console.log('--- Sync Logs Table ---');
        const res = await db.query("SELECT * FROM sync_logs ORDER BY id DESC LIMIT 1");
        console.log(res.rows[0]);

        console.log('\n--- Sync Logs Columns ---');
        const cols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sync_logs'");
        console.log(cols.rows.map(c => c.column_name));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        process.exit(0);
    }
}
check();
