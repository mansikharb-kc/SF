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

    // Map headers to safe column names AND deduplicate them
    const seenNames = new Set();
    const safeColumns = [];

    // First, find the ID column
    let idIndex = headers.findIndex(h => getSafeColumnName(h) === 'sheet_id');
    if (idIndex === -1 && headers.length > 0) idIndex = 0;

    headers.forEach((h, index) => {
        let safeName = getSafeColumnName(h);

        // Handle name collisions
        let finalName = safeName;
        let counter = 1;
        while (seenNames.has(finalName)) {
            finalName = `${safeName}_${counter++}`;
        }
        seenNames.add(finalName);

        const isIdColumn = index === idIndex;

        if (isIdColumn) {
            safeColumns.push(`"sheet_id" VARCHAR(255) PRIMARY KEY`);
        } else {
            safeColumns.push(`"${finalName}" TEXT`);
        }
    });

    const columnsSQL = safeColumns.join(', ');

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

        // --- AUTO-MIGRATION: Add missing columns if table already exists ---
        // This ensures the "leads" table always contains all possible columns from all sheets
        if (sanitizedTableName === 'leads') {
            for (const colDef of safeColumns) {
                // colDef is something like: "col_name" TEXT or "sheet_id" VARCHAR(255) PRIMARY KEY
                const match = colDef.match(/"([^"]+)"\s+(.+)/);
                if (match) {
                    const colName = match[1];
                    const colType = match[2];
                    if (colName !== 'sheet_id') {
                        // sheet_id is the primary key and always exists, others might not
                        try {
                            // Postgres 9.6+ supports ADD COLUMN IF NOT EXISTS
                            await client.query(`ALTER TABLE "${sanitizedTableName}" ADD COLUMN IF NOT EXISTS "${colName}" ${colType}`);
                        } catch (err) {
                            // Non-critical: column might already exist or DDL locking issue
                        }
                    }
                }
            }
        }
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
    let idColIndex = headers.findIndex(h => getSafeColumnName(h) === 'sheet_id');

    // Fallback: If no column named "id" is found, assume the first column is the ID
    if (idColIndex === -1 && headers.length > 0) {
        idColIndex = 0;
        console.log(`[ID Fallback] No 'id' column found in ${tableName}. Using first column "${headers[0]}" as ID.`);
    }

    let totalInserted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const flatValues = [];
        const rowPlaceholders = [];
        let validRowsInBatch = 0;

        batch.forEach((row) => {
            const idValue = idColIndex !== -1 ? (row[idColIndex] || '').toString().trim() : '';

            if (!idValue) {
                totalSkipped++;
                return; // Skip this row
            }

            const rowData = headers.map((_, colIdx) => row[colIdx] || null);
            const hash = generateRowHash(rowData);
            flatValues.push(...rowData, hash, batchId);

            const startIdx = validRowsInBatch * fields.length + 1;
            const placeholders = Array.from({ length: fields.length }, (_, pi) => `$${startIdx + pi}`).join(',');
            rowPlaceholders.push(`(${placeholders})`);
            validRowsInBatch++;
        });

        if (validRowsInBatch > 0) {
            try {
                const sql = `INSERT INTO "${sanitizedTableName}" (${columnsStr}) VALUES ${rowPlaceholders.join(',')} ON CONFLICT DO NOTHING`;
                const result = await db.query(sql, flatValues);
                totalInserted += result.rowCount;
                console.log(`[Batch] Processed ${i + batch.length}/${rows.length} rows into ${sanitizedTableName} (Inserted: ${result.rowCount})`);
            } catch (err) {
                console.error(`❌ [Batch Failure] Failed to insert batch starting at row ${i}:`, err.message);
                // Fallback: try inserting one by one in this batch? (Optional, but let's just log for now)
            }
        }
    }

    if (totalSkipped > 0) {
        console.warn(`⚠️ Skipped ${totalSkipped} rows in ${tableName} due to missing ID.`);
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
       "inserted_count" INT DEFAULT 0,
       "temp_inserted_count" INT DEFAULT 0,
       "leads_deleted_count" INT DEFAULT 0,
       "leads_inserted_count" INT DEFAULT 0,
       "sync_timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Schema migration for existing table
    try {
        await db.query(`ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "inserted_count" INT DEFAULT 0`);
        await db.query(`ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "temp_inserted_count" INT DEFAULT 0`);
        await db.query(`ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "leads_deleted_count" INT DEFAULT 0`);
        await db.query(`ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "leads_inserted_count" INT DEFAULT 0`);
    } catch (e) {
        // Ignore if exists
    }

    await db.query(
        `INSERT INTO "sync_logs" 
        (sheet_name, table_name, inserted_count, temp_inserted_count, leads_deleted_count, leads_inserted_count, batch_id, status, trigger_type) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [sheetName, tableName, leadsInserted, tempInserted, leadsDeleted, leadsInserted, batchId, status, triggerType]
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
            console.log("Temp Table:", cleanTemp, "Cols:", columnNames);
            console.log("Target Table:", cleanTarget, "Cols:", targetColNames);
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

const ensureUsersTable = async () => {
    const bcrypt = require('bcryptjs');
    const query = `
        CREATE TABLE IF NOT EXISTS "users" (
            "id" SERIAL PRIMARY KEY,
            "email" VARCHAR(255) UNIQUE NOT NULL,
            "password_hash" TEXT NOT NULL,
            "status" VARCHAR(20) DEFAULT 'ACTIVE',
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await db.query(query);

    // Schema migration for existing table if any
    try {
        await db.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT \'ACTIVE\'');
        await db.query('ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash"');
    } catch (e) {
        // Ignore if already renamed or other errors
    }

    // Seed primary user if not exists
    const primaryEmail = (process.env.PRIMARY_ADMIN_EMAIL || 'mansikharb.kc@gmail.com').toLowerCase().trim();
    const primaryPassword = 'Admin@123';
    const { rows } = await db.query('SELECT * FROM "users" WHERE email = $1', [primaryEmail]);

    if (rows.length === 0) {
        const hashedPassword = await bcrypt.hash(primaryPassword, 10);
        await db.query(
            'INSERT INTO "users" (email, password_hash, status) VALUES ($1, $2, $3)',
            [primaryEmail, hashedPassword, 'ACTIVE']
        );
        console.log(`👤 Primary user ${primaryEmail} (Seed) created with status 'ACTIVE'`);
    } else {
        const hashedPassword = await bcrypt.hash(primaryPassword, 10);
        await db.query(
            'UPDATE "users" SET status = \'ACTIVE\', password_hash = $1 WHERE email = $2',
            [hashedPassword, primaryEmail]
        );
        console.log(`👤 Primary user ${primaryEmail} (Seed) updated to 'ACTIVE'`);
    }
};

const ensureOtpsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS "otps" (
            "id" SERIAL PRIMARY KEY,
            "email" VARCHAR(255) NOT NULL,
            "otp" VARCHAR(6) NOT NULL,
            "verified" BOOLEAN DEFAULT FALSE,
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "expires_at" TIMESTAMP NOT NULL
        );
    `;
    await db.query(query);

    // Migration
    try {
        await db.query('ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN DEFAULT FALSE');
    } catch (e) { }
};

module.exports = {
    ensureTableExists,
    insertNewRecords,
    logSync,
    truncateTable,
    mergeTempToLeads,
    getStats,
    ensureDeletedLeadsTable,
    ensureUsersTable,
    ensureOtpsTable
};
