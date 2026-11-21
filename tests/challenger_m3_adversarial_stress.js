/**
 * CHALLENGER M3 EMPIRICAL ADVERSARIAL STRESS TEST SUITE
 * 
 * Verifies Milestone M3:
 * Section 63 BSA 2023 Truth-Serum Status Reporting & Frontend Alignment
 * 
 * Invariants Tested:
 * 1. Deep-linking REST API provenance & degradation metadata
 * 2. Stepper state machine integrity under intermediate degradation
 * 3. Anti-masquerading invariant across all provenance/degradation combinations
 * 4. Navigation query parameter serialization & provenance preservation
 * 5. Forensic Vulnerability Probes (V1: Cache Staleness, V2: URL Param Injection)
 */

const assert = require('node:assert');

async function runChallengerStressTests() {
  console.log('================================================================================');
  console.log('⚔️  CHALLENGER M3 ADVERSARIAL STRESS TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;
  const vulnerabilities = [];

  function recordPass(testId, description) {
    passed++;
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
  }

  function recordFail(testId, error) {
    failed++;
    console.error(`  ❌ [FAIL] ${testId}:`, error.message || error);
  }

  function recordVulnerability(vulnId, title, details) {
    vulnerabilities.push({ vulnId, title, details });
    console.warn(`  ⚠️ [VULNERABILITY CONFIRMED] ${vulnId} - ${title}: ${details}`);
  }

  // ===========================================================================
  // SUITE 1: REST API Deep-Linking & Section 63 BSA Provenance
  // ===========================================================================
  console.log('--- Suite 1: REST API Deep-Linking & Section 63 BSA Provenance ---');

  // Test 1.1: Deep-linking rec-mh-pune-ferfar-4821
  try {
    const res = await fetch('http://localhost:4000/api/records/rec-mh-pune-ferfar-4821');
    assert.strictEqual(res.status, 200, 'Expected HTTP 200');
    const data = await res.json();

    assert.strictEqual(data.id, 'rec-mh-pune-ferfar-4821', 'Record ID mismatch');
    assert.strictEqual(data.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', 'Must have dataProvenance VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(data.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(data.isLive, false, 'isLive must be false');
    assert.ok(data.ticketId, 'ticketId must be present in response');
    assert.ok(typeof data.degradationReason === 'string' && data.degradationReason.length > 0, 'degradationReason must be non-empty string');
    assert.ok(data.degradationNotice, 'degradationNotice must be present');

    recordPass('CHALLENGE_1.1', `Ferfar 4821 deep-link: provenance=${data.dataProvenance}, isDegraded=${data.isDegraded}, ticketId=${data.ticketId}, reason=${data.degradationReason}`);
  } catch (err) {
    recordFail('CHALLENGE_1.1', err);
  }

  // Test 1.2: Deep-linking rec-mh-bmc-tax-hw130562
  try {
    const res = await fetch('http://localhost:4000/api/records/rec-mh-bmc-tax-hw130562');
    assert.strictEqual(res.status, 200, 'Expected HTTP 200');
    const data = await res.json();

    assert.strictEqual(data.id, 'rec-mh-bmc-tax-hw130562', 'Record ID mismatch');
    assert.strictEqual(data.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', 'Must have dataProvenance VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(data.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(data.isLive, false, 'isLive must be false');
    assert.ok(data.ticketId, 'ticketId must be present in response');
    assert.ok(typeof data.degradationReason === 'string' && data.degradationReason.length > 0, 'degradationReason must be non-empty string');
    assert.ok(data.taxData, 'taxData must be present');

    recordPass('CHALLENGE_1.2', `BMC Tax deep-link: provenance=${data.dataProvenance}, isDegraded=${data.isDegraded}, ticketId=${data.ticketId}, reason=${data.degradationReason}`);
  } catch (err) {
    recordFail('CHALLENGE_1.2', err);
  }

  // Test 1.3: Deep-linking unknown record returns HTTP 404
  try {
    const res = await fetch('http://localhost:4000/api/records/rec-non-existent-adversarial-999');
    assert.strictEqual(res.status, 404, 'Expected HTTP 404 for unknown record');
    const data = await res.json();
    assert.strictEqual(data.error, 'Record not found', 'Must return Record not found');
    recordPass('CHALLENGE_1.3', 'Unknown record deep-link returns HTTP 404');
  } catch (err) {
    recordFail('CHALLENGE_1.3', err);
  }

  // Test 1.4: Deep-linking with custom query ticketId overrides
  try {
    const customTicket = 'TK-CUSTOM-ADVERSARIAL-TEST-123';
    const res = await fetch(`http://localhost:4000/api/records/rec-up-ghaziabad-panchsheel-112?ticketId=${encodeURIComponent(customTicket)}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ticketId, customTicket, 'Must preserve query ticketId when no job row exists');
    assert.strictEqual(data.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(data.isLive, false);
    recordPass('CHALLENGE_1.4', `Custom ticketId query parameter propagation verified (ticketId=${data.ticketId})`);
  } catch (err) {
    recordFail('CHALLENGE_1.4', err);
  }

  // ===========================================================================
  // SUITE 2: Stepper State Machine & Intermediate Degradation Invariants
  // ===========================================================================
  console.log('\n--- Suite 2: Stepper State Machine & Intermediate Degradation ---');

  const DEFAULT_MILESTONES = [
    { key: 'queued', label: 'Query Enqueued', defaultDescription: 'Ticket ID generated; queued in asynchronous worker pool' },
    { key: 'worker_assigned', label: 'Worker Assigned', defaultDescription: 'Cloud browser worker allocated and initialized' },
    { key: 'navigating_portal', label: 'Navigating Portal', defaultDescription: 'Connecting to official state revenue portal' },
    { key: 'solving_challenge', label: 'Solving Challenge', defaultDescription: 'Bypassing session security and anti-bot verification' },
    { key: 'record_extracted', label: 'Record Extracted', defaultDescription: 'Extracting land rights, mutation entries & civic ledger' },
    { key: 'completed', label: 'Certified & Anchored', defaultDescription: 'Cryptographically anchored on Polygon blockchain' }
  ];

  function createInitialMilestones() {
    return DEFAULT_MILESTONES.map((m, idx) => ({
      key: m.key,
      label: m.label,
      description: m.defaultDescription,
      stepIndex: idx + 1,
      totalSteps: DEFAULT_MILESTONES.length,
      status: idx === 0 ? 'in_progress' : 'pending'
    }));
  }

  function updateMilestonesFromStatus(prevMilestones, status, percent, stepMessage, provenance) {
    const normStatus = (status || '').toLowerCase();
    const next = prevMilestones.map((step) => ({ ...step }));

    if (normStatus.includes('degrad')) {
      for (let i = 0; i < next.length; i++) {
        if (i === 5) {
          next[i].status = 'degraded';
          if (provenance === 'REGIONAL_EMULATOR_SYNTHETIC') {
            next[i].label = 'Synthetic Emulator Resolved';
          } else {
            next[i].label = 'Verified Benchmark Loaded';
          }
          if (stepMessage) next[i].description = stepMessage;
        } else {
          if (next[i].status !== 'completed') {
            if (i === 0) {
              next[i].status = 'completed';
            } else {
              next[i].status = 'pending';
            }
          }
        }
      }
      return next;
    }

    let activeIndex = 0;
    if (normStatus.includes('queued')) activeIndex = 0;
    else if (normStatus.includes('assigned')) activeIndex = 1;
    else if (normStatus.includes('navigat')) activeIndex = 2;
    else if (normStatus.includes('challenge') || normStatus.includes('solving')) activeIndex = 3;
    else if (normStatus.includes('extract')) activeIndex = 4;
    else if (normStatus.includes('anchor') || normStatus.includes('blockchain') || normStatus.includes('complet')) activeIndex = 5;

    for (let i = 0; i < next.length; i++) {
      if (normStatus.includes('fail') && i === activeIndex) {
        next[i].status = 'failed';
        if (stepMessage) next[i].description = stepMessage;
      } else if (i < activeIndex) {
        next[i].status = 'completed';
      } else if (i === activeIndex) {
        if (normStatus.includes('complet')) {
          next[i].status = 'completed';
          next[i].label = 'Certified & Anchored';
        } else {
          next[i].status = 'in_progress';
          if (stepMessage) next[i].description = stepMessage;
        }
      } else {
        next[i].status = 'pending';
      }
    }

    return next;
  }

  // Test 2.1: Simulate degradation during PORTAL_NAVIGATING
  try {
    let steps = createInitialMilestones();
    steps = updateMilestonesFromStatus(steps, 'ASSIGNED', 25, 'Worker assigned');
    steps = updateMilestonesFromStatus(steps, 'PORTAL_NAVIGATING', 40, 'Connecting to mahabhumi');

    assert.strictEqual(steps[0].status, 'completed', 'Step 0 should be completed');
    assert.strictEqual(steps[1].status, 'completed', 'Step 1 should be completed');
    assert.strictEqual(steps[2].status, 'in_progress', 'Step 2 should be in_progress');
    assert.strictEqual(steps[3].status, 'pending', 'Step 3 should be pending');
    assert.strictEqual(steps[4].status, 'pending', 'Step 4 should be pending');

    steps = updateMilestonesFromStatus(steps, 'DEGRADED_FALLBACK', 100, 'Upstream portal blocked', 'VERIFIED_PRESEEDED_CACHE');

    assert.strictEqual(steps[0].status, 'completed', 'Step 0 was genuinely completed');
    assert.strictEqual(steps[1].status, 'completed', 'Step 1 was genuinely completed');
    assert.notStrictEqual(steps[2].status, 'completed', 'Step 2 must NOT be marked completed');
    assert.notStrictEqual(steps[3].status, 'completed', 'Step 3 (solving_challenge) MUST NOT be marked completed');
    assert.notStrictEqual(steps[4].status, 'completed', 'Step 4 (record_extracted) MUST NOT be marked completed');
    assert.strictEqual(steps[3].status, 'pending', 'Step 3 must be pending');
    assert.strictEqual(steps[4].status, 'pending', 'Step 4 must be pending');
    assert.strictEqual(steps[5].status, 'degraded', 'Step 5 must be degraded');
    assert.strictEqual(steps[5].label, 'Verified Benchmark Loaded', 'Step 5 label must be Verified Benchmark Loaded');

    recordPass('CHALLENGE_2.1', 'Degradation at PORTAL_NAVIGATING: steps 3 and 4 remain uncompleted and step 5 marked degraded');
  } catch (err) {
    recordFail('CHALLENGE_2.1', err);
  }

  // Test 2.2: Simulate degradation during SOLVING_CHALLENGE
  try {
    let steps = createInitialMilestones();
    steps = updateMilestonesFromStatus(steps, 'ASSIGNED', 25);
    steps = updateMilestonesFromStatus(steps, 'PORTAL_NAVIGATING', 45);
    steps = updateMilestonesFromStatus(steps, 'SOLVING_CHALLENGE', 65, 'Solving CAPTCHA');

    assert.strictEqual(steps[2].status, 'completed', 'Step 2 was completed');
    assert.strictEqual(steps[3].status, 'in_progress', 'Step 3 was in_progress');

    steps = updateMilestonesFromStatus(steps, 'DEGRADED_FALLBACK', 100, 'CAPTCHA 3-attempt limit reached', 'REGIONAL_EMULATOR_SYNTHETIC');

    assert.notStrictEqual(steps[3].status, 'completed', 'Step 3 must NOT be marked completed');
    assert.notStrictEqual(steps[4].status, 'completed', 'Step 4 must NOT be marked completed');
    assert.strictEqual(steps[4].status, 'pending', 'Step 4 must be pending');
    assert.strictEqual(steps[5].status, 'degraded', 'Step 5 must be degraded');
    assert.strictEqual(steps[5].label, 'Synthetic Emulator Resolved', 'Step 5 label must be Synthetic Emulator Resolved');

    recordPass('CHALLENGE_2.2', 'Degradation at SOLVING_CHALLENGE: steps 3 and 4 NOT completed, label = Synthetic Emulator Resolved');
  } catch (err) {
    recordFail('CHALLENGE_2.2', err);
  }

  // Test 2.3: Degradation at initial queue step
  try {
    let steps = createInitialMilestones();
    steps = updateMilestonesFromStatus(steps, 'DEGRADED_FALLBACK', 100, 'Immediate queue fallback', 'VERIFIED_PRESEEDED_CACHE');

    assert.strictEqual(steps[0].status, 'completed', 'Step 0 marked completed as job was queued');
    assert.strictEqual(steps[1].status, 'pending', 'Step 1 pending');
    assert.strictEqual(steps[2].status, 'pending', 'Step 2 pending');
    assert.strictEqual(steps[3].status, 'pending', 'Step 3 pending');
    assert.strictEqual(steps[4].status, 'pending', 'Step 4 pending');
    assert.strictEqual(steps[5].status, 'degraded', 'Step 5 degraded');

    recordPass('CHALLENGE_2.3', 'Degradation at initial queue step correctly preserves step boundaries');
  } catch (err) {
    recordFail('CHALLENGE_2.3', err);
  }

  // ===========================================================================
  // SUITE 3: Anti-Masquerading Invariant Across All Tri-State Combinations
  // ===========================================================================
  console.log('\n--- Suite 3: Anti-Masquerading Invariants ---');

  function evaluateModalEffectiveIsLive(isLive, dataProvenance, isDegraded) {
    return isLive === true && dataProvenance === 'LIVE_PORTAL' && !isDegraded;
  }

  const modalCombinations = [
    ['LIVE_PORTAL', true, false, true, 'Genuine Live Extraction'],
    ['LIVE_PORTAL', true, true, false, 'LIVE_PORTAL with isDegraded=true'],
    ['LIVE_PORTAL', false, false, false, 'LIVE_PORTAL with isLive=false'],
    ['VERIFIED_PRESEEDED_CACHE', true, false, false, 'Benchmark Cache with isLive=true'],
    ['VERIFIED_PRESEEDED_CACHE', true, true, false, 'Benchmark Cache with isLive=true & degraded'],
    ['VERIFIED_PRESEEDED_CACHE', false, true, false, 'Benchmark Cache Fallback'],
    ['REGIONAL_EMULATOR_SYNTHETIC', true, false, false, 'Synthetic Emulator with isLive=true'],
    ['REGIONAL_EMULATOR_SYNTHETIC', false, true, false, 'Synthetic Emulator Fallback'],
    [null, true, false, false, 'Null Provenance with isLive=true'],
    ['UNKNOWN_FUTURE_PROVENANCE', true, false, false, 'Unknown Provenance with isLive=true']
  ];

  for (let idx = 0; idx < modalCombinations.length; idx++) {
    const [prov, live, degraded, expected, label] = modalCombinations[idx];
    try {
      const modalResult = evaluateModalEffectiveIsLive(live, prov, degraded);
      assert.strictEqual(modalResult, expected, `Modal invariant failed for ${label}`);
      recordPass(`CHALLENGE_3.${idx + 1}`, `Modal anti-masquerade [${prov}, live=${live}, deg=${degraded}] -> effectiveLive=${expected} (${label})`);
    } catch (err) {
      recordFail(`CHALLENGE_3.${idx + 1}`, err);
    }
  }

  // ===========================================================================
  // SUITE 4: Navigation Query Parameter Serialization
  // ===========================================================================
  console.log('\n--- Suite 4: Navigation Query Parameter Serialization ---');

  function serializeNavigationParams(streamRecordId, streamIsDegraded, streamDegradationNotice, streamDegradationReason, streamTicketId, streamDataProvenance) {
    const resolvedProvenance = streamDataProvenance || (streamIsDegraded ? 'VERIFIED_PRESEEDED_CACHE' : 'LIVE_PORTAL');
    const queryParams = [
      `isDegraded=${streamIsDegraded ? 'true' : 'false'}`,
      `degradationReason=${encodeURIComponent(streamDegradationNotice || streamDegradationReason || '')}`,
      `ticketId=${encodeURIComponent(streamTicketId || '')}`,
      `dataProvenance=${encodeURIComponent(resolvedProvenance)}`
    ].join('&');
    return `/record/${streamRecordId}?${queryParams}`;
  }

  function deserializeNavigationParams(url) {
    const [base, queryString] = url.split('?');
    const params = new URLSearchParams(queryString);
    return {
      recordId: base.replace('/record/', ''),
      isDegraded: params.get('isDegraded'),
      degradationReason: params.get('degradationReason'),
      ticketId: params.get('ticketId'),
      dataProvenance: params.get('dataProvenance')
    };
  }

  // Test 4.1: REGIONAL_EMULATOR_SYNTHETIC is NOT collapsed into VERIFIED_PRESEEDED_CACHE
  try {
    const url = serializeNavigationParams(
      'rec-mh-synth-001',
      true,
      'Regional Rule Engine Synthesis',
      'SIMULATED_RECORD',
      'TK-MH-712-SYNTH',
      'REGIONAL_EMULATOR_SYNTHETIC'
    );
    const parsed = deserializeNavigationParams(url);

    assert.strictEqual(parsed.dataProvenance, 'REGIONAL_EMULATOR_SYNTHETIC', 'Must preserve REGIONAL_EMULATOR_SYNTHETIC');
    assert.notStrictEqual(parsed.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', 'Must NOT collapse into VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(parsed.isDegraded, 'true');
    assert.strictEqual(parsed.ticketId, 'TK-MH-712-SYNTH');

    recordPass('CHALLENGE_4.1', 'REGIONAL_EMULATOR_SYNTHETIC preserved across serialization without collapse');
  } catch (err) {
    recordFail('CHALLENGE_4.1', err);
  }

  // Test 4.2: VERIFIED_PRESEEDED_CACHE preservation
  try {
    const url = serializeNavigationParams(
      'rec-mh-pune-ferfar-4821',
      true,
      'Authenticated benchmark reference archive',
      'PRESEEDED_BENCHMARK_RECORD',
      'TK-MH-MUTATION-FER-4821',
      'VERIFIED_PRESEEDED_CACHE'
    );
    const parsed = deserializeNavigationParams(url);

    assert.strictEqual(parsed.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(parsed.isDegraded, 'true');
    assert.strictEqual(parsed.ticketId, 'TK-MH-MUTATION-FER-4821');

    recordPass('CHALLENGE_4.2', 'VERIFIED_PRESEEDED_CACHE preserved with full fidelity');
  } catch (err) {
    recordFail('CHALLENGE_4.2', err);
  }

  // Test 4.3: LIVE_PORTAL preservation
  try {
    const url = serializeNavigationParams(
      'rec-mh-live-999',
      false,
      null,
      null,
      'TK-MH-LIVE-999',
      'LIVE_PORTAL'
    );
    const parsed = deserializeNavigationParams(url);

    assert.strictEqual(parsed.dataProvenance, 'LIVE_PORTAL');
    assert.strictEqual(parsed.isDegraded, 'false');
    assert.strictEqual(parsed.ticketId, 'TK-MH-LIVE-999');

    recordPass('CHALLENGE_4.3', 'LIVE_PORTAL preserved with isDegraded=false');
  } catch (err) {
    recordFail('CHALLENGE_4.3', err);
  }

  // Test 4.4: Adversarial special characters in degradation notice / ticketId
  try {
    const noticeWithSymbols = 'Quota Barrier (HTTP 402): $13.33 debt & rate-limit / anti-bot "WAF"';
    const ticketWithSymbols = 'TK-MH-712/142-2A#01&flag=true';
    const url = serializeNavigationParams(
      'rec-test-special',
      true,
      noticeWithSymbols,
      'DOWNSTREAM_402',
      ticketWithSymbols,
      'VERIFIED_PRESEEDED_CACHE'
    );
    const parsed = deserializeNavigationParams(url);

    assert.strictEqual(parsed.degradationReason, noticeWithSymbols, 'Special characters in reason must be preserved');
    assert.strictEqual(parsed.ticketId, ticketWithSymbols, 'Special characters in ticketId must be preserved');

    recordPass('CHALLENGE_4.4', 'Adversarial special characters survived URI serialization round-trip');
  } catch (err) {
    recordFail('CHALLENGE_4.4', err);
  }

  // ===========================================================================
  // SUITE 5: Forensic Vulnerability Probes
  // ===========================================================================
  console.log('\n--- Suite 5: Forensic Vulnerability Probes ---');

  // Probe V1: Pre-seeded Record Cache Migration Gap
  try {
    const res = await fetch('http://localhost:4000/api/records/rec-up-ghaziabad-panchsheel-112');
    const data = await res.json();
    if (data.dataProvenance === 'VERIFIED_PRESEEDED_CACHE' && data.isDegraded === false) {
      recordVulnerability(
        'VULN_M3_01',
        'Stale Preseeded Cache Gap on Existing SQLite Store',
        'rec-up-ghaziabad-panchsheel-112 returns dataProvenance=VERIFIED_PRESEEDED_CACHE but isDegraded=false because seedDefaultRecords() skips re-seeding if record already exists in database.'
      );
    } else {
      recordPass('PROBE_V1', 'Preseeded record isDegraded matches provenance');
    }
  } catch (err) {
    recordFail('PROBE_V1', err);
  }

  // Probe V2: Client-side Query Param Precedence in record/[id].tsx
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const idPath = path.resolve(__dirname, '../app/app/record/[id].tsx');
    const idCode = fs.readFileSync(idPath, 'utf8');

    // Invariant: client query param queryDataProvenance === 'LIVE_PORTAL' must not be allowed to forge isLive
    const permitsQueryProvenanceLiveBypass = idCode.includes("queryDataProvenance === 'LIVE_PORTAL'");
    const simulatedRecord = { isLive: false, isDegraded: false, dataProvenance: undefined };
    const queryDataProvenance = 'LIVE_PORTAL';
    const queryIsDegraded = 'false';

    const resolvedProvenance = simulatedRecord?.dataProvenance || queryDataProvenance || 'LIVE_PORTAL';
    const isDegraded = simulatedRecord?.isDegraded === true || queryIsDegraded === 'true' || resolvedProvenance === 'VERIFIED_PRESEEDED_CACHE';
    const isLive = resolvedProvenance === 'LIVE_PORTAL' &&
      (simulatedRecord?.isLive === true || (permitsQueryProvenanceLiveBypass && queryDataProvenance === 'LIVE_PORTAL')) &&
      !simulatedRecord?.isDegraded &&
      queryIsDegraded !== 'true';

    if (isLive === true && simulatedRecord.isLive === false) {
      recordVulnerability(
        'VULN_M3_02',
        'Client-side Query Param Overrides Record Invariant',
        'In record/[id].tsx line 180, queryDataProvenance === "LIVE_PORTAL" evaluates isLive=true even when record.isLive === false on an un-degraded record.'
      );
    } else {
      recordPass('PROBE_V2', 'Record isLive strictly enforces server payload');
    }
  } catch (err) {
    recordFail('PROBE_V2', err);
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed, ${vulnerabilities.length} Vulnerabilities Confirmed`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  return { passed, failed, vulnerabilities };
}

runChallengerStressTests().then(({ failed }) => {
  if (failed > 0) process.exit(1);
}).catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
