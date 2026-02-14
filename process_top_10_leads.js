const { db } = require('./server/db');

async function setup() {
    try {
        console.log('Ensuring crm_leads table schema is correct...');

        await db.query(`
            ALTER TABLE crm_leads 
            ADD COLUMN IF NOT EXISTS last_name TEXT,
            ADD COLUMN IF NOT EXISTS company TEXT,
            ADD COLUMN IF NOT EXISTS email TEXT,
            ADD COLUMN IF NOT EXISTS phone TEXT,
            ADD COLUMN IF NOT EXISTS category_l1 TEXT
        `);

        console.log('Fetching first 10 leads from leads table...');
        const { rows: leads } = await db.query("SELECT * FROM leads ORDER BY _created_at ASC LIMIT 10");

        for (const lead of leads) {
            // Mapping logic
            let firstName = '';
            let lastName = 'Unknown';

            const fullName = lead.full_name || lead.name || '';
            if (fullName) {
                const parts = fullName.trim().split(/\s+/);
                if (parts.length > 1) {
                    firstName = parts[0];
                    lastName = parts.slice(1).join(' ');
                } else {
                    lastName = parts[0];
                }
            }

            // "company name contain brand name"
            // Let's use any column that looks like brand or company
            const company = lead.brand_name || lead.brand_ || lead.company_name || lead.company || 'Individual';

            const email = lead.email;
            const phone = lead.phone ? String(lead.phone).replace(/\D/g, '') : null;

            // "Category L1 contains select_your_category"
            const categoryL1 = lead.select_your_category_ || lead.select_your_category || lead.what_best_describes_you_ || null;

            console.log(`Mapping: [${fullName}] -> FN:${firstName}, LN:${lastName}, Co:${company}, Cat:${categoryL1}`);

            const { rows: existing } = await db.query("SELECT id FROM crm_leads WHERE source_id = $1", [lead.sheet_id]);

            if (existing.length === 0) {
                await db.query(`
                    INSERT INTO crm_leads (source_id, first_name, last_name, company, email, phone, category_l1, insert_time, crm_status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'Pending')
                `, [lead.sheet_id, firstName, lastName, company, email, phone, categoryL1]);
            } else {
                await db.query(`
                    UPDATE crm_leads 
                    SET first_name = $1, last_name = $2, company = $3, email = $4, phone = $5, category_l1 = $6, crm_status = 'Pending'
                    WHERE source_id = $7
                `, [firstName, lastName, company, email, phone, categoryL1, lead.sheet_id]);
            }
        }

        console.log('Final verification (Top 3):');
        const verify = await db.query("SELECT first_name, last_name, company, category_l1 FROM crm_leads ORDER BY id DESC LIMIT 3");
        console.log(verify.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

setup();
