const { db } = require('./db');

async function dropFuzzyColumns() {
    const targets = [
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
        const existingCols = rows.map(r => r.column_name);

        console.log('--- Cleaning Leads Table ---');

        for (const col of existingCols) {
            // Check if column EXACTLY matches or is a prefix/suffix of the target
            // OR if it contains the target words
            const shouldDrop = targets.some(t => {
                if (col === t) return true;
                if (t.endsWith('_') && col === t.slice(0, -1)) return true;
                if (!t.endsWith('_') && col === t + '_') return true;
                return false;
            });

            if (shouldDrop) {
                console.log(`Action: Dropping "${col}"`);
                await db.query(`ALTER TABLE "leads" DROP COLUMN "${col}"`);
            }
        }

        console.log('\n--- Checking for other long specify/category columns ---');
        // The user seems to want to clean up these long sheet-imported names
        for (const col of existingCols) {
            if (col.includes('select_your_category') ||
                col.includes('please_specify') ||
                (col.includes('brand_') && col.length > 7)) {

                // If we didn't already drop it
                try {
                    console.log(`Deep Action: Dropping likely unwanted column "${col}"`);
                    await db.query(`ALTER TABLE "leads" DROP COLUMN "${col}"`);
                } catch (e) {
                    // might already be dropped
                }
            }
        }

        console.log('\n✅ Cleanup Finished.');
    } catch (e) {
        console.error('💥 Error:', e.message);
    } finally {
        process.exit();
    }
}

dropFuzzyColumns();
