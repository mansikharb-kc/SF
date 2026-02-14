const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM leads LIMIT 1");
        if (res.rows.length > 0) {
            const keys = Object.keys(res.rows[0]);
            console.log('LEADS_COLUMNS_COUNT:', keys.length);
            keys.forEach(k => console.log('COL:', k));
        } else {
            console.log('No leads found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

check();
