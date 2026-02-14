const { db } = require('./server/db');

async function setupSupabase() {
    try {
        console.log('🏗️ Initializing tables on Supabase...');

        // Create Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                status TEXT DEFAULT 'Pending',
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Create Leads table
        await db.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                sheet_id TEXT UNIQUE,
                full_name TEXT,
                brand_name TEXT,
                company_name TEXT,
                email TEXT,
                phone TEXT,
                phone_number TEXT,
                select_your_category TEXT,
                select_your_category_ TEXT,
                what_best_describes_you_ TEXT,
                brand_ TEXT,
                please_specify_best_describes_your TEXT,
                please_specify__brand_name_ TEXT,
                brand___company_name_______ TEXT,
                zoho_status TEXT DEFAULT 'PENDING',
                zoho_id TEXT,
                zoho_insert_time TIMESTAMP,
                zoho_error TEXT,
                _created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Create CRM Leads table
        await db.query(`
            CREATE TABLE IF NOT EXISTS crm_leads (
                id SERIAL PRIMARY KEY,
                source_id TEXT UNIQUE,
                first_name TEXT,
                last_name TEXT,
                company TEXT,
                email TEXT,
                phone TEXT,
                category_l1 TEXT,
                insert_time TIMESTAMP DEFAULT NOW(),
                crm_status TEXT DEFAULT 'Pending',
                crm_insert_time TIMESTAMP,
                error_message TEXT
            );
        `);

        // Create Sync Logs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS sync_logs (
                id SERIAL PRIMARY KEY,
                sheet_name VARCHAR(255),
                table_name VARCHAR(255),
                batch_id VARCHAR(64),
                status VARCHAR(50),
                trigger_type VARCHAR(20) DEFAULT 'MANUAL',
                inserted_count INT DEFAULT 0,
                temp_inserted_count INT DEFAULT 0,
                leads_deleted_count INT DEFAULT 0,
                leads_inserted_count INT DEFAULT 0,
                sync_time TIMESTAMP DEFAULT NOW(),
                sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                records_processed INTEGER,
                errors TEXT
            );
        `);

        console.log('✅ All tables initialized successfully!');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        process.exit(0);
    }
}

setupSupabase();
