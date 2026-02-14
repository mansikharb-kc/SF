const { Pool } = require('pg');
const url = require('url');
require('dotenv').config();

let debugInfo = {
    urlLength: 0,
    urlPrefix: 'none',
    detectedHost: 'none',
    detectedDb: 'none',
    step: 'start',
    error: null
};

function getPoolConfig() {
    const rawUrl = process.env.DATABASE_URL || '';
    let dbUrl = rawUrl.trim().replace(/^["']|["']$/g, '');

    debugInfo.urlLength = dbUrl.length;
    debugInfo.urlPrefix = dbUrl.substring(0, 10);
    debugInfo.step = 'cleaned';

    // Isolation
    delete process.env.DATABASE_URL;

    const config = {
        ssl: { rejectUnauthorized: false }
    };

    if (dbUrl && dbUrl.includes('://')) {
        debugInfo.step = 'parsing_url';
        try {
            const parsed = url.parse(dbUrl);
            if (parsed.hostname) {
                debugInfo.detectedHost = parsed.hostname;
                debugInfo.detectedDb = (parsed.pathname || '/').substring(1);
                debugInfo.step = 'success_url';

                const auth = (parsed.auth || '').split(':');
                return {
                    ...config,
                    user: auth[0],
                    password: decodeURIComponent(auth[1] || ''),
                    host: parsed.hostname,
                    port: parseInt(parsed.port) || 5432,
                    database: debugInfo.detectedDb
                };
            } else {
                debugInfo.step = 'no_hostname_in_url';
            }
        } catch (e) {
            debugInfo.step = 'url_parse_error';
            debugInfo.error = e.message;
        }
    }

    if (process.env.DB_HOST) {
        debugInfo.step = 'using_env_vars';
        debugInfo.detectedHost = process.env.DB_HOST;
        return {
            ...config,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME
        };
    }

    debugInfo.step = 'failed_all';
    return config;
}

const pool = new Pool(getPoolConfig());

module.exports = {
    db: pool,
    getDebugInfo: () => debugInfo
};
