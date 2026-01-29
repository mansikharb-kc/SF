const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const cron = require('node-cron');
const { syncSheetToDb } = require('./services/syncService');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const apiRoutes = require('./routes/api');

// 1. API Routes
app.use('/api', apiRoutes);

// 2. Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 3. THE FIX: Node 22-safe catch-all (Must be LAST)
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// 4. Port Binding (Render detects process.env.PORT)
const PORT = process.env.PORT || 10000;

// Initialize DB and Start Server
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);

        // Schedule Sync: Every hour
        cron.schedule('0 * * * *', async () => {
            console.log('⏳ Running scheduled sync...');
            try {
                await syncSheetToDb('AUTO');
                console.log('✅ Scheduled sync completed.');
            } catch (e) {
                console.error('❌ Scheduled sync failed:', e);
            }
        });
        console.log('📅 Cron job scheduled: 0 * * * *');
    });
}).catch(err => {
    console.error('❌ FAILED TO START SERVER:', err);
    process.exit(1);
});
