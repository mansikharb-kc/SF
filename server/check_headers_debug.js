const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function checkAllHeaders() {
    try {
        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        console.log('--- Checking Headers for all ' + meta.sheets.length + ' sheets ---');

        for (const s of meta.sheets) {
            const title = s.properties.title;
            const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A1:Z1`);

            if (data && data.length > 0) {
                const headers = data[0];
                const idIndex = headers.findIndex(h => h && h.toLowerCase().trim() === 'id');
                const hasId = idIndex !== -1;

                console.log(`Sheet: "${title}"`);
                console.log(`  - Raw Headers: ${JSON.stringify(headers)}`);
                console.log(`  - Found "id" index: ${idIndex} (${hasId ? '✅' : '❌'})`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAllHeaders().then(() => process.exit());
