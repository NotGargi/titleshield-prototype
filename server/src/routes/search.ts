import { Router, Request, Response } from 'express';
import {
  normalizeStateCode,
  getDistrictsForState,
  getTalukasForDistrict,
  getVillagesForTaluka,
  getCanonicalDistrictName,
  getCanonicalTalukaInfo
} from '../services/locationService';

export const searchRouter = Router();

export interface StateConfig {
  code: string;
  name: string;
  nativeName: string;
  documents: { id: string; name: string; description: string; icon: string }[];
  portal: string;
}

const SUPPORTED_STATES: StateConfig[] = [
  // --- Western India ---
  {
    code: 'MH',
    name: 'Maharashtra',
    nativeName: 'महाराष्ट्र',
    portal: 'Mahabhumi / Aapleabhilekh',
    documents: [
      { id: '7_12', name: '7/12 & 8A Extract', description: 'Satbara Utara & Khate Extract with crop & ownership details', icon: 'file-text' },
      { id: 'MUTATION', name: 'Ferfar / Mutation Register', description: 'Historical land ownership transfer & inheritance records', icon: 'git-commit' },
      { id: 'INDEX_2', name: 'IGR Index-II', description: 'Certified property deed registration summary', icon: 'award' }
    ]
  },
  {
    code: 'GJ',
    name: 'Gujarat',
    nativeName: 'ગુજરાત',
    portal: 'AnyRoR / e-Milkat',
    documents: [
      { id: '7_12', name: 'AnyRoR 7/12 & 8A', description: 'Rural land record inspection & land rights register', icon: 'file-text' },
      { id: 'VF6', name: 'Village Form 6 (Hakk Patrak)', description: 'Mutation and mutation entry diary', icon: 'file' }
    ]
  },
  {
    code: 'GA',
    name: 'Goa',
    nativeName: 'गोंय',
    portal: 'Goa Directorate of Settlement & Land Records',
    documents: [
      { id: 'FORM_1_14', name: 'Form I & XIV Extract', description: 'Official record of rights and landholder titles', icon: 'file-text' },
      { id: 'FORM_D_CITY', name: 'Form D (City Survey)', description: 'Urban property card for municipal areas', icon: 'home' }
    ]
  },

  // --- Northern India ---
  {
    code: 'UP',
    name: 'Uttar Pradesh',
    nativeName: 'उत्तर प्रदेश',
    portal: 'Bhulekh UP / IGRSUP',
    documents: [
      { id: 'KHATAUNI', name: 'Bhulekh Khatauni (ROR)', description: 'Official UP revenue ownership & khasra plot record', icon: 'file-text' },
      { id: 'REGISTRY_DEED', name: 'IGRSUP Registered Deed', description: '13-year certified registry & sale agreement search', icon: 'award' },
      { id: 'BHU_NAKSHA', name: 'Bhu-Naksha Cadastral Map', description: 'Geo-referenced parcel boundaries & map dimensions', icon: 'map' }
    ]
  },
  {
    code: 'DL',
    name: 'Delhi',
    nativeName: 'दिल्ली',
    portal: 'DORIS / Delhi Bhulekh / DDA',
    documents: [
      { id: 'DORIS_REGISTRY', name: 'DORIS Registered Deed', description: 'Delhi Online Registration Information System extract', icon: 'award' },
      { id: 'DELHI_BHULEKH', name: 'Delhi Bhulekh (Khasra Girdawari)', description: 'Revenue department khasra & jamabandi register', icon: 'file-text' },
      { id: 'DDA_CONVERSION', name: 'DDA Leasehold to Freehold', description: 'Delhi Development Authority property conversion record', icon: 'home' }
    ]
  },
  {
    code: 'HR',
    name: 'Haryana',
    nativeName: 'हरियाणा',
    portal: 'Jamabandi Haryana / Web-HALRIS',
    documents: [
      { id: 'JAMABANDI_NAKAL', name: 'Nakal Jamabandi (RoR)', description: 'Haryana Web-HALRIS official land ownership title', icon: 'file-text' },
      { id: 'INTEQAL', name: 'Mutation (Inteqal) Status', description: 'Succession & deed mutation sanction orders', icon: 'git-commit' },
      { id: 'DEED_REGISTRATION', name: 'Registered Deed Extract', description: 'Sub-Registrar certified deed copy & encumbrance', icon: 'award' }
    ]
  },
  {
    code: 'PB',
    name: 'Punjab',
    nativeName: 'ਪੰਜਾਬ',
    portal: 'PLRS Jamabandi / NGDRS Punjab',
    documents: [
      { id: 'FARD_JAMABANDI', name: 'Fard Jamabandi Nakal', description: 'Punjab Land Records Society (PLRS) official RoR', icon: 'file-text' },
      { id: 'ROZNAMCHA', name: 'Roznamcha Waqiati', description: 'Daily revenue diary entries by Patwari', icon: 'file' },
      { id: 'MUTATION_SANCTION', name: 'Mutation Sanction Order', description: 'Tehsil revenue court title approval order', icon: 'git-commit' }
    ]
  },
  {
    code: 'RJ',
    name: 'Rajasthan',
    nativeName: 'राजस्थान',
    portal: 'Apna Khata (e-Dharti) / e-Panjiyan',
    documents: [
      { id: 'APNA_KHATA', name: 'Jamabandi Nakal (e-Dharti)', description: 'Official Rajasthan Apna Khata land rights certificate', icon: 'file-text' },
      { id: 'NAMANTARAN', name: 'Namantaran (Mutation) Copy', description: 'Tehsil mutation entry & transfer of rights', icon: 'git-commit' },
      { id: 'E_PANJIYAN', name: 'e-Panjiyan Registered Deed', description: 'Registration & stamps department registry search', icon: 'award' }
    ]
  },
  {
    code: 'UK',
    name: 'Uttarakhand',
    nativeName: 'उत्तराखंड',
    portal: 'Devbhoomi Uttarakhand',
    documents: [
      { id: 'DEV_BHULEKH', name: 'Devbhoomi RoR Khatoni 1-A', description: 'Uttarakhand digital revenue register', icon: 'file-text' }
    ]
  },
  {
    code: 'HP',
    name: 'Himachal Pradesh',
    nativeName: 'हिमाचल प्रदेश',
    portal: 'Himbhoomi Portal',
    documents: [
      { id: 'HIM_JAMABANDI', name: 'Himbhoomi Jamabandi Nakal', description: 'Himachal Pradesh digital RoR & Shajra Nasab', icon: 'file-text' }
    ]
  },
  {
    code: 'JK',
    name: 'Jammu & Kashmir',
    nativeName: 'جموں و کشمیر',
    portal: 'LRIS (Aapki Zameen Aapki Nigrani)',
    documents: [
      { id: 'JK_JAMABANDI', name: 'LRIS Digital Jamabandi', description: 'Aapki Zameen Aapki Nigrani revenue title record', icon: 'file-text' }
    ]
  },

  // --- Southern India ---
  {
    code: 'KA',
    name: 'Karnataka',
    nativeName: 'ಕರ್ನಾಟಕ',
    portal: 'Bhoomi / e-Swathu / Kaveri',
    documents: [
      { id: 'RTC', name: 'RTC / Pahani (Bhoomi)', description: 'Record of Rights, Tenancy & Crop Information', icon: 'file-text' },
      { id: 'FORM_9_11', name: 'e-Swathu Form 9 & 11', description: 'Gram Panchayat registered property title deed', icon: 'home' },
      { id: 'KHATA', name: 'BBMP Khata / e-Aasthi', description: 'Bengaluru city property tax and ownership register', icon: 'building' }
    ]
  },
  {
    code: 'TG',
    name: 'Telangana',
    nativeName: 'తెలంగాణ',
    portal: 'Dharani / IGRS Telangana',
    documents: [
      { id: 'EC', name: 'Encumbrance Certificate (EC)', description: 'Search all registered transactions, mortgages & liabilities', icon: 'shield-check' },
      { id: 'PASSBOOK', name: 'Pattadar Passbook', description: 'Official agricultural land ownership title deed extract', icon: 'book-open' },
      { id: 'PTIN', name: 'CDMA Property Tax (PTIN)', description: 'Urban property tax dues, assessment & boundary lookup', icon: 'home' }
    ]
  },
  {
    code: 'AP',
    name: 'Andhra Pradesh',
    nativeName: 'ఆంధ్ర ప్రదేశ್',
    portal: 'Meebhoomi / AP IGRS',
    documents: [
      { id: 'ADANGAL', name: 'Adangal / Pahani', description: 'Village land record extract & cultivation details', icon: 'file-text' },
      { id: 'ROR_1B', name: '1-B ROR Record', description: 'Official record of rights showing surveyed holdings', icon: 'check-square' },
      { id: 'EC', name: 'Encumbrance Certificate', description: 'Search registered deeds across Sub-Registrar Offices', icon: 'shield-check' }
    ]
  },
  {
    code: 'TN',
    name: 'Tamil Nadu',
    nativeName: 'தமிழ்நாடு',
    portal: 'e-Services / TN Nilamagal',
    documents: [
      { id: 'PATTA_CHITTA', name: 'Patta & Chitta', description: 'Land revenue record & land ownership certificate', icon: 'file-text' },
      { id: 'TSLR', name: 'TSLR Extract', description: 'Town Survey Land Register for municipal areas', icon: 'map' }
    ]
  },
  {
    code: 'KL',
    name: 'Kerala',
    nativeName: 'കേരളം',
    portal: 'e-Rekha / PEARL',
    documents: [
      { id: 'FMB_SKETCH', name: 'e-Rekha FMB Sketch', description: 'Kerala Survey Field Measurement Book boundary', icon: 'map' },
      { id: 'SETTLEMENT_ROR', name: 'Settlement Register (RoR)', description: 'Thandaper number & pattadar ownership details', icon: 'file-text' },
      { id: 'KL_EC', name: 'PEARL Encumbrance Certificate', description: 'Sub-Registrar registered deed liabilities', icon: 'shield-check' }
    ]
  },

  // --- Eastern & Central India ---
  {
    code: 'WB',
    name: 'West Bengal',
    nativeName: 'পশ্চিমবঙ্গ',
    portal: 'Banglarbhumi Portal',
    documents: [
      { id: 'ROR_KHATIAN', name: 'Banglarbhumi ROR (Khatian)', description: 'West Bengal land reforms official ownership title', icon: 'file-text' },
      { id: 'PLOT_INFO', name: 'Plot Information (Dag No.)', description: 'Classification, share ratio & mapped area', icon: 'map' },
      { id: 'WARISHAN', name: 'Warishan & Mutation Application', description: 'Legal heirship succession certificate & mutation', icon: 'git-commit' }
    ]
  },
  {
    code: 'BR',
    name: 'Bihar',
    nativeName: 'बिहार',
    portal: 'Bihar Bhumi / Bhumi Jankari',
    documents: [
      { id: 'DAKHIL_KHARIJ', name: 'Dakhil Kharij (Mutation) Status', description: 'Bihar Bhumi online mutation status & rejection/order', icon: 'git-commit' },
      { id: 'JAMABANDI_PANJI', name: 'Jamabandi Panji Part-II', description: 'Khesra details, holding number & lagan dues', icon: 'file-text' },
      { id: 'LPC_CERTIFICATE', name: 'Land Possession Certificate (LPC)', description: 'Official ownership possession certificate', icon: 'award' }
    ]
  },
  {
    code: 'OD',
    name: 'Odisha',
    nativeName: 'ଓଡ଼ିଶା',
    portal: 'Bhulekh Odisha / e-Registration',
    documents: [
      { id: 'BHULEKH_ODISHA', name: 'Bhulekh Odisha RoR', description: 'Revenue record of rights with tenant & plot details', icon: 'file-text' },
      { id: 'BHU_NAKSHA_OD', name: 'Bhu-Naksha Cadastral Map', description: 'High precision satellite & boundary polygon', icon: 'map' }
    ]
  },
  {
    code: 'JH',
    name: 'Jharkhand',
    nativeName: 'झारखंड',
    portal: 'Jharbhoomi / NGDRS Jharkhand',
    documents: [
      { id: 'KHATIAN_JH', name: 'Jharbhoomi Khatian Extract', description: 'Jharkhand official land survey record', icon: 'file-text' },
      { id: 'REGISTER_II', name: 'Register-II Dakhil Kharij', description: 'Tenant account ledger & mutation diary', icon: 'file' }
    ]
  },
  {
    code: 'MP',
    name: 'Madhya Pradesh',
    nativeName: 'मध्य प्रदेश',
    portal: 'MP Bhulekh / MPIGRS',
    documents: [
      { id: 'KHASRA_P2', name: 'Khasra (Form P-II)', description: 'Madhya Pradesh Bhulekh land survey & area details', icon: 'file-text' },
      { id: 'KHATAUNI_B1', name: 'B-1 Khatauni Kishtbandi', description: 'Consolidated land holding & revenue tax assessment', icon: 'file-text' },
      { id: 'MP_BHU_NAKSHA', name: 'Bhu-Naksha Cadastral Map', description: 'Digital village parcel map & geometry', icon: 'map' }
    ]
  },
  {
    code: 'CG',
    name: 'Chhattisgarh',
    nativeName: 'छत्तीसगढ़',
    portal: 'Bhuiyan CG Portal',
    documents: [
      { id: 'BHUIYAN_B1', name: 'B-1 Khasra Kishtbandi', description: 'Chhattisgarh Bhuiyan certified land record', icon: 'file-text' },
      { id: 'BHUIYAN_P2', name: 'P-II Khasra Panchshala', description: '5-year crop cultivation and rights ledger', icon: 'file-text' }
    ]
  },
  {
    code: 'AS',
    name: 'Assam',
    nativeName: 'অসম',
    portal: 'Dharitree / ILRMS Assam',
    documents: [
      { id: 'DHARITREE_JAMABANDI', name: 'Dharitree Jamabandi Copy', description: 'Assam ILRMS integrated land record management', icon: 'file-text' }
    ]
  }
];



export interface AutocompleteItem {
  id: string;
  type: 'address' | 'survey' | 'owner' | 'deed' | 'door';
  categoryBadge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  state: string;
  stateName: string;
  district: string;
  taluka: string;
  village: string;
  surveyNo?: string;
  ownerName?: string;
  deedNo?: string;
  doorNo?: string;
  recommendedDoc: string;
  docTitle: string;
  recordId?: string;
  keywords: string[];
}

export const AUTOCOMPLETE_DATABASE: AutocompleteItem[] = [
  // ==========================================
  // 1. NATIONAL CAPITAL REGION & NORTH INDIA
  // ==========================================
  {
    id: 'prop-112-panchsheel-sahibabad',
    type: 'door',
    categoryBadge: 'Urban Plot / SRO Sahibabad',
    badgeColor: '#10B981',
    title: 'House / Plot 112, Panchsheel Park, Sahibabad',
    subtitle: 'SRO Sahibabad • Ghaziabad Nagar Nigam Ward 34 • Uttar Pradesh (PIN 201005)',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Ghaziabad',
    taluka: 'Sahibabad',
    village: 'Panchsheel Park',
    doorNo: '112',
    surveyNo: 'Plot 112 (Khasra 312)',
    recommendedDoc: 'REGISTRY_DEED',
    docTitle: 'IGRSUP Sub-Registrar Registered Deed & Assessment',
    recordId: 'rec-up-ghaziabad-panchsheel-112',
    keywords: [
      '112', '112 panchessl', '112 panchessl park', '112 panchsheel', '112 panchsheel park',
      'panchessl park sahibabad ghaziabad', 'panchsheel park sahibabad ghaziabad',
      'panchsheel park', 'panchessl park', 'panchsheel', 'panchessl',
      'sahibabad', 'ghaziabad', 'gha', '201005', 'sro sahibabad', 'nagar nigam',
      'house 112', 'plot 112', 'ward 34'
    ]
  },
  {
    id: 'addr-panchsheel-park-sahibabad',
    type: 'address',
    categoryBadge: 'Address / Locality',
    badgeColor: '#10B981',
    title: 'Panchsheel Park, Sahibabad, Ghaziabad',
    subtitle: 'Sahibabad Sub-District • Ghaziabad, Uttar Pradesh (PIN 201005)',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Ghaziabad',
    taluka: 'Sahibabad',
    village: 'Panchsheel Park',
    surveyNo: 'Plot 112',
    recommendedDoc: 'REGISTRY_DEED',
    docTitle: 'IGRSUP Registered Deed & GNN Tax',
    keywords: ['panchsheel park', 'panchessl park', 'panchsheel', 'sahibabad', 'ghaziabad', 'gha', '201005', 'gt road', 'mohan nagar', 'sro sahibabad']
  },
  {
    id: 'addr-indirapuram-ghaziabad',
    type: 'address',
    categoryBadge: 'Address / Sub-City',
    badgeColor: '#10B981',
    title: 'Indirapuram & Vaishali, Ghaziabad',
    subtitle: 'Ghaziabad Tehsil • Ghaziabad, Uttar Pradesh (PIN 201014)',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Ghaziabad',
    taluka: 'Ghaziabad',
    village: 'Indirapuram',
    surveyNo: 'Khasra 108',
    recommendedDoc: 'REGISTRY_DEED',
    docTitle: 'IGRSUP Deed & Ghaziabad Nagar Nigam Tax',
    keywords: ['indirapuram', 'vaishali', 'vasundhara', 'ghaziabad', 'gha', 'up', '201014']
  },
  {
    id: 'addr-noida-sec62',
    type: 'address',
    categoryBadge: 'Address / IT Corridor',
    badgeColor: '#10B981',
    title: 'Noida Sector 62 & Electronic City',
    subtitle: 'Noida Tehsil • Gautam Buddha Nagar, Uttar Pradesh (PIN 201301)',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar (Noida)',
    taluka: 'Noida',
    village: 'Sector 62',
    surveyNo: 'Khasra 492/1',
    recommendedDoc: 'KHATAUNI',
    docTitle: 'Bhulekh Khatauni & IGRS Deed',
    keywords: ['noida', 'sector 62', 'gautam buddha nagar', 'up', 'bhulekh up', 'electronic city', '201301', 'noida expressway']
  },
  {
    id: 'addr-greater-noida-parichowk',
    type: 'address',
    categoryBadge: 'Address / Township',
    badgeColor: '#10B981',
    title: 'Greater Noida Pari Chowk & Tech Zone',
    subtitle: 'Dadri Tehsil • Gautam Buddha Nagar, Uttar Pradesh (PIN 201308)',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar (Noida)',
    taluka: 'Dadri',
    village: 'Greater Noida Pari Chowk',
    surveyNo: 'Khasra 210',
    recommendedDoc: 'REGISTRY_DEED',
    docTitle: 'IGRSUP Registered Registry Copy',
    keywords: ['greater noida', 'pari chowk', 'tech zone', 'dadri', 'jewar', 'yamuna expressway', '201308']
  },
  {
    id: 'addr-lucknow-gomtinagar',
    type: 'address',
    categoryBadge: 'Address / Sub-City',
    badgeColor: '#10B981',
    title: 'Gomti Nagar & Vibhuti Khand, Lucknow',
    subtitle: 'Lucknow Sadar Tehsil • Lucknow, Uttar Pradesh (PIN 226010)',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Lucknow',
    taluka: 'Lucknow Sadar',
    village: 'Gomti Nagar',
    surveyNo: 'Gata 882/1',
    recommendedDoc: 'KHATAUNI',
    docTitle: 'Bhulekh UP 16-Digit Gata Record',
    keywords: ['lucknow', 'gomti nagar', 'vibhuti khand', 'hazratganj', 'shaheed path', 'bhulekh', '226010']
  },
  {
    id: 'addr-delhi-connaughtplace',
    type: 'address',
    categoryBadge: 'Address / Commercial CBD',
    badgeColor: '#2563EB',
    title: 'Connaught Place & Barakhamba Road',
    subtitle: 'Chanakyapuri Tehsil • New Delhi (PIN 110001)',
    state: 'DL',
    stateName: 'Delhi',
    district: 'New Delhi',
    taluka: 'Connaught Place',
    village: 'Barakhamba Road',
    surveyNo: 'Plot 14-B',
    recommendedDoc: 'DORIS_REGISTRY',
    docTitle: 'DORIS Registered Deed & L&DO Extract',
    keywords: ['delhi', 'connaught place', 'cp', 'barakhamba', 'new delhi', 'doris', 'dda', '110001']
  },
  {
    id: 'addr-delhi-saket',
    type: 'address',
    categoryBadge: 'Address / Locality',
    badgeColor: '#2563EB',
    title: 'Saket & Hauz Khas, South Delhi',
    subtitle: 'Hauz Khas Tehsil • South Delhi (PIN 110017)',
    state: 'DL',
    stateName: 'Delhi',
    district: 'South Delhi',
    taluka: 'Hauz Khas',
    village: 'Saket',
    surveyNo: 'Khasra 104',
    recommendedDoc: 'DELHI_BHULEKH',
    docTitle: 'Delhi Bhulekh Khasra Girdawari',
    keywords: ['saket', 'hauz khas', 'south delhi', 'mehrauli', 'delhi bhulekh', '110017']
  },
  {
    id: 'addr-delhi-dwarka',
    type: 'address',
    categoryBadge: 'Address / Sub-City',
    badgeColor: '#2563EB',
    title: 'Dwarka Sector 12 & 21 Sub-City',
    subtitle: 'South West Delhi (PIN 110075)',
    state: 'DL',
    stateName: 'Delhi',
    district: 'South West Delhi (Dwarka)',
    taluka: 'Dwarka',
    village: 'Sector 12',
    surveyNo: 'Pocket 4 Plot 22',
    recommendedDoc: 'DDA_CONVERSION',
    docTitle: 'DDA Freehold Allotment Register',
    keywords: ['dwarka', 'south west delhi', 'sub-city', 'sector 12', 'sector 21', 'dda', '110075']
  },
  {
    id: 'addr-gurugram-cybercity',
    type: 'address',
    categoryBadge: 'Address / Financial Hub',
    badgeColor: '#8B5CF6',
    title: 'Cyber City & DLF Phase 1-5, Gurugram',
    subtitle: 'Wazirabad Tehsil • Gurugram, Haryana (PIN 122002)',
    state: 'HR',
    stateName: 'Haryana',
    district: 'Gurugram',
    taluka: 'Wazirabad',
    village: 'Cyber City',
    surveyNo: 'Mustil 42 Killa 12',
    recommendedDoc: 'JAMABANDI_NAKAL',
    docTitle: 'Jamabandi Haryana Nakal & Inteqal',
    keywords: ['gurugram', 'gurgaon', 'cyber city', 'dlf', 'golf course road', 'wazirabad', 'jamabandi', '122002']
  },
  {
    id: 'addr-gurugram-sohnaroad',
    type: 'address',
    categoryBadge: 'Address / Growth Corridor',
    badgeColor: '#8B5CF6',
    title: 'Sohna Road & Golf Course Ext, Gurugram',
    subtitle: 'Badshahpur Tehsil • Gurugram, Haryana (PIN 122018)',
    state: 'HR',
    stateName: 'Haryana',
    district: 'Gurugram',
    taluka: 'Badshahpur',
    village: 'Sohna Road',
    surveyNo: 'Mustil 88 Killa 5',
    recommendedDoc: 'JAMABANDI_NAKAL',
    docTitle: 'Jamabandi RoR & Deed Search',
    keywords: ['sohna road', 'golf course ext', 'badshahpur', 'gurugram', 'haryana', '122018']
  },
  {
    id: 'addr-faridabad-sec15',
    type: 'address',
    categoryBadge: 'Address / Locality',
    badgeColor: '#8B5CF6',
    title: 'Faridabad Sector 14 & 15',
    subtitle: 'Faridabad Tehsil • Faridabad, Haryana (PIN 121007)',
    state: 'HR',
    stateName: 'Haryana',
    district: 'Faridabad',
    taluka: 'Faridabad',
    village: 'Sector 15',
    surveyNo: 'Plot 402 Sector 15',
    recommendedDoc: 'DEED_REGISTRATION',
    docTitle: 'Sub-Registrar Deed & Jamabandi',
    keywords: ['faridabad', 'sector 15', 'sector 14', 'haryana', '121007', 'mathura road']
  },
  {
    id: 'addr-chandigarh-sec17',
    type: 'address',
    categoryBadge: 'Address / Capital Hub',
    badgeColor: '#F59E0B',
    title: 'Sector 17 & City Centre, Chandigarh',
    subtitle: 'Chandigarh Union Territory (PIN 160017)',
    state: 'PB',
    stateName: 'Punjab',
    district: 'SAS Nagar (Mohali)',
    taluka: 'Mohali',
    village: 'Sector 70',
    surveyNo: 'SCF 28 Sector 17',
    recommendedDoc: 'FARD_JAMABANDI',
    docTitle: 'Estate Office Registry & PLRS RoR',
    keywords: ['chandigarh', 'sector 17', 'city centre', 'mohali', 'tricity', '160017']
  },
  {
    id: 'addr-mohali-itcity',
    type: 'address',
    categoryBadge: 'Address / IT Hub',
    badgeColor: '#F59E0B',
    title: 'Mohali IT City & Sector 82',
    subtitle: 'SAS Nagar Tehsil • Mohali, Punjab (PIN 140308)',
    state: 'PB',
    stateName: 'Punjab',
    district: 'SAS Nagar (Mohali)',
    taluka: 'Mohali',
    village: 'Sector 82 IT City',
    surveyNo: 'Khasra 412/3',
    recommendedDoc: 'FARD_JAMABANDI',
    docTitle: 'PLRS Fard Jamabandi Nakal',
    keywords: ['mohali', 'it city', 'sector 82', 'sas nagar', 'punjab', 'plrs', '140308']
  },
  {
    id: 'addr-jaipur-malviyanagar',
    type: 'address',
    categoryBadge: 'Address / Prime Residential',
    badgeColor: '#F59E0B',
    title: 'Malviya Nagar & Jagatpura, Jaipur',
    subtitle: 'Sanganer Tehsil • Jaipur, Rajasthan (PIN 302017)',
    state: 'RJ',
    stateName: 'Rajasthan',
    district: 'Jaipur',
    taluka: 'Sanganer',
    village: 'Malviya Nagar',
    surveyNo: 'Khasra 1102/4',
    recommendedDoc: 'APNA_KHATA',
    docTitle: 'Apna Khata (e-Dharti) Jamabandi Nakal',
    keywords: ['jaipur', 'malviya nagar', 'jagatpura', 'sanganer', 'rajasthan', 'apna khata', '302017']
  },
  {
    id: 'addr-jaipur-mansarovar',
    type: 'address',
    categoryBadge: 'Address / Mega Township',
    badgeColor: '#F59E0B',
    title: 'Mansarovar & Vaishali Nagar, Jaipur',
    subtitle: 'Jaipur Sadar Tehsil • Jaipur, Rajasthan (PIN 302020)',
    state: 'RJ',
    stateName: 'Rajasthan',
    district: 'Jaipur',
    taluka: 'Jaipur Sadar',
    village: 'Mansarovar',
    surveyNo: 'Khasra 512',
    recommendedDoc: 'NAMANTARAN',
    docTitle: 'Tehsil Namantaran (Mutation) Copy',
    keywords: ['mansarovar', 'vaishali nagar', 'jaipur', 'rajasthan', '302020']
  },
  {
    id: 'addr-dehradun-rajpur',
    type: 'address',
    categoryBadge: 'Address / Hill Corridor',
    badgeColor: '#10B981',
    title: 'Rajpur Road & Jakhan, Dehradun',
    subtitle: 'Dehradun Sadar • Dehradun, Uttarakhand (PIN 248001)',
    state: 'UK',
    stateName: 'Uttarakhand',
    district: 'Dehradun',
    taluka: 'Dehradun',
    village: 'Rajpur Road',
    surveyNo: 'Khasra 84',
    recommendedDoc: 'DEV_BHULEKH',
    docTitle: 'Devbhoomi RoR Khatoni 1-A',
    keywords: ['dehradun', 'rajpur road', 'jakhan', 'uttarakhand', 'devbhoomi', '248001']
  },
  {
    id: 'addr-shimla-mallroad',
    type: 'address',
    categoryBadge: 'Address / Heritage Capital',
    badgeColor: '#8B5CF6',
    title: 'Mall Road & Sanjauli, Shimla',
    subtitle: 'Shimla Urban Tehsil • Himachal Pradesh (PIN 171001)',
    state: 'HP',
    stateName: 'Himachal Pradesh',
    district: 'Shimla',
    taluka: 'Shimla',
    village: 'Mall Road',
    surveyNo: 'Khasra 29/1',
    recommendedDoc: 'HIM_JAMABANDI',
    docTitle: 'Himbhoomi Jamabandi & Shajra',
    keywords: ['shimla', 'mall road', 'sanjauli', 'himachal', 'himbhoomi', '171001']
  },
  {
    id: 'addr-srinagar-lalchowk',
    type: 'address',
    categoryBadge: 'Address / Capital Hub',
    badgeColor: '#06B6D4',
    title: 'Lal Chowk & Rajbagh, Srinagar',
    subtitle: 'Srinagar South Tehsil • Jammu & Kashmir (PIN 190001)',
    state: 'JK',
    stateName: 'Jammu & Kashmir',
    district: 'Srinagar',
    taluka: 'Srinagar',
    village: 'Lal Chowk',
    surveyNo: 'Khasra 140/3',
    recommendedDoc: 'JK_JAMABANDI',
    docTitle: 'LRIS Digital Jamabandi & Girdawari',
    keywords: ['srinagar', 'lal chowk', 'rajbagh', 'jammu kashmir', 'lris', '190001']
  },

  // ==========================================
  // 2. WESTERN INDIA (MAHARASHTRA & GUJARAT & GOA)
  // ==========================================
  {
    id: 'addr-wagholi-pune',
    type: 'address',
    categoryBadge: 'Address / Locality',
    badgeColor: '#2563EB',
    title: 'Wagholi, Haveli, Pune',
    subtitle: 'Taluka: Haveli • Dist: Pune, Maharashtra (PIN 412207)',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNo: '142/2A',
    recommendedDoc: '7_12',
    docTitle: '7/12 & 8A Extract',
    keywords: ['wagholi', 'pune', 'haveli', 'mahabhulekh', 'aapleabhilekh', 'satbara', 'nagar road', '412207']
  },
  {
    id: 'addr-hinjawadi-pune',
    type: 'address',
    categoryBadge: 'Address / IT Park',
    badgeColor: '#2563EB',
    title: 'Hinjawadi Phase 1 & 2, Mulshi, Pune',
    subtitle: 'Taluka: Mulshi • Dist: Pune, Maharashtra (Rajiv Gandhi Infotech Park)',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Mulshi',
    village: 'Hinjawadi',
    surveyNo: '88/1',
    recommendedDoc: '7_12',
    docTitle: '7/12 & Non-Agri NA Order',
    keywords: ['hinjawadi', 'hinjewadi', 'mulshi', 'pune', 'infotech', 'it park', 'maan', 'marunji']
  },
  {
    id: 'addr-kharadi-pune',
    type: 'address',
    categoryBadge: 'Address / Locality',
    badgeColor: '#2563EB',
    title: 'Kharadi, EON Free Zone, Pune',
    subtitle: 'Taluka: Haveli • Dist: Pune, Maharashtra (PIN 411014)',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Kharadi',
    surveyNo: '64/2',
    recommendedDoc: 'INDEX_2',
    docTitle: 'IGR Index-II Deed',
    keywords: ['kharadi', 'eon', 'free zone', 'haveli', 'pune', 'world trade center', '411014']
  },
  {
    id: 'addr-hadapsar-pune',
    type: 'address',
    categoryBadge: 'Address / Society',
    badgeColor: '#2563EB',
    title: 'Amanora Park Town, Hadapsar, Pune',
    subtitle: 'Taluka: Haveli • Dist: Pune, Maharashtra (Township Project)',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Hadapsar',
    doorNo: 'Flat 402, Tower 14',
    recommendedDoc: 'INDEX_2',
    docTitle: 'Index-II Registered Deed',
    keywords: ['hadapsar', 'amanora', 'park town', 'magarpatta', 'haveli', 'pune', 'solapur road']
  },
  {
    id: 'addr-bandra-mumbai',
    type: 'address',
    categoryBadge: 'Address / Urban Cadastre',
    badgeColor: '#2563EB',
    title: 'Bandra West & BKC, Mumbai Suburban',
    subtitle: 'Bandra Taluka • Mumbai Suburban, Maharashtra (CTS Urban Property Card)',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Mumbai Suburban',
    taluka: 'Bandra',
    village: 'Bandra West',
    surveyNo: 'CTS-1042',
    recommendedDoc: 'CTS_MAP',
    docTitle: 'CTS Property Card & BMC Tax',
    keywords: ['bandra', 'west', 'bkc', 'kurla', 'mumbai', 'suburban', 'cts', 'property card']
  },
  {
    id: 'addr-thane-west',
    type: 'address',
    categoryBadge: 'Address / Locality',
    badgeColor: '#2563EB',
    title: 'Ghodbunder Road, Thane West',
    subtitle: 'Thane Taluka • Dist: Thane, Maharashtra',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Thane',
    taluka: 'Thane',
    village: 'Majiwada',
    surveyNo: '112/3',
    recommendedDoc: '7_12',
    docTitle: '7/12 Satbara & Mutation',
    keywords: ['thane', 'ghodbunder', 'majiwada', 'kasarvadavali', 'mumbai mmr']
  },
  {
    id: 'addr-sanand-ahmedabad',
    type: 'address',
    categoryBadge: 'Address / Industrial Hub',
    badgeColor: '#F59E0B',
    title: 'Sanand GIDC & Bopal, Ahmedabad',
    subtitle: 'Daskroi Taluka • Ahmedabad, Gujarat (AnyRoR Land Register)',
    state: 'GJ',
    stateName: 'Gujarat',
    district: 'Ahmedabad',
    taluka: 'Daskroi',
    village: 'Bopal',
    surveyNo: '18/4',
    recommendedDoc: '7_12',
    docTitle: 'AnyRoR 7/12 & Village Form 6',
    keywords: ['sanand', 'ahmedabad', 'gidc', 'anyror', 'gujarat', 'bopal', 'sg highway', '380058']
  },
  {
    id: 'addr-giftcity-gandhinagar',
    type: 'address',
    categoryBadge: 'Address / Global Finance Hub',
    badgeColor: '#F59E0B',
    title: 'GIFT City & Infocity, Gandhinagar',
    subtitle: 'Gandhinagar Taluka • Gandhinagar, Gujarat (PIN 382355)',
    state: 'GJ',
    stateName: 'Gujarat',
    district: 'Gandhinagar',
    taluka: 'Gandhinagar',
    village: 'Gandhinagar',
    surveyNo: 'Block 24',
    recommendedDoc: '7_12',
    docTitle: 'AnyRoR Property Card & e-Milkat',
    keywords: ['gift city', 'gandhinagar', 'infocity', 'gujarat', 'anyror', '382355']
  },
  {
    id: 'addr-panaji-goa',
    type: 'address',
    categoryBadge: 'Address / Coastal Capital',
    badgeColor: '#2563EB',
    title: 'Panaji & Miramar Coastal Belt, Goa',
    subtitle: 'Tiswadi Taluka • North Goa (PIN 403001)',
    state: 'GA',
    stateName: 'Goa',
    district: 'North Goa',
    taluka: 'Tiswadi (Panaji)',
    village: 'Panaji',
    surveyNo: 'Chalta 18 P.T. Sheet 42',
    recommendedDoc: 'FORM_1_14',
    docTitle: 'Directorate of Land Records Form I & XIV',
    keywords: ['goa', 'panaji', 'miramar', 'tiswadi', 'north goa', 'form 1 14', '403001']
  },

  // ==========================================
  // 3. SOUTHERN INDIA (KARNATAKA, TELANGANA, AP, TN, KL)
  // ==========================================
  {
    id: 'addr-whitefield-bengaluru',
    type: 'address',
    categoryBadge: 'Address / IT Corridor',
    badgeColor: '#EC4899',
    title: 'Whitefield & ITPL, Bengaluru East',
    subtitle: 'Bengaluru East Taluka • Bengaluru Urban, Karnataka (PIN 560066)',
    state: 'KA',
    stateName: 'Karnataka',
    district: 'Bengaluru Urban',
    taluka: 'Bengaluru East',
    village: 'Whitefield',
    surveyNo: '59/B',
    recommendedDoc: 'RTC',
    docTitle: 'Bhoomi RTC Pahani & e-Khata',
    keywords: ['whitefield', 'itpl', 'bengaluru east', 'bangalore', 'bhoomi', 'rtc', 'pahani', '560066']
  },
  {
    id: 'addr-electronic-city-bengaluru',
    type: 'address',
    categoryBadge: 'Address / Locality',
    badgeColor: '#EC4899',
    title: 'Electronic City Phase 1, Bengaluru South',
    subtitle: 'Bengaluru South Taluka • Bengaluru Urban, Karnataka (PIN 560100)',
    state: 'KA',
    stateName: 'Karnataka',
    district: 'Bengaluru Urban',
    taluka: 'Bengaluru South',
    village: 'Electronic City',
    surveyNo: '108/2',
    recommendedDoc: 'FORM_9_11',
    docTitle: 'e-Swathu Form 9 & 11',
    keywords: ['electronic city', 'bengaluru south', 'bommasandra', 'hosur road', 'e-swathu', '560100']
  },
  {
    id: 'addr-koramangala-bengaluru',
    type: 'address',
    categoryBadge: 'Address / Startup Hub',
    badgeColor: '#EC4899',
    title: 'Koramangala & HSR Layout, Bengaluru',
    subtitle: 'Bengaluru South Taluka • Bengaluru Urban, Karnataka (PIN 560034)',
    state: 'KA',
    stateName: 'Karnataka',
    district: 'Bengaluru Urban',
    taluka: 'Bengaluru South',
    village: 'Koramangala',
    surveyNo: 'Sy 14/1',
    recommendedDoc: 'KHATA',
    docTitle: 'BBMP e-Aasthi A-Khata Certificate',
    keywords: ['koramangala', 'hsr layout', 'bengaluru', 'bangalore', 'bbmp khata', '560034']
  },
  {
    id: 'addr-gachibowli-hyderabad',
    type: 'address',
    categoryBadge: 'Address / Financial District',
    badgeColor: '#10B981',
    title: 'Gachibowli, Serilingampally, Rangareddy',
    subtitle: 'Serilingampally Mandal • Hyderabad Urban MMR, Telangana (PIN 500032)',
    state: 'TG',
    stateName: 'Telangana',
    district: 'Rangareddy',
    taluka: 'Serilingampally',
    village: 'Gachibowli',
    surveyNo: '204',
    recommendedDoc: 'EC',
    docTitle: 'Dharani Encumbrance Certificate',
    keywords: ['gachibowli', 'hyderabad', 'serilingampally', 'rangareddy', 'financial district', 'dharani', '500032']
  },
  {
    id: 'addr-hitec-city-hyderabad',
    type: 'address',
    categoryBadge: 'Address / Cyberabad Hub',
    badgeColor: '#10B981',
    title: 'HITEC City & Madhapur, Hyderabad',
    subtitle: 'Serilingampally Mandal • Hyderabad, Telangana (PIN 500081)',
    state: 'TG',
    stateName: 'Telangana',
    district: 'Rangareddy',
    taluka: 'Serilingampally',
    village: 'Madhapur',
    surveyNo: 'Sy 64',
    recommendedDoc: 'PASSBOOK',
    docTitle: 'Pattadar Passbook & Deed Search',
    keywords: ['hitec city', 'madhapur', 'cyberabad', 'kondapur', 'hyderabad', '500081']
  },
  {
    id: 'addr-kokapet-neopolis',
    type: 'address',
    categoryBadge: 'Address / Neopolis SEZ',
    badgeColor: '#10B981',
    title: 'Kokapet Neopolis & Gandipet',
    subtitle: 'Gandipet Mandal • Rangareddy, Telangana (PIN 500075)',
    state: 'TG',
    stateName: 'Telangana',
    district: 'Rangareddy',
    taluka: 'Gandipet',
    village: 'Kokapet',
    surveyNo: 'Sy 239/P',
    recommendedDoc: 'EC',
    docTitle: 'Dharani Registry & Hydra Audit',
    keywords: ['kokapet', 'neopolis', 'gandipet', 'outer ring road', 'hyderabad', '500075']
  },
  {
    id: 'addr-gajuwaka-vizag',
    type: 'address',
    categoryBadge: 'Address / Port City',
    badgeColor: '#06B6D4',
    title: 'Gajuwaka Industrial Area, Visakhapatnam',
    subtitle: 'Gajuwaka Mandal • Visakhapatnam, Andhra Pradesh (PIN 530026)',
    state: 'AP',
    stateName: 'Andhra Pradesh',
    district: 'Visakhapatnam',
    taluka: 'Gajuwaka',
    village: 'Gajuwaka',
    surveyNo: '45/1B',
    recommendedDoc: 'ADANGAL',
    docTitle: 'Meebhoomi Adangal & 1-B ROR',
    keywords: ['gajuwaka', 'visakhapatnam', 'vizag', 'meebhoomi', 'andhra', 'steel plant', '530026']
  },
  {
    id: 'addr-omr-chennai',
    type: 'address',
    categoryBadge: 'Address / IT Corridor',
    badgeColor: '#8B5CF6',
    title: 'Old Mahabalipuram Road (OMR), Sholinganallur',
    subtitle: 'Sholinganallur Taluka • Chennai District, Tamil Nadu (PIN 600119)',
    state: 'TN',
    stateName: 'Tamil Nadu',
    district: 'Chennai',
    taluka: 'Sholinganallur',
    village: 'Sholinganallur',
    surveyNo: '281/4',
    recommendedDoc: 'PATTA_CHITTA',
    docTitle: 'e-Services Patta / Chitta Extract',
    keywords: ['omr', 'sholinganallur', 'chennai', 'tamil nadu', 'patta', 'chitta', 'tslr', '600119']
  },
  {
    id: 'addr-kochi-infopark',
    type: 'address',
    categoryBadge: 'Address / IT SmartCity',
    badgeColor: '#06B6D4',
    title: 'Kakkanad InfoPark & SmartCity, Kochi',
    subtitle: 'Kunnathunad Taluka • Ernakulam, Kerala (PIN 682030)',
    state: 'KL',
    stateName: 'Kerala',
    district: 'Ernakulam (Kochi)',
    taluka: 'Kunnathunad (Kakkanad)',
    village: 'Kakkanad',
    surveyNo: 'Resurvey 342/2',
    recommendedDoc: 'FMB_SKETCH',
    docTitle: 'e-Rekha FMB Sketch & Settlement RoR',
    keywords: ['kochi', 'cochin', 'kakkanad', 'infopark', 'smartcity', 'ernakulam', 'kerala', 'e-rekha', '682030']
  },

  // ==========================================
  // 4. EASTERN & CENTRAL INDIA (WB, BIHAR, ODISHA, MP, JH, CG, ASSAM)
  // ==========================================
  {
    id: 'addr-kolkata-saltlake',
    type: 'address',
    categoryBadge: 'Address / Tech City',
    badgeColor: '#2563EB',
    title: 'Salt Lake Sector V IT Hub, Kolkata',
    subtitle: 'Bidhan Nagar • North 24 Parganas, West Bengal (PIN 700091)',
    state: 'WB',
    stateName: 'West Bengal',
    district: 'North 24 Parganas',
    taluka: 'Bidhan Nagar (Salt Lake)',
    village: 'Sector V',
    surveyNo: 'Dag 108/P',
    recommendedDoc: 'ROR_KHATIAN',
    docTitle: 'Banglarbhumi ROR Khatian & Plot Info',
    keywords: ['kolkata', 'salt lake', 'sector v', 'new town', 'rajarhat', 'banglarbhumi', '700091']
  },
  {
    id: 'addr-kolkata-newtown',
    type: 'address',
    categoryBadge: 'Address / Planned City',
    badgeColor: '#2563EB',
    title: 'New Town Action Area 1 & 2, Rajarhat',
    subtitle: 'Rajarhat Tehsil • North 24 Parganas, West Bengal (PIN 700156)',
    state: 'WB',
    stateName: 'West Bengal',
    district: 'North 24 Parganas',
    taluka: 'Rajarhat',
    village: 'New Town Action Area 1',
    surveyNo: 'Dag 450',
    recommendedDoc: 'PLOT_INFO',
    docTitle: 'Banglarbhumi Dag Plot Classification',
    keywords: ['new town', 'rajarhat', 'action area', 'kolkata', 'west bengal', '700156']
  },
  {
    id: 'addr-patna-baileyroad',
    type: 'address',
    categoryBadge: 'Address / Capital Corridor',
    badgeColor: '#10B981',
    title: 'Bailey Road & Boring Road, Patna',
    subtitle: 'Patna Sadar Tehsil • Patna, Bihar (PIN 800001)',
    state: 'BR',
    stateName: 'Bihar',
    district: 'Patna',
    taluka: 'Patna Sadar',
    village: 'Bailey Road',
    surveyNo: 'Khesra 814',
    recommendedDoc: 'DAKHIL_KHARIJ',
    docTitle: 'Bihar Bhumi Dakhil Kharij & LPC',
    keywords: ['patna', 'bailey road', 'boring road', 'danapur', 'bihar', 'bihar bhumi', '800001']
  },
  {
    id: 'addr-bhubaneswar-patia',
    type: 'address',
    categoryBadge: 'Address / Infocity Corridor',
    badgeColor: '#10B981',
    title: 'Infocity & Patia, Bhubaneswar',
    subtitle: 'Bhubaneswar Tehsil • Khordha, Odisha (PIN 751024)',
    state: 'OD',
    stateName: 'Odisha',
    district: 'Khordha (Bhubaneswar)',
    taluka: 'Bhubaneswar',
    village: 'Patia',
    surveyNo: 'Plot 512/1040',
    recommendedDoc: 'BHULEKH_ODISHA',
    docTitle: 'Bhulekh Odisha RoR & Map',
    keywords: ['bhubaneswar', 'patia', 'infocity', 'khordha', 'odisha', 'bhulekh odisha', '751024']
  },
  {
    id: 'addr-indore-supercorridor',
    type: 'address',
    categoryBadge: 'Address / Growth Corridor',
    badgeColor: '#10B981',
    title: 'Super Corridor & Vijay Nagar, Indore',
    subtitle: 'Indore Sadar • Indore, Madhya Pradesh (PIN 452010)',
    state: 'MP',
    stateName: 'Madhya Pradesh',
    district: 'Indore',
    taluka: 'Indore Sadar',
    village: 'Vijay Nagar',
    surveyNo: 'Khasra 212/2',
    recommendedDoc: 'KHASRA_P2',
    docTitle: 'MP Bhulekh Khasra P-II & B-1',
    keywords: ['indore', 'super corridor', 'vijay nagar', 'palasia', 'mp bhulekh', 'madhya pradesh', '452010']
  },
  {
    id: 'addr-ranchi-morabadi',
    type: 'address',
    categoryBadge: 'Address / Capital City',
    badgeColor: '#8B5CF6',
    title: 'Morabadi & Kanke Road, Ranchi',
    subtitle: 'Ranchi Town Tehsil • Ranchi, Jharkhand (PIN 834008)',
    state: 'JH',
    stateName: 'Jharkhand',
    district: 'Ranchi',
    taluka: 'Ranchi',
    village: 'Morabadi',
    surveyNo: 'Khatian 92',
    recommendedDoc: 'KHATIAN_JH',
    docTitle: 'Jharbhoomi Khatian & Register-II',
    keywords: ['ranchi', 'morabadi', 'kanke road', 'jharkhand', 'jharbhoomi', '834008']
  },
  {
    id: 'addr-raipur-atalnagar',
    type: 'address',
    categoryBadge: 'Address / Smart City',
    badgeColor: '#10B981',
    title: 'Atal Nagar (Naya Raipur) & VIP Road',
    subtitle: 'Raipur Tehsil • Raipur, Chhattisgarh (PIN 492001)',
    state: 'CG',
    stateName: 'Chhattisgarh',
    district: 'Raipur',
    taluka: 'Raipur',
    village: 'Atal Nagar',
    surveyNo: 'Khasra 318',
    recommendedDoc: 'BHUIYAN_B1',
    docTitle: 'Bhuiyan CG B-1 Khatauni & Naksha',
    keywords: ['raipur', 'atal nagar', 'naya raipur', 'vip road', 'chhattisgarh', 'bhuiyan', '492001']
  },
  {
    id: 'addr-guwahati-gsroad',
    type: 'address',
    categoryBadge: 'Address / Commercial Hub',
    badgeColor: '#10B981',
    title: 'GS Road & Dispur Capital Complex, Guwahati',
    subtitle: 'Kamrup Metro Tehsil • Kamrup, Assam (PIN 781005)',
    state: 'AS',
    stateName: 'Assam',
    district: 'Kamrup Metropolitan (Guwahati)',
    taluka: 'Guwahati',
    village: 'Dispur',
    surveyNo: 'Dag 188 Patta 42',
    recommendedDoc: 'DHARITREE_JAMABANDI',
    docTitle: 'Dharitree Jamabandi & Chitha',
    keywords: ['guwahati', 'dispur', 'gs road', 'assam', 'dharitree', 'ilrms', '781005']
  },

  // ==========================================
  // 5. SURVEY & PARCEL CADASTRE SAMPLES
  // ==========================================
  {
    id: 'survey-142-2a',
    type: 'survey',
    categoryBadge: 'Survey No.',
    badgeColor: '#10B981',
    title: 'Survey No. 142/2A (Wagholi, Pune)',
    subtitle: 'Jirayat Agri • 1.20 Ha (3.00 Acre) • Sole Owner: Vikramaditya Shinde',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNo: '142/2A',
    ownerName: 'Vikramaditya Shinde',
    recommendedDoc: '7_12',
    docTitle: 'Instant 7/12 Extract (Certified)',
    recordId: '2ce075c8-803b-41cf-92f9-a963cd27ff8a',
    keywords: ['142/2a', '142', 'survey 142/2a', 'gat 142', 'wagholi survey', 'shinde']
  },
  {
    id: 'survey-khasra-492-up',
    type: 'survey',
    categoryBadge: 'Khasra / Gata',
    badgeColor: '#10B981',
    title: 'Khasra No. 492/1 (Noida Sector 62, UP)',
    subtitle: 'UP Bhulekh Land Cadastre • 0.8500 Ha • Commercial NA Order Active',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar (Noida)',
    taluka: 'Noida',
    village: 'Sector 62',
    surveyNo: '492/1',
    ownerName: 'Sunil Kumar Agrawal',
    recommendedDoc: 'KHATAUNI',
    docTitle: 'Bhulekh UP Khasra Record',
    keywords: ['492/1', 'khasra 492', 'gata 492', 'noida khasra', 'up bhulekh']
  },
  {
    id: 'survey-204-tg',
    type: 'survey',
    categoryBadge: 'Survey No.',
    badgeColor: '#10B981',
    title: 'Survey No. 204 (Gachibowli, Rangareddy)',
    subtitle: 'Dharani Land Record • Commercial IT Sub-plot • Clean Chain of Deeds',
    state: 'TG',
    stateName: 'Telangana',
    district: 'Rangareddy',
    taluka: 'Serilingampally',
    village: 'Gachibowli',
    surveyNo: '204',
    ownerName: 'K. Chandrasekhar Rao',
    recommendedDoc: 'EC',
    docTitle: '30-Year Encumbrance Search (EC)',
    keywords: ['204', 'survey 204', 'sy 204', 'gachibowli survey', 'dharani 204']
  },
  {
    id: 'survey-bhoomi-59b-ka',
    type: 'survey',
    categoryBadge: 'Survey / Hissa',
    badgeColor: '#10B981',
    title: 'Survey No. 59/B (Whitefield, Bengaluru)',
    subtitle: 'Bhoomi Karnataka Cadastre • Hissa 2 • Dry Land Converted',
    state: 'KA',
    stateName: 'Karnataka',
    district: 'Bengaluru Urban',
    taluka: 'Bengaluru East',
    village: 'Whitefield',
    surveyNo: '59/B',
    ownerName: 'Manjunath Gowda',
    recommendedDoc: 'RTC',
    docTitle: 'Bhoomi RTC Pahani',
    keywords: ['59/b', 'survey 59/b', 'whitefield survey', 'bhoomi 59', 'gowda']
  },

  // ==========================================
  // 6. OWNER & KHATADAR SAMPLES
  // ==========================================
  {
    id: 'owner-vikramaditya-shinde',
    type: 'owner',
    categoryBadge: 'Owner / Khatadar',
    badgeColor: '#8B5CF6',
    title: 'Vikramaditya Shinde',
    subtitle: 'Khata KH-8821 • Mauje Wagholi, Haveli, Pune • 1 Holding Verified',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNo: '142/2A',
    ownerName: 'Vikramaditya Shinde',
    recommendedDoc: '7_12',
    docTitle: 'Satbara & 8A Khate Extract',
    keywords: ['vikramaditya', 'shinde', 'vikramaditya shinde', 'kh-8821', 'wagholi owner']
  },
  {
    id: 'owner-sunil-agrawal-up',
    type: 'owner',
    categoryBadge: 'Owner / Khatedar',
    badgeColor: '#8B5CF6',
    title: 'Sunil Kumar Agrawal',
    subtitle: 'UP Bhulekh Khata #00412 • Noida Sector 62 • Single Title',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar (Noida)',
    taluka: 'Noida',
    village: 'Sector 62',
    surveyNo: '492/1',
    ownerName: 'Sunil Kumar Agrawal',
    recommendedDoc: 'KHATAUNI',
    docTitle: 'Bhulekh UP Khatauni Title',
    keywords: ['sunil agrawal', 'sunil kumar agrawal', 'noida khatedar', 'up owner']
  },
  {
    id: 'owner-manjunath-gowda',
    type: 'owner',
    categoryBadge: 'Pattadar / Owner',
    badgeColor: '#8B5CF6',
    title: 'Manjunath Gowda',
    subtitle: 'Bhoomi Account #5910 • Whitefield, Bengaluru East • RTC Verified',
    state: 'KA',
    stateName: 'Karnataka',
    district: 'Bengaluru Urban',
    taluka: 'Bengaluru East',
    village: 'Whitefield',
    surveyNo: '59/B',
    ownerName: 'Manjunath Gowda',
    recommendedDoc: 'RTC',
    docTitle: 'Bhoomi RTC Pahani Record',
    keywords: ['manjunath gowda', 'manjunath', 'gowda', 'whitefield owner', 'bhoomi owner']
  },

  // ==========================================
  // 7. DEED & FERFAR MUTATION SAMPLES
  // ==========================================
  {
    id: 'deed-ferfar-4821',
    type: 'deed',
    categoryBadge: 'Village Form 6',
    badgeColor: '#10B981',
    title: 'Village Form 6 Ferfar #4821 (Gat 142/2A, Wagholi)',
    subtitle: 'Certified Sale Deed Mutation • Circle Officer Approved • SRO Haveli-3 Reg. 4821',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNo: '142/2A',
    deedNo: '4821/2024',
    recommendedDoc: 'MUTATION',
    docTitle: 'Village Form 6 Ferfar Extract',
    recordId: 'rec-mh-pune-ferfar-4821',
    keywords: ['4821', 'ferfar 4821', 'mutation 4821', 'wagholi 4821', 'haveli sro', 'sale deed', 'form 6', 'village form 6', 'ferfar']
  },
  {
    id: 'ferfar-notice-4950',
    type: 'deed',
    categoryBadge: 'Notice Active',
    badgeColor: '#F59E0B',
    title: 'Aapli Chawadi Ferfar Notice #4950 (Gat 142/2A)',
    subtitle: 'Section 150 MLRC Public Notice • 9 Days Remaining to File Objections • Wagholi',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNo: '142/2A',
    deedNo: '5012/2024',
    recommendedDoc: 'MUTATION',
    docTitle: 'Aapli Chawadi 15-Day Ferfar Notice',
    recordId: 'rec-mh-pune-ferfar-4950',
    keywords: ['4950', 'ferfar 4950', 'aapli chawadi', 'chawadi notice', '15 day notice', 'mutation notice', 'pending ferfar', 'sec 150']
  },
  {
    id: 'igr-index2-4821',
    type: 'deed',
    categoryBadge: 'IGR Index-II',
    badgeColor: '#8B5CF6',
    title: 'IGR Index-II Registered Sale Deed #4821/2024 (SRO Haveli-3)',
    subtitle: 'Book 1 • Consideration: Rs. 72.5 Lakhs • Stamp Duty Paid: Rs. 5.07L • Gat 142/2A Wagholi',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Wagholi',
    surveyNo: '142/2A',
    deedNo: '4821/2024',
    recommendedDoc: 'INDEX_2',
    docTitle: 'IGR Index-II Registered Deed Abstract',
    recordId: 'rec-mh-pune-deed-4821',
    keywords: ['index 2', 'index-ii', '4821', 'deed 4821', 'haveli sro', 'sale deed', 'registered deed', 'pune deed', 'wagholi deed']
  },
  {
    id: 'deed-igrsup-8910',
    type: 'deed',
    categoryBadge: 'Deed / Registry',
    badgeColor: '#F59E0B',
    title: 'IGRSUP Registered Conveyance Deed #8910 / 2023',
    subtitle: 'Sub-Registrar Noida-I • Registered Sale Deed • 13-Year Non-Encumbrance',
    state: 'UP',
    stateName: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar (Noida)',
    taluka: 'Noida',
    village: 'Sector 62',
    deedNo: '8910/2023',
    recommendedDoc: 'REGISTRY_DEED',
    docTitle: 'IGRSUP Certified Registry Abstract',
    recordId: 'rec-up-noida-deed-8910',
    keywords: ['8910', 'deed 8910', 'noida registry', 'igrsup', 'sale deed']
  },

  // ==========================================
  // 8. DOOR NUMBER & MUNICIPAL TAX ASSESSMENTS
  // ==========================================
  {
    id: 'door-amanora-b402',
    type: 'door',
    categoryBadge: 'Door / PTIN',
    badgeColor: '#06B6D4',
    title: 'Flat 402, Building B, Amanora Park Town',
    subtitle: 'Hadapsar, Pune • Municipal Assessment SAC-140291 (PMC Tax Paid)',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Hadapsar',
    doorNo: 'Flat 402, Bldg B',
    recommendedDoc: 'INDEX_2',
    docTitle: 'Society Flat Deed & Assessment',
    keywords: ['flat 402', 'amanora', 'hadapsar flat', 'pmc tax', 'sac 140291', 'door']
  },
  {
    id: 'sac-hw130562-bandra',
    type: 'door',
    categoryBadge: 'BMC / SAC Ledger',
    badgeColor: '#EF4444',
    title: 'Flat 402, Silver Oak CHS (SAC #HW1305620200003)',
    subtitle: '14th Road, Bandra West, Mumbai • Ward H-West (₹1,77,000 BMC Tax Arrears)',
    state: 'MH',
    stateName: 'Maharashtra',
    district: 'Mumbai Suburban',
    taluka: 'Bandra',
    village: 'Bandra West',
    doorNo: 'Flat 402, 4th Floor',
    surveyNo: 'SAC-HW1305620200003',
    recommendedDoc: 'BMC_TAX',
    docTitle: 'BMC Property Tax Assessment & SAC Ledger',
    recordId: 'rec-mh-bmc-tax-hw130562',
    keywords: ['hw1305620200003', 'silver oak', 'flat 402 bandra', 'bandra tax', 'bmc tax', 'sac number', '177000', 'sharma', 'khar', 'bandra west']
  },
  {
    id: 'door-ptin-102938',
    type: 'door',
    categoryBadge: 'Door / PTIN',
    badgeColor: '#06B6D4',
    title: 'Door No. 8-2-293/82 (PTIN #10293849)',
    subtitle: 'Jubilee Hills, Road No. 36 • CDMA Hyderabad Municipal Ledger',
    state: 'TG',
    stateName: 'Telangana',
    district: 'Hyderabad',
    taluka: 'Shaikpet',
    village: 'Jubilee Hills',
    doorNo: '8-2-293/82',
    recommendedDoc: 'PTIN',
    docTitle: 'CDMA Property Assessment Record',
    keywords: ['8-2-293/82', 'ptin 10293849', 'ptin', 'door number', 'jubilee hills door']
  }
];

// Helper to resolve any Indian PIN code or general city query dynamically
function resolveDynamicPanIndiaQuery(rawQuery: string): AutocompleteItem | null {
  const q = rawQuery.toLowerCase();

  // 1. Semantic City / Town keyword matching
  if (q.includes('ghaziabad') || q.includes('sahibabad') || q.includes('panchsheel') || q.includes('panchessl')) {
    const hasPlot = q.match(/\b(\d+)\b/);
    const plotNo = hasPlot ? hasPlot[1] : '112';
    const isPlot112 = plotNo === '112' || q.includes('panchsheel') || q.includes('panchessl');
    return {
      id: isPlot112 ? 'prop-112-panchsheel-sahibabad' : `dynamic-ghaziabad-${plotNo}`,
      type: hasPlot ? 'door' : 'address',
      categoryBadge: 'Detected: Uttar Pradesh (UP)',
      badgeColor: '#10B981',
      title: hasPlot ? `House / Plot ${plotNo}, Panchsheel Park, Sahibabad` : 'Panchsheel Park, Sahibabad, Ghaziabad',
      subtitle: 'Official IGRSUP & Bhulekh UP Portal • SRO Sahibabad • Ghaziabad, UP',
      state: 'UP',
      stateName: 'Uttar Pradesh',
      district: 'Ghaziabad',
      taluka: 'Sahibabad',
      village: 'Panchsheel Park',
      doorNo: hasPlot ? plotNo : undefined,
      surveyNo: hasPlot ? `Plot ${plotNo}` : undefined,
      recommendedDoc: 'REGISTRY_DEED',
      docTitle: 'IGRSUP Sub-Registrar Registered Deed & Assessment',
      recordId: isPlot112 ? 'rec-up-ghaziabad-panchsheel-112' : undefined,
      keywords: ['ghaziabad', 'sahibabad', 'panchsheel', 'panchessl', '112', 'up']
    };
  }

  const pinMatch = rawQuery.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    const pin = pinMatch[1];
    const prefix2 = pin.substring(0, 2);

    let state = 'MH';
    let stateName = 'Maharashtra';
    let portal = 'Mahabhumi';
    let doc = '7_12';
    let docTitle = 'Satbara 7/12 & 8A';
    let district = 'Pune';

    if (prefix2 === '11') {
      state = 'DL'; stateName = 'Delhi'; portal = 'DORIS / Delhi Bhulekh'; doc = 'DORIS_REGISTRY'; docTitle = 'DORIS Registered Deed & Girdawari'; district = 'New Delhi';
    } else if (['12', '13'].includes(prefix2)) {
      state = 'HR'; stateName = 'Haryana'; portal = 'Jamabandi Haryana'; doc = 'JAMABANDI_NAKAL'; docTitle = 'Nakal Jamabandi (RoR)'; district = 'Gurugram';
    } else if (['14', '15', '16'].includes(prefix2)) {
      state = 'PB'; stateName = 'Punjab'; portal = 'PLRS Jamabandi'; doc = 'FARD_JAMABANDI'; docTitle = 'PLRS Fard Jamabandi'; district = 'SAS Nagar (Mohali)';
    } else if (prefix2 === '17') {
      state = 'HP'; stateName = 'Himachal Pradesh'; portal = 'Himbhoomi'; doc = 'HIM_JAMABANDI'; docTitle = 'Himbhoomi Jamabandi'; district = 'Shimla';
    } else if (['18', '19'].includes(prefix2)) {
      state = 'JK'; stateName = 'Jammu & Kashmir'; portal = 'LRIS'; doc = 'JK_JAMABANDI'; docTitle = 'LRIS Digital Jamabandi'; district = 'Srinagar';
    } else if (['20', '21', '22', '23', '24', '25', '26', '27', '28'].includes(prefix2)) {
      if (['24', '26'].includes(prefix2) && (rawQuery.includes('dehradun') || rawQuery.includes('haridwar') || rawQuery.includes('nainital'))) {
        state = 'UK'; stateName = 'Uttarakhand'; portal = 'Devbhoomi'; doc = 'DEV_BHULEKH'; docTitle = 'Devbhoomi RoR Khatoni'; district = 'Dehradun';
      } else {
        state = 'UP'; stateName = 'Uttar Pradesh'; portal = 'Bhulekh UP'; doc = 'KHATAUNI'; docTitle = 'Bhulekh Khatauni & Registry'; district = 'Gautam Buddha Nagar (Noida)';
      }
    } else if (['30', '31', '32', '33', '34'].includes(prefix2)) {
      state = 'RJ'; stateName = 'Rajasthan'; portal = 'Apna Khata (e-Dharti)'; doc = 'APNA_KHATA'; docTitle = 'Jamabandi Nakal'; district = 'Jaipur';
    } else if (['36', '37', '38', '39'].includes(prefix2)) {
      state = 'GJ'; stateName = 'Gujarat'; portal = 'AnyRoR'; doc = '7_12'; docTitle = 'AnyRoR 7/12 & Hakk Patrak'; district = 'Ahmedabad';
    } else if (['40', '41', '42', '43', '44'].includes(prefix2)) {
      if (prefix2 === '40' && (rawQuery.includes('goa') || rawQuery.includes('panaji') || rawQuery.includes('margao'))) {
        state = 'GA'; stateName = 'Goa'; portal = 'Directorate of Land Records'; doc = 'FORM_1_14'; docTitle = 'Form I & XIV Extract'; district = 'North Goa';
      } else {
        state = 'MH'; stateName = 'Maharashtra'; portal = 'Mahabhumi'; doc = '7_12'; docTitle = '7/12 & 8A Satbara'; district = 'Pune';
      }
    } else if (['45', '46', '47', '48', '49'].includes(prefix2)) {
      if (prefix2 === '49') {
        state = 'CG'; stateName = 'Chhattisgarh'; portal = 'Bhuiyan CG'; doc = 'BHUIYAN_B1'; docTitle = 'Bhuiyan B-1 Khatauni'; district = 'Raipur';
      } else {
        state = 'MP'; stateName = 'Madhya Pradesh'; portal = 'MP Bhulekh'; doc = 'KHASRA_P2'; docTitle = 'MP Bhulekh Khasra P-II'; district = 'Indore';
      }
    } else if (['50', '51', '52', '53'].includes(prefix2)) {
      if (['50'].includes(prefix2)) {
        state = 'TG'; stateName = 'Telangana'; portal = 'Dharani'; doc = 'EC'; docTitle = 'Dharani Encumbrance Certificate'; district = 'Rangareddy';
      } else {
        state = 'AP'; stateName = 'Andhra Pradesh'; portal = 'Meebhoomi'; doc = 'ADANGAL'; docTitle = 'Meebhoomi Adangal & 1-B'; district = 'Visakhapatnam';
      }
    } else if (['56', '57', '58', '59'].includes(prefix2)) {
      state = 'KA'; stateName = 'Karnataka'; portal = 'Bhoomi / e-Swathu'; doc = 'RTC'; docTitle = 'Bhoomi RTC Pahani & e-Khata'; district = 'Bengaluru Urban';
    } else if (['60', '61', '62', '63', '64'].includes(prefix2)) {
      state = 'TN'; stateName = 'Tamil Nadu'; portal = 'Tamil Nilam e-Services'; doc = 'PATTA_CHITTA'; docTitle = 'Patta & Chitta Extract'; district = 'Chennai';
    } else if (['67', '68', '69'].includes(prefix2)) {
      state = 'KL'; stateName = 'Kerala'; portal = 'e-Rekha'; doc = 'FMB_SKETCH'; docTitle = 'e-Rekha FMB Sketch & EC'; district = 'Ernakulam (Kochi)';
    } else if (['70', '71', '72', '73', '74'].includes(prefix2)) {
      state = 'WB'; stateName = 'West Bengal'; portal = 'Banglarbhumi'; doc = 'ROR_KHATIAN'; docTitle = 'Banglarbhumi ROR Khatian'; district = 'North 24 Parganas';
    } else if (['75', '76', '77'].includes(prefix2)) {
      state = 'OD'; stateName = 'Odisha'; portal = 'Bhulekh Odisha'; doc = 'BHULEKH_ODISHA'; docTitle = 'Bhulekh Odisha RoR'; district = 'Khordha (Bhubaneswar)';
    } else if (['78', '79'].includes(prefix2)) {
      state = 'AS'; stateName = 'Assam'; portal = 'Dharitree'; doc = 'DHARITREE_JAMABANDI'; docTitle = 'Dharitree Jamabandi'; district = 'Kamrup Metropolitan (Guwahati)';
    } else if (['80', '81', '82', '83', '84', '85'].includes(prefix2)) {
      if (['83'].includes(prefix2)) {
        state = 'JH'; stateName = 'Jharkhand'; portal = 'Jharbhoomi'; doc = 'KHATIAN_JH'; docTitle = 'Jharbhoomi Khatian Extract'; district = 'Ranchi';
      } else {
        state = 'BR'; stateName = 'Bihar'; portal = 'Bihar Bhumi'; doc = 'DAKHIL_KHARIJ'; docTitle = 'Bihar Bhumi Dakhil Kharij & LPC'; district = 'Patna';
      }
    }

    return {
      id: `dynamic-pin-${pin}`,
      type: 'address',
      categoryBadge: 'Postal Cadastre / PIN Code',
      badgeColor: '#2563EB',
      title: `PIN ${pin} (${stateName})`,
      subtitle: `Official ${portal} Land Record Registry • District: ${district}`,
      state,
      stateName,
      district,
      taluka: 'Central Taluka',
      village: `PIN ${pin} Zone`,
      recommendedDoc: doc,
      docTitle,
      keywords: [pin, state.toLowerCase(), stateName.toLowerCase(), portal.toLowerCase()]
    };
  }

  return null;
}

// Search Autocomplete Endpoint
searchRouter.get('/search/autocomplete', (req: Request, res: Response) => {
  const query = ((req.query.query as string) || (req.query.q as string) || '').trim().toLowerCase();
  const filterType = ((req.query.type as string) || 'all').toLowerCase();
  const stateFilter = ((req.query.state as string) || 'ALL').toUpperCase();

  let items = AUTOCOMPLETE_DATABASE;

  // If query is empty, filter by state if provided and not ALL
  if (stateFilter && stateFilter !== 'ALL' && !query) {
    items = items.filter(item => item.state === stateFilter);
  }

  // Filter by category type if selected
  if (filterType && filterType !== 'all') {
    if (filterType.includes('address') || filterType.includes('map') || filterType.includes('location')) {
      items = items.filter(item => item.type === 'address' || item.type === 'door');
    } else if (filterType.includes('survey')) {
      items = items.filter(item => item.type === 'survey');
    } else if (filterType.includes('owner')) {
      items = items.filter(item => item.type === 'owner' || Boolean(item.ownerName));
    } else if (filterType.includes('deed')) {
      items = items.filter(item => item.type === 'deed' || Boolean(item.deedNo));
    } else if (filterType.includes('door')) {
      items = items.filter(item => item.type === 'door' || item.type === 'address');
    }
  }

  // If query is empty, return popular / featured queries across the selected state or all India
  if (!query) {
    const featured = items.slice(0, 8);
    return res.json({
      query: '',
      count: featured.length,
      suggestions: featured,
      modes: [
        { type: 'address', label: 'Address / Society', placeholder: 'e.g. Wagholi Pune, Noida Sec 62, Cyber City Gurugram, Whitefield' },
        { type: 'survey', label: 'Survey / Khasra No', placeholder: 'e.g. 142/2A, Khasra 492, Sy 204, Mustil 42' },
        { type: 'owner', label: 'Owner / Khatadar', placeholder: 'e.g. Vikramaditya Shinde, Sunil Agrawal, Manjunath Gowda' },
        { type: 'deed', label: 'Deed / Ferfar No', placeholder: 'e.g. Deed #4821, IGRSUP 8910, Ferfar 3120' },
        { type: 'door', label: 'Door / Flat / PTIN', placeholder: 'e.g. Flat 402 Amanora, PTIN 10293849' }
      ]
    });
  }

  // Tokenize and normalize query for multi-word & typo-tolerant matching
  const queryTokens = query
    .replace(/[,\-\.\/#]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);

  const normalizedTokens = queryTokens.map(t => {
    if (t.includes('panchessl') || t.includes('panchshil') || t.includes('panchsheel')) return 'panchsheel';
    if (t.includes('sahibabad') || t.includes('sahiba') || t.includes('sahib')) return 'sahibabad';
    if (t.includes('ghaziabad') || t.includes('gzb') || t.includes('ghazi')) return 'ghaziabad';
    return t;
  });

  // Score items across all fields
  const scoredItems = items.map(item => {
    const itemTokens = [
      item.title,
      item.subtitle,
      item.village,
      item.district,
      item.taluka,
      item.stateName,
      item.state,
      item.surveyNo || '',
      item.doorNo || '',
      item.ownerName || '',
      item.deedNo || '',
      ...(item.keywords || [])
    ].join(' ').toLowerCase();

    // Check full substring match
    const exactSub = itemTokens.includes(query);

    // Count how many tokens match
    let matchCount = 0;
    for (let i = 0; i < queryTokens.length; i++) {
      const orig = queryTokens[i];
      const norm = normalizedTokens[i];
      if (itemTokens.includes(orig) || itemTokens.includes(norm)) {
        matchCount++;
      }
    }

    const tokenRatio = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
    return { item, exactSub, tokenRatio, matchCount };
  });

  // Include items with exact match, or matching >= 40% of tokens, or at least 1 token for short queries
  let matches = scoredItems
    .filter(m => m.exactSub || m.tokenRatio >= 0.4 || (queryTokens.length <= 2 && m.matchCount >= 1))
    .sort((a, b) => {
      // 1. Higher token match ratio first
      if (b.tokenRatio !== a.tokenRatio) return b.tokenRatio - a.tokenRatio;
      // 2. Direct certified record first
      const aRec = a.item.recordId ? 1 : 0;
      const bRec = b.item.recordId ? 1 : 0;
      if (aRec !== bRec) return bRec - aRec;
      // 3. Exact substring match
      if (a.exactSub !== b.exactSub) return a.exactSub ? -1 : 1;
      // 4. Selected state preference
      const aState = stateFilter && a.item.state === stateFilter ? 1 : 0;
      const bState = stateFilter && b.item.state === stateFilter ? 1 : 0;
      if (aState !== bState) return bState - aState;
      return 0;
    })
    .map(m => m.item);

  // Dynamic PIN Code / Postal Cadastre fallback if fewer than 5 results
  const dynamicMatch = resolveDynamicPanIndiaQuery(query);
  if (dynamicMatch && !matches.some(m => m.id === dynamicMatch.id || (m.recordId && m.recordId === dynamicMatch.recordId))) {
    matches.unshift(dynamicMatch);
  }

  res.json({
    query,
    count: matches.length,
    suggestions: matches.slice(0, 10),
    modes: [
      { type: 'address', label: 'Address / Society', placeholder: 'e.g. Wagholi Pune, Noida Sec 62, Cyber City Gurugram, Whitefield' },
      { type: 'survey', label: 'Survey / Khasra No', placeholder: 'e.g. 142/2A, Khasra 492, Sy 204, Mustil 42' },
      { type: 'owner', label: 'Owner / Khatadar', placeholder: 'e.g. Vikramaditya Shinde, Sunil Agrawal, Manjunath Gowda' },
      { type: 'deed', label: 'Deed / Ferfar No', placeholder: 'e.g. Deed #4821, IGRSUP 8910, Ferfar 3120' },
      { type: 'door', label: 'Door / Flat / PTIN', placeholder: 'e.g. Flat 402 Amanora, PTIN 10293849' }
    ]
  });
});

searchRouter.get('/states', (_req: Request, res: Response) => {
  res.json({ states: SUPPORTED_STATES });
});

// ============================================================================
// CANONICAL LOCATION HIERARCHY HANDLERS & ROUTES
// ============================================================================

export const handleGetDistricts = (req: Request, res: Response) => {
  const rawState = (req.params.state || req.query.state || req.query.stateCode || req.query.state_code) as string | undefined;
  if (!rawState || !rawState.trim()) {
    return res.status(400).json({ error: 'State parameter is required' });
  }

  const stateCode = normalizeStateCode(rawState.trim());
  const districts = getDistrictsForState(rawState.trim());

  return res.json({
    state: stateCode,
    districts
  });
};

export const handleGetTalukas = (req: Request, res: Response) => {
  const rawState = (req.params.state || req.query.state || req.query.stateCode || req.query.state_code) as string | undefined;
  if (!rawState || !rawState.trim()) {
    return res.status(400).json({ error: 'State parameter is required' });
  }

  const rawDistrict = (req.query.district || req.params.district || req.query.d || req.query.districtName) as string | undefined;
  if (!rawDistrict || !rawDistrict.trim()) {
    return res.status(400).json({ error: 'District parameter is required' });
  }

  const stateCode = normalizeStateCode(rawState.trim());
  const canonicalDistrict = getCanonicalDistrictName(stateCode, rawDistrict.trim()) || rawDistrict.trim();
  const talukas = getTalukasForDistrict(stateCode, rawDistrict.trim());

  return res.json({
    state: stateCode,
    district: canonicalDistrict,
    talukas
  });
};

export const handleGetVillages = (req: Request, res: Response) => {
  const rawState = (req.params.state || req.query.state || req.query.stateCode || req.query.state_code) as string | undefined;
  if (!rawState || !rawState.trim()) {
    return res.status(400).json({ error: 'State parameter is required' });
  }

  const rawTaluka = (req.query.taluka || req.params.taluka || req.query.t || req.query.talukaName || req.query.tehsil || req.query.mandal) as string | undefined;
  if (!rawTaluka || !rawTaluka.trim()) {
    return res.status(400).json({ error: 'Taluka parameter is required' });
  }

  const rawDistrict = (req.query.district || req.params.district || req.query.d || req.query.districtName) as string | undefined;
  const stateCode = normalizeStateCode(rawState.trim());

  const talukaInfo = getCanonicalTalukaInfo(stateCode, rawDistrict?.trim(), rawTaluka.trim());
  const canonicalDistrict = talukaInfo?.district || (rawDistrict ? (getCanonicalDistrictName(stateCode, rawDistrict.trim()) || rawDistrict.trim()) : undefined);
  const canonicalTaluka = talukaInfo?.taluka || rawTaluka.trim();
  const villages = getVillagesForTaluka(stateCode, rawDistrict?.trim() || canonicalDistrict, rawTaluka.trim());

  const payload: {
    state: string;
    district?: string;
    taluka: string;
    villages: string[];
  } = {
    state: stateCode,
    taluka: canonicalTaluka,
    villages
  };

  if (canonicalDistrict) {
    payload.district = canonicalDistrict;
  }

  return res.json(payload);
};

// Canonical location hierarchy routes (query and path param support)
searchRouter.get('/districts', handleGetDistricts);
searchRouter.get('/districts/:state', handleGetDistricts);

searchRouter.get('/talukas', handleGetTalukas);
searchRouter.get('/talukas/:state', handleGetTalukas);

searchRouter.get('/villages', handleGetVillages);
searchRouter.get('/villages/:state', handleGetVillages);

// Backwards-compatible legacy location routes
searchRouter.get('/locations/:state/districts', handleGetDistricts);
searchRouter.get('/locations/:state/talukas', handleGetTalukas);
searchRouter.get('/locations/:state/villages', handleGetVillages);

