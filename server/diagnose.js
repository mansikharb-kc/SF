const { db } = require('./db');
const { getAccessToken } = require('./services/zohoService');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function runDiagnostics() {
    console.log('🔍 Starting Server Connection Diagnostics...\n');

    // 1. Database Connection
    try {
        const { rows } = await db.query('SELECT NOW() as current_time, count(*) as lead_count FROM leads');
        console.log('✅ DATABASE: Connected');
        console.log(`   - Server Time: ${rows[0].current_time}`);
        console.log(`   - Total Leads in DB: ${rows[0].lead_count}`);

        const { rows: recordsRows } = await db.query('SELECT count(*) as record_count FROM crm_records');
        console.log(`   - Total Sync Records: ${recordsRows[0].record_count}\n`);
    } catch (err) {
        console.log('❌ DATABASE: Connection Failed');
        console.log(`   - Error: ${err.message}\n`);
    }

    // 2. Zoho CRM Connection
    try {
        const token = await getAccessToken();
        console.log('✅ ZOHO CRM: Connected');
        console.log(`   - API Domain: ${token.apiDomain}`);
        console.log('   - Access Token: (Retrieved Successfully)\n');
    } catch (err) {
        console.log('❌ ZOHO CRM: Connection Failed');
        console.log(`   - Error: ${err.message}\n`);
    }

    // 3. Google Sheets Connection
    try {
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (!credsPath) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS path missing in .env');
        }

        const fullPath = path.isAbsolute(credsPath) ? credsPath : path.join(__dirname, credsPath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Credentials file not found at: ${fullPath}`);
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: fullPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        console.log('✅ GOOGLE SHEETS: Connected');
        console.log(`   - Title: ${meta.data.properties.title}`);
        console.log(`   - Sheets found: ${meta.data.sheets.length}\n`);
    } catch (err) {
        console.log('❌ GOOGLE SHEETS: Connection Failed');
        console.log(`   - Error: ${err.message}\n`);
    }

    // 4. API Endpoints Check (Internal)
    try {
        const { getHistory } = require('./services/dbService');
        if (getHistory) {
            console.log('✅ INTERNAL SERVICES: DB Service loaded\n');
        }
    } catch (err) {
        console.log('❌ INTERNAL SERVICES: Failed to load services\n');
    }

    console.log('🏁 Diagnostics Complete.');
    process.exit(0);
}

runDiagnostics();
