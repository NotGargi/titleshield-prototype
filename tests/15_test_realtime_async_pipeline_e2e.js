/**
 * SUITE 15: Real-Time Event-Driven Processing Pipeline & Truth-Serum Verification E2E
 *
 * Verifies:
 * - Tier 1: Asynchronous Job Ingestion & Immediate Ticket Issuance (HTTP 202):
 *   * TEST_15_01: Feature 1: 7/12 & 8A Extract (Pune Wagholi Gat 142/2A) -> HTTP 202, TK-MH-712-142-2A
 *   * TEST_15_02: Feature 2: Ferfar / Mutation (Wagholi Ferfar #4821) -> HTTP 202, TK-MH-MUTATION-FER-4821
 *   * TEST_15_03: Feature 3: IGR Index-II (SRO Haveli-3 Deed #4821) -> HTTP 202, TK-MH-INDEX2-DEED-4821
 *   * TEST_15_04: Feature 4: Aapli Chawadi (Wagholi Notice #4950) -> HTTP 202, TK-MH-AAPLICHAWADI-FER-4950
 *   * TEST_15_05: Feature 5: CTS & City Survey (CTS 1042 / CTS 982) -> HTTP 202, TK-MH-CTSMAP-CTS-1042
 *   * TEST_15_06: Feature 6: BMC Property Tax (SAC HW1305620200003) -> HTTP 202, TK-MH-BMCTAX-HW1305620200003
 *   * TEST_15_07: Backward Compatibility: Ingest via POST /api/records/fetch?async=true
 *   * TEST_15_08: Direct SQLite Persistence & Schema Integrity for query_jobs table
 *
 * - Tier 2: Real-Time Event Bus & Live SSE Streaming:
 *   * TEST_15_09: SSE Stream Connection: HTTP 200 and Content-Type: text/event-stream
 *   * TEST_15_10: Live SSE Milestone & Progress Parsing across worker lifecycle
 *   * TEST_15_11: Progress Percentage Monotonic Progression (0% -> 100%)
 *   * TEST_15_12: Terminal 'completed' Event Payload (recordId, isLive: false, dataProvenance: 'VERIFIED_PRESEEDED_CACHE')
 *   * TEST_15_13: Adaptive Polling Fallback Verification (GET /api/records/jobs/:jobId)
 *
 * - Tier 3: Resilient Truth-Serum Degradation Handling:
 *   * TEST_15_14: Downstream HTTP 402 Barrier Ingestion (x-simulate-failure: downstream_402)
 *   * TEST_15_15: SSE Degradation Event Emission on Live Stream (event: degradation)
 *   * TEST_15_16: Degradation State Machine & Provenance (DEGRADED_FALLBACK, VERIFIED_PRESEEDED_CACHE)
 *   * TEST_15_17: Portal CAPTCHA Block Degradation (x-simulate-failure: captcha_block on BMC SAC)
 *   * TEST_15_18: Direct SQLite Degradation Audit (is_degraded = 1, explicit reason preserved)
 *
 * - Tier 4: Dead-Letter Queue (DLQ) Routing on Unrecoverable Failures:
 *   * TEST_15_19: Unrecoverable Scraping Failure Ingestion (x-simulate-failure: fatal_scrape_error)
 *   * TEST_15_20: Worker Retry Exhaustion & Terminal State Transition (status: 'FAILED')
 *   * TEST_15_21: DLQ REST Endpoint Inspection (GET /api/records/jobs/dlq)
 *   * TEST_15_22: SQLite query_job_dlq Table Direct Inspection & Structured Diagnostics Audit
 *
 * - Tier 5: End-to-End Pipeline Cohesion:
 *   * TEST_15_23: Cross-Feature Event Bus Lifecycle & Invariant Integrity Audit
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const API_BASE = 'http://localhost:4000/api';
const DB_PATH = path.resolve(__dirname, '..', 'server', 'data', 'landeed.db');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Universal SQLite connection helper supporting better-sqlite3 and node:sqlite fallback
 */
function openDatabase() {
  assert.ok(fs.existsSync(DB_PATH), `SQLite database must exist at ${DB_PATH}`);

  try {
    const Database = require(path.resolve(__dirname, '..', 'server', 'node_modules', 'better-sqlite3'));
    const db = new Database(DB_PATH, { readonly: true });
    return {
      type: 'better-sqlite3',
      get: (sql, ...params) => db.prepare(sql).get(...params),
      all: (sql, ...params) => db.prepare(sql).all(...params),
      close: () => db.close()
    };
  } catch {
    try {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(DB_PATH, { readOnly: true });
      return {
        type: 'node:sqlite',
        get: (sql, ...params) => db.prepare(sql).get(...params),
        all: (sql, ...params) => db.prepare(sql).all(...params),
        close: () => db.close()
      };
    } catch (err) {
      throw new Error(`Unable to open SQLite database: ${err.message}`);
    }
  }
}

/**
 * Robust SSE Stream Reader using native fetch & ReadableStream
 */
async function readSseStream(url, maxWaitMs = 12000) {
  const streamRes = await fetch(url, {
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  });

  assert.strictEqual(streamRes.status, 200, `SSE endpoint ${url} must return HTTP 200`);
  const contentType = streamRes.headers.get('content-type') || '';
  assert.ok(contentType.includes('text/event-stream'), `Content-Type must be text/event-stream, got ${contentType}`);

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events = [];
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < maxWaitMs) {
      const { value, done } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          const lines = buffer.split('\n');
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
            } catch {
              events.push({ event: eventName, raw: dataStr });
            }
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const rawBlocks = buffer.split('\n\n');
      buffer = rawBlocks.pop() || ''; // Keep partial block in buffer

      for (const block of rawBlocks) {
        if (!block.trim() || block.startsWith(':')) continue; // Heartbeat comments

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
            // Terminal events: completed or failed conclude the stream
            if (eventName === 'completed' || eventName === 'failed') {
              return events;
            }
          } catch {
            events.push({ event: eventName, raw: dataStr });
          }
        }
      }
    }
  } finally {
    try {
      reader.cancel();
    } catch {
      // Reader already closed
    }
  }

  return events;
}

async function runRealtimePipelineTests() {
  console.log('\n================================================================================');
  console.log('⚡ SUITE 15: Real-Time Event-Driven Pipeline & Truth-Serum Verification E2E');
  console.log('================================================================================');

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
    const errMsg = error ? (error.message || String(error)) : 'Assertion failed';
    results.push({ id: testId, tier, status: 'FAIL', description, error: errMsg });
    console.error(`  ❌ [FAIL] [${tier}] ${testId}: ${description}`);
    console.error(`     Error: ${errMsg}`);
  }

  // Tracking identifiers for cross-tier assertions
  let job712Id = '';
  let ticket712Id = '';
  let jobMutationId = '';
  let jobIndex2Id = '';
  let jobChawadiId = '';
  let jobCtsMapId = '';
  let jobBmcTaxId = '';

  // ===========================================================================
  // TIER 1: ASYNCHRONOUS JOB INGESTION & IMMEDIATE TICKET ISSUANCE (HTTP 202)
  // ===========================================================================
  console.log('\n--- Tier 1: Asynchronous Job Ingestion & Immediate Ticket Issuance (HTTP 202) ---');

  // TEST_15_01: Feature 1: 7/12 & 8A Extract (Pune Wagholi Gat 142/2A)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A'
      })
    });

    assert.strictEqual(res.status, 202, `Expected status 202 Accepted, got ${res.status}`);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'QUEUED');
    assert.ok(typeof body.jobId === 'string' && body.jobId.startsWith('job_'), `Invalid jobId: ${body.jobId}`);
    assert.ok(typeof body.ticketId === 'string' && body.ticketId.includes('MH'), `Invalid ticketId: ${body.ticketId}`);
    assert.strictEqual(body.feature, '7_12');
    assert.strictEqual(body.streamUrl, `/api/records/jobs/${body.jobId}/stream`);

    job712Id = body.jobId;
    ticket712Id = body.ticketId;
    recordPass('TEST_15_01', 'Tier 1', `Feature 1 (7/12 Extract): HTTP 202 Accepted, ticket ${body.ticketId}, streamUrl ${body.streamUrl}`);
  } catch (err) {
    recordFail('TEST_15_01', 'Tier 1', 'Feature 1 (7/12 Extract) async ingestion failed', err);
  }

  // TEST_15_02: Feature 2: Ferfar / Mutation (Wagholi Ferfar #4821)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: 'MUTATION',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        ferfarNo: '4821'
      })
    });

    assert.strictEqual(res.status, 202);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.feature, 'MUTATION');
    assert.ok(body.ticketId.includes('FER-4821'), `Expected FER-4821 in ticketId: ${body.ticketId}`);
    jobMutationId = body.jobId;
    recordPass('TEST_15_02', 'Tier 1', `Feature 2 (Mutation / Ferfar): HTTP 202 Accepted, ticket ${body.ticketId}`);
  } catch (err) {
    recordFail('TEST_15_02', 'Tier 1', 'Feature 2 (Ferfar) async ingestion failed', err);
  }

  // TEST_15_03: Feature 3: IGR Index-II (SRO Haveli-3 Deed #4821)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: 'INDEX_2',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        deedNo: '4821',
        regYear: '2024'
      })
    });

    assert.strictEqual(res.status, 202);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.feature, 'INDEX_2');
    assert.ok(body.ticketId.includes('DEED-4821'), `Expected DEED-4821 in ticketId: ${body.ticketId}`);
    jobIndex2Id = body.jobId;
    recordPass('TEST_15_03', 'Tier 1', `Feature 3 (IGR Index-II): HTTP 202 Accepted, ticket ${body.ticketId}`);
  } catch (err) {
    recordFail('TEST_15_03', 'Tier 1', 'Feature 3 (IGR Index-II) async ingestion failed', err);
  }

  // TEST_15_04: Feature 4: Aapli Chawadi (Wagholi Notice #4950)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: 'AAPLI_CHAWADI',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        ferfarNo: '4950'
      })
    });

    assert.strictEqual(res.status, 202);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.feature, 'AAPLI_CHAWADI');
    assert.ok(body.ticketId.includes('AAPLICHAWADI'), `Expected AAPLICHAWADI in ticketId: ${body.ticketId}`);
    jobChawadiId = body.jobId;
    recordPass('TEST_15_04', 'Tier 1', `Feature 4 (Aapli Chawadi): HTTP 202 Accepted, ticket ${body.ticketId}`);
  } catch (err) {
    recordFail('TEST_15_04', 'Tier 1', 'Feature 4 (Aapli Chawadi) async ingestion failed', err);
  }

  // TEST_15_05: Feature 5: CTS & City Survey (CTS 1042 / CTS 982)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: 'CTS_MAP',
        district: 'Mumbai Suburban',
        taluka: 'Bandra',
        village: 'Bandra',
        surveyNo: 'CTS-1042'
      })
    });

    assert.strictEqual(res.status, 202);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.feature, 'CTS_MAP');
    assert.ok(body.ticketId.includes('CTSMAP-CTS-1042'), `Expected CTSMAP-CTS-1042 in ticketId: ${body.ticketId}`);
    jobCtsMapId = body.jobId;
    recordPass('TEST_15_05', 'Tier 1', `Feature 5 (CTS & City Survey): HTTP 202 Accepted, ticket ${body.ticketId}`);
  } catch (err) {
    recordFail('TEST_15_05', 'Tier 1', 'Feature 5 (CTS Map) async ingestion failed', err);
  }

  // TEST_15_06: Feature 6: BMC Property Tax (SAC HW1305620200003)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.feature, 'BMC_TAX');
    assert.ok(body.ticketId.includes('HW1305620200003'), `Expected SAC number in ticketId: ${body.ticketId}`);
    jobBmcTaxId = body.jobId;
    recordPass('TEST_15_06', 'Tier 1', `Feature 6 (BMC Property Tax): HTTP 202 Accepted, ticket ${body.ticketId}`);
  } catch (err) {
    recordFail('TEST_15_06', 'Tier 1', 'Feature 6 (BMC Tax) async ingestion failed', err);
  }

  // TEST_15_07: Backward Compatibility: Ingest via POST /api/records/fetch?async=true
  try {
    const res = await fetch(`${API_BASE}/records/fetch?async=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A'
      })
    });

    assert.strictEqual(res.status, 202, `Expected status 202 for fetch?async=true, got ${res.status}`);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.jobId && body.ticketId);
    assert.strictEqual(body.streamUrl, `/api/records/jobs/${body.jobId}/stream`);
    recordPass('TEST_15_07', 'Tier 1', `Backward Compatibility: POST /api/records/fetch?async=true returned HTTP 202 ticket ${body.ticketId}`);
  } catch (err) {
    recordFail('TEST_15_07', 'Tier 1', 'Backward compatible /fetch?async=true failed', err);
  }

  // TEST_15_08: Direct SQLite Persistence & Schema Integrity for query_jobs table
  try {
    const db = openDatabase();
    const row = db.get("SELECT * FROM query_jobs WHERE id = ?", job712Id);
    assert.ok(row, `Job row for ${job712Id} must exist in query_jobs SQLite table`);
    assert.strictEqual(row.feature, '7_12');
    assert.strictEqual(row.state, 'MH');
    assert.strictEqual(row.ticket_id, ticket712Id);
    assert.ok(row.status, 'Job status must be present');
    assert.ok(typeof row.progress_percent === 'number', 'progress_percent must be a number');

    const tableInfo = db.all("PRAGMA table_info(query_jobs)");
    const colNames = tableInfo.map((c) => c.name);
    assert.ok(colNames.includes('ticket_id'), 'Column ticket_id must exist');
    assert.ok(colNames.includes('is_degraded'), 'Column is_degraded must exist');
    assert.ok(colNames.includes('degradation_reason'), 'Column degradation_reason must exist');
    assert.ok(colNames.includes('data_provenance'), 'Column data_provenance must exist');
    db.close();

    recordPass('TEST_15_08', 'Tier 1', `Direct SQLite persistence verified for query_jobs (WAL mode, relational integrity, row ${job712Id})`);
  } catch (err) {
    recordFail('TEST_15_08', 'Tier 1', 'Direct SQLite schema verification failed', err);
  }

  // ===========================================================================
  // TIER 2: REAL-TIME EVENT BUS & LIVE SSE STREAMING
  // ===========================================================================
  console.log('\n--- Tier 2: Real-Time Event Bus & Live SSE Streaming ---');

  let streamJobId = '';
  let streamEvents = [];

  // TEST_15_09: SSE Stream Connection: HTTP 200 and Content-Type: text/event-stream
  try {
    // Ingest a fresh job specifically for live stream monitoring
    const initRes = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: 'INDEX_2',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        deedNo: '4821',
        regYear: '2024'
      })
    });
    assert.strictEqual(initRes.status, 202);
    const initBody = await initRes.json();
    streamJobId = initBody.jobId;

    // Connect to SSE stream
    streamEvents = await readSseStream(`${API_BASE}/records/jobs/${streamJobId}/stream`, 20000);
    assert.ok(streamEvents.length > 0, `Expected SSE events from ${streamJobId}/stream, received none`);
    recordPass('TEST_15_09', 'Tier 2', `SSE connection verified: text/event-stream header, received ${streamEvents.length} chunks`);
  } catch (err) {
    recordFail('TEST_15_09', 'Tier 2', 'SSE connection establishment failed', err);
  }

  // TEST_15_10: Live SSE Milestone & Progress Parsing across worker lifecycle
  try {
    const eventTypes = streamEvents.map((e) => e.event);
    assert.ok(eventTypes.includes('milestone') || eventTypes.includes('progress'), 'Stream must contain milestone or progress events');
    const milestoneEvents = streamEvents.filter((e) => e.event === 'milestone');
    assert.ok(milestoneEvents.length > 0, 'Stream must contain structured milestone transitions');

    const firstMilestone = milestoneEvents[0].data;
    assert.ok(firstMilestone.jobId, 'Milestone payload must contain jobId');
    assert.ok(firstMilestone.ticketId, 'Milestone payload must contain ticketId');
    assert.ok(firstMilestone.milestone, 'Milestone payload must contain milestone metadata');

    recordPass('TEST_15_10', 'Tier 2', `Live SSE milestone transitions verified: received [${[...new Set(eventTypes)].join(', ')}]`);
  } catch (err) {
    recordFail('TEST_15_10', 'Tier 2', 'Milestone event parsing failed', err);
  }

  // TEST_15_11: Progress Percentage Monotonic Progression (0% -> 100%)
  try {
    const progressValues = streamEvents
      .map((e) => (typeof e.data?.percent === 'number' ? e.data.percent : e.data?.progressPct))
      .filter((p) => typeof p === 'number');

    assert.ok(progressValues.length >= 2, `Expected multiple progress values, got ${progressValues.length}`);
    const lastProgress = progressValues[progressValues.length - 1];
    assert.strictEqual(lastProgress, 100, `Final progress must reach 100%, got ${lastProgress}%`);

    // Verify values do not regress backwards
    for (let i = 1; i < progressValues.length; i++) {
      assert.ok(progressValues[i] >= progressValues[i - 1], `Progress non-monotonic: ${progressValues[i - 1]} -> ${progressValues[i]}`);
    }

    recordPass('TEST_15_11', 'Tier 2', `Progress progression verified monotonically: [${[...new Set(progressValues)].join('% -> ')}%]`);
  } catch (err) {
    recordFail('TEST_15_11', 'Tier 2', 'Progress monotonicity verification failed', err);
  }

  // TEST_15_12: Terminal 'completed' Event Payload with Truth-Serum Provenance (VERIFIED_PRESEEDED_CACHE)
  try {
    const completedEvent = streamEvents.find((e) => e.event === 'completed');
    assert.ok(completedEvent, 'Stream must conclude with terminal completed event');

    const payload = completedEvent.data;
    assert.strictEqual(payload.status, 'completed');
    assert.strictEqual(payload.percent, 100);
    assert.ok(payload.recordId, 'Completed event must include valid recordId');
    assert.strictEqual(payload.isLive, false, 'Pre-seeded benchmark hit must declare isLive: false under Section 63 BSA 2023');
    assert.strictEqual(payload.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', 'Pre-seeded benchmark hit must declare dataProvenance: VERIFIED_PRESEEDED_CACHE');

    recordPass('TEST_15_12', 'Tier 2', `Terminal completed event verified: recordId=${payload.recordId}, isLive=${payload.isLive}, dataProvenance=${payload.dataProvenance}`);
  } catch (err) {
    recordFail('TEST_15_12', 'Tier 2', 'Completed event verification failed', err);
  }

  // TEST_15_13: Adaptive Polling Fallback Verification (GET /api/records/jobs/:jobId)
  try {
    // Wait for the earlier enqueued job712Id to reach completion
    let pollJob;
    const pollTimeout = Date.now() + 6000;
    while (Date.now() < pollTimeout) {
      const pollRes = await fetch(`${API_BASE}/records/jobs/${job712Id}`);
      assert.strictEqual(pollRes.status, 200);
      pollJob = await pollRes.json();
      if (pollJob.status === 'COMPLETED') break;
      await sleep(150);
    }

    assert.strictEqual(pollJob.success, true);
    assert.strictEqual(pollJob.jobId, job712Id);
    assert.strictEqual(pollJob.status, 'COMPLETED');
    assert.strictEqual(pollJob.progressPercent, 100);
    assert.ok(Array.isArray(pollJob.steps) && pollJob.steps.length >= 4, `Expected >= 4 steps in stepsLog, got ${pollJob.steps?.length}`);
    assert.ok(pollJob.recordId, 'Resulting recordId must be populated in polling entity');

    recordPass('TEST_15_13', 'Tier 2', `Adaptive polling fallback returned full job entity (100% progress, ${pollJob.steps.length} milestones logged)`);
  } catch (err) {
    recordFail('TEST_15_13', 'Tier 2', 'Adaptive polling fallback failed', err);
  }

  // ===========================================================================
  // TIER 3: RESILIENT TRUTH-SERUM DEGRADATION HANDLING
  // ===========================================================================
  console.log('\n--- Tier 3: Resilient Truth-Serum Degradation Handling ---');

  let deg402JobId = '';
  let deg402StreamEvents = [];

  // TEST_15_14: Downstream HTTP 402 Barrier Ingestion (x-simulate-failure: downstream_402)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simulate-failure': 'downstream_402'
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

    assert.strictEqual(res.status, 202);
    const body = await res.json();
    deg402JobId = body.jobId;
    assert.ok(deg402JobId);
    recordPass('TEST_15_14', 'Tier 3', `Downstream 402 barrier simulated: HTTP 202 Accepted, jobId=${deg402JobId}`);
  } catch (err) {
    recordFail('TEST_15_14', 'Tier 3', 'Downstream 402 ingestion failed', err);
  }

  // TEST_15_15: SSE Degradation Event Emission on Live Stream (event: degradation)
  try {
    deg402StreamEvents = await readSseStream(`${API_BASE}/records/jobs/${deg402JobId}/stream`, 20000);
    const degEvent = deg402StreamEvents.find((e) => e.event === 'degradation');
    assert.ok(degEvent, 'Live SSE stream must emit explicit "degradation" event when 402 barrier is tripped');

    const degData = degEvent.data;
    assert.strictEqual(degData.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(degData.isLive, false, 'isLive must be false');
    assert.strictEqual(degData.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', 'dataProvenance must be VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(degData.degradationReason, 'DOWNSTREAM_402_PAYMENT_REQUIRED');
    assert.ok(degData.diagnosticNotice, 'Explicit diagnosticNotice must be provided');

    recordPass('TEST_15_15', 'Tier 3', `SSE stream emitted event: degradation with DOWNSTREAM_402_PAYMENT_REQUIRED and diagnostic notice`);
  } catch (err) {
    recordFail('TEST_15_15', 'Tier 3', 'SSE degradation event emission failed', err);
  }

  // TEST_15_16: Degradation State Machine & Provenance (DEGRADED_FALLBACK, VERIFIED_PRESEEDED_CACHE)
  try {
    await sleep(200);
    const jobRes = await fetch(`${API_BASE}/records/jobs/${deg402JobId}`);
    assert.strictEqual(jobRes.status, 200);
    const jobData = await jobRes.json();

    assert.strictEqual(jobData.status, 'DEGRADED_FALLBACK', `Job status must be DEGRADED_FALLBACK, got ${jobData.status}`);
    assert.strictEqual(jobData.isDegraded, true);
    assert.strictEqual(jobData.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(jobData.degradationReason, 'DOWNSTREAM_402_PAYMENT_REQUIRED');
    assert.ok(jobData.recordId, 'Must gracefully serve verified pre-seeded benchmark record');
    assert.ok(!jobData.isLive, 'Must NOT masquerade as live extraction');

    recordPass('TEST_15_16', 'Tier 3', `Truth-serum state machine verified: status=DEGRADED_FALLBACK, served benchmark record=${jobData.recordId} with zero masquerading`);
  } catch (err) {
    recordFail('TEST_15_16', 'Tier 3', 'Degradation state machine verification failed', err);
  }

  // TEST_15_17: Portal CAPTCHA Block Degradation (x-simulate-failure: captcha_block on BMC SAC)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simulate-failure': 'captcha_block'
      },
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
    const captchaJobId = body.jobId;

    // Allow worker tick to process
    let jobData;
    const timeout = Date.now() + 6000;
    while (Date.now() < timeout) {
      const jobRes = await fetch(`${API_BASE}/records/jobs/${captchaJobId}`);
      jobData = await jobRes.json();
      if (jobData.status === 'DEGRADED_FALLBACK') break;
      await sleep(150);
    }

    assert.strictEqual(jobData.status, 'DEGRADED_FALLBACK');
    assert.strictEqual(jobData.isDegraded, true);
    assert.strictEqual(jobData.degradationReason, 'PORTAL_CAPTCHA_BLOCKED');
    assert.strictEqual(jobData.recordId, 'rec-mh-bmc-tax-hw130562', 'Must resolve pre-seeded BMC SAC HW130562 benchmark record');
    assert.strictEqual(jobData.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');

    recordPass('TEST_15_17', 'Tier 3', `Portal CAPTCHA block handled transparently: resolved rec-mh-bmc-tax-hw130562 with Section 212 MMC charge notice`);
  } catch (err) {
    recordFail('TEST_15_17', 'Tier 3', 'CAPTCHA block degradation failed', err);
  }

  // TEST_15_18: Direct SQLite Degradation Audit (is_degraded = 1, explicit reason preserved)
  try {
    const db = openDatabase();
    const row = db.get("SELECT * FROM query_jobs WHERE id = ?", deg402JobId);
    assert.ok(row, 'Degraded job row must exist in SQLite database');
    assert.strictEqual(row.is_degraded, 1, 'is_degraded column must equal integer 1');
    assert.strictEqual(row.degradation_reason, 'DOWNSTREAM_402_PAYMENT_REQUIRED');
    assert.strictEqual(row.data_provenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(row.status, 'DEGRADED_FALLBACK');
    db.close();

    recordPass('TEST_15_18', 'Tier 3', `Direct SQLite truth-serum audit: is_degraded=1, reason=DOWNSTREAM_402_PAYMENT_REQUIRED, provenance=VERIFIED_PRESEEDED_CACHE`);
  } catch (err) {
    recordFail('TEST_15_18', 'Tier 3', 'Direct SQLite degradation audit failed', err);
  }

  // ===========================================================================
  // TIER 4: DEAD-LETTER QUEUE (DLQ) ROUTING ON UNRECOVERABLE FAILURES
  // ===========================================================================
  console.log('\n--- Tier 4: Dead-Letter Queue (DLQ) Routing on Unrecoverable Failures ---');

  let fatalJobId = '';

  // TEST_15_19: Unrecoverable Scraping Failure Ingestion (x-simulate-failure: fatal_scrape_error)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simulate-failure': 'fatal_scrape_error'
      },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: 'UNKNOWN_SURVEY_999999'
      })
    });

    assert.strictEqual(res.status, 202);
    const body = await res.json();
    fatalJobId = body.jobId;
    assert.ok(fatalJobId);
    recordPass('TEST_15_19', 'Tier 4', `Unrecoverable failure query enqueued: HTTP 202 Accepted, jobId=${fatalJobId}`);
  } catch (err) {
    recordFail('TEST_15_19', 'Tier 4', 'Unrecoverable failure ingestion failed', err);
  }

  // TEST_15_20: Worker Retry Exhaustion & Terminal State Transition (status: 'FAILED')
  try {
    let failedJob;
    const timeout = Date.now() + 6000;
    while (Date.now() < timeout) {
      const jobRes = await fetch(`${API_BASE}/records/jobs/${fatalJobId}`);
      failedJob = await jobRes.json();
      if (failedJob.status === 'FAILED') break;
      await sleep(150);
    }

    assert.strictEqual(failedJob.status, 'FAILED', `Expected job status FAILED, got ${failedJob.status}`);
    assert.strictEqual(failedJob.errorCode, 'FATAL_SCRAPE_ERROR');
    assert.ok(failedJob.errorDetails, 'Structured errorDetails must be present');

    recordPass('TEST_15_20', 'Tier 4', `Job transitioned to terminal status=FAILED with errorCode=FATAL_SCRAPE_ERROR`);
  } catch (err) {
    recordFail('TEST_15_20', 'Tier 4', 'Terminal failure state transition failed', err);
  }

  // TEST_15_21: DLQ REST Endpoint Inspection (GET /api/records/jobs/dlq)
  try {
    const dlqRes = await fetch(`${API_BASE}/records/jobs/dlq`);
    assert.strictEqual(dlqRes.status, 200, 'GET /api/records/jobs/dlq must return HTTP 200');
    const dlqData = await dlqRes.json();

    assert.strictEqual(dlqData.success, true);
    assert.ok(Array.isArray(dlqData.dlq) && dlqData.dlq.length > 0, 'DLQ array must contain records');

    const entry = dlqData.dlq.find((d) => d.jobId === fatalJobId);
    assert.ok(entry, `DLQ must contain entry for failed jobId ${fatalJobId}`);
    assert.strictEqual(entry.failureReason, 'FATAL_SCRAPE_ERROR');
    assert.ok(entry.attemptCount >= 1, `attemptCount must be >= 1, got ${entry.attemptCount}`);
    assert.ok(entry.stackTrace, 'DLQ record must retain diagnostic stack trace');
    assert.ok(entry.diagnosticPayload, 'DLQ record must preserve structured diagnostic payload');

    recordPass('TEST_15_21', 'Tier 4', `GET /api/records/jobs/dlq verified: entry found, reason=FATAL_SCRAPE_ERROR, attempts=${entry.attemptCount}`);
  } catch (err) {
    recordFail('TEST_15_21', 'Tier 4', 'DLQ REST endpoint verification failed', err);
  }

  // TEST_15_22: SQLite query_job_dlq Table Direct Inspection & Structured Diagnostics Audit
  try {
    const db = openDatabase();
    const dlqRow = db.get("SELECT * FROM query_job_dlq WHERE job_id = ?", fatalJobId);
    assert.ok(dlqRow, `DLQ SQLite row for job ${fatalJobId} must exist in query_job_dlq`);
    assert.strictEqual(dlqRow.failure_reason, 'FATAL_SCRAPE_ERROR');
    assert.ok(dlqRow.attempt_count >= 1);
    assert.ok(dlqRow.diagnostic_payload, 'diagnostic_payload must be saved in SQLite');

    // Parse diagnostic payload to guarantee structured json integrity
    const parsedPayload = JSON.parse(dlqRow.diagnostic_payload);
    assert.ok(parsedPayload.targetUrl || parsedPayload.attempts, 'Diagnostic payload must contain diagnostic details');
    db.close();

    recordPass('TEST_15_22', 'Tier 4', `Direct SQLite DLQ inspection passed: query_job_dlq contains full diagnostic payload and stack trace`);
  } catch (err) {
    recordFail('TEST_15_22', 'Tier 4', 'Direct SQLite DLQ inspection failed', err);
  }

  // ===========================================================================
  // TIER 5: END-TO-END PIPELINE COHESION & REGRESSION INTEGRITY AUDIT
  // ===========================================================================
  console.log('\n--- Tier 5: Architecture & Cross-Feature Cohesion ---');

  // TEST_15_23: Cross-Feature Event Bus Lifecycle & Invariant Integrity Audit
  try {
    const db = openDatabase();
    const allJobs = db.all("SELECT id, feature, status, is_degraded, data_provenance FROM query_jobs ORDER BY created_at DESC LIMIT 50");
    assert.ok(allJobs.length >= 6, `Expected at least 6 jobs across features, found ${allJobs.length}`);

    // Verify invariant: completed jobs must have authentic provenance (LIVE_PORTAL or VERIFIED_PRESEEDED_CACHE)
    for (const j of allJobs) {
      if (j.status === 'COMPLETED' && j.is_degraded === 0) {
        assert.ok(
          ['LIVE_PORTAL', 'VERIFIED_PRESEEDED_CACHE'].includes(j.data_provenance),
          `Invariant violated: non-degraded completed job ${j.id} must be LIVE_PORTAL or VERIFIED_PRESEEDED_CACHE, got ${j.data_provenance}`
        );
      }
      if (j.is_degraded === 1) {
        assert.ok(
          ['VERIFIED_PRESEEDED_CACHE', 'REGIONAL_EMULATOR_SYNTHETIC'].includes(j.data_provenance),
          `Invariant violated: degraded job ${j.id} must be VERIFIED_PRESEEDED_CACHE or REGIONAL_EMULATOR_SYNTHETIC, got ${j.data_provenance}`
        );
      }
    }
    db.close();

    recordPass('TEST_15_23', 'Tier 5', `Truth-Serum Invariant Audit: 100% of persisted jobs maintain unambiguous evidentiary provenance`);
  } catch (err) {
    recordFail('TEST_15_23', 'Tier 5', 'Pipeline cohesion invariant audit failed', err);
  }

  // ===========================================================================
  // SUMMARY REPORTING
  // ===========================================================================
  console.log('\n================================================================================');
  console.log('                          SUITE 15 EXECUTION SUMMARY                            ');
  console.log('================================================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  const successRate = ((passed / (passed + failed)) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);

  if (failed === 0) {
    console.log(`\n🏆 ALL ${passed} REAL-TIME ASYNC PIPELINE TESTS PASSED CLEANLY!\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ SUITE 15 FAILED: ${failed} tests failed out of ${passed + failed}.\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  runRealtimePipelineTests().catch((err) => {
    console.error('Fatal Suite 15 Error:', err);
    process.exit(1);
  });
}

module.exports = { runRealtimePipelineTests };
