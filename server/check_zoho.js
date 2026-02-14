const { getAccessToken } = require('./services/zohoService');
const { db } = require('./db');

async function checkZohoConnection() {
    console.log('--- Checking Zoho CRM Connection ---');
    try {
        console.log('Attempting to retrieve access token...');
        const result = await getAccessToken();
        console.log('✅ Successfully retrieved Zoho Access Token');
        console.log('API Domain:', result.apiDomain);
        console.log('Token (masked):', result.accessToken.substring(0, 10) + '...');

        console.log('--- Connection Verified ---');
    } catch (error) {
        console.error('❌ Zoho Connection Failed:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    } finally {
        await db.end();
    }
}

checkZohoConnection();
