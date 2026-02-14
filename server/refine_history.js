const { db } = require('./db');

async function refineHistoryData() {
    console.log('🔍 Matching and Refining History Data (crm_records)...');

    try {
        const query = `
            SELECT cr.id as record_id, cr.source_id, l.*
            FROM crm_records cr
            JOIN leads l ON cr.source_id = l.sheet_id
            WHERE (cr.company IS NULL AND (l.company_name IS NOT NULL OR l.brand_name IS NOT NULL))
               OR (cr.email IS NULL AND l.email IS NOT NULL)
               OR (cr.first_name = '' AND (l.full_name != '' OR l.full_name IS NOT NULL));
        `;

        const { rows: dataToFix } = await db.query(query);
        console.log(`📊 Found ${dataToFix.length} history records to refine.`);

        for (const lead of dataToFix) {
            const fullName = lead.full_name || '';
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

            const company = lead.company_name || lead.brand_name || null;
            const email = lead.email || null;

            await db.query(`
                UPDATE crm_records 
                SET first_name = COALESCE(NULLIF($1, ''), first_name),
                    last_name = CASE WHEN last_name = 'Unknown' OR last_name = '' THEN $2 ELSE last_name END,
                    company = COALESCE(company, $3),
                    email = COALESCE(email, $4)
                WHERE id = $5
            `, [firstName, lastName, company, email, lead.record_id]);
        }

        console.log(`✅ History Refinement Complete.`);

    } catch (error) {
        console.error('❌ Error during refinement:', error.message);
    } finally {
        process.exit(0);
    }
}

refineHistoryData();
