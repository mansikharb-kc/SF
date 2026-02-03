const { db } = require('./db');
const fs = require('fs');

async function getSheets() {
    const { rows } = await db.query('SELECT DISTINCT sheet_name FROM sync_logs');
    fs.writeFileSync('distinct_sheets.json', JSON.stringify(rows.map(r => r.sheet_name), null, 2));
}

getSheets().then(() => process.exit());
