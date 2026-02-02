const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function analyzeSpreadsheet() {
    try {
        console.log('--- Deep Spreadsheet Analysis ---');
        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);

        let totalRows = 0;
        let totalMissingId = 0;
        let globalIdMap = new Map(); // id -> count
        let sheetsInfo = [];

        for (const sheet of meta.sheets) {
            const title = sheet.properties.title;
            // Get all data for analysis
            const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:ZZ`);

            if (!data || data.length <= 1) {
                sheetsInfo.push({ title, total: 0, missingId: 0, duplicates: 0, unique: 0 });
                continue;
            }

            const headers = data[0];
            const rows = data.slice(1);

            // Find ID column index
            const idColIndex = headers.findIndex(h => h.toLowerCase() === 'id' || h.toLowerCase() === 'sheet_id');

            let sheetRows = rows.length;
            let sheetMissingId = 0;
            let sheetDuplicates = 0;
            let sheetUnique = 0;

            rows.forEach(row => {
                const id = idColIndex !== -1 ? (row[idColIndex] || '').toString().trim() : '';

                if (!id) {
                    sheetMissingId++;
                } else {
                    if (globalIdMap.has(id)) {
                        globalIdMap.set(id, globalIdMap.get(id) + 1);
                        sheetDuplicates++;
                    } else {
                        globalIdMap.set(id, 1);
                        sheetUnique++;
                    }
                }
            });

            totalRows += sheetRows;
            totalMissingId += sheetMissingId;

            sheetsInfo.push({
                title,
                total: sheetRows,
                missingId: sheetMissingId,
                duplicates: sheetDuplicates,
                unique: sheetUnique
            });
            console.log(`Analyzed: "${title}" (${sheetRows} rows)`);
        }

        const totalUniqueAcrossAll = globalIdMap.size;
        const totalDuplicatesAcrossAll = totalRows - totalMissingId - totalUniqueAcrossAll;

        console.log('\n========================================');
        console.log('          FINAL SUMMARY REPORT          ');
        console.log('========================================');
        console.log(`Total Rows Analyzed:       ${totalRows}`);
        console.log(`Rows with Missing IDs:      ${totalMissingId}`);
        console.log(`Duplicate Records Found:    ${totalDuplicatesAcrossAll}`);
        console.log(`Total Unique Records:       ${totalUniqueAcrossAll}`);
        console.log('========================================');

        console.log('\nSheet-wise Breakdown:');
        console.table(sheetsInfo);

    } catch (error) {
        console.error('Analysis failed:', error);
    }
}

analyzeSpreadsheet().then(() => process.exit());
