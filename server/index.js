const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const cron = require('node-cron');
const { syncSheetToDb } = require('./services/syncService');
require('dotenv').config();

const app = express();

// 1. Production-Safe CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

const apiRoutes = require('./routes/api');

// 2. API Routes
app.use('/api', apiRoutes);

// 3. Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 4. Node 22-safe catch-all
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 10000;

// 🚀 Faster Startup: Listen for Port first, then Init DB
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is awake and listening on port ${PORT}`);

    // Initialize DB connection in the background
    initDB().then(() => {
        console.log('📅 Starting Cron Scheduler...');
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
    }).catch(err => {
        console.error('❌ BACKGROUND DB INIT FAILED:', err);
    });
});
