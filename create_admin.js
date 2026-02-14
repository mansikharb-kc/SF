const { db } = require('./server/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    const email = 'mansikharb.kc@gmail.com';
    const password = 'Admin@123';

    try {
        const hash = await bcrypt.hash(password, 10);
        await db.query(`
            INSERT INTO users (email, password_hash, role, status)
            VALUES ($1, $2, 'admin', 'Approved')
            ON CONFLICT (email) DO UPDATE 
            SET password_hash = EXCLUDED.password_hash, status = 'Approved';
        `, [email, hash]);

        console.log(`✅ Admin user created/updated: ${email}`);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    } finally {
        process.exit(0);
    }
}

createAdmin();
