import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  SafeAreaView
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { FolderLock, ShieldCheck, ExternalLink, ArrowRight, FileText, ChevronRight } from 'lucide-react-native';
import { LandeedHeader } from '../components/LandeedHeader';
import { LandeedBottomNav } from '../components/LandeedBottomNav';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/apiClient';
import { navigateTo } from '../utils/navigation';

export default function VaultScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedState, setSelectedState] = useState('MH');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    authFetch('/records')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setRecords(data.records || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load vault records:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LandeedHeader
        selectedState={selectedState}
        onSelectState={setSelectedState}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Locker Summary Card */}
        <View style={styles.vaultHeader}>
          <View style={styles.iconCircle}>
            <FolderLock size={26} color="#2563EB" />
          </View>
          <Text style={styles.vaultTitle}>Landeed Property Locker</Text>
          <Text style={styles.vaultSubtitle}>
            {user?.name ? `${user.name}'s verified` : 'Secure'} digital deed vault with on-chain cryptographic title protection and instant QR audit.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading Locker...</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileText size={32} color="#64748B" />
            <Text style={styles.emptyTitle}>No Anchored Documents Yet</Text>
            <Text style={styles.emptyDesc}>
              Query any state land registry (7/12, EC, RTC) to anchor and protect your first title.
            </Text>
            <Link href="/" asChild>
              <TouchableOpacity
                style={styles.searchNowBtn}
                onPress={() => navigateTo(router, '/')}
                activeOpacity={0.7}
              >
                <Text style={styles.searchNowText}>Query Land Registry</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <View style={styles.recordsList}>
            {records.map((r) => {
              const recId = r.recordId || r.id;
              return (
                <Link key={recId} href={`/record/${recId}`} asChild>
                  <TouchableOpacity
                    style={styles.recordCard}
                    onPress={() => navigateTo(router, `/record/${recId}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{r.state} • {r.docType}</Text>
                      </View>
                      <View style={styles.verifiedTag}>
                        <ShieldCheck size={12} color="#059669" />
                        <Text style={styles.verifiedTagText}>On-Chain Mined</Text>
                      </View>
                    </View>

                    <Text style={styles.recordTitle}>{r.title}</Text>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaItem}>District: {r.district}</Text>
                      <Text style={styles.metaItem}>Survey: {r.surveyNo}</Text>
                      <Text style={styles.metaItem}>Khata: {r.khataNo}</Text>
                    </View>

                    <View style={styles.hashBox}>
                      <Text style={styles.hashLabel}>Document SHA-256 Digest:</Text>
                      <Text style={styles.hashValue} numberOfLines={1}>
                        {r.proof?.docHash}
                      </Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.viewDeedText}>View Certified Deed</Text>
                      <ChevronRight size={14} color="#2563EB" />
                    </View>
                  </TouchableOpacity>
                </Link>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <LandeedBottomNav currentTab="locker" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fa'
  },
  container: {
    padding: 16,
    paddingBottom: 20
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 13
  },
  vaultHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  vaultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6
  },
  vaultSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16
  },
  searchNowBtn: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },
  searchNowText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 13
  },
  recordsList: {
    gap: 12
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  pill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669'
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10
  },
  metaItem: {
    fontSize: 11,
    color: '#64748B'
  },
  hashBox: {
    backgroundColor: '#f4f6fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  hashLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2
  },
  hashValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748b'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  },
  viewDeedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB'
  }
});
