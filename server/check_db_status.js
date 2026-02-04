const { db } = require('./db');

async function checkStatus() {
    try {
        console.log('--- Database Status Check ---');

        // 1. Check Tables
        const tablesRes = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log('Tables found:', tables.join(', '));

        if (tables.includes('leads')) {
            const { rows: leadsCount } = await db.query('SELECT COUNT(*) as count FROM "leads"');
            console.log(`Total Leads: ${leadsCount[0].count}`);

            const { rows: sample } = await db.query('SELECT * FROM "leads" LIMIT 5');
            console.log('Sample Leads:', JSON.stringify(sample, null, 2));
        } else {
            console.log('⚠️ Table "leads" does NOT exist.');
        }

        if (tables.includes('sync_logs')) {
            const { rows: logCount } = await db.query('SELECT COUNT(*) as count FROM "sync_logs"');
            console.log(`Total Sync Logs: ${logCount[0].count}`);

            const { rows: recentLogs } = await db.query('SELECT * FROM "sync_logs" ORDER BY id DESC LIMIT 5');
            console.log('Recent Sync Logs:', JSON.stringify(recentLogs, null, 2));
        } else {
            console.log('⚠️ Table "sync_logs" does NOT exist.');
        }

        if (tables.includes('temp_leads')) {
            const { rows: tempCount } = await db.query('SELECT COUNT(*) as count FROM "temp_leads"');
            console.log(`Temp Leads: ${tempCount[0].count}`);
        }

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        process.exit();
    }
}

checkStatus();
