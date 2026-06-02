import https from 'https';

https.get('https://cloudflare-dns.com/dns-query?name=api-inference.huggingface.co&type=A', {
  headers: { accept: 'application/dns-json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
});
