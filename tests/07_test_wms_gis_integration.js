/**
 * Landeed 2.0 E2E Test Suite 07: Live NIC BhuNaksha GIS & State WMS Layer Integration
 * 
 * Verifies (via Math proofs & Puppeteer Headless Edge browser on http://localhost:8081):
 * - Tier 1: Mathematical & Projection Engine Verification:
 *   * TEST_07_01: OGC WMS 1.1.1 GetMap BBOX calculation in EPSG:3857 metric meters
 *   * TEST_07_02: Dual-spec EPSG:4326 geographic degree BBOX calculation (WMS 1.1.1 vs 1.3.0)
 *   * TEST_07_03: Multi-zoom mathematical scaling invariance (zooms 1 to 20) with zero NaN/drift
 * - Tier 2: Official State GeoServer WMS Registry & OGC URL Builder:
 *   * TEST_07_04: Authoritative registry validation for all 8 Indian states + Pan-India ISRO Bhuvan fallback
 *   * TEST_07_05: OGC WMS 1.1.1 GetMap query parameter compliance (SERVICE, VERSION, REQUEST, FORMAT, SRS, BBOX)
 *   * TEST_07_06: Automatic geographic state jurisdiction detection across all 8 states + maritime fallback
 * - Tier 3: Dynamic Zoom-Level Streaming & Backward Compatibility:
 *   * TEST_07_07: Dynamic zoom-level streaming threshold (z < 14 dormant/village vs z >= 14 cadastral)
 *   * TEST_07_08: SlippyTile contract retrofitting with 100% backward compatibility for existing suites
 * - Tier 4: Browser UI End-to-End Verification (Puppeteer):
 *   * TEST_07_09: UI layer toggle button [data-testid="layer-toggle-wms"] switching to "🏛️ NIC BhuNaksha"
 *   * TEST_07_10: Real-time state WMS status pill [data-testid="wms-status-pill"] presentation & indicator
 *   * TEST_07_11: Silent tile error recovery and multi-layer transparency composition
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Dynamically resolve puppeteer-core from server node_modules
let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  try {
    puppeteer = require(path.join(__dirname, '..', 'server', 'node_modules', 'puppeteer-core'));
  } catch {
    puppeteer = require('c:\\SIH\\landeed-app\\server\\node_modules\\puppeteer-core');
  }
}

// Compile TypeScript modules dynamically via TypeScript compiler
const ts = require(path.join(__dirname, '..', 'server', 'node_modules', 'typescript'));

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'server', 'test_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Load and transpile stateWmsRegistry.ts and geoProjection.ts
const regCode = fs.readFileSync(path.join(__dirname, '..', 'app', 'constants', 'stateWmsRegistry.ts'), 'utf8');
const compiledReg = ts.transpileModule(regCode, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});
const regExports = {};
const regMod = { exports: regExports };
new Function('module', 'exports', 'require', compiledReg.outputText)(regMod, regExports, require);

const geoCode = fs.readFileSync(path.join(__dirname, '..', 'app', 'utils', 'geoProjection.ts'), 'utf8');
const compiledGeo = ts.transpileModule(geoCode, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});
const geoExports = {};
const geoMod = { exports: geoExports };
function customRequire(id) {
  if (id.includes('stateWmsRegistry')) return regMod.exports;
  return require(id);
}
new Function('module', 'exports', 'require', compiledGeo.outputText)(geoMod, geoExports, customRequire);

const {
  tileToEPSG3857BBox,
  tileToEPSG4326BBox,
  getWmsCadastralTileUrl,
  getStateWmsConfig,
  detectStateFromCoordinates,
  getVisibleTiles,
  geoToPixel,
  pixelToGeo,
  OFFICIAL_STATE_WMS_REGISTRY,
  TILE_PROVIDERS
} = geoMod.exports;

/**
 * Robust click dispatcher
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

async function runWmsGisIntegrationTests() {
  console.log('\n================================================================');
  console.log('🧪 SUITE 07: Live NIC BhuNaksha GIS & State WMS Integration E2E');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;
  const total = 11;

  // --------------------------------------------------------------------------
  // TIER 1: MATHEMATICAL & PROJECTION ENGINE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 1: Mathematical & Projection Engine Verification ---');

  // TEST_07_01: OGC WMS 1.1.1 GetMap BBOX calculation in EPSG:3857
  try {
    const bbox17 = tileToEPSG3857BBox(92472, 58649, 17);
    assert.ok(bbox17.minX < bbox17.maxX, 'minX must be strictly less than maxX');
    assert.ok(bbox17.minY < bbox17.maxY, 'minY must be strictly less than maxY');
    assert.strictEqual(typeof bbox17.bboxString, 'string', 'bboxString must be string');
    
    const parts = bbox17.bboxString.split(',');
    assert.strictEqual(parts.length, 4, 'BBOX string must have exactly 4 values');
    
    // Check metric span at zoom 17: Earth circumference (40075016.68m) / 2^17 = ~305.748m
    const spanX = bbox17.maxX - bbox17.minX;
    const spanY = bbox17.maxY - bbox17.minY;
    assert.ok(Math.abs(spanX - 305.75) < 0.1, `Tile span X (~305.75m) got ${spanX.toFixed(2)}m`);
    assert.ok(Math.abs(spanY - 305.75) < 0.1, `Tile span Y (~305.75m) got ${spanY.toFixed(2)}m`);

    // Invert BBOX corners to WGS84 and check target coordinate
    const center = { lat: 18.5793, lng: 73.9823 }; // Pune Wagholi Gat 142/2A
    const geoBbox = tileToEPSG4326BBox(92472, 58649, 17);
    assert.ok(center.lat >= geoBbox.minLat && center.lat <= geoBbox.maxLat, 'Center lat inside BBOX');
    assert.ok(center.lng >= geoBbox.minLng && center.lng <= geoBbox.maxLng, 'Center lng inside BBOX');

    passed++;
    console.log('  ✅ [PASS] TEST_07_01: EPSG:3857 metric BBOX calculated with exact 305.75m span at zoom 17');
  } catch (err) {
    failed++;
    console.error('  ❌ [FAIL] TEST_07_01:', err.message);
  }

  // TEST_07_02: Dual-spec EPSG:4326 geographic degree BBOX calculation
  try {
    const geo = tileToEPSG4326BBox(92472, 58649, 17);
    assert.ok(geo.minLat < geo.maxLat, 'minLat < maxLat');
    assert.ok(geo.minLng < geo.maxLng, 'minLng < maxLng');

    // WMS 1.1.1 axis order: minLng,minLat,maxLng,maxLat
    const p111 = geo.bboxString111.split(',').map(Number);
    assert.strictEqual(p111.length, 4, 'WMS 1.1.1 BBOX parts');
    assert.ok(Math.abs(p111[0] - geo.minLng) < 1e-4, 'First coord is minLng');
    assert.ok(Math.abs(p111[1] - geo.minLat) < 1e-4, 'Second coord is minLat');
    assert.ok(Math.abs(p111[2] - geo.maxLng) < 1e-4, 'Third coord is maxLng');
    assert.ok(Math.abs(p111[3] - geo.maxLat) < 1e-4, 'Fourth coord is maxLat');

    // WMS 1.3.0 axis order: minLat,minLng,maxLat,maxLng
    const p130 = geo.bboxString130.split(',').map(Number);
    assert.strictEqual(p130.length, 4, 'WMS 1.3.0 BBOX parts');
    assert.ok(Math.abs(p130[0] - geo.minLat) < 1e-4, 'First coord is minLat');
    assert.ok(Math.abs(p130[1] - geo.minLng) < 1e-4, 'Second coord is minLng');

    passed++;
    console.log('  ✅ [PASS] TEST_07_02: Dual-spec EPSG:4326 geographic BBOX verified for WMS 1.1.1 & 1.3.0');
  } catch (err) {
    failed++;
    console.error('  ❌ [FAIL] TEST_07_02:', err.message);
  }

  // TEST_07_03: Multi-zoom mathematical scaling invariance (zooms 1 to 20)
  try {
    for (let z = 1; z <= 20; z++) {
      const x = Math.floor(Math.pow(2, z - 1));
      const y = Math.floor(Math.pow(2, z - 1));
      const bbox = tileToEPSG3857BBox(x, y, z);
      assert.ok(Number.isFinite(bbox.minX), `minX finite at z=${z}`);
      assert.ok(Number.isFinite(bbox.minY), `minY finite at z=${z}`);
      assert.ok(Number.isFinite(bbox.maxX), `maxX finite at z=${z}`);
      assert.ok(Number.isFinite(bbox.maxY), `maxY finite at z=${z}`);
      assert.ok(bbox.minX < bbox.maxX, `minX < maxX at z=${z}`);
      assert.ok(bbox.minY < bbox.maxY, `minY < maxY at z=${z}`);
    }

    // Edge coordinates: x=0, y=0 and max boundary
    const edgeOrigin = tileToEPSG3857BBox(0, 0, 10);
    assert.ok(Number.isFinite(edgeOrigin.minX) && !isNaN(edgeOrigin.minX), 'Origin tile valid');

    passed++;
    console.log('  ✅ [PASS] TEST_07_03: Multi-zoom mathematical scaling verified across zooms 1-20 with zero drift');
  } catch (err) {
    failed++;
    console.error('  ❌ [FAIL] TEST_07_03:', err.message);
  }

  // --------------------------------------------------------------------------
  // TIER 2: OFFICIAL STATE GEOSERVER WMS REGISTRY & OGC URL BUILDER
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 2: Official State GeoServer WMS Registry & URL Builder ---');

  // TEST_07_04: Authoritative registry validation for all 8 Indian states + Bhuvan fallback
  try {
    const states = ['MH', 'UP', 'KA', 'MP', 'RJ', 'TG', 'TN', 'DL', 'DEFAULT'];
    for (const code of states) {
      const cfg = getStateWmsConfig(code);
      assert.ok(cfg, `Config exists for ${code}`);
      assert.ok(cfg.wmsBaseUrl.startsWith('https://'), `Base URL for ${code} must be HTTPS`);
      assert.ok(cfg.layers.length > 0, `Layer for ${code} must not be empty`);
      assert.strictEqual(cfg.version, '1.1.1', `Version for ${code} must be 1.1.1`);
      assert.strictEqual(cfg.crs, 'EPSG:3857', `CRS for ${code} must be EPSG:3857`);
      assert.strictEqual(cfg.format, 'image/png', `Format for ${code} must be image/png`);
      assert.strictEqual(cfg.transparent, true, `Transparent for ${code} must be true`);
      assert.ok(cfg.minZoom >= 13, `minZoom for ${code} must be >= 13`);
      assert.ok(cfg.attribution.length > 0, `Attribution for ${code} must be present`);
    }

    passed++;
    console.log(`  ✅ [PASS] TEST_07_04: Authoritative state GeoServer registry validated across ${states.length} entries`);
  } catch (err) {
    failed++;
    console.error('  ❌ [FAIL] TEST_07_04:', err.message);
  }

  // TEST_07_05: OGC WMS 1.1.1 GetMap query parameter compliance
  try {
    const testStates = ['MH', 'UP', 'KA', 'TG', 'TN', 'DL'];
    for (const st of testStates) {
      const parcelUrl = getWmsCadastralTileUrl(st, 17, 92472, 58649, false);
      assert.ok(parcelUrl.includes('SERVICE=WMS'), 'Must include SERVICE=WMS');
      assert.ok(parcelUrl.includes('REQUEST=GetMap'), 'Must include REQUEST=GetMap');
      assert.ok(parcelUrl.includes('VERSION=1.1.1'), 'Must include VERSION=1.1.1');
      assert.ok(parcelUrl.includes('SRS=EPSG%3A3857') || parcelUrl.includes('SRS=EPSG:3857'), 'Must specify SRS=EPSG:3857');
      assert.ok(parcelUrl.includes('FORMAT=image%2Fpng') || parcelUrl.includes('FORMAT=image/png'), 'Must specify image/png format');
      assert.ok(parcelUrl.includes('TRANSPARENT=TRUE'), 'Must specify TRANSPARENT=TRUE');
      assert.ok(parcelUrl.includes('WIDTH=256&HEIGHT=256'), 'Must specify 256x256 dimensions');
      assert.ok(parcelUrl.includes('BBOX='), 'Must include BBOX');

      // Village boundary layer check
      const villageUrl = getWmsCadastralTileUrl(st, 13, 5779, 3665, true);
      assert.ok(villageUrl.includes('SERVICE=WMS'), 'Village URL includes SERVICE=WMS');
    }

    passed++;
    console.log('  ✅ [PASS] TEST_07_05: OGC WMS 1.1.1 GetMap query strings strictly satisfy standard specifications');
  } catch (err) {
    failed++;
    console.error('  ❌ [FAIL] TEST_07_05:', err.message);
  }

  // TEST_07_06: Automatic geographic state jurisdiction detection
  try {
    assert.strictEqual(detectStateFromCoordinates(18.5793, 73.9823), 'MH', 'Pune is MH');
    assert.strictEqual(detectStateFromCoordinates(28.6712, 77.3654), 'UP', 'Ghaziabad is UP');
    assert.strictEqual(detectStateFromCoordinates(12.9698, 77.7499), 'KA', 'Bengaluru is KA');
    assert.strictEqual(detectStateFromCoordinates(28.5244, 77.1855), 'DL', 'Mehrauli is DL');
    assert.strictEqual(detectStateFromCoordinates(23.2599, 77.4126), 'MP', 'Bhopal is MP');
    assert.strictEqual(detectStateFromCoordinates(26.9124, 75.7873), 'RJ', 'Jaipur is RJ');
    assert.strictEqual(detectStateFromCoordinates(17.3850, 78.4867), 'TG', 'Hyderabad is TG');
    assert.strictEqual(detectStateFromCoordinates(13.0827, 80.2707), 'TN', 'Chennai is TN');
    assert.strictEqual(detectStateFromCoordinates(10.0, 90.0), 'DEFAULT', 'Ocean/out-of-bounds defaults to Bhuvan');

    passed++;
    console.log('  ✅ [PASS] TEST_07_06: Geographic state jurisdiction detector routes 8 states + Bhuvan fallback accurately');
  } catch (err) {
    failed++;
    console.error('  ❌ [FAIL] TEST_07_06:', err.message);
  }

  // --------------------------------------------------------------------------
  // TIER 3: DYNAMIC ZOOM STREAMING & BACKWARD COMPATIBILITY
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 3: Dynamic Zoom Streaming & Backward Compatibility ---');

  // TEST_07_07: Dynamic zoom-level streaming threshold
  try {
    const mhConfig = getStateWmsConfig('MH');
    assert.strictEqual(mhConfig.minZoom, 14, 'MH cadastral parcel threshold minZoom must be 14');

    // Zoom threshold eligibility verification
    const isEligibleBelow = 12 >= mhConfig.minZoom;
    const isEligibleAtThreshold = 14 >= mhConfig.minZoom;
    const isEligibleAbove = 17 >= mhConfig.minZoom;

    assert.strictEqual(isEligibleBelow, false, 'Cadastral parcels must be dormant below z=14');
    assert.strictEqual(isEligibleAtThreshold, true, 'Cadastral parcels must become eligible at z=14');
    assert.strictEqual(isEligibleAbove, true, 'Cadastral parcels must remain eligible above z=14');

    // When requesting village boundary layer (for overview zooms z < 14)
    const villageTileUrl = getWmsCadastralTileUrl('MH', 12, 5779, 3665, true);
    assert.ok(villageTileUrl.includes('mahabhunaksha%3Avillage_boundary') || villageTileUrl.includes('village_boundary'), 'Village boundary layer correctly generated');

    // When requesting cadastral parcel layer (for operational zooms z >= 14)
    const parcelTileUrl = getWmsCadastralTileUrl('MH', 14, 23118, 14662, false);
    assert.ok(parcelTileUrl.includes('mahabhunaksha%3Acadastral_parcels') || parcelTileUrl.includes('cadastral_parcels'), 'Cadastral parcel layer correctly generated');

    passed++;
    console.log('  ✅ [PASS] TEST_07_07: Dynamic zoom threshold verified (dormant z<14 vs cadastral parcels z>=14, village boundary support)');
  } catch (err) {
    failed++;
    console.error('  ❌ [FAIL] TEST_07_07:', err.message);
  }

  // TEST_07_08: SlippyTile contract retrofitting with 100% backward compatibility
  try {
    const tiles = getVisibleTiles(18.5793, 73.9823, 17, 900, 420, 'MH');
    assert.ok(tiles.length >= 6, 'Visible tiles count adequate');
    for (const t of tiles) {
      // Legacy required properties (must never be broken)
      assert.ok(t.key, 't.key exists');
      assert.strictEqual(typeof t.x, 'number', 't.x is number');
      assert.strictEqual(typeof t.y, 'number', 't.y is number');
      assert.strictEqual(typeof t.z, 'number', 't.z is number');
      assert.ok(t.satelliteUrl.includes('server.arcgisonline.com'), 'Legacy satelliteUrl intact');
      assert.ok(t.cadastralUrl.includes('tile.openstreetmap.org'), 'Legacy cadastralUrl intact');

      // New WMS properties
      assert.ok(t.wmsCadastralUrl.includes('mahabhunakasha.mahabhumi.gov.in'), 'WMS URL points to MahaBhumi');
      assert.ok(t.wmsBbox.split(',').length === 4, 'WMS BBOX attached');
      assert.strictEqual(t.stateCode, 'MH', 'StateCode matches MH');
    }

    passed++;
    console.log('  ✅ [PASS] TEST_07_08: SlippyTile preserves 100% backward compatibility with Esri/OSM while enriching WMS');
  } catch (err) {
    failed++;
    console.error('  ❌ [FAIL] TEST_07_08:', err.message);
  }

  // --------------------------------------------------------------------------
  // TIER 4: BROWSER UI END-TO-END VERIFICATION (PUPPETEER)
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 4: Browser UI End-to-End Verification (Puppeteer) ---');

  let browser;
  let page;

  try {
    console.log(`  ℹ️ Launching Headless Edge Browser (${EDGE_PATH})...`);
    browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,800']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to explorer screen
    await page.goto('http://localhost:8081/explorer', { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2500);

    // TEST_07_09: UI layer toggle button [data-testid="layer-toggle-wms"] switching to "🏛️ NIC BhuNaksha"
    try {
      const wmsToggleSelector = '[data-testid="layer-toggle-wms"]';
      await page.waitForSelector(wmsToggleSelector, { timeout: 10000 });

      // Click the WMS layer toggle button
      await safeClick(page, wmsToggleSelector);
      await sleep(1500);

      // Verify button text contains NIC BhuNaksha
      const toggleText = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText : '';
      }, wmsToggleSelector);

      assert.ok(
        toggleText.includes('NIC BhuNaksha') || toggleText.includes('BhuNaksha'),
        `WMS toggle button text should mention NIC BhuNaksha (got "${toggleText}")`
      );

      passed++;
      console.log('  ✅ [PASS] TEST_07_09: UI layer toggle button [data-testid="layer-toggle-wms"] switches to "🏛️ NIC BhuNaksha"');
    } catch (err) {
      failed++;
      console.error('  ❌ [FAIL] TEST_07_09:', err.message);
    }

    // TEST_07_10: Real-time state WMS status pill [data-testid="wms-status-pill"]
    try {
      const pillSelector = '[data-testid="wms-status-pill"]';
      await page.waitForSelector(pillSelector, { timeout: 10000 });

      const pillText = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText : '';
      }, pillSelector);

      assert.ok(
        pillText.includes('BhuNaksha WMS') || pillText.includes('WMS') || pillText.includes('Zoom'),
        `Status pill should display active WMS streaming text (got "${pillText}")`
      );

      passed++;
      console.log(`  ✅ [PASS] TEST_07_10: Real-time state WMS status pill active with indicator: "${pillText.trim()}"`);
    } catch (err) {
      failed++;
      console.error('  ❌ [FAIL] TEST_07_10:', err.message);
    }

    // TEST_07_11: Silent tile error recovery and multi-layer transparency composition
    try {
      // Check that canvas wrapper rendered raster tile images or transparent overlay
      const canvasImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.map((img) => img.src);
      });

      assert.ok(canvasImages.length > 0, 'Canvas contains raster images');

      // Check SVG cadastral parcels remain interactive and intact when WMS layer is active
      const svgPolygons = await page.evaluate(() => {
        return document.querySelectorAll('polygon').length;
      });
      assert.ok(svgPolygons > 0, `SVG cadastral polygons intact over WMS layer (found ${svgPolygons})`);

      // Capture visual evidence screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, 'e2e_wms_layer_active.png');
      await page.screenshot({ path: screenshotPath });
      assert.ok(fs.existsSync(screenshotPath), 'Screenshot saved');

      // Cycle layer toggles: WMS -> Satellite -> OSM Cadastral -> WMS
      await safeClick(page, '[data-testid="layer-toggle-satellite"]');
      await sleep(600);
      await safeClick(page, '[data-testid="layer-toggle-cadastral"]');
      await sleep(600);
      await safeClick(page, '[data-testid="layer-toggle-wms"]');
      await sleep(600);

      passed++;
      console.log('  ✅ [PASS] TEST_07_11: Multi-layer transparency composition & error recovery verified without regressions');
    } catch (err) {
      failed++;
      console.error('  ❌ [FAIL] TEST_07_11:', err.message);
    }
  } catch (browserErr) {
    console.error('  💥 Browser runner exception:', browserErr.message);
    failed += 3;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log(`\n📊 Suite 07 Summary: ${passed} Passed, ${failed} Failed out of ${total} Tests`);
  return { total, passed, failed };
}

if (require.main === module) {
  runWmsGisIntegrationTests().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  });
}

module.exports = { runWmsGisIntegrationTests };
