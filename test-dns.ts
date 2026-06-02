import https from 'https';

https.get('https://api-inference.huggingface.co/', (res) => {
  console.log('statusCode:', res.statusCode);
}).on('error', (e) => {
  console.error(e);
});
