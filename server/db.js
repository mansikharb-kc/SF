const { Pool } = require('pg');
const parse = require('pg-connection-string').parse;
require('dotenv').config();

/**
 * Super Robust Database Configuration
 * Avoids passing 'connectionString' to Pg Pool to prevent internal 'Invalid URL' errors.
 */
function getPoolConfig() {
    const config = {
        ssl: { rejectUnauthorized: false }
    };

    // 1. Try individual environment variables first
    if (process.env.DB_HOST && process.env.DB_USER) {
        console.log('🔧 Using individual DB components from environment');
        return {
            ...config,
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };
    }

    // 2. Try parsing DATABASE_URL
    let dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

    if (dbUrl.includes('://')) {
        console.log('📡 Decomposing DATABASE_URL...');
        try {
            // Use the standard parser first
            const parsed = parse(dbUrl);
            if (parsed.host) {
                console.log('✅ Successfully parsed URL with pg-connection-string');
                return {
                    ...config,
                    host: parsed.host,
                    port: parsed.port || 5432,
                    user: parsed.user,
                    password: parsed.password,
                    database: parsed.database
                };
            }
        } catch (e) {
            console.warn('⚠️ pg-connection-string failed, trying manual regex...', e.message);
        }

        // Fallback to manual regex if the library fails or returns no host
        try {
            const regex = /^(?:postgres|postgresql):\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/;
            const match = dbUrl.match(regex);
            if (match) {
                console.log('✅ Successfully parsed URL with manual regex');
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
            console.error('❌ Manual regex parse failed:', e.message);
        }
    }

    console.error('❌ Could not find valid database configuration');
    return config;
}

const poolConfig = getPoolConfig();
// Debug (safe parts)
if (poolConfig.host) {
    console.log(`📡 Pool initialized for host: ${poolConfig.host}, DB: ${poolConfig.database}`);
}

const pool = new Pool(poolConfig);

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ Database connection verified`);
        client.release();
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    }
}

module.exports = { db: pool, initDB };
