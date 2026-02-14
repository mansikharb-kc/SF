const { Pool } = require('pg');
require('dotenv').config();

/**
 * Super Resilient Database Configuration
 * Avoids any dependency on 'pg-connection-string' or internal 'new URL' calls.
 * Manually decomposes DATABASE_URL using regex.
 */
function getPoolConfig() {
    const config = {
        ssl: { rejectUnauthorized: false }
    };

    let dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

    // Prioritize individual variables if present (best practice)
    if (process.env.DB_HOST && process.env.DB_USER) {
        return {
            ...config,
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };
    }

    // Decompose DATABASE_URL if present
    if (dbUrl.includes('://')) {
        console.log('📡 Manually decomposing DATABASE_URL to avoid crashes...');
        try {
            // Regex to match: postgresql://user:password@host:port/database
            // Handles encoded characters in user/pass
            const match = dbUrl.match(/^(?:postgres|postgresql):\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?#\s]+)/);

            if (match) {
                console.log('✅ Manual URL decomposition successful');
                return {
                    ...config,
                    user: match[1],
                    password: decodeURIComponent(match[2]),
                    host: match[3],
                    port: parseInt(match[4]) || 5432,
                    database: match[5]
                };
            }
        } catch (e) {
            console.error('❌ Manual decomposition error:', e.message);
        }
    }

    // Last resort fallback (this might fail if pg tries to parse its own connectionString)
    if (dbUrl) {
        console.log('⚠️ Falling back to raw connectionString (risky)');
        return {
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        };
    }

    console.error('❌ No database configuration found!');
    return config;
}

const pool = new Pool(getPoolConfig());

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ Database: Connected`);
        client.release();
    } catch (error) {
        console.error('❌ Database: Connection Error:', error.message);
    }
}

module.exports = { db: pool, initDB };
