const parse = require('pg-connection-string').parse;

const url = "postgresql://postgres.yuchzgwjwsiiromozbpc:SCQFnqN%25F%2167vF79DAnes6k7%23@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

try {
    const config = parse(url);
    console.log('Success:', config.host, config.user, config.database);
} catch (e) {
    console.log('Failed:', e.message);
}

const regex = /^(?:postgres|postgresql):\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/;
const match = url.match(regex);
console.log('Regex Match:', !!match);
if (match) {
    console.log('User:', match[1]);
    console.log('Pass:', match[2]);
    console.log('Host:', match[3]);
    console.log('Port:', match[4]);
    console.log('DB:', match[5]);
}
