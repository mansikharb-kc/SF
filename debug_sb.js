const { db } = require('./server/db');
const fs = require('fs');

async function check() {
    try {
        await db.query("SELECT 1");
        console.log('SQL OK');
    } catch (error) {
        fs.writeFileSync('sb_err.txt', error.message + '\n' + JSON.stringify(error, null, 2));
        console.log('SQL FAIL');
    } finally {
        process.exit(0);
    }
}

check();
