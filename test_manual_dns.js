const { Client } = require('pg');
const dns = require('dns');

// Custom DNS lookup to IPv6 address for db.yuchzgwjwsiiromozbpc.supabase.co
const lookup = (hostname, options, callback) => {
    if (hostname === 'db.yuchzgwjwsiiromozbpc.supabase.co') {
        return callback(null, '2406:da1a:6b0:f612:3609:5601:be4b:9b1f', 6);
    }
    return dns.lookup(hostname, options, callback);
};

async function testWithCustomDNS() {
    console.log('Testing connection with Manual IPv6 resolution...');

    const client = new Client({
        user: 'postgres',
        host: 'db.yuchzgwjwsiiromozbpc.supabase.co',
        database: 'postgres',
        password: '[SCQFnqN%F!z6k7#]',
        port: 5432,
        ssl: { rejectUnauthorized: false },
        // Pg driver allows passing a lookup function
        lookup: lookup
    });

    try {
        await client.connect();
        console.log('✅ Connected successfully to Supabase!');
        const res = await client.query('SELECT version()');
        console.log('Database Version:', res.rows[0].version);

        // Also check if tables exist
        const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables present:', tables.rows.map(t => t.table_name).join(', '));

    } catch (err) {
        console.error('❌ Connection Failed!');
        console.error('Error:', err.message);
        console.error('Full Error Detail:', err);
    } finally {
        await client.end();
        process.exit(0);
    }
}

testWithCustomDNS();
