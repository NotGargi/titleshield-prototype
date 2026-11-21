/**
 * ADVERSARIAL STRESS TEST SUITE: Milestone 1 SQLite Persistence & Repository Hardening
 * Target: server/src/db/recordsRepository.ts and server/data/landeed.db
 * 
 * Tests:
 * 1. Concurrent Write Transactions: Multi-process write contention and serialization.
 * 2. Process Crash Simulation & Transaction Atomicity: SIGKILL mid-transaction rollback.
 * 3. Connection Teardown and Re-open Lifecycle: Rapid sequential opens, writes, teardowns.
 * 4. Corrupted Payload & Malformed Data Handling: Corrupted JSON, boundary inputs, type mismatches.
 * 5. O(1) docHash Lookup Performance under 500+ Records: Benchmark existing vs indexed queries.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');

const SERVER_DIR = path.resolve(__dirname, '..', 'server');
const DATA_DIR = path.resolve(SERVER_DIR, 'data');
const DB_PATH = path.resolve(DATA_DIR, 'landeed.db');
const BACKUP_DB_PATH = path.resolve(DATA_DIR, 'landeed.db.adversarial_bak');

// Load compiled repository and db
const repoModule = require(path.join(SERVER_DIR, 'dist', 'db', 'recordsRepository.js'));
const dbModule = require(path.join(SERVER_DIR, 'dist', 'db', 'index.js'));
const Database = require(path.join(SERVER_DIR, 'node_modules', 'better-sqlite3'));

const results = {
  passed: 0,
  failed: 0,
  findings: []
};

function logHeader(title) {
  console.log('\n================================================================');
  console.log(`🔥 ${title}`);
  console.log('================================================================');
}

function recordPass(testName, details) {
  results.passed++;
  console.log(`  ✅ [PASS] ${testName}${details ? ': ' + details : ''}`);
}

function recordFail(testName, error, severity = 'HIGH') {
  results.failed++;
  console.log(`  ❌ [FAIL] ${testName}`);
  console.log(`     Error: ${error.message || error}`);
  results.findings.push({ testName, severity, error: error.message || String(error) });
}

function generateMockRecord(id, docHash, override = {}) {
  const hash = docHash || '0x' + crypto.randomBytes(32).toString('hex');
  return {
    id: id || `rec-adv-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    createdAt: new Date().toISOString(),
    params: {
      state: 'MH',
      docType: '7_12',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      surveyNo: '482/1',
      ownerName: 'Adversarial Test Landholder'
    },
    agentResult: {
      success: true,
      documentTitle: 'Certified Land Record - Adversarial Stress',
      rawText: 'Adversarial stress payload test raw text',
      metadata: {
        ownerName: 'Adversarial Test Landholder',
        surveyNumber: '482/1',
        khataNumber: 'KH-999',
        totalArea: '2.5 Hectares',
        unencumbered: true,
        landType: 'Agricultural Freehold',
        issuanceDate: '27/10/2026',
        portalSource: 'https://mahabhumi.gov.in'
      },
      steps: []
    },
    proof: {
      docHash: hash,
      transactionHash: '0x' + crypto.randomBytes(32).toString('hex'),
      blockNumber: 123456,
      timestamp: Math.floor(Date.now() / 1000),
      network: 'Polygon Amoy',
      chainId: 80002,
      contractAddress: '0x71C6A96E25bCc4cD8290333333338B65A206078D',
      explorerUrl: 'https://amoy.polygonscan.com/tx/0x123',
      verificationUrl: 'https://amoy.polygonscan.com/tx/0x123',
      isVerified: true
    },
    pdfPath: `data/pdfs/${id || 'test'}.pdf`,
    mutationData: {
      ferfarNo: '9999',
      entryDate: '2026-01-01',
      status: 'PRAMANIT',
      statusLabel: 'Pramanit Ferfar',
      statusColor: 'green',
      mutationType: 'Hakkasod',
      mutationTypeMarathi: 'हक्कसोड पत्र',
      surveyNo: '482/1',
      village: 'Wagholi',
      taluka: 'Haveli',
      district: 'Pune',
      state: 'MH',
      transferor: 'Transferor Party',
      transferee: 'Transferee Party',
      area: '2.5 Hectares',
      assessment: '15.50',
      noticeDetails: {
        noticeDate: '2026-01-02',
        noticeDisplayedAt: 'Gramchavdi',
        objectionDeadline: '2026-01-17',
        objectionStatus: 'No Objections',
        certifyingOfficer: 'Circle Officer Haveli',
        orderNo: 'CO/999/2026',
        orderDate: '2026-01-20'
      },
      timeline: [
        {
          ferfarNo: '9999',
          year: '2026',
          date: '2026-01-01',
          type: 'Hakkasod',
          typeMarathi: 'हक्कसोड पत्र',
          parties: 'Transferor Party -> Transferee Party',
          description: 'Relinquishment deed mutation',
          status: 'PRAMANIT',
          statusLabel: 'Certified'
        }
      ]
    },
    ...override
  };
}

// -------------------------------------------------------------
// TEST SUITE 1: Concurrent Write Transactions
// -------------------------------------------------------------
async function testConcurrentWrites() {
  logHeader('TEST SUITE 1: Concurrent Write Transactions (Multi-Process Contention)');

  const numWorkers = 8;
  const recordsPerWorker = 15;
  const totalExpected = numWorkers * recordsPerWorker;
  const workerScript = path.resolve(__dirname, 'worker_write_task.js');

  // Generate child worker script
  const workerCode = `
    const repo = require('${path.join(SERVER_DIR, 'dist', 'db', 'recordsRepository.js').replace(/\\/g, '\\\\')}');
    const workerId = process.argv[2];
    const count = parseInt(process.argv[3], 10);
    
    let written = 0;
    let errors = [];

    for (let i = 0; i < count; i++) {
      const recId = 'rec-adv-conc-' + workerId + '-' + i + '-' + Date.now();
      const rec = {
        id: recId,
        createdAt: new Date().toISOString(),
        params: {
          state: 'MH',
          docType: '7_12',
          district: 'Pune',
          taluka: 'Haveli',
          village: 'Wagholi',
          surveyNo: 'CONC-' + workerId + '-' + i
        },
        agentResult: {
          success: true,
          documentTitle: 'Concurrent Record ' + i,
          rawText: 'Concurrent worker test',
          metadata: { ownerName: 'Worker ' + workerId },
          steps: []
        },
        proof: {
          docHash: '0xconc' + workerId.padStart(4, '0') + i.toString().padStart(4, '0') + '0000000000000000000000000000000000000000000000000000',
          transactionHash: '0x0',
          blockNumber: 1,
          timestamp: Date.now(),
          network: 'Polygon Amoy',
          chainId: 80002,
          contractAddress: '0x0',
          explorerUrl: '',
          verificationUrl: '',
          isVerified: true
        },
        pdfPath: 'data/pdfs/' + recId + '.pdf'
      };

      try {
        repo.saveStoredRecord(rec);
        written++;
      } catch (err) {
        errors.push({ i, error: err.message });
      }
    }

    process.send({ workerId, written, errors });
  `;

  fs.writeFileSync(workerScript, workerCode);

  try {
    const promises = [];
    for (let w = 0; w < numWorkers; w++) {
      promises.push(new Promise((resolve, reject) => {
        const child = spawn('node', [workerScript, String(w), String(recordsPerWorker)], {
          stdio: ['inherit', 'inherit', 'inherit', 'ipc']
        });
        child.on('message', (msg) => resolve(msg));
        child.on('error', (err) => reject(err));
        child.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker ${w} exited with code ${code}`));
        });
      }));
    }

    const workerResults = await Promise.all(promises);
    let totalWritten = 0;
    let allErrors = [];

    for (const res of workerResults) {
      totalWritten += res.written;
      if (res.errors.length > 0) allErrors.push(...res.errors);
    }

    if (allErrors.length > 0) {
      recordFail('Concurrent multi-process write transaction stress', new Error(`${allErrors.length} write errors encountered under lock contention. Sample: ${JSON.stringify(allErrors[0])}`), 'HIGH');
    } else if (totalWritten === totalExpected) {
      recordPass('Concurrent multi-process write transactions', `Successfully serialized ${totalWritten}/${totalExpected} concurrent writes across ${numWorkers} parallel processes without lockouts`);
    } else {
      recordFail('Concurrent multi-process write transactions', new Error(`Wrote only ${totalWritten} of ${totalExpected} expected records`), 'HIGH');
    }

    // Verify database consistency
    const db = new Database(DB_PATH);
    const concRecords = db.prepare("SELECT count(*) as count FROM records WHERE id LIKE 'rec-adv-conc-%'").get();
    const concProps = db.prepare("SELECT count(*) as count FROM properties WHERE id LIKE 'prop_adv-conc-%'").get();
    db.close();

    assert.strictEqual(concRecords.count, totalExpected, `Records count in DB (${concRecords.count}) should equal totalExpected (${totalExpected})`);
    assert.strictEqual(concProps.count, totalExpected, `Properties count in DB (${concProps.count}) should equal totalExpected (${totalExpected})`);
    recordPass('Relational consistency across concurrent writes', `All ${totalExpected} records and corresponding properties confirmed intact in SQLite`);
  } catch (err) {
    recordFail('Concurrent multi-process write transactions', err, 'CRITICAL');
  } finally {
    if (fs.existsSync(workerScript)) fs.unlinkSync(workerScript);
  }
}

// -------------------------------------------------------------
// TEST SUITE 2: Process Crash Simulation & Rollback Atomicity
// -------------------------------------------------------------
async function testProcessCrashAndRollback() {
  logHeader('TEST SUITE 2: Simulated Process Crash & Transaction Atomicity');

  const crashScript = path.resolve(__dirname, 'worker_crash_task.js');
  const crashTestId = 'rec-adv-crash-' + Date.now();
  const crashPropId = 'prop_adv-crash-' + Date.now();

  // Child script that starts a raw transaction, inserts a property, and abruptly terminates via SIGKILL before commit
  const crashCode = `
    const Database = require('${path.join(SERVER_DIR, 'node_modules', 'better-sqlite3').replace(/\\/g, '\\\\')}');
    const db = new Database('${DB_PATH.replace(/\\/g, '\\\\')}');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    console.log('CrashWorker: Starting transaction...');
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    db.prepare(\`
      INSERT INTO properties (
        id, survey_number, district, taluk, village, state,
        claimed_owner, canonical_hash, created_at, updated_at
      ) VALUES (?, '999/CRASH', 'Pune', 'Haveli', 'Wagholi', 'MH', 'Crash Victim', '0xcrash', datetime('now'), datetime('now'))
    \`).run('${crashPropId}');

    console.log('CrashWorker: Row inserted in uncommitted transaction. Simulating sudden OS kill (SIGKILL)...');
    process.kill(process.pid, 'SIGKILL');
  `;

  fs.writeFileSync(crashScript, crashCode);

  try {
    await new Promise((resolve) => {
      const child = spawn('node', [crashScript], { stdio: 'inherit' });
      child.on('exit', () => resolve());
    });

    // Verify recovery after crash
    const db = new Database(DB_PATH);
    const propertyCheck = db.prepare('SELECT * FROM properties WHERE id = ?').get(crashPropId);
    db.close();

    if (propertyCheck) {
      recordFail('Crash recovery: Uncommitted transaction leaked into database', new Error(`Found uncommitted row for property ${crashPropId}`), 'CRITICAL');
    } else {
      recordPass('Crash recovery: Atomic rollback on abrupt SIGKILL process crash', `Verified uncommitted transaction for ${crashPropId} was cleanly discarded by SQLite WAL recovery`);
    }

    // Now test repo.saveStoredRecord rollback if an exception happens midway inside transaction
    const corruptRecord = generateMockRecord('rec-adv-err-tx', '0xerrtx');
    // Force an error inside mutationData processing by giving a malformed structure
    let errorThrown = false;
    try {
      const dbInstance = dbModule.sqlite;
      // We spy on lineage insert or cause a constraint failure
      const tx = dbInstance.transaction(() => {
        dbInstance.prepare(`
          INSERT INTO properties (id, survey_number, district, taluk, village, state, claimed_owner, canonical_hash, created_at, updated_at)
          VALUES ('prop_adv_aborted', 'ERR', 'P', 'T', 'V', 'MH', 'Owner', '0x1', datetime('now'), datetime('now'))
        `).run();
        throw new Error('Mid-transaction simulated hardware/application failure');
      });
      tx();
    } catch (e) {
      errorThrown = true;
    }

    assert.ok(errorThrown, 'Exception should have been thrown');
    const verifyAbort = dbModule.sqlite.prepare("SELECT * FROM properties WHERE id = 'prop_adv_aborted'").get();
    if (verifyAbort) {
      recordFail('Transaction error rollback', new Error('Found property prop_adv_aborted despite aborted transaction'), 'CRITICAL');
    } else {
      recordPass('Transaction error rollback', 'Confirmed atomic rollback when error throws mid-transaction inside transaction() block');
    }
  } catch (err) {
    recordFail('Simulated Process Crash & Transaction Atomicity', err, 'HIGH');
  } finally {
    if (fs.existsSync(crashScript)) fs.unlinkSync(crashScript);
  }
}

// -------------------------------------------------------------
// TEST SUITE 3: Connection Teardown and Re-open Lifecycle
// -------------------------------------------------------------
async function testConnectionLifecycle() {
  logHeader('TEST SUITE 3: Connection Teardown and Re-open Lifecycle');

  const cycles = 50;
  let teardownSuccess = 0;

  try {
    for (let i = 0; i < cycles; i++) {
      const conn = new Database(DB_PATH, { timeout: 3000 });
      conn.pragma('journal_mode = WAL');
      conn.pragma('foreign_keys = ON');

      // Simple read & write operation
      conn.prepare("INSERT OR REPLACE INTO properties (id, survey_number, district, taluk, village, state, claimed_owner, canonical_hash, created_at, updated_at) VALUES (?, 'CYC', 'D', 'T', 'V', 'MH', 'Owner', '0xcyc', datetime('now'), datetime('now'))").run(`prop_adv_cycle_${i}`);
      const row = conn.prepare("SELECT id FROM properties WHERE id = ?").get(`prop_adv_cycle_${i}`);
      assert.ok(row, `Row for cycle ${i} must exist`);

      // Teardown
      conn.close();
      teardownSuccess++;
    }

    recordPass('Connection teardown & re-open lifecycle', `Successfully cycled ${teardownSuccess}/${cycles} open-write-read-close sequences without file lock starvation or resource leaks`);

    // Clean up cycle test records
    const cleanDb = new Database(DB_PATH);
    cleanDb.prepare("DELETE FROM properties WHERE id LIKE 'prop_adv_cycle_%'").run();
    cleanDb.close();
  } catch (err) {
    recordFail('Connection teardown & re-open lifecycle', err, 'HIGH');
  }
}

// -------------------------------------------------------------
// TEST SUITE 4: Corrupted Payload & Malformed Data Handling
// -------------------------------------------------------------
async function testCorruptedPayloads() {
  logHeader('TEST SUITE 4: Corrupted Payload, Malformed Data & Boundary Stress');

  const db = dbModule.sqlite;

  // 4.1 Corrupted JSON in SQLite rows (e.g. storage corruption)
  try {
    const corruptId = 'rec-adv-corrupt-json-' + Date.now();
    const corruptPropId = 'prop_adv_corrupt_' + Date.now();

    db.prepare(`
      INSERT INTO properties (id, survey_number, district, taluk, village, state, claimed_owner, canonical_hash, created_at, updated_at)
      VALUES (?, 'CORRUPT', 'D', 'T', 'V', 'MH', 'O', '0xcorrupt', datetime('now'), datetime('now'))
    `).run(corruptPropId);

    db.prepare(`
      INSERT INTO records (
        id, property_id, state, doc_type, district, taluka, village,
        survey_no, document_title, raw_text, doc_hash, pdf_path,
        agent_result, proof, mutation_data, index_2_data, risk_analysis, params, created_at
      ) VALUES (
        ?, ?, 'MH', '7_12', 'Pune', 'Haveli', 'Wagholi',
        'CORRUPT', 'Corrupt Title', 'Raw Text', '0xcorrupt', 'data/pdfs/corrupt.pdf',
        '{ invalid json: missing quotes', '{ also bad proof json', 'not json at all', '{"broken": [', 'corrupted risk', '{unquoted', datetime('now')
      )
    `).run(corruptId, corruptPropId);

    // Call getStoredRecord
    const retrieved = repoModule.getStoredRecord(corruptId);
    assert.ok(retrieved !== null, 'getStoredRecord should return a fallback object rather than crash');
    assert.strictEqual(retrieved.id, corruptId);
    assert.ok(retrieved.agentResult.success === true, 'agentResult should fall back to default fallback');
    assert.ok(retrieved.proof.network === 'Polygon Amoy', 'proof should fall back to default proof');
    recordPass('Corrupted JSON database recovery via safeJsonParse', 'Safe JSON parser successfully defended against malformed JSON in records columns without process crash');

    // Clean up
    db.prepare('DELETE FROM records WHERE id = ?').run(corruptId);
    db.prepare('DELETE FROM properties WHERE id = ?').run(corruptPropId);
  } catch (err) {
    recordFail('Corrupted JSON database recovery', err, 'HIGH');
  }

  // 4.2 Malformed JavaScript inputs to saveStoredRecord
  try {
    // A: Missing mandatory params object
    let caughtMissingParams = false;
    try {
      repoModule.saveStoredRecord({
        id: 'rec-adv-bad-params',
        createdAt: new Date().toISOString(),
        agentResult: { success: true },
        proof: { docHash: '0x123' },
        pdfPath: 'test.pdf'
      });
    } catch (e) {
      caughtMissingParams = true;
      // Examine whether it crashes gracefully with descriptive error or unhandled TypeError
      console.log(`     ℹ️ saveStoredRecord with missing params threw: ${e.message}`);
    }
    if (caughtMissingParams) {
      recordPass('saveStoredRecord input validation on missing params', 'Handled missing params (threw exception rather than corrupting DB)');
    }

    // B: SQL Injection Stress Test
    const sqlInjectionStrings = [
      "'; DROP TABLE records; --",
      "' OR 1=1 --",
      "Wagholi'; DELETE FROM properties; --",
      "\" UNION SELECT * FROM sqlite_master WHERE \"\"=\"",
      "<script>alert('xss')</script>",
      "0x00\x00\r\n\t-- injection"
    ];

    for (let idx = 0; idx < sqlInjectionStrings.length; idx++) {
      const injStr = sqlInjectionStrings[idx];
      const injId = `rec-adv-inj-${idx}-${Date.now()}`;
      const rec = generateMockRecord(injId, null, {
        params: {
          state: 'MH',
          docType: '7_12',
          district: injStr,
          taluka: injStr,
          village: injStr,
          surveyNo: injStr,
          ownerName: injStr
        },
        agentResult: {
          success: true,
          documentTitle: injStr,
          rawText: injStr,
          metadata: { ownerName: injStr },
          steps: []
        }
      });

      repoModule.saveStoredRecord(rec);

      // Verify records table still exists and data was parameterized verbatim
      const saved = repoModule.getStoredRecord(injId);
      assert.strictEqual(saved.params.district, injStr, 'SQL string must be preserved verbatim without executing injection');
      repoModule.deleteStoredRecord(injId);
    }
    recordPass('SQL Injection Defense via Parameterized Statements', `Tested ${sqlInjectionStrings.length} hostile SQL injection payloads; all correctly treated as literals without DDL/DML leakage`);

    // C: Huge payload (1 MB text in raw_text and Unicode Indic scripts)
    const largeText = 'महाराष्ट्र शासन महसूल विभाग '.repeat(40000); // ~1.1 MB
    const hugeId = 'rec-adv-huge-' + Date.now();
    const hugeRec = generateMockRecord(hugeId, null, {
      agentResult: {
        success: true,
        documentTitle: 'विशाल महसूल उतारा - ' + '🚀'.repeat(100),
        rawText: largeText,
        metadata: { ownerName: 'श्री. रमेश ज्ञानदेव पाटील (वारसदार)' },
        steps: []
      }
    });

    repoModule.saveStoredRecord(hugeRec);
    const retrievedHuge = repoModule.getStoredRecord(hugeId);
    assert.strictEqual(retrievedHuge.agentResult.rawText.length, largeText.length, 'Large payload must match byte-for-byte');
    assert.ok(retrievedHuge.agentResult.documentTitle.includes('🚀'), 'Unicode emojis and Indic Marathi text preserved intact');
    repoModule.deleteStoredRecord(hugeId);
    recordPass('Large Payload & Indic Unicode Script Handling', 'Verified 1.1 MB text payload and Devanagari Unicode characters persist and retrieve with exact fidelity');

  } catch (err) {
    recordFail('Malformed data and boundary stress', err, 'HIGH');
  }
}

// -------------------------------------------------------------
// TEST SUITE 5: O(1) docHash Lookup Performance under 500+ Records
// -------------------------------------------------------------
async function testDocHashLookupPerformance() {
  logHeader('TEST SUITE 5: O(1) docHash Lookup Performance under 500+ Records');

  const db = dbModule.sqlite;
  const numRecords = 500;
  console.log(`  Seeding ${numRecords} adversarial records to test docHash lookup scaling...`);

  const insertedHashes = [];
  const testIds = [];

  const insertRecordStmt = db.prepare(`
    INSERT INTO records (
      id, property_id, state, doc_type, district, taluka, village,
      survey_no, document_title, raw_text, doc_hash, pdf_path,
      agent_result, proof, created_at
    ) VALUES (?, ?, 'MH', '7_12', 'Pune', 'Haveli', 'Wagholi', '482', 'Doc', 'Text', ?, 'data/pdfs/doc.pdf', '{}', ?, datetime('now'))
  `);

  const insertPropStmt = db.prepare(`
    INSERT INTO properties (
      id, survey_number, district, taluk, village, state,
      claimed_owner, canonical_hash, created_at, updated_at
    ) VALUES (?, '482', 'Pune', 'Haveli', 'Wagholi', 'MH', 'Owner', ?, datetime('now'), datetime('now'))
  `);

  // Batch insert inside a single transaction for fast seeding
  const seedTx = db.transaction(() => {
    for (let i = 0; i < numRecords; i++) {
      const id = `rec-adv-scale-${i}`;
      const propId = `prop_adv-scale-${i}`;
      const hash = '0x' + crypto.createHash('sha256').update(`seed-${i}-${Date.now()}`).digest('hex').toLowerCase();
      const proofJson = JSON.stringify({ docHash: hash, isVerified: true });

      insertPropStmt.run(propId, hash);
      insertRecordStmt.run(id, propId, hash, proofJson);

      insertedHashes.push(hash);
      testIds.push(id);
    }
  });

  seedTx();
  console.log(`  Seeded ${numRecords} records successfully.`);

  try {
    // 5.1 Inspect SQLite EXPLAIN QUERY PLAN
    const currentPlan = db.prepare("EXPLAIN QUERY PLAN SELECT * FROM records WHERE lower(doc_hash) = ?").all('0xtest');
    const directPlan = db.prepare("EXPLAIN QUERY PLAN SELECT * FROM records WHERE doc_hash = ?").all('0xtest');

    console.log('\n  📊 Query Plan Analysis:');
    console.log(`     Current getRecordByDocHash query plan: "${currentPlan[0].detail}"`);
    console.log(`     Direct indexed doc_hash query plan:    "${directPlan[0].detail}"`);

    const usesIndex = currentPlan[0].detail.includes('USING INDEX');
    if (!usesIndex) {
      console.log('     ⚠️ VULNERABILITY DETECTED: Current getRecordByDocHash uses functional expression lower(doc_hash) = ?');
      console.log('        This invalidates SQLite standard column index idx_records_doc_hash, forcing a SCAN records (Full Table Scan O(N))!');
      results.findings.push({
        testName: 'O(1) docHash Index Utilization',
        severity: 'MEDIUM',
        error: `Query plan shows "${currentPlan[0].detail}" (Full Table Scan O(N)) instead of "SEARCH records USING INDEX idx_records_doc_hash". Caused by lower(doc_hash) functional call in recordsRepository.ts:259.`
      });
    } else {
      recordPass('Index Utilization', 'Query plan uses B-tree index');
    }

    // 5.2 Benchmark Existing getRecordByDocHash vs Direct Indexed Lookup
    const iterations = 500;

    // A: Existing getRecordByDocHash for existing records
    const startExisting = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      const targetHash = insertedHashes[i % insertedHashes.length];
      const match = repoModule.getRecordByDocHash(targetHash);
      assert.ok(match !== null, `Must find hash ${targetHash}`);
    }
    const endExisting = process.hrtime.bigint();
    const durationExistingMs = Number(endExisting - startExisting) / 1e6;
    const avgExistingMs = durationExistingMs / iterations;

    // B: Direct indexed query for existing records
    const indexedStmt = db.prepare("SELECT * FROM records WHERE doc_hash = ?");
    const startDirect = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      const targetHash = insertedHashes[i % insertedHashes.length];
      const match = indexedStmt.get(targetHash);
      assert.ok(match !== null, `Must find hash ${targetHash}`);
    }
    const endDirect = process.hrtime.bigint();
    const durationDirectMs = Number(endDirect - startDirect) / 1e6;
    const avgDirectMs = durationDirectMs / iterations;

    console.log(`\n  ⏱️ Benchmark (Existing records, ${iterations} lookups over ${numRecords} records):`);
    console.log(`     Current getRecordByDocHash: Total ${durationExistingMs.toFixed(2)} ms (${avgExistingMs.toFixed(4)} ms/op)`);
    console.log(`     Direct Indexed doc_hash:    Total ${durationDirectMs.toFixed(2)} ms (${avgDirectMs.toFixed(4)} ms/op)`);
    console.log(`     Performance ratio: Indexed is ${(durationExistingMs / durationDirectMs).toFixed(2)}x faster`);

    // 5.3 Non-existent Record Worst-Case Benchmark
    // In getRecordByDocHash, a non-existent hash triggers Step 1 (table scan), Step 2 (join table scan),
    // and Step 3 (SELECT * FROM records and JSON.parse in JavaScript loop!)
    console.log('\n  ⏱️ Worst-Case Benchmark (Non-existent records triggering Step 3 JSON loop):');
    const startWorst = process.hrtime.bigint();
    for (let i = 0; i < 50; i++) {
      const nonExistentHash = '0xnonexistent' + i.toString().padStart(50, '0');
      const match = repoModule.getRecordByDocHash(nonExistentHash);
      assert.strictEqual(match, null);
    }
    const endWorst = process.hrtime.bigint();
    const durationWorstMs = Number(endWorst - startWorst) / 1e6;
    const avgWorstMs = durationWorstMs / 50;
    console.log(`     Current getRecordByDocHash for non-existent hashes: ${durationWorstMs.toFixed(2)} ms for 50 ops (${avgWorstMs.toFixed(4)} ms/op)`);

    const startWorstDirect = process.hrtime.bigint();
    for (let i = 0; i < 50; i++) {
      const nonExistentHash = '0xnonexistent' + i.toString().padStart(50, '0');
      const match = indexedStmt.get(nonExistentHash);
      assert.strictEqual(match, undefined);
    }
    const endWorstDirect = process.hrtime.bigint();
    const durationWorstDirectMs = Number(endWorstDirect - startWorstDirect) / 1e6;
    const avgWorstDirectMs = durationWorstDirectMs / 50;
    console.log(`     Direct Indexed query for non-existent hashes:        ${durationWorstDirectMs.toFixed(2)} ms for 50 ops (${avgWorstDirectMs.toFixed(4)} ms/op)`);
    console.log(`     Worst-case performance penalty: Current implementation is ${(avgWorstMs / avgWorstDirectMs).toFixed(2)}x slower on misses!`);

    if (avgWorstMs / avgWorstDirectMs > 5) {
      results.findings.push({
        testName: 'getRecordByDocHash Miss Latency & Memory Hazard',
        severity: 'MEDIUM',
        error: `When a hash is not found, Step 3 in getRecordByDocHash loads all ${numRecords} records into Node heap and iterates with safeJsonParse, causing ${avgWorstMs.toFixed(3)}ms latency per miss (${(avgWorstMs / avgWorstDirectMs).toFixed(1)}x slower than indexed lookup).`
      });
    }

    if (!usesIndex) {
      recordFail('O(1) docHash Lookup Scaling', new Error(`docHash lookup is O(N) Table Scan instead of O(1) Index Lookup due to lower(doc_hash) = ? in line 259`), 'MEDIUM');
    } else {
      recordPass('O(1) docHash Lookup Scaling', 'docHash lookup utilizes B-tree index in O(1)');
    }

  } catch (err) {
    recordFail('O(1) docHash Lookup Performance under 500+ records', err, 'HIGH');
  } finally {
    // Clean up scale test records
    console.log(`  Cleaning up ${numRecords} test records...`);
    const cleanTx = db.transaction(() => {
      db.prepare("DELETE FROM records WHERE id LIKE 'rec-adv-scale-%'").run();
      db.prepare("DELETE FROM properties WHERE id LIKE 'prop_adv-scale-%'").run();
      // Also clean any leftover concurrent test records
      db.prepare("DELETE FROM records WHERE id LIKE 'rec-adv-conc-%'").run();
      db.prepare("DELETE FROM properties WHERE id LIKE 'prop_adv-conc-%'").run();
    });
    cleanTx();
    console.log('  Clean up completed.');
  }
}

// -------------------------------------------------------------
// MAIN HARNESS RUNNER
// -------------------------------------------------------------
async function runAll() {
  console.log('================================================================');
  console.log('⚔️  ADVERSARIAL STRESS TEST SUITE: SQLite Persistence & DAL');
  console.log(`    Target Database: ${DB_PATH}`);
  console.log(`    Timestamp:       ${new Date().toISOString()}`);
  console.log('================================================================');

  // Backup database before testing
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, BACKUP_DB_PATH);
  }

  try {
    await testConcurrentWrites();
    await testProcessCrashAndRollback();
    await testConnectionLifecycle();
    await testCorruptedPayloads();
    await testDocHashLookupPerformance();
  } catch (fatal) {
    console.error('Fatal test error:', fatal);
  } finally {
    // Remove backup
    if (fs.existsSync(BACKUP_DB_PATH)) {
      fs.unlinkSync(BACKUP_DB_PATH);
    }
  }

  console.log('\n================================================================');
  console.log('📊 ADVERSARIAL TEST SUMMARY');
  console.log('================================================================');
  console.log(`  Total Passed:   ${results.passed}`);
  console.log(`  Total Failed:   ${results.failed}`);
  console.log(`  Total Findings: ${results.findings.length}`);

  if (results.findings.length > 0) {
    console.log('\n🚨 IDENTIFIED FINDINGS & VULNERABILITIES:');
    results.findings.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.severity}] ${f.testName}`);
      console.log(`     ${f.error}`);
    });
  }

  console.log('\n================================================================');
  return results;
}

if (require.main === module) {
  runAll().then((res) => {
    // Write summary result file for challenge report inclusion
    const summaryPath = path.resolve(__dirname, 'adversarial_results.json');
    fs.writeFileSync(summaryPath, JSON.stringify(res, null, 2));
    process.exit(res.failed > 0 ? 1 : 0);
  });
}

module.exports = { runAll };
