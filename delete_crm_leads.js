const { db } = require('./server/db');

async function deleteCrmLeads() {
    try {
        console.log('🗑️ Attempting to delete all records from crm_leads...');
        const res = await db.query("DELETE FROM crm_leads");
        console.log(`✅ Successfully deleted records. Rows affected: ${res.rowCount}`);
    } catch (error) {
        console.error('❌ Error deleting crm leads:', error.message);
        if (error.message.includes('quota')) {
            console.error('\n🛑 NEON QUOTA EXCEEDED: The database is currently blocked.');
        }
    } finally {
        process.exit(0);
    }
}

deleteCrmLeads();
