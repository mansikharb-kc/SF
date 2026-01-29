require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const path = require('path');
const cron = require('node-cron');
const { syncSheetToDb } = require('./services/syncService');

const app = express();

// 1. Basic Middleware
app.use(cors());
app.use(express.json());

const apiRoutes = require('./routes/api');

// 2. API Routes
app.use('/api', apiRoutes);

// 3. Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 4. SERVE FRONTEND (The All-in-One Fix)
// This tells the server to look for your website files in the client/dist folder
const frontendPath = path.join(__dirname, '../client/dist');
app.use(express.static(frontendPath));

// 5. THE FIX: Node 22-safe catch-all
// If it's not an API call, send the user to the website (index.html)
app.get('/*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        res.status(404).json({ message: 'API Route not found' });
    }
});

const PORT = process.env.PORT || 10000;

// 🚀 Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ All-in-One Server running on port ${PORT}`);

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
    }).catch(err => {
        console.error('❌ DB INIT FAILED:', err);
    });
});
