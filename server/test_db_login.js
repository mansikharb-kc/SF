const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://neondb_owner:npg_3GOFaqk1NtWm@ep-little-sea-ah94cclk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function test() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const { rows } = await client.query('SELECT email, password_hash, status FROM users WHERE email = $1', ['mansi.kharb@kc-one.co']);

        if (rows.length === 0) {
            console.log('User mansi.kharb@kc-one.co NOT found in DB');
            return;
        }

        const user = rows[0];
        console.log('User found:', user.email);
        console.log('Status:', user.status);
        console.log('Hash length:', user.password_hash.length);

        const isMatch = await bcrypt.compare('Admin@123', user.password_hash);
        console.log('Match with Admin@123:', isMatch);

        // Also check capitalization
        const isMatch2 = await bcrypt.compare('admin@123', user.password_hash);
        console.log('Match with admin@123 (lowercase a):', isMatch2);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

test();
