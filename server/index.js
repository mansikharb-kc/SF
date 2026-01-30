require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const cron = require('node-cron');
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
app.get('/', (req, res) => res.status(200).send('Backend is running 🚀'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ping', (req, res) => res.json({ pong: true }));

// 3. API Routes
app.use('/api', apiRoutes);

// 4. API Fallback (404 for unknown /api routes)
app.all(/^\/api\/.*$/, (req, res) => {
    res.status(404).json({ message: 'API route not found' });
});

// 5. Catch-all for non-API routes (Optional, but good for clarity)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.status(404).json({ message: 'Resource not found' });
    }
});

// 🚀 CRITICAL: Bind to port IMMEDIATELY for Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend Server is LIVE on port ${PORT}`);

    // Connect to DB in background so port binding isn't delayed
    initDB().then(() => {
        console.log('📅 Starting Cron Scheduler...');
        cron.schedule('*/10 * * * *', async () => {
            try {
                await syncSheetToDb('AUTO');
                console.log('✅ Scheduled sync success');
            } catch (e) {
                if (e.message !== 'SYNC_IN_PROGRESS') {
                    console.error('❌ Scheduled sync failed', e);
                }
            }
        });
    }).catch(err => console.error('❌ Background DB error:', err));
});
