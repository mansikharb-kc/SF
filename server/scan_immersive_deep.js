const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function scanImmersiveDeep() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        // Fetch a large range to catch trailing data
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A1:Z500`);
        const headers = data[0];

        console.log(`--- DEEP SCAN: ${title} ---`);
        console.log(`Total rows returned by API: ${data.length}`);

        let missingCount = 0;
        data.forEach((row, i) => {
            if (i === 0) return; // skip header

            const id = row[0] ? row[0].toString().trim() : '';
            if (!id && row.some(cell => cell && cell.trim())) {
                missingCount++;
                console.log(`\nMissing ID Row ${i + 1}:`);
                headers.forEach((h, hIdx) => {
                    if (row[hIdx]) console.log(`  ${h}: ${row[hIdx]}`);
                });
            }
        });
        console.log(`\nFinal tally of rows with data but no ID: ${missingCount}`);
    } catch (e) {
        console.error(e);
    }
}

scanImmersiveDeep().then(() => process.exit());
