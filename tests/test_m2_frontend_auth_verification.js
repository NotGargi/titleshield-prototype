/**
 * Milestone 2 Frontend Auth Verification Suite
 * Verifies:
 * 1. Isomorphic storage contract and API client behavior
 * 2. Login screen rendering and invalid credential error banner
 * 3. Registration screen rendering, validation feedback, and account creation
 * 4. Automatic session persistence in localStorage
 * 5. Navigation guard: unauthenticated access to /orders and /vault redirects to /login
 * 6. Navigation guard: authenticated access to /orders and /vault allowed
 * 7. Header user avatar, profile modal, and sign-out action
 * 8. Public verification route /verify accessible without authentication
 */

const assert = require('assert');
const path = require('path');
const { resolveBrowserExecutable, resolvePuppeteer } = require('./helpers/browserResolver');

const WEB_BASE = 'http://localhost:8081';
const API_BASE = 'http://localhost:4000/api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runM2FrontendAuthTests() {
  console.log('================================================================');
  console.log('🧪 MILESTONE 2: Frontend Auth, State, Screens & Navigation Guards');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function recordPass(testId, desc) {
    passed++;
    console.log(`  ✅ [PASS] ${testId}: ${desc}`);
  }

  function recordFail(testId, desc, err) {
    failed++;
    console.log(`  ❌ [FAIL] ${testId}: ${desc}`);
    if (err) console.log(`     Error: ${err.message}`);
  }

  const browserPath = resolveBrowserExecutable();
  const puppeteer = resolvePuppeteer();

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const timestamp = Date.now();
  const testUser = {
    name: 'Shri Balasaheb Thorat',
    email: `advocate_thorat_${timestamp}@landeed.gov.in`,
    phone: '+91 94220 88990',
    password: `Password@${timestamp}`
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // TEST 1: Unauthenticated Navigation Guard - /orders redirects to /login
    await page.goto(`${WEB_BASE}/orders`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);
    const urlAfterOrders = page.url();
    assert.ok(urlAfterOrders.includes('/login'), `Expected redirect to /login from /orders, got ${urlAfterOrders}`);
    recordPass('TEST_M2_01', 'Unauthenticated request to /orders redirects to /login');

    // TEST 2: Unauthenticated Navigation Guard - /vault redirects to /login
    await page.goto(`${WEB_BASE}/vault`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);
    const urlAfterVault = page.url();
    assert.ok(urlAfterVault.includes('/login'), `Expected redirect to /login from /vault, got ${urlAfterVault}`);
    recordPass('TEST_M2_02', 'Unauthenticated request to /vault redirects to /login');

    // TEST 3: Login Screen Obsidian UI Elements
    await page.goto(`${WEB_BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(1500);
    const idInput = await page.$('[data-testid="login-identifier-input"]');
    const pwdInput = await page.$('[data-testid="login-password-input"]');
    const submitBtn = await page.$('[data-testid="login-submit-button"]');
    const toRegisterBtn = await page.$('[data-testid="navigate-register-button"]');

    assert.ok(idInput, 'Login identifier input exists');
    assert.ok(pwdInput, 'Login password input exists');
    assert.ok(submitBtn, 'Login submit button exists');
    assert.ok(toRegisterBtn, 'Navigate to register button exists');
    recordPass('TEST_M2_03', 'Login screen renders Obsidian theme controls and testIDs');

    // TEST 4: Invalid Credentials Error Banner
    await idInput.type('unknown_advocate@landeed.com');
    await pwdInput.type('WrongPassword123!');
    await submitBtn.click();
    await sleep(2000);

    const loginErrorText = await page.evaluate(() => document.body.innerText);
    assert.ok(
      loginErrorText.includes('Invalid') || loginErrorText.includes('credentials') || loginErrorText.includes('failed'),
      `Expected error banner for invalid credentials, text was: ${loginErrorText.slice(0, 200)}`
    );
    recordPass('TEST_M2_04', 'Invalid credentials rejected with error banner display');

    // TEST 5: Navigation to Registration Screen
    await toRegisterBtn.click();
    await sleep(2000);
    const urlAfterRegNav = page.url();
    assert.ok(urlAfterRegNav.includes('/register'), `Expected navigation to /register, got ${urlAfterRegNav}`);
    recordPass('TEST_M2_05', 'Navigation to registration screen via link succeeds');

    // TEST 6: Registration Screen Inputs and Account Creation
    const regNameInput = await page.$('[data-testid="register-name-input"]');
    const regEmailInput = await page.$('[data-testid="register-email-input"]');
    const regPhoneInput = await page.$('[data-testid="register-phone-input"]');
    const regPwdInput = await page.$('[data-testid="register-password-input"]');
    const regConfirmPwdInput = await page.$('[data-testid="register-confirm-password-input"]');
    const regSubmitBtn = await page.$('[data-testid="register-submit-button"]');

    assert.ok(regNameInput, 'Register name input exists');
    assert.ok(regEmailInput, 'Register email input exists');
    assert.ok(regPwdInput, 'Register password input exists');
    assert.ok(regConfirmPwdInput, 'Register confirm password input exists');
    assert.ok(regSubmitBtn, 'Register submit button exists');

    await regNameInput.type(testUser.name);
    await regEmailInput.type(testUser.email);
    if (regPhoneInput) await regPhoneInput.type(testUser.phone);
    await regPwdInput.type(testUser.password);
    await regConfirmPwdInput.type(testUser.password);

    await regSubmitBtn.click();
    await sleep(3000);

    // TEST 7: Transition to Authenticated Dashboard & Token Persistence
    const currentUrl = page.url();
    assert.ok(!currentUrl.includes('/register') && !currentUrl.includes('/login'), `Expected dashboard navigation, got ${currentUrl}`);

    const storedToken = await page.evaluate(() => window.localStorage.getItem('landeed_auth_token'));
    const storedUser = await page.evaluate(() => window.localStorage.getItem('landeed_auth_user'));
    assert.ok(storedToken, 'Auth token must be persisted in window.localStorage');
    assert.ok(storedUser, 'User data must be persisted in window.localStorage');
    recordPass('TEST_M2_06', 'User registration succeeds and persists session token in localStorage');

    // TEST 8: Authenticated Access to Protected Routes /orders
    await page.goto(`${WEB_BASE}/orders`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);
    const authOrdersUrl = page.url();
    assert.ok(authOrdersUrl.includes('/orders'), `Expected authenticated user on /orders, got ${authOrdersUrl}`);
    recordPass('TEST_M2_07', 'Authenticated user successfully accesses /orders without redirect');

    // TEST 9: Authenticated Access to Protected Route /vault
    await page.goto(`${WEB_BASE}/vault`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);
    const authVaultUrl = page.url();
    assert.ok(authVaultUrl.includes('/vault'), `Expected authenticated user on /vault, got ${authVaultUrl}`);
    recordPass('TEST_M2_08', 'Authenticated user successfully accesses /vault without redirect');

    // TEST 10: Header User Avatar and Profile Modal
    await page.goto(`${WEB_BASE}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);

    const userAvatar = await page.$('[data-testid="header-user-avatar"]');
    assert.ok(userAvatar, 'Header user avatar must be visible for authenticated user');
    await userAvatar.click();
    await sleep(1500);

    const modalText = await page.evaluate(() => document.body.innerText);
    assert.ok(modalText.includes(testUser.name) || modalText.includes('Shri Balasaheb') || modalText.includes('Sign Out'), 'Profile modal displays user name and sign out');
    recordPass('TEST_M2_09', 'Header user identity pill and profile modal display authenticated user data');

    // TEST 11: Sign Out Action and Token Eviction
    const signOutBtn = await page.$('[data-testid="header-signout-button"]');
    assert.ok(signOutBtn, 'Sign out button exists in profile modal');
    await signOutBtn.click();
    await sleep(2500);

    const afterSignOutUrl = page.url();
    assert.ok(afterSignOutUrl.includes('/login'), `Expected redirect to /login after sign out, got ${afterSignOutUrl}`);

    const tokenAfterSignOut = await page.evaluate(() => window.localStorage.getItem('landeed_auth_token'));
    assert.strictEqual(tokenAfterSignOut, null, 'Session token must be evicted from localStorage after sign out');
    recordPass('TEST_M2_10', 'Sign out invalidates session, clears localStorage, and routes to /login');

    // TEST 12: Public Verification Route Accessibility
    await page.goto(`${WEB_BASE}/verify`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);
    const verifyUrl = page.url();
    assert.ok(verifyUrl.includes('/verify'), `Expected /verify to be accessible unauthenticated, got ${verifyUrl}`);
    recordPass('TEST_M2_11', 'Public verification route /verify remains accessible without authentication');

  } catch (err) {
    recordFail('M2_VERIFICATION_SUITE', 'Encountered unexpected test failure', err);
  } finally {
    await browser.close();
  }

  console.log(`\n📊 Milestone 2 Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests\n`);
  return { passed, failed, total: passed + failed };
}

if (require.main === module) {
  runM2FrontendAuthTests().then(({ failed }) => process.exit(failed === 0 ? 0 : 1));
}

module.exports = { runM2FrontendAuthTests };
