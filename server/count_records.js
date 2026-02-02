const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function countAllRecords() {
    try {
        console.log('--- Spreadsheet Record Count ---');
        const meta = await getSpreadsheetMetadata(SPREADSHEET_ID);
        let totalRecords = 0;
        let sheetCount = 0;

        for (const sheet of meta.sheets) {
            const title = sheet.properties.title;
            // Fetching just 1 column to minimize data transfer
            const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:A`);

            if (data && data.length > 0) {
                const count = data.length - 1; // Subtract header row
                const validCount = Math.max(0, count);
                console.log(`Sheet: "${title}" -> ${validCount} records`);
                totalRecords += validCount;
                sheetCount++;
            } else {
                console.log(`Sheet: "${title}" -> 0 records`);
            }
        }

        console.log('--------------------------------');
        console.log(`Total Sheets: ${meta.sheets.length}`);
        console.log(`Total Records (All Sheets): ${totalRecords}`);
        console.log('--------------------------------');
    } catch (error) {
        console.error('Error counting records:', error.message);
    }
}

countAllRecords().then(() => process.exit());
