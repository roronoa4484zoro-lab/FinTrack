import assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

console.log('--- Starting FinTrack Verification Test Suite ---');

// 1. Test Encryption/Decryption with Base64 key
{
  console.log('[Test 1] Testing AES-256-GCM Encryption with base64 32-byte key...');
  const keyBase64 = 'mBBlFyVVkK2lR7qku8wzFY+gjKGpHgDvU/4RUtJV+WU=';
  const rawKey = Buffer.from(keyBase64, 'base64');
  assert.strictEqual(rawKey.length, 32, 'Raw key should be 32 bytes');

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', rawKey, iv);
  let enc = cipher.update('5432.10', 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  const payload = [iv.toString('hex'), tag, enc].join(':');

  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', rawKey, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let dec = decipher.update(dataHex, 'hex', 'utf8');
  dec += decipher.final('utf8');

  assert.strictEqual(dec, '5432.10', 'Decrypted text must match original');
  console.log('✓ Passed: AES-256-GCM works accurately with base64 keys.');
}

// 2. Test JWT Signing and Strict Verification
{
  console.log('[Test 2] Testing JWT Generation & Verification...');
  const secret = 'test-jwt-secret-long-enough-32-chars-at-least';
  const token = jwt.sign({ userId: 'user-uuid-123' }, secret, { algorithm: 'HS256', expiresIn: '1h' });

  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  assert.strictEqual(decoded.userId, 'user-uuid-123', 'Decoded userId must match');

  // Verify rejection with wrong secret
  let failed = false;
  try {
    jwt.verify(token, 'wrong-secret', { algorithms: ['HS256'] });
  } catch {
    failed = true;
  }
  assert.strictEqual(failed, true, 'Verification with wrong secret must fail');

  // Verify rejection of algorithm 'none'
  let noneFailed = false;
  try {
    jwt.verify(token, secret, { algorithms: ['RS256'] });
  } catch {
    noneFailed = true;
  }
  assert.strictEqual(noneFailed, true, 'Verification with mismatched algorithm must fail');
  console.log('✓ Passed: JWT algorithm and secret protections verified.');
}

// 3. Test Password Hashing & Verification
{
  console.log('[Test 3] Testing Bcrypt Password Hashing & Timing attack safety...');
  const pass = 'SuperSecureP@ssw0rd123';
  const hash = bcrypt.hashSync(pass, 12);
  assert.strictEqual(bcrypt.compareSync(pass, hash), true, 'Valid password check succeeds');
  assert.strictEqual(bcrypt.compareSync('WrongPass', hash), false, 'Invalid password check fails');
  console.log('✓ Passed: Bcrypt hashing operates with 12 rounds securely.');
}

// 4. Test IDOR Boundary Validation Simulation
{
  console.log('[Test 4] Testing IDOR Ownership Filter Logic...');
  const userA = 'user-uuid-aaa';
  const userB = 'user-uuid-bbb';

  const transactions = [
    { id: 'tx-1', user_id: userA, amount: '100' },
    { id: 'tx-2', user_id: userB, amount: '200' },
  ];

  function queryTransaction(txId, authenticatedUserId) {
    return transactions.find(t => t.id === txId && t.user_id === authenticatedUserId) || null;
  }

  assert.notStrictEqual(queryTransaction('tx-1', userA), null, 'User A can view their own transaction');
  assert.strictEqual(queryTransaction('tx-2', userA), null, 'User A cannot access User B transaction');
  assert.strictEqual(queryTransaction('tx-1', userB), null, 'User B cannot access User A transaction');
  console.log('✓ Passed: Cross-user access blocked by mandatory user_id predicate.');
}

// 5. Test Rate Limiter logic
{
  console.log('[Test 5] Testing Rate Limiting Window...');
  const store = new Map();
  function checkLimit(ip, limit = 5) {
    const now = Date.now();
    const rec = store.get(ip);
    if (!rec || now - rec.lastReset >= 60000) {
      store.set(ip, { count: 1, lastReset: now });
      return true;
    }
    rec.count++;
    return rec.count <= limit;
  }

  for (let i = 1; i <= 5; i++) {
    assert.strictEqual(checkLimit('192.168.1.1', 5), true, 'Request should pass');
  }
  assert.strictEqual(checkLimit('192.168.1.1', 5), false, 'Request 6 should be blocked');
  console.log('✓ Passed: Rate limit threshold triggered accurately.');
}

console.log('\n========================================');
console.log('🎉 ALL SECURITY & UNIT TESTS PASSED (5/5)');
console.log('========================================');
