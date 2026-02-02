const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function listAllMissingImmersiveHub() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);
        if (!data || data.length <= 1) {
            console.log('No data found in sheet.');
            return;
        }

        const headers = data[0];
        const rows = data.slice(1);

        console.log(`\n--- LISTING ALL ROWS MISSING IDs IN: ${title} ---`);
        console.log(`Total rows in sheet: ${rows.length}`);

        let count = 0;
        rows.forEach((row, i) => {
            const id = row[0] ? row[0].toString().trim() : '';
            if (!id) {
                // Check if there is ANY data in the row
                const hasData = row.some(cell => cell && cell.trim());
                if (hasData) {
                    count++;
                    console.log(`\n[${count}] Row ${i + 2}:`);
                    headers.forEach((h, hIdx) => {
                        const val = row[hIdx] ? row[hIdx].toString().trim() : '';
                        if (val) {
                            console.log(`  ${h}: ${val}`);
                        }
                    });
                    console.log('-----------------------------------');
                }
            }
        });

        console.log(`\nTotal Missing ID rows found with data: ${count}`);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

listAllMissingImmersiveHub().then(() => process.exit());
