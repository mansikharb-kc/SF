const { db } = require('./server/db');

async function check() {
    try {
        console.log('--- Checking first 10 rows with ORDER BY ---');
        const { rows: leads } = await db.query("SELECT * FROM leads ORDER BY _created_at ASC LIMIT 10");
        console.log(`Success! Found ${leads.length} rows.`);

        if (leads.length > 0) {
            console.log('Keys in first row:', Object.keys(leads[0]).join(', '));
            leads.forEach((row, i) => {
                const vals = Object.entries(row).filter(([k, v]) => v !== null && v !== '').map(([k, v]) => `${k}:${v}`);
                console.log(`Row ${i} non-null:`, vals.join(' | '));
            });
        }
    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        process.exit(0);
    }
}

check();
