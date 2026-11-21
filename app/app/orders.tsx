import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import {
  FileCheck2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Download,
  ExternalLink,
  Search
} from 'lucide-react-native';
import { LandeedHeader } from '../components/LandeedHeader';
import { LandeedBottomNav } from '../components/LandeedBottomNav';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/apiClient';
import { navigateTo } from '../utils/navigation';

interface OrderItem {
  recordId: string;
  title: string;
  state: string;
  docType: string;
  surveyNo: string;
  district: string;
  createdAt: string;
  docHash: string;
  txHash: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedState, setSelectedState] = useState('MH');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    authFetch('/records')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.records && Array.isArray(data.records)) {
          const mapped = data.records.map((r: any) => ({
            recordId: r.recordId || r.id,
            title: r.title,
            state: r.state,
            docType: r.docType,
            surveyNo: r.surveyNo,
            district: r.district,
            createdAt: r.timestamp
              ? new Date(r.timestamp).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Recent',
            docHash: r.proof?.docHash || '',
            txHash: r.proof?.transactionHash || ''
          }));
          setOrders(mapped);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBanner}>
          <View style={styles.badgeRow}>
            <View style={styles.pillBadge}>
              <FileCheck2 size={12} color="#059669" />
              <Text style={styles.pillText}>RECORD TRACKER</Text>
            </View>
          </View>
          <Text style={styles.heading}>My Document Orders</Text>
          <Text style={styles.subheading}>
            All state revenue records extracted by TinyFish agents & anchored on-chain
          </Text>
        </View>

        {/* Orders Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading document orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileCheck2 size={36} color="#64748B" />
            <Text style={styles.emptyTitle}>No Orders Placed Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your certified state records and on-chain anchored titles will appear here.
            </Text>
            <TouchableOpacity
              style={styles.emptySearchBtn}
              onPress={() => navigateTo(router, `/search/${selectedState}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.emptySearchBtnText}>Search State Registry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((ord) => (
              <Link key={ord.recordId} href={`/record/${ord.recordId}`} asChild>
                <TouchableOpacity
                  style={styles.orderCard}
                  onPress={() => navigateTo(router, `/record/${ord.recordId}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.orderCardHeader}>
                    <View style={styles.stateTag}>
                      <Text style={styles.stateTagText}>{ord.state}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>DELIVERED & ANCHORED</Text>
                    </View>
                  </View>

                  <Text style={styles.orderTitle}>{ord.title}</Text>
                  <Text style={styles.orderMeta}>
                    District: {ord.district} • Survey: {ord.surveyNo} • {ord.createdAt}
                  </Text>

                  {/* On-Chain Hash */}
                  <View style={styles.hashRow}>
                    <ShieldCheck size={14} color="#059669" />
                    <Text style={styles.hashText} numberOfLines={1}>
                      SHA-256: {ord.docHash}
                    </Text>
                  </View>

                  <View style={styles.orderActions}>
                    <Link href={`/record/${ord.recordId}`} asChild>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          navigateTo(router, `/record/${ord.recordId}`);
                        }}
                      >
                        <Text style={styles.actionBtnText}>View Certified Extract</Text>
                        <ChevronRight size={14} color="#2563EB" />
                      </TouchableOpacity>
                    </Link>

                    <Link href={`/verify?hash=${ord.docHash}`} asChild>
                      <TouchableOpacity
                        style={styles.verifyLinkBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          navigateTo(router, `/verify?hash=${ord.docHash}`);
                        }}
                      >
                        <Text style={styles.verifyLinkText}>Verify</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        )}

        {/* Start New Search Banner */}
        <Link href={`/search/${selectedState}`} asChild>
          <TouchableOpacity
            style={styles.newSearchBox}
            onPress={() => navigateTo(router, `/search/${selectedState}`)}
            activeOpacity={0.8}
          >
            <Search size={18} color="#2563EB" />
            <View style={{ flex: 1 }}>
              <Text style={styles.newSearchTitle}>Search Another Land Parcel</Text>
              <Text style={styles.newSearchSubtitle}>Query official state portals across India</Text>
            </View>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>
        </Link>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LandeedBottomNav currentTab="orders" />
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
  headerBanner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4
  },
  subheading: {
    fontSize: 12,
    color: '#64748b'
  },
  ordersList: {
    paddingHorizontal: 16,
    gap: 12
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  stateTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  stateTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669'
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4
  },
  orderMeta: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f4f6fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12
  },
  hashText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    flex: 1
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB'
  },
  verifyLinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff'
  },
  verifyLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669'
  },
  newSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12
  },
  newSearchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a'
  },
  newSearchSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
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
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    gap: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8
  },
  emptySearchBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },
  emptySearchBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13
  }
});
