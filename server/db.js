const { Pool } = require('pg');
const url = require('url');
require('dotenv').config();

function getPoolConfig() {
    const dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');

    // Isolation to prevent PG auto-collision
    delete process.env.DATABASE_URL;
    delete process.env.PGDATABASEURL;
    delete process.env.PGDATABASE_URL;

    const config = {
        ssl: { rejectUnauthorized: false }
    };

    let result = null;

    // A. Explicit Components (Render/Local Env)
    if (process.env.DB_HOST && process.env.DB_USER) {
        console.log('📡 Using Explicit DB Environment Variables');
        result = {
            ...config,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME
        };
    }
    // B. Decomposed URL
    else if (dbUrl && dbUrl.includes('://')) {
        console.log('📡 Using Decomposed DATABASE_URL');
        try {
            const parsed = url.parse(dbUrl);
            const auth = (parsed.auth || '').split(':');
            if (parsed.hostname) {
                result = {
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

    if (!result || !result.host) {
        console.error('❌ NO VALID DB HOST FOUND IN CONFIG');
        return config; // Will default to localhost/postgres
    }

    console.log(`✅ Final Config Host: ${result.host}, User: ${result.user}`);
    return result;
}

const pool = new Pool(getPoolConfig());

module.exports = {
    db: pool,
    initDB: async () => {
        try {
            const client = await pool.connect();
            console.log('✅ DB Connection Verified');
            client.release();
        } catch (e) {
            console.error('❌ DB Verification Failed:', e.message);
        }
    }
};
