const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function fetchMissingRows() {
    try {
        console.log('--- DETAILS FOR BRAND LEADS (Missing IDs) ---');
        const brandLeads = await getSheetValues(SPREADSHEET_ID, "'Brand Leads'!A1560:Z");
        brandLeads.forEach((row, i) => {
            if (!row[0] && row.some(cell => cell)) {
                console.log(`Row ${1560 + i}: ${JSON.stringify(row)}`);
            }
        });

        console.log('\n--- DETAILS FOR IMMERSIVE HUB (Missing IDs) ---');
        const immersiveHub = await getSheetValues(SPREADSHEET_ID, "'Immersive Hub - Brands (NCR)'!A1:Z");
        immersiveHub.forEach((row, i) => {
            if (i > 0 && !row[0] && row.some(cell => cell)) {
                console.log(`Row ${i + 1}: ${JSON.stringify(row)}`);
            }
        });

    } catch (e) { console.error(e); }
}

fetchMissingRows().then(() => process.exit());
