const { db } = require('../db');
const { getAccessToken } = require('./zohoService');
const axios = require('axios');

/**
 * Syncs leads from main table to crm_leads staging table
 */
const syncToCrmStaging = async () => {
    console.log('--- Syncing Leads to CRM Staging ---');
    const results = { staged: 0, errors: 0 };

    // 1. Fetch records not yet in staging
    const fetchQuery = `
        SELECT * 
        FROM leads 
        WHERE sheet_id NOT IN (SELECT source_id FROM crm_leads)
        LIMIT 100;
    `;
    const { rows: newLeads } = await db.query(fetchQuery);

    for (const lead of newLeads) {
        const findValue = (keywords) => {
            const key = Object.keys(lead).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
            return key ? lead[key] : null;
        };

        const firstName = findValue(['first_name', 'fname']) || '';
        const lastName = findValue(['last_name', 'lname', 'surname']) || lead.full_name || 'Unknown';
        const company = findValue(['company', 'brand', 'firm']) || lead.brand_name || 'Individual';
        const email = findValue(['email', 'mail']);
        const phone = findValue(['phone', 'mobile']);

        const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

        try {
            await db.query(`
                INSERT INTO crm_leads (source_id, first_name, last_name, company, email, phone, insert_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [lead.sheet_id, firstName, lastName, company, email, cleanPhone, lead._created_at || new Date()]);
            results.staged++;
        } catch (insertError) {
            console.error(`❌ Error staging lead ${lead.sheet_id}:`, insertError.message);
            results.errors++;
        }
    }
    return results;
};

/**
 * Pushes pending staged leads to Zoho CRM
 */
const syncToZoho = async () => {
    console.log('--- Starting CRM Sync from Staging ---');
    const results = [];

    try {
        const { accessToken, apiDomain } = await getAccessToken();

        const { rows: pendingLeads } = await db.query(
            "SELECT * FROM crm_leads WHERE crm_status = 'Pending' LIMIT 100"
        );

        if (pendingLeads.length === 0) return [];

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

        for (let i = 0; i < zohoResponses.length; i++) {
            const zohoRes = zohoResponses[i];
            const lead = pendingLeads[i];

            if (zohoRes.status === 'success') {
                // 1. Insert into crm_records
                await db.query(`
                    INSERT INTO crm_records (source_id, first_name, last_name, company, email, phone, crm_status, insert_time, crm_insert_time, zoho_id)
                    VALUES ($1, $2, $3, $4, $5, $6, 'Success', $7, NOW(), $8)
                `, [lead.source_id, lead.first_name, lead.last_name, lead.company, lead.email, lead.phone, lead.insert_time, zohoRes.details.id]);

                // 2. Delete from crm_leads
                await db.query('DELETE FROM crm_leads WHERE id = $1', [lead.id]);

                results.push({ id: lead.source_id, status: 'SUCCESS', zoho_id: zohoRes.details.id });
            } else {
                await db.query(`
                    UPDATE crm_leads 
                    SET crm_status = 'Failed', 
                        error_message = $1
                    WHERE id = $2
                `, [zohoRes.message, lead.id]);
                results.push({ id: lead.source_id, status: 'FAILED', error: zohoRes.message });
            }
        }
    } catch (error) {
        console.error('--- CRM Sync Failed ---', error.message);
        throw error;
    }
    return results;
};

module.exports = { syncToCrmStaging, syncToZoho };
