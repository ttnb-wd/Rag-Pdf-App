import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

// Test credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Test User';

let testSessionId = null;

async function testSignup() {
  console.log('\n📝 Testing Signup...');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Signup successful');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Name:', data.user.name);
      console.log('   Email Verified:', data.user.emailVerified);
      console.log('   Session ID:', data.session.id.substring(0, 16) + '...');
      console.log('   Expires At:', data.session.expiresAt);
      
      testSessionId = data.session.id;
      
      // Verify password_hash is not exposed
      if (data.user.password_hash || data.user.passwordHash) {
        console.log('❌ SECURITY ISSUE: password_hash exposed in response!');
      } else {
        console.log('✅ Security check: password_hash not exposed');
      }
      
      return true;
    } else {
      console.log('❌ Signup failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Signup error:', error.message);
    return false;
  }
}

async function testDuplicateSignup() {
  console.log('\n📝 Testing Duplicate Signup (should fail)...');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 409 && !data.success) {
      console.log('✅ Duplicate signup correctly rejected');
      console.log('   Error:', data.error);
      return true;
    } else {
      console.log('❌ Duplicate signup should have been rejected');
      return false;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 Testing Login...');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Login successful');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Session ID:', data.session.id.substring(0, 16) + '...');
      
      testSessionId = data.session.id;
      
      // Verify password_hash is not exposed
      if (data.user.password_hash || data.user.passwordHash) {
        console.log('❌ SECURITY ISSUE: password_hash exposed in response!');
      } else {
        console.log('✅ Security check: password_hash not exposed');
      }
      
      return true;
    } else {
      console.log('❌ Login failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

async function testInvalidLogin() {
  console.log('\n🔐 Testing Invalid Login (should fail)...');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: 'WrongPassword123!',
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 401 && !data.success) {
      console.log('✅ Invalid login correctly rejected');
      console.log('   Error:', data.error);
      
      // Check that error message doesn't reveal account existence
      if (data.error.toLowerCase().includes('invalid email or password')) {
        console.log('✅ Generic error message (good for security)');
      }
      
      return true;
    } else {
      console.log('❌ Invalid login should have been rejected');
      return false;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    return false;
  }
}

async function testSessionValidation() {
  console.log('\n🔍 Testing Session Validation...');
  console.log('─'.repeat(60));
  
  if (!testSessionId) {
    console.log('❌ No session ID available');
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: testSessionId,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Session validation successful');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      return true;
    } else {
      console.log('❌ Session validation failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    return false;
  }
}

async function testLogout() {
  console.log('\n👋 Testing Logout...');
  console.log('─'.repeat(60));
  
  if (!testSessionId) {
    console.log('❌ No session ID available');
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: testSessionId,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Logout successful');
      return true;
    } else {
      console.log('❌ Logout failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    return false;
  }
}

async function testRevokedSession() {
  console.log('\n🔍 Testing Revoked Session (should fail)...');
  console.log('─'.repeat(60));
  
  if (!testSessionId) {
    console.log('❌ No session ID available');
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: testSessionId,
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 401 && !data.success) {
      console.log('✅ Revoked session correctly rejected');
      console.log('   Error:', data.error);
      return true;
    } else {
      console.log('❌ Revoked session should have been rejected');
      return false;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    return false;
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ Health endpoint working');
      console.log('   Service:', data.service);
      console.log('   Database:', data.database);
      console.log('   Documents:', data.documents);
      console.log('   Chunks:', data.chunks);
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Starting Authentication Tests');
  console.log('='.repeat(60));
  
  const results = [];
  
  // Run tests in sequence
  results.push({ name: 'Signup', passed: await testSignup() });
  results.push({ name: 'Duplicate Signup', passed: await testDuplicateSignup() });
  results.push({ name: 'Login', passed: await testLogin() });
  results.push({ name: 'Invalid Login', passed: await testInvalidLogin() });
  results.push({ name: 'Session Validation', passed: await testSessionValidation() });
  results.push({ name: 'Logout', passed: await testLogout() });
  results.push({ name: 'Revoked Session', passed: await testRevokedSession() });
  results.push({ name: 'Health Endpoint', passed: await testHealthEndpoint() });
  
  // Summary
  console.log('\n📊 Test Results');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed!\n');
  } else {
    console.log('❌ Some tests failed\n');
  }
}

// Wait a moment for server to be ready
setTimeout(() => {
  runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}, 2000);
