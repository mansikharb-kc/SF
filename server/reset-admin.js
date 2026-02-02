const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://neondb_owner:npg_3GOFaqk1NtWm@ep-little-sea-ah94cclk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function resetAndApprove() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const email = 'mansikharb.kc@gmail.com';
        const hash = await bcrypt.hash('Admin@123', 10);

        // Remove existing if any to avoid issues, then insert fresh
        await client.query('DELETE FROM users WHERE email = $1', [email]);
        await client.query(
            'INSERT INTO users (email, password, role, is_approved) VALUES ($1, $2, $3, $4)',
            [email, hash, 'superadmin', true]
        );

        console.log(`✅ Admin ${email} is now ACTIVE.`);
        console.log(`🔑 Login with Password: Admin@123`);
    } catch (err) {
        console.error(`❌ Error:`, err.message);
    } finally {
        await client.end();
    }
}

resetAndApprove();
