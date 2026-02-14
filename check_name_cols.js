const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name LIKE '%name%'");
        console.log('Columns with name:', res.rows.map(c => c.column_name));

        const res2 = await db.query("SELECT * FROM leads LIMIT 1");
        console.log('Keys in first row:', Object.keys(res2.rows[0]).sort());
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
