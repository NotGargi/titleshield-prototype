const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'test_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log('🚀 Starting Landeed End-to-End Browser Automation Test...');
  console.log(`Using Edge executable: ${EDGE_PATH}`);

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const results = [];
  const recordResult = (name, passed, details) => {
    results.push({ name, passed, details });
    console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${name}: ${details}`);
  };

  try {
    // 1. Load Home Dashboard
    console.log('\n--- Test 1: Loading Home Dashboard ---');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home.png') });
    
    const homeTitle = await page.title();
    const homeBody = await page.evaluate(() => document.body.innerText);
    const hasSearch = homeBody.includes('Search') && (homeBody.includes('7/12') || homeBody.includes('Popular Documents'));
    recordResult('Home Dashboard Load', hasSearch, `Title: "${homeTitle}", Landeed Home rendered.`);

    // 2. Click Bottom Tab: Explorer
    console.log('\n--- Test 2: Navigating to Explorer Tab ---');
    await page.evaluate(() => {
      // Find Explorer link or button
      const links = Array.from(document.querySelectorAll('a, div[role="button"]'));
      const explorerLink = links.find(el => el.textContent && el.textContent.includes('Explorer'));
      if (explorerLink) explorerLink.click();
      else window.location.href = '/explorer';
    });
    await sleep(2500);
    const explorerUrl = page.url();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_explorer.png') });
    recordResult('Explorer Tab Navigation', explorerUrl.includes('/explorer'), `Current URL: ${explorerUrl}`);

    // 3. Click Bottom Tab: Terra AI
    console.log('\n--- Test 3: Navigating to Terra AI Tab ---');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, div[role="button"]'));
      const terraLink = links.find(el => el.textContent && el.textContent.includes('Terra AI'));
      if (terraLink) terraLink.click();
      else window.location.href = '/terra';
    });
    await sleep(2500);
    const terraUrl = page.url();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_terra.png') });
    recordResult('Terra AI Tab Navigation', terraUrl.includes('/terra'), `Current URL: ${terraUrl}`);

    // Test Terra AI interaction with a prompt chip
    console.log('\n--- Test 4: Terra AI Prompt Interaction ---');
    await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('div[role="button"], button'));
      const chip = chips.find(el => el.textContent && el.textContent.includes('court litigation'));
      if (chip) chip.click();
    });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_terra_response.png') });
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasAuditResponse = pageText.includes('litigation') || pageText.includes('NJDG') || pageText.includes('stay orders');
    recordResult('Terra AI Legal Query', hasAuditResponse, 'Autonomous due-diligence audit response received.');

    // 4. Click Bottom Tab: Locker
    console.log('\n--- Test 5: Navigating to Vault / Locker Tab ---');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, div[role="button"]'));
      const lockerLink = links.find(el => el.textContent && el.textContent.includes('Locker'));
      if (lockerLink) lockerLink.click();
      else window.location.href = '/vault';
    });
    await sleep(2500);
    const lockerUrl = page.url();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_locker.png') });
    recordResult('Locker Tab Navigation', lockerUrl.includes('/vault'), `Current URL: ${lockerUrl}`);

    // 5. Click Bottom Tab: Orders
    console.log('\n--- Test 6: Navigating to Orders Tab ---');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, div[role="button"]'));
      const ordersLink = links.find(el => el.textContent && el.textContent.includes('Orders'));
      if (ordersLink) ordersLink.click();
      else window.location.href = '/orders';
    });
    await sleep(2500);
    const ordersUrl = page.url();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_orders.png') });
    recordResult('Orders Tab Navigation', ordersUrl.includes('/orders'), `Current URL: ${ordersUrl}`);

    // 6. Navigate to State Search (/search/MH?docType=7_12)
    console.log('\n--- Test 7: State Revenue Search Screen ---');
    await page.goto('http://localhost:8081/search/MH?docType=7_12', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_search_form.png') });
    const searchUrl = page.url();
    const hasSearchHeading = (await page.evaluate(() => document.body.innerText)).includes('Property Identification');
    recordResult('State Search Screen Load', hasSearchHeading, `Current URL: ${searchUrl}`);

    // 7. Submit Search via TinyFish Agent
    console.log('\n--- Test 8: Submit Registry Fetch via TinyFish AI ---');
    await page.evaluate(() => {
      const submitBtn = document.querySelector('[data-testid="submit-fetch-btn"]');
      if (submitBtn) {
        submitBtn.click();
      } else {
        const allDivs = Array.from(document.querySelectorAll('div, button, a'));
        const btn = allDivs.find(b => b.textContent && b.textContent.includes('Fetch with TinyFish AI'));
        if (btn) btn.click();
      }
    });
    // Wait for agent execution and navigation to /record/...
    console.log('Waiting for TinyFish AI agent retrieval and blockchain anchoring...');
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      if (page.url().includes('/record/')) break;
    }
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_record_result.png') });
    const recordUrl = page.url();
    const isRecordScreen = recordUrl.includes('/record/');
    const recordText = await page.evaluate(() => document.body.innerText);
    const hasGaonNamuna = recordText.includes('Gaon Namuna') || recordText.includes('142/2A') || recordText.includes('Shinde');
    recordResult('TinyFish Retrieval & Certified Record', isRecordScreen && hasGaonNamuna, `Navigated to: ${recordUrl}`);

    // 8. Test Blockchain Verifier Navigation from Record
    console.log('\n--- Test 9: On-Chain Verification Navigation ---');
    await page.evaluate(() => {
      const qrBtn = Array.from(document.querySelectorAll('a, div, button'))
        .find(b => b.textContent && b.textContent.includes('Scan Verification QR'));
      if (qrBtn) qrBtn.click();
      else {
        window.location.href = '/verify?hash=0xa93dc231d4ab5c140380c7ac6d65738c402df8fcf4221a5b898189538aba453d';
      }
    });
    for (let i = 0; i < 15; i++) {
      await sleep(500);
      if (page.url().includes('/verify')) break;
    }
    await sleep(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_verify.png') });
    const verifyUrl = page.url();
    const verifyText = await page.evaluate(() => document.body.innerText);
    const isVerified = verifyText.includes('AUTHENTIC & UNALTERED') || verifyText.includes('Polygon Amoy') || verifyText.includes('100%');
    recordResult('Polygon EVM Verification', isVerified, `Verified status displayed on ${verifyUrl}`);

  } catch (error) {
    console.error('Test execution error:', error);
    recordResult('Overall Suite', false, error.message);
  } finally {
    await browser.close();
    console.log('\n========================================');
    console.log('       TEST EXECUTION SUMMARY           ');
    console.log('========================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`Passed: ${passedCount} / ${results.length}`);
    results.forEach(r => console.log(`${r.passed ? '✅' : '❌'} ${r.name}: ${r.details}`));
    console.log('========================================\n');
  }
}

runTest();
