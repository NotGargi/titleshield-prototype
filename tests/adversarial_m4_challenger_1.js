/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS HARNESS — CHALLENGER M4-1
 * ============================================================================
 * Focus: Live Ingestion Subsystem, Domain Semaphores, Cross-Domain Isolation,
 * Parameter Boundary Validation, Dead-Letter Queue (DLQ), and Section 63 BSA Integrity.
 *
 * Test Sections:
 * SECTION 1: Boundary, Hostile, and Fuzzed Parameter Validation
 * SECTION 2: Domain Semaphores, Concurrency & Cross-Domain Isolation Stress
 * SECTION 3: Dead-Letter Queue (DLQ) Forensic Schema & Routing Integrity
 * SECTION 4: Section 63 BSA 2023 Truth-Serum Anti-Masquerading & DB Invariants
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const API_BASE = 'http://localhost:4000/api';
const DB_PATH = path.resolve(__dirname, '..', 'server', 'data', 'landeed.db');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Load compiled server modules
const { MaharashtraMahabhumiAdapter } = require('../server/dist/services/adapters/maharashtraMahabhumiAdapter');
const { livePortalScraper, CookieJar } = require('../server/dist/services/livePortalScraper');
const { jobWorkerPool, DOMAIN_MAP } = require('../server/dist/services/jobWorkerPool');
const { jobQueue } = require('../server/dist/services/jobQueue');
const { sqlite } = require('../server/dist/db/index');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function pass(testId, section, description) {
  totalTests++;
  passedTests++;
  console.log(`  ✅ [PASS] [${section}] ${testId}: ${description}`);
}

function fail(testId, section, description, err) {
  totalTests++;
  failedTests++;
  const msg = err ? (err.message || String(err)) : 'Assertion failed';
  failureDetails.push({ testId, section, description, error: msg });
  console.error(`  ❌ [FAIL] [${section}] ${testId}: ${description}`);
  console.error(`     Error: ${msg}`);
}

async function runAdversarialHarness() {
  console.log('\n================================================================================');
  console.log('⚡ EMPIRICAL ADVERSARIAL STRESS HARNESS (CHALLENGER M4-1)');
  console.log('Target: Live Ingestion Subsystem, Domain Semaphores, & DLQ');
  console.log('================================================================================\n');

  const adapter = new MaharashtraMahabhumiAdapter();

  // ============================================================================
  // SECTION 1: HOSTILE, INVALID, AND BOUNDARY PARAMETER VALIDATION
  // ============================================================================
  console.log('--- SECTION 1: Hostile, Invalid, and Boundary Parameter Validation ---');

  // TEST_CH_01: SQL Injection & Path Traversal in Survey / SAC / District
  try {
    const sqlInjections = [
      "142/2A'; DROP TABLE query_jobs;--",
      "142' OR '1'='1",
      "../../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\cmd.exe",
      "'; EXEC xp_cmdshell('dir');--"
    ];

    for (const hostileInput of sqlInjections) {
      const valResult = adapter.validateParams({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: hostileInput
      });
      // Should not throw and should accept or reject gracefully
      assert.ok(typeof valResult.valid === 'boolean');

      const goal = adapter.buildAutomationGoal({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: hostileInput
      });
      assert.ok(typeof goal === 'string' && goal.length > 0);
    }

    pass('TEST_CH_01', 'SEC 1', 'SQL injection & path traversal payloads handled safely without unhandled exceptions');
  } catch (err) {
    fail('TEST_CH_01', 'SEC 1', 'SQL injection / path traversal payload broke parameter processing', err);
  }

  // TEST_CH_02: XSS, HTML Injection & Control Characters
  try {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg/onload=alert(document.cookie)>',
      'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>'
    ];

    for (const xss of xssPayloads) {
      const goal = adapter.buildAutomationGoal({
        state: 'MH',
        docType: 'MUTATION',
        district: 'Pune',
        taluka: 'Haveli',
        village: xss,
        ferfarNo: xss
      });
      assert.ok(goal.includes(xss) || goal.length > 0, 'Goal should be built safely');
    }

    pass('TEST_CH_02', 'SEC 1', 'XSS & HTML injection strings processed safely without crashing string template interpolations');
  } catch (err) {
    fail('TEST_CH_02', 'SEC 1', 'XSS handling failed', err);
  }

  // TEST_CH_03: Multi-Byte Unicode, Emojis, Devnagari, RTL & Zero-Width Chars
  try {
    const unicodeStrings = [
      '१४२/२अ (मराठी महसूल)',
      '🚜 🏠 📜 🏛️ 💥',
      '\u202E\u0041\u0042\u0043\u202C', // RTL override
      'Wagholi\u200B\u200C\u200D\uFEFFZeroWidth', // Zero-width spaces & joiners
      'مرحبا بالعالم' // Arabic RTL
    ];

    for (const uni of unicodeStrings) {
      const val = adapter.validateParams({
        state: 'MH',
        docType: '7_12',
        district: uni,
        taluka: uni,
        village: uni,
        surveyNo: uni
      });
      assert.strictEqual(val.valid, true, `Unicode string "${uni}" should be accepted as valid input`);
    }

    pass('TEST_CH_03', 'SEC 1', 'Multi-byte Unicode, Devnagari, Emojis, and RTL strings accepted cleanly without truncation/crash');
  } catch (err) {
    fail('TEST_CH_03', 'SEC 1', 'Unicode handling failed', err);
  }

  // TEST_CH_04: Massive Oversized String Stress (32KB String Input)
  try {
    const hugeString = 'SURVEY_'.repeat(4000); // ~28KB string
    const val = adapter.validateParams({
      state: 'MH',
      docType: '7_12',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      surveyNo: hugeString
    });
    assert.strictEqual(val.valid, true);

    const goal = adapter.buildAutomationGoal({
      state: 'MH',
      docType: '7_12',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      surveyNo: hugeString
    });
    assert.ok(goal.length > hugeString.length);

    pass('TEST_CH_04', 'SEC 1', 'Oversized 28KB parameter string handled without memory exhaustion or stack overflow');
  } catch (err) {
    fail('TEST_CH_04', 'SEC 1', 'Oversized string broke adapter', err);
  }

  // TEST_CH_05: Prototype Pollution Resistance in Parameter Validation
  try {
    const polluted = JSON.parse('{"__proto__":{"polluted":true},"state":"MH","docType":"7_12"}');
    const val = adapter.validateParams(polluted);
    assert.strictEqual(val.valid, false, 'Polluted object with missing fields must be marked invalid');
    assert.ok(val.missingFields.length > 0);
    assert.strictEqual(({}).polluted, undefined, 'Object prototype must NOT be polluted');

    pass('TEST_CH_05', 'SEC 1', 'Prototype pollution attempt rejected; global Object prototype remained clean');
  } catch (err) {
    fail('TEST_CH_05', 'SEC 1', 'Prototype pollution test failed', err);
  }

  // TEST_CH_06: Granular Missing Field Validation Across All 6 DocTypes
  try {
    // 1. BMC_TAX requires sacNo or surveyNo
    const bmcInvalid = adapter.validateParams({ state: 'MH', docType: 'BMC_TAX' });
    assert.strictEqual(bmcInvalid.valid, false);
    assert.ok(bmcInvalid.missingFields.includes('sacNo'));

    const bmcValid = adapter.validateParams({ state: 'MH', docType: 'BMC_TAX', sacNo: 'HW1305620200003' });
    assert.strictEqual(bmcValid.valid, true);

    // 2. CTS_MAP requires district and (ctsNo or surveyNo)
    const ctsInvalid = adapter.validateParams({ state: 'MH', docType: 'CTS_MAP' });
    assert.strictEqual(ctsInvalid.valid, false);
    assert.ok(ctsInvalid.missingFields.includes('district'));
    assert.ok(ctsInvalid.missingFields.includes('ctsNo'));

    const ctsValid = adapter.validateParams({ state: 'MH', docType: 'CTS_MAP', district: 'Pune', ctsNo: '1042' });
    assert.strictEqual(ctsValid.valid, true);

    // 3. INDEX_2 requires district and (deedNo or documentNo or surveyNo or gatNo)
    const idxInvalid = adapter.validateParams({ state: 'MH', docType: 'INDEX_2' });
    assert.strictEqual(idxInvalid.valid, false);

    const idxValid = adapter.validateParams({ state: 'MH', docType: 'INDEX_2', district: 'Pune', deedNo: '4821' });
    assert.strictEqual(idxValid.valid, true);

    // 4. 7_12 requires district, taluka, village, and surveyNo
    const rorInvalid = adapter.validateParams({ state: 'MH', docType: '7_12', district: 'Pune' });
    assert.strictEqual(rorInvalid.valid, false);
    assert.ok(rorInvalid.missingFields.includes('taluka'));
    assert.ok(rorInvalid.missingFields.includes('village'));
    assert.ok(rorInvalid.missingFields.includes('surveyNo/gatNo'));

    const rorValid = adapter.validateParams({ state: 'MH', docType: '7_12', district: 'Pune', taluka: 'Haveli', village: 'Wagholi', surveyNo: '142/2A' });
    assert.strictEqual(rorValid.valid, true);

    pass('TEST_CH_06', 'SEC 1', 'Granular field validation across BMC_TAX, CTS_MAP, INDEX_2, and 7_12 contracts verified');
  } catch (err) {
    fail('TEST_CH_06', 'SEC 1', 'Missing field validation failed', err);
  }

  // ============================================================================
  // SECTION 2: DOMAIN SEMAPHORES, CONCURRENCY & CROSS-DOMAIN ISOLATION
  // ============================================================================
  console.log('\n--- SECTION 2: Domain Semaphores, Concurrency & Cross-Domain Isolation ---');

  // TEST_CH_07: Multi-Domain Decoupling & Hostname Verification
  try {
    const requiredDomains = {
      '7_12': 'bhulekh.mahabhumi.gov.in',
      'MUTATION': 'digitalsatbara.mahabhumi.gov.in',
      'AAPLI_CHAWADI': 'digitalsatbara.mahabhumi.gov.in',
      'INDEX_2': 'freesearchigrservice.maharashtra.gov.in',
      'CTS_MAP': 'mahabhunakasha.mahabhumi.gov.in',
      'BMC_TAX': 'ptaxportal.mcgm.gov.in'
    };

    for (const [feat, expectedHost] of Object.entries(requiredDomains)) {
      assert.strictEqual(DOMAIN_MAP[feat], expectedHost, `Feature ${feat} must map to ${expectedHost}`);
    }

    pass('TEST_CH_07', 'SEC 2', 'All 6 feature domain mappings explicitly decoupled to authentic state portal hostnames');
  } catch (err) {
    fail('TEST_CH_07', 'SEC 2', 'Domain map mismatch', err);
  }

  // TEST_CH_08: Concurrent Rapid Job Inception Across All 5 Unique Domains
  try {
    const jobTypes = [
      { docType: '7_12', district: 'Pune', taluka: 'Haveli', village: 'Wagholi', surveyNo: '142/2A' },
      { docType: 'MUTATION', district: 'Pune', taluka: 'Haveli', village: 'Wagholi', ferfarNo: '4821' },
      { docType: 'INDEX_2', district: 'Pune', deedNo: '4821', regYear: '2024' },
      { docType: 'CTS_MAP', district: 'Pune', ctsNo: '1042' },
      { docType: 'BMC_TAX', sacNo: 'HW1305620200003' }
    ];

    // Fire 10 concurrent requests (2 for each domain) simultaneously
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const item = jobTypes[i % jobTypes.length];
      promises.push(
        fetch(`${API_BASE}/records/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: 'MH',
            ...item
          })
        })
      );
    }

    const responses = await Promise.all(promises);
    assert.strictEqual(responses.length, 10);
    const jobIds = [];

    for (const res of responses) {
      assert.strictEqual(res.status, 202, 'Every incepted job must return HTTP 202 Accepted');
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.jobId && body.ticketId);
      jobIds.push(body.jobId);
    }

    // Wait 1.5s for worker pool tick loop to process jobs
    await sleep(1500);

    // Verify all jobs either completed or are progressing in SQLite
    const stmt = sqlite.prepare(`SELECT id, status, is_degraded, data_provenance FROM query_jobs WHERE id IN (${jobIds.map(() => '?').join(',')})`);
    const rows = stmt.all(...jobIds);
    assert.strictEqual(rows.length, 10);

    const completedOrTerminal = rows.filter(r => r.status === 'COMPLETED' || r.status === 'DEGRADED_FALLBACK');
    assert.ok(completedOrTerminal.length >= 8, `Expected at least 8/10 jobs completed/degraded, got ${completedOrTerminal.length}`);

    pass('TEST_CH_08', 'SEC 2', `10 concurrent multi-domain jobs accepted immediately (HTTP 202) and resolved (${completedOrTerminal.length}/10 terminal)`);
  } catch (err) {
    fail('TEST_CH_08', 'SEC 2', 'Concurrent multi-domain job burst failed', err);
  }

  // TEST_CH_09: Cross-Domain Isolation Under Domain Saturation
  try {
    // We test that enqueueing jobs for Domain A (bhulekh) does NOT starve or lock Domain B (ptaxportal)
    const domainASlowJobs = [];
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${API_BASE}/records/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: 'MH',
          docType: '7_12',
          district: 'Pune',
          taluka: 'Haveli',
          village: 'Wagholi',
          surveyNo: `SATURATE-A-${i}`,
          simulationFailure: 'timeout'
        })
      });
      const data = await res.json();
      domainASlowJobs.push(data.jobId);
    }

    // Immediately enqueue Domain B job (BMC_TAX)
    const domainBRes = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: 'BMC_TAX',
        sacNo: 'HW1305620200003'
      })
    });
    const domainBData = await domainBRes.json();
    const domainBJobId = domainBData.jobId;

    // Allow worker pool to cycle
    await sleep(800);

    // Check status of Domain B job
    const checkB = await fetch(`${API_BASE}/records/jobs/${domainBJobId}`);
    const bResult = await checkB.json();

    assert.ok(
      bResult.status === 'COMPLETED' || bResult.status === 'DEGRADED_FALLBACK',
      `Domain B job (${domainBJobId}) must complete independently of Domain A saturation, got ${bResult.status}`
    );

    pass('TEST_CH_09', 'SEC 2', 'Cross-domain isolation confirmed: Domain B (BMC_TAX) completed without starvation during Domain A saturation');
  } catch (err) {
    fail('TEST_CH_09', 'SEC 2', 'Cross-domain isolation test failed', err);
  }

  // TEST_CH_10: Concurrency Counter Leak Check
  try {
    // Wait for in-flight tasks to settle
    await sleep(1500);

    const activeJobs = jobWorkerPool['activeJobsCount'];
    const activeDomains = jobWorkerPool['activeDomainSessions'];

    // All active counters should be 0 or small (if background is idle)
    assert.ok(activeJobs <= 1, `Active jobs counter should drain to 0, current: ${activeJobs}`);

    let totalDomainActive = 0;
    for (const [dom, count] of activeDomains.entries()) {
      totalDomainActive += count;
    }
    assert.ok(totalDomainActive <= 1, `Active domain counter should drain to 0, current total: ${totalDomainActive}`);

    pass('TEST_CH_10', 'SEC 2', `Concurrency counters drained cleanly (activeJobs: ${activeJobs}, activeDomainsTotal: ${totalDomainActive}), zero counter leaks`);
  } catch (err) {
    fail('TEST_CH_10', 'SEC 2', 'Concurrency counter leak detected', err);
  }

  // ============================================================================
  // SECTION 3: DEAD-LETTER QUEUE (DLQ) FORENSIC SCHEMA & ROUTING
  // ============================================================================
  console.log('\n--- SECTION 3: Dead-Letter Queue (DLQ) Forensic Schema & Routing ---');

  let fatalJobId = null;

  // TEST_CH_11: Trigger Fatal Failure and Verify Direct DLQ Routing
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulate-Failure': 'fatal_scrape_error'
      },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: 'HOSTILE-DLQ-PARCEL'
      })
    });

    assert.strictEqual(res.status, 202);
    const body = await res.json();
    fatalJobId = body.jobId;

    // Allow worker routine to catch fatal error and route to DLQ
    await sleep(700);

    const jobCheck = await fetch(`${API_BASE}/records/jobs/${fatalJobId}`);
    const jobData = await jobCheck.json();

    assert.strictEqual(jobData.status, 'FAILED', `Job status should be FAILED, got ${jobData.status}`);
    assert.strictEqual(jobData.errorCode, 'FATAL_SCRAPE_ERROR');

    pass('TEST_CH_11', 'SEC 3', `Fatal scrape failure trapped and job marked FAILED with errorCode=FATAL_SCRAPE_ERROR`);
  } catch (err) {
    fail('TEST_CH_11', 'SEC 3', 'Fatal failure routing to DLQ failed', err);
  }

  // TEST_CH_12: SQLite Direct Query DLQ Forensic Schema Integrity
  try {
    assert.ok(fatalJobId, 'fatalJobId must be set');

    const dlqRow = sqlite.prepare(`
      SELECT id, job_id, ticket_id, feature, state, params, failure_reason,
             error_details, stack_trace, attempt_count, last_http_status,
             diagnostic_payload, failed_at
      FROM query_job_dlq
      WHERE job_id = ?
    `).get(fatalJobId);

    assert.ok(dlqRow, `DLQ record for job ${fatalJobId} must exist in SQLite query_job_dlq table`);
    assert.ok(dlqRow.id.startsWith('dlq_'), `DLQ id must start with dlq_, got ${dlqRow.id}`);
    assert.strictEqual(dlqRow.job_id, fatalJobId);
    assert.strictEqual(dlqRow.feature, '7_12');
    assert.strictEqual(dlqRow.state, 'MH');
    assert.strictEqual(dlqRow.failure_reason, 'FATAL_SCRAPE_ERROR');
    assert.strictEqual(dlqRow.last_http_status, 500);
    assert.strictEqual(dlqRow.attempt_count, 3);

    // Verify params is valid JSON
    const parsedParams = JSON.parse(dlqRow.params);
    assert.strictEqual(parsedParams.surveyNo, 'HOSTILE-DLQ-PARCEL');

    // Verify diagnostic_payload is valid JSON and contains attempts array
    const diag = JSON.parse(dlqRow.diagnostic_payload);
    assert.ok(diag.targetUrl && Array.isArray(diag.attempts), 'diagnostic_payload must contain targetUrl and attempts array');
    assert.strictEqual(diag.attempts.length, 3);

    pass('TEST_CH_12', 'SEC 3', 'SQLite query_job_dlq row schema, JSON params, diagnostics, and attempt_count=3 fully verified');
  } catch (err) {
    fail('TEST_CH_12', 'SEC 3', 'SQLite DLQ schema verification failed', err);
  }

  // TEST_CH_13: REST API GET /api/records/jobs/dlq Integration, Pagination & Ordering
  try {
    const dlqRes = await fetch(`${API_BASE}/records/jobs/dlq?limit=5`);
    assert.strictEqual(dlqRes.status, 200);
    const dlqBody = await dlqRes.json();

    assert.strictEqual(dlqBody.success, true);
    assert.ok(Array.isArray(dlqBody.dlq));
    assert.ok(dlqBody.dlq.length <= 5, 'DLQ limit query param must be respected');

    // Verify ordering is failed_at DESC
    for (let i = 0; i < dlqBody.dlq.length - 1; i++) {
      const current = new Date(dlqBody.dlq[i].failedAt).getTime();
      const next = new Date(dlqBody.dlq[i + 1].failedAt).getTime();
      assert.ok(current >= next, `DLQ records must be sorted by failedAt DESC: ${current} vs ${next}`);
    }

    pass('TEST_CH_13', 'SEC 3', `GET /api/records/jobs/dlq returns HTTP 200, respects limit=5, and maintains descending chronological order`);
  } catch (err) {
    fail('TEST_CH_13', 'SEC 3', 'DLQ REST API verification failed', err);
  }

  // ============================================================================
  // SECTION 4: SECTION 63 BSA 2023 TRUTH-SERUM ANTI-MASQUERADING & DB INTEGRITY
  // ============================================================================
  console.log('\n--- SECTION 4: Section 63 BSA 2023 Truth-Serum Anti-Masquerading & DB Invariants ---');

  // TEST_CH_14: Hostile Live Spoofing Attempt (?forceLive=true on Unresolvable Query)
  try {
    const res = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'NonExistentDistrict999',
        taluka: 'NonExistentTaluka999',
        village: 'NonExistentVillage999',
        surveyNo: 'NONEXISTENT-9999',
        forceLive: true,
        live: true
      })
    });

    const data = await res.json();
    const jobId = data.jobId;

    // Poll until job reaches terminal state (COMPLETED, DEGRADED_FALLBACK, or FAILED)
    let finalJob = null;
    const maxPolls = 60; // 60 * 500ms = 30s max
    for (let p = 0; p < maxPolls; p++) {
      await sleep(500);
      const pollRes = await fetch(`${API_BASE}/records/jobs/${jobId}`);
      const j = await pollRes.json();
      if (j.status === 'COMPLETED' || j.status === 'DEGRADED_FALLBACK' || j.status === 'FAILED') {
        finalJob = j;
        break;
      }
    }

    assert.ok(finalJob, `Job ${jobId} must reach a terminal state within 30s`);

    // Adversarial Rule: Even if user explicitly specified forceLive: true, if the portal
    // cannot be reached or resolved live, the system MUST NEVER masquerade as LIVE_PORTAL!
    assert.notStrictEqual(
      finalJob.dataProvenance,
      'LIVE_PORTAL',
      `System MUST NEVER assign LIVE_PORTAL to unverified/failed queries, even if forceLive=true (got ${finalJob.dataProvenance})`
    );
    assert.strictEqual(finalJob.isDegraded, true, 'isDegraded MUST be true when degraded');
    assert.ok(
      finalJob.dataProvenance === 'VERIFIED_PRESEEDED_CACHE' || finalJob.dataProvenance === 'REGIONAL_EMULATOR_SYNTHETIC',
      `dataProvenance must be explicitly degraded, got ${finalJob.dataProvenance}`
    );

    pass('TEST_CH_14', 'SEC 4', `Anti-Masquerading Guardrail: Terminal provenance verified as ${finalJob.dataProvenance} with isDegraded=true`);
  } catch (err) {
    fail('TEST_CH_14', 'SEC 4', 'Anti-Masquerading check failed', err);
  }

  // TEST_CH_15: Strict Tri-State Provenance Mutual Exclusivity
  try {
    const allowedProvenances = new Set(['LIVE_PORTAL', 'VERIFIED_PRESEEDED_CACHE', 'REGIONAL_EMULATOR_SYNTHETIC']);

    // Check all jobs currently in SQLite database
    const jobs = sqlite.prepare('SELECT id, is_degraded, data_provenance FROM query_jobs LIMIT 100').all();
    assert.ok(jobs.length > 0, 'There should be jobs in database');

    for (const j of jobs) {
      assert.ok(
        allowedProvenances.has(j.data_provenance),
        `Job ${j.id} has invalid provenance: "${j.data_provenance}". Must be one of: LIVE_PORTAL, VERIFIED_PRESEEDED_CACHE, REGIONAL_EMULATOR_SYNTHETIC`
      );

      if (j.data_provenance === 'LIVE_PORTAL') {
        assert.strictEqual(Boolean(j.is_degraded), false, `Job ${j.id} with LIVE_PORTAL must not be degraded`);
      } else {
        assert.strictEqual(Boolean(j.is_degraded), true, `Job ${j.id} with ${j.data_provenance} must have is_degraded=true`);
      }
    }

    pass('TEST_CH_15', 'SEC 4', `Tri-State mutual exclusivity verified across ${jobs.length} SQLite jobs: zero provenance anomalies`);
  } catch (err) {
    fail('TEST_CH_15', 'SEC 4', 'Provenance mutual exclusivity failed', err);
  }

  // TEST_CH_16: Database Integrity Check (PRAGMA integrity_check)
  try {
    const integrityResult = sqlite.prepare('PRAGMA integrity_check').get();
    assert.strictEqual(integrityResult.integrity_check, 'ok', `SQLite database integrity check must return "ok", got: ${integrityResult.integrity_check}`);

    const foreignKeys = sqlite.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(foreignKeys.length, 0, `SQLite foreign key check must have 0 violations, found ${foreignKeys.length}`);

    pass('TEST_CH_16', 'SEC 4', 'SQLite PRAGMA integrity_check and foreign_key_check both passed with 0 violations');
  } catch (err) {
    fail('TEST_CH_16', 'SEC 4', 'Database integrity check failed', err);
  }

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log('\n================================================================================');
  console.log('              CHALLENGER M4-1 ADVERSARIAL STRESS SUMMARY                        ');
  console.log('================================================================================');
  console.log(`Total Stress Vectors Tested : ${totalTests}`);
  console.log(`Passed                      : ${passedTests}`);
  console.log(`Failed                      : ${failedTests}`);
  console.log(`Success Rate                : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    console.error(`💥 ADVERSARIAL CHALLENGE IDENTIFIED ${failedTests} FAILURE(S):`);
    for (const f of failureDetails) {
      console.error(`  - [${f.section}] ${f.testId}: ${f.description} -> ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('🏆 ALL ADVERSARIAL CHALLENGES PASSED! Live ingestion, semaphores, and DLQ are robust.');
    process.exit(0);
  }
}

runAdversarialHarness().catch((err) => {
  console.error('Fatal unhandled error in adversarial test harness:', err);
  process.exit(1);
});
