const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';
const sheetName = 'Architects & Designers INDIA 2 ';

async function deepInspect() {
    try {
        console.log('--- Deep Check: ' + sheetName + ' ---');
        // Check first 1000 rows
        const data = await getSheetValues(SPREADSHEET_ID, `'${sheetName}'!A:E`);
        console.log('Total Rows in Data Range:', data ? data.length : 0);

        if (data && data.length > 0) {
            console.log('Header Row:', JSON.stringify(data[0]));

            // Check if there are any records with a missing ID but data in other columns
            let rowsWithData = 0;
            data.slice(1).forEach((row, idx) => {
                if (row.some(cell => cell && cell.trim().length > 0)) {
                    rowsWithData++;
                }
            });
            console.log('Rows that have SOME data:', rowsWithData);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

deepInspect().then(() => process.exit());
