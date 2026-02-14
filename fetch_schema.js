const { db } = require('./server/db');

async function check() {
    try {
        console.log('--- fetching column names directly ---');
        const { rows } = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'leads'
        `);
        console.log('Columns:', rows.map(r => r.column_name).join(', '));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

check();
