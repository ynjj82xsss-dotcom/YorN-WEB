import dns from 'dns';
dns.resolveAny('api-inference.huggingface.co', (err, addresses) => {
  if (err) console.error(err);
  console.log(`Any: ${JSON.stringify(addresses)}`);
});
