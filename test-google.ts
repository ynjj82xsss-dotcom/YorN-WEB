import https from 'https';

https.get('https://google.com/', (res) => {
  console.log('statusCode:', res.statusCode);
}).on('error', (e) => {
  console.error(e);
});
