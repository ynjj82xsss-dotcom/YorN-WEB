import dns from 'dns';
dns.resolve('huggingface.co', (err, addresses) => {
  if (err) console.error(err);
  console.log(`huggingface.co addresses: ${JSON.stringify(addresses)}`);
});
