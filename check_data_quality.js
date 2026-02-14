const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT full_name, please_specify, \"please_specify__brand_name_\", \"company___brand_name\", email, phone, phone_number FROM leads WHERE full_name IS NOT NULL LIMIT 10");
        console.log('Sample Leads Data:');
        res.rows.forEach((row, i) => {
            console.log(`--- Lead ${i + 1} ---`);
            console.log(row);
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
