const { Pool } = require('pg');
require('dotenv').config();

function getPoolConfig() {
    let dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

    // If it looks like a URL, try to parse it manually to avoid "Invalid URL" errors from pg
    if (dbUrl.includes('://')) {
        try {
            // Regex to extract parts: postgresql://user:pass@host:port/db
            const regex = /^(?:postgres|postgresql):\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/;
            const match = dbUrl.match(regex);

            if (match) {
                console.log('📡 Using manually parsed DATABASE_URL');
                return {
                    user: match[1],
                    password: decodeURIComponent(match[2]),
                    host: match[3],
                    port: match[4] || 5432,
                    database: match[5],
                    ssl: { rejectUnauthorized: false }
                };
            }
        } catch (e) {
            console.error('⚠️ Manual parse failed, falling back to connectionString');
        }

        return {
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        };
    }

    return {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    };
}

const poolConfig = getPoolConfig();
const pool = new Pool(poolConfig);

async function initDB() {
    try {
        const client = await pool.connect();
        console.log(`✅ Connected to database successful`);
        client.release();
    } catch (error) {
        console.error('❌ Error connecting to database:', error.message);
    }
}

module.exports = { db: pool, initDB };
