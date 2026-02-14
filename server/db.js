const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
} : {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

const pool = new Pool(poolConfig);

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ Connected to database: ${process.env.DB_NAME || 'Supabase'}`);
        client.release();
    } catch (error) {
        console.error('❌ Error connecting to database:', error.message);
    }
}

module.exports = { db: pool, initDB };
