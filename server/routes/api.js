const express = require('express');
const router = express.Router();
const { syncSheetToDb } = require('../services/syncService');
const { db } = require('../db');

// Trigger Sync (Background)
router.post('/sync', (req, res) => {
    const triggerType = 'MANUAL';

    // Start sync in background
    syncSheetToDb(triggerType)
        .then(result => {
            console.log('✅ Background sync finished:', result.batchId);
        })
        .catch(error => {
            if (error.message !== 'SYNC_IN_PROGRESS') {
                console.error('❌ Background sync failed:', error);
            }
        });

    // Respond immediately
    res.json({
        started: true,
        message: 'Sync started in the background. Please refresh in a few minutes.'
    });
});

// External Cron Trigger (Wakes up server if asleep)
router.get('/cron', async (req, res) => {
    console.log('⏰ External cron trigger received');
    try {
        await syncSheetToDb('AUTO');
        res.json({ success: true, message: 'Cron sync completed' });
    } catch (error) {
        if (error.message === 'SYNC_IN_PROGRESS') {
            return res.json({ success: true, message: 'Sync already in progress' });
        }
        console.error('❌ External cron trigger failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Stats
router.get('/stats', async (req, res) => {
    const { getStats } = require('../services/dbService');
    const stats = await getStats();
    res.json(stats);
});

// Get Sync History
router.get('/history', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM "sync_logs" ORDER BY sync_timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (error) {
        // If table doesn't exist yet, return empty
        if (error.code === '42P01') { // undefined_table
            return res.json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

// Get Table Data (optional filter by batchId)
router.get('/data/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const { batchId } = req.query;

    try {
        // Validate tableName to prevent SQL injection (basic check)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        let query = `SELECT * FROM "${tableName}"`;
        const params = [];

        if (batchId) {
            query += ` WHERE _batch_id = $1`;
            params.push(batchId);
        }

        query += ` ORDER BY _created_at DESC LIMIT 500`;

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Record (Standard) with Rewrite Logic
router.delete('/data/:tableName/:id', async (req, res) => {
    const { tableName, id } = req.params;

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const pkColumn = 'sheet_id';

        // 1. Delete the specific record
        const resDel = await client.query(`DELETE FROM "${tableName}" WHERE "${pkColumn}" = $1`, [id]);

        if (resDel.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Record not found' });
        }

        // 2. Tombstone: Record deletion to prevent re-sync
        await client.query('INSERT INTO "deleted_leads" (sheet_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);

        // 3. Special Rewrite Logic (User Instruction)
        if (tableName === 'leads') {
            // No additional logic needed for standard deletion.
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Record deleted and table rewritten successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete failed:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});



module.exports = router;
