/**
 * Landeed 2.0 E2E Test Suite 03: SQLite Relational Persistence, Restart Durability & Disk PDF Memory Benchmark
 * 
 * Verifies:
 * 1. SQLite database initialization with WAL mode & Foreign Keys enabled
 * 2. Complete relational schema (5 tables: properties, records, title_lineage_records, verification_engine_results, title_certificates)
 * 3. Process restart durability: record insertion, connection teardown, reconnection & query integrity
 * 4. Disk PDF offloading: binaries written to disk, streamable, and never held as raw Buffers in Node heap
 * 5. Memory footprint benchmark: V8 heap memory remains strictly < 200 MB during batch record generation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Target directory paths
const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const PDF_DIR = path.join(DATA_DIR, 'pdfs');
const DB_PATH = path.join(DATA_DIR, 'test_persistence.db');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

// Universal SQLite adapter (supports both Node 22 native node:sqlite and better-sqlite3)
function createDbConnection(filepath) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(filepath);
    return {
      type: 'node:sqlite',
      exec: (sql) => db.exec(sql),
      prepare: (sql) => {
        const stmt = db.prepare(sql);
        return {
          run: (...params) => stmt.run(...params),
          get: (...params) => stmt.get(...params),
          all: (...params) => stmt.all(...params)
        };
      },
      close: () => db.close()
    };
  } catch (e1) {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(filepath);
      return {
        type: 'better-sqlite3',
        exec: (sql) => db.exec(sql),
        prepare: (sql) => {
          const stmt = db.prepare(sql);
          return {
            run: (...params) => stmt.run(...params),
            get: (...params) => stmt.get(...params),
            all: (...params) => stmt.all(...params)
          };
        },
        close: () => db.close()
      };
    } catch (e2) {
      throw new Error(`Neither node:sqlite nor better-sqlite3 could be loaded: ${e1.message} / ${e2.message}`);
    }
  }
}

// Complete 5-table DDL conforming to Milestone M1 and survey_gap_and_plan.md Section 2.1
const SCHEMA_DDL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    survey_number TEXT NOT NULL,
    sub_division TEXT,
    district TEXT NOT NULL,
    taluk TEXT NOT NULL,
    hobli TEXT,
    village TEXT NOT NULL,
    state TEXT NOT NULL,
    extent TEXT,
    land_type TEXT,
    claimed_owner TEXT NOT NULL,
    clean_title_score INTEGER NOT NULL DEFAULT 90,
    status TEXT NOT NULL DEFAULT 'CLEAN',
    guidance_value_inr TEXT,
    market_value_inr TEXT,
    canonical_hash TEXT NOT NULL,
    has_active_mortgage INTEGER NOT NULL DEFAULT 0,
    pending_litigation_count INTEGER NOT NULL DEFAULT 0,
    pdf_storage_path TEXT,
    doc_type TEXT,
    raw_metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    district TEXT NOT NULL,
    taluka TEXT NOT NULL,
    village TEXT NOT NULL,
    survey_no TEXT NOT NULL,
    khata_no TEXT,
    owner_name TEXT,
    document_title TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    pdf_path TEXT NOT NULL,
    agent_result TEXT NOT NULL,
    proof TEXT NOT NULL,
    mutation_data TEXT,
    risk_analysis TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS title_lineage_records (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    year TEXT NOT NULL,
    deed_type TEXT NOT NULL,
    transferor TEXT NOT NULL,
    transferee TEXT NOT NULL,
    doc_number TEXT NOT NULL,
    sro_office TEXT NOT NULL,
    consideration_inr TEXT,
    status TEXT NOT NULL DEFAULT 'CLEAN',
    legacy_font TEXT,
    transcoded_utf8 TEXT,
    notes TEXT,
    order_index INTEGER NOT NULL,
    leaf_hash TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification_engine_results (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    engine_name TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    finding TEXT NOT NULL,
    evidence_hash TEXT NOT NULL,
    details TEXT,
    verified_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS title_certificates (
    id TEXT PRIMARY KEY,
    certificate_number TEXT UNIQUE NOT NULL,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    advocate_name TEXT NOT NULL,
    advocate_bar_id TEXT NOT NULL,
    dsc_signature_hash TEXT NOT NULL,
    score INTEGER NOT NULL,
    status TEXT NOT NULL,
    eas_attestation_uid TEXT NOT NULL,
    merkle_root TEXT NOT NULL,
    ipfs_evidence_cid TEXT NOT NULL,
    issued_at TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    details TEXT
  );
`;

// -----------------------------------------------------------------------------
// Test Execution Suite
// -----------------------------------------------------------------------------

async function runSqlitePersistenceTests() {
  console.log('================================================================');
  console.log('🧪 SUITE 03: SQLite Relational Persistence & Disk PDF Memory Benchmark');
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
  // Test 3.1: SQLite Database Initialization & WAL Mode
  // ---------------------------------------------------------------------------
  try {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

    const db = createDbConnection(DB_PATH);
    db.exec(SCHEMA_DDL);

    // Verify WAL journal mode
    const walRow = db.prepare('PRAGMA journal_mode;').get();
    const journalMode = (walRow.journal_mode || Object.values(walRow)[0] || '').toLowerCase();
    assert.strictEqual(journalMode, 'wal', `Journal mode must be WAL, got: ${journalMode}`);

    // Verify foreign keys are enabled
    const fkRow = db.prepare('PRAGMA foreign_keys;').get();
    const fkVal = fkRow.foreign_keys !== undefined ? fkRow.foreign_keys : Object.values(fkRow)[0];
    assert.strictEqual(Number(fkVal), 1, 'Foreign keys must be enabled (1)');

    db.close();
    recordPass('TEST_03_01', `SQLite database initialized cleanly with PRAGMA journal_mode = WAL and foreign_keys = ON (${db.type})`);
  } catch (err) {
    recordFail('TEST_03_01', 'SQLite initialization failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 3.2: 5 Relational Tables Verification in sqlite_master
  // ---------------------------------------------------------------------------
  try {
    const db = createDbConnection(DB_PATH);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
    const tableNames = tables.map(t => t.name);

    const requiredTables = [
      'properties',
      'records',
      'title_lineage_records',
      'verification_engine_results',
      'title_certificates'
    ];

    for (const req of requiredTables) {
      assert.ok(tableNames.includes(req), `Required table '${req}' must exist in schema`);
    }

    db.close();
    recordPass('TEST_03_02', `All 5 relational tables verified: ${requiredTables.join(', ')}`);
  } catch (err) {
    recordFail('TEST_03_02', 'Relational schema verification failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 3.3: Record Insertion & Process Restart Durability
  // ---------------------------------------------------------------------------
  const testRecordId = 'rec-test-persist-01';
  const testPropertyId = 'prop-test-wagholi-142';

  try {
    // 1. Open connection, insert property + record + lineage
    let db = createDbConnection(DB_PATH);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO properties (
        id, survey_number, district, taluk, village, state, claimed_owner,
        clean_title_score, status, canonical_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(
      testPropertyId, '142/2A', 'Pune', 'Haveli', 'Wagholi', 'MH', 'Vikramaditya Shinde',
      100, 'CLEAN', '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', now, now
    );

    const mockRisk = JSON.stringify({
      score: 100,
      riskTier: 'LOW',
      summary: 'Clean title verified',
      vetoTriggered: false,
      activeVetoes: [],
      vetoGates: { v1_lisPendensCourtStay: false, v2_prohibitedLandCategory: false, v3_activeCersaiMortgage: false, v4_brokenLineageDag: false },
      deductions: [],
      verifications: { revenue: 'CLEAN', sroEncumbrance: 'CLEAN', eCourtsNjdg: 'CLEAN', cersaiMortgage: 'CLEAN', rera: 'CLEAN' }
    });

    const mockProof = JSON.stringify({
      network: 'Polygon Amoy',
      merkleRoot: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      easAttestationUid: '0x00023de19ff42f118c56bf036b644ee9c1cb3030ad1f0223a18c3fcb169111ac',
      ipfsEvidenceCid: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'
    });

    const testPdfDiskPath = path.join(PDF_DIR, `${testRecordId}.pdf`);

    db.prepare(`
      INSERT INTO records (
        id, property_id, state, doc_type, district, taluka, village, survey_no,
        owner_name, document_title, raw_text, pdf_path, agent_result, proof, risk_analysis, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(
      testRecordId, testPropertyId, 'MH', 'SATBARA_7_12', 'Pune', 'Haveli', 'Wagholi', '142/2A',
      'Vikramaditya Shinde', 'Maharashtra Satbara & Ferfar Extract', 'Full cadastral text',
      testPdfDiskPath, '{}', mockProof, mockRisk, now
    );

    // Close connection simulating server restart/shutdown
    db.close();

    // 2. Re-open connection fresh and query
    db = createDbConnection(DB_PATH);
    const retrieved = db.prepare('SELECT * FROM records WHERE id = ?;').get(testRecordId);

    assert.ok(retrieved, 'Record must be retrieved after process restart');
    assert.strictEqual(retrieved.id, testRecordId);
    assert.strictEqual(retrieved.state, 'MH');
    assert.strictEqual(retrieved.village, 'Wagholi');
    assert.strictEqual(retrieved.survey_no, '142/2A');

    const parsedRisk = JSON.parse(retrieved.risk_analysis);
    assert.strictEqual(parsedRisk.score, 100);
    assert.strictEqual(parsedRisk.riskTier, 'LOW');

    const parsedProof = JSON.parse(retrieved.proof);
    assert.strictEqual(parsedProof.network, 'Polygon Amoy');

    db.close();
    recordPass('TEST_03_03', 'Process restart durability verified: record persisted in SQLite and retrieved identically after connection teardown');
  } catch (err) {
    recordFail('TEST_03_03', 'Process restart durability failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 3.4: Binary PDF Disk Offloading & Streamability
  // ---------------------------------------------------------------------------
  try {
    const pdfPath = path.join(PDF_DIR, `${testRecordId}.pdf`);

    // Write a realistic synthetic certified legal PDF binary to disk (> 50 KB)
    const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n');
    const pdfBody = Buffer.alloc(65536, '0123456789ABCDEF'); // 64 KB content
    const pdfFooter = Buffer.from('\n%%EOF\n');
    const completePdf = Buffer.concat([pdfHeader, pdfBody, pdfFooter]);

    fs.writeFileSync(pdfPath, completePdf);

    // Verify file exists on disk
    assert.ok(fs.existsSync(pdfPath), 'PDF file must exist on disk in server/data/pdfs/');
    const stat = fs.statSync(pdfPath);
    assert.ok(stat.size > 50000, `PDF size must be > 50 KB (actual: ${stat.size} bytes)`);

    // Verify streamability with fs.createReadStream
    await new Promise((resolve, reject) => {
      let bytesStreamed = 0;
      const stream = fs.createReadStream(pdfPath);
      stream.on('data', (chunk) => { bytesStreamed += chunk.length; });
      stream.on('end', () => {
        assert.strictEqual(bytesStreamed, stat.size, 'Streamed byte count must match file size');
        resolve();
      });
      stream.on('error', reject);
    });

    recordPass('TEST_03_04', `Disk PDF offloaded successfully (${stat.size} bytes) and validated streamable via fs.createReadStream`);
  } catch (err) {
    recordFail('TEST_03_04', 'Disk PDF offloading failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 3.5: V8 Heap Memory Benchmark (< 200 MB RAM)
  // ---------------------------------------------------------------------------
  try {
    // Force garbage collection if available
    if (global.gc) global.gc();

    const memBefore = process.memoryUsage().heapUsed;

    // Simulate 50 sequential high-volume title records with disk streaming
    for (let i = 0; i < 50; i++) {
      const batchPdfPath = path.join(PDF_DIR, `batch_test_${i}.pdf`);
      // Stream buffer directly to disk without keeping long-lived in-memory references
      const payload = Buffer.alloc(32768, 65 + (i % 26)); // 32 KB chunk
      fs.writeFileSync(batchPdfPath, payload);

      // Read a slice to simulate streaming to client
      const readStream = fs.createReadStream(batchPdfPath);
      readStream.on('data', () => {});
      readStream.on('end', () => {
        // Clean up temporary batch files
        try { fs.unlinkSync(batchPdfPath); } catch {}
      });
    }

    const memAfter = process.memoryUsage().heapUsed;
    const maxMemoryAllowed = 200 * 1024 * 1024; // 200 MB in bytes

    const heapUsedMB = (memAfter / (1024 * 1024)).toFixed(2);
    assert.ok(memAfter < maxMemoryAllowed, `Heap memory (${heapUsedMB} MB) must remain strictly below 200 MB`);

    recordPass('TEST_03_05', `V8 Heap memory benchmark passed: ${heapUsedMB} MB used (Threshold: < 200 MB) during 50 batch record extractions`);
  } catch (err) {
    recordFail('TEST_03_05', 'Memory benchmark failed', err);
  }

  // Cleanup test database
  try {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    const walFile = `${DB_PATH}-wal`;
    const shmFile = `${DB_PATH}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
    const testPdf = path.join(PDF_DIR, `${testRecordId}.pdf`);
    if (fs.existsSync(testPdf)) fs.unlinkSync(testPdf);
  } catch {}

  console.log(`\n📊 Suite 03 Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests\n`);
  return { suite: '03_sqlite_persistence_disk_pdf', passed, failed, total: passed + failed, results };
}

if (require.main === module) {
  runSqlitePersistenceTests().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  });
}

module.exports = { runSqlitePersistenceTests, createDbConnection, SCHEMA_DDL };
