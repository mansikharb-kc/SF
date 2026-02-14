const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM leads LIMIT 1");
        if (res.rows.length > 0) {
            console.log('Columns in Leads:', Object.keys(res.rows[0]));
        } else {
            console.log('No data in leads table.');
        }

        const res2 = await db.query("SELECT count(*) as count FROM leads WHERE _batch_id IS NOT NULL");
        console.log('Leads with _batch_id:', res2.rows[0].count);

        const res3 = await db.query("SELECT _batch_id FROM leads WHERE _batch_id IS NOT NULL LIMIT 1");
        if (res3.rows.length > 0) {
            console.log('Sample _batch_id:', res3.rows[0]._batch_id);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
