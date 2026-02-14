const { Client } = require('pg');

const regions = [
    'ap-south-1',      // Mumbai
    'ap-southeast-1',  // Singapore
    'us-east-1',       // N. Virginia
    'us-west-1',       // N. California
    'eu-central-1',    // Frankfurt
    'eu-west-1'        // Ireland
];

async function findRegion() {
    console.log('--- 🛡️ Supabase Region Discovery ---');
    console.log('Searching for your project region to enable IPv4 connectivity...');

    for (const region of regions) {
        process.stdout.write(`Testing ${region}... `);
        const client = new Client({
            user: 'postgres.yuchzgwjwsiiromozbpc',
            host: `aws-0-${region}.pooler.supabase.com`,
            database: 'postgres',
            password: '[SCQFnqN%F!z6k7#]',
            port: 6543,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });

        try {
            await client.connect();
            console.log('\n✅ FOUND IT!');
            console.log('Region:', region);
            const res = await client.query('SELECT version()');
            console.log('Database Version:', res.rows[0].version);

            // Success! We should update .env with this
            await client.end();
            process.exit(0);
        } catch (err) {
            if (err.message.includes('Tenant or user not found')) {
                console.log('❌ No');
            } else if (err.message.includes('authentication failed')) {
                console.log('⚠️ Password/User Incorrect (but host is right)');
            } else {
                console.log(`❌ Error: ${err.message}`);
            }
        } finally {
            try { await client.end(); } catch (e) { }
        }
    }

    console.log('\n❌ Could not find the project in any common regions.');
    process.exit(1);
}

findRegion();
