const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
const { sanitizeIdentifier } = require('./services/dbService');
require('dotenv').config();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function analyzeSheets() {
    try {
        console.log(`--- Spreadsheet Analysis (ID: ${SPREADSHEET_ID}) ---`);
        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        const sheets = meta.sheets;

        let totalRowsInAllSheets = 0;
        let totalMissingIdRecords = 0;
        const sheetDetails = [];

        for (const sheet of sheets) {
            const title = sheet.properties.title;
            const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:ZZ`);

            if (!data || data.length === 0) {
                sheetDetails.push({ sheet: title, rows: 0, missingIds: 0 });
                continue;
            }

            const headers = data[0];
            const rows = data.slice(1);
            let idColIndex = headers.findIndex(h => sanitizeIdentifier(h) === 'sheet_id' || sanitizeIdentifier(h) === 'id');

            // Fallback to first column if no "id" column found
            if (idColIndex === -1 && headers.length > 0) idColIndex = 0;

            let missingIdsInSheet = 0;
            rows.forEach(row => {
                const idValue = idColIndex !== -1 ? (row[idColIndex] || '').toString().trim() : '';
                if (!idValue) {
                    missingIdsInSheet++;
                }
            });

            totalRowsInAllSheets += rows.length;
            totalMissingIdRecords += missingIdsInSheet;

            sheetDetails.push({
                sheet: title,
                totalRows: rows.length,
                missingIds: missingIdsInSheet,
                validIds: rows.length - missingIdsInSheet
            });

            // Small sleep to avoid rate limits
            await new Promise(r => setTimeout(r, 200));
        }

        console.table(sheetDetails);
        console.log('\n--- Final Summary ---');
        console.log(`Total Rows (excluding headers): ${totalRowsInAllSheets}`);
        console.log(`Total Records Missing ID:      ${totalMissingIdRecords}`);
        console.log(`Total Records with Valid ID:   ${totalRowsInAllSheets - totalMissingIdRecords}`);

    } catch (err) {
        console.error('Analysis failed:', err.message);
    } finally {
        process.exit();
    }
}

analyzeSheets();
