const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function findMatch() {
    try {
        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        console.log('--- Searching for sheets with ~124 records ---');
        for (const s of meta.sheets) {
            const title = s.properties.title;
            const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:A`);
            if (data && data.length > 0) {
                const count = data.length - 1;
                console.log(`Sheet: "${title}" -> ${count} records`);
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

findMatch().then(() => process.exit());
