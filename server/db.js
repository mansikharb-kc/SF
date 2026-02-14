const { Pool } = require('pg');
require('dotenv').config();

/**
 * ULTRA Resilient Database Configuration
 * Prevents 'pg' from seeing the problematic DATABASE_URL in the environment.
 */
function getPoolConfig() {
    // 1. Extract the URL but then DELETE it from process.env 
    // so the 'pg' library doesn't try to auto-parse it and crash.
    let dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

    // Temporarily hide it from the rest of the process to avoid 'pg' auto-detection
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const config = {
        ssl: { rejectUnauthorized: false }
    };

    let result = config;

    // A. Use individual variables if available
    if (process.env.DB_HOST && process.env.DB_USER) {
        console.log('🔧 Using DB_HOST configuration');
        result = {
            ...config,
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };
    }
    // B. Manual decompose of the URL
    else if (dbUrl.includes('://')) {
        console.log('📡 Manually decomposing DATABASE_URL');
        const match = dbUrl.match(/^(?:postgres|postgresql):\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?#\s]+)/);
        if (match) {
            result = {
                ...config,
                user: match[1],
                password: decodeURIComponent(match[2]),
                host: match[3],
                port: parseInt(match[4]) || 5432,
                database: match[5]
            };
        }
    }

    // Restore it just in case something else needs it (though risky)
    process.env.DATABASE_URL = originalUrl;

    return result;
}

const pool = new Pool(getPoolConfig());

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ DB: ONLINE`);
        client.release();
    } catch (error) {
        console.error('❌ DB: OFFLINE -', error.message);
    }
}

module.exports = { db: pool, initDB };
