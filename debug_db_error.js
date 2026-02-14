const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM leads LIMIT 1");
        console.log('Success:', res.rows[0]);
    } catch (error) {
        console.error('--- ERROR DETAIL ---');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        console.error('Detail:', error.detail);
        console.error('Hint:', error.hint);
        console.error('Where:', error.where);
        console.error('Full Error:', JSON.stringify(error, null, 2));
    } finally {
        process.exit(0);
    }
}

check();
