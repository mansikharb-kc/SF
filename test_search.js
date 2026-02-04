const { db } = require('./server/db');

async function testSearch(searchTerm) {
    try {
        console.log(`Testing search for: "${searchTerm}"`);

        // 1. Get searchable columns
        const { rows: colRows } = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads' AND table_schema = 'public'
        `);

        if (colRows.length === 0) {
            console.error("No columns found for 'leads' table in 'public' schema.");
            return;
        }

        const reserved = ['_row_hash', '_batch_id', '_created_at'];
        // ILIKE only works on text-compatible types without casting. 
        // Most columns are 'text' or 'character varying'.
        const searchableCols = colRows
            .filter(c => !reserved.includes(c.column_name))
            .filter(c => c.data_type.includes('char') || c.data_type.includes('text'))
            .map(c => `"${c.column_name}"`);

        console.log(`Found ${searchableCols.length} searchable columns.`);

        if (searchableCols.length === 0) {
            console.warn("No searchable string columns found.");
            return;
        }

        const searchClause = searchableCols.map(col => `${col}::text ILIKE $1`).join(' OR ');
        const query = `SELECT COUNT(*) FROM "leads" WHERE ${searchClause}`;

        console.log("Executing Query...");
        const start = Date.now();
        const { rows } = await db.query(query, [`%${searchTerm}%`]);
        const end = Date.now();

        console.log(`Results found: ${rows[0].count}`);
        console.log(`Search took ${end - start}ms`);

        if (rows[0].count > 0) {
            const sampleQuery = `SELECT * FROM "leads" WHERE ${searchClause} LIMIT 1`;
            const sample = await db.query(sampleQuery, [`%${searchTerm}%`]);
            console.log("Sample Result Found.");
        }

    } catch (err) {
        console.error("Search Test Error:", err.message);
    } finally {
        process.exit();
    }
}

// Get a random term to search for first
async function findTestTerm() {
    try {
        const { rows } = await db.query('SELECT * FROM leads LIMIT 5');
        if (rows.length === 0) {
            console.log("No leads to test with.");
            process.exit();
        }

        // Try searching for a partial name or city
        const sample = rows[0];
        const keys = Object.keys(sample).filter(k => !k.startsWith('_'));
        for (let key of keys) {
            if (sample[key] && sample[key].length > 3) {
                const term = sample[key].substring(0, 4);
                return term;
            }
        }
        return "india"; // Fallback
    } catch (e) {
        return "india";
    }
}

findTestTerm().then(term => testSearch(term));
