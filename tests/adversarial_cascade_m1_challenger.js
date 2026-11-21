/**
 * Empirical Adversarial Challenger Suite for Landeed 2.0 Milestone 1
 * Backend Location Hierarchy Endpoints & Revenue Datasets
 * 
 * Verifies:
 * - Tier 1: Parameter boundary edge cases (missing, empty, whitespace, unknown, optional)
 * - Tier 2: Normalization, aliases, case-insensitivity (keys vs values)
 * - Tier 3: Path parameter vs query parameter exact equivalence
 * - Tier 4: Legacy `/api/locations/:state/*` route backwards compatibility & parity
 * - Tier 5: Security, injection, long payload, duplicate/array parameter stress
 * - Tier 6: High concurrency burst (50 concurrent) & latency benchmark (100 iterations)
 */

const http = require('node:http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';

function request(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      timeout: options.timeout || 5000
    }, (res) => {
      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        const durationMs = Date.now() - start;
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (e) {
          json = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
          rawBody: rawData,
          durationMs
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out after ${options.timeout || 5000}ms`));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
    if (!deepEqual(a[keysA[i]], b[keysB[i]])) return false;
  }
  return true;
}

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
      console.error(`     Details:`, JSON.stringify(details));
    }
    results.findings.push({ testId, description, details });
  }
}

async function runAdversarialSuite() {
  console.log(`\n================================================================================`);
  console.log(`⚔️  LANDEED 2.0 EMPIRICAL ADVERSARIAL CHALLENGER: MILESTONE 1`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`================================================================================\n`);

  // --------------------------------------------------------------------------
  // TIER 1: Parameter Boundary Edge Cases & HTTP 400 Validation
  // --------------------------------------------------------------------------
  console.log(`--- TIER 1: Parameter Boundaries & HTTP 400 Verification ---`);

  // 1. Missing state on /districts
  const r1 = await request('/api/districts');
  assert(r1.status === 400 && r1.body?.error === 'State parameter is required',
    'TEST_ADV_01', 'GET /api/districts with missing state returns HTTP 400',
    { status: r1.status, body: r1.body });

  // 2. Missing state on /talukas
  const r2 = await request('/api/talukas');
  assert(r2.status === 400 && r2.body?.error === 'State parameter is required',
    'TEST_ADV_02', 'GET /api/talukas with missing state returns HTTP 400',
    { status: r2.status, body: r2.body });

  // 3. Missing district on /talukas?state=MH
  const r3 = await request('/api/talukas?state=MH');
  assert(r3.status === 400 && r3.body?.error === 'District parameter is required',
    'TEST_ADV_03', 'GET /api/talukas?state=MH with missing district returns HTTP 400',
    { status: r3.status, body: r3.body });

  // 4. Missing state on /talukas?district=Pune
  const r4 = await request('/api/talukas?district=Pune');
  assert(r4.status === 400 && r4.body?.error === 'State parameter is required',
    'TEST_ADV_04', 'GET /api/talukas?district=Pune with missing state returns HTTP 400',
    { status: r4.status, body: r4.body });

  // 5. Missing state on /villages
  const r5 = await request('/api/villages');
  assert(r5.status === 400 && r5.body?.error === 'State parameter is required',
    'TEST_ADV_05', 'GET /api/villages with missing state returns HTTP 400',
    { status: r5.status, body: r5.body });

  // 6. Missing taluka on /villages?state=MH&district=Pune
  const r6 = await request('/api/villages?state=MH&district=Pune');
  assert(r6.status === 400 && r6.body?.error === 'Taluka parameter is required',
    'TEST_ADV_06', 'GET /api/villages?state=MH&district=Pune with missing taluka returns HTTP 400',
    { status: r6.status, body: r6.body });

  // 7. Missing taluka on /villages?state=MH
  const r7 = await request('/api/villages?state=MH');
  assert(r7.status === 400 && r7.body?.error === 'Taluka parameter is required',
    'TEST_ADV_07', 'GET /api/villages?state=MH with missing taluka returns HTTP 400',
    { status: r7.status, body: r7.body });

  // 8. Omitted district on /villages with valid taluka (Contract: district is optional if taluka uniquely resolves)
  const r8 = await request('/api/villages?state=MH&taluka=Haveli');
  assert(r8.status === 200 && r8.body?.taluka === 'Haveli' && r8.body?.district === 'Pune' && Array.isArray(r8.body?.villages) && r8.body?.villages.includes('Wagholi'),
    'TEST_ADV_08', 'GET /api/villages?state=MH&taluka=Haveli infers parent district "Pune" accurately',
    { status: r8.status, body: r8.body });

  // 9. Empty string state parameter
  const r9 = await request('/api/districts?state=');
  assert(r9.status === 400 && r9.body?.error === 'State parameter is required',
    'TEST_ADV_09', 'GET /api/districts?state= (empty string) returns HTTP 400',
    { status: r9.status, body: r9.body });

  // 10. Empty string district parameter
  const r10 = await request('/api/talukas?state=MH&district=');
  assert(r10.status === 400 && r10.body?.error === 'District parameter is required',
    'TEST_ADV_10', 'GET /api/talukas?state=MH&district= (empty string) returns HTTP 400',
    { status: r10.status, body: r10.body });

  // 11. Empty string taluka parameter
  const r11 = await request('/api/villages?state=MH&district=Pune&taluka=');
  assert(r11.status === 400 && r11.body?.error === 'Taluka parameter is required',
    'TEST_ADV_11', 'GET /api/villages?state=MH&district=Pune&taluka= (empty string) returns HTTP 400',
    { status: r11.status, body: r11.body });

  // 12. Pure whitespace state parameter
  const r12 = await request('/api/districts?state=%20%20%20');
  assert(r12.status === 400 && r12.body?.error === 'State parameter is required',
    'TEST_ADV_12', 'GET /api/districts?state=%20%20%20 (whitespace) returns HTTP 400',
    { status: r12.status, body: r12.body });

  // 13. Pure whitespace district parameter
  const r13 = await request('/api/talukas?state=MH&district=%20%20%20');
  assert(r13.status === 400 && r13.body?.error === 'District parameter is required',
    'TEST_ADV_13', 'GET /api/talukas?state=MH&district=%20%20%20 (whitespace) returns HTTP 400',
    { status: r13.status, body: r13.body });

  // 14. Pure whitespace taluka parameter
  const r14 = await request('/api/villages?state=MH&district=Pune&taluka=%20%20%20');
  assert(r14.status === 400 && r14.body?.error === 'Taluka parameter is required',
    'TEST_ADV_14', 'GET /api/villages?state=MH&district=Pune&taluka=%20%20%20 (whitespace) returns HTTP 400',
    { status: r14.status, body: r14.body });

  // 15. Leading and trailing whitespace trimming
  const r15a = await request('/api/districts?state=%20MH%20');
  const r15b = await request('/api/talukas?state=%20MH%20&district=%20Pune%20');
  const r15c = await request('/api/villages?state=%20MH%20&district=%20Pune%20&taluka=%20Haveli%20');
  assert(
    r15a.status === 200 && r15a.body?.state === 'MH' &&
    r15b.status === 200 && r15b.body?.district === 'Pune' &&
    r15c.status === 200 && r15c.body?.taluka === 'Haveli',
    'TEST_ADV_15', 'Leading & trailing whitespace properly trimmed across all three endpoints',
    { r15a: r15a.body?.state, r15b: r15b.body?.district, r15c: r15c.body?.taluka });

  // 16. Non-existent entities return empty arrays (never 500 or throw)
  const r16a = await request('/api/districts?state=ZZ');
  const r16b = await request('/api/talukas?state=MH&district=Atlantis');
  const r16c = await request('/api/villages?state=MH&district=Pune&taluka=Atlantis');
  assert(
    r16a.status === 200 && Array.isArray(r16a.body?.districts) && r16a.body.districts.length === 0 &&
    r16b.status === 200 && Array.isArray(r16b.body?.talukas) && r16b.body.talukas.length === 0 &&
    r16c.status === 200 && Array.isArray(r16c.body?.villages) && r16c.body.villages.length === 0,
    'TEST_ADV_16', 'Non-existent states/districts/talukas return HTTP 200 with empty arrays []',
    { r16a: r16a.body, r16b: r16b.body, r16c: r16c.body });


  // --------------------------------------------------------------------------
  // TIER 2: Casing, Aliases & Key vs Value Variations
  // --------------------------------------------------------------------------
  console.log(`\n--- TIER 2: Casing, Aliases & Value Normalization ---`);

  // 17. Value case insensitivity for state codes and full names
  const testStates = [
    { input: 'mh', expected: 'MH' },
    { input: 'mH', expected: 'MH' },
    { input: 'maharashtra', expected: 'MH' },
    { input: 'MAHARASHTRA', expected: 'MH' },
    { input: 'karnataka', expected: 'KA' },
    { input: 'telangana', expected: 'TG' },
    { input: 'ts', expected: 'TG' },
    { input: 'uttar pradesh', expected: 'UP' },
    { input: 'tamil nadu', expected: 'TN' },
    { input: 'gujarat', expected: 'GJ' },
    { input: 'andhra pradesh', expected: 'AP' }
  ];
  let statesAllPassed = true;
  for (const ts of testStates) {
    const res = await request(`/api/districts?state=${encodeURIComponent(ts.input)}`);
    if (res.status !== 200 || res.body?.state !== ts.expected || !Array.isArray(res.body?.districts) || res.body.districts.length === 0) {
      statesAllPassed = false;
      console.error(`      Mismatch for state input "${ts.input}":`, res.body);
    }
  }
  assert(statesAllPassed, 'TEST_ADV_17', 'Case-insensitive state code and full name resolution across all 7 states');

  // 18. Value case insensitivity for districts and talukas
  const r18a = await request('/api/talukas?state=mh&district=pune');
  const r18b = await request('/api/talukas?state=mh&district=PUNE');
  const r18c = await request('/api/talukas?state=mh&district=pUnE');
  assert(
    r18a.status === 200 && r18a.body?.district === 'Pune' &&
    r18b.status === 200 && r18b.body?.district === 'Pune' &&
    r18c.status === 200 && r18c.body?.district === 'Pune' &&
    r18a.body?.talukas?.includes('Haveli') &&
    r18c.body?.talukas?.includes('Haveli'),
    'TEST_ADV_18', 'District value casing (pune, PUNE, pUnE) normalizes to canonical "Pune"',
    { r18a: r18a.body?.district, r18c: r18c.body?.district });

  // 19. Value case insensitivity for talukas and villages
  const r19a = await request('/api/villages?state=mh&district=pune&taluka=haveli');
  const r19b = await request('/api/villages?state=mh&district=pune&taluka=hAvElI');
  assert(
    r19a.status === 200 && r19a.body?.taluka === 'Haveli' &&
    r19b.status === 200 && r19b.body?.taluka === 'Haveli' &&
    r19b.body?.villages?.includes('Wagholi') &&
    r19b.body?.villages?.includes('Hadapsar'),
    'TEST_ADV_19', 'Taluka value casing (haveli, hAvElI) normalizes to canonical "Haveli" and returns villages',
    { r19a: r19a.body?.taluka, r19b: r19b.body?.taluka });

  // 20. District alias resolution (e.g. Noida -> Gautam Buddha Nagar (Noida))
  const r20 = await request('/api/talukas?state=UP&district=Noida');
  assert(
    r20.status === 200 && r20.body?.district === 'Gautam Buddha Nagar (Noida)' &&
    Array.isArray(r20.body?.talukas) && r20.body.talukas.includes('Noida'),
    'TEST_ADV_20', 'District alias "Noida" resolves to "Gautam Buddha Nagar (Noida)" with talukas',
    { district: r20.body?.district, talukas: r20.body?.talukas });

  // 21. Query parameter key casing (sTaTe=mH, dIsTrIcT=pUnE)
  // Observation: In standard HTTP/Express query parser, keys are case-sensitive.
  // Passing sTaTe=mH means standard "state" is missing -> Expect 400 Bad Request
  const r21a = await request('/api/districts?sTaTe=mH');
  const r21b = await request('/api/talukas?state=MH&dIsTrIcT=pUnE');
  assert(
    r21a.status === 400 && r21a.body?.error === 'State parameter is required' &&
    r21b.status === 400 && r21b.body?.error === 'District parameter is required',
    'TEST_ADV_21', 'Non-standard query parameter keys (sTaTe, dIsTrIcT) reject cleanly with HTTP 400',
    { r21aStatus: r21a.status, r21bStatus: r21b.status });

  // 22. Alternative query parameter key aliases supported by handler (stateCode, d, t, tehsil, mandal)
  const r22a = await request('/api/districts?stateCode=MH');
  const r22b = await request('/api/talukas?state_code=MH&d=Pune');
  const r22c = await request('/api/villages?state=MH&districtName=Pune&tehsil=Haveli');
  const r22d = await request('/api/villages?state=MH&mandal=Haveli');
  assert(
    r22a.status === 200 && r22a.body?.state === 'MH' &&
    r22b.status === 200 && r22b.body?.district === 'Pune' &&
    r22c.status === 200 && r22c.body?.villages?.includes('Wagholi') &&
    r22d.status === 200 && r22d.body?.villages?.includes('Wagholi'),
    'TEST_ADV_22', 'Documented parameter aliases (stateCode, d, tehsil, mandal) resolve cleanly',
    { r22a: r22a.status, r22b: r22b.status, r22c: r22c.status, r22d: r22d.status });


  // --------------------------------------------------------------------------
  // TIER 3: Path Parameter vs Query Parameter Equivalence
  // --------------------------------------------------------------------------
  console.log(`\n--- TIER 3: Path vs Query Parameter Equivalence ---`);

  // 23. /api/districts/:state vs /api/districts?state=... across all 7 states
  const states = ['MH', 'KA', 'TG', 'UP', 'TN', 'GJ', 'AP'];
  let pathQueryDistrictsMatch = true;
  for (const s of states) {
    const qRes = await request(`/api/districts?state=${s}`);
    const pRes = await request(`/api/districts/${s}`);
    if (qRes.status !== 200 || pRes.status !== 200 || !deepEqual(qRes.body, pRes.body)) {
      pathQueryDistrictsMatch = false;
      console.error(`      Path/Query mismatch for state ${s}:`, { query: qRes.body, path: pRes.body });
    }
  }
  assert(pathQueryDistrictsMatch, 'TEST_ADV_23', 'Path /api/districts/:state and query ?state=XX produce identical JSON for all 7 states');

  // 24. /api/talukas/:state?district=... vs /api/talukas?state=...&district=...
  const talukaPairs = [
    { state: 'MH', district: 'Pune' },
    { state: 'KA', district: 'Bengaluru Urban' },
    { state: 'TG', district: 'Hyderabad' },
    { state: 'UP', district: 'Gautam Buddha Nagar (Noida)' },
    { state: 'TN', district: 'Kanchipuram' },
    { state: 'GJ', district: 'Ahmedabad' },
    { state: 'AP', district: 'Visakhapatnam' }
  ];
  let pathQueryTalukasMatch = true;
  for (const tp of talukaPairs) {
    const qRes = await request(`/api/talukas?state=${tp.state}&district=${encodeURIComponent(tp.district)}`);
    const pRes = await request(`/api/talukas/${tp.state}?district=${encodeURIComponent(tp.district)}`);
    if (qRes.status !== 200 || pRes.status !== 200 || !deepEqual(qRes.body, pRes.body)) {
      pathQueryTalukasMatch = false;
      console.error(`      Path/Query mismatch for talukas ${tp.state}/${tp.district}:`, { query: qRes.body, path: pRes.body });
    }
  }
  assert(pathQueryTalukasMatch, 'TEST_ADV_24', 'Path /api/talukas/:state?district=... and query ?state=... produce identical JSON');

  // 25. /api/villages/:state?district=...&taluka=... vs query variant
  const villagePairs = [
    { state: 'MH', district: 'Pune', taluka: 'Haveli' },
    { state: 'KA', district: 'Bengaluru Urban', taluka: 'Bengaluru South' },
    { state: 'TN', district: 'Kanchipuram', taluka: 'Sriperumbudur' },
    { state: 'TG', district: 'Rangareddy', taluka: 'Serilingampally' },
    { state: 'UP', district: 'Gautam Buddha Nagar (Noida)', taluka: 'Noida' }
  ];
  let pathQueryVillagesMatch = true;
  for (const vp of villagePairs) {
    const qRes = await request(`/api/villages?state=${vp.state}&district=${encodeURIComponent(vp.district)}&taluka=${encodeURIComponent(vp.taluka)}`);
    const pRes = await request(`/api/villages/${vp.state}?district=${encodeURIComponent(vp.district)}&taluka=${encodeURIComponent(vp.taluka)}`);
    if (qRes.status !== 200 || pRes.status !== 200 || !deepEqual(qRes.body, pRes.body)) {
      pathQueryVillagesMatch = false;
      console.error(`      Path/Query mismatch for villages ${vp.state}/${vp.district}/${vp.taluka}:`, { query: qRes.body, path: pRes.body });
    }
  }
  assert(pathQueryVillagesMatch, 'TEST_ADV_25', 'Path /api/villages/:state and query produce identical JSON');


  // --------------------------------------------------------------------------
  // TIER 4: Legacy Backwards-Compatibility Routes
  // --------------------------------------------------------------------------
  console.log(`\n--- TIER 4: Legacy Backwards Compatibility Routes ---`);

  // 26. /api/locations/:state/districts
  let legacyDistrictsMatch = true;
  for (const s of states) {
    const legRes = await request(`/api/locations/${s}/districts`);
    const canRes = await request(`/api/districts?state=${s}`);
    if (legRes.status !== 200 || !deepEqual(legRes.body, canRes.body)) {
      legacyDistrictsMatch = false;
      console.error(`      Legacy districts mismatch for state ${s}:`, { legacy: legRes.body, canonical: canRes.body });
    }
  }
  assert(legacyDistrictsMatch, 'TEST_ADV_26', 'Legacy /api/locations/:state/districts routes 100% parity across all 7 states');

  // 27. /api/locations/:state/talukas?district=...
  let legacyTalukasMatch = true;
  for (const tp of talukaPairs) {
    const legRes = await request(`/api/locations/${tp.state}/talukas?district=${encodeURIComponent(tp.district)}`);
    const canRes = await request(`/api/talukas?state=${tp.state}&district=${encodeURIComponent(tp.district)}`);
    if (legRes.status !== 200 || !deepEqual(legRes.body, canRes.body)) {
      legacyTalukasMatch = false;
      console.error(`      Legacy talukas mismatch for ${tp.state}/${tp.district}:`, { legacy: legRes.body, canonical: canRes.body });
    }
  }
  assert(legacyTalukasMatch, 'TEST_ADV_27', 'Legacy /api/locations/:state/talukas?district=... 100% parity with canonical endpoint');

  // 28. /api/locations/:state/villages?taluka=... (legacy callers did not pass district)
  let legacyVillagesMatch = true;
  for (const vp of villagePairs) {
    const legRes = await request(`/api/locations/${vp.state}/villages?taluka=${encodeURIComponent(vp.taluka)}`);
    const canRes = await request(`/api/villages?state=${vp.state}&taluka=${encodeURIComponent(vp.taluka)}`);
    if (legRes.status !== 200 || !deepEqual(legRes.body, canRes.body)) {
      legacyVillagesMatch = false;
      console.error(`      Legacy villages mismatch for ${vp.state}/${vp.taluka}:`, { legacy: legRes.body, canonical: canRes.body });
    }
  }
  assert(legacyVillagesMatch, 'TEST_ADV_28', 'Legacy /api/locations/:state/villages?taluka=... without district matches canonical resolver');


  // --------------------------------------------------------------------------
  // TIER 5: Security, Injections, Long Payloads & Array/Duplicate Param Resilience
  // --------------------------------------------------------------------------
  console.log(`\n--- TIER 5: Security, Injections & Resilience Stress ---`);

  // 29. Path traversal payloads in state and district
  const r29a = await request('/api/districts?state=..%2F..%2Fetc%2Fpasswd');
  const r29b = await request('/api/districts/..%2F..%2Fetc%2Fpasswd');
  const r29c = await request('/api/talukas?state=MH&district=..%2F..%2Fboot.ini');
  assert(
    r29a.status === 200 && Array.isArray(r29a.body?.districts) && r29a.body.districts.length === 0 &&
    r29c.status === 200 && Array.isArray(r29c.body?.talukas) && r29c.body.talukas.length === 0,
    'TEST_ADV_29', 'Path traversal attempts safely quarantined returning HTTP 200 with empty arrays',
    { r29a: r29a.body, r29c: r29c.body });

  // 30. SQL injection payloads in state, district, taluka
  const r30a = await request(`/api/districts?state=${encodeURIComponent("MH' OR '1'='1")}`);
  const r30b = await request(`/api/talukas?state=MH&district=${encodeURIComponent("Pune'; DROP TABLE parcels;--")}`);
  const r30c = await request(`/api/villages?state=MH&district=Pune&taluka=${encodeURIComponent("Haveli' UNION SELECT 1,2,3--")}`);
  assert(
    r30a.status === 200 && Array.isArray(r30a.body?.districts) && r30a.body.districts.length === 0 &&
    r30b.status === 200 && Array.isArray(r30b.body?.talukas) && r30b.body.talukas.length === 0 &&
    r30c.status === 200 && Array.isArray(r30c.body?.villages) && r30c.body.villages.length === 0,
    'TEST_ADV_30', 'SQL injection strings safely treated as literal strings returning empty arrays',
    { r30a: r30a.body, r30b: r30b.body, r30c: r30c.body });

  // 31. XSS / HTML tag payloads
  const r31 = await request(`/api/talukas?state=MH&district=${encodeURIComponent('<script>alert("xss")</script>')}`);
  assert(
    r31.status === 200 && Array.isArray(r31.body?.talukas) && r31.body.talukas.length === 0,
    'TEST_ADV_31', 'XSS payload in district safely sanitized returning empty talukas array',
    { r31: r31.body });

  // 32. Giant payload stress (10,000 character string)
  const giantStr = 'A'.repeat(10000);
  const r32 = await request(`/api/districts?state=${giantStr}`);
  assert(
    r32.status === 200 && Array.isArray(r32.body?.districts) && r32.body.districts.length === 0,
    'TEST_ADV_32', '10,000-character parameter safely handled without memory spike or hang',
    { status: r32.status, durationMs: r32.durationMs });

  // 33. Non-ASCII, Unicode and Emojis
  const r33a = await request(`/api/districts?state=${encodeURIComponent('महाराष्ट्र')}`);
  const r33b = await request(`/api/talukas?state=MH&district=${encodeURIComponent('पुणे')}`);
  const r33c = await request(`/api/districts?state=${encodeURIComponent('🇮🇳')}`);
  assert(
    r33a.status === 200 && r33b.status === 200 && r33c.status === 200,
    'TEST_ADV_33', 'Unicode Devanagari and emoji queries handled gracefully without crashing',
    { r33a: r33a.status, r33b: r33b.status, r33c: r33c.status });

  // 34. ARRAY / DUPLICATE QUERY PARAMETER BUG ANALYSIS
  // In Express, ?state[]=MH or ?state=MH&state=KA parses as string[].
  // rawState.trim() throws TypeError: rawState.trim is not a function.
  // We empirically evaluate this vulnerability and record exact server behavior.
  const r34a = await request('/api/districts?state[]=MH');
  const r34b = await request('/api/districts?state=MH&state=KA');
  const r34c = await request('/api/talukas?state=MH&district[]=Pune');
  const r34d = await request('/api/villages?state=MH&district=Pune&taluka[]=Haveli');

  console.log(`      [Adversarial Analysis] Array param ?state[]=MH -> HTTP ${r34a.status}: ${JSON.stringify(r34a.body)}`);
  console.log(`      [Adversarial Analysis] Duplicate param ?state=MH&state=KA -> HTTP ${r34b.status}: ${JSON.stringify(r34b.body)}`);
  console.log(`      [Adversarial Analysis] Array param ?district[]=Pune -> HTTP ${r34c.status}: ${JSON.stringify(r34c.body)}`);
  console.log(`      [Adversarial Analysis] Array param ?taluka[]=Haveli -> HTTP ${r34d.status}: ${JSON.stringify(r34d.body)}`);

  // Document vulnerability as a confirmed finding:
  const isVulnerableToArrayParams = (r34a.status === 500 && r34a.body?.error?.includes('trim is not a function'));
  assert(
    !isVulnerableToArrayParams,
    'TEST_ADV_34',
    'Server should sanitize array/duplicate parameters (?state[]=MH, ?state=A&state=B) with HTTP 400 instead of HTTP 500 Uncaught TypeError',
    {
      observedStatus: r34a.status,
      observedError: r34a.body?.error,
      vulnerability: 'TypeError: rawState.trim is not a function when query parameter is parsed as array or object'
    }
  );


  // --------------------------------------------------------------------------
  // TIER 6: Latency Benchmark & Concurrent Burst Stress Testing
  // --------------------------------------------------------------------------
  console.log(`\n--- TIER 6: Latency Benchmark & High-Concurrency Burst ---`);

  // 35. 100-request sequential latency benchmark
  const latencies = [];
  for (let i = 0; i < 100; i++) {
    const ep = (i % 3 === 0)
      ? '/api/districts?state=MH'
      : (i % 3 === 1)
        ? '/api/talukas?state=MH&district=Pune'
        : '/api/villages?state=MH&district=Pune&taluka=Haveli';
    const res = await request(ep);
    latencies.push(res.durationMs);
  }
  latencies.sort((a, b) => a - b);
  const minLat = latencies[0];
  const maxLat = latencies[latencies.length - 1];
  const meanLat = (latencies.reduce((sum, v) => sum + v, 0) / latencies.length).toFixed(2);
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  console.log(`      [Latency Metrics] 100 Requests: min=${minLat}ms, mean=${meanLat}ms, p50=${p50}ms, p95=${p95}ms, p99=${p99}ms, max=${maxLat}ms`);
  assert(
    p95 <= 20,
    'TEST_ADV_35',
    `Sequential latency benchmark sub-20ms requirement (p95=${p95}ms, mean=${meanLat}ms)`,
    { minLat, meanLat, p50, p95, p99, maxLat }
  );

  // 36. 50-request concurrent burst test
  const burstEndpoints = [
    '/api/districts?state=MH',
    '/api/districts?state=KA',
    '/api/districts?state=TG',
    '/api/districts?state=UP',
    '/api/districts?state=TN',
    '/api/talukas?state=MH&district=Pune',
    '/api/talukas?state=TN&district=Kanchipuram',
    '/api/talukas?state=KA&district=Bengaluru Urban',
    '/api/villages?state=MH&district=Pune&taluka=Haveli',
    '/api/villages?state=TN&district=Kanchipuram&taluka=Sriperumbudur'
  ];

  const burstPromises = [];
  const burstStart = Date.now();
  for (let i = 0; i < 50; i++) {
    const ep = burstEndpoints[i % burstEndpoints.length];
    burstPromises.push(request(ep));
  }
  const burstResults = await Promise.all(burstPromises);
  const totalBurstTime = Date.now() - burstStart;
  const burstFailures = burstResults.filter(r => r.status !== 200);

  console.log(`      [Burst Metrics] 50 concurrent requests executed in ${totalBurstTime}ms (${burstFailures.length} failed)`);
  assert(
    burstFailures.length === 0 && totalBurstTime < 500,
    'TEST_ADV_36',
    `50 concurrent requests handled with 0 failures under 500ms (took ${totalBurstTime}ms)`,
    { totalBurstTime, failedCount: burstFailures.length }
  );

  // 37. Server health and liveness post-stress
  const postHealth = await request('/api/states');
  assert(
    postHealth.status === 200 && Array.isArray(postHealth.body?.states) && postHealth.body.states.length >= 10,
    'TEST_ADV_37',
    'Server health & /api/states returns HTTP 200 with full state list following severe stress tests',
    { status: postHealth.status, statesCount: postHealth.body?.states?.length }
  );

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log(`\n================================================================================`);
  console.log(`📊 ADVERSARIAL CHALLENGER RESULTS:`);
  console.log(`   Total Tests:  ${results.total}`);
  console.log(`   Passed:       ${results.passed}`);
  console.log(`   Failed:       ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`================================================================================\n`);

  if (results.findings.length > 0) {
    console.log(`⚠️  Vulnerabilities & Findings Detected:`);
    for (const f of results.findings) {
      console.log(`   - [${f.testId}] ${f.description}`);
      console.log(`     Details: ${JSON.stringify(f.details)}`);
    }
  }

  return results;
}

if (require.main === module) {
  runAdversarialSuite()
    .then((res) => {
      // Exit with 0 so caller gets output, or exit with number of failures
      process.exit(res.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(2);
    });
}

module.exports = { runAdversarialSuite };
