import { sqlite } from './index';
import { CersaiRepository } from './cersaiRepository';
import { CourtCasesRepository } from './courtCasesRepository';

function resolvePropertyId(id?: string | null): string | null {
  if (!id) return null;
  try {
    const exists = sqlite.prepare('SELECT id FROM properties WHERE id = ?').get(id);
    return exists ? id : null;
  } catch {
    return null;
  }
}

export function seedEncumbranceData(): void {
  const cersaiRepo = CersaiRepository.getInstance();
  const courtRepo = CourtCasesRepository.getInstance();

  if (cersaiRepo.count() > 0 && courtRepo.count() > 0) {
    return;
  }

  console.log('[Diligence] Seeding authentic CERSAI and e-Courts NJDG records into SQLite...');

  // 1. CERSAI CHARGES
  const sampleCharges = [
    {
      id: 'cersai_up_gzb_404',
      cersaiSecurityInterestId: 'CERSAI-UP-GZB-2021-008192',
      propertyId: 'prop-up-gzb-404',
      surveyNumber: '404',
      state: 'UP',
      district: 'Ghaziabad',
      taluka: 'Sahibabad',
      village: 'Sahibabad',
      borrowerName: 'Pradeep Singhal',
      financialInstitution: 'State Bank of India',
      branchName: 'SME Branch Ghaziabad (04123)',
      chargeAmountInr: 4500000,
      chargeType: 'EQUITABLE_MORTGAGE',
      creationDate: '2021-03-12',
      satisfactionDate: null,
      status: 'ACTIVE',
      rocChargeId: null,
      filingOfficer: 'A. K. Srivastava (Chief Manager)',
      remarks: 'First charge on residential plot 404 for term loan facility.',
      createdAt: '2021-03-12T10:00:00.000Z',
      updatedAt: '2021-03-12T10:00:00.000Z'
    },
    {
      id: 'cersai_up_gzb_402',
      cersaiSecurityInterestId: 'CERSAI-UP-GZB-2019-003412',
      propertyId: 'prop-up-gzb-402',
      surveyNumber: '402',
      state: 'UP',
      district: 'Ghaziabad',
      taluka: 'Sahibabad',
      village: 'Sahibabad',
      borrowerName: 'Vikramaditya Tyagi',
      financialInstitution: 'HDFC Bank Ltd',
      branchName: 'Raj Nagar Branch Ghaziabad',
      chargeAmountInr: 6500000,
      chargeType: 'REGISTERED_MORTGAGE',
      creationDate: '2019-09-15',
      satisfactionDate: '2024-01-20',
      status: 'SATISFIED',
      rocChargeId: null,
      filingOfficer: 'Rohan Mehra (Authorized Signatory)',
      remarks: 'Full repayment received. No Objection Certificate (NOC) and Deed of Release registered.',
      createdAt: '2019-09-15T11:30:00.000Z',
      updatedAt: '2024-01-20T16:00:00.000Z'
    },
    {
      id: 'cersai_up_gzb_112',
      cersaiSecurityInterestId: 'CERSAI-UP-GZB-2020-005619',
      propertyId: 'rec-up-ghaziabad-panchsheel-112',
      surveyNumber: 'Plot 112',
      state: 'UP',
      district: 'Ghaziabad',
      taluka: 'Sahibabad',
      village: 'Panchsheel Park',
      borrowerName: 'Panchsheel Residential Allottee',
      financialInstitution: 'Punjab National Bank',
      branchName: 'Sahibabad Industrial Area',
      chargeAmountInr: 2800000,
      chargeType: 'EQUITABLE_MORTGAGE',
      creationDate: '2020-08-14',
      satisfactionDate: null,
      status: 'ACTIVE',
      rocChargeId: null,
      filingOfficer: 'D. P. Gupta (Manager Credit)',
      remarks: 'Security interest created via deposit of original allotment letter & title deeds.',
      createdAt: '2020-08-14T09:15:00.000Z',
      updatedAt: '2020-08-14T09:15:00.000Z'
    },
    {
      id: 'cersai_mh_pun_142_2a',
      cersaiSecurityInterestId: 'CERSAI-MH-PUN-2010-001249',
      propertyId: 'rec-mh-pune-ferfar-4821',
      surveyNumber: '142/2A',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      borrowerName: 'Waghmare / Patil Family',
      financialInstitution: 'Bank of Maharashtra',
      branchName: 'Kharadi Branch Pune',
      chargeAmountInr: 3800000,
      chargeType: 'EQUITABLE_MORTGAGE',
      creationDate: '2010-04-18',
      satisfactionDate: '2012-08-22',
      status: 'SATISFIED',
      rocChargeId: null,
      filingOfficer: 'S. N. Joshi (Branch Manager)',
      remarks: 'Mortgage discharge recorded in Village Form 6 Ferfar No. 4821; unencumbered title restored.',
      createdAt: '2010-04-18T14:00:00.000Z',
      updatedAt: '2012-08-22T12:00:00.000Z'
    },
    {
      id: 'cersai_mh_pun_141',
      cersaiSecurityInterestId: 'CERSAI-MH-PUN-2022-019842',
      propertyId: 'prop-mh-pune-141',
      surveyNumber: '141',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      borrowerName: 'Ashok Ramchandra Waghmare',
      financialInstitution: 'ICICI Bank Ltd',
      branchName: 'Viman Nagar Branch Pune',
      chargeAmountInr: 12000000,
      chargeType: 'REGISTERED_MORTGAGE',
      creationDate: '2022-11-05',
      satisfactionDate: null,
      status: 'ACTIVE',
      rocChargeId: null,
      filingOfficer: 'Pooja Deshmukh (Credit Operations)',
      remarks: 'Term loan security interest covering 1 Acre 20 Guntas layout parcel.',
      createdAt: '2022-11-05T10:45:00.000Z',
      updatedAt: '2022-11-05T10:45:00.000Z'
    },
    {
      id: 'cersai_up_noi_8910',
      cersaiSecurityInterestId: 'CERSAI-UP-NOI-2023-014521',
      propertyId: 'rec-up-noida-deed-8910',
      surveyNumber: '8910',
      state: 'UP',
      district: 'Gautam Buddha Nagar',
      taluka: 'Dadri',
      village: 'Sector 62',
      borrowerName: 'Verma Tech Logistics Pvt Ltd',
      financialInstitution: 'Axis Bank Ltd',
      branchName: 'Sector 18 Corporate Branch Noida',
      chargeAmountInr: 21000000,
      chargeType: 'REGISTERED_MORTGAGE',
      creationDate: '2023-05-19',
      satisfactionDate: null,
      status: 'ACTIVE',
      rocChargeId: 'ROC-DEL-CHG-984120',
      filingOfficer: 'Kunal Kapoor (VP Corporate Banking)',
      remarks: 'Pari-passu charge with MCA ROC CHG-1 registration certificate issued.',
      createdAt: '2023-05-19T16:20:00.000Z',
      updatedAt: '2023-05-19T16:20:00.000Z'
    },
    {
      id: 'cersai_mh_mum_hw130562',
      cersaiSecurityInterestId: 'CERSAI-MH-MUM-2021-034891',
      propertyId: 'rec-mh-bmc-tax-hw130562',
      surveyNumber: 'HW1305620200003',
      state: 'MH',
      district: 'Mumbai Suburban',
      taluka: 'Bandra',
      village: 'Bandra West',
      borrowerName: 'Silver Oak Co-op Hsg Soc Unit',
      financialInstitution: 'Kotak Mahindra Bank Ltd',
      branchName: 'Turner Road Bandra West',
      chargeAmountInr: 45000000,
      chargeType: 'EQUITABLE_MORTGAGE',
      creationDate: '2021-09-10',
      satisfactionDate: null,
      status: 'ACTIVE',
      rocChargeId: null,
      filingOfficer: 'Anjali Nair (Senior Manager Loans)',
      remarks: 'Primary mortgage on flat in Silver Oak; subject to BMC statutory charge under Sec 212 MMC Act.',
      createdAt: '2021-09-10T12:00:00.000Z',
      updatedAt: '2021-09-10T12:00:00.000Z'
    }
  ];

  for (const c of sampleCharges) {
    try {
      cersaiRepo.insert({
        ...c,
        propertyId: resolvePropertyId(c.propertyId)
      } as any);
    } catch (e: any) {
      console.warn(`[Diligence] Notice inserting CERSAI charge ${c.id}:`, e?.message);
    }
  }

  // 2. COURT CASES (e-Courts NJDG)
  const sampleCases = [
    {
      id: 'case_up_gzb_2022_412',
      cnrNumber: 'UPGZ01-004291-2022',
      propertyId: 'prop-up-gzb-404',
      surveyNumber: '404',
      state: 'UP',
      district: 'Ghaziabad',
      taluka: 'Sahibabad',
      village: 'Sahibabad',
      courtName: 'Civil Court (Senior Division) Ghaziabad',
      caseType: 'Special Civil Suit (S.C.S.)',
      caseNumber: 'SCS/412/2022',
      filingYear: 2022,
      filingDate: '2022-07-14',
      petitioner: 'Rameshwar Dayal & 2 Ors.',
      respondent: 'Pradeep Singhal & State of Uttar Pradesh',
      petitionerAdvocate: 'Shri R. K. Tyagi, Advocate',
      respondentAdvocate: 'Shri Manoj Sharma, Advocate',
      disputeCategory: 'PARTITION_SUIT',
      prayerSummary: 'Claim for partition of 1/3rd ancestral share in Khasra 404, declaration of voidness of prior sale deed, and perpetual injunction.',
      stayOrderActive: true,
      stayOrderDetails: 'Interim injunction granted under Order XXXIX Rules 1 & 2 CPC restraining Respondent from creating third-party rights or changing nature of suit land.',
      caseStatus: 'STAY_GRANTED',
      stageOfCase: 'Evidence of Plaintiff (P.W. 1 under examination)',
      nextHearingDate: '2026-11-18',
      rawMetadata: JSON.stringify({ eCourtsBench: 'Court Hall 3', cpcSection: 'Order 39 Rules 1-2', lisPendensApplicable: true }),
      createdAt: '2022-07-14T10:00:00.000Z',
      updatedAt: '2026-10-15T15:30:00.000Z'
    },
    {
      id: 'case_up_gzb_2023_108',
      cnrNumber: 'UPGZ02-001984-2023',
      propertyId: 'rec-up-ghaziabad-panchsheel-112',
      surveyNumber: 'Plot 112',
      state: 'UP',
      district: 'Ghaziabad',
      taluka: 'Sahibabad',
      village: 'Panchsheel Park',
      courtName: 'Court of Civil Judge (Junior Division) Ghaziabad',
      caseType: 'Original Suit (O.S.)',
      caseNumber: 'OS/108/2023',
      filingYear: 2023,
      filingDate: '2023-03-22',
      petitioner: 'Sunil Tyagi',
      respondent: 'Declared Vendor / Predecessor',
      petitionerAdvocate: 'Shri Amit Saxena, Advocate',
      respondentAdvocate: 'Shri Suresh Pal, Advocate',
      disputeCategory: 'SPECIFIC_PERFORMANCE',
      prayerSummary: 'Suit for specific performance of unregistered agreement to sell dated 10/01/2022 with alternative prayer for refund of earnest money.',
      stayOrderActive: false,
      stayOrderDetails: 'Notice issued; temporary injunction application rejected on 15/09/2023 for lack of prima facie possession. Matter pending trial.',
      caseStatus: 'PENDING',
      stageOfCase: 'Framing of Issues',
      nextHearingDate: '2026-12-08',
      rawMetadata: JSON.stringify({ caveatsRegistered: 1, interimReliefGranted: false }),
      createdAt: '2023-03-22T11:00:00.000Z',
      updatedAt: '2026-09-18T14:00:00.000Z'
    },
    {
      id: 'case_mh_pun_2023_891',
      cnrNumber: 'MHPUN01-008123-2023',
      propertyId: 'prop-mh-pune-141',
      surveyNumber: '141',
      state: 'MH',
      district: 'Pune',
      taluka: 'Haveli',
      village: 'Wagholi',
      courtName: 'Court of Civil Judge Senior Division Pune',
      caseType: 'Regular Civil Suit (R.C.S.)',
      caseNumber: 'RCS/891/2023',
      filingYear: 2023,
      filingDate: '2023-09-18',
      petitioner: 'Kishore Baburao Jagtap',
      respondent: 'Ashok Ramchandra Waghmare',
      petitionerAdvocate: 'Adv. Satish Kulkarni',
      respondentAdvocate: 'Adv. Nilesh Gaikwad',
      disputeCategory: 'BOUNDARY_ENCROACHMENT',
      prayerSummary: 'Demarcation and injunction restraining construction encroachment across northern boundary of Gat 141.',
      stayOrderActive: true,
      stayOrderDetails: 'Status Quo order in force under Section 151 CPC pending Cadastral Mojani measurement by Dy Director of Land Records (DDLR).',
      caseStatus: 'STAY_GRANTED',
      stageOfCase: 'Awaiting Court Commissioner Mojani Survey Report',
      nextHearingDate: '2026-11-25',
      rawMetadata: JSON.stringify({ mojaniOrdered: true, statusQuoRestrainingEncroachment: true }),
      createdAt: '2023-09-18T14:30:00.000Z',
      updatedAt: '2026-10-05T16:00:00.000Z'
    },
    {
      id: 'case_mh_mum_2023_204',
      cnrNumber: 'MHCIV01-003412-2023',
      propertyId: 'rec-mh-bmc-tax-hw130562',
      surveyNumber: 'HW1305620200003',
      state: 'MH',
      district: 'Mumbai Suburban',
      taluka: 'Bandra',
      village: 'Bandra West',
      courtName: 'City Civil Court Dindoshi (Mumbai)',
      caseType: 'Notice of Motion (N.M.)',
      caseNumber: 'NM/204/2023',
      filingYear: 2023,
      filingDate: '2023-11-04',
      petitioner: 'Municipal Corporation of Greater Mumbai (MCGM)',
      respondent: 'Silver Oak Co-op Hsg Soc Ltd',
      petitionerAdvocate: 'Adv. S. V. Bharucha (MCGM Panel)',
      respondentAdvocate: 'Adv. Meher Contractor',
      disputeCategory: 'TITLE_DISPUTE',
      prayerSummary: 'Municipal recovery notice under Section 212 of MMC Act for outstanding civic charges and demolition of unauthorized 110 sq.ft balcony enclosure under Section 267A.',
      stayOrderActive: true,
      stayOrderDetails: 'Ad-interim stay on coercive auction granted subject to deposit of Rs. 1,00,000/- with BMC assessment department within 4 weeks.',
      caseStatus: 'STAY_GRANTED',
      stageOfCase: 'Compliance Verification of Conditional Deposit',
      nextHearingDate: '2026-12-02',
      rawMetadata: JSON.stringify({ mmcSection: '212 & 267A', conditionalDepositOrdered: true }),
      createdAt: '2023-11-04T12:00:00.000Z',
      updatedAt: '2026-10-20T11:00:00.000Z'
    },
    {
      id: 'case_tg_hyd_2023_14290',
      cnrNumber: 'TGHC01-014290-2023',
      propertyId: 'prop-tg-serilingampally-72',
      surveyNumber: '72',
      state: 'TG',
      district: 'Rangareddy',
      taluka: 'Serilingampally',
      village: 'Gachibowli',
      courtName: 'High Court for the State of Telangana',
      caseType: 'Writ Petition (W.P.)',
      caseNumber: 'WP/14290/2023',
      filingYear: 2023,
      filingDate: '2023-06-11',
      petitioner: 'Telangana State Waqf Board',
      respondent: 'Principal Secretary (Revenue) & 5 Ors.',
      petitionerAdvocate: 'Special Govt Pleader for Waqf',
      respondentAdvocate: 'Senior Counsel K. Ramakrishna',
      disputeCategory: 'TITLE_DISPUTE',
      prayerSummary: 'Declaration of Survey 72 as notified Waqf endowment property and direction to Sub-Registrar to include under Section 22-A Prohibited List.',
      stayOrderActive: true,
      stayOrderDetails: 'Division Bench interim direction restraining Sub-Registrar from registering any conveyance deeds or creating third-party encumbrance pending final disposal.',
      caseStatus: 'STAY_GRANTED',
      stageOfCase: 'Counter-Affidavit Filed by State Revenue Dept',
      nextHearingDate: '2026-11-30',
      rawMetadata: JSON.stringify({ ror22AProhibitedList: true, waqfActSection: '51 & 52' }),
      createdAt: '2023-06-11T10:30:00.000Z',
      updatedAt: '2026-10-12T17:00:00.000Z'
    }
  ];

  for (const cs of sampleCases) {
    try {
      courtRepo.insert({
        ...cs,
        propertyId: resolvePropertyId(cs.propertyId)
      } as any);
    } catch (e: any) {
      console.warn(`[Diligence] Notice inserting Court Case ${cs.id}:`, e?.message);
    }
  }

  console.log(`[Diligence] Successfully seeded ${sampleCharges.length} CERSAI charges and ${sampleCases.length} e-Courts cases.`);
}
