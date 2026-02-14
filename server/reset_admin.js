const { db } = require('./db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    const email = 'mansikharb.kc@gmail.com';
    const password = 'Admin@123';
    const hash = await bcrypt.hash(password, 10);

    try {
        await db.query('UPDATE "users" SET password_hash = $1, status = \'ACTIVE\' WHERE email = $2', [hash, email]);
        console.log(`✅ Password reset successfully for ${email}`);

        // Let's also check if it worked
        const { rows } = await db.query('SELECT password_hash FROM users WHERE email = $1', [email]);
        const match = await bcrypt.compare(password, rows[0].password_hash);
        console.log(`🔍 Verification Match: ${match}`);
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

resetPassword();
