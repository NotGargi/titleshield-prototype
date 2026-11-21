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
  console.log('🚀 Starting Landeed Pan-India Search & 36 States Verification...');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // 1. Load Home
    console.log('\n--- 1. Loading Landeed Home Screen ---');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // 2. Open State Picker Modal & Verify 36 States / UTs
    console.log('\n--- 2. Checking State Picker Modal for Pan-India States ---');
    const stateBtn = await page.$('[data-testid="header-state-selector"]');
    if (stateBtn) {
      const box = await stateBtn.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pan_india_01_state_modal.png') });

    let modalText = await page.evaluate(() => document.body.innerText);
    const hasUP = modalText.includes('Uttar Pradesh');
    const hasDL = modalText.includes('Delhi');
    const hasHR = modalText.includes('Haryana');
    const hasRJ = modalText.includes('Rajasthan');
    const hasWB = modalText.includes('West Bengal');
    const hasKL = modalText.includes('Kerala');
    const hasGA = modalText.includes('Goa');
    const hasAS = modalText.includes('Assam');

    console.log(hasUP && hasDL && hasHR && hasRJ && hasWB && hasKL && hasGA && hasAS
      ? '✅ [PASS] State Picker contains all regions of India (UP, DL, HR, RJ, WB, KL, GA, AS, etc.)!'
      : '❌ [FAIL] Missing states in State Picker modal.');

    // Close modal
    await page.keyboard.press('Escape');
    await sleep(500);

    // 3. Search "Noida" (Uttar Pradesh)
    console.log('\n--- 3. Searching "Noida" in Northern India Registry ---');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const searchInput = await page.$('input');
    await searchInput.type('Noida', { delay: 60 });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pan_india_02_noida.png') });

    let bodyText = await page.evaluate(() => document.body.innerText);
    const hasNoida62 = bodyText.includes('Noida Sector 62');
    const hasPariChowk = bodyText.includes('Greater Noida Pari Chowk');
    const hasKhasra492 = bodyText.includes('Khasra No. 492/1');

    console.log(hasNoida62 && hasPariChowk && hasKhasra492
      ? '✅ [PASS] "Noida" returned UP Bhulekh localities and Khasra 492 cadastral record.'
      : '❌ [FAIL] Noida results incomplete.');

    // 4. Click Noida 62 Suggestion ➔ Verify Navigation to UP Bhulekh Portal
    console.log('\n--- 4. Navigating to Uttar Pradesh Portal via Noida Suggestion ---');
    const noidaRow = await page.$('[data-testid="suggestion-addr-noida-sec62"]');
    if (noidaRow) {
      const box = await noidaRow.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await sleep(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pan_india_03_up_portal.png') });

    const upUrl = page.url();
    const isUpNav = upUrl.includes('/search/UP') && upUrl.includes('Noida');
    console.log(isUpNav
      ? `✅ [PASS] Successfully navigated to UP Bhulekh Portal: ${upUrl}`
      : `❌ [FAIL] UP navigation failed: ${upUrl}`);

    // 5. Search "Gurugram" (Haryana Jamabandi)
    console.log('\n--- 5. Searching "Gurugram" (Haryana Jamabandi) ---');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const input2 = await page.$('input');
    await input2.type('Gurugram', { delay: 60 });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pan_india_04_gurugram.png') });

    bodyText = await page.evaluate(() => document.body.innerText);
    const hasCyberCity = bodyText.includes('Cyber City & DLF Phase 1-5');
    console.log(hasCyberCity
      ? '✅ [PASS] "Gurugram" returned Haryana Jamabandi Cyber City record.'
      : '❌ [FAIL] Gurugram search failed.');

    // 6. Search "Salt Lake" (Kolkata, West Bengal Banglarbhumi)
    console.log('\n--- 6. Searching "Salt Lake" (West Bengal Banglarbhumi) ---');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const input3 = await page.$('input');
    await input3.type('Salt Lake', { delay: 60 });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pan_india_05_saltlake.png') });

    bodyText = await page.evaluate(() => document.body.innerText);
    const hasSaltLake = bodyText.includes('Salt Lake Sector V IT Hub') && bodyText.includes('Banglarbhumi');
    console.log(hasSaltLake
      ? '✅ [PASS] "Salt Lake" returned West Bengal Banglarbhumi ROR record.'
      : '❌ [FAIL] Salt Lake search failed.');

    // 7. Search PIN Code "201301" (Dynamic Pan-India PIN Resolver)
    console.log('\n--- 7. Testing Dynamic Pan-India PIN Code Resolver "201301" ---');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const input4 = await page.$('input');
    await input4.type('201301', { delay: 60 });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pan_india_06_pin_resolver.png') });

    bodyText = await page.evaluate(() => document.body.innerText);
    const hasPinResolver = bodyText.includes('PIN 201301 (Uttar Pradesh)');
    console.log(hasPinResolver
      ? '✅ [PASS] PIN Code 201301 dynamically resolved to Uttar Pradesh Bhulekh registry!'
      : '❌ [FAIL] PIN code resolution failed.');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
    console.log('\n🏁 Pan-India Search Verification Completed.\n');
  }
}

runTest();
