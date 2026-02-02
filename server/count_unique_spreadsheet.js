const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function countUniqueInSpreadsheet() {
    try {
        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        const allIds = new Set();
        let totalRows = 0;
        let missingIdTotal = 0;

        for (const s of meta.sheets) {
            const title = s.properties.title;
            const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:E`);
            if (!data || data.length <= 1) continue;

            const headers = data[0];
            const getSafeColumnName = (h) => h.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            let idColIndex = headers.findIndex(h => {
                const safe = getSafeColumnName(h);
                return safe === 'id' || safe === 'sheet_id';
            });

            // System handles missing "id" header by using column 0
            if (idColIndex === -1) {
                idColIndex = 0;
            }

            const rows = data.slice(1);
            let sheetRows = 0;
            let sheetMissing = 0;

            rows.forEach(r => {
                const id = r[idColIndex] ? r[idColIndex].toString().trim() : '';
                if (id) {
                    allIds.add(id);
                    sheetRows++;
                } else {
                    sheetMissing++;
                }
            });

            totalRows += sheetRows;
            missingIdTotal += sheetMissing;
            console.log(`${title}: ${sheetRows} valid IDs, ${sheetMissing} missing`);
        }

        console.log('\n--- FINAL SUMMARY ---');
        console.log('Total Sheets:', meta.sheets.length);
        console.log('Total Rows with IDs:', totalRows);
        console.log('Total Rows Missing IDs:', missingIdTotal);
        console.log('TOTAL Unique IDs (Consolidated):', allIds.size);
    } catch (error) {
        console.error('Error:', error);
    }
}

countUniqueInSpreadsheet().then(() => process.exit());
