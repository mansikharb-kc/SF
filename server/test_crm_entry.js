const { db } = require('./db');
const { syncToZoho } = require('./services/stagingService');

async function testCrmEntry() {
    console.log('🚀 Creating Test Entry in CRM Staging...');

    const testId = 'TEST-' + Date.now();
    const testLead = {
        source_id: testId,
        first_name: 'AntiGravity',
        last_name: 'Test Entry',
        company: 'AI Testing Lab',
        email: 'test' + Math.floor(Math.random() * 1000) + '@example.com',
        phone: '9999999999'
    };

    try {
        // 1. Ensure table exists (though it should)
        await db.query(`
            CREATE TABLE IF NOT EXISTS crm_leads (
                id SERIAL PRIMARY KEY,
                source_id VARCHAR(255) UNIQUE,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                company VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(255),
                insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                crm_status VARCHAR(50) DEFAULT 'Pending',
                crm_insert_time TIMESTAMP,
                error_message TEXT
            )
        `);

        // 2. Insert test lead
        const insertRes = await db.query(`
            INSERT INTO crm_leads (source_id, first_name, last_name, company, email, phone, crm_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
            RETURNING id
        `, [testLead.source_id, testLead.first_name, testLead.last_name, testLead.company, testLead.email, testLead.phone]);

        const leadId = insertRes.rows[0].id;
        console.log(`✅ Test Lead created in DB with Staging ID: ${leadId}`);

        // 3. Trigger sync for this specific lead
        // The syncToZoho in stagingService limits to 100 pending.
        // To be sure we only test THIS one, we could modify it or just run it.
        // Let's run a custom sync for this ID to be precise.

        console.log('🔄 Pushing test lead to Zoho...');
        const { getAccessToken } = require('./services/zohoService');
        const axios = require('axios');
        const { accessToken, apiDomain } = await getAccessToken();

        const payload = {
            data: [{
                Last_Name: testLead.last_name,
                First_Name: testLead.first_name,
                Company: testLead.company,
                Email: testLead.email,
                Phone: testLead.phone,
                Description: 'AntiGravity System Test Entry'
            }]
        };

        const response = await axios.post(
            `${apiDomain}/crm/v2/Leads`,
            payload,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const zohoRes = response.data.data[0];
        if (zohoRes.status === 'success') {
            console.log('✅ SUCCESS! Zoho ID:', zohoRes.details.id);
            await db.query(`
                UPDATE crm_leads 
                SET crm_status = 'Success', 
                    crm_insert_time = NOW(),
                    error_message = NULL
                WHERE id = $1
            `, [leadId]);
        } else {
            console.error('❌ FAILED:', zohoRes.message);
            await db.query(`
                UPDATE crm_leads 
                SET crm_status = 'Failed', 
                    error_message = $1
                WHERE id = $2
            `, [zohoRes.message, leadId]);
        }

    } catch (e) {
        console.error('💥 Test execution failed:', e.message);
        if (e.response && e.response.data) {
            console.error('Zoho API Error:', JSON.stringify(e.response.data, null, 2));
        }
    } finally {
        process.exit();
    }
}

testCrmEntry();
