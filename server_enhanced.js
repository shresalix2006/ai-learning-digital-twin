const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

// ── API Keys & Models ───────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
// API keys loaded from config.js
const PROVIDERS = {
  
  'minimax-m2.7': {
    provider: 'nvidia',
    model: 'minimaxai/minimax-m2.7',
    hostname: 'integrate.api.nvidia.com',
    pathTemplate: () => '/v1/chat/completions',
    apiKey: NVIDIA_API_KEY
  },
  
  'gemini-2.0-flash': {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    hostname: 'generativelanguage.googleapis.com',
    pathTemplate: (model, key) => `/v1beta/models/${model}:generateContent?key=${key}`,
    apiKey: GEMINI_API_KEY
  },
  'gemini-2.5-flash': {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    hostname: 'generativelanguage.googleapis.com',
    pathTemplate: (model, key) => `/v1beta/models/${model}:generateContent?key=${key}`,
    apiKey: GEMINI_API_KEY
  }
};

// ── Rate Limit Protection ───────────────────────────────────────────────────
const rateLimitState = {};
const GEMINI_MIN_GAP_MS = 4000;

async function waitForRateLimit(modelKey) {
  if (!rateLimitState[modelKey]) rateLimitState[modelKey] = 0;
  const now = Date.now();
  const gap = now - rateLimitState[modelKey];
  if (gap < GEMINI_MIN_GAP_MS) {
    const waitMs = GEMINI_MIN_GAP_MS - gap;
    console.log(`⏳ Rate limiting ${modelKey}: waiting ${waitMs}ms`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  rateLimitState[modelKey] = Date.now();
}

function extractRetryAfter(message) {
  if (!message) return null;
  const match = message.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1])) * 1000 + 500 : null;
}

async function callGeminiWithRetry(options, payloadString, modelKey, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await waitForRateLimit(modelKey);
    const data = await new Promise((resolve, reject) => {
      const r = https.request(options, res => {
        let d = '';
        res.on('data', c => { d += c; });
        res.on('end', () => resolve(d));
      });
      r.on('error', reject);
      r.write(payloadString);
      r.end();
    });
    const parsed = JSON.parse(data);
    if (parsed.error) {
      const isQuota = parsed.error.code === 429 ||
        (parsed.error.message || '').toLowerCase().includes('quota');
      if (isQuota && attempt < maxRetries) {
        const wait = extractRetryAfter(parsed.error.message) || (60000 * attempt);
        console.log(`⚠️  Rate limit hit. Retrying in ${wait / 1000}s (attempt ${attempt}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw new Error(parsed.error.message);
    }
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    return { choices: [{ message: { role: 'assistant', content: text } }] };
  }
  throw new Error('Max retries exceeded due to Gemini rate limiting.');
}

// ── Helper Functions ────────────────────────────────────────────────────────
function convertToGeminiFormat(messages) {
  let systemInstruction = null;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }

  if (systemInstruction && contents.length > 0) {
    contents[0].parts[0].text = `System Instruction: ${systemInstruction}\n\n${contents[0].parts[0].text}`;
  } else if (systemInstruction) {
    contents.push({
      role: 'user',
      parts: [{ text: `System Instruction: ${systemInstruction}` }]
    });
  }

  return { contents, generationConfig: { maxOutputTokens: 2048 } };
}

function convertToOpenAIFormat(messages) {
  return {
    model: 'placeholder',
    messages: messages,
    max_tokens: 2048,
    temperature: 1,
    top_p: 0.95
  };
}

function parseNvidiaResponse(data) {
  return JSON.parse(data);
}

// ── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const htmlPath = path.join(__dirname, 'twin_ai_enhanced.html');
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Cannot find twin_ai_enhanced.html in this folder.');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/models') {
    const models = Object.keys(PROVIDERS).map(key => ({
      id: key,
      name: key,
      provider: PROVIDERS[key].provider
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ models }));
    return;
  }

  if (req.method === 'POST' && req.url === '/ask') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: { message: 'Invalid JSON' } }));
        return;
      }

      const { messages, model = 'minimax-m2.7' } = parsed;

      if (!messages) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: { message: 'Missing messages' } }));
        return;
      }

      const config = PROVIDERS[model];
      if (!config) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: { message: `Unknown model: ${model}` } }));
        return;
      }

      try {
        let response;

        if (config.provider === 'gemini') {
          const payload = convertToGeminiFormat(messages);
          const payloadString = JSON.stringify(payload);
          const options = {
            hostname: config.hostname,
            path: config.pathTemplate(config.model, config.apiKey),
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payloadString)
            }
          };
          response = await callGeminiWithRetry(options, payloadString, model);

        } else if (config.provider === 'nvidia') {
          const payload = convertToOpenAIFormat(messages);
          payload.model = config.model;
          const payloadString = JSON.stringify(payload);
          const options = {
            hostname: config.hostname,
            path: config.pathTemplate(config.model, config.apiKey),
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payloadString),
              'Authorization': `Bearer ${config.apiKey}`
            }
          };
          const data = await new Promise((resolve, reject) => {
            const r = https.request(options, apiRes => {
              let d = '';
              apiRes.on('data', c => { d += c; });
              apiRes.on('end', () => resolve(d));
            });
            r.on('error', reject);
            r.write(payloadString);
            r.end();
          });
          response = parseNvidiaResponse(data);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));

      } catch (e) {
        console.error('❌ Error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: e.message } }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('\n🤖 TWIN::AI Enhanced Server');
  console.log('━'.repeat(50));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('\n📡 Available Providers:');
  console.log('   • Gemini (gemini-1.5-flash-latest, gemini-2.0-flash, gemini-2.5-flash)');
  console.log('   • NVIDIA (minimax-m2.7)');
  console.log('\n🛡️  Rate Limit Protection: ON (max 15 req/min)');
  console.log('🔁  Auto-Retry on 429: ON (up to 3 attempts)');
  console.log('\n💡 Keep this terminal open while using the app.\n');
});