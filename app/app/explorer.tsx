import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import {
  Compass,
  MapPin,
  Search,
  Layers,
  FileText,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react-native';
import { LandeedHeader } from '../components/LandeedHeader';
import { LandeedBottomNav } from '../components/LandeedBottomNav';
import { CadastralMap } from '../components/CadastralMap';
import { PropertySummarySheet } from '../components/PropertySummarySheet';
import {
  CadastralParcel,
  SEEDED_CADASTRAL_PARCELS,
  REGIONAL_PRESETS
} from '../constants/cadastralData';
import { GeoPoint } from '../utils/geoProjection';
import { API_BASE_URL } from '../constants/api';
import { navigateTo } from '../utils/navigation';

export default function ExplorerScreen() {
  const router = useRouter();

  // Initial default: Pune Wagholi Gat 142/2A
  const defaultParcel = SEEDED_CADASTRAL_PARCELS[0];

  const [selectedState, setSelectedState] = useState<string>(defaultParcel.state);
  const [district, setDistrict] = useState<string>(defaultParcel.district);
  const [village, setVillage] = useState<string>(defaultParcel.village);
  const [surveyNo, setSurveyNo] = useState<string>(defaultParcel.surveyNumber);

  const [mapCenter, setMapCenter] = useState<GeoPoint>(defaultParcel.coordinates);
  const [zoom, setZoom] = useState<number>(16);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [selectedParcel, setSelectedParcel] = useState<CadastralParcel | null>(defaultParcel);
  const [showSummarySheet, setShowSummarySheet] = useState<boolean>(true);

  // Sync inputs and camera flight when selected parcel changes
  const handleSelectParcel = (parcel: CadastralParcel) => {
    setSelectedParcel(parcel);
    setSelectedState(parcel.state);
    setDistrict(parcel.district);
    setVillage(parcel.village);
    setSurveyNo(parcel.surveyNumber);
    if (parcel.coordinates) {
      setMapCenter(parcel.coordinates);
      setZoom(16);
    }
    setShowSummarySheet(true);
  };

  // Search / Locate parcel handler with backend API query and local fallback
  const handleLocateParcel = async () => {
    const cleanedSurvey = surveyNo.trim();
    const cleanedVillage = village.trim();
    const cleanedDistrict = district.trim();
    const cleanedState = selectedState.trim();

    setIsLocating(true);

    try {
      const queryParams = new URLSearchParams();
      if (cleanedSurvey) queryParams.set('surveyNo', cleanedSurvey);
      if (cleanedState) queryParams.set('state', cleanedState);
      if (cleanedDistrict) queryParams.set('district', cleanedDistrict);
      if (cleanedVillage) queryParams.set('village', cleanedVillage);

      const res = await fetch(`${API_BASE_URL}/cadastre/parcels?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list: CadastralParcel[] = Array.isArray(data?.parcels)
          ? data.parcels
          : (Array.isArray(data) ? data : []);

        if (list.length > 0) {
          const found = list[0];
          handleSelectParcel(found);
          setShowSummarySheet(true);
          return;
        }
      }
    } catch (err) {
      console.warn('[Explorer] Backend parcel search failed, falling back to local array:', err);
    } finally {
      setIsLocating(false);
    }

    // Client-side fallback to SEEDED_CADASTRAL_PARCELS
    const lowerSurvey = cleanedSurvey.toLowerCase();
    const lowerVillage = cleanedVillage.toLowerCase();

    const matched =
      SEEDED_CADASTRAL_PARCELS.find((p) => {
        const pSurvey = p.surveyNumber.toLowerCase();
        const pVillage = p.village.toLowerCase();
        return (
          (pSurvey === lowerSurvey || pSurvey.includes(lowerSurvey)) &&
          (!lowerVillage || pVillage.includes(lowerVillage))
        );
      }) ||
      SEEDED_CADASTRAL_PARCELS.find((p) => {
        return p.surveyNumber.toLowerCase().includes(lowerSurvey);
      }) ||
      defaultParcel;

    handleSelectParcel(matched);
    setShowSummarySheet(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LandeedHeader
        selectedState={selectedState}
        onSelectState={setSelectedState}
        onOpenHelp={() => navigateTo(router, '/terra')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Banner */}
        <View style={styles.titleBanner}>
          <View style={styles.tagRow}>
            <View style={styles.pillBadge}>
              <Compass size={13} color="#2563EB" />
              <Text style={styles.pillText}>PAN-INDIA CADASTRAL SURVEY ENGINE</Text>
            </View>
            <View style={styles.pillBadgeGreen}>
              <CheckCircle2 size={12} color="#059669" />
              <Text style={styles.pillTextGreen}>EPSG:3857 ACCURATE</Text>
            </View>
          </View>
          <Text style={styles.heading}>Interactive Physical & Cadastral Map</Text>
          <Text style={styles.subheading}>
            Explore satellite imagery, official revenue boundaries, and instant sovereign property records
          </Text>
        </View>

        {/* Location Selector Bar */}
        <View style={styles.selectorCard}>
          <View style={styles.inputRow}>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>District</Text>
              <TextInput
                style={styles.textInput}
                value={district}
                onChangeText={setDistrict}
                placeholder="District"
                placeholderTextColor="#64748B"
                testID="explorer-input-district"
              />
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Village / Sector</Text>
              <TextInput
                style={styles.textInput}
                value={village}
                onChangeText={setVillage}
                placeholder="Village"
                placeholderTextColor="#64748B"
                testID="explorer-input-village"
              />
            </View>
            <View style={[styles.inputBox, { flex: 0.9 }]}>
              <Text style={styles.inputLabel}>Survey / Gat No.</Text>
              <TextInput
                style={styles.textInput}
                value={surveyNo}
                onChangeText={setSurveyNo}
                placeholder="e.g. 142/2A"
                placeholderTextColor="#64748B"
                testID="explorer-input-surveyno"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.locateBtn, isLocating && styles.locateBtnDisabled]}
            onPress={handleLocateParcel}
            disabled={isLocating}
            activeOpacity={0.85}
            testID="locate-parcel-btn"
            {...(Platform.OS === 'web' ? { 'data-testid': 'locate-parcel-btn' } : {})}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Search size={16} color="#FFFFFF" />
            )}
            <Text style={styles.locateBtnText}>
              {isLocating ? 'Locating Parcel...' : 'Locate Parcel on Cadastral Map'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Interactive Cadastral Map Component */}
        <View style={styles.mapSection}>
          <CadastralMap
            selectedParcel={selectedParcel}
            onSelectParcel={handleSelectParcel}
            centerCoords={mapCenter}
            zoomLevel={zoom}
            height={440}
          />
        </View>

        {/* Persistent Summary Details Card */}
        {selectedParcel && (
          <View style={styles.detailCard} testID="selected-parcel-detail-card">
            <View style={styles.detailCardHeader}>
              <View>
                <Text style={styles.detailCardTitle}>
                  Survey {selectedParcel.surveyNumber}
                </Text>
                <Text style={styles.detailCardSub}>
                  {selectedParcel.village}, Taluka {selectedParcel.taluka}, Dist {selectedParcel.district}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    borderColor:
                      selectedParcel.cleanTitleTier === 'CRITICAL'
                        ? '#EF4444'
                        : selectedParcel.cleanTitleTier === 'MODERATE'
                        ? '#d97706'
                        : '#059669'
                  }
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color:
                        selectedParcel.cleanTitleTier === 'CRITICAL'
                          ? '#EF4444'
                          : selectedParcel.cleanTitleTier === 'MODERATE'
                          ? '#d97706'
                          : '#059669'
                    }
                  ]}
                >
                  {selectedParcel.cleanTitleTier} RISK
                </Text>
              </View>
            </View>

            <View style={styles.infoRowGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Primary Khatadar / Owner</Text>
                <Text style={styles.infoVal}>{selectedParcel.claimedOwner}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Holding Area</Text>
                <Text style={styles.infoVal}>{selectedParcel.extent}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Guidance Value</Text>
                <Text style={[styles.infoVal, { color: '#0284c7' }]}>
                  {selectedParcel.guidanceValueInr}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Market Value</Text>
                <Text style={[styles.infoVal, { color: '#0284c7' }]}>
                  {selectedParcel.marketValueInr}
                </Text>
              </View>
            </View>

            {/* Direct Action Navigation */}
            <View style={styles.ctaButtonColumn}>
              {/* 1-Click Fetch Official Record Deep Link */}
              <TouchableOpacity
                style={styles.cardFetchOfficialBtn}
                onPress={() => {
                  let docType = '7_12';
                  if (selectedParcel.state === 'UP') docType = 'KHATAUNI';
                  else if (selectedParcel.state === 'KA') docType = 'RTC';
                  else if (selectedParcel.state === 'TG') docType = 'PASSBOOK';
                  else if (selectedParcel.state === 'TN') docType = 'PATTA_CHITTA';

                  router.push({
                    pathname: `/search/${selectedParcel.state}`,
                    params: {
                      district: selectedParcel.district,
                      taluka: selectedParcel.taluka,
                      village: selectedParcel.village,
                      surveyNo: selectedParcel.surveyNumber,
                      docType,
                      autoFetch: 'true'
                    }
                  });
                }}
                testID="card-fetch-official-ror-btn"
                {...(Platform.OS === 'web' ? { 'data-testid': 'card-fetch-official-ror-btn' } : {})}
                activeOpacity={0.85}
              >
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.cardFetchOfficialText}>
                  Fetch Official {selectedParcel.state === 'MH' ? '7/12 & RoR' : 'Record'}
                </Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.ctaButtonRow}>
                <Link href={`/record/${selectedParcel.recordId}`} asChild>
                  <TouchableOpacity
                    style={styles.primaryCta}
                    onPress={() => {
                      if (selectedParcel.recordId) {
                        navigateTo(router, `/record/${selectedParcel.recordId}`);
                      }
                    }}
                    activeOpacity={0.85}
                    testID="card-view-certified-record-btn"
                  >
                    <FileText size={16} color="#FFFFFF" />
                    <Text style={styles.primaryCtaText}>View Certified Record</Text>
                    <ChevronRight size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </Link>

                <TouchableOpacity
                  style={styles.secondaryCta}
                  onPress={() => {
                    router.push({
                      pathname: '/terra',
                      params: {
                        surveyNo: selectedParcel.surveyNumber,
                        state: selectedParcel.state,
                        district: selectedParcel.district,
                        taluka: selectedParcel.taluka,
                        village: selectedParcel.village,
                        parcelId: selectedParcel.id,
                        recordId: selectedParcel.recordId,
                        claimedOwner: selectedParcel.claimedOwner,
                        extent: selectedParcel.extent,
                        cleanTitleScore: selectedParcel.cleanTitleScore?.toString(),
                        encumbranceStatus: selectedParcel.encumbranceStatus
                      }
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Sparkles size={16} color="#0284c7" />
                  <Text style={styles.secondaryCtaText}>Investigate with Terra AI</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Spacing for Bottom Sheet and Bottom Navigation */}
        <View style={{ height: showSummarySheet && selectedParcel ? 340 : 100 }} />
      </ScrollView>

      {/* Slide-Up Property Summary Sheet Modal */}
      {showSummarySheet && selectedParcel && (
        <PropertySummarySheet
          parcel={selectedParcel}
          onClose={() => setShowSummarySheet(false)}
        />
      )}

      <LandeedBottomNav currentTab="explorer" />
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
  titleBanner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563EB'
  },
  pillText: {
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  pillBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981'
  },
  pillTextGreen: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  heading: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4
  },
  subheading: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18
  },
  selectorCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 12
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10
  },
  inputBox: {
    flex: 1
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4
  },
  textInput: {
    backgroundColor: '#f4f6fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13
  },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 8
  },
  locateBtnDisabled: {
    opacity: 0.7
  },
  locateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  mapSection: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  detailCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16
  },
  detailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  detailCardTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700'
  },
  detailCardSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#f1f5f9'
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800'
  },
  infoRowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  infoCol: {
    width: '47%'
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5
  },
  infoVal: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600'
  },
  ctaButtonColumn: {
    gap: 10
  },
  cardFetchOfficialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8
  },
  cardFetchOfficialText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700'
  },
  ctaButtonRow: {
    flexDirection: 'row',
    gap: 10
  },
  primaryCta: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  secondaryCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF840',
    gap: 6
  },
  secondaryCtaText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '600'
  }
});
