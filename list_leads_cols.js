const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
        console.log(res.rows.map(c => c.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
