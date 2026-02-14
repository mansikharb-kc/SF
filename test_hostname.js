const { Client } = require('pg');
const net = require('net');

async function testHostnameWithFamily() {
    console.log('Testing connection with family: 6 option...');

    const client = new Client({
        user: 'postgres',
        host: 'db.yuchzgwjwsiiromozbpc.supabase.co',
        database: 'postgres',
        password: '[SCQFnqN%F!z6k7#]',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected via Hostname!');
        const res = await client.query('SELECT version()');
        console.log('Version:', res.rows[0].version);
    } catch (err) {
        console.error('❌ Hostname Connection Failed!');
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}

testHostnameWithFamily();
