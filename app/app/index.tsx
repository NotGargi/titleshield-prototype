import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Sparkles,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  FileCheck2,
  Lock,
  Layers,
  HelpCircle,
  X,
  User,
  FileText,
  Home,
  Compass,
  Info,
  ChevronDown,
  ChevronUp,
  Building2,
  CheckCircle2
} from 'lucide-react-native';
import { LandeedHeader, ALL_STATES } from '../components/LandeedHeader';
import { LandeedBottomNav } from '../components/LandeedBottomNav';
import { navigateTo } from '../utils/navigation';
import { API_BASE_URL } from '../constants/api';

const { width } = Dimensions.get('window');

const STATE_DOCUMENTS: Record<string, Array<{
  id: string;
  name: string;
  subtitle: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}>> = {
  MH: [
    {
      id: '7_12',
      name: '7/12 & 8A Extract',
      subtitle: 'Digital Satbara land rights & crop survey',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Popular',
      badgeColor: '#2563EB'
    },
    {
      id: 'MUTATION',
      name: 'Ferfar / Mutation',
      subtitle: 'Notice of succession & title changes',
      icon: require('../assets/images/src_images_icons_gujarat_gj_ferfar_6a.png'),
      badge: 'Instant',
      badgeColor: '#059669'
    },
    {
      id: 'INDEX_2',
      name: 'IGR Index-II',
      subtitle: 'Registered sale deed & agreement extract',
      icon: require('../assets/images/src_images_document_check.png'),
      badge: 'Certified',
      badgeColor: '#8B5CF6'
    },
    {
      id: 'AAPLI_CHAWADI',
      name: 'Aapli Chawadi',
      subtitle: 'Pending mutation notices & village appeals',
      icon: require('../assets/images/src_images_aapli_chawadi_icon.png')
    },
    {
      id: 'CTS_MAP',
      name: 'CTS & City Survey',
      subtitle: 'Cadastral maps & urban property cards',
      icon: require('../assets/images/src_images_ka_satellite_map_icon.png')
    },
    {
      id: 'BMC_TAX',
      name: 'BMC Property Tax',
      subtitle: 'Municipal assessment & SAC number ledger',
      icon: require('../assets/images/src_images_property_tax_receipt_icon.png')
    }
  ],
  TG: [
    {
      id: 'EC',
      name: 'Encumbrance Certificate (EC)',
      subtitle: 'Search mortgage & transaction history (1983-now)',
      icon: require('../assets/images/src_images_dharani_logo.png'),
      badge: 'Dharani',
      badgeColor: '#059669'
    },
    {
      id: 'PASSBOOK',
      name: 'Pattadar Passbook',
      subtitle: 'Agricultural ownership & khata register',
      icon: require('../assets/images/src_images_document_check.png'),
      badge: 'Popular',
      badgeColor: '#2563EB'
    },
    {
      id: 'PTIN',
      name: 'CDMA Property Tax',
      subtitle: 'Door number assessment & PTIN status',
      icon: require('../assets/images/src_images_property_tax_receipt_icon.png')
    },
    {
      id: 'HYDRA_LAKE',
      name: 'Hydra Lake Buffer Audit',
      subtitle: 'Full Tank Level (FTL) & buffer zone audit',
      icon: require('../assets/images/src_images_aapli_chawadi_icon.png'),
      badge: 'Hydra Safe',
      badgeColor: '#0891b2'
    },
    {
      id: 'SETHWAR_MAP',
      name: 'Cadastral Sethwar Map',
      subtitle: 'Village boundary & Tippon sketch',
      icon: require('../assets/images/src_images_ka_satellite_map_icon.png')
    }
  ],
  KA: [
    {
      id: 'RTC',
      name: 'Bhoomi RTC / Pahani',
      subtitle: 'Form 16 land ownership, tenancy & hissa',
      icon: require('../assets/images/src_images_ka_e_swathu_icon.png'),
      badge: 'Bhoomi',
      badgeColor: '#a16207'
    },
    {
      id: 'BBMP_KHATA',
      name: 'BBMP e-Khata (e-Aasthi)',
      subtitle: 'A-Khata / B-Khata certificate & PID',
      icon: require('../assets/images/src_images_document_check.png'),
      badge: 'Bengaluru',
      badgeColor: '#2563EB'
    },
    {
      id: 'FORM_9_11',
      name: 'e-Swathu Form 9 & 11',
      subtitle: 'Gram panchayat property register & tax',
      icon: require('../assets/images/src_images_8a_text_icon.png')
    },
    {
      id: 'FIND_MY_SURVEY',
      name: 'Find My Survey Map',
      subtitle: 'Mojini survey boundary & village atlas',
      icon: require('../assets/images/src_images_ka_satellite_map_icon.png')
    }
  ],
  AP: [
    {
      id: 'ADANGAL',
      name: 'Meebhoomi Adangal',
      subtitle: 'Village revenue record & crop tenancy',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Official',
      badgeColor: '#0891b2'
    },
    {
      id: 'ROR_1B',
      name: '1-B ROR Register',
      subtitle: 'Pattadar ownership record & survey holdings',
      icon: require('../assets/images/src_images_document_check.png')
    },
    {
      id: 'EC',
      name: 'Encumbrance Certificate',
      subtitle: 'AP IGRS registered deed history',
      icon: require('../assets/images/src_images_dharani_logo.png')
    }
  ],
  GJ: [
    {
      id: '7_12',
      name: 'AnyRoR 7/12 & 8A',
      subtitle: 'Rural land record inspection & rights',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'AnyRoR',
      badgeColor: '#8B5CF6'
    },
    {
      id: 'VF6',
      name: 'Village Form 6 (Hakk Patrak)',
      subtitle: 'Mutation entry diary & inheritance rights',
      icon: require('../assets/images/src_images_icons_gujarat_gj_ferfar_6a.png')
    },
    {
      id: 'PROPERTY_CARD',
      name: 'Urban Property Card',
      subtitle: 'City survey office ownership document',
      icon: require('../assets/images/src_images_document_check.png')
    }
  ],
  TN: [
    {
      id: 'PATTA_CHITTA',
      name: 'Patta & Chitta',
      subtitle: 'Tamil Nilam e-Services revenue record',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Nilamagal',
      badgeColor: '#EC4899'
    },
    {
      id: 'TSLR',
      name: 'TSLR Extract',
      subtitle: 'Town Survey Land Register for urban lands',
      icon: require('../assets/images/src_images_document_check.png')
    }
  ],
  UP: [
    {
      id: 'KHATAUNI',
      name: 'Bhulekh Khatauni (ROR)',
      subtitle: 'Official UP revenue ownership & Khasra plot record',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Bhulekh UP',
      badgeColor: '#059669'
    },
    {
      id: 'REGISTRY_DEED',
      name: 'IGRSUP Registered Deed',
      subtitle: '13-year certified registry & sale agreement search',
      icon: require('../assets/images/src_images_document_check.png'),
      badge: 'IGRSUP',
      badgeColor: '#2563EB'
    },
    {
      id: 'BHU_NAKSHA',
      name: 'Bhu-Naksha Cadastral Map',
      subtitle: 'Geo-referenced parcel boundaries & map dimensions',
      icon: require('../assets/images/src_images_ka_satellite_map_icon.png')
    },
    {
      id: 'GATA_UNIQUE_CODE',
      name: '16-Digit Gata Code Search',
      subtitle: 'Unique revenue cadastral identification number',
      icon: require('../assets/images/src_images_aapli_chawadi_icon.png')
    }
  ],
  DL: [
    {
      id: 'DORIS_REGISTRY',
      name: 'DORIS Registered Deed',
      subtitle: 'Delhi Online Registration Information System extract',
      icon: require('../assets/images/src_images_document_check.png'),
      badge: 'DORIS',
      badgeColor: '#2563EB'
    },
    {
      id: 'DELHI_BHULEKH',
      name: 'Delhi Bhulekh (Khasra Girdawari)',
      subtitle: 'Revenue department khasra & jamabandi register',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Bhulekh',
      badgeColor: '#059669'
    },
    {
      id: 'DDA_CONVERSION',
      name: 'DDA Leasehold to Freehold',
      subtitle: 'Delhi Development Authority property conversion record',
      icon: require('../assets/images/src_images_property_tax_receipt_icon.png')
    }
  ],
  HR: [
    {
      id: 'JAMABANDI_NAKAL',
      name: 'Nakal Jamabandi (RoR)',
      subtitle: 'Haryana Web-HALRIS official land ownership title',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Jamabandi',
      badgeColor: '#8B5CF6'
    },
    {
      id: 'INTEQAL',
      name: 'Mutation (Inteqal) Status',
      subtitle: 'Succession & deed mutation sanction orders',
      icon: require('../assets/images/src_images_icons_gujarat_gj_ferfar_6a.png'),
      badge: 'Official',
      badgeColor: '#059669'
    },
    {
      id: 'DEED_REGISTRATION',
      name: 'Registered Deed Extract',
      subtitle: 'Sub-Registrar certified deed copy & encumbrance',
      icon: require('../assets/images/src_images_document_check.png')
    }
  ],
  RJ: [
    {
      id: 'APNA_KHATA',
      name: 'Jamabandi Nakal (e-Dharti)',
      subtitle: 'Official Rajasthan Apna Khata land rights certificate',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Apna Khata',
      badgeColor: '#d97706'
    },
    {
      id: 'NAMANTARAN',
      name: 'Namantaran (Mutation) Copy',
      subtitle: 'Tehsil mutation entry & transfer of rights',
      icon: require('../assets/images/src_images_icons_gujarat_gj_ferfar_6a.png')
    },
    {
      id: 'E_PANJIYAN',
      name: 'e-Panjiyan Registered Deed',
      subtitle: 'Registration & stamps department registry search',
      icon: require('../assets/images/src_images_document_check.png')
    }
  ],
  MP: [
    {
      id: 'KHASRA_P2',
      name: 'Khasra (Form P-II)',
      subtitle: 'Madhya Pradesh Bhulekh land survey & area details',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'MP Bhulekh',
      badgeColor: '#059669'
    },
    {
      id: 'KHATAUNI_B1',
      name: 'B-1 Khatauni Kishtbandi',
      subtitle: 'Consolidated land holding & revenue tax assessment',
      icon: require('../assets/images/src_images_document_check.png')
    },
    {
      id: 'MP_BHU_NAKSHA',
      name: 'Bhu-Naksha Cadastral Map',
      subtitle: 'Digital village parcel map & geometry',
      icon: require('../assets/images/src_images_ka_satellite_map_icon.png')
    }
  ],
  WB: [
    {
      id: 'ROR_KHATIAN',
      name: 'Banglarbhumi ROR (Khatian)',
      subtitle: 'West Bengal land & land reforms official title',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Banglarbhumi',
      badgeColor: '#2563EB'
    },
    {
      id: 'PLOT_INFO',
      name: 'Plot Information (Dag No.)',
      subtitle: 'Classification, share ratio & mapped area',
      icon: require('../assets/images/src_images_ka_satellite_map_icon.png')
    },
    {
      id: 'WARISHAN',
      name: 'Warishan & Mutation Application',
      subtitle: 'Legal heirship succession certificate & mutation',
      icon: require('../assets/images/src_images_icons_gujarat_gj_ferfar_6a.png')
    }
  ],
  PB: [
    {
      id: 'FARD_JAMABANDI',
      name: 'Fard Jamabandi Nakal',
      subtitle: 'Punjab Land Records Society (PLRS) official RoR',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'PLRS',
      badgeColor: '#d97706'
    },
    {
      id: 'ROZNAMCHA',
      name: 'Roznamcha Waqiati',
      subtitle: 'Daily revenue diary entries by Patwari',
      icon: require('../assets/images/src_images_document_check.png')
    },
    {
      id: 'MUTATION_SANCTION',
      name: 'Mutation (Inteqal) Sanction',
      subtitle: 'Tehsil revenue court title approval order',
      icon: require('../assets/images/src_images_icons_gujarat_gj_ferfar_6a.png')
    }
  ],
  BR: [
    {
      id: 'DAKHIL_KHARIJ',
      name: 'Dakhil Kharij (Mutation) Status',
      subtitle: 'Bihar Bhumi online mutation status & rejection/order',
      icon: require('../assets/images/src_images_icons_gujarat_gj_ferfar_6a.png'),
      badge: 'Bihar Bhumi',
      badgeColor: '#059669'
    },
    {
      id: 'JAMABANDI_PANJI',
      name: 'Jamabandi Panji Part-II',
      subtitle: 'Khesra details, holding number & lagan dues',
      icon: require('../assets/images/src_images_8a_text_icon.png')
    },
    {
      id: 'LPC_CERTIFICATE',
      name: 'Land Possession Certificate (LPC)',
      subtitle: 'Official ownership possession certificate',
      icon: require('../assets/images/src_images_document_check.png'),
      badge: 'Official',
      badgeColor: '#0891b2'
    }
  ],
  KL: [
    {
      id: 'FMB_SKETCH',
      name: 'e-Rekha FMB Sketch',
      subtitle: 'Kerala Survey Field Measurement Book boundary',
      icon: require('../assets/images/src_images_ka_satellite_map_icon.png'),
      badge: 'e-Rekha',
      badgeColor: '#0891b2'
    },
    {
      id: 'SETTLEMENT_ROR',
      name: 'Settlement Register (RoR)',
      subtitle: 'Thandaper number & pattadar ownership details',
      icon: require('../assets/images/src_images_8a_text_icon.png')
    },
    {
      id: 'KL_EC',
      name: 'PEARL Encumbrance Certificate',
      subtitle: 'Sub-Registrar registered deed liabilities',
      icon: require('../assets/images/src_images_document_check.png')
    }
  ],
  OD: [
    {
      id: 'BHULEKH_ODISHA',
      name: 'Bhulekh Odisha RoR',
      subtitle: 'Revenue record of rights with tenant & plot details',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Bhulekh',
      badgeColor: '#059669'
    },
    {
      id: 'BHU_NAKSHA_OD',
      name: 'Bhu-Naksha Cadastral Map',
      subtitle: 'High precision satellite & boundary polygon',
      icon: require('../assets/images/src_images_ka_satellite_map_icon.png')
    }
  ],
  JH: [
    {
      id: 'KHATIAN_JH',
      name: 'Jharbhoomi Khatian Extract',
      subtitle: 'Jharkhand official land survey record',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Jharbhoomi',
      badgeColor: '#8B5CF6'
    },
    {
      id: 'REGISTER_II',
      name: 'Register-II Dakhil Kharij',
      subtitle: 'Tenant account ledger & mutation diary',
      icon: require('../assets/images/src_images_document_check.png')
    }
  ],
  CG: [
    {
      id: 'BHUIYAN_B1',
      name: 'B-1 Khasra Kishtbandi',
      subtitle: 'Chhattisgarh Bhuiyan certified land record',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Bhuiyan',
      badgeColor: '#059669'
    },
    {
      id: 'BHUIYAN_P2',
      name: 'P-II Khasra Panchshala',
      subtitle: '5-year crop cultivation and rights ledger',
      icon: require('../assets/images/src_images_document_check.png')
    }
  ],
  GA: [
    {
      id: 'FORM_1_14',
      name: 'Form I & XIV Extract',
      subtitle: 'Goa Directorate of Land Records official title',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Official',
      badgeColor: '#2563EB'
    },
    {
      id: 'FORM_D_CITY',
      name: 'Form D (City Survey)',
      subtitle: 'Urban property card for municipal towns',
      icon: require('../assets/images/src_images_document_check.png')
    }
  ],
  UK: [
    {
      id: 'DEV_BHULEKH',
      name: 'Devbhoomi RoR Khatoni 1-A',
      subtitle: 'Uttarakhand digital revenue register',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Devbhoomi',
      badgeColor: '#059669'
    }
  ],
  HP: [
    {
      id: 'HIM_JAMABANDI',
      name: 'Himbhoomi Jamabandi Nakal',
      subtitle: 'Himachal Pradesh digital RoR & Shajra Nasab',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Himbhoomi',
      badgeColor: '#8B5CF6'
    }
  ],
  JK: [
    {
      id: 'JK_JAMABANDI',
      name: 'LRIS Digital Jamabandi',
      subtitle: 'Aapki Zameen Aapki Nigrani revenue title record',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'LRIS',
      badgeColor: '#0891b2'
    }
  ],
  AS: [
    {
      id: 'DHARITREE_JAMABANDI',
      name: 'Dharitree Jamabandi Copy',
      subtitle: 'Assam ILRMS integrated land record management',
      icon: require('../assets/images/src_images_8a_text_icon.png'),
      badge: 'Dharitree',
      badgeColor: '#059669'
    }
  ]
};

const SEARCH_FILTER_TABS = [
  'All',
  'Address',
  'Survey No.',
  'Owner Name',
  'Deed No.',
  'Door No.'
];

interface AutocompleteItem {
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
}

export default function HomeScreen() {
  const router = useRouter();
  const [selectedState, setSelectedState] = useState('MH');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showQueryGuide, setShowQueryGuide] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const documents = STATE_DOCUMENTS[selectedState] || STATE_DOCUMENTS.MH;
  const currentStateObj = ALL_STATES.find(s => s.code === selectedState) || ALL_STATES[0];

  useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const url = `${API_BASE_URL}/search/autocomplete?query=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(activeFilter)}&state=${selectedState}`;
        const res = await fetch(url);
        const data = await res.json();
        if (active) {
          setSuggestions(data.suggestions || []);
          setLoadingSuggestions(false);
        }
      } catch (err) {
        if (active) {
          setSuggestions([]);
          setLoadingSuggestions(false);
        }
      }
    };

    const timer = setTimeout(fetchSuggestions, 120);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, activeFilter, selectedState]);

  const handleSelectSuggestion = (item: AutocompleteItem) => {
    setIsSearchFocused(false);

    if (item.state && item.state !== selectedState) {
      setSelectedState(item.state);
    }

    if (item.recordId) {
      navigateTo(router, `/record/${item.recordId}`);
      return;
    }

    const queryParams: Record<string, string> = {
      district: item.district || '',
      taluka: item.taluka || '',
      village: item.village || '',
      docType: item.recommendedDoc || '7_12'
    };

    if (item.surveyNo) {
      queryParams.surveyNo = item.surveyNo;
    }
    if (item.ownerName) {
      queryParams.ownerName = item.ownerName;
    }

    const queryString = Object.entries(queryParams)
      .filter(([_, v]) => Boolean(v))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const target = `/search/${item.state || selectedState}?${queryString}`;
    navigateTo(router, target);
  };

  const handleExecuteSearch = () => {
    setIsSearchFocused(false);
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }

    const detected = detectQueryState(searchQuery);
    const targetState = detected ? detected.code : selectedState;
    if (detected && detected.code !== selectedState) {
      setSelectedState(detected.code);
    }
    const target = `/search/${targetState}${searchQuery ? `?surveyNo=${encodeURIComponent(searchQuery)}` : ''}`;
    navigateTo(router, target);
  };

  const getPlaceholder = () => {
    switch (activeFilter) {
      case 'Address':
        return `Search any address, city, PIN code across India (e.g. Noida, Wagholi, Cyber City)...`;
      case 'Survey No.':
        return `Search Survey / Gat / Khasra / CTS / Dag across India (e.g. Khasra 492, 142/2A, CTS 1042)...`;
      case 'Owner Name':
        return `Search owner / khatadar / pattadar across India (e.g. Sunil Agrawal, Vikramaditya Shinde)...`;
      case 'Deed No.':
        return `Search deed or mutation (e.g. IGRSUP #8910, Deed #4821, Ferfar 3120)...`;
      case 'Door No.':
        return `Search door, flat or PTIN (e.g. Flat 402, PTIN 10293849)...`;
      default:
        return `Search all 28 states & UTs of India by address, PIN code, survey, owner...`;
    }
  };

  const detectQueryState = (q: string): { code: string; name: string; portal: string } | null => {
    const s = q.toLowerCase();
    if (s.includes('ghaziabad') || s.includes('sahibabad') || s.includes('panchsheel') || s.includes('panchessl') || s.includes('noida') || s.includes('lucknow') || s.includes('kanpur') || s.includes('varanasi') || s.includes('agra') || s.includes('up')) {
      return { code: 'UP', name: 'Uttar Pradesh', portal: 'Bhulekh UP & IGRSUP' };
    }
    if (s.includes('delhi') || s.includes('saket') || s.includes('dwarka') || s.includes('cp') || s.includes('rohini')) {
      return { code: 'DL', name: 'Delhi', portal: 'DORIS & Delhi Bhulekh' };
    }
    if (s.includes('gurgaon') || s.includes('gurugram') || s.includes('faridabad') || s.includes('haryana')) {
      return { code: 'HR', name: 'Haryana', portal: 'Jamabandi Haryana' };
    }
    if (s.includes('bengaluru') || s.includes('bangalore') || s.includes('whitefield') || s.includes('koramangala')) {
      return { code: 'KA', name: 'Karnataka', portal: 'Bhoomi & e-Swathu' };
    }
    if (s.includes('hyderabad') || s.includes('gachibowli') || s.includes('telangana')) {
      return { code: 'TG', name: 'Telangana', portal: 'Dharani Portal & IGRS' };
    }
    if (s.includes('mumbai') || s.includes('pune') || s.includes('thane') || s.includes('wagholi') || s.includes('maharashtra')) {
      return { code: 'MH', name: 'Maharashtra', portal: 'Mahabhumi & IGR' };
    }
    if (s.includes('kolkata') || s.includes('bengal') || s.includes('salt lake')) {
      return { code: 'WB', name: 'West Bengal', portal: 'Banglarbhumi' };
    }
    if (s.includes('jaipur') || s.includes('rajasthan')) {
      return { code: 'RJ', name: 'Rajasthan', portal: 'Apna Khata' };
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Landeed Official Header with Logo & State Selector */}
      <LandeedHeader
        selectedState={selectedState}
        onSelectState={(code) => {
          setSelectedState(code);
          setIsSearchFocused(false);
        }}
        onOpenHelp={() => router.push('/terra')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Hero Box */}
        <View style={styles.searchHeroContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color="#64748b" />
            <TextInput
              testID="home-search-input"
              style={styles.searchInput}
              placeholder={getPlaceholder()}
              placeholderTextColor="#64748B"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (!isSearchFocused) setIsSearchFocused(true);
              }}
              onSubmitEditing={handleExecuteSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearchQuery('')}
              >
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.searchActionBtn}
              onPress={handleExecuteSearch}
              activeOpacity={0.7}
            >
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Quick Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipRow}
          >
            {SEARCH_FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => {
                    setActiveFilter(tab);
                    setIsSearchFocused(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Real-time Address & Property Autocomplete Dropdown */}
          {(isSearchFocused || searchQuery.length > 0) && (
            <View style={styles.autocompleteCard}>
              {/* Dropdown Header */}
              <View style={styles.dropdownHeaderRow}>
                <View style={styles.dropdownTitleWrap}>
                  <Text style={styles.dropdownHeaderTitle}>
                    {searchQuery
                      ? `MATCHING RESULTS (${suggestions.length})`
                      : `POPULAR IN ${currentStateObj.name.toUpperCase()}`}
                  </Text>
                  {loadingSuggestions && (
                    <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 6 }} />
                  )}
                </View>

                {/* "What all can I query" Toggle Button */}
                <TouchableOpacity
                  testID="query-guide-btn"
                  style={styles.queryGuideBtn}
                  onPress={() => setShowQueryGuide(!showQueryGuide)}
                  activeOpacity={0.7}
                >
                  <Info size={12} color="#2563eb" />
                  <Text style={styles.queryGuideBtnText}>What all can I query?</Text>
                  {showQueryGuide ? (
                    <ChevronUp size={12} color="#2563eb" />
                  ) : (
                    <ChevronDown size={12} color="#2563eb" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Collapsible Explainer Card: What All Can It Query */}
              {showQueryGuide && (
                <View style={styles.guideExplanationBox}>
                  <Text style={styles.guideExplanationTitle}>
                    Landeed Universal Registry Search Engine:
                  </Text>
                  <Text style={styles.guideExplanationSub}>
                    Directly query 28+ official state land registries using any of these 5 query types:
                  </Text>

                  {/* 1. Address / Locality */}
                  <View style={styles.guideModeCard}>
                    <View style={[styles.guideIconPill, { backgroundColor: '#2563EB' }]}>
                      <MapPin size={12} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guideModeTitle}>1. Address, Locality & Society</Text>
                      <Text style={styles.guideModeDesc}>
                        Search any colony, village, township, or landmark to resolve revenue hierarchy & document availability.
                      </Text>
                      <View style={styles.guideExampleChips}>
                        {['Noida Sec 62', 'Cyber City Gurugram', 'Whitefield Bengaluru', 'Wagholi Pune', 'Salt Lake Kolkata', 'Gachibowli Hyderabad'].map(
                          (sample) => (
                            <TouchableOpacity
                              key={sample}
                              style={styles.guideSampleChip}
                              onPress={() => {
                                setSearchQuery(sample);
                                setActiveFilter('Address');
                              }}
                            >
                              <Text style={styles.guideSampleChipText}>{sample}</Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    </View>
                  </View>

                  {/* 2. Survey No */}
                  <View style={styles.guideModeCard}>
                    <View style={[styles.guideIconPill, { backgroundColor: '#10B981' }]}>
                      <Compass size={12} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guideModeTitle}>2. Survey No, Gat, Khasra, CTS No</Text>
                      <Text style={styles.guideModeDesc}>
                        Enter cadastral holding number or urban property CTS card to inspect exact boundaries.
                      </Text>
                      <View style={styles.guideExampleChips}>
                        {['Khasra 492/1', '142/2A', 'Survey 204', 'CTS 1042', 'Mustil 42'].map((sample) => (
                          <TouchableOpacity
                            key={sample}
                            style={styles.guideSampleChip}
                            onPress={() => {
                              setSearchQuery(sample);
                              setActiveFilter('Survey No.');
                            }}
                          >
                            <Text style={styles.guideSampleChipText}>{sample}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* 3. Owner Name */}
                  <View style={styles.guideModeCard}>
                    <View style={[styles.guideIconPill, { backgroundColor: '#8B5CF6' }]}>
                      <User size={12} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guideModeTitle}>3. Owner / Khatadar Name</Text>
                      <Text style={styles.guideModeDesc}>
                        Search landholder or farmer name to identify khata accounts and agricultural rights.
                      </Text>
                      <View style={styles.guideExampleChips}>
                        {['Sunil Kumar Agrawal', 'Vikramaditya Shinde', 'Manjunath Gowda'].map((sample) => (
                          <TouchableOpacity
                            key={sample}
                            style={styles.guideSampleChip}
                            onPress={() => {
                              setSearchQuery(sample);
                              setActiveFilter('Owner Name');
                            }}
                          >
                            <Text style={styles.guideSampleChipText}>{sample}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* 4. Deed No */}
                  <View style={styles.guideModeCard}>
                    <View style={[styles.guideIconPill, { backgroundColor: '#F59E0B' }]}>
                      <FileText size={12} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guideModeTitle}>4. Deed No, Ferfar, Mutation No</Text>
                      <Text style={styles.guideModeDesc}>
                        Enter Sub-Registrar registration deed number or village mutation notice.
                      </Text>
                      <View style={styles.guideExampleChips}>
                        {['IGRSUP #8910', 'Deed #4821', 'Ferfar 3120'].map((sample) => (
                          <TouchableOpacity
                            key={sample}
                            style={styles.guideSampleChip}
                            onPress={() => {
                              setSearchQuery(sample);
                              setActiveFilter('Deed No.');
                            }}
                          >
                            <Text style={styles.guideSampleChipText}>{sample}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* 5. Door No */}
                  <View style={styles.guideModeCard}>
                    <View style={[styles.guideIconPill, { backgroundColor: '#06B6D4' }]}>
                      <Home size={12} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guideModeTitle}>5. Door No, Flat, PTIN Property Tax</Text>
                      <Text style={styles.guideModeDesc}>
                        Lookup urban door numbers, apartment units & municipal tax assessment IDs.
                      </Text>
                      <View style={styles.guideExampleChips}>
                        {['Flat 402 Amanora', 'PTIN 10293849'].map((sample) => (
                          <TouchableOpacity
                            key={sample}
                            style={styles.guideSampleChip}
                            onPress={() => {
                              setSearchQuery(sample);
                              setActiveFilter('Door No.');
                            }}
                          >
                            <Text style={styles.guideSampleChipText}>{sample}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Suggestions List */}
              <View style={styles.suggestionsContainer}>
                {suggestions.length === 0 ? (() => {
                  const detected = detectQueryState(searchQuery);
                  const targetStateCode = detected ? detected.code : selectedState;
                  const targetStateName = detected ? detected.name : currentStateObj.name;
                  const targetPortal = detected ? detected.portal : `${currentStateObj.name} Portal`;
                  const isCrossState = detected && detected.code !== selectedState;

                  return (
                    <View style={styles.noResultsBox}>
                      <Text style={styles.noResultsTitle}>
                        {isCrossState
                          ? `📍 Location Detected: ${targetStateName} (${targetPortal})`
                          : `No instant cache record for "${searchQuery}"`}
                      </Text>
                      <Text style={styles.noResultsSubtitle}>
                        {isCrossState
                          ? `"${searchQuery}" is in ${targetStateName}, not ${currentStateObj.name}. Tap below to switch to ${targetStateName} and extract live with TinyFish AI directly from the official ${targetPortal}:`
                          : `This property has not been pre-mined yet. Dispatch TinyFish AI cloud browser to extract it live directly from the ${currentStateObj.name} Government Portal!`}
                      </Text>
                      <TouchableOpacity
                        style={styles.dispatchTinyFishBtn}
                        onPress={() => {
                          setIsSearchFocused(false);
                          if (isCrossState) {
                            setSelectedState(targetStateCode);
                          }
                          const target = `/search/${targetStateCode}?surveyNo=${encodeURIComponent(searchQuery)}`;
                          navigateTo(router, target);
                        }}
                        activeOpacity={0.8}
                      >
                        <Sparkles size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.dispatchTinyFishText}>
                          {isCrossState
                            ? `Switch to ${targetStateName} & Extract Live with TinyFish AI →`
                            : `Extract "${searchQuery}" Live with TinyFish AI →`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })() : (
                  suggestions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      testID={`suggestion-${item.id}`}
                      style={styles.suggestionItemRow}
                      onPress={() => handleSelectSuggestion(item)}
                      activeOpacity={0.75}
                    >
                      {/* Icon Circle by Type */}
                      <View
                        style={[
                          styles.suggestionIconCircle,
                          { backgroundColor: `${item.badgeColor || '#2563EB'}20` }
                        ]}
                      >
                        {item.type === 'address' && (
                          <MapPin size={16} color={item.badgeColor || '#2563EB'} />
                        )}
                        {item.type === 'survey' && (
                          <Compass size={16} color={item.badgeColor || '#059669'} />
                        )}
                        {item.type === 'owner' && (
                          <User size={16} color={item.badgeColor || '#8B5CF6'} />
                        )}
                        {item.type === 'deed' && (
                          <FileText size={16} color={item.badgeColor || '#d97706'} />
                        )}
                        {item.type === 'door' && (
                          <Home size={16} color={item.badgeColor || '#0891b2'} />
                        )}
                      </View>

                      {/* Text Column */}
                      <View style={styles.suggestionTextContainer}>
                        <View style={styles.suggestionHeaderLine}>
                          <Text style={styles.suggestionTitleText} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View
                            style={[
                              styles.categoryBadgePill,
                              { backgroundColor: item.badgeColor || '#2563EB' }
                            ]}
                          >
                            <Text style={styles.categoryBadgeText}>{item.categoryBadge}</Text>
                          </View>
                        </View>

                        <Text style={styles.suggestionSubtitleText} numberOfLines={2}>
                          {item.subtitle}
                        </Text>

                        {/* Owner Attribution if Explicitly Verified */}
                        {item.ownerName && !item.ownerName.toLowerCase().includes('protected') && (
                          <View style={styles.suggestionOwnerRow}>
                            <User size={12} color="#7c3aed" />
                            <Text style={styles.suggestionOwnerText} numberOfLines={1}>
                              Owner: {item.ownerName}
                            </Text>
                          </View>
                        )}

                        {/* Cadastral Record Badge */}
                        {item.recordId && (
                          <View style={styles.certifiedBadgePill}>
                            <CheckCircle2 size={11} color="#059669" />
                            <Text style={styles.certifiedBadgeText}>Cadastral Record Available • Tap to View</Text>
                          </View>
                        )}

                        {/* Available Docs Badges */}
                        <View style={styles.suggestionTagsRow}>
                          <View style={styles.docPill}>
                            <Text style={styles.docPillText}>
                              {item.docTitle || item.recommendedDoc}
                            </Text>
                          </View>
                          <Text style={styles.suggestionStateTag}>
                            {item.stateName} Portal
                          </Text>
                        </View>
                      </View>

                      {/* Right Action Arrow */}
                      <View style={styles.chevronWrapper}>
                        <ChevronRight size={16} color="#2563eb" />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Dropdown Bottom Actions */}
              <View style={styles.dropdownFooterBar}>
                <TouchableOpacity
                  style={styles.footerSubmitAction}
                  onPress={handleExecuteSearch}
                  activeOpacity={0.8}
                >
                  <Text style={styles.footerSubmitActionText}>
                    {searchQuery
                      ? `Query Registry for "${searchQuery}"`
                      : `Query ${currentStateObj.name} Official Registry`}
                  </Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => setIsSearchFocused(false)}
                >
                  <Text style={styles.dismissBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Hero Promotional Banner from APK */}
        <View style={styles.bannerContainer}>
          <TouchableOpacity
            style={styles.bannerTouchable}
            onPress={() => navigateTo(router, `/search/${selectedState}`)}
            activeOpacity={0.85}
          >
            <Image
              source={require('../assets/images/src_images_mh_7_12_bannerremovebgpreview.png')}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerBadge}>
                <Sparkles size={12} color="#059669" />
                <Text style={styles.bannerBadgeText}>OFFICIAL REGISTRY EXTRACTION</Text>
              </View>
              <Text style={styles.bannerTitle}>
                Instant {currentStateObj.name} Land Records
              </Text>
              <Text style={styles.bannerSubtitle}>
                Autonomous TinyFish AI cloud browser query with on-chain cryptographic seal
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Document Services Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              Popular Documents in {currentStateObj.name}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Tap to query {currentStateObj.native} revenue database
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigateTo(router, `/search/${selectedState}`)}
            style={styles.viewAllBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Document Cards Grid */}
        <View style={styles.docGrid}>
          {documents.map((doc) => {
            const targetUrl = `/search/${selectedState}?docType=${doc.id}`;
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.docCard}
                onPress={() => navigateTo(router, targetUrl)}
                activeOpacity={0.75}
              >
                <View style={styles.docCardTop}>
                  <View style={styles.docIconWrapper}>
                    <Image
                      source={doc.icon}
                      style={styles.docIconImage}
                      resizeMode="contain"
                    />
                  </View>
                  {doc.badge && (
                    <View style={[styles.docBadge, { backgroundColor: doc.badgeColor || '#2563EB' }]}>
                      <Text style={styles.docBadgeText}>{doc.badge}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.docTitle} numberOfLines={1}>
                  {doc.name}
                </Text>
                <Text style={styles.docSubtitle} numberOfLines={2}>
                  {doc.subtitle}
                </Text>

                <View style={styles.docCardFooter}>
                  <Text style={styles.docCtaText}>Search Now</Text>
                  <ChevronRight size={13} color="#2563EB" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feature Section: Survey Explorer */}
        <View style={styles.featureCardContainer}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigateTo(router, '/explorer')}
            activeOpacity={0.85}
          >
            <Image
              source={require('../assets/images/src_images_terra_map_banner.png')}
              style={styles.featureBannerImage}
              resizeMode="cover"
            />
            <View style={styles.featureOverlay}>
              <View style={styles.featureHeaderRow}>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>SATELLITE & CADASTRE</Text>
                </View>
              </View>
              <Text style={styles.featureTitle}>Survey Explorer</Text>
              <Text style={styles.featureDesc}>
                Navigate village boundaries, view subdivision layouts, and locate adjacent survey holdings.
              </Text>
              <View style={styles.featureCtaRow}>
                <Text style={styles.featureCtaText}>Launch Explorer</Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Feature Section: Terra AI */}
        <View style={styles.featureCardContainer}>
          <TouchableOpacity
            style={[styles.featureCard, styles.terraCardBorder]}
            onPress={() => navigateTo(router, '/terra')}
            activeOpacity={0.85}
          >
            <Image
              source={require('../assets/images/src_images_terra_intent_banner.png')}
              style={styles.featureBannerImage}
              resizeMode="cover"
            />
            <View style={styles.featureOverlay}>
              <View style={styles.featureHeaderRow}>
                <View style={[styles.featureTag, { backgroundColor: '#7C55FF' }]}>
                  <Sparkles size={11} color="#FFFFFF" />
                  <Text style={styles.featureTagText}>LANDEED AI</Text>
                </View>
              </View>
              <Text style={styles.featureTitle}>Ask Terra AI</Text>
              <Text style={styles.featureDesc}>
                Autonomous property investigation: title disputes, succession laws, and document checklists.
              </Text>
              <View style={styles.featureCtaRow}>
                <Text style={styles.featureCtaText}>Consult Terra AI</Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cryptographic Shield & Deed Vault Quick Link */}
        <View style={styles.shieldBanner}>
          <View style={styles.shieldIconCol}>
            <ShieldCheck size={28} color="#059669" />
          </View>
          <View style={styles.shieldTextCol}>
            <Text style={styles.shieldTitle}>Polygon EVM Title Anchoring</Text>
            <Text style={styles.shieldDesc}>
              Every extract fetched is hashed with SHA-256 and anchored onto the blockchain to prevent document forgery.
            </Text>
            <TouchableOpacity
              style={styles.shieldBtn}
              onPress={() => navigateTo(router, '/verify')}
              activeOpacity={0.7}
            >
              <Text style={styles.shieldBtnText}>Verify On-Chain Title</Text>
              <ChevronRight size={12} color="#059669" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing for LandeedBottomNav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 5-Tab Persistent Landeed Bottom Navigation */}
      <LandeedBottomNav currentTab="search" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fa'
  },
  scrollContent: {
    paddingBottom: 20
  },
  searchHeroContainer: {
    backgroundColor: '#f4f6fa',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    padding: 0
  },
  searchActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterChipRow: {
    flexDirection: 'row',
    paddingTop: 12,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB'
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b'
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16
  },
  bannerTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 140
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    justifyContent: 'center'
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 6
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    maxWidth: '85%'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB'
  },
  docGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between'
  },
  docCard: {
    width: (width - 34) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between'
  },
  docCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  docIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  docIconImage: {
    width: 24,
    height: 24,
    tintColor: '#334155'
  },
  docBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4
  },
  docSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    minHeight: 30,
    marginBottom: 10
  },
  docCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8
  },
  docCtaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB'
  },
  featureCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 14
  },
  featureCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    height: 140,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  terraCardBorder: {
    borderColor: 'rgba(124, 85, 255, 0.4)'
  },
  featureBannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  featureOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: 16,
    justifyContent: 'space-between'
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  featureTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2
  },
  featureDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    maxWidth: '85%'
  },
  featureCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  featureCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  shieldBanner: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 14
  },
  shieldIconCol: {
    paddingTop: 2
  },
  shieldTextCol: {
    flex: 1
  },
  shieldTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4
  },
  shieldDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 8
  },
  shieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  shieldBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669'
  },
  clearSearchBtn: {
    padding: 6
  },
  autocompleteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  dropdownTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dropdownHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5
  },
  queryGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  queryGuideBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb'
  },
  guideExplanationBox: {
    backgroundColor: '#f4f6fa',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  guideExplanationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2
  },
  guideExplanationSub: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10
  },
  guideModeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  guideIconPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  guideModeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a'
  },
  guideModeDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    lineHeight: 14
  },
  guideExampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  guideSampleChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  guideSampleChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb'
  },
  suggestionsContainer: {
    maxHeight: 320
  },
  noResultsBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  noResultsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 4
  },
  noResultsSubtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 12
  },
  dispatchTinyFishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  dispatchTinyFishText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a'
  },
  suggestionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10
  },
  suggestionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  suggestionTextContainer: {
    flex: 1
  },
  suggestionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6
  },
  suggestionTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1
  },
  categoryBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase'
  },
  suggestionSubtitleText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 14
  },
  suggestionOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  suggestionOwnerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed'
  },
  certifiedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    marginTop: 4,
    alignSelf: 'flex-start'
  },
  certifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669'
  },
  suggestionTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  docPill: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)'
  },
  docPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb'
  },
  suggestionStateTag: {
    fontSize: 10,
    color: '#64748B'
  },
  chevronWrapper: {
    paddingLeft: 4
  },
  dropdownFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f4f6fa',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10
  },
  footerSubmitAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8
  },
  footerSubmitActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  dismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  dismissBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  }
});
