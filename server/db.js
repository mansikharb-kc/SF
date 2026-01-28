const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ Connected to Neon database: ${process.env.DB_NAME}`);
        client.release();
    } catch (error) {
        console.error('❌ Error connecting to database:', error);
        // We still resolve to allow server to start, or we could throw
        // For now, let's just log.
    }
}

module.exports = { db: pool, initDB };
