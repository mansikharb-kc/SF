const { db } = require('./server/db');

async function fixExistingRecords() {
    try {
        console.log('--- Starting Optimized Migration ---');

        // 1. Fetch records needing adjustment
        const query = `
            SELECT sheet_id, created_time, _created_at 
            FROM leads 
            WHERE created_time IS NOT NULL 
            AND (created_time ~ '[+-][0-9]{2}:[0-9]{2}$' OR created_time !~ 'Z$')
        `;

        const { rows } = await db.query(query);
        console.log(`Processing ${rows.length} records...`);

        const toDelete = [];
        const toUpdate = [];

        for (const row of rows) {
            try {
                const createdDate = new Date(row.created_time);
                const syncDate = new Date(row._created_at);

                if (isNaN(createdDate.getTime())) continue;

                const createdUtcStr = createdDate.toISOString();

                // Rule violation: sync_time must be > created_time
                if (syncDate <= createdDate) {
                    toDelete.push(row.sheet_id);
                } else if (row.created_time !== createdUtcStr) {
                    toUpdate.push({ id: row.sheet_id, time: createdUtcStr });
                }
            } catch (err) { }
        }

        console.log(`Plans: Delete ${toDelete.length}, Update ${toUpdate.length}`);

        // Batch Delete
        if (toDelete.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < toDelete.length; i += batchSize) {
                const chunk = toDelete.slice(i, i + batchSize);
                await db.query('DELETE FROM leads WHERE sheet_id = ANY($1)', [chunk]);
                console.log(`Deleted ${i + chunk.length}/${toDelete.length}`);
            }
        }

        // Batch Update (Sequential but faster than individual awaits)
        if (toUpdate.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < toUpdate.length; i += batchSize) {
                const chunk = toUpdate.slice(i, i + batchSize);
                await Promise.all(chunk.map(item =>
                    db.query('UPDATE leads SET created_time = $1 WHERE sheet_id = $2', [item.time, item.id])
                ));
                console.log(`Updated ${i + chunk.length}/${toUpdate.length}`);
            }
        }

        console.log('--- Migration Finished ---');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

fixExistingRecords();
