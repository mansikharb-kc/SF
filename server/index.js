const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const path = require('path');
const cron = require('node-cron');
const { syncSheetToDb } = require('./services/syncService');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const apiRoutes = require('./routes/api');

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Anything that doesn't match the above, send back index.html
app.get('*', (req, res) => {
    // Only send index.html if it's not an API route
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
});

// Initialize DB and Start Server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);

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
});
