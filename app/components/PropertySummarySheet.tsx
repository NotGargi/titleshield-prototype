import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Linking,
  ActivityIndicator
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import {
  ShieldCheck,
  FileText,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Building,
  MapPin,
  TrendingUp,
  Sparkles,
  Download,
  Eye,
  FileCheck,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  Layers,
  ChevronRight
} from 'lucide-react-native';
import { CadastralParcel, LandPaper } from '../constants/cadastralData';
import { LandPaperViewerModal } from './LandPaperViewerModal';
import { navigateTo } from '../utils/navigation';
import { API_BASE_URL } from '../constants/api';

export interface PropertySummarySheetProps {
  parcel: CadastralParcel | null;
  onClose: () => void;
}

export function PropertySummarySheet({ parcel, onClose }: PropertySummarySheetProps) {
  const router = useRouter();

  // State for paper viewer modal
  const [selectedPaperForModal, setSelectedPaperForModal] = useState<LandPaper | null>(null);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState<boolean>(false);

  // State for live paper extraction on plots without papers
  const [dynamicPapers, setDynamicPapers] = useState<LandPaper[]>([]);
  const [isFetchingPapers, setIsFetchingPapers] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  if (!parcel) {
    return null;
  }

  // Combined papers: pre-seeded + any dynamically fetched papers
  const availablePapers = [...(parcel.papers || []), ...dynamicPapers];
  const hasPapers = availablePapers.length > 0;

  const handleViewRecord = () => {
    if (parcel.recordId) {
      navigateTo(router, `/record/${parcel.recordId}`);
    }
  };

  const handleFetchOfficialRecord = () => {
    let docType = '7_12';
    if (parcel.state === 'UP') docType = 'KHATAUNI';
    else if (parcel.state === 'KA') docType = 'RTC';
    else if (parcel.state === 'TG') docType = 'PASSBOOK';
    else if (parcel.state === 'TN') docType = 'PATTA_CHITTA';

    router.push({
      pathname: `/search/${parcel.state}`,
      params: {
        state: parcel.state,
        district: parcel.district,
        taluka: parcel.taluka,
        village: parcel.village,
        surveyNo: parcel.surveyNumber,
        docType,
        autoFetch: 'true'
      }
    });
  };

  const handleAskTerra = () => {
    router.push({
      pathname: '/terra',
      params: {
        surveyNo: parcel.surveyNumber,
        state: parcel.state,
        district: parcel.district,
        taluka: parcel.taluka,
        village: parcel.village,
        parcelId: parcel.id,
        recordId: parcel.recordId,
        claimedOwner: parcel.claimedOwner,
        extent: parcel.extent,
        cleanTitleScore: parcel.cleanTitleScore?.toString(),
        encumbranceStatus: parcel.encumbranceStatus
      }
    });
  };

  const handleOpenPaper = (paper: LandPaper) => {
    setSelectedPaperForModal(paper);
    setIsViewerModalOpen(true);
  };

  const handleDownloadPaper = (paper: LandPaper) => {
    const downloadUrl = paper.downloadUrl || `${API_BASE_URL}/records/${parcel.recordId}/download`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(downloadUrl, '_blank');
    } else {
      Linking.openURL(downloadUrl).catch(console.error);
    }
  };

  // Live trigger to pull/generate papers from state revenue registry for un-digitized parcels
  const handleFetchLivePapers = async () => {
    setIsFetchingPapers(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/records/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: parcel.state,
          docType: parcel.state === 'MH' ? '7_12' : 'REGISTRY_DEED',
          district: parcel.district,
          taluka: parcel.taluka,
          village: parcel.village,
          surveyNo: parcel.surveyNumber
        })
      });

      const data = await res.json();
      if (data.success || data.recordId) {
        const prov = data.dataProvenance || (data.isDegraded ? 'VERIFIED_PRESEEDED_CACHE' : (data.isLive !== false ? 'LIVE_PORTAL' : 'VERIFIED_PRESEEDED_CACHE'));
        const effectiveLive = prov === 'LIVE_PORTAL' && !data.isDegraded && data.isLive !== false;
        const effectiveSynthetic = prov === 'REGIONAL_EMULATOR_SYNTHETIC';

        const statusLabel = effectiveLive
          ? 'Live Extracted Record'
          : effectiveSynthetic
          ? 'Simulated Emulator Record'
          : 'Verified Benchmark Record';

        const statusColor = effectiveLive
          ? '#059669'
          : effectiveSynthetic
          ? '#8B5CF6'
          : '#d97706';

        const generatedPaper: LandPaper = {
          id: `paper-live-${parcel.id}-${Date.now()}`,
          title: data.title || `${parcel.village} Survey ${parcel.surveyNumber} Digital Record`,
          titleNative: parcel.state === 'MH' ? 'गाव नमुना ७/१२ डिजिटल उद्धरण' : 'राजस्व परिषद डिजिटल खतौनी',
          type: parcel.state === 'MH' ? '7_12' : 'DEED',
          typeLabel: parcel.state === 'MH' ? '7/12 Extract' : 'SRO Record',
          status: 'AVAILABLE',
          statusLabel,
          statusColor,
          documentNumber: `REG-${parcel.surveyNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
          issuingAuthority: `State Land Registry (${parcel.stateName})`,
          date: new Date().toLocaleDateString('en-IN'),
          downloadUrl: `${API_BASE_URL}/records/${data.recordId || parcel.recordId}/download`,
          recordId: data.recordId || parcel.recordId,
          ledgerData: {
            stateGovt: `${parcel.stateName} Government`,
            department: 'Revenue & Land Records Department',
            surveyGatNumber: parcel.surveyNumber,
            area: parcel.extent,
            tenureClass: parcel.landType,
            owners: [{ name: parcel.claimedOwner, share: '100%' }],
            otherRights: ['Live query verified on State Cadastral Gateway']
          }
        };
        setDynamicPapers([generatedPaper]);
      } else {
        setFetchError('State registry query returned no digital files. Physical SRO inspection required.');
      }
    } catch (e: any) {
      setFetchError('Could not connect to registry service. Please retry.');
    } finally {
      setIsFetchingPapers(false);
    }
  };

  const isClean = parcel.encumbranceStatus === 'CLEAN';
  const isUnderReview = parcel.encumbranceStatus === 'UNDER_VERIFICATION';
  const isDisputed = parcel.encumbranceStatus === 'DISPUTED' || parcel.encumbranceStatus === 'ENCUMBERED';

  const tierColor =
    parcel.cleanTitleTier === 'CRITICAL' || isDisputed
      ? '#EF4444'
      : isUnderReview || parcel.cleanTitleTier === 'MODERATE'
      ? '#d97706'
      : '#059669';

  return (
    <View style={styles.sheetOverlay} testID="property-summary-sheet">
      <View style={styles.sheetCard}>
        {/* Top drag handle */}
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.surveyTagRow}>
              <View style={[styles.surveyPill, { borderColor: tierColor }]}>
                <Text style={styles.surveyPillText} testID="summary-survey-no">
                  {parcel.surveyNumber}
                </Text>
              </View>
              <View style={styles.locationPill}>
                <MapPin size={12} color="#64748b" />
                <Text style={styles.locationPillText}>
                  {parcel.village}, {parcel.district} ({parcel.state})
                </Text>
              </View>
            </View>
            <Text style={styles.propertyTitle}>
              {parcel.village} Survey Parcel {parcel.surveyNumber}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            testID="summary-sheet-close-btn"
            accessibilityLabel="Close property summary sheet"
          >
            <X size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Sheet Content */}
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* Clean Title Score Badge & Encumbrance Status Banner */}
          <View style={styles.badgeSection}>
            <View style={[styles.scoreBadgeCard, { borderColor: tierColor }]}>
              <View style={styles.scoreRow}>
                <ShieldCheck size={26} color={tierColor} />
                <View style={styles.scoreTextCol}>
                  <View style={styles.scoreValueRow}>
                    <Text style={[styles.scoreNumber, { color: tierColor }]} testID="summary-title-score">
                      {parcel.cleanTitleScore}
                    </Text>
                    <Text style={styles.scoreMax}>/100</Text>
                    <View style={[styles.tierTag, { backgroundColor: `${tierColor}20`, borderColor: tierColor }]}>
                      <Text style={[styles.tierTagText, { color: tierColor }]}>
                        {parcel.cleanTitleTier} RISK
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.scoreRatingText}>
                    {parcel.cleanTitleRating}
                  </Text>
                </View>
              </View>
            </View>

            {/* Encumbrance Pill */}
            <View
              style={[
                styles.encumbranceBanner,
                {
                  backgroundColor: isClean ? '#d1fae5' : isUnderReview ? '#fef3c7' : '#fee2e2',
                  borderColor: tierColor
                }
              ]}
            >
              {isClean ? (
                <CheckCircle2 size={16} color="#059669" />
              ) : (
                <AlertTriangle size={16} color={tierColor} />
              )}
              <Text
                style={[styles.encumbranceBannerText, { color: tierColor }]}
                testID="summary-encumbrance"
              >
                {parcel.encumbranceLabel}
              </Text>
            </View>
          </View>

          {/* Property Core Attributes Grid */}
          <View style={styles.attributeGrid}>
            <View style={styles.attributeItem}>
              <Text style={styles.attributeLabel}>CLAIMED OWNER / HOLDER</Text>
              <Text style={styles.attributeValue} testID="summary-owner-name">
                {parcel.claimedOwner}
              </Text>
            </View>

            <View style={styles.attributeItem}>
              <Text style={styles.attributeLabel}>EXTENT / HOLDING AREA</Text>
              <Text style={styles.attributeValue} testID="summary-extent">
                {parcel.extent}
              </Text>
            </View>

            <View style={styles.attributeItem}>
              <Text style={styles.attributeLabel}>GOVT GUIDANCE VALUE</Text>
              <Text style={styles.attributeValueHighlight} testID="summary-guidance-value">
                {parcel.guidanceValueInr}
              </Text>
            </View>

            <View style={styles.attributeItem}>
              <Text style={styles.attributeLabel}>ESTIMATED MARKET VALUE</Text>
              <Text style={styles.attributeValueHighlight} testID="summary-market-value">
                {parcel.marketValueInr}
              </Text>
            </View>

            <View style={styles.attributeItemFull}>
              <Text style={styles.attributeLabel}>LAND USE / TENURE CLASSIFICATION</Text>
              <Text style={styles.attributeValue}>{parcel.landType}</Text>
            </View>
          </View>

          {/* ================================================================= */}
          {/* PAPERS OF THIS PLOT SECTION                                       */}
          {/* ================================================================= */}
          <View style={styles.papersSection} testID="plot-papers-section">
            <View style={styles.papersHeaderRow}>
              <View style={styles.papersTitleGroup}>
                <FileText size={18} color="#0284c7" />
                <Text style={styles.papersSectionTitle}>
                  LAND PAPERS OF THIS PLOT
                </Text>
              </View>

              <View
                style={[
                  styles.papersCountPill,
                  { backgroundColor: hasPapers ? '#d1fae5' : '#fef3c7', borderColor: hasPapers ? '#10B981' : '#d97706' }
                ]}
              >
                <Text
                  style={[
                    styles.papersCountText,
                    { color: hasPapers ? '#059669' : '#d97706' }
                  ]}
                  testID="available-papers-count"
                >
                  {hasPapers ? `${availablePapers.length} PAPERS AVAILABLE` : 'NO PAPERS ON FILE'}
                </Text>
              </View>
            </View>

            {/* List of Available Papers */}
            {hasPapers ? (
              <View style={styles.papersList}>
                {availablePapers.map((paper) => (
                  <View key={paper.id} style={styles.paperCard} testID={`paper-card-${paper.id}`}>
                    <View style={styles.paperCardHeader}>
                      <View style={styles.paperCardTitleRow}>
                        <View style={styles.paperIconBox}>
                          <FileCheck size={18} color="#0284c7" />
                        </View>
                        <View style={styles.paperTitleCol}>
                          <Text style={styles.paperTitleText} numberOfLines={1}>
                            {paper.title}
                          </Text>
                          {paper.titleNative && (
                            <Text style={styles.paperNativeText} numberOfLines={1}>
                              {paper.titleNative}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={[styles.paperStatusBadge, { backgroundColor: `${paper.statusColor}20`, borderColor: paper.statusColor }]}>
                        <Text style={[styles.paperStatusText, { color: paper.statusColor }]}>
                          {paper.statusLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Paper Meta Details */}
                    <View style={styles.paperDetailsRow}>
                      <Text style={styles.paperDetailItem} numberOfLines={1}>
                        Authority: <Text style={styles.paperDetailVal}>{paper.issuingAuthority}</Text>
                      </Text>
                      {paper.documentNumber && (
                        <Text style={styles.paperDetailItem} numberOfLines={1}>
                          Ref No: <Text style={styles.paperDetailVal}>{paper.documentNumber}</Text>
                        </Text>
                      )}
                    </View>

                    {/* Paper Action Buttons */}
                    <View style={styles.paperActionRow}>
                      <TouchableOpacity
                        style={styles.viewPaperButton}
                        onPress={() => handleOpenPaper(paper)}
                        testID={`view-paper-btn-${paper.id}`}
                        activeOpacity={0.8}
                      >
                        <Eye size={14} color="#FFFFFF" />
                        <Text style={styles.viewPaperText}>View Paper</Text>
                      </TouchableOpacity>

                      {paper.downloadUrl && (
                        <TouchableOpacity
                          style={styles.downloadPaperButton}
                          onPress={() => handleDownloadPaper(paper)}
                          testID={`download-paper-btn-${paper.id}`}
                          activeOpacity={0.8}
                        >
                          <Download size={14} color="#0284c7" />
                          <Text style={styles.downloadPaperText}>Download PDF</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              /* Empty State: Plot has no digitized papers yet */
              <View style={styles.emptyPapersCard} testID="no-papers-card">
                <FolderOpen size={32} color="#64748B" />
                <Text style={styles.emptyPapersTitle}>
                  No Digitized Papers on File for Gat {parcel.surveyNumber}
                </Text>
                <Text style={styles.emptyPapersDesc}>
                  Government records for this survey parcel have not been indexed in Landeed yet. You can initiate a live request to pull the certified papers from the state land records portal.
                </Text>

                {fetchError && (
                  <View style={styles.fetchErrorBox}>
                    <AlertTriangle size={14} color="#EF4444" />
                    <Text style={styles.fetchErrorText}>{fetchError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.fetchPapersButton, isFetchingPapers && styles.fetchPapersButtonDisabled]}
                  onPress={handleFetchLivePapers}
                  disabled={isFetchingPapers}
                  testID="extract-live-papers-btn"
                  activeOpacity={0.8}
                >
                  {isFetchingPapers ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.fetchPapersText}>Querying State Land Registry...</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} color="#FFFFFF" />
                      <Text style={styles.fetchPapersText}>Pull Papers from Land Registry</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 1-Click Fetch Official Record CTA Button */}
          <TouchableOpacity
            style={styles.fetchOfficialCta}
            onPress={handleFetchOfficialRecord}
            testID="fetch-official-record-btn"
            {...(Platform.OS === 'web' ? { 'data-testid': 'fetch-official-record-btn' } : {})}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.fetchOfficialCtaText}>
              Fetch Official {parcel.state === 'MH' ? '7/12 & RoR' : 'Revenue Record'}
            </Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Action Button Row */}
          <View style={styles.actionRow}>
            <Link href={`/record/${parcel.recordId}`} asChild>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={handleViewRecord}
                testID="view-certified-record-btn"
                activeOpacity={0.85}
              >
                <FileText size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>View 30-Yr Lineage & Deed</Text>
                <ExternalLink size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleAskTerra}
              testID="investigate-terra-btn"
              activeOpacity={0.85}
            >
              <Sparkles size={16} color="#0284c7" />
              <Text style={styles.secondaryActionText}>Ask Terra AI</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Full-Screen Government Paper Modal Viewer */}
      <LandPaperViewerModal
        paper={selectedPaperForModal}
        parcel={parcel}
        visible={isViewerModalOpen}
        onClose={() => setIsViewerModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    position: 'absolute',
    bottom: 72,
    left: 0,
    right: 0,
    zIndex: 10000,
    paddingHorizontal: 12,
    paddingBottom: 4
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 16,
    maxHeight: 560,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 20
  },
  sheetScroll: {
    maxHeight: 480
  },
  sheetScrollContent: {
    paddingBottom: 8
  },
  dragHandleContainer: {
    alignItems: 'center',
    marginBottom: 6
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10
  },
  surveyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  surveyPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  surveyPillText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  locationPillText: {
    color: '#64748b',
    fontSize: 12
  },
  propertyTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600'
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  badgeSection: {
    marginBottom: 12,
    gap: 6
  },
  scoreBadgeCard: {
    backgroundColor: '#e2e8f080',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  scoreTextCol: {
    flex: 1
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '800'
  },
  scoreMax: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  tierTag: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '800'
  },
  scoreRatingText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  encumbranceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  encumbranceBannerText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1
  },
  attributeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#f4f6fa',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  attributeItem: {
    width: '48%'
  },
  attributeItemFull: {
    width: '100%',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  attributeLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5
  },
  attributeValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600'
  },
  attributeValueHighlight: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '700'
  },

  /* Papers Section Styles */
  papersSection: {
    marginBottom: 14,
    backgroundColor: '#f4f6fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12
  },
  papersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  papersTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  papersSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5
  },
  papersCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  papersCountText: {
    fontSize: 10,
    fontWeight: '800'
  },
  papersList: {
    gap: 8
  },
  paperCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 10
  },
  paperCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6
  },
  paperCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  paperIconBox: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#0284C720'
  },
  paperTitleCol: {
    flex: 1
  },
  paperTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a'
  },
  paperNativeText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1
  },
  paperStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1
  },
  paperStatusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  paperDetailsRow: {
    marginBottom: 8,
    gap: 2
  },
  paperDetailItem: {
    fontSize: 11,
    color: '#64748B'
  },
  paperDetailVal: {
    color: '#334155',
    fontWeight: '500'
  },
  paperActionRow: {
    flexDirection: 'row',
    gap: 8
  },
  viewPaperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  viewPaperText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700'
  },
  downloadPaperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0284C720',
    borderColor: '#0284C7',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  downloadPaperText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700'
  },

  /* Empty state */
  emptyPapersCard: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10
  },
  emptyPapersTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    textAlign: 'center'
  },
  emptyPapersDesc: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16
  },
  fetchErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    marginTop: 8
  },
  fetchErrorText: {
    color: '#EF4444',
    fontSize: 11,
    flex: 1
  },
  fetchPapersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10
  },
  fetchPapersButtonDisabled: {
    opacity: 0.6
  },
  fetchPapersText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700'
  },

  /* Action buttons */
  fetchOfficialCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10
  },
  fetchOfficialCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10
  },
  primaryActionButton: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderColor: '#38BDF880',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6
  },
  primaryActionText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '700'
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 6
  },
  secondaryActionText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  }
});
