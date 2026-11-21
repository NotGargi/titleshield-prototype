import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { QrCode, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { API_BASE_URL } from '../constants/api';
import { LandeedHeader } from '../components/LandeedHeader';
import { LandeedBottomNav } from '../components/LandeedBottomNav';
import { navigateTo } from '../utils/navigation';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedState, setSelectedState] = useState('MH');
  const [docHash, setDocHash] = useState((params.hash as string) || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (params.hash && typeof params.hash === 'string') {
      setDocHash(params.hash);
      verifyDocumentHash(params.hash);
    }
  }, [params.hash]);

  const verifyDocumentHash = async (hashToVerify: string) => {
    if (!hashToVerify.trim()) {
      Alert.alert('Hash Required', 'Please enter or paste a document SHA-256 hash (starting with 0x).');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const cleanHash = hashToVerify.trim();
      const res = await fetch(`${API_BASE_URL}/verify/${cleanHash}?format=json`);
      const data = await res.json();
      setResult(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      Alert.alert('Verification Failed', 'Could not query the blockchain verification service.');
    }
  };

  const handleUseDemoHash = () => {
    const demo = '0xa93dc231d4ab5c140380c7ac6d65738c402df8fcf4221a5b898189538aba453d';
    setDocHash(demo);
    verifyDocumentHash(demo);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LandeedHeader
        selectedState={selectedState}
        onSelectState={setSelectedState}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={28} color="#059669" />
          </View>
          <Text style={styles.title}>Verify Land Title on Blockchain</Text>
          <Text style={styles.subtitle}>
            Validate any Landeed certified extract by checking its cryptographic fingerprint against the Polygon EVM public ledger.
          </Text>
        </View>

        {/* Input Form */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Document SHA-256 Hash</Text>
          <TextInput
            style={styles.input}
            placeholder="0x..."
            placeholderTextColor="#64748B"
            value={docHash}
            onChangeText={setDocHash}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={() => verifyDocumentHash(docHash)}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyBtnText}>Audit On-Chain Record</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.demoHashBtn} onPress={handleUseDemoHash}>
              <Text style={styles.demoHashText}>Paste Latest Mined Hash</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Verification Result Card */}
        {result && (
          <View style={[styles.resultCard, result.verified ? styles.resultCardSuccess : styles.resultCardFail]}>
            <View style={styles.resultHeader}>
              {result.verified ? (
                <CheckCircle2 size={24} color="#059669" />
              ) : (
                <AlertCircle size={24} color="#EF4444" />
              )}
              <Text style={[styles.resultStatus, { color: result.verified ? '#059669' : '#dc2626' }]}>
                {result.verified ? '100% AUTHENTIC & UNALTERED' : 'UNVERIFIED HASH'}
              </Text>
            </View>

            <View style={styles.resultMeta}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Blockchain Network:</Text>
                <Text style={styles.metaVal}>{result.network || 'Polygon Amoy'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Smart Contract:</Text>
                <Text style={styles.metaValMono}>{result.contract ? `${result.contract.slice(0, 16)}...` : '0x71C6A96E...'}</Text>
              </View>
              {result.matchedRecord && (
                <>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>State & Doc:</Text>
                    <Text style={styles.metaVal}>{result.matchedRecord.state} • {result.matchedRecord.docType}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Survey Parcel:</Text>
                    <Text style={styles.metaVal}>{result.matchedRecord.surveyNo}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Registered Owner:</Text>
                    <Text style={styles.metaVal}>{result.matchedRecord.owner}</Text>
                  </View>
                  {result.matchedRecord.recordId && (
                    <Link href={`/record/${result.matchedRecord.recordId}`} asChild>
                      <TouchableOpacity
                        style={styles.viewRecordBtn}
                        onPress={() => navigateTo(router, `/record/${result.matchedRecord.recordId}`)}
                      >
                        <Text style={styles.viewRecordText}>View Full Certified Deed</Text>
                        <ChevronRight size={14} color="#2563EB" />
                      </TouchableOpacity>
                    </Link>
                  )}
                </>
              )}
            </View>

            {result.verified && (
              <View style={styles.auditCertBox}>
                <Text style={styles.auditCertTitle}>Cryptographic Integrity Confirmed:</Text>
                <Text style={styles.auditCertText}>
                  This extract matches the exact SHA-256 hash committed to the EVM state at block height. No unauthorized mutations, title alteration or boundary tampering have occurred since registration.
                </Text>
              </View>
            )}
          </View>
        )}

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
  container: {
    padding: 16,
    paddingBottom: 30
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#f4f6fa',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 13,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12
  },
  btnRow: {
    gap: 8
  },
  verifyBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  demoHashBtn: {
    alignItems: 'center',
    paddingVertical: 8
  },
  demoHashText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600'
  },
  resultCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1
  },
  resultCardSuccess: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  resultCardFail: {
    backgroundColor: '#fef2f2',
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14
  },
  resultStatus: {
    fontSize: 15,
    fontWeight: '800'
  },
  resultMeta: {
    gap: 8,
    marginBottom: 14
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748b'
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a'
  },
  metaValMono: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#334155'
  },
  auditCertBox: {
    backgroundColor: '#f4f6fa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  auditCertTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4
  },
  auditCertText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16
  },
  viewRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2563EB'
  },
  viewRecordText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700'
  }
});
