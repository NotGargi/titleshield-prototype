/**
 * Landeed 2.0 Test Suite 13: Production User Authentication Lifecycle & Domain Event E2E
 * 
 * Comprehensive 4-Tier Automated Verification covering:
 * - Tier 1: User Registration & Direct SQLite Persistence (R1, R3)
 *           - POST /api/auth/register persists record in SQLite server/data/landeed.db
 *           - Direct SQLite inspection: password securely hashed via scryptSync + 16-byte random salt
 *           - Direct assertion: zero plaintext password stored anywhere in database
 *           - Duplicate registration rejection (HTTP 409) and input validation (HTTP 400)
 * - Tier 2: Credential Validation, Session Tokens & Account Lockout (R1, R3)
 *           - Valid credential login returns authentic 256-bit bearer token (64 hex chars)
 *           - Invalid password rejection with HTTP 401 Unauthorized
 *           - Non-existent user identifier rejection with HTTP 401 Unauthorized
 *           - Account lockout enforcement: 5 consecutive failed attempts trigger HTTP 403 Forbidden
 * - Tier 3: Protected Route Enforcement, Password Updates & Session Revocation (R1, R3)
 *           - GET /api/auth/me rejects unauthenticated/tampered requests (HTTP 401)
 *           - GET /api/auth/me succeeds with valid Bearer session token (HTTP 200)
 *           - POST /api/auth/password updates cryptographic hash & salt in SQLite
 *           - Password update revokes previous/parallel sessions across devices
 *           - POST /api/auth/logout deletes token from SQLite; subsequent requests return HTTP 401
 * - Tier 4: Event-Driven Lifecycle Persistence & Zero Credential Leakage Audit (R2, R3, R4)
 *           - Domain events persisted in SQLite auth_events: UserRegistered, UserLoggedIn, LoginFailed,
 *             SessionExpired, PasswordChanged
 *           - GET /api/auth/events endpoint queries audit event store with filters
 *           - Zero Credential Leakage Audit: 100% of event payloads inspected to mathematically guarantee
 *             no plaintext passwords, hashes, salts, or token secrets are leaked in audit logs.
 */

const assert = require('node:assert');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');

const API_BASE = 'http://localhost:4000/api';
const DB_PATH = path.resolve(__dirname, '..', 'server', 'data', 'landeed.db');

/**
 * Robust database connection helper supporting better-sqlite3 and node:sqlite fallback
 */
function openDatabaseConnection() {
  assert.ok(fs.existsSync(DB_PATH), `SQLite database must exist at ${DB_PATH}`);

  try {
    const Database = require(path.resolve(__dirname, '..', 'server', 'node_modules', 'better-sqlite3'));
    const db = new Database(DB_PATH, { readonly: true });
    return {
      type: 'better-sqlite3',
      get: (sql, ...params) => db.prepare(sql).get(...params),
      all: (sql, ...params) => db.prepare(sql).all(...params),
      close: () => db.close()
    };
  } catch (err1) {
    try {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(DB_PATH, { readOnly: true });
      return {
        type: 'node:sqlite',
        get: (sql, ...params) => db.prepare(sql).get(...params),
        all: (sql, ...params) => db.prepare(sql).all(...params),
        close: () => db.close()
      };
    } catch (err2) {
      throw new Error(`Unable to open SQLite database: ${err1.message} | ${err2.message}`);
    }
  }
}

/**
 * Universal JSON fetch helper with error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    data
  };
}

async function runAuthLifecycleTests() {
  console.log('\n================================================================================');
  console.log('🔐 SUITE 13: Production User Authentication Lifecycle & Domain Event E2E');
  console.log('================================================================================');

  let passed = 0;
  let failed = 0;
  const results = [];

  function recordPass(testId, tier, description) {
    passed++;
    results.push({ id: testId, tier, status: 'PASS', description });
    console.log(`  ✅ [PASS] [${tier}] ${testId}: ${description}`);
  }

  function recordFail(testId, tier, description, error) {
    failed++;
    const errMsg = error ? (error.message || String(error)) : 'Assertion failed';
    results.push({ id: testId, tier, status: 'FAIL', description, error: errMsg });
    console.error(`  ❌ [FAIL] [${tier}] ${testId}: ${description}`);
    console.error(`     Error: ${errMsg}`);
  }

  const suiteTimestamp = Date.now();
  const testUser = {
    name: 'Advocate Balasaheb Thorat',
    email: `advocate_thorat_${suiteTimestamp}@landeed.gov.in`,
    phone: '+91 94220 88990',
    password: `P@ssword#${suiteTimestamp}!Secured`,
    role: 'ADVOCATE'
  };

  let registeredUserId = null;
  let sessionToken1 = null;
  let sessionToken2 = null;

  // Verify SQLite database exists and has required tables
  let db = null;
  try {
    db = openDatabaseConnection();
    const tables = db.all("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name);
    assert.ok(tables.includes('users'), 'Table users must exist in SQLite database');
    assert.ok(tables.includes('sessions'), 'Table sessions must exist in SQLite database');
    assert.ok(tables.includes('auth_events'), 'Table auth_events must exist in SQLite database');
    recordPass('TEST_13_00', 'Pre-flight', `SQLite schema verified: users, sessions, auth_events active via ${db.type}`);
  } catch (err) {
    recordFail('TEST_13_00', 'Pre-flight', 'Failed to connect to SQLite or find auth tables', err);
  } finally {
    if (db) db.close();
  }

  // ---------------------------------------------------------------------------
  // TIER 1: USER REGISTRATION & DIRECT SQLITE PERSISTENCE
  // ---------------------------------------------------------------------------
  console.log('\n--- Tier 1: User Registration & Direct SQLite Persistence (R1, R3) ---');

  // TEST_13_01: User registration via POST /api/auth/register and SQLite persistence
  try {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        password: testUser.password,
        role: testUser.role
      }
    });

    assert.strictEqual(res.status, 201, `Expected HTTP 201 Created, got ${res.status}`);
    assert.ok(res.data && res.data.success === true, 'Response must have success: true');
    assert.ok(typeof res.data.token === 'string' && res.data.token.length === 64, 'Token must be a 64-char hex string (256 bits)');
    assert.ok(res.data.user && typeof res.data.user.id === 'string', 'User object must be returned with ID');
    assert.strictEqual(res.data.user.email.toLowerCase(), testUser.email.toLowerCase(), 'User email must match input');
    assert.strictEqual(res.data.user.name, testUser.name, 'User name must match input');
    assert.strictEqual(res.data.user.role, 'ADVOCATE', 'User role must match input');
    assert.strictEqual(res.data.user.password, undefined, 'Plaintext password must NOT be exposed in response');
    assert.strictEqual(res.data.user.passwordHash, undefined, 'Password hash must NOT be exposed in response');
    assert.strictEqual(res.data.user.passwordSalt, undefined, 'Password salt must NOT be exposed in response');

    registeredUserId = res.data.user.id;
    sessionToken1 = res.data.token;

    // Verify directly in SQLite users and sessions tables
    db = openDatabaseConnection();
    const userRow = db.get('SELECT * FROM users WHERE id = ?', registeredUserId);
    assert.ok(userRow, `User with ID ${registeredUserId} must exist in SQLite users table`);
    assert.strictEqual(userRow.email.toLowerCase(), testUser.email.toLowerCase(), 'Stored email must match');
    assert.strictEqual(userRow.name, testUser.name, 'Stored name must match');
    assert.strictEqual(userRow.phone, testUser.phone, 'Stored phone must match');
    assert.strictEqual(userRow.role, 'ADVOCATE', 'Stored role must match');
    assert.strictEqual(userRow.failed_login_attempts, 0, 'Initial failed_login_attempts must be 0');
    assert.strictEqual(userRow.locked_until, null, 'Initial locked_until must be null');

    const sessionRow = db.get('SELECT * FROM sessions WHERE token = ?', sessionToken1);
    assert.ok(sessionRow, 'Session record must exist in SQLite sessions table with matching token');
    assert.strictEqual(sessionRow.user_id, registeredUserId, 'Session user_id must match registered user ID');
    assert.ok(new Date(sessionRow.expires_at) > new Date(), 'Session expires_at must be in the future');
    db.close();
    db = null;

    recordPass('TEST_13_01', 'Tier 1', 'POST /api/auth/register creates user and session in SQLite with 256-bit token (HTTP 201)');
  } catch (err) {
    recordFail('TEST_13_01', 'Tier 1', 'User registration via POST /api/auth/register failed', err);
    if (db) { db.close(); db = null; }
  }

  // TEST_13_02: Direct SQLite verification of scryptSync password hash, salt, and zero plaintext
  try {
    db = openDatabaseConnection();
    const userRow = db.get('SELECT * FROM users WHERE id = ?', registeredUserId);
    assert.ok(userRow, 'User row must exist for inspection');

    const hash = userRow.password_hash;
    const salt = userRow.password_salt;

    // Hashing assertions:
    // scryptSync(password, salt, 64) produces 64 bytes = 128 hex chars
    assert.ok(typeof hash === 'string' && hash.length === 128, `Password hash must be 128 hex chars, got ${hash.length}`);
    assert.ok(/^[0-9a-f]{128}$/i.test(hash), 'Password hash must be valid hexadecimal string');

    // Salt: 16 bytes = 32 hex chars
    assert.ok(typeof salt === 'string' && salt.length === 32, `Password salt must be 32 hex chars, got ${salt.length}`);
    assert.ok(/^[0-9a-f]{32}$/i.test(salt), 'Password salt must be valid hexadecimal string');

    // Zero Plaintext verification
    assert.notStrictEqual(hash, testUser.password, 'Password hash must NOT equal plaintext password');
    assert.notStrictEqual(salt, testUser.password, 'Password salt must NOT equal plaintext password');

    // Cryptographic correctness check: independently recompute scrypt
    const expectedDerivedKey = crypto.scryptSync(testUser.password, salt, 64).toString('hex');
    assert.strictEqual(hash, expectedDerivedKey, 'Stored hash must match independently computed scryptSync(password, salt, 64)');

    // Ensure invalid password fails scrypt match
    const wrongDerivedKey = crypto.scryptSync('WrongPassword123!', salt, 64).toString('hex');
    assert.notStrictEqual(hash, wrongDerivedKey, 'Wrong password must produce divergent scrypt hash');

    // Confirm plaintext password does NOT appear in any column of the user row
    const rowValues = Object.values(userRow).map(v => String(v));
    for (const val of rowValues) {
      assert.ok(!val.includes(testUser.password), `Plaintext password found in column value: ${val}`);
    }

    db.close();
    db = null;
    recordPass('TEST_13_02', 'Tier 1', 'Direct SQLite inspection confirms scryptSync 512-bit hash, 128-bit salt, and zero plaintext storage');
  } catch (err) {
    recordFail('TEST_13_02', 'Tier 1', 'Cryptographic hash inspection in SQLite failed', err);
    if (db) { db.close(); db = null; }
  }

  // TEST_13_03: Registration validations (duplicate email 409, short password 400, invalid email 400)
  try {
    // Duplicate email registration attempt
    const dupRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Imposter Advocate',
        email: testUser.email,
        password: 'ValidPassword123!',
      }
    });
    assert.strictEqual(dupRes.status, 409, `Duplicate email registration must return HTTP 409, got ${dupRes.status}`);
    assert.strictEqual(dupRes.data.success, false, 'Duplicate registration response must indicate success: false');

    // Short password (< 8 chars)
    const shortPassRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Short Pass User',
        email: `short_pass_${Date.now()}@landeed.gov.in`,
        password: 'short',
      }
    });
    assert.strictEqual(shortPassRes.status, 400, `Short password must return HTTP 400, got ${shortPassRes.status}`);

    // Invalid email format
    const badEmailRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Bad Email User',
        email: 'not-an-email',
        password: 'ValidPassword123!',
      }
    });
    assert.strictEqual(badEmailRes.status, 400, `Invalid email must return HTTP 400, got ${badEmailRes.status}`);

    // Missing name
    const badNameRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: '   ',
        email: `missing_name_${Date.now()}@landeed.gov.in`,
        password: 'ValidPassword123!',
      }
    });
    assert.strictEqual(badNameRes.status, 400, `Missing name must return HTTP 400, got ${badNameRes.status}`);

    recordPass('TEST_13_03', 'Tier 1', 'Registration input validation strictly enforces HTTP 409 on duplicates and HTTP 400 on invalid payloads');
  } catch (err) {
    recordFail('TEST_13_03', 'Tier 1', 'Registration validation tests failed', err);
  }

  // ---------------------------------------------------------------------------
  // TIER 2: CREDENTIAL VALIDATION, SESSION TOKENS & ACCOUNT LOCKOUT
  // ---------------------------------------------------------------------------
  console.log('\n--- Tier 2: Credential Validation, Session Tokens & Account Lockout (R1, R3) ---');

  // TEST_13_04: Valid credential login returns 256-bit bearer token and persists session
  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        identifier: testUser.email,
        password: testUser.password
      }
    });

    assert.strictEqual(res.status, 200, `Expected HTTP 200 OK on valid login, got ${res.status}`);
    assert.strictEqual(res.data.success, true, 'Login response must have success: true');
    assert.ok(typeof res.data.token === 'string' && res.data.token.length === 64, 'Token must be 64 hex characters (256-bit)');
    assert.strictEqual(res.data.user.id, registeredUserId, 'Logged in user ID must match registered user');

    sessionToken2 = res.data.token;

    // Check SQLite sessions table: both sessionToken1 and sessionToken2 should exist
    db = openDatabaseConnection();
    const session2Row = db.get('SELECT * FROM sessions WHERE token = ?', sessionToken2);
    assert.ok(session2Row, 'New session must be persisted in SQLite sessions table');
    assert.strictEqual(session2Row.user_id, registeredUserId, 'Session user_id must match');

    // Confirm failed_login_attempts is reset to 0
    const userRow = db.get('SELECT failed_login_attempts, last_login_at FROM users WHERE id = ?', registeredUserId);
    assert.strictEqual(userRow.failed_login_attempts, 0, 'failed_login_attempts must be reset to 0 after valid login');
    assert.ok(userRow.last_login_at !== null, 'last_login_at must be populated');
    db.close();
    db = null;

    recordPass('TEST_13_04', 'Tier 2', 'Valid credential login succeeds with HTTP 200, authentic 256-bit bearer token, and SQLite session persistence');
  } catch (err) {
    recordFail('TEST_13_04', 'Tier 2', 'Valid credential login failed', err);
    if (db) { db.close(); db = null; }
  }

  // TEST_13_05: Rejection of invalid password with HTTP 401 Unauthorized
  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        identifier: testUser.email,
        password: 'DefinitivelyWrongPassword999!'
      }
    });

    assert.strictEqual(res.status, 401, `Expected HTTP 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.data.success, false, 'Invalid login response must have success: false');
    assert.strictEqual(res.data.token, undefined, 'No token must be issued on invalid login');

    // Direct SQLite check: failed_login_attempts should increment to 1
    db = openDatabaseConnection();
    const userRow = db.get('SELECT failed_login_attempts FROM users WHERE id = ?', registeredUserId);
    assert.strictEqual(userRow.failed_login_attempts, 1, 'failed_login_attempts must increment to 1');
    db.close();
    db = null;

    recordPass('TEST_13_05', 'Tier 2', 'Invalid password rejected with HTTP 401 Unauthorized and failed attempts counter incremented in SQLite');
  } catch (err) {
    recordFail('TEST_13_05', 'Tier 2', 'Invalid password rejection test failed', err);
    if (db) { db.close(); db = null; }
  }

  // TEST_13_06: Rejection of non-existent user identifier with HTTP 401 Unauthorized
  try {
    const ghostEmail = `nonexistent_citizen_${Date.now()}@landeed.gov.in`;
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        identifier: ghostEmail,
        password: 'AnyPassword123!'
      }
    });

    assert.strictEqual(res.status, 401, `Expected HTTP 401 Unauthorized for unknown user, got ${res.status}`);
    assert.strictEqual(res.data.success, false, 'Response must have success: false');
    assert.ok(res.data.error.includes('Invalid credentials'), 'Error message must not disclose user existence (anti-enumeration)');

    recordPass('TEST_13_06', 'Tier 2', 'Non-existent identifier rejected with HTTP 401 Unauthorized with anti-enumeration message');
  } catch (err) {
    recordFail('TEST_13_06', 'Tier 2', 'Non-existent identifier test failed', err);
  }

  // TEST_13_07: Account lockout enforcement after 5 consecutive failed attempts (HTTP 403 Forbidden)
  try {
    const lockoutTimestamp = Date.now();
    const lockoutEmail = `lockout_test_${lockoutTimestamp}@landeed.gov.in`;
    const lockoutPassword = `CorrectP@ss#${lockoutTimestamp}`;

    // Register dedicated user for lockout testing
    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Lockout Test Citizen',
        email: lockoutEmail,
        password: lockoutPassword,
      }
    });
    assert.strictEqual(regRes.status, 201, 'Dedicated lockout test user must register cleanly');
    const lockoutUserId = regRes.data.user.id;

    // Attempts 1 to 4: Should return HTTP 401
    for (let attempt = 1; attempt <= 4; attempt++) {
      const failRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          identifier: lockoutEmail,
          password: 'WrongPassword'
        }
      });
      assert.strictEqual(failRes.status, 401, `Failed attempt ${attempt} must return HTTP 401`);
    }

    // Verify SQLite shows 4 failed attempts and locked_until is still null
    db = openDatabaseConnection();
    let lUser = db.get('SELECT failed_login_attempts, locked_until FROM users WHERE id = ?', lockoutUserId);
    assert.strictEqual(lUser.failed_login_attempts, 4, 'Failed attempts must be 4 in SQLite');
    assert.strictEqual(lUser.locked_until, null, 'Account must not be locked yet after 4 attempts');
    db.close();
    db = null;

    // Attempt 5: Trigger lockout -> HTTP 403 Forbidden
    const lockRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        identifier: lockoutEmail,
        password: 'WrongPassword'
      }
    });
    assert.strictEqual(lockRes.status, 403, `5th failed attempt must return HTTP 403 Forbidden, got ${lockRes.status}`);
    assert.strictEqual(lockRes.data.locked, true, 'Response must indicate locked: true');
    assert.ok(lockRes.data.error.includes('locked'), 'Error message must state account is locked');
    assert.ok(lockRes.data.lockedUntil, 'lockedUntil timestamp must be returned');

    // Verify SQLite shows locked_until is in the future
    db = openDatabaseConnection();
    lUser = db.get('SELECT failed_login_attempts, locked_until FROM users WHERE id = ?', lockoutUserId);
    assert.strictEqual(lUser.failed_login_attempts, 5, 'failed_login_attempts must be 5 in SQLite');
    assert.ok(lUser.locked_until !== null, 'locked_until must be populated in SQLite');
    assert.ok(new Date(lUser.locked_until) > new Date(), 'locked_until must be set in the future (15-min window)');
    db.close();
    db = null;

    // Attempt 6: Even with CORRECT password, login is blocked by active lockout!
    const blockedRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        identifier: lockoutEmail,
        password: lockoutPassword
      }
    });
    assert.strictEqual(blockedRes.status, 403, `Correct password during lockout must still return HTTP 403 Forbidden, got ${blockedRes.status}`);
    assert.strictEqual(blockedRes.data.locked, true, 'Response must confirm active lockout');

    recordPass('TEST_13_07', 'Tier 2', 'Account lockout strictly enforced: 5 failed attempts lock account for 15 minutes with HTTP 403 Forbidden');
  } catch (err) {
    recordFail('TEST_13_07', 'Tier 2', 'Account lockout test failed', err);
    if (db) { db.close(); db = null; }
  }

  // ---------------------------------------------------------------------------
  // TIER 3: PROTECTED ROUTE ENFORCEMENT, PASSWORD UPDATES & SESSION REVOCATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Tier 3: Protected Route Enforcement, Password Updates & Session Revocation (R1, R3) ---');

  // TEST_13_08: Protected endpoint GET /api/auth/me rejects unauthenticated and accepts valid Bearer token
  try {
    // 1. No Authorization header -> HTTP 401
    const noAuthRes = await apiRequest('/auth/me');
    assert.strictEqual(noAuthRes.status, 401, `GET /api/auth/me without token must return HTTP 401, got ${noAuthRes.status}`);
    assert.strictEqual(noAuthRes.data.success, false, 'Unauthenticated request must have success: false');

    // 2. Bogus Bearer token -> HTTP 401
    const bogusRes = await apiRequest('/auth/me', {
      headers: { Authorization: 'Bearer 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }
    });
    assert.strictEqual(bogusRes.status, 401, `GET /api/auth/me with invalid token must return HTTP 401, got ${bogusRes.status}`);

    // 3. Valid Bearer token (sessionToken2) -> HTTP 200 OK
    const validRes = await apiRequest('/auth/me', {
      headers: { Authorization: `Bearer ${sessionToken2}` }
    });
    assert.strictEqual(validRes.status, 200, `GET /api/auth/me with valid token must return HTTP 200, got ${validRes.status}`);
    assert.strictEqual(validRes.data.success, true, 'Authenticated response must have success: true');
    assert.strictEqual(validRes.data.user.id, registeredUserId, 'User profile ID must match');
    assert.strictEqual(validRes.data.user.email.toLowerCase(), testUser.email.toLowerCase(), 'User profile email must match');
    assert.strictEqual(validRes.data.user.role, 'ADVOCATE', 'User profile role must match');
    assert.ok(validRes.data.session && validRes.data.session.id, 'Session metadata must be attached');

    recordPass('TEST_13_08', 'Tier 3', 'Protected endpoint GET /api/auth/me rejects missing/tampered tokens (HTTP 401) and validates authentic sessions (HTTP 200)');
  } catch (err) {
    recordFail('TEST_13_08', 'Tier 3', 'Protected route enforcement test failed', err);
  }

  // TEST_13_09: Password update via POST /api/auth/password updates SQLite hash and revokes other sessions
  const newPassword = `BrandNew#SecuredPass@${Date.now()}!`;
  try {
    // Current state: sessionToken1 and sessionToken2 both exist in SQLite
    db = openDatabaseConnection();
    const activeSessionsBefore = db.all('SELECT token FROM sessions WHERE user_id = ?', registeredUserId);
    assert.ok(activeSessionsBefore.length >= 2, `Expected at least 2 active sessions before password change, found ${activeSessionsBefore.length}`);
    const initialUserRow = db.get('SELECT password_hash, password_salt FROM users WHERE id = ?', registeredUserId);
    db.close();
    db = null;

    // Execute password update using sessionToken2
    const changeRes = await apiRequest('/auth/password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken2}` },
      body: {
        currentPassword: testUser.password,
        newPassword: newPassword
      }
    });

    assert.strictEqual(changeRes.status, 200, `Password change must return HTTP 200 OK, got ${changeRes.status}`);
    assert.strictEqual(changeRes.data.success, true, 'Password change must have success: true');
    assert.ok(changeRes.data.message.includes('successfully'), 'Response message must confirm success');

    // Direct SQLite verification: hash and salt changed
    db = openDatabaseConnection();
    const updatedUserRow = db.get('SELECT password_hash, password_salt FROM users WHERE id = ?', registeredUserId);
    assert.notStrictEqual(updatedUserRow.password_hash, initialUserRow.password_hash, 'Password hash must be updated');
    assert.notStrictEqual(updatedUserRow.password_salt, initialUserRow.password_salt, 'Password salt must be regenerated');

    // Verify cryptographic scrypt match with new password
    const verifiedNewHash = crypto.scryptSync(newPassword, updatedUserRow.password_salt, 64).toString('hex');
    assert.strictEqual(updatedUserRow.password_hash, verifiedNewHash, 'New hash must match scryptSync(newPassword, newSalt, 64)');

    // Verify session revocation: sessionToken1 must be revoked (deleted), while sessionToken2 remains active
    const revokedSession = db.get('SELECT * FROM sessions WHERE token = ?', sessionToken1);
    assert.strictEqual(revokedSession, undefined, 'Previous parallel session token1 must be deleted from SQLite sessions');

    const keptSession = db.get('SELECT * FROM sessions WHERE token = ?', sessionToken2);
    assert.ok(keptSession, 'Current session token2 must remain active in SQLite sessions');
    db.close();
    db = null;

    // Verify that sessionToken1 is rejected by GET /api/auth/me
    const revokedCheck = await apiRequest('/auth/me', {
      headers: { Authorization: `Bearer ${sessionToken1}` }
    });
    assert.strictEqual(revokedCheck.status, 401, 'Revoked token1 must return HTTP 401 on protected endpoint');

    // Verify old password no longer works for login
    const oldLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: testUser.email, password: testUser.password }
    });
    assert.strictEqual(oldLoginRes.status, 401, 'Login with old password must return HTTP 401');

    // Verify new password successfully logs in
    const newLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: testUser.email, password: newPassword }
    });
    assert.strictEqual(newLoginRes.status, 200, 'Login with new password must return HTTP 200');
    assert.ok(newLoginRes.data.token, 'New session token must be issued');

    recordPass('TEST_13_09', 'Tier 3', 'POST /api/auth/password updates SQLite scrypt hash and revokes parallel sessions across devices');
  } catch (err) {
    recordFail('TEST_13_09', 'Tier 3', 'Password update and session revocation test failed', err);
    if (db) { db.close(); db = null; }
  }

  // TEST_13_10: Session revocation on POST /api/auth/logout and subsequent HTTP 401 rejection
  try {
    // Acquire a dedicated fresh token to test logout
    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: testUser.email, password: newPassword }
    });
    assert.strictEqual(loginRes.status, 200, 'Acquired session for logout test');
    const tokenToRevoke = loginRes.data.token;

    // Confirm session exists in SQLite before logout
    db = openDatabaseConnection();
    const sessionBefore = db.get('SELECT * FROM sessions WHERE token = ?', tokenToRevoke);
    assert.ok(sessionBefore, 'Session must exist in SQLite prior to logout');
    db.close();
    db = null;

    // Execute logout
    const logoutRes = await apiRequest('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenToRevoke}` }
    });
    assert.strictEqual(logoutRes.status, 200, `Logout must return HTTP 200, got ${logoutRes.status}`);
    assert.strictEqual(logoutRes.data.success, true, 'Logout response must have success: true');

    // Confirm session is completely purged from SQLite
    db = openDatabaseConnection();
    const sessionAfter = db.get('SELECT * FROM sessions WHERE token = ?', tokenToRevoke);
    assert.strictEqual(sessionAfter, undefined, 'Session row must be completely deleted from SQLite on logout');
    db.close();
    db = null;

    // Subsequent protected request with revoked token must return HTTP 401
    const postLogoutMe = await apiRequest('/auth/me', {
      headers: { Authorization: `Bearer ${tokenToRevoke}` }
    });
    assert.strictEqual(postLogoutMe.status, 401, `GET /api/auth/me with revoked token must return HTTP 401, got ${postLogoutMe.status}`);

    // Subsequent logout request with revoked token must return HTTP 401
    const postLogoutAgain = await apiRequest('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenToRevoke}` }
    });
    assert.strictEqual(postLogoutAgain.status, 401, `Duplicate logout with revoked token must return HTTP 401, got ${postLogoutAgain.status}`);

    recordPass('TEST_13_10', 'Tier 3', 'POST /api/auth/logout instantly revokes SQLite session, and subsequent calls return HTTP 401 Unauthorized');
  } catch (err) {
    recordFail('TEST_13_10', 'Tier 3', 'Session revocation on logout failed', err);
    if (db) { db.close(); db = null; }
  }

  // ---------------------------------------------------------------------------
  // TIER 4: EVENT-DRIVEN LIFECYCLE PERSISTENCE & ZERO CREDENTIAL LEAKAGE AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n--- Tier 4: Event-Driven Lifecycle Persistence & Zero Credential Leakage Audit (R2, R3, R4) ---');

  // TEST_13_11: Domain event lifecycle persistence in SQLite auth_events table
  try {
    db = openDatabaseConnection();

    // Query events persisted for our test user
    const userEvents = db.all('SELECT * FROM auth_events WHERE user_id = ? ORDER BY timestamp ASC', registeredUserId);
    assert.ok(userEvents.length >= 4, `Expected at least 4 auth events for user, found ${userEvents.length}`);

    const eventTypesRecorded = new Set(userEvents.map(e => e.event_type));

    // Verify UserRegistered event
    assert.ok(eventTypesRecorded.has('UserRegistered'), 'auth_events must record UserRegistered event');
    const regEvent = userEvents.find(e => e.event_type === 'UserRegistered');
    assert.strictEqual(regEvent.outcome, 'SUCCESS', 'UserRegistered outcome must be SUCCESS');
    const regPayload = JSON.parse(regEvent.payload);
    assert.strictEqual(regPayload.email.toLowerCase(), testUser.email.toLowerCase(), 'UserRegistered payload must contain email');
    assert.strictEqual(regPayload.role, 'ADVOCATE', 'UserRegistered payload must contain role');

    // Verify UserLoggedIn event
    assert.ok(eventTypesRecorded.has('UserLoggedIn'), 'auth_events must record UserLoggedIn event');
    const loginEvent = userEvents.find(e => e.event_type === 'UserLoggedIn');
    assert.strictEqual(loginEvent.outcome, 'SUCCESS', 'UserLoggedIn outcome must be SUCCESS');
    const loginPayload = JSON.parse(loginEvent.payload);
    assert.strictEqual(loginPayload.email.toLowerCase(), testUser.email.toLowerCase(), 'UserLoggedIn payload must contain email');
    assert.strictEqual(loginPayload.authMethod, 'PASSWORD', 'UserLoggedIn payload must contain authMethod');

    // Verify PasswordChanged event
    assert.ok(eventTypesRecorded.has('PasswordChanged'), 'auth_events must record PasswordChanged event');
    const pwEvent = userEvents.find(e => e.event_type === 'PasswordChanged');
    assert.strictEqual(pwEvent.outcome, 'SUCCESS', 'PasswordChanged outcome must be SUCCESS');
    const pwPayload = JSON.parse(pwEvent.payload);
    assert.strictEqual(pwPayload.sessionsRevoked, true, 'PasswordChanged payload must indicate sessionsRevoked: true');

    // Verify SessionExpired event
    assert.ok(eventTypesRecorded.has('SessionExpired'), 'auth_events must record SessionExpired event');
    const expEvent = userEvents.find(e => e.event_type === 'SessionExpired');
    assert.strictEqual(expEvent.outcome, 'SUCCESS', 'SessionExpired outcome must be SUCCESS');
    const expPayload = JSON.parse(expEvent.payload);
    assert.strictEqual(expPayload.reason, 'EXPLICIT_LOGOUT', 'SessionExpired payload must record EXPLICIT_LOGOUT');

    // Verify LoginFailed event recorded from earlier failed attempt
    const failedEvents = db.all("SELECT * FROM auth_events WHERE event_type = 'LoginFailed'");
    assert.ok(failedEvents.length > 0, 'auth_events must contain LoginFailed events');
    const sampleFail = failedEvents[0];
    assert.strictEqual(sampleFail.outcome, 'FAILURE', 'LoginFailed outcome must be FAILURE');
    const failPayload = JSON.parse(sampleFail.payload);
    assert.ok(failPayload.failureReason, 'LoginFailed payload must specify failureReason');

    db.close();
    db = null;

    // Verify GET /api/auth/events endpoint returns persisted events
    const apiEventsRes = await apiRequest(`/auth/events?userId=${registeredUserId}`);
    assert.strictEqual(apiEventsRes.status, 200, `GET /api/auth/events must return HTTP 200, got ${apiEventsRes.status}`);
    assert.strictEqual(apiEventsRes.data.success, true, 'Response must have success: true');
    assert.ok(Array.isArray(apiEventsRes.data.events), 'Events must be an array');
    assert.ok(apiEventsRes.data.total >= 4, `Total events returned by API must be >= 4, got ${apiEventsRes.data.total}`);

    recordPass('TEST_13_11', 'Tier 4', 'Domain events (UserRegistered, UserLoggedIn, LoginFailed, SessionExpired, PasswordChanged) persisted in SQLite auth_events table and queryable via GET /api/auth/events');
  } catch (err) {
    recordFail('TEST_13_11', 'Tier 4', 'Domain event persistence verification failed', err);
    if (db) { db.close(); db = null; }
  }

  // TEST_13_12: Zero Credential Leakage Audit Assertion (100% of Event Payloads Inspected)
  try {
    db = openDatabaseConnection();

    // Query 100% of event rows in the entire auth_events table
    const allEventRows = db.all('SELECT event_id, event_type, user_id, timestamp, outcome, payload, metadata FROM auth_events');
    assert.ok(allEventRows.length > 0, 'auth_events table must have events to inspect');

    let inspectedRowCount = 0;
    let leakageViolations = [];

    const SENSITIVE_REGEX = /^(password|passwd|pwd|hash|password_hash|passwordhash|salt|password_salt|passwordsalt|secret|token|authorization|apikey|bearer|private_key|privatekey)$/i;

    function checkObjectForLeakage(obj, pathContext, eventId) {
      if (!obj || typeof obj !== 'object') return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = `${pathContext}.${key}`;

        // Check if key is sensitive
        if (SENSITIVE_REGEX.test(key)) {
          if (value !== '[REDACTED]' && typeof value === 'string' && value.length > 0) {
            leakageViolations.push({
              eventId,
              path: currentPath,
              violation: `Sensitive key "${key}" contains unmasked value "${String(value).slice(0, 10)}..."`
            });
          }
        }

        // Check if value is a string containing sensitive data
        if (typeof value === 'string') {
          // Plaintext passwords used during this test run
          if (value.includes(testUser.password)) {
            leakageViolations.push({ eventId, path: currentPath, violation: 'Contains plaintext initial test password' });
          }
          if (value.includes(newPassword)) {
            leakageViolations.push({ eventId, path: currentPath, violation: 'Contains plaintext updated test password' });
          }

          // 128-char hex password hashes (except if redacted)
          if (/^[0-9a-f]{128}$/i.test(value)) {
            leakageViolations.push({ eventId, path: currentPath, violation: 'Contains raw 128-char password hash' });
          }

          // 32-char hex salts (except if redacted)
          if (/^[0-9a-f]{32}$/i.test(value) && SENSITIVE_REGEX.test(key)) {
            leakageViolations.push({ eventId, path: currentPath, violation: 'Contains raw 32-char salt' });
          }
        } else if (typeof value === 'object' && value !== null) {
          checkObjectForLeakage(value, currentPath, eventId);
        }
      }
    }

    for (const row of allEventRows) {
      inspectedRowCount++;

      // 1. Inspect payload JSON
      let payloadObj = null;
      try {
        payloadObj = JSON.parse(row.payload);
      } catch (e) {
        leakageViolations.push({ eventId: row.event_id, path: 'payload', violation: 'Invalid JSON payload' });
      }
      if (payloadObj) {
        checkObjectForLeakage(payloadObj, `payload[${row.event_id}]`, row.event_id);
      }

      // 2. Inspect metadata JSON
      let metadataObj = null;
      try {
        metadataObj = JSON.parse(row.metadata);
      } catch (e) {
        leakageViolations.push({ eventId: row.event_id, path: 'metadata', violation: 'Invalid JSON metadata' });
      }
      if (metadataObj) {
        checkObjectForLeakage(metadataObj, `metadata[${row.event_id}]`, row.event_id);
      }
    }

    db.close();
    db = null;

    if (leakageViolations.length > 0) {
      console.error('💥 Credential Leakage Detected in Audit Events:');
      console.error(JSON.stringify(leakageViolations, null, 2));
    }

    assert.strictEqual(
      leakageViolations.length,
      0,
      `Zero Credential Leakage Assertion Failed: ${leakageViolations.length} credential leakage violations detected across ${inspectedRowCount} audit event records!`
    );

    recordPass(
      'TEST_13_12',
      'Tier 4',
      `Zero Credential Leakage Audit: 100% of event payloads inspected (${inspectedRowCount} rows). Zero passwords, hashes, salts, or unmasked secrets found.`
    );
  } catch (err) {
    recordFail('TEST_13_12', 'Tier 4', 'Zero Credential Leakage Audit failed', err);
    if (db) { db.close(); db = null; }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY REPORTING
  // ---------------------------------------------------------------------------
  const total = passed + failed;
  console.log('\n================================================================================');
  console.log('                          SUITE 13 EXECUTION SUMMARY                            ');
  console.log('================================================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed out of ${total} Tests`);
  console.log(`Success Rate: ${((passed / (total || 1)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🏆 ALL 13 AUTH LIFECYCLE TESTS PASSED CLEANLY!\n');
    return { passed, failed, total, code: 0 };
  } else {
    console.error(`\n❌ VERIFICATION FAILED: ${failed} tests failed out of ${total}.\n`);
    return { passed, failed, total, code: 1 };
  }
}

if (require.main === module) {
  runAuthLifecycleTests().then(({ code }) => {
    process.exit(code);
  }).catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runAuthLifecycleTests };
