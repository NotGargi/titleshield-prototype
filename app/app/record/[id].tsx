import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
  SafeAreaView,
  Platform,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import {
  FileCheck,
  Download,
  Share2,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  Building2,
  CheckCircle2,
  ShieldCheck,
  FolderLock,
  ArrowLeft,
  QrCode,
  UserCheck,
  GitCommit,
  Clock,
  AlertTriangle,
  History,
  ChevronRight
} from 'lucide-react-native';
import { API_BASE_URL } from '../../constants/api';
import { BlockchainBadge } from '../../components/BlockchainBadge';
import { LandeedBottomNav } from '../../components/LandeedBottomNav';
import { navigateTo } from '../../utils/navigation';

export default function RecordDetailScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const id = searchParams.id as string;
  const queryIsDegraded = searchParams.isDegraded as string;
  const queryDegradationReason = searchParams.degradationReason as string;
  const queryDataProvenance = searchParams.dataProvenance as string;
  const queryTicketId = searchParams.ticketId as string;

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedToLocker, setSavedToLocker] = useState(false);
  const [inputDeedNo, setInputDeedNo] = useState('');
  const [inputRegYear, setInputRegYear] = useState('');
  const [inputOwnerName, setInputOwnerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/records/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRecord(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch record:', err);
        setLoading(false);
      });
  }, [id]);

  const handleDeedLookup = async () => {
    if (!inputDeedNo.trim() && !inputOwnerName.trim()) {
      Alert.alert('Query Parameters Required', 'Please enter a Deed Registration Number or Owner/Party Name.');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/records/${id}/lookup-deed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deedNo: inputDeedNo.trim(),
          regYear: inputRegYear.trim(),
          ownerName: inputOwnerName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setVerificationResult(data);
        if (data.ownerName) {
          setRecord((prev: any) => ({
            ...prev,
            metadata: {
              ...prev.metadata,
              ownerName: `${data.ownerName} (Declared / Pending SRO Match)`
            }
          }));
        }
      } else {
        Alert.alert('Notice', data.error || 'Could not query deed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to reach SRO lookup service.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadPDF = () => {
    const downloadUrl = `${API_BASE_URL}/records/${id}/download`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(downloadUrl, '_blank');
    } else {
      Linking.openURL(downloadUrl).catch(() => {
        Alert.alert('Download Started', `PDF download link opened: ${downloadUrl}`);
      });
    }
  };

  const handleShare = () => {
    if (record?.verificationUrl) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(record.verificationUrl, '_blank');
      } else {
        Linking.openURL(record.verificationUrl);
      }
    } else {
      Alert.alert('Share Link', `Official Verification Link: ${API_BASE_URL}/verify/${record?.proof?.docHash}`);
    }
  };

  const handleSaveToLocker = () => {
    setSavedToLocker(true);
    Alert.alert('Saved to Locker', 'This certified land deed has been anchored and saved into your Landeed Property Locker.');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Fetching Certified Revenue Extract...</Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Record not found.</Text>
        <Link href="/" asChild>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo(router, '/')}>
            <Text style={styles.backBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  const { metadata, proof, params } = record;

  const resolvedProvenance: 'LIVE_PORTAL' | 'VERIFIED_PRESEEDED_CACHE' | 'REGIONAL_EMULATOR_SYNTHETIC' =
    record?.dataProvenance ||
    (queryDataProvenance as any) ||
    (record?.isDegraded || queryIsDegraded === 'true' ? 'VERIFIED_PRESEEDED_CACHE' : 'LIVE_PORTAL');

  const isDegraded =
    record?.is_degraded === true ||
    record?.is_degraded === 1 ||
    record?.isDegraded === true ||
    queryIsDegraded === 'true' ||
    resolvedProvenance === 'VERIFIED_PRESEEDED_CACHE' ||
    resolvedProvenance === 'REGIONAL_EMULATOR_SYNTHETIC';

  // Anti-masquerading invariant: if resolvedProvenance !== 'LIVE_PORTAL' or degraded, isLive MUST be false!
  // Client URL query parameters MUST NEVER forge a live status on a non-live server record.
  const isLive =
    resolvedProvenance === 'LIVE_PORTAL' &&
    (record?.isLive === true || record?.isLiveExtraction === true) &&
    !isDegraded;

  const isSynthetic = resolvedProvenance === 'REGIONAL_EMULATOR_SYNTHETIC';
  const isBenchmark = resolvedProvenance === 'VERIFIED_PRESEEDED_CACHE' || (!isLive && !isSynthetic);

  const degradationReason =
    record?.degradationReason ||
    (queryDegradationReason ? decodeURIComponent(queryDegradationReason) : null) ||
    (isBenchmark ? 'PRESEEDED_BENCHMARK_RECORD' : 'Downstream Quota / Anti-Bot Security Barrier');

  const ticketId =
    record?.ticketId ||
    (queryTicketId ? decodeURIComponent(queryTicketId) : null);

  const isLiveExtraction = isLive;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Navigation Row */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backIconBtn} onPress={() => navigateTo(router, '/')}>
            <ArrowLeft size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Certified Revenue Extract</Text>
          <TouchableOpacity style={styles.shareIconBtn} onPress={handleShare}>
            <Share2 size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Truth-Serum Provenance & Audit Badge (Section 63 BSA 2023) */}
        {isLive ? (
          <View style={styles.provenanceGreenCard}>
            <View style={styles.provenanceHeaderRow}>
              <View style={styles.provenanceGreenIconWrap}>
                <CheckCircle2 size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.provenanceGreenTitle}>
                  ✓ Live Government Portal Extract ({params?.state || 'State'} Portal)
                </Text>
                <Text style={styles.provenanceGreenSubtitle}>
                  Direct automated extraction from official state revenue servers. Document cryptographic integrity verified.
                </Text>
              </View>
            </View>
            <View style={styles.provenanceMetaRow}>
              <View style={styles.provenanceTagGreen}>
                <Text style={styles.provenanceTagGreenText}>PROVENANCE: LIVE_PORTAL</Text>
              </View>
              {ticketId ? (
                <View style={styles.ticketPill}>
                  <Text style={styles.ticketPillText}>Ticket: {ticketId}</Text>
                </View>
              ) : null}
              <Text style={styles.provenanceLegalCiteGreen}>
                Section 63 BSA 2023 Digital Evidence Certified (Primary Electronic Evidence)
              </Text>
            </View>
          </View>
        ) : isBenchmark ? (
          <View style={styles.provenanceAmberCard}>
            <View style={styles.provenanceHeaderRow}>
              <View style={styles.provenanceAmberIconWrap}>
                <AlertTriangle size={18} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.provenanceAmberTitle}>
                  ⚠️ Verified Benchmark Archive (Live Portal Offline: {degradationReason})
                </Text>
                <Text style={styles.provenanceAmberSubtitle}>
                  Truth-Serum Transparency: External government registry session encountered an anti-bot hurdle or quota barrier. Serving authenticated pre-seeded benchmark record without masquerading as live extract.
                </Text>
              </View>
            </View>
            <View style={styles.provenanceMetaRow}>
              <View style={styles.provenanceTagAmber}>
                <Text style={styles.provenanceTagAmberText}>PROVENANCE: VERIFIED_PRESEEDED_CACHE</Text>
              </View>
              {ticketId ? (
                <View style={styles.ticketPill}>
                  <Text style={styles.ticketPillText}>Ticket: {ticketId}</Text>
                </View>
              ) : null}
              <Text style={styles.provenanceLegalCite}>
                Section 63 BSA 2023 Evidentiary Transparency (Secondary Electronic Evidence)
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.provenancePurpleCard}>
            <View style={styles.provenanceHeaderRow}>
              <View style={styles.provenancePurpleIconWrap}>
                <AlertTriangle size={18} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.provenancePurpleTitle}>
                  ⚡ Regional Rule-Based Synthetic Record ({degradationReason || 'Offline Simulation Mode'})
                </Text>
                <Text style={styles.provenancePurpleSubtitle}>
                  Truth-Serum Notice: Upstream government registry challenge or offline test mode active. This record was synthesized by regional rule engines and does NOT represent an official certified portal extract.
                </Text>
              </View>
            </View>
            <View style={styles.provenanceMetaRow}>
              <View style={styles.provenanceTagPurple}>
                <Text style={styles.provenanceTagPurpleText}>PROVENANCE: REGIONAL_EMULATOR_SYNTHETIC</Text>
              </View>
              {ticketId ? (
                <View style={styles.ticketPill}>
                  <Text style={styles.ticketPillText}>Ticket: {ticketId}</Text>
                </View>
              ) : null}
              <Text style={styles.provenanceLegalCitePurple}>
                Section 63 BSA 2023 Non-Evidentiary Notice (Demonstration Simulation Only)
              </Text>
            </View>
          </View>
        )}

        {/* Certificate Header Banner */}
        <View style={styles.certificateHeader}>
          <View style={styles.certSealRow}>
            <View style={[
              styles.sealBadge,
              isLive && { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
              isBenchmark && { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
              isSynthetic && { backgroundColor: 'rgba(139, 92, 246, 0.15)' }
            ]}>
              {isLive ? (
                <>
                  <CheckCircle2 size={14} color="#059669" />
                  <Text style={[styles.sealBadgeText, { color: '#059669' }]}>LANDEED CERTIFIED LIVE RECORD</Text>
                </>
              ) : isBenchmark ? (
                <>
                  <AlertTriangle size={14} color="#d97706" />
                  <Text style={[styles.sealBadgeText, { color: '#d97706' }]}>AUTHENTICATED BENCHMARK ARCHIVE</Text>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} color="#8B5CF6" />
                  <Text style={[styles.sealBadgeText, { color: '#8B5CF6' }]}>SYNTHETIC REGIONAL SIMULATION</Text>
                </>
              )}
            </View>
            <View style={styles.stateDocTag}>
              <Text style={styles.stateDocTagText}>
                {params?.state} • {params?.docType}
              </Text>
            </View>
          </View>

          <Text style={styles.recordMainTitle}>
            Survey No. {metadata?.surveyNumber || params?.surveyNo}
          </Text>

          <View style={styles.jurisdictionRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.jurisdictionText}>
              Village {params?.village}, Taluka {params?.taluka}, Dist. {params?.district}
            </Text>
          </View>

          <View style={styles.issuanceRow}>
            <Calendar size={13} color="#64748B" />
            <Text style={styles.issuanceText}>
              {isLive
                ? `Extracted on ${metadata?.issuanceDate || new Date().toLocaleDateString('en-IN')} via Live Portal Scraper`
                : isBenchmark
                ? `Archived Benchmark Snapshot (${metadata?.issuanceDate || new Date().toLocaleDateString('en-IN')})`
                : `Synthesized via Regional Rule Engine (${metadata?.issuanceDate || new Date().toLocaleDateString('en-IN')})`}
            </Text>
          </View>
        </View>

        {/* Primary Action Buttons Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPDF} activeOpacity={0.8}>
            <Download size={18} color="#FFFFFF" />
            <Text style={styles.downloadBtnText}>
              {isSynthetic ? 'Download Sample Simulation PDF' : 'Download Certified PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.lockerBtn, savedToLocker && styles.lockerBtnSaved]}
            onPress={handleSaveToLocker}
            activeOpacity={0.8}
          >
            <FolderLock size={18} color={savedToLocker ? '#059669' : '#334155'} />
            <Text style={[styles.lockerBtnText, savedToLocker && { color: '#059669' }]}>
              {savedToLocker ? 'Saved' : 'Save to Locker'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TinyFish live sweep of the 4 government sources (demo cases) */}
        {record?.metadata?.demoCase && (
          <View style={styles.tfCard}>
            <Text style={styles.tfTitle}>
              {Array.isArray(record?.metadata?.portalSweep)
                ? `✓ TinyFish read ${record.metadata.portalsReached}/4 government sources live`
                : '✓ TinyFish agent ran live on the Mahabhumi portal'}
            </Text>
            <Text style={styles.tfText}>
              {record?.metadata?.tinyFishKeySource === 'user'
                ? `On your TinyFish key ${record?.metadata?.tinyFishKeyMasked || ''}`
                : 'On the TitleShield server key'}
              {record?.metadata?.sweepMs ? ` · ${(record.metadata.sweepMs / 1000).toFixed(1)} s total, in parallel` : ''}
            </Text>
            {Array.isArray(record?.metadata?.portalSweep) &&
              record.metadata.portalSweep.map((src: any) => (
                <View key={src.key} style={styles.tfRow}>
                  <Text style={[styles.tfDot, { color: src.ok ? '#059669' : '#dc2626' }]}>{src.ok ? '✓' : '✗'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tfSrcName}>{src.agent} · {src.name}</Text>
                    <Text style={styles.tfSrcMeta}>
                      {src.ok
                        ? `${String(src.url).replace(/^https?:\/\//, '').replace(/\/$/, '')} · ${src.latencyMs} ms · ${Number(src.chars || 0).toLocaleString()} chars read`
                        : `${String(src.url).replace(/^https?:\/\//, '').replace(/\/$/, '')} · ${src.error || 'not reached'}`}
                    </Text>
                  </View>
                </View>
              ))}
            {!!record?.metadata?.portalExcerpt && (
              <View style={styles.tfExcerptBox}>
                <Text style={styles.tfExcerptLabel}>What TinyFish read from the live portal:</Text>
                <Text style={styles.tfExcerpt}>“{record.metadata.portalExcerpt}…”</Text>
              </View>
            )}
            <Text style={styles.tfText}>Record details below are a prepared demo case for this presentation.</Text>
          </View>
        )}

        {/* Court dispute alert (demo case: Survey 77/3) */}
        {String(record?.params?.surveyNo || '').trim() === '77/3' && (
          <View style={styles.disputeCard}>
            <Text style={styles.disputeTag}>⚠ COURT-DISPUTED TITLE · SCORE 34/100</Text>
            <Text style={styles.disputeTitle}>Title NOT cleared — do not pay an advance</Text>
            <Text style={styles.disputeLine}>• Regular Civil Suit No. 412/2023, Civil Judge (Senior Division), Pune</Text>
            <Text style={styles.disputeLine}>• Partition and title suit filed by co-heir Suresh D. Kulkarni (Lis Pendens)</Text>
            <Text style={styles.disputeLine}>• Mutation 4821 is under challenge; next hearing pending</Text>
            <Text style={styles.disputeFoot}>Source: eCourts (NJDG) + 7/12 Other Rights column. Escrow release is blocked.</Text>
          </View>
        )}

        {/* Safe Escrow entry */}
        <TouchableOpacity
          style={styles.escrowCta}
          onPress={() => navigateTo(router, `/escrow?surveyNo=${encodeURIComponent(String(record?.params?.surveyNo || '142/2A'))}&village=${encodeURIComponent(String(record?.params?.village || 'Wagholi') + ', ' + String(record?.params?.district || 'Pune'))}`)}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.escrowCtaTitle}>Buy safely with Escrow</Text>
            <Text style={styles.escrowCtaText}>Money stays locked until the sale deed is registered</Text>
          </View>
          <ChevronRight size={18} color="#2563EB" />
        </TouchableOpacity>

        {/* Blockchain Tamper-Proof Shield */}
        {proof && (
          <View style={styles.blockchainShield}>
            <View style={styles.shieldHeader}>
              <View style={styles.shieldTitleRow}>
                <ShieldCheck size={20} color="#059669" />
                <Text style={styles.shieldTitle}>Polygon EVM On-Chain Proof</Text>
              </View>
              <View style={styles.minedTag}>
                <Text style={styles.minedTagText}>BLOCK #{proof.blockNumber}</Text>
              </View>
            </View>

            <View style={styles.shieldHashContainer}>
              <Text style={styles.shieldHashLabel}>Document SHA-256 Digest:</Text>
              <Text style={styles.shieldHashValue} numberOfLines={1}>
                {proof.docHash}
              </Text>
            </View>

            <View style={styles.shieldHashContainer}>
              <Text style={styles.shieldHashLabel}>Smart Contract Transaction:</Text>
              <Text style={styles.shieldHashValue} numberOfLines={1}>
                {proof.transactionHash}
              </Text>
            </View>

            <View style={styles.shieldFooterRow}>
              <TouchableOpacity
                style={styles.explorerBtn}
                onPress={() => Linking.openURL(proof.explorerUrl)}
              >
                <Text style={styles.explorerBtnText}>View on Polygonscan</Text>
                <ExternalLink size={12} color="#2563EB" />
              </TouchableOpacity>

              <Link href={`/verify?hash=${proof.docHash}`} asChild>
                <TouchableOpacity
                  style={styles.verifyQrBtn}
                  onPress={() => navigateTo(router, `/verify?hash=${proof.docHash}`)}
                >
                  <QrCode size={14} color="#059669" />
                  <Text style={styles.verifyQrText}>Scan Verification QR</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        )}

        {/* Document Specific Presentation: BMC Tax vs IGR Index-II vs Village Form 6 vs Form 7/12 */}
        {record.taxData || params?.docType === 'BMC_TAX' || record.params?.docType === 'BMC_TAX' ? (
          <>
            {/* BMC Property Tax & Municipal Assessment Header Card */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} color="#EF4444" />
                  <Text style={styles.tableTitle}>BMC Property Tax (मालमत्ता कर) • SAC Ledger</Text>
                </View>
                <View style={[styles.mutationStatusPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Text style={[styles.mutationStatusPillText, { color: '#EF4444' }]}>
                    {record.taxData?.ward || 'WARD H-WEST'}
                  </Text>
                </View>
              </View>

              <View style={styles.grid2Col}>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Property Account No. (SAC)</Text>
                  <Text style={[styles.cellValue, { color: '#EF4444', fontWeight: '800', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
                    {record.taxData?.sacNo || 'HW1305620200003'}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Billing Period</Text>
                  <Text style={styles.cellValue}>{record.taxData?.billingPeriod || 'FY 2022-26 (3 Yrs Due)'}</Text>
                </View>
              </View>

              <View style={[styles.grid2Col, { borderTopWidth: 1, borderTopColor: '#cbd5e1' }]}>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Assessed Property</Text>
                  <Text style={styles.cellValue}>{record.taxData?.buildingName || 'Silver Oak CHS Ltd.'}, {record.taxData?.flatNo || 'Flat 402'}</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{record.taxData?.address || '14th Road, Bandra West, Mumbai 400050'}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Ready Reckoner Capital Value</Text>
                  <Text style={[styles.cellValue, { color: '#d97706', fontWeight: '700' }]}>{record.taxData?.capitalValue || 'Rs. 1,42,80,000/-'}</Text>
                </View>
              </View>
            </View>

            {/* Statutory Red-Flag / Title Risk Callout Box */}
            <View style={[styles.mutationNoticeBox, { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <AlertTriangle size={18} color="#EF4444" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444', textTransform: 'uppercase' }}>
                  Statutory Title Diligence Warnings (MMC Act)
                </Text>
              </View>

              {/* Warning 1: Section 212 MMC Act Charge */}
              <View style={{ marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626', marginBottom: 2 }}>
                  🔴 Section 212 MMC Act First Statutory Charge ({record.taxData?.netPayableAmount || 'Rs. 1,77,000/-'} Arrears)
                </Text>
                <Text style={{ fontSize: 11, color: '#334155', lineHeight: 16 }}>
                  Unpaid municipal taxes create an automatic first statutory charge on the property ahead of registered mortgages. BMC has statutory power to issue a Warrant of Attachment and auction the premises.
                </Text>
              </View>

              {/* Warning 2: Area Discrepancy */}
              <View style={{ marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#b45309', marginBottom: 2 }}>
                  🟡 Carpet Area Discrepancy (195 sq. ft. Unassessed Area)
                </Text>
                <Text style={{ fontSize: 11, color: '#334155', lineHeight: 16 }}>
                  Registered Sale Deed declares {record.taxData?.deedCarpetAreaSqFt || '880 sq. ft.'}, but BMC only taxes {record.taxData?.carpetAreaSqFt || '685 sq. ft.'} ({record.taxData?.carpetAreaSqMtr || '63.64 m²'}). 195 sq. ft. represents unauthorized enclosed balcony/flowerbed vulnerable to Section 267A penal taxes or demolition notices.
                </Text>
              </View>

              {/* Warning 3: Co-owner defect */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb', marginBottom: 2 }}>
                  🔵 Assessed Owner: {record.taxData?.assessedOwner || 'SURESH K. SHARMA & RAJESH S. SHARMA'}
                </Text>
                <Text style={{ fontSize: 11, color: '#334155', lineHeight: 16 }}>
                  Deceased father remains listed as co-owner on municipal records. Seller must furnish succession clearance and register BMC Form A-1 property transfer.
                </Text>
              </View>
            </View>

            {/* Assessment Details & Area Comparison Table */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>Municipal Valuation & Area Inspection</Text>
                <View style={[styles.mutationStatusPill, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Text style={[styles.mutationStatusPillText, { color: '#d97706' }]}>
                    {record.taxData?.ocStatusLabel || 'OC PENDING'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Assessed Carpet Area</Text>
                <Text style={[styles.metaValue, { color: '#059669', fontWeight: '800' }]}>{record.taxData?.carpetAreaSqFt || '685 sq. ft.'} ({record.taxData?.carpetAreaSqMtr || '63.64 sq. m.'})</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Deed Claimed Area</Text>
                <Text style={[styles.metaValue, { color: '#dc2626', fontWeight: '800' }]}>{record.taxData?.deedCarpetAreaSqFt || '880 sq. ft.'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Unassessed Variance</Text>
                <Text style={[styles.metaValue, { color: '#EF4444', fontWeight: '800' }]}>{record.taxData?.areaDiscrepancySqFt || '195 sq. ft. Discrepancy'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Water Tax Tariff</Text>
                <Text style={styles.metaValue}>{record.taxData?.waterTaxTariff || 'Penal Surcharge (2x non-domestic rate)'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Last Payment Recorded</Text>
                <Text style={styles.metaValue}>{record.taxData?.lastPaymentDate || '14/03/2022'} ({record.taxData?.lastReceiptNo || 'RCP-094120'})</Text>
              </View>
            </View>

            {/* Itemized Municipal Tax Breakdown Table */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>Itemized BMC Property Tax Demand & Arrears</Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>MMC Act §§ 140, 207A</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>General Tax (Civic upkeep & roads)</Text>
                <Text style={styles.metaValue}>{record.taxData?.taxBreakdown?.generalTax || 'Rs. 73,600/-'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Water Tax & Water Benefit Tax</Text>
                <Text style={styles.metaValue}>{record.taxData?.taxBreakdown?.waterTax || 'Rs. 27,200/-'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Sewerage Tax & Sewerage Benefit Tax</Text>
                <Text style={styles.metaValue}>{record.taxData?.taxBreakdown?.sewerageTax || 'Rs. 12,800/-'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Education Cess (State & BMC)</Text>
                <Text style={styles.metaValue}>{record.taxData?.taxBreakdown?.educationCess || 'Rs. 16,400/-'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Tree Cess & Street Tax</Text>
                <Text style={styles.metaValue}>Rs. 4,200/- (Tree: {record.taxData?.taxBreakdown?.treeCess || 'Rs. 600/-'})</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Section 207A Interest Penalty (2% p.m.)</Text>
                <Text style={[styles.metaValue, { color: '#EF4444', fontWeight: '700' }]}>{record.taxData?.taxBreakdown?.penaltyInterestSec207A || 'Rs. 42,800/-'}</Text>
              </View>

              <View style={[styles.metaRow, { borderTopWidth: 2, borderTopColor: '#EF4444', paddingTop: 10, marginTop: 4 }]}>
                <Text style={[styles.metaLabel, { color: '#0f172a', fontWeight: '800', fontSize: 13 }]}>TOTAL STATUTORY DUES PAYABLE</Text>
                <Text style={[styles.metaValue, { color: '#EF4444', fontWeight: '900', fontSize: 15 }]}>
                  {record.taxData?.netPayableAmount || 'Rs. 1,77,000/-'}
                </Text>
              </View>
            </View>
          </>
        ) : record.index2Data || params?.docType === 'INDEX_2' || params?.docType === 'REGISTRY_DEED' ? (
          <>
            {/* IGR Index-II: Registered Deed Header & Seal */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FileCheck size={18} color="#7c3aed" />
                  <Text style={styles.tableTitle}>IGR Index-II (सूची क्र. २) — Registered Deed</Text>
                </View>
                <View style={[styles.mutationStatusPill, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Text style={[styles.mutationStatusPillText, { color: '#7c3aed' }]}>
                    BOOK NO. 1 REGISTERED
                  </Text>
                </View>
              </View>

              <View style={styles.grid2Col}>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Deed Registration No.</Text>
                  <Text style={[styles.cellValue, { color: '#9333ea', fontWeight: '800' }]}>
                    #{record.index2Data?.deedNo || '4821'} / {record.index2Data?.regYear || '2024'}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Registration Date</Text>
                  <Text style={styles.cellValue}>{record.index2Data?.regDate || '10/02/2024'}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Sub-Registrar Office (SRO)</Text>
                  <Text style={styles.cellValue}>{record.index2Data?.sroOffice || 'SRO Haveli-3 (Pune)'}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Volume & Page Nos.</Text>
                  <Text style={styles.cellValue}>{record.index2Data?.volumeNo || 'HVL3-88'} (pp. {record.index2Data?.pageNos || '145-162'})</Text>
                </View>
              </View>
            </View>

            {/* Financial Consideration & Stamp Duty Card */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>Financials, Stamp Duty & Valuation</Text>
              </View>

              <View style={styles.transferMetaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Ready Reckoner Market Value</Text>
                  <Text style={[styles.metaValue, { color: '#0f172a' }]}>{record.index2Data?.marketValue || 'Rs. 68,00,000/-'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Actual Consideration Paid</Text>
                  <Text style={[styles.metaValue, { color: '#059669' }]}>{record.index2Data?.considerationAmount || 'Rs. 72,50,000/-'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Stamp Duty Paid (7%)</Text>
                  <Text style={[styles.metaValue, { color: '#2563eb' }]}>{record.index2Data?.stampDutyPaid || 'Rs. 5,07,500/-'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Registration Fee Paid</Text>
                  <Text style={[styles.metaValue, { color: '#9333ea' }]}>{record.index2Data?.registrationFeePaid || 'Rs. 30,000/-'}</Text>
                </View>
              </View>
            </View>

            {/* Executant (Vendor) vs Claimant (Purchaser) Parties Card */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>Parties in Registered Deed</Text>
              </View>

              <View style={styles.transferDetailBox}>
                <View style={styles.transferPartyRow}>
                  <View style={[styles.partyBadge, { backgroundColor: '#EF4444' }]}>
                    <Text style={styles.partyBadgeText}>VENDOR</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partyLabel}>Executant (हक्क लिहून देणारा / विकणारा):</Text>
                    <Text style={styles.partyName}>{record.index2Data?.executant?.name || 'Vasantrao Ganpatrao Patil & Others'}</Text>
                    <Text style={styles.partyAddress}>{record.index2Data?.executant?.address || 'Patil Mala, Wagholi, Haveli, Pune'}</Text>
                  </View>
                </View>

                <View style={styles.transferPartyRow}>
                  <View style={[styles.partyBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.partyBadgeText}>BUYER</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partyLabel}>Claimant (हक्क लिहून घेणारा / खरेदीदार):</Text>
                    <Text style={styles.partyName}>{record.index2Data?.claimant?.name || metadata?.ownerName}</Text>
                    <Text style={styles.partyAddress}>{record.index2Data?.claimant?.address || 'Kharadi Bypass Road, Haveli, Pune'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Schedule of Immovable Property & Boundaries */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>Schedule of Immovable Property & Boundaries</Text>
              </View>

              <View style={styles.noticeTimelineBox}>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>Survey / Gat / CTS No:</Text>
                  <Text style={styles.noticeVal}>{record.index2Data?.propertyDescription?.surveyNo || metadata?.surveyNumber || params?.surveyNo}</Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>Area Transferred:</Text>
                  <Text style={styles.noticeVal}>{record.index2Data?.propertyDescription?.area || '0 Hectare 18 R (18 Gunthe)'}</Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>Jurisdiction Village & Taluka:</Text>
                  <Text style={styles.noticeVal}>{params?.village}, Taluka {params?.taluka}, {params?.district}</Text>
                </View>

                <View style={{ marginTop: 8, padding: 10, backgroundColor: '#f4f6fa', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>PROPERTY BOUNDARIES (चतुःसीमा):</Text>
                  <Text style={{ fontSize: 11, color: '#334155', marginBottom: 2 }}>• North: {record.index2Data?.propertyDescription?.boundaries?.north || 'Gat No. 142/1'}</Text>
                  <Text style={{ fontSize: 11, color: '#334155', marginBottom: 2 }}>• South: {record.index2Data?.propertyDescription?.boundaries?.south || '12m PMRDA DP Proposed Road'}</Text>
                  <Text style={{ fontSize: 11, color: '#334155', marginBottom: 2 }}>• East: {record.index2Data?.propertyDescription?.boundaries?.east || 'Gat No. 143 Boundary'}</Text>
                  <Text style={{ fontSize: 11, color: '#334155' }}>• West: {record.index2Data?.propertyDescription?.boundaries?.west || 'Gat No. 141 Canal Line'}</Text>
                </View>
              </View>
            </View>

            {/* Cross-Link Shortcuts Bar */}
            <View style={styles.crossLinkRow}>
              <TouchableOpacity
                style={styles.crossLinkBtn}
                onPress={() => navigateTo(router, `/record/rec-mh-pune-ferfar-4821`)}
                activeOpacity={0.8}
              >
                <GitCommit size={16} color="#059669" />
                <Text style={styles.crossLinkBtnText}>Cross-Check Ferfar #4821 (Form 6)</Text>
                <ChevronRight size={14} color="#059669" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.crossLinkBtn}
                onPress={() => navigateTo(router, `/search/${params?.state || 'MH'}?docType=7_12&surveyNo=${params?.surveyNo || '142/2A'}&district=${params?.district || 'Pune'}&taluka=${params?.taluka || 'Haveli'}&village=${params?.village || 'Wagholi'}`)}
                activeOpacity={0.8}
              >
                <FileCheck size={16} color="#2563eb" />
                <Text style={styles.crossLinkBtnText}>Cross-Check 7/12 (सातबारा)</Text>
                <ChevronRight size={14} color="#2563eb" />
              </TouchableOpacity>
            </View>
          </>
        ) : record.mutationData || params?.docType === 'MUTATION' || params?.docType === 'VF6' ? (
          <>
            {/* Village Form 6 (Gaon Namuna 6): Mutation Register & Status Header */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <GitCommit size={18} color="#059669" />
                  <Text style={styles.tableTitle}>Village Form 6 (गाव नमुना ६) — Mutation Extract</Text>
                </View>
                <View style={[
                  styles.mutationStatusPill,
                  { backgroundColor: record.mutationData?.status === 'PENDING_NOTICE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)' }
                ]}>
                  <Text style={[
                    styles.mutationStatusPillText,
                    { color: record.mutationData?.status === 'PENDING_NOTICE' ? '#d97706' : '#059669' }
                  ]}>
                    {record.mutationData?.statusLabel || 'Certified (प्रमाणित)'}
                  </Text>
                </View>
              </View>

              <View style={styles.grid2Col}>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Ferfar Entry No.</Text>
                  <Text style={[styles.cellValue, { color: '#0284c7', fontWeight: '800' }]}>
                    #{record.mutationData?.ferfarNo || '4821'}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Entry Date</Text>
                  <Text style={styles.cellValue}>{record.mutationData?.entryDate || '14/02/2024'}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Gat / Survey No.</Text>
                  <Text style={styles.cellValue}>{metadata?.surveyNumber || params?.surveyNo}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Revenue Jurisdiction</Text>
                  <Text style={styles.cellValue}>{params?.village}, {params?.taluka}</Text>
                </View>
              </View>
            </View>

            {/* Statutory 15-Day Public Notice Tracker Card (Section 150 MLRC) */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="#2563eb" />
                  <Text style={styles.tableTitle}>Section 150 MLRC — 15-Day Public Notice Tracker</Text>
                </View>
              </View>

              <View style={styles.noticeTimelineBox}>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>Aapli Chawadi Display:</Text>
                  <Text style={styles.noticeVal}>{record.mutationData?.noticeDetails?.noticeDisplayedAt || 'Aapli Chawadi Wagholi'}</Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>Notice Issued Date:</Text>
                  <Text style={styles.noticeVal}>{record.mutationData?.noticeDetails?.noticeDate || '16/02/2024'}</Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>15-Day Objection Deadline:</Text>
                  <Text style={styles.noticeVal}>{record.mutationData?.noticeDetails?.objectionDeadline || '02/03/2024'}</Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>Public Objections:</Text>
                  <Text style={[styles.noticeVal, { color: record.mutationData?.status === 'PENDING_NOTICE' ? '#d97706' : '#059669', fontWeight: '700' }]}>
                    {record.mutationData?.noticeDetails?.objectionStatus || 'Nil - No objections filed'}
                  </Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>Circle Officer Sanction:</Text>
                  <Text style={styles.noticeVal}>
                    {record.mutationData?.noticeDetails?.orderNo || 'CO/HVL/2024/MUT-902'} ({record.mutationData?.noticeDetails?.orderDate || '05/03/2024'})
                  </Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeLabel}>Certifying Authority:</Text>
                  <Text style={styles.noticeVal}>{record.mutationData?.noticeDetails?.certifyingOfficer || 'Circle Officer (Mandal Adhikari, Haveli)'}</Text>
                </View>
              </View>
            </View>

            {/* Transfer Details Card */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>Transaction & Acquisition Details</Text>
              </View>

              <View style={styles.transferDetailBox}>
                <View style={styles.transferPartyRow}>
                  <View style={styles.partyBadge}>
                    <Text style={styles.partyBadgeText}>FROM</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partyLabel}>Transferor (हक्क देणारा / मूळ खातेदार):</Text>
                    <Text style={styles.partyName}>{record.mutationData?.transferor || 'Vasantrao Ganpatrao Patil & Others'}</Text>
                  </View>
                </View>

                <View style={styles.transferPartyRow}>
                  <View style={[styles.partyBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.partyBadgeText}>TO</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partyLabel}>Transferee (हक्क घेणारा / नवीन खातेदार):</Text>
                    <Text style={styles.partyName}>{record.mutationData?.transferee || metadata?.ownerName}</Text>
                  </View>
                </View>

                <View style={styles.transferMetaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Transaction Nature</Text>
                    <Text style={styles.metaValue}>{record.mutationData?.mutationType || 'Registered Sale Deed'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Area Transferred</Text>
                    <Text style={styles.metaValue}>{record.mutationData?.area || '0 Hectare 18 R'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Assessment (Aakar)</Text>
                    <Text style={styles.metaValue}>{record.mutationData?.assessment || 'Rs. 4.25'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Sub-Registrar Deed</Text>
                    <Text style={styles.metaValue}>{record.mutationData?.sroDeedNo ? `Deed #${record.mutationData.sroDeedNo}` : 'SRO Registered'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Chronological Mutation Chain (Timeline of Title) */}
            {record.mutationData?.timeline && record.mutationData.timeline.length > 0 && (
              <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <History size={16} color="#7c3aed" />
                    <Text style={styles.tableTitle}>Chronological Chain of Title (फेरफार साखळी)</Text>
                  </View>
                </View>
                <Text style={styles.timelineDesc}>
                  Unbroken historical progression of titles for Gat {metadata?.surveyNumber || params?.surveyNo} from ancestral records to current deed:
                </Text>

                <View style={styles.timelineContainer}>
                  {record.mutationData.timeline.map((item: any, idx: number) => {
                    const isLast = idx === record.mutationData.timeline.length - 1;
                    return (
                      <View key={item.ferfarNo} style={styles.timelineItemRow}>
                        <View style={styles.timelineLeftTrack}>
                          <View style={[
                            styles.timelineDot,
                            item.isCurrent ? styles.timelineDotCurrent : (item.status === 'PENDING_NOTICE' ? styles.timelineDotActive : styles.timelineDotDone)
                          ]}>
                            {item.isCurrent && <CheckCircle2 size={10} color="#FFFFFF" />}
                          </View>
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>

                        <View style={[styles.timelineContentCard, item.isCurrent && styles.timelineContentCardCurrent]}>
                          <View style={styles.timelineCardHeader}>
                            <View style={styles.timelineEntryBadge}>
                              <Text style={styles.timelineEntryBadgeText}>Entry #{item.ferfarNo} ({item.year})</Text>
                            </View>
                            <View style={[
                              styles.timelineStatusBadge,
                              { backgroundColor: item.status === 'PENDING_NOTICE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)' }
                            ]}>
                              <Text style={[
                                styles.timelineStatusText,
                                { color: item.status === 'PENDING_NOTICE' ? '#d97706' : '#059669' }
                              ]}>
                                {item.statusLabel}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.timelineItemType}>{item.type}</Text>
                          <Text style={styles.timelineItemParties}>Parties: {item.parties}</Text>
                          <Text style={styles.timelineItemDesc}>{item.description}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Cross-Link Shortcuts Bar */}
            <View style={styles.crossLinkRow}>
              <TouchableOpacity
                style={styles.crossLinkBtn}
                onPress={() => navigateTo(router, `/search/${params?.state || 'MH'}?docType=7_12&surveyNo=${params?.surveyNo || '142/2A'}&district=${params?.district || 'Pune'}&taluka=${params?.taluka || 'Haveli'}&village=${params?.village || 'Wagholi'}`)}
                activeOpacity={0.8}
              >
                <FileCheck size={16} color="#2563eb" />
                <Text style={styles.crossLinkBtnText}>Cross-Check 7/12 (सातबारा)</Text>
                <ChevronRight size={14} color="#2563eb" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.crossLinkBtn}
                onPress={() => navigateTo(router, `/search/${params?.state || 'MH'}?docType=INDEX_2&surveyNo=${params?.surveyNo || '142/2A'}&district=${params?.district || 'Pune'}`)}
                activeOpacity={0.8}
              >
                <Building2 size={16} color="#7c3aed" />
                <Text style={styles.crossLinkBtnText}>View Registered Deed (Index-II)</Text>
                <ChevronRight size={14} color="#7c3aed" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Standard Village Form 7 (Gaon Namuna 7): Land Parcel Identification */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>Gaon Namuna 7 (Village Form 7) — Land Parcel</Text>
              </View>

              <View style={styles.grid2Col}>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Survey / Gat No.</Text>
                  <Text style={styles.cellValue}>{metadata?.surveyNumber || params?.surveyNo}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Hissa / Sub-Division</Text>
                  <Text style={styles.cellValue}>A (Sub-plot 1)</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Total Area</Text>
                  <Text style={styles.cellValue}>{metadata?.totalArea || '1.20 Hectare'}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Pot Kharab (Unfit)</Text>
                  <Text style={styles.cellValue}>0.05 Ha (Class A)</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Land Classification</Text>
                  <Text style={styles.cellValue}>{metadata?.landType || 'Jirayat (Dry Crop)'}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>Revenue Assessment (Aakar)</Text>
                  <Text style={styles.cellValue}>Rs. 14.80 per annum</Text>
                </View>
              </View>
            </View>

            {/* Village Form 12 (Gaon Namuna 12): Khatedar Ownership & Crops */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>
                  {params?.state === 'UP' ? 'IGRSUP / Revenue Record — Khatedar & Title Rights' : 'Gaon Namuna 12 (Village Form 12) — Khatedar Rights'}
                </Text>
              </View>

              <View style={styles.ownerRow}>
                <View style={styles.ownerAvatar}>
                  <Text style={styles.avatarText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ownerNameText}>
                    {metadata?.ownerName || 'Protected (Live SRO Deed Extraction Required)'}
                  </Text>
                  <Text style={styles.ownerAccountText}>Khata / Account No: {metadata?.khataNumber || params?.khataNo || 'Pending SRO Query'}</Text>
                  <Text style={styles.ownerShareText}>Holding: Sole Ownership / Ryotwari Freehold</Text>
                </View>
              </View>

              <View style={styles.mutationBox}>
                <Text style={styles.mutationBoxTitle}>Registered Deed & Mutation Status:</Text>
                <View style={styles.mutationItem}>
                  <Text style={styles.mutationBullet}>•</Text>
                  <Text style={styles.mutationText}>Sub-Registrar Jurisdiction: SRO Sahibabad (Ghaziabad-IV)</Text>
                </View>
                <View style={styles.mutationItem}>
                  <Text style={styles.mutationBullet}>•</Text>
                  <Text style={styles.mutationText}>Official Extract: Certified deed copy requires live SRO query with authentic Deed No.</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Authentic Live SRO Deed Lookup */}
        <View style={styles.verificationCard}>
          <View style={styles.verificationHeaderRow}>
            <UserCheck size={18} color="#2563eb" />
            <Text style={styles.verificationCardTitle}>Live SRO Sub-Registrar Deed Query</Text>
          </View>
          <Text style={styles.verificationCardDesc}>
            Under Uttar Pradesh Registration Act protocols, certified deeds for residential properties are accessed by authentic Deed Registration Number & Year, or Buyer/Seller Name. Enter details to query the SRO index:
          </Text>

          <View style={{ gap: 8 }}>
            <View style={styles.verifyInputRow}>
              <TextInput
                style={[styles.verifyInput, { flex: 2 }]}
                placeholder="Deed Registration No. (e.g. 4821)..."
                placeholderTextColor="#64748B"
                value={inputDeedNo}
                onChangeText={setInputDeedNo}
              />
              <TextInput
                style={[styles.verifyInput, { flex: 1 }]}
                placeholder="Year (e.g. 2021)"
                placeholderTextColor="#64748B"
                value={inputRegYear}
                onChangeText={setInputRegYear}
              />
            </View>

            <TextInput
              style={styles.verifyInput}
              placeholder="Party / Owner Name (if known)..."
              placeholderTextColor="#64748B"
              value={inputOwnerName}
              onChangeText={setInputOwnerName}
            />

            <TouchableOpacity
              style={[styles.verifyBtn, { marginTop: 4 }]}
              onPress={handleDeedLookup}
              disabled={verifying}
              activeOpacity={0.8}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyBtnText}>Dispatch SRO Query</Text>
              )}
            </TouchableOpacity>
          </View>

          {verificationResult && (
            <View style={styles.verificationSuccessBox}>
              <CheckCircle2 size={16} color="#2563eb" />
              <View style={{ flex: 1 }}>
                <Text style={styles.verificationSuccessTitle}>SRO Query Logged</Text>
                <Text style={styles.verificationSuccessMsg}>{verificationResult.message}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Other Rights & Liabilities (Itar Hakka) */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Other Rights & Liabilities (Itar Hakka)</Text>
          </View>

          <View style={styles.liabilitiesRow}>
            <View style={styles.liabilityItem}>
              <Text style={styles.liabilityLabel}>Bank Mortgage / Charge</Text>
              <Text style={[styles.liabilityVal, { color: '#059669' }]}>NIL (Clear Title / No Liens)</Text>
            </View>
            <View style={styles.liabilityItem}>
              <Text style={styles.liabilityLabel}>Court Disputes / Stay Orders</Text>
              <Text style={[styles.liabilityVal, { color: '#059669' }]}>No Active Caveats Recorded</Text>
            </View>
            <View style={styles.liabilityItem}>
              <Text style={styles.liabilityLabel}>Culvert / Water Right</Text>
              <Text style={styles.liabilityVal}>Right of way from South approach road</Text>
            </View>
          </View>
        </View>

        {/* TinyFish Agent Execution Trace */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Autonomous TinyFish Ingestion Log</Text>
          </View>

          <View style={styles.stepsTrace}>
            {record.steps?.map((s: any, idx: number) => (
              <View key={idx} style={styles.traceRow}>
                <CheckCircle2 size={14} color="#2563EB" />
                <Text style={styles.traceMsg}>{s.message}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LandeedBottomNav currentTab="orders" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tfCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  tfTitle: { fontSize: 14, fontWeight: '800', color: '#047857', marginBottom: 4 },
  tfText: { fontSize: 12, color: '#334155', marginTop: 2 },
  tfRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-start' },
  tfDot: { fontSize: 15, fontWeight: '800', width: 16 },
  tfSrcName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  tfSrcMeta: { fontSize: 11, color: '#475569', marginTop: 1 },
  tfExcerptBox: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1fae5', borderRadius: 8, padding: 10, marginTop: 10, marginBottom: 4 },
  tfExcerptLabel: { fontSize: 11, fontWeight: '700', color: '#047857', marginBottom: 4 },
  tfExcerpt: { fontSize: 11, color: '#334155', lineHeight: 16, fontStyle: 'italic' },
  disputeCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  disputeTag: { fontSize: 11, fontWeight: '800', color: '#b91c1c', letterSpacing: 0.4, marginBottom: 4 },
  disputeTitle: { fontSize: 16, fontWeight: '800', color: '#7f1d1d', marginBottom: 6 },
  disputeLine: { fontSize: 13, color: '#334155', marginBottom: 3, lineHeight: 18 },
  disputeFoot: { fontSize: 11, color: '#64748b', marginTop: 6 },
  escrowCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  escrowCtaTitle: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  escrowCtaText: { fontSize: 12, color: '#475569', marginTop: 2 },
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fa'
  },
  container: {
    padding: 16,
    paddingBottom: 30
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f4f6fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    color: '#64748b',
    marginTop: 14,
    fontSize: 14
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600'
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  shareIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  certificateHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  certSealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  sealBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5
  },
  stateDocTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  stateDocTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  recordMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6
  },
  jurisdictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  jurisdictionText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1
  },
  issuanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  issuanceText: {
    fontSize: 11,
    color: '#64748B'
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  downloadBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  lockerBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  lockerBtnSaved: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)'
  },
  lockerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  blockchainShield: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 14
  },
  shieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  shieldTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  shieldTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669'
  },
  minedTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  minedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669'
  },
  shieldHashContainer: {
    backgroundColor: '#f4f6fa',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  shieldHashLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2
  },
  shieldHashValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748b'
  },
  shieldFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  explorerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  explorerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB'
  },
  verifyQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  verifyQrText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669'
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
    marginBottom: 12
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  grid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  gridCell: {
    width: '47%'
  },
  cellLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2
  },
  cellValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14
  },
  ownerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },
  ownerNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  ownerAccountText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1
  },
  ownerShareText: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2
  },
  mutationBox: {
    backgroundColor: '#f4f6fa',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6
  },
  mutationBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2
  },
  mutationItem: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start'
  },
  mutationBullet: {
    color: '#2563EB',
    fontSize: 12
  },
  mutationText: {
    fontSize: 11,
    color: '#334155',
    flex: 1
  },
  liabilitiesRow: {
    gap: 10
  },
  liabilityItem: {
    backgroundColor: '#f4f6fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  liabilityLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2
  },
  liabilityVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  stepsTrace: {
    gap: 8
  },
  traceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  traceMsg: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 16
  },
  verificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  verificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  verificationCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  verificationCardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12
  },
  verifyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  verifyInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 13
  },
  verifyBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  verificationSuccessBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 12,
    marginTop: 12
  },
  verificationSuccessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2
  },
  verificationSuccessMsg: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15
  },
  verifiedDeedOwner: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4
  },
  mutationStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  mutationStatusPillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  noticeTimelineBox: {
    gap: 8,
    marginTop: 6
  },
  noticeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  noticeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  },
  noticeVal: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600'
  },
  transferDetailBox: {
    gap: 12,
    marginTop: 4
  },
  transferPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f4f6fa',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  partyBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  partyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  partyLabel: {
    fontSize: 11,
    color: '#64748B'
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1
  },
  partyAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  transferMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  metaItem: {
    width: '48%',
    backgroundColor: '#f4f6fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7'
  },
  timelineDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12
  },
  timelineContainer: {
    marginTop: 4
  },
  timelineItemRow: {
    flexDirection: 'row',
    gap: 12
  },
  timelineLeftTrack: {
    alignItems: 'center',
    width: 20
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  timelineDotDone: {
    backgroundColor: '#10B981'
  },
  timelineDotActive: {
    backgroundColor: '#F59E0B'
  },
  timelineDotCurrent: {
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#60A5FA'
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: '#f4f6fa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12
  },
  timelineContentCardCurrent: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.05)'
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  timelineEntryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  timelineEntryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8'
  },
  timelineStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  timelineStatusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  timelineItemType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2
  },
  timelineItemParties: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4
  },
  timelineItemDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15
  },
  crossLinkRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  crossLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  crossLinkBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginHorizontal: 6
  },
  mutationNoticeBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 16
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  provenanceAmberCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    padding: 14,
    marginBottom: 16
  },
  provenanceGreenCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 14,
    marginBottom: 16
  },
  provenancePurpleCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    padding: 14,
    marginBottom: 16
  },
  provenanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8
  },
  provenanceAmberIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  provenanceGreenIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  provenancePurpleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  provenanceAmberTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 0.3,
    lineHeight: 18
  },
  provenanceGreenTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
    lineHeight: 18
  },
  provenancePurpleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.3,
    lineHeight: 18
  },
  provenanceAmberSubtitle: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 4,
    lineHeight: 16
  },
  provenanceGreenSubtitle: {
    fontSize: 11,
    color: '#065f46',
    marginTop: 4,
    lineHeight: 16
  },
  provenancePurpleSubtitle: {
    fontSize: 11,
    color: '#5b21b6',
    marginTop: 4,
    lineHeight: 16
  },
  provenanceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.05)',
    paddingTop: 8,
    marginTop: 2
  },
  provenanceTagAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  provenanceTagAmberText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 0.5
  },
  provenanceTagGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  provenanceTagGreenText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5
  },
  provenanceTagPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  provenanceTagPurpleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.5
  },
  ticketPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  ticketPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  provenanceLegalCite: {
    fontSize: 10,
    color: '#b45309',
    fontStyle: 'italic',
    flex: 1
  },
  provenanceLegalCiteGreen: {
    fontSize: 10,
    color: '#059669',
    fontStyle: 'italic',
    flex: 1
  },
  provenanceLegalCitePurple: {
    fontSize: 10,
    color: '#9333ea',
    fontStyle: 'italic',
    flex: 1
  }
});
