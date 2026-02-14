const { Client } = require('pg');
require('dotenv').config();

async function test() {
    console.log('Testing with individual fields...');
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected!');
        const res = await client.query('SELECT version()');
        console.log('Version:', res.rows[0].version);
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
        process.exit(0);
    }
}

test();
