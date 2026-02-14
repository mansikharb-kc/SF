const { db } = require('./db');

async function inspectLeads() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads'");
        console.log('Leads table columns:');
        console.table(res.rows);

        const sample = await db.query("SELECT * FROM leads LIMIT 1");
        console.log('Sample record:');
        console.log(sample.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

inspectLeads();
