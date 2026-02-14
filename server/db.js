const { Pool } = require('pg');
require('dotenv').config();

function getPoolConfig() {
    // 1. Try individual components FIRST (Self-managed or explicit config)
    if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
        console.log('🔧 Using individual DB components from environment');
        return {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        };
    }

    // 2. Try parsing DATABASE_URL manually as a fallback
    let dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');
    if (dbUrl.includes('://')) {
        console.log('📡 Attempting to parse DATABASE_URL manually...');
        try {
            // Extremely permissive regex for postgresql://user:pass@host:port/dbname
            const parts = dbUrl.match(/^(?:postgres|postgresql):\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
            if (parts) {
                return {
                    user: parts[1],
                    password: decodeURIComponent(parts[2]),
                    host: parts[3],
                    port: parseInt(parts[4]) || 5432,
                    database: parts[5],
                    ssl: { rejectUnauthorized: false }
                };
            }
        } catch (e) {
            console.error('❌ Manual DB URL parse failed:', e.message);
        }

        // Final fallback: Let pg-connection-string try (might throw Invalid URL)
        return {
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        };
    }

    return {
        ssl: { rejectUnauthorized: false }
    };
}

const pool = new Pool(getPoolConfig());

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ Database connection established`);
        client.release();
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    }
}

module.exports = { db: pool, initDB };
