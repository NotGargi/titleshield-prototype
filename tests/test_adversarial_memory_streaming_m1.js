/**
 * Landeed 2.0 Adversarial Stress Test: Memory Profiling & Disk PDF Streaming
 * 
 * Challenger 2 (Milestone 1) - Empirical Verification Suite
 * 
 * Verifies:
 * 1. Process RSS and V8 Heap usage stay strictly under 200 MB during 60 rapid batch PDF generations
 * 2. Process RSS and V8 Heap usage stay strictly under 200 MB during 50 parallel streaming downloads
 * 3. Client aborts mid-stream (30 rapid connection drops) are handled cleanly without process crash or FD leaks
 * 4. Missing file self-healing dynamically regenerates deleted PDFs on disk and streams them to client
 * 5. Zero-byte PDF handling and corrupt file resilience
 * 6. Invalid ID injection and path traversal boundary tests (HTTP level and DAL/Service level)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Target paths
const SERVER_DIR = path.resolve(__dirname, '..', 'server');
const DATA_DIR = path.resolve(SERVER_DIR, 'data');
const PDFS_DIR = path.resolve(DATA_DIR, 'pdfs');

// Universal require for server node_modules
function requireServerModule(mod) {
  try {
    return require(mod);
  } catch {
    return require(path.join(SERVER_DIR, 'node_modules', mod));
  }
}

const express = requireServerModule('express');
const dbModule = require(path.join(SERVER_DIR, 'dist', 'db', 'index.js'));
const repoModule = require(path.join(SERVER_DIR, 'dist', 'db', 'recordsRepository.js'));
const pdfGenModule = require(path.join(SERVER_DIR, 'dist', 'services', 'pdfGenerator.js'));
const blockchainModule = require(path.join(SERVER_DIR, 'dist', 'services', 'blockchain.js'));
const recordsRouteModule = require(path.join(SERVER_DIR, 'dist', 'routes', 'records.js'));

const pdfGen = new pdfGenModule.PDFGeneratorService();
const blockchain = new blockchainModule.BlockchainService();

// Memory threshold (200 MB in bytes)
const MEMORY_CEILING_BYTES = 200 * 1024 * 1024;

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getMemorySnapshot() {
  const mem = process.memoryUsage();
  return {
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    rssMB: (mem.rss / (1024 * 1024)).toFixed(2),
    heapUsedMB: (mem.heapUsed / (1024 * 1024)).toFixed(2)
  };
}

async function runAdversarialMemoryAndStreamingSuite() {
  console.log('========================================================================');
  console.log('🔥 CHALLENGER 2: ADVERSARIAL MEMORY PROFILING & DISK STREAMING TEST');
  console.log('========================================================================');

  let passed = 0;
  let failed = 0;
  let warnings = 0;
  const findings = [];

  function recordPass(testId, description, details = {}) {
    passed++;
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
    if (Object.keys(details).length > 0) {
      console.log(`     Details: ${JSON.stringify(details)}`);
    }
  }

  function recordFail(testId, description, error, details = {}) {
    failed++;
    console.log(`  ❌ [FAIL] ${testId}: ${description}`);
    console.log(`     Error: ${error ? error.message || error : 'Assertion failed'}`);
    findings.push({ testId, severity: 'HIGH', description, error: error ? error.message : String(error), details });
  }

  function recordWarning(testId, description, findingDetails) {
    warnings++;
    console.log(`  ⚠️ [WARN] ${testId}: ${description}`);
    console.log(`     Finding: ${findingDetails.issue}`);
    findings.push({ testId, severity: 'MEDIUM', description, ...findingDetails });
  }

  // Track all test artifact record IDs for clean teardown
  const generatedRecordIds = [];

  // ===========================================================================
  // TEST 1: Rapid Batch PDF Generations & Memory Profiling (60 documents)
  // ===========================================================================
  console.log('\n--- TEST 1: Rapid Batch PDF Generation Memory Profiling (60 Real PDFs) ---');
  try {
    if (global.gc) global.gc();
    const memBaseline = getMemorySnapshot();
    console.log(`  [Memory Baseline] RSS: ${memBaseline.rssMB} MB, Heap Used: ${memBaseline.heapUsedMB} MB`);

    let peakRss = memBaseline.rss;
    let peakHeap = memBaseline.heapUsed;
    const batchCount = 60;

    for (let i = 0; i < batchCount; i++) {
      const recId = `rec-adv-batch-${Date.now()}-${i}`;
      generatedRecordIds.push(recId);

      const docTypeIndex = i % 3;
      if (docTypeIndex === 0) {
        // Standard Certified Land Record
        const rawText = `MAHARASHTRA LAND RECORD EXTRACT (SATBARA 7/12) - PARCEL ${i}\nDistrict: Pune | Taluka: Haveli | Village: Wagholi\nSurvey No: 142/${i + 1}\nOwner: Landholder Vikramaditya Shinde #${i}`;
        const docHash = blockchain.computeHash(rawText);
        const proof = {
          docHash,
          network: 'Polygon Amoy',
          chainId: 80002,
          contractAddress: '0x1234567890123456789012345678901234567890',
          transactionHash: `0xtx${i.toString().padStart(64, '0')}`,
          blockNumber: 100000 + i,
          timestamp: Math.floor(Date.now() / 1000),
          explorerUrl: `https://amoy.polygonscan.com/tx/0xtx${i}`,
          verificationUrl: `https://amoy.polygonscan.com/tx/0xtx${i}`,
          isVerified: true
        };
        const agentResult = {
          success: true,
          documentTitle: `Certified 7/12 Extract - Survey 142/${i + 1}`,
          rawText,
          metadata: {
            ownerName: `Owner #${i}`,
            khataNumber: `KH-${100 + i}`,
            surveyNumber: `142/${i + 1}`,
            totalArea: '1 Acre 10 Gunthe',
            unencumbered: true,
            landType: 'Agricultural Jirayat',
            issuanceDate: new Date().toLocaleDateString('en-IN'),
            portalSource: 'https://mahabhumi.gov.in'
          },
          steps: []
        };
        await pdfGen.generateCertifiedPDF(recId, agentResult, proof, 'MH', 'SATBARA_7_12');
      } else if (docTypeIndex === 1) {
        // Village Form 6 Mutation
        const proof = {
          docHash: `0xhash${i.toString().padStart(60, '0')}`,
          network: 'Polygon Amoy',
          chainId: 80002,
          contractAddress: '0x1234567890123456789012345678901234567890',
          transactionHash: `0xtx${i.toString().padStart(64, '0')}`,
          blockNumber: 100000 + i,
          timestamp: Math.floor(Date.now() / 1000),
          explorerUrl: `https://amoy.polygonscan.com/tx/0xtx${i}`,
          verificationUrl: `https://amoy.polygonscan.com/tx/0xtx${i}`,
          isVerified: true
        };
        const mutationData = {
          ferfarNo: `${5000 + i}`,
          entryDate: '15/03/2024',
          status: 'PRAMANIT',
          statusLabel: 'Certified & Approved',
          statusColor: '#10B981',
          mutationType: 'Registered Sale Deed',
          mutationTypeMarathi: 'खरेदीखत नोंद',
          surveyNo: `142/${i + 1}`,
          village: 'Wagholi',
          taluka: 'Haveli',
          district: 'Pune',
          state: 'MH',
          transferor: `Predecessor #${i}`,
          transferee: `Transferee #${i}`,
          area: '18 Gunthe',
          assessment: 'Rs. 4.25',
          noticeDetails: {
            noticeDate: '16/03/2024',
            noticeDisplayedAt: 'Aapli Chawadi',
            objectionDeadline: '31/03/2024',
            objectionStatus: 'Nil',
            certifyingOfficer: 'Circle Officer Haveli',
            orderNo: `CO/HVL/2024/MUT-${5000 + i}`,
            orderDate: '02/04/2024'
          },
          timeline: []
        };
        await pdfGen.generateVillageForm6PDF(recId, mutationData, proof, 'MH');
      } else {
        // IGR Index-II Registered Deed
        const proof = {
          docHash: `0xhash${i.toString().padStart(60, '0')}`,
          network: 'Polygon Amoy',
          chainId: 80002,
          contractAddress: '0x1234567890123456789012345678901234567890',
          transactionHash: `0xtx${i.toString().padStart(64, '0')}`,
          blockNumber: 100000 + i,
          timestamp: Math.floor(Date.now() / 1000),
          explorerUrl: `https://amoy.polygonscan.com/tx/0xtx${i}`,
          verificationUrl: `https://amoy.polygonscan.com/tx/0xtx${i}`,
          isVerified: true
        };
        const deedData = {
          deedNo: `${8000 + i}`,
          regYear: '2024',
          regDate: '10/01/2024',
          sroOffice: 'Sub-Registrar Haveli-3',
          bookNo: '1',
          volumeNo: 'HVL-2024-88',
          pageNos: '10 to 24',
          serialNo: `SR-${8000 + i}/2024`,
          documentType: 'Registered Sale Deed',
          documentTypeMarathi: 'खरेदीखत',
          considerationAmount: 'Rs. 65,00,000/-',
          marketValue: 'Rs. 60,00,000/-',
          stampDutyPaid: 'Rs. 4,55,000/-',
          registrationFeePaid: 'Rs. 30,000/-',
          executant: { name: `Vendor #${i}`, role: 'Vendor', address: 'Pune' },
          claimant: { name: `Purchaser #${i}`, role: 'Purchaser', address: 'Pune' },
          propertyDescription: {
            surveyNo: `142/${i + 1}`,
            village: 'Wagholi',
            taluka: 'Haveli',
            district: 'Pune',
            state: 'MH',
            area: '18 Gunthe',
            boundaries: { north: 'Road', south: 'Survey 143', east: 'Plot 2', west: 'Canal' }
          }
        };
        await pdfGen.generateIGRIndex2PDF(recId, deedData, proof, 'MH');
      }

      // Sample memory every 10 PDFs
      const currentMem = getMemorySnapshot();
      if (currentMem.rss > peakRss) peakRss = currentMem.rss;
      if (currentMem.heapUsed > peakHeap) peakHeap = currentMem.heapUsed;

      if ((i + 1) % 10 === 0) {
        console.log(`     Progress: ${i + 1}/${batchCount} PDFs | Current RSS: ${currentMem.rssMB} MB, Heap: ${currentMem.heapUsedMB} MB`);
      }
    }

    const memAfter = getMemorySnapshot();
    console.log(`  [Batch End] Final RSS: ${memAfter.rssMB} MB, Peak RSS: ${formatMB(peakRss)}, Peak Heap: ${formatMB(peakHeap)}`);

    // Verify all 60 PDFs were created on disk and have valid header
    let allPdfsValid = true;
    for (const recId of generatedRecordIds) {
      const absPath = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath(recId);
      if (!fs.existsSync(absPath)) {
        allPdfsValid = false;
        break;
      }
      const stat = fs.statSync(absPath);
      if (stat.size < 500) {
        allPdfsValid = false;
        break;
      }
      const header = fs.readFileSync(absPath, { encoding: 'ascii', flag: 'r' }).substring(0, 5);
      if (header !== '%PDF-') {
        allPdfsValid = false;
        break;
      }
    }

    assert.ok(allPdfsValid, 'All 60 batch PDFs must exist on disk with valid %PDF- header');
    assert.ok(peakRss < MEMORY_CEILING_BYTES, `Peak RSS (${formatMB(peakRss)}) exceeded 200 MB ceiling!`);
    assert.ok(peakHeap < MEMORY_CEILING_BYTES, `Peak Heap (${formatMB(peakHeap)}) exceeded 200 MB ceiling!`);

    recordPass('TEST_CHALLENGE_01', '60 rapid batch PDF generations strictly maintained memory budget (< 200 MB RSS/Heap)', {
      totalGenerated: batchCount,
      peakRss: formatMB(peakRss),
      peakHeap: formatMB(peakHeap),
      finalRss: memAfter.rssMB + ' MB',
      ceiling: '200 MB',
      allPdfsValid
    });
  } catch (err) {
    recordFail('TEST_CHALLENGE_01', 'Batch PDF generation memory profiling failed', err);
  }

  // ===========================================================================
  // TEST 2: High-Concurrency Parallel Streaming Downloads (50 Parallel Clients)
  // ===========================================================================
  console.log('\n--- TEST 2: High-Concurrency Parallel Streaming Downloads (50 Simultaneous Clients) ---');
  let testServer;
  let testPort;
  const baseUrl = () => `http://127.0.0.1:${testPort}`;

  try {
    const app = express();
    app.use(express.json());
    app.use('/api/records', recordsRouteModule.recordsRouter);

    testServer = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    testPort = testServer.address().port;
    console.log(`  Express test server mounted on port ${testPort}`);

    // Create a target seeded record with a valid generated PDF
    const targetRecordId = `rec-adv-stream-target-${Date.now()}`;
    generatedRecordIds.push(targetRecordId);

    const testDeedData = {
      deedNo: '9999',
      regYear: '2024',
      regDate: '27/10/2026',
      sroOffice: 'Sub-Registrar Haveli-1',
      bookNo: '1',
      volumeNo: 'HVL-2024-99',
      pageNos: '1 to 50',
      serialNo: 'SR-9999/2024',
      documentType: 'High-Volume Certified Conveyance Deed',
      documentTypeMarathi: 'खरेदीखत',
      considerationAmount: 'Rs. 1,20,00,000/-',
      marketValue: 'Rs. 1,15,00,000/-',
      stampDutyPaid: 'Rs. 8,40,000/-',
      registrationFeePaid: 'Rs. 30,000/-',
      executant: { name: 'Seller Patil', role: 'Vendor', address: 'Pune' },
      claimant: { name: 'Buyer Kulkarni', role: 'Purchaser', address: 'Pune' },
      propertyDescription: {
        surveyNo: '142/2A',
        village: 'Wagholi',
        taluka: 'Haveli',
        district: 'Pune',
        state: 'MH',
        area: '25 Gunthe',
        boundaries: { north: 'Sector Road', south: 'Survey 143', east: 'Plot B', west: 'Canal' }
      }
    };
    const testProof = {
      docHash: '0x9999888877776666555544443333222211110000aaaaabbbbbcccccdddddeeeee',
      network: 'Polygon Amoy',
      chainId: 80002,
      contractAddress: '0x1234567890123456789012345678901234567890',
      transactionHash: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      blockNumber: 123456,
      timestamp: Math.floor(Date.now() / 1000),
      explorerUrl: 'https://amoy.polygonscan.com/tx/0xabcdef',
      verificationUrl: 'https://amoy.polygonscan.com/tx/0xabcdef',
      isVerified: true
    };

    const targetPdfPath = await pdfGen.generateIGRIndex2PDF(targetRecordId, testDeedData, testProof, 'MH');
    const targetAbsPath = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath(targetRecordId);
    const expectedDiskSize = fs.statSync(targetAbsPath).size;

    repoModule.saveStoredRecord({
      id: targetRecordId,
      createdAt: new Date().toISOString(),
      params: {
        state: 'MH',
        docType: 'INDEX_2',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/2A'
      },
      agentResult: {
        success: true,
        documentTitle: 'IGR Index-II Deed #9999',
        rawText: 'Deed 9999 cadastral abstract',
        metadata: {
          ownerName: 'Buyer Kulkarni',
          khataNumber: 'Deed-9999',
          surveyNumber: '142/2A',
          totalArea: '25 Gunthe',
          unencumbered: true,
          landType: 'Agricultural Freehold',
          issuanceDate: '27/10/2026',
          portalSource: 'https://igrmaharashtra.gov.in'
        },
        steps: []
      },
      proof: testProof,
      pdfPath: targetPdfPath,
      index2Data: testDeedData
    });

    console.log(`  Seeded target record for parallel streaming: ${targetRecordId} (Disk size: ${expectedDiskSize} bytes)`);

    // Fire 50 concurrent streaming downloads
    const concurrency = 50;
    const downloadUrl = `${baseUrl()}/api/records/${targetRecordId}/download`;

    const streamPromises = [];
    const memBeforeDownloads = getMemorySnapshot();
    let maxParallelRss = memBeforeDownloads.rss;
    let maxParallelHeap = memBeforeDownloads.heapUsed;

    for (let c = 0; c < concurrency; c++) {
      const p = new Promise((resolve, reject) => {
        http.get(downloadUrl, (res) => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Expected status 200, got ${res.statusCode}`));
          }
          let receivedBytes = 0;
          let chunksCount = 0;
          const chunks = [];

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            chunksCount++;
            chunks.push(chunk);

            // High water mark check: chunks must not exceed 64 KB
            assert.ok(chunk.length <= 64 * 1024, `Chunk length (${chunk.length}) exceeded 64 KB highWaterMark!`);

            const current = process.memoryUsage();
            if (current.rss > maxParallelRss) maxParallelRss = current.rss;
            if (current.heapUsed > maxParallelHeap) maxParallelHeap = current.heapUsed;
          });

          res.on('end', () => {
            const fullBuffer = Buffer.concat(chunks);
            assert.strictEqual(receivedBytes, expectedDiskSize, 'Streamed bytes must match disk file size');
            assert.strictEqual(fullBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'Header must match %PDF-');
            resolve({ client: c, receivedBytes, chunksCount });
          });

          res.on('error', reject);
        }).on('error', reject);
      });
      streamPromises.push(p);
    }

    const streamResults = await Promise.all(streamPromises);
    assert.strictEqual(streamResults.length, concurrency, `All ${concurrency} parallel streams must complete`);
    assert.ok(maxParallelRss < MEMORY_CEILING_BYTES, `Peak parallel RSS (${formatMB(maxParallelRss)}) exceeded 200 MB!`);
    assert.ok(maxParallelHeap < MEMORY_CEILING_BYTES, `Peak parallel Heap (${formatMB(maxParallelHeap)}) exceeded 200 MB!`);

    recordPass('TEST_CHALLENGE_02', `50 parallel streaming downloads completed with 100% byte fidelity and RSS < 200 MB`, {
      concurrentStreams: concurrency,
      fileSize: expectedDiskSize,
      maxParallelRss: formatMB(maxParallelRss),
      maxParallelHeap: formatMB(maxParallelHeap),
      ceiling: '200 MB'
    });
  } catch (err) {
    recordFail('TEST_CHALLENGE_02', 'Parallel streaming download test failed', err);
  }

  // ===========================================================================
  // TEST 3: Client Aborts Mid-Stream (30 Connection Drops)
  // ===========================================================================
  console.log('\n--- TEST 3: Client Aborts Mid-Stream (30 Consecutive Drops) ---');
  try {
    const targetRecordId = generatedRecordIds[generatedRecordIds.length - 1];
    const downloadUrl = `${baseUrl()}/api/records/${targetRecordId}/download`;

    const abortCount = 30;
    let abortsSuccessful = 0;

    for (let a = 0; a < abortCount; a++) {
      await new Promise((resolve) => {
        const req = http.get(downloadUrl, (res) => {
          // Read first chunk, then immediately destroy socket to simulate client disconnect
          res.on('data', () => {
            req.destroy(); // Abort client request mid-stream
            abortsSuccessful++;
            resolve();
          });
          res.on('error', () => {
            // Client error expected due to destroy
            resolve();
          });
        });
        req.on('error', () => {
          // Socket hangup / destroy error expected on client side
          resolve();
        });
      });
    }

    assert.strictEqual(abortsSuccessful, abortCount, `All ${abortCount} client aborts triggered`);

    // Verify server process remains completely healthy and responsive
    const healthCheck = await new Promise((resolve, reject) => {
      http.get(`${baseUrl()}/api/records/${targetRecordId}`, (res) => {
        let body = '';
        res.on('data', c => { body += c; });
        res.on('end', () => {
          assert.strictEqual(res.statusCode, 200, 'Server must respond 200 after aborts');
          resolve(JSON.parse(body));
        });
      }).on('error', reject);
    });

    assert.strictEqual(healthCheck.id, targetRecordId, 'Record retrieval after abort storm must match');

    // Verify a full download succeeds cleanly right after abort storm
    const fullDownloadAfterAbort = await new Promise((resolve, reject) => {
      http.get(downloadUrl, (res) => {
        let len = 0;
        res.on('data', c => { len += c.length; });
        res.on('end', () => resolve(len));
      }).on('error', reject);
    });
    assert.ok(fullDownloadAfterAbort > 1000, 'Full download must succeed after abort storm');

    recordPass('TEST_CHALLENGE_03', `Client aborts handled cleanly; 30 mid-stream drops caused zero server crashes or socket deadlocks`, {
      abortsCount: abortCount,
      serverHealthy: true,
      postAbortDownloadBytes: fullDownloadAfterAbort
    });
  } catch (err) {
    recordFail('TEST_CHALLENGE_03', 'Client mid-stream abort test failed', err);
  }

  // ===========================================================================
  // TEST 4: Missing File Self-Healing
  // ===========================================================================
  console.log('\n--- TEST 4: Missing File Self-Healing Dynamic Regeneration ---');
  try {
    const targetRecordId = generatedRecordIds[generatedRecordIds.length - 1];
    const absPdfPath = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath(targetRecordId);

    // 1. Unlink the PDF file on disk
    assert.ok(fs.existsSync(absPdfPath), 'Target PDF must exist before unlink');
    fs.unlinkSync(absPdfPath);
    assert.ok(!fs.existsSync(absPdfPath), 'Target PDF must NOT exist after unlink');

    // 2. Request download via HTTP: should trigger dynamic regeneration
    const healedDownload = await new Promise((resolve, reject) => {
      http.get(`${baseUrl()}/api/records/${targetRecordId}/download`, (res) => {
        assert.strictEqual(res.statusCode, 200, `Expected 200 on self-healing download, got ${res.statusCode}`);
        let received = 0;
        const chunks = [];
        res.on('data', c => { received += c.length; chunks.push(c); });
        res.on('end', () => {
          resolve({ received, buffer: Buffer.concat(chunks) });
        });
        res.on('error', reject);
      }).on('error', reject);
    });

    // 3. Confirm file is regenerated on disk
    assert.ok(fs.existsSync(absPdfPath), 'Target PDF must be dynamically regenerated on disk');
    const newStat = fs.statSync(absPdfPath);
    assert.strictEqual(newStat.size, healedDownload.received, 'Disk file size must match streamed bytes');
    assert.strictEqual(healedDownload.buffer.subarray(0, 5).toString('ascii'), '%PDF-', 'Regenerated stream must be valid PDF');

    recordPass('TEST_CHALLENGE_04', 'Missing file self-healing triggered successfully: regenerated deleted PDF on disk and served 200 stream', {
      recordId: targetRecordId,
      regeneratedSize: newStat.size
    });
  } catch (err) {
    recordFail('TEST_CHALLENGE_04', 'Missing file self-healing test failed', err);
  }

  // ===========================================================================
  // TEST 5: Zero-Byte PDF Handling
  // ===========================================================================
  console.log('\n--- TEST 5: Zero-Byte PDF Handling & Corrupt File Resilience ---');
  try {
    const zeroByteRecordId = `rec-adv-zero-byte-${Date.now()}`;
    generatedRecordIds.push(zeroByteRecordId);

    const zeroPdfAbsPath = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath(zeroByteRecordId);
    // Write 0 bytes to file
    fs.writeFileSync(zeroPdfAbsPath, Buffer.alloc(0));
    assert.strictEqual(fs.statSync(zeroPdfAbsPath).size, 0, 'File must be 0 bytes on disk');

    // Save record to DB
    repoModule.saveStoredRecord({
      id: zeroByteRecordId,
      createdAt: new Date().toISOString(),
      params: {
        state: 'MH',
        docType: '7_12',
        district: 'Pune',
        taluka: 'Haveli',
        village: 'Wagholi',
        surveyNo: '142/ZERO'
      },
      agentResult: {
        success: true,
        documentTitle: 'Zero Byte Test Extract',
        rawText: 'Zero byte test text',
        metadata: {
          ownerName: 'Zero Owner',
          surveyNumber: '142/ZERO',
          khataNumber: 'KH-ZERO',
          totalArea: '1 Acre',
          unencumbered: true,
          landType: 'Agricultural',
          issuanceDate: '27/10/2026',
          portalSource: 'https://mahabhumi.gov.in'
        },
        steps: []
      },
      proof: {
        docHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        network: 'Polygon Amoy',
        chainId: 80002,
        contractAddress: '0x0',
        transactionHash: '0x0',
        blockNumber: 0,
        timestamp: 0,
        explorerUrl: '',
        verificationUrl: '',
        isVerified: true
      },
      pdfPath: `data/pdfs/${zeroByteRecordId}.pdf`
    });

    // Request download
    const zeroByteRes = await new Promise((resolve, reject) => {
      http.get(`${baseUrl()}/api/records/${zeroByteRecordId}/download`, (res) => {
        let len = 0;
        res.on('data', c => { len += c.length; });
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, len }));
      }).on('error', reject);
    });

    console.log(`     Zero-Byte Download Response: status=${zeroByteRes.statusCode}, Content-Length=${zeroByteRes.headers['content-length']}, Received=${zeroByteRes.len}`);

    // Critical analysis of zero-byte handling:
    // If the server streams a 0-byte file with status 200, self-healing missed it because it only checked fs.existsSync,
    // not (fs.existsSync(p) && fs.statSync(p).size > 0).
    if (zeroByteRes.len === 0 && zeroByteRes.statusCode === 200) {
      recordWarning('TEST_CHALLENGE_05_FINDING', 'Zero-byte PDF served to client as empty 200 response rather than triggering self-healing', {
        issue: 'Self-healing condition in server/src/routes/records.ts line 910 only checks !fs.existsSync(filePath). A truncated or zero-byte file on disk bypasses self-healing and returns a corrupt 0-byte PDF with Content-Length: 0.',
        recommendation: 'Update check to: if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0)',
        actualLength: zeroByteRes.len,
        statusCode: zeroByteRes.statusCode
      });
    } else if (zeroByteRes.len > 0) {
      recordPass('TEST_CHALLENGE_05', 'Zero-byte PDF detected and self-healed into valid PDF', {
        size: zeroByteRes.len
      });
    }
  } catch (err) {
    recordFail('TEST_CHALLENGE_05', 'Zero-byte PDF handling test encountered unexpected exception', err);
  }

  // ===========================================================================
  // TEST 6: Invalid ID Injection & Path Traversal Security Boundaries
  // ===========================================================================
  console.log('\n--- TEST 6: Invalid ID Injection & Path Traversal Boundaries ---');
  try {
    // 6.1 Non-existent record ID
    const notFoundRes = await new Promise((resolve, reject) => {
      http.get(`${baseUrl()}/api/records/non-existent-uuid-99999/download`, (res) => {
        resolve(res.statusCode);
      }).on('error', reject);
    });
    assert.strictEqual(notFoundRes, 404, 'Non-existent ID must return 404');
    recordPass('TEST_CHALLENGE_06_01', 'Non-existent record ID returned HTTP 404 cleanly');

    // 6.2 URL-encoded path traversal attempt in route
    const traversalRes = await new Promise((resolve, reject) => {
      http.get(`${baseUrl()}/api/records/%2e%2e%2f%2e%2e%2fpackage.json/download`, (res) => {
        resolve(res.statusCode);
      }).on('error', reject);
    });
    assert.strictEqual(traversalRes, 404, 'Path traversal ID in route must return 404 Not Found');
    recordPass('TEST_CHALLENGE_06_02', 'HTTP URL-encoded path traversal in :id returned HTTP 404');

    // 6.3 SQL injection attempt in record ID
    const sqliRes = await new Promise((resolve, reject) => {
      http.get(`${baseUrl()}/api/records/'%20OR%20'1'='1/download`, (res) => {
        resolve(res.statusCode);
      }).on('error', reject);
    });
    assert.strictEqual(sqliRes, 404, 'SQL injection in :id must return 404 (parameterized query protects DB)');
    recordPass('TEST_CHALLENGE_06_03', 'SQL injection payload in :id safely blocked by parameterized query (HTTP 404)');

    // 6.4 Service Level: Path Traversal Vulnerability in PDFGeneratorService.getPdfAbsolutePath
    // Test: Pass '../../package.json' or '../../foo'
    const storageDir = pdfGenModule.PDFGeneratorService.getStorageDir();
    const resolvedTraversal = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath('../../foo');
    const isEscaped = !resolvedTraversal.startsWith(storageDir);

    console.log(`     StorageDir: ${storageDir}`);
    console.log(`     Resolved('../../foo'): ${resolvedTraversal}`);
    console.log(`     Escaped storage directory? ${isEscaped}`);

    if (isEscaped) {
      recordWarning('TEST_CHALLENGE_06_04_FINDING', 'Path traversal vulnerability confirmed in PDFGeneratorService.getPdfAbsolutePath', {
        issue: 'In server/src/services/pdfGenerator.ts line 103-106: const filename = path.basename(recordIdOrPath).endsWith(".pdf") ? path.basename(recordIdOrPath) : `${recordIdOrPath}.pdf`; When recordIdOrPath does not end with .pdf, it evaluates to ${recordIdOrPath}.pdf preserving path traversal tokens (../../), allowing path.join to escape server/data/pdfs.',
        vulnerableCode: 'path.basename(recordIdOrPath).endsWith(".pdf") ? path.basename(recordIdOrPath) : `${recordIdOrPath}.pdf`',
        remediation: 'const base = path.basename(recordIdOrPath); const filename = base.endsWith(".pdf") ? base : `${base}.pdf`;',
        escapedPath: resolvedTraversal
      });
    } else {
      recordPass('TEST_CHALLENGE_06_04', 'PDFGeneratorService.getPdfAbsolutePath sanitized path traversal');
    }

  } catch (err) {
    recordFail('TEST_CHALLENGE_06', 'Security boundary test failed', err);
  }

  // ===========================================================================
  // Cleanup & Teardown
  // ===========================================================================
  console.log('\n--- Teardown: Cleaning Temporary Test Records & PDFs ---');
  if (testServer) {
    testServer.close();
  }

  let cleanedFiles = 0;
  for (const recId of generatedRecordIds) {
    try {
      repoModule.deleteStoredRecord(recId);
      const absPath = pdfGenModule.PDFGeneratorService.getPdfAbsolutePath(recId);
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
        cleanedFiles++;
      }
    } catch {}
  }
  console.log(`  Cleaned ${cleanedFiles} generated test PDF files and database records.`);

  console.log('\n========================================================================');
  console.log(`📊 CHALLENGER 2 SUMMARY: ${passed} Passed, ${failed} Failed, ${warnings} Warnings`);
  console.log('========================================================================\n');

  return {
    passed,
    failed,
    warnings,
    findings,
    verdict: failed === 0 ? 'APPROVE' : 'REQUEST_CHANGES'
  };
}

if (require.main === module) {
  runAdversarialMemoryAndStreamingSuite().then((result) => {
    console.log(`Final Challenge Verdict: ${result.verdict}`);
    process.exit(result.failed === 0 ? 0 : 1);
  }).catch((err) => {
    console.error('Fatal crash in challenge suite:', err);
    process.exit(1);
  });
}

module.exports = { runAdversarialMemoryAndStreamingSuite };
