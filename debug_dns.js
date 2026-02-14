const dns = require('dns');

const host = 'db.yuchzgwjwsiiromozbpc.supabase.co';

dns.lookup(host, (err, address, family) => {
    console.log('--- dns.lookup ---');
    if (err) console.error(err);
    else console.log(`Address: ${address}, Family: IPv${family}`);
});

dns.resolve6(host, (err, addresses) => {
    console.log('--- dns.resolve6 ---');
    if (err) console.error(err);
    else console.log('Addresses:', addresses);
});

dns.resolve4(host, (err, addresses) => {
    console.log('--- dns.resolve4 ---');
    if (err) console.error(err);
    else console.log('Addresses:', addresses);
});
