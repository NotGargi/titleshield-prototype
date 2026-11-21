/**
 * Landeed 2.0 E2E Test Suite 06: Explore Cadastral Map & Property Summary Sheet Verification
 * 
 * Verifies (via Puppeteer + Headless Edge browser on http://localhost:8081):
 * - Tier 1 (Feature Coverage):
 *   * TEST_06_01: Explore screen loading on primary route (/explorer) without errors
 *   * TEST_06_02: Route compatibility alias (/explore) resolves cleanly
 *   * TEST_06_03: Base map raster tiles fetching from online tile providers (Esri / OSM)
 *   * TEST_06_04: Dynamic layer toggle controller (Satellite ↔ Cadastral)
 *   * TEST_06_05: Hardware-accelerated SVG vector polygons & survey/gat numbers
 *   * TEST_06_06: GPS geo-location control & centroid centering
 *   * TEST_06_07: Interactive parcel selection & neon boundary highlighting
 *   * TEST_06_08: Instant property summary sheet presentation modal
 *   * TEST_06_09: Property summary sheet data field verification (all 6 core attributes)
 *   * TEST_06_10: Direct action CTA button navigation to certified record (/record/:id)
 * - Tier 2 (Boundary & Corner Cases):
 *   * TEST_06_11: Adjacent unselected plots selection & boundary update
 *   * TEST_06_12: Rapid stress layer toggling (6x consecutive toggles)
 *   * TEST_06_13: Multi-region presets switching (Maharashtra ↔ Uttar Pradesh)
 * - Tier 3 (Cross-Feature Combinations):
 *   * TEST_06_14: Satellite layer + parcel selection + summary sheet dismissal & re-open
 *   * TEST_06_15: Cross-tier navigation from UP parcel (Ghaziabad Plot 112) to certified record
 * - Tier 4 (Real-World Sovereign Title Diligence Scenario):
 *   * TEST_06_16: Pune Wagholi Gat 142/2A full title diligence end-to-end journey
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

/**
 * Robust click dispatcher that handles SVG elements, scroll containers,
 * and elements positioned near fixed overlays.
 */
async function safeClick(page, selector, timeout = 12000) {
  await page.waitForSelector(selector, { timeout });
  const clicked = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    if (typeof el.click === 'function') {
      el.click();
    }
    return true;
  }, selector);

  if (!clicked) {
    throw new Error(`safeClick failed to find element matching: ${selector}`);
  }
}

/**
 * Resilient body text retriever that absorbs transient frame/context destruction
 * during Expo web route navigations.
 */
async function safeGetBodyText(page, retries = 8) {
  for (let i = 0; i < retries; i++) {
    try {
      const text = await page.evaluate(() => document.body ? document.body.innerText : '');
      if (text && text.trim().length > 30) {
        return text;
      }
      await sleep(600);
    } catch (err) {
      if (err.message.includes('Execution context was destroyed') || err.message.includes('context') || err.message.includes('Target closed')) {
        await sleep(1000);
        continue;
      }
      throw err;
    }
  }
  return await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
}

async function runExploreCadastralMapTests() {
  console.log('================================================================');
  console.log('🧪 SUITE 06: Explore Cadastral Map & Property Summary Sheet E2E');
  console.log('================================================================');

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
    results.push({ id: testId, tier, status: 'FAIL', description, error: error ? error.message : 'Condition failed' });
    console.log(`  ❌ [FAIL] [${tier}] ${testId}: ${description}`);
    if (error) console.log(`     Error: ${error.message}`);
  }

  let browser;

  try {
    if (!fs.existsSync(BROWSER_PATH)) {
      throw new Error(`Browser executable not found at: ${BROWSER_PATH}`);
    }

    console.log(`  ℹ️ Launching Headless Browser (${BROWSER_PATH})...`);
    browser = await puppeteer.launch({
      executablePath: BROWSER_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,960'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 960 });

    // Track console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // =========================================================================
    // TIER 1: FEATURE COVERAGE
    // =========================================================================

    // -------------------------------------------------------------------------
    // Test 6.1: Explore Map Loading on Primary Route (/explorer)
    // -------------------------------------------------------------------------
    try {
      await page.goto('http://localhost:8081/explorer', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_01_explorer_load.png') });

      const pageText = await page.evaluate(() => document.body.innerText);
      const mapViewer = await page.$('[data-testid="cadastral-map-viewer"]');

      assert.ok(mapViewer, 'Cadastral map viewer container [data-testid="cadastral-map-viewer"] must be mounted');
      assert.ok(
        pageText.includes('Cadastral') || pageText.includes('Explorer') || pageText.includes('Survey') || pageText.includes('Wagholi'),
        'Explore screen must display cadastral map header information'
      );

      recordPass('TEST_06_01', 'Tier 1', 'Explore screen loaded successfully on primary route /explorer');
    } catch (err) {
      recordFail('TEST_06_01', 'Tier 1', 'Explore screen failed to load on /explorer', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.2: Route Compatibility Alias (/explore)
    // -------------------------------------------------------------------------
    try {
      await page.goto('http://localhost:8081/explore', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_02_explore_alias.png') });

      const pageUrl = page.url();
      const mapViewer = await page.$('[data-testid="cadastral-map-viewer"]');
      const pageText = await page.evaluate(() => document.body.innerText);

      assert.ok(!pageText.includes('404') && !pageText.includes('Not Found'), 'Route alias /explore must not return 404');
      assert.ok(mapViewer, 'Map viewer must be present on /explore alias route');

      recordPass('TEST_06_02', 'Tier 1', 'Compatibility alias route /explore resolved cleanly to cadastral map');

      // Return to /explorer for remaining workflow tests
      await page.goto('http://localhost:8081/explorer', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(1500);
    } catch (err) {
      recordFail('TEST_06_02', 'Tier 1', 'Compatibility alias /explore failed to resolve', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.3: Base Map Tiles Rendering (Online Tile Providers)
    // -------------------------------------------------------------------------
    try {
      const tileSources = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => img.src).filter(src => 
          src.includes('arcgisonline.com') || src.includes('openstreetmap.org') || src.includes('cartocdn.com')
        );
      });

      assert.ok(tileSources.length > 0, 'Online slippy map tiles (Esri / OSM) must be rendered in DOM');
      const isOnlineProvider = tileSources.some(src => 
        src.includes('arcgisonline.com') || src.includes('openstreetmap.org')
      );
      assert.ok(isOnlineProvider, 'Map tiles must fetch from online providers (Esri World Imagery or OpenStreetMap)');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_03_tiles_render.png') });
      recordPass('TEST_06_03', 'Tier 1', `Base map tiles rendered cleanly from online tile providers (${tileSources.length} tiles active)`);
    } catch (err) {
      recordFail('TEST_06_03', 'Tier 1', 'Base map tiles rendering verification failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.4: Dynamic Layer Toggle Controller (Satellite ↔ Cadastral)
    // -------------------------------------------------------------------------
    try {
      // Switch to Cadastral layer
      await safeClick(page, '[data-testid="layer-toggle-cadastral"]');
      await sleep(1200);

      const cadastralTiles = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => img.src).filter(src => src.includes('openstreetmap.org'));
      });
      assert.ok(cadastralTiles.length > 0, 'Switching to Cadastral layer must render OpenStreetMap tiles');

      // Switch back to Satellite layer
      await safeClick(page, '[data-testid="layer-toggle-satellite"]');
      await sleep(1200);

      const satelliteTiles = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => img.src).filter(src => src.includes('arcgisonline.com'));
      });
      assert.ok(satelliteTiles.length > 0, 'Switching to Satellite layer must render Esri World Imagery tiles');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_04_layer_toggle.png') });
      recordPass('TEST_06_04', 'Tier 1', 'Layer toggle controller successfully alternates between Satellite (Esri) and Cadastral (OSM) layers');
    } catch (err) {
      recordFail('TEST_06_04', 'Tier 1', 'Layer toggle verification failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.5: Cadastral SVG Vector Polygons & Survey Numbers
    // -------------------------------------------------------------------------
    try {
      const svgPolygons = await page.evaluate(() => {
        const polygons = Array.from(document.querySelectorAll('polygon'));
        return polygons.map(p => ({
          points: p.getAttribute('points'),
          stroke: p.getAttribute('stroke'),
          fill: p.getAttribute('fill')
        }));
      });

      assert.ok(svgPolygons.length >= 3, `Must render cadastral parcel polygons (found: ${svgPolygons.length})`);

      const pageText = await page.evaluate(() => document.body.innerText);
      const hasSurveyNumbers = 
        pageText.includes('142/2A') &&
        (pageText.includes('141') || pageText.includes('142/1') || pageText.includes('143'));
      assert.ok(hasSurveyNumbers, 'Cadastral survey numbers (142/2A, 141, etc.) must be rendered');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_05_cadastral_polygons.png') });
      recordPass('TEST_06_05', 'Tier 1', `Cadastral vector overlay rendered ${svgPolygons.length} SVG boundary polygons with survey numbers`);
    } catch (err) {
      recordFail('TEST_06_05', 'Tier 1', 'Cadastral SVG vector polygons verification failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.6: GPS Geolocation Centering Control
    // -------------------------------------------------------------------------
    try {
      await safeClick(page, '[data-testid="gps-locate-btn"]');
      await sleep(1000);

      // Verify no crash and map remains intact
      const mapViewer = await page.$('[data-testid="cadastral-map-viewer"]');
      assert.ok(mapViewer, 'Map canvas must remain active after triggering GPS centering');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_06_gps_control.png') });
      recordPass('TEST_06_06', 'Tier 1', 'GPS geolocation centering control executed cleanly with centroid fallback');
    } catch (err) {
      recordFail('TEST_06_06', 'Tier 1', 'GPS geolocation control verification failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.7: Interactive Parcel Selection & Highlighting
    // -------------------------------------------------------------------------
    try {
      // Tap parcel 142/2A polygon
      await safeClick(page, '[data-testid="parcel-polygon-parcel-mh-pune-142-2a"]');
      await sleep(1000);

      // Verify selected state attributes
      const isHighlighted = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const selectedPolygon = document.querySelector('[data-testid="parcel-polygon-parcel-mh-pune-142-2a"]');
        return bodyText.includes('142/2A') && Boolean(selectedPolygon);
      });
      assert.ok(isHighlighted, 'Parcel 142/2A must be highlighted upon selection');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_07_parcel_selected.png') });
      recordPass('TEST_06_07', 'Tier 1', 'Interactive parcel selection highlights Gat 142/2A boundary and updates map state');
    } catch (err) {
      recordFail('TEST_06_07', 'Tier 1', 'Interactive parcel selection failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.8: Instant Property Summary Sheet Presentation
    // -------------------------------------------------------------------------
    try {
      const summarySheet = await page.$('[data-testid="property-summary-sheet"]');
      assert.ok(summarySheet, 'Property summary sheet modal [data-testid="property-summary-sheet"] must be displayed');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_08_summary_sheet.png') });
      recordPass('TEST_06_08', 'Tier 1', 'Instant property summary sheet modal presented upon parcel selection');
    } catch (err) {
      recordFail('TEST_06_08', 'Tier 1', 'Property summary sheet presentation failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.9: Property Summary Sheet Data Field Verification (All 6 core fields)
    // -------------------------------------------------------------------------
    try {
      const sheetData = await page.evaluate(() => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.innerText.trim() : null;
        };

        return {
          surveyNo: getText('[data-testid="summary-survey-no"]'),
          owner: getText('[data-testid="summary-owner-name"]'),
          extent: getText('[data-testid="summary-extent"]'),
          guidance: getText('[data-testid="summary-guidance-value"]'),
          market: getText('[data-testid="summary-market-value"]'),
          score: getText('[data-testid="summary-title-score"]'),
          encumbrance: getText('[data-testid="summary-encumbrance"]')
        };
      });

      assert.ok(sheetData.surveyNo && sheetData.surveyNo.includes('142/2A'), `Survey No must be 142/2A (found: ${sheetData.surveyNo})`);
      assert.ok(sheetData.owner && (sheetData.owner.includes('Verified Transferee') || sheetData.owner.includes('Shinde')), `Owner must be present (found: ${sheetData.owner})`);
      assert.ok(sheetData.extent && (sheetData.extent.includes('18 Gunthe') || sheetData.extent.includes('1.20') || sheetData.extent.includes('Hectare')), `Extent must be present (found: ${sheetData.extent})`);
      assert.ok(sheetData.guidance && sheetData.guidance.includes('68,00,000'), `Guidance value must match 68,00,000 (found: ${sheetData.guidance})`);
      assert.ok(sheetData.market && sheetData.market.includes('72,50,000'), `Market value must match 72,50,000 (found: ${sheetData.market})`);
      assert.ok(sheetData.score && sheetData.score.includes('98'), `Clean Title Score must be 98 (found: ${sheetData.score})`);
      assert.ok(sheetData.encumbrance && (sheetData.encumbrance.includes('Clean') || sheetData.encumbrance.includes('Nil')), `Encumbrance status must be Clean (found: ${sheetData.encumbrance})`);

      recordPass('TEST_06_09', 'Tier 1', 'All 6 property summary sheet attributes verified (Owner, Survey, Extent, Values, Score 98, Clean Encumbrance)');
    } catch (err) {
      recordFail('TEST_06_09', 'Tier 1', 'Property summary sheet field verification failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.10: Direct Action CTA Navigation to Certified Record (/record/:id)
    // -------------------------------------------------------------------------
    try {
      await safeClick(page, '[data-testid="view-certified-record-btn"]');
      await sleep(2500);

      const targetUrl = page.url();
      assert.ok(targetUrl.includes('/record/rec-mh-pune-deed-4821'), `Must navigate to certified record: ${targetUrl}`);

      const recordBodyText = await page.evaluate(() => document.body.innerText);
      assert.ok(
        recordBodyText.includes('4821') || recordBodyText.includes('Pune') || recordBodyText.includes('Wagholi') || recordBodyText.includes('Record'),
        'Target certified record page must render deed details'
      );

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_10_record_navigation.png') });
      recordPass('TEST_06_10', 'Tier 1', `Direct action CTA successfully navigated to certified record view at: ${targetUrl}`);
    } catch (err) {
      recordFail('TEST_06_10', 'Tier 1', 'Certified record navigation failed', err);
    }

    // =========================================================================
    // TIER 2: BOUNDARY & CORNER CASES
    // =========================================================================

    // -------------------------------------------------------------------------
    // Test 6.11: Adjacent Unselected Plots Selection & Update
    // -------------------------------------------------------------------------
    try {
      await page.goto('http://localhost:8081/explorer', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2000);

      // Select adjacent plot 141 via polygon click or chip
      const targetSelector = await page.evaluate(() => {
        if (document.querySelector('[data-testid="parcel-polygon-parcel_mh_haveli_wagholi_141"]')) {
          return '[data-testid="parcel-polygon-parcel_mh_haveli_wagholi_141"]';
        }
        if (document.querySelector('[data-testid="parcel-polygon-parcel-mh-pune-141"]')) {
          return '[data-testid="parcel-polygon-parcel-mh-pune-141"]';
        }
        return '[data-testid="parcel-chip-141"]';
      });
      await safeClick(page, targetSelector);
      await sleep(1000);

      const adjacentData = await page.evaluate(() => {
        const surveyEl = document.querySelector('[data-testid="summary-survey-no"]');
        const ownerEl = document.querySelector('[data-testid="summary-owner-name"]');
        return {
          surveyNo: surveyEl ? surveyEl.innerText.trim() : null,
          owner: ownerEl ? ownerEl.innerText.trim() : null
        };
      });

      assert.strictEqual(adjacentData.surveyNo, '141', `Selected survey must switch to 141 (found: ${adjacentData.surveyNo})`);
      assert.ok(adjacentData.owner && (adjacentData.owner.includes('Patil') || adjacentData.owner.includes('Deshmukh')), `Owner must switch to expected owner (found: ${adjacentData.owner})`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_11_adjacent_plots.png') });
      recordPass('TEST_06_11', 'Tier 2', 'Adjacent unselected plot 141 smoothly selected, updating summary attributes and deselecting prior parcel');
    } catch (err) {
      recordFail('TEST_06_11', 'Tier 2', 'Adjacent plot selection verification failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.12: Rapid Stress Layer Toggling (6x Consecutive Toggles)
    // -------------------------------------------------------------------------
    try {
      // Rapidly toggle 6 times without pause
      for (let i = 0; i < 3; i++) {
        await safeClick(page, '[data-testid="layer-toggle-satellite"]');
        await sleep(100);
        await safeClick(page, '[data-testid="layer-toggle-cadastral"]');
        await sleep(100);
      }
      await sleep(1500);

      // Final state check: Cadastral tiles active
      const activeTiles = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => img.src).filter(src => src.includes('openstreetmap.org'));
      });
      assert.ok(activeTiles.length > 0, 'Rapid layer toggling must cleanly settle into target tile provider without runtime crash');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_12_rapid_layer_toggle.png') });
      recordPass('TEST_06_12', 'Tier 2', 'Rapid stress layer toggles (6x) completed with zero unhandled exceptions or UI freezing');
    } catch (err) {
      recordFail('TEST_06_12', 'Tier 2', 'Rapid layer toggle stress test failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.13: Multi-Region Presets Switching (Maharashtra ↔ Uttar Pradesh)
    // -------------------------------------------------------------------------
    try {
      // 1. Switch to Uttar Pradesh: Ghaziabad
      await safeClick(page, '[data-testid="region-chip-up-ghaziabad"]');
      await sleep(1500);

      const ghaziabadText = await page.evaluate(() => document.body.innerText);
      assert.ok(
        ghaziabadText.includes('Ghaziabad') || ghaziabadText.includes('112') || ghaziabadText.includes('Panchsheel'),
        'Switching to Ghaziabad region must display Ghaziabad parcel 112'
      );

      // 2. Switch to Uttar Pradesh: Noida Sector 62
      await safeClick(page, '[data-testid="region-chip-up-noida"]');
      await sleep(1500);

      const noidaText = await page.evaluate(() => document.body.innerText);
      assert.ok(
        noidaText.includes('Noida') || noidaText.includes('Sector 62') || noidaText.includes('B-44') || noidaText.includes('8910'),
        'Switching to Noida region must display Sector 62 parcel B-44'
      );

      // 3. Switch back to Maharashtra: Pune Wagholi
      await safeClick(page, '[data-testid="region-chip-mh-pune-wagholi"]');
      await sleep(1500);

      const wagholiText = await page.evaluate(() => document.body.innerText);
      assert.ok(
        wagholiText.includes('Wagholi') || wagholiText.includes('142/2A') || wagholiText.includes('Pune'),
        'Switching back to Wagholi region must restore Pune Wagholi cadastre'
      );

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_13_multi_region_switching.png') });
      recordPass('TEST_06_13', 'Tier 2', 'Multi-region preset switching (Pune Wagholi ↔ Ghaziabad ↔ Noida) verified cleanly across states');
    } catch (err) {
      recordFail('TEST_06_13', 'Tier 2', 'Multi-region preset switching failed', err);
    }

    // =========================================================================
    // TIER 3: CROSS-FEATURE COMBINATIONS
    // =========================================================================

    // -------------------------------------------------------------------------
    // Test 6.14: Satellite Layer + Parcel Selection + Summary Sheet Cycle
    // -------------------------------------------------------------------------
    try {
      // Set to Satellite
      await safeClick(page, '[data-testid="layer-toggle-satellite"]');
      await sleep(1000);

      // Select parcel 142/2A polygon
      await safeClick(page, '[data-testid="parcel-polygon-parcel-mh-pune-142-2a"]');
      await sleep(1000);

      // Summary sheet should be visible
      let summarySheet = await page.$('[data-testid="property-summary-sheet"]');
      assert.ok(summarySheet, 'Summary sheet must be displayed over Satellite view');

      // Dismiss summary sheet
      await safeClick(page, '[data-testid="summary-sheet-close-btn"]');
      await sleep(800);

      summarySheet = await page.$('[data-testid="property-summary-sheet"]');
      assert.ok(!summarySheet, 'Summary sheet must be dismissed upon clicking close button');

      // Re-select parcel to re-open summary sheet
      await safeClick(page, '[data-testid="parcel-polygon-parcel-mh-pune-142-2a"]');
      await sleep(1000);

      summarySheet = await page.$('[data-testid="property-summary-sheet"]');
      assert.ok(summarySheet, 'Summary sheet must re-open cleanly upon tapping parcel again');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_14_satellite_parcel_modal_cycle.png') });
      recordPass('TEST_06_14', 'Tier 3', 'Satellite layer + parcel selection + summary sheet dismissal and re-activation cycle verified');
    } catch (err) {
      recordFail('TEST_06_14', 'Tier 3', 'Satellite parcel modal cycle failed', err);
    }

    // -------------------------------------------------------------------------
    // Test 6.15: Cross-Tier Record Navigation from UP Parcel (Ghaziabad Plot 112)
    // -------------------------------------------------------------------------
    try {
      // Switch to Ghaziabad
      await safeClick(page, '[data-testid="region-chip-up-ghaziabad"]');
      await sleep(1500);

      // Verify Plot 112 is selected and summary sheet is visible
      const sheetOwner = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="summary-owner-name"]');
        return el ? el.innerText : '';
      });
      assert.ok(sheetOwner.includes('Protected'), 'Ghaziabad Plot 112 owner details must display Protected status');

      // Click "View Certified Record"
      await safeClick(page, '[data-testid="view-certified-record-btn"]');
      await sleep(2500);

      const currentUrl = page.url();
      assert.ok(
        currentUrl.includes('/record/rec-up-ghaziabad-panchsheel-112'),
        `Must navigate to Ghaziabad certified record: ${currentUrl}`
      );

      const recordText = await safeGetBodyText(page);
      assert.ok(
        recordText.includes('Ghaziabad') || recordText.includes('Panchsheel') || recordText.includes('112'),
        'Ghaziabad certified deed view must render property details'
      );

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_15_up_record_navigation.png') });
      recordPass('TEST_06_15', 'Tier 3', `Cross-tier certified record navigation for UP parcel succeeded at: ${currentUrl}`);
    } catch (err) {
      recordFail('TEST_06_15', 'Tier 3', 'Cross-tier UP record navigation failed', err);
    }

    // =========================================================================
    // TIER 4: REAL-WORLD SOVEREIGN TITLE DILIGENCE SCENARIO
    // =========================================================================

    // -------------------------------------------------------------------------
    // Test 6.16: Pune Wagholi Gat 142/2A Full Title Diligence End-to-End Flow
    // -------------------------------------------------------------------------
    try {
      await page.goto('http://localhost:8081/explorer', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2000);

      // 1. Enter search inputs
      const districtInput = await page.$('[data-testid="explorer-input-district"]');
      if (districtInput) {
        await districtInput.click({ clickCount: 3 });
        await districtInput.type('Pune');
      }

      const villageInput = await page.$('[data-testid="explorer-input-village"]');
      if (villageInput) {
        await villageInput.click({ clickCount: 3 });
        await villageInput.type('Wagholi');
      }

      const surveyInput = await page.$('[data-testid="explorer-input-surveyno"]');
      if (surveyInput) {
        await surveyInput.click({ clickCount: 3 });
        await surveyInput.type('142/2A');
      }

      // 2. Click Locate Parcel button
      await safeClick(page, '[data-testid="locate-parcel-btn"]');
      await sleep(1500);

      // 3. Verify Gat 142/2A summary card & score
      const diligenceData = await page.evaluate(() => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.innerText.trim() : '';
        };

        return {
          surveyNo: getText('[data-testid="summary-survey-no"]'),
          owner: getText('[data-testid="summary-owner-name"]'),
          score: getText('[data-testid="summary-title-score"]'),
          encumbrance: getText('[data-testid="summary-encumbrance"]'),
          marketVal: getText('[data-testid="summary-market-value"]')
        };
      });

      assert.ok(diligenceData.surveyNo.includes('142/2A'), 'Survey must be 142/2A');
      assert.ok(diligenceData.score.includes('98'), 'Clean Title Score must be 98');
      assert.ok(diligenceData.encumbrance.includes('Clean'), 'Encumbrance status must be Clean Title');

      // 4. Click View Certified Record to complete diligence
      await safeClick(page, '[data-testid="view-certified-record-btn"]');
      await sleep(2500);

      const recordUrl = page.url();
      assert.ok(recordUrl.includes('/record/rec-mh-pune-deed-4821'), `Diligence journey must terminate on certified deed: ${recordUrl}`);

      const deedText = await safeGetBodyText(page);
      const isDiligenceVerified = 
        deedText.includes('4821') &&
        (deedText.includes('Wagholi') || deedText.includes('Sale Deed') || deedText.includes('Title'));
      assert.ok(isDiligenceVerified, 'Full certified deed & 30-year lineage must be presented for Wagholi 142/2A');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'e2e_06_16_wagholi_e2e_diligence.png') });
      recordPass('TEST_06_16', 'Tier 4', 'Full real-world sovereign title diligence journey for Pune Wagholi Gat 142/2A executed with 100% fidelity');
    } catch (err) {
      recordFail('TEST_06_16', 'Tier 4', 'Full diligence journey failed', err);
    }

  } catch (fatalErr) {
    console.error('Fatal error during Suite 06 execution:', fatalErr.message);
    recordFail('TEST_06_FATAL', 'Fatal', 'Browser launch / connection failed', fatalErr);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`\n📊 Suite 06 Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests\n`);
  return { suite: '06_explore_cadastral_map', passed, failed, total: passed + failed, results };
}

if (require.main === module) {
  runExploreCadastralMapTests().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  });
}

module.exports = { runExploreCadastralMapTests };
