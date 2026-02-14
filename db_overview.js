const { db } = require('./server/db');

async function check() {
    try {
        console.log('Querying leads...');
        const { rows: leads } = await db.query('SELECT count(*) FROM "leads"');
        console.log('Leads Total:', leads[0].count);

        console.log('Querying logs...');
        const { rows: logs } = await db.query('SELECT * FROM "sync_logs" ORDER BY id DESC LIMIT 5');

        console.log('\n--- Recent Logs ---');
        logs.forEach(log => {
            console.log(`- ${log.sheet_name}: ${log.status} (Inserted: ${log.leads_inserted_count})`);
        });

    } catch (e) {
        console.error('Check failed:', e.message);
        console.error('Hint:', e.hint);
        console.error('Detail:', e.detail);
    } finally {
        process.exit(0);
    }
}

check();
