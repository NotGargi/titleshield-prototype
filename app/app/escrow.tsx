import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Scale,
  FileSignature,
  KeyRound,
  CheckCircle2,
  Circle,
  RefreshCw,
  ClipboardCheck,
  AlertTriangle
} from 'lucide-react-native';
import { LandeedHeader } from '../components/LandeedHeader';
import { LandeedBottomNav } from '../components/LandeedBottomNav';

// Demo flow: the title score only CLEARS the title. Money stays locked in escrow
// and is released ONLY at sale deed registration, after the buyer confirms by OTP
// (plus a lawyer sign-off for deals of Rs 50 lakh and above).

const LAWYER_THRESHOLD = 5000000; // Rs 50 lakh
const DEMO_OTP = '482913';

const DEAL_OPTIONS = [
  { label: '₹35 Lakh', value: 3500000 },
  { label: '₹68 Lakh', value: 6800000 },
  { label: '₹1.2 Cr', value: 12000000 }
];

const CHECKED_SOURCES = [
  'Record of Rights (7/12 & 8A) on the state revenue portal',
  'Mutation / Ferfar history and pending mutation notices',
  'IGR Index-II registered sale deeds (last 30 years available online)',
  'CERSAI registry for bank mortgages and charges',
  'e-Courts (NJDG) for pending suits and Lis Pendens',
  'Municipal property tax dues'
];

const NOT_COVERED = [
  'Unregistered agreements, oral family settlements or private loans',
  'Records not yet digitised by the sub-registrar office',
  'Physical possession and on-ground boundary disputes'
];

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  return `₹${(v / 100000).toFixed(0)} Lakh`;
}

function nowStamp() {
  const d = new Date();
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function EscrowScreen() {
  const params = useLocalSearchParams();
  const surveyNo = (params.surveyNo as string) || '142/2A';
  const village = (params.village as string) || 'Wagholi, Pune';

  const [selectedState, setSelectedState] = useState('MH');
  const [dealValue, setDealValue] = useState(6800000);
  const [checks, setChecks] = useState<string[]>([nowStamp()]);
  const [lawyerSigned, setLawyerSigned] = useState(false);
  const [deedNo, setDeedNo] = useState('');
  const [deedRegistered, setDeedRegistered] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [released, setReleased] = useState(false);

  // DEMO: Survey 77/3 is the court-disputed case: title not cleared, release blocked
  const isDisputed = surveyNo.trim() === '77/3';
  const [refunded, setRefunded] = useState(false);
  const needsLawyer = dealValue >= LAWYER_THRESHOLD;
  const lawyerOk = !needsLawyer || lawyerSigned;
  const readyForOtp = !isDisputed && lawyerOk && deedRegistered;

  const runRecheck = () => setChecks(prev => [nowStamp(), ...prev].slice(0, 5));

  const confirmRelease = () => {
    if (otp.trim() !== DEMO_OTP) {
      setOtpError('Incorrect OTP. For this demo, use ' + DEMO_OTP + '.');
      return;
    }
    setOtpError('');
    runRecheck();
    setReleased(true);
  };

  const resetDemo = () => {
    setLawyerSigned(false);
    setDeedNo('');
    setDeedRegistered(false);
    setOtpSent(false);
    setOtp('');
    setOtpError('');
    setReleased(false);
    setChecks([nowStamp()]);
  };

  const StepIcon = ({ done }: { done: boolean }) =>
    done ? <CheckCircle2 size={20} color="#059669" /> : <Circle size={20} color="#94a3b8" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LandeedHeader selectedState={selectedState} onSelectState={setSelectedState} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.hero}>
          <View style={styles.tag}>
            <Lock size={12} color="#2563EB" />
            <Text style={styles.tagText}>SAFE ESCROW</Text>
          </View>
          <Text style={styles.title}>Buyer-Protected Escrow</Text>
          <Text style={styles.subtitle}>
            Survey No. {surveyNo} • {village}
          </Text>
        </View>

        {/* Status card */}
        {isDisputed && (
          <View style={[styles.statusCard, styles.statusBlocked]}>
            <AlertTriangle size={22} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: '#b91c1c' }]}>
                {refunded ? 'Advance refunded to buyer' : 'Release BLOCKED — court dispute found'}
              </Text>
              <Text style={styles.statusHint}>
                Regular Civil Suit No. 412/2023 (Pune) is pending on this land. The title is not cleared, so the money can never go to the seller.
              </Text>
              {!refunded && (
                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#fecaca', backgroundColor: '#fff' }]} onPress={() => setRefunded(true)}>
                  <Text style={[styles.secondaryBtnText, { color: '#b91c1c' }]}>Refund advance to buyer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={[styles.statusCard, released ? styles.statusReleased : styles.statusLocked]}>
          {released ? <Unlock size={22} color="#059669" /> : <Lock size={22} color="#2563EB" />}
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{released ? 'Funds released to seller' : 'Funds locked in escrow'}</Text>
            <Text style={styles.statusAmount}>{formatINR(dealValue)}</Text>
            <Text style={styles.statusHint}>
              {released
                ? 'Released at sale deed registration after buyer OTP confirmation.'
                : 'Money is released only at sale deed registration — never automatically.'}
            </Text>
          </View>
        </View>

        {/* Deal value */}
        {!released && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deal value</Text>
            <View style={styles.chipRow}>
              {DEAL_OPTIONS.map(opt => {
                const active = opt.value === dealValue;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setDealValue(opt.value);
                      setLawyerSigned(false);
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.mutedSmall}>
              {needsLawyer
                ? 'Deal is ₹50 Lakh or above — independent lawyer sign-off is required.'
                : 'Below ₹50 Lakh — lawyer sign-off optional.'}
            </Text>
          </View>
        )}

        {/* Steps */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Release conditions</Text>

          {/* Step 1 */}
          <View style={styles.step}>
            {isDisputed ? <AlertTriangle size={20} color="#dc2626" /> : <StepIcon done />}
            <View style={styles.stepBody}>
              <Text style={[styles.stepTitle, isDisputed && { color: '#b91c1c' }]}>
                {isDisputed ? '1. Title NOT cleared (score 34/100)' : '1. Title cleared (score 98/100)'}
              </Text>
              <Text style={styles.stepText}>
                {isDisputed
                  ? 'Active court case (Lis Pendens) found. No further step can release the money.'
                  : 'The score clears the title only. It does not trigger any payment.'}
              </Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.step}>
            <StepIcon done={checks.length > 0} />
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>2. Daily monitoring until registration</Text>
              <Text style={styles.stepText}>
                Portals are re-checked every day for new mortgages, court cases or mutations. A final re-check runs at release.
              </Text>
              {checks.map((c, i) => (
                <Text key={i} style={styles.checkLine}>✓ Re-check clean • {c}</Text>
              ))}
              {!released && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={runRecheck}>
                  <RefreshCw size={14} color="#2563EB" />
                  <Text style={styles.secondaryBtnText}>Run re-check now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Step 3 */}
          <View style={styles.step}>
            <StepIcon done={lawyerOk} />
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>
                3. Lawyer sign-off {needsLawyer ? '(required)' : '(not required)'}
              </Text>
              <Text style={styles.stepText}>
                For deals of ₹50 Lakh and above, an independent advocate reviews the report and signs off.
              </Text>
              {needsLawyer && !lawyerSigned && !released && !isDisputed && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setLawyerSigned(true)}>
                  <Scale size={14} color="#2563EB" />
                  <Text style={styles.secondaryBtnText}>Record lawyer e-sign</Text>
                </TouchableOpacity>
              )}
              {needsLawyer && lawyerSigned && (
                <Text style={styles.checkLine}>✓ Signed by Adv. R. Kulkarni (demo)</Text>
              )}
            </View>
          </View>

          {/* Step 4 */}
          <View style={styles.step}>
            <StepIcon done={deedRegistered} />
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>4. Sale deed registered</Text>
              <Text style={styles.stepText}>
                Release happens only at the time of purchase — when the sale deed is registered at the sub-registrar office.
              </Text>
              {!deedRegistered && !released && !isDisputed && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Registration no. (e.g. HVL-1234/2026)"
                    placeholderTextColor="#94a3b8"
                    value={deedNo}
                    onChangeText={setDeedNo}
                  />
                  <TouchableOpacity
                    style={[styles.secondaryBtn, !deedNo.trim() && styles.btnDisabled]}
                    disabled={!deedNo.trim()}
                    onPress={() => setDeedRegistered(true)}
                  >
                    <FileSignature size={14} color="#2563EB" />
                    <Text style={styles.secondaryBtnText}>Confirm registration</Text>
                  </TouchableOpacity>
                </>
              )}
              {deedRegistered && <Text style={styles.checkLine}>✓ Deed no. {deedNo}</Text>}
            </View>
          </View>

          {/* Step 5 */}
          <View style={[styles.step, { borderBottomWidth: 0 }]}>
            <StepIcon done={released} />
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>5. Buyer confirms release with OTP</Text>
              <Text style={styles.stepText}>
                At registration, the buyer approves the release with an OTP sent to their registered mobile.
              </Text>
              {!released && !readyForOtp && (
                <Text style={styles.waitText}>{isDisputed ? 'Blocked: title not cleared.' : 'Waiting for steps 3 and 4.'}</Text>
              )}
              {!released && readyForOtp && !otpSent && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setOtpSent(true)}>
                  <KeyRound size={14} color="#2563EB" />
                  <Text style={styles.secondaryBtnText}>Send OTP to buyer</Text>
                </TouchableOpacity>
              )}
              {!released && otpSent && (
                <>
                  <Text style={styles.mutedSmall}>Demo OTP: {DEMO_OTP}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                  {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}
                </>
              )}
            </View>
          </View>

          {!released ? (
            <TouchableOpacity
              style={[styles.primaryBtn, !(readyForOtp && otpSent && otp.length === 6) && styles.btnDisabled]}
              disabled={!(readyForOtp && otpSent && otp.length === 6)}
              onPress={confirmRelease}
            >
              <Unlock size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Release funds to seller</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.outlineBtn} onPress={resetDemo}>
              <Text style={styles.outlineBtnText}>Reset demo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Certificate */}
        <View style={styles.card}>
          <View style={styles.certHeader}>
            <ClipboardCheck size={18} color="#059669" />
            <Text style={styles.cardTitle}>Diligence certificate — what we checked</Text>
          </View>
          <Text style={styles.mutedSmall}>
            This certificate lists the sources checked. It is not a guarantee that the title is 100% clean.
          </Text>
          {isDisputed && (
            <View style={[styles.listRow, { marginBottom: 4 }]}>
              <AlertTriangle size={14} color="#dc2626" />
              <Text style={[styles.listText, { color: '#b91c1c', fontWeight: '700' }]}>
                Finding: Regular Civil Suit No. 412/2023 pending (partition and title suit by co-heir)
              </Text>
            </View>
          )}
          {CHECKED_SOURCES.map((s, i) => (
            <View key={i} style={styles.listRow}>
              <ShieldCheck size={14} color="#059669" />
              <Text style={styles.listText}>{s}</Text>
            </View>
          ))}
          <Text style={[styles.cardTitle, { marginTop: 14 }]}>Not covered</Text>
          {NOT_COVERED.map((s, i) => (
            <View key={i} style={styles.listRow}>
              <AlertTriangle size={14} color="#d97706" />
              <Text style={styles.listText}>{s}</Text>
            </View>
          ))}
          <Text style={styles.mutedSmall}>Last checked: {checks[0]}</Text>
        </View>
      </ScrollView>

      <LandeedBottomNav currentTab="search" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa' },
  container: { padding: 16, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  hero: { marginBottom: 14 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8
  },
  tagText: { fontSize: 11, fontWeight: '800', color: '#2563EB', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  statusCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14
  },
  statusLocked: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  statusReleased: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statusBlocked: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  statusAmount: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginVertical: 2 },
  statusHint: { fontSize: 12, color: '#475569' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#FFFFFF' },
  step: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  stepText: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },
  checkLine: { fontSize: 12, color: '#059669', marginTop: 6, fontWeight: '600' },
  waitText: { fontSize: 12, color: '#d97706', marginTop: 6, fontWeight: '600' },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 6 },
  mutedSmall: { fontSize: 12, color: '#64748b', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginTop: 8
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563EB'
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  outlineBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center'
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  btnDisabled: { opacity: 0.45 },
  certHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8 },
  listText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 }
});
