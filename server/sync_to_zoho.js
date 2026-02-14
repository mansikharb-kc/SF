const { getAccessToken } = require('./services/zohoService');
const { db } = require('./db');
const axios = require('axios');

async function syncToZoho() {
    console.log('--- Starting CRM Sync from Staging ---');
    try {
        // 1. Get Access Token
        const { accessToken, apiDomain } = await getAccessToken();

        // 2. Fetch Pending Records
        const { rows: pendingLeads } = await db.query(
            "SELECT * FROM crm_leads WHERE crm_status = 'Pending' LIMIT 100"
        );

        if (pendingLeads.length === 0) {
            console.log('No pending leads found in staging.');
            return;
        }

        console.log(`Processing ${pendingLeads.length} leads...`);

        // 3. Prepare Bulk Push (Zoho limit 100)
        const payloadData = pendingLeads.map(lead => ({
            Last_Name: lead.last_name,
            First_Name: lead.first_name,
            Company: lead.company,
            Email: lead.email,
            Phone: lead.phone,
            Description: `Imported via AntiGravity Staging. Source ID: ${lead.source_id}`
        }));

        const response = await axios.post(
            `${apiDomain}/crm/v2/Leads`,
            { data: payloadData },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const zohoResponses = response.data.data;

        // 4. Update Staging Table based on responses
        for (let i = 0; i < zohoResponses.length; i++) {
            const zohoRes = zohoResponses[i];
            const lead = pendingLeads[i];

            if (zohoRes.status === 'success') {
                await db.query(`
                    UPDATE crm_leads 
                    SET crm_status = 'Success', 
                        crm_insert_time = NOW(),
                        error_message = NULL
                    WHERE id = $1
                `, [lead.id]);
                console.log(`✅ Sync Success: ${lead.source_id} -> Zoho ID: ${zohoRes.details.id}`);
            } else {
                await db.query(`
                    UPDATE crm_leads 
                    SET crm_status = 'Failed', 
                        error_message = $1
                    WHERE id = $2
                `, [zohoRes.message, lead.id]);
                console.log(`❌ Sync Failed: ${lead.source_id} -> ${zohoRes.message}`);
            }
        }

        console.log('--- CRM Sync Done ---');
    } catch (error) {
        console.error('--- CRM Sync Failed ---');
        console.error(error.response?.data || error.message);
    } finally {
        await db.end();
    }
}

syncToZoho();
