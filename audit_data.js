const { db } = require('./server/db');

async function audit() {
    try {
        console.log('--- 📊 Comparing leads vs crm_leads ---');

        const { rows: leadsCount } = await db.query("SELECT COUNT(*) FROM leads");
        const { rows: crmLeadsCount } = await db.query("SELECT COUNT(*) FROM crm_leads");

        console.log(`Total Leads: ${leadsCount[0].count}`);
        console.log(`Total Staged: ${crmLeadsCount[0].count}`);

        console.log('\n--- 🧐 Checking for records with potentially missing data ---');

        // Find records where major fields are missing in crm_leads but present in leads
        const { rows: missingDataLeads } = await db.query(`
            SELECT c.*, l.full_name as raw_full_name, l.email as raw_email, l.phone as raw_phone
            FROM crm_leads c
            JOIN leads l ON c.source_id = l.sheet_id
            WHERE (c.email IS NULL AND l.email IS NOT NULL AND l.email <> '')
               OR (c.phone IS NULL AND l.phone IS NOT NULL AND l.phone <> '')
            LIMIT 5
        `);

        if (missingDataLeads.length > 0) {
            console.log('Found records with data mismatch:');
            missingDataLeads.forEach(row => {
                console.log(`\nID: ${row.id} (Source: ${row.source_id})`);
                console.log(`  CRM Email: ${row.email} | RAW Email: ${row.raw_email}`);
                console.log(`  CRM Phone: ${row.phone} | RAW Phone: ${row.raw_phone}`);
                console.log(`  Full Name: ${row.raw_full_name}`);
            });
        } else {
            console.log('No immediate mismatch found on email/phone filters.');
        }

        console.log('\n--- 📋 Sample Raw Columns for different rows ---');
        const { rows: samples } = await db.query("SELECT * FROM leads LIMIT 10");
        samples.forEach((row, i) => {
            const filledCols = Object.entries(row).filter(([k, v]) => v !== null && v !== '').map(([k]) => k);
            console.log(`Row ${i} filled columns:`, filledCols.join(', '));
        });

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        process.exit(0);
    }
}

audit();
