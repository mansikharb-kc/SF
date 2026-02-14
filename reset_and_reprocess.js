const { db } = require('./server/db');

/**
 * 🚀 ROBUST RESET & REPROCESS SCRIPT (Supabase Version)
 * Maps data from Google Sheets (leads table) to CRM Staging (crm_leads table)
 * Mapping Rules:
 * - Names: Split full_name into first_name and last_name
 * - Company: Maps "please_specify (Brand Name)" as company
 * - Phone/Email: Robust cleaning and mapping
 * - Category: Maps "lead_source" or "campaign_name"
 */
async function resetAndReprocess() {
    const client = await db.connect();
    try {
        console.log('🗑️ Clearing crm_leads staging table on Supabase...');
        await client.query("BEGIN");
        await client.query("DELETE FROM crm_leads");

        console.log('📥 Fetching all leads from source table...');
        const { rows: leads } = await client.query('SELECT * FROM "leads" ORDER BY "_created_at" ASC');

        if (leads.length === 0) {
            console.log('⚠️ No data found in "leads" table. Make sure the Google Sheet sync has completed first.');
            await client.query("ROLLBACK");
            return;
        }

        console.log(`⚙️ Processing ${leads.length} leads with specific formatting rules...`);

        const chunkSize = 100;
        for (let i = 0; i < leads.length; i += chunkSize) {
            const chunk = leads.slice(i, i + chunkSize);
            const values = [];
            let placeholderIndex = 1;

            const placeholders = chunk.map(lead => {
                // Formatting Helpers
                const findVal = (keywords) => {
                    const key = Object.keys(lead).find(k => {
                        const lowK = k.toLowerCase();
                        return keywords.some(kw => lowK === kw.toLowerCase() || lowK.includes(kw.toLowerCase()));
                    });
                    return key ? lead[key] : null;
                };

                // 1. Name Splitting
                let firstName = '';
                let lastName = 'Unknown';
                const fullNameRaw = findVal(['full_name', 'contact_name', 'name_']) || '';
                const fullName = String(fullNameRaw).trim();

                if (fullName) {
                    const parts = fullName.split(/\s+/);
                    if (parts.length > 1) {
                        firstName = parts[0];
                        lastName = parts.slice(1).join(' ');
                    } else {
                        firstName = '';
                        lastName = parts[0] || 'Unknown';
                    }
                } else {
                    lastName = 'Unknown';
                }

                // 2. Company / Brand 
                // Prioritize specific "please specify" brand columns as requested
                const companyRaw = findVal([
                    'please_specify__brand_name_',
                    'company___brand_name',
                    'brand___company_name',
                    'brand_name',
                    'company_name',
                    'please_specify',
                    'brand_'
                ]) || 'Individual';
                const company = String(companyRaw).trim() || 'Individual';

                // 3. Email
                const emailRaw = findVal(['email', 'mail']);
                const email = emailRaw ? String(emailRaw).trim().toLowerCase() : null;

                // 4. Phone (Cleaned of p:+, etc)
                let phoneRaw = findVal(['phone', 'mobile', 'contact_no', 'phone_number']);
                if (phoneRaw) {
                    phoneRaw = String(phoneRaw).replace(/^p:/i, '').replace(/\+/g, '').replace(/\s/g, '');
                }
                const phone = phoneRaw ? String(phoneRaw).replace(/[^0-9]/g, '') : null;

                // 5. Category / Lead Source
                const categoryL1 = findVal(['lead_source', 'campaign_name', 'platform', 'form_name']) || 'General';

                values.push(lead.sheet_id, firstName, lastName, company, email, phone, categoryL1);

                const currentPlaceholders = `($${placeholderIndex}, $${placeholderIndex + 1}, $${placeholderIndex + 2}, $${placeholderIndex + 3}, $${placeholderIndex + 4}, $${placeholderIndex + 5}, $${placeholderIndex + 6}, NOW(), 'Pending')`;
                placeholderIndex += 7;
                return currentPlaceholders;
            }).join(', ');

            await client.query(`
                INSERT INTO crm_leads (source_id, first_name, last_name, company, email, phone, category_l1, insert_time, crm_status)
                VALUES ${placeholders}
                ON CONFLICT (source_id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    company = EXCLUDED.company,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    category_l1 = EXCLUDED.category_l1
            `, values);

            if ((i + chunkSize) % 1000 === 0 || (i + chunkSize) >= leads.length) {
                console.log(`✅ Staged ${Math.min(i + chunkSize, leads.length)} / ${leads.length} leads...`);
            }
        }

        await client.query("COMMIT");
        console.log('🎉 RE-PROCESSING COMPLETE WITH FORMATTED DATA!');

    } catch (error) {
        await client.query("ROLLBACK");
        console.error('❌ Error during re-processing:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

resetAndReprocess();
