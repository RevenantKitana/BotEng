/**
 * Simple test script for the Study Buddy Bot API
 * Run: node test.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function for HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Test scenarios
async function runTests() {
  console.log('🧪 Running API Tests...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    let res = await makeRequest('GET', '/health');
    console.log(`   ✅ Status: ${res.status}`);
    console.log(`   Response:`, res.data, '\n');

    // Test 2: Start conversation
    console.log('2️⃣  Starting new conversation...');
    res = await makeRequest('POST', '/start');
    if (res.status !== 200) throw new Error('Failed to start');
    
    const sessionId = res.data.sessionId;
    console.log(`   ✅ Session ID: ${sessionId}`);
    console.log(`   Initial message: "${res.data.message}"\n`);

    // Test 3: Send message with mom keyword
    console.log('3️⃣  Testing message with "mom" keyword...');
    res = await makeRequest('POST', '/chat', {
      sessionId,
      message: 'My mom helps me with homework'
    });
    console.log(`   ✅ Bot response: "${res.data.botMessage}"`);
    console.log(`   Elapsed time: ${res.data.elapsedTime.toFixed(2)}s\n`);

    // Test 4: Send another message
    console.log('4️⃣  Testing follow-up message...');
    res = await makeRequest('POST', '/chat', {
      sessionId,
      message: 'She listens to my problems and helps me feel better'
    });
    console.log(`   ✅ Bot response: "${res.data.botMessage}"\n`);

    // Test 5: Get session details
    console.log('5️⃣  Fetching session details...');
    res = await makeRequest('GET', `/session/${sessionId}`);
    console.log(`   ✅ Active: ${res.data.isActive}`);
    console.log(`   Total messages: ${res.data.conversationHistory.length}`);
    console.log(`   Conversation:`, res.data.conversationHistory, '\n');

    // Test 6: Test empty message error
    console.log('6️⃣  Testing validation (empty message)...');
    res = await makeRequest('POST', '/chat', {
      sessionId,
      message: ''
    });
    console.log(`   ✅ Status: ${res.status} (expected 400)`);
    console.log(`   Error: "${res.data.error}"\n`);

    // Test 7: Test "no one" keyword to end session
    console.log('7️⃣  Testing session end with "no one" keyword...');
    res = await makeRequest('POST', '/start');
    const sessionId2 = res.data.sessionId;
    
    res = await makeRequest('POST', '/chat', {
      sessionId: sessionId2,
      message: 'no one supports me'
    });
    console.log(`   ✅ Bot response: "${res.data.botMessage}"`);
    console.log(`   Session ended: ${res.data.isEnded}\n`);

    // Test 8: Test pet keyword redirect
    console.log('8️⃣  Testing pet keyword (redirect)...');
    res = await makeRequest('POST', '/start');
    const sessionId3 = res.data.sessionId;
    
    res = await makeRequest('POST', '/chat', {
      sessionId: sessionId3,
      message: 'My dog is my best friend'
    });
    console.log(`   ✅ Bot response: "${res.data.botMessage}"\n`);

    // Test 9: Test friend keyword redirect
    console.log('9️⃣  Testing friend keyword (redirect)...');
    res = await makeRequest('POST', '/chat', {
      sessionId: sessionId3,
      message: 'My friend helps me'
    });
    console.log(`   ✅ Bot response: "${res.data.botMessage}"\n`);

    // Test 10: Test default response (no keyword match)
    console.log('🔟 Testing default response (no keywords)...');
    res = await makeRequest('POST', '/chat', {
      sessionId: sessionId3,
      message: 'xyz abc 123'
    });
    console.log(`   ✅ Bot response: "${res.data.botMessage}"\n`);

    console.log('✨ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n⚠️  Make sure the server is running: npm run dev');
    process.exit(1);
  }
}

// Run tests
runTests();
