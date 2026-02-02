const { getSpreadsheetMetadata } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function listAllSheetNames() {
    try {
        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        console.log('--- List of all Sheet Names ---');
        meta.sheets.forEach((s, i) => {
            console.log(`${i + 1}. "${s.properties.title}"`);
        });
        console.log(`\nTotal Sheets: ${meta.sheets.length}`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listAllSheetNames().then(() => process.exit());
