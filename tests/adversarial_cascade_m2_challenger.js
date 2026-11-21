/**
 * Landeed 2.0 Adversarial Test Harness: Milestone 2 Cascading Dropdown Selectors
 * Empirical Challenger Verification Suite
 * 
 * Verifies:
 * 1. Modal Lifecycle & Search Filtering: open/close, live query filtering, case insensitivity, clear button, empty state, backdrop dismiss
 * 2. Cascading Invariants: District change resets taluka & village, fetches new talukas & villages
 * 3. Taluka Invariants: Taluka change resets village, fetches new villages
 * 4. Deep-Link Hydration & Invalidation: URL parameters hydrate correctly and subsequent user actions cascade
 * 5. Adversarial Stress & Edge Cases: regex metacharacters in search, whitespace, rapid switching stress
 * 6. Responsive Web Design: desktop (1280x900), tablet (768x1024), mobile (375x812) layout bounding
 * 7. Multi-State Coverage: /search/KA hierarchy verification
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

async function runAdversarialCascadeM2Tests() {
  console.log('========================================================================');
  console.log('⚔️  CHALLENGER 1: Landeed 2.0 Cascading Dropdown Selectors Verification');
  console.log('========================================================================');
  console.log(`Browser Executable: ${BROWSER_PATH}`);

  let passed = 0;
  let failed = 0;
  const results = [];

  function recordPass(testId, description, details = null) {
    passed++;
    results.push({ id: testId, status: 'PASS', description, details });
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
    if (details) console.log(`     ↳ ${JSON.stringify(details)}`);
  }

  function recordFail(testId, description, error) {
    failed++;
    const errMsg = error ? (error.message || String(error)) : 'Assertion failed';
    results.push({ id: testId, status: 'FAIL', description, error: errMsg });
    console.log(`  ❌ [FAIL] ${testId}: ${description}`);
    console.log(`     ↳ Error: ${errMsg}`);
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: BROWSER_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,900'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Enable console log capture from page for unhandled errors
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // -------------------------------------------------------------------------
    // SUITE 1: MODAL LIFECYCLE, LIVE SEARCH FILTERING & ITEM SELECTION
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 1: Modal Lifecycle, Live Search Filtering & Selection ---');

    await page.goto('http://localhost:8081/search/MH', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1500);

    // TEST_C2_01: District Modal Open & DOM Elements
    try {
      await page.evaluate(() => document.querySelector('[data-testid="district-selector"]').click());
      await sleep(400);

      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="district-selector-modal"]');
        const input = document.querySelector('[data-testid="district-selector-search-input"]');
        const count = document.querySelector('[data-testid="district-selector-count"]')?.innerText;
        const closeBtn = document.querySelector('[data-testid="district-selector-close"]');
        const backdrop = document.querySelector('[data-testid="district-selector-backdrop"]');
        const options = Array.from(document.querySelectorAll('[data-testid^="district-selector-option-"]')).map(e => e.innerText.trim());
        return {
          hasModal: !!modal,
          hasInput: !!input,
          hasCount: !!count,
          hasCloseBtn: !!closeBtn,
          hasBackdrop: !!backdrop,
          countText: count,
          optionsCount: options.length,
          options
        };
      });

      assert.ok(modalInfo.hasModal, 'Modal sheet element must be present in DOM');
      assert.ok(modalInfo.hasInput, 'Search input element must be present in DOM');
      assert.ok(modalInfo.hasCloseBtn, 'Close button must be present in DOM');
      assert.ok(modalInfo.hasBackdrop, 'Backdrop element must be present in DOM');
      assert.strictEqual(modalInfo.optionsCount, 8, 'Maharashtra must provide 8 districts');
      assert.ok(modalInfo.countText.includes('Showing 8 of 8'), `Count badge should display 8 of 8, got ${modalInfo.countText}`);

      recordPass('TEST_C2_01', 'District modal opened with complete DOM structure, search input, count badge, and 8 options', { optionsCount: modalInfo.optionsCount });
    } catch (err) {
      recordFail('TEST_C2_01', 'District modal failed to open or missing elements', err);
    }

    // TEST_C2_02: Live Search Filtering
    try {
      await page.type('[data-testid="district-selector-search-input"]', 'tha');
      await sleep(300);

      const searchState = await page.evaluate(() => {
        const count = document.querySelector('[data-testid="district-selector-count"]')?.innerText;
        const options = Array.from(document.querySelectorAll('[data-testid^="district-selector-option-"]')).map(e => e.innerText.trim());
        return { count, options };
      });

      assert.strictEqual(searchState.options.length, 1, 'Only Thane should match search query "tha"');
      assert.strictEqual(searchState.options[0], 'Thane', 'Matching option must be Thane');
      assert.ok(searchState.count.includes('Showing 1 of 8'), 'Count badge must reflect filtered count');

      recordPass('TEST_C2_02', 'Live search filtering narrowed 8 districts to Thane with accurate counter', searchState);
    } catch (err) {
      recordFail('TEST_C2_02', 'Live search filtering failed', err);
    }

    // TEST_C2_03: Case-Insensitive Search
    try {
      // Clear previous and type mixed case
      await page.evaluate(() => {
        const input = document.querySelector('[data-testid="district-selector-search-input"]');
        input.value = '';
      });
      await page.type('[data-testid="district-selector-search-input"]', 'kOLhApUr');
      await sleep(300);

      const caseResult = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('[data-testid^="district-selector-option-"]')).map(e => e.innerText.trim());
        return options;
      });

      assert.strictEqual(caseResult.length, 1, 'Case-insensitive query "kOLhApUr" should match exactly 1');
      assert.strictEqual(caseResult[0], 'Kolhapur', 'Matched district must be Kolhapur');

      recordPass('TEST_C2_03', 'Case-insensitive search query "kOLhApUr" correctly matched Kolhapur');
    } catch (err) {
      recordFail('TEST_C2_03', 'Case-insensitive search failed', err);
    }

    // TEST_C2_04: Search Clear Button
    try {
      const clearBtn = await page.$('[data-testid="district-selector-search-clear"]');
      assert.ok(clearBtn, 'Clear button must be visible when input has text');

      await page.evaluate(() => document.querySelector('[data-testid="district-selector-search-clear"]').click());
      await sleep(300);

      const restoredState = await page.evaluate(() => {
        const inputVal = document.querySelector('[data-testid="district-selector-search-input"]').value;
        const count = document.querySelector('[data-testid="district-selector-count"]')?.innerText;
        const options = Array.from(document.querySelectorAll('[data-testid^="district-selector-option-"]')).map(e => e.innerText.trim());
        return { inputVal, count, optionsCount: options.length };
      });

      assert.strictEqual(restoredState.inputVal, '', 'Search input must be empty after clear button click');
      assert.strictEqual(restoredState.optionsCount, 8, 'All 8 options must be restored after clear');

      recordPass('TEST_C2_04', 'Clear search button restored all 8 districts and emptied input', restoredState);
    } catch (err) {
      recordFail('TEST_C2_04', 'Clear search button failed', err);
    }

    // TEST_C2_05: Empty Search State
    try {
      await page.type('[data-testid="district-selector-search-input"]', 'Atlantis_Fake_District');
      await sleep(300);

      const emptyInfo = await page.evaluate(() => {
        const emptyContainer = document.querySelector('[data-testid="district-selector-empty"]');
        const count = document.querySelector('[data-testid="district-selector-count"]')?.innerText;
        const options = document.querySelectorAll('[data-testid^="district-selector-option-"]');
        return {
          hasEmpty: !!emptyContainer,
          emptyText: emptyContainer?.innerText,
          count,
          optionsCount: options.length
        };
      });

      assert.ok(emptyInfo.hasEmpty, 'Empty state container must be displayed');
      assert.strictEqual(emptyInfo.optionsCount, 0, 'No option rows should be rendered');
      assert.ok(emptyInfo.emptyText.includes('No District Found'), 'Empty state must announce "No District Found"');
      assert.ok(emptyInfo.count.includes('Showing 0 of 8'), 'Count must be 0 of 8');

      recordPass('TEST_C2_05', 'Empty search state rendered gracefully with warning and zero count badge');
    } catch (err) {
      recordFail('TEST_C2_05', 'Empty search state failed to render', err);
    }

    // TEST_C2_06: Modal Close via Header Button
    try {
      await page.evaluate(() => document.querySelector('[data-testid="district-selector-close"]').click());
      await sleep(400);

      const isClosed = await page.evaluate(() => !document.querySelector('[data-testid="district-selector-modal"]'));
      assert.ok(isClosed, 'Modal must be removed from DOM after clicking close button');

      recordPass('TEST_C2_06', 'Modal dismissed cleanly via close button (X)');
    } catch (err) {
      recordFail('TEST_C2_06', 'Modal close button failed to dismiss dialog', err);
    }

    // TEST_C2_07: Modal Close via Backdrop Click
    try {
      await page.evaluate(() => document.querySelector('[data-testid="district-selector"]').click());
      await sleep(300);
      assert.ok(await page.evaluate(() => !!document.querySelector('[data-testid="district-selector-modal"]')), 'Modal opened');

      await page.evaluate(() => document.querySelector('[data-testid="district-selector-backdrop"]').click());
      await sleep(400);

      const isClosedBackdrop = await page.evaluate(() => !document.querySelector('[data-testid="district-selector-modal"]'));
      assert.ok(isClosedBackdrop, 'Modal must be closed after backdrop click');

      recordPass('TEST_C2_07', 'Modal dismissed cleanly via outside backdrop click');
    } catch (err) {
      recordFail('TEST_C2_07', 'Backdrop click failed to dismiss modal', err);
    }

    // TEST_C2_08: Reopening Modal Resets Previous Search Query
    try {
      // Re-open modal; check search query is reset to empty string
      await page.evaluate(() => document.querySelector('[data-testid="district-selector"]').click());
      await sleep(300);

      const inputVal = await page.evaluate(() => document.querySelector('[data-testid="district-selector-search-input"]').value);
      const count = await page.evaluate(() => document.querySelector('[data-testid="district-selector-count"]')?.innerText);

      assert.strictEqual(inputVal, '', 'Search input must be reset to empty upon reopening modal');
      assert.ok(count.includes('Showing 8 of 8'), 'Count badge must show all items');

      recordPass('TEST_C2_08', 'Reopening modal reset search input to empty and showed all 8 districts');
    } catch (err) {
      recordFail('TEST_C2_08', 'Reopening modal failed to reset search input', err);
    }

    // -------------------------------------------------------------------------
    // SUITE 2: CASCADING INVARIANTS & CHILD CLEARANCE (DISTRICT LEVEL)
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 2: Cascading Invariants & Child Clearance (District Level) ---');

    // TEST_C2_09: Select District = Nashik
    try {
      await page.evaluate(() => document.querySelector('[data-testid="district-selector-option-nashik"]').click());
      await sleep(100);

      const selectedDistrictVal = await page.evaluate(() => document.querySelector('[data-testid="district-selector-value"]')?.innerText);
      assert.strictEqual(selectedDistrictVal, 'Nashik', 'District selector value must update to Nashik');

      recordPass('TEST_C2_09', 'Selected Nashik district: modal closed and trigger updated to Nashik');
    } catch (err) {
      recordFail('TEST_C2_09', 'Failed to select Nashik district', err);
    }

    // TEST_C2_10: Child Talukas Auto-Fetched for Nashik
    try {
      await sleep(1000); // Allow async fetch to resolve

      const talukaVal = await page.evaluate(() => document.querySelector('[data-testid="taluka-selector-value"]')?.innerText);
      assert.ok(talukaVal && talukaVal.length > 0, 'Taluka selector should have auto-populated with first taluka of Nashik');

      // Open Taluka modal and verify list
      await page.evaluate(() => document.querySelector('[data-testid="taluka-selector"]').click());
      await sleep(400);

      const talukaOptions = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid^="taluka-selector-option-"]')).map(e => e.innerText.trim());
      });

      const expectedTalukas = ['Nashik', 'Sinnar', 'Niphad', 'Igatpuri'];
      assert.deepStrictEqual(talukaOptions, expectedTalukas, `Talukas under Nashik must match canonical backend API: expected ${expectedTalukas}, got ${talukaOptions}`);

      await page.evaluate(() => document.querySelector('[data-testid="taluka-selector-close"]').click());
      await sleep(300);

      recordPass('TEST_C2_10', 'District change fetched and populated Nashik talukas', { talukaOptions });
    } catch (err) {
      recordFail('TEST_C2_10', 'Talukas failed to fetch or populate for Nashik', err);
    }

    // TEST_C2_11: Child Villages Auto-Fetched for First Taluka of Nashik
    try {
      const villageVal = await page.evaluate(() => document.querySelector('[data-testid="village-selector-value"]')?.innerText);
      assert.strictEqual(villageVal, 'Panchavati', 'First village of Nashik taluka must be Panchavati');

      // Open Village modal and verify list
      await page.evaluate(() => document.querySelector('[data-testid="village-selector"]').click());
      await sleep(400);

      const villageOptions = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid^="village-selector-option-"]')).map(e => e.innerText.trim());
      });

      const expectedVillages = ['Panchavati', 'CIDCO', 'Satpur', 'Nashik Road', 'Deolali', 'Gangapur Road', 'Indira Nagar'];
      assert.deepStrictEqual(villageOptions, expectedVillages, 'Villages under Nashik taluka must match canonical backend response');

      await page.evaluate(() => document.querySelector('[data-testid="village-selector-close"]').click());
      await sleep(300);

      recordPass('TEST_C2_11', 'Villages auto-fetched and populated for Nashik taluka', { villageOptionsCount: villageOptions.length });
    } catch (err) {
      recordFail('TEST_C2_11', 'Villages failed to fetch or populate for Nashik taluka', err);
    }

    // -------------------------------------------------------------------------
    // SUITE 3: CASCADING INVARIANTS & CHILD CLEARANCE (TALUKA LEVEL)
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 3: Cascading Invariants & Child Clearance (Taluka Level) ---');

    // TEST_C2_12: Change Taluka to Sinnar & Verify Village Cascading
    try {
      await page.evaluate(() => document.querySelector('[data-testid="taluka-selector"]').click());
      await sleep(300);

      await page.evaluate(() => document.querySelector('[data-testid="taluka-selector-option-sinnar"]').click());
      await sleep(1000); // Allow async fetch of villages for Sinnar

      const stateAfterTalukaChange = await page.evaluate(() => {
        return {
          district: document.querySelector('[data-testid="district-selector-value"]')?.innerText,
          taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.innerText,
          village: document.querySelector('[data-testid="village-selector-value"]')?.innerText,
        };
      });

      assert.strictEqual(stateAfterTalukaChange.district, 'Nashik', 'District must remain Nashik');
      assert.strictEqual(stateAfterTalukaChange.taluka, 'Sinnar', 'Taluka must be Sinnar');
      assert.strictEqual(stateAfterTalukaChange.village, 'Sinnar Rural', 'Village must cascade to Sinnar Rural (first village of Sinnar)');

      recordPass('TEST_C2_12', 'Changing Taluka to Sinnar updated Taluka and cascaded Village to Sinnar Rural', stateAfterTalukaChange);
    } catch (err) {
      recordFail('TEST_C2_12', 'Changing Taluka failed to cascade village', err);
    }

    // TEST_C2_13: Verify Sinnar Village Options in Modal
    try {
      await page.evaluate(() => document.querySelector('[data-testid="village-selector"]').click());
      await sleep(300);

      const sinnarVillages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid^="village-selector-option-"]')).map(e => e.innerText.trim());
      });

      const expectedSinnarVillages = ['Sinnar Rural', 'Musalgaon', 'Gonde', 'Malegaon MIDC'];
      assert.deepStrictEqual(sinnarVillages, expectedSinnarVillages, 'Sinnar village modal options must match canonical backend API');

      // Select specific village "Musalgaon"
      await page.evaluate(() => document.querySelector('[data-testid="village-selector-option-musalgaon"]').click());
      await sleep(300);

      const villageValue = await page.evaluate(() => document.querySelector('[data-testid="village-selector-value"]')?.innerText);
      assert.strictEqual(villageValue, 'Musalgaon', 'Selected village must be Musalgaon');

      recordPass('TEST_C2_13', 'Sinnar village options verified and Musalgaon selected successfully');
    } catch (err) {
      recordFail('TEST_C2_13', 'Sinnar village options verification failed', err);
    }

    // -------------------------------------------------------------------------
    // SUITE 4: DEEP-LINK URL HYDRATION & RE-CASCADING
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 4: Deep-Link URL Hydration & Re-Cascading ---');

    // TEST_C2_14: Deep-Link URL Parameter Hydration
    try {
      await page.goto(
        'http://localhost:8081/search/MH?district=Kolhapur&taluka=Karvir&village=Kolhapur%20City&surveyNo=777',
        { waitUntil: 'networkidle2', timeout: 30000 }
      );
      await sleep(1500);

      const hydratedState = await page.evaluate(() => {
        return {
          district: document.querySelector('[data-testid="district-selector-value"]')?.innerText,
          taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.innerText,
          village: document.querySelector('[data-testid="village-selector-value"]')?.innerText,
        };
      });

      assert.strictEqual(hydratedState.district, 'Kolhapur', 'Hydrated district must be Kolhapur');
      assert.strictEqual(hydratedState.taluka, 'Karvir', 'Hydrated taluka must be Karvir');
      assert.strictEqual(hydratedState.village, 'Kolhapur City', 'Hydrated village must be Kolhapur City');

      recordPass('TEST_C2_14', 'Deep-link URL params hydrated Kolhapur > Karvir > Kolhapur City without clobbering', hydratedState);
    } catch (err) {
      recordFail('TEST_C2_14', 'Deep-link URL hydration failed', err);
    }

    // TEST_C2_15: Invalidation of Deep-Link Params Upon Subsequent District Change
    try {
      // User manually changes district to Pune
      await page.evaluate(() => document.querySelector('[data-testid="district-selector"]').click());
      await sleep(300);
      await page.evaluate(() => document.querySelector('[data-testid="district-selector-option-pune"]').click());
      await sleep(1200);

      const afterReCascade = await page.evaluate(() => {
        return {
          district: document.querySelector('[data-testid="district-selector-value"]')?.innerText,
          taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.innerText,
          village: document.querySelector('[data-testid="village-selector-value"]')?.innerText,
        };
      });

      assert.strictEqual(afterReCascade.district, 'Pune', 'District must now be Pune');
      assert.strictEqual(afterReCascade.taluka, 'Haveli', 'Taluka must be Haveli (Pune default, not Karvir)');
      assert.strictEqual(afterReCascade.village, 'Wagholi', 'Village must be Wagholi (Haveli default, not Kolhapur City)');

      recordPass('TEST_C2_15', 'User-initiated District change cleanly invalidated previous deep-link params and re-cascaded Pune defaults', afterReCascade);
    } catch (err) {
      recordFail('TEST_C2_15', 'Subsequent district change after deep-link failed', err);
    }

    // -------------------------------------------------------------------------
    // SUITE 5: ADVERSARIAL STRESS & EDGE CASES
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 5: Adversarial Stress & Edge Cases ---');

    // TEST_C2_16: Special Regex Characters in Search
    try {
      await page.evaluate(() => document.querySelector('[data-testid="district-selector"]').click());
      await sleep(300);

      const nastyQueries = ['(', '[a-z]', '*', '+', '?', '\\', '$', '^', '{2}', '|'];
      for (const nq of nastyQueries) {
        await page.evaluate((val) => {
          const inp = document.querySelector('[data-testid="district-selector-search-input"]');
          inp.value = val;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }, nq);
        await sleep(50);
      }

      const postNastyCount = await page.evaluate(() => document.querySelector('[data-testid="district-selector-count"]')?.innerText);
      assert.ok(postNastyCount !== undefined, 'Count badge should survive regex metacharacters');

      // Clear search
      await page.evaluate(() => document.querySelector('[data-testid="district-selector-close"]').click());
      await sleep(300);

      recordPass('TEST_C2_16', 'Search filter survived 10 regex metacharacters without unhandled exceptions');
    } catch (err) {
      recordFail('TEST_C2_16', 'Regex metacharacter search stress failed', err);
    }

    // TEST_C2_17: Rapid Sequential District Switching Stress
    try {
      const districtsToSwitch = ['Thane', 'Satara', 'Nagpur', 'Pune'];
      for (const d of districtsToSwitch) {
        await page.evaluate(() => document.querySelector('[data-testid="district-selector"]').click());
        await sleep(150);
        const optId = `district-selector-option-${d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')}`;
        await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`).click(), optId);
        await sleep(150);
      }
      await sleep(1200);

      const finalState = await page.evaluate(() => {
        return {
          district: document.querySelector('[data-testid="district-selector-value"]')?.innerText,
          taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.innerText,
          village: document.querySelector('[data-testid="village-selector-value"]')?.innerText,
        };
      });

      assert.strictEqual(finalState.district, 'Pune', 'Final district must settle on Pune');
      assert.strictEqual(finalState.taluka, 'Haveli', 'Final taluka must settle on Haveli');
      assert.strictEqual(finalState.village, 'Wagholi', 'Final village must settle on Wagholi');

      recordPass('TEST_C2_17', 'Rapid sequential district switching stress settled synchronously on valid final hierarchy', finalState);
    } catch (err) {
      recordFail('TEST_C2_17', 'Rapid sequential district switching stress failed', err);
    }

    // -------------------------------------------------------------------------
    // SUITE 6: RESPONSIVE WEB ERGONOMICS & LAYOUT BOUNDING
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 6: Responsive Web Ergonomics & Layout Bounding ---');

    const viewports = [
      { id: 'TEST_C2_18', name: 'Desktop', width: 1280, height: 900, maxModalWidth: 500 },
      { id: 'TEST_C2_19', name: 'Tablet', width: 768, height: 1024, maxModalWidth: 500 },
      { id: 'TEST_C2_20', name: 'Mobile', width: 375, height: 812, maxModalWidth: 375 }
    ];

    for (const vp of viewports) {
      try {
        await page.setViewport({ width: vp.width, height: vp.height });
        await sleep(500);

        await page.evaluate(() => document.querySelector('[data-testid="district-selector"]').click());
        await sleep(400);

        const metrics = await page.evaluate(() => {
          const modal = document.querySelector('[data-testid="district-selector-modal"]');
          if (!modal) return null;
          const rect = modal.getBoundingClientRect();
          return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            fitsInWindow: rect.right <= window.innerWidth && rect.bottom <= window.innerHeight
          };
        });

        assert.ok(metrics, 'Modal must be rendered in DOM');
        assert.ok(metrics.width <= vp.maxModalWidth + 10, `Modal width (${metrics.width}px) must not exceed ${vp.maxModalWidth}px on ${vp.name}`);
        assert.ok(metrics.fitsInWindow, `Modal must fit within window viewport on ${vp.name}`);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `cascade_m2_responsive_${vp.name.toLowerCase()}.png`) });

        await page.evaluate(() => document.querySelector('[data-testid="district-selector-close"]').click());
        await sleep(300);

        recordPass(vp.id, `Responsive layout bounded & centered on ${vp.name} (${vp.width}x${vp.height})`, metrics);
      } catch (err) {
        recordFail(vp.id, `Responsive layout test failed on ${vp.name}`, err);
      }
    }

    // -------------------------------------------------------------------------
    // SUITE 7: MULTI-STATE COVERAGE (KARNATAKA HIERARCHY)
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 7: Multi-State Location Hierarchy Coverage ---');

    // TEST_C2_21: Multi-State /search/KA Verification
    try {
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto('http://localhost:8081/search/KA', { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1500);

      const kaInitial = await page.evaluate(() => {
        return {
          district: document.querySelector('[data-testid="district-selector-value"]')?.innerText,
          taluka: document.querySelector('[data-testid="taluka-selector-value"]')?.innerText,
          village: document.querySelector('[data-testid="village-selector-value"]')?.innerText,
        };
      });

      assert.strictEqual(kaInitial.district, 'Bengaluru Urban', 'Karnataka default district should be Bengaluru Urban');
      assert.strictEqual(kaInitial.taluka, 'Bengaluru South', 'Karnataka default taluka should be Bengaluru South');
      assert.strictEqual(kaInitial.village, 'Electronic City', 'Karnataka default village should be Electronic City');

      // Verify district options for Karnataka
      await page.evaluate(() => document.querySelector('[data-testid="district-selector"]').click());
      await sleep(400);

      const kaDistricts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid^="district-selector-option-"]')).map(e => e.innerText.trim());
      });

      assert.ok(kaDistricts.includes('Bengaluru Urban'), 'Karnataka districts must include Bengaluru Urban');
      assert.ok(kaDistricts.includes('Mysuru'), 'Karnataka districts must include Mysuru');

      await page.evaluate(() => document.querySelector('[data-testid="district-selector-close"]').click());
      await sleep(300);

      recordPass('TEST_C2_21', 'Multi-state Karnataka (/search/KA) loaded canonical hierarchy Bengaluru Urban > Bengaluru South > Electronic City', { kaDistrictsCount: kaDistricts.length });
    } catch (err) {
      recordFail('TEST_C2_21', 'Multi-state Karnataka hierarchy verification failed', err);
    }

    // TEST_C2_22: Zero Page Errors Verification
    try {
      assert.strictEqual(pageErrors.length, 0, `Page errors detected: ${pageErrors.join('; ')}`);
      recordPass('TEST_C2_22', 'Zero unhandled client-side runtime errors or React exceptions during entire test session');
    } catch (err) {
      recordFail('TEST_C2_22', 'Unhandled page errors detected', err);
    }

  } catch (globalErr) {
    console.error('Fatal execution error:', globalErr);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // -------------------------------------------------------------------------
  // SUMMARY RESULTS
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🏁 CHALLENGE VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('========================================================================\n');

  const verdict = failed === 0 ? 'APPROVE' : 'REJECT';
  console.log(`VERDICT: ${verdict}\n`);

  // Write results to JSON for artifact tracking
  const reportData = {
    timestamp: new Date().toISOString(),
    verdict,
    passed,
    failed,
    total: passed + failed,
    results
  };

  fs.writeFileSync(
    path.join(__dirname, 'adversarial_cascade_m2_results.json'),
    JSON.stringify(reportData, null, 2)
  );

  return { passed, failed, verdict, results };
}

if (require.main === module) {
  runAdversarialCascadeM2Tests().then(({ verdict, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

module.exports = { runAdversarialCascadeM2Tests };
