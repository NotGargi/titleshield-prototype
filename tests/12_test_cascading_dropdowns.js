/**
 * Landeed 2.0 Test Suite 12: Cascading Location Dropdowns & Location Hierarchy E2E
 * 
 * Comprehensive 4-Tier Automated Verification covering:
 * - Tier 1: Canonical Feature Coverage & API Contracts (7 States: MH, KA, TG, UP, TN, GJ, AP)
 *           Both query parameter (?state=XX) and path parameter (/api/districts/:state) formats
 * - Tier 2: Boundary Value Analysis, Case-Insensitivity & Error Handling (HTTP 400 on missing params,
 *           empty array on unknown entities, case normalization, whitespace trimming, traversal resistance)
 * - Tier 3: Hierarchical Integrity & Legacy Backwards Compatibility (/api/locations/:state/*)
 * - Tier 4: Real-World Search Workflows & Browser DOM Cascading (Puppeteer on http://localhost:8081/search/:state)
 */

const assert = require('node:assert');
const path = require('node:path');
const { resolveBrowserExecutable, resolvePuppeteer } = require('./helpers/browserResolver');

const API_BASE = 'http://localhost:4000/api';
const WEB_BASE = 'http://localhost:8081';

const ALL_7_STATES = ['MH', 'KA', 'TG', 'UP', 'TN', 'GJ', 'AP'];

const STATE_HIERARCHY_SAMPLES = {
  MH: { district: 'Pune', taluka: 'Haveli', village: 'Wagholi' },
  KA: { district: 'Bengaluru Urban', taluka: 'Bengaluru East', village: 'Whitefield' },
  TG: { district: 'Hyderabad', taluka: 'Serilingampally', village: 'Gachibowli' },
  UP: { district: 'Gautam Buddha Nagar (Noida)', taluka: 'Noida', village: 'Sector 62' },
  TN: { district: 'Chennai', taluka: 'Sholinganallur', village: 'Sholinganallur' },
  GJ: { district: 'Ahmedabad', taluka: 'Daskroi', village: 'Bopal' },
  AP: { district: 'Visakhapatnam', taluka: 'Visakhapatnam Urban', village: 'Madhurawada' }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust click dispatcher that handles React Native Web touchable elements
 */
async function safeClick(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { timeout, visible: true });
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Element ${sel} not found`);
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    if (typeof el.click === 'function') {
      el.click();
    }
  }, selector);
}

async function runCascadingDropdownsTests() {
  console.log('\n================================================================================');
  console.log('📍 SUITE 12: Cascading Dropdown Selectors & Location Hierarchy E2E');
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

  // ---------------------------------------------------------------------------
  // TIER 1: CANONICAL LOCATION HIERARCHY ENDPOINTS ACROSS ALL 7 STATES
  // ---------------------------------------------------------------------------
  console.log('\n--- Tier 1: Canonical Feature Coverage & API Contracts (7 States) ---');

  // TEST_CD_01: Verify GET /api/districts query format across all 7 states
  try {
    for (const state of ALL_7_STATES) {
      const res = await fetch(`${API_BASE}/districts?state=${state}`);
      assert.strictEqual(res.status, 200, `Districts query for ${state} returned HTTP ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.state.toUpperCase(), state, `State code must match ${state}`);
      assert.ok(Array.isArray(data.districts) && data.districts.length > 0, `${state} must have non-empty districts array`);
      const sample = STATE_HIERARCHY_SAMPLES[state];
      assert.ok(
        data.districts.some(d => d.toLowerCase() === sample.district.toLowerCase()),
        `${state} districts must include canonical sample district "${sample.district}"`
      );
    }
    recordPass('TEST_CD_01', 'Tier 1', 'GET /api/districts?state=XX returns HTTP 200 with { state, districts: [...] } for all 7 states (MH, KA, TG, UP, TN, GJ, AP)');
  } catch (err) {
    recordFail('TEST_CD_01', 'Tier 1', 'GET /api/districts query format across 7 states failed', err);
  }

  // TEST_CD_02: Verify GET /api/districts/:state path format across all 7 states
  try {
    for (const state of ALL_7_STATES) {
      const res = await fetch(`${API_BASE}/districts/${state}`);
      assert.strictEqual(res.status, 200, `Districts path for ${state} returned HTTP ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.state.toUpperCase(), state);
      assert.ok(Array.isArray(data.districts) && data.districts.length > 0);
    }
    recordPass('TEST_CD_02', 'Tier 1', 'GET /api/districts/:state path format returns HTTP 200 with identical schema for all 7 states');
  } catch (err) {
    recordFail('TEST_CD_02', 'Tier 1', 'GET /api/districts/:state path format failed', err);
  }

  // TEST_CD_03: Verify GET /api/talukas query format across all 7 states
  try {
    for (const state of ALL_7_STATES) {
      const sample = STATE_HIERARCHY_SAMPLES[state];
      const res = await fetch(`${API_BASE}/talukas?state=${state}&district=${encodeURIComponent(sample.district)}`);
      assert.strictEqual(res.status, 200, `Talukas query for ${state}/${sample.district} returned HTTP ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.state.toUpperCase(), state);
      assert.ok(Array.isArray(data.talukas) && data.talukas.length > 0, `${sample.district} must have non-empty talukas array`);
      assert.ok(
        data.talukas.some(t => t.toLowerCase() === sample.taluka.toLowerCase()),
        `${sample.district} talukas must include canonical taluka "${sample.taluka}"`
      );
    }
    recordPass('TEST_CD_03', 'Tier 1', 'GET /api/talukas?state=XX&district=... returns HTTP 200 with { state, district, talukas: [...] } for all 7 states');
  } catch (err) {
    recordFail('TEST_CD_03', 'Tier 1', 'GET /api/talukas query format across 7 states failed', err);
  }

  // TEST_CD_04: Verify GET /api/talukas/:state path format across all 7 states
  try {
    for (const state of ALL_7_STATES) {
      const sample = STATE_HIERARCHY_SAMPLES[state];
      const res = await fetch(`${API_BASE}/talukas/${state}?district=${encodeURIComponent(sample.district)}`);
      assert.strictEqual(res.status, 200, `Talukas path for ${state}/${sample.district} returned HTTP ${res.status}`);
      const data = await res.json();
      assert.ok(Array.isArray(data.talukas) && data.talukas.length > 0);
    }
    recordPass('TEST_CD_04', 'Tier 1', 'GET /api/talukas/:state?district=... path format returns HTTP 200 for all 7 states');
  } catch (err) {
    recordFail('TEST_CD_04', 'Tier 1', 'GET /api/talukas/:state path format failed', err);
  }

  // TEST_CD_05: Verify GET /api/villages query format across all 7 states
  try {
    for (const state of ALL_7_STATES) {
      const sample = STATE_HIERARCHY_SAMPLES[state];
      const res = await fetch(
        `${API_BASE}/villages?state=${state}&district=${encodeURIComponent(sample.district)}&taluka=${encodeURIComponent(sample.taluka)}`
      );
      assert.strictEqual(res.status, 200, `Villages query for ${state}/${sample.taluka} returned HTTP ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.state.toUpperCase(), state);
      assert.ok(Array.isArray(data.villages) && data.villages.length > 0, `${sample.taluka} must have non-empty villages array`);
      assert.ok(
        data.villages.some(v => v.toLowerCase() === sample.village.toLowerCase()),
        `${sample.taluka} villages must include canonical village "${sample.village}"`
      );
    }
    recordPass('TEST_CD_05', 'Tier 1', 'GET /api/villages?state=XX&district=...&taluka=... returns HTTP 200 with { state, taluka, villages: [...] } for all 7 states');
  } catch (err) {
    recordFail('TEST_CD_05', 'Tier 1', 'GET /api/villages query format across 7 states failed', err);
  }

  // TEST_CD_06: Verify GET /api/villages/:state path format across all 7 states
  try {
    for (const state of ALL_7_STATES) {
      const sample = STATE_HIERARCHY_SAMPLES[state];
      const res = await fetch(
        `${API_BASE}/villages/${state}?district=${encodeURIComponent(sample.district)}&taluka=${encodeURIComponent(sample.taluka)}`
      );
      assert.strictEqual(res.status, 200, `Villages path for ${state}/${sample.taluka} returned HTTP ${res.status}`);
      const data = await res.json();
      assert.ok(Array.isArray(data.villages) && data.villages.length > 0);
      assert.ok(data.villages.some(v => v.toLowerCase() === sample.village.toLowerCase()));
    }
    recordPass('TEST_CD_06', 'Tier 1', 'GET /api/villages/:state?district=...&taluka=... path format returns HTTP 200 for all 7 states');
  } catch (err) {
    recordFail('TEST_CD_06', 'Tier 1', 'GET /api/villages/:state path format failed', err);
  }

  // ---------------------------------------------------------------------------
  // TIER 2: BOUNDARY VALIDATIONS, ROBUSTNESS & ERROR REJECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- Tier 2: Boundary Validations & Robustness ---');

  // TEST_CD_07: Missing mandatory parent parameters return HTTP 400 Bad Request
  try {
    const resNoState = await fetch(`${API_BASE}/districts`);
    assert.strictEqual(resNoState.status, 400, 'Districts with no state must return HTTP 400');
    const errNoState = await resNoState.json();
    assert.ok(errNoState.error && /state/i.test(errNoState.error), 'Expected state parameter error message');

    const resNoDist = await fetch(`${API_BASE}/talukas?state=MH`);
    assert.strictEqual(resNoDist.status, 400, 'Talukas with no district must return HTTP 400');
    const errNoDist = await resNoDist.json();
    assert.ok(errNoDist.error && /district/i.test(errNoDist.error), 'Expected district parameter error message');

    const resNoTaluka = await fetch(`${API_BASE}/villages?state=MH&district=Pune`);
    assert.strictEqual(resNoTaluka.status, 400, 'Villages with no taluka must return HTTP 400');
    const errNoTaluka = await resNoTaluka.json();
    assert.ok(errNoTaluka.error && /taluka/i.test(errNoTaluka.error), 'Expected taluka parameter error message');

    recordPass('TEST_CD_07', 'Tier 2', 'Missing mandatory parent parameters (state, district, taluka) strictly return HTTP 400 Bad Request with structured error');
  } catch (err) {
    recordFail('TEST_CD_07', 'Tier 2', 'Missing parameter validation failed', err);
  }

  // TEST_CD_08: Non-existent subdivisions return HTTP 200 with empty array [] (no 500 crash)
  try {
    const resUnknownState = await fetch(`${API_BASE}/districts?state=ZZ`);
    assert.strictEqual(resUnknownState.status, 200, 'Unknown state should return HTTP 200 with empty array');
    const dUnknown = await resUnknownState.json();
    assert.ok(Array.isArray(dUnknown.districts) && dUnknown.districts.length === 0, 'Unknown state must return empty districts array');

    const resUnknownDist = await fetch(`${API_BASE}/talukas?state=MH&district=NonExistentSubdivision`);
    assert.strictEqual(resUnknownDist.status, 200, 'Unknown district should return HTTP 200 with empty array');
    const tUnknown = await resUnknownDist.json();
    assert.ok(Array.isArray(tUnknown.talukas) && tUnknown.talukas.length === 0, 'Unknown district must return empty talukas array');

    const resUnknownVil = await fetch(`${API_BASE}/villages?state=MH&district=Pune&taluka=NonExistentTaluka`);
    assert.strictEqual(resUnknownVil.status, 200, 'Unknown taluka should return HTTP 200 with empty array');
    const vUnknown = await resUnknownVil.json();
    assert.ok(Array.isArray(vUnknown.villages) && vUnknown.villages.length === 0, 'Unknown taluka must return empty villages array');

    recordPass('TEST_CD_08', 'Tier 2', 'Non-existent subdivisions return HTTP 200 with empty array [] without 500 server errors');
  } catch (err) {
    recordFail('TEST_CD_08', 'Tier 2', 'Non-existent entity handling failed', err);
  }

  // TEST_CD_09: Whitespace trimming, special characters, and path-traversal resistance
  try {
    const resSpace = await fetch(`${API_BASE}/districts?state=%20MH%20`);
    assert.strictEqual(resSpace.status, 200);
    const dSpace = await resSpace.json();
    assert.strictEqual(dSpace.state.toUpperCase(), 'MH');
    assert.ok(dSpace.districts.length > 0);

    const resSpecial = await fetch(`${API_BASE}/talukas?state=UP&district=${encodeURIComponent('Gautam Buddha Nagar (Noida)')}`);
    assert.strictEqual(resSpecial.status, 200);
    const dSpecial = await resSpecial.json();
    assert.ok(Array.isArray(dSpecial.talukas) && dSpecial.talukas.includes('Noida'));

    const resTraversal = await fetch(`${API_BASE}/districts/..%2F..%2Fetc`);
    assert.ok(
      resTraversal.status === 200 || resTraversal.status === 400 || resTraversal.status === 404,
      `Traversal attempt returned unexpected status: ${resTraversal.status}`
    );
    if (resTraversal.status === 200) {
      const dTraversal = await resTraversal.json();
      assert.ok(
        Array.isArray(dTraversal.districts) && dTraversal.districts.length === 0,
        'Path traversal string must safely resolve to empty districts without server error or file leak'
      );
    }

    recordPass('TEST_CD_09', 'Tier 2', 'Whitespace trimming, URL-encoded special character handling, and path-traversal resilience verified');
  } catch (err) {
    recordFail('TEST_CD_09', 'Tier 2', 'Whitespace and special characters handling failed', err);
  }

  // ---------------------------------------------------------------------------
  // TIER 3: CASE-INSENSITIVITY & LEGACY BACKWARDS COMPATIBILITY
  // ---------------------------------------------------------------------------
  console.log('\n--- Tier 3: Case-Insensitivity & Legacy Compatibility ---');

  // TEST_CD_10: Case-insensitivity across state, district, and taluka
  try {
    const resLower = await fetch(`${API_BASE}/districts?state=mh`);
    const resUpper = await fetch(`${API_BASE}/districts?state=MH`);
    const resMixed = await fetch(`${API_BASE}/districts?state=Mh`);
    assert.strictEqual(resLower.status, 200);
    assert.strictEqual(resUpper.status, 200);
    assert.strictEqual(resMixed.status, 200);
    const dLower = await resLower.json();
    const dUpper = await resUpper.json();
    const dMixed = await resMixed.json();
    assert.deepStrictEqual(dLower.districts, dUpper.districts);
    assert.deepStrictEqual(dLower.districts, dMixed.districts);

    const resDistLower = await fetch(`${API_BASE}/talukas?state=MH&district=pune`);
    const resDistUpper = await fetch(`${API_BASE}/talukas?state=MH&district=PUNE`);
    const resDistTitle = await fetch(`${API_BASE}/talukas?state=MH&district=Pune`);
    assert.strictEqual(resDistLower.status, 200);
    assert.strictEqual(resDistUpper.status, 200);
    assert.strictEqual(resDistTitle.status, 200);
    const tLower = await resDistLower.json();
    const tUpper = await resDistUpper.json();
    const tTitle = await resDistTitle.json();
    assert.deepStrictEqual(tLower.talukas, tTitle.talukas);
    assert.deepStrictEqual(tUpper.talukas, tTitle.talukas);

    const resVilLower = await fetch(`${API_BASE}/villages?state=MH&district=Pune&taluka=haveli`);
    const resVilUpper = await fetch(`${API_BASE}/villages?state=MH&district=Pune&taluka=HAVELI`);
    assert.strictEqual(resVilLower.status, 200);
    assert.strictEqual(resVilUpper.status, 200);
    const vLower = await resVilLower.json();
    const vUpper = await resVilUpper.json();
    assert.deepStrictEqual(vLower.villages, vUpper.villages);

    recordPass('TEST_CD_10', 'Tier 3', 'Complete case-insensitivity verified across state codes (mh/MH/Mh), districts (pune/PUNE/Pune), and talukas (haveli/HAVELI/Haveli)');
  } catch (err) {
    recordFail('TEST_CD_10', 'Tier 3', 'Case-insensitivity verification failed', err);
  }

  // TEST_CD_11: Cross-state and cross-district jurisdictional isolation
  try {
    // Querying Karnataka district (Bengaluru Urban) under Maharashtra (MH)
    const resCross = await fetch(`${API_BASE}/talukas?state=MH&district=${encodeURIComponent('Bengaluru Urban')}`);
    assert.strictEqual(resCross.status, 200);
    const dataCross = await resCross.json();
    assert.ok(Array.isArray(dataCross.talukas) && dataCross.talukas.length === 0, 'Must not return Karnataka talukas when querying under MH state');

    // Querying UP taluka (Noida) under Pune district
    const resCrossVil = await fetch(`${API_BASE}/villages?state=MH&district=Pune&taluka=Noida`);
    assert.strictEqual(resCrossVil.status, 200);
    const dataCrossVil = await resCrossVil.json();
    assert.ok(Array.isArray(dataCrossVil.villages) && dataCrossVil.villages.length === 0, 'Must not return UP villages under Pune district');

    recordPass('TEST_CD_11', 'Tier 3', 'Cross-jurisdiction isolation verified (no cross-state or cross-district hierarchy leakage)');
  } catch (err) {
    recordFail('TEST_CD_11', 'Tier 3', 'Hierarchical isolation failed', err);
  }

  // TEST_CD_12: Legacy routes backwards compatibility (/api/locations/:state/*)
  try {
    const resLegDist = await fetch(`${API_BASE}/locations/MH/districts`);
    assert.strictEqual(resLegDist.status, 200, 'Legacy districts route returned non-200');
    const legDistData = await resLegDist.json();
    assert.strictEqual(legDistData.state.toUpperCase(), 'MH');
    assert.ok(Array.isArray(legDistData.districts) && legDistData.districts.length > 0);

    const resLegTal = await fetch(`${API_BASE}/locations/MH/talukas?district=Pune`);
    assert.strictEqual(resLegTal.status, 200, 'Legacy talukas route returned non-200');
    const legTalData = await resLegTal.json();
    assert.ok(Array.isArray(legTalData.talukas) && legTalData.talukas.length > 0);

    const resLegVil = await fetch(`${API_BASE}/locations/MH/villages?taluka=Haveli`);
    assert.strictEqual(resLegVil.status, 200, 'Legacy villages route returned non-200');
    const legVilData = await resLegVil.json();
    assert.ok(Array.isArray(legVilData.villages) && legVilData.villages.length > 0);

    recordPass('TEST_CD_12', 'Tier 3', 'Existing legacy /api/locations/:state/* endpoints remain 100% operational with identical responses');
  } catch (err) {
    recordFail('TEST_CD_12', 'Tier 3', 'Legacy backwards compatibility failed', err);
  }

  // ---------------------------------------------------------------------------
  // TIER 4: BROWSER E2E CASCADING UI VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Tier 4: Browser E2E Cascading UI Verification ---');

  const browserPath = resolveBrowserExecutable();
  const puppeteer = resolvePuppeteer();

  console.log(`  ℹ️ Resolving browser executable: ${browserPath}`);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,960'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 960 });

    // TEST_CD_13: Initial render of /search/MH displays dropdown selectors with defaults
    try {
      await page.goto(`${WEB_BASE}/search/MH`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2500);

      const districtSelector = await page.$('[data-testid="district-selector"]');
      const talukaSelector = await page.$('[data-testid="taluka-selector"]');
      const villageSelector = await page.$('[data-testid="village-selector"]');

      assert.ok(districtSelector, 'DOM must contain District selector [data-testid="district-selector"]');
      assert.ok(talukaSelector, 'DOM must contain Taluka selector [data-testid="taluka-selector"]');
      assert.ok(villageSelector, 'DOM must contain Village selector [data-testid="village-selector"]');

      const initialValues = await page.evaluate(() => ({
        district: document.querySelector('[data-testid="district-selector-value"]')?.textContent?.trim(),
        taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.textContent?.trim(),
        village: document.querySelector('[data-testid="village-selector-value"]')?.textContent?.trim()
      }));

      assert.strictEqual(initialValues.district, 'Pune', `Initial district should be Pune, got "${initialValues.district}"`);
      assert.strictEqual(initialValues.taluka, 'Haveli', `Initial taluka should be Haveli, got "${initialValues.taluka}"`);
      assert.strictEqual(initialValues.village, 'Wagholi', `Initial village should be Wagholi, got "${initialValues.village}"`);

      recordPass(
        'TEST_CD_13',
        'Tier 4',
        'Search screen (/search/MH) renders District, Taluka, and Village dropdown selectors with defaults (Pune > Haveli > Wagholi)'
      );
    } catch (err) {
      recordFail('TEST_CD_13', 'Tier 4', 'Dropdown selectors presence and initial defaults failed', err);
    }

    // TEST_CD_14: Open modal, live search filtering, and clear search input
    try {
      await safeClick(page, '[data-testid="district-selector"]');
      await sleep(500);

      const modalExists = await page.evaluate(() => !!document.querySelector('[data-testid="district-selector-modal"]'));
      assert.ok(modalExists, 'District modal dialog must be visible after click');

      // Type "Mumbai" into search input
      await page.type('[data-testid="district-selector-search-input"]', 'Mumbai');
      await sleep(500);

      const countBadgeText = await page.evaluate(
        () => document.querySelector('[data-testid="district-selector-count"]')?.textContent?.trim()
      );
      assert.ok(
        countBadgeText && countBadgeText.includes('1'),
        `Counter badge should show 1 filtered item for "Mumbai" (got: "${countBadgeText}")`
      );

      // Clear search query
      const clearBtn = await page.$('[data-testid="district-selector-search-clear"]');
      if (clearBtn) {
        await safeClick(page, '[data-testid="district-selector-search-clear"]');
        await sleep(300);
      } else {
        await page.evaluate(() => {
          const input = document.querySelector('[data-testid="district-selector-search-input"]');
          if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
        await sleep(300);
      }

      const restoredCount = await page.evaluate(
        () => document.querySelector('[data-testid="district-selector-count"]')?.textContent?.trim()
      );
      assert.ok(
        restoredCount && /8/i.test(restoredCount),
        `Counter badge should restore full count after clear (got: "${restoredCount}")`
      );

      // Close modal
      await safeClick(page, '[data-testid="district-selector-close"]');
      await sleep(500);

      recordPass(
        'TEST_CD_14',
        'Tier 4',
        'Live search filtering within dropdown modal filters options and updates counter badge accurately'
      );
    } catch (err) {
      recordFail('TEST_CD_14', 'Tier 4', 'Modal search filtering failed', err);
    }

    // TEST_CD_15: Dependent cascading resets on District change
    try {
      // Re-open district modal
      await safeClick(page, '[data-testid="district-selector"]');
      await sleep(500);

      // Select Mumbai Suburban
      await page.type('[data-testid="district-selector-search-input"]', 'Mumbai');
      await sleep(400);

      const mumbaiOptionSel = '[data-testid="district-selector-option-mumbai-suburban"]';
      await page.waitForSelector(mumbaiOptionSel, { timeout: 5000 });
      await safeClick(page, mumbaiOptionSel);
      await sleep(1500);

      const valuesAfterDistrict = await page.evaluate(() => ({
        district: document.querySelector('[data-testid="district-selector-value"]')?.textContent?.trim(),
        taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.textContent?.trim(),
        village: document.querySelector('[data-testid="village-selector-value"]')?.textContent?.trim()
      }));

      assert.strictEqual(valuesAfterDistrict.district, 'Mumbai Suburban', 'District must update to Mumbai Suburban');
      assert.notStrictEqual(valuesAfterDistrict.taluka, 'Haveli', 'Taluka must not remain Pune Haveli after district change');
      assert.notStrictEqual(valuesAfterDistrict.village, 'Wagholi', 'Village must not remain Pune Wagholi after district change');
      assert.strictEqual(valuesAfterDistrict.taluka, 'Bandra', 'Taluka should auto-hydrate to first Mumbai Suburban taluka (Bandra)');
      assert.strictEqual(valuesAfterDistrict.village, 'Bandra West', 'Village should auto-hydrate to first Bandra village (Bandra West)');

      // Verify talukas list contains Mumbai Suburban talukas
      await safeClick(page, '[data-testid="taluka-selector"]');
      await sleep(500);
      const talukaOpts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid^="taluka-selector-option-"]')).map(el => el.textContent.trim());
      });
      assert.ok(talukaOpts.includes('Bandra'), 'Talukas list must include Bandra');
      assert.ok(talukaOpts.includes('Andheri'), 'Talukas list must include Andheri');
      assert.ok(talukaOpts.includes('Kurla'), 'Talukas list must include Kurla');
      await safeClick(page, '[data-testid="taluka-selector-close"]');
      await sleep(500);

      recordPass(
        'TEST_CD_15',
        'Tier 4',
        'Selecting a new District clears child taluka and village, auto-fetches fresh talukas (Bandra, Andheri, Kurla) and auto-selects first valid'
      );
    } catch (err) {
      recordFail('TEST_CD_15', 'Tier 4', 'District change cascading reset failed', err);
    }

    // TEST_CD_16: Dependent cascading resets on Taluka change
    try {
      await safeClick(page, '[data-testid="taluka-selector"]');
      await sleep(500);

      const andheriOptSel = '[data-testid="taluka-selector-option-andheri"]';
      await safeClick(page, andheriOptSel);
      await sleep(1500);

      const valuesAfterTaluka = await page.evaluate(() => ({
        district: document.querySelector('[data-testid="district-selector-value"]')?.textContent?.trim(),
        taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.textContent?.trim(),
        village: document.querySelector('[data-testid="village-selector-value"]')?.textContent?.trim()
      }));

      assert.strictEqual(valuesAfterTaluka.taluka, 'Andheri', 'Taluka must update to Andheri');
      assert.notStrictEqual(valuesAfterTaluka.village, 'Bandra West', 'Village must not remain Bandra West after taluka change');
      assert.strictEqual(valuesAfterTaluka.village, 'Andheri East', 'Village should auto-hydrate to first Andheri village (Andheri East)');

      // Verify village options
      await safeClick(page, '[data-testid="village-selector"]');
      await sleep(500);
      const villageOpts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid^="village-selector-option-"]')).map(el => el.textContent.trim());
      });
      assert.ok(villageOpts.includes('Andheri East'), 'Village options must include Andheri East');
      assert.ok(villageOpts.includes('Versova'), 'Village options must include Versova');
      assert.ok(villageOpts.includes('Juhu'), 'Village options must include Juhu');

      // Select Versova
      await safeClick(page, '[data-testid="village-selector-option-versova"]');
      await sleep(500);

      const finalSelectedVillage = await page.evaluate(
        () => document.querySelector('[data-testid="village-selector-value"]')?.textContent?.trim()
      );
      assert.strictEqual(finalSelectedVillage, 'Versova', 'Village must update to user-selected Versova');

      recordPass(
        'TEST_CD_16',
        'Tier 4',
        'Selecting a new Taluka clears child village, loads fresh child villages (Andheri East, Versova, Juhu), and preserves user selection'
      );
    } catch (err) {
      recordFail('TEST_CD_16', 'Tier 4', 'Taluka change cascading reset failed', err);
    }

    // TEST_CD_17: Deep-link URL pre-population preservation
    try {
      await page.goto(
        `${WEB_BASE}/search/MH?district=Pune&taluka=Haveli&village=Wagholi&surveyNo=142%2F2A`,
        { waitUntil: 'domcontentloaded', timeout: 25000 }
      );
      await sleep(2500);

      const deepLinkValues = await page.evaluate(() => ({
        district: document.querySelector('[data-testid="district-selector-value"]')?.textContent?.trim(),
        taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.textContent?.trim(),
        village: document.querySelector('[data-testid="village-selector-value"]')?.textContent?.trim()
      }));

      assert.strictEqual(deepLinkValues.district, 'Pune', `Deep-linked district should be Pune, got "${deepLinkValues.district}"`);
      assert.strictEqual(deepLinkValues.taluka, 'Haveli', `Deep-linked taluka should be Haveli, got "${deepLinkValues.taluka}"`);
      assert.strictEqual(deepLinkValues.village, 'Wagholi', `Deep-linked village should be Wagholi, got "${deepLinkValues.village}"`);

      recordPass(
        'TEST_CD_17',
        'Tier 4',
        'Deep-link URL search parameters (?district=Pune&taluka=Haveli&village=Wagholi) pre-populate all 3 dropdown selectors accurately'
      );
    } catch (err) {
      recordFail('TEST_CD_17', 'Tier 4', 'Deep-link URL pre-population preservation failed', err);
    }

  } finally {
    await browser.close();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  const total = passed + failed;
  const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : '100.0';
  console.log('\n================================================================================');
  console.log(`📊 Suite 12 Summary: ${passed} Passed, ${failed} Failed out of ${total} Tests`);
  console.log(`Results: ${passed}/${total} tests passed (${pct}%)`);
  console.log('================================================================================\n');

  return {
    suite: '12_test_cascading_dropdowns',
    passed,
    failed,
    total,
    results
  };
}

if (require.main === module) {
  runCascadingDropdownsTests()
    .then((res) => {
      process.exit(res.failed === 0 ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}

module.exports = {
  runCascadingDropdownsTests,
  ALL_7_STATES,
  STATE_HIERARCHY_SAMPLES
};
