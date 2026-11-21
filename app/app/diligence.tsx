import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Scale,
  Search,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  ChevronRight,
  Filter,
  RefreshCw,
  ExternalLink,
  Layers,
  Database
} from 'lucide-react-native';
import { navigateTo } from '../utils/navigation';
import { API_BASE_URL } from '../constants/api';

const API_BASE = API_BASE_URL;

interface DiligenceStats {
  cersai: {
    totalCharges: number;
    activeCharges: number;
    satisfiedCharges: number;
    totalActiveAmountInr: number;
    totalSatisfiedAmountInr: number;
  };
  court: {
    totalCases: number;
    pendingCases: number;
    activeStays: number;
    disposedCases: number;
    partitionSuits: number;
    titleDisputes: number;
  };
  summary: {
    totalEncumbrancesTracked: number;
    criticalRiskAssets: number;
    activeDebtExposureInr: number;
    activeDebtExposureCr: string;
  };
}

interface CersaiRecord {
  id: string;
  cersaiSecurityInterestId: string;
  surveyNumber: string;
  state: string;
  district: string;
  village: string;
  borrowerName: string;
  financialInstitution: string;
  branchName?: string;
  chargeAmountInr: number;
  chargeType: string;
  creationDate: string;
  satisfactionDate?: string;
  status: 'ACTIVE' | 'SATISFIED' | 'MODIFIED';
  rocChargeId?: string;
  remarks?: string;
}

interface CourtRecord {
  id: string;
  cnrNumber: string;
  surveyNumber: string;
  state: string;
  district: string;
  village: string;
  courtName: string;
  caseType: string;
  caseNumber: string;
  filingYear: number;
  filingDate: string;
  petitioner: string;
  respondent: string;
  disputeCategory: string;
  prayerSummary: string;
  stayOrderActive: boolean;
  stayOrderDetails?: string;
  caseStatus: string;
  nextHearingDate?: string;
}

interface AuditEventRecord {
  eventId: string;
  eventType: string;
  aggregateId: string;
  surveyNumber?: string;
  state: string;
  timestamp: string;
  outcome: string;
  payload: string;
}

export default function DiligenceDashboard() {
  const router = useRouter();

  // State
  const [stats, setStats] = useState<DiligenceStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeTab, setActiveTab] = useState<'CHECK' | 'CERSAI' | 'COURT' | 'EVENTS'>('CHECK');

  // Search & Single Check
  const [searchSurvey, setSearchSurvey] = useState('404');
  const [searchState, setSearchState] = useState('UP');
  const [searchDistrict, setSearchDistrict] = useState('Ghaziabad');
  const [searchVillage, setSearchVillage] = useState('Sahibabad');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // CERSAI Ledger Tab State
  const [cersaiList, setCersaiList] = useState<CersaiRecord[]>([]);
  const [cersaiFilter, setCersaiFilter] = useState<'ALL' | 'ACTIVE' | 'SATISFIED'>('ALL');
  const [cersaiSearchText, setCersaiSearchText] = useState('');
  const [loadingCersai, setLoadingCersai] = useState(false);

  // Court Litigation Tab State
  const [courtList, setCourtList] = useState<CourtRecord[]>([]);
  const [courtFilter, setCourtFilter] = useState<'ALL' | 'STAY' | 'PENDING'>('ALL');
  const [courtSearchText, setCourtSearchText] = useState('');
  const [loadingCourt, setLoadingCourt] = useState(false);

  // Events Stream State
  const [eventsList, setEventsList] = useState<AuditEventRecord[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCersai();
    fetchCourtCases();
    fetchEvents();
    runPropertyCheck('404', 'UP', 'Ghaziabad', 'Sahibabad');
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_BASE}/diligence/stats`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (e) {
      console.warn('Failed to fetch diligence stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCersai = async () => {
    setLoadingCersai(true);
    try {
      const statusParam = cersaiFilter === 'ALL' ? '' : `&status=${cersaiFilter}`;
      const searchParam = cersaiSearchText ? `&borrowerName=${encodeURIComponent(cersaiSearchText)}` : '';
      const res = await fetch(`${API_BASE}/diligence/cersai?limit=50${statusParam}${searchParam}`);
      const json = await res.json();
      if (json.success) {
        setCersaiList(json.charges);
      }
    } catch (e) {
      console.warn('Failed to fetch CERSAI list:', e);
    } finally {
      setLoadingCersai(false);
    }
  };

  const fetchCourtCases = async () => {
    setLoadingCourt(true);
    try {
      const stayParam = courtFilter === 'STAY' ? '&stayOnly=true' : '';
      const statusParam = courtFilter === 'PENDING' ? '&status=PENDING' : '';
      const searchParam = courtSearchText ? `&partyName=${encodeURIComponent(courtSearchText)}` : '';
      const res = await fetch(`${API_BASE}/diligence/court-cases?limit=50${stayParam}${statusParam}${searchParam}`);
      const json = await res.json();
      if (json.success) {
        setCourtList(json.cases);
      }
    } catch (e) {
      console.warn('Failed to fetch court list:', e);
    } finally {
      setLoadingCourt(false);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(`${API_BASE}/diligence/events?limit=25`);
      const json = await res.json();
      if (json.success) {
        setEventsList(json.events);
      }
    } catch (e) {
      console.warn('Failed to fetch events:', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  const runPropertyCheck = async (survey: string, state: string, dist?: string, vil?: string) => {
    setChecking(true);
    try {
      const url = `${API_BASE}/diligence/check?surveyNumber=${encodeURIComponent(survey)}&state=${state}${dist ? `&district=${encodeURIComponent(dist)}` : ''}${vil ? `&village=${encodeURIComponent(vil)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCheckResult(json.diligence);
        fetchStats(); // Refresh stats counters
        fetchEvents(); // Update event stream
      }
    } catch (e) {
      console.warn('Diligence check error:', e);
    } finally {
      setChecking(false);
    }
  };

  const applyPreset = (survey: string, state: string, dist: string, vil: string) => {
    setSearchSurvey(survey);
    setSearchState(state);
    setSearchDistrict(dist);
    setSearchVillage(vil);
    runPropertyCheck(survey, state, dist, vil);
  };

  const formatInr = (amt: number) => {
    if (amt >= 10000000) {
      return `₹${(amt / 10000000).toFixed(2)} Cr`;
    }
    if (amt >= 100000) {
      return `₹${(amt / 100000).toFixed(2)} Lakhs`;
    }
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigateTo(router, '/')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#71717a" />
          <Text style={styles.backBtnText}>Dashboard Home</Text>
        </TouchableOpacity>

        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              fetchStats();
              fetchCersai();
              fetchCourtCases();
              fetchEvents();
            }}
            activeOpacity={0.7}
          >
            <RefreshCw size={14} color="#71717a" />
            <Text style={styles.refreshBtnText}>Live Sync</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Database size={12} color="#059669" />
          <Text style={styles.headerBadgeText}>REAL TIME LEGAL & BANKING DILIGENCE</Text>
        </View>
        <Text style={styles.headerTitle}>Title Encumbrance & CERSAI Radar</Text>
        <Text style={styles.headerSubtitle}>
          Central Registry of Securitisation (CERSAI) institutional charges cross-reconciled with e-Courts National Judicial Data Grid (NJDG) Lis Pendens injunctions.
        </Text>
      </View>

      {/* Safe Escrow entry */}
      <TouchableOpacity
        style={styles.escrowCta}
        onPress={() => navigateTo(router, '/escrow')}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.escrowCtaTitle}>Title cleared? Buy safely with Escrow</Text>
          <Text style={styles.escrowCtaText}>A clear score never pays out by itself — money is released only at sale deed registration</Text>
        </View>
        <ChevronRight size={18} color="#2563EB" />
      </TouchableOpacity>

      {/* KPI Metrics Ribbon */}
      <View style={styles.kpiGrid}>
        {/* KPI 1 */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>ACTIVE BANK MORTGAGES</Text>
            <Building2 size={16} color="#3B82F6" />
          </View>
          <Text style={styles.kpiValue}>
            {loadingStats ? '...' : stats?.cersai.activeCharges || 0}
          </Text>
          <Text style={styles.kpiSubtext}>
            {stats ? `Across ${stats.cersai.totalCharges} registered charges` : 'CERSAI statutory registry'}
          </Text>
        </View>

        {/* KPI 2 */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>ENCUMBERED DEBT EXPOSURE</Text>
            <Building2 size={16} color="#d97706" />
          </View>
          <Text style={styles.kpiValue}>
            {loadingStats ? '...' : `₹${stats?.summary.activeDebtExposureCr || '0.00'} Cr`}
          </Text>
          <Text style={styles.kpiSubtext}>
            Institutional loans & ROC filings
          </Text>
        </View>

        {/* KPI 3 */}
        <View style={[styles.kpiCard, styles.kpiCardAlert]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: '#EF4444' }]}>ACTIVE COURT INJUNCTIONS</Text>
            <ShieldAlert size={16} color="#EF4444" />
          </View>
          <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
            {loadingStats ? '...' : stats?.court.activeStays || 0}
          </Text>
          <Text style={styles.kpiSubtext}>
            Lis Pendens Section 52 TPA transfer bars
          </Text>
        </View>

        {/* KPI 4 */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>e-COURTS TRACKED SUITS</Text>
            <Scale size={16} color="#059669" />
          </View>
          <Text style={styles.kpiValue}>
            {loadingStats ? '...' : stats?.court.totalCases || 0}
          </Text>
          <Text style={styles.kpiSubtext}>
            {stats ? `${stats.court.partitionSuits} partition, ${stats.court.titleDisputes} title suits` : 'NJDG verified'}
          </Text>
        </View>
      </View>

      {/* Tabs Navigation */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CHECK' && styles.tabButtonActive]}
          onPress={() => setActiveTab('CHECK')}
          activeOpacity={0.7}
        >
          <Search size={14} color={activeTab === 'CHECK' ? '#059669' : '#71717A'} />
          <Text style={[styles.tabButtonText, activeTab === 'CHECK' && styles.tabButtonTextActive]}>
            Instant Property Audit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CERSAI' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('CERSAI');
            fetchCersai();
          }}
          activeOpacity={0.7}
        >
          <Building2 size={14} color={activeTab === 'CERSAI' ? '#059669' : '#71717A'} />
          <Text style={[styles.tabButtonText, activeTab === 'CERSAI' && styles.tabButtonTextActive]}>
            CERSAI Charges ({cersaiList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'COURT' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('COURT');
            fetchCourtCases();
          }}
          activeOpacity={0.7}
        >
          <Scale size={14} color={activeTab === 'COURT' ? '#059669' : '#71717A'} />
          <Text style={[styles.tabButtonText, activeTab === 'COURT' && styles.tabButtonTextActive]}>
            e-Courts NJDG ({courtList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'EVENTS' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('EVENTS');
            fetchEvents();
          }}
          activeOpacity={0.7}
        >
          <Layers size={14} color={activeTab === 'EVENTS' ? '#059669' : '#71717A'} />
          <Text style={[styles.tabButtonText, activeTab === 'EVENTS' && styles.tabButtonTextActive]}>
            Audit Event Bus ({eventsList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: INSTANT PROPERTY AUDIT */}
      {activeTab === 'CHECK' && (
        <View style={styles.tabContent}>
          {/* Search Box Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Run Unified Diligence by Survey / Plot Number</Text>
            <Text style={styles.cardSubtitle}>
              Searches persistent CERSAI mortgages and e-Courts litigation to detect clouds on title.
            </Text>

            <View style={styles.searchRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Survey / Khasra No.</Text>
                <TextInput
                  style={styles.textInput}
                  value={searchSurvey}
                  onChangeText={setSearchSurvey}
                  placeholder="e.g. 404, 141, Plot 112"
                  placeholderTextColor="#71717A"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 0.6 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.textInput}
                  value={searchState}
                  onChangeText={setSearchState}
                  placeholder="UP, MH, TG"
                  placeholderTextColor="#71717A"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>District</Text>
                <TextInput
                  style={styles.textInput}
                  value={searchDistrict}
                  onChangeText={setSearchDistrict}
                  placeholder="e.g. Ghaziabad"
                  placeholderTextColor="#71717A"
                />
              </View>

              <TouchableOpacity
                style={styles.searchSubmitBtn}
                onPress={() => runPropertyCheck(searchSurvey, searchState, searchDistrict, searchVillage)}
                disabled={checking}
                activeOpacity={0.8}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Search size={16} color="#FFFFFF" />
                    <Text style={styles.searchSubmitBtnText}>Audit Title</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              <Text style={styles.presetsLabel}>Test Scenarios:</Text>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('404', 'UP', 'Ghaziabad', 'Sahibabad')}
              >
                <Text style={styles.presetChipText}>Survey 404 (SBI Loan + Partition Stay)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('402', 'UP', 'Ghaziabad', 'Sahibabad')}
              >
                <Text style={styles.presetChipText}>Survey 402 (HDFC Satisfied Charge)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('141', 'MH', 'Pune', 'Wagholi')}
              >
                <Text style={styles.presetChipText}>Gat 141 (ICICI Loan + Boundary Stay)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('142/2A', 'MH', 'Pune', 'Wagholi')}
              >
                <Text style={styles.presetChipText}>Gat 142/2A (Discharged Clean Title)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Audit Result Display */}
          {checkResult && (
            <View style={styles.resultContainer}>
              {/* Verdict Banner */}
              <View
                style={[
                  styles.verdictBanner,
                  checkResult.overallStatus === 'DISPUTED'
                    ? styles.verdictBannerDisputed
                    : checkResult.overallStatus === 'ENCUMBERED'
                    ? styles.verdictBannerEncumbered
                    : styles.verdictBannerClean
                ]}
              >
                <View style={styles.verdictLeft}>
                  {checkResult.overallStatus === 'DISPUTED' ? (
                    <ShieldAlert size={28} color="#EF4444" />
                  ) : checkResult.overallStatus === 'ENCUMBERED' ? (
                    <AlertTriangle size={28} color="#d97706" />
                  ) : (
                    <ShieldCheck size={28} color="#059669" />
                  )}
                  <View style={styles.verdictTextContainer}>
                    <Text style={styles.verdictTitle}>
                      {checkResult.overallStatus === 'DISPUTED'
                        ? 'CRITICAL TITLE CLOUD DETECTED (HARD VETO V₁ TRIP)'
                        : checkResult.overallStatus === 'ENCUMBERED'
                        ? 'FINANCIAL INSTITUTION MORTGAGE RECORDED (V₃ WARNING)'
                        : 'TITLE IS UNENCUMBERED & CLEAR OF LITIGATION'}
                    </Text>
                    <Text style={styles.verdictDesc}>
                      {checkResult.hardVetoReason ||
                        (checkResult.overallStatus === 'ENCUMBERED'
                          ? `Property carries active bank charges totaling ${formatInr(checkResult.metrics.totalActiveDebtInr)}. Bank NOC mandatory.`
                          : 'Zero active CERSAI bank charges and zero pending injunctions found in e-Courts.')}
                    </Text>
                  </View>
                </View>

                <View style={styles.verdictScoreBadge}>
                  <Text style={styles.verdictScoreValue}>
                    {checkResult.suggestedTitleScore}
                    <Text style={styles.verdictScoreDenom}>/100</Text>
                  </Text>
                  <Text style={styles.verdictScoreLabel}>Title Score</Text>
                </View>
              </View>

              {/* Two Column Breakdown: CERSAI vs Court Cases */}
              <View style={styles.twoColumnGrid}>
                {/* Column 1: CERSAI Charges */}
                <View style={styles.columnCard}>
                  <View style={styles.columnHeader}>
                    <Building2 size={18} color="#3B82F6" />
                    <Text style={styles.columnTitle}>
                      CERSAI Security Interests ({checkResult.metrics.activeMortgageCount} Active)
                    </Text>
                  </View>

                  {checkResult.cersai.active.length === 0 && checkResult.cersai.satisfied.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <CheckCircle size={20} color="#059669" />
                      <Text style={styles.emptyCardText}>No mortgages or charges recorded in CERSAI registry.</Text>
                    </View>
                  ) : (
                    <>
                      {checkResult.cersai.active.map((chg: CersaiRecord) => (
                        <View key={chg.id} style={styles.chargeItemAlert}>
                          <View style={styles.itemRowBetween}>
                            <Text style={styles.itemInstitution}>{chg.financialInstitution}</Text>
                            <View style={styles.badgeAlert}>
                              <Text style={styles.badgeAlertText}>ACTIVE CHARGE</Text>
                            </View>
                          </View>
                          <Text style={styles.itemAmount}>{formatInr(chg.chargeAmountInr)}</Text>
                          <Text style={styles.itemMeta}>CERSAI ID: {chg.cersaiSecurityInterestId}</Text>
                          <Text style={styles.itemMeta}>Type: {chg.chargeType} • Created: {chg.creationDate}</Text>
                          {chg.remarks && <Text style={styles.itemRemarks}>{chg.remarks}</Text>}
                        </View>
                      ))}

                      {checkResult.cersai.satisfied.map((chg: CersaiRecord) => (
                        <View key={chg.id} style={styles.chargeItemSatisfied}>
                          <View style={styles.itemRowBetween}>
                            <Text style={styles.itemInstitution}>{chg.financialInstitution}</Text>
                            <View style={styles.badgeSuccess}>
                              <Text style={styles.badgeSuccessText}>SATISFIED (NOC ISSUED)</Text>
                            </View>
                          </View>
                          <Text style={[styles.itemAmount, { color: '#059669' }]}>{formatInr(chg.chargeAmountInr)}</Text>
                          <Text style={styles.itemMeta}>CERSAI ID: {chg.cersaiSecurityInterestId}</Text>
                          <Text style={styles.itemMeta}>Discharged on: {chg.satisfactionDate}</Text>
                          {chg.remarks && <Text style={styles.itemRemarks}>{chg.remarks}</Text>}
                        </View>
                      ))}
                    </>
                  )}
                </View>

                {/* Column 2: e-Courts Litigation */}
                <View style={styles.columnCard}>
                  <View style={styles.columnHeader}>
                    <Scale size={18} color="#EF4444" />
                    <Text style={styles.columnTitle}>
                      e-Courts Litigation ({checkResult.metrics.litigationCaseCount} Dockets)
                    </Text>
                  </View>

                  {checkResult.litigation.cases.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <CheckCircle size={20} color="#059669" />
                      <Text style={styles.emptyCardText}>Clean civil docket; zero pending lawsuits or caveats detected.</Text>
                    </View>
                  ) : (
                    checkResult.litigation.cases.map((cs: CourtRecord) => (
                      <View
                        key={cs.id}
                        style={[
                          styles.caseItem,
                          cs.stayOrderActive ? styles.caseItemStay : styles.caseItemPending
                        ]}
                      >
                        <View style={styles.itemRowBetween}>
                          <Text style={styles.caseCourtName}>{cs.courtName}</Text>
                          {cs.stayOrderActive ? (
                            <View style={styles.badgeStay}>
                              <Text style={styles.badgeStayText}>STAY / INJUNCTION ACTIVE</Text>
                            </View>
                          ) : (
                            <View style={styles.badgePending}>
                              <Text style={styles.badgePendingText}>PENDING TRIAL</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.caseNumber}>{cs.caseNumber} • CNR: {cs.cnrNumber}</Text>
                        <Text style={styles.caseParties}>
                          Petitioner: <Text style={styles.textWhite}>{cs.petitioner}</Text>
                        </Text>
                        <Text style={styles.caseParties}>
                          Respondent: <Text style={styles.textWhite}>{cs.respondent}</Text>
                        </Text>
                        {cs.stayOrderDetails && (
                          <View style={styles.stayDetailsBox}>
                            <AlertTriangle size={14} color="#EF4444" />
                            <Text style={styles.stayDetailsText}>{cs.stayOrderDetails}</Text>
                          </View>
                        )}
                        <Text style={styles.caseFooter}>
                          Dispute: {cs.disputeCategory} • Next Hearing: {cs.nextHearingDate || 'TBD'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 2: CERSAI CHARGES LEDGER */}
      {activeTab === 'CERSAI' && (
        <View style={styles.tabContent}>
          {/* Filters Bar */}
          <View style={styles.filterBar}>
            <View style={styles.filterPills}>
              {(['ALL', 'ACTIVE', 'SATISFIED'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, cersaiFilter === f && styles.filterPillActive]}
                  onPress={() => {
                    setCersaiFilter(f);
                    setTimeout(fetchCersai, 50);
                  }}
                >
                  <Text style={[styles.filterPillText, cersaiFilter === f && styles.filterPillTextActive]}>
                    {f === 'ALL' ? 'All Charges' : f === 'ACTIVE' ? 'Active Mortgages' : 'Satisfied (Cleared)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterSearch}>
              <TextInput
                style={styles.filterSearchInput}
                placeholder="Search borrower or bank..."
                placeholderTextColor="#71717A"
                value={cersaiSearchText}
                onChangeText={(t) => {
                  setCersaiSearchText(t);
                  setTimeout(fetchCersai, 300);
                }}
              />
            </View>
          </View>

          {/* CERSAI Cards Grid */}
          {loadingCersai ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 40 }} />
          ) : cersaiList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No CERSAI charges found matching criteria.</Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {cersaiList.map((chg) => (
                <View key={chg.id} style={styles.tableCard}>
                  <View style={styles.tableCardHeader}>
                    <View style={styles.tableCardHeaderLeft}>
                      <View style={styles.bankAvatar}>
                        <Text style={styles.bankAvatarText}>{chg.financialInstitution.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={styles.tableCardTitle}>{chg.financialInstitution}</Text>
                        <Text style={styles.tableCardSubtitle}>{chg.branchName || 'Registered Branch'}</Text>
                      </View>
                    </View>

                    <View style={chg.status === 'ACTIVE' ? styles.badgeAlert : styles.badgeSuccess}>
                      <Text style={chg.status === 'ACTIVE' ? styles.badgeAlertText : styles.badgeSuccessText}>
                        {chg.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tableCardBody}>
                    <View style={styles.dataGrid}>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>BORROWER</Text>
                        <Text style={styles.dataValue}>{chg.borrowerName}</Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>SECURITY AMOUNT</Text>
                        <Text style={[styles.dataValue, { color: chg.status === 'ACTIVE' ? '#EF4444' : '#059669', fontWeight: '700' }]}>
                          {formatInr(chg.chargeAmountInr)}
                        </Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>PROPERTY HOLDING</Text>
                        <Text style={styles.dataValue}>
                          Survey {chg.surveyNumber} ({chg.village}, {chg.district})
                        </Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>CERSAI SECURITY ID</Text>
                        <Text style={styles.dataValueMono}>{chg.cersaiSecurityInterestId}</Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>CREATION DATE</Text>
                        <Text style={styles.dataValue}>{chg.creationDate}</Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>SATISFACTION DATE</Text>
                        <Text style={styles.dataValue}>{chg.satisfactionDate || 'Unsatisfied (Open Lien)'}</Text>
                      </View>
                    </View>

                    {chg.remarks && (
                      <View style={styles.remarksBox}>
                        <Text style={styles.remarksText}>Note: {chg.remarks}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 3: e-COURTS NJDG LITIGATION */}
      {activeTab === 'COURT' && (
        <View style={styles.tabContent}>
          {/* Filters Bar */}
          <View style={styles.filterBar}>
            <View style={styles.filterPills}>
              {(['ALL', 'STAY', 'PENDING'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, courtFilter === f && styles.filterPillActive]}
                  onPress={() => {
                    setCourtFilter(f);
                    setTimeout(fetchCourtCases, 50);
                  }}
                >
                  <Text style={[styles.filterPillText, courtFilter === f && styles.filterPillTextActive]}>
                    {f === 'ALL' ? 'All Litigation' : f === 'STAY' ? 'Active Stay / Injunctions' : 'Pending Trial'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterSearch}>
              <TextInput
                style={styles.filterSearchInput}
                placeholder="Search petitioner or respondent..."
                placeholderTextColor="#71717A"
                value={courtSearchText}
                onChangeText={(t) => {
                  setCourtSearchText(t);
                  setTimeout(fetchCourtCases, 300);
                }}
              />
            </View>
          </View>

          {/* Court Cases Cards List */}
          {loadingCourt ? (
            <ActivityIndicator size="large" color="#EF4444" style={{ marginVertical: 40 }} />
          ) : courtList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No court cases found matching filters.</Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {courtList.map((cs) => (
                <View key={cs.id} style={styles.tableCard}>
                  <View style={styles.tableCardHeader}>
                    <View style={styles.tableCardHeaderLeft}>
                      <View style={[styles.bankAvatar, { backgroundColor: '#fef2f2' }]}>
                        <Scale size={16} color="#EF4444" />
                      </View>
                      <View>
                        <Text style={styles.tableCardTitle}>{cs.courtName}</Text>
                        <Text style={styles.tableCardSubtitle}>{cs.caseType} • Case #{cs.caseNumber}</Text>
                      </View>
                    </View>

                    {cs.stayOrderActive ? (
                      <View style={styles.badgeStay}>
                        <Text style={styles.badgeStayText}>LIS PENDENS STAY ACTIVE</Text>
                      </View>
                    ) : (
                      <View style={styles.badgePending}>
                        <Text style={styles.badgePendingText}>{cs.caseStatus}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.tableCardBody}>
                    <View style={styles.dataGrid}>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>PETITIONER</Text>
                        <Text style={styles.dataValue}>{cs.petitioner}</Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>RESPONDENT</Text>
                        <Text style={styles.dataValue}>{cs.respondent}</Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>AFFECTED PROPERTY</Text>
                        <Text style={styles.dataValue}>
                          Survey {cs.surveyNumber} ({cs.village}, {cs.district}, {cs.state})
                        </Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>NJDG 16-CHAR CNR</Text>
                        <Text style={styles.dataValueMono}>{cs.cnrNumber}</Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>FILING DATE</Text>
                        <Text style={styles.dataValue}>{cs.filingDate} (Year {cs.filingYear})</Text>
                      </View>
                      <View style={styles.dataCol}>
                        <Text style={styles.dataLabel}>DISPUTE CATEGORY</Text>
                        <Text style={styles.dataValue}>{cs.disputeCategory}</Text>
                      </View>
                    </View>

                    <View style={styles.prayerBox}>
                      <Text style={styles.prayerLabel}>PRAYER / RELIEF SOUGHT:</Text>
                      <Text style={styles.prayerText}>{cs.prayerSummary}</Text>
                    </View>

                    {cs.stayOrderDetails && (
                      <View style={styles.stayDetailsBox}>
                        <AlertTriangle size={14} color="#EF4444" />
                        <Text style={styles.stayDetailsText}>
                          Order XXXIX CPC Stay: {cs.stayOrderDetails}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 4: AUDIT EVENT STREAM */}
      {activeTab === 'EVENTS' && (
        <View style={styles.tabContent}>
          <View style={styles.card}>
            <View style={styles.itemRowBetween}>
              <View>
                <Text style={styles.cardTitle}>Event-Driven Diligence Bus Stream</Text>
                <Text style={styles.cardSubtitle}>
                  Immutable append-only domain event log recording all CERSAI and litigation lookups.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={fetchEvents}
                activeOpacity={0.7}
              >
                <RefreshCw size={14} color="#059669" />
                <Text style={[styles.refreshBtnText, { color: '#059669' }]}>Refresh Log</Text>
              </TouchableOpacity>
            </View>

            {loadingEvents ? (
              <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 30 }} />
            ) : eventsList.length === 0 ? (
              <Text style={styles.emptyText}>Zero events logged yet.</Text>
            ) : (
              <View style={styles.eventsTimeline}>
                {eventsList.map((evt) => (
                  <View key={evt.eventId} style={styles.eventItem}>
                    <View style={styles.eventLeft}>
                      <View
                        style={[
                          styles.eventDot,
                          evt.outcome === 'DISPUTED'
                            ? styles.eventDotRed
                            : evt.outcome === 'ENCUMBERED'
                            ? styles.eventDotAmber
                            : styles.eventDotGreen
                        ]}
                      />
                      <View style={styles.eventLine} />
                    </View>

                    <View style={styles.eventBody}>
                      <View style={styles.itemRowBetween}>
                        <Text style={styles.eventTypeName}>{evt.eventType}</Text>
                        <Text style={styles.eventTime}>{new Date(evt.timestamp).toLocaleTimeString()}</Text>
                      </View>

                      <Text style={styles.eventMeta}>
                        Target Survey: {evt.surveyNumber || evt.aggregateId} • State: {evt.state} • Outcome: {evt.outcome}
                      </Text>

                      <View style={styles.eventPayloadBox}>
                        <Text style={styles.eventPayloadText}>{evt.payload}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    backgroundColor: '#f4f6fa',
  },
  contentContainer: {
    padding: 24,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backBtnText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '500',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  refreshBtnText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    marginBottom: 24,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 10,
  },
  headerBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#71717a',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 800,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 18,
  },
  kpiCardAlert: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  kpiSubtext: {
    color: '#71717A',
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#10B981',
  },
  tabButtonText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContent: {
    gap: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 20,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#71717A',
    fontSize: 13,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  inputGroup: {
    flex: 1,
    minWidth: 140,
  },
  inputLabel: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
  },
  searchSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 42,
    justifyContent: 'center',
  },
  searchSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  presetsLabel: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  presetChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presetChipText: {
    color: '#71717a',
    fontSize: 12,
  },
  resultContainer: {
    gap: 20,
  },
  verdictBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  verdictBannerDisputed: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  verdictBannerEncumbered: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  verdictBannerClean: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  verdictLeft: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
    alignItems: 'flex-start',
  },
  verdictTextContainer: {
    flex: 1,
  },
  verdictTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  verdictDesc: {
    color: '#3f3f46',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictScoreBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  verdictScoreValue: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
  },
  verdictScoreDenom: {
    fontSize: 14,
    color: '#71717A',
  },
  verdictScoreLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  columnCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  columnTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCardText: {
    color: '#71717A',
    fontSize: 13,
    textAlign: 'center',
  },
  chargeItemAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  chargeItemSatisfied: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  itemRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInstitution: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  itemAmount: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 2,
  },
  itemMeta: {
    color: '#71717a',
    fontSize: 12,
  },
  itemRemarks: {
    color: '#3f3f46',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  badgeAlert: {
    backgroundColor: '#fee2e2',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeAlertText: {
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeSuccessText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
  },
  caseItem: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  caseItemStay: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  caseItemPending: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  caseCourtName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  caseNumber: {
    color: '#3B82F6',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  caseParties: {
    color: '#71717a',
    fontSize: 12,
  },
  textWhite: {
    color: '#0f172a',
    fontWeight: '600',
  },
  stayDetailsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  stayDetailsText: {
    color: '#dc2626',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  caseFooter: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 4,
  },
  badgeStay: {
    backgroundColor: '#fee2e2',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeStayText: {
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '700',
  },
  badgePending: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgePendingText: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  filterPillActive: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterPillText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterSearch: {
    minWidth: 220,
  },
  filterSearchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#0f172a',
    fontSize: 13,
  },
  cardsList: {
    gap: 14,
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankAvatarText: {
    color: '#0284c7',
    fontSize: 16,
    fontWeight: '700',
  },
  tableCardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  tableCardSubtitle: {
    color: '#71717A',
    fontSize: 12,
  },
  tableCardBody: {
    gap: 10,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataCol: {
    minWidth: 180,
    flex: 1,
  },
  dataLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dataValue: {
    color: '#1e293b',
    fontSize: 13,
  },
  dataValueMono: {
    color: '#0284c7',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  remarksBox: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  remarksText: {
    color: '#71717a',
    fontSize: 12,
  },
  prayerBox: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  prayerLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  prayerText: {
    color: '#3f3f46',
    fontSize: 12,
    lineHeight: 17,
  },
  eventsTimeline: {
    marginTop: 12,
  },
  eventItem: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 80,
  },
  eventLeft: {
    alignItems: 'center',
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  eventDotRed: {
    backgroundColor: '#EF4444',
  },
  eventDotAmber: {
    backgroundColor: '#F59E0B',
  },
  eventDotGreen: {
    backgroundColor: '#10B981',
  },
  eventLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  eventBody: {
    flex: 1,
    paddingBottom: 16,
    gap: 2,
  },
  eventTypeName: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  eventTime: {
    color: '#71717A',
    fontSize: 11,
  },
  eventMeta: {
    color: '#71717a',
    fontSize: 12,
  },
  eventPayloadBox: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  eventPayloadText: {
    color: '#71717A',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
  },
});
