const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_leads'");
        console.log('CRM_LEADS_COLS:', JSON.stringify(res.rows.map(r => r.column_name)));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

check();
