const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM leads ORDER BY _created_at DESC LIMIT 1");
        console.log('---KEYS---');
        console.log(Object.keys(res.rows[0]));
        console.log('---DATA---');
        console.log(res.rows[0]);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

check();
