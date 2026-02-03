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

// Get All Leads (Global List)
router.get('/leads', async (req, res) => {
    const { search, limit = 50, offset = 0 } = req.query;
    try {
        let query = 'SELECT * FROM "leads"';
        const params = [];

        if (search) {
            query += ' WHERE "sheet_id" ILIKE $1 OR "full_name" ILIKE $1 OR "email" ILIKE $1 OR "phone" ILIKE $1 OR "phone_number" ILIKE $1';
            params.push(`%${search}%`);
        }

        query += ' ORDER BY _created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(parseInt(limit));
        params.push(parseInt(offset));

        const { rows } = await db.query(query, params);

        // Also get total count
        let countQuery = 'SELECT COUNT(*) FROM "leads"';
        const countParams = [];
        if (search) {
            countQuery += ' WHERE "sheet_id" ILIKE $1 OR "full_name" ILIKE $1 OR "email" ILIKE $1 OR "phone" ILIKE $1 OR "phone_number" ILIKE $1';
            countParams.push(`%${search}%`);
        }
        const { rows: countRows } = await db.query(countQuery, countParams);

        res.json({
            leads: rows,
            total: parseInt(countRows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        if (error.code === '42P01') { // undefined_table
            return res.json({ leads: [], total: 0 });
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

// --- AUTHENTICATION FLOW (MANDATORY) ---

// 1. Request OTP (Registration Step 1)
router.post('/request-otp', async (req, res) => {
    let { email, password, confirmPassword } = req.body;
    const { sendAdminOtp } = require('../services/emailService');

    if (!email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    email = email.toLowerCase().trim();

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    try {
        const { rows: userExists } = await db.query('SELECT * FROM "users" WHERE email = $1', [email]);
        if (userExists.length > 0) {
            return res.status(400).json({ error: 'User already exists. Please log in.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

        await db.query(
            'INSERT INTO "otps" (email, otp, expires_at, verified) VALUES ($1, $2, $3, $4)',
            [email, otp, expiresAt, false]
        );

        console.log(`📩 OTP for ${email}: ${otp} (Sent to Admin)`);
        await sendAdminOtp(email, otp);

        res.json({
            success: true,
            message: 'Access request sent! Please contact the administrator for the 6-digit verification code.'
        });
    } catch (error) {
        console.error('OTP Request error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// 2. Verify OTP (Registration Step 2)
router.post('/verify-otp', async (req, res) => {
    let { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    email = email.toLowerCase().trim();

    try {
        const { rows } = await db.query(
            'SELECT * FROM "otps" WHERE email = $1 AND otp = $2 AND expires_at > CURRENT_TIMESTAMP AND verified = false ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        await db.query('UPDATE "otps" SET verified = true WHERE id = $1', [rows[0].id]);

        res.json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
        console.error('OTP Verify error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// 3. Complete Registration (User Creation)
router.post('/register', async (req, res) => {
    let { email, password } = req.body;
    const bcrypt = require('bcryptjs');

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    email = email.toLowerCase().trim();

    try {
        const { rows: otpRows } = await db.query(
            'SELECT * FROM "otps" WHERE email = $1 AND verified = true AND created_at > (CURRENT_TIMESTAMP - INTERVAL \'20 minutes\') ORDER BY created_at DESC LIMIT 1',
            [email]
        );

        if (otpRows.length === 0) {
            return res.status(403).json({ error: 'Please verify OTP before registering' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO "users" (email, password_hash, status) VALUES ($1, $2, $3)',
            [email, hashedPassword, 'ACTIVE']
        );

        await db.query('DELETE FROM "otps" WHERE email = $1', [email]);

        res.status(201).json({
            success: true,
            message: 'Account created successfully! You can now log in.'
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'User already exists' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const bcrypt = require('bcryptjs');

        // Debugging for Render
        console.log("LOGIN BODY:", { email, password: password ? '********' : 'MISSING' });

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const { rows } = await db.query('SELECT * FROM "users" WHERE email = $1', [normalizedEmail]);

        // FIX 3: Handle missing user safely
        if (rows.length === 0) {
            console.log(`[Login Info] User not found: ${normalizedEmail}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];

        // FIX 2: Ensure correct bcryptjs usage
        const isMatch = await bcrypt.compare(password, user.password_hash);

        console.log(`[Login Info] Match result for ${normalizedEmail}: ${isMatch}`);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (user.status !== 'ACTIVE') {
            console.log(`[Login Info] Account not active: ${normalizedEmail}`);
            return res.status(403).json({ error: 'Your account is not active' });
        }

        console.log(`[Login Success] User: ${normalizedEmail}`);
        const { password_hash: _, ...userInfo } = user;
        res.json({ success: true, user: userInfo });

    } catch (error) {
        // Render logs will now show exact reason
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
