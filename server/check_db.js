const { Client } = require('pg');
require('dotenv').config();

async function check() {
    console.log('--- Database Connection Check (Neon) ---');
    console.log('URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Connection to Neon PostgreSQL: SUCCESS');

        const res = await client.query('SELECT current_database(), current_user, version()');
        console.log('Database Info:', res.rows[0]);

        await client.end();
        console.log('--- Done ---');
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        console.error('Full Error:', error);
    }
}

check();
