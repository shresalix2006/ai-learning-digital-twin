const https = require('https');

const NVIDIA_API_KEY = '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';
const MODEL = 'minimaxai/minimax-m2.7';

function testNvidia() {
  const payload = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello! Tell me about yourself in one sentence.' }
    ],
    max_tokens: 100,
    temperature: 1,
    top_p: 0.95
  });

  const options = {
    hostname: 'integrate.api.nvidia.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  console.log('Testing NVIDIA API with MiniMax model...\n');

  const req = https.request(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try {
        const data = JSON.parse(body);
        if (data.error) {
          console.log('ERROR:', data.error);
        } else {
          console.log('SUCCESS!\n');
          console.log('Response:', data.choices[0].message.content);
        }
      } catch(e) {
        console.log('Parse error:', e.message);
        console.log('Raw response:', body);
      }
    });
  });

  req.on('error', err => console.log('Request error:', err.message));
  req.write(payload);
  req.end();
}

testNvidia();
