const { Pool } = require('pg');
const url = require('url'); // Using the legacy url module (very stable, no TypeError: Invalid URL)
require('dotenv').config();

function getPoolConfig() {
    let dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

    // Isolation to prevent PG auto-collision
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const config = {
        ssl: { rejectUnauthorized: false }
    };

    if (dbUrl && dbUrl.includes('://')) {
        try {
            const parsed = url.parse(dbUrl);
            const auth = (parsed.auth || '').split(':');

            return {
                ...config,
                user: auth[0],
                password: decodeURIComponent(auth[1] || ''),
                host: parsed.hostname,
                port: parsed.port || 5432,
                database: (parsed.pathname || '/').substring(1)
            };
        } catch (e) {
            console.error('❌ Legacy URL parse failed:', e.message);
        }
    }

    process.env.DATABASE_URL = originalUrl;
    return config;
}

const pool = new Pool(getPoolConfig());

module.exports = { db: pool, initDB: async () => { } };
