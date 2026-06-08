const http = require('http');

function testModel(model, modelName) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: 'Say hello in one sentence.' }
      ]
    });

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/ask',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n━━━ ${modelName} ━━━`);
        console.log('Status:', res.statusCode);
        try {
          const data = JSON.parse(body);
          if (data.error) {
            console.log('ERROR:', data.error.message);
          } else {
            console.log('SUCCESS!');
            console.log('Response:', data.choices[0].message.content);
          }
        } catch(e) {
          console.log('Parse error:', e.message);
        }
        resolve();
      });
    });
    
    req.on('error', err => {
      console.log(`\n━━━ ${modelName} ━━━`);
      console.log('Connection error:', err.message);
      console.log('Make sure server is running: node server_enhanced.js');
      resolve();
    });
    
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Enhanced Server with Multiple Models\n');
  console.log('Server: http://localhost:4000');
  
  await testModel('gemini-2.5-flash', 'Gemini 2.5 Flash');
  await testModel('gemini-2.0-flash', 'Gemini 2.0 Flash');
  await testModel('minimax-m2.7', 'NVIDIA MiniMax M2.7');
  
  console.log('\n✅ All tests completed!');
}

runTests();
