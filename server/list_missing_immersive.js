const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function listAllMissingDetails() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);
        const headers = data[0];
        const rows = data.slice(1);

        console.log(`--- [${title}] ROWS WITH MISSING IDs ---`);

        let found = 0;
        rows.forEach((row, idx) => {
            const id = row[0] ? row[0].toString().trim() : '';
            // Checking if row has at least one cell with data beyond Column A
            const hasData = row.slice(1).some(c => c && c.trim());

            if (!id && hasData) {
                found++;
                console.log(`\nRow ${idx + 2}:`);
                headers.forEach((h, hIdx) => {
                    const val = row[hIdx] ? row[hIdx].toString().trim() : '';
                    if (val) {
                        console.log(`  ${h}: ${val}`);
                    }
                });
            }
        });

        console.log(`\nTotal Missing ID rows found: ${found}`);
    } catch (e) {
        console.error(e);
    }
}

listAllMissingDetails().then(() => process.exit());
