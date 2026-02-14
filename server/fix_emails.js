const { db } = require('./db');

async function fixEmailMismatches() {
    console.log('🚀 Starting Email Matching and Cleanup...');

    try {
        // 1. Unified check for crm_leads
        console.log('--- Syncing crm_leads emails with master leads ---');
        const syncCrmEmails = `
            UPDATE crm_leads 
            SET email = leads.email
            FROM leads 
            WHERE crm_leads.source_id = leads.sheet_id 
              AND leads.email IS NOT NULL 
              AND leads.email != ''
              AND (crm_leads.email != leads.email OR crm_leads.email IS NULL OR crm_leads.email = '');
        `;
        const res1 = await db.query(syncCrmEmails);
        console.log(`✅ Updated ${res1.rowCount} records in crm_leads to match master email.`);

        // 2. Unified check for crm_records (history)
        console.log('--- Syncing crm_records emails with master leads ---');
        const syncHistoryEmails = `
            UPDATE crm_records 
            SET email = leads.email
            FROM leads 
            WHERE crm_records.source_id = leads.sheet_id 
              AND leads.email IS NOT NULL 
              AND leads.email != ''
              AND (crm_records.email != leads.email OR crm_records.email IS NULL OR crm_records.email = '');
        `;
        const res2 = await db.query(syncHistoryEmails);
        console.log(`✅ Updated ${res2.rowCount} records in crm_records to match master email.`);

        console.log('\n🏁 Email Synchronization Complete.');
    } catch (error) {
        console.error('❌ Error during email sync:', error.message);
    } finally {
        process.exit(0);
    }
}

fixEmailMismatches();
