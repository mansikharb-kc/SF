const { Pool } = require('pg');
require('dotenv').config();

/**
 * Robust Database Configuration
 * Handles malformed strings, extra quotes, and environment-specific formatting.
 */

function getPoolConfig() {
    let dbUrl = (process.env.DATABASE_URL || '').trim();

    // Remove wrapping quotes if they exist
    dbUrl = dbUrl.replace(/^["']|["']$/g, '');

    // If it's a valid Postgres URL
    if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
        console.log('📡 Using DATABASE_URL for connection');
        return {
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        };
    }

    // Fallback to individual components
    console.log('🔧 Using individual DB components for connection');
    return {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    };
}

const pool = new Pool(getPoolConfig());

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ Connected to database: ${process.env.DB_NAME || 'Supabase/Neon'}`);
        client.release();
    } catch (error) {
        console.error('❌ Error connecting to database:', error.message);
    }
}

module.exports = { db: pool, initDB };
