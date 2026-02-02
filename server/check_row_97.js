const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function checkRow97() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A97:E97`);
        console.log('Row 97 Content:', JSON.stringify(data));
    } catch (e) {
        console.error(e);
    }
}

checkRow97().then(() => process.exit());
