const { db } = require('./db');

async function checkZohoStatus() {
    console.log('--- Checking Zoho Configuration in DB ---');
    try {
        const res = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'zoho_config';
        `);

        if (res.rows.length === 0) {
            console.log('❌ Table "zoho_config" does NOT exist.');
        } else {
            console.log('✅ Table "zoho_config" exists.');
            const countRes = await db.query('SELECT COUNT(*) FROM "zoho_config"');
            console.log(`Rows in zoho_config: ${countRes.rows[0].count}`);

            if (countRes.rows[0].count > 0) {
                const data = await db.query('SELECT * FROM "zoho_config" LIMIT 1');
                console.log('Config found (masked):', {
                    ...data.rows[0],
                    access_token: data.rows[0].access_token ? '***' : null,
                    refresh_token: data.rows[0].refresh_token ? '***' : null
                });
            } else {
                console.log('⚠️  Table is empty. No tokens stored.');
            }
        }

    } catch (error) {
        console.error('❌ Database Error:', error.message);
    } finally {
        await db.end();
    }
}

checkZohoStatus();
