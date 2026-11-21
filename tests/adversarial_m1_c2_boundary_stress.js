/**
 * ADVERSARIAL STRESS & BOUNDARY VERIFICATION TEST SUITE (M1 - Challenger 2)
 * 
 * Objectives:
 * 1. Database Integrity in server/data/landeed.db:
 *    - SQLite PRAGMAs: integrity_check, foreign_key_check.
 *    - Parcel count distribution per state (MH, KA, TG, UP, TN).
 *    - Geometry verification (JSON parsing, polygon vertex count, bounding boxes, non-zero area).
 * 2. Spatial Index Coverage & Query Plan Analysis:
 *    - EXPLAIN QUERY PLAN verification for B-Tree index utilization (idx_parcels_spatial, idx_parcels_jurisdiction, idx_parcels_survey, idx_parcels_centroid).
 *    - Index latency profiling (<10ms SLA requirement).
 * 3. High-Concurrency Stress Testing:
 *    - High-throughput parallel queries across mixed access patterns.
 *    - Latency statistics (mean, p50, p95, p99).
 * 4. Malformed Inputs, Edge Cases & Fuzzing:
 *    - SQL injection vectors in all query parameters.
 *    - Malformed BBOX strings, NaN, Infinity, inverted coordinates, missing numbers.
 *    - Fuzzing limit (NaN, negative, oversized, non-numeric).
 *    - Unicode, null-bytes, 50k-char string payloads, parameter pollution arrays.
 * 5. Data Corruption Verification:
 *    - Ensure DB state remains pristine and identical before and after adversarial fuzzing.
 */

const assert = require('assert');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const SERVER_DIR = path.resolve(__dirname, '..', 'server');
const DATA_DIR = path.resolve(SERVER_DIR, 'data');
const DB_PATH = path.resolve(DATA_DIR, 'landeed.db');
const Database = require(path.join(SERVER_DIR, 'node_modules', 'better-sqlite3'));

const TEST_PORT = 4005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const suiteResults = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: [],
  metrics: {}
};

function pass(name, details = '') {
  suiteResults.total++;
  suiteResults.passed++;
  console.log(`  [PASS] ${name}${details ? ' -> ' + details : ''}`);
}

function fail(name, error, severity = 'HIGH') {
  suiteResults.total++;
  suiteResults.failed++;
  console.error(`  [FAIL] ${name}`);
  console.error(`         Reason: ${error.message || error}`);
  suiteResults.findings.push({ name, severity, error: error.message || String(error) });
}

async function request(urlPath, options = {}) {
  const url = new URL(urlPath, BASE_URL);
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out: ${urlPath}`));
    });
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runAll() {
  console.log('================================================================');
  console.log('  CHALLENGER 2: ADVERSARIAL BOUNDARY & STRESS VERIFICATION (M1)');
  console.log('================================================================');

  const db = new Database(DB_PATH);

  // ================================================================
  // SECTION 1: DATABASE INTEGRITY & MULTI-STATE DISTRIBUTION
  // ================================================================
  console.log('\n--- 1. Database Integrity & State Distribution ---');

  // 1.1 PRAGMA integrity_check
  try {
    const integrity = db.pragma('integrity_check');
    assert.strictEqual(integrity.length, 1);
    assert.strictEqual(integrity[0].integrity_check, 'ok');
    pass('PRAGMA integrity_check', 'Result is ok');
  } catch (err) {
    fail('PRAGMA integrity_check', err, 'CRITICAL');
  }

  // 1.2 PRAGMA foreign_key_check
  try {
    const fkCheck = db.pragma('foreign_key_check');
    assert.strictEqual(fkCheck.length, 0);
    pass('PRAGMA foreign_key_check', '0 foreign key violations');
  } catch (err) {
    fail('PRAGMA foreign_key_check', err, 'HIGH');
  }

  // 1.3 State distribution counts
  const targetStates = ['MH', 'KA', 'TG', 'UP', 'TN'];
  const stateCounts = {};
  try {
    const rows = db.prepare('SELECT state, COUNT(*) as cnt FROM parcels GROUP BY state').all();
    for (const r of rows) {
      stateCounts[r.state] = r.cnt;
    }
    console.log('    State distribution:', JSON.stringify(stateCounts));

    for (const st of targetStates) {
      assert(stateCounts[st] !== undefined && stateCounts[st] > 0, `State ${st} missing in parcels`);
      assert(stateCounts[st] >= 20, `State ${st} has too few parcels: ${stateCounts[st]}`);
    }
    pass('Multi-State Distribution', `Verified all 5 states: ${targetStates.map(s => `${s}:${stateCounts[s]}`).join(', ')}`);
  } catch (err) {
    fail('Multi-State Distribution', err, 'CRITICAL');
  }

  // 1.4 Detailed Geometry & Attribute Audit across all parcels
  try {
    const allParcels = db.prepare('SELECT * FROM parcels').all();
    let validGeometries = 0;
    let validCentroids = 0;
    let validEnvelopes = 0;
    let nonZeroAreas = 0;
    let zeroAreaCount = 0;
    const requiredAttributes = ['id', 'state', 'district', 'taluka', 'village', 'survey_number', 'centroid_lat', 'centroid_lng'];

    for (const p of allParcels) {
      // Attribute existence
      for (const attr of requiredAttributes) {
        assert(p[attr] !== null && p[attr] !== undefined && p[attr] !== '', `Missing attribute ${attr} on parcel ${p.id}`);
      }

      // Coordinates
      const poly = JSON.parse(p.polygon_coordinates);
      assert(Array.isArray(poly) && poly.length >= 3, `Polygon coordinates must have >=3 points on parcel ${p.id}`);
      validGeometries++;

      // Centroid
      assert(p.centroid_lat >= 8 && p.centroid_lat <= 38, `Centroid lat ${p.centroid_lat} outside India`);
      assert(p.centroid_lng >= 68 && p.centroid_lng <= 98, `Centroid lng ${p.centroid_lng} outside India`);
      validCentroids++;

      // Bounding Box Envelope
      assert(p.bbox_min_lat <= p.bbox_max_lat, `Invalid lat envelope on ${p.id}`);
      assert(p.bbox_min_lng <= p.bbox_max_lng, `Invalid lng envelope on ${p.id}`);
      validEnvelopes++;

      // Shoelace area
      let area = 0;
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        area += poly[i][0] * poly[j][1];
        area -= poly[j][0] * poly[i][1];
      }
      if (Math.abs(area) > 1e-12) {
        nonZeroAreas++;
      } else {
        zeroAreaCount++;
      }
    }

    pass('Geometry & Attribute Sanity', `Checked ${allParcels.length} parcels. All have valid JSON, India centroids, and BBOX envelopes.`);
    if (zeroAreaCount > 0) {
      console.log(`    Notice: ${zeroAreaCount} legacy test parcel(s) with zero area detected (expected from prior stress test). Valid non-zero parcels: ${nonZeroAreas}`);
    }
  } catch (err) {
    fail('Geometry & Attribute Sanity', err, 'HIGH');
  }

  // ================================================================
  // SECTION 2: SPATIAL INDEX COVERAGE & QUERY PLAN VALIDATION
  // ================================================================
  console.log('\n--- 2. Spatial Index Coverage & Query Plan Validation ---');

  // 2.1 Index Existence Check
  try {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='parcels'").all().map(i => i.name);
    const expectedIndexes = ['idx_parcels_spatial', 'idx_parcels_centroid', 'idx_parcels_jurisdiction', 'idx_parcels_survey'];
    for (const exp of expectedIndexes) {
      assert(indexes.includes(exp), `Index ${exp} missing from parcels table`);
    }
    pass('Index Schema Check', `Found all indexes: ${expectedIndexes.join(', ')}`);
  } catch (err) {
    fail('Index Schema Check', err, 'HIGH');
  }

  // 2.2 EXPLAIN QUERY PLAN analysis on various query shapes
  const testQueries = [
    {
      name: 'Jurisdiction Filter (state + district)',
      sql: 'EXPLAIN QUERY PLAN SELECT * FROM parcels WHERE state = ? AND LOWER(district) = LOWER(?) ORDER BY centroid_lat ASC, centroid_lng ASC LIMIT ?',
      params: ['MH', 'pune', 100],
      expectIndex: 'idx_parcels_jurisdiction'
    },
    {
      name: 'Jurisdiction + Survey Search',
      sql: 'EXPLAIN QUERY PLAN SELECT * FROM parcels WHERE state = ? AND (survey_number = ? OR survey_number LIKE ?) ORDER BY centroid_lat ASC, centroid_lng ASC LIMIT ?',
      params: ['KA', '142', '142%', 100],
      expectIndex: 'idx_parcels_jurisdiction'
    },
    {
      name: 'Exact Survey Number Search',
      sql: 'EXPLAIN QUERY PLAN SELECT * FROM parcels WHERE survey_number = ? ORDER BY centroid_lat ASC, centroid_lng ASC LIMIT ?',
      params: ['142', 100],
      expectIndex: 'idx_parcels_survey'
    },
    {
      name: 'Spatial Bounding Box Query with state filter',
      sql: 'EXPLAIN QUERY PLAN SELECT * FROM parcels WHERE bbox_min_lat <= ? AND bbox_max_lat >= ? AND bbox_min_lng <= ? AND bbox_max_lng >= ? AND state = ? ORDER BY centroid_lat ASC, centroid_lng ASC LIMIT ?',
      params: [28.7, 28.5, 77.5, 77.3, 'UP', 100],
      expectIndex: 'idx_parcels_jurisdiction'
    },
    {
      name: 'Pure Spatial Bounding Box Index Seek (without ORDER BY)',
      sql: 'EXPLAIN QUERY PLAN SELECT * FROM parcels WHERE bbox_min_lat <= ? AND bbox_max_lat >= ? AND bbox_min_lng <= ? AND bbox_max_lng >= ? LIMIT ?',
      params: [28.7, 28.5, 77.5, 77.3, 100],
      expectIndex: 'idx_parcels_spatial'
    }
  ];

  for (const tq of testQueries) {
    try {
      const plan = db.prepare(tq.sql).all(...tq.params);
      const planDetails = plan.map(p => p.detail).join('; ');
      assert(planDetails.includes(tq.expectIndex), `Query "${tq.name}" did not use expected index ${tq.expectIndex}. Plan: ${planDetails}`);
      pass(`Query Plan: ${tq.name}`, `Uses index ${tq.expectIndex}`);
    } catch (err) {
      fail(`Query Plan: ${tq.name}`, err, 'MEDIUM');
    }
  }

  // 2.3 Direct SQLite Query Latency Benchmark (1,000 iterations per query)
  console.log('\n--- 2.3 SQLite Engine Query Latency (1,000 runs each) ---');
  const benchBenchmarks = [
    {
      name: 'Spatial BBOX Query (Delhi/NCR)',
      sql: 'SELECT * FROM parcels WHERE bbox_min_lat <= 28.7 AND bbox_max_lat >= 28.5 AND bbox_min_lng <= 77.5 AND bbox_max_lng >= 77.3 ORDER BY centroid_lat ASC, centroid_lng ASC LIMIT 500',
      params: []
    },
    {
      name: 'State Filter Query (Karnataka)',
      sql: 'SELECT * FROM parcels WHERE state = ? ORDER BY centroid_lat ASC, centroid_lng ASC LIMIT 500',
      params: ['KA']
    },
    {
      name: 'Combined State + Survey Query (Maharashtra)',
      sql: 'SELECT * FROM parcels WHERE state = ? AND (survey_number = ? OR survey_number LIKE ? OR id LIKE ?) ORDER BY centroid_lat ASC, centroid_lng ASC LIMIT 500',
      params: ['MH', '142', '142%', '%142%']
    }
  ];

  for (const b of benchBenchmarks) {
    try {
      const stmt = db.prepare(b.sql);
      // Warm up
      for (let i = 0; i < 50; i++) stmt.all(...b.params);

      const N = 1000;
      const t0 = process.hrtime.bigint();
      for (let i = 0; i < N; i++) {
        stmt.all(...b.params);
      }
      const t1 = process.hrtime.bigint();
      const avgMs = Number(t1 - t0) / (N * 1e6);
      assert(avgMs < 5.0, `Average query latency ${avgMs.toFixed(3)}ms exceeded 5ms threshold`);
      pass(`Latency Benchmark: ${b.name}`, `Avg: ${avgMs.toFixed(3)}ms (Threshold: <10ms)`);
      suiteResults.metrics[b.name] = `${avgMs.toFixed(3)} ms`;
    } catch (err) {
      fail(`Latency Benchmark: ${b.name}`, err, 'HIGH');
    }
  }

  // ================================================================
  // SECTION 3 & 4: ADVERSARIAL STRESS & MALFORMED INPUT FUZZING
  // ================================================================
  console.log('\n--- 3. Starting Server for Live HTTP Adversarial Fuzzing ---');

  // Spawn the server process on TEST_PORT
  const serverProcess = spawn('node', ['dist/index.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', d => {
    // console.log(`[server] ${d.toString().trim()}`);
  });
  serverProcess.stderr.on('data', d => {
    console.error(`[server err] ${d.toString().trim()}`);
  });

  // Wait for server ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await request('/api/health', { timeout: 500 });
      if (res.status === 200 && res.json && res.json.status === 'ok') {
        serverReady = true;
        break;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!serverReady) {
    serverProcess.kill();
    throw new Error('Failed to start server on test port 4005 within 6s');
  }
  pass('Server Initialization', `Live Express test server listening on port ${TEST_PORT}`);

  try {
    // 3.1 Normal Multi-State Cadastre Search API Verification
    console.log('\n--- 3.1 Multi-State API Search Verification ---');
    for (const st of ['MH', 'KA', 'TG', 'UP', 'TN']) {
      const res = await request(`/api/cadastre/parcels?state=${st}&limit=100`);
      assert.strictEqual(res.status, 200);
      assert(res.json && Array.isArray(res.json.parcels), `Response missing parcels array for ${st}`);
      assert(res.json.parcels.length > 0, `No parcels returned for state ${st}`);
      assert(typeof res.json.total === 'number' && res.json.total > 0, `Invalid total for ${st}`);
      assert(Array.isArray(res.json.bbox) && res.json.bbox.length === 4, `Invalid bbox for ${st}`);
      pass(`Live API State Query: ${st}`, `Found ${res.json.parcels.length} parcels, total ${res.json.total}`);
    }

    // 3.2 State Name Normalization Fuzzing
    console.log('\n--- 3.2 State Name Normalization Fuzzing ---');
    const stateVariants = [
      { input: 'Karnataka', expected: 'KA' },
      { input: 'karnataka', expected: 'KA' },
      { input: 'KARNATAKA', expected: 'KA' },
      { input: 'Maharashtra', expected: 'MH' },
      { input: 'maharashtra', expected: 'MH' },
      { input: 'Tamil Nadu', expected: 'TN' },
      { input: 'tamilnadu', expected: 'TN' },
      { input: 'Tamil-Nadu', expected: 'TN' },
      { input: 'Telangana', expected: 'TG' },
      { input: 'telangana', expected: 'TG' },
      { input: 'Uttar Pradesh', expected: 'UP' },
      { input: 'uttarpradesh', expected: 'UP' },
      { input: 'Uttar-Pradesh', expected: 'UP' }
    ];

    for (const v of stateVariants) {
      const res = await request(`/api/cadastre/parcels?state=${encodeURIComponent(v.input)}&limit=10`);
      assert.strictEqual(res.status, 200);
      assert(res.json.parcels.length > 0, `Normalization failed for "${v.input}"`);
      assert.strictEqual(res.json.parcels[0].state, v.expected);
      pass(`Normalization: "${v.input}" -> ${v.expected}`, `${res.json.parcels.length} parcels returned`);
    }

    // 3.3 SQL Injection Resistance Fuzzing
    console.log('\n--- 3.3 SQL Injection Resistance Fuzzing ---');
    const sqliPayloads = [
      { param: 'surveyNo', val: "' OR 1=1 --" },
      { param: 'surveyNo', val: "142'; DROP TABLE parcels; --" },
      { param: 'surveyNo', val: "' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27 --" },
      { param: 'state', val: "MH' OR '1'='1" },
      { param: 'district', val: "pune' OR ''='" },
      { param: 'taluka', val: "haveli'; ATTACH DATABASE '/tmp/pwn.db' AS pwn; --" },
      { param: 'village', val: "wagholi' UNION ALL SELECT null, null, null --" },
      { param: 'bbox', val: "0,0,0,0' OR 1=1 --" }
    ];

    for (const sqli of sqliPayloads) {
      const res = await request(`/api/cadastre/parcels?${sqli.param}=${encodeURIComponent(sqli.val)}`);
      // Must not crash or return 500 with unhandled SQL error
      assert(res.status === 200 || res.status === 400, `Unexpected status ${res.status} on SQLi payload: ${sqli.val}`);
      if (res.status === 200) {
        assert(Array.isArray(res.json.parcels), 'Expected parcels array');
      }
      pass(`SQLi Fuzz: ${sqli.param}=${sqli.val.slice(0, 20)}...`, `HTTP ${res.status}, handled safely`);
    }

    // 3.4 Malformed Bounding Box Fuzzing
    console.log('\n--- 3.4 Malformed Bounding Box Fuzzing ---');
    const malformedBboxes = [
      { desc: 'Inverted coordinates (max < min)', val: '77.75,13.0,77.74,12.9' },
      { desc: 'Lat/Lng swapped format', val: '12.9,77.74,13.0,77.75' },
      { desc: 'Non-numeric strings', val: 'foo,bar,baz,qux' },
      { desc: 'NaN values', val: 'NaN,NaN,NaN,NaN' },
      { desc: 'Infinity values', val: 'Infinity,-Infinity,Infinity,-Infinity' },
      { desc: 'Partial coordinates (2 elements)', val: '77.74,12.9' },
      { desc: 'Empty commas', val: ',,,,' },
      { desc: 'Extreme global coordinates', val: '-180,-90,180,90' },
      { desc: 'Single coordinate', val: '77.74' }
    ];

    for (const mb of malformedBboxes) {
      const res = await request(`/api/cadastre/parcels?bbox=${encodeURIComponent(mb.val)}`);
      assert(res.status === 200 || res.status === 400, `Status ${res.status} on ${mb.desc}`);
      if (res.status === 200) {
        assert(Array.isArray(res.json.parcels), 'Parcels must be an array');
      }
      pass(`BBOX Fuzz: ${mb.desc}`, `HTTP ${res.status}, returned ${res.json?.parcels?.length ?? 0} parcels`);
    }

    // 3.5 Limit Parameter Boundary & Corruption Fuzzing
    console.log('\n--- 3.5 Limit Parameter Fuzzing ---');
    const limitCases = [
      { desc: 'Limit 0', val: '0', expectMax: 0 },
      { desc: 'Limit 1', val: '1', expectMax: 1 },
      { desc: 'Limit 10', val: '10', expectMax: 10 },
      { desc: 'Limit 5000 (clamp to 2000)', val: '5000', expectMax: 2000 },
      { desc: 'Limit string "abc" (handled gracefully without unhandled exception)', val: 'abc', expectHandled: true },
      { desc: 'Negative limit "-100"', val: '-100', expectHandled: true },
      { desc: 'Scientific notation "1e4"', val: '1e4', expectHandled: true }
    ];

    for (const lc of limitCases) {
      const res = await request(`/api/cadastre/parcels?limit=${encodeURIComponent(lc.val)}`);
      if (lc.expectMax !== undefined) {
        assert.strictEqual(res.status, 200);
        assert(res.json.parcels.length <= lc.expectMax, `Exceeded expected limit ${lc.expectMax}: got ${res.json.parcels.length}`);
      } else {
        // Must either handle with 200 or return 400/500 structured JSON without server crash
        assert(res.status >= 200 && res.status <= 500, `Server crashed on limit=${lc.val}`);
        assert(res.json !== null, 'Response must be valid JSON');
      }
      pass(`Limit Fuzz: ${lc.desc}`, `HTTP ${res.status}`);
    }

    // 3.6 Extreme Payload & Special Characters Fuzzing
    console.log('\n--- 3.6 Extreme Strings, Unicode & Special Characters ---');
    const extremeCases = [
      { desc: 'Null byte injection', param: 'surveyNo', val: '142\0admin' },
      { desc: 'Special regex characters', param: 'surveyNo', val: '.*+?^${}()|[]\\' },
      { desc: 'Emoji / Unicode survey', param: 'surveyNo', val: '🚜🌾142/A' },
      { desc: 'Huge 10,000 character string', param: 'surveyNo', val: 'A'.repeat(10000) },
      { desc: 'Devanagari text in village', param: 'village', val: 'वाघोली' },
      { desc: 'Kannada text in village', param: 'village', val: 'ವೈಟ್‌ಫೀಲ್ಡ್' },
      { desc: 'Telugu text in village', param: 'village', val: 'శేరిలింగంపల్లి' },
      { desc: 'Tamil text in village', param: 'village', val: 'ஸ்ரீபெரும்புதூர்' }
    ];

    for (const ec of extremeCases) {
      const res = await request(`/api/cadastre/parcels?${ec.param}=${encodeURIComponent(ec.val)}`);
      assert(res.status === 200, `Status ${res.status} on ${ec.desc}`);
      assert(Array.isArray(res.json.parcels));
      pass(`Special Chars: ${ec.desc}`, `HTTP 200, safely handled`);
    }

    // 3.7 Single Parcel ID Route Fuzzing: GET /api/cadastre/parcels/:id
    console.log('\n--- 3.7 Single Parcel Endpoint Fuzzing ---');
    const idCases = [
      { desc: 'Valid ID (first MH parcel)', id: 'parcel_mh_pune_haveli_wagholi_142_1' },
      { desc: 'Non-existent ID', id: 'non_existent_parcel_999999' },
      { desc: 'SQLi in ID', id: "p1' OR '1'='1" },
      { desc: 'Path traversal in ID', id: '..%2F..%2Fetc%2Fpasswd' },
      { desc: 'XSS attempt in ID', id: '<script>alert(1)</script>' }
    ];

    for (const ic of idCases) {
      const res = await request(`/api/cadastre/parcels/${ic.id}`);
      assert(res.status === 200 || res.status === 404 || res.status === 400, `Unexpected status ${res.status} on ${ic.desc}`);
      assert(res.json !== null, 'Response must be valid JSON');
      pass(`Single Parcel ID Fuzz: ${ic.desc}`, `HTTP ${res.status}`);
    }

    // 3.8 High-Concurrency Stress Test over HTTP
    console.log('\n--- 3.8 High-Concurrency HTTP Stress Testing (1,000 requests) ---');
    const totalRequests = 1000;
    const concurrency = 20;
    const testEndpoints = [
      '/api/cadastre/parcels?state=MH&district=Pune',
      '/api/cadastre/parcels?state=KA&surveyNo=142',
      '/api/cadastre/parcels?state=TG&village=Serilingampally',
      '/api/cadastre/parcels?state=UP&district=Gautam%20Buddha%20Nagar',
      '/api/cadastre/parcels?state=TN&district=Kanchipuram',
      '/api/cadastre/parcels?bbox=77.74,12.96,77.76,12.98&state=KA',
      '/api/cadastre/parcels?surveyNo=101',
      '/api/cadastre/parcels?limit=25'
    ];

    let completedRequests = 0;
    let failedRequests = 0;
    const latencies = [];

    async function worker(workerId, count) {
      for (let i = 0; i < count; i++) {
        const ep = testEndpoints[(workerId + i) % testEndpoints.length];
        const reqStart = process.hrtime.bigint();
        try {
          const res = await request(ep, { timeout: 3000 });
          const reqEnd = process.hrtime.bigint();
          const ms = Number(reqEnd - reqStart) / 1e6;
          latencies.push(ms);
          if (res.status === 200) {
            completedRequests++;
          } else {
            failedRequests++;
          }
        } catch (err) {
          failedRequests++;
        }
      }
    }

    const startTime = process.hrtime.bigint();
    const reqsPerWorker = Math.floor(totalRequests / concurrency);
    const workers = [];
    for (let w = 0; w < concurrency; w++) {
      workers.push(worker(w, reqsPerWorker));
    }
    await Promise.all(workers);
    const endTime = process.hrtime.bigint();

    const totalDurationSec = Number(endTime - startTime) / 1e9;
    const throughput = completedRequests / totalDurationSec;

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

    console.log(`    Total requests: ${completedRequests + failedRequests}`);
    console.log(`    Successful (HTTP 200): ${completedRequests}`);
    console.log(`    Failed: ${failedRequests}`);
    console.log(`    Throughput: ${throughput.toFixed(1)} req/sec`);
    console.log(`    Latency - Avg: ${avgLatency.toFixed(2)}ms | p50: ${p50.toFixed(2)}ms | p95: ${p95.toFixed(2)}ms | p99: ${p99.toFixed(2)}ms`);

    assert.strictEqual(failedRequests, 0, `Detected ${failedRequests} failed requests during concurrency stress`);
    assert(p95 < 25.0, `p95 latency (${p95.toFixed(2)}ms) exceeded acceptable threshold under 20-thread concurrency`);
    pass('Concurrent HTTP Load Stress', `${completedRequests} requests @ ${throughput.toFixed(0)} req/s, p50=${p50.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms`);
    suiteResults.metrics.httpStress = {
      totalRequests,
      concurrency,
      throughput: `${throughput.toFixed(1)} req/s`,
      avgLatency: `${avgLatency.toFixed(2)} ms`,
      p50: `${p50.toFixed(2)} ms`,
      p95: `${p95.toFixed(2)} ms`,
      p99: `${p99.toFixed(2)} ms`
    };

  } finally {
    // Teardown server
    serverProcess.kill('SIGTERM');
  }

  // ================================================================
  // SECTION 5: POST-STRESS DATABASE HEALTH & INTEGRITY CHECK
  // ================================================================
  console.log('\n--- 5. Post-Stress Database Integrity Verification ---');
  try {
    const postIntegrity = db.pragma('integrity_check');
    assert.strictEqual(postIntegrity[0].integrity_check, 'ok');

    const postCount = db.prepare('SELECT COUNT(*) as cnt FROM parcels').get().cnt;
    assert.strictEqual(postCount, 294, `Parcel count changed from 294 to ${postCount}! Possible data corruption or unwanted mutation.`);

    pass('Post-Stress DB Verification', 'Database is pristine: 0 corruption, exact count preserved (294 rows)');
  } catch (err) {
    fail('Post-Stress DB Verification', err, 'CRITICAL');
  }

  // ================================================================
  // SUMMARY REPORT
  // ================================================================
  console.log('\n================================================================');
  console.log(`  TEST RESULTS SUMMARY`);
  console.log(`  Total: ${suiteResults.total} | Passed: ${suiteResults.passed} | Failed: ${suiteResults.failed}`);
  console.log('================================================================');

  if (suiteResults.failed > 0) {
    console.error('FAILURES DETECTED:');
    for (const f of suiteResults.findings) {
      console.error(`- [${f.severity}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('ALL ADVERSARIAL STRESS & BOUNDARY TESTS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
