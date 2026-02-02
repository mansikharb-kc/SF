const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function extractMissingIdDetails() {
    try {
        const sheetsToInspect = ['Immersive Hub - Brands (NCR)', 'Brand Leads'];
        console.log('--- Summary of Rows Missing IDs ---\n');

        for (const title of sheetsToInspect) {
            const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);
            if (!data || data.length <= 1) continue;

            const headers = data[0];
            const getSafeColumnName = (h) => h.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            let idColIndex = headers.findIndex(h => {
                const safe = getSafeColumnName(h);
                return safe === 'id' || safe === 'sheet_id';
            });

            if (idColIndex === -1) idColIndex = 0;

            const rows = data.slice(1);
            let missingRowsFound = 0;

            console.log(`Sheet: "${title}"`);
            rows.forEach((r, idx) => {
                const id = r[idColIndex] ? r[idColIndex].toString().trim() : '';
                if (!id) {
                    // Extract key info
                    const name = r[headers.findIndex(h => getSafeColumnName(h).includes('name'))] || 'N/A';
                    const phone = r[headers.findIndex(h => getSafeColumnName(h).includes('phone'))] || 'N/A';
                    const email = r[headers.findIndex(h => getSafeColumnName(h).includes('email'))] || 'N/A';

                    if (name !== 'N/A' || phone !== 'N/A' || email !== 'N/A') {
                        missingRowsFound++;
                        console.log(`  Row ${idx + 2}: Name: ${name} | Phone: ${phone} | Email: ${email}`);
                    }
                }
            });
            if (missingRowsFound === 0) console.log('  No data rows missing IDs found.');
            console.log('');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

extractMissingIdDetails().then(() => process.exit());
