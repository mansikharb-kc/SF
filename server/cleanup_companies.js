const { db } = require('./db');

const cleanupCompanies = async () => {
    try {
        console.log('🔄 Cleaning up company names...');

        // Update crm_leads: Set to NULL if 'Individual' or empty
        const leadsRes = await db.query(`
            UPDATE crm_leads 
            SET company = NULL 
            WHERE company = 'Individual' 
               OR company = '' 
               OR company IS NULL
        `);
        console.log(`✅ crm_leads: Updated successfully.`);

        // Update crm_records: Set to NULL if 'Individual' or empty
        const recordsRes = await db.query(`
            UPDATE crm_records 
            SET company = NULL 
            WHERE company = 'Individual' 
               OR company = '' 
               OR company IS NULL
        `);
        console.log(`✅ crm_records: Updated successfully.`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed:', err.message);
        process.exit(1);
    }
};

cleanupCompanies();
