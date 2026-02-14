const { Client } = require('pg');
require('dotenv').config();

async function testDirect() {
    const passwords = [
        '[SCQFnqN%F!z6k7#]',
        'SCQFnqN%F!z6k7#'
    ];

    for (const pass of passwords) {
        console.log(`Testing with password: ${pass} ...`);
        const client = new Client({
            user: 'postgres.yuchzgwjwsiiromozbpc',
            host: 'aws-1-ap-south-1.pooler.supabase.com',
            database: 'postgres',
            password: pass,
            port: 5432,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log(`✅ SUCCESS with ${pass}`);
            await client.end();
            process.exit(0);
        } catch (err) {
            console.error(`❌ Failed: ${err.message}`);
        } finally {
            try { await client.end(); } catch (e) { }
        }
    }
    process.exit(1);
}

testDirect();
