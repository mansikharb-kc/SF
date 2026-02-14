require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const cron = require('node-cron');
const path = require('path');
const { syncSheetToDb } = require('./services/syncService');

const app = express();

// 1. Basic Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const apiRoutes = require('./routes/api');

// 2. Health & Ping (Fast checks for Render)
app.get('/status', (req, res) => res.status(200).send('Backend is running 🚀'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ping', (req, res) => res.json({ pong: true }));

// 3. External Cron Sync Endpoint (Wakes Render from sleep)
app.get('/cron-sync', async (req, res) => {
    console.log('⏰ GitHub Action Cron Sync Trigger Received');

    // Run sync in background to avoid Render 100s timeout
    syncSheetToDb('AUTO')
        .then(() => console.log('✅ Background Cron Sync Completed Successfully'))
        .catch(error => {
            if (error.message !== 'SYNC_IN_PROGRESS') {
                console.error('❌ Background Cron Sync Failed:', error);
            } else {
                console.log('⚠️ Sync skipped (already in progress)');
            }
        });

    // Return success immediately
    res.json({ success: true, message: 'Sync started in background' });
});

// 4. API Routes
app.use('/api', apiRoutes);

// 5. Config Info (Helper for Frontend)
app.get('/api/config', (req, res) => {
    res.json({
        primaryAdminEmail: process.env.PRIMARY_ADMIN_EMAIL || 'mansikharb.kc@gmail.com'
    });
});

// 6. Serve Static Files (All-in-One Deployment)
const clientPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientPath));

// Handle React routing, return all requests to React app
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'), (err) => {
        if (err) {
            // If static files aren't built yet, just show simple status
            res.status(200).send('Backend is running 🚀 (Frontend build missing or path error)');
        }
    });
});

// 7. Safe 404 Handler for API
app.use('/api', (req, res) => {
    res.status(404).json({ error: "API Route not found" });
});

// 🚀 CRITICAL: Bind to port IMMEDIATELY for Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend Server is LIVE on port ${PORT}`);

    // Connect to DB in background so port binding isn't delayed
    initDB().then(async () => {
        const { ensureUsersTable, ensureOtpsTable } = require('./services/dbService');
        await ensureUsersTable().catch(err => console.error('❌ User table init error:', err));
        await ensureOtpsTable().catch(err => console.error('❌ OTP table init error:', err));

        console.log('📅 Starting Backup Internal Cron Scheduler...');
        // Every 30 minutes (Fallback if server is already awake)
        cron.schedule('*/30 * * * *', async () => {
            try {
                await syncSheetToDb('AUTO');
                console.log('✅ Internal sync success');
            } catch (e) {
                if (e.message !== 'SYNC_IN_PROGRESS') {
                    console.error('❌ Internal sync failed', e);
                }
            }
        });
    }).catch(err => console.error('❌ Background DB error:', err));
});
