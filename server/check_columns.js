const { db } = require('./db');

async function checkMetadata() {
    try {
        console.log('--- Column Check ---');

        const tables = ['leads', 'temp_leads', 'sync_logs', 'deleted_leads'];

        for (const table of tables) {
            const { rows: columns } = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

            console.log(`\nColumns for [${table}]:`);
            if (columns.length === 0) {
                console.log('  (Table does not exist or has no columns)');
            } else {
                columns.forEach(c => {
                    console.log(`  - ${c.column_name} (${c.data_type})`);
                });
            }
        }

        const { rows: leadsCount } = await db.query('SELECT COUNT(*) as count FROM "leads"').catch(() => ({ rows: [{ count: 'N/A' }] }));
        console.log(`\nTotal Leads Count: ${leadsCount[0].count}`);

        const { rows: deletedCount } = await db.query('SELECT COUNT(*) as count FROM "deleted_leads"').catch(() => ({ rows: [{ count: 'N/A' }] }));
        console.log(`Total Deleted Leads Count: ${deletedCount[0].count}`);

        if (leadsCount[0].count === '0' || leadsCount[0].count === 0) {
            console.log('\nChecking if temp_leads has data...');
            const { rows: tempRows } = await db.query('SELECT COUNT(*) as count FROM "temp_leads"').catch(() => ({ rows: [{ count: '0' }] }));
            console.log(`Temp Leads count: ${tempRows[0].count}`);
        }

    } catch (error) {
        console.error('Metadata check failed:', error);
    } finally {
        process.exit();
    }
}

checkMetadata();
