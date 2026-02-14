const { db } = require('./db');
const migration = async () => {
    try {
        const { rows } = await db.query("SELECT * FROM crm_leads WHERE crm_status = 'Success'");
        console.log(`Found ${rows.length} records to migrate.`);
        for (const lead of rows) {
            await db.query(`
                INSERT INTO crm_records (
                    source_id, first_name, last_name, company, email, phone, 
                    crm_status, insert_time, crm_insert_time, zoho_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    lead.source_id, lead.first_name, lead.last_name, lead.company,
                    lead.email, lead.phone, lead.crm_status, lead.insert_time,
                    lead.crm_insert_time || new Date(), lead.zoho_id
                ]
            );
        }
        await db.query("DELETE FROM crm_leads WHERE crm_status = 'Success'");
        console.log('✅ Migration to crm_records completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
};
migration();
