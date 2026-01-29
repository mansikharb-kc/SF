const { db } = require('../db');
const crypto = require('crypto');

/**
 * Sanitizes string to be a valid MySQL/Postgres identifier
 */
const sanitizeIdentifier = (name) => {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
};

/**
 * Creates table if not exists based on headers
 */
const RESERVED_COLUMNS = ['_row_hash', '_batch_id', '_created_at'];

/**
 * Maps headers to safe column names, handling collisions
 */
const getSafeColumnName = (header) => {
    let safeName = sanitizeIdentifier(header);
    // Step 2: Map "id" from sheet to "sheet_id" for the database
    if (safeName === 'id') {
        return 'sheet_id';
    }
    if (RESERVED_COLUMNS.includes(safeName)) {
        safeName = `${safeName}_sheet`;
    }
    return safeName;
};

/**
 * Creates table if not exists based on headers
 */
const ensureTableExists = async (tableName, headers) => {
    const sanitizedTableName = sanitizeIdentifier(tableName);

    // Map headers to safe column names
    const columnsSQL = headers.map(h => {
        const safeName = getSafeColumnName(h);
        // sheet_id is the Primary Key
        if (safeName === 'sheet_id') {
            return `"${safeName}" VARCHAR(255) PRIMARY KEY`;
        }
        return `"${safeName}" TEXT`;
    }).join(', ');

    const createQuery = `
    CREATE TABLE IF NOT EXISTS "${sanitizedTableName}" (
      "_row_hash" VARCHAR(64),
      "_batch_id" VARCHAR(64),
      "_created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ${columnsSQL}
    );
  `;

    // Ensure connection is valid
    const client = await db.connect();
    try {
        await client.query(createQuery);
    } finally {
        client.release();
    }

    return sanitizedTableName;
};

/**
 * Generates specific hash for a row to identify uniqueness
 */
const generateRowHash = (rowValues) => {
    const str = JSON.stringify(rowValues);
    return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Inserts new records into the table
 * @returns {number} count of inserted rows
 */
const insertNewRecords = async (tableName, headers, rows, batchId) => {
    if (!rows || rows.length === 0) return 0;

    const sanitizedTableName = sanitizeIdentifier(tableName);
    const safeHeaders = headers.map(h => getSafeColumnName(h));
    const fields = [...safeHeaders, '_row_hash', '_batch_id'];
    const columnsStr = fields.map(f => `"${f}"`).join(',');

    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const flatValues = [];
        const rowPlaceholders = [];

        batch.forEach((row, rowIndex) => {
            const rowData = headers.map((_, colIdx) => row[colIdx] || null);
            const hash = generateRowHash(rowData);
            flatValues.push(...rowData, hash, batchId);

            const startIdx = rowIndex * fields.length + 1;
            const placeholders = Array.from({ length: fields.length }, (_, pi) => `$${startIdx + pi}`).join(',');
            rowPlaceholders.push(`(${placeholders})`);
        });

        const sql = `INSERT INTO "${sanitizedTableName}" (${columnsStr}) VALUES ${rowPlaceholders.join(',')} ON CONFLICT DO NOTHING`;
        const result = await db.query(sql, flatValues);
        totalInserted += result.rowCount;

        console.log(`[Batch] Inserted ${i + batch.length}/${rows.length} rows into ${sanitizedTableName}...`);
    }

    return totalInserted;
};

const logSync = async (sheetName, tableName, details, batchId, status = 'SUCCESS', triggerType = 'MANUAL') => {
    // details object contains: tempInserted, leadsDeleted, leadsInserted
    const { tempInserted = 0, leadsDeleted = 0, leadsInserted = 0 } = details;

    // Ensure table exists with NEW schema
    await db.query(`
    CREATE TABLE IF NOT EXISTS "sync_logs" (
       "id" SERIAL PRIMARY KEY,
       "sheet_name" VARCHAR(255),
       "table_name" VARCHAR(255),
       "batch_id" VARCHAR(64),
       "status" VARCHAR(50),
       "trigger_type" VARCHAR(20) DEFAULT 'MANUAL',
       "temp_inserted_count" INT DEFAULT 0,
       "leads_deleted_count" INT DEFAULT 0,
       "leads_inserted_count" INT DEFAULT 0,
       "sync_timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Schema migration for existing table
    try {
        await db.query(`ALTER TABLE "sync_logs" ADD COLUMN "temp_inserted_count" INT DEFAULT 0`);
        await db.query(`ALTER TABLE "sync_logs" ADD COLUMN "leads_deleted_count" INT DEFAULT 0`);
        await db.query(`ALTER TABLE "sync_logs" ADD COLUMN "leads_inserted_count" INT DEFAULT 0`);
    } catch (e) {
        // Ignore if exists
    }

    await db.query(
        `INSERT INTO "sync_logs" 
        (sheet_name, table_name, temp_inserted_count, leads_deleted_count, leads_inserted_count, batch_id, status, trigger_type) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sheetName, tableName, tempInserted, leadsDeleted, leadsInserted, batchId, status, triggerType]
    );
};

const getStats = async () => {
    try {
        const { rows: leadsCount } = await db.query('SELECT COUNT(*) as count FROM "leads"');
        // Check if temp_leads exists before counting
        let tempCountOps = 0;
        try {
            const { rows: tempCount } = await db.query('SELECT COUNT(*) as count FROM "temp_leads"');
            tempCountOps = tempCount[0].count;
        } catch (e) {
            // temp_leads might be dropped
        }

        const { rows: lastSync } = await db.query('SELECT * FROM "sync_logs" ORDER BY id DESC LIMIT 1');

        return {
            total_leads: leadsCount[0].count,
            total_temp: tempCountOps,
            last_sync: lastSync[0] || null
        };
    } catch (e) {
        console.error("Stats Error:", e);
        return { total_leads: 0, total_temp: 0, last_sync: null };
    }
};

/**
 * Truncates (clears) a table
 */
const truncateTable = async (tableName) => {
    const sanitizedTableName = sanitizeIdentifier(tableName);
    // TRUNCATE in Postgres is same
    await db.query(`TRUNCATE TABLE "${sanitizedTableName}"`);
};

/**
 * Merges temp table into leads table
 * 1. Delete matches from leads
 * 2. Insert all from temp to leads
 */
const mergeTempToLeads = async (tempTable, targetTable) => {
    // Ensure deleted_leads table exists BEFORE starting transaction to avoid metadata locks/DDL issues
    await ensureDeletedLeadsTable();

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const cleanTemp = sanitizeIdentifier(tempTable);
        const cleanTarget = sanitizeIdentifier(targetTable);

        // Step 2 & 3: Filter logic using sheet_id (The unique identifier)
        const matchCol = 'sheet_id';

        const { rows: columns } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [cleanTemp]);
        const columnNames = columns.map(c => c.column_name);

        const { rows: targetCols } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [cleanTarget]);
        const targetColNames = targetCols.map(c => c.column_name).filter(c => c !== '_created_at');

        const commonCols = targetColNames.filter(c => columnNames.includes(c));

        let insertedCount = 0;

        if (commonCols.length > 0) {
            const colsStr = commonCols.map(c => `"${c}"`).join(', ');

            // Step 4: Insert Filtered Data
            const insertQuery = `INSERT INTO "${cleanTarget}" (${colsStr}) 
                                SELECT ${colsStr} FROM "${cleanTemp}" 
                                WHERE "${matchCol}" NOT IN (SELECT "${matchCol}" FROM "${cleanTarget}")
                                AND "${matchCol}" NOT IN (SELECT "sheet_id" FROM "deleted_leads")`;

            const res = await client.query(insertQuery);
            insertedCount = res.rowCount;
            console.log(`✅ Sync Complete: ${insertedCount} new records inserted into ${cleanTarget}.`);
        } else {
            console.error(`❌ Sync Failed: Required columns (including ${matchCol}) not found.`);
            // console.log("Temp Cols:", columnNames);
            // console.log("Target Cols:", targetColNames);
            throw new Error(`MISSING_REQUIRED_COLUMNS`);
        }

        await client.query('COMMIT');
        return { success: true, deletedCount: 0, insertedCount };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Merge failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

const ensureDeletedLeadsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS "deleted_leads" (
            "sheet_id" VARCHAR(255) PRIMARY KEY,
            "deleted_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await db.query(query);
};

module.exports = {
    ensureTableExists,
    insertNewRecords,
    logSync,
    truncateTable,
    mergeTempToLeads,
    getStats,
    ensureDeletedLeadsTable
};
