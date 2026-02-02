const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function checkRow62() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A62:Z62`);
        console.log('Row 62 Content:', JSON.stringify(data));
    } catch (e) {
        console.error(e);
    }
}

checkRow62().then(() => process.exit());
