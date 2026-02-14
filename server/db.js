const { Pool } = require('pg');
const url = require('url');
require('dotenv').config();

function getPoolConfig() {
    let dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

    // Isolation
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const config = {
        ssl: { rejectUnauthorized: false }
    };

    if (dbUrl && dbUrl.includes('://')) {
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
            console.error('❌ Legacy parse failed:', e.message);
        }
    }

    // Try individual vars
    if (process.env.DB_HOST) {
        return {
            ...config,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME
        };
    }

    console.error('❌ NO VALID DB CONFIG FOUND');
    return config;
}

const pool = new Pool(getPoolConfig());

module.exports = { db: pool, initDB: async () => { } };
