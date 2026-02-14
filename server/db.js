const { Pool } = require('pg');
const url = require('url');
require('dotenv').config();

let debugInfo = {
    urlLength: 0,
    detectedHost: 'none',
    detectedDb: 'none',
    error: null
};

function getPoolConfig() {
    const dbUrl = (process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');
    debugInfo.urlLength = dbUrl.length;

    // Isolation
    delete process.env.DATABASE_URL;

    const config = {
        ssl: { rejectUnauthorized: false }
    };

    if (dbUrl && dbUrl.includes('://')) {
        try {
            const parsed = url.parse(dbUrl);
            if (parsed.hostname) {
                debugInfo.detectedHost = parsed.hostname;
                debugInfo.detectedDb = (parsed.pathname || '/').substring(1);

                const auth = (parsed.auth || '').split(':');
                return {
                    ...config,
                    user: auth[0],
                    password: decodeURIComponent(auth[1] || ''),
                    host: parsed.hostname,
                    port: parseInt(parsed.port) || 5432,
                    database: debugInfo.detectedDb
                };
            }
        } catch (e) {
            debugInfo.error = e.message;
        }
    }

    if (process.env.DB_HOST) {
        debugInfo.detectedHost = process.env.DB_HOST;
        return {
            ...config,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            // ...
        };
    }

    return config;
}

const pool = new Pool(getPoolConfig());

module.exports = {
    db: pool,
    getDebugInfo: () => debugInfo
};
