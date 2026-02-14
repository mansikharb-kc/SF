const { db } = require('./server/db');
const fs = require('fs');

async function check() {
    try {
        await db.query("SELECT * FROM leads LIMIT 1");
    } catch (error) {
        fs.writeFileSync('error_full.txt', error.message + '\n' + JSON.stringify(error, null, 2));
    } finally {
        process.exit(0);
    }
}

check();
