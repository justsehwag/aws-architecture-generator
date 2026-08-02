const response = await fetch('https://x4wedmmebyam6gdotufkbhfrfm0hkmwx.lambda-url.ap-south-1.on.aws/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'A simple serverless API with Lambda and DynamoDB' }),
});
console.log('Status:', response.status);
const body = await response.text();
console.log('Body length:', body.length);
console.log('First 300 chars:', body.substring(0, 300));
