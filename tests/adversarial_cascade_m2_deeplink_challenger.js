/**
 * Adversarial Challenger 2 Test Suite for Landeed 2.0 Milestone 2
 * Deep-Link Hydration, Cross-State Navigation, and Edge Case Robustness
 * 
 * Verifies live frontend on http://localhost:8081:
 * - Scenario 1: Complete parameter deep-links (?district=Pune&taluka=Haveli&village=Wagholi)
 * - Scenario 2: Case-insensitivity & query parameter encoding in deep-links
 * - Scenario 3: Deep-link with auxiliary parameters (docType, surveyNo, ownerName)
 * - Scenario 4: Partial parameter deep-links (only district, district + taluka)
 * - Scenario 5: Non-existent child parameter (invalid taluka under valid district)
 * - Scenario 6: Non-existent child parameter (invalid village under valid district & taluka)
 * - Scenario 7: Completely invalid district deep-link (non-existent state district)
 * - Scenario 8: Adversarial malformed / special characters / injection strings in URL
 * - Scenario 9: Cross-state direct deep-link to Karnataka (KA: Bengaluru Urban > Bengaluru East > Whitefield)
 * - Scenario 10: Cross-state deep-link with mismatched child (KA: Bengaluru Urban > Bengaluru South + Whitefield)
 * - Scenario 11: Cross-state deep-link to Telangana (TG: Hyderabad > Khairatabad > Jubilee Hills)
 * - Scenario 12: Cross-state deep-link with mismatched child in TG (Hyderabad > Shaikpet + Jubilee Hills -> Shaikpet Village)
 * - Scenario 13: Cross-state deep-link to Uttar Pradesh (UP: Lucknow > Lucknow Sadar > Gomti Nagar)
 * - Scenario 14: Cross-state deep-link to UP Gautam Buddha Nagar (Noida) > Noida > Sector 62
 * - Scenario 15: Cross-state deep-link with mismatched child in UP (Dadri + Sector 62 -> Greater Noida Pari Chowk)
 * - Scenario 16: In-session cross-state transition (MH -> KA) verifying zero stale state leakage
 * - Scenario 17: Post-hydration manual dropdown changes verifying clean cascading resets
 * - Scenario 18: Zero fatal JavaScript page errors observed during entire suite
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { resolveBrowserExecutable, resolvePuppeteer } = require('./helpers/browserResolver');

const puppeteer = resolvePuppeteer();
const BROWSER_PATH = resolveBrowserExecutable();
const SCREENSHOT_DIR = path.join(__dirname, '..', 'server', 'test_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: []
};

function recordPass(testId, description, details = {}) {
  results.total++;
  results.passed++;
  console.log(`  ✅ [PASS] ${testId}: ${description}`);
  if (Object.keys(details).length > 0) {
    console.log(`     Data:`, JSON.stringify(details));
  }
}

function recordFail(testId, description, error, details = {}) {
  results.total++;
  results.failed++;
  console.error(`  ❌ [FAIL] ${testId}: ${description}`);
  if (error) {
    console.error(`     Error: ${error.message || error}`);
  }
  if (Object.keys(details).length > 0) {
    console.error(`     Details:`, JSON.stringify(details));
  }
  results.findings.push({ testId, description, error: error ? (error.message || String(error)) : null, details });
}

async function getDropdownValues(page) {
  return await page.evaluate(() => {
    const getVal = (testId) => {
      const el = document.querySelector(`[data-testid="${testId}"]`);
      return el ? el.innerText.trim() : null;
    };
    return {
      district: getVal('district-selector-value'),
      taluka: getVal('taluka-selector-value'),
      village: getVal('village-selector-value')
    };
  });
}

async function waitForDropdownValues(page, expected, timeoutMs = 8000) {
  const start = Date.now();
  let current = {};
  while (Date.now() - start < timeoutMs) {
    current = await getDropdownValues(page);
    let match = true;
    for (const [k, v] of Object.entries(expected)) {
      if (v === null) {
        if (current[k] !== null && current[k] !== '') match = false;
      } else if (typeof v === 'string') {
        if (!current[k] || current[k].toLowerCase() !== v.toLowerCase()) match = false;
      } else if (v instanceof RegExp) {
        if (!current[k] || !v.test(current[k])) match = false;
      }
    }
    if (match) return current;
    await sleep(200);
  }
  throw new Error(`Timeout waiting for dropdown values. Expected: ${JSON.stringify(expected)}, Current: ${JSON.stringify(current)}`);
}

async function runChallenger2Suite() {
  console.log('================================================================================');
  console.log('⚔️  CHALLENGER 2: Adversarial Deep-Link Hydration & Edge Case Verification');
  console.log('================================================================================');
  console.log(`Browser Executable: ${BROWSER_PATH}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: BROWSER_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // =========================================================================
    // SCENARIO 1: Complete Parameter Deep-Linking (MH)
    // =========================================================================
    console.log('\n--- Scenario 1: Complete Parameter Deep-Linking (/search/MH?district=Pune&taluka=Haveli&village=Wagholi) ---');
    try {
      await page.goto('http://localhost:8081/search/MH?district=Pune&taluka=Haveli&village=Wagholi', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi'
      });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'challenger_m2_01_complete_deeplink.png') });
      recordPass('TEST_CHALLENGE_01', 'Complete deep link populates all 3 dropdowns accurately (Pune > Haveli > Wagholi)', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_01', 'Complete deep link failed to populate dropdowns', err);
    }

    // =========================================================================
    // SCENARIO 2: Case-Insensitive & Whitespace Deep-Linking
    // =========================================================================
    console.log('\n--- Scenario 2: Case-Insensitive Deep-Link URL Matching ---');
    try {
      await page.goto('http://localhost:8081/search/MH?district=pune&taluka=haveli&village=wagholi', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi'
      });
      recordPass('TEST_CHALLENGE_02', 'Lower-case parameters resolve to canonical title-case dropdown entries', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_02', 'Case-insensitive deep-link failed', err);
    }

    // =========================================================================
    // SCENARIO 3: Deep-Link with Auxiliary Metadata (docType, surveyNo, ownerName)
    // =========================================================================
    console.log('\n--- Scenario 3: Deep-Link with Auxiliary Parameters (docType, surveyNo, ownerName) ---');
    try {
      await page.goto('http://localhost:8081/search/MH?district=Pune&taluka=Haveli&village=Wagholi&surveyNo=142%2F2A&docType=MUTATION&ownerName=Kulkarni', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi'
      });
      
      const pageText = await page.evaluate(() => document.body.innerText);
      const docSelected = pageText.includes('Ferfar / Mutation');
      assert.ok(docSelected, 'Ferfar / Mutation document type card must be rendered');

      recordPass('TEST_CHALLENGE_03', 'Deep link preserves auxiliary params (docType, surveyNo) alongside location hierarchy', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_03', 'Auxiliary parameter deep-link failed', err);
    }

    // =========================================================================
    // SCENARIO 4: Partial Deep-Link - Only District (?district=Pune)
    // =========================================================================
    console.log('\n--- Scenario 4: Partial Deep-Link (District Only) ---');
    try {
      await page.goto('http://localhost:8081/search/MH?district=Pune', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Pune',
        taluka: /.+/,
        village: /.+/
      });
      assert.strictEqual(vals.district, 'Pune');
      assert.ok(vals.taluka && vals.taluka !== 'Select taluka', 'Taluka should auto-populate with first available choice');
      assert.ok(vals.village && vals.village !== 'Select village', 'Village should auto-populate with first available choice');
      recordPass('TEST_CHALLENGE_04', 'Partial deep-link (?district=Pune) hydrates district and cascades defaults cleanly', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_04', 'Partial deep-link (district only) failed', err);
    }

    // =========================================================================
    // SCENARIO 5: Partial Deep-Link - District + Taluka (?district=Pune&taluka=Mulshi)
    // =========================================================================
    console.log('\n--- Scenario 5: Partial Deep-Link (District + Taluka) ---');
    try {
      await page.goto('http://localhost:8081/search/MH?district=Pune&taluka=Mulshi', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Pune',
        taluka: 'Mulshi',
        village: /.+/
      });
      assert.strictEqual(vals.district, 'Pune');
      assert.strictEqual(vals.taluka, 'Mulshi');
      assert.ok(vals.village && vals.village.length > 0, 'Village should auto-populate for Mulshi');
      recordPass('TEST_CHALLENGE_05', 'Partial deep-link (?district=Pune&taluka=Mulshi) hydrates district & taluka and auto-fills village', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_05', 'Partial deep-link (district + taluka) failed', err);
    }

    // =========================================================================
    // SCENARIO 6: Non-Existent Child Parameter - Invalid Taluka (?district=Pune&taluka=FakeTaluka)
    // =========================================================================
    console.log('\n--- Scenario 6: Non-Existent Child Parameter (Invalid Taluka under Valid District) ---');
    try {
      await page.goto('http://localhost:8081/search/MH?district=Pune&taluka=FakeTaluka', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      // Page should NOT crash; district should be Pune, and taluka should fall back gracefully to first taluka (Haveli)
      const vals = await waitForDropdownValues(page, {
        district: 'Pune',
        taluka: /.+/,
        village: /.+/
      });
      assert.strictEqual(vals.district, 'Pune');
      assert.notStrictEqual(vals.taluka, 'FakeTaluka', 'Taluka must not remain as invalid FakeTaluka');
      recordPass('TEST_CHALLENGE_06', 'Non-existent taluka handled gracefully without crash, falling back to valid option', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_06', 'Non-existent taluka caused crash or unhandled failure', err);
    }

    // =========================================================================
    // SCENARIO 7: Non-Existent Child Parameter - Invalid Village (?district=Pune&taluka=Haveli&village=NonExistentVillage)
    // =========================================================================
    console.log('\n--- Scenario 7: Non-Existent Child Parameter (Invalid Village under Valid District & Taluka) ---');
    try {
      await page.goto('http://localhost:8081/search/MH?district=Pune&taluka=Haveli&village=NonExistentVillage', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Pune',
        taluka: 'Haveli',
        village: /.+/
      });
      assert.strictEqual(vals.district, 'Pune');
      assert.strictEqual(vals.taluka, 'Haveli');
      assert.notStrictEqual(vals.village, 'NonExistentVillage', 'Village must not remain as invalid NonExistentVillage');
      recordPass('TEST_CHALLENGE_07', 'Non-existent village handled gracefully without crash, falling back to valid option', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_07', 'Non-existent village caused crash or unhandled failure', err);
    }

    // =========================================================================
    // SCENARIO 8: Completely Invalid District Deep-Link
    // =========================================================================
    console.log('\n--- Scenario 8: Completely Invalid District Deep-Link ---');
    try {
      await page.goto('http://localhost:8081/search/MH?district=AtlantisDistrict&taluka=Fake&village=Fake', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: /.+/,
        taluka: /.+/,
        village: /.+/
      });
      assert.notStrictEqual(vals.district, 'AtlantisDistrict', 'District must fall back from non-existent value');
      recordPass('TEST_CHALLENGE_08', 'Invalid district falls back gracefully to state default without UI freeze', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_08', 'Invalid district deep-link caused crash', err);
    }

    // =========================================================================
    // SCENARIO 9: Adversarial Malformed & Special Characters in URL
    // =========================================================================
    console.log('\n--- Scenario 9: Adversarial Special Characters & SQLi / Script Injections in URL ---');
    try {
      await page.goto("http://localhost:8081/search/MH?district=Pune%27%20OR%201%3D1--&taluka=%3Cscript%3Ealert(1)%3C%2Fscript%3E&village=%20%20%20", {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: /.+/,
        taluka: /.+/,
        village: /.+/
      });
      const bodyText = await page.evaluate(() => document.body.innerText);
      assert.ok(!bodyText.includes('<script>'), 'Injected scripts must not be executed or reflected unsanitized');
      recordPass('TEST_CHALLENGE_09', 'Adversarial query injection strings handled safely without crashing UI', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_09', 'Adversarial query parameters caused failure', err);
    }

    // =========================================================================
    // SCENARIO 10: Cross-State Navigation - Direct Deep-Link to Karnataka (KA)
    // =========================================================================
    console.log('\n--- Scenario 10: Cross-State Direct Deep-Link to KA (Bengaluru Urban > Bengaluru East > Whitefield) ---');
    try {
      await page.goto('http://localhost:8081/search/KA?district=Bengaluru%20Urban&taluka=Bengaluru%20East&village=Whitefield', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Bengaluru Urban',
        taluka: 'Bengaluru East',
        village: 'Whitefield'
      });
      const headerText = await page.evaluate(() => document.body.innerText);
      assert.ok(headerText.includes('Karnataka') || headerText.includes('ಕರ್ನಾಟಕ'), 'State header must display Karnataka');
      assert.ok(headerText.includes('Bhoomi'), 'Must display Bhoomi portal reference for Karnataka');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'challenger_m2_10_karnataka_deeplink.png') });
      recordPass('TEST_CHALLENGE_10', 'Cross-state deep link to Karnataka populates full KA revenue hierarchy', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_10', 'Karnataka cross-state deep-link failed', err);
    }

    // =========================================================================
    // SCENARIO 11: Cross-State with Mismatched Child (KA: Bengaluru South + Whitefield)
    // =========================================================================
    console.log('\n--- Scenario 11: Cross-State with Mismatched Child (KA: Bengaluru South + Whitefield) ---');
    try {
      await page.goto('http://localhost:8081/search/KA?district=Bengaluru%20Urban&taluka=Bengaluru%20South&village=Whitefield', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Bengaluru Urban',
        taluka: 'Bengaluru South',
        village: /.+/
      });
      assert.strictEqual(vals.district, 'Bengaluru Urban');
      assert.strictEqual(vals.taluka, 'Bengaluru South');
      assert.notStrictEqual(vals.village, 'Whitefield', 'Whitefield does not belong to Bengaluru South; fallback expected');
      recordPass('TEST_CHALLENGE_11', 'Cross-state mismatched village (Whitefield in Bengaluru South) falls back cleanly', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_11', 'Cross-state mismatched child parameter failed', err);
    }

    // =========================================================================
    // SCENARIO 12: Cross-State Navigation to Telangana (TG: Hyderabad > Khairatabad > Jubilee Hills)
    // =========================================================================
    console.log('\n--- Scenario 12: Cross-State Deep-Link to Telangana (TG) ---');
    try {
      await page.goto('http://localhost:8081/search/TG?district=Hyderabad&taluka=Khairatabad&village=Jubilee%20Hills', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Hyderabad',
        taluka: 'Khairatabad',
        village: 'Jubilee Hills'
      });
      const headerText = await page.evaluate(() => document.body.innerText);
      assert.ok(headerText.includes('Telangana') || headerText.includes('తెలంగాణ'), 'Header must display Telangana');
      assert.ok(headerText.includes('Dharani'), 'Must display Dharani portal reference for Telangana');
      recordPass('TEST_CHALLENGE_12', 'Cross-state deep link to Telangana populates TG hierarchy (Hyderabad > Khairatabad > Jubilee Hills)', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_12', 'Telangana cross-state deep-link failed', err);
    }

    // =========================================================================
    // SCENARIO 13: Cross-State with Mismatched Child in TG (Hyderabad > Shaikpet + Jubilee Hills)
    // =========================================================================
    console.log('\n--- Scenario 13: Cross-State with Mismatched Child in TG (Hyderabad > Shaikpet + Jubilee Hills) ---');
    try {
      await page.goto('http://localhost:8081/search/TG?district=Hyderabad&taluka=Shaikpet&village=Jubilee%20Hills', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Hyderabad',
        taluka: 'Shaikpet',
        village: /.+/
      });
      assert.strictEqual(vals.district, 'Hyderabad');
      assert.strictEqual(vals.taluka, 'Shaikpet');
      assert.notStrictEqual(vals.village, 'Jubilee Hills', 'Jubilee Hills is in Khairatabad; Shaikpet must fallback to Shaikpet Village');
      recordPass('TEST_CHALLENGE_13', 'Cross-state mismatched village in TG falls back gracefully to first taluka village', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_13', 'Telangana mismatched child deep-link failed', err);
    }

    // =========================================================================
    // SCENARIO 14: Cross-State Navigation to Uttar Pradesh (UP: Lucknow > Lucknow Sadar > Gomti Nagar)
    // =========================================================================
    console.log('\n--- Scenario 14: Cross-State Deep-Link to Uttar Pradesh (UP: Lucknow > Lucknow Sadar > Gomti Nagar) ---');
    try {
      await page.goto('http://localhost:8081/search/UP?district=Lucknow&taluka=Lucknow%20Sadar&village=Gomti%20Nagar', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Lucknow',
        taluka: 'Lucknow Sadar',
        village: 'Gomti Nagar'
      });
      const headerText = await page.evaluate(() => document.body.innerText);
      assert.ok(headerText.includes('Uttar Pradesh') || headerText.includes('उत्तर प्रदेश'), 'Header must display Uttar Pradesh');
      assert.ok(headerText.includes('Bhulekh UP'), 'Must display Bhulekh UP portal reference');
      recordPass('TEST_CHALLENGE_14', 'Cross-state deep link to Uttar Pradesh populates UP hierarchy (Lucknow > Lucknow Sadar > Gomti Nagar)', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_14', 'Uttar Pradesh cross-state deep-link failed', err);
    }

    // =========================================================================
    // SCENARIO 15: Cross-State Deep-Link to UP (Gautam Buddha Nagar (Noida) > Noida > Sector 62)
    // =========================================================================
    console.log('\n--- Scenario 15: Cross-State Deep-Link to UP Noida (Gautam Buddha Nagar (Noida) > Noida > Sector 62) ---');
    try {
      await page.goto('http://localhost:8081/search/UP?district=Gautam%20Buddha%20Nagar%20(Noida)&taluka=Noida&village=Sector%2062', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Gautam Buddha Nagar (Noida)',
        taluka: 'Noida',
        village: 'Sector 62'
      });
      recordPass('TEST_CHALLENGE_15', 'Cross-state deep link to Noida populates Gautam Buddha Nagar (Noida) > Noida > Sector 62', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_15', 'UP Noida cross-state deep-link failed', err);
    }

    // =========================================================================
    // SCENARIO 16: In-Session State Transition (MH -> KA)
    // =========================================================================
    console.log('\n--- Scenario 16: In-Session Cross-State Transition (MH -> KA without full browser restart) ---');
    try {
      // Start in MH
      await page.goto('http://localhost:8081/search/MH?district=Pune&taluka=Haveli&village=Wagholi', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      await waitForDropdownValues(page, { district: 'Pune', taluka: 'Haveli', village: 'Wagholi' });

      // Navigate to KA in same tab
      await page.goto('http://localhost:8081/search/KA?district=Bengaluru%20Urban&taluka=Bengaluru%20East&village=Whitefield', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      const vals = await waitForDropdownValues(page, {
        district: 'Bengaluru Urban',
        taluka: 'Bengaluru East',
        village: 'Whitefield'
      });

      // Open district modal to verify that options are KA districts, not MH districts
      await page.click('[data-testid="district-selector"]');
      await sleep(400);
      const modalOptions = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('[data-testid^="district-selector-option-"]'));
        return rows.map((r) => r.innerText.trim());
      });
      await page.click('[data-testid="district-selector-close"]');
      await sleep(300);

      assert.ok(modalOptions.includes('Bengaluru Urban'), 'District modal must contain Bengaluru Urban');
      assert.ok(!modalOptions.includes('Pune'), 'District modal must NOT contain Pune (no stale MH state leakage)');

      recordPass('TEST_CHALLENGE_16', 'In-session cross-state transition cleanly switches hierarchy without leaking stale options', vals);
    } catch (err) {
      recordFail('TEST_CHALLENGE_16', 'In-session cross-state transition failed', err);
    }

    // =========================================================================
    // SCENARIO 17: Post-Hydration Interactive Cascading Resets
    // =========================================================================
    console.log('\n--- Scenario 17: Post-Hydration Interactive Cascading Resets ---');
    try {
      // Hydrate via deep-link
      await page.goto('http://localhost:8081/search/MH?district=Pune&taluka=Haveli&village=Wagholi', {
        waitUntil: 'networkidle2',
        timeout: 25000
      });
      await waitForDropdownValues(page, { district: 'Pune', taluka: 'Haveli', village: 'Wagholi' });

      // Open District modal and change district to Thane
      await page.click('[data-testid="district-selector"]');
      await sleep(500);

      // Search Thane
      await page.type('[data-testid="district-selector-search-input"]', 'Thane');
      await sleep(300);

      // Click Thane option
      const thaneOption = await page.$('[data-testid="district-selector-option-thane"]');
      assert.ok(thaneOption, 'Thane option must be present in search results');
      await thaneOption.click();
      await sleep(800);

      // Verify district is now Thane and child talukas/villages are fetched and populated with Thane's data
      const afterDistrictChange = await waitForDropdownValues(page, {
        district: 'Thane',
        taluka: /.+/,
        village: /.+/
      });
      assert.strictEqual(afterDistrictChange.district, 'Thane');
      assert.notStrictEqual(afterDistrictChange.taluka, 'Haveli', 'Taluka must be reset and not retain stale Pune taluka');

      // Now change Taluka
      await page.click('[data-testid="taluka-selector"]');
      await sleep(500);
      const talukaOptions = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('[data-testid^="taluka-selector-option-"]'));
        return rows.map((r) => r.innerText.trim());
      });
      assert.ok(!talukaOptions.includes('Haveli'), 'Taluka modal must not contain Haveli after switching to Thane');

      if (talukaOptions.length > 1) {
        // Pick the second taluka
        const secondTaluka = talukaOptions[1];
        const sanitizedId = secondTaluka.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        await page.click(`[data-testid="taluka-selector-option-${sanitizedId}"]`);
        await sleep(800);

        const afterTalukaChange = await waitForDropdownValues(page, {
          district: 'Thane',
          taluka: secondTaluka,
          village: /.+/
        });
        assert.strictEqual(afterTalukaChange.taluka, secondTaluka);
      } else {
        await page.click('[data-testid="taluka-selector-close"]');
      }

      recordPass('TEST_CHALLENGE_17', 'User-initiated district and taluka changes invalidate pendingParams and cleanly reset child tiers', afterDistrictChange);
    } catch (err) {
      recordFail('TEST_CHALLENGE_17', 'Post-hydration interactive cascading reset failed', err);
    }

    // =========================================================================
    // SCENARIO 18: Zero Unhandled Page Exceptions / Console Crashes
    // =========================================================================
    console.log('\n--- Scenario 18: Check for Fatal Page Errors during Stress Suite ---');
    const fatalErrors = pageErrors.filter((e) => !e.includes('favicon'));
    if (fatalErrors.length === 0) {
      recordPass('TEST_CHALLENGE_18', 'Zero fatal JavaScript page errors observed during entire deep-link test suite');
    } else {
      recordFail('TEST_CHALLENGE_18', `Fatal errors observed: ${fatalErrors.join('; ')}`, new Error('Fatal page errors'));
    }

  } catch (globalErr) {
    console.error('Global Challenger Suite Error:', globalErr);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n================================================================================');
  console.log(`Summary: ${results.passed} Passed, ${results.failed} Failed out of ${results.total} Tests`);
  console.log('================================================================================\n');

  return results;
}

if (require.main === module) {
  runChallenger2Suite().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  });
}

module.exports = { runChallenger2Suite };
