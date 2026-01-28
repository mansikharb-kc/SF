const { syncSheetToDb } = require('./services/syncService');
require('dotenv').config();

const spreadsheetId = process.env.SPREADSHEET_ID;

if (!spreadsheetId) {
    console.error('❌ SPREADSHEET_ID is missing in .env');
    process.exit(1);
}

console.log(`🚀 Starting Manual Sync Test for ID: ${spreadsheetId}`);

syncSheetToDb('MANUAL')
    .then(result => {
        console.log('✅ Sync Success!');
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Sync Failed:', err);
        process.exit(1);
    });
