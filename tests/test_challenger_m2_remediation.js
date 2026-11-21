/**
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE: Milestone M2 Remediation Verification
 * Strict Section 63 Bharatiya Sakshya Adhiniyam (BSA) 2023 Truth-Serum Standard
 *
 * Verifies:
 * 1. Adversarial Fake Query Stress:
 *    - Nagpur / NonExistentVillage999 / FAKE-999-XYZ (7/12)
 *    - Mumbai / FAKE-SAC-999999 (BMC Property Tax)
 *    - Additional fictitious query vectors across other Maharashtra revenue features
 *    - Strict assertions: isLive === false, dataProvenance === 'REGIONAL_EMULATOR_SYNTHETIC'
 * 2. Benchmark Cache Query Stress:
 *    - Pune Wagholi 142/2A processed directly through jobWorkerPool.processJob()
 *    - BMC Tax HW1305620200003 through jobWorkerPool.processJob()
 *    - Ferfar #4821 through jobWorkerPool.processJob()
 *    - Strict assertions: result.dataProvenance === 'VERIFIED_PRESEEDED_CACHE', result.isLive === false
 */

const assert = require('node:assert');
const path = require('node:path');

async function runEmpiricalStressTest() {
  console.log('\n================================================================================');
  console.log('⚔️  EMPIRICAL CHALLENGER: Milestone M2 Remediation Stress Test');
  console.log('================================================================================\n');

  const { livePortalScraper } = require('../server/dist/services/livePortalScraper');
  const { jobWorkerPool } = require('../server/dist/services/jobWorkerPool');
  const { jobQueue } = require('../server/dist/services/jobQueue');

  // Stop background timer polling on this local pool instance so it does not compete
  jobWorkerPool.stop();

  let passed = 0;
  let failed = 0;
  const failures = [];

  function recordPass(testName, details) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}: ${details}`);
  }

  function recordFail(testName, err) {
    failed++;
    const msg = err.message || String(err);
    failures.push({ testName, error: msg });
    console.error(`  ❌ [FAIL] ${testName}: ${msg}`);
  }

  // ===========================================================================
  // SECTION 1: ADVERSARIAL FAKE QUERY STRESS (livePortalScraper.scrape)
  // ===========================================================================
  console.log('--- Section 1: Adversarial Fake Query Stress ---');

  // Test 1.1: Fictitious 7/12 Query (Nagpur / NonExistentVillage999 / FAKE-999-XYZ)
  try {
    const res = await livePortalScraper.scrape({
      feature: '7_12',
      state: 'MH',
      district: 'Nagpur',
      taluka: 'Nagpur Rural',
      village: 'NonExistentVillage999',
      surveyNo: 'FAKE-999-XYZ'
    });

    assert.strictEqual(res.isLive, false, 'isLive must strictly be false for fictitious 7/12 query');
    assert.notStrictEqual(res.dataProvenance, 'LIVE_PORTAL', 'dataProvenance must NOT be LIVE_PORTAL');
    assert.strictEqual(res.dataProvenance, 'REGIONAL_EMULATOR_SYNTHETIC', 'dataProvenance must strictly be REGIONAL_EMULATOR_SYNTHETIC');
    assert.strictEqual(res.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(res.data.isSynthetic, true, 'data.isSynthetic must be true');
    assert.strictEqual(res.data.district, 'Nagpur', 'district must match query');
    assert.strictEqual(res.data.village, 'NonExistentVillage999', 'village must match query');
    assert.strictEqual(res.data.surveyNo, 'FAKE-999-XYZ', 'surveyNo must match query');

    recordPass('TEST_CHALLENGE_01', 'Fictitious Nagpur 7/12 query safely identified as REGIONAL_EMULATOR_SYNTHETIC (isLive=false)');
  } catch (err) {
    recordFail('TEST_CHALLENGE_01', err);
  }

  // Test 1.2: Fictitious BMC Property Tax Query (Mumbai / FAKE-SAC-999999)
  try {
    const res = await livePortalScraper.scrape({
      feature: 'BMC_TAX',
      state: 'MH',
      district: 'Mumbai',
      sacNo: 'FAKE-SAC-999999'
    });

    assert.strictEqual(res.isLive, false, 'isLive must strictly be false for fictitious BMC SAC query');
    assert.notStrictEqual(res.dataProvenance, 'LIVE_PORTAL', 'dataProvenance must NOT be LIVE_PORTAL');
    assert.strictEqual(res.dataProvenance, 'REGIONAL_EMULATOR_SYNTHETIC', 'dataProvenance must strictly be REGIONAL_EMULATOR_SYNTHETIC');
    assert.strictEqual(res.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(res.data.isSynthetic, true, 'data.isSynthetic must be true');
    assert.strictEqual(res.data.sacNo, 'FAKE-SAC-999999', 'sacNo must match query');

    recordPass('TEST_CHALLENGE_02', 'Fictitious Mumbai BMC SAC query safely identified as REGIONAL_EMULATOR_SYNTHETIC (isLive=false)');
  } catch (err) {
    recordFail('TEST_CHALLENGE_02', err);
  }

  // Test 1.3: Fictitious Mutation Query (Thane / GhostVillage777 / 999999)
  try {
    const res = await livePortalScraper.scrape({
      feature: 'MUTATION',
      state: 'MH',
      district: 'Thane',
      taluka: 'Thane',
      village: 'GhostVillage777',
      mutationNo: '999999'
    });

    assert.strictEqual(res.isLive, false, 'isLive must be false');
    assert.notStrictEqual(res.dataProvenance, 'LIVE_PORTAL', 'dataProvenance must NOT be LIVE_PORTAL');
    assert.strictEqual(res.dataProvenance, 'REGIONAL_EMULATOR_SYNTHETIC', 'dataProvenance must be REGIONAL_EMULATOR_SYNTHETIC');
    assert.strictEqual(res.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(res.data.isSynthetic, true, 'data.isSynthetic must be true');

    recordPass('TEST_CHALLENGE_03', 'Fictitious Thane Mutation query safely identified as REGIONAL_EMULATOR_SYNTHETIC (isLive=false)');
  } catch (err) {
    recordFail('TEST_CHALLENGE_03', err);
  }

  // Test 1.4: Fictitious IGR Index-II Query (Nashik / FAKE_DEED_88888)
  try {
    const res = await livePortalScraper.scrape({
      feature: 'INDEX_2',
      state: 'MH',
      district: 'Nashik',
      taluka: 'Nashik',
      village: 'FakeVillage',
      deedNo: 'FAKE_DEED_88888',
      year: '1901'
    });

    assert.strictEqual(res.isLive, false, 'isLive must be false');
    assert.notStrictEqual(res.dataProvenance, 'LIVE_PORTAL', 'dataProvenance must NOT be LIVE_PORTAL');
    assert.strictEqual(res.dataProvenance, 'REGIONAL_EMULATOR_SYNTHETIC', 'dataProvenance must be REGIONAL_EMULATOR_SYNTHETIC');
    assert.strictEqual(res.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(res.data.isSynthetic, true, 'data.isSynthetic must be true');

    recordPass('TEST_CHALLENGE_04', 'Fictitious Nashik Index-II deed query safely identified as REGIONAL_EMULATOR_SYNTHETIC (isLive=false)');
  } catch (err) {
    recordFail('TEST_CHALLENGE_04', err);
  }

  // Test 1.5: Fictitious CTS Cadastral Map Query (Pune / CTS_FAKE_99999)
  try {
    const res = await livePortalScraper.scrape({
      feature: 'CTS_MAP',
      state: 'MH',
      district: 'Pune',
      ctsNo: 'CTS_FAKE_99999'
    });

    assert.strictEqual(res.isLive, false, 'isLive must be false');
    assert.notStrictEqual(res.dataProvenance, 'LIVE_PORTAL', 'dataProvenance must NOT be LIVE_PORTAL');
    assert.strictEqual(res.dataProvenance, 'REGIONAL_EMULATOR_SYNTHETIC', 'dataProvenance must be REGIONAL_EMULATOR_SYNTHETIC');
    assert.strictEqual(res.isDegraded, true, 'isDegraded must be true');
    assert.strictEqual(res.data.isSynthetic, true, 'data.isSynthetic must be true');

    recordPass('TEST_CHALLENGE_05', 'Fictitious CTS map query safely identified as REGIONAL_EMULATOR_SYNTHETIC (isLive=false)');
  } catch (err) {
    recordFail('TEST_CHALLENGE_05', err);
  }

  // ===========================================================================
  // SECTION 2: BENCHMARK CACHE QUERY STRESS (jobWorkerPool.processJob)
  // ===========================================================================
  console.log('\n--- Section 2: Benchmark Cache Query Stress via jobWorkerPool.processJob ---');

  // Test 2.1: Pune Wagholi 142/2A through jobWorkerPool.processJob()
  try {
    const job712 = jobQueue.enqueueJob({
      feature: '7_12',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      surveyNo: '142/2A'
    });

    assert.ok(job712 && job712.id, 'Job must be enqueued successfully');
    await jobWorkerPool.processJob(job712);

    const completedJob = jobQueue.getJob(job712.id);
    assert.ok(completedJob, 'Completed job must exist in database');
    assert.strictEqual(completedJob.status, 'COMPLETED', `Job status must be COMPLETED, got ${completedJob.status}`);
    assert.strictEqual(completedJob.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `completedJob.dataProvenance must be VERIFIED_PRESEEDED_CACHE, got ${completedJob.dataProvenance}`);
    assert.strictEqual(completedJob.progressPercent, 100, 'progressPercent must be 100');

    // Check parsed result payload (the returned result object)
    const result = typeof completedJob.resultPayload === 'string'
      ? JSON.parse(completedJob.resultPayload)
      : completedJob.resultPayload;

    assert.ok(result, 'result payload must exist');
    assert.strictEqual(result.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `result.dataProvenance must be VERIFIED_PRESEEDED_CACHE, got ${result.dataProvenance}`);
    assert.strictEqual(result.isLive, false, `result.isLive must strictly be false, got ${result.isLive}`);
    assert.strictEqual(result.isDegraded, false, 'result.isDegraded must be false for benchmark cache hit');
    assert.strictEqual(result.recordId, 'rec-mh-pune-ferfar-4821', 'result.recordId must match verified record');

    recordPass('TEST_CHALLENGE_06', `Pune Wagholi 142/2A correctly verified: result.dataProvenance=${result.dataProvenance}, result.isLive=${result.isLive}`);
  } catch (err) {
    recordFail('TEST_CHALLENGE_06', err);
  }

  // Test 2.2: BMC Tax Benchmark SAC (HW1305620200003) through jobWorkerPool.processJob()
  try {
    const bmcJob = jobQueue.enqueueJob({
      feature: 'BMC_TAX',
      state: 'MH',
      district: 'Mumbai Suburban',
      sacNo: 'HW1305620200003'
    });

    assert.ok(bmcJob && bmcJob.id, 'BMC Job must be enqueued successfully');
    await jobWorkerPool.processJob(bmcJob);

    const completedBmc = jobQueue.getJob(bmcJob.id);
    assert.ok(completedBmc, 'Completed BMC job must exist in database');
    assert.strictEqual(completedBmc.status, 'COMPLETED', `BMC job status must be COMPLETED, got ${completedBmc.status}`);
    assert.strictEqual(completedBmc.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `completedBmc.dataProvenance must be VERIFIED_PRESEEDED_CACHE, got ${completedBmc.dataProvenance}`);

    const result = typeof completedBmc.resultPayload === 'string'
      ? JSON.parse(completedBmc.resultPayload)
      : completedBmc.resultPayload;

    assert.ok(result, 'result payload must exist');
    assert.strictEqual(result.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `result.dataProvenance must be VERIFIED_PRESEEDED_CACHE, got ${result.dataProvenance}`);
    assert.strictEqual(result.isLive, false, `result.isLive must strictly be false, got ${result.isLive}`);
    assert.strictEqual(result.recordId, 'rec-mh-bmc-tax-hw130562', 'recordId must be rec-mh-bmc-tax-hw130562');

    recordPass('TEST_CHALLENGE_07', `BMC Tax HW1305620200003 verified: result.dataProvenance=${result.dataProvenance}, result.isLive=${result.isLive}`);
  } catch (err) {
    recordFail('TEST_CHALLENGE_07', err);
  }

  // Test 2.3: Aapli Chawadi Ferfar Benchmark #4821 through jobWorkerPool.processJob()
  try {
    const ferfarJob = jobQueue.enqueueJob({
      feature: 'MUTATION',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      gatNo: '142/2A',
      mutationNo: '4821'
    });

    assert.ok(ferfarJob && ferfarJob.id, 'Ferfar Job must be enqueued successfully');
    await jobWorkerPool.processJob(ferfarJob);

    const completedFerfar = jobQueue.getJob(ferfarJob.id);
    assert.ok(completedFerfar, 'Completed Ferfar job must exist in database');
    assert.strictEqual(completedFerfar.status, 'COMPLETED', `Ferfar job status must be COMPLETED, got ${completedFerfar.status}`);
    assert.strictEqual(completedFerfar.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `completedFerfar.dataProvenance must be VERIFIED_PRESEEDED_CACHE, got ${completedFerfar.dataProvenance}`);
    assert.strictEqual(completedFerfar.resultRecordId, 'rec-mh-pune-ferfar-4821', 'resultRecordId must be rec-mh-pune-ferfar-4821');

    const result = typeof completedFerfar.resultPayload === 'string'
      ? JSON.parse(completedFerfar.resultPayload)
      : completedFerfar.resultPayload;

    assert.ok(result, 'result payload must exist');
    assert.strictEqual(result.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `result.dataProvenance must be VERIFIED_PRESEEDED_CACHE, got ${result.dataProvenance}`);
    assert.strictEqual(result.isLive, false, `result.isLive must strictly be false, got ${result.isLive}`);

    recordPass('TEST_CHALLENGE_08', `Ferfar #4821 verified: result.dataProvenance=${result.dataProvenance}, result.isLive=${result.isLive}`);
  } catch (err) {
    recordFail('TEST_CHALLENGE_08', err);
  }

  // Test 2.4: IGR Index-II Deed Benchmark #4821 through jobWorkerPool.processJob()
  try {
    const deedJob = jobQueue.enqueueJob({
      feature: 'INDEX_2',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      documentNo: '4821',
      year: '2024'
    });

    assert.ok(deedJob && deedJob.id, 'Deed Job must be enqueued successfully');
    await jobWorkerPool.processJob(deedJob);

    const completedDeed = jobQueue.getJob(deedJob.id);
    assert.ok(completedDeed, 'Completed Deed job must exist in database');
    assert.strictEqual(completedDeed.status, 'COMPLETED', `Deed job status must be COMPLETED, got ${completedDeed.status}`);
    assert.strictEqual(completedDeed.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `completedDeed.dataProvenance must be VERIFIED_PRESEEDED_CACHE, got ${completedDeed.dataProvenance}`);
    assert.strictEqual(completedDeed.resultRecordId, 'rec-mh-pune-deed-4821', 'resultRecordId must be rec-mh-pune-deed-4821');

    const result = typeof completedDeed.resultPayload === 'string'
      ? JSON.parse(completedDeed.resultPayload)
      : completedDeed.resultPayload;

    assert.ok(result, 'result payload must exist');
    assert.strictEqual(result.dataProvenance, 'VERIFIED_PRESEEDED_CACHE', `result.dataProvenance must be VERIFIED_PRESEEDED_CACHE, got ${result.dataProvenance}`);
    assert.strictEqual(result.isLive, false, `result.isLive must strictly be false, got ${result.isLive}`);

    recordPass('TEST_CHALLENGE_09', `IGR Index-II Deed #4821 verified: result.dataProvenance=${result.dataProvenance}, result.isLive=${result.isLive}`);
  } catch (err) {
    recordFail('TEST_CHALLENGE_09', err);
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  if (failed > 0) {
    console.error('CHALLENGE FAILED with', failed, 'failures:', failures);
    process.exit(1);
  } else {
    console.log('🏆 ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% TRUTH-SERUM INTEGRITY!');
    process.exit(0);
  }
}

runEmpiricalStressTest().catch(err => {
  console.error('FATAL UNCAUGHT ERROR IN CHALLENGER TEST:', err);
  process.exit(1);
});
