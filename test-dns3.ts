import dns from 'dns';
dns.resolve('api-inference.huggingface.co', (err, addresses) => {
  if (err) console.error(err);
  console.log(`addresses: ${JSON.stringify(addresses)}`);
});
