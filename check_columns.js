const { db } = require('./server/db');

async function check() {
    try {
        console.log('--- Checking Column Variance in Leads ---');
        const { rows } = await db.query("SELECT * FROM leads LIMIT 50");

        const allKeys = new Set();
        rows.forEach(row => {
            Object.keys(row).forEach(k => allKeys.add(k));
        });

        console.log('Columns found in first 50 rows:', Array.from(allKeys).join(', '));

        // Count how many times each column is NOT null
        const counts = {};
        allKeys.forEach(k => counts[k] = 0);

        rows.forEach(row => {
            Object.entries(row).forEach(([k, v]) => {
                if (v !== null && v !== '') counts[k]++;
            });
        });

        console.log('\nColumn Usage (Out of 50):');
        Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([k, v]) => {
                if (v > 0) console.log(`  ${k}: ${v}`);
            });

    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

check();
