const { getSheetValues } = require('./services/sheetService');
require('dotenv').config();

const SPREADSHEET_ID = '17uLgiXTVzIDjP67K9-HzCbiWDOlB3B4LnEZQj8EvArU';

async function listAllMissingImmersiveHub() {
    try {
        const title = 'Immersive Hub - Brands (NCR)';
        const data = await getSheetValues(SPREADSHEET_ID, `'${title}'!A:Z`);
        if (!data || data.length <= 1) {
            console.log('No data found in sheet.');
            return;
        }

        const headers = data[0];
        const rows = data.slice(1);

        console.log(`\n--- LISTING ALL ROWS MISSING IDs IN: ${title} ---`);

        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
        const phoneIdx = headers.findIndex(h => h.toLowerCase().includes('phone'));
        const emailIdx = headers.findIndex(h => h.toLowerCase().includes('email'));
        const jobIdx = headers.findIndex(h => h.toLowerCase().includes('job'));

        let count = 0;
        rows.forEach((row, i) => {
            // Check if Column A is empty BUT row has some data
            if (!row[0] && row.some(cell => cell && cell.trim())) {
                count++;
                console.log(`Row ${i + 2}:`);
                console.log(`  Name:  ${row[nameIdx] || 'N/A'}`);
                console.log(`  Phone: ${row[phoneIdx] || 'N/A'}`);
                console.log(`  Email: ${row[emailIdx] || 'N/A'}`);
                console.log(`  Job:   ${row[jobIdx] || 'N/A'}`);
                console.log('-----------------------------------');
            }
        });

        console.log(`\nTotal Missing ID rows found with data: ${count}`);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

listAllMissingImmersiveHub().then(() => process.exit());
