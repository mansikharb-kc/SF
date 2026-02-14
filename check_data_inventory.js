const { db } = require('./server/db');

async function check() {
    const client = await db.connect();
    try {
        console.log('--- Checking first 50 rows in leads ---');
        const { rows: leads } = await client.query("SELECT * FROM leads LIMIT 50");

        // Find which columns have ANY data in these 50 rows
        const colData = {};
        leads.forEach(row => {
            Object.entries(row).forEach(([col, val]) => {
                if (val !== null && val !== '') {
                    if (!colData[col]) colData[col] = [];
                    if (colData[col].length < 3) colData[col].push(val);
                }
            });
        });

        console.log('\nColumns with data and samples:');
        Object.entries(colData).forEach(([col, samples]) => {
            console.log(`- ${col}: [${samples.join(', ')}]`);
        });

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

check();
