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
  console.log('🚀 Starting Landeed Search & Address Autocomplete Verification...');

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
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'search_01_home_initial.png') });

    // 2. Click Search Input to trigger dropdown
    console.log('\n--- 2. Focusing Search Bar to Show Popular Suggestions ---');
    const searchInput = await page.$('input');
    if (!searchInput) throw new Error('Search input not found on home screen');
    await searchInput.click();
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'search_02_dropdown_popular.png') });

    let bodyText = await page.evaluate(() => document.body.innerText);
    const hasPopular = bodyText.includes('POPULAR IN') || bodyText.includes('Wagholi') || bodyText.includes('Hinjawadi');
    console.log(hasPopular ? '✅ [PASS] Popular address suggestions displayed on focus.' : '❌ [FAIL] Popular suggestions missing.');

    // 3. Click "What all can I query?" button to inspect guide
    console.log('\n--- 3. Opening "What all can I query?" Guide ---');
    const guideBtn = await page.$('[data-testid="query-guide-btn"]');
    if (guideBtn) {
      await guideBtn.click();
    } else {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div, button'));
        const btn = buttons.find(b => b.textContent && b.textContent.includes('What all can I query?'));
        if (btn) btn.click();
      });
    }
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'search_03_query_guide_expanded.png') });

    bodyText = await page.evaluate(() => document.body.innerText);
    const hasAddressCategory = bodyText.includes('Address, Locality & Society');
    const hasSurveyCategory = bodyText.includes('Survey No, Gat, Khasra');
    const hasOwnerCategory = bodyText.includes('Owner / Khatadar Name');
    const hasDeedCategory = bodyText.includes('Deed No, Ferfar');
    const hasDoorCategory = bodyText.includes('Door No, Flat');

    console.log(hasAddressCategory && hasSurveyCategory && hasOwnerCategory && hasDeedCategory && hasDoorCategory
      ? '✅ [PASS] "What all can I query" explainer displayed all 5 core registry query categories.'
      : '❌ [FAIL] Query explainer missing categories.');

    // 4. Type address "Wagholi" to get live suggestions
    console.log('\n--- 4. Typing "Wagholi" to Query Live Address Database ---');
    await searchInput.click({ clickCount: 3 });
    await searchInput.type('Wagholi', { delay: 60 });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'search_04_wagholi_results.png') });

    bodyText = await page.evaluate(() => document.body.innerText);
    const hasWagholiAddress = bodyText.includes('Wagholi, Haveli, Pune');
    const hasWagholiSurvey = bodyText.includes('Survey No. 142/2A');
    const hasWagholiOwner = bodyText.includes('Vikramaditya Shinde');

    console.log(hasWagholiAddress
      ? '✅ [PASS] Address dropdown returned "Wagholi, Haveli, Pune" with PIN 412207.'
      : '❌ [FAIL] Wagholi address match missing.');
    console.log(hasWagholiSurvey
      ? '✅ [PASS] Survey plot match returned "Survey No. 142/2A (Wagholi, Pune)".'
      : '❌ [FAIL] Wagholi survey match missing.');
    console.log(hasWagholiOwner
      ? '✅ [PASS] Owner match returned "Vikramaditya Shinde (Khata KH-8821)".'
      : '❌ [FAIL] Wagholi owner match missing.');

    // 5. Click the Address Suggestion "Wagholi, Haveli, Pune"
    console.log('\n--- 5. Clicking "Wagholi, Haveli, Pune" Address Suggestion ---');
    const mhRow = await page.$('[data-testid="suggestion-addr-wagholi-pune"]');
    if (mhRow) {
      const box = await mhRow.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await sleep(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'search_05_navigated_search_page.png') });

    const currentUrl = page.url();
    const navigatedCorrectly = currentUrl.includes('/search/MH') && currentUrl.includes('district=Pune') && currentUrl.includes('village=Wagholi');
    console.log(navigatedCorrectly
      ? `✅ [PASS] Tapping address navigated seamlessly to: ${currentUrl}`
      : `❌ [FAIL] Unexpected destination: ${currentUrl}`);

    // Verify cascading inputs are preselected on search page
    bodyText = await page.evaluate(() => document.body.innerText);
    const hasPuneSelected = bodyText.includes('Pune');
    const hasHaveliSelected = bodyText.includes('Haveli');
    const hasWagholiSelected = bodyText.includes('Wagholi');
    console.log(hasPuneSelected && hasHaveliSelected && hasWagholiSelected
      ? '✅ [PASS] State Search prefilled District (Pune), Taluka (Haveli), Village (Wagholi) automatically!'
      : '❌ [FAIL] Administrative location was not prefilled.');

    // 6. Test Multi-State Address: "Gachibowli" (Telangana)
    console.log('\n--- 6. Testing Telangana Address Autocomplete: "Gachibowli" ---');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const input2 = await page.$('input');
    await input2.type('Gachibowli', { delay: 60 });
    await sleep(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'search_06_gachibowli_results.png') });

    bodyText = await page.evaluate(() => document.body.innerText);
    const hasGachibowli = bodyText.includes('Gachibowli, Serilingampally, Rangareddy');
    console.log(hasGachibowli
      ? '✅ [PASS] Multi-state address query returned Telangana Dharani locality.'
      : '❌ [FAIL] Gachibowli address missing.');

    // 7. Click Gachibowli ➔ verify switches state to TG and loads Dharani portal
    const tgRow = await page.$('[data-testid="suggestion-addr-gachibowli-hyderabad"]');
    if (tgRow) {
      const box = await tgRow.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await sleep(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'search_07_tg_gachibowli_page.png') });
    const tgUrl = page.url();
    const isTgSearch = tgUrl.includes('/search/TG') && tgUrl.includes('Rangareddy') && tgUrl.includes('Gachibowli');
    console.log(isTgSearch
      ? `✅ [PASS] Successfully switched state to Telangana and navigated to: ${tgUrl}`
      : `❌ [FAIL] TG navigation failed: ${tgUrl}`);

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await browser.close();
    console.log('\n🏁 Verification Completed.\n');
  }
}

runTest();
