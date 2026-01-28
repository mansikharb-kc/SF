const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

async function checkAuth() {
    console.log('--- Checking Google Service Account Credentials ---');
    try {
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
            : path.join(__dirname, 'credentials.json');

        console.log(`Resource Path: ${credentialsPath}`);

        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const client = await auth.getClient();
        console.log('✅ Service Account Authentication: SUCCESS');
        console.log(`📧 Service Account Email: ${client.email}`);
        console.log('--- Done ---');

    } catch (error) {
        console.error('❌ Authentication Failed:', error.message);
        console.log('Please ensure credentials.json is valid and placed in the server directory.');
    }
}

checkAuth();
