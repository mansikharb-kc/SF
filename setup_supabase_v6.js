const { Client } = require('pg');

async function setupSupabase() {
    console.log('Trying IPv6 direct address...');
    const client = new Client({
        user: 'postgres',
        host: '2406:da1a:6b0:f612:3609:5601:be4b:9b1f',
        database: 'postgres',
        password: '[SCQFnqN%F!z6k7#]',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Supabase via IPv6!');

        await client.query(`
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

        await client.query(`
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

        console.log('✅ Tables created!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}

setupSupabase();
