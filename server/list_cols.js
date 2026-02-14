const { db } = require('./db');

async function listColumns() {
    try {
        const { rows } = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
        console.log('Columns in leads table:');
        console.log(rows.map(r => r.column_name).sort());

        const { rows: tempRows } = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'temp_leads'");
        console.log('\nColumns in temp_leads table:');
        console.log(tempRows.map(r => r.column_name).sort());
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

listColumns();
