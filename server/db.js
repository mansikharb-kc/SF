const { Pool } = require('pg');
const url = require('url');
require('dotenv').config();

/**
 * FINAL Resilient Database Configuration
 * We absolutely must prevent the 'pg' library from seeing DATABASE_URL in the environment
 * because its internal parser (pg-connection-string) crashes on malformed URLs with 'Invalid URL'.
 */
function getPoolConfig() {
    // 1. Copy and then PERMANENTLY remove the problematic env variable from this process's memory.
    // This is safe because we've already loaded our local config.
    const dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

    console.log('🛡️ Isolating environment from pg auto-detection...');
    delete process.env.DATABASE_URL;
    delete process.env.PGDATABASEURL; // Just in case
    delete process.env.PGDATABASE_URL;

    const config = {
        ssl: { rejectUnauthorized: false }
    };

    // A. If we have individual components, use those (e.g., from .env or Render specific vars)
    if (process.env.DB_HOST && process.env.DB_USER) {
        console.log('✅ Using explicit DB_HOST configuration');
        return {
            ...config,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME
        };
    }

    // B. Otherwise, manually parse the URL we saved
    if (dbUrl && dbUrl.includes('://')) {
        console.log('📡 Manually parsing DATABASE_URL to bypass pg-connection-string');
        try {
            const parsed = url.parse(dbUrl);
            const auth = (parsed.auth || '').split(':');

            if (parsed.hostname) {
                return {
                    ...config,
                    user: auth[0],
                    password: decodeURIComponent(auth[1] || ''),
                    host: parsed.hostname,
                    port: parseInt(parsed.port) || 5432,
                    database: (parsed.pathname || '/').substring(1)
                };
            }
        } catch (e) {
            console.error('❌ Manual URL parse failed:', e.message);
        }
    }

    console.error('❌ NO VALID DATABASE CONFIGURATION FOUND');
    return config;
}

// Initialize the pool while DATABASE_URL is deleted from the environment
const pool = new Pool(getPoolConfig());

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ Database connection established safely.`);
        client.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

module.exports = { db: pool, initDB };
