const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM leads LIMIT 1");
        if (res.rows.length > 0) {
            console.log('Columns in Leads:', Object.keys(res.rows[0]));
            console.log('Sample Data:', res.rows[0]);
        } else {
            console.log('No data in leads table.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
