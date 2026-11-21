import { authStorage } from '../../utils/authStorage';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bot, ShieldCheck, ChevronRight, Check, ArrowLeft, Sparkles, GitCommit, FileText, AlertCircle, History, Clock, FileCheck, Building } from 'lucide-react-native';
import { API_BASE_URL } from '../../constants/api';
import { TinyFishStatusModal } from '../../components/TinyFishStatusModal';
import { JobStreamStatusModal } from '../../components/JobStreamStatusModal';
import { useJobStream } from '../../hooks/useJobStream';
import { LandeedBottomNav } from '../../components/LandeedBottomNav';
import { LocationDropdownSelector } from '../../components/LocationDropdownSelector';
import { navigateTo } from '../../utils/navigation';

interface DocTypeOption {
  id: string;
  name: string;
  desc: string;
}

const STATE_CONFIGS: Record<string, { name: string; native: string; portal: string; docs: DocTypeOption[] }> = {
  MH: {
    name: 'Maharashtra',
    native: 'महाराष्ट्र',
    portal: 'Aapleabhilekh / Mahabhumi & MCGM Portal',
    docs: [
      { id: '7_12', name: '7/12 & 8A Extract', desc: 'Satbara land rights & crop inspection' },
      { id: 'MUTATION', name: 'Ferfar / Mutation', desc: 'Title transfer & succession notice' },
      { id: 'INDEX_2', name: 'IGR Index-II', desc: 'Registered deed abstract' },
      { id: 'BMC_TAX', name: 'BMC Property Tax', desc: 'Municipal assessment & SAC number ledger' },
      { id: 'CTS_MAP', name: 'CTS & City Survey', desc: 'Cadastral maps & urban property cards' },
      { id: 'AAPLI_CHAWADI', name: 'Aapli Chawadi', desc: 'Pending mutation notices & village appeals' }
    ]
  },
  TG: {
    name: 'Telangana',
    native: 'తెలంగాణ',
    portal: 'Dharani Portal & IGRS Telangana',
    docs: [
      { id: 'EC', name: 'Encumbrance Certificate (EC)', desc: 'Registered mortgage & deed search' },
      { id: 'PASSBOOK', name: 'Pattadar Passbook', desc: 'Agricultural land ownership title' },
      { id: 'PTIN', name: 'CDMA Property Tax', desc: 'Urban assessment & door number' }
    ]
  },
  KA: {
    name: 'Karnataka',
    native: 'ಕರ್ನಾಟಕ',
    portal: 'Bhoomi & e-Swathu Karnataka',
    docs: [
      { id: 'RTC', name: 'RTC / Pahani (Bhoomi)', desc: 'Tenancy & crop survey record' },
      { id: 'FORM_9_11', name: 'e-Swathu Form 9/11', desc: 'Panchayat property register' },
      { id: 'KHATA', name: 'BBMP Khata Certificate', desc: 'Bengaluru city property ledger' }
    ]
  },
  AP: {
    name: 'Andhra Pradesh',
    native: 'ఆంధ్ర ప్రదేశ్',
    portal: 'Meebhoomi & AP IGRS',
    docs: [
      { id: 'ADANGAL', name: 'Adangal / Pahani', desc: 'Village land record extract' },
      { id: 'ROR_1B', name: '1-B ROR Register', desc: 'Surveyed ownership holding' },
      { id: 'EC', name: 'Encumbrance Certificate', desc: 'Sub-registrar registered deeds' }
    ]
  },
  GJ: {
    name: 'Gujarat',
    native: 'ગુજરાત',
    portal: 'AnyRoR & e-Milkat Gujarat',
    docs: [
      { id: '7_12', name: 'AnyRoR 7/12 & 8A', desc: 'Rural land record inspection' },
      { id: 'VF6', name: 'Village Form 6', desc: 'Mutation entry diary' }
    ]
  },
  TN: {
    name: 'Tamil Nadu',
    native: 'தமிழ்நாடு',
    portal: 'e-Services TN Nilamagal',
    docs: [
      { id: 'PATTA_CHITTA', name: 'Patta & Chitta', desc: 'Revenue record & ownership certificate' },
      { id: 'TSLR', name: 'TSLR Extract', desc: 'Town survey land register' }
    ]
  },
  UP: {
    name: 'Uttar Pradesh',
    native: 'उत्तर प्रदेश',
    portal: 'Bhulekh UP & IGRSUP Portal',
    docs: [
      { id: 'KHATAUNI', name: 'Bhulekh Khatauni (ROR)', desc: 'Official UP revenue ownership & khasra plot record' },
      { id: 'REGISTRY_DEED', name: 'IGRSUP Registered Deed', desc: '13-year certified registry & sale agreement' },
      { id: 'BHU_NAKSHA', name: 'Bhu-Naksha Cadastral Map', desc: 'Geo-referenced parcel boundaries & map dimensions' }
    ]
  },
  DL: {
    name: 'Delhi',
    native: 'दिल्ली',
    portal: 'DORIS / Delhi Bhulekh / DDA',
    docs: [
      { id: 'DORIS_REGISTRY', name: 'DORIS Registered Deed', desc: 'Delhi Online Registration Information System extract' },
      { id: 'DELHI_BHULEKH', name: 'Delhi Bhulekh (Khasra Girdawari)', desc: 'Revenue department khasra & jamabandi register' },
      { id: 'DDA_CONVERSION', name: 'DDA Leasehold to Freehold', desc: 'Delhi Development Authority property conversion' }
    ]
  },
  HR: {
    name: 'Haryana',
    native: 'हरियाणा',
    portal: 'Jamabandi Haryana & Web-HALRIS',
    docs: [
      { id: 'JAMABANDI_NAKAL', name: 'Nakal Jamabandi (RoR)', desc: 'Haryana Web-HALRIS official land ownership title' },
      { id: 'INTEQAL', name: 'Mutation (Inteqal) Status', desc: 'Succession & deed mutation sanction orders' },
      { id: 'DEED_REGISTRATION', name: 'Registered Deed Extract', desc: 'Sub-Registrar certified deed copy & encumbrance' }
    ]
  },
  RJ: {
    name: 'Rajasthan',
    native: 'राजस्थान',
    portal: 'Apna Khata (e-Dharti) & e-Panjiyan',
    docs: [
      { id: 'APNA_KHATA', name: 'Jamabandi Nakal (e-Dharti)', desc: 'Official Rajasthan Apna Khata land rights certificate' },
      { id: 'NAMANTARAN', name: 'Namantaran (Mutation) Copy', desc: 'Tehsil mutation entry & transfer of rights' },
      { id: 'E_PANJIYAN', name: 'e-Panjiyan Registered Deed', desc: 'Registration & stamps department registry search' }
    ]
  },
  MP: {
    name: 'Madhya Pradesh',
    native: 'मध्य प्रदेश',
    portal: 'MP Bhulekh & MPIGRS Portal',
    docs: [
      { id: 'KHASRA_P2', name: 'Khasra (Form P-II)', desc: 'Madhya Pradesh Bhulekh land survey & area details' },
      { id: 'KHATAUNI_B1', name: 'B-1 Khatauni Kishtbandi', desc: 'Consolidated land holding & revenue tax assessment' },
      { id: 'MP_BHU_NAKSHA', name: 'Bhu-Naksha Cadastral Map', desc: 'Digital village parcel map & geometry' }
    ]
  },
  WB: {
    name: 'West Bengal',
    native: 'পশ্চিমবঙ্গ',
    portal: 'Banglarbhumi Portal',
    docs: [
      { id: 'ROR_KHATIAN', name: 'Banglarbhumi ROR (Khatian)', desc: 'West Bengal land reforms official ownership title' },
      { id: 'PLOT_INFO', name: 'Plot Information (Dag No.)', desc: 'Classification, share ratio & mapped area' },
      { id: 'WARISHAN', name: 'Warishan & Mutation', desc: 'Legal heirship succession certificate & mutation' }
    ]
  },
  PB: {
    name: 'Punjab',
    native: 'ਪੰਜਾਬ',
    portal: 'PLRS Jamabandi & NGDRS Punjab',
    docs: [
      { id: 'FARD_JAMABANDI', name: 'Fard Jamabandi Nakal', desc: 'Punjab Land Records Society (PLRS) official RoR' },
      { id: 'ROZNAMCHA', name: 'Roznamcha Waqiati', desc: 'Daily revenue diary entries by Patwari' },
      { id: 'MUTATION_SANCTION', name: 'Mutation (Inteqal) Sanction', desc: 'Tehsil revenue court title approval order' }
    ]
  },
  BR: {
    name: 'Bihar',
    native: 'बिहार',
    portal: 'Bihar Bhumi & Bhumi Jankari',
    docs: [
      { id: 'DAKHIL_KHARIJ', name: 'Dakhil Kharij (Mutation) Status', desc: 'Bihar Bhumi online mutation status & rejection/order' },
      { id: 'JAMABANDI_PANJI', name: 'Jamabandi Panji Part-II', desc: 'Khesra details, holding number & lagan dues' },
      { id: 'LPC_CERTIFICATE', name: 'Land Possession Certificate (LPC)', desc: 'Official ownership possession certificate' }
    ]
  },
  KL: {
    name: 'Kerala',
    native: 'കേരളം',
    portal: 'e-Rekha & PEARL Portal',
    docs: [
      { id: 'FMB_SKETCH', name: 'e-Rekha FMB Sketch', desc: 'Kerala Survey Field Measurement Book boundary' },
      { id: 'SETTLEMENT_ROR', name: 'Settlement Register (RoR)', desc: 'Thandaper number & pattadar ownership details' },
      { id: 'KL_EC', name: 'PEARL Encumbrance Certificate', desc: 'Sub-Registrar registered deed liabilities' }
    ]
  },
  OD: {
    name: 'Odisha',
    native: 'ଓଡ଼ିଶା',
    portal: 'Bhulekh Odisha & e-Registration',
    docs: [
      { id: 'BHULEKH_ODISHA', name: 'Bhulekh Odisha RoR', desc: 'Revenue record of rights with tenant & plot details' },
      { id: 'BHU_NAKSHA_OD', name: 'Bhu-Naksha Cadastral Map', desc: 'High precision satellite & boundary polygon' }
    ]
  },
  JH: {
    name: 'Jharkhand',
    native: 'झारखंड',
    portal: 'Jharbhoomi & NGDRS Jharkhand',
    docs: [
      { id: 'KHATIAN_JH', name: 'Jharbhoomi Khatian Extract', desc: 'Jharkhand official land survey record' },
      { id: 'REGISTER_II', name: 'Register-II Dakhil Kharij', desc: 'Tenant account ledger & mutation diary' }
    ]
  },
  CG: {
    name: 'Chhattisgarh',
    native: 'छत्तीसगढ़',
    portal: 'Bhuiyan CG Portal',
    docs: [
      { id: 'BHUIYAN_B1', name: 'B-1 Khasra Kishtbandi', desc: 'Chhattisgarh Bhuiyan certified land record' },
      { id: 'BHUIYAN_P2', name: 'P-II Khasra Panchshala', desc: '5-year crop cultivation and rights ledger' }
    ]
  },
  GA: {
    name: 'Goa',
    native: 'गोंय',
    portal: 'Directorate of Settlement & Land Records',
    docs: [
      { id: 'FORM_1_14', name: 'Form I & XIV Extract', desc: 'Goa Directorate of Land Records official title' },
      { id: 'FORM_D_CITY', name: 'Form D (City Survey)', desc: 'Urban property card for municipal towns' }
    ]
  },
  UK: {
    name: 'Uttarakhand',
    native: 'उत्तराखंड',
    portal: 'Devbhoomi Uttarakhand Portal',
    docs: [
      { id: 'DEV_BHULEKH', name: 'Devbhoomi RoR Khatoni 1-A', desc: 'Uttarakhand digital revenue register' }
    ]
  },
  HP: {
    name: 'Himachal Pradesh',
    native: 'हिमाचल प्रदेश',
    portal: 'Himbhoomi Portal',
    docs: [
      { id: 'HIM_JAMABANDI', name: 'Himbhoomi Jamabandi Nakal', desc: 'Himachal Pradesh digital RoR & Shajra Nasab' }
    ]
  },
  JK: {
    name: 'Jammu & Kashmir',
    native: 'جموں و کشمیر',
    portal: 'LRIS (Aapki Zameen Aapki Nigrani)',
    docs: [
      { id: 'JK_JAMABANDI', name: 'LRIS Digital Jamabandi', desc: 'Aapki Zameen Aapki Nigrani revenue title record' }
    ]
  },
  AS: {
    name: 'Assam',
    native: 'অসম',
    portal: 'Dharitree & ILRMS Portal',
    docs: [
      { id: 'DHARITREE_JAMABANDI', name: 'Dharitree Jamabandi Copy', desc: 'Assam ILRMS integrated land record management' }
    ]
  }
};

export default function StateSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const stateCode = (params.state as string)?.toUpperCase() || 'MH';
  const config = STATE_CONFIGS[stateCode] || STATE_CONFIGS.MH;

  const initialDoc = (params.docType as string) || config.docs[0].id;
  const [selectedDoc, setSelectedDoc] = useState(initialDoc);

  // Track initial hydration from URL params
  const pendingParamsRef = useRef<{
    district?: string;
    taluka?: string;
    village?: string;
  }>({
    district: (params.district as string) || undefined,
    taluka: (params.taluka as string) || undefined,
    village: (params.village as string) || undefined,
  });

  const paramDistrict = (params.district as string) || '';
  const paramTaluka = (params.taluka as string) || '';
  const paramVillage = (params.village as string) || '';
  const paramSurvey = (params.surveyNo as string) || '142/2A';
  const paramOwner = (params.ownerName as string) || '';

  const [district, setDistrict] = useState(paramDistrict);
  const [taluka, setTaluka] = useState(paramTaluka);
  const [village, setVillage] = useState(paramVillage);
  const [surveyNo, setSurveyNo] = useState(paramSurvey);
  const [khataNo, setKhataNo] = useState('');
  const [ownerName, setOwnerName] = useState(paramOwner);

  // Sync state when route params change (e.g. from deep link CTA)
  const lastParamSignatureRef = useRef<string>(
    `${params.district || ''}|${params.taluka || ''}|${params.village || ''}|${params.docType || ''}`
  );

  useEffect(() => {
    const currentSignature = `${params.district || ''}|${params.taluka || ''}|${params.village || ''}|${params.docType || ''}`;
    if (currentSignature !== lastParamSignatureRef.current) {
      lastParamSignatureRef.current = currentSignature;
      if (params.district || params.taluka || params.village) {
        pendingParamsRef.current = {
          district: (params.district as string) || undefined,
          taluka: (params.taluka as string) || undefined,
          village: (params.village as string) || undefined,
        };
      }
      if (params.docType && typeof params.docType === 'string') {
        setSelectedDoc(params.docType);
      }
      if (params.district && typeof params.district === 'string') {
        setDistrict(params.district);
      }
      if (params.taluka && typeof params.taluka === 'string') {
        setTaluka(params.taluka);
      }
      if (params.village && typeof params.village === 'string') {
        setVillage(params.village);
      }
      if (params.surveyNo && typeof params.surveyNo === 'string') {
        setSurveyNo(params.surveyNo);
      }
      if (params.ownerName && typeof params.ownerName === 'string') {
        setOwnerName(params.ownerName);
      }
    }
  }, [params.docType, params.district, params.taluka, params.village, params.surveyNo, params.ownerName]);

  // Auto-fetch trigger hook for 1-click deep linking
  const autoFetch = params.autoFetch === 'true' || (params.autoFetch as unknown as boolean) === true;
  const hasAutoFetchedRef = useRef(false);

  useEffect(() => {
    if (autoFetch && !hasAutoFetchedRef.current) {
      hasAutoFetchedRef.current = true;
      const timer = setTimeout(() => {
        handleFetchRecord();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoFetch]);

  // BMC Property Tax Specific States
  const isBmcTax = selectedDoc === 'BMC_TAX' || selectedDoc === 'PTIN';
  const [sacNo, setSacNo] = useState('HW1305620200003');
  const [wardName, setWardName] = useState('H-West (Bandra / Khar West)');
  const [buildingFlat, setBuildingFlat] = useState('Flat 402, 4th Floor, Silver Oak CHS');

  // Mutation Specific States
  const isMutation = selectedDoc === 'MUTATION' || selectedDoc === 'VF6' || selectedDoc === 'INTEQAL' || selectedDoc === 'NAMANTARAN' || selectedDoc === 'DAKHIL_KHARIJ';
  const [mutationMode, setMutationMode] = useState<'survey' | 'ferfar'>('ferfar');
  const [ferfarNo, setFerfarNo] = useState('4821');
  const [mutationType, setMutationType] = useState('Registered Sale Deed');

  // IGR Index-II Specific States
  const isIndex2 = selectedDoc === 'INDEX_2' || selectedDoc === 'REGISTRY_DEED' || selectedDoc === 'E_PANJIYAN' || selectedDoc === 'DORIS_REGISTRY' || selectedDoc === 'DEED_REGISTRATION';
  const [index2Mode, setIndex2Mode] = useState<'deed' | 'property'>('deed');
  const [deedNo, setDeedNo] = useState('4821');
  const [regYear, setRegYear] = useState('2024');
  const [sroOffice, setSroOffice] = useState('Sub-Registrar Haveli-3 (Pune)');

  // Aapli Chawadi & CTS Specific States
  const isAapliChawadi = selectedDoc === 'AAPLI_CHAWADI';
  const isCtsMap = selectedDoc === 'CTS_MAP' || selectedDoc === 'BHU_NAKSHA' || selectedDoc === 'TSLR' || selectedDoc === 'MP_BHU_NAKSHA';
  const [ctsNo, setCtsNo] = useState('CTS 1042');

  // Real-Time Job Stream Hook & Modal State
  const {
    jobId: streamJobId,
    ticketId: streamTicketId,
    status: streamStatus,
    percent: streamPercent,
    milestones: streamMilestones,
    currentStepMessage: streamStepMessage,
    isDegraded: streamIsDegraded,
    degradationReason: streamDegradationReason,
    degradationNotice: streamDegradationNotice,
    dataProvenance: streamDataProvenance,
    isLive: streamIsLive,
    serverTimestamp: streamServerTimestamp,
    recordId: streamRecordId,
    error: streamError,
    transport: streamTransport,
    startStream,
    reset: resetStream
  } = useJobStream();

  const [streamModalVisible, setStreamModalVisible] = useState(false);

  // Auto-navigate to record viewer once job is completed or degraded fallback resolves
  useEffect(() => {
    if (streamRecordId && (streamStatus === 'completed' || streamStatus === 'degraded_fallback' || streamPercent === 100)) {
      const timer = setTimeout(() => {
        setStreamModalVisible(false);
        const resolvedProvenance = streamDataProvenance || (streamIsDegraded ? 'VERIFIED_PRESEEDED_CACHE' : 'LIVE_PORTAL');
        const queryParams = [
          `isDegraded=${streamIsDegraded ? 'true' : 'false'}`,
          `degradationReason=${encodeURIComponent(streamDegradationNotice || streamDegradationReason || '')}`,
          `ticketId=${encodeURIComponent(streamTicketId || '')}`,
          `dataProvenance=${encodeURIComponent(resolvedProvenance)}`
        ].join('&');
        navigateTo(router, `/record/${streamRecordId}?${queryParams}`);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [streamRecordId, streamStatus, streamPercent, streamIsDegraded, streamDegradationNotice, streamDegradationReason, streamTicketId, streamDataProvenance]);

  // Dropdown options loaded from server
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [talukasList, setTalukasList] = useState<string[]>([]);
  const [villagesList, setVillagesList] = useState<string[]>([]);

  // Loading states for async dropdown fetches
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingTalukas, setIsLoadingTalukas] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false);

  // Agent Progress Modal state
  const [loading, setLoading] = useState(false);
  const [agentSteps, setAgentSteps] = useState<any[]>([]);

  // 1. Fetch Districts when stateCode changes
  useEffect(() => {
    setIsLoadingDistricts(true);
    fetch(`${API_BASE_URL}/districts?state=${stateCode}`)
      .then((res) => res.json())
      .then((data) => {
        setIsLoadingDistricts(false);
        const list: string[] = data.districts || [];
        setDistrictsList(list);

        const targetDistrict = pendingParamsRef.current.district || district;
        const matched = list.find(
          (d: string) => d.toLowerCase() === targetDistrict?.toLowerCase()
        );
        const chosen = matched || list[0] || '';
        setDistrict(chosen);

        // If pending district wasn't in list, clear child pending params
        if (!matched) {
          pendingParamsRef.current.taluka = undefined;
          pendingParamsRef.current.village = undefined;
        }
      })
      .catch(() => {
        setIsLoadingDistricts(false);
        const fallback = ['Pune', 'Haveli Division', 'Central District'];
        setDistrictsList(fallback);
        setDistrict(fallback[0]);
      });
  }, [stateCode]);

  // 2. Fetch Talukas when district changes
  useEffect(() => {
    if (!district) {
      setTalukasList([]);
      setTaluka('');
      return;
    }

    setIsLoadingTalukas(true);
    fetch(`${API_BASE_URL}/talukas?state=${stateCode}&district=${encodeURIComponent(district)}`)
      .then((res) => res.json())
      .then((data) => {
        setIsLoadingTalukas(false);
        const list: string[] = data.talukas || [];
        setTalukasList(list);

        const targetTaluka = pendingParamsRef.current.taluka || taluka;
        const matched = list.find(
          (t: string) => t.toLowerCase() === targetTaluka?.toLowerCase()
        );
        const chosen = matched || list[0] || '';
        setTaluka(chosen);

        // If pending taluka wasn't in list, clear village pending param
        if (!matched) {
          pendingParamsRef.current.village = undefined;
        }
      })
      .catch(() => {
        setIsLoadingTalukas(false);
        const fallback = ['Haveli', 'Mulshi'];
        setTalukasList(fallback);
        setTaluka(fallback[0]);
      });
  }, [stateCode, district]);

  // 3. Fetch Villages when taluka changes
  useEffect(() => {
    if (!district || !taluka) {
      setVillagesList([]);
      setVillage('');
      return;
    }

    setIsLoadingVillages(true);
    fetch(
      `${API_BASE_URL}/villages?state=${stateCode}&district=${encodeURIComponent(district)}&taluka=${encodeURIComponent(taluka)}`
    )
      .then((res) => res.json())
      .then((data) => {
        setIsLoadingVillages(false);
        const list: string[] = data.villages || [];
        setVillagesList(list);

        const targetVillage = pendingParamsRef.current.village || village;
        const matched = list.find(
          (v: string) => v.toLowerCase() === targetVillage?.toLowerCase()
        );
        const chosen = matched || list[0] || '';
        setVillage(chosen);

        // Hydration cycle completed: clear pending params so manual selections cascade fresh
        pendingParamsRef.current = {};
      })
      .catch(() => {
        setIsLoadingVillages(false);
        const fallback = ['Wagholi', 'Hinjawadi', 'Kharadi'];
        setVillagesList(fallback);
        setVillage(fallback[0]);
        pendingParamsRef.current = {};
      });
  }, [stateCode, district, taluka]);

  // Interactive user selection handlers with cascading reset
  const handleSelectDistrict = (newDistrict: string) => {
    if (newDistrict === district) return;
    pendingParamsRef.current = {};
    setDistrict(newDistrict);
    setTaluka('');
    setVillage('');
    setTalukasList([]);
    setVillagesList([]);
  };

  const handleSelectTaluka = (newTaluka: string) => {
    if (newTaluka === taluka) return;
    pendingParamsRef.current = {};
    setTaluka(newTaluka);
    setVillage('');
    setVillagesList([]);
  };

  const handleSelectVillage = (newVillage: string) => {
    pendingParamsRef.current = {};
    setVillage(newVillage);
  };

  const handleFetchRecord = async () => {
    const activeDistrict = district || (params.district as string) || '';
    const activeTaluka = taluka || (params.taluka as string) || '';
    const activeVillage = village || (params.village as string) || '';
    const activeSurvey = surveyNo || (params.surveyNo as string) || '142/2A';
    const activeDoc = selectedDoc || (params.docType as string) || config.docs[0].id;
    const activeOwner = ownerName || (params.ownerName as string) || '';

    if (isBmcTax) {
      if (!sacNo.trim()) {
        Alert.alert('SAC Number Required', 'Please enter a 15-character BMC Property Account Number (SAC).');
        return;
      }
    } else if (isIndex2 && index2Mode === 'deed') {
      if (!deedNo.trim()) {
        Alert.alert('Deed Number Required', 'Please enter a Sub-Registrar Document Registration Number.');
        return;
      }
    } else if (isMutation && mutationMode === 'ferfar') {
      if (!ferfarNo.trim()) {
        Alert.alert('Ferfar Number Required', 'Please enter a Ferfar or Mutation Number to inspect the Village Form 6 notice.');
        return;
      }
    } else if (isAapliChawadi) {
      if (!ferfarNo.trim() && !activeSurvey.trim()) {
        Alert.alert('Notice or Survey Required', 'Please enter a Ferfar Notice Number or Survey/Gat Number for Aapli Chawadi.');
        return;
      }
    } else if (isCtsMap) {
      if (!ctsNo.trim() && !activeSurvey.trim()) {
        Alert.alert('CTS Number Required', 'Please enter a City Survey Number (CTS) or Cadastral Parcel ID.');
        return;
      }
    } else {
      if (!activeSurvey.trim()) {
        Alert.alert('Survey Number Required', 'Please enter a Survey Number or Khasra Number to query the registry.');
        return;
      }
    }

    resetStream();
    setStreamModalVisible(true);
    setLoading(true);

    const payload = {
      state: stateCode,
      docType: activeDoc,
      district: isBmcTax ? 'Mumbai Suburban' : activeDistrict,
      taluka: isBmcTax ? 'Bandra' : activeTaluka,
      village: isBmcTax ? 'Bandra West' : activeVillage,
      surveyNo: isBmcTax ? sacNo : (isCtsMap ? (ctsNo || activeSurvey) : activeSurvey),
      sacNo: isBmcTax ? sacNo : undefined,
      doorNo: isBmcTax ? buildingFlat : undefined,
      ward: isBmcTax ? wardName : undefined,
      ctsNo: isCtsMap ? (ctsNo || activeSurvey) : undefined,
      khataNo,
      ownerName: activeOwner,
      ferfarNo: (isMutation || isAapliChawadi) ? ferfarNo : undefined,
      mutationMode: isMutation ? mutationMode : undefined,
      mutationType: isMutation ? mutationType : undefined,
      deedNo: isIndex2 ? deedNo : undefined,
      regYear: isIndex2 ? regYear : undefined,
      sroOffice: isIndex2 ? sroOffice : undefined
    };

    try {
      // 1. Primary: Async Query Ingestion (HTTP 202 Accepted)
      const authToken = await authStorage.getToken().catch(() => null);
      const response = await fetch(`${API_BASE_URL}/records/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify(payload)
      });

      if (response.status === 202) {
        const jobData = await response.json();
        if (jobData && jobData.jobId) {
          startStream(jobData.jobId, jobData.ticketId, jobData.streamUrl);
          return;
        }
      }

      // Backward compatibility if server returns synchronous 200/201
      const data = await response.json();
      if (data.success && data.recordId) {
        setTimeout(() => {
          setStreamModalVisible(false);
          setLoading(false);
          navigateTo(router, `/record/${data.recordId}`);
        }, 1200);
      } else {
        setStreamModalVisible(false);
        setLoading(false);
        Alert.alert('Fetch Failed', data.error || 'Failed to retrieve record from registry.');
      }
    } catch (err: any) {
      console.warn('[search] Primary async jobs endpoint failed; attempting /records/fetch fallback...', err);
      try {
        const fallbackRes = await fetch(`${API_BASE_URL}/records/fetch?async=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (fallbackRes.status === 202) {
          const fallbackJob = await fallbackRes.json();
          if (fallbackJob && fallbackJob.jobId) {
            startStream(fallbackJob.jobId, fallbackJob.ticketId, fallbackJob.streamUrl);
            return;
          }
        }

        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.recordId) {
          setTimeout(() => {
            setStreamModalVisible(false);
            setLoading(false);
            navigateTo(router, `/record/${fallbackData.recordId}`);
          }, 1200);
        } else {
          setStreamModalVisible(false);
          setLoading(false);
          Alert.alert('Fetch Failed', fallbackData.error || 'Could not fetch record from registry.');
        }
      } catch (fallbackErr: any) {
        setStreamModalVisible(false);
        setLoading(false);
        Alert.alert('Connection Error', 'Could not connect to Landeed backend service.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top App Header with Back Button */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigateTo(router, '/')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.topNavTitle}>Query Land Registry</Text>
          <Text style={styles.topNavSubtitle}>{config.name} • {config.portal}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <JobStreamStatusModal
          visible={streamModalVisible}
          ticketId={streamTicketId || undefined}
          featureName={config.docs.find((d) => d.id === selectedDoc)?.name || selectedDoc}
          status={streamStatus}
          percent={streamPercent}
          milestones={streamMilestones}
          currentStepMessage={streamStepMessage}
          isDegraded={streamIsDegraded}
          degradationReason={streamDegradationReason}
          degradationNotice={streamDegradationNotice}
          dataProvenance={streamDataProvenance}
          isLive={streamIsLive}
          serverTimestamp={streamServerTimestamp}
          recordId={streamRecordId}
          error={streamError}
          transport={streamTransport}
          onClose={() => {
            setStreamModalVisible(false);
            setLoading(false);
            resetStream();
          }}
          onViewRecord={() => {
            if (streamRecordId) {
              setStreamModalVisible(false);
              setLoading(false);
              const resolvedProvenance = streamDataProvenance || (streamIsDegraded ? 'VERIFIED_PRESEEDED_CACHE' : 'LIVE_PORTAL');
              const queryParams = [
                `isDegraded=${streamIsDegraded ? 'true' : 'false'}`,
                `degradationReason=${encodeURIComponent(streamDegradationNotice || streamDegradationReason || '')}`,
                `ticketId=${encodeURIComponent(streamTicketId || '')}`,
                `dataProvenance=${encodeURIComponent(resolvedProvenance)}`
              ].join('&');
              navigateTo(router, `/record/${streamRecordId}?${queryParams}`);
            }
          }}
        />

        {/* State Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.stateTitle}>{config.name}</Text>
            <Text style={styles.nativeTitle}>{config.native}</Text>
          </View>
          <Text style={styles.portalSubtitle}>Connected to: {config.portal}</Text>
        </View>

        {/* Document Type Selector */}
        <Text style={styles.sectionHeading}>Select Document Type</Text>
        <View style={styles.docList}>
          {config.docs.map((doc) => {
            const isSelected = selectedDoc === doc.id;
            return (
              <TouchableOpacity
                key={doc.id}
                style={[styles.docCard, isSelected && styles.docCardSelected]}
                onPress={() => setSelectedDoc(doc.id)}
                activeOpacity={0.75}
              >
                <View style={styles.docCardLeft}>
                  <View style={[styles.docCheckbox, isSelected && styles.docCheckboxSelected]}>
                    {isSelected && <Check size={14} color="#ffffff" />}
                  </View>
                  <View>
                    <Text style={[styles.docName, isSelected && styles.docNameSelected]}>{doc.name}</Text>
                    <Text style={styles.docDesc}>{doc.desc}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Location Hierarchy Selectors */}
        <Text style={styles.sectionHeading}>Administrative Location</Text>

        <LocationDropdownSelector
          label="District"
          placeholder="Select district"
          selectedValue={district}
          options={districtsList}
          loading={isLoadingDistricts}
          disabled={isLoadingDistricts || districtsList.length === 0}
          testID="district-selector"
          onSelect={handleSelectDistrict}
          contextSubtitle={`${config.name} (${stateCode})`}
        />

        <LocationDropdownSelector
          label="Taluka / Mandal / Tehsil"
          placeholder={district ? "Select taluka / mandal / tehsil" : "Select district first"}
          selectedValue={taluka}
          options={talukasList}
          loading={isLoadingTalukas}
          disabled={!district || isLoadingTalukas || talukasList.length === 0}
          testID="taluka-selector"
          onSelect={handleSelectTaluka}
          contextSubtitle={district ? `Talukas in ${district}` : undefined}
        />

        <LocationDropdownSelector
          label="Village / Mauje"
          placeholder={taluka ? "Select village / mauje" : "Select taluka first"}
          selectedValue={village}
          options={villagesList}
          loading={isLoadingVillages}
          disabled={!taluka || isLoadingVillages || villagesList.length === 0}
          testID="village-selector"
          onSelect={handleSelectVillage}
          contextSubtitle={taluka ? `Villages in ${taluka}` : undefined}
        />

        {/* Property, Mutation, BMC Tax or Index-II Deed Identification */}
        {isBmcTax ? (
          <View style={styles.mutationSearchContainer}>
            {/* BMC Property Tax Banner */}
            <View style={[styles.mutationNoticeBanner, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
              <View style={styles.bannerHeaderRow}>
                <Building size={18} color="#EF4444" />
                <Text style={[styles.bannerTitle, { color: '#dc2626' }]}>BMC Property Tax (मालमत्ता कर) • SAC Ledger Audit</Text>
              </View>
              <Text style={styles.bannerText}>
                Under Section 212 of the Mumbai Municipal Corporation (MMC) Act, unpaid property tax is a first statutory charge on the property. BMC audits also detect unapproved construction (Section 267A) and unassessed balconies.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BMC Property Account No. (SAC Number) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. HW1305620200003"
                placeholderTextColor="#64748b"
                value={sacNo}
                onChangeText={setSacNo}
                autoCapitalize="characters"
              />
              {/* Quick sample chips */}
              <View style={styles.quickSamplesRow}>
                <Text style={styles.quickSamplesLabel}>Live Sample:</Text>
                <TouchableOpacity
                  style={[styles.sampleChip, styles.sampleChipActive]}
                  onPress={() => {
                    setSacNo('HW1305620200003');
                    setWardName('H-West (Bandra / Khar West)');
                    setBuildingFlat('Flat 402, Silver Oak CHS');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sampleChipText, styles.sampleChipTextActive]}>
                    HW1305620200003 (Bandra W - Flat 402)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Municipal Ward</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. H-West (Bandra / Khar)"
                placeholderTextColor="#64748b"
                value={wardName}
                onChangeText={setWardName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Building & Flat / Unit Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Flat 402, Silver Oak CHS"
                placeholderTextColor="#64748b"
                value={buildingFlat}
                onChangeText={setBuildingFlat}
              />
            </View>
          </View>
        ) : isIndex2 ? (
          <View style={styles.mutationSearchContainer}>
            {/* Sec 55 Registration Act Explainer Banner */}
            <View style={[styles.mutationNoticeBanner, { borderColor: 'rgba(139, 92, 246, 0.3)', backgroundColor: 'rgba(139, 92, 246, 0.08)' }]}>
              <View style={styles.bannerHeaderRow}>
                <FileCheck size={18} color="#7c3aed" />
                <Text style={[styles.bannerTitle, { color: '#9333ea' }]}>IGR Index-II (सूची क्र. २) • Registered Deed Extract</Text>
              </View>
              <Text style={styles.bannerText}>
                Under Section 55 of the Registration Act 1908, Sub-Registrar Offices (SRO) record every registered sale deed, conveyance, gift, mortgage, or lease in Book No. 1 Index-II with stamp duty, market value, and property boundaries.
              </Text>
            </View>

            {/* Mode Switcher */}
            <Text style={styles.sectionHeading}>Deed Search Mode</Text>
            <View style={styles.modeTabsRow}>
              <TouchableOpacity
                style={[styles.modeTab, index2Mode === 'deed' && styles.modeTabActive]}
                onPress={() => setIndex2Mode('deed')}
                activeOpacity={0.8}
              >
                <FileText size={15} color={index2Mode === 'deed' ? '#FFFFFF' : '#64748b'} />
                <Text style={[styles.modeTabText, index2Mode === 'deed' && styles.modeTabTextActive]}>
                  Search by Deed No. & Year
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, index2Mode === 'property' && styles.modeTabActive]}
                onPress={() => setIndex2Mode('property')}
                activeOpacity={0.8}
              >
                <History size={15} color={index2Mode === 'property' ? '#FFFFFF' : '#64748b'} />
                <Text style={[styles.modeTabText, index2Mode === 'property' && styles.modeTabTextActive]}>
                  Search by Survey / Flat No.
                </Text>
              </TouchableOpacity>
            </View>

            {index2Mode === 'deed' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SRO Document Registration Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 4821 or 8910"
                    placeholderTextColor="#64748b"
                    value={deedNo}
                    onChangeText={setDeedNo}
                  />
                  {/* Quick sample chips */}
                  <View style={styles.quickSamplesRow}>
                    <Text style={styles.quickSamplesLabel}>Sample:</Text>
                    {[
                      { num: '4821', year: '2024', sro: 'Sub-Registrar Haveli-3 (Pune)', label: '#4821/2024 (Haveli-3 SRO - Sale Deed)' },
                      { num: '8910', year: '2023', sro: 'Sub-Registrar Noida-I', label: '#8910/2023 (Noida-I SRO - Conveyance)' }
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.num}
                        style={[styles.sampleChip, deedNo === item.num && styles.sampleChipActive]}
                        onPress={() => {
                          setDeedNo(item.num);
                          setRegYear(item.year);
                          setSroOffice(item.sro);
                          setSurveyNo('142/2A');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sampleChipText, deedNo === item.num && styles.sampleChipTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Registration Year</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 2024"
                      placeholderTextColor="#64748b"
                      value={regYear}
                      onChangeText={setRegYear}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 2 }]}>
                    <Text style={styles.inputLabel}>Sub-Registrar Office (SRO)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. SRO Haveli-3"
                      placeholderTextColor="#64748b"
                      value={sroOffice}
                      onChangeText={setSroOffice}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gat / Survey / Flat / CTS No. *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 142/2A or Flat 402"
                    placeholderTextColor="#64748b"
                    value={surveyNo}
                    onChangeText={setSurveyNo}
                  />
                  <View style={styles.quickSamplesRow}>
                    <Text style={styles.quickSamplesLabel}>Sample:</Text>
                    {['142/2A', 'Plot B-44', '88/1', 'CTS-982'].map((sampleVal) => (
                      <TouchableOpacity
                        key={sampleVal}
                        style={[styles.sampleChip, surveyNo === sampleVal && styles.sampleChipActive]}
                        onPress={() => {
                          setSurveyNo(sampleVal);
                          setDeedNo('4821');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sampleChipText, surveyNo === sampleVal && styles.sampleChipTextActive]}>
                          {sampleVal}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={styles.surveyModeHelpText}>
                  Searches all deeds registered in SRO Book No. 1 against this property holding over the last 13–30 years.
                </Text>
              </>
            )}
          </View>
        ) : isMutation ? (
          <View style={styles.mutationSearchContainer}>
            {/* Sec 150 MLRC Explainer Banner */}
            <View style={styles.mutationNoticeBanner}>
              <View style={styles.bannerHeaderRow}>
                <GitCommit size={18} color="#059669" />
                <Text style={styles.bannerTitle}>Village Form 6 (गाव नमुना ६) • Register of Mutations</Text>
              </View>
              <Text style={styles.bannerText}>
                Tracks title mutations (Sale deed, inheritance, bank mortgages, partitions). Under Section 150 MLRC, every mutation undergoes a mandatory 15-day public notice on Aapli Chawadi for objections before Circle Officer certification.
              </Text>
            </View>

            {/* Mode Switcher */}
            <Text style={styles.sectionHeading}>Mutation Search Mode</Text>
            <View style={styles.modeTabsRow}>
              <TouchableOpacity
                style={[styles.modeTab, mutationMode === 'ferfar' && styles.modeTabActive]}
                onPress={() => setMutationMode('ferfar')}
                activeOpacity={0.8}
              >
                <FileText size={15} color={mutationMode === 'ferfar' ? '#FFFFFF' : '#64748b'} />
                <Text style={[styles.modeTabText, mutationMode === 'ferfar' && styles.modeTabTextActive]}>
                  Search by Ferfar No.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, mutationMode === 'survey' && styles.modeTabActive]}
                onPress={() => setMutationMode('survey')}
                activeOpacity={0.8}
              >
                <History size={15} color={mutationMode === 'survey' ? '#FFFFFF' : '#64748b'} />
                <Text style={[styles.modeTabText, mutationMode === 'survey' && styles.modeTabTextActive]}>
                  Search by Gat / Survey No.
                </Text>
              </TouchableOpacity>
            </View>

            {mutationMode === 'ferfar' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ferfar / Mutation Entry Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 4821 or 4950"
                    placeholderTextColor="#64748b"
                    value={ferfarNo}
                    onChangeText={setFerfarNo}
                  />
                  {/* Quick sample chips */}
                  <View style={styles.quickSamplesRow}>
                    <Text style={styles.quickSamplesLabel}>Sample:</Text>
                    {[
                      { num: '4821', label: '#4821 (Sale Deed - Certified)' },
                      { num: '4950', label: '#4950 (15-Day Notice Active)' },
                      { num: '3890', label: '#3890 (Partition)' },
                      { num: '3120', label: '#3120 (Mortgage Discharge)' }
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.num}
                        style={[styles.sampleChip, ferfarNo === item.num && styles.sampleChipActive]}
                        onPress={() => {
                          setFerfarNo(item.num);
                          setSurveyNo('142/2A');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sampleChipText, ferfarNo === item.num && styles.sampleChipTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gat / Survey Number (Associated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 142/2A"
                    placeholderTextColor="#64748b"
                    value={surveyNo}
                    onChangeText={setSurveyNo}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gat / Survey Number * (Chronological Timeline)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 142/2A"
                    placeholderTextColor="#64748b"
                    value={surveyNo}
                    onChangeText={setSurveyNo}
                  />
                  <View style={styles.quickSamplesRow}>
                    <Text style={styles.quickSamplesLabel}>Sample:</Text>
                    {['142/2A', '88/1', '204', '59/B'].map((sampleVal) => (
                      <TouchableOpacity
                        key={sampleVal}
                        style={[styles.sampleChip, surveyNo === sampleVal && styles.sampleChipActive]}
                        onPress={() => {
                          setSurveyNo(sampleVal);
                          setFerfarNo('4821');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sampleChipText, surveyNo === sampleVal && styles.sampleChipTextActive]}>
                          {sampleVal}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={styles.surveyModeHelpText}>
                  Queries the complete mutation diary from ancestral allotment to present day (Warasnod $\rightarrow$ Bank Boja $\rightarrow$ Partition $\rightarrow$ Sale Deed).
                </Text>
              </>
            )}
          </View>
        ) : isAapliChawadi ? (
          <View style={styles.mutationSearchContainer}>
            {/* Aapli Chawadi 15-Day Public Notice Banner */}
            <View style={[styles.mutationNoticeBanner, { borderColor: 'rgba(245, 158, 11, 0.35)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
              <View style={styles.bannerHeaderRow}>
                <Clock size={18} color="#d97706" />
                <Text style={[styles.bannerTitle, { color: '#b45309' }]}>Aapli Chawadi (आपली चावडी) • 15-Day Public Notice Board</Text>
              </View>
              <Text style={styles.bannerText}>
                Under Section 150 of the Maharashtra Land Revenue Code (MLRC), all incoming mutations are posted digitally on the village Aapli Chawadi for a mandatory 15-day statutory objection period before Circle Officer approval.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ferfar Notice Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 4950 or 4821"
                placeholderTextColor="#64748b"
                value={ferfarNo}
                onChangeText={setFerfarNo}
              />
              <View style={styles.quickSamplesRow}>
                <Text style={styles.quickSamplesLabel}>Sample:</Text>
                {[
                  { num: '4950', label: '#4950 (15-Day Notice Active - 9 Days Left)' },
                  { num: '4821', label: '#4821 (Certified Notice)' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.num}
                    style={[styles.sampleChip, ferfarNo === item.num && styles.sampleChipActive]}
                    onPress={() => {
                      setFerfarNo(item.num);
                      setSurveyNo('142/2A');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sampleChipText, ferfarNo === item.num && styles.sampleChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gat / Survey Number (Associated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 142/2A"
                placeholderTextColor="#64748b"
                value={surveyNo}
                onChangeText={setSurveyNo}
              />
            </View>
          </View>
        ) : isCtsMap ? (
          <View style={styles.mutationSearchContainer}>
            {/* CTS & City Survey Cadastral Banner */}
            <View style={[styles.mutationNoticeBanner, { borderColor: 'rgba(6, 182, 212, 0.35)', backgroundColor: 'rgba(6, 182, 212, 0.08)' }]}>
              <View style={styles.bannerHeaderRow}>
                <Building size={18} color="#0891b2" />
                <Text style={[styles.bannerTitle, { color: '#0284c7' }]}>CTS & City Survey (नगर भूमापन) • Urban Property Card</Text>
              </View>
              <Text style={styles.bannerText}>
                Cadastral mapping and urban property cards (मालमत्ता पत्रक) issued by City Survey Offices. Records CTS parcel boundaries, carpet area, municipal easements, and road reservation lines.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CTS / City Survey Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CTS 1042 or CTS 982"
                placeholderTextColor="#64748b"
                value={ctsNo}
                onChangeText={setCtsNo}
              />
              <View style={styles.quickSamplesRow}>
                <Text style={styles.quickSamplesLabel}>Sample:</Text>
                {[
                  { num: 'CTS 1042', label: 'CTS 1042 (Bandra West - Silver Oak)' },
                  { num: 'CTS 982', label: 'CTS 982 (Wagholi Haveli)' },
                  { num: '142/2A', label: 'Gat 142/2A' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.num}
                    style={[styles.sampleChip, ctsNo === item.num && styles.sampleChipActive]}
                    onPress={() => {
                      setCtsNo(item.num);
                      setSurveyNo(item.num);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sampleChipText, ctsNo === item.num && styles.sampleChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Standard Survey & Property Identification */}
            <Text style={styles.sectionHeading}>Property Identification</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Survey Number / Khasra / Plot No *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 142/2A or 88"
                placeholderTextColor="#64748b"
                value={surveyNo}
                onChangeText={setSurveyNo}
              />
              {/* Quick sample chips */}
              <View style={styles.quickSamplesRow}>
                <Text style={styles.quickSamplesLabel}>Sample:</Text>
                {['142/2A', '88/1', '204', '59/B'].map((sampleVal) => (
                  <TouchableOpacity
                    key={sampleVal}
                    style={[styles.sampleChip, surveyNo === sampleVal && styles.sampleChipActive]}
                    onPress={() => setSurveyNo(sampleVal)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sampleChipText, surveyNo === sampleVal && styles.sampleChipTextActive]}>
                      {sampleVal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Khata Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. KH-492"
                placeholderTextColor="#64748b"
                value={khataNo}
                onChangeText={setKhataNo}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Khatedar / Owner Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Vikramaditya Shinde"
                placeholderTextColor="#64748b"
                value={ownerName}
                onChangeText={setOwnerName}
              />
            </View>
          </>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          testID="submit-fetch-btn"
          style={styles.submitButton}
          onPress={handleFetchRecord}
          activeOpacity={0.8}
        >
          <View style={styles.submitContent}>
            <Bot size={20} color="#ffffff" />
            <Text style={styles.submitText}>
              {isBmcTax ? 'Audit BMC Tax Dues & Anchor' : 'Fetch with TinyFish AI & Anchor'}
            </Text>
            <ShieldCheck size={20} color="#059669" />
          </View>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LandeedBottomNav currentTab="search" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fa'
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  topNavSubtitle: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 2
  },
  quickSamplesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8
  },
  quickSamplesLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  sampleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  sampleChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6'
  },
  sampleChipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  sampleChipTextActive: {
    color: '#FFFFFF'
  },
  container: {
    padding: 20,
    backgroundColor: '#f4f6fa'
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  nativeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b'
  },
  portalSubtitle: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 4
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
    marginBottom: 12
  },
  docList: {
    gap: 8,
    marginBottom: 16
  },
  docCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  docCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.12)'
  },
  docCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  docCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  docCheckboxSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB'
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155'
  },
  docNameSelected: {
    color: '#1d4ed8',
    fontWeight: '700'
  },
  docDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  chipSelected: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8'
  },
  chipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700'
  },
  inputGroup: {
    marginBottom: 14
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a'
  },
  submitButton: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#0284c7',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff'
  },
  mutationSearchContainer: {
    marginBottom: 8
  },
  mutationNoticeBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669'
  },
  bannerText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  modeTabActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  surveyModeHelpText: {
    fontSize: 11,
    color: '#2563eb',
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 16
  }
});
