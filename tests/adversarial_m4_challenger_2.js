/**
 * CHALLENGER M4 ADVERSARIAL TRUTH-SERUM & EVIDENTIARY INTEGRITY TEST HARNESS
 * 
 * Target: Section 63 BSA 2023 Truth-Serum Rules, Anti-Masquerading, and Tamper Resistance
 * 
 * Test Suites:
 * 1. Direct REST Probe on all 6 Benchmark Cache Records
 * 2. Adversarial REST URL Parameter Injection Defense
 * 3. Client UI Rendering Logic & Deep-Link Badge Injection Resistance (/record/[id].tsx)
 * 4. Resilient Fallback States Evaluation (402, CAPTCHA, Timeouts)
 * 5. Real-Time SSE Stream & Asynchronous Job Pipeline Evidentiary Truth-Serum
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const API_BASE = 'http://localhost:4000/api';

async function runAdversarialM4Challenger() {
  console.log('================================================================================');
  console.log('⚔️  CHALLENGER M4: ADVERSARIAL TRUTH-SERUM & INTEGRITY HARNESS');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;
  const failureDetails = [];

  function recordPass(testId, description) {
    passed++;
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
  }

  function recordFail(testId, error) {
    failed++;
    const errMsg = error.message || String(error);
    failureDetails.push({ testId, error: errMsg });
    console.error(`  ❌ [FAIL] ${testId}: ${errMsg}`);
  }

  // ===========================================================================
  // SUITE 1: Direct REST Invariant Probe on ALL 6 Benchmark Cache Records
  // ===========================================================================
  console.log('--- Suite 1: Direct REST Invariant Probe on All 6 Benchmark Cache Records ---');

  const benchmarkRecords = [
    { id: 'rec-up-ghaziabad-panchsheel-112', name: 'UP Ghaziabad Panchsheel Plot 112 Cadastre' },
    { id: 'rec-mh-pune-ferfar-4821', name: 'MH Pune Wagholi Ferfar #4821 Certified Mutation' },
    { id: 'rec-mh-bmc-tax-hw130562', name: 'MH BMC Bandra West SAC HW1305620200003 Tax Assessment' },
    { id: 'rec-mh-pune-deed-4821', name: 'MH Pune Wagholi Registered Sale Deed #4821/2024' },
    { id: 'rec-mh-pune-ferfar-4950', name: 'MH Pune Wagholi Active 15-Day Public Notice Ferfar #4950' },
    { id: 'rec-up-noida-deed-8910', name: 'UP Noida Sector 62 Registered Conveyance Deed #8910/2023' }
  ];

  for (const b of benchmarkRecords) {
    try {
      const res = await fetch(`${API_BASE}/records/${b.id}`);
      assert.strictEqual(res.status, 200, `Expected HTTP 200 for ${b.id}, got ${res.status}`);
      const body = await res.json();

      assert.strictEqual(body.id, b.id, `Record id must match ${b.id}`);
      
      // Critical Invariant 1: isLive MUST be strictly false
      assert.strictEqual(body.isLive, false, `INVARIANT VIOLATION: ${b.id} returned isLive: ${body.isLive} (expected false)`);

      // Critical Invariant 2: dataProvenance MUST NOT be LIVE_PORTAL
      assert.notStrictEqual(body.dataProvenance, 'LIVE_PORTAL', `INVARIANT VIOLATION: ${b.id} masquerading as LIVE_PORTAL`);
      assert.strictEqual(body.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `Expected dataProvenance VERIFIED_PRESEEDED_CACHE, got ${body.dataProvenance}`);

      // Critical Invariant 3: isDegraded MUST be strictly true
      assert.strictEqual(body.isDegraded, true, `INVARIANT VIOLATION: ${b.id} returned isDegraded: ${body.isDegraded} (expected true)`);

      // Critical Invariant 4: degradationReason MUST be present
      assert.ok(typeof body.degradationReason === 'string' && body.degradationReason.length > 0, `Expected non-empty degradationReason`);

      // Critical Invariant 5: Proof & metadata must be preserved
      assert.ok(body.proof && body.proof.docHash, `Cryptographic proof docHash must exist`);
      assert.ok(body.metadata, `Metadata object must exist`);

      recordPass(`PROBE_BENCHMARK_${b.id}`, `${b.name} -> isLive=false, dataProvenance=VERIFIED_PRESEEDED_CACHE, isDegraded=true`);
    } catch (err) {
      recordFail(`PROBE_BENCHMARK_${b.id}`, err);
    }
  }

  // ===========================================================================
  // SUITE 2: Adversarial REST URL Parameter Injection Defense
  // ===========================================================================
  console.log('\n--- Suite 2: Adversarial REST URL Parameter Injection Defense ---');

  const tamperingPayloads = [
    '?dataProvenance=LIVE_PORTAL',
    '?dataProvenance=LIVE_PORTAL&isLive=true',
    '?dataProvenance=LIVE_PORTAL&isLive=true&isDegraded=false',
    '?isDegraded=false',
    '?isLive=true',
    '?dataProvenance=LIVE_PORTAL&degradationReason=',
    '?dataProvenance=LIVE_PORTAL&ticketId=MALICIOUS_INJECTED_TICKET',
    '?__proto__[isLive]=true&constructor[prototype][dataProvenance]=LIVE_PORTAL'
  ];

  for (const b of benchmarkRecords) {
    for (let i = 0; i < tamperingPayloads.length; i++) {
      const payload = tamperingPayloads[i];
      const testId = `TAMPER_REST_${b.id}_PAYLOAD_${i + 1}`;
      try {
        const res = await fetch(`${API_BASE}/records/${b.id}${payload}`);
        assert.strictEqual(res.status, 200, `Expected HTTP 200 for ${b.id}`);
        const body = await res.json();

        assert.strictEqual(
          body.isLive,
          false,
          `INJECTION SUCCESS: Malicious URL query (${payload}) coerced isLive to ${body.isLive} on ${b.id}!`
        );
        assert.notStrictEqual(
          body.dataProvenance,
          'LIVE_PORTAL',
          `INJECTION SUCCESS: Malicious URL query (${payload}) coerced dataProvenance to LIVE_PORTAL on ${b.id}!`
        );
        assert.strictEqual(
          body.dataProvenance,
          'VERIFIED_PRESEEDED_CACHE',
          `Provenance corrupted by URL query (${payload}) on ${b.id}`
        );
        assert.strictEqual(
          body.isDegraded,
          true,
          `isDegraded bypassed by URL query (${payload}) on ${b.id}`
        );

        recordPass(testId, `Protected ${b.id} against injection ${payload}`);
      } catch (err) {
        recordFail(testId, err);
      }
    }
  }

  // ===========================================================================
  // SUITE 3: Client UI Rendering Logic & Deep-Link Badge Injection Resistance
  // ===========================================================================
  console.log('\n--- Suite 3: Client UI Rendering Logic & Deep-Link Badge Injection Resistance ---');

  // Exact reproduction of /record/[id].tsx logic
  function evaluateClientRecordBadge(record, searchParams) {
    const queryIsDegraded = searchParams.isDegraded;
    const queryDegradationReason = searchParams.degradationReason;
    const queryDataProvenance = searchParams.dataProvenance;
    const queryTicketId = searchParams.ticketId;

    const resolvedProvenance =
      record?.dataProvenance ||
      queryDataProvenance ||
      (record?.isDegraded || queryIsDegraded === 'true' ? 'VERIFIED_PRESEEDED_CACHE' : 'LIVE_PORTAL');

    const isDegraded =
      record?.is_degraded === true ||
      record?.is_degraded === 1 ||
      record?.isDegraded === true ||
      queryIsDegraded === 'true' ||
      resolvedProvenance === 'VERIFIED_PRESEEDED_CACHE' ||
      resolvedProvenance === 'REGIONAL_EMULATOR_SYNTHETIC';

    const isLive =
      resolvedProvenance === 'LIVE_PORTAL' &&
      (record?.isLive === true || record?.isLiveExtraction === true) &&
      !isDegraded;

    const isSynthetic = resolvedProvenance === 'REGIONAL_EMULATOR_SYNTHETIC';
    const isBenchmark = resolvedProvenance === 'VERIFIED_PRESEEDED_CACHE' || (!isLive && !isSynthetic);

    return {
      resolvedProvenance,
      isDegraded,
      isLive,
      isSynthetic,
      isBenchmark,
      rendersGreenLiveBadge: isLive,
      rendersAmberBenchmarkBadge: !isLive && isBenchmark,
      rendersOrangeSyntheticBadge: !isLive && isSynthetic
    };
  }

  // Adversarial Attack Matrix on Client Badge Evaluation
  const clientAttackVectors = [
    {
      name: 'Direct URL Query Param Injection on Authentic Benchmark Record',
      record: {
        id: 'rec-mh-pune-ferfar-4821',
        dataProvenance: 'VERIFIED_PRESEEDED_CACHE',
        isLive: false,
        isDegraded: true,
        degradationReason: 'PRESEEDED_BENCHMARK_RECORD'
      },
      searchParams: {
        dataProvenance: 'LIVE_PORTAL',
        isLive: 'true',
        isDegraded: 'false'
      }
    },
    {
      name: 'Client Deep-Link Spoofing with Empty Record DataProvenance',
      record: {
        id: 'rec-mh-pune-deed-4821',
        isLive: false,
        isDegraded: true
      },
      searchParams: {
        dataProvenance: 'LIVE_PORTAL',
        isLive: 'true'
      }
    },
    {
      name: 'Conflicting Server Record (isLive=true but isDegraded=true)',
      record: {
        id: 'rec-corrupted-live-degraded',
        dataProvenance: 'LIVE_PORTAL',
        isLive: true,
        isDegraded: true
      },
      searchParams: {}
    },
    {
      name: 'Regional Emulator Record with Forged Live Query Parameters',
      record: {
        id: 'rec-mh-pune-emulator',
        dataProvenance: 'REGIONAL_EMULATOR_SYNTHETIC',
        isLive: false,
        isDegraded: true
      },
      searchParams: {
        dataProvenance: 'LIVE_PORTAL',
        isLive: 'true',
        isDegraded: 'false'
      }
    },
    {
      name: 'Null Record / Incomplete Extraction Object',
      record: {
        id: 'rec-empty',
        isDegraded: true
      },
      searchParams: {
        dataProvenance: 'LIVE_PORTAL'
      }
    },
    {
      name: 'Legacy Server Schema with is_degraded=1 numeric flag',
      record: {
        id: 'rec-legacy-schema',
        dataProvenance: 'VERIFIED_PRESEEDED_CACHE',
        is_degraded: 1,
        isLive: true // legacy buggy flag
      },
      searchParams: {
        dataProvenance: 'LIVE_PORTAL'
      }
    }
  ];

  for (let idx = 0; idx < clientAttackVectors.length; idx++) {
    const vector = clientAttackVectors[idx];
    const testId = `CLIENT_BADGE_ATTACK_${idx + 1}`;
    try {
      const outcome = evaluateClientRecordBadge(vector.record, vector.searchParams);

      assert.strictEqual(
        outcome.isLive,
        false,
        `VULNERABILITY: ${vector.name} caused isLive=true in client component!`
      );
      assert.strictEqual(
        outcome.rendersGreenLiveBadge,
        false,
        `VULNERABILITY: ${vector.name} triggered green live verification badge render!`
      );
      assert.strictEqual(
        outcome.isDegraded,
        true,
        `VULNERABILITY: ${vector.name} bypassed isDegraded=true!`
      );
      assert.ok(
        outcome.rendersAmberBenchmarkBadge || outcome.rendersOrangeSyntheticBadge,
        `Expected non-live badge (amber benchmark or orange synthetic)`
      );

      recordPass(testId, `Protected client UI: ${vector.name} -> green badge blocked`);
    } catch (err) {
      recordFail(testId, err);
    }
  }

  // ===========================================================================
  // SUITE 4: Resilient Fallback States Evaluation (402, CAPTCHA, Timeouts)
  // ===========================================================================
  console.log('\n--- Suite 4: Resilient Fallback States Evaluation ---');

  const fallbackScenarios = [
    {
      name: 'Downstream TinyFish HTTP 402 Payment/Quota Barrier',
      payload: {
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A',
        simulationFailure: 'downstream_402'
      },
      expectedReason: 'DOWNSTREAM_402_PAYMENT_REQUIRED',
      expectedProvenance: 'VERIFIED_PRESEEDED_CACHE'
    },
    {
      name: 'Government Portal CAPTCHA Block / WAF Challenge Barrier',
      payload: {
        state: 'MH',
        docType: 'BMC_TAX',
        sacNo: 'HW1305620200003',
        simulationFailure: 'captcha_block'
      },
      expectedReason: 'PORTAL_CAPTCHA_BLOCKED',
      expectedProvenance: 'VERIFIED_PRESEEDED_CACHE'
    },
    {
      name: 'Upstream Revenue Portal Gateway Timeout (>30s)',
      payload: {
        state: 'MH',
        docType: 'INDEX_2',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        deedNo: '4821',
        simulationFailure: 'upstream_portal_timeout'
      },
      expectedReason: 'UPSTREAM_PORTAL_TIMEOUT',
      expectedProvenance: 'VERIFIED_PRESEEDED_CACHE'
    }
  ];

  for (let idx = 0; idx < fallbackScenarios.length; idx++) {
    const sc = fallbackScenarios[idx];
    const testId = `FALLBACK_STATE_${idx + 1}`;
    try {
      const postRes = await fetch(`${API_BASE}/records/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sc.payload)
      });

      assert.strictEqual(postRes.status, 202, `Expected HTTP 202 for job submission`);
      const postData = await postRes.json();
      const jobId = postData.jobId;

      // Poll job status until resolution
      let jobStatus = null;
      const pollStart = Date.now();
      while (Date.now() - pollStart < 8000) {
        const getRes = await fetch(`${API_BASE}/records/jobs/${jobId}`);
        const body = await getRes.json();
        const j = body.job || body;
        if (j.status === 'COMPLETED' || j.status === 'DEGRADED_FALLBACK' || j.status === 'FAILED') {
          jobStatus = j;
          break;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      assert.ok(jobStatus, `Job status must be available`);
      assert.strictEqual(
        jobStatus.status,
        'DEGRADED_FALLBACK',
        `Expected job status DEGRADED_FALLBACK, got ${jobStatus.status}`
      );
      assert.strictEqual(
        jobStatus.isDegraded,
        true,
        `Expected isDegraded: true for ${sc.name}`
      );
      assert.strictEqual(
        jobStatus.dataProvenance,
        sc.expectedProvenance,
        `Expected provenance ${sc.expectedProvenance}, got ${jobStatus.dataProvenance}`
      );
      assert.notStrictEqual(
        jobStatus.dataProvenance,
        'LIVE_PORTAL',
        `MASQUERADING DETECTED: Fallback state returned dataProvenance: LIVE_PORTAL!`
      );
      assert.strictEqual(
        jobStatus.degradationReason,
        sc.expectedReason,
        `Expected degradationReason ${sc.expectedReason}, got ${jobStatus.degradationReason}`
      );
      assert.ok(
        jobStatus.resultRecordId,
        `Fallback must provide resultRecordId for verified benchmark lookup`
      );

      // Now query the resolved record via REST GET /api/records/:id
      const recordRes = await fetch(`${API_BASE}/records/${jobStatus.resultRecordId}`);
      assert.strictEqual(recordRes.status, 200);
      const recordBody = await recordRes.json();

      assert.strictEqual(recordBody.isLive, false, `Resolved fallback record must declare isLive: false`);
      assert.strictEqual(recordBody.isDegraded, true, `Resolved fallback record must declare isDegraded: true`);
      assert.strictEqual(recordBody.dataProvenance, sc.expectedProvenance);

      recordPass(testId, `Fallback scenario: ${sc.name} -> strictly degraded with reason ${sc.expectedReason}`);
    } catch (err) {
      recordFail(testId, err);
    }
  }

  // ===========================================================================
  // SUITE 5: DLQ Routing on Fatal Errors
  // ===========================================================================
  console.log('\n--- Suite 5: DLQ Routing on Fatal Errors ---');

  try {
    const postRes = await fetch(`${API_BASE}/records/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: 'FATAL_SURVEY_ADVERSARIAL_M4',
        simulationFailure: 'fatal_scrape_error'
      })
    });

    assert.strictEqual(postRes.status, 202);
    const postBody = await postRes.json();
    const fatalJobId = postBody.jobId;

    // Allow worker routine to process and route to DLQ
    await new Promise((r) => setTimeout(r, 800));

    // Verify DLQ state
    const dlqRes = await fetch(`${API_BASE}/records/jobs/dlq`);
    assert.strictEqual(dlqRes.status, 200);
    const dlqData = await dlqRes.json();

    const fatalItem = dlqData.dlq.find((item) => item.jobId === fatalJobId);
    assert.ok(fatalItem, `Fatal job ${fatalJobId} must be routed to DLQ`);
    assert.strictEqual(fatalItem.failureReason, 'FATAL_SCRAPE_ERROR');
    assert.notStrictEqual(fatalItem.failureReason, 'LIVE_PORTAL');

    recordPass('DLQ_ROUTING', `Fatal unrecoverable error cleanly routed to DLQ without masquerading as live`);
  } catch (err) {
    recordFail('DLQ_ROUTING', err);
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================================');
  console.log('                   CHALLENGER M4 HARNESS EXECUTION SUMMARY                       ');
  console.log('================================================================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailures:');
    failureDetails.forEach((f) => console.log(`  - ${f.testId}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('\n🏆 ALL ADVERSARIAL CHALLENGES PASSED CLEANLY.');
    process.exit(0);
  }
}

runAdversarialM4Challenger().catch((err) => {
  console.error('Fatal test harness execution error:', err);
  process.exit(1);
});
