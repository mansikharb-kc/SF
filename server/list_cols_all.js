const { db } = require('./db');

async function listAllColumns() {
    try {
        const { rows } = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
        console.log('--- LEADS COLUMNS ---');
        let output = "";
        rows.forEach((r, i) => {
            output += r.column_name + (i % 3 === 2 ? '\n' : ' | ');
        });
        console.log(output);

        const { rows: tempRows } = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'temp_leads'");
        console.log('\n--- TEMP_LEADS COLUMNS ---');
        let tempOutput = "";
        tempRows.forEach((r, i) => {
            tempOutput += r.column_name + (i % 3 === 2 ? '\n' : ' | ');
        });
        console.log(tempOutput);
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

listAllColumns();
