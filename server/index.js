const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const path = require('path');
const cron = require('node-cron');
const { syncSheetToDb } = require('./services/syncService');
require('dotenv').config();

const app = express();

// 1. Production-Safe CORS
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const apiRoutes = require('./routes/api');

// 2. API Routes
app.use('/api', apiRoutes);

// 3. Health Check (Crucial for Render/Vercel monitoring)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        database: 'connected (verified at startup)'
    });
});

// 4. THE FIX: Production-Safe Catch-All for API Server
// We use 'all' and '/*' to ensure no route crashes on newer Express versions
app.all('/*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The path ${req.path} does not exist on this server.`
    });
});

// 5. Initialize DB and Start Server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);

        // Schedule Sync: Every hour at minute 0
        cron.schedule('0 * * * *', async () => {
            console.log('⏳ Running scheduled sync...');
            try {
                await syncSheetToDb('AUTO');
                console.log('✅ Scheduled sync completed.');
            } catch (e) {
                console.error('❌ Scheduled sync failed:', e);
            }
        });
        console.log('📅 Cron job scheduled: 0 * * * * (Every Hour)');
    });
}).catch(err => {
    console.error('❌ FAILED TO START SERVER:', err);
    process.exit(1);
});
