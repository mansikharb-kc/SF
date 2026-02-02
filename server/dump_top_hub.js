const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function dumpTop() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A1:Z5`);
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

dumpTop().then(() => process.exit());
