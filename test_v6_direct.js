const { Client } = require('pg');

async function testIPv6() {
    console.log('Testing connection to Supabase via IPv6 address...');

    // Using individual params to avoid URL parsing issues with special chars or IPv6 brackets
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
        console.log('✅ Connected via IPv6 address!');
        const res = await client.query('SELECT 1');
        console.log('Test Query Result:', res.rows[0]);
    } catch (err) {
        console.error('❌ IPv6 Connection Failed!');
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}

testIPv6();
