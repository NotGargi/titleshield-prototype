/**
 * Master E2E Test Runner for Landeed 2.0 (TitleShield & Map Explore Enhancements)
 * 
 * Executes all 13 core automated test suites in strict order:
 * 1. 01_test_address_parser_geocoding.js
 * 2. 02_test_risk_engine_vetoes.js
 * 3. 03_test_sqlite_persistence_disk_pdf.js
 * 4. 04_test_web3_merkle_eas_bsa.js
 * 5. 06_test_explore_cadastral_map.js
 * 6. 08_test_portal_adapters.js
 * 7. 09_test_batch_village_ingest.js
 * 8. test_cadastral_map_unit.js
 * 9. test_m1_complete_verification.js
 * 10. test_m2_state_portal_adapters.js
 * 11. test_map_explore_enhancements.js
 * 12. 12_test_cascading_dropdowns.js
 * 13. 13_test_auth_lifecycle.js
 * 14. 14_test_cersai_ecourts_diligence.js
 * 15. 15_test_realtime_async_pipeline_e2e.js
 * 
 * Outputs structured summary table, total passed/failed, and exits with code 0 on 100% pass.
 */

const path = require('node:path');
const { spawn } = require('node:child_process');

const SUITES = [
  { file: '01_test_address_parser_geocoding.js', title: 'Address Parser & GIS Geocoding', tier: 'Tier 1 & 2' },
  { file: '02_test_risk_engine_vetoes.js', title: 'Title Risk Formula & 4 Hard Veto Gates', tier: 'Tier 1 & 2' },
  { file: '03_test_sqlite_persistence_disk_pdf.js', title: 'SQLite Persistence & Heap Benchmark', tier: 'Tier 1-3' },
  { file: '04_test_web3_merkle_eas_bsa.js', title: 'Web3 Merkle DAG, EAS & Sec 63 BSA 2023', tier: 'Tier 1-3' },
  { file: '06_test_explore_cadastral_map.js', title: 'Interactive Cadastral Map & Summary Sheet', tier: 'Tier 1-4' },
  { file: '08_test_portal_adapters.js', title: 'Automated Live Portal Adapters in TinyFish', tier: 'Tier 1-4' },
  { file: '09_test_batch_village_ingest.js', title: 'Batch Village Cadastre Ingest & Spatial API', tier: 'Tier 1-4' },
  { file: 'test_cadastral_map_unit.js', title: 'Cadastral Projection Math & Unit Verification', tier: 'Tier 1' },
  { file: 'test_m1_complete_verification.js', title: 'M1 Relational Persistence & Durability', tier: 'Tier 1 & 2' },
  { file: 'test_m2_state_portal_adapters.js', title: 'M2 Multi-State Revenue Portal Adapters', tier: 'Tier 1-4' },
  { file: 'test_map_explore_enhancements.js', title: 'Map Explore Enhancements & Terra AI (R1-R7)', tier: 'Tier 1-4' },
  { id: '12', file: '12_test_cascading_dropdowns.js', name: 'Cascading Dropdown Selectors & Location Hierarchy E2E', title: 'Cascading Dropdown Selectors & Location Hierarchy E2E', tier: 'Tier 3-4' },
  { id: '13', file: '13_test_auth_lifecycle.js', name: 'Auth Lifecycle, Session & Domain Events E2E', title: 'Auth Lifecycle, Session & Domain Events E2E', tier: 'Tier 1-4' },
  { id: '14', file: '14_test_cersai_ecourts_diligence.js', name: 'CERSAI Mortgages, e-Courts NJDG & Diligence Pipeline E2E', title: 'CERSAI Mortgages, e-Courts NJDG & Diligence Pipeline E2E', tier: 'Tier 1-4' },
  { id: '15', file: '15_test_realtime_async_pipeline_e2e.js', name: 'Real-Time Event-Driven Pipeline & Truth-Serum Verification E2E', title: 'Real-Time Event Pipeline & Truth-Serum E2E', tier: 'Tier 1-5' },
  { id: '16', file: '16_test_live_portal_ingestion_and_truth_serum.js', name: 'Live Portal Ingestion & Section 63 BSA 2023 Truth-Serum E2E', title: 'Live Portal Ingestion & Section 63 BSA 2023 Truth-Serum E2E', tier: 'Tier 1-5' }
];

function runSuiteChild(suite) {
  return new Promise((resolve) => {
    const suitePath = path.join(__dirname, suite.file);
    const start = Date.now();

    console.log(`\n================================================================================`);
    console.log(`▶️  RUNNING: ${suite.file} — ${suite.title}`);
    console.log(`================================================================================`);

    const child = spawn(process.execPath, [suitePath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const str = chunk.toString();
      stdout += str;
      process.stdout.write(str);
    });

    child.stderr.on('data', (chunk) => {
      const str = chunk.toString();
      stderr += str;
      process.stderr.write(str);
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - start;

      // Extract pass/fail numbers from output
      let passed = 0;
      let failed = 0;

      // Pattern 1: "Summary: X Passed, Y Failed out of Z Tests"
      const summaryMatch = stdout.match(/Summary:\s*(\d+)\s+Passed,\s*(\d+)\s+Failed\s+out\s+of\s+(\d+)\s+Tests/i);
      if (summaryMatch) {
        passed = parseInt(summaryMatch[1], 10);
        failed = parseInt(summaryMatch[2], 10);
      } else {
        // Pattern 2: Count ✅ vs ❌
        const passMatches = stdout.match(/(?:✅\s*\[PASS\]|✅\s*Test\s*\d+\s*Passed)/gi);
        const failMatches = stdout.match(/(?:❌\s*\[FAIL\]|❌\s*Test\s*\d+\s*Failed)/gi);

        passed = passMatches ? passMatches.length : (code === 0 ? 1 : 0);
        failed = failMatches ? failMatches.length : (code !== 0 ? 1 : 0);
      }

      if (code !== 0 && failed === 0) {
        failed = 1;
      }

      resolve({
        file: suite.file,
        title: suite.title,
        tier: suite.tier,
        code,
        durationMs,
        passed,
        failed,
        total: passed + failed,
        status: (code === 0 && failed === 0) ? 'PASS' : 'FAIL'
      });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - start;
      console.error(`💥 Failed to spawn ${suite.file}:`, err);
      resolve({
        file: suite.file,
        title: suite.title,
        tier: suite.tier,
        code: 1,
        durationMs,
        passed: 0,
        failed: 1,
        total: 1,
        status: 'CRASH'
      });
    });
  });
}

async function runMasterE2eTestSuite() {
  const masterStart = Date.now();

  console.log('\n================================================================================');
  console.log('🏛️  LANDEED 2.0 (SOVEREIGN DILIGENCE) — MASTER AUTOMATED VERIFICATION SUITE');
  console.log('================================================================================');
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);
  console.log(`Node Environment:    ${process.version} (${process.platform} ${process.arch})`);
  console.log(`Project Directory:   ${path.resolve(__dirname, '..')}`);
  console.log(`Total Suites:        ${SUITES.length} automated test suites\n`);

  const summary = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const s of SUITES) {
    const res = await runSuiteChild(s);
    summary.push(res);
    totalPassed += res.passed;
    totalFailed += res.failed;
  }

  const totalTimeSec = ((Date.now() - masterStart) / 1000).toFixed(2);

  console.log('\n================================================================================');
  console.log('                         MASTER TEST EXECUTION SUMMARY                          ');
  console.log('================================================================================');
  console.log('| #  | Suite Name                                   | Tier       | Tests | Pass | Fail | Status |   Time  |');
  console.log('|----|----------------------------------------------|------------|:-----:|:----:|:----:|:------:|--------:|');

  let idx = 1;
  for (const row of summary) {
    const numPad = String(idx++).padStart(2);
    const namePad = row.title.slice(0, 44).padEnd(44);
    const tierPad = row.tier.padEnd(10);
    const testsPad = String(row.total).padStart(5);
    const passPad = String(row.passed).padStart(4);
    const failPad = String(row.failed).padStart(4);
    const statusIcon = row.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    const timePad = `${(row.durationMs / 1000).toFixed(2)}s`.padStart(8);
    console.log(`| ${numPad} | ${namePad} | ${tierPad} | ${testsPad} | ${passPad} | ${failPad} | ${statusIcon} | ${timePad}|`);
  }

  console.log('|----|----------------------------------------------|------------|:-----:|:----:|:----:|:------:|--------:|');
  const allTests = totalPassed + totalFailed;
  const grandStatus = totalFailed === 0 ? '🏆 ALL PASS' : '⚠️ FAILURES';
  console.log(`|    | TOTALS ACROSS ${SUITES.length} SUITES                      | Tiers 1-4  | ${String(allTests).padStart(5)} | ${String(totalPassed).padStart(4)} | ${String(totalFailed).padStart(4)} | ${grandStatus} | ${totalTimeSec.padStart(7)}s |`);
  console.log('================================================================================\n');

  if (totalFailed === 0) {
    console.log(`🎉 100% SUCCESS: All ${totalPassed} test assertions passed across all ${SUITES.length} suites!`);
    console.log('Landeed 2.0 Sovereign Title Diligence Architecture is fully verified.\n');
    process.exit(0);
  } else {
    console.error(`❌ VERIFICATION FAILED: ${totalFailed} tests failed out of ${allTests}.`);
    process.exit(1);
  }
}

if (require.main === module) {
  runMasterE2eTestSuite();
}

module.exports = { runMasterE2eTestSuite };
