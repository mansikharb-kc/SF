const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function initDB() {
    try {
        const rootPool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'postgres'
        });

        const client = await rootPool.connect();
        try {
            const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [process.env.DB_NAME]);
            if (res.rowCount === 0) {
                await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
                console.log(`Database ${process.env.DB_NAME} created.`);
            } else {
                console.log(`Database ${process.env.DB_NAME} exists.`);
            }
        } catch (err) {
            console.error('Error checking/creating database:', err);
        } finally {
            client.release();
            await rootPool.end();
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

module.exports = { db: pool, initDB };
