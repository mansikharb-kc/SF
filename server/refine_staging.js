const { db } = require('./db');

async function refineStagingData() {
    console.log('🔍 Matching and Refining Staging Data (crm_leads)...');

    try {
        // 1. Fetch all leads that need refining
        const query = `
            SELECT cl.id as crm_id, cl.source_id, l.*
            FROM crm_leads cl
            JOIN leads l ON cl.source_id = l.sheet_id
            WHERE (cl.company IS NULL AND (l.company_name IS NOT NULL OR l.brand_name IS NOT NULL))
               OR (cl.email IS NULL AND l.email IS NOT NULL)
               OR (cl.first_name = '' AND (l.full_name != '' OR l.full_name IS NOT NULL))
               OR (cl.phone IS NULL AND (l.phone IS NOT NULL OR l.phone_number IS NOT NULL));
        `;

        const { rows: dataToFix } = await db.query(query);
        console.log(`📊 Found ${dataToFix.length} records to refine.`);

        let updatedCount = 0;

        for (const lead of dataToFix) {
            // Helper to get value from multiple possible columns
            const getVal = (keys) => {
                for (const k of keys) {
                    if (lead[k] && String(lead[k]).trim() !== '') return lead[k];
                }
                return null;
            };

            // Derive names
            const fullName = lead.full_name || '';
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

            // Derive company
            const company = getVal(['company_name', 'brand___company_name', 'brand_name', 'company___brand_name']);

            // Derive phone
            const rawPhone = getVal(['phone', 'phone_number', 'mobile']);
            const cleanPhone = rawPhone ? String(rawPhone).replace(/^p:/i, '').replace(/[^\d+]/g, '') : null;

            const email = getVal(['email', 'mail']);

            // Update the staging record
            await db.query(`
                UPDATE crm_leads 
                SET first_name = COALESCE(NULLIF($1, ''), first_name),
                    last_name = CASE WHEN last_name = 'Unknown' OR last_name = '' THEN $2 ELSE last_name END,
                    company = COALESCE(company, $3),
                    email = COALESCE(email, $4),
                    phone = COALESCE(phone, $5)
                WHERE id = $6
            `, [firstName, lastName, company, email, cleanPhone, lead.crm_id]);

            updatedCount++;
            if (updatedCount % 100 === 0) console.log(`...Processed ${updatedCount} records`);
        }

        console.log(`\n✅ Refinement Complete! ${updatedCount} records matched and updated.`);

    } catch (error) {
        console.error('❌ Error during refinement:', error.message);
    } finally {
        process.exit(0);
    }
}

refineStagingData();
