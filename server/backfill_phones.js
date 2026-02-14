const { db } = require('./db');

async function fixPhones() {
    console.log('🚀 Starting Phone Backfill Process...');

    try {
        // 1. Fix crm_leads
        console.log('--- Fixing crm_leads ---');
        const fixCrmLeads = `
            UPDATE crm_leads 
            SET phone = REPLACE(REPLACE(COALESCE(leads.phone, leads.phone_number), 'p:', ''), ' ', '')
            FROM leads 
            WHERE crm_leads.source_id = leads.sheet_id 
              AND (crm_leads.phone IS NULL OR crm_leads.phone = '')
              AND (leads.phone IS NOT NULL OR leads.phone_number IS NOT NULL);
        `;
        const res1 = await db.query(fixCrmLeads);
        console.log(`✅ Fixed ${res1.rowCount} records in crm_leads`);

        // 2. Fix crm_records
        console.log('--- Fixing crm_records ---');
        const fixCrmRecords = `
            UPDATE crm_records 
            SET phone = REPLACE(REPLACE(COALESCE(leads.phone, leads.phone_number), 'p:', ''), ' ', '')
            FROM leads 
            WHERE crm_records.source_id = leads.sheet_id 
              AND (crm_records.phone IS NULL OR crm_records.phone = '')
              AND (leads.phone IS NOT NULL OR leads.phone_number IS NOT NULL);
        `;
        const res2 = await db.query(fixCrmRecords);
        console.log(`✅ Fixed ${res2.rowCount} records in crm_records`);

        console.log('\n🏁 Backfill Complete.');
    } catch (error) {
        console.error('❌ Error during backfill:', error.message);
    } finally {
        process.exit(0);
    }
}

fixPhones();
