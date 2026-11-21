/**
 * Landeed 2.0 E2E Test Suite 02: Deterministic Title Risk Scoring Engine & Hard Veto Gates
 * 
 * Verifies:
 * 1. Mathematical formula: S = max(0, 100 - ∑ w_i * I_i) * ∏(1 - V_k)
 * 2. Calibrated soft deductions (Mutation lag -15, Patronymic -5, Discharged suit -10, Pre-2002 gap -20)
 * 3. 4 Hard Veto Gates Multiplicative Zero Guarantee (S = 0):
 *    - V1: Active Lis Pendens / Court Stay
 *    - V2: Prohibited Govt / Waqf / PTCL Land
 *    - V3: Active CERSAI Bank Mortgage
 *    - V4: Broken 30-Year Lineage Chain DAG
 * 4. Adversarial compound invariants and score floor max(0, ...)
 * 5. Risk tier classification: LOW (>=90), MODERATE (70-89), HIGH (50-69), CRITICAL (<50 or S=0)
 */

const assert = require('assert');

/**
 * Deterministic Risk Scoring Engine Implementation
 * Conforms to Interface Contract 3 in PROJECT.md
 */
function calculateDeterministicTitleScore(inputs) {
  const {
    hasActiveLitigation = false,
    pendingLitigationCount = 0,
    isProhibitedLand = false,
    hasActiveMortgage = false,
    isChainBroken = false,
    mutationLag = false,
    patronymicVariance = false,
    historicalDischargedSuit = false,
    pre2002Gap = false,
    additionalDeductions = []
  } = inputs;

  // 1. Evaluate 4 Hard Veto Gates: V_k in {0, 1}
  const v1 = hasActiveLitigation || pendingLitigationCount > 0 ? 1 : 0;
  const v2 = isProhibitedLand ? 1 : 0;
  const v3 = hasActiveMortgage ? 1 : 0;
  const v4 = isChainBroken ? 1 : 0;

  const vetoTriggered = (v1 === 1 || v2 === 1 || v3 === 1 || v4 === 1);
  const vetoMultiplier = vetoTriggered ? 0 : 1;

  const activeVetoes = [];
  if (v1) activeVetoes.push('V1_ACTIVE_COURT_STAY_LIS_PENDENS');
  if (v2) activeVetoes.push('V2_PROHIBITED_GOVT_WAQF_CEILING_LAND');
  if (v3) activeVetoes.push('V3_ACTIVE_CERSAI_BANK_MORTGAGE');
  if (v4) activeVetoes.push('V4_BROKEN_30_YEAR_CHAIN_OF_TITLE_DAG');

  // 2. Evaluate Calibrated Soft Deductions: sum(w_i * I_i)
  const deductions = [];
  let deductionSum = 0;

  if (mutationLag) {
    deductions.push({ code: 'MUTATION_LAG', weight: 15, description: 'Revenue mutation ledger lag (>45 days unmutated deed)' });
    deductionSum += 15;
  }
  if (patronymicVariance) {
    deductions.push({ code: 'PATRONYMIC_VARIANCE', weight: 5, description: 'Minor patronymic spelling variance across documents' });
    deductionSum += 5;
  }
  if (historicalDischargedSuit) {
    deductions.push({ code: 'HISTORICAL_DISCHARGED_SUIT', weight: 10, description: 'Historical litigation discharged with clear decree > 10y ago' });
    deductionSum += 10;
  }
  if (pre2002Gap) {
    deductions.push({ code: 'PRE_2002_GAP', weight: 20, description: 'Pre-2002 scanned volume record gap requiring manual physical SRO check' });
    deductionSum += 20;
  }

  for (const extra of additionalDeductions) {
    deductions.push(extra);
    deductionSum += extra.weight;
  }

  // 3. Compute Base Score with floor at 0
  const baseScore = Math.max(0, 100 - deductionSum);

  // 4. Apply Multiplicative Zero Guarantee
  const finalScore = baseScore * vetoMultiplier;

  // 5. Tier Mapping
  let riskTier;
  let summary;

  if (vetoTriggered || finalScore < 50) {
    riskTier = 'CRITICAL';
    summary = vetoTriggered
      ? `Title Diligence Vetoed: ${activeVetoes.join(', ')}. Multiplicative Zero Guarantee triggered (Score = 0).`
      : `High title encumbrance risk detected. Cumulative score fell below minimum threshold (Score = ${finalScore}).`;
  } else if (finalScore >= 90) {
    riskTier = 'LOW';
    summary = 'Clean Sovereign Title: Unbroken 30-year conveyance DAG, zero active court disputes, zero financial charges.';
  } else if (finalScore >= 70) {
    riskTier = 'MODERATE';
    summary = 'Acceptable Title with Minor Cautions: Orthographic spelling or revenue sync lag detected.';
  } else {
    riskTier = 'HIGH';
    summary = 'Review Queue Triggered: Substantial title discrepancies requiring empanelled advocate verification.';
  }

  return {
    score: finalScore,
    riskTier,
    summary,
    vetoTriggered,
    activeVetoes,
    vetoGates: {
      v1_lisPendensCourtStay: v1 === 1,
      v2_prohibitedLandCategory: v2 === 1,
      v3_activeCersaiMortgage: v3 === 1,
      v4_brokenLineageDag: v4 === 1
    },
    deductions,
    verifications: {
      revenue: v4 ? 'FLAGGED' : mutationLag ? 'REVIEW' : 'CLEAN',
      sroEncumbrance: v3 ? 'FLAGGED' : pre2002Gap ? 'REVIEW' : 'CLEAN',
      eCourtsNjdg: v1 ? 'FLAGGED' : historicalDischargedSuit ? 'REVIEW' : 'CLEAN',
      cersaiMortgage: v3 ? 'FLAGGED' : 'CLEAN',
      rera: 'CLEAN'
    }
  };
}

// -----------------------------------------------------------------------------
// Test Execution Suite
// -----------------------------------------------------------------------------

async function runRiskEngineVetoTests() {
  console.log('================================================================');
  console.log('🧪 SUITE 02: Deterministic Title Risk Engine & Hard Veto Gates');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;
  const results = [];

  function recordPass(testId, description) {
    passed++;
    results.push({ id: testId, status: 'PASS', description });
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
  }

  function recordFail(testId, description, error) {
    failed++;
    results.push({ id: testId, status: 'FAIL', description, error: error.message });
    console.log(`  ❌ [FAIL] ${testId}: ${description}`);
    console.log(`     Error: ${error.message}`);
  }

  // ---------------------------------------------------------------------------
  // Test 2.1: Clean Title Baseline (Score = 100, LOW Risk)
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({});
    assert.strictEqual(res.score, 100, 'Clean title must have score 100');
    assert.strictEqual(res.riskTier, 'LOW', 'Score 100 must be LOW tier');
    assert.strictEqual(res.vetoTriggered, false, 'No vetoes should be triggered');
    assert.strictEqual(res.activeVetoes.length, 0, 'Active veto list must be empty');
    assert.strictEqual(res.deductions.length, 0, 'Deductions list must be empty');
    assert.strictEqual(res.verifications.revenue, 'CLEAN');
    assert.strictEqual(res.verifications.sroEncumbrance, 'CLEAN');
    assert.strictEqual(res.verifications.eCourtsNjdg, 'CLEAN');
    assert.strictEqual(res.verifications.cersaiMortgage, 'CLEAN');

    recordPass('TEST_02_01', 'Clean title baseline yields Score = 100, Tier = LOW, zero active vetoes');
  } catch (err) {
    recordFail('TEST_02_01', 'Clean title baseline test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2.2: Soft Deductions (Mutation Lag -15, Patronymic -5 -> Score = 80)
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({
      mutationLag: true,
      patronymicVariance: true
    });

    assert.strictEqual(res.score, 80, 'Score must be 100 - (15 + 5) = 80');
    assert.strictEqual(res.riskTier, 'MODERATE', 'Score 80 must be MODERATE tier');
    assert.strictEqual(res.vetoTriggered, false, 'Soft deductions must not trip hard vetoes');
    assert.strictEqual(res.deductions.length, 2, 'Must record exactly 2 deductions');
    assert.strictEqual(res.verifications.revenue, 'REVIEW', 'Mutation lag flags revenue for review');

    recordPass('TEST_02_02', 'Soft deductions (Mutation Lag -15, Patronymic -5) calculate Score = 80, Tier = MODERATE');
  } catch (err) {
    recordFail('TEST_02_02', 'Soft deductions test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2.3: Cumulative Soft Deductions (-50 pts -> Score = 50, HIGH Tier)
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({
      mutationLag: true,
      patronymicVariance: true,
      historicalDischargedSuit: true,
      pre2002Gap: true
    });

    assert.strictEqual(res.score, 50, 'Score must be 100 - (15 + 5 + 10 + 20) = 50');
    assert.strictEqual(res.riskTier, 'HIGH', 'Score 50 must be HIGH tier (Advocate review queue)');
    assert.strictEqual(res.vetoTriggered, false, 'Soft deductions do not trip hard veto');
    assert.strictEqual(res.deductions.length, 4, 'Must record all 4 calibrated soft deductions');

    recordPass('TEST_02_03', 'Cumulative soft deductions sum to -50, yielding Score = 50, Tier = HIGH');
  } catch (err) {
    recordFail('TEST_02_03', 'Cumulative soft deductions test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2.4: Multiplicative Zero Guarantee — V1 Court Stay / Lis Pendens
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({
      hasActiveLitigation: true,
      pendingLitigationCount: 1
    });

    assert.strictEqual(res.score, 0, 'V1 Court Stay must collapse score to 0');
    assert.strictEqual(res.riskTier, 'CRITICAL', 'Score 0 must be CRITICAL tier');
    assert.strictEqual(res.vetoTriggered, true, 'vetoTriggered must be true');
    assert.strictEqual(res.vetoGates.v1_lisPendensCourtStay, true, 'v1_lisPendensCourtStay must be true');
    assert.ok(res.activeVetoes.includes('V1_ACTIVE_COURT_STAY_LIS_PENDENS'), 'Active vetoes must list V1');
    assert.strictEqual(res.verifications.eCourtsNjdg, 'FLAGGED', 'eCourts verification must be FLAGGED');

    recordPass('TEST_02_04', 'Multiplicative Zero Guarantee: V1 Active Lis Pendens collapses score to S = 0 (CRITICAL)');
  } catch (err) {
    recordFail('TEST_02_04', 'V1 Court stay veto test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2.5: Multiplicative Zero Guarantee — V2 Prohibited Land Category
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({
      isProhibitedLand: true
    });

    assert.strictEqual(res.score, 0, 'V2 Prohibited Land must collapse score to 0');
    assert.strictEqual(res.riskTier, 'CRITICAL', 'V2 breach must be CRITICAL');
    assert.strictEqual(res.vetoTriggered, true);
    assert.strictEqual(res.vetoGates.v2_prohibitedLandCategory, true);
    assert.ok(res.activeVetoes.includes('V2_PROHIBITED_GOVT_WAQF_CEILING_LAND'));

    recordPass('TEST_02_05', 'Multiplicative Zero Guarantee: V2 Prohibited Govt/Waqf Land collapses score to S = 0 (CRITICAL)');
  } catch (err) {
    recordFail('TEST_02_05', 'V2 Prohibited land veto test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2.6: Multiplicative Zero Guarantee — V3 Active CERSAI Bank Mortgage
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({
      hasActiveMortgage: true
    });

    assert.strictEqual(res.score, 0, 'V3 Active Mortgage must collapse score to 0');
    assert.strictEqual(res.riskTier, 'CRITICAL');
    assert.strictEqual(res.vetoTriggered, true);
    assert.strictEqual(res.vetoGates.v3_activeCersaiMortgage, true);
    assert.ok(res.activeVetoes.includes('V3_ACTIVE_CERSAI_BANK_MORTGAGE'));
    assert.strictEqual(res.verifications.cersaiMortgage, 'FLAGGED');

    recordPass('TEST_02_06', 'Multiplicative Zero Guarantee: V3 Active CERSAI Mortgage collapses score to S = 0 (CRITICAL)');
  } catch (err) {
    recordFail('TEST_02_06', 'V3 Mortgage veto test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2.7: Multiplicative Zero Guarantee — V4 Broken 30-Year Chain DAG
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({
      isChainBroken: true
    });

    assert.strictEqual(res.score, 0, 'V4 Broken Chain must collapse score to 0');
    assert.strictEqual(res.riskTier, 'CRITICAL');
    assert.strictEqual(res.vetoTriggered, true);
    assert.strictEqual(res.vetoGates.v4_brokenLineageDag, true);
    assert.ok(res.activeVetoes.includes('V4_BROKEN_30_YEAR_CHAIN_OF_TITLE_DAG'));

    recordPass('TEST_02_07', 'Multiplicative Zero Guarantee: V4 Broken 30-Year Chain collapses score to S = 0 (CRITICAL)');
  } catch (err) {
    recordFail('TEST_02_07', 'V4 Broken chain veto test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2.8: Adversarial Compound Invariant (Deductions + Hard Veto = 0)
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({
      mutationLag: true, // -15
      patronymicVariance: true, // -5
      pre2002Gap: true, // -20
      hasActiveLitigation: true // V1 tripped!
    });

    // Without veto, base score would be 100 - 40 = 60
    // With V1 tripped, (1 - 1) = 0, so 60 * 0 = 0
    assert.strictEqual(res.score, 0, 'Compound test: deductions + veto must strictly equal 0');
    assert.strictEqual(res.riskTier, 'CRITICAL');
    assert.strictEqual(res.vetoTriggered, true);
    assert.strictEqual(res.deductions.length, 3, 'Deductions must still be logged for audit transparency');

    recordPass('TEST_02_08', 'Adversarial Compound Invariant: Soft deductions + Veto still collapses strictly to S = 0');
  } catch (err) {
    recordFail('TEST_02_08', 'Adversarial compound test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 2.9: Score Floor Invariant (Excessive deductions never produce negative score)
  // ---------------------------------------------------------------------------
  try {
    const res = calculateDeterministicTitleScore({
      additionalDeductions: [
        { code: 'HUGE_PENALTY_1', weight: 80, description: 'Major structural defect' },
        { code: 'HUGE_PENALTY_2', weight: 60, description: 'Tax arrears' }
      ]
    });

    // 100 - 140 = -40, but max(0, -40) = 0
    assert.strictEqual(res.score, 0, 'Score must be floored at 0, never negative');
    assert.strictEqual(res.riskTier, 'CRITICAL');
    assert.strictEqual(res.vetoTriggered, false, 'No veto tripped, but score floored at 0');

    recordPass('TEST_02_09', 'Score Floor Invariant: Excessive deductions floored strictly at max(0, score) = 0');
  } catch (err) {
    recordFail('TEST_02_09', 'Score floor invariant test failed', err);
  }

  console.log(`\n📊 Suite 02 Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests\n`);
  return { suite: '02_risk_engine_vetoes', passed, failed, total: passed + failed, results };
}

if (require.main === module) {
  runRiskEngineVetoTests().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  });
}

module.exports = { runRiskEngineVetoTests, calculateDeterministicTitleScore };
