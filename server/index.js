require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const path = require('path');
const cron = require('node-cron');
const { syncSheetToDb } = require('./services/syncService');

const app = express();

// 1. Basic Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

const apiRoutes = require('./routes/api');

// 2. Health & Ping (Fast checks for Render)
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ping', (req, res) => res.json({ pong: true }));

// 3. API Routes
app.use('/api', apiRoutes);

// 4. SERVE FRONTEND
const frontendPath = path.join(__dirname, '../client/dist');
app.use(express.static(frontendPath));

// 5. SPA Catch-all (Must be last)
app.get('/*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// 🚀 CRITICAL: Bind to port IMMEDIATELY for Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ All-in-One Server is LIVE on port ${PORT}`);

    // Connect to DB in background so port binding isn't delayed
    initDB().then(() => {
        console.log('📅 Starting Cron Scheduler...');
        cron.schedule('0 * * * *', async () => {
            try {
                await syncSheetToDb('AUTO');
                console.log('✅ Scheduled sync success');
            } catch (e) {
                console.error('❌ Scheduled sync failed', e);
            }
        });
    }).catch(err => console.error('❌ Background DB error:', err));
});
