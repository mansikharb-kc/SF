const { db } = require('./db');

async function checkTombstones() {
    try {
        console.log("Checking deleted_leads table...");
        const { rows } = await db.query("SELECT * FROM deleted_leads");
        console.log(`Found ${rows.length} records in deleted_leads:`);
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkTombstones();
