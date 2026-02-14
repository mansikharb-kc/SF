const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM leads LIMIT 1");
        const columns = Object.keys(res.rows[0]);
        process.stdout.write('---START---' + JSON.stringify(columns) + '---END---');
    } catch (error) {
        process.stderr.write(error.message);
    } finally {
        process.exit(0);
    }
}

check();
