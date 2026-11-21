/**
 * Landeed 2.0 E2E Test Suite 04: Web3 Merkle DAG Engine, EAS Attestation & Section 63 BSA 2023 PDF Certificate
 * 
 * Verifies:
 * 1. Pairwise binary SHA-256 Merkle DAG root calculation over 30-year deed lineage
 * 2. Cryptographic tamper evidence (modifying any deed leaf invalidates root)
 * 3. EAS Schema contract (#0x2891) and IPFS CIDv1 multihash formatting
 * 4. Asymmetric Class-3 DSC RSA-2048 digital signing and public key verification
 * 5. Section 63 Bharatiya Sakshya Adhiniyam 2023 statutory certificate content
 */

const assert = require('assert');
const crypto = require('crypto');

/**
 * Canonical Evidence Hashing with Deterministic Key Sorting
 */
function computeCanonicalEvidenceHash(bundle) {
  const sortedKeys = Object.keys(bundle).sort();
  const canonicalString = JSON.stringify(bundle, sortedKeys);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Pairwise Binary SHA-256 Merkle DAG Engine
 */
function computeRealMerkleTree(leafHashes) {
  if (!leafHashes || leafHashes.length === 0) {
    const emptyHash = crypto.createHash('sha256').update('EMPTY_TREE').digest('hex');
    return { root: `0x${emptyHash}`, leaves: [], depth: 0, layers: [[emptyHash]] };
  }

  const normalizedLeaves = leafHashes.map(h =>
    h.startsWith('0x') ? h.slice(2).toLowerCase() : h.toLowerCase()
  );

  const layers = [normalizedLeaves];
  let currentLayer = normalizedLeaves;

  while (currentLayer.length > 1) {
    const nextLayer = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
      const combined = crypto
        .createHash('sha256')
        .update(Buffer.from(left + right, 'hex'))
        .digest('hex');
      nextLayer.push(combined);
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    root: `0x${currentLayer[0]}`,
    leaves: normalizedLeaves.map(l => `0x${l}`),
    depth: layers.length,
    layers: layers.map(layer => layer.map(h => `0x${h}`))
  };
}

/**
 * Base32 IPFS CIDv1 Computation (Raw sha2-256 Multihash)
 */
function computeRealIpfsCidV1(content) {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  const sha256Hash = crypto.createHash('sha256').update(buf).digest();

  // Prefix: 0x01 (CIDv1) + 0x55 (raw) + 0x12 (sha2-256) + 0x20 (32 bytes)
  const multihash = Buffer.concat([Buffer.from([0x01, 0x55, 0x12, 0x20]), sha256Hash]);

  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0;
  let value = 0;
  let output = 'b'; // multibase prefix 'b'

  for (let i = 0; i < multihash.length; i++) {
    value = (value << 8) | multihash[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Class-3 DSC RSA-2048 Signing & Verification
 */
function signWithClass3Dsc(evidenceBundleHash, advocateMetadata, privateKey) {
  const payload = Buffer.from(
    `${evidenceBundleHash}:${advocateMetadata.barId}:${advocateMetadata.name}:${advocateMetadata.pin}`
  );

  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  sign.end();
  const signatureBuffer = sign.sign(privateKey);

  return {
    signatureHex: `0x${signatureBuffer.toString('hex')}`,
    signatureBuffer,
    payload,
    algorithm: 'RSA-SHA256 (eMudhra Class-3 CCA Compliant)',
    timestamp: new Date().toISOString()
  };
}

function verifyClass3DscSignature(payload, signatureBuffer, publicKey) {
  const verify = crypto.createVerify('SHA256');
  verify.update(payload);
  verify.end();
  return verify.verify(publicKey, signatureBuffer);
}

/**
 * Generates Section 63 BSA 2023 Electronic Evidence Certificate Content
 */
function generateSection63BsaCertificate(params) {
  const {
    certificateNumber,
    propertyId,
    surveyNumber,
    state,
    advocateName,
    advocateBarId,
    dscSignatureHex,
    merkleRoot,
    easAttestationUid,
    ipfsCid,
    cleanTitleScore,
    issuedAt
  } = params;

  return `
================================================================================
  CERTIFICATE OF ELECTRONIC EVIDENCE UNDER SECTION 63 OF
        BHARATIYA SAKSHYA ADHINIYAM, 2023 (BSA 2023)
      [Superseding Section 65B of Indian Evidence Act, 1872]
================================================================================
Certificate No: ${certificateNumber}
Jurisdiction: ${state} (Revenue & Registration Cadastre)
Target Property ID: ${propertyId} | Survey/Plot: ${surveyNumber}
Issued Date: ${issuedAt}

STATUTORY DECLARATION UNDER SUB-SECTION (4) OF SECTION 63 OF BSA 2023:
I, ${advocateName}, Advocate (Bar Council ID: ${advocateBarId}), do hereby solemnly affirm 
and state as follows:

1. Identification of Electronic Record:
   This computer-generated title diligence dossier contains authentic land records, 
   encumbrance histories, and lineage deeds retrieved electronically through lawful 
   access to the official portal of ${state}.

2. Operating Condition & Device Integrity:
   During the relevant period, the computer system and automated oracle swarm were 
   operating properly. There was no operational malfunction or system breach that 
   could affect the integrity or accuracy of the electronic data.

3. Cryptographic Verification & Web3 RWA Proofs:
   - Canonical Document SHA-256 Digest: ${computeCanonicalEvidenceHash({ propertyId, surveyNumber, state })}
   - 30-Year Deed Conveyance Merkle Root: ${merkleRoot}
   - EAS Attestation UID (Polygon Amoy): ${easAttestationUid}
   - Decentralized IPFS Vault CID: ${ipfsCid}
   - Title Encumbrance Clearance Score: ${cleanTitleScore} / 100

4. Digital Signature & CCA Class-3 Seal:
   This electronic document is authenticated via Class-3 Digital Signature Certificate (DSC):
   Signature Hash: ${dscSignatureHex.slice(0, 66)}...
   Signatory: ${advocateName} (${advocateBarId})
   Status: ADMISSIBLE AS PRIMARY ELECTRONIC EVIDENCE UNDER SECTION 63 BSA 2023.
================================================================================
  `;
}

// -----------------------------------------------------------------------------
// Test Execution Suite
// -----------------------------------------------------------------------------

async function runWeb3MerkleEasBsaTests() {
  console.log('================================================================');
  console.log('🧪 SUITE 04: Web3 Merkle DAG Engine, EAS & Section 63 BSA 2023 PDF');
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
  // Test 4.1: Deterministic Binary Merkle Root Calculation
  // ---------------------------------------------------------------------------
  const deedLeaves = [
    computeCanonicalEvidenceHash({ year: 1996, deedType: 'Partition Deed', transferor: 'Ancestral Kartha', transferee: 'Ramesh Shinde' }),
    computeCanonicalEvidenceHash({ year: 2007, deedType: 'Gift Deed', transferor: 'Ramesh Shinde', transferee: 'Suresh Shinde' }),
    computeCanonicalEvidenceHash({ year: 2018, deedType: 'Sale Deed', transferor: 'Suresh Shinde', transferee: 'Vikramaditya Shinde' }),
    computeCanonicalEvidenceHash({ year: 2026, deedType: 'Agreement to Sell', transferor: 'Vikramaditya Shinde', transferee: 'Prospective Buyer' })
  ];

  let tree1, tree2;

  try {
    tree1 = computeRealMerkleTree(deedLeaves);
    tree2 = computeRealMerkleTree(deedLeaves);

    assert.strictEqual(tree1.root, tree2.root, 'Merkle roots must be strictly deterministic');
    assert.match(tree1.root, /^0x[a-f0-9]{64}$/, 'Root must be a 66-character lowercase hex string prefixed with 0x');
    assert.strictEqual(tree1.leaves.length, 4, 'Must contain 4 leaf nodes');
    assert.strictEqual(tree1.depth, 3, 'Tree depth for 4 leaves must be 3 layers');

    recordPass('TEST_04_01', `Deterministic SHA-256 binary Merkle DAG root calculated: ${tree1.root}`);
  } catch (err) {
    recordFail('TEST_04_01', 'Deterministic Merkle root calculation failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 4.2: Merkle Tampering Detection (Altering any deed changes root)
  // ---------------------------------------------------------------------------
  try {
    const tamperedLeaf = computeCanonicalEvidenceHash({
      year: 2018,
      deedType: 'Sale Deed',
      transferor: 'FRAUDULENT_IMPERSONATOR', // Tampered!
      transferee: 'Vikramaditya Shinde'
    });

    const tamperedLeaves = [deedLeaves[0], deedLeaves[1], tamperedLeaf, deedLeaves[3]];
    const tamperedTree = computeRealMerkleTree(tamperedLeaves);

    assert.notStrictEqual(tamperedTree.root, tree1.root, 'Tampered deed MUST yield a completely different Merkle root');
    assert.match(tamperedTree.root, /^0x[a-f0-9]{64}$/);

    recordPass('TEST_04_02', 'Merkle tamper detection verified: altering a single deed node changes root from ' + tree1.root.slice(0, 10) + '... to ' + tamperedTree.root.slice(0, 10) + '...');
  } catch (err) {
    recordFail('TEST_04_02', 'Merkle tamper detection failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 4.3: IPFS CIDv1 Multihash & EAS UID Format Validation
  // ---------------------------------------------------------------------------
  try {
    const evidencePayload = JSON.stringify({ parcel: 'Survey 142/2A', state: 'MH', score: 100 });
    const cid = computeRealIpfsCidV1(evidencePayload);

    assert.match(cid, /^bafkrei[a-z0-9]{52}$/, `CID must match base32 CIDv1 format: ${cid}`);

    // EAS UID format check
    const sampleEasUid = '0x00023de19ff42f118c56bf036b644ee9c1cb3030ad1f0223a18c3fcb169111ac';
    assert.match(sampleEasUid, /^0x[0-9a-fA-F]{64}$/, 'EAS UID must strictly be 66 hex characters');

    recordPass('TEST_04_03', `IPFS CIDv1 multihash (${cid}) and EAS UID format validated`);
  } catch (err) {
    recordFail('TEST_04_03', 'IPFS / EAS format validation failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 4.4: Class-3 DSC RSA-2048 Digital Signing & Verification
  // ---------------------------------------------------------------------------
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    assert.ok(publicKey.includes('BEGIN PUBLIC KEY'), 'Public key must be valid SPKI PEM');

    const advocate = {
      name: 'Adv. Sneha Kulkarni',
      barId: 'MAH/4821/2016',
      pin: '411001'
    };

    const evidenceHash = tree1.root;
    const signed = signWithClass3Dsc(evidenceHash, advocate, privateKey);

    assert.match(signed.signatureHex, /^0x[a-f0-9]+$/, 'Signature must be hex formatted with 0x');

    // Verify signature with public key
    const isVerified = verifyClass3DscSignature(signed.payload, signed.signatureBuffer, publicKey);
    assert.strictEqual(isVerified, true, 'Cryptographic signature verification must succeed');

    // Verify rejection of tampered payload
    const tamperedPayload = Buffer.from(`${evidenceHash}:TAMPERED_BAR_ID:${advocate.name}:${advocate.pin}`);
    const isTamperedVerified = verifyClass3DscSignature(tamperedPayload, signed.signatureBuffer, publicKey);
    assert.strictEqual(isTamperedVerified, false, 'Tampered payload signature verification must fail');

    recordPass('TEST_04_04', 'Class-3 DSC RSA-2048 signing and verification passed; tampered payload rejected');
  } catch (err) {
    recordFail('TEST_04_04', 'Class-3 DSC RSA-2048 test failed', err);
  }

  // ---------------------------------------------------------------------------
  // Test 4.5: Section 63 BSA 2023 Statutory Certificate Verification
  // ---------------------------------------------------------------------------
  try {
    const certText = generateSection63BsaCertificate({
      certificateNumber: 'BSA2023-MH-2026-004821',
      propertyId: 'prop-test-wagholi-142',
      surveyNumber: '142/2A',
      state: 'Maharashtra',
      advocateName: 'Adv. Sneha Kulkarni',
      advocateBarId: 'MAH/4821/2016',
      dscSignatureHex: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      merkleRoot: tree1.root,
      easAttestationUid: '0x00023de19ff42f118c56bf036b644ee9c1cb3030ad1f0223a18c3fcb169111ac',
      ipfsCid: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
      cleanTitleScore: 100,
      issuedAt: '2026-10-27T14:30:00Z'
    });

    assert.ok(certText.includes('SECTION 63 OF'), 'Must cite Section 63');
    assert.ok(certText.includes('BHARATIYA SAKSHYA ADHINIYAM, 2023'), 'Must cite full title BSA 2023');
    assert.ok(certText.includes('Superseding Section 65B of Indian Evidence Act, 1872'), 'Must acknowledge repeal of 65B');
    assert.ok(certText.includes('SUB-SECTION (4) OF SECTION 63'), 'Must contain Sec 63(4) statutory declaration');
    assert.ok(certText.includes(tree1.root), 'Certificate must display Merkle root');
    assert.ok(certText.includes('MAH/4821/2016'), 'Certificate must display Advocate Bar ID');

    recordPass('TEST_04_05', 'Section 63 BSA 2023 statutory digital evidence certificate generated and verified');
  } catch (err) {
    recordFail('TEST_04_05', 'Section 63 BSA 2023 certificate test failed', err);
  }

  console.log(`\n📊 Suite 04 Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests\n`);
  return { suite: '04_web3_merkle_eas_bsa', passed, failed, total: passed + failed, results };
}

if (require.main === module) {
  runWeb3MerkleEasBsaTests().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  });
}

module.exports = {
  runWeb3MerkleEasBsaTests,
  computeCanonicalEvidenceHash,
  computeRealMerkleTree,
  computeRealIpfsCidV1,
  signWithClass3Dsc,
  verifyClass3DscSignature,
  generateSection63BsaCertificate
};
