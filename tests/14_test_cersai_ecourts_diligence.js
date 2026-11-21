/**
 * SUITE 14: CERSAI Statutory Mortgages, e-Courts NJDG Litigation & Event-Driven Diligence Pipeline
 *
 * Verifies:
 * 1. Persistent SQLite tables (cersai_charges, court_cases, encumbrance_audit_events).
 * 2. CERSAI institutional security interest queries and ROC filings.
 * 3. e-Courts NJDG CNR tracking and Order XXXIX CPC injunction detection.
 * 4. Event-Driven Architecture: Domain events emitted and logged to SQLite audit store.
 * 5. Unified Diligence API endpoints (/api/diligence/stats, /cersai, /court-cases, /check, /events).
 * 6. Terra AI live database integration: Hard veto tripping backed by real relational records.
 */

const assert = require('assert');
const path = require('path');
const Database = require(path.resolve(__dirname, '..', 'server', 'node_modules', 'better-sqlite3'));

const DB_PATH = path.resolve(__dirname, '../server/data/landeed.db');
const API_BASE = 'http://localhost:4000/api';

async function runSuite() {
  console.log('================================================================================');
  console.log('🏛️  SUITE 14: CERSAI Mortgages, e-Courts NJDG Litigation & Event Diligence E2E');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function pass(testName, detail = '') {
    passed++;
    console.log(`  ✅ [PASS] ${testName}${detail ? ': ' + detail : ''}`);
  }

  function fail(testName, err) {
    failed++;
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message || err}\n`);
  }

  // --- Pre-flight: Database Schema & Seeding Inspection ---
  try {
    const db = new Database(DB_PATH);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

    assert(tables.includes('cersai_charges'), 'Table cersai_charges must exist');
    assert(tables.includes('court_cases'), 'Table court_cases must exist');
    assert(tables.includes('encumbrance_audit_events'), 'Table encumbrance_audit_events must exist');

    const cersaiCount = db.prepare('SELECT count(*) as count FROM cersai_charges').get().count;
    const courtCount = db.prepare('SELECT count(*) as count FROM court_cases').get().count;

    assert(cersaiCount >= 5, `Expected at least 5 CERSAI charges, found ${cersaiCount}`);
    assert(courtCount >= 4, `Expected at least 4 Court cases, found ${courtCount}`);

    db.close();
    pass('TEST_14_01', `SQLite schema verified: cersai_charges (${cersaiCount}), court_cases (${courtCount}), encumbrance_audit_events active`);
  } catch (err) {
    fail('TEST_14_01', err);
  }

  // --- Test 2: CERSAI Institutional Mortgages Repository Inspection ---
  try {
    const db = new Database(DB_PATH);
    const sbiCharge = db.prepare("SELECT * FROM cersai_charges WHERE survey_number = '404' AND status = 'ACTIVE'").get();
    assert(sbiCharge, 'Survey 404 active CERSAI charge must exist');
    assert.strictEqual(sbiCharge.financial_institution, 'State Bank of India');
    assert.strictEqual(sbiCharge.cersai_security_interest_id, 'CERSAI-UP-GZB-2021-008192');
    assert(sbiCharge.charge_amount_inr === 4500000, 'Charge amount must be 45,00,000 INR');

    const hdfcCharge = db.prepare("SELECT * FROM cersai_charges WHERE survey_number = '402' AND status = 'SATISFIED'").get();
    assert(hdfcCharge, 'Survey 402 satisfied CERSAI charge must exist');
    assert.strictEqual(hdfcCharge.financial_institution, 'HDFC Bank Ltd');
    assert(hdfcCharge.satisfaction_date !== null, 'Satisfaction date must be recorded');

    db.close();
    pass('TEST_14_02', 'CERSAI institutional charges verified: Active SBI loan on 404 and Satisfied HDFC NOC on 402');
  } catch (err) {
    fail('TEST_14_02', err);
  }

  // --- Test 3: e-Courts NJDG Injunction & Lis Pendens Inspection ---
  try {
    const db = new Database(DB_PATH);
    const suit404 = db.prepare("SELECT * FROM court_cases WHERE survey_number = '404'").get();
    assert(suit404, 'Court case on Survey 404 must exist');
    assert.strictEqual(suit404.cnr_number, 'UPGZ01-004291-2022');
    assert.strictEqual(suit404.court_name, 'Civil Court (Senior Division) Ghaziabad');
    assert.strictEqual(suit404.stay_order_active, 1, 'Injunction under Order XXXIX CPC must be active');
    assert(suit404.stay_order_details.includes('Order XXXIX Rules 1 & 2 CPC'), 'Stay order details must specify CPC injunction');

    db.close();
    pass('TEST_14_03', 'e-Courts NJDG litigation verified: Partition suit SCS/412/2022 with active Order XXXIX CPC injunction');
  } catch (err) {
    fail('TEST_14_03', err);
  }

  // --- Test 4: Macro Diligence Stats Endpoint (/api/diligence/stats) ---
  try {
    const res = await fetch(`${API_BASE}/diligence/stats`);
    assert.strictEqual(res.status, 200, 'GET /api/diligence/stats must return HTTP 200');
    const json = await res.json();
    assert(json.success, 'Response must be success: true');
    assert(json.data.cersai.activeCharges >= 4, 'Must report active CERSAI charges');
    assert(json.data.cersai.totalActiveAmountInr > 50000000, 'Must report active debt exposure > 5 Cr');
    assert(json.data.court.activeStays >= 3, 'Must report active court injunctions');

    pass('TEST_14_04', `GET /api/diligence/stats returned macro indicators: ₹${json.data.summary.activeDebtExposureCr} Cr debt exposure, ${json.data.court.activeStays} active stays`);
  } catch (err) {
    fail('TEST_14_04', err);
  }

  // --- Test 5: CERSAI Charges API Endpoint (/api/diligence/cersai) ---
  try {
    const resAll = await fetch(`${API_BASE}/diligence/cersai?limit=10`);
    const jsonAll = await resAll.json();
    assert(jsonAll.success && jsonAll.charges.length > 0, 'CERSAI search must return records');

    const resFilter = await fetch(`${API_BASE}/diligence/cersai?status=ACTIVE`);
    const jsonFilter = await resFilter.json();
    assert(jsonFilter.charges.every(c => c.status === 'ACTIVE'), 'Status filter ACTIVE must only return active charges');

    pass('TEST_14_05', `GET /api/diligence/cersai verified with pagination and status filtering (${jsonFilter.charges.length} active charges)`);
  } catch (err) {
    fail('TEST_14_05', err);
  }

  // --- Test 6: e-Courts Litigation API Endpoint (/api/diligence/court-cases) ---
  try {
    const resStay = await fetch(`${API_BASE}/diligence/court-cases?stayOnly=true`);
    const jsonStay = await resStay.json();
    assert(jsonStay.success && jsonStay.cases.length > 0, 'Must return active injunction cases');
    assert(jsonStay.cases.every(c => c.stayOrderActive === true), 'stayOnly filter must return only cases with active stays');

    pass('TEST_14_06', `GET /api/diligence/court-cases verified with stayOnly filter (${jsonStay.cases.length} stay dockets)`);
  } catch (err) {
    fail('TEST_14_06', err);
  }

  // --- Test 7: Unified Property Diligence Check (/api/diligence/check) ---
  try {
    const resCheck = await fetch(`${API_BASE}/diligence/check?surveyNumber=404&state=UP&district=Ghaziabad&village=Sahibabad`);
    assert.strictEqual(resCheck.status, 200, 'Diligence check must return HTTP 200');
    const json = await resCheck.json();
    assert(json.success, 'Response must be success: true');
    assert.strictEqual(json.diligence.overallStatus, 'DISPUTED', 'Status must be DISPUTED due to active stay');
    assert.strictEqual(json.diligence.suggestedTitleScore, 0, 'Multiplicative zero guarantee: score must collapse to 0');
    assert.strictEqual(json.diligence.hardVetoTripped, true, 'Hard veto must trip on active stay');
    assert(json.diligence.hardVetoReason.includes('Section 52 Transfer of Property Act'), 'Must cite Sec 52 TPA Lis Pendens');
    assert.strictEqual(json.diligence.metrics.activeMortgageCount, 1, 'Must detect 1 active mortgage');
    assert.strictEqual(json.diligence.metrics.activeStayCount, 1, 'Must detect 1 active court stay');

    pass('TEST_14_07', 'Unified check on Survey 404 accurately tripped hard veto V1 (Score = 0/100, Lis Pendens Sec 52 TPA)');
  } catch (err) {
    fail('TEST_14_07', err);
  }

  // --- Test 8: Discharged Clean Title Verification (/api/diligence/check) ---
  try {
    const resClean = await fetch(`${API_BASE}/diligence/check?surveyNumber=142/2A&state=MH&district=Pune&village=Wagholi`);
    const json = await resClean.json();
    assert(json.success, 'Response must be success');
    assert.strictEqual(json.diligence.overallStatus, 'CLEAN', 'Status must be CLEAN for discharged title');
    assert(json.diligence.suggestedTitleScore >= 85, 'Score must be >= 85 for clear title');
    assert.strictEqual(json.diligence.hardVetoTripped, false, 'Hard veto must NOT trip');
    assert.strictEqual(json.diligence.metrics.activeStayCount, 0, 'Zero active stays');

    pass('TEST_14_08', 'Unified check on Gat 142/2A verified clean discharged title (Score = 88/100, zero active stays)');
  } catch (err) {
    fail('TEST_14_08', err);
  }

  // --- Test 9: Event-Driven Architecture Audit Log Verification ---
  try {
    const resEvents = await fetch(`${API_BASE}/diligence/events?surveyNumber=404`);
    const json = await resEvents.json();
    assert(json.success, 'GET /api/diligence/events must succeed');
    assert(json.events.length >= 4, `Expected at least 4 audit events for survey 404, found ${json.events.length}`);

    const eventTypes = json.events.map(e => e.eventType);
    assert(eventTypes.includes('CersaiSearchInitiated'), 'Must include CersaiSearchInitiated');
    assert(eventTypes.includes('CersaiChargeIdentified'), 'Must include CersaiChargeIdentified');
    assert(eventTypes.includes('CourtCaseQueried'), 'Must include CourtCaseQueried');
    assert(eventTypes.includes('LisPendensInjunctionDetected'), 'Must include LisPendensInjunctionDetected');
    assert(eventTypes.includes('TitleEncumbranceAggregated'), 'Must include TitleEncumbranceAggregated');

    pass('TEST_14_09', `Event-driven architecture verified: 5 domain event types captured in SQLite encumbrance_audit_events table (${json.events.length} events logged)`);
  } catch (err) {
    fail('TEST_14_09', err);
  }

  // --- Test 10: Terra AI Live Relational Database Integration ---
  try {
    const resTerra = await fetch(`${API_BASE}/terra/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Audit Survey 404 in Ghaziabad UP' })
    });
    assert.strictEqual(resTerra.status, 200, 'POST /api/terra/chat must return HTTP 200');
    const json = await resTerra.json();

    assert.strictEqual(json.riskTier, 'HIGH', 'Risk tier must be HIGH for Survey 404');
    assert(json.riskScore >= 85, `Risk score must be high, got ${json.riskScore}`);

    // Check findings contain the exact CERSAI and e-Courts details from SQLite
    const hasCersaiFinding = json.findings.some(f => f.category === 'CERSAI Institutional Security Interest' && f.status === 'FAIL');
    const hasCourtFinding = json.findings.some(f => f.category === 'e-Courts NJDG Injunction & Lis Pendens' && f.status === 'FAIL');

    assert(hasCersaiFinding, 'Terra AI must return CERSAI Institutional Security Interest finding from SQLite');
    assert(hasCourtFinding, 'Terra AI must return e-Courts NJDG Injunction finding from SQLite');
    assert(json.reply.includes('CERSAI-UP-GZB-2021-008192'), 'Terra reply must cite authentic CERSAI Security ID');
    assert(json.reply.includes('UPGZ01-004291-2022'), 'Terra reply must cite authentic e-Courts CNR number');

    pass('TEST_14_10', 'Terra AI live database integration verified: CERSAI ID and e-Courts CNR injected into advisory reply with High Risk Veto');
  } catch (err) {
    fail('TEST_14_10', err);
  }

  // --- Summary ---
  console.log('\n================================================================================');
  console.log('                          SUITE 14 EXECUTION SUMMARY                            ');
  console.log('================================================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🏆 ALL 10 CERSAI & e-COURTS DILIGENCE TESTS PASSED CLEANLY!\n');
    process.exit(0);
  } else {
    console.error(`❌ VERIFICATION FAILED: ${failed} tests failed out of ${passed + failed}.\n`);
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
