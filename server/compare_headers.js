const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function compareHeaders() {
    try {
        const sheets = ['Brand Leads', 'Architects & Designers INDIA 2 '];
        for (const s of sheets) {
            const data = await getSheetValues(SPREADSHEET_ID, `'${s}'!A:E`);
            console.log(`\n--- Sheet: ${s} ---`);
            console.log('Headers:', JSON.stringify(data[0]));
            if (data.length > 1) console.log('Row 2:', JSON.stringify(data[1]));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

compareHeaders().then(() => process.exit());
