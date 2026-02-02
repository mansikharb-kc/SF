const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function debugImmersiveHub() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);

        console.log(`\n--- DEBUGGING SHEET: ${title} ---`);
        console.log(`Headers: ${JSON.stringify(data[0])}`);

        const rows = data.slice(1);
        let missingCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const id = row[0] ? row[0].toString().trim() : '';
            if (!id && row.some(cell => cell && cell.trim())) {
                missingCount++;
                if (missingCount <= 40) {
                    console.log(`Row ${i + 2}: ${JSON.stringify(row)}`);
                }
            }
        }
        console.log(`\nTotal rows found with missing IDs: ${missingCount}`);
    } catch (e) {
        console.error(e);
    }
}

debugImmersiveHub().then(() => process.exit());
