const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function debugImmersiveLength() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);
        const headers = data[0];
        const rows = data.slice(1);

        console.log(`Headers length: ${headers.length}`);

        rows.forEach((row, i) => {
            if (row.length < headers.length) {
                // If it's shorter, it might be because the first cell is missing
                // Let's see if this explains the "missing ID"
                console.log(`Row ${i + 2} length is ${row.length}. Data: ${JSON.stringify(row)}`);
            }
        });
    } catch (e) { console.error(e); }
}

debugImmersiveLength().then(() => process.exit());
