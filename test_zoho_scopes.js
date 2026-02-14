const { getAccessToken } = require('./server/services/zohoService');
const axios = require('axios');

async function test() {
    try {
        const { accessToken, apiDomain } = await getAccessToken();
        console.log('Testing with Domain:', apiDomain);

        const payload = {
            data: [{
                Last_Name: "Test Lead",
                Company: "Test Company"
            }]
        };
        const res = await axios.post(`${apiDomain}/crm/v2/Leads`, payload, {
            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
        });
        console.log('Successfully posted lead!', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    } finally {
        process.exit(0);
    }
}
test();
