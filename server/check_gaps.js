const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function deepCheckGaps() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A62:Z96`);

        console.log('--- Checking Content of Rows 62 to 96 (The Gap) ---');
        if (!data || data.length === 0) {
            console.log('Results: All rows between 62 and 96 are completely empty (API returned nothing).');
            return;
        }
        let dataFound = false;
        data.forEach((row, i) => {
            if (row.some(cell => cell && cell.trim() !== '')) {
                console.log(`Row ${62 + i} has data: ${JSON.stringify(row)}`);
                dataFound = true;
            }
        });

        if (!dataFound) {
            console.log('Results: All rows between 62 and 96 are completely empty.');
        }
    } catch (e) {
        console.error(e);
    }
}

deepCheckGaps().then(() => process.exit());
