const { Client } = require('pg');

async function testPooler() {
    console.log('Testing connection to Supabase via IPv4 Pooler (ap-southeast-1)...');

    const client = new Client({
        user: 'postgres.yuchzgwjwsiiromozbpc',
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        database: 'postgres',
        password: '[SCQFnqN%F!z6k7#]',
        port: 6543,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected via IPv4 Pooler!');
        const res = await client.query('SELECT version()');
        console.log('Version:', res.rows[0].version);
    } catch (err) {
        console.error('❌ Pooler Connection Failed!');
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}

testPooler();
