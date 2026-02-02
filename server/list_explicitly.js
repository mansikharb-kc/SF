const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function listExplicitly() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);
        const rows = data.slice(1);

        console.log(`Checking ${rows.length} rows...`);

        let withId = 0;
        let withoutId = 0;

        rows.forEach((row, i) => {
            const id = row[0] ? row[0].toString().trim() : '';
            if (id) {
                withId++;
            } else {
                withoutId++;
                console.log(`Row ${i + 2}: ID is EMPTY. Data exists? ${row.some(c => c && c.trim())}`);
                if (row.some(c => c && c.trim())) {
                    console.log(`  Details: ${JSON.stringify(row)}`);
                }
            }
        });

        console.log(`Summary: With ID: ${withId}, Without ID: ${withoutId}`);
    } catch (e) {
        console.error(e);
    }
}

listExplicitly().then(() => process.exit());
