const { db } = require('./db');

async function syncToCrmStaging() {
    console.log('--- Syncing Leads to CRM Staging ---');
    try {
        // 1. Fetch records not yet in staging
        const fetchQuery = `
            SELECT * 
            FROM leads 
            WHERE sheet_id NOT IN (SELECT source_id FROM crm_leads)
            LIMIT 100;
        `;
        const { rows: newLeads } = await db.query(fetchQuery);
        console.log(`Found ${newLeads.length} new records to stage.`);

        for (const lead of newLeads) {
            // Mapping logic inspired by zohoService.js mapLeadData
            const findValue = (keywords) => {
                const key = Object.keys(lead).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
                return key ? lead[key] : null;
            };

            const firstName = findValue(['first_name', 'fname']) || '';
            const lastName = findValue(['last_name', 'lname', 'surname']) || lead.full_name || 'Unknown';
            const company = findValue(['company', 'brand', 'firm']) || lead.brand_name || 'Individual';
            const email = findValue(['email', 'mail']);
            const phone = findValue(['phone', 'mobile']);

            // Phone sanitize
            const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

            try {
                await db.query(`
                    INSERT INTO crm_leads (source_id, first_name, last_name, company, email, phone, insert_time)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [lead.sheet_id, firstName, lastName, company, email, cleanPhone, lead._created_at || new Date()]);

                console.log(`✅ Staged lead: ${lead.sheet_id}`);
            } catch (insertError) {
                console.error(`❌ Error staging lead ${lead.sheet_id}:`, insertError.message);
            }
        }

        console.log('--- Staging Sync Done ---');
    } catch (error) {
        console.error('--- Staging Sync Failed ---', error);
    } finally {
        await db.end();
    }
}

syncToCrmStaging();
