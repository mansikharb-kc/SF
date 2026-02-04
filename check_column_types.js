const { db } = require('./server/db');

async function checkColumns() {
    try {
        const { rows } = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads' AND table_schema = 'public'
        `);

        console.log("Columns in 'leads':");
        const reserved = ['_row_hash', '_batch_id', '_created_at'];

        for (const col of rows) {
            const isReserved = reserved.includes(col.column_name);
            console.log(`${col.column_name.padEnd(30)} | ${col.data_type.padEnd(20)} | ${isReserved ? 'RESERVED' : 'SEARCHABLE'}`);

            if (!isReserved) {
                // Test ILIKE on this column
                try {
                    await db.query(`SELECT 1 FROM leads WHERE "${col.column_name}" ILIKE '%test%' LIMIT 1`);
                } catch (e) {
                    console.error(`  ❌ Column "${col.column_name}" FAILED ILIKE: ${e.message}`);
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkColumns();
