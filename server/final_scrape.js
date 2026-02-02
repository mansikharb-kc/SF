const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function finalScrape() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);
        const rows = data.slice(1);

        console.log(`--- DETAILED MISSING ID ROWS IN ${title} ---`);

        let found = 0;
        rows.forEach((row, idx) => {
            // Check first 5 columns to see if A is empty but others are not
            const id = row[0] ? row[0].toString().trim() : '';
            const otherData = row.slice(1).some(cell => cell && cell.trim());

            if (!id && otherData) {
                found++;
                console.log(`\nRow ${idx + 2}:`);
                data[0].forEach((header, hIdx) => {
                    if (row[hIdx]) {
                        console.log(`  ${header}: ${row[hIdx]}`);
                    }
                });
            }
        });
        console.log(`\nTotal: ${found}`);
    } catch (e) {
        console.error(e);
    }
}

finalScrape().then(() => process.exit());
