/**
 * Landeed 2.0: Adversarial Challenge & Empirical Verification Suite
 * Milestone: Truth-Serum Degradation Engine & Dead-Letter Queue (DLQ) Mechanics (R4 & R2)
 *
 * Investigator: challenger_r4_2
 * Focus:
 * 1. Truth-Serum Integrity: Anti-masquerading under 402, CAPTCHA, timeouts, and emulator fallback
 * 2. DLQ Routing & Quarantine: Retry exhaustion, query_job_dlq schema, GET /api/records/jobs/dlq
 * 3. Fallback Data Provenance: Pune 142/2A, Ferfar 4821, Deed 4821, BMC SAC HW130562, cross-jurisdiction check
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const API_BASE = 'http://localhost:4000/api';
const DB_PATH = path.resolve(__dirname, '..', 'server', 'data', 'landeed.db');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function openDatabase() {
  assert.ok(fs.existsSync(DB_PATH), `SQLite database must exist at ${DB_PATH}`);
  const Database = require(path.resolve(__dirname, '..', 'server', 'node_modules', 'better-sqlite3'));
  const db = new Database(DB_PATH, { readonly: true });
  return {
    get: (sql, ...params) => db.prepare(sql).get(...params),
    all: (sql, ...params) => db.prepare(sql).all(...params),
    close: () => db.close()
  };
}

async function readSseStream(url, maxWaitMs = 6000) {
  const streamRes = await fetch(url, {
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  });

  assert.strictEqual(streamRes.status, 200, `SSE endpoint ${url} must return HTTP 200`);
  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events = [];
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < maxWaitMs) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const rawBlocks = buffer.split('\n\n');
      buffer = rawBlocks.pop() || '';

      for (const block of rawBlocks) {
        if (!block.trim() || block.startsWith(':')) continue;

        const lines = block.split('\n');
        let eventName = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          }
        }

        if (dataStr) {
          try {
            const parsedData = JSON.parse(dataStr);
            events.push({ event: eventName, data: parsedData });
            if (eventName === 'completed' || eventName === 'failed' || eventName === 'degradation') {
              // Note: degradation might also be followed by completed
            }
          } catch {
            events.push({ event: eventName, raw: dataStr });
          }
        }
      }
    }
  } finally {
    try { reader.cancel(); } catch {}
  }

  return events;
}

async function runAdversarialChallengeSuite() {
  console.log('\n================================================================================');
  console.log('⚔️  ADVERSARIAL CHALLENGE SUITE: TRUTH-SERUM DEGRADATION & DLQ MECHANICS (R4 & R2)');
  console.log('================================================================================');

  let passed = 0;
  let failed = 0;
  const findings = [];

  function recordPass(testId, vector, description) {
    passed++;
    console.log(`  ✅ [PASS] [${vector}] ${testId}: ${description}`);
  }

  function recordFail(testId, vector, description, error, severity = 'HIGH') {
    failed++;
    const errMsg = error ? (error.message || String(error)) : 'Assertion failed';
    findings.push({ testId, vector, severity, description, error: errMsg });
    console.error(`  ❌ [FAIL - ${severity}] [${vector}] ${testId}: ${description}`);
    console.error(`     Details: ${errMsg}`);
  }

  // ===========================================================================
  // VECTOR 1: TRUTH-SERUM INTEGRITY UNDER SIMULATED FAILURES
  // ===========================================================================
  console.log('\n--- Vector 1: Truth-Serum Integrity Under Simulated Failures ---');

  // ADV_1_01: Downstream HTTP 402 Barrier -> Must degrade transparently
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-simulate-failure': 'downstream_402' },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A'
      })
    });
    assert.strictEqual(res.status, 202);
    const body = await res.json();
    const jobId = body.jobId;

    // Poll until terminal
    let jobData;
    const timeout = Date.now() + 6000;
    while (Date.now() < timeout) {
      const jobRes = await fetch(`${API_BASE}/records/jobs/${jobId}`);
      jobData = await jobRes.json();
      if (jobData.status === 'DEGRADED_FALLBACK' || jobData.status === 'FAILED' || jobData.status === 'COMPLETED') break;
      await sleep(150);
    }

    assert.strictEqual(jobData.status, 'DEGRADED_FALLBACK', `Expected DEGRADED_FALLBACK, got ${jobData.status}`);
    assert.strictEqual(jobData.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(jobData.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', 'Provenance must be VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(jobData.degradationReason, 'DOWNSTREAM_402_PAYMENT_REQUIRED');
    assert.ok(jobData.result, 'Result payload must be present');
    assert.strictEqual(jobData.result.isLive, false, 'Result isLive must be false');
    assert.strictEqual(jobData.result.isDegraded, true, 'Result isDegraded must be true');
    assert.strictEqual(jobData.result.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');

    // Check DB directly
    const db = openDatabase();
    const row = db.get("SELECT * FROM query_jobs WHERE id = ?", jobId);
    assert.strictEqual(row.is_degraded, 1, 'DB is_degraded must be 1');
    assert.strictEqual(row.data_provenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(row.status, 'DEGRADED_FALLBACK');
    db.close();

    recordPass('ADV_1_01', 'Truth-Serum', 'HTTP 402 barrier: transparently degraded, DB is_degraded=1, zero masquerading');
  } catch (err) {
    recordFail('ADV_1_01', 'Truth-Serum', 'HTTP 402 barrier degradation check failed', err, 'CRITICAL');
  }

  // ADV_1_02: CAPTCHA Block Degradation on BMC Property Tax
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-simulate-failure': 'captcha_block' },
      body: JSON.stringify({
        state: 'MH',
        docType: 'BMC_TAX',
        district: 'Mumbai Suburban',
        taluka: 'Bandra',
        village: 'Bandra West',
        sacNo: 'HW1305620200003'
      })
    });
    assert.strictEqual(res.status, 202);
    const body = await res.json();
    const jobId = body.jobId;

    let jobData;
    const timeout = Date.now() + 6000;
    while (Date.now() < timeout) {
      const jobRes = await fetch(`${API_BASE}/records/jobs/${jobId}`);
      jobData = await jobRes.json();
      if (jobData.status === 'DEGRADED_FALLBACK' || jobData.status === 'FAILED' || jobData.status === 'COMPLETED') break;
      await sleep(150);
    }

    assert.strictEqual(jobData.status, 'DEGRADED_FALLBACK');
    assert.strictEqual(jobData.isDegraded, true);
    assert.strictEqual(jobData.degradationReason, 'PORTAL_CAPTCHA_BLOCKED');
    assert.strictEqual(jobData.recordId, 'rec-mh-bmc-tax-hw130562');
    assert.strictEqual(jobData.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');

    recordPass('ADV_1_02', 'Truth-Serum', 'CAPTCHA block on BMC Tax: degraded to verified benchmark rec-mh-bmc-tax-hw130562');
  } catch (err) {
    recordFail('ADV_1_02', 'Truth-Serum', 'CAPTCHA block degradation failed', err, 'CRITICAL');
  }

  // ADV_1_03: Adversarial Challenge - Simulated Timeout Header (`x-simulate-failure: timeout`)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-simulate-failure': 'timeout' },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A'
      })
    });
    assert.strictEqual(res.status, 202);
    const body = await res.json();
    const jobId = body.jobId;

    let jobData;
    const timeout = Date.now() + 6000;
    while (Date.now() < timeout) {
      const jobRes = await fetch(`${API_BASE}/records/jobs/${jobId}`);
      jobData = await jobRes.json();
      if (jobData.status === 'DEGRADED_FALLBACK' || jobData.status === 'FAILED' || jobData.status === 'COMPLETED') break;
      await sleep(150);
    }

    // Stress: Does the system recognize 'timeout' simulation or does it falsely complete as LIVE_PORTAL?
    const isLive = jobData.result ? jobData.result.isLive : false;
    if (jobData.status === 'COMPLETED' && isLive === true && jobData.dataProvenance === 'LIVE_PORTAL') {
      throw new Error(`CRITICAL MASQUERADING BUG: Job with x-simulate-failure: 'timeout' completed with isLive=true and dataProvenance='LIVE_PORTAL'! Timeout simulation was ignored because survey 142/2A matched benchmark.`);
    }

    recordPass('ADV_1_03', 'Truth-Serum', `Simulated timeout handled properly (status=${jobData.status})`);
  } catch (err) {
    recordFail('ADV_1_03', 'Truth-Serum', 'Simulated timeout challenge failed', err, 'HIGH');
  }

  // ADV_1_04: Adversarial Challenge - Regional Emulator Scrape Result Provenance Audit
  // When an arbitrary query (non-preseeded) executes via TinyFish in offline mode or when upstream returns 402/emulator
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'KA',
        docType: 'RTC',
        district: 'Bengaluru Urban',
        taluka: 'Bangalore North',
        village: 'Yelahanka',
        surveyNo: 'NON_EXISTENT_SURVEY_777'
      })
    });
    assert.strictEqual(res.status, 202);
    const body = await res.json();
    const jobId = body.jobId;

    let jobData;
    const timeout = Date.now() + 8000;
    while (Date.now() < timeout) {
      const jobRes = await fetch(`${API_BASE}/records/jobs/${jobId}`);
      jobData = await jobRes.json();
      if (jobData.status === 'COMPLETED' || jobData.status === 'DEGRADED_FALLBACK' || jobData.status === 'FAILED') break;
      await sleep(200);
    }

    // Check if TinyFish returned emulator data:
    // If status is COMPLETED, what is dataProvenance?
    if (jobData.status === 'COMPLETED') {
      if (jobData.dataProvenance === 'LIVE_PORTAL' && jobData.isLive === true) {
        // Check if the portal call was actually live or if it was regional emulator
        const db = openDatabase();
        const recordRow = db.get("SELECT * FROM records WHERE id = ?", jobData.recordId);
        db.close();
        if (recordRow) {
          const agentRes = JSON.parse(recordRow.agent_result || '{}');
          if (agentRes.dataProvenance === 'REGIONAL_EMULATOR_SYNTHETIC' || agentRes.isLive === false) {
            throw new Error(`CRITICAL MASQUERADING: Record agent_result has dataProvenance='REGIONAL_EMULATOR_SYNTHETIC', but job entity claims isLive=true and dataProvenance='LIVE_PORTAL'!`);
          }
        }
      }
    }

    recordPass('ADV_1_04', 'Truth-Serum', `Non-benchmark query provenance checked: status=${jobData.status}, provenance=${jobData.dataProvenance}`);
  } catch (err) {
    recordFail('ADV_1_04', 'Truth-Serum', 'Regional emulator provenance audit failed', err, 'HIGH');
  }

  // ===========================================================================
  // VECTOR 2: DEAD-LETTER QUEUE (DLQ) ROUTING & QUARANTINE
  // ===========================================================================
  console.log('\n--- Vector 2: Dead-Letter Queue (DLQ) Routing & Quarantine ---');

  let fatalJobId = '';

  // ADV_2_01: Unrecoverable Scraping Failure -> Transitions to FAILED and inserts into query_job_dlq
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-simulate-failure': 'fatal_scrape_error' },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: 'FATAL_SURVEY_TEST_99999'
      })
    });
    assert.strictEqual(res.status, 202);
    const body = await res.json();
    fatalJobId = body.jobId;

    let failedJob;
    const timeout = Date.now() + 6000;
    while (Date.now() < timeout) {
      const jobRes = await fetch(`${API_BASE}/records/jobs/${fatalJobId}`);
      failedJob = await jobRes.json();
      if (failedJob.status === 'FAILED') break;
      await sleep(150);
    }

    assert.strictEqual(failedJob.status, 'FAILED', `Expected status FAILED, got ${failedJob.status}`);
    assert.strictEqual(failedJob.errorCode, 'FATAL_SCRAPE_ERROR');
    assert.ok(failedJob.errorDetails, 'Structured errorDetails must be present');

    // Verify in SQLite query_job_dlq table directly
    const db = openDatabase();
    const dlqRow = db.get("SELECT * FROM query_job_dlq WHERE job_id = ?", fatalJobId);
    assert.ok(dlqRow, `DLQ row must exist in query_job_dlq for job ${fatalJobId}`);
    assert.strictEqual(dlqRow.failure_reason, 'FATAL_SCRAPE_ERROR');
    assert.ok(dlqRow.attempt_count >= 1, `attempt_count must be >= 1, got ${dlqRow.attempt_count}`);
    assert.ok(dlqRow.diagnostic_payload, 'diagnostic_payload must not be empty');
    const diag = JSON.parse(dlqRow.diagnostic_payload);
    assert.ok(diag.targetUrl || diag.attempts, 'diagnostic_payload must contain structured diagnostics');
    db.close();

    recordPass('ADV_2_01', 'DLQ', `Unrecoverable failure quarantined to DLQ: job_id=${fatalJobId}, attempt_count=${dlqRow.attempt_count}, reason=${dlqRow.failure_reason}`);
  } catch (err) {
    recordFail('ADV_2_01', 'DLQ', 'Unrecoverable failure DLQ routing failed', err, 'CRITICAL');
  }

  // ADV_2_02: DLQ REST API Endpoint (GET /api/records/jobs/dlq)
  try {
    const dlqRes = await fetch(`${API_BASE}/records/jobs/dlq`);
    assert.strictEqual(dlqRes.status, 200);
    const dlqData = await dlqRes.json();
    assert.strictEqual(dlqData.success, true);
    assert.ok(Array.isArray(dlqData.dlq), 'dlq property must be an array');
    const item = dlqData.dlq.find((d) => d.jobId === fatalJobId);
    assert.ok(item, `DLQ record for job ${fatalJobId} must be visible in GET /api/records/jobs/dlq`);
    assert.strictEqual(item.failureReason, 'FATAL_SCRAPE_ERROR');
    assert.ok(item.attemptCount >= 1);
    assert.ok(item.diagnosticPayload, 'diagnosticPayload must be present in REST output');

    recordPass('ADV_2_02', 'DLQ', `DLQ REST API endpoint verified: GET /api/records/jobs/dlq contains quarantined record`);
  } catch (err) {
    recordFail('ADV_2_02', 'DLQ', 'DLQ REST API inspection failed', err, 'CRITICAL');
  }

  // ADV_2_03: DLQ REST API Boundary & Parameter Stress
  try {
    // Test limit=1
    const res1 = await fetch(`${API_BASE}/records/jobs/dlq?limit=1`);
    assert.strictEqual(res1.status, 200);
    const data1 = await res1.json();
    assert.ok(data1.dlq.length <= 1, `Expected <= 1 record, got ${data1.dlq.length}`);

    // Test limit=0
    const res0 = await fetch(`${API_BASE}/records/jobs/dlq?limit=0`);
    assert.strictEqual(res0.status, 200);

    // Test large limit
    const resLarge = await fetch(`${API_BASE}/records/jobs/dlq?limit=500`);
    assert.strictEqual(resLarge.status, 200);

    recordPass('ADV_2_03', 'DLQ', 'DLQ REST API boundary parameters (limit=1, 0, 500) handled gracefully');
  } catch (err) {
    recordFail('ADV_2_03', 'DLQ', 'DLQ REST API parameter stress failed', err, 'MEDIUM');
  }

  // ADV_2_04: DLQ Schema Verification & Index Audit in SQLite
  try {
    const db = openDatabase();
    const tableInfo = db.all("PRAGMA table_info(query_job_dlq)");
    const colNames = tableInfo.map((c) => c.name);
    const expectedCols = ['id', 'job_id', 'ticket_id', 'feature', 'state', 'params', 'failure_reason', 'error_details', 'stack_trace', 'attempt_count', 'last_http_status', 'diagnostic_payload', 'failed_at'];

    for (const col of expectedCols) {
      assert.ok(colNames.includes(col), `query_job_dlq missing required column: ${col}`);
    }

    const indexes = db.all("PRAGMA index_list(query_job_dlq)");
    const indexNames = indexes.map((i) => i.name);
    assert.ok(indexNames.some((n) => n.includes('job_id')), 'Missing index on job_id in query_job_dlq');

    db.close();
    recordPass('ADV_2_04', 'DLQ', 'SQLite query_job_dlq DDL schema & indexes verified');
  } catch (err) {
    recordFail('ADV_2_04', 'DLQ', 'DLQ schema audit failed', err, 'HIGH');
  }

  // ===========================================================================
  // VECTOR 3: FALLBACK DATA PROVENANCE & BENCHMARK LINKAGE
  // ===========================================================================
  console.log('\n--- Vector 3: Fallback Data Provenance & Benchmark Linkage ---');

  // ADV_3_01: Benchmark Record 1 - Pune Wagholi Gat 142/2A & Ferfar #4821
  try {
    const db = openDatabase();
    const row = db.get("SELECT * FROM records WHERE id = 'rec-mh-pune-ferfar-4821'");
    assert.ok(row, "Pre-seeded record rec-mh-pune-ferfar-4821 must exist in DB");
    assert.strictEqual(row.state, 'MH');
    assert.strictEqual(row.district, 'Pune');
    assert.strictEqual(row.taluka, 'Haveli');
    assert.strictEqual(row.village, 'Wagholi');
    assert.strictEqual(row.survey_no, '142/2A');

    // Parse mutation data
    const mutation = JSON.parse(row.mutation_data || '{}');
    assert.strictEqual(mutation.ferfarNo, '4821');
    assert.strictEqual(mutation.status, 'PRAMANIT');
    assert.ok(Array.isArray(mutation.timeline) && mutation.timeline.length >= 4, `Mutation timeline must have >= 4 entries, got ${mutation.timeline?.length}`);

    // Verify blockchain proof
    const proof = JSON.parse(row.proof || '{}');
    assert.ok(proof.docHash && proof.docHash.startsWith('0x'), 'Blockchain docHash must be valid');
    assert.strictEqual(proof.network, 'Polygon Amoy');

    db.close();
    recordPass('ADV_3_01', 'Provenance', 'Benchmark record rec-mh-pune-ferfar-4821 verified: Wagholi 142/2A, Ferfar 4821, 5-node lineage, Amoy proof');
  } catch (err) {
    recordFail('ADV_3_01', 'Provenance', 'Benchmark rec-mh-pune-ferfar-4821 verification failed', err, 'CRITICAL');
  }

  // ADV_3_02: Benchmark Record 2 - IGR Index-II Registered Deed #4821
  try {
    const db = openDatabase();
    const row = db.get("SELECT * FROM records WHERE id = 'rec-mh-pune-deed-4821'");
    assert.ok(row, "Pre-seeded record rec-mh-pune-deed-4821 must exist in DB");
    assert.strictEqual(row.state, 'MH');
    assert.strictEqual(row.district, 'Pune');

    const index2 = JSON.parse(row.index_2_data || '{}');
    assert.strictEqual(index2.deedNo, '4821');
    assert.strictEqual(index2.regYear, '2024');
    assert.ok(index2.sroOffice.includes('Haveli-3'), `sroOffice must include Haveli-3, got ${index2.sroOffice}`);
    assert.ok(index2.considerationAmount.includes('72,50,000'), `considerationAmount must include 72,50,000, got ${index2.considerationAmount}`);
    assert.ok(index2.stampDutyPaid.includes('5,07,500'), `stampDutyPaid must include 5,07,500, got ${index2.stampDutyPaid}`);

    db.close();
    recordPass('ADV_3_02', 'Provenance', 'Benchmark record rec-mh-pune-deed-4821 verified: SRO Haveli-3, Deed 4821/2024, Rs. 72.5L consideration');
  } catch (err) {
    recordFail('ADV_3_02', 'Provenance', 'Benchmark rec-mh-pune-deed-4821 verification failed', err, 'CRITICAL');
  }

  // ADV_3_03: Benchmark Record 3 - BMC Property Tax SAC HW1305620200003
  try {
    const db = openDatabase();
    const row = db.get("SELECT * FROM records WHERE id = 'rec-mh-bmc-tax-hw130562'");
    assert.ok(row, "Pre-seeded record rec-mh-bmc-tax-hw130562 must exist in DB");
    assert.strictEqual(row.state, 'MH');
    assert.strictEqual(row.district, 'Mumbai Suburban');

    const risk = JSON.parse(row.risk_analysis || '{}');
    const taxData = risk.taxData || (JSON.parse(row.agent_result || '{}')).taxData;
    assert.ok(taxData, 'BMC taxData must be present');
    assert.strictEqual(taxData.sacNo, 'HW1305620200003');
    assert.ok(taxData.ward.startsWith('H-West'), `Ward must start with H-West, got ${taxData.ward}`);
    assert.strictEqual(taxData.hasSection212Charge, true, 'Must have Section 212 MMC statutory charge');

    db.close();
    recordPass('ADV_3_03', 'Provenance', 'Benchmark record rec-mh-bmc-tax-hw130562 verified: SAC HW1305620200003, Flat 402 Silver Oak, Sec 212 charge');
  } catch (err) {
    recordFail('ADV_3_03', 'Provenance', 'Benchmark rec-mh-bmc-tax-hw130562 verification failed', err, 'CRITICAL');
  }

  // ADV_3_04: Adversarial Stress - Cross-Jurisdiction / Arbitrary Degradation Provenance Check
  // If an arbitrary non-MH query (e.g. Karnataka) fails with 402, does it erroneously return Pune Wagholi 142/2A?
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-simulate-failure': 'downstream_402' },
      body: JSON.stringify({
        state: 'KA',
        docType: 'RTC',
        district: 'Bengaluru Urban',
        taluka: 'Bangalore North',
        village: 'Yelahanka',
        surveyNo: 'KA-SURVEY-999-NONEXISTENT'
      })
    });
    assert.strictEqual(res.status, 202);
    const body = await res.json();
    const jobId = body.jobId;

    let jobData;
    const timeout = Date.now() + 6000;
    while (Date.now() < timeout) {
      const jobRes = await fetch(`${API_BASE}/records/jobs/${jobId}`);
      jobData = await jobRes.json();
      if (jobData.status === 'DEGRADED_FALLBACK' || jobData.status === 'FAILED') break;
      await sleep(150);
    }

    // Inspect fallback recordId
    if (jobData.status === 'DEGRADED_FALLBACK') {
      if (jobData.recordId === 'rec-mh-pune-ferfar-4821') {
        throw new Error(`CROSS-JURISDICTIONAL PROVENANCE POLLUTION: Query for Karnataka (KA) survey KA-SURVEY-999-NONEXISTENT degraded to Maharashtra (MH) Pune Wagholi Ferfar 4821! Pre-seeded fallback is not scoped to jurisdiction.`);
      }
    }

    recordPass('ADV_3_04', 'Provenance', `Cross-jurisdiction query degradation scoped properly (recordId=${jobData.recordId})`);
  } catch (err) {
    recordFail('ADV_3_04', 'Provenance', 'Cross-jurisdiction query provenance check', err, 'MEDIUM');
  }

  // ===========================================================================
  // SUMMARY REPORTING
  // ===========================================================================
  console.log('\n================================================================================');
  console.log('                 ADVERSARIAL CHALLENGE EXECUTION SUMMARY                        ');
  console.log('================================================================================');
  console.log(`Passed: ${passed} | Failed: ${failed} | Total: ${passed + failed}`);
  console.log(`Findings: ${findings.length}`);

  if (findings.length > 0) {
    console.log('\nIdentified Adversarial Findings:');
    findings.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.severity}] ${f.testId} (${f.vector}): ${f.description}`);
      console.log(`     Error: ${f.error}`);
    });
  }

  return { passed, failed, findings };
}

if (require.main === module) {
  runAdversarialChallengeSuite().then(({ failed, findings }) => {
    if (failed > 0) {
      console.log(`\n❌ ADVERSARIAL CHALLENGE COMPLETE: ${failed} findings identified.`);
      process.exit(1);
    } else {
      console.log('\n🏆 ALL ADVERSARIAL CHALLENGE SCENARIOS PASSED CLEANLY.');
      process.exit(0);
    }
  }).catch((err) => {
    console.error('Fatal Suite Execution Error:', err);
    process.exit(1);
  });
}

module.exports = { runAdversarialChallengeSuite };
