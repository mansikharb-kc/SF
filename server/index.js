const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const apiRoutes = require('./routes/api');

app.use('/api', apiRoutes);

const cron = require('node-cron');
const { syncSheetToDb } = require('./services/syncService');

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

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
