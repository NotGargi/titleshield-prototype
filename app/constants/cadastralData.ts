import { API_BASE_URL } from './api';
import { GeoPoint } from '../utils/geoProjection';

export type CleanTitleTier = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'A' | 'B' | 'C';
export type EncumbranceStatusType = 'CLEAN' | 'UNDER_VERIFICATION' | 'ENCUMBERED' | 'DISPUTED';

export interface LandPaperLedger {
  stateGovt: string;
  department: string;
  villageForm?: string;
  khataNumber?: string;
  surveyGatNumber: string;
  area: string;
  assessmentTax?: string;
  tenureClass: string;
  owners: Array<{ name: string; share?: string; khata?: string }>;
  otherRights?: string[];
  mutations?: string[];
  considerationAmount?: string;
  stampDuty?: string;
  sroOffice?: string;
  regDate?: string;
}

export interface LandPaper {
  id: string;
  title: string;
  titleNative?: string;
  type: '7_12' | 'INDEX_2' | 'MUTATION_6' | 'KHATAUNI' | 'DEED' | 'TITLE_CERTIFICATE' | 'BHUNAKSHA';
  typeLabel: string;
  status: 'AVAILABLE' | 'VERIFIED' | 'PROTECTED_SRO' | 'NOT_AVAILABLE';
  statusLabel: string;
  statusColor: string;
  documentNumber?: string;
  issuingAuthority: string;
  date?: string;
  downloadUrl?: string;
  recordId?: string;
  ledgerData?: LandPaperLedger;
}

export interface CadastralParcel {
  id: string;
  recordId: string;
  state: string;
  stateName: string;
  district: string;
  taluka: string;
  village: string;
  surveyNumber: string;
  subDivision?: string;
  claimedOwner: string;
  extent: string;
  landType: string;
  guidanceValueInr: string;
  marketValueInr: string;
  cleanTitleScore: number;
  cleanTitleTier: CleanTitleTier;
  cleanTitleRating: string;
  badgeColor: string;
  encumbranceStatus: EncumbranceStatusType;
  encumbranceLabel: string;
  coordinates: GeoPoint;
  polygonCoordinates: Array<[number, number]>;
  adjacentSurveys?: string[];
  docType?: string;
  docTitle?: string;
  papers?: LandPaper[];
}

export interface RegionalPreset {
  id: string;
  label: string;
  shortLabel: string;
  state: string;
  stateName: string;
  district: string;
  taluka?: string;
  village: string;
  coordinates: GeoPoint;
  zoom: number;
  defaultParcelId: string;
}

export const REGIONAL_PRESETS: RegionalPreset[] = [
  {
    id: 'mh-pune-wagholi',
    label: 'Pune Wagholi (Maharashtra)',
    shortLabel: 'Pune Wagholi',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    coordinates: { lat: 18.5793, lng: 73.9823 },
    zoom: 17,
    defaultParcelId: 'parcel-mh-pune-142-2a'
  },
  {
    id: 'tg-hyderabad',
    label: 'Hyderabad',
    shortLabel: 'Hyderabad',
    state: 'TG',
    stateName: 'Telangana',
    district: 'Hyderabad',
    taluka: 'Serilingampally',
    village: 'Gachibowli',
    coordinates: { lat: 17.4820, lng: 78.3315 },
    zoom: 15,
    defaultParcelId: 'parcel-tg-serilingampally-101'
  },
  {
    id: 'up-ghaziabad',
    label: 'Ghaziabad Panchsheel Park (Uttar Pradesh)',
    shortLabel: 'Ghaziabad',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Ghaziabad',
    taluka: 'Ghaziabad',
    village: 'Panchsheel Park',
    coordinates: { lat: 28.6712, lng: 77.3654 },
    zoom: 17,
    defaultParcelId: 'parcel-up-ghaziabad-112'
  },
  {
    id: 'up-noida',
    label: 'Noida Sector 62 (Uttar Pradesh)',
    shortLabel: 'Noida Sec 62',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar',
    taluka: 'Noida',
    village: 'Sector 62',
    coordinates: { lat: 28.6280, lng: 77.3649 },
    zoom: 17,
    defaultParcelId: 'parcel-up-noida-sec62-b44'
  },
  {
    id: 'dl-mehrauli',
    label: 'South Delhi Mehrauli (Delhi)',
    shortLabel: 'Delhi Mehrauli',
    state: 'DL',
    stateName: 'Delhi',
    district: 'South Delhi',
    taluka: 'Hauz Khas',
    village: 'Mehrauli',
    coordinates: { lat: 28.5244, lng: 77.1855 },
    zoom: 16,
    defaultParcelId: 'parcel-dl-mehrauli-plot24'
  },
  {
    id: 'ka-bengaluru',
    label: 'Bengaluru Whitefield (Karnataka)',
    shortLabel: 'Bengaluru Whitefield',
    state: 'KA',
    stateName: 'Karnataka',
    district: 'Bengaluru Urban',
    taluka: 'KR Puram',
    village: 'Whitefield',
    coordinates: { lat: 12.9698, lng: 77.7499 },
    zoom: 16,
    defaultParcelId: 'parcel-ka-whitefield-sy45'
  }
];

export const SEEDED_CADASTRAL_PARCELS: CadastralParcel[] = [
  // ===========================================================================
  // 1. Maharashtra: Pune Wagholi Gat 142/2A (Linked to rec-mh-pune-deed-4821)
  // ===========================================================================
  {
    id: 'parcel-mh-pune-142-2a',
    recordId: 'rec-mh-pune-deed-4821',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNumber: '142/2A',
    subDivision: '2A',
    claimedOwner: 'Verified Transferee',
    extent: '0 Hectare 18 R (18 Gunthe / 19,602 sq.ft)',
    landType: 'Agricultural (Jirayat / Freehold)',
    guidanceValueInr: 'Rs. 68,00,000/-',
    marketValueInr: 'Rs. 72,50,000/-',
    cleanTitleScore: 98,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Sovereign Clear Title (Low Risk)',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'Clean Title (No Active Mortgage / Nil Court Stay)',
    coordinates: { lat: 18.5793, lng: 73.9823 },
    polygonCoordinates: [
      [18.5790, 73.9818],
      [18.5797, 73.9820],
      [18.5795, 73.9829],
      [18.5788, 73.9826]
    ],
    adjacentSurveys: ['141', '142/1', '142/2B', '143'],
    docType: 'INDEX_2',
    docTitle: 'IGR Index-II Registered Sale Deed #4821/2024',
    papers: [
      {
        id: 'paper-mh-142-2a-712',
        title: 'Village Form 7/12 Extract (Adhikar Abhilekh & Pik Pahani)',
        titleNative: 'गाव नमुना ७/१२ (अधिकार अभिलेख व पिकांची पाहणी)',
        type: '7_12',
        typeLabel: '7/12 Extract',
        status: 'AVAILABLE',
        statusLabel: 'Official Mahabhumi ROR',
        statusColor: '#10B981',
        documentNumber: 'MH-PUN-HAV-WAG-142-2A',
        issuingAuthority: 'Office of the Tahsildar Haveli, Pune (MahaBhumi)',
        date: '12/10/2024',
        downloadUrl: `${API_BASE_URL}/records/rec-mh-pune-deed-4821/download`,
        recordId: 'rec-mh-pune-deed-4821',
        ledgerData: {
          stateGovt: 'महाराष्ट्र शासन (Government of Maharashtra)',
          department: 'महसूल व वन विभाग (Revenue & Forest Department)',
          villageForm: 'गाव नमुना ७ (अधिकार अभिलेख पत्रक) आणि गाव नमुना १२ (पिकांची पाहणी)',
          khataNumber: '892',
          surveyGatNumber: '142/2A',
          area: '0 Hectare 18 R (18 Gunthe / 19,602 sq.ft)',
          assessmentTax: '₹ 14.50',
          tenureClass: 'भोगवटादार वर्ग - १ (Bhogwatadar Class-1 / Freehold Alienable)',
          owners: [
            { name: 'रमेश कृष्णराव कुलकर्णी (Ramesh Krishnarao Kulkarni)', share: 'पूर्ण हिस्सा (100%)', khata: '892' }
          ],
          otherRights: [
            'सदर मिळकतीवर कोणत्याही बँकेचा अथवा वित्तीय संस्थेचा बोजा नाही (Nil Active Bank Mortgage / CERSAI Clean)',
            'न्यायालयीन स्थगिती आदेश नाही (No Court Injunction / Lis Pendens Clean)',
            'कुळ वहिवाट: नाही (Self Cultivation / Non-Tenanted)'
          ],
          mutations: ['फेरफार क्र. ४८२१ (खरेदीखत नोंदणी)', 'फेरफार क्र. ४३९० (वारस नोंद)']
        }
      },
      {
        id: 'paper-mh-142-2a-deed',
        title: 'IGR Index-II Registered Conveyance Sale Deed',
        titleNative: 'नोंदणी व मुद्रांक विभाग - सूची क्रमांक २ (खरेदी दस्तऐवज)',
        type: 'INDEX_2',
        typeLabel: 'Index-II Deed',
        status: 'AVAILABLE',
        statusLabel: 'Certified SRO Deed',
        statusColor: '#10B981',
        documentNumber: 'Doc No. 4821/2024 (Book 1, CD 142)',
        issuingAuthority: 'Joint Sub-Registrar Haveli-3, Pune (IGR Maharashtra)',
        date: '14/03/2024',
        downloadUrl: `${API_BASE_URL}/records/rec-mh-pune-deed-4821/download`,
        recordId: 'rec-mh-pune-deed-4821',
        ledgerData: {
          stateGovt: 'महाराष्ट्र शासन (Government of Maharashtra)',
          department: 'नोंदणी व मुद्रांक विभाग (Department of Registration & Stamps)',
          surveyGatNumber: '142/2A, Wagholi',
          area: '18 Gunthe (19,602 sq.ft)',
          considerationAmount: '₹ 68,00,000/-',
          stampDuty: '₹ 4,76,000/- (7% with Local Body Cess)',
          sroOffice: 'Sub-Registrar Haveli-3, Pune',
          regDate: '14/03/2024',
          tenureClass: 'Registered Absolute Sale Deed (Conveyance)',
          owners: [
            { name: 'Purchaser: रमेश कृष्णराव कुलकर्णी (Ramesh K. Kulkarni)' },
            { name: 'Seller: विठ्ठल सखाराम गायकवाड (Vitthal S. Gaikwad)' }
          ],
          otherRights: ['Registration Fee Paid: ₹ 30,000/-', 'CERSAI Search ID 2024-MH-4821 Clean']
        }
      },
      {
        id: 'paper-mh-142-2a-ferfar',
        title: 'Maharashtra Village Form 6 Mutation Register (Ferfar Namuna 6)',
        titleNative: 'गाव नमुना ६ - हक्क नोंदवही (फेरफार पत्रक)',
        type: 'MUTATION_6',
        typeLabel: 'Form 6 Ferfar',
        status: 'AVAILABLE',
        statusLabel: 'Pramanit (Approved)',
        statusColor: '#10B981',
        documentNumber: 'Ferfar No. 4821',
        issuingAuthority: 'Office of the Talathi & Circle Officer Wagholi, Pune',
        date: '18/04/2024',
        downloadUrl: `${API_BASE_URL}/records/rec-mh-pune-ferfar-4821/download`,
        recordId: 'rec-mh-pune-ferfar-4821',
        ledgerData: {
          stateGovt: 'महाराष्ट्र शासन (Government of Maharashtra)',
          department: 'महसूल विभाग (Revenue Department)',
          villageForm: 'गाव नमुना ६ - फेरफार नोंदवही (हक्क नोंदणी पत्रक)',
          surveyGatNumber: '142/2A',
          area: '0 Hectare 18 R',
          tenureClass: 'Pramanit Mutation Entry (MLRC Sec 149/150)',
          owners: [
            { name: 'नोंद घेणारा: तलाठी सज्जा वाघोली (Talathi Sajjah Wagholi)' },
            { name: 'प्रमाणित करणारा अधिकारी: मंडळ अधिकारी वाघोली (Circle Officer Wagholi)' }
          ],
          otherRights: ['कलम १५०(२) अन्वये १५ दिवसांची नोटीस बजावण्यात आली. मुदतीत कोणतीही हरकत नाही.']
        }
      },
      {
        id: 'paper-mh-142-2a-cert',
        title: 'Section 63 BSA 2023 Digital Title Certificate',
        titleNative: 'भारतीय साक्ष्य अधिनियम २०२३ कलम ६३ इलेक्ट्रॉनिक पुरावा प्रमाणपत्र',
        type: 'TITLE_CERTIFICATE',
        typeLabel: 'Title Certificate',
        status: 'VERIFIED',
        statusLabel: 'Class-3 DSC Signed',
        statusColor: '#38BDF8',
        documentNumber: 'TS-MH-2024-4821',
        issuingAuthority: 'Landeed Sovereign TitleShield & Advocate Council',
        date: '24/10/2024',
        downloadUrl: `${API_BASE_URL}/records/rec-mh-pune-deed-4821/download`,
        recordId: 'rec-mh-pune-deed-4821',
        ledgerData: {
          stateGovt: 'भारत गणराज्य / Republic of India',
          department: 'Section 63 BSA 2023 Digital Evidence Registry',
          surveyGatNumber: '142/2A, Wagholi, Pune',
          area: '18 Gunthe',
          tenureClass: 'Cryptographically Sealed TitleDAG Certificate',
          owners: [{ name: 'Certified Holder: Ramesh Krishnarao Kulkarni' }],
          otherRights: [
            'Merkle DAG Root: 0x73fed7f6ebc1e5db32fe33bb89c71fbecf8cad1f3fd57eba264fd71af4b043cf',
            'IPFS Evidence CID: bafkreig3hnsr5exln2hes7izdsczs5x273k7fcev6tkz2j3o6y6loaxdru'
          ]
        }
      }
    ]
  },
  // Adjacent Wagholi Plot 141
  {
    id: 'parcel-mh-pune-141',
    recordId: 'rec-mh-pune-deed-4821',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNumber: '141',
    claimedOwner: 'Ramesh Patil & Co-heirs',
    extent: '1.45 Hectare (3.58 Acre)',
    landType: 'Agricultural (Jirayat)',
    guidanceValueInr: 'Rs. 52,00,000/-',
    marketValueInr: 'Rs. 58,00,000/-',
    cleanTitleScore: 82,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Title Clear',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'Clear Title (Nil Liens)',
    coordinates: { lat: 18.5785, lng: 73.9810 },
    polygonCoordinates: [
      [18.5781, 73.9803],
      [18.5790, 73.9806],
      [18.5788, 73.9816],
      [18.5779, 73.9813]
    ],
    adjacentSurveys: ['140', '142/2A', '142/1'],
    docType: '7_12',
    docTitle: 'Village Form 7/12 Extract'
  },
  // Adjacent Wagholi Plot 142/1
  {
    id: 'parcel-mh-pune-142-1',
    recordId: 'rec-mh-pune-deed-4821',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNumber: '142/1',
    claimedOwner: 'Suresh Deshmukh',
    extent: '0.80 Hectare (1.97 Acre)',
    landType: 'Non-Agricultural (NA Converted)',
    guidanceValueInr: 'Rs. 40,00,000/-',
    marketValueInr: 'Rs. 46,00,000/-',
    cleanTitleScore: 89,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'NA Title Sanctioned',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'Collector NA Order Sanctioned',
    coordinates: { lat: 18.5802, lng: 73.9828 },
    polygonCoordinates: [
      [18.5798, 73.9822],
      [18.5806, 73.9825],
      [18.5804, 73.9835],
      [18.5796, 73.9831]
    ],
    adjacentSurveys: ['141', '142/2A', '142/2B', '143'],
    docType: 'INDEX_2',
    docTitle: 'NA Conveyance Deed'
  },
  // Adjacent Wagholi Plot 142/2B
  {
    id: 'parcel-mh-pune-142-2b',
    recordId: 'rec-mh-pune-deed-4821',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNumber: '142/2B',
    subDivision: '2B',
    claimedOwner: 'Prakash Kulkarni',
    extent: '0.95 Hectare (2.34 Acre)',
    landType: 'Agricultural (Jirayat)',
    guidanceValueInr: 'Rs. 48,00,000/-',
    marketValueInr: 'Rs. 54,00,000/-',
    cleanTitleScore: 85,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Title Clear',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'Clear Title',
    coordinates: { lat: 18.5789, lng: 73.9834 },
    polygonCoordinates: [
      [18.5785, 73.9828],
      [18.5793, 73.9831],
      [18.5791, 73.9841],
      [18.5783, 73.9838]
    ],
    adjacentSurveys: ['142/2A', '142/1', '143'],
    docType: '7_12',
    docTitle: 'Village Form 7/12 Extract'
  },
  // Adjacent Wagholi Plot 143 (Govt Revenue / Gairan)
  {
    id: 'parcel-mh-pune-143',
    recordId: 'rec-mh-pune-deed-4821',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNumber: '143',
    claimedOwner: 'Government Revenue Land (Maharashtra Sthanik Swarajya)',
    extent: '2.10 Hectare (5.18 Acre)',
    landType: 'Government Public Utility (Gairan)',
    guidanceValueInr: 'Rs. 95,00,000/-',
    marketValueInr: 'Govt Reserve',
    cleanTitleScore: 25,
    cleanTitleTier: 'CRITICAL',
    cleanTitleRating: 'Government Sovereign Land (Non-Alienable)',
    badgeColor: '#EF4444',
    encumbranceStatus: 'DISPUTED',
    encumbranceLabel: 'Prohibited Transfer (MLRC Sec 37)',
    coordinates: { lat: 18.5780, lng: 73.9845 },
    polygonCoordinates: [
      [18.5775, 73.9838],
      [18.5785, 73.9842],
      [18.5783, 73.9854],
      [18.5773, 73.9850]
    ],
    adjacentSurveys: ['142/2A', '142/2B', '144'],
    docType: '7_12',
    docTitle: 'Village Form 7/12 Gairan'
  },

  // ===========================================================================
  // 2. Uttar Pradesh: Ghaziabad Panchsheel Park Plot 112 (rec-up-ghaziabad-panchsheel-112)
  // ===========================================================================
  {
    id: 'parcel-up-ghaziabad-112',
    recordId: 'rec-up-ghaziabad-panchsheel-112',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Ghaziabad',
    taluka: 'Sahibabad',
    village: 'Panchsheel Park',
    surveyNumber: 'Plot 112 / Khasra 312',
    subDivision: 'Khasra 312',
    claimedOwner: 'Protected (Live SRO Deed Extraction Required)',
    extent: 'Plot 112 Residential Parcel (2,400 sq.ft)',
    landType: 'Urban Residential Freehold (Ward 34)',
    guidanceValueInr: 'Rs. 45,00,000/-',
    marketValueInr: 'Rs. 65,00,000/-',
    cleanTitleScore: 88,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Title Verified (Low Risk)',
    badgeColor: '#10B981',
    encumbranceStatus: 'UNDER_VERIFICATION',
    encumbranceLabel: 'Under Verification (Requires 13-year SRO query)',
    coordinates: { lat: 28.6712, lng: 77.3654 },
    polygonCoordinates: [
      [28.6708, 77.3650],
      [28.6716, 77.3652],
      [28.6714, 77.3659],
      [28.6706, 77.3657]
    ],
    adjacentSurveys: ['Plot 110', 'Plot 111', 'Plot 113'],
    docType: 'REGISTRY_DEED',
    docTitle: 'IGRSUP Sub-Registrar Certified Record Plot 112',
    papers: [
      {
        id: 'paper-up-112-khatauni',
        title: 'UP Bhulekh Digital Khatauni (Record of Rights)',
        titleNative: 'उत्तर प्रदेश भूलेख - कंप्यूटरीकृत खतौनी (अधिकार अभिलेख)',
        type: 'KHATAUNI',
        typeLabel: 'UP Khatauni ROR',
        status: 'AVAILABLE',
        statusLabel: 'Official Bhulekh ROR',
        statusColor: '#10B981',
        documentNumber: 'Khata No. 00142 / Fasli 1428-1433',
        issuingAuthority: 'Tehsildar Ghaziabad, UP Bhulekh Portal (upbhulekh.gov.in)',
        date: '05/09/2024',
        downloadUrl: `${API_BASE_URL}/records/rec-up-ghaziabad-panchsheel-112/download`,
        recordId: 'rec-up-ghaziabad-panchsheel-112',
        ledgerData: {
          stateGovt: 'उत्तर प्रदेश सरकार (Government of Uttar Pradesh)',
          department: 'राजस्व परिषद (Board of Revenue, UP)',
          villageForm: 'उ.प्र. राजस्व संहिता २०१६ - खतौनी उद्धरण (अधिकार अभिलेख)',
          khataNumber: '00142',
          surveyGatNumber: 'Plot 112 / Khasra 312',
          area: '2,400 sq.ft (0.0223 Hectare)',
          tenureClass: 'संक्रमणीय भूमिधर (Bhumidhar with Transferable Rights)',
          owners: [
            { name: 'Protected Citizen Holder (Record Protected under Privacy Rules)', share: '100%' }
          ],
          otherRights: ['प्रमाणित प्रतिलिपि हेतु विलेख संख्या दर्ज करें (Enter Deed Number to Reveal Full Chain)']
        }
      },
      {
        id: 'paper-up-112-deed',
        title: 'IGRSUP Registered Conveyance Deed (Registry Dastavej)',
        titleNative: 'स्टाम्प एवं निबंधन विभाग उत्तर प्रदेश - पंजीकृत विलेख',
        type: 'DEED',
        typeLabel: 'SRO Registry Deed',
        status: 'PROTECTED_SRO',
        statusLabel: 'Deed Lookup Available',
        statusColor: '#F59E0B',
        documentNumber: 'SRO Sahibabad-IV / Deed Pending Query',
        issuingAuthority: 'Sub-Registrar Sahibabad (Ghaziabad-IV), UP (igrsup.gov.in)',
        date: 'Pending Query',
        downloadUrl: `${API_BASE_URL}/records/rec-up-ghaziabad-panchsheel-112/download`,
        recordId: 'rec-up-ghaziabad-panchsheel-112',
        ledgerData: {
          stateGovt: 'उत्तर प्रदेश सरकार',
          department: 'स्टाम्प एवं निबंधन विभाग (IGRSUP)',
          surveyGatNumber: 'Plot 112, Panchsheel Park, Sahibabad',
          area: '2,400 sq.ft',
          sroOffice: 'Sub-Registrar Office Sahibabad (Ghaziabad-IV)',
          tenureClass: 'Urban Residential Freehold',
          owners: [{ name: 'Protected (Live SRO Deed Query Required)' }],
          otherRights: ['UP Registration Act 1908 Notice: Enter Deed No to Unlock full chain']
        }
      }
    ]
  },
  // Adjacent Ghaziabad Plot 111
  {
    id: 'parcel-up-ghaziabad-111',
    recordId: 'rec-up-ghaziabad-panchsheel-112',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Ghaziabad',
    taluka: 'Sahibabad',
    village: 'Panchsheel Park',
    surveyNumber: 'Plot 111',
    subDivision: 'Khasra 312',
    claimedOwner: 'Rajesh Verma',
    extent: '2,200 sq.ft',
    landType: 'Urban Residential Freehold',
    guidanceValueInr: 'Rs. 42,00,000/-',
    marketValueInr: 'Rs. 60,00,000/-',
    cleanTitleScore: 91,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Title Clean',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'Clean Title (No Active Liens)',
    coordinates: { lat: 28.6710, lng: 77.3646 },
    polygonCoordinates: [
      [28.6706, 77.3642],
      [28.6714, 77.3644],
      [28.6712, 77.3650],
      [28.6704, 77.3648]
    ],
    adjacentSurveys: ['Plot 109', 'Plot 110', 'Plot 112'],
    docType: 'REGISTRY_DEED',
    docTitle: 'IGRSUP Registered Deed'
  },

  // ===========================================================================
  // 3. Uttar Pradesh: Noida Sector 62 Plot B-44 (rec-up-noida-deed-8910)
  // ===========================================================================
  {
    id: 'parcel-up-noida-sec62-b44',
    recordId: 'rec-up-noida-deed-8910',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar',
    taluka: 'Noida',
    village: 'Sector 62',
    surveyNumber: 'Plot No. B-44, Sector 62',
    subDivision: 'Block B',
    claimedOwner: 'Verified Transferee (Conveyance Purchaser)',
    extent: '250 sq. meters',
    landType: 'Urban Residential Freehold',
    guidanceValueInr: 'Rs. 1,38,00,000/-',
    marketValueInr: 'Rs. 1,45,00,000/-',
    cleanTitleScore: 94,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Clear Title (Low Risk)',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: '13-Year Clean Non-Encumbrance Verified on IGRSUP',
    coordinates: { lat: 28.6280, lng: 77.3649 },
    polygonCoordinates: [
      [28.6276, 77.3645],
      [28.6284, 77.3647],
      [28.6282, 77.3654],
      [28.6274, 77.3652]
    ],
    adjacentSurveys: ['Plot B-41', 'Plot B-42', 'Plot B-43', 'Plot B-45'],
    docType: 'REGISTRY_DEED',
    docTitle: 'IGRSUP Registered Conveyance Deed #8910/2023',
    papers: [
      {
        id: 'paper-up-noida-b44-deed',
        title: 'NOIDA Authority Sub-Lease & Conveyance Deed #8910/2023',
        titleNative: 'नोएडा प्राधिकरण - पंजीकृत पट्टा एवं हस्तांतरण विलेख',
        type: 'DEED',
        typeLabel: 'Conveyance Deed',
        status: 'AVAILABLE',
        statusLabel: 'Registered SRO Noida-I',
        statusColor: '#10B981',
        documentNumber: 'Deed No. 8910/2023 (Book 1, Jild 4120, Pages 1-48)',
        issuingAuthority: 'Sub-Registrar Office Noida-I, Gautam Buddha Nagar',
        date: '19/11/2023',
        downloadUrl: `${API_BASE_URL}/records/rec-up-noida-deed-8910/download`,
        recordId: 'rec-up-noida-deed-8910',
        ledgerData: {
          stateGovt: 'उत्तर प्रदेश सरकार / नोएडा प्राधिकरण',
          department: 'New Okhla Industrial Development Authority (NOIDA)',
          surveyGatNumber: 'Plot B-44, Sector 62',
          area: '250 sq. meters (2,691 sq.ft)',
          considerationAmount: '₹ 1,38,00,000/-',
          stampDuty: '₹ 9,66,000/- (7%)',
          sroOffice: 'SRO Noida-I',
          regDate: '19/11/2023',
          tenureClass: 'NOIDA Allotted Freehold / Registered Conveyance',
          owners: [
            { name: 'Verified Transferee (Conveyance Purchaser)' },
            { name: 'Confirming Party: NOIDA Commercial Department' }
          ],
          otherRights: ['CERSAI Non-Encumbrance ID: 2023-UP-8910 Clean', 'No Active Bank Liens']
        }
      },
      {
        id: 'paper-up-noida-b44-cert',
        title: 'Section 63 BSA 2023 Digital Title Certificate',
        type: 'TITLE_CERTIFICATE',
        typeLabel: 'Title Certificate',
        status: 'VERIFIED',
        statusLabel: 'Class-3 DSC Signed',
        statusColor: '#38BDF8',
        documentNumber: 'TS-UP-2023-8910',
        issuingAuthority: 'Landeed Sovereign TitleShield & Advocate Council',
        date: '20/11/2023',
        downloadUrl: `${API_BASE_URL}/records/rec-up-noida-deed-8910/download`,
        recordId: 'rec-up-noida-deed-8910',
        ledgerData: {
          stateGovt: 'भारत गणराज्य / Republic of India',
          department: 'Section 63 BSA 2023 Digital Evidence Registry',
          surveyGatNumber: 'Plot B-44, Sector 62, Noida',
          area: '250 sq. meters',
          tenureClass: 'Sovereign Clear Title Certificate',
          owners: [{ name: 'Certified Holder: Verified Transferee' }]
        }
      }
    ]
  },
  // Adjacent Noida Sector 62 Plot B-45
  {
    id: 'parcel-up-noida-sec62-b45',
    recordId: 'rec-up-noida-deed-8910',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar',
    taluka: 'Noida',
    village: 'Sector 62',
    surveyNumber: 'Plot No. B-45, Sector 62',
    subDivision: 'Block B',
    claimedOwner: 'Amit Saxena',
    extent: '250 sq. meters',
    landType: 'Urban Residential Freehold',
    guidanceValueInr: 'Rs. 1,38,00,000/-',
    marketValueInr: 'Rs. 1,42,00,000/-',
    cleanTitleScore: 92,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Clean Title',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'Clear Non-Encumbrance',
    coordinates: { lat: 28.6272, lng: 77.3647 },
    polygonCoordinates: [
      [28.6268, 77.3643],
      [28.6276, 77.3645],
      [28.6274, 77.3652],
      [28.6266, 77.3650]
    ],
    adjacentSurveys: ['Plot B-44', 'Plot B-46'],
    docType: 'REGISTRY_DEED',
    docTitle: 'Conveyance Deed'
  },

  // ===========================================================================
  // 4. Delhi: Mehrauli Plot 24
  // ===========================================================================
  {
    id: 'parcel-dl-mehrauli-plot24',
    recordId: 'rec-dl-mehrauli-plot24',
    state: 'DL',
    stateName: 'Delhi',
    district: 'South Delhi',
    taluka: 'Hauz Khas',
    village: 'Mehrauli',
    surveyNumber: 'Khasra 240/12',
    subDivision: 'Ward 2',
    claimedOwner: 'Virendra Singh Tyagi',
    extent: '500 sq. yards (4,500 sq.ft)',
    landType: 'Lal Dora Freehold Residential',
    guidanceValueInr: 'Rs. 2,10,00,000/-',
    marketValueInr: 'Rs. 2,35,00,000/-',
    cleanTitleScore: 90,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Lal Dora Verified Clear',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'DORIS Certified Clean',
    coordinates: { lat: 28.5244, lng: 77.1855 },
    polygonCoordinates: [
      [28.5240, 77.1850],
      [28.5248, 77.1852],
      [28.5246, 77.1860],
      [28.5238, 77.1858]
    ],
    adjacentSurveys: ['Khasra 240/11', 'Khasra 240/13'],
    docType: 'REGISTRY_DEED',
    docTitle: 'Delhi Sub-Registrar Certified Deed'
  },

  // ===========================================================================
  // 5. Karnataka: Bengaluru Whitefield Sy 45
  // ===========================================================================
  {
    id: 'parcel-ka-whitefield-sy45',
    recordId: 'rec-ka-whitefield-sy45',
    state: 'KA',
    stateName: 'Karnataka',
    district: 'Bengaluru Urban',
    taluka: 'KR Puram',
    village: 'Whitefield',
    surveyNumber: 'Sy No. 45/2',
    subDivision: '2',
    claimedOwner: 'Naveen Kumar & Partners',
    extent: '1 Acre 12 Gunta',
    landType: 'Converted Commercial / IT Corridor',
    guidanceValueInr: 'Rs. 4,80,00,000/-',
    marketValueInr: 'Rs. 5,50,00,000/-',
    cleanTitleScore: 93,
    cleanTitleTier: 'LOW',
    cleanTitleRating: 'Kaveri 2.0 Encumbrance Free',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'Kaveri Form 15 Non-Encumbrance Issued',
    coordinates: { lat: 12.9698, lng: 77.7499 },
    polygonCoordinates: [
      [12.9693, 77.7493],
      [12.9703, 77.7496],
      [12.9701, 77.7505],
      [12.9691, 77.7502]
    ],
    adjacentSurveys: ['Sy No. 45/1', 'Sy No. 46'],
    docType: 'INDEX_2',
    docTitle: 'Kaveri 2.0 Registered Deed'
  },

  // ===========================================================================
  // 6. Telangana: Hyderabad Serilingampally Survey 101
  // ===========================================================================
  {
    id: 'parcel-tg-serilingampally-101',
    recordId: 'rec-tg-hyd-passbook-101',
    state: 'TG',
    stateName: 'Telangana',
    district: 'Hyderabad',
    taluka: 'Serilingampally',
    village: 'Gachibowli',
    surveyNumber: '101',
    subDivision: '1',
    claimedOwner: 'Ch. Malleshwara Rao',
    extent: '2.15 Acres (Ac. 2.15 Gts)',
    landType: 'Patta (Private Freehold)',
    guidanceValueInr: '₹1,20,00,000',
    marketValueInr: '₹1,80,00,000',
    cleanTitleScore: 88,
    cleanTitleTier: 'A',
    cleanTitleRating: 'Very High Confidence',
    badgeColor: '#10B981',
    encumbranceStatus: 'CLEAN',
    encumbranceLabel: 'Verified Clean',
    coordinates: { lat: 17.4820, lng: 78.3315 },
    polygonCoordinates: [
      [17.4836, 78.3279],
      [17.4852, 78.3279],
      [17.4852, 78.3297],
      [17.4836, 78.3297],
      [17.4836, 78.3279]
    ],
    adjacentSurveys: ['100', '102', '103'],
    docType: 'DHARANI_PPB',
    docTitle: 'Dharani Passbook',
    papers: [
      {
        id: 'paper-tg-passbook-101',
        title: 'Dharani Digital Pattadar Passbook - Sy 101',
        titleNative: 'ధరణి పట్టాదారు పాస్ పుస్తకం',
        type: '7_12',
        typeLabel: 'Pattadar Passbook',
        status: 'VERIFIED',
        statusLabel: 'Dharani Registry Verified',
        statusColor: '#10B981',
        documentNumber: 'TG-DHA-PPB-88319',
        issuingAuthority: 'Government of Telangana (Dharani Portal)',
        date: '14/06/2023',
        downloadUrl: `${API_BASE_URL}/records/rec-tg-hyd-passbook-101/download`,
        recordId: 'rec-tg-hyd-passbook-101',
        ledgerData: {
          stateGovt: 'Government of Telangana',
          department: 'Revenue & Registration Department (Dharani)',
          khataNumber: 'KT-772',
          surveyGatNumber: '101',
          area: '2.15 Acres',
          tenureClass: 'Patta Freehold (Agricultural / Mixed)',
          owners: [{ name: 'Ch. Malleshwara Rao', share: '100%', khata: 'KT-772' }],
          otherRights: [
            'Prohibited Property Register 22-A Check: CLEAR',
            'HYDRAA Lake Buffer Check: Compliant (Beyond 50m FTL)',
            'Cryptographic hash verified on Landeed Ledger'
          ]
        }
      }
    ]
  }
];

export function findParcelById(id: string): CadastralParcel | undefined {
  return SEEDED_CADASTRAL_PARCELS.find((p) => p.id === id);
}

export function findParcelsByRegion(state: string): CadastralParcel[] {
  return SEEDED_CADASTRAL_PARCELS.filter((p) => p.state === state);
}
