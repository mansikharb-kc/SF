const { db } = require('./db');

async function dropSpecificColumns() {
    const colsToDrop = [
        'phone_number',
        'select_your_category',
        'select_your_category_',
        'what_best_describes_you_',
        'brand_',
        'please_specify_best_describes_your',
        'please_specify__brand_name_'
    ];

    try {
        const { rows } = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
        const existingLeadsCols = rows.map(r => r.column_name);

        const { rows: tempRows } = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'temp_leads'").catch(() => ({ rows: [] }));
        const existingTempCols = tempRows.map(r => r.column_name);

        console.log('--- Processing LEADS Table ---');
        for (const col of colsToDrop) {
            if (existingLeadsCols.includes(col)) {
                console.log(`Dropping ${col} from leads...`);
                await db.query(`ALTER TABLE "leads" DROP COLUMN "${col}"`);
            } else {
                console.log(`Skipping ${col} (not found in leads)`);
            }
        }

        console.log('\n--- Processing TEMP_LEADS Table ---');
        for (const col of colsToDrop) {
            if (existingTempCols.includes(col)) {
                console.log(`Dropping ${col} from temp_leads...`);
                await db.query(`ALTER TABLE "temp_leads" DROP COLUMN "${col}"`);
            } else {
                console.log(`Skipping ${col} (not found in temp_leads)`);
            }
        }

        console.log('\n✅ Requested columns removed successfully.');
    } catch (e) {
        console.error('💥 Error during drop:', e.message);
    } finally {
        process.exit();
    }
}

dropSpecificColumns();
