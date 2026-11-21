/**
 * Forensic Integrity Verification Test for Milestone 2:
 * Landeed 2.0 Cascading Dropdown Selectors & Location Hierarchy
 * 
 * Verifies:
 * 1. Component static analysis & genuine React Native primitives (Modal, TextInput, FlatList, TouchableOpacity)
 * 2. Dynamic client-side search filtering logic in LocationDropdownSelector
 * 3. Live Browser E2E interaction via Puppeteer against http://localhost:8081/search/MH
 * 4. Dynamic cascading resets on District and Taluka changes
 * 5. URL parameter deep-link hydration and subsequent manual override reset behavior
 * 6. Absence of hardcoded test results, facade shortcuts, or mock bypasses
 */

const fs = require('fs');
const path = require('path');
const { resolveBrowserExecutable, resolvePuppeteer } = require('./helpers/browserResolver');

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:8081';
const API_URL = process.env.TEST_API_URL || 'http://localhost:4000';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: []
};

function assert(condition, testId, description, details = {}) {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
  } else {
    results.failed++;
    console.error(`  ❌ [FAIL] ${testId}: ${description}`);
    if (Object.keys(details).length > 0) {
      console.error(`     Details:`, JSON.stringify(details, null, 2));
    }
    results.findings.push({ testId, description, details });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runForensicAudit() {
  console.log(`\n================================================================================`);
  console.log(`🔍 FORENSIC INTEGRITY AUDIT: MILESTONE 2 CASCADING DROPDOWNS`);
  console.log(`================================================================================\n`);

  // -------------------------------------------------------------------------
  // PHASE 1: Static Code Forensics & Anti-Cheat Analysis
  // -------------------------------------------------------------------------
  console.log(`--- PHASE 1: Static Code Forensics & Anti-Cheat Analysis ---`);
  
  const componentPath = path.join(__dirname, '..', 'app', 'components', 'LocationDropdownSelector.tsx');
  const searchScreenPath = path.join(__dirname, '..', 'app', 'app', 'search', '[state].tsx');

  assert(fs.existsSync(componentPath), 'CHK_STATIC_01', 'LocationDropdownSelector.tsx exists in app/components');
  assert(fs.existsSync(searchScreenPath), 'CHK_STATIC_02', 'search/[state].tsx exists in app/app/search');

  const componentCode = fs.readFileSync(componentPath, 'utf8');
  const searchScreenCode = fs.readFileSync(searchScreenPath, 'utf8');

  // Verify genuine React Native primitives (not dummy divs or static text)
  assert(
    componentCode.includes("import {") &&
    componentCode.includes("Modal") &&
    componentCode.includes("TextInput") &&
    componentCode.includes("FlatList") &&
    componentCode.includes("TouchableOpacity"),
    'CHK_STATIC_03',
    'LocationDropdownSelector imports authentic React Native primitives (Modal, TextInput, FlatList, TouchableOpacity)'
  );

  // Verify dynamic search filtering with useMemo
  assert(
    componentCode.includes("useMemo") &&
    componentCode.includes(".filter") &&
    componentCode.includes(".toLowerCase().includes(query)"),
    'CHK_STATIC_04',
    'LocationDropdownSelector contains genuine dynamic filtering logic via useMemo and string inclusion'
  );

  // Check for test mock circumventions / hardcoded outputs
  const suspiciousPatterns = [
    /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]test['"]\s*\)/,
    /return\s+\[\s*['"]Pune['"]\s*,\s*['"]Haveli['"]\s*,\s*['"]Wagholi['"]\s*\]/,
    /window\.__MOCK_/,
    /__TEST_BYPASS__/
  ];

  let hasSuspiciousPattern = false;
  for (const pat of suspiciousPatterns) {
    if (pat.test(componentCode) || pat.test(searchScreenCode)) {
      hasSuspiciousPattern = true;
      break;
    }
  }
  assert(!hasSuspiciousPattern, 'CHK_STATIC_05', 'No mock bypasses or hardcoded test shortcuts detected in source');

  // Verify search screen uses all 3 dropdown selectors
  const hasDistrictSelector = searchScreenCode.includes('label="District"') && searchScreenCode.includes('testID="district-selector"');
  const hasTalukaSelector = searchScreenCode.includes('label="Taluka / Mandal / Tehsil"') && searchScreenCode.includes('testID="taluka-selector"');
  const hasVillageSelector = searchScreenCode.includes('label="Village / Mauje"') && searchScreenCode.includes('testID="village-selector"');

  assert(hasDistrictSelector && hasTalukaSelector && hasVillageSelector, 'CHK_STATIC_06', 'search/[state].tsx integrates District, Taluka, and Village LocationDropdownSelector components');

  // Verify cascading reset handlers exist
  assert(
    searchScreenCode.includes('handleSelectDistrict') &&
    searchScreenCode.includes("setTaluka('')") &&
    searchScreenCode.includes("setVillage('')") &&
    searchScreenCode.includes("setTalukasList([])") &&
    searchScreenCode.includes("setVillagesList([])"),
    'CHK_STATIC_07',
    'handleSelectDistrict resets taluka, village, talukasList, and villagesList'
  );

  assert(
    searchScreenCode.includes('handleSelectTaluka') &&
    searchScreenCode.includes("setVillage('')") &&
    searchScreenCode.includes("setVillagesList([])"),
    'CHK_STATIC_08',
    'handleSelectTaluka resets village and villagesList'
  );

  // Verify URL hydration logic uses pendingParamsRef
  assert(
    searchScreenCode.includes('pendingParamsRef') &&
    searchScreenCode.includes('params.district') &&
    searchScreenCode.includes('params.taluka') &&
    searchScreenCode.includes('params.village'),
    'CHK_STATIC_09',
    'search/[state].tsx preserves deep-link parameters via pendingParamsRef without breaking subsequent resets'
  );

  // -------------------------------------------------------------------------
  // PHASE 2: Live Browser E2E Interaction & Behavioral Forensics
  // -------------------------------------------------------------------------
  console.log(`\n--- PHASE 2: Live Browser E2E Interaction & Behavioral Forensics ---`);

  const browserPath = resolveBrowserExecutable();
  const puppeteer = resolvePuppeteer();

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Navigate to /search/MH
    console.log(`  Navigating to ${APP_URL}/search/MH...`);
    await page.goto(`${APP_URL}/search/MH`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);

    // Verify selectors rendered on page
    const districtSelector = await page.$('[data-testid="district-selector"]');
    const talukaSelector = await page.$('[data-testid="taluka-selector"]');
    const villageSelector = await page.$('[data-testid="village-selector"]');

    assert(!!districtSelector, 'CHK_E2E_01', 'District dropdown selector rendered in DOM');
    assert(!!talukaSelector, 'CHK_E2E_02', 'Taluka dropdown selector rendered in DOM');
    assert(!!villageSelector, 'CHK_E2E_03', 'Village dropdown selector rendered in DOM');

    // Check initial values (default Maharashtra: Pune -> Haveli -> Wagholi)
    const initialDistrict = await page.$eval('[data-testid="district-selector-value"]', el => el.textContent.trim());
    const initialTaluka = await page.$eval('[data-testid="taluka-selector-value"]', el => el.textContent.trim());
    const initialVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());

    assert(initialDistrict === 'Pune', 'CHK_E2E_04', `Initial district loaded from backend: "${initialDistrict}" (expected Pune)`);
    assert(initialTaluka === 'Haveli', 'CHK_E2E_05', `Initial taluka cascaded from backend: "${initialTaluka}" (expected Haveli)`);
    assert(initialVillage === 'Wagholi', 'CHK_E2E_06', `Initial village cascaded from backend: "${initialVillage}" (expected Wagholi)`);

    // 2. Open District Modal and test search filtering
    console.log(`  Opening District dropdown modal...`);
    await districtSelector.click();
    await sleep(600);

    const districtModal = await page.$('[data-testid="district-selector-modal"]');
    assert(!!districtModal, 'CHK_E2E_07', 'District selection modal opened on click');

    const searchInput = await page.$('[data-testid="district-selector-search-input"]');
    assert(!!searchInput, 'CHK_E2E_08', 'District search input exists in modal');

    // Type "kol" to filter down to Kolhapur
    await searchInput.type('kol');
    await sleep(400);

    const countText = await page.$eval('[data-testid="district-selector-count"]', el => el.textContent.trim());
    assert(countText.includes('Showing 1 of'), 'CHK_E2E_09', `Dynamic search filter active: count badge shows "${countText}"`);

    const kolhapurOption = await page.$('[data-testid="district-selector-option-kolhapur"]');
    assert(!!kolhapurOption, 'CHK_E2E_10', 'Filtered option "Kolhapur" is visible in list');

    // Select Kolhapur
    console.log(`  Selecting Kolhapur...`);
    await kolhapurOption.click();
    await sleep(1500);

    // Verify District updated and Taluka cascaded
    const updatedDistrict = await page.$eval('[data-testid="district-selector-value"]', el => el.textContent.trim());
    assert(updatedDistrict === 'Kolhapur', 'CHK_E2E_11', `District updated to "${updatedDistrict}"`);

    const cascadedTaluka = await page.$eval('[data-testid="taluka-selector-value"]', el => el.textContent.trim());
    assert(cascadedTaluka === 'Karvir', 'CHK_E2E_12', `Taluka automatically cascaded to Kolhapur\'s first taluka: "${cascadedTaluka}"`);

    const cascadedVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());
    assert(cascadedVillage === 'Bavni' || cascadedVillage.length > 0, 'CHK_E2E_13', `Village automatically cascaded to Karvir\'s village: "${cascadedVillage}"`);

    // 3. Test Taluka Modal & Search Filtering
    console.log(`  Opening Taluka dropdown modal...`);
    await talukaSelector.click();
    await sleep(600);

    const talukaSearchInput = await page.$('[data-testid="taluka-selector-search-input"]');
    assert(!!talukaSearchInput, 'CHK_E2E_14', 'Taluka search input exists in modal');

    await talukaSearchInput.type('hat');
    await sleep(400);

    const hatkanangaleOption = await page.$('[data-testid="taluka-selector-option-hatkanangale"]');
    assert(!!hatkanangaleOption, 'CHK_E2E_15', 'Taluka search filter finds "Hatkanangale"');

    await hatkanangaleOption.click();
    await sleep(1500);

    const selectedTaluka = await page.$eval('[data-testid="taluka-selector-value"]', el => el.textContent.trim());
    assert(selectedTaluka === 'Hatkanangale', 'CHK_E2E_16', `Taluka updated to "${selectedTaluka}"`);

    const hatkanangaleVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());
    assert(hatkanangaleVillage === 'Ichalkaranji' || hatkanangaleVillage.length > 0, 'CHK_E2E_17', `Village cascaded to Hatkanangale\'s village: "${hatkanangaleVillage}"`);

    // 4. Test Village Modal & Search Filtering
    console.log(`  Opening Village dropdown modal...`);
    await villageSelector.click();
    await sleep(600);

    const villageSearchInput = await page.$('[data-testid="village-selector-search-input"]');
    assert(!!villageSearchInput, 'CHK_E2E_18', 'Village search input exists in modal');

    // Type non-existent query to test empty state
    await villageSearchInput.type('XYZNONEXISTENT999');
    await sleep(400);

    const emptyContainer = await page.$('[data-testid="village-selector-empty"]');
    assert(!!emptyContainer, 'CHK_E2E_19', 'Empty search state correctly rendered when no options match filter');

    // Clear search
    await page.click('[data-testid="village-selector-search-clear"]');
    await sleep(400);

    // Select first option
    const firstVillageOpt = await page.$('[data-testid*="village-selector-option-"]');
    const firstVillageName = await page.evaluate(el => el.textContent.trim(), firstVillageOpt);
    await firstVillageOpt.click();
    await sleep(600);

    const finalVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());
    assert(finalVillage === firstVillageName, 'CHK_E2E_20', `Village selection updated to "${finalVillage}"`);

    // 5. Test Deep-Link Hydration
    console.log(`  Testing deep-link parameter hydration on /search/MH?district=Nashik&taluka=Sinnar&village=Musalgaon...`);
    await page.goto(`${APP_URL}/search/MH?district=Nashik&taluka=Sinnar&village=Musalgaon`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);

    const hydratedDistrict = await page.$eval('[data-testid="district-selector-value"]', el => el.textContent.trim());
    const hydratedTaluka = await page.$eval('[data-testid="taluka-selector-value"]', el => el.textContent.trim());
    const hydratedVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());

    assert(hydratedDistrict === 'Nashik', 'CHK_E2E_21', `Deep-linked district hydrated: "${hydratedDistrict}" (expected Nashik)`);
    assert(hydratedTaluka === 'Sinnar', 'CHK_E2E_22', `Deep-linked taluka hydrated: "${hydratedTaluka}" (expected Sinnar)`);
    assert(hydratedVillage === 'Musalgaon', 'CHK_E2E_23', `Deep-linked village hydrated: "${hydratedVillage}" (expected Musalgaon)`);

    // 6. Test Manual User Override after Deep-Link Hydration (Ensures child fields reset cleanly)
    console.log(`  Changing District to Pune after hydration to verify clean cascading reset...`);
    const hydratedDistrictSelector = await page.$('[data-testid="district-selector"]');
    await hydratedDistrictSelector.click();
    await sleep(600);

    const hydSearch = await page.$('[data-testid="district-selector-search-input"]');
    await hydSearch.type('pune');
    await sleep(400);

    const puneOpt = await page.$('[data-testid="district-selector-option-pune"]');
    await puneOpt.click();
    await sleep(1500);

    const resetDistrict = await page.$eval('[data-testid="district-selector-value"]', el => el.textContent.trim());
    const resetTaluka = await page.$eval('[data-testid="taluka-selector-value"]', el => el.textContent.trim());
    const resetVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());

    assert(resetDistrict === 'Pune', 'CHK_E2E_24', `District updated to "${resetDistrict}"`);
    assert(resetTaluka !== 'Sinnar', 'CHK_E2E_25', `Taluka "Sinnar" was cleanly reset and replaced by Pune taluka: "${resetTaluka}"`);
    assert(resetVillage !== 'Musalgaon', 'CHK_E2E_26', `Village "Musalgaon" was cleanly reset and replaced by Pune village: "${resetVillage}"`);

    // 7. Test Multi-State Cascading (KA, TG, UP)
    console.log(`  Testing multi-state cascading on /search/KA...`);
    await page.goto(`${APP_URL}/search/KA`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);

    const kaDistrict = await page.$eval('[data-testid="district-selector-value"]', el => el.textContent.trim());
    const kaTaluka = await page.$eval('[data-testid="taluka-selector-value"]', el => el.textContent.trim());
    const kaVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());

    assert(kaDistrict === 'Bengaluru Urban', 'CHK_E2E_27', `Karnataka district loaded: "${kaDistrict}"`);
    assert(kaTaluka === 'Bengaluru South', 'CHK_E2E_28', `Karnataka taluka cascaded: "${kaTaluka}"`);
    assert(kaVillage === 'Electronic City', 'CHK_E2E_29', `Karnataka village cascaded: "${kaVillage}"`);

    console.log(`  Testing multi-state cascading on /search/TG...`);
    await page.goto(`${APP_URL}/search/TG`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);

    const tgDistrict = await page.$eval('[data-testid="district-selector-value"]', el => el.textContent.trim());
    const tgTaluka = await page.$eval('[data-testid="taluka-selector-value"]', el => el.textContent.trim());
    const tgVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());

    assert(tgDistrict === 'Hyderabad' || tgDistrict === 'Rangareddy', 'CHK_E2E_30', `Telangana district loaded: "${tgDistrict}"`);
    assert(tgTaluka.length > 0, 'CHK_E2E_31', `Telangana taluka cascaded: "${tgTaluka}"`);
    assert(tgVillage.length > 0, 'CHK_E2E_32', `Telangana village cascaded: "${tgVillage}"`);

    console.log(`  Testing multi-state cascading on /search/UP...`);
    await page.goto(`${APP_URL}/search/UP`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);

    const upDistrict = await page.$eval('[data-testid="district-selector-value"]', el => el.textContent.trim());
    const upTaluka = await page.$eval('[data-testid="taluka-selector-value"]', el => el.textContent.trim());
    const upVillage = await page.$eval('[data-testid="village-selector-value"]', el => el.textContent.trim());

    assert(upDistrict.includes('Noida') || upDistrict.includes('Gautam Buddha Nagar') || upDistrict === 'Lucknow', 'CHK_E2E_33', `UP district loaded: "${upDistrict}"`);
    assert(upTaluka.length > 0, 'CHK_E2E_34', `UP taluka cascaded: "${upTaluka}"`);
    assert(upVillage.length > 0, 'CHK_E2E_35', `UP village cascaded: "${upVillage}"`);

  } catch (err) {
    console.error('Fatal error during E2E browser audit:', err);
    assert(false, 'CHK_E2E_FATAL', 'E2E browser audit encountered unexpected error', { error: err.message, stack: err.stack });
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------------------
  // AUDIT SUMMARY & VERDICT
  // -------------------------------------------------------------------------
  console.log(`\n================================================================================`);
  console.log(`📊 FORENSIC AUDIT RESULTS:`);
  console.log(`   Total Checks:  ${results.total}`);
  console.log(`   Passed:        ${results.passed}`);
  console.log(`   Failed:        ${results.failed}`);
  console.log(`   Verdict:       ${results.failed === 0 ? '🟢 CLEAN' : '🔴 INTEGRITY VIOLATION'}`);
  console.log(`================================================================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runForensicAudit().catch(err => {
  console.error('Audit runner error:', err);
  process.exit(1);
});
