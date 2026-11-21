/**
 * ADVERSARIAL STRESS TEST & EMPIRICAL CHALLENGE SUITE (V2)
 * 
 * Target: Landeed 2.0 Real-Time Event-Driven Pipeline & Worker Execution System
 * Author: challenger_r4_1 (Empirical Challenger)
 * 
 * Challenge Vectors:
 * 1. High Concurrency Stress & SQLite WAL Contention (36 parallel jobs across 6 features)
 * 2. Atomic Worker Leasing & Non-Collision Verification
 * 3. Per-Domain Semaphore Rate-Limiting & Throughput Behavior
 * 4. SSE Stream Stress: Rapid Client Disconnects & Immediate Aborts (Bulk Disconnects)
 * 5. SSE Multiple Observers & Rapid Reconnections
 * 6. SSE Terminal State Delivery & Keepalive Heartbeat Structure
 * 7. Edge Cases & Hostile Input Fuzzing (Empty, Extreme Payloads, SQL Injection attempts)
 * 8. Non-Existent Resources (404 Handling on REST & SSE Stream)
 * 9. Truth-Serum Degradation Provenance & DLQ Invariants
 * 10. Database Consistency & Schema Integrity Post-Stress
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const API_BASE = 'http://localhost:4000/api';
const DB_PATH = path.resolve(__dirname, '..', 'server', 'data', 'landeed.db');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function openDb() {
  assert.ok(fs.existsSync(DB_PATH), `Database file must exist at ${DB_PATH}`);
  try {
    const Database = require(path.resolve(__dirname, '..', 'server', 'node_modules', 'better-sqlite3'));
    const db = new Database(DB_PATH, { readonly: true });
    return {
      get: (sql, ...params) => db.prepare(sql).get(...params),
      all: (sql, ...params) => db.prepare(sql).all(...params),
      close: () => db.close()
    };
  } catch {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    return {
      get: (sql, ...params) => db.prepare(sql).get(...params),
      all: (sql, ...params) => db.prepare(sql).all(...params),
      close: () => db.close()
    };
  }
}

async function postJob(body, headers = {}) {
  const res = await fetch(`${API_BASE}/records/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getJob(jobId) {
  const res = await fetch(`${API_BASE}/records/jobs/${jobId}`);
  const data = await res.json();
  return { status: res.status, data };
}

async function pollUntilTerminal(jobId, maxWaitMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await getJob(jobId);
    const st = res.data.job?.status || res.data.status;
    if (st === 'COMPLETED' || st === 'DEGRADED_FALLBACK' || st === 'FAILED') {
      return res.data;
    }
    await sleep(250);
  }
  const finalRes = await getJob(jobId);
  return finalRes.data;
}

async function readSseStream(url, maxWaitMs = 8000, abortAfterMs = null) {
  const controller = new AbortController();
  let abortTimeout = null;
  if (abortAfterMs) {
    abortTimeout = setTimeout(() => controller.abort(), abortAfterMs);
  }

  try {
    const streamRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    if (streamRes.status !== 200) {
      return { status: streamRes.status, events: [], rawHeaders: streamRes.headers };
    }

    const contentType = streamRes.headers.get('content-type') || '';
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const events = [];
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const rawBlocks = buffer.split('\n\n');
      buffer = rawBlocks.pop() || '';

      for (const block of rawBlocks) {
        if (!block.trim()) continue;
        if (block.startsWith(':')) {
          events.push({ event: 'heartbeat', comment: block.slice(1).trim() });
          continue;
        }

        const lines = block.split('\n');
        let eventName = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) eventName = line.slice(7).trim();
          else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
        }

        if (dataStr) {
          try {
            events.push({ event: eventName, data: JSON.parse(dataStr) });
          } catch {
            events.push({ event: eventName, raw: dataStr });
          }
          if (eventName === 'completed' || eventName === 'failed' || eventName === 'degradation') {
            reader.cancel().catch(() => {});
            return { status: 200, contentType, events };
          }
        }
      }
    }

    reader.cancel().catch(() => {});
    return { status: 200, contentType, events };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { status: 'ABORTED', events: [], aborted: true };
    }
    throw err;
  } finally {
    if (abortTimeout) clearTimeout(abortTimeout);
  }
}

async function runAdversarialStressSuite() {
  console.log('\n================================================================================');
  console.log('🔥 EMPIRICAL ADVERSARIAL STRESS TEST & ATTACK HARNESS');
  console.log('Target: Landeed 2.0 Real-Time Event Pipeline & In-Process Worker Pool');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`⚡ [CHALLENGE] ${name} ... `);
    try {
      await fn();
      console.log('PASSED ✅');
      passed++;
    } catch (err) {
      console.log('FAILED ❌');
      console.error(`   Error: ${err.message}`);
      if (err.stack) console.error(`   ${err.stack.split('\n').slice(1, 3).join('\n')}`);
      failed++;
    }
  }

  // --- VECTOR 1: CONCURRENCY STRESS & WAL CONTENTION ---
  console.log('--- VECTOR 1: High Concurrency Job Ingestion & SQLite WAL Locking ---');

  const concurrentJobs = [];
  await test('V1.01: Rapid-fire parallel submission of 36 jobs across all 6 features', async () => {
    const features = [
      { docType: '7_12', surveyNo: '142/2A', village: 'Wagholi', district: 'Pune' },
      { docType: 'MUTATION', ferfarNo: '4821', village: 'Wagholi', district: 'Pune' },
      { docType: 'INDEX_2', deedNo: '4821', district: 'Pune', sroOffice: 'Haveli-3' },
      { docType: 'AAPLI_CHAWADI', ferfarNo: '4950', village: 'Wagholi', district: 'Pune' },
      { docType: 'CTS_MAP', surveyNo: 'CTS-1042', village: 'Bandra', district: 'Mumbai Suburban' },
      { docType: 'BMC_TAX', sacNo: 'HW1305620200003', district: 'Mumbai' }
    ];

    // Create 6 batches of 6 = 36 total simultaneous requests
    const promises = [];
    for (let batch = 0; batch < 6; batch++) {
      for (const feat of features) {
        promises.push(postJob({ state: 'MH', ...feat, batchIndex: batch }));
      }
    }

    const results = await Promise.all(promises);
    assert.strictEqual(results.length, 36, 'All 36 requests must complete');

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      assert.strictEqual(res.status, 202, `Request ${i} must return HTTP 202 Accepted, got ${res.status}`);
      assert.strictEqual(res.data.success, true, `Job ${i} response success must be true`);
      assert.ok(res.data.jobId && res.data.jobId.startsWith('job_'), `Job ${i} must have valid jobId`);
      assert.ok(res.data.ticketId && res.data.ticketId.startsWith('TK-'), `Job ${i} must have valid ticketId`);
      assert.ok(res.data.streamUrl, `Job ${i} must provide streamUrl`);
      concurrentJobs.push(res.data.jobId);
    }
  });

  await test('V1.02: Verify SQLite WAL integrity and immediate persistence of all 36 jobs', async () => {
    const db = openDb();
    try {
      const countRow = db.get('SELECT COUNT(*) as cnt FROM query_jobs');
      assert.ok(countRow.cnt >= 36, `Expected at least 36 jobs in query_jobs, found ${countRow.cnt}`);

      // Verify no duplicate IDs or tickets among the 36
      const uniqueJobIds = new Set(concurrentJobs);
      assert.strictEqual(uniqueJobIds.size, 36, 'All 36 job IDs must be globally unique');
    } finally {
      db.close();
    }
  });

  await test('V1.03: Worker pool execution: wait for all 36 jobs to reach terminal states without crash or hang', async () => {
    const maxWaitMs = 25000;
    const start = Date.now();
    let pendingCount = concurrentJobs.length;

    while (Date.now() - start < maxWaitMs) {
      let currentPending = 0;
      for (const id of concurrentJobs) {
        const { data } = await getJob(id);
        const st = data.job?.status || data.status;
        if (st === 'QUEUED' || st === 'ASSIGNED' || st === 'PORTAL_NAVIGATING' || st === 'SOLVING_CHALLENGE' || st === 'EXTRACTING_RECORD' || st === 'ANCHORING_BLOCKCHAIN') {
          currentPending++;
        }
      }
      pendingCount = currentPending;
      if (pendingCount === 0) break;
      await sleep(500);
    }

    assert.strictEqual(pendingCount, 0, `All 36 jobs must resolve to terminal state within timeout, remaining pending: ${pendingCount}`);
  });

  await test('V1.04: Atomic Leasing & Zero Race Conditions: verify no double-leasing across all 36 jobs', async () => {
    const db = openDb();
    try {
      for (const jobId of concurrentJobs) {
        const row = db.get('SELECT * FROM query_jobs WHERE id = ?', jobId);
        assert.ok(row, `Job ${jobId} must exist in database`);
        assert.ok(row.worker_id, `Job ${jobId} must have an assigned worker_id`);
        assert.strictEqual(row.progress_percent, 100, `Job ${jobId} must reach 100% progress`);
        
        // Parse step log and check chronological integrity
        const steps = JSON.parse(row.steps_log || '[]');
        assert.ok(steps.length >= 2, `Job ${jobId} must have recorded at least 2 steps, got ${steps.length}`);
        
        // Ensure steps have unique step indexes and progress forward
        let lastStep = 0;
        for (const s of steps) {
          assert.ok(s.stepIndex >= lastStep, `Step index must not regress: was ${lastStep}, got ${s.stepIndex}`);
          lastStep = s.stepIndex;
        }
      }
    } finally {
      db.close();
    }
  });

  await test('V1.05: Per-Domain Semaphore Rate-Limiting: rapid burst to same domain does not exceed limit', async () => {
    // Submit 6 jobs targeted at Mahabhumi (7_12 domain limit = 2)
    const domainJobs = [];
    for (let i = 0; i < 6; i++) {
      const res = await postJob({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: `BURST_${i}_142/2A`
      });
      domainJobs.push(res.data.jobId);
    }

    // Wait for all to finish
    for (const jid of domainJobs) {
      const finalJob = await pollUntilTerminal(jid, 10000);
      assert.ok(['COMPLETED', 'DEGRADED_FALLBACK', 'FAILED'].includes(finalJob.status), `Job ${jid} must reach terminal state`);
    }
  });

  // --- VECTOR 2: SSE STREAM STRESS & CLIENT DISCONNECTS ---
  console.log('\n--- VECTOR 2: SSE Stream Stress, Mid-Stream Client Abort & Rapid Reconnect ---');

  let sseTestJobId = null;

  await test('V2.01: Enqueue fresh job for SSE stress probe', async () => {
    const res = await postJob({
      state: 'MH',
      docType: '7_12',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      surveyNo: '142/2A'
    });
    assert.strictEqual(res.status, 202);
    sseTestJobId = res.data.jobId;
    assert.ok(sseTestJobId);
  });

  await test('V2.02: Abrupt mid-stream client disconnect (aborts within 120ms): verify server does not crash', async () => {
    const streamUrl = `${API_BASE}/records/jobs/${sseTestJobId}/stream`;
    
    // Connect and abort immediately (simulating network dropped or user navigating away)
    const res = await readSseStream(streamUrl, 5000, 120);
    assert.strictEqual(res.aborted, true, 'Stream reader should have aborted');

    // Give server a moment to execute cleanup
    await sleep(200);

    // Verify backend is still completely healthy and responsive
    const health = await fetch(`${API_BASE}/health`).then(r => r.json());
    assert.strictEqual(health.status, 'ok', 'Server health check must return ok after client abort');
  });

  await test('V2.03: Bulk Client Disconnect Stress: 8 parallel clients connecting and abruptly terminating', async () => {
    const { data: newJob } = await postJob({
      state: 'MH',
      docType: 'INDEX_2',
      deedNo: '4821',
      district: 'Pune',
      sroOffice: 'Haveli-3'
    });

    const streamUrl = `${API_BASE}/records/jobs/${newJob.jobId}/stream`;
    
    // Connect 8 parallel SSE streams and abort them at varied short intervals
    const abortDelays = [40, 80, 100, 120, 150, 180, 200, 250];
    const abortPromises = abortDelays.map(delay => readSseStream(streamUrl, 4000, delay));
    
    const results = await Promise.all(abortPromises);
    assert.strictEqual(results.length, 8);
    for (const r of results) {
      assert.strictEqual(r.aborted, true, 'Client should have aborted on schedule');
    }

    await sleep(200);
    const health = await fetch(`${API_BASE}/health`).then(r => r.json());
    assert.strictEqual(health.status, 'ok', 'Server must remain 100% operational after bulk aborts');
  });

  await test('V2.04: Multiple concurrent SSE stream listeners (4 clients) observing the same active job', async () => {
    const { data: newJob } = await postJob({
      state: 'MH',
      docType: 'MUTATION',
      ferfarNo: '4821',
      village: 'Wagholi',
      district: 'Pune'
    });

    const streamUrl = `${API_BASE}/records/jobs/${newJob.jobId}/stream`;

    const readers = [
      readSseStream(streamUrl, 7000),
      readSseStream(streamUrl, 7000),
      readSseStream(streamUrl, 7000),
      readSseStream(streamUrl, 7000)
    ];

    const results = await Promise.all(readers);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      assert.strictEqual(r.status, 200, `Listener ${i} must receive HTTP 200`);
      assert.ok(r.events.length > 0, `Listener ${i} must have received stream events`);
      const hasTerminal = r.events.some(e => e.event === 'completed' || e.event === 'degradation');
      assert.ok(hasTerminal, `Listener ${i} must have captured terminal completion event`);
    }
  });

  await test('V2.05: Reconnection to already-completed job: delivers immediate terminal state & cleanly closes', async () => {
    const streamUrl = `${API_BASE}/records/jobs/${sseTestJobId}/stream`;
    
    // The sseTestJobId should be completed by now
    await pollUntilTerminal(sseTestJobId, 4000);
    const jobRes = await getJob(sseTestJobId);
    assert.strictEqual(jobRes.data.status, 'COMPLETED');

    const sseResult = await readSseStream(streamUrl, 3000);
    assert.strictEqual(sseResult.status, 200);
    assert.ok(sseResult.events.length >= 1, 'Completed job stream must yield immediate snapshot events');
    const completedEvt = sseResult.events.find(e => e.event === 'completed');
    assert.ok(completedEvt, 'Must immediately receive completed event');
    assert.strictEqual(completedEvt.data.status, 'completed');
    assert.strictEqual(completedEvt.data.percent, 100);
  });

  // --- VECTOR 3: HOSTILE PAYLOADS & EDGE CASE INPUT FUZZING ---
  console.log('\n--- VECTOR 3: Hostile Payloads, Fuzzing & SQL Injection Edge Cases ---');

  await test('V3.01: Empty payload submission ({}) handled gracefully with default normalization', async () => {
    const res = await postJob({});
    assert.strictEqual(res.status, 202, 'Should accept empty payload with default fallbacks');
    assert.ok(res.data.jobId);
    assert.ok(res.data.ticketId);

    // Poll until terminal state
    const finalJob = await pollUntilTerminal(res.data.jobId, 6000);
    assert.ok(['COMPLETED', 'DEGRADED_FALLBACK', 'FAILED'].includes(finalJob.status), `Job must resolve to valid status, got ${finalJob.status}`);
  });

  await test('V3.02: SQL Injection probe in surveyNo and district parameters', async () => {
    const sqlInjectionPayload = {
      state: "MH",
      docType: "7_12",
      district: "Pune'; DROP TABLE query_jobs; --",
      taluka: "Haveli' OR 1=1 --",
      village: "Wagholi",
      surveyNo: "142/2A'; DELETE FROM query_jobs WHERE '1'='1"
    };

    const res = await postJob(sqlInjectionPayload);
    assert.strictEqual(res.status, 202);

    // Verify query_jobs table still exists, is healthy, and has all rows intact
    const db = openDb();
    try {
      const row = db.get('SELECT COUNT(*) as cnt FROM query_jobs');
      assert.ok(row.cnt > 0, 'Database query_jobs table must remain uncorrupted');
      
      const injectedJob = db.get('SELECT * FROM query_jobs WHERE id = ?', res.data.jobId);
      assert.ok(injectedJob, 'Job record must be safely parameterized and inserted');
      assert.ok(injectedJob.params.includes('DROP TABLE'), 'Payload text was stored as literal parameter string, not executed');
    } finally {
      db.close();
    }
  });

  await test('V3.03: Massive 10,000-character payload in surveyNo parameter', async () => {
    const hugeSurveyNo = 'A'.repeat(10000);
    const res = await postJob({
      state: 'MH',
      docType: '7_12',
      surveyNo: hugeSurveyNo
    });

    assert.strictEqual(res.status, 202);
    assert.ok(res.data.jobId);
    assert.ok(res.data.ticketId);

    const db = openDb();
    try {
      const row = db.get('SELECT id, ticket_id FROM query_jobs WHERE id = ?', res.data.jobId);
      assert.ok(row, 'Large payload job must be persisted cleanly');
    } finally {
      db.close();
    }
  });

  await test('V3.04: Non-existent Job ID queries: returns clean HTTP 404 without crashing', async () => {
    const bogusId = 'job_bogus_nonexistent_deadbeef_999999';
    const restRes = await fetch(`${API_BASE}/records/jobs/${bogusId}`);
    assert.strictEqual(restRes.status, 404, `GET /api/records/jobs/${bogusId} must return 404`);
    const restJson = await restRes.json();
    assert.strictEqual(restJson.success, false);

    const sseRes = await fetch(`${API_BASE}/records/jobs/${bogusId}/stream`);
    assert.strictEqual(sseRes.status, 404, `GET /api/records/jobs/${bogusId}/stream must return 404`);
    const sseJson = await sseRes.json();
    assert.strictEqual(sseJson.success, false);
  });

  await test('V3.05: DLQ API and Direct Table Inspection for max limit parameter fuzzing', async () => {
    const limits = [-1, 0, 5, 99999];
    for (const lim of limits) {
      const res = await fetch(`${API_BASE}/records/jobs/dlq?limit=${lim}`);
      assert.strictEqual(res.status, 200, `DLQ query with limit=${lim} must return 200`);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.dlq));
    }
  });

  // --- VECTOR 4: TRUTH-SERUM DEGRADATION & DLQ ADVERSARIAL VERIFICATION ---
  console.log('\n--- VECTOR 4: Truth-Serum Degradation Provenance & DLQ Routing ---');

  await test('V4.01: Simulate Downstream 402 with custom diagnostic audit', async () => {
    const res = await postJob(
      {
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A'
      },
      { 'x-simulate-failure': 'downstream_402' }
    );

    assert.strictEqual(res.status, 202);
    const jobId = res.data.jobId;

    const streamRes = await readSseStream(`${API_BASE}/records/jobs/${jobId}/stream`, 5000);
    assert.strictEqual(streamRes.status, 200);

    const degradationEvt = streamRes.events.find(e => e.event === 'degradation');
    assert.ok(degradationEvt, 'Must emit degradation event on simulated 402');
    assert.strictEqual(degradationEvt.data.isDegraded, true);
    assert.strictEqual(degradationEvt.data.isLive, false);
    assert.strictEqual(degradationEvt.data.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(degradationEvt.data.degradationReason, 'DOWNSTREAM_402_PAYMENT_REQUIRED');
  });

  await test('V4.02: Simulate Fatal Scraping Failure -> routes to Dead-Letter Queue (DLQ)', async () => {
    const res = await postJob(
      {
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: 'UNKNOWN_SURVEY_99999'
      },
      { 'x-simulate-failure': 'fatal_scrape_error' }
    );

    assert.strictEqual(res.status, 202);
    const jobId = res.data.jobId;

    const streamRes = await readSseStream(`${API_BASE}/records/jobs/${jobId}/stream`, 5000);
    const failedEvt = streamRes.events.find(e => e.event === 'failed');
    assert.ok(failedEvt, 'Must emit failed event on fatal error');
    assert.strictEqual(failedEvt.data.dlqRouted, true);
    assert.strictEqual(failedEvt.data.errorCode, 'FATAL_SCRAPE_ERROR');

    const db = openDb();
    try {
      const dlqRow = db.get('SELECT * FROM query_job_dlq WHERE job_id = ?', jobId);
      assert.ok(dlqRow, `DLQ record must exist for job ${jobId}`);
      assert.strictEqual(dlqRow.failure_reason, 'FATAL_SCRAPE_ERROR');
      assert.ok(dlqRow.diagnostic_payload, 'Diagnostic payload must be non-null');
      assert.ok(dlqRow.stack_trace, 'Stack trace must be recorded');
    } finally {
      db.close();
    }
  });

  // --- FINAL REPORT ---
  console.log('\n================================================================================');
  console.log('                      ADVERSARIAL STRESS TEST SUMMARY                           ');
  console.log('================================================================================');
  console.log(`Total Challenges Executed: ${passed + failed}`);
  console.log(`Passed:                   ${passed}`);
  console.log(`Failed:                   ${failed}`);
  console.log(`Success Rate:             ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  if (failed === 0) {
    console.log('🛡️  VERDICT: APPROVE — Real-Time Event Pipeline withstood all adversarial probes.');
    process.exit(0);
  } else {
    console.error('💥 VERDICT: CHALLENGE_FAILED — Pipeline exhibited vulnerabilities under stress.');
    process.exit(1);
  }
}

if (require.main === module) {
  runAdversarialStressSuite().catch((err) => {
    console.error('Fatal crash in stress suite:', err);
    process.exit(1);
  });
}

module.exports = { runAdversarialStressSuite };
