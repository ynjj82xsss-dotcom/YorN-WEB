import dns from 'dns';
dns.setServers(['8.8.8.8']);
dns.resolve4('api-inference.huggingface.co', (err, addresses) => {
  if (err) throw err;
  console.log(`addresses: ${JSON.stringify(addresses)}`);
});
