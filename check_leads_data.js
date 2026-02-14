const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM leads LIMIT 5");
        res.rows.forEach((row, i) => {
            console.log(`ROW ${i}:`);
            Object.entries(row).forEach(([k, v]) => {
                if (v !== null && v !== '') {
                    console.log(`  ${k}: ${v}`);
                }
            });
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

check();
