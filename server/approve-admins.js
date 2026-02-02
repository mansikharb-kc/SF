const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://neondb_owner:npg_3GOFaqk1NtWm@ep-little-sea-ah94cclk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function approveUser(email) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);

        if (rows.length === 0) {
            const hash = await bcrypt.hash('Admin@123', 10);
            await client.query(
                'INSERT INTO users (email, password, role, is_approved) VALUES ($1, $2, $3, $4)',
                [email, hash, 'superadmin', true]
            );
            console.log(`✅ User ${email} created and approved.`);
        } else {
            await client.query(
                'UPDATE users SET is_approved = true, role = $1 WHERE email = $2',
                ['superadmin', email]
            );
            console.log(`✅ User ${email} approved.`);
        }
    } catch (err) {
        console.error(`❌ Error approving ${email}:`, err.message);
    } finally {
        await client.end();
    }
}

async function main() {
    await approveUser('mansikharb.kc@gmail.com');
    await approveUser('mansi.kharb@kc-one.co');
}

main();
