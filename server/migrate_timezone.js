const { db } = require('./db');

async function migrate() {
    try {
        console.log('🔄 Converting crm_insert_time to timestamptz...');
        await db.query('ALTER TABLE crm_leads ALTER COLUMN crm_insert_time TYPE timestamptz');
        console.log('✅ Migration successful!');

        console.log('🔍 Verifying current time in DB...');
        const { rows } = await db.query('SELECT NOW() as db_now');
        console.log('DB NOW (UTC):', rows[0].db_now);

    } catch (e) {
        console.error('❌ Migration failed:', e.message);
    } finally {
        process.exit();
    }
}

migrate();
