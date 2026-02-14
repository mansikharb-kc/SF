const { getAccessToken } = require('./services/zohoService');
const { db } = require('./db');

async function testConnection() {
    console.log('--- Zoho Connection Test ---');
    try {
        console.log('1. Fetching Access Token (will refresh if needed)...');
        const tokenData = await getAccessToken();
        console.log('✅ Access Token retrieved successfully.');
        console.log('   Domain:', tokenData.apiDomain);

        // Let's try a real API call to double check
        const axios = require('axios');
        console.log('2. Verifying token with a real CRM call (Get Modules)...');
        const response = await axios.get(`${tokenData.apiDomain}/crm/v2/settings/modules`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${tokenData.accessToken}` }
        });

        if (response.data.modules) {
            console.log(`✅ CRM Connection Verified! Found ${response.data.modules.length} modules.`);
        } else {
            console.log('⚠️ CRM Response OK but no modules found?', response.data);
        }
    } catch (err) {
        console.error('❌ CONNECTION FAILED:');
        if (err.response) {
            console.error('   Status:', err.response.status);
            console.error('   Data:', JSON.stringify(err.response.data));
        } else {
            console.error('   Error:', err.message);
        }

        console.log('\n🔍 Troubleshooting Tips:');
        console.log('1. Check if ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are correct in .env (or server settings).');
        console.log('2. Ensure ZOHO_AUTH_DOMAIN is set to https://accounts.zoho.in if you are in India.');
        console.log('3. If you get "invalid_client", your credentials do not match the domain.');
    }
    process.exit(0);
}

testConnection();
