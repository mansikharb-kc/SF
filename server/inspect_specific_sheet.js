const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';
const sheetName = 'Architects & Designers INDIA 2 ';

async function inspectSheet() {
    console.log('Waiting 5 seconds for quota to reset...');
    await new Promise(r => setTimeout(r, 5000));
    try {
        const data = await getSheetValues(SPREADSHEET_ID, `'${sheetName}'!A:E`);
        console.log('--- Inspection: ' + sheetName + ' ---');
        console.log('Total Rows Found:', data.length);
        if (data.length > 0) {
            console.log('Headers:', JSON.stringify(data[0]));
        }
        if (data.length > 1) {
            console.log('Row 2:', JSON.stringify(data[1]));
        }
        if (data.length > 88) {
            console.log('Row 88:', JSON.stringify(data[87]));
        }
    } catch (error) {
        console.error('Error inspecting sheet:', error.message);
    }
}

inspectSheet().then(() => process.exit());
