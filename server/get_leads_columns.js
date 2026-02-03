const { db } = require('./db');
const fs = require('fs');

async function getLeadsColumns() {
    const { rows } = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
    fs.writeFileSync('leads_columns.json', JSON.stringify(rows.map(r => r.column_name), null, 2));
}

getLeadsColumns().then(() => process.exit());
