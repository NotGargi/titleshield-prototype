/**
 * Milestone 2 Test Suite: Automated Live Portal Adapters in TinyFishService
 * 
 * Verifies:
 * 1. PortalAdapterRegistry singleton and state adapter registration (KA, TG, TN, MH, UP)
 * 2. KarnatakaBhoomiAdapter: Form 16 RTC 12-column parsing, MR T14 mutation, bilingual Kannada/English
 * 3. TelanganaDharaniAdapter: Pattadar Passbook, ROR-1B, Section 22-A prohibited checks, bank lien verification, bilingual Telugu/English
 * 4. TamilNaduPattaChittaAdapter: Sec 10(1) Patta/Chitta, Hectare-Are conversions, Nanjai/Punjai classification, bilingual Tamil/English
 * 5. MaharashtraMahabhumiAdapter & UttarPradeshBhulekhAdapter: 7/12 & Khatauni encapsulation
 * 6. TinyFishService integration: Routing through registry and normalized records mapping
 */

const assert = require('assert');
const path = require('path');

// Configure fast live agent timeout for automated test suites
process.env.TINYFISH_TIMEOUT_MS = '1500';

// Load compiled server modules
const serverDist = path.join(__dirname, '..', 'server', 'dist');
const { PortalAdapterRegistry } = require(path.join(serverDist, 'services', 'adapters', 'adapterRegistry'));
const { KarnatakaBhoomiAdapter } = require(path.join(serverDist, 'services', 'adapters', 'karnatakaBhoomiAdapter'));
const { TelanganaDharaniAdapter } = require(path.join(serverDist, 'services', 'adapters', 'telanganaDharaniAdapter'));
const { TamilNaduPattaChittaAdapter } = require(path.join(serverDist, 'services', 'adapters', 'tamilNaduPattaChittaAdapter'));
const { MaharashtraMahabhumiAdapter } = require(path.join(serverDist, 'services', 'adapters', 'maharashtraMahabhumiAdapter'));
const { UttarPradeshBhulekhAdapter } = require(path.join(serverDist, 'services', 'adapters', 'upBhulekhAdapter'));
const { TinyFishService } = require(path.join(serverDist, 'services', 'tinyfish'));

async function runM2Tests() {
  console.log('🚀 Starting Landeed 2.0 Milestone 2 Portal Adapters Test Suite...\n');

  // =========================================================================
  // Test 1: Registry Verification
  // =========================================================================
  console.log('--- Test 1: PortalAdapterRegistry Singleton & State Registration ---');
  const registry = PortalAdapterRegistry.getInstance();
  assert.ok(registry, 'PortalAdapterRegistry instance must exist');
  assert.strictEqual(registry, PortalAdapterRegistry.getInstance(), 'Registry must be a singleton');

  const supportedStates = registry.getSupportedStates();
  console.log('  Registered States in Registry:', supportedStates);
  assert.ok(supportedStates.includes('KA'), 'Karnataka (KA) must be registered');
  assert.ok(supportedStates.includes('TG'), 'Telangana (TG) must be registered');
  assert.ok(supportedStates.includes('TN'), 'Tamil Nadu (TN) must be registered');
  assert.ok(supportedStates.includes('MH'), 'Maharashtra (MH) must be registered');
  assert.ok(supportedStates.includes('UP'), 'Uttar Pradesh (UP) must be registered');

  assert.ok(registry.hasAdapter('KA'), 'hasAdapter(KA) should return true');
  assert.ok(registry.hasAdapter('tg'), 'hasAdapter(tg) case-insensitive should return true');
  assert.ok(!registry.hasAdapter('XX'), 'hasAdapter(XX) should return false');

  const kaAdapter = registry.getAdapter('KA');
  assert.ok(kaAdapter instanceof KarnatakaBhoomiAdapter, 'getAdapter(KA) must be KarnatakaBhoomiAdapter');
  const tgAdapter = registry.getAdapter('TG');
  assert.ok(tgAdapter instanceof TelanganaDharaniAdapter, 'getAdapter(TG) must be TelanganaDharaniAdapter');
  const tnAdapter = registry.getAdapter('TN');
  assert.ok(tnAdapter instanceof TamilNaduPattaChittaAdapter, 'getAdapter(TN) must be TamilNaduPattaChittaAdapter');
  const mhAdapter = registry.getAdapter('MH');
  assert.ok(mhAdapter instanceof MaharashtraMahabhumiAdapter, 'getAdapter(MH) must be MaharashtraMahabhumiAdapter');
  const upAdapter = registry.getAdapter('UP');
  assert.ok(upAdapter instanceof UttarPradeshBhulekhAdapter, 'getAdapter(UP) must be UttarPradeshBhulekhAdapter');

  console.log('  ✅ Test 1 Passed: All 5 state adapters properly registered.\n');

  // =========================================================================
  // Test 2: Karnataka Bhoomi Adapter
  // =========================================================================
  console.log('--- Test 2: Karnataka Bhoomi Adapter (RTC Form 16, MR T14 & Bilingual Kannada) ---');
  // Validation
  const kaInvalid = kaAdapter.validateParams({ state: 'KA', docType: 'RTC', district: 'Bangalore South', taluka: '', village: '', surveyNo: '' });
  assert.strictEqual(kaInvalid.valid, false, 'Validation should fail when fields are missing');
  assert.ok(kaInvalid.missingFields.includes('taluka'));

  const kaValid = kaAdapter.validateParams({
    state: 'KA',
    docType: 'RTC',
    district: 'Bangalore Urban',
    taluka: 'Bangalore South',
    village: 'Hulimavu',
    surveyNo: '142'
  });
  assert.strictEqual(kaValid.valid, true, 'Validation should pass with all required fields');

  // Automation Goal
  const kaGoal = kaAdapter.buildAutomationGoal({
    state: 'KA',
    docType: 'RTC',
    district: 'Bangalore Urban',
    taluka: 'Bangalore South',
    village: 'Hulimavu',
    surveyNo: '142',
    hobli: 'Begur',
    hissaNo: '1'
  });
  assert.ok(kaGoal.includes('Karnataka Bhoomi Portal'), 'Automation goal must reference Bhoomi');
  assert.ok(kaGoal.includes('Form 16'), 'Automation goal must request Form 16 Pahani');
  assert.ok(kaGoal.includes('Hulimavu'), 'Automation goal must include village');

  // Fallback Record Generation
  const kaFallback = kaAdapter.getFallbackRecord({
    state: 'KA',
    docType: 'RTC',
    district: 'Bangalore Urban',
    taluka: 'Bangalore South',
    village: 'Hulimavu',
    surveyNo: '142',
    hobli: 'Begur Hobli'
  });

  assert.strictEqual(kaFallback.state, 'KA');
  assert.ok(kaFallback.documentTitle.includes('Form 16 RTC'));
  assert.ok(kaFallback.documentTitleNative.includes('ನಮೂನೆ ೧೬'));
  assert.ok(kaFallback.rawText.includes('ಭೂಮಿ ಯೋಜನೆ'), 'Raw text must contain Kannada Bhoomi crest');
  assert.ok(kaFallback.rawText.includes('ಮಂಜುನಾಥ್ ಗೌಡ'), 'Raw text must contain Kannada owner name');
  assert.strictEqual(kaFallback.holding.surveyNumber, '142');
  assert.ok(kaFallback.holding.totalAreaStandard.includes('2 Acres 14 Guntas'));
  assert.ok(kaFallback.holding.kharabExtent.includes('Pot-A'));
  assert.strictEqual(kaFallback.holding.tenureType, 'Ryotwari Freehold (ರೈತವಾರಿ)');
  assert.strictEqual(kaFallback.encumbrance.unencumbered, true);
  assert.strictEqual(kaFallback.encumbrance.isProhibitedCategory, false);
  assert.ok(kaFallback.mutations.length > 0, 'Must contain mutation records');
  assert.strictEqual(kaFallback.mutations[0].mutationNumber, 'MR T14/2021-2022');
  assert.ok(kaFallback.cropDetails.length >= 2, 'Must contain Column 12 crop details');
  assert.strictEqual(kaFallback.cropDetails[0].cropNameNative, 'ರಾಗಿ');

  console.log('  ✅ Test 2 Passed: Karnataka Bhoomi Form 16 RTC & bilingual Kannada verified.\n');

  // =========================================================================
  // Test 3: Telangana Dharani Adapter
  // =========================================================================
  console.log('--- Test 3: Telangana Dharani Adapter (Passbook, ROR-1B, Sec 22-A & Bilingual Telugu) ---');
  // Validation
  const tgInvalid = tgAdapter.validateParams({ state: 'TG', docType: 'PASSBOOK', district: '', taluka: '', village: '' });
  assert.strictEqual(tgInvalid.valid, false);

  const tgValid = tgAdapter.validateParams({
    state: 'TG',
    docType: 'PASSBOOK',
    district: 'Rangareddy',
    taluka: 'Gandipet',
    village: 'Kokapet',
    surveyNo: '168'
  });
  assert.strictEqual(tgValid.valid, true);

  // Automation Goal
  const tgGoal = tgAdapter.buildAutomationGoal({
    state: 'TG',
    docType: 'PASSBOOK',
    district: 'Rangareddy',
    taluka: 'Gandipet',
    village: 'Kokapet',
    surveyNo: '168',
    passbookNo: 'T08120040123'
  });
  assert.ok(tgGoal.includes('Dharani Passbook Portal') || tgGoal.includes('T08120040123'));
  assert.ok(tgGoal.includes('Section 22-A'), 'Automation goal must inspect Section 22-A prohibited register');

  // Fallback Record Generation
  const tgFallback = tgAdapter.getFallbackRecord({
    state: 'TG',
    docType: 'PASSBOOK',
    district: 'Rangareddy',
    taluka: 'Gandipet',
    village: 'Kokapet',
    surveyNo: '168',
    subDivision: '1/A',
    passbookNo: 'T08120040123'
  });

  assert.strictEqual(tgFallback.state, 'TG');
  assert.ok(tgFallback.documentTitle.includes('ROR-1B'));
  assert.ok(tgFallback.documentTitleNative.includes('ధరణి'));
  assert.ok(tgFallback.rawText.includes('DHARANI INTEGRATED LAND RECORDS'));
  assert.ok(tgFallback.rawText.includes('వెంకటేశ్వర్లు'), 'Raw text must contain Telugu owner name');
  assert.strictEqual(tgFallback.holding.passbookNumber, 'T08120040123');
  assert.ok(tgFallback.holding.totalAreaStandard.includes('Ac. 2.15 Gts'));
  assert.strictEqual(tgFallback.encumbrance.unencumbered, true);
  assert.strictEqual(tgFallback.encumbrance.isProhibitedCategory, false);
  assert.ok(tgFallback.encumbrance.otherRights.some(r => r.includes('Section 22-A')), 'Must verify Section 22-A clear status');
  assert.strictEqual(tgFallback.encumbrance.hasActiveMortgage, false);

  // Prohibited Verification Parsing Test
  const prohibitedSample = `GOVERNMENT OF TELANGANA DHARANI
Pattadar: Govt / Waqf Board
Survey No: 99
Section 22-A Prohibited Category: YES - Prohibited Waqf Board Land`;
  const tgParsedProhibited = tgAdapter.parseHtmlResponse(prohibitedSample, {
    state: 'TG',
    docType: 'PASSBOOK',
    district: 'Rangareddy',
    taluka: 'Gandipet',
    village: 'Kokapet',
    surveyNo: '99'
  });
  assert.strictEqual(tgParsedProhibited.encumbrance.isProhibitedCategory, true, 'Prohibited property must set isProhibitedCategory to true');
  assert.strictEqual(tgParsedProhibited.encumbrance.unencumbered, false, 'Prohibited property must not be unencumbered');

  console.log('  ✅ Test 3 Passed: Telangana Dharani Passbook, Sec 22-A prohibited veto & bilingual Telugu verified.\n');

  // =========================================================================
  // Test 4: Tamil Nadu Patta Chitta Adapter
  // =========================================================================
  console.log('--- Test 4: Tamil Nadu Patta Chitta Adapter (Sec 10(1), Hectare-Are & Bilingual Tamil) ---');
  // Validation
  const tnInvalid = tnAdapter.validateParams({ state: 'TN', docType: 'PATTA_CHITTA', district: '', taluka: '', village: '' });
  assert.strictEqual(tnInvalid.valid, false);

  const tnValid = tnAdapter.validateParams({
    state: 'TN',
    docType: 'PATTA_CHITTA',
    district: 'Chengalpattu',
    taluka: 'Tambaram',
    village: 'Pallikaranai',
    surveyNo: '214'
  });
  assert.strictEqual(tnValid.valid, true);

  // Fallback Record Generation
  const tnFallback = tnAdapter.getFallbackRecord({
    state: 'TN',
    docType: 'PATTA_CHITTA',
    district: 'Chengalpattu',
    taluka: 'Tambaram',
    village: 'Pallikaranai',
    surveyNo: '214',
    subDivision: '1A',
    pattaNo: '1250'
  });

  assert.strictEqual(tnFallback.state, 'TN');
  assert.ok(tnFallback.documentTitle.includes('Patta/Chitta Extract (Section 10(1))'));
  assert.ok(tnFallback.documentTitleNative.includes('பட்டா / சிட்டா'));
  assert.ok(tnFallback.rawText.includes('சுப்பிரமணியன்'), 'Raw text must contain Tamil owner name');
  assert.ok(tnFallback.rawText.includes('10(1) பிரிவு கிராமக் கணக்கு'));
  assert.strictEqual(tnFallback.holding.pattaNumber, '1250');
  // Extent check: 0 Hectares 45.5 Ares -> standard string
  assert.ok(tnFallback.holding.totalAreaStandard.includes('Hectares'));
  assert.ok(tnFallback.holding.totalAreaStandard.includes('Ares'));
  assert.ok(tnFallback.holding.totalAreaStandard.includes('sq.m'));
  assert.strictEqual(tnFallback.holding.areaHectares, 0);
  assert.strictEqual(tnFallback.holding.areaSqMeters, 4550);
  assert.ok(tnFallback.holding.landClassification.includes('Punjai'));
  assert.ok(tnFallback.holding.landClassificationNative.includes('புஞ்சை'));

  console.log('  ✅ Test 4 Passed: Tamil Nadu Patta Chitta Sec 10(1), Hectare-Are conversions & bilingual Tamil verified.\n');

  // =========================================================================
  // Test 5: Maharashtra & UP Adapters Encapsulation
  // =========================================================================
  console.log('--- Test 5: Maharashtra Mahabhumi & UP Bhulekh Adapters ---');
  const mhFallback = mhAdapter.getFallbackRecord({
    state: 'MH',
    docType: '7_12',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNo: '141'
  });
  assert.strictEqual(mhFallback.state, 'MH');
  assert.ok(mhFallback.rawText.includes('सत्यमेव जयते'));
  assert.ok(mhFallback.rawText.includes('कुलकर्णी'));
  assert.ok(mhFallback.holding.landClassification.includes('Jirayat'));

  const upFallback = upAdapter.getFallbackRecord({
    state: 'UP',
    docType: 'KHATAUNI',
    district: 'Gautam Buddha Nagar',
    taluka: 'Dadri',
    village: 'Noida Sector 150',
    surveyNo: '204'
  });
  assert.strictEqual(upFallback.state, 'UP');
  assert.ok(upFallback.rawText.includes('उत्तर प्रदेश सरकार'));
  assert.ok(upFallback.rawText.includes('खतौनी'));
  assert.ok(upFallback.holding.tenureType.includes('Bhumidhar with Transferable Rights'));

  console.log('  ✅ Test 5 Passed: MH 7/12 & UP Khatauni adapters verified.\n');

  // =========================================================================
  // Test 6: TinyFishService End-to-End Routing
  // =========================================================================
  console.log('--- Test 6: TinyFishService End-to-End Multi-State Routing ---');
  const tinyFish = new TinyFishService();

  // Test KA routing
  const kaResult = await tinyFish.fetchLandRecord({
    state: 'KA',
    docType: 'RTC',
    district: 'Bangalore Urban',
    taluka: 'Bangalore South',
    village: 'Hulimavu',
    surveyNo: '142'
  });
  assert.strictEqual(kaResult.success, true);
  assert.ok(kaResult.documentTitle.includes('Karnataka Bhoomi'));
  assert.ok(kaResult.metadata.ownerName.length > 0);
  assert.strictEqual(kaResult.metadata.unencumbered, true);
  assert.ok(kaResult.normalizedRecord, 'Must attach normalizedRecord');
  assert.strictEqual(kaResult.normalizedRecord.state, 'KA');

  // Test TG routing
  const tgResult = await tinyFish.fetchLandRecord({
    state: 'TG',
    docType: 'PASSBOOK',
    district: 'Rangareddy',
    taluka: 'Gandipet',
    village: 'Kokapet',
    surveyNo: '168',
    passbookNo: 'T08120040123'
  });
  assert.strictEqual(tgResult.success, true);
  assert.ok(tgResult.documentTitle.includes('Telangana Dharani'));
  assert.strictEqual(tgResult.metadata.isProhibited, false);
  assert.strictEqual(tgResult.metadata.passbookNumber, 'T08120040123');

  // Test TN routing
  const tnResult = await tinyFish.fetchLandRecord({
    state: 'TN',
    docType: 'PATTA_CHITTA',
    district: 'Chengalpattu',
    taluka: 'Tambaram',
    village: 'Pallikaranai',
    surveyNo: '214',
    pattaNo: '1250'
  });
  assert.strictEqual(tnResult.success, true);
  assert.ok(tnResult.documentTitle.includes('Tamil Nadu Patta/Chitta'));
  assert.strictEqual(tnResult.metadata.pattaNumber, '1250');
  assert.ok(tnResult.metadata.totalArea.includes('Hectares'));

  // Test MH routing
  const mhResult = await tinyFish.fetchLandRecord({
    state: 'MH',
    docType: '7_12',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNo: '141'
  });
  assert.strictEqual(mhResult.success, true);
  assert.ok(mhResult.documentTitle.includes('7/12'));

  // Test UP routing
  const upResult = await tinyFish.fetchLandRecord({
    state: 'UP',
    docType: 'KHATAUNI',
    district: 'Gautam Buddha Nagar',
    taluka: 'Dadri',
    village: 'Noida Sector 150',
    surveyNo: '204'
  });
  assert.strictEqual(upResult.success, true);
  assert.ok(upResult.documentTitle.includes('Khatauni'));

  // Test Generic Fallback (e.g. GA)
  const gaResult = await tinyFish.fetchLandRecord({
    state: 'GA',
    docType: 'FORM_I_XIV',
    district: 'North Goa',
    taluka: 'Bardez',
    village: 'Calangute',
    surveyNo: '15'
  });
  assert.strictEqual(gaResult.success, true);
  assert.ok(gaResult.documentTitle.includes('GA Official'));

  console.log('  ✅ Test 6 Passed: TinyFishService multi-state routing and generic fallback verified.\n');

  console.log('🎉 ALL MILESTONE 2 PORTAL ADAPTER TESTS PASSED WITH 100% SUCCESS!');
}

runM2Tests().catch(err => {
  console.error('❌ M2 Test Suite Failed:', err);
  process.exit(1);
});
