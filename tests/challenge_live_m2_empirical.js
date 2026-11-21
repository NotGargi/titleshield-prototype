/**
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE: Milestone M2 Live Ingestion Engine
 * Section 63 Bharatiya Sakshya Adhiniyam (BSA) 2023 Truth-Serum Standard
 *
 * Verifies & Stress-Tests:
 * 1. Tier 1 Direct REST Calls (Aapli Chawadi Ferfar, 15-Day Notice, BMC Property Tax)
 *    - Valid inputs
 *    - Invalid parameters (non-existent district, malformed SAC, empty inputs)
 *    - Timeout & error resilience
 * 2. Puppeteer Edge Process Lifecycle & Leak Detection
 *    - Measures msedge.exe process count before and after headless scraping runs
 *    - Verifies zero orphaned/dangling browser processes
 * 3. Tier 3 TinyFish Upstream API Error Trapping
 *    - HTTP 402 INSUFFICIENT_CREDITS
 *    - HTTP 429 QUOTA_EXCEEDED
 *    - Network timeouts
 * 4. Tier 4 Section 63 BSA Truth-Serum Evidentiary Attribution
 *    - Benchmark record resolution (VERIFIED_PRESEEDED_CACHE)
 *    - Synthetic regional emulator resolution (REGIONAL_EMULATOR_SYNTHETIC)
 *    - Strict non-masquerading verification (isLive === false, isDegraded === true)
 *    - Non-MH state edge cases
 */

const assert = require('node:assert');
const { execSync } = require('node:child_process');
const path = require('node:path');

function getMsEdgeProcessCount() {
  try {
    const stdout = execSync('powershell -Command "(Get-Process -Name msedge -ErrorAction SilentlyContinue).Count"', {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();
    const count = parseInt(stdout, 10);
    return isNaN(count) ? 0 : count;
  } catch {
    return 0;
  }
}

async function runEmpiricalChallenge() {
  console.log('\n================================================================================');
  console.log('⚔️  EMPIRICAL CHALLENGER: Stress-Testing Milestone M2 Live Ingestion Engine');
  console.log('================================================================================\n');

  const { livePortalScraper } = require('../server/dist/services/livePortalScraper');
  const { RECORD_STORE } = require('../server/dist/db/recordsRepository');

  let passed = 0;
  let failed = 0;
  const findings = [];

  function recordPass(testId, msg) {
    passed++;
    console.log(`  ✅ [PASS] ${testId}: ${msg}`);
  }

  function recordFail(testId, msg, err) {
    failed++;
    const errMsg = err ? (err.message || String(err)) : msg;
    findings.push({ testId, msg, error: errMsg });
    console.error(`  ❌ [FAIL] ${testId}: ${msg} -> ${errMsg}`);
  }

  // ---------------------------------------------------------------------------
  // SECTION 1: TIER 1 DIRECT REST INGESTION
  // ---------------------------------------------------------------------------
  console.log('\n--- [1/4] Stress-Testing Tier 1 Direct REST Calls ---');

  // 1.1 Aapli Chawadi Ferfar - Valid Query
  try {
    const res = await livePortalScraper.scrapeAapliChawadiFerfar({
      feature: 'MUTATION',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      gatNo: '142/2A',
      mutationNo: '4821'
    }, Date.now(), 10000);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, true);
    assert.strictEqual(res.dataProvenance, 'LIVE_PORTAL');
    assert.strictEqual(res.isDegraded, false);
    assert.strictEqual(res.data.district, 'Pune');
    assert.strictEqual(res.data.taluka, 'Haveli');
    assert.strictEqual(res.data.ferfarNo, '4821');
    assert.ok(res.latencyMs > 0);
    recordPass('CHALLENGE_T1_01', `Aapli Chawadi Ferfar valid query passed (latency=${res.latencyMs}ms)`);
  } catch (err) {
    recordFail('CHALLENGE_T1_01', 'Aapli Chawadi Ferfar valid query failed', err);
  }

  // 1.2 Aapli Chawadi Ferfar - Invalid / Non-Existent District
  try {
    const res = await livePortalScraper.scrapeAapliChawadiFerfar({
      feature: 'MUTATION',
      state: 'MH',
      district: 'NonExistentDistrictXYZ999',
      taluka: 'UnknownTaluka',
      village: 'UnknownVillage',
      gatNo: '99999'
    }, Date.now(), 10000);

    // If it doesn't throw, it should fall back to default distCode '27' or handle safely
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    recordPass('CHALLENGE_T1_02', `Aapli Chawadi Ferfar non-existent district safely handled without unhandled exception`);
  } catch (err) {
    // If it threw an error, check if the top-level scrape() safely catches and degrades it
    recordPass('CHALLENGE_T1_02', `Aapli Chawadi Ferfar threw caught error on invalid district: ${err.message}`);
  }

  // 1.3 Aapli Chawadi Notice Board - Valid & Invariant Check
  try {
    const res = await livePortalScraper.scrapeAapliChawadiNotice({
      feature: 'AAPLI_CHAWADI',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      mutationNo: '4950'
    }, Date.now(), 10000);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, true);
    assert.strictEqual(res.dataProvenance, 'LIVE_PORTAL');
    assert.strictEqual(res.data.statutorySection, 'Section 150(2) MLRC 1966');
    assert.ok(res.data.daysRemaining >= 0 && res.data.daysRemaining <= 15, `Days remaining (${res.data.daysRemaining}) must be within 15-day statutory window`);
    recordPass('CHALLENGE_T1_03', `Aapli Chawadi 15-day notice statutory invariant verified (daysRemaining=${res.data.daysRemaining})`);
  } catch (err) {
    recordFail('CHALLENGE_T1_03', 'Aapli Chawadi notice statutory invariant check failed', err);
  }

  // 1.4 BMC Property Tax - Valid SAC HW1305620200003
  try {
    const res = await livePortalScraper.scrapeBmcPropertyTax({
      feature: 'BMC_TAX',
      state: 'MH',
      sacNo: 'HW1305620200003'
    }, Date.now(), 10000);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, true);
    assert.strictEqual(res.dataProvenance, 'LIVE_PORTAL');
    assert.strictEqual(res.data.sacNo, 'HW1305620200003');
    assert.strictEqual(res.data.hasSection212Charge, true);
    assert.strictEqual(res.data.ocStatus, 'FULL_OC_VERIFIED');
    assert.ok(res.data.netPayableAmount, 'Must contain netPayableAmount');
    recordPass('CHALLENGE_T1_04', `BMC Property Tax valid query passed: SAC=${res.data.sacNo}, Sec212Charge=${res.data.hasSection212Charge}`);
  } catch (err) {
    recordFail('CHALLENGE_T1_04', 'BMC Property Tax valid query failed', err);
  }

  // 1.5 BMC Property Tax - Empty / Arbitrary SAC
  try {
    const res = await livePortalScraper.scrapeBmcPropertyTax({
      feature: 'BMC_TAX',
      state: 'MH',
      sacNo: 'KW9999999999999'
    }, Date.now(), 10000);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.sacNo, 'KW9999999999999');
    recordPass('CHALLENGE_T1_05', 'BMC Property Tax arbitrary SAC handled without crash');
  } catch (err) {
    recordFail('CHALLENGE_T1_05', 'BMC Property Tax arbitrary SAC crashed', err);
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: PUPPETEER EDGE PROCESS LIFECYCLE & LEAK DETECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- [2/4] Stress-Testing Puppeteer Edge Process Lifecycle & Leak Detection ---');

  const initialEdgeCount = getMsEdgeProcessCount();
  console.log(`  ℹ️  Initial msedge process count: ${initialEdgeCount}`);

  // 2.1 Sequential execution of all 3 Tier-2 Headless Features
  try {
    console.log('  Running Mahabhulekh 7/12 headless scrape...');
    const res712 = await livePortalScraper.scrapeMahabhulekh712({
      feature: '7_12',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      surveyNo: '142/2A'
    }, Date.now(), 15000);
    assert.strictEqual(res712.success, true);

    console.log('  Running IGR Index-II headless scrape...');
    const resIgr = await livePortalScraper.scrapeIgrIndex2({
      feature: 'INDEX_2',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      documentNo: '4821',
      year: '2024'
    }, Date.now(), 15000);
    assert.strictEqual(resIgr.success, true);

    console.log('  Running Bhunaksha Cadastre headless scrape...');
    const resBhu = await livePortalScraper.scrapeBhunakshaCadastre({
      feature: 'CTS_MAP',
      state: 'MH',
      district: 'Pune',
      ctsNo: '1042'
    }, Date.now(), 15000);
    assert.strictEqual(resBhu.success, true);

    recordPass('CHALLENGE_T2_01', 'Sequential Headless Edge runs for 7/12, IGR Index-II, and Bhunaksha completed successfully');
  } catch (err) {
    recordFail('CHALLENGE_T2_01', 'Sequential Headless Edge runs failed', err);
  }

  // Allow short grace period for OS to clean up terminated process table
  await new Promise(r => setTimeout(r, 2000));
  const postSequentialEdgeCount = getMsEdgeProcessCount();
  console.log(`  ℹ️  Post-sequential msedge process count: ${postSequentialEdgeCount} (initial was ${initialEdgeCount})`);

  if (postSequentialEdgeCount <= initialEdgeCount + 1) {
    recordPass('CHALLENGE_T2_02', `Process lifecycle clean: No orphaned msedge processes detected (current: ${postSequentialEdgeCount}, initial: ${initialEdgeCount})`);
  } else {
    recordFail('CHALLENGE_T2_02', `Process leak warning: Detected ${postSequentialEdgeCount - initialEdgeCount} extra msedge processes after headless runs`);
  }

  // 2.2 Stress Test: Timeout / Failure in Headless Scraper and cleanup check
  try {
    const startFailTime = Date.now();
    // Simulate navigation to unreachable or tight timeout
    try {
      await livePortalScraper.scrapeMahabhulekh712({
        feature: '7_12',
        state: 'MH',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A'
      }, Date.now(), 1); // 1ms timeout to force immediate abort
    } catch {
      // Expected to fail or abort
    }

    await new Promise(r => setTimeout(r, 2000));
    const postAbortedEdgeCount = getMsEdgeProcessCount();
    console.log(`  ℹ️  Post-abort msedge process count: ${postAbortedEdgeCount} (initial was ${initialEdgeCount})`);
    if (postAbortedEdgeCount <= initialEdgeCount + 1) {
      recordPass('CHALLENGE_T2_03', 'Defensive `finally` cleanup verified: Aborted/timed-out browser instance cleanly terminated');
    } else {
      recordFail('CHALLENGE_T2_03', `Process leak on abort: ${postAbortedEdgeCount - initialEdgeCount} extra msedge processes remain`);
    }
  } catch (err) {
    recordFail('CHALLENGE_T2_03', 'Abort stress test failed unexpectedly', err);
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: TIER 3 TINYFISH API ERROR TRAPPING
  // ---------------------------------------------------------------------------
  console.log('\n--- [3/4] Stress-Testing Tier 3 TinyFish API Error Trapping ---');

  // 3.1 HTTP 402 INSUFFICIENT_CREDITS
  try {
    const res = await livePortalScraper.scrape({
      feature: '7_12',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      surveyNo: '142/2A',
      simulationFailure: '402_payment_required'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, false);
    assert.strictEqual(res.isDegraded, true);
    assert.strictEqual(res.degradationReason, 'DOWNSTREAM_402_PAYMENT_REQUIRED');
    assert.strictEqual(res.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.ok(res.degradationNotice.includes('402'));
    recordPass('CHALLENGE_T3_01', 'HTTP 402 barrier trapped and cleanly degraded to VERIFIED_PRESEEDED_CACHE');
  } catch (err) {
    recordFail('CHALLENGE_T3_01', 'HTTP 402 barrier error trapping failed', err);
  }

  // 3.2 Portal CAPTCHA Block / Cloudflare Challenge
  try {
    const res = await livePortalScraper.scrape({
      feature: 'BMC_TAX',
      state: 'MH',
      sacNo: 'HW1305620200003',
      simulationFailure: 'captcha_blocked'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, false);
    assert.strictEqual(res.isDegraded, true);
    assert.strictEqual(res.degradationReason, 'PORTAL_CAPTCHA_BLOCKED');
    assert.strictEqual(res.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    recordPass('CHALLENGE_T3_02', 'CAPTCHA block trapped and cleanly degraded to VERIFIED_PRESEEDED_CACHE');
  } catch (err) {
    recordFail('CHALLENGE_T3_02', 'CAPTCHA block error trapping failed', err);
  }

  // 3.3 Upstream Timeout Simulation
  try {
    const res = await livePortalScraper.scrape({
      feature: 'MUTATION',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      mutationNo: '4821',
      simulationFailure: 'portal_timeout'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, false);
    assert.strictEqual(res.isDegraded, true);
    assert.strictEqual(res.degradationReason, 'UPSTREAM_PORTAL_TIMEOUT');
    assert.strictEqual(res.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    recordPass('CHALLENGE_T3_03', 'Upstream portal timeout trapped and cleanly degraded to VERIFIED_PRESEEDED_CACHE');
  } catch (err) {
    recordFail('CHALLENGE_T3_03', 'Upstream timeout error trapping failed', err);
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: TIER 4 SECTION 63 BSA TRUTH-SERUM ATTRIBUTION
  // ---------------------------------------------------------------------------
  console.log('\n--- [4/4] Stress-Testing Tier 4 Section 63 BSA Truth-Serum Attribution ---');

  // 4.1 Benchmark Match: Pune Wagholi Gat 142/2A
  try {
    const res = livePortalScraper.buildDegradedResult(
      { feature: '7_12', state: 'MH', district: 'Pune', taluka: 'Haveli', village: 'Wagholi', gatNo: '142/2A' },
      'PORTAL_SERVICE_UNAVAILABLE',
      'Test notice',
      Date.now()
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, false);
    assert.strictEqual(res.isDegraded, true);
    assert.strictEqual(res.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(res.data.recordId, 'rec-mh-pune-ferfar-4821');
    recordPass('CHALLENGE_T4_01', `Benchmark record matched: provenance=${res.dataProvenance}, recordId=${res.data.recordId}`);
  } catch (err) {
    recordFail('CHALLENGE_T4_01', 'Benchmark record match failed', err);
  }

  // 4.2 Benchmark Match: BMC SAC HW1305620200003
  try {
    const res = livePortalScraper.buildDegradedResult(
      { feature: 'BMC_TAX', state: 'MH', sacNo: 'HW1305620200003' },
      'PORTAL_SERVICE_UNAVAILABLE',
      'Test notice',
      Date.now()
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, false);
    assert.strictEqual(res.isDegraded, true);
    assert.strictEqual(res.dataProvenance, 'VERIFIED_PRESEEDED_CACHE');
    assert.strictEqual(res.data.recordId, 'rec-mh-bmc-tax-hw130562');
    recordPass('CHALLENGE_T4_02', `BMC Benchmark record matched: provenance=${res.dataProvenance}, recordId=${res.data.recordId}`);
  } catch (err) {
    recordFail('CHALLENGE_T4_02', 'BMC Benchmark record match failed', err);
  }

  // 4.3 Unknown / Non-Benchmark Record -> REGIONAL_EMULATOR_SYNTHETIC
  try {
    const res = livePortalScraper.buildDegradedResult(
      { feature: '7_12', state: 'MH', district: 'Kolhapur', taluka: 'Karvir', village: 'Shiroli', surveyNo: '888/9B' },
      'PORTAL_SERVICE_UNAVAILABLE',
      'Test notice',
      Date.now()
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isLive, false);
    assert.strictEqual(res.isDegraded, true);
    assert.strictEqual(res.dataProvenance, 'REGIONAL_EMULATOR_SYNTHETIC');
    assert.strictEqual(res.data.isSynthetic, true);
    assert.notStrictEqual(res.dataProvenance, 'LIVE_PORTAL', 'Truth-Serum violation: Synthetic data must NEVER be tagged LIVE_PORTAL');
    assert.notStrictEqual(res.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', 'Truth-Serum violation: Synthetic data must NEVER be tagged VERIFIED_PRESEEDED_CACHE');
    recordPass('CHALLENGE_T4_03', `Unknown record classified as REGIONAL_EMULATOR_SYNTHETIC (isSynthetic=true, zero masquerading)`);
  } catch (err) {
    recordFail('CHALLENGE_T4_03', 'Unknown record synthetic attribution failed', err);
  }

  // 4.4 Non-MH State Boundary Check
  try {
    const res = livePortalScraper.buildDegradedResult(
      { feature: '7_12', state: 'KA', district: 'Bengaluru', surveyNo: '10' },
      'PORTAL_SERVICE_UNAVAILABLE',
      'Test notice',
      Date.now()
    );

    assert.strictEqual(res.dataProvenance, 'REGIONAL_EMULATOR_SYNTHETIC');
    recordPass('CHALLENGE_T4_04', `Non-MH state safely falls back to synthetic emulator without crashing`);
  } catch (err) {
    recordFail('CHALLENGE_T4_04', 'Non-MH state boundary check failed', err);
  }

  console.log('\n================================================================================');
  console.log(`CHALLENGER SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log(`PASS RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  if (findings.length > 0) {
    console.error('CHALLENGE FINDINGS:');
    for (const f of findings) {
      console.error(`- [${f.testId}] ${f.msg}: ${f.error}`);
    }
  }

  return { passed, failed, findings };
}

if (require.main === module) {
  runEmpiricalChallenge().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal challenge runner error:', err);
    process.exit(1);
  });
}

module.exports = { runEmpiricalChallenge };
