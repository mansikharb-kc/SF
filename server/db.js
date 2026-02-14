const { Pool } = require('pg');
const url = require('url');
require('dotenv').config();

function getPoolConfig() {
    const rawUrl = process.env.DATABASE_URL || '';
    let dbUrl = rawUrl.trim().replace(/^["']|["']$/g, '');

    // DEBUG LOGGING (Censored)
    console.log('--- DB CONFIG DEBUG ---');
    console.log('Raw URL Length:', rawUrl.length);
    console.log('Clean URL Length:', dbUrl.length);
    if (dbUrl.includes('://')) {
        const proto = dbUrl.split('://')[0];
        console.log('Protocol detected:', proto);
    }

    // Isolation
    delete process.env.DATABASE_URL;
    delete process.env.PGDATABASEURL;
    delete process.env.PGDATABASE_URL;

    const config = {
        ssl: { rejectUnauthorized: false }
    };

    // A. Explicit
    if (process.env.DB_HOST && process.env.DB_USER) {
        console.log('Using Explicit ENV vars');
        return {
            ...config,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME
        };
    }

    // B. Decompose
    if (dbUrl && dbUrl.includes('://')) {
        try {
            const parsed = url.parse(dbUrl);
            if (parsed.hostname) {
                console.log('Decomposed Hostname:', parsed.hostname);
                console.log('Decomposed Database:', (parsed.pathname || '/').substring(1));

                const auth = (parsed.auth || '').split(':');
                return {
                    ...config,
                    user: auth[0],
                    password: decodeURIComponent(auth[1] || ''),
                    host: parsed.hostname,
                    port: parseInt(parsed.port) || 5432,
                    database: (parsed.pathname || '/').substring(1)
                };
            } else {
                console.log('❌ url.parse found NO hostname');
            }
        } catch (e) {
            console.error('❌ url.parse error:', e.message);
        }
    }

    console.error('❌ FALLING BACK TO DEFAULT (localhost)');
    return config;
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
