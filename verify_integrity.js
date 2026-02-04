const { db } = require('./server/db');

async function finalRecordCheck() {
    try {
        console.log('--- Final Database Integrity Check ---');

        // 1. Check for any records with timezone offsets (they shouldn't exist anymore)
        const timezoneCheck = await db.query("SELECT COUNT(*) FROM leads WHERE created_time ~ '[+-][0-9]{2}:[0-9]{2}$'");
        console.log(`Records with timezone offsets: ${timezoneCheck.rows[0].count}`);

        // 2. Check for chronological violations (created_time >= sync_time)
        const chronoViolationCheck = await db.query("SELECT COUNT(*) FROM leads WHERE created_time::timestamp >= _created_at");
        console.log(`Physically impossible records (created >= sync): ${chronoViolationCheck.rows[0].count}`);

        // 3. Sample check of the first 5 records to see format
        const sampleRecords = await db.query("SELECT sheet_id, created_time, _created_at FROM leads LIMIT 5");
        console.log('\nSample Records (Format Verification):');
        console.table(sampleRecords.rows);

        // 4. Total record count
        const totalCount = await db.query("SELECT COUNT(*) FROM leads");
        console.log(`\nTotal leads in database: ${totalCount.rows[0].count}`);

    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        process.exit();
    }
}

finalRecordCheck();
