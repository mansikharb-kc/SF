const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '1ZOmUOP091D0KE7tREyj533wjBsamGhb0kRyORksEZiY';

async function checkHeaders() {
    try {
        const data = await getSheetValues(SPREADSHEET_ID, 'A1:ZZ1');
        console.log('JSON_HEADERS:' + JSON.stringify(data[0]));
    } catch (e) {
        console.error('Failed to get headers:', e);
    }
}

checkHeaders();
