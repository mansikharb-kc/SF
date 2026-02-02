const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function reveal() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);
        const headers = data[0];
        const rows = data.slice(1);

        let missing = [];
        rows.forEach((row, i) => {
            const id = row[0] ? row[0].toString().trim() : '';
            if (!id) {
                missing.push({ rowNumber: i + 2, data: row });
            }
        });

        console.log(`Found ${missing.length} rows with empty IDs.`);
        missing.forEach((m, idx) => {
            console.log(`\n[${idx + 1}] Sheet Row ${m.rowNumber}:`);
            headers.forEach((h, hIdx) => {
                const val = m.data[hIdx] ? m.data[hIdx].toString().trim() : '';
                if (val) console.log(`  ${h}: ${val}`);
            });
        });
    } catch (e) {
        console.error(e);
    }
}

// Small delay to manage quota
setTimeout(() => {
    reveal().then(() => process.exit());
}, 5000);
