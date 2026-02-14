const { getAccessToken } = require('./server/services/zohoService');

async function testZohoConnection() {
    console.log('🔍 Testing Zoho CRM Connection...');
    try {
        const result = await getAccessToken();
        console.log('✅ Zoho CRM Connected Successfully!');
        console.log('📡 API Domain:', result.apiDomain);
        console.log('🔑 Access Token retrieved/refreshed successfully.');
    } catch (error) {
        console.error('❌ Zoho CRM Connection Failed:');
        if (error.message.includes('ZOHO_NOT_CONFIGURED')) {
            console.error('👉 Error: Zoho is not configured yet. You need to provide a Grant Token or set ZOHO_REFRESH_TOKEN in .env.');
        } else if (error.response) {
            console.error('👉 API Error:', error.response.data);
        } else {
            console.error('👉 Error details:', error.message);
        }
    } finally {
        process.exit(0);
    }
}

testZohoConnection();
