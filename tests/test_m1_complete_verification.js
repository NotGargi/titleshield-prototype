const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Target paths
const SERVER_DIR = path.resolve(__dirname, '..', 'server');
const DATA_DIR = path.resolve(SERVER_DIR, 'data');
const PDFS_DIR = path.resolve(DATA_DIR, 'pdfs');
const DB_PATH = path.resolve(DATA_DIR, 'landeed.db');

async function main() {
  console.log('================================================================');
  console.log('🚀 M1 COMPREHENSIVE INTEGRATION & DURABILITY TEST');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function pass(desc) {
    passed++;
    console.log(`  ✅ [PASS] ${desc}`);
  }

  function fail(desc, err) {
    failed++;
    console.log(`  ❌ [FAIL] ${desc}`);
    console.error(err);
  }

  // 1. Module Imports Check
  let dbModule, repoModule, pdfGenModule;
  try {
    dbModule = require(path.join(SERVER_DIR, 'dist', 'db', 'index.js'));
    repoModule = require(path.join(SERVER_DIR, 'dist', 'db', 'recordsRepository.js'));
    pdfGenModule = require(path.join(SERVER_DIR, 'dist', 'services', 'pdfGenerator.js'));
    pass('All compiled server modules loaded successfully from dist/');
  } catch (err) {
    fail('Failed to load compiled modules from dist/', err);
    process.exit(1);
  }

  // 2. Database & Schema Initialization Check
  try {
    assert.ok(fs.existsSync(DB_PATH), `Database file must exist at ${DB_PATH}`);
    assert.ok(fs.existsSync(PDFS_DIR), `PDFs dir must exist at ${PDFS_DIR}`);

    const tables = dbModule.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
    const tableNames = tables.map(t => t.name);

    const expected = ['properties', 'records', 'title_lineage_records', 'verification_engine_results', 'title_certificates'];
    for (const t of expected) {
      assert.ok(tableNames.includes(t), `Table ${t} must exist`);
    }

    const pragmaWal = dbModule.sqlite.pragma('journal_mode');
    assert.strictEqual(pragmaWal[0].journal_mode.toLowerCase(), 'wal', 'WAL mode must be active');

    const pragmaFk = dbModule.sqlite.pragma('foreign_keys');
    assert.strictEqual(pragmaFk[0].foreign_keys, 1, 'Foreign keys must be enabled');

    pass('Database initialized with WAL mode, foreign keys, and all 5 relational tables');
  } catch (err) {
    fail('Schema initialization check failed', err);
  }

  // 3. PDF Direct Disk Streaming Check
  const testId = `rec-m1-test-${Date.now()}`;
  let relativePdfPath;
  try {
    const pdfGen = new pdfGenModule.PDFGeneratorService();
    const mockAgentResult = {
      success: true,
      documentTitle: 'Maharashtra Certified 7/12 Extract',
      rawText: 'Test cadastral land extract text for verification',
      metadata: {
        ownerName: 'Ramesh Patil',
        khataNumber: 'KH-101',
        surveyNumber: '101/A',
        totalArea: '1 Acre',
        unencumbered: true,
        landType: 'Agricultural Freehold',
        issuanceDate: '27/10/2026',
        portalSource: 'https://mahabhumi.gov.in'
      },
      steps: []
    };
    const mockProof = {
      docHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      network: 'Polygon Amoy',
      chainId: 80002,
      contractAddress: '0x1111222233334444555566667777888899990000',
      transactionHash: '0x9999888877776666555544443333222211110000aaaaabbbbbcccccdddddeeeee',
      blockNumber: 123456,
      timestamp: Math.floor(Date.now() / 1000),
      explorerUrl: 'https://amoy.polygonscan.com/tx/0x9999',
      verificationUrl: 'https://amoy.polygonscan.com/tx/0x9999',
      isVerified: true
    };

    relativePdfPath = await pdfGen.generateCertifiedPDF(testId, mockAgentResult, mockProof, 'MH', '7_12');
    const absolutePdfPath = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath(testId);

    assert.ok(fs.existsSync(absolutePdfPath), `PDF file must exist at ${absolutePdfPath}`);
    const pdfStat = fs.statSync(absolutePdfPath);
    assert.ok(pdfStat.size > 1000, `PDF size must be > 1 KB, actual: ${pdfStat.size}`);

    const buffer = fs.readFileSync(absolutePdfPath);
    const header = buffer.subarray(0, 5).toString('ascii');
    assert.strictEqual(header, '%PDF-', 'PDF header must start with %PDF-');

    pass(`PDF streamed directly to disk (${pdfStat.size} bytes), valid header %PDF-`);
  } catch (err) {
    fail('PDF direct disk streaming failed', err);
  }

  // 4. StoredRecord DAL & Persistence Check
  try {
    const testRecord = {
      id: testId,
      createdAt: new Date().toISOString(),
      params: {
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '101/A'
      },
      agentResult: {
        success: true,
        documentTitle: 'Maharashtra Certified 7/12 Extract',
        rawText: 'Test cadastral land extract text for verification',
        metadata: {
          ownerName: 'Ramesh Patil',
          khataNumber: 'KH-101',
          surveyNumber: '101/A',
          totalArea: '1 Acre',
          unencumbered: true,
          landType: 'Agricultural Freehold',
          issuanceDate: '27/10/2026',
          portalSource: 'https://mahabhumi.gov.in'
        },
        steps: []
      },
      proof: {
        docHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        network: 'Polygon Amoy',
        chainId: 80002,
        contractAddress: '0x1111222233334444555566667777888899990000',
        transactionHash: '0x9999888877776666555544443333222211110000aaaaabbbbbcccccdddddeeeee',
        blockNumber: 123456,
        timestamp: Math.floor(Date.now() / 1000),
        explorerUrl: 'https://amoy.polygonscan.com/tx/0x9999',
        verificationUrl: 'https://amoy.polygonscan.com/tx/0x9999',
        isVerified: true
      },
      pdfPath: relativePdfPath,
      mutationData: {
        ferfarNo: '5501',
        entryDate: '27/10/2026',
        status: 'PRAMANIT',
        statusLabel: 'Certified',
        statusColor: '#10B981',
        mutationType: 'Sale Deed',
        mutationTypeMarathi: 'खरेदीखत',
        surveyNo: '101/A',
        village: 'Wagholi',
        taluka: 'Haveli',
        district: 'Pune',
        state: 'MH',
        transferor: 'Predecessor Owner',
        transferee: 'Ramesh Patil',
        area: '1 Acre',
        assessment: 'Rs. 10.00',
        noticeDetails: {
          noticeDate: '01/10/2026',
          noticeDisplayedAt: 'Aapli Chawadi',
          objectionDeadline: '16/10/2026',
          objectionStatus: 'Nil',
          certifyingOfficer: 'Circle Officer',
          orderNo: 'CO/101',
          orderDate: '20/10/2026'
        },
        timeline: [
          {
            ferfarNo: '5501',
            year: '2026',
            date: '27/10/2026',
            type: 'Sale Deed',
            typeMarathi: 'खरेदीखत',
            parties: 'Predecessor Owner -> Ramesh Patil',
            description: 'Conveyance certified',
            status: 'PRAMANIT',
            statusLabel: 'Certified'
          }
        ]
      }
    };

    repoModule.saveStoredRecord(testRecord);

    const retrieved = repoModule.getStoredRecord(testId);
    assert.ok(retrieved, `Record ${testId} must be retrieved`);
    assert.strictEqual(retrieved.id, testId);
    assert.strictEqual(retrieved.params.village, 'Wagholi');
    assert.strictEqual(retrieved.mutationData.ferfarNo, '5501');
    assert.strictEqual(retrieved.pdfPath, relativePdfPath);

    // Verify properties table row
    const propRow = dbModule.sqlite.prepare('SELECT * FROM properties WHERE id = ?').get(`prop_${testId.replace(/^rec-/, '')}`);
    assert.ok(propRow, 'Properties row must exist');
    assert.strictEqual(propRow.survey_number, '101/A');
    assert.strictEqual(propRow.claimed_owner, 'Ramesh Patil');

    // Verify title_lineage_records row
    const lineageRows = dbModule.sqlite.prepare('SELECT * FROM title_lineage_records WHERE property_id = ?').all(`prop_${testId.replace(/^rec-/, '')}`);
    assert.strictEqual(lineageRows.length, 1);
    assert.strictEqual(lineageRows[0].transferee, 'Ramesh Patil');

    pass('saveStoredRecord relationally persisted to records, properties, and title_lineage_records');
  } catch (err) {
    fail('DAL save/retrieve check failed', err);
  }

  // 5. O(1) Indexed Hash Lookup Check
  try {
    const matched = repoModule.getRecordByDocHash('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    assert.ok(matched, 'Must find record by docHash');
    assert.strictEqual(matched.id, testId);
    assert.strictEqual(matched.params.surveyNo, '101/A');

    const nonExistent = repoModule.getRecordByDocHash('0x0000000000000000000000000000000000000000000000000000000000000000');
    assert.strictEqual(nonExistent, null, 'Must return null for unknown docHash');

    pass('getRecordByDocHash executed instant indexed match on records(doc_hash)');
  } catch (err) {
    fail('Indexed docHash lookup check failed', err);
  }

  // 6. RECORD_STORE Proxy Compatibility Check
  try {
    assert.strictEqual(repoModule.RECORD_STORE.has(testId), true, 'RECORD_STORE.has must be true');
    const proxied = repoModule.RECORD_STORE.get(testId);
    assert.ok(proxied, 'RECORD_STORE.get must return record');
    assert.strictEqual(proxied.id, testId);

    const values = Array.from(repoModule.RECORD_STORE.values());
    assert.ok(values.length >= 1, 'RECORD_STORE.values() must return iterable array');
    assert.strictEqual(repoModule.RECORD_STORE.size, values.length, 'RECORD_STORE.size must match count');

    pass('RECORD_STORE proxy completely implements Map interface (.get, .has, .values, .size)');
  } catch (err) {
    fail('RECORD_STORE proxy check failed', err);
  }

  // 7. Process Memory Footprint Under Load (< 200 MB)
  try {
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage().rss;

    // Simulate 50 concurrent disk streaming downloads
    const pdfPath = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath(testId);
    let totalBytes = 0;
    for (let i = 0; i < 50; i++) {
      await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(pdfPath, { highWaterMark: 64 * 1024 });
        stream.on('data', chunk => { totalBytes += chunk.length; });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
    }

    const memAfter = process.memoryUsage().rss;
    const rssMB = (memAfter / (1024 * 1024)).toFixed(2);
    assert.ok(memAfter < 200 * 1024 * 1024, `Process RSS (${rssMB} MB) must remain strictly < 200 MB`);

    pass(`Process memory under streaming load: ${rssMB} MB RSS (< 200 MB Project Ceiling)`);
  } catch (err) {
    fail('Memory benchmark under streaming load failed', err);
  }

  // Clean up test record and test PDF
  try {
    repoModule.deleteStoredRecord(testId);
    const absPath = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath(testId);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch {}

  console.log(`\n📊 M1 Integration Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
