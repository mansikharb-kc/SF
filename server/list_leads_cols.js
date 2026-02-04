const { db } = require('./db');

async function checkMetadata() {
    try {
        const { rows: columns } = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads'
      ORDER BY ordinal_position
    `);

        console.log('Columns for [leads]:');
        columns.forEach(c => {
            console.log(`  - ${c.column_name} (${c.data_type})`);
        });

    } catch (error) {
        console.error('Metadata check failed:', error);
    } finally {
        process.exit();
    }
}

checkMetadata();
