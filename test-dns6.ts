import dns from 'dns';
dns.resolve('api.openai.com', (err, addresses) => {
  if (err) console.error(err);
  console.log(`api.openai.com: ${JSON.stringify(addresses)}`);
});
