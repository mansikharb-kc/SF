const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function thoroughCheck() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        // Read rows 60 to 110 to see the transition
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A60:E100`);

        console.log('--- Checking Rows 60 to 100 in ' + title + ' ---');
        data.forEach((row, i) => {
            const rowNum = 60 + i;
            console.log(`Row ${rowNum}: ${JSON.stringify(row)}`);
        });
    } catch (e) {
        console.error(e);
    }
}

thoroughCheck().then(() => process.exit());
