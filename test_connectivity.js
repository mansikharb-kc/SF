const { db } = require('./server/db');

async function checkConnectivity() {
    console.log('--- Database Connectivity Test (Pooler) ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    try {
        const start = Date.now();
        const res = await db.query('SELECT version()');
        const end = Date.now();
        console.log('✅ Connection Successful!');
        console.log('Response Time:', end - start, 'ms');
        console.log('Database Version:', res.rows[0].version);
    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Error Message:', error.message);
        console.error('Error Code:', error.code);
    } finally {
        process.exit(0);
    }
}

checkConnectivity();
