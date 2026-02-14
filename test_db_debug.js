const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function test() {
    let log = 'Testing...\n';
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
        log += '✅ Connected!\n';
        const res = await client.query('SELECT version()');
        log += 'Version: ' + res.rows[0].version + '\n';
    } catch (err) {
        log += '❌ Error: ' + err.message + '\n';
        log += 'Code: ' + err.code + '\n';
        log += 'Stack: ' + err.stack + '\n';
    } finally {
        await client.end();
        fs.writeFileSync('db_test_result.txt', log);
        process.exit(0);
    }
}

test();
