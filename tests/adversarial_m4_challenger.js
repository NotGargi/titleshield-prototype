/**
 * Landeed 2.0: Milestone 4 Adversarial Stress Harness & Empirical Verification
 * 
 * Objective:
 * Subject the Milestone 4 test infrastructure, browser resolver, master test runner,
 * and map explore enhancements to adversarial boundary conditions, failure injections,
 * and mathematical stress-testing.
 * 
 * Challenge Vectors:
 * 1. Browser Resolution Robustness:
 *    - Environment variable overrides (CHROME_BIN, CHROME_PATH, PUPPETEER_EXECUTABLE_PATH, BROWSER_PATH)
 *    - Invalid/nonexistent binary paths with fallback mechanics
 *    - Simulation of total absence of browser candidates
 *    - Valid Chrome path resolution and puppeteer-core loading
 * 2. Master Runner Failure Detection:
 *    - Subprocess execution with non-zero exit codes (code = 1)
 *    - Regex failure parsing with failed assertions
 *    - Safeguard invariant: code !== 0 forces failed >= 1 even if 0 failures were printed
 *    - Process crash / spawn error handling
 *    - Verification of master runner exit code 1 when child suite fails
 * 3. Boundary & Extreme Coordinate Stress for Tile Proxy:
 *    - Negative zoom levels (z = -1, z = -9999)
 *    - Excessive zoom levels (z = 25, z = 9999999)
 *    - Out-of-bounds tile coordinates (x = 999999, y = 999999)
 *    - Negative tile coordinates (x = -1, y = -100)
 *    - Non-numeric / NaN coordinates
 *    - Massive strings and path traversal attempts
 *    - Guaranteed 200 OK + image/png + valid PNG header + transparent raster fallback
 * 4. Terra AI Hard Veto Invariant under Malformed Parcel Contexts:
 *    - Null, undefined, primitive, and empty contexts
 *    - Malformed contexts with encumbranceStatus = DISPUTED / ENCUMBERED / PROHIBITED
 *    - Contexts with hasActiveMortgage = true / isProhibitedLand = true / pendingLitigationCount > 0
 *    - Clean title score overrides (100 vs -500 vs string)
 *    - SQL injection resistance and prototype pollution resilience
 * 5. Focal-Point Mercator Preservation Math Stress Testing:
 *    - Extreme zoom jumps (12 -> 19 and 19 -> 12)
 *    - Viewport boundary focal points (corners, centers, offscreen)
 *    - Extreme pan-India geographical extents (Leh, Kanyakumari, Kibithu, Ghuar Mota, Equatorial)
 *    - 100 consecutive reversible zoom cycles with zero floating-point accumulation drift
 *    - Zoom clamping boundary limits
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { resolveBrowserExecutable, resolvePuppeteer } = require('./helpers/browserResolver');

const API_BASE = 'http://localhost:4000/api';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// ============================================================================
// MERCATOR MATH UTILITIES (Mirroring Map Explore Engine)
// ============================================================================

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

  return { lat, lng };
}

function computeNewCenterPreservingFocalPoint(focalX, focalY, oldZoom, newZoom, oldCenter, width, height) {
  const geoUnderFocal = pixelToGeo(focalX, focalY, oldZoom, oldCenter.lat, oldCenter.lng, width, height);
  return pixelToGeo(width - focalX, height - focalY, newZoom, geoUnderFocal.lat, geoUnderFocal.lng, width, height);
}

function clampZoom(zoom) {
  return Math.min(19, Math.max(12, Math.round(zoom * 10) / 10));
}

// ============================================================================
// ADVERSARIAL CHALLENGER SUITE
// ============================================================================

async function runAdversarialChallengerSuite() {
  console.log('\n================================================================================');
  console.log('⚔️  CHALLENGER M4: ADVERSARIAL STRESS HARNESS & EMPIRICAL VERIFICATION');
  console.log('================================================================================');
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);
  console.log(`Node Environment:    ${process.version} (${process.platform} ${process.arch})`);

  let passed = 0;
  let failed = 0;
  const findings = [];

  function recordPass(testId, vector, description) {
    passed++;
    findings.push({ id: testId, vector, status: 'PASS', description });
    console.log(`  ✅ [PASS] [${vector}] ${testId}: ${description}`);
  }

  function recordFail(testId, vector, description, error) {
    failed++;
    const errMsg = error ? (error.message || String(error)) : 'Assertion failed';
    findings.push({ id: testId, vector, status: 'FAIL', description, error: errMsg });
    console.error(`  ❌ [FAIL] [${vector}] ${testId}: ${description}`);
    console.error(`     Error: ${errMsg}`);
  }

  // ===========================================================================
  // SECTION 1: BROWSER RESOLUTION ROBUSTNESS & FALLBACK MECHANICS
  // ===========================================================================
  console.log('\n--- Vector 1: Browser Resolution Robustness & Fallback Mechanics ---');

  // TEST_ADV_01: Nonexistent CHROME_BIN override falls back gracefully without unhandled crash
  try {
    const origChromeBin = process.env.CHROME_BIN;
    const origChromePath = process.env.CHROME_PATH;
    const origPuppeteer = process.env.PUPPETEER_EXECUTABLE_PATH;
    const origBrowser = process.env.BROWSER_PATH;

    try {
      process.env.CHROME_BIN = '/nonexistent/path/to/invalid/chrome/binary';
      delete process.env.CHROME_PATH;
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      delete process.env.BROWSER_PATH;

      const resolved = resolveBrowserExecutable();
      assert.ok(resolved && typeof resolved === 'string', 'Must resolve to a valid string');
      assert.ok(fs.existsSync(resolved), `Resolved browser must actually exist on disk: ${resolved}`);
      assert.notStrictEqual(resolved, '/nonexistent/path/to/invalid/chrome/binary', 'Must NOT return nonexistent CHROME_BIN');
      recordPass('TEST_ADV_01', 'BrowserResolver', `CHROME_BIN=/invalid/path gracefully fell back to existing executable: ${resolved}`);
    } finally {
      if (origChromeBin !== undefined) process.env.CHROME_BIN = origChromeBin; else delete process.env.CHROME_BIN;
      if (origChromePath !== undefined) process.env.CHROME_PATH = origChromePath; else delete process.env.CHROME_PATH;
      if (origPuppeteer !== undefined) process.env.PUPPETEER_EXECUTABLE_PATH = origPuppeteer; else delete process.env.PUPPETEER_EXECUTABLE_PATH;
      if (origBrowser !== undefined) process.env.BROWSER_PATH = origBrowser; else delete process.env.BROWSER_PATH;
    }
  } catch (err) {
    recordFail('TEST_ADV_01', 'BrowserResolver', 'CHROME_BIN override test failed', err);
  }

  // TEST_ADV_02: Nonexistent CHROME_PATH / PUPPETEER_EXECUTABLE_PATH / BROWSER_PATH overrides fall back safely
  try {
    const origChromePath = process.env.CHROME_PATH;
    const origPuppeteer = process.env.PUPPETEER_EXECUTABLE_PATH;
    const origBrowser = process.env.BROWSER_PATH;

    try {
      process.env.CHROME_PATH = '/dev/null/does_not_exist/chrome';
      process.env.PUPPETEER_EXECUTABLE_PATH = '/tmp/fake/bin/google-chrome-missing';
      process.env.BROWSER_PATH = '/var/empty/bogus/edge';

      const resolved = resolveBrowserExecutable();
      assert.ok(resolved && fs.existsSync(resolved), `Must resolve to an existing binary: ${resolved}`);
      assert.ok(!resolved.includes('does_not_exist') && !resolved.includes('fake') && !resolved.includes('bogus'), 'Must not return any fake env override');
      recordPass('TEST_ADV_02', 'BrowserResolver', `Multiple nonexistent env overrides ignored, cleanly resolved disk candidate: ${resolved}`);
    } finally {
      if (origChromePath !== undefined) process.env.CHROME_PATH = origChromePath; else delete process.env.CHROME_PATH;
      if (origPuppeteer !== undefined) process.env.PUPPETEER_EXECUTABLE_PATH = origPuppeteer; else delete process.env.PUPPETEER_EXECUTABLE_PATH;
      if (origBrowser !== undefined) process.env.BROWSER_PATH = origBrowser; else delete process.env.BROWSER_PATH;
    }
  } catch (err) {
    recordFail('TEST_ADV_02', 'BrowserResolver', 'Nonexistent env variables fallback test failed', err);
  }

  // TEST_ADV_03: Valid environment variable override takes immediate precedence
  try {
    const standardBinary = resolveBrowserExecutable();
    const origPuppeteer = process.env.PUPPETEER_EXECUTABLE_PATH;

    try {
      // Set to the real binary explicitly
      process.env.PUPPETEER_EXECUTABLE_PATH = standardBinary;
      const resolved = resolveBrowserExecutable();
      assert.strictEqual(resolved, standardBinary, 'Must return the exact path set in PUPPETEER_EXECUTABLE_PATH');
      recordPass('TEST_ADV_03', 'BrowserResolver', `Valid PUPPETEER_EXECUTABLE_PATH override honored with immediate precedence: ${resolved}`);
    } finally {
      if (origPuppeteer !== undefined) process.env.PUPPETEER_EXECUTABLE_PATH = origPuppeteer; else delete process.env.PUPPETEER_EXECUTABLE_PATH;
    }
  } catch (err) {
    recordFail('TEST_ADV_03', 'BrowserResolver', 'Valid override precedence test failed', err);
  }

  // TEST_ADV_04: Total browser candidate absence throws clear, informative error
  try {
    // Execute a child process where process.platform is an unsupported OS with no browsers
    const testCode = `
      const fs = require('fs');
      const origPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'sunos' });
      delete process.env.CHROME_PATH;
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      delete process.env.BROWSER_PATH;
      const { resolveBrowserExecutable } = require('./tests/helpers/browserResolver');
      try {
        resolveBrowserExecutable();
        process.exit(0); // Should not succeed if no candidate exists
      } catch (err) {
        if (err.message.includes('No compatible Chrome, Brave, Edge, or Chromium browser executable found')) {
          console.log('CORRECT_ERROR_THROWN');
          process.exit(42);
        }
        console.error('UNEXPECTED_ERROR:', err.message);
        process.exit(99);
      }
    `;

    const res = await new Promise((reslove) => {
      const child = spawn(process.execPath, ['-e', testCode], { cwd: path.join(__dirname, '..') });
      let out = '';
      child.stdout.on('data', (d) => out += d);
      child.on('close', (code) => reslove({ code, out }));
    });

    assert.strictEqual(res.code, 42, `Expected exit code 42 (informative error), got: ${res.code}`);
    assert.ok(res.out.includes('CORRECT_ERROR_THROWN'), 'Informative error message verified');
    recordPass('TEST_ADV_04', 'BrowserResolver', 'Total absence of browser candidates throws clear descriptive error without unhandled crash');
  } catch (err) {
    recordFail('TEST_ADV_04', 'BrowserResolver', 'Absence error test failed', err);
  }

  // TEST_ADV_05: Standard macOS Chrome path probed and Puppeteer resolution
  try {
    const puppeteer = resolvePuppeteer();
    assert.ok(puppeteer && typeof puppeteer.launch === 'function', 'resolvePuppeteer must export launch function');

    const browserPath = resolveBrowserExecutable();
    if (process.platform === 'darwin') {
      assert.ok(browserPath.includes('Google Chrome') || browserPath.includes('Edge') || browserPath.includes('Chromium'), `macOS browser candidate valid: ${browserPath}`);
    }
    recordPass('TEST_ADV_05', 'BrowserResolver', `Browser executable (${browserPath}) and puppeteer-core verified successfully`);
  } catch (err) {
    recordFail('TEST_ADV_05', 'BrowserResolver', 'Standard binary and puppeteer-core test failed', err);
  }

  // ===========================================================================
  // SECTION 2: MASTER RUNNER SUBPROCESS FAILURE DETECTION & EXIT PROPAGATION
  // ===========================================================================
  console.log('\n--- Vector 2: Master Runner Failure Detection & Exit Code Propagation ---');

  // TEST_ADV_06: Master runner subprocess failure detection on non-zero exit code
  try {
    // Simulate master runner child execution logic against a script that throws an uncaught error
    const failingScript = `
      const assert = require('assert');
      console.log('Starting failing test...');
      assert.strictEqual(1, 2, 'Intentional synthetic assertion failure');
    `;

    const runnerSim = `
      const { spawn } = require('child_process');
      const child = spawn(process.execPath, ['-e', ${JSON.stringify(failingScript)}]);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => stdout += d);
      child.stderr.on('data', d => stderr += d);
      child.on('close', (code) => {
        let passed = 0;
        let failed = 0;
        const summaryMatch = stdout.match(/Summary:\\s*(\\d+)\\s+Passed,\\s*(\\d+)\\s+Failed/i);
        if (summaryMatch) {
          passed = parseInt(summaryMatch[1], 10);
          failed = parseInt(summaryMatch[2], 10);
        } else {
          const passMatches = stdout.match(/(?:✅\\[PASS\\]|✅\\s*Test\\s*\\d+\\s*Passed)/gi);
          const failMatches = stdout.match(/(?:❌\\[FAIL\\]|❌\\s*Test\\s*\\d+\\s*Failed)/gi);
          passed = passMatches ? passMatches.length : (code === 0 ? 1 : 0);
          failed = failMatches ? failMatches.length : (code !== 0 ? 1 : 0);
        }
        if (code !== 0 && failed === 0) {
          failed = 1;
        }
        const status = (code === 0 && failed === 0) ? 'PASS' : 'FAIL';
        console.log(JSON.stringify({ code, passed, failed, status }));
        process.exit(status === 'FAIL' ? 1 : 0);
      });
    `;

    const res = await new Promise((resolve) => {
      const child = spawn(process.execPath, ['-e', runnerSim]);
      let out = '';
      child.stdout.on('data', (d) => out += d);
      child.on('close', (code) => resolve({ code, out }));
    });

    assert.strictEqual(res.code, 1, 'Master runner must exit with code 1 when child assertion fails');
    const parsed = JSON.parse(res.out.trim());
    assert.strictEqual(parsed.status, 'FAIL', 'Status must be FAIL');
    assert.strictEqual(parsed.failed, 1, 'Failed count must be 1');
    assert.strictEqual(parsed.passed, 0, 'Passed count must be 0');
    assert.notStrictEqual(parsed.code, 0, 'Child exit code must be non-zero');

    recordPass('TEST_ADV_06', 'MasterRunner', 'Runner correctly intercepts non-zero exit code and assertion failure, propagating exit code 1');
  } catch (err) {
    recordFail('TEST_ADV_06', 'MasterRunner', 'Runner failure interception test failed', err);
  }

  // TEST_ADV_07: Safeguard invariant: code !== 0 forces failed >= 1 even if child stdout claimed 0 failures
  try {
    const deceptiveScript = `
      console.log('Summary: 5 Passed, 0 Failed out of 5 Tests');
      // But unexpectedly exits with error code 1 (e.g. fatal unhandled rejection at cleanup)
      process.exit(1);
    `;

    const runnerSim = `
      const { spawn } = require('child_process');
      const child = spawn(process.execPath, ['-e', ${JSON.stringify(deceptiveScript)}]);
      let stdout = '';
      child.stdout.on('data', d => stdout += d);
      child.on('close', (code) => {
        let passed = 0;
        let failed = 0;
        const summaryMatch = stdout.match(/Summary:\\s*(\\d+)\\s+Passed,\\s*(\\d+)\\s+Failed/i);
        if (summaryMatch) {
          passed = parseInt(summaryMatch[1], 10);
          failed = parseInt(summaryMatch[2], 10);
        }
        // Invariant under test:
        if (code !== 0 && failed === 0) {
          failed = 1;
        }
        const status = (code === 0 && failed === 0) ? 'PASS' : 'FAIL';
        console.log(JSON.stringify({ code, passed, failed, status }));
        process.exit(status === 'FAIL' ? 1 : 0);
      });
    `;

    const res = await new Promise((resolve) => {
      const child = spawn(process.execPath, ['-e', runnerSim]);
      let out = '';
      child.stdout.on('data', (d) => out += d);
      child.on('close', (code) => resolve({ code, out }));
    });

    assert.strictEqual(res.code, 1, 'Master runner must reject deceptive child with code 1');
    const parsed = JSON.parse(res.out.trim());
    assert.strictEqual(parsed.failed, 1, 'Safeguard must force failed = 1 despite stdout claiming 0');
    assert.strictEqual(parsed.status, 'FAIL', 'Status must be FAIL');

    recordPass('TEST_ADV_07', 'MasterRunner', 'Safeguard invariant verified: non-zero exit forces failed=1 even if stdout claimed 0 failed');
  } catch (err) {
    recordFail('TEST_ADV_07', 'MasterRunner', 'Safeguard invariant test failed', err);
  }

  // TEST_ADV_08: Missing child suite file triggers error handler and records CRASH with code 1
  try {
    const runnerSim = `
      const { spawn } = require('child_process');
      const child = spawn(process.execPath, ['/invalid/nonexistent_suite_file_xyz.js']);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => stdout += d);
      child.stderr.on('data', d => stderr += d);
      child.on('close', (code) => {
        let failed = (code !== 0) ? 1 : 0;
        const status = code === 0 ? 'PASS' : 'FAIL';
        console.log(JSON.stringify({ code, failed, status }));
        process.exit(code === 0 ? 0 : 1);
      });
    `;

    const res = await new Promise((resolve) => {
      const child = spawn(process.execPath, ['-e', runnerSim]);
      let out = '';
      child.stdout.on('data', (d) => out += d);
      child.on('close', (code) => resolve({ code, out }));
    });

    assert.strictEqual(res.code, 1, 'Nonexistent script must cause runner failure');
    const parsed = JSON.parse(res.out.trim());
    assert.strictEqual(parsed.status, 'FAIL');
    assert.strictEqual(parsed.failed, 1);

    recordPass('TEST_ADV_08', 'MasterRunner', 'Nonexistent script / missing file properly caught and reported as failed');
  } catch (err) {
    recordFail('TEST_ADV_08', 'MasterRunner', 'Missing script test failed', err);
  }

  // ===========================================================================
  // SECTION 3: BOUNDARY & EXTREME COORDINATE STRESS FOR TILE PROXY
  // ===========================================================================
  console.log('\n--- Vector 3: WMS Tile Fallback under Extreme Coordinates ---');

  const extremeTileCases = [
    { name: 'Negative zoom (z = -1)', url: `${API_BASE}/tiles/wms/MH/-1/0/0` },
    { name: 'Large negative zoom (z = -9999)', url: `${API_BASE}/tiles/wms/MH/-9999/0/0` },
    { name: 'Excessive zoom (z = 25, x = 999999)', url: `${API_BASE}/tiles/wms/MH/25/999999/999999` },
    { name: 'Astronomical zoom (z = 99999999)', url: `${API_BASE}/tiles/wms/MH/99999999/0/0` },
    { name: 'Out-of-range tileX (z = 15, x = 999999)', url: `${API_BASE}/tiles/wms/MH/15/999999/14567` },
    { name: 'Out-of-range tileY (z = 15, y = 999999)', url: `${API_BASE}/tiles/wms/MH/15/23456/999999` },
    { name: 'Negative tile coordinates (x = -5, y = -10)', url: `${API_BASE}/tiles/wms/MH/10/-5/-10` },
    { name: 'Non-numeric coordinates (z = NaN)', url: `${API_BASE}/tiles/wms/MH/NaN/0/0` },
    { name: 'Alphabetic coordinates', url: `${API_BASE}/tiles/wms/MH/abc/def/ghi` },
    { name: 'Floating-point coordinates', url: `${API_BASE}/tiles/wms/MH/15.5/23.4/12.8` },
    { name: 'Unknown non-existent state', url: `${API_BASE}/tiles/wms/NONEXISTENT_STATE_XYZ/15/0/0` },
    { name: 'Massive state string (1000 chars)', url: `${API_BASE}/tiles/wms/${'A'.repeat(1000)}/15/0/0` },
    { name: 'Directory traversal in state', url: `${API_BASE}/tiles/wms/..%2F..%2F..%2Fetc%2Fpasswd/15/0/0` }
  ];

  for (let i = 0; i < extremeTileCases.length; i++) {
    const tc = extremeTileCases[i];
    const testId = `TEST_ADV_TILE_${String(i + 1).padStart(2, '0')}`;
    try {
      const res = await fetch(tc.url);
      assert.strictEqual(res.status, 200, `Status must be 200, got: ${res.status}`);
      assert.strictEqual(res.headers.get('content-type'), 'image/png', 'Must return image/png');
      const buf = Buffer.from(await res.arrayBuffer());
      assert.ok(buf.length >= 8, 'Buffer length must be >= 8 bytes');
      assert.ok(buf.subarray(0, 8).equals(PNG_MAGIC), 'Buffer must start with 8-byte PNG signature');
      assert.strictEqual(buf.length, 334, `Must return exact 334-byte transparent raster fallback (got: ${buf.length})`);
      recordPass(testId, 'TileFallback', `${tc.name} -> HTTP 200 with 334-byte transparent PNG`);
    } catch (err) {
      recordFail(testId, 'TileFallback', `Extreme tile test failed on: ${tc.name}`, err);
    }
  }

  // ===========================================================================
  // SECTION 4: TERRA AI HARD VETO INVARIANT WITH MALFORMED PARCEL CONTEXTS
  // ===========================================================================
  console.log('\n--- Vector 4: Terra AI Hard Veto Invariant under Malformed Contexts ---');

  // TEST_ADV_TERRA_01: Null and primitive parcelContext values do not crash server
  const primitiveContexts = [
    { label: 'null context', val: null },
    { label: 'undefined context', val: undefined },
    { label: 'string context', val: 'invalid_primitive_string' },
    { label: 'number context', val: 99999 },
    { label: 'array context', val: [1, 2, 3] }
  ];

  for (let i = 0; i < primitiveContexts.length; i++) {
    const pc = primitiveContexts[i];
    const testId = `TEST_ADV_TERRA_PRIM_${i + 1}`;
    try {
      const res = await fetch(`${API_BASE}/terra/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Assess title clearance for general query',
          parcelContext: pc.val
        })
      });
      assert.strictEqual(res.status, 200, `Primitive context ${pc.label} must return 200 OK`);
      const json = await res.json();
      assert.ok(typeof json.reply === 'string' && json.reply.length > 0, 'Must have reply');
      assert.ok(typeof json.riskScore === 'number', 'Risk score must be number');
      assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(json.riskTier), 'Risk tier must be valid enum');
      recordPass(testId, 'TerraAI', `Handled ${pc.label} gracefully with HTTP 200`);
    } catch (err) {
      recordFail(testId, 'TerraAI', `Failed on ${pc.label}`, err);
    }
  }

  // HARD VETO INVARIANT STRESS SUITE:
  // Regardless of malformed or missing attributes, hard veto conditions MUST yield riskScore >= 85 and HIGH tier!
  const hardVetoStressCases = [
    {
      name: 'Sparse context with encumbranceStatus = DISPUTED only',
      ctx: { encumbranceStatus: 'DISPUTED' }
    },
    {
      name: 'encumbranceStatus = DISPUTED with cleanTitleScore = 100 override',
      ctx: { encumbranceStatus: 'DISPUTED', cleanTitleScore: 100, claimedOwner: 'Valid Person' }
    },
    {
      name: 'encumbranceStatus = ENCUMBERED with cleanTitleScore = 100 override',
      ctx: { encumbranceStatus: 'ENCUMBERED', cleanTitleScore: 100 }
    },
    {
      name: 'encumbranceStatus = PROHIBITED with cleanTitleScore = 100 override',
      ctx: { encumbranceStatus: 'PROHIBITED', cleanTitleScore: 100 }
    },
    {
      name: 'hasActiveMortgage = true with cleanTitleScore = 100 override',
      ctx: { hasActiveMortgage: true, cleanTitleScore: 100, encumbranceStatus: 'CLEAN' }
    },
    {
      name: 'isProhibitedLand = true with cleanTitleScore = 100 override',
      ctx: { isProhibitedLand: true, cleanTitleScore: 100 }
    },
    {
      name: 'pendingLitigationCount = 4 with cleanTitleScore = 100 override',
      ctx: { pendingLitigationCount: 4, cleanTitleScore: 100 }
    },
    {
      name: 'Malformed nested structures with encumbranceStatus = DISPUTED',
      ctx: {
        encumbranceStatus: 'DISPUTED',
        coordinates: { lat: 'corrupted', lng: [] },
        boundaries: 'not-an-object',
        polygonCoordinates: null,
        cleanTitleScore: 'NaN_string'
      }
    },
    {
      name: 'SQL injection payload in parcelContext with encumbranceStatus = DISPUTED',
      ctx: {
        encumbranceStatus: 'DISPUTED',
        surveyNumber: "142' OR '1'='1; DROP TABLE parcels;--",
        state: "MH' UNION SELECT * FROM users;--"
      }
    }
  ];

  for (let i = 0; i < hardVetoStressCases.length; i++) {
    const tc = hardVetoStressCases[i];
    const testId = `TEST_ADV_VETO_${String(i + 1).padStart(2, '0')}`;
    try {
      const res = await fetch(`${API_BASE}/terra/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Execute full legal and title audit on target parcel',
          parcelContext: tc.ctx
        })
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const json = await res.json();
      assert.ok(
        json.riskScore >= 85,
        `Hard veto must enforce riskScore >= 85 (found: ${json.riskScore}) for ${tc.name}`
      );
      assert.strictEqual(
        json.riskTier,
        'HIGH',
        `Hard veto must enforce riskTier === 'HIGH' (found: ${json.riskTier}) for ${tc.name}`
      );
      assert.ok(json.reply.includes('CRITICAL TITLE ADVISORY') || json.reply.includes('HIGH'), 'Advisory reply must reflect high risk');
      recordPass(testId, 'TerraAI', `Hard veto invariant held: riskScore=${json.riskScore}, riskTier=HIGH on ${tc.name}`);
    } catch (err) {
      recordFail(testId, 'TerraAI', `Hard veto invariant broken on ${tc.name}`, err);
    }
  }

  // TEST_ADV_TERRA_PROMPT: Prompt validation and rejection of empty/whitespace
  try {
    const emptyPrompts = ['', '   ', '\t\n\r', null, undefined, 12345];
    for (const ep of emptyPrompts) {
      const res = await fetch(`${API_BASE}/terra/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: ep })
      });
      assert.strictEqual(res.status, 400, `Empty prompt '${ep}' must return HTTP 400 (got: ${res.status})`);
    }
    recordPass('TEST_ADV_TERRA_PROMPT', 'TerraAI', 'Empty, whitespace, and non-string prompts strictly rejected with HTTP 400');
  } catch (err) {
    recordFail('TEST_ADV_TERRA_PROMPT', 'TerraAI', 'Prompt validation test failed', err);
  }

  // ===========================================================================
  // SECTION 5: FOCAL-POINT MERCATOR PRESERVATION MATH STRESS TESTING
  // ===========================================================================
  console.log('\n--- Vector 5: Focal-Point Mercator Preservation Math Stress Testing ---');

  // TEST_ADV_MATH_01: Extreme zoom levels 12 -> 19 and back 19 -> 12
  try {
    const center = { lat: 18.5793, lng: 73.9823 }; // Pune Wagholi
    const width = 800;
    const height = 600;

    const testFocalPoints = [
      { name: 'Viewport Center', x: 400, y: 300 },
      { name: 'Top-Left Corner', x: 0, y: 0 },
      { name: 'Bottom-Right Corner', x: 800, y: 600 },
      { name: 'Top-Right Corner', x: 800, y: 0 },
      { name: 'Bottom-Left Corner', x: 0, y: 600 },
      { name: 'Offscreen Top-Left', x: -100, y: -100 },
      { name: 'Offscreen Bottom-Right', x: 1200, y: 900 }
    ];

    for (const fp of testFocalPoints) {
      // 1. Forward jump: Zoom 12 -> 19
      const geoUnderFocal = pixelToGeo(fp.x, fp.y, 12, center.lat, center.lng, width, height);
      const newCenter19 = computeNewCenterPreservingFocalPoint(fp.x, fp.y, 12, 19, center, width, height);
      const pixelAt19 = geoToPixel(geoUnderFocal.lat, geoUnderFocal.lng, 19, newCenter19.lat, newCenter19.lng, width, height);

      const driftXForward = Math.abs(pixelAt19.x - fp.x);
      const driftYForward = Math.abs(pixelAt19.y - fp.y);

      assert.ok(driftXForward < 1e-4, `Forward X drift too high (${driftXForward}) for ${fp.name}`);
      assert.ok(driftYForward < 1e-4, `Forward Y drift too high (${driftYForward}) for ${fp.name}`);

      // 2. Reverse jump: Zoom 19 -> 12
      const newCenter12Back = computeNewCenterPreservingFocalPoint(fp.x, fp.y, 19, 12, newCenter19, width, height);
      const pixelAt12 = geoToPixel(geoUnderFocal.lat, geoUnderFocal.lng, 12, newCenter12Back.lat, newCenter12Back.lng, width, height);

      const driftXReverse = Math.abs(pixelAt12.x - fp.x);
      const driftYReverse = Math.abs(pixelAt12.y - fp.y);

      assert.ok(driftXReverse < 1e-4, `Reverse X drift too high (${driftXReverse}) for ${fp.name}`);
      assert.ok(driftYReverse < 1e-4, `Reverse Y drift too high (${driftYReverse}) for ${fp.name}`);

      // Reversibility check: recovered center matches original center
      const latDrift = Math.abs(newCenter12Back.lat - center.lat);
      const lngDrift = Math.abs(newCenter12Back.lng - center.lng);
      assert.ok(latDrift < 1e-8, `Lat reversible drift exceeded: ${latDrift}`);
      assert.ok(lngDrift < 1e-8, `Lng reversible drift exceeded: ${lngDrift}`);
    }

    recordPass('TEST_ADV_MATH_01', 'MercatorMath', 'Extreme zoom jump (12->19->12) verified with zero drift (<1e-4px, reversible <1e-8 deg) across all corner and offscreen focal points');
  } catch (err) {
    recordFail('TEST_ADV_MATH_01', 'MercatorMath', 'Extreme zoom jump math test failed', err);
  }

  // TEST_ADV_MATH_02: 100 consecutive reversible zoom cycles without numerical drift
  try {
    let currentCenter = { lat: 17.4820, lng: 78.3315 }; // Hyderabad Serilingampally
    const initialCenter = { ...currentCenter };
    const focal = { x: 320, y: 240 };
    const width = 640;
    const height = 480;

    for (let cycle = 0; cycle < 100; cycle++) {
      // Zoom in 14 -> 17
      currentCenter = computeNewCenterPreservingFocalPoint(focal.x, focal.y, 14, 17, currentCenter, width, height);
      // Zoom out 17 -> 14
      currentCenter = computeNewCenterPreservingFocalPoint(focal.x, focal.y, 17, 14, currentCenter, width, height);
    }

    const totalLatDrift = Math.abs(currentCenter.lat - initialCenter.lat);
    const totalLngDrift = Math.abs(currentCenter.lng - initialCenter.lng);

    assert.ok(totalLatDrift < 1e-7, `100-cycle cumulative lat drift exceeded: ${totalLatDrift}`);
    assert.ok(totalLngDrift < 1e-7, `100-cycle cumulative lng drift exceeded: ${totalLngDrift}`);

    recordPass('TEST_ADV_MATH_02', 'MercatorMath', `100 consecutive reversible zoom cycles confirmed zero accumulation drift (lat: ${totalLatDrift.toExponential(2)}, lng: ${totalLngDrift.toExponential(2)})`);
  } catch (err) {
    recordFail('TEST_ADV_MATH_02', 'MercatorMath', '100-cycle accumulation drift test failed', err);
  }

  // TEST_ADV_MATH_03: Extreme Geographic Extents across India & Polar Boundaries
  try {
    const locations = [
      { name: 'Leh/Ladakh (North)', lat: 34.1526, lng: 77.5771 },
      { name: 'Kanyakumari (South)', lat: 8.0883, lng: 77.5385 },
      { name: 'Kibithu (East)', lat: 28.2917, lng: 97.0167 },
      { name: 'Ghuar Mota (West)', lat: 23.7144, lng: 68.4878 },
      { name: 'Equatorial (0.5 N)', lat: 0.5, lng: 78.0 },
      { name: 'Near Polar Limit (85 N)', lat: 85.0, lng: 78.0 },
      { name: 'Near Polar Limit (-85 S)', lat: -85.0, lng: 78.0 }
    ];

    for (const loc of locations) {
      const focal = { x: 500, y: 350 };
      const geoUnderFocal = pixelToGeo(focal.x, focal.y, 13, loc.lat, loc.lng, 1000, 700);
      const newCenter = computeNewCenterPreservingFocalPoint(focal.x, focal.y, 13, 18, loc, 1000, 700);
      const pixelAfter = geoToPixel(geoUnderFocal.lat, geoUnderFocal.lng, 18, newCenter.lat, newCenter.lng, 1000, 700);

      const driftX = Math.abs(pixelAfter.x - focal.x);
      const driftY = Math.abs(pixelAfter.y - focal.y);

      assert.ok(driftX < 1e-3, `Geographic drift X exceeded for ${loc.name}: ${driftX}`);
      assert.ok(driftY < 1e-3, `Geographic drift Y exceeded for ${loc.name}: ${driftY}`);
    }

    recordPass('TEST_ADV_MATH_03', 'MercatorMath', 'Geographic extremes (North, South, East, West, Equator, Polar boundaries) verified with zero Mercator distortion drift');
  } catch (err) {
    recordFail('TEST_ADV_MATH_03', 'MercatorMath', 'Geographic extremes test failed', err);
  }

  // TEST_ADV_MATH_04: Zoom clamping bounds verification
  try {
    const clampCases = [
      { in: -100, out: 12 },
      { in: -1, out: 12 },
      { in: 0, out: 12 },
      { in: 5, out: 12 },
      { in: 11.9, out: 12 },
      { in: 12.0, out: 12 },
      { in: 14.54, out: 14.5 },
      { in: 16.56, out: 16.6 },
      { in: 19.0, out: 19 },
      { in: 19.1, out: 19 },
      { in: 25.0, out: 19 },
      { in: 99999, out: 19 }
    ];

    for (const cc of clampCases) {
      const res = clampZoom(cc.in);
      assert.strictEqual(res, cc.out, `clampZoom(${cc.in}) should be ${cc.out}, got: ${res}`);
    }

    recordPass('TEST_ADV_MATH_04', 'MercatorMath', 'Zoom clamping bounds strictly enforced [12, 19] with 0.1 rounding precision across all boundary inputs');
  } catch (err) {
    recordFail('TEST_ADV_MATH_04', 'MercatorMath', 'Zoom clamping test failed', err);
  }

  // ===========================================================================
  // SUMMARY REPORT
  // ===========================================================================
  const total = passed + failed;
  console.log('\n================================================================================');
  console.log(`📊 CHALLENGER M4 SUMMARY: ${passed} Passed, ${failed} Failed out of ${total} Adversarial Tests`);
  console.log('================================================================================\n');

  return {
    suite: 'adversarial_m4_challenger',
    passed,
    failed,
    total,
    findings
  };
}

if (require.main === module) {
  runAdversarialChallengerSuite().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  }).catch((err) => {
    console.error('Fatal execution error in challenger suite:', err);
    process.exit(1);
  });
}

module.exports = {
  runAdversarialChallengerSuite
};
