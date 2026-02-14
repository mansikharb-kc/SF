const { Client } = require('pg');

const regions = [
    'ap-south-1', 'ap-southeast-1', 'us-east-1', 'us-west-1',
    'eu-central-1', 'eu-west-1', 'ap-southeast-2', 'me-central-1',
    'sa-east-1', 'ca-central-1', 'ap-northeast-1'
];

async function findRegion() {
    console.log('--- 🛡️ Supabase Region Discovery ---');

    for (const region of regions) {
        process.stdout.write(`Testing ${region}... `);
        const client = new Client({
            user: 'postgres.yuchzgwjwsiiromozbpc',
            host: `aws-0-${region}.pooler.supabase.com`,
            database: 'postgres',
            password: '[SCQFnqN%F!z6k7#]',
            port: 6543,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 3000
        });

        try {
            await client.connect();
            console.log('✅ SUCCESS!');
            console.log('\n--- SUCCESS ---');
            console.log('Region:', region);
            console.log('--- END ---');
            await client.end();
            process.exit(0);
        } catch (err) {
            if (err.message.includes('Tenant or user not found')) {
                console.log('❌ No');
            } else if (err.message.includes('authentication failed')) {
                console.log('⚠️ Host Found! (Auth issue)');
            } else {
                console.log(`❌ ${err.message}`);
            }
        } finally {
            try { await client.end(); } catch (e) { }
        }
    }
    process.exit(1);
}

findRegion();
