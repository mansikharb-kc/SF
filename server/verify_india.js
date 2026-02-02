const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function verifyMissingId() {
    try {
        const sheetName = 'Architects & Designers INDIA 2 ';
        const data = await getSheetValues(SPREADSHEET_ID, `'${sheetName}'!A:Z`);

        console.log(`--- Verification: [${sheetName}] ---`);
        if (!data || data.length === 0) {
            console.log('Sheet is empty');
            return;
        }

        const headers = data[0];
        console.log('Headers:', JSON.stringify(headers));

        // Find ID column
        // My code looks for 'id' or 'sheet_id' after cleaning
        const getSafe = (h) => h.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        let idIndex = headers.findIndex(h => {
            const safe = getSafe(h);
            return safe === 'id' || safe === 'sheet_id';
        });

        console.log('Found "id" header at index:', idIndex);

        const rows = data.slice(1);
        let missingCount = 0;
        let validCount = 0;

        rows.forEach((row, idx) => {
            const idValue = (idIndex !== -1 && row[idIndex]) ? row[idIndex].toString().trim() : '';
            if (!idValue) {
                missingCount++;
                // console.log(`Row ${idx + 2} is missing ID. Data:`, JSON.stringify(row));
            } else {
                validCount++;
            }
        });

        console.log('Total Data Rows:', rows.length);
        console.log('Valid IDs found:', validCount);
        console.log('Missing IDs found:', missingCount);

        if (missingCount > 0) {
            console.log('Example row with missing ID (Row 2 if missing):', JSON.stringify(rows[0]));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyMissingId().then(() => process.exit());
