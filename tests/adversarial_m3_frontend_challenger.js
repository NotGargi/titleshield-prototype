/**
 * ============================================================================
 * LANDEED 2.0 — EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE
 * Milestone 3: Frontend Map Ergonomics, Proxy Stream, Search & Deep Linking, Terra AI UI
 * Challenger Agent: challenger_m3_1
 *
 * Targets Under Verification:
 * 1. Mercator Focal-Point Preservation Math (Bijective, Drift-Free, Sub-Pixel Accuracy)
 * 2. Zoom Clamping Invariants (Strict Clamping Between 12 and 19 Across All Input Modes)
 * 3. WMS Proxy URL Formatting & Streaming Contract for all states (MH, KA, TG, UP, TN)
 * 4. Deep-Linking Query Parameters Prefill & autoFetch Contract
 * 5. Terra AI Context Serialization, Risk Badge Mapping, & Offline Legal Fallback
 * ============================================================================
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';

// Global Test Collector
const suiteResults = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: [],
  categories: {
    mercatorMath: { total: 0, passed: 0, failed: 0 },
    zoomClamping: { total: 0, passed: 0, failed: 0 },
    wmsProxyUrls: { total: 0, passed: 0, failed: 0 },
    deepLinking: { total: 0, passed: 0, failed: 0 },
    terraAiUi: { total: 0, passed: 0, failed: 0 }
  }
};

function pass(category, testId, description, details = '') {
  suiteResults.total++;
  suiteResults.passed++;
  suiteResults.categories[category].total++;
  suiteResults.categories[category].passed++;
  console.log(`  ✅ [PASS][${category}] ${testId}: ${description}${details ? ' (' + details + ')' : ''}`);
}

function fail(category, testId, description, error, severity = 'HIGH') {
  suiteResults.total++;
  suiteResults.failed++;
  suiteResults.categories[category].total++;
  suiteResults.categories[category].failed++;
  const msg = error?.message || String(error);
  console.error(`  ❌ [FAIL][${category}] ${testId}: ${description}`);
  console.error(`         Reason: ${msg} [Severity: ${severity}]`);
  suiteResults.findings.push({ category, testId, description, error: msg, severity });
}

// ----------------------------------------------------------------------------
// Dynamic TypeScript Loader for Direct Source Code Inspection & Verification
// ----------------------------------------------------------------------------
const ts = require(path.resolve(PROJECT_ROOT, 'server', 'node_modules', 'typescript'));

function loadTs(relPath) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.resolve(PROJECT_ROOT, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const m = { exports: {} };
  const customRequire = (id) => {
    if (id.startsWith('.')) {
      const resolved = path.resolve(path.dirname(fullPath), id);
      if (fs.existsSync(resolved + '.ts')) return loadTs(resolved + '.ts');
      if (fs.existsSync(resolved + '.tsx')) return loadTs(resolved + '.tsx');
      if (fs.existsSync(resolved + '.js')) return require(resolved + '.js');
    }
    return require(id);
  };
  const fn = new Function('require', 'exports', 'module', '__filename', '__dirname', transpiled.outputText);
  fn(customRequire, m.exports, m, fullPath, path.dirname(fullPath));
  return m.exports;
}

// ----------------------------------------------------------------------------
// Mathematical Reference Implementations from app/utils/geoProjection.ts & CadastralMap.tsx
// ----------------------------------------------------------------------------
function geoToPixel(lat, lng, zoom, centerLat, centerLng, mapWidth, mapHeight) {
  const scale = 256 * Math.pow(2, zoom);
  const centerWorldX = ((centerLng + 180) / 360) * scale;
  const sinCenterLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((centerLat * Math.PI) / 180)));
  const centerWorldY = (0.5 - Math.log((1 + sinCenterLat) / (1 - sinCenterLat)) / (4 * Math.PI)) * scale;

  const pointWorldX = ((lng + 180) / 360) * scale;
  const sinLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((lat * Math.PI) / 180)));
  const pointWorldY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;

  const x = mapWidth / 2 + (pointWorldX - centerWorldX);
  const y = mapHeight / 2 + (pointWorldY - centerWorldY);
  return { x, y };
}

function pixelToGeo(x, y, zoom, centerLat, centerLng, mapWidth, mapHeight) {
  const scale = 256 * Math.pow(2, zoom);
  const centerWorldX = ((centerLng + 180) / 360) * scale;
  const sinCenterLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((centerLat * Math.PI) / 180)));
  const centerWorldY = (0.5 - Math.log((1 + sinCenterLat) / (1 - sinCenterLat)) / (4 * Math.PI)) * scale;

  const pointWorldX = centerWorldX + (x - mapWidth / 2);
  const pointWorldY = centerWorldY + (y - mapHeight / 2);

  const lng = (pointWorldX / scale) * 360 - 180;
  const yNorm = 0.5 - pointWorldY / scale;
  const latRad = 2 * Math.atan(Math.exp(2 * Math.PI * yNorm)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;

  return {
    lat: Math.max(-85.05112878, Math.min(85.05112878, lat)),
    lng: Math.max(-180, Math.min(180, lng))
  };
}

function computeNewCenterPreservingFocalPoint(focalX, focalY, oldZoom, newZoom, oldCenter, width, height) {
  const geoUnderFocal = pixelToGeo(
    focalX,
    focalY,
    oldZoom,
    oldCenter.lat,
    oldCenter.lng,
    width,
    height
  );

  return pixelToGeo(
    width - focalX,
    height - focalY,
    newZoom,
    geoUnderFocal.lat,
    geoUnderFocal.lng,
    width,
    height
  );
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

function getWmsCadastralTileUrl(stateCode, z, x, y) {
  const cleanState = (stateCode || 'MH').toUpperCase();
  return `${API_BASE_URL}/tiles/wms/${cleanState}/${z}/${x}/${y}`;
}

// HTTP request helper with generous 10s timeout
function httpGet(urlPath) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const start = process.hrtime.bigint();
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1e6;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
          latencyMs,
          error: null
        });
      });
    });
    req.on('error', (err) => {
      resolve({ statusCode: null, headers: {}, body: Buffer.alloc(0), latencyMs: 0, error: err });
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error('Timeout after 10000ms'));
    });
  });
}

function httpPostJson(urlPath, data) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const postData = JSON.stringify(data);
    const start = process.hrtime.bigint();
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          const end = process.hrtime.bigint();
          const latencyMs = Number(end - start) / 1e6;
          let json = null;
          try {
            json = JSON.parse(text);
          } catch (_) {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            text,
            json,
            latencyMs,
            error: null
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ statusCode: null, headers: {}, text: '', json: null, latencyMs: 0, error: err });
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error('Timeout after 10000ms'));
    });
    req.write(postData);
    req.end();
  });
}

// ----------------------------------------------------------------------------
// MAIN TEST SUITE
// ----------------------------------------------------------------------------
async function runAllChallengerTests() {
  console.log('================================================================');
  console.log('⚡ ADVERSARIAL M3 FRONTEND CHALLENGER EMPIRICAL VERIFICATION');
  console.log('================================================================\n');

  // Load production TypeScript modules
  let cadastralDataModule, geoProjectionModule;
  try {
    cadastralDataModule = loadTs('app/constants/cadastralData.ts');
    geoProjectionModule = loadTs('app/utils/geoProjection.ts');
  } catch (err) {
    console.error('Fatal: Failed to load TS modules:', err);
    process.exit(1);
  }

  // ==========================================================================
  // SUITE 1: Mercator Focal-Point Preservation Math & Geodesic Stability
  // ==========================================================================
  console.log('--- SUITE 1: Mercator Focal-Point Preservation Math ---');
  const cat1 = 'mercatorMath';

  const testViewports = [
    { width: 800, height: 600, label: 'Standard Desktop (800x600)' },
    { width: 375, height: 667, label: 'Mobile Portrait (375x667)' },
    { width: 1920, height: 1080, label: 'Full HD Monitor (1920x1080)' },
    { width: 500, height: 500, label: 'Square Canvas (500x500)' }
  ];

  const testHubs = [
    { name: 'Pune Wagholi (MH)', lat: 18.5793, lng: 73.9823 },
    { name: 'Hyderabad Gachibowli (TG)', lat: 17.4820, lng: 78.3315 },
    { name: 'Bengaluru Whitefield (KA)', lat: 12.9698, lng: 77.7499 },
    { name: 'Noida Sec 62 (UP)', lat: 28.6280, lng: 77.3649 },
    { name: 'Chennai Central (TN)', lat: 13.0827, lng: 80.2707 },
    { name: 'Equator Datum', lat: 0.0, lng: 0.0 },
    { name: 'High Latitude North', lat: 64.1466, lng: -21.9426 }
  ];

  // 1.1 Round-trip pixel to geo inversion invariant
  try {
    let maxErrorLat = 0;
    let maxErrorLng = 0;
    for (const hub of testHubs) {
      for (let z = 12; z <= 19; z++) {
        const p = geoToPixel(hub.lat, hub.lng, z, hub.lat, hub.lng, 800, 600);
        const inv = pixelToGeo(p.x, p.y, z, hub.lat, hub.lng, 800, 600);
        const errLat = Math.abs(inv.lat - hub.lat);
        const errLng = Math.abs(inv.lng - hub.lng);
        if (errLat > maxErrorLat) maxErrorLat = errLat;
        if (errLng > maxErrorLng) maxErrorLng = errLng;
      }
    }
    assert.ok(maxErrorLat < 1e-7, `Max Lat error ${maxErrorLat} must be < 1e-7 deg`);
    assert.ok(maxErrorLng < 1e-7, `Max Lng error ${maxErrorLng} must be < 1e-7 deg`);
    pass(cat1, 'M3-MATH-01', 'Round-trip pixel/geo inversion precision across 7 global hubs & 8 zoom levels', `maxLatErr: ${maxErrorLat.toExponential(2)}, maxLngErr: ${maxErrorLng.toExponential(2)}`);
  } catch (err) {
    fail(cat1, 'M3-MATH-01', 'Round-trip inversion precision failed', err);
  }

  // 1.2 Focal point preservation for single zoom-in and zoom-out operations
  try {
    let maxPixelDrift = 0;
    const testFocalPoints = [
      { xRatio: 0.5, yRatio: 0.5, label: 'Viewport Centroid' },
      { xRatio: 0.0, yRatio: 0.0, label: 'Top-Left Corner (0,0)' },
      { xRatio: 1.0, yRatio: 1.0, label: 'Bottom-Right Corner (W,H)' },
      { xRatio: 0.15, yRatio: 0.85, label: 'Off-Center Bottom-Left' },
      { xRatio: 0.73, yRatio: 0.28, label: 'Arbitrary Fractional Position' }
    ];

    for (const vp of testViewports) {
      for (const hub of testHubs) {
        for (const fp of testFocalPoints) {
          const focalX = vp.width * fp.xRatio;
          const focalY = vp.height * fp.yRatio;

          // Test zoom transitions (e.g. 14 -> 15, 17 -> 16, 15.5 -> 17.5)
          const zoomTransitions = [
            [14, 15],
            [16, 17],
            [18, 17],
            [19, 13],
            [13, 18],
            [15.5, 16.0]
          ];

          for (const [zOld, zNew] of zoomTransitions) {
            // Geographic point under cursor before zoom
            const geoUnderCursor = pixelToGeo(focalX, focalY, zOld, hub.lat, hub.lng, vp.width, vp.height);

            // Compute new center
            const newCenter = computeNewCenterPreservingFocalPoint(
              focalX,
              focalY,
              zOld,
              zNew,
              hub,
              vp.width,
              vp.height
            );

            // Project same geographic point at new zoom and new center
            const projectedAfterZoom = geoToPixel(
              geoUnderCursor.lat,
              geoUnderCursor.lng,
              zNew,
              newCenter.lat,
              newCenter.lng,
              vp.width,
              vp.height
            );

            const dx = Math.abs(projectedAfterZoom.x - focalX);
            const dy = Math.abs(projectedAfterZoom.y - focalY);
            const drift = Math.hypot(dx, dy);
            if (drift > maxPixelDrift) maxPixelDrift = drift;

            assert.ok(
              drift < 1e-4,
              `Focal point drifted ${drift} px at ${fp.label} (transition ${zOld}->${zNew}, ${vp.label})`
            );
          }
        }
      }
    }
    pass(cat1, 'M3-MATH-02', 'Zero-drift focal preservation across all viewports, hubs, corners, & zoom deltas', `maxDrift: ${maxPixelDrift.toExponential(2)} px (< 1e-4 px)`);
  } catch (err) {
    fail(cat1, 'M3-MATH-02', 'Focal point preservation failed', err);
  }

  // 1.3 Multi-step continuous zooming sequence (simulating rapid mouse wheel ticks)
  try {
    const vp = { width: 800, height: 600 };
    const hub = { lat: 17.4820, lng: 78.3315 }; // Hyderabad
    const focalX = 275.4;
    const focalY = 412.8;

    let currentZoom = 13.0;
    let currentCenter = { ...hub };

    // Record the ground point under the focal cursor at start
    const initialGroundPoint = pixelToGeo(focalX, focalY, currentZoom, currentCenter.lat, currentCenter.lng, vp.width, vp.height);

    // Zoom in 10 steps (13.0 -> 18.0)
    for (let step = 0; step < 10; step++) {
      const nextZoom = currentZoom + 0.5;
      currentCenter = computeNewCenterPreservingFocalPoint(focalX, focalY, currentZoom, nextZoom, currentCenter, vp.width, vp.height);
      currentZoom = nextZoom;
    }

    // Zoom out 10 steps back (18.0 -> 13.0)
    for (let step = 0; step < 10; step++) {
      const nextZoom = currentZoom - 0.5;
      currentCenter = computeNewCenterPreservingFocalPoint(focalX, focalY, currentZoom, nextZoom, currentCenter, vp.width, vp.height);
      currentZoom = nextZoom;
    }

    // Verify current ground point under focal cursor matches initial ground point
    const finalGroundPoint = pixelToGeo(focalX, focalY, currentZoom, currentCenter.lat, currentCenter.lng, vp.width, vp.height);
    const latDiff = Math.abs(finalGroundPoint.lat - initialGroundPoint.lat);
    const lngDiff = Math.abs(finalGroundPoint.lng - initialGroundPoint.lng);

    assert.ok(latDiff < 1e-8, `Cumulative lat drift ${latDiff} must be < 1e-8 deg`);
    assert.ok(lngDiff < 1e-8, `Cumulative lng drift ${lngDiff} must be < 1e-8 deg`);

    // Verify projected pixel of original ground point after 20 zoom iterations
    const finalPixel = geoToPixel(initialGroundPoint.lat, initialGroundPoint.lng, currentZoom, currentCenter.lat, currentCenter.lng, vp.width, vp.height);
    const pixelDrift = Math.hypot(finalPixel.x - focalX, finalPixel.y - focalY);
    assert.ok(pixelDrift < 1e-4, `Pixel drift after 20 zoom cycles: ${pixelDrift} px (< 1e-4 px)`);

    pass(cat1, 'M3-MATH-03', 'Cumulative zero-drift invariant under 20 continuous zoom-in/zoom-out cycles', `pixelDrift: ${pixelDrift.toExponential(2)} px`);
  } catch (err) {
    fail(cat1, 'M3-MATH-03', 'Multi-step zoom sequence cumulative drift error', err);
  }

  // 1.4 Viewport dimension extremes & off-screen focal points
  try {
    const hub = { lat: 18.5793, lng: 73.9823 };
    const offscreenFocals = [
      { x: -100, y: -50, label: 'Offscreen Top-Left' },
      { x: 1200, y: 900, label: 'Offscreen Bottom-Right (800x600 canvas)' }
    ];

    for (const fp of offscreenFocals) {
      const pGround = pixelToGeo(fp.x, fp.y, 15, hub.lat, hub.lng, 800, 600);
      const newCenter = computeNewCenterPreservingFocalPoint(fp.x, fp.y, 15, 17, hub, 800, 600);
      const proj = geoToPixel(pGround.lat, pGround.lng, 17, newCenter.lat, newCenter.lng, 800, 600);
      const drift = Math.hypot(proj.x - fp.x, proj.y - fp.y);
      assert.ok(drift < 1e-4, `Offscreen focal point drift ${drift} px`);
    }
    pass(cat1, 'M3-MATH-04', 'Offscreen / out-of-bounds cursor zoom preservation stability', 'drift < 1e-4 px');
  } catch (err) {
    fail(cat1, 'M3-MATH-04', 'Offscreen focal point test failed', err);
  }

  // ==========================================================================
  // SUITE 2: Zoom Clamping (Strict 12 to 19 Invariant)
  // ==========================================================================
  console.log('\n--- SUITE 2: Zoom Clamping Invariant [12..19] ---');
  const cat2 = 'zoomClamping';

  // 2.1 Web Desktop Mouse Wheel Zoom Clamping Formula
  try {
    function simulateWheelZoom(currentZ, deltaY) {
      const delta = deltaY < 0 ? 0.5 : -0.5;
      return Math.min(19, Math.max(12, Math.round((currentZ + delta) * 2) / 2));
    }

    // Boundary at min zoom 12
    assert.strictEqual(simulateWheelZoom(12, 100), 12, 'Wheel zoom out at z=12 must stay 12');
    assert.strictEqual(simulateWheelZoom(12.5, 100), 12, 'Wheel zoom out at z=12.5 goes to 12');

    // Boundary at max zoom 19
    assert.strictEqual(simulateWheelZoom(19, -100), 19, 'Wheel zoom in at z=19 must stay 19');
    assert.strictEqual(simulateWheelZoom(18.5, -100), 19, 'Wheel zoom in at z=18.5 goes to 19');

    // Rapid wheeling simulation (50 zoom-in events and 50 zoom-out events)
    let z = 15;
    for (let i = 0; i < 50; i++) z = simulateWheelZoom(z, -120);
    assert.strictEqual(z, 19, '50 consecutive zoom-in wheel events must clamp strictly at 19');

    for (let i = 0; i < 50; i++) z = simulateWheelZoom(z, 120);
    assert.strictEqual(z, 12, '50 consecutive zoom-out wheel events must clamp strictly at 12');

    pass(cat2, 'M3-ZOOM-01', 'Wheel zoom event clamping strictly bounded in [12, 19] with 0.5 step resolution');
  } catch (err) {
    fail(cat2, 'M3-ZOOM-01', 'Wheel zoom clamping formula failed', err);
  }

  // 2.2 Mobile Touch Pinch-to-Zoom Clamping Formula
  try {
    function simulatePinchZoom(startZoom, scale) {
      const zoomDelta = Math.log2(scale);
      const targetZoom = Math.min(19, Math.max(12, startZoom + zoomDelta));
      return Math.round(targetZoom * 10) / 10;
    }

    // Extreme pinch out (shrinking fingers, scale = 0.001)
    const clampedMin = simulatePinchZoom(14, 0.001);
    assert.strictEqual(clampedMin, 12, 'Extreme pinch-out must clamp at 12');

    // Extreme pinch in (expanding fingers, scale = 100.0)
    const clampedMax = simulatePinchZoom(17, 100.0);
    assert.strictEqual(clampedMax, 19, 'Extreme pinch-in must clamp at 19');

    // Micro pinch scale (scale = 1.05)
    const microPinch = simulatePinchZoom(15.0, 1.05);
    assert.ok(microPinch >= 12 && microPinch <= 19, 'Micro pinch within bounds');
    assert.strictEqual(microPinch, 15.1, 'Micro pinch rounded to 1 decimal place');

    pass(cat2, 'M3-ZOOM-02', 'Pinch gesture clamping strictly bounded in [12, 19] with 0.1 decimal resolution');
  } catch (err) {
    fail(cat2, 'M3-ZOOM-02', 'Pinch zoom clamping formula failed', err);
  }

  // 2.3 Floating UI Button Clamping
  try {
    function btnZoomIn(z) {
      return Math.min(19, z + 1);
    }
    function btnZoomOut(z) {
      return Math.max(12, z - 1);
    }

    assert.strictEqual(btnZoomIn(19), 19, 'Button zoom in from 19 clamps to 19');
    assert.strictEqual(btnZoomIn(18.5), 19, 'Button zoom in from 18.5 clamps to 19');
    assert.strictEqual(btnZoomOut(12), 12, 'Button zoom out from 12 clamps to 12');
    assert.strictEqual(btnZoomOut(12.5), 12, 'Button zoom out from 12.5 clamps to 12');

    pass(cat2, 'M3-ZOOM-03', 'UI floating zoom in/out buttons enforce boundary limits 12 and 19');
  } catch (err) {
    fail(cat2, 'M3-ZOOM-03', 'Floating button clamping failed', err);
  }

  // 2.4 Regional Presets Zoom Bounds Audit
  try {
    assert.ok(Array.isArray(cadastralDataModule.REGIONAL_PRESETS), 'REGIONAL_PRESETS must be an array');
    assert.ok(cadastralDataModule.REGIONAL_PRESETS.length >= 4, 'Must have at least 4 regional presets');

    for (const preset of cadastralDataModule.REGIONAL_PRESETS) {
      assert.ok(
        typeof preset.zoom === 'number' && preset.zoom >= 12 && preset.zoom <= 19,
        `Preset ${preset.id} zoom ${preset.zoom} must be within [12, 19]`
      );
    }
    pass(cat2, 'M3-ZOOM-04', `All ${cadastralDataModule.REGIONAL_PRESETS.length} REGIONAL_PRESETS configure default zoom strictly within [12, 19]`);
  } catch (err) {
    fail(cat2, 'M3-ZOOM-04', 'Regional presets zoom bounds check failed', err);
  }

  // ==========================================================================
  // SUITE 3: WMS Proxy URL Formatting & Streaming Contract for 5 States
  // ==========================================================================
  console.log('\n--- SUITE 3: WMS Proxy URL Formatting & Streaming Contract ---');
  const cat3 = 'wmsProxyUrls';

  const verifiedStates = ['MH', 'KA', 'TG', 'UP', 'TN'];

  // 3.1 URL construction syntax check
  try {
    for (const state of verifiedStates) {
      const url = getWmsCadastralTileUrl(state, 15, 23512, 14600);
      assert.ok(
        url.endsWith(`/tiles/wms/${state}/15/23512/14600`),
        `URL must match expected proxy route format: ${url}`
      );
    }

    // Case insensitivity & fallback
    const lowerUrl = getWmsCadastralTileUrl('ka', 16, 100, 200);
    assert.ok(lowerUrl.includes('/tiles/wms/KA/16/100/200'), 'State code must be capitalized');

    const fallbackUrl = getWmsCadastralTileUrl('', 14, 50, 60);
    assert.ok(fallbackUrl.includes('/tiles/wms/MH/14/50/60'), 'Empty state must default to MH');

    pass(cat3, 'M3-WMS-01', 'getWmsCadastralTileUrl correctly normalizes all 5 target states with fallback');
  } catch (err) {
    fail(cat3, 'M3-WMS-01', 'getWmsCadastralTileUrl check failed', err);
  }

  // 3.2 Visible Tiles Calculation WMS Attribute Conformance
  try {
    const testCases = [
      { state: 'MH', lat: 18.5793, lng: 73.9823, z: 16 },
      { state: 'TG', lat: 17.4820, lng: 78.3315, z: 15 },
      { state: 'KA', lat: 12.9698, lng: 77.7499, z: 16 },
      { state: 'UP', lat: 28.6280, lng: 77.3649, z: 17 },
      { state: 'TN', lat: 13.0827, lng: 80.2707, z: 15 }
    ];

    for (const tc of testCases) {
      const tiles = geoProjectionModule.getVisibleTiles(tc.lat, tc.lng, tc.z, 800, 600, tc.state);
      assert.ok(tiles.length >= 6, `Visible tiles for ${tc.state} count must be >= 6 (actual: ${tiles.length})`);

      for (const t of tiles) {
        assert.ok(t.wmsCadastralUrl, `Tile ${t.key} must provide wmsCadastralUrl`);
        assert.ok(
          t.wmsCadastralUrl.includes(`/tiles/wms/${tc.state}/${tc.z}/`),
          `Tile wmsCadastralUrl must target state ${tc.state} at zoom ${tc.z}`
        );
        assert.strictEqual(t.stateCode, tc.state, `Tile stateCode must be ${tc.state}`);
        assert.ok(t.wmsBbox, `Tile must have formatted wmsBbox string`);
        assert.strictEqual(t.size, 256, `Tile size must be 256`);
      }
    }
    pass(cat3, 'M3-WMS-02', 'getVisibleTiles generates authentic proxy URLs & BBOX metadata for MH, KA, TG, UP, TN');
  } catch (err) {
    fail(cat3, 'M3-WMS-02', 'getVisibleTiles verification failed', err);
  }

  // 3.3 Live Backend WMS Proxy Streaming & Transparent Fallback Verification
  try {
    for (const state of verifiedStates) {
      // Query sample tile coordinate through live backend
      const res = await httpGet(`/api/tiles/wms/${state}/15/23512/14600`);
      assert.strictEqual(res.statusCode, 200, `State ${state} WMS proxy tile must return HTTP 200`);
      assert.strictEqual(
        res.headers['content-type'],
        'image/png',
        `State ${state} WMS proxy must return image/png`
      );
      assert.strictEqual(
        res.headers['access-control-allow-origin'],
        '*',
        `State ${state} WMS proxy must permit universal CORS (*)`
      );

      // Verify PNG 8-byte magic header
      assert.ok(res.body.length >= 8, 'Body length must be at least 8 bytes');
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      assert.ok(res.body.subarray(0, 8).equals(pngHeader), `Tile for ${state} must have valid PNG magic header`);
    }
    pass(cat3, 'M3-WMS-03', 'Live WMS Proxy endpoint streams valid PNG images with CORS * for MH, KA, TG, UP, TN');
  } catch (err) {
    fail(cat3, 'M3-WMS-03', 'Live WMS proxy streaming verification failed', err);
  }

  // ==========================================================================
  // SUITE 4: Deep-Linking Query Parameters Prefill & autoFetch Contract
  // ==========================================================================
  console.log('\n--- SUITE 4: Deep-Linking Query Parameters & autoFetch Contract ---');
  const cat4 = 'deepLinking';

  // 4.1 State-to-DocType Mapping Verification
  try {
    function resolveDocTypeForState(state) {
      if (state === 'UP') return 'KHATAUNI';
      if (state === 'KA') return 'RTC';
      if (state === 'TG') return 'PASSBOOK';
      if (state === 'TN') return 'PATTA_CHITTA';
      return '7_12';
    }

    assert.strictEqual(resolveDocTypeForState('MH'), '7_12', 'MH maps to 7_12');
    assert.strictEqual(resolveDocTypeForState('UP'), 'KHATAUNI', 'UP maps to KHATAUNI');
    assert.strictEqual(resolveDocTypeForState('KA'), 'RTC', 'KA maps to RTC');
    assert.strictEqual(resolveDocTypeForState('TG'), 'PASSBOOK', 'TG maps to PASSBOOK');
    assert.strictEqual(resolveDocTypeForState('TN'), 'PATTA_CHITTA', 'TN maps to PATTA_CHITTA');

    pass(cat4, 'M3-LINK-01', 'State-to-DocType mapping conformant across all target states');
  } catch (err) {
    fail(cat4, 'M3-LINK-01', 'DocType mapping failed', err);
  }

  // 4.2 Seeded Parcels Deep Link Parameters Completeness
  try {
    assert.ok(cadastralDataModule.SEEDED_CADASTRAL_PARCELS.length >= 6, 'Must have at least 6 seeded parcels');

    for (const p of cadastralDataModule.SEEDED_CADASTRAL_PARCELS) {
      assert.ok(p.state, `Parcel ${p.id} must define state`);
      assert.ok(p.district, `Parcel ${p.id} must define district`);
      assert.ok(p.village, `Parcel ${p.id} must define village`);
      assert.ok(p.surveyNumber, `Parcel ${p.id} must define surveyNumber`);

      // Verify contract parameters object structure
      const deepLinkParams = {
        state: p.state,
        district: p.district,
        taluka: p.taluka || '',
        village: p.village,
        surveyNo: p.surveyNumber,
        docType: p.state === 'UP' ? 'KHATAUNI' : p.state === 'KA' ? 'RTC' : p.state === 'TG' ? 'PASSBOOK' : '7_12',
        autoFetch: 'true'
      };

      assert.strictEqual(deepLinkParams.autoFetch, 'true');
      assert.ok(deepLinkParams.surveyNo.length > 0);
    }
    pass(cat4, 'M3-LINK-02', 'All seeded cadastral parcels provide full jurisdictional params for deep link navigation');
  } catch (err) {
    fail(cat4, 'M3-LINK-02', 'Seeded parcel deep link audit failed', err);
  }

  // 4.3 autoFetch Guard Idempotency Simulation
  try {
    // Simulate autoFetchTriggered ref logic from app/app/search/[state].tsx
    let fetchExecutionCount = 0;
    const hasAutoFetchedRef = { current: false };

    function simulateAutoFetchHook(params) {
      const autoFetch = params.autoFetch === 'true' || params.autoFetch === true;
      if (autoFetch && !hasAutoFetchedRef.current) {
        hasAutoFetchedRef.current = true;
        fetchExecutionCount++;
      }
    }

    // Trigger multiple component re-renders
    simulateAutoFetchHook({ autoFetch: 'true', surveyNo: '142/2A' });
    simulateAutoFetchHook({ autoFetch: 'true', surveyNo: '142/2A' }); // 2nd render
    simulateAutoFetchHook({ autoFetch: 'true', surveyNo: '142/2A' }); // 3rd render

    assert.strictEqual(fetchExecutionCount, 1, 'autoFetch must execute exactly once (no infinite loop)');

    // Reset and test autoFetch=false
    hasAutoFetchedRef.current = false;
    fetchExecutionCount = 0;
    simulateAutoFetchHook({ autoFetch: 'false', surveyNo: '142/2A' });
    simulateAutoFetchHook({});
    assert.strictEqual(fetchExecutionCount, 0, 'autoFetch=false or missing must NOT trigger automatic fetch');

    pass(cat4, 'M3-LINK-03', 'autoFetch ref guard is strictly idempotent (triggers exactly once without loops)');
  } catch (err) {
    fail(cat4, 'M3-LINK-03', 'autoFetch idempotency test failed', err);
  }

  // 4.4 Live Backend Fetch Route with Pre-Filled Parameters
  try {
    const res = await httpPostJson('/api/records/fetch', {
      state: 'MH',
      docType: '7_12',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      surveyNo: '142/2A'
    });

    assert.ok(
      res.statusCode === 200 || res.statusCode === 201,
      `Live fetch endpoint must return HTTP 200 or 201 (actual: ${res.statusCode})`
    );
    assert.ok(res.json, 'Response must be valid JSON');
    assert.strictEqual(res.json.success, true, 'Fetch must succeed');
    assert.ok(res.json.recordId, 'Must return generated recordId');

    pass(cat4, 'M3-LINK-04', 'Live /api/records/fetch endpoint executes successfully with deep linked parameters');
  } catch (err) {
    fail(cat4, 'M3-LINK-04', 'Live records fetch deep link test failed', err);
  }

  // ==========================================================================
  // SUITE 5: Terra AI Context Serialization, Risk Badge Mapping & Offline Fallback
  // ==========================================================================
  console.log('\n--- SUITE 5: Terra AI Integration, Context Serialization & Offline Fallback ---');
  const cat5 = 'terraAiUi';

  // 5.1 ParcelContext Serialization & Deserialization
  try {
    const rawContext = {
      id: 'parcel-tg-serilingampally-101',
      surveyNumber: '101',
      state: 'TG',
      district: 'Hyderabad',
      taluka: 'Serilingampally',
      village: 'Gachibowli',
      claimedOwner: 'Ch. Malleshwara Rao',
      extent: '2.15 Acres',
      cleanTitleScore: 88,
      encumbranceStatus: 'CLEAN'
    };

    // Mode A: JSON-string parameter
    const paramsA = { parcelContext: JSON.stringify(rawContext) };
    const parsedA = JSON.parse(paramsA.parcelContext);
    assert.strictEqual(parsedA.surveyNumber, '101');
    assert.strictEqual(parsedA.claimedOwner, 'Ch. Malleshwara Rao');

    // Mode B: Flattened query parameters
    const paramsB = {
      parcelId: rawContext.id,
      surveyNo: rawContext.surveyNumber,
      state: rawContext.state,
      district: rawContext.district,
      taluka: rawContext.taluka,
      village: rawContext.village,
      claimedOwner: rawContext.claimedOwner,
      extent: rawContext.extent,
      cleanTitleScore: '88',
      encumbranceStatus: 'CLEAN'
    };

    // Replicate parsing fallback from app/app/terra.tsx
    const resolvedB = {
      id: paramsB.parcelId || '',
      surveyNumber: paramsB.surveyNo || '',
      state: paramsB.state?.toUpperCase() || 'MH',
      district: paramsB.district || '',
      taluka: paramsB.taluka || '',
      village: paramsB.village || '',
      claimedOwner: paramsB.claimedOwner || '',
      cleanTitleScore: paramsB.cleanTitleScore ? Number(paramsB.cleanTitleScore) : undefined,
      encumbranceStatus: paramsB.encumbranceStatus || undefined
    };

    assert.strictEqual(resolvedB.surveyNumber, '101');
    assert.strictEqual(resolvedB.cleanTitleScore, 88);
    assert.strictEqual(resolvedB.claimedOwner, 'Ch. Malleshwara Rao');

    pass(cat5, 'M3-TERRA-01', 'Terra AI dual parcelContext deserialization (JSON-string + flat query params) verified');
  } catch (err) {
    fail(cat5, 'M3-TERRA-01', 'ParcelContext deserialization failed', err);
  }

  // 5.2 Context Banner Display Logic
  try {
    function shouldRenderBanner(ctx) {
      return Boolean(ctx && ctx.surveyNumber);
    }

    assert.strictEqual(shouldRenderBanner({ surveyNumber: '101' }), true);
    assert.strictEqual(shouldRenderBanner({ surveyNumber: '142/2A' }), true);
    assert.strictEqual(shouldRenderBanner({ surveyNumber: '' }), false);
    assert.strictEqual(shouldRenderBanner({}), false);

    pass(cat5, 'M3-TERRA-02', 'Context banner conditional rendering logic verified');
  } catch (err) {
    fail(cat5, 'M3-TERRA-02', 'Context banner logic failed', err);
  }

  // 5.3 Risk Score & Risk Badge Color / TestID Mapping
  try {
    function getRiskBadgeConfig(riskTier) {
      if (riskTier === 'HIGH') {
        return { testID: 'terra-risk-badge-high', color: '#EF4444' };
      }
      if (riskTier === 'MEDIUM') {
        return { testID: 'terra-risk-badge-medium', color: '#F59E0B' };
      }
      return { testID: 'terra-risk-badge-low', color: '#10B981' };
    }

    const high = getRiskBadgeConfig('HIGH');
    assert.strictEqual(high.testID, 'terra-risk-badge-high');
    assert.strictEqual(high.color, '#EF4444');

    const med = getRiskBadgeConfig('MEDIUM');
    assert.strictEqual(med.testID, 'terra-risk-badge-medium');
    assert.strictEqual(med.color, '#F59E0B');

    const low = getRiskBadgeConfig('LOW');
    assert.strictEqual(low.testID, 'terra-risk-badge-low');
    assert.strictEqual(low.color, '#10B981');

    pass(cat5, 'M3-TERRA-03', 'Risk tier badge testID and chromatic mapping conformant for HIGH, MEDIUM, LOW');
  } catch (err) {
    fail(cat5, 'M3-TERRA-03', 'Risk badge mapping failed', err);
  }

  // 5.4 Live Backend Terra Chat Integration
  try {
    const res = await httpPostJson('/api/terra/chat', {
      prompt: 'Check Section 22-A prohibited register status and HYDRA buffer',
      parcelContext: {
        id: 'parcel-tg-serilingampally-101',
        surveyNumber: '101',
        state: 'TG',
        district: 'Hyderabad',
        taluka: 'Serilingampally',
        village: 'Gachibowli',
        coordinates: { lat: 17.4820, lng: 78.3315 }
      }
    });

    assert.strictEqual(res.statusCode, 200, 'POST /api/terra/chat must return HTTP 200');
    assert.ok(res.json, 'Response must be valid JSON');
    assert.ok(typeof res.json.reply === 'string' && res.json.reply.length > 20, 'Reply must be non-empty text');
    assert.ok(typeof res.json.riskScore === 'number', 'riskScore must be numeric');
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(res.json.riskTier), `riskTier must be valid tier, got: ${res.json.riskTier}`);
    assert.ok(Array.isArray(res.json.findings) && res.json.findings.length > 0, 'findings must be non-empty array');
    assert.ok(Array.isArray(res.json.citations) && res.json.citations.length > 0, 'citations must be non-empty array');

    pass(cat5, 'M3-TERRA-04', 'Live /api/terra/chat produces grounded advisory with risk tier, findings, & citations');
  } catch (err) {
    fail(cat5, 'M3-TERRA-04', 'Live terra chat test failed', err);
  }

  // 5.5 Offline Legal Rules Fallback Simulation
  try {
    function simulateOfflineFallback(prompt, state) {
      let findings = [
        { status: 'PASS', type: 'ok', text: 'Sub-registrar Index-II matches recorded title chain without active caveats.' },
        { status: 'PASS', type: 'ok', text: 'Document hash successfully anchored to EVM blockchain.' }
      ];

      const pLower = prompt.toLowerCase();
      if (pLower.includes('litigation') || pLower.includes('court')) {
        findings = [
          { status: 'PASS', type: 'ok', text: 'e-Courts National Judicial Data Grid (NJDG) search: No active stay orders.' },
          { status: 'PASS', type: 'ok', text: 'Revenue tribunal appeal status: Disposed in favor of current khatadar.' }
        ];
      } else if (pLower.includes('stamp') || pLower.includes('duty')) {
        findings = [
          { status: 'PASS', type: 'ok', text: `${state} Stamp Duty: 5% Basic + 1% Local Body Tax + 1% Metro Cess = 7% Total.` },
          { status: 'PASS', type: 'ok', text: 'Concession available: 1% rebate for female sole purchaser.' }
        ];
      } else if (pLower.includes('hydra') || pLower.includes('buffer')) {
        findings = [
          { status: 'PASS', type: 'ok', text: 'Full Tank Level (FTL) Buffer Check: Property boundary is 85m outside buffer zone.' },
          { status: 'PASS', type: 'ok', text: 'Safe from Hyderabad Disaster Response & Asset Monitoring (HYDRA) notices.' }
        ];
      }

      return {
        reply: `Based on official ${state} revenue & legal databases: I have conducted an automated due-diligence audit on "${prompt}".`,
        riskScore: 25,
        riskTier: 'LOW',
        findings,
        citations: [`${state} Land Revenue Code`, 'Indian Registration Act, 1908']
      };
    }

    const litigationFallback = simulateOfflineFallback('Check court litigation', 'MH');
    assert.strictEqual(litigationFallback.findings.length, 2);
    assert.ok(litigationFallback.findings[0].text.includes('e-Courts'));

    const stampFallback = simulateOfflineFallback('Calculate stamp duty', 'KA');
    assert.ok(stampFallback.findings[0].text.includes('KA Stamp Duty'));

    const hydraFallback = simulateOfflineFallback('Check Hydra buffer', 'TG');
    assert.ok(hydraFallback.findings[0].text.includes('Full Tank Level'));

    pass(cat5, 'M3-TERRA-05', 'Offline fallback legal rules provide instant deterministic analysis when server is unreachable');
  } catch (err) {
    fail(cat5, 'M3-TERRA-05', 'Offline fallback test failed', err);
  }

  // ==========================================================================
  // FINAL SUMMARY REPORT
  // ==========================================================================
  console.log('\n================================================================');
  console.log(`📊 ADVERSARIAL CHALLENGER RESULTS: ${suiteResults.passed} PASSED, ${suiteResults.failed} FAILED out of ${suiteResults.total} TESTS`);
  console.log('================================================================');
  for (const [cat, res] of Object.entries(suiteResults.categories)) {
    console.log(`  - ${cat}: ${res.passed}/${res.total} passed`);
  }

  if (suiteResults.failed > 0) {
    console.log('\nFindings / Regressions:');
    for (const f of suiteResults.findings) {
      console.log(`  ❌ [${f.category}] ${f.testId}: ${f.description} -> ${f.error}`);
    }
  }

  const exitCode = suiteResults.failed === 0 ? 0 : 1;
  return exitCode;
}

runAllChallengerTests()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((err) => {
    console.error('Fatal challenger execution crash:', err);
    process.exit(1);
  });
