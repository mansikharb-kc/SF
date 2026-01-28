const { Client } = require('pg');
require('dotenv').config();

async function check() {
    console.log('--- Database Connection Check ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    // Do not log password
    console.log('Database:', process.env.DB_NAME);

    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres'
    });

    try {
        await client.connect();
        console.log('✅ Connection to PostgreSQL Server: SUCCESS');

        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [process.env.DB_NAME]);
        if (res.rowCount === 0) {
            console.log(`Database ${process.env.DB_NAME} does NOT exist. Creating...`);
            await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
            console.log(`✅ Database ${process.env.DB_NAME}: CREATED`);
        } else {
            console.log(`✅ Database ${process.env.DB_NAME}: EXISTS`);
        }

        await client.end();
        console.log('--- Done ---');
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        console.error('Full Error:', error);
    }
}

check();
