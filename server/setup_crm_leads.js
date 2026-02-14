const { db } = require('./db');

async function setupCrmLeadsTable() {
    console.log('--- Setting up crm_leads table ---');
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS crm_leads (
                id SERIAL PRIMARY KEY,           
                source_id TEXT NOT NULL UNIQUE,                      
                first_name VARCHAR(255) NOT NULL,           
                last_name VARCHAR(255) NOT NULL,            
                company VARCHAR(255) NOT NULL,              
                email VARCHAR(255),                          
                phone VARCHAR(20),                           
                insert_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,               
                crm_status VARCHAR(20) DEFAULT 'Pending' CHECK (crm_status IN ('Pending', 'Success', 'Failed')),
                crm_insert_time TIMESTAMP,                    
                error_message TEXT                           
            );
        `;
        await db.query(query);
        console.log('✅ Table "crm_leads" created or already exists.');
    } catch (error) {
        console.error('❌ Error creating table:', error);
    } finally {
        await db.end();
    }
}

setupCrmLeadsTable();
