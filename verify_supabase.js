const { db } = require('./server/db');

async function check() {
    try {
        const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables in Supabase:', res.rows.map(r => r.table_name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
