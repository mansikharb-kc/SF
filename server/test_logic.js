const { db } = require('./db');
const { ensureTableExists, mergeTempToLeads, ensureDeletedLeadsTable } = require('./services/dbService');

async function testTombstoneLogic() {
    try {
        console.log("🧪 Starting Tombstone Logic Test...");

        const testId = 'TEST_ID_99999';
        const tableName = 'leads';
        const tempTable = 'temp_leads';
        const headers = ['sheet_id', 'Name', 'Notes'];

        // 1. Clean up
        await db.query(`DELETE FROM "${tableName}" WHERE "sheet_id" = $1`, [testId]);
        await db.query(`DELETE FROM "deleted_leads" WHERE "sheet_id" = $1`, [testId]);
        await db.query(`DROP TABLE IF EXISTS "${tempTable}"`);

        // 2. Setup Tables
        await ensureTableExists(tableName, headers);
        await ensureDeletedLeadsTable(); // Ensure table exists
        await ensureTableExists(tempTable, headers); // Ensure temp exists

        // 3. Mark ID as Deleted (Tombstone)
        console.log(`⚰️  Inserting Tombstone for ID: ${testId}`);
        await db.query('INSERT INTO deleted_leads (sheet_id) VALUES ($1)', [testId]);

        // 4. Insert into Temp (Simulate Sync)
        console.log(`📥 Inserting record into ${tempTable} with ID: ${testId}`);
        await db.query(
            `INSERT INTO "${tempTable}" (sheet_id, "Name", "Notes", _row_hash, _batch_id) VALUES ($1, $2, $3, $4, $5)`,
            [testId, 'Test User', 'Should be skipped', 'hash123', 'batch123']
        );

        // 5. Run Merge
        console.log("🔄 Running Merge...");
        const result = await mergeTempToLeads(tempTable, tableName);
        console.log("Merge Result:", result);

        // 6. Verify
        const { rows } = await db.query(`SELECT * FROM "${tableName}" WHERE "sheet_id" = $1`, [testId]);

        if (rows.length === 0) {
            console.log("✅ SUCCESS: Record was correctly excluded from leads table.");
        } else {
            console.error("❌ FAILURE: Record was inserted into leads table despite being in deleted_leads!");
            console.table(rows);
        }

        process.exit(0);

    } catch (error) {
        console.error("❌ Error during test:", error);
        process.exit(1);
    }
}

testTombstoneLogic();
