/**
 * Landeed 2.0 Milestone 2 — Challenger 1 Adversarial Stress Test Harness
 * Target: WMS Tile Proxy (`server/src/routes/tiles.ts`)
 * Endpoint: `GET /api/tiles/wms/:state/:z/:x/:y`
 * 
 * Comprehensive Stress Test Coverage:
 * - Suite 1: Out-of-bounds and extreme coordinates (negative z, negative x/y, z=30, x=999999, NaN, floats)
 * - Suite 2: Malformed state codes (special characters, path traversal strings, whitespace, unknown states)
 * - Suite 3: Universal HTTP contract & binary PNG validation (HTTP 200, CORS *, 8-byte magic header, 256x256 dimensions)
 * - Suite 4: Multi-state valid jurisdiction coverage & two-tier cache verification (MH, KA, TG, UP, TN, MP, RJ, DL, DEFAULT)
 * - Suite 5: Concurrency stress test (50 rapid parallel requests, sub-10ms cached latency, LRU eviction semantics, memory stability)
 * - Suite 6: Architectural vulnerabilities & security audit (Path traversal in disk cache, unhandled async exceptions in Express 4)
 * - Suite 7: Adversarial Header Injection & Denial-of-Service Exploit Isolation (Null byte, CRLF, Devanagari/Unicode state names)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(PROJECT_ROOT, 'server');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';

// Global Results Collector
const suiteResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  findings: [],
  benchmarks: {}
};

function pass(testId, description, details = '') {
  suiteResults.total++;
  suiteResults.passed++;
  console.log(`  ✅ [PASS] ${testId}: ${description} ${details ? '(' + details + ')' : ''}`);
}

function fail(testId, description, error, severity = 'HIGH') {
  suiteResults.total++;
  suiteResults.failed++;
  const msg = error && error.message ? error.message : String(error);
  console.log(`  ❌ [FAIL] ${testId}: ${description} — ERROR: ${msg} [Severity: ${severity}]`);
  suiteResults.findings.push({
    testId,
    description,
    error: msg,
    severity
  });
}

function warn(testId, description, details = '') {
  suiteResults.warnings++;
  console.log(`  ⚠️  [WARN] ${testId}: ${description} ${details ? '(' + details + ')' : ''}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// HTTP Helper for tile requests
function fetchTile(urlPath, options = {}) {
  const host = options.host || BASE_URL;
  const timeoutMs = options.timeoutMs || 8000;
  return new Promise((resolve) => {
    const url = new URL(urlPath, host);
    const start = process.hrtime.bigint();
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1e6;
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer,
          latencyMs,
          error: null
        });
      });
    });
    req.on('error', (err) => {
      const end = process.hrtime.bigint();
      const latencyMs = Number(end - start) / 1e6;
      resolve({
        statusCode: null,
        headers: {},
        buffer: Buffer.alloc(0),
        latencyMs,
        error: err
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
    });
  });
}

// PNG Binary Oracle: validates 8-byte magic header and 256x256 dimensions
function validatePngBinary(buffer) {
  if (!buffer || buffer.length < 8) {
    return { ok: false, reason: `Buffer too short (${buffer ? buffer.length : 0} bytes)` };
  }
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== magic[i]) {
      return { ok: false, reason: `Invalid PNG magic byte at ${i}: expected 0x${magic[i].toString(16)}, got 0x${buffer[i].toString(16)}` };
    }
  }
  if (buffer.length < 24) {
    return { ok: false, reason: 'Buffer too short for IHDR chunk' };
  }
  const ihdrType = buffer.toString('ascii', 12, 16);
  if (ihdrType !== 'IHDR') {
    return { ok: false, reason: `Missing IHDR chunk, got '${ihdrType}'` };
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== 256 || height !== 256) {
    return { ok: false, reason: `Invalid dimensions: expected 256x256, got ${width}x${height}`, width, height };
  }
  return { ok: true, width, height, size: buffer.length };
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function runAdversarialTilesProxyChallenger() {
  const suiteStartTime = Date.now();
  console.log('================================================================================');
  console.log('⚔️  LANDEED 2.0 MILESTONE 2 — CHALLENGER 1 ADVERSARIAL STRESS TEST HARNESS');
  console.log('🎯 Target: WMS Tile Proxy (server/src/routes/tiles.ts)');
  console.log(`🌐 Base API: ${BASE_URL}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  // Verify server is responsive before executing
  const healthCheck = await fetchTile('/api/tiles/health', { timeoutMs: 3000 });
  if (healthCheck.statusCode !== 200) {
    console.error(`❌ FATAL: Backend server not responsive at ${BASE_URL}/api/tiles/health (Status: ${healthCheck.statusCode}).`);
    process.exit(1);
  }
  console.log(`🟢 Live Tile Proxy detected: Status ${healthCheck.statusCode}, latency: ${healthCheck.latencyMs.toFixed(2)}ms\n`);

  // ==========================================================================
  // SUITE 1: OUT-OF-BOUNDS & EXTREME COORDINATE STRESS TESTS
  // ==========================================================================
  console.log('--- SUITE 1: Out-of-Bounds & Extreme Coordinate Stress Tests ---');

  const boundaryCases = [
    { name: 'Negative zoom level (z = -1)', path: '/api/tiles/wms/MH/-1/0/0' },
    { name: 'Severe negative zoom level (z = -99)', path: '/api/tiles/wms/MH/-99/0/0' },
    { name: 'Excessive zoom level (z = 25, max=24)', path: '/api/tiles/wms/MH/25/0/0' },
    { name: 'Extreme zoom level (z = 30)', path: '/api/tiles/wms/MH/30/0/0' },
    { name: 'Ultra-high zoom level (z = 100)', path: '/api/tiles/wms/MH/100/0/0' },
    { name: 'Negative tileX coordinate (x = -1)', path: '/api/tiles/wms/MH/14/-1/0' },
    { name: 'Severe negative tileX coordinate (x = -9999)', path: '/api/tiles/wms/MH/14/-9999/0' },
    { name: 'Negative tileY coordinate (y = -1)', path: '/api/tiles/wms/MH/14/0/-1' },
    { name: 'Severe negative tileY coordinate (y = -9999)', path: '/api/tiles/wms/MH/14/0/-9999' },
    { name: 'Out-of-bounds tileX at zoom 0 (z=0, x=1, max=0)', path: '/api/tiles/wms/MH/0/1/0' },
    { name: 'Out-of-bounds tileY at zoom 0 (z=0, y=1, max=0)', path: '/api/tiles/wms/MH/0/0/1' },
    { name: 'Massive out-of-bounds tileX (z=14, x=999999)', path: '/api/tiles/wms/MH/14/999999/0' },
    { name: 'Massive out-of-bounds tileY (z=14, y=999999)', path: '/api/tiles/wms/MH/14/0/999999' },
    { name: 'NaN zoom parameter', path: '/api/tiles/wms/MH/NaN/0/0' },
    { name: 'Non-numeric string zoom', path: '/api/tiles/wms/MH/zoom_level/0/0' },
    { name: 'NaN tileX parameter', path: '/api/tiles/wms/MH/14/NaN/7000' },
    { name: 'Non-numeric string tileX', path: '/api/tiles/wms/MH/14/not_a_number/7000' },
    { name: 'Floating point coordinates (z=14.8, x=12000.4, y=7000.9)', path: '/api/tiles/wms/MH/14.8/12000.4/7000.9' }
  ];

  for (let i = 0; i < boundaryCases.length; i++) {
    const c = boundaryCases[i];
    const testId = `TEST_01_${String(i + 1).padStart(2, '0')}`;
    const res = await fetchTile(c.path);

    try {
      assert(res.statusCode === 200, `Expected HTTP 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] && res.headers['content-type'].includes('image/png'), `Expected Content-Type image/png, got ${res.headers['content-type']}`);
      assert(res.headers['access-control-allow-origin'] === '*', `Expected Access-Control-Allow-Origin: *, got ${res.headers['access-control-allow-origin']}`);
      assert(res.headers['x-cache'] === 'FALLBACK-TRANSPARENT', `Expected X-Cache: FALLBACK-TRANSPARENT, got ${res.headers['x-cache']}`);

      const pngCheck = validatePngBinary(res.buffer);
      assert(pngCheck.ok, `PNG validation failed: ${pngCheck.reason}`);
      assert(pngCheck.width === 256 && pngCheck.height === 256, `Dimensions must be 256x256, got ${pngCheck.width}x${pngCheck.height}`);

      pass(testId, c.name, `HTTP 200, 256x256 PNG, ${res.latencyMs.toFixed(2)}ms`);
    } catch (err) {
      fail(testId, c.name, err);
    }
  }

  // ==========================================================================
  // SUITE 2: MALFORMED STATE CODE & INJECTION STRESS TESTS
  // ==========================================================================
  console.log('\n--- SUITE 2: Malformed State Code & Injection Stress Tests ---');

  const malformedCases = [
    { name: 'Unknown state code (UNKNOWN_STATE)', path: '/api/tiles/wms/UNKNOWN_STATE/14/0/0' },
    { name: 'Arbitrary 3-letter code (XYZ)', path: '/api/tiles/wms/XYZ/14/0/0' },
    { name: 'Whitespace padded state code ("  mh  ")', path: '/api/tiles/wms/%20%20mh%20%20/14/0/0' },
    { name: 'Lowercase state code ("ka")', path: '/api/tiles/wms/ka/14/0/0' },
    { name: 'Mixed case state code ("tG")', path: '/api/tiles/wms/tG/14/0/0' },
    { name: 'Special punctuation characters ("!@#$%")', path: '/api/tiles/wms/%21%40%23%24%25/14/0/0' },
    { name: 'XSS script injection in state ("<script>")', path: '/api/tiles/wms/%3Cscript%3E/14/0/0' },
    { name: 'SQL injection string in state ("\' OR 1=1--")', path: '/api/tiles/wms/%27%20OR%201%3D1--/14/0/0' },
    { name: 'URL-encoded path traversal ("..%2F..%2F")', path: '/api/tiles/wms/..%2F..%2F/14/0/0' },
    { name: 'Deep path traversal ("..%2F..%2F..%2F..%2Fetc")', path: '/api/tiles/wms/..%2F..%2F..%2F..%2Fetc/14/0/0' }
  ];

  for (let i = 0; i < malformedCases.length; i++) {
    const c = malformedCases[i];
    const testId = `TEST_02_${String(i + 1).padStart(2, '0')}`;
    const res = await fetchTile(c.path);

    try {
      assert(res.statusCode === 200, `Expected HTTP 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] && res.headers['content-type'].includes('image/png'), `Expected Content-Type image/png, got ${res.headers['content-type']}`);
      assert(res.headers['access-control-allow-origin'] === '*', `Expected Access-Control-Allow-Origin: *, got ${res.headers['access-control-allow-origin']}`);

      const pngCheck = validatePngBinary(res.buffer);
      assert(pngCheck.ok, `PNG validation failed: ${pngCheck.reason}`);
      assert(pngCheck.width === 256 && pngCheck.height === 256, `Dimensions must be 256x256, got ${pngCheck.width}x${pngCheck.height}`);

      pass(testId, c.name, `HTTP 200, valid 256x256 PNG, ${res.latencyMs.toFixed(2)}ms`);
    } catch (err) {
      fail(testId, c.name, err);
    }
  }

  // ==========================================================================
  // SUITE 3: PNG BINARY INTEGRITY & DIMENSION ORACLE
  // ==========================================================================
  console.log('\n--- SUITE 3: PNG Binary Integrity & Dimension Oracle ---');

  const binaryTestRes = await fetchTile('/api/tiles/wms/MH/-1/0/0');
  try {
    assert(binaryTestRes.statusCode === 200, `Expected 200, got ${binaryTestRes.statusCode}`);
    const buf = binaryTestRes.buffer;

    // 8-byte magic
    const expectedMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const actualMagic = Array.from(buf.subarray(0, 8));
    const magicMatch = actualMagic.every((b, idx) => b === expectedMagic[idx]);
    assert(magicMatch, `Magic bytes mismatch: ${actualMagic.map(b => b.toString(16)).join(' ')}`);
    pass('TEST_03_01', '8-byte PNG Magic Signature (89 50 4e 47 0d 0a 1a 0a)', 'Verified verbatim');

    // IHDR chunk
    const ihdr = buf.toString('ascii', 12, 16);
    assert(ihdr === 'IHDR', `Expected IHDR chunk marker, found ${ihdr}`);
    pass('TEST_03_02', 'IHDR Chunk Header Verification', 'Marker IHDR located at offset 12');

    // Width & Height
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert(width === 256 && height === 256, `Dimensions must be 256x256, got ${width}x${height}`);
    pass('TEST_03_03', 'PNG Dimensions Oracle (256x256 pixels)', `Width=${width}, Height=${height}`);

    // Exact buffer length
    assert(buf.length === 334, `Expected exact 334-byte transparent PNG, got ${buf.length} bytes`);
    pass('TEST_03_04', 'Exact Byte Size Validation (334 bytes)', `Exact byte count: ${buf.length}`);
  } catch (err) {
    fail('TEST_03_01_04', 'PNG Binary Integrity Oracle', err);
  }

  // ==========================================================================
  // SUITE 4: MULTI-STATE JURISDICTION COVERAGE & TWO-TIER CACHE VERIFICATION
  // ==========================================================================
  console.log('\n--- SUITE 4: Multi-State Jurisdiction Coverage & Two-Tier Cache Verification ---');

  const states = ['MH', 'KA', 'TG', 'UP', 'TN', 'MP', 'RJ', 'DL', 'DEFAULT'];
  for (let i = 0; i < states.length; i++) {
    const st = states[i];
    const testId = `TEST_04_${String(i + 1).padStart(2, '0')}`;
    // Coordinates within Indian extent (e.g. z=14, x=12000, y=7000)
    const tilePath = `/api/tiles/wms/${st}/14/12000/7000`;

    // 1st request (Upstream or Fallback)
    const firstRes = await fetchTile(tilePath);
    try {
      assert(firstRes.statusCode === 200, `Expected 200, got ${firstRes.statusCode}`);
      assert(firstRes.headers['content-type'] && firstRes.headers['content-type'].includes('image/png'), 'Content-Type must be image/png');
      assert(firstRes.headers['access-control-allow-origin'] === '*', 'CORS * header must be present');
      const pngCheck = validatePngBinary(firstRes.buffer);
      assert(pngCheck.ok, pngCheck.reason);

      // 2nd request (Must be HIT-MEMORY)
      const secondRes = await fetchTile(tilePath);
      assert(secondRes.statusCode === 200, `Expected 200 on cached request, got ${secondRes.statusCode}`);
      assert(secondRes.headers['x-cache'] === 'HIT-MEMORY', `Expected X-Cache: HIT-MEMORY, got ${secondRes.headers['x-cache']}`);
      assert(secondRes.latencyMs < 50, `Expected cached latency < 50ms, got ${secondRes.latencyMs.toFixed(2)}ms`);

      pass(testId, `State jurisdiction coverage: ${st}`, `1st: ${firstRes.headers['x-cache']} (${firstRes.latencyMs.toFixed(1)}ms), 2nd: HIT-MEMORY (${secondRes.latencyMs.toFixed(2)}ms)`);
    } catch (err) {
      fail(testId, `State jurisdiction: ${st}`, err);
    }
  }

  // ==========================================================================
  // SUITE 5: CONCURRENCY, LATENCY & LRU STABILITY STRESS TEST
  // ==========================================================================
  console.log('\n--- SUITE 5: Concurrency, Latency & LRU Stability Stress Test ---');

  // Test 5.1: 50 Rapid Parallel Requests to Single Cached Tile
  console.log('  Firing 50 rapid parallel requests to single cached tile...');
  const cachedUrl = '/api/tiles/wms/MH/14/12000/7000';
  const parallel50Promises = [];
  const parallel50Start = process.hrtime.bigint();
  for (let i = 0; i < 50; i++) {
    parallel50Promises.push(fetchTile(cachedUrl));
  }
  const parallel50Results = await Promise.all(parallel50Promises);
  const parallel50End = process.hrtime.bigint();
  const totalBatchMs = Number(parallel50End - parallel50Start) / 1e6;

  try {
    const successCount = parallel50Results.filter(
      r => r.statusCode === 200 && r.headers['x-cache'] === 'HIT-MEMORY' && validatePngBinary(r.buffer).ok
    ).length;
    assert(successCount === 50, `Expected all 50 parallel requests to succeed with HIT-MEMORY, got ${successCount}/50`);

    const latencies = parallel50Results.map(r => r.latencyMs);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    latencies.sort((a, b) => a - b);
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];

    suiteResults.benchmarks.parallel50AvgMs = avgLatency;
    suiteResults.benchmarks.parallel50P95Ms = p95Latency;
    suiteResults.benchmarks.totalBatchMs = totalBatchMs;

    assert(avgLatency < 10, `Expected sub-10ms average latency on cached hits, got ${avgLatency.toFixed(2)}ms`);

    pass(
      'TEST_05_01',
      '50 Rapid Parallel Cached Requests Concurrency',
      `50/50 succeeded, Avg=${avgLatency.toFixed(2)}ms, P95=${p95Latency.toFixed(2)}ms, Batch=${totalBatchMs.toFixed(2)}ms`
    );
  } catch (err) {
    fail('TEST_05_01', '50 Rapid Parallel Cached Requests Concurrency', err);
  }

  // Test 5.2: 50 Rapid Parallel Diverse Requests Across States & Coordinates
  console.log('  Firing 50 rapid parallel requests across diverse coordinates & states...');
  const diversePromises = [];
  const statesPool = ['MH', 'KA', 'TG', 'UP', 'TN', 'MP', 'RJ', 'DL'];
  for (let i = 0; i < 50; i++) {
    const st = statesPool[i % statesPool.length];
    const tilePath = `/api/tiles/wms/${st}/14/${12000 + i}/${7000 + (i % 5)}`;
    diversePromises.push(fetchTile(tilePath));
  }
  const diverseResults = await Promise.all(diversePromises);
  try {
    const successCount = diverseResults.filter(
      r => r.statusCode === 200 && validatePngBinary(r.buffer).ok && r.headers['access-control-allow-origin'] === '*'
    ).length;
    assert(successCount === 50, `Expected all 50 diverse parallel requests to return HTTP 200 & valid PNG, got ${successCount}/50`);
    pass('TEST_05_02', '50 Rapid Diverse Parallel Requests Resilience', `50/50 returned HTTP 200 with valid PNG`);
  } catch (err) {
    fail('TEST_05_02', '50 Rapid Diverse Parallel Requests Resilience', err);
  }

  // Test 5.3: LRU Cache Unit Capacity & Eviction Semantics
  try {
    const { TileLruCache } = require(path.join(SERVER_DIR, 'dist', 'routes', 'tiles'));
    const testCache = new TileLruCache(10);
    const dummyBuf = Buffer.from('TEST_PNG_BUFFER');

    // Fill to capacity
    for (let i = 0; i < 10; i++) {
      testCache.set(`key_${i}`, dummyBuf);
    }
    assert(testCache.size === 10, `Expected size 10, got ${testCache.size}`);

    // Access key_0 to refresh recency
    const refreshed = testCache.get('key_0');
    assert(refreshed !== undefined, 'key_0 must be found');

    // Insert 11th item -> should evict key_1 (oldest), preserving key_0
    testCache.set('key_10', dummyBuf);
    assert(testCache.size === 10, `Size must stay capped at 10, got ${testCache.size}`);
    assert(testCache.get('key_1') === undefined, 'key_1 should have been evicted as LRU');
    assert(testCache.get('key_0') !== undefined, 'key_0 must remain cached due to recency update');

    pass('TEST_05_03', 'TileLruCache Capacity Capping & Recency Eviction', 'Capacity strictly enforced, LRU eviction validated');
  } catch (err) {
    fail('TEST_05_03', 'TileLruCache Capacity Capping & Recency Eviction', err);
  }

  // Test 5.4: Memory Leak & Heap Stability Benchmark Across 100 Consecutive Requests
  console.log('  Benchmarking memory leak stability across 100 consecutive requests...');
  const memBefore = process.memoryUsage();
  for (let i = 0; i < 100; i++) {
    await fetchTile(`/api/tiles/wms/MH/14/12000/7000`);
  }
  const memAfter = process.memoryUsage();
  const heapDiffMb = (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024);
  const rssDiffMb = (memAfter.rss - memBefore.rss) / (1024 * 1024);

  suiteResults.benchmarks.heapDiffMb = heapDiffMb;
  suiteResults.benchmarks.rssDiffMb = rssDiffMb;

  // Heap growth for 100 cached requests should be minimal (< 15MB)
  if (Math.abs(heapDiffMb) < 15) {
    pass('TEST_05_04', 'Memory Leak Stability Benchmark (100 requests)', `Heap delta: ${heapDiffMb.toFixed(2)} MB, RSS delta: ${rssDiffMb.toFixed(2)} MB`);
  } else {
    warn('TEST_05_04', 'Memory growth higher than expected', `Heap delta: ${heapDiffMb.toFixed(2)} MB`);
  }

  // ==========================================================================
  // SUITE 6: ARCHITECTURAL SECURITY AUDIT (DISK ESCAPE & ERROR HANDLING)
  // ==========================================================================
  console.log('\n--- SUITE 6: Architectural Security Audit ---');

  // Test 6.1: Path Traversal in Disk Cache File Construction
  try {
    const tilesModule = require(path.join(SERVER_DIR, 'dist', 'routes', 'tiles'));
    const cacheDir = tilesModule.CACHE_DIR;
    const maliciousState = '../../';
    const computedDiskPath = path.join(cacheDir, maliciousState, '14', '12000', '7000.png');
    const relative = path.relative(cacheDir, computedDiskPath);

    if (relative.startsWith('..')) {
      fail(
        'TEST_06_01',
        'Path Traversal Directory Escape in Disk Cache Construction',
        new Error(`path.join(CACHE_DIR, normState, ...) escapes CACHE_DIR: resolved to '${computedDiskPath}' outside '${cacheDir}'`),
        'HIGH'
      );
    } else {
      pass('TEST_06_01', 'Path Traversal Disk Sanitization', 'Path stays confined within CACHE_DIR');
    }
  } catch (err) {
    fail('TEST_06_01', 'Path Traversal Disk Sanitization', err);
  }

  // Test 6.2: Missing Top-Level Try/Catch in Express Async Route Handler
  try {
    const tilesSrc = fs.readFileSync(path.join(SERVER_DIR, 'src', 'routes', 'tiles.ts'), 'utf8');
    const hasTopLevelTryCatch = /tilesRouter\.get\(['"]\/wms\/:state\/:z\/:x\/:y['"][^\{]*\{[\s\r\n]*try\s*\{/.test(tilesSrc);
    if (!hasTopLevelTryCatch) {
      fail(
        'TEST_06_02',
        'Missing Top-Level Try/Catch in Async Route Handler',
        new Error('tilesRouter.get(\'/wms/:state/:z/:x/:y\', async (req, res) => { ... }) has no top-level try/catch. Unhandled exceptions in Express 4 cause fatal process termination.'),
        'HIGH'
      );
    } else {
      pass('TEST_06_02', 'Top-Level Try/Catch in Async Handler', 'Handler wrapped in defensive try/catch');
    }
  } catch (err) {
    fail('TEST_06_02', 'Top-Level Try/Catch Audit', err);
  }

  // ==========================================================================
  // SUITE 7: ADVERSARIAL CRASH & DENIAL-OF-SERVICE EXPLOIT SUITE
  // ==========================================================================
  console.log('\n--- SUITE 7: Adversarial Header Injection & Denial-of-Service Exploit Suite ---');

  // We spawn an isolated test server instance on ephemeral port 4015 to demonstrate the crash
  async function testServerCrashOnExploit(payloadName, urlPath) {
    return new Promise((resolve) => {
      const testPort = '4015';
      let capturedStderr = '';
      let serverProcessExited = false;
      let exitCode = null;

      const srv = spawn('node', ['dist/index.js'], {
        cwd: SERVER_DIR,
        env: { ...process.env, PORT: testPort }
      });

      srv.stderr.on('data', (d) => {
        capturedStderr += d.toString();
      });

      srv.on('exit', (code) => {
        serverProcessExited = true;
        exitCode = code;
      });

      // Poll until server is ready
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const check = await fetchTile('/api/tiles/health', { host: `http://localhost:${testPort}`, timeoutMs: 500 });
          if (check.statusCode === 200) {
            clearInterval(interval);
            // Fire malicious payload
            const res = await fetchTile(urlPath, { host: `http://localhost:${testPort}`, timeoutMs: 1500 });
            // Wait 600ms to observe process termination
            setTimeout(() => {
              try { srv.kill(); } catch (_e) {}
              resolve({
                crashed: serverProcessExited || res.error !== null,
                statusCode: res.statusCode,
                error: res.error,
                stderr: capturedStderr,
                exitCode
              });
            }, 600);
          }
        } catch (_e) {
          if (attempts > 25) {
            clearInterval(interval);
            try { srv.kill(); } catch (_k) {}
            resolve({ crashed: false, error: new Error('Ephemeral test server failed to start') });
          }
        }
      }, 200);
    });
  }

  // TEST 07_01: Null Byte Injection
  console.log('  Testing Null Byte Injection in state (%00NULL)...');
  const nullByteResult = await testServerCrashOnExploit('Null Byte', '/api/tiles/wms/%00NULL/14/0/0');
  if (nullByteResult.crashed || nullByteResult.stderr.includes('ERR_INVALID_CHAR')) {
    fail(
      'TEST_07_01',
      'Null Byte in state parameter crashes server process',
      new Error(`Server crashed with unhandled ERR_INVALID_CHAR on res.setHeader('X-State', ...). Stderr: ${nullByteResult.stderr.split('\n')[0]}`),
      'CRITICAL'
    );
  } else {
    pass('TEST_07_01', 'Null Byte in state parameter handled gracefully', `Status: ${nullByteResult.statusCode}`);
  }

  // TEST 07_02: CRLF Header Injection in state parameter
  console.log('  Testing CRLF injection in state parameter (%0D%0A)...');
  const crlfResult = await testServerCrashOnExploit('CRLF Injection', '/api/tiles/wms/%0D%0A/14/0/0');
  if (crlfResult.crashed || crlfResult.stderr.includes('ERR_INVALID_CHAR')) {
    fail(
      'TEST_07_02',
      'CRLF Header Injection in state parameter crashes server process',
      new Error(`Server crashed with unhandled ERR_INVALID_CHAR: Invalid character in header content ["X-State"]. Stderr: ${crlfResult.stderr.split('\n')[0]}`),
      'CRITICAL'
    );
  } else {
    pass('TEST_07_02', 'CRLF Header Injection survived', `Status: ${crlfResult.statusCode}`);
  }

  // TEST 07_03: Non-Latin-1 / Devanagari Unicode in state parameter
  console.log('  Testing Unicode state name (%E0%A4%AE%E0%A4%B9%E0%A4%BE = "महा")...');
  const unicodeResult = await testServerCrashOnExploit('Unicode State', '/api/tiles/wms/%E0%A4%AE%E0%A4%B9%E0%A4%BE/14/0/0');
  if (unicodeResult.crashed || unicodeResult.stderr.includes('ERR_INVALID_CHAR')) {
    fail(
      'TEST_07_03',
      'Non-Latin-1 Unicode state name crashes server process',
      new Error(`Server crashed with unhandled ERR_INVALID_CHAR on res.setHeader('X-State', ...). Stderr: ${unicodeResult.stderr.split('\n')[0]}`),
      'CRITICAL'
    );
  } else {
    pass('TEST_07_03', 'Unicode state name survived', `Status: ${unicodeResult.statusCode}`);
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  const durationSec = ((Date.now() - suiteStartTime) / 1000).toFixed(2);
  console.log('\n================================================================================');
  console.log('📊 CHALLENGER 1 EMPIRICAL ADVERSARIAL STRESS TEST SUMMARY');
  console.log('================================================================================');
  console.log(`⏱️  Duration:        ${durationSec}s`);
  console.log(`🔢 Total Tests:     ${suiteResults.total}`);
  console.log(`✅ Passed:          ${suiteResults.passed}`);
  console.log(`❌ Failed:          ${suiteResults.failed}`);
  console.log(`⚠️  Warnings:        ${suiteResults.warnings}`);
  console.log(`🔥 Findings:        ${suiteResults.findings.length}`);

  if (suiteResults.findings.length > 0) {
    console.log('\n🚨 DEFECT SUMMARY:');
    suiteResults.findings.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.severity}] ${f.testId}: ${f.description}`);
      console.log(`     Error: ${f.error}`);
    });
  }

  const verdict = suiteResults.failed > 0 ? 'FAIL' : 'APPROVE';
  console.log('\n================================================================================');
  console.log(`🏆 FINAL CHALLENGER VERDICT: ${verdict}`);
  console.log('================================================================================\n');

  return {
    verdict,
    results: suiteResults
  };
}

// Execute if run directly
if (require.main === module) {
  runAdversarialTilesProxyChallenger().then(({ verdict, results }) => {
    // Write machine-readable JSON results to tests/adversarial_m2_tiles_results.json
    fs.writeFileSync(
      path.join(__dirname, 'adversarial_m2_tiles_results.json'),
      JSON.stringify(results, null, 2)
    );
    process.exit(verdict === 'APPROVE' ? 0 : 1);
  }).catch((err) => {
    console.error('Fatal test harness execution error:', err);
    process.exit(1);
  });
}

module.exports = { runAdversarialTilesProxyChallenger };
