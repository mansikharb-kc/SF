require('dotenv').config();
const { db } = require('./db');

const migrate = async () => {
    try {
        console.log('Starting Migration...');
        const client = await db.connect();

        // --- ZOHO INTEGRATION COLUMNS ---
        await client.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "zoho_status" VARCHAR(20) DEFAULT 'PENDING'`);
        await client.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "zoho_id" VARCHAR(100)`);
        await client.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "zoho_insert_time" TIMESTAMP`);
        await client.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "zoho_error" TEXT`);

        // --- ZOHO CONFIG TABLE ---
        const query = `
            CREATE TABLE IF NOT EXISTS "zoho_config" (
                "id" SERIAL PRIMARY KEY,
                "access_token" TEXT,
                "refresh_token" TEXT,
                "expires_at" TIMESTAMP,
                "api_domain" VARCHAR(255) DEFAULT 'https://www.zohoapis.com'
            );
        `;
        await client.query(query);

        console.log('✅ Migration Compeleted Successfully');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
};

migrate();
