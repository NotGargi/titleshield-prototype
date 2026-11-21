/**
 * Challenger R4 Re-verification: Deep Empirical Adversarial Probe
 * 
 * Target: Verify 3 specific vulnerability remediations in jobWorkerPool.ts:
 * 1. Emulator synthetic data laundering -> Scraper synthetic fallbacks never claim isLive: true or LIVE_PORTAL
 * 2. Timeout failure simulation -> x-simulate-failure: timeout transitions to DEGRADED_FALLBACK with UPSTREAM_PORTAL_TIMEOUT
 * 3. Cross-jurisdiction fallback contamination -> Non-MH states (KA, TN, UP, etc.) quarantined to DLQ as DEGRADATION_FALLBACK_UNAVAILABLE
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const API_BASE = 'http://localhost:4000/api';
const DB_PATH = path.resolve(__dirname, '..', 'server', 'data', 'landeed.db');
const Database = require(path.resolve(__dirname, '..', 'server', 'node_modules', 'better-sqlite3'));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTerminalState(jobId, maxWaitMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${API_BASE}/records/jobs/${jobId}`);
    if (res.status === 200) {
      const data = await res.json();
      if (['COMPLETED', 'DEGRADED_FALLBACK', 'FAILED'].includes(data.status)) {
        return data;
      }
    }
    await sleep(150);
  }
  throw new Error(`Timeout waiting for job ${jobId} to reach terminal state`);
}

async function runDeepVerification() {
  console.log('\n========================================================================');
  console.log('🔬 CHALLENGER R4 RE-VERIFY: EMPIRICAL ADVERSARIAL STRESS PROBE');
  console.log('========================================================================\n');

  const db = new Database(DB_PATH, { readonly: true });
  let passed = 0;
  let failed = 0;
  const errors = [];

  function pass(name, details) {
    passed++;
    console.log(`  ✅ [PASS] ${name}: ${details}`);
  }

  function fail(name, err) {
    failed++;
    const msg = err.message || String(err);
    errors.push({ name, error: msg });
    console.error(`  ❌ [FAIL] ${name}: ${msg}`);
  }

  // -------------------------------------------------------------------------
  // PROBE 1: Anti-Masquerading & Synthetic Emulator Laundering Check
  // -------------------------------------------------------------------------
  console.log('--- PROBE 1: Synthetic Emulator Data Laundering Prevention ---');
  try {
    // Submit a query with arbitrary fictitious state and parcel that must hit TinyFish synthetic emulator
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'ZZ',
        docType: 'UNKNOWN_RECORD',
        district: 'FictionalDistrict',
        taluka: 'FictionalTaluka',
        village: 'FictionalVillage',
        surveyNo: 'ZZ-99999-EMULATOR-TEST'
      })
    });
    assert.strictEqual(res.status, 202, 'Must return HTTP 202');
    const { jobId } = await res.json();
    const job = await waitForTerminalState(jobId);

    // Verify it NEVER claims isLive=true or dataProvenance='LIVE_PORTAL'
    assert.notStrictEqual(job.dataProvenance, 'LIVE_PORTAL', 'Provenance must NOT be LIVE_PORTAL');
    assert.strictEqual(job.isDegraded, true, 'isDegraded must be true');
    if (job.result) {
      assert.strictEqual(job.result.isLive, false, 'result.isLive must be false');
      assert.strictEqual(job.result.isDegraded, true, 'result.isDegraded must be true');
      assert.notStrictEqual(job.result.dataProvenance, 'LIVE_PORTAL', 'result.dataProvenance must not be LIVE_PORTAL');
    }

    // Direct DB verification
    const dbRow = db.prepare('SELECT * FROM query_jobs WHERE id = ?').get(jobId);
    assert.ok(dbRow, 'DB row must exist');
    assert.strictEqual(dbRow.is_degraded, 1, 'DB is_degraded must be 1');
    assert.notStrictEqual(dbRow.data_provenance, 'LIVE_PORTAL', 'DB data_provenance must not be LIVE_PORTAL');

    pass('P1_SYNTHETIC_LAUNDERING_PREVENTED', `Fictitious parcel status=${job.status}, isDegraded=${job.isDegraded}, provenance=${job.dataProvenance}`);
  } catch (e) {
    fail('P1_SYNTHETIC_LAUNDERING_PREVENTED', e);
  }

  // -------------------------------------------------------------------------
  // PROBE 2: Timeout Failure Simulation on Benchmark Survey
  // -------------------------------------------------------------------------
  console.log('\n--- PROBE 2: Simulated Timeout on Benchmark Survey (142/2A) ---');
  try {
    // Benchmark survey 142/2A with x-simulate-failure: timeout
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simulate-failure': 'timeout'
      },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A'
      })
    });
    assert.strictEqual(res.status, 202, 'Must return HTTP 202');
    const { jobId } = await res.json();
    const job = await waitForTerminalState(jobId);

    // Verify it degraded to UPSTREAM_PORTAL_TIMEOUT
    assert.strictEqual(job.status, 'DEGRADED_FALLBACK', `Expected DEGRADED_FALLBACK, got ${job.status}`);
    assert.strictEqual(job.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(job.degradationReason, 'UPSTREAM_PORTAL_TIMEOUT', `Expected UPSTREAM_PORTAL_TIMEOUT, got ${job.degradationReason}`);
    assert.strictEqual(job.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', 'Provenance must be VERIFIED_PRESEEDED_CACHE');

    if (job.result) {
      assert.strictEqual(job.result.isLive, false, 'result.isLive must be false');
      assert.strictEqual(job.result.isDegraded, true, 'result.isDegraded must be true');
      assert.strictEqual(job.result.degradationReason, 'UPSTREAM_PORTAL_TIMEOUT');
    }

    // Direct DB check
    const dbRow = db.prepare('SELECT * FROM query_jobs WHERE id = ?').get(jobId);
    assert.strictEqual(dbRow.status, 'DEGRADED_FALLBACK');
    assert.strictEqual(dbRow.degradation_reason, 'UPSTREAM_PORTAL_TIMEOUT');
    assert.strictEqual(dbRow.is_degraded, 1);

    pass('P2_TIMEOUT_DEGRADATION_VERIFIED', `Timeout successfully resolved to DEGRADED_FALLBACK with reason=${job.degradationReason}`);
  } catch (e) {
    fail('P2_TIMEOUT_DEGRADATION_VERIFIED', e);
  }

  // -------------------------------------------------------------------------
  // PROBE 3: Cross-Jurisdiction Fallback Contamination & DLQ Quarantine
  // -------------------------------------------------------------------------
  console.log('\n--- PROBE 3: Cross-Jurisdiction Fallback Contamination & DLQ Quarantine ---');
  const nonMhStates = [
    { state: 'KA', docType: 'RTC', district: 'Bengaluru Urban', surveyNo: 'KA-SURV-101' },
    { state: 'TN', docType: 'PATTA', district: 'Chennai', surveyNo: 'TN-SURV-202' },
    { state: 'UP', docType: 'KHATAUNI', district: 'Lucknow', surveyNo: 'UP-SURV-303' }
  ];

  for (const s of nonMhStates) {
    try {
      const res = await fetch(`${API_BASE}/records/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulate-failure': 'downstream_402'
        },
        body: JSON.stringify({
          state: s.state,
          docType: s.docType,
          district: s.district,
          taluka: 'TestTaluka',
          village: 'TestVillage',
          surveyNo: s.surveyNo
        })
      });
      assert.strictEqual(res.status, 202);
      const { jobId } = await res.json();
      const job = await waitForTerminalState(jobId);

      // It must NOT receive Pune Wagholi or any MH record
      assert.notStrictEqual(job.recordId, 'rec-mh-pune-ferfar-4821', `State ${s.state} must NOT receive rec-mh-pune-ferfar-4821`);
      assert.notStrictEqual(job.recordId, 'rec-mh-pune-deed-4821', `State ${s.state} must NOT receive rec-mh-pune-deed-4821`);
      assert.notStrictEqual(job.recordId, 'rec-mh-bmc-tax-hw130562', `State ${s.state} must NOT receive BMC tax record`);

      // It must route to DLQ
      assert.strictEqual(job.status, 'FAILED', `State ${s.state} with no benchmark must transition to FAILED/DLQ, got ${job.status}`);
      assert.strictEqual(job.errorCode, 'DEGRADATION_FALLBACK_UNAVAILABLE', `Expected DEGRADATION_FALLBACK_UNAVAILABLE, got ${job.errorCode}`);

      // Verify in query_job_dlq SQLite table
      const dlqRow = db.prepare('SELECT * FROM query_job_dlq WHERE job_id = ?').get(jobId);
      assert.ok(dlqRow, `DLQ entry must exist for job ${jobId}`);
      assert.strictEqual(dlqRow.state, s.state, `DLQ state must match ${s.state}`);
      assert.strictEqual(dlqRow.failure_reason, 'DEGRADATION_FALLBACK_UNAVAILABLE');
      assert.strictEqual(dlqRow.last_http_status, 404, 'DLQ last_http_status must be 404');

      pass(`P3_JURISDICTION_ISOLATION_${s.state}`, `State ${s.state} quarantined to DLQ (reason=${dlqRow.failure_reason}, last_http_status=404), zero cross-contamination`);
    } catch (e) {
      fail(`P3_JURISDICTION_ISOLATION_${s.state}`, e);
    }
  }

  // -------------------------------------------------------------------------
  // PROBE 4: Cross-Jurisdiction Timeout Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- PROBE 4: Cross-Jurisdiction Timeout Quarantine ---');
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simulate-failure': 'timeout'
      },
      body: JSON.stringify({
        state: 'KA',
        docType: 'RTC',
        district: 'Mysuru',
        taluka: 'Mysuru',
        village: 'Chamundi',
        surveyNo: 'KA-MYS-777'
      })
    });
    assert.strictEqual(res.status, 202);
    const { jobId } = await res.json();
    const job = await waitForTerminalState(jobId);

    // Timeout on non-MH state: handleDegradation cannot find benchmark, so routes to DLQ
    assert.strictEqual(job.status, 'FAILED', `Expected status FAILED, got ${job.status}`);
    assert.strictEqual(job.errorCode, 'DEGRADATION_FALLBACK_UNAVAILABLE');

    const dlqRow = db.prepare('SELECT * FROM query_job_dlq WHERE job_id = ?').get(jobId);
    assert.ok(dlqRow, 'DLQ row must exist');
    assert.strictEqual(dlqRow.state, 'KA');
    assert.strictEqual(dlqRow.failure_reason, 'DEGRADATION_FALLBACK_UNAVAILABLE');

    pass('P4_CROSS_JURISDICTION_TIMEOUT_DLQ', `Non-MH state timeout properly quarantined to DLQ without MH fallback`);
  } catch (e) {
    fail('P4_CROSS_JURISDICTION_TIMEOUT_DLQ', e);
  }

  db.close();

  console.log('\n========================================================================');
  console.log(`PROBE SUMMARY: ${passed} Passed | ${failed} Failed out of ${passed + failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error(`❌ DEEP EMPIRICAL ADVERSARIAL PROBES FAILED with ${failed} errors:`);
    errors.forEach(e => console.error(`  - ${e.name}: ${e.error}`));
    process.exit(1);
  } else {
    console.log('🏆 ALL DEEP EMPIRICAL ADVERSARIAL PROBES PASSED CLEANLY.');
    process.exit(0);
  }
}

runDeepVerification().catch(err => {
  console.error('Fatal probe execution error:', err);
  process.exit(1);
});
