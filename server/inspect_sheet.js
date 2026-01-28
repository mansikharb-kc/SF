const { getSpreadsheetMetadata, getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const spreadsheetId = process.argv[2];

if (!spreadsheetId) {
    console.log('Usage: node inspect_sheet.js <SPREADSHEET_ID>');
    process.exit(1);
}

async function inspect() {
    console.log(`🔍 Inspecting Spreadsheet: ${spreadsheetId}...`);
    try {
        const meta = await getSpreadsheetMetadata(spreadsheetId);
        console.log(`\n📄 Spreadsheet Title: "${meta.properties.title}"`);
        console.log(`📑 Total Sheets: ${meta.sheets.length}\n`);

        for (const sheet of meta.sheets) {
            const title = sheet.properties.title;
            console.log(`  🔹 Sheet: ${title}`);

            // Read first row to get headers
            const values = await getSheetValues(spreadsheetId, `'${title}'!A1:ZZ1`);

            if (values && values.length > 0) {
                console.log(`     Columns: [ ${values[0].join(', ')} ]`);
            } else {
                console.log(`     (Empty or no headers found)`);
            }
            console.log('------------------------------------------------');
        }

    } catch (error) {
        console.error('❌ Error accessing sheet:', error.message);
        if (error.message.includes('monitor-credentials-file')) {
            console.log('💡 TIP: Make sure `credentials.json` is in the server folder.');
        }
    }
}

inspect();
