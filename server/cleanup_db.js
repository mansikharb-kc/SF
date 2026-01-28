const { db } = require('./db');

async function cleanup() {
    try {
        await db.query('DROP TABLE IF EXISTS "leads"');
        await db.query('DROP TABLE IF EXISTS "temp_leads"');
        console.log('✅ Tables dropped successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Failed to drop tables:', e);
        process.exit(1);
    }
}

cleanup();
