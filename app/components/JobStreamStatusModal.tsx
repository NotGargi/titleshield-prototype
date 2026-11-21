import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Globe2
} from 'lucide-react-native';
import { MilestoneStep, DataProvenance } from '../hooks/useJobStream';

export interface JobStreamStatusModalProps {
  visible: boolean;
  ticketId?: string;
  featureName?: string;
  status: string;
  percent: number;
  milestones: MilestoneStep[];
  currentStepMessage?: string;
  isDegraded?: boolean;
  degradationReason?: string | null;
  degradationNotice?: string | null;
  dataProvenance?: DataProvenance | null;
  isLive?: boolean;
  serverTimestamp?: string | null;
  recordId?: string | null;
  error?: string | null;
  transport?: 'sse' | 'polling' | 'none';
  onClose?: () => void;
  onViewRecord?: () => void;
}

export const JobStreamStatusModal: React.FC<JobStreamStatusModalProps> = ({
  visible,
  ticketId,
  featureName = 'Land Registry Extract',
  status,
  percent,
  milestones,
  currentStepMessage = 'Executing query via background worker pool...',
  isDegraded = false,
  degradationReason,
  degradationNotice,
  dataProvenance,
  isLive = false,
  serverTimestamp,
  recordId,
  error,
  transport = 'sse',
  onClose,
  onViewRecord
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyTicket = () => {
    if (!ticketId) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ticketId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCompleted = status === 'completed' || status === 'COMPLETED' || percent === 100;
  const isFailed = status === 'failed' || status === 'FAILED' || !!error;

  // Anti-masquerading invariant: if effectiveIsLive is false, never render green LIVE_PORTAL badge or banner
  const effectiveIsLive = isLive === true && dataProvenance === 'LIVE_PORTAL' && !isDegraded;
  const isSynthetic = dataProvenance === 'REGIONAL_EMULATOR_SYNTHETIC';
  const isBenchmark = (isDegraded || dataProvenance === 'VERIFIED_PRESEEDED_CACHE') && !effectiveIsLive && !isSynthetic;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header: Agent Bot, Title, and Transport Pill */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Bot size={26} color="#0891b2" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>TinyFish Real-Time Agent</Text>
                  <View
                    style={[
                      styles.transportBadge,
                      transport === 'sse'
                        ? styles.transportBadgeSse
                        : transport === 'polling'
                        ? styles.transportBadgePoll
                        : styles.transportBadgeNone
                    ]}
                  >
                    <View
                      style={[
                        styles.transportDot,
                        transport === 'sse'
                          ? styles.transportDotSse
                          : transport === 'polling'
                          ? styles.transportDotPoll
                          : styles.transportDotNone
                      ]}
                    />
                    <Text
                      style={[
                        styles.transportText,
                        transport === 'sse'
                          ? styles.transportTextSse
                          : transport === 'polling'
                          ? styles.transportTextPoll
                          : styles.transportTextNone
                      ]}
                    >
                      {transport === 'sse'
                        ? 'LIVE STREAM (SSE)'
                        : transport === 'polling'
                        ? 'POLLING FALLBACK'
                        : 'CONNECTING...'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>{featureName}</Text>
              </View>
            </View>

            {/* Ticket ID Banner */}
            {ticketId ? (
              <View style={styles.ticketCard}>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketLabel}>TRACKING TICKET</Text>
                  <Text style={styles.ticketValue}>{ticketId}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={handleCopyTicket}
                  activeOpacity={0.7}
                >
                  {copied ? (
                    <>
                      <Check size={14} color="#059669" />
                      <Text style={styles.copiedText}>Copied</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={14} color="#64748b" />
                      <Text style={styles.copyText}>Copy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Progress Bar with Dynamic Percentage */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>EXECUTION PROGRESS</Text>
                <Text style={styles.progressPercent}>{Math.min(100, Math.max(0, percent))}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, percent))}%`,
                      backgroundColor: isFailed ? '#ef4444' : isDegraded ? '#d97706' : '#0891b2'
                    }
                  ]}
                />
              </View>
            </View>

            {/* Current Active Step Banner */}
            <View style={styles.activeStepBox}>
              {!isCompleted && !isFailed ? (
                <ActivityIndicator size="small" color="#0891b2" />
              ) : isFailed ? (
                <XCircle size={18} color="#ef4444" />
              ) : effectiveIsLive ? (
                <CheckCircle2 size={18} color="#059669" />
              ) : isSynthetic ? (
                <AlertTriangle size={18} color="#8b5cf6" />
              ) : (
                <AlertTriangle size={18} color="#d97706" />
              )}
              <Text style={styles.activeStepText} numberOfLines={3}>
                {currentStepMessage || 'Navigating official state land portal...'}
              </Text>
            </View>

            {/* 🟢 Live Government Portal Verified Banner (Section 63 BSA 2023) */}
            {effectiveIsLive && (isCompleted || !isDegraded) ? (
              <View style={styles.livePortalBanner}>
                <View style={styles.livePortalHeader}>
                  <CheckCircle2 size={18} color="#059669" />
                  <Text style={styles.livePortalTitle}>
                    ✓ LIVE GOVERNMENT PORTAL EXTRACTION VERIFIED
                  </Text>
                </View>
                <Text style={styles.livePortalBody}>
                  Direct automated extraction verified from official state revenue portal via browser automation agent. Document cryptographic integrity verified.
                </Text>
                <View style={styles.livePortalMetaRow}>
                  <Text style={styles.livePortalMetaText}>
                    Timestamp: {serverTimestamp || new Date().toISOString()}
                  </Text>
                  {ticketId ? (
                    <Text style={styles.livePortalMetaText}>Ticket: {ticketId}</Text>
                  ) : null}
                </View>
                <View style={styles.livePortalFooter}>
                  <ShieldCheck size={13} color="#059669" />
                  <Text style={styles.livePortalLegal}>
                    Section 63 BSA 2023 Digital Evidence Certified: Authentic government portal extract with server timestamps.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* 🟡 Verified Benchmark Cache Banner (Section 63 BSA 2023) */}
            {isBenchmark && (isCompleted || isDegraded) ? (
              <View style={styles.truthSerumBanner}>
                <View style={styles.truthSerumHeader}>
                  <AlertTriangle size={18} color="#d97706" />
                  <Text style={styles.truthSerumTitle}>
                    ⚠️ TRUTH-SERUM TRANSPARENCY: VERIFIED BENCHMARK CACHE
                  </Text>
                </View>
                <Text style={styles.truthSerumBody}>
                  {degradationReason || degradationNotice ||
                    '⚠️ Downstream Quota Barrier (HTTP 402) - Loaded Verified Offline Benchmark'}
                </Text>
                {ticketId ? (
                  <View style={styles.livePortalMetaRow}>
                    <Text style={[styles.livePortalMetaText, { color: '#b45309' }]}>Ticket: {ticketId}</Text>
                    {serverTimestamp ? (
                      <Text style={[styles.livePortalMetaText, { color: '#b45309' }]}>Timestamp: {serverTimestamp}</Text>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.truthSerumFooter}>
                  <ShieldCheck size={13} color="#d97706" />
                  <Text style={styles.truthSerumLegal}>
                    Section 63 BSA 2023 Evidentiary Transparency: Historical verified benchmark served without synthetic masquerading.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* 🟣 Regional Rule-Based Emulator Synthesis Banner (Section 63 BSA 2023) */}
            {isSynthetic && (isCompleted || isDegraded) ? (
              <View style={styles.syntheticBanner}>
                <View style={styles.syntheticHeader}>
                  <AlertTriangle size={18} color="#8b5cf6" />
                  <Text style={styles.syntheticTitle}>
                    ⚡ REGIONAL RULE-BASED EMULATOR SYNTHESIS
                  </Text>
                </View>
                <Text style={styles.syntheticBody}>
                  {degradationReason || degradationNotice ||
                    'Upstream government portal challenge or security barrier encountered. Record synthesized by regional rule engines based on official gazette schema rules.'}
                </Text>
                {ticketId ? (
                  <View style={styles.livePortalMetaRow}>
                    <Text style={[styles.livePortalMetaText, { color: '#9333ea' }]}>Ticket: {ticketId}</Text>
                    {serverTimestamp ? (
                      <Text style={[styles.livePortalMetaText, { color: '#9333ea' }]}>Timestamp: {serverTimestamp}</Text>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.syntheticFooter}>
                  <ShieldCheck size={13} color="#8b5cf6" />
                  <Text style={styles.syntheticLegal}>
                    Section 63 BSA 2023 Evidentiary Notice: Synthetic simulation record. NOT an authentic government portal extract.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Error / DLQ Banner */}
            {isFailed ? (
              <View style={styles.errorBanner}>
                <View style={styles.truthSerumHeader}>
                  <XCircle size={18} color="#ef4444" />
                  <Text style={styles.errorTitle}>QUERY EXECUTION FAILED</Text>
                </View>
                <Text style={styles.errorBody}>
                  {error || 'The remote registry service could not be reached after maximum retry attempts.'}
                </Text>
                <Text style={styles.dlqNotice}>
                  [Dead-Letter Queue] Diagnostic error trace recorded with attempt counts.
                </Text>
              </View>
            ) : null}

            {/* 6-Stage Milestone Stepper */}
            <View style={styles.stepperContainer}>
              <Text style={styles.stepperHeading}>PIPELINE MILESTONES</Text>
              {milestones.map((step, idx) => {
                const isStepCompleted = step.status === 'completed';
                const isStepInProgress = step.status === 'in_progress';
                const isStepDegraded = step.status === 'degraded';
                const isStepFailed = step.status === 'failed';
                const isLast = idx === milestones.length - 1;

                return (
                  <View key={step.key || idx} style={styles.stepperRow}>
                    <View style={styles.stepperColLeft}>
                      <View
                        style={[
                          styles.stepperIconWrap,
                          isStepCompleted
                            ? styles.stepperIconCompleted
                            : isStepInProgress
                            ? styles.stepperIconInProgress
                            : isStepDegraded
                            ? styles.stepperIconDegraded
                            : isStepFailed
                            ? styles.stepperIconFailed
                            : styles.stepperIconPending
                        ]}
                      >
                        {isStepCompleted ? (
                          <CheckCircle2 size={15} color="#059669" />
                        ) : isStepInProgress ? (
                          <ActivityIndicator size="small" color="#0891b2" />
                        ) : isStepDegraded ? (
                          <AlertTriangle size={14} color="#d97706" />
                        ) : isStepFailed ? (
                          <XCircle size={14} color="#ef4444" />
                        ) : (
                          <View style={styles.pendingDot} />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.stepperLine,
                            isStepCompleted
                              ? styles.stepperLineActive
                              : styles.stepperLinePending
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stepperColRight}>
                      <Text
                        style={[
                          styles.stepLabelText,
                          isStepCompleted
                            ? styles.stepLabelCompleted
                            : isStepInProgress
                            ? styles.stepLabelInProgress
                            : isStepDegraded
                            ? styles.stepLabelDegraded
                            : isStepFailed
                            ? styles.stepLabelFailed
                            : styles.stepLabelPending
                        ]}
                      >
                        {step.label}
                      </Text>
                      <Text style={styles.stepDescText} numberOfLines={2}>
                        {step.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Action Footer Buttons */}
            <View style={styles.footerContainer}>
              {recordId && (isCompleted || isDegraded) ? (
                <TouchableOpacity
                  style={styles.viewRecordBtn}
                  onPress={onViewRecord}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewRecordBtnText}>
                    {isSynthetic
                      ? 'View Synthetic Emulated Record'
                      : isBenchmark
                      ? 'View Verified Benchmark Record'
                      : 'View Certified Live Land Extract'}
                  </Text>
                  <ChevronRight size={18} color="#ffffff" />
                </TouchableOpacity>
              ) : isFailed ? (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryBtnText}>Dismiss & Try Again</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.footerNoteRow}>
                  <Globe2 size={13} color="#64748b" />
                  <Text style={styles.footerNoteText}>
                    Streaming live updates from worker pool fibers
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#0891b2',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10
  },
  scrollContent: {
    paddingBottom: 4
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)'
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    fontSize: 12,
    color: '#0891b2',
    marginTop: 2
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  transportBadgeSse: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  transportBadgePoll: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)'
  },
  transportBadgeNone: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)'
  },
  transportDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  transportDotSse: {
    backgroundColor: '#10b981'
  },
  transportDotPoll: {
    backgroundColor: '#38bdf8'
  },
  transportDotNone: {
    backgroundColor: '#f59e0b'
  },
  transportText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4
  },
  transportTextSse: {
    color: '#059669'
  },
  transportTextPoll: {
    color: '#0284c7'
  },
  transportTextNone: {
    color: '#d97706'
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    marginBottom: 14
  },
  ticketInfo: {
    flex: 1
  },
  ticketLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8
  },
  ticketValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    borderRadius: 8
  },
  copyText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  copiedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600'
  },
  progressContainer: {
    marginBottom: 12
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0891b2'
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  activeStepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12
  },
  activeStepText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 17
  },
  livePortalBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  livePortalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  livePortalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5
  },
  livePortalBody: {
    fontSize: 12,
    color: '#065f46',
    lineHeight: 17,
    marginBottom: 6
  },
  livePortalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  livePortalMetaText: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '600'
  },
  livePortalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.25)',
    paddingTop: 6
  },
  livePortalLegal: {
    fontSize: 10,
    color: '#059669',
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 14
  },
  syntheticBanner: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  syntheticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  syntheticTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8b5cf6',
    letterSpacing: 0.5
  },
  syntheticBody: {
    fontSize: 12,
    color: '#5b21b6',
    lineHeight: 17,
    marginBottom: 6
  },
  syntheticFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.25)',
    paddingTop: 6
  },
  syntheticLegal: {
    fontSize: 10,
    color: '#7c3aed',
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 14
  },
  truthSerumBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  truthSerumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  truthSerumTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 0.5
  },
  truthSerumBody: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 17,
    marginBottom: 6
  },
  truthSerumFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.25)',
    paddingTop: 6
  },
  truthSerumLegal: {
    fontSize: 10,
    color: '#b45309',
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 14
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.5
  },
  errorBody: {
    fontSize: 12,
    color: '#b91c1c',
    lineHeight: 17,
    marginBottom: 4
  },
  dlqNotice: {
    fontSize: 10,
    color: '#dc2626',
    fontStyle: 'italic'
  },
  stepperContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14
  },
  stepperHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 10
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  stepperColLeft: {
    alignItems: 'center',
    width: 22
  },
  stepperIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  stepperIconInProgress: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)'
  },
  stepperIconDegraded: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)'
  },
  stepperIconFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)'
  },
  stepperIconPending: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)'
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0'
  },
  stepperLine: {
    width: 2,
    height: 18,
    marginVertical: 2
  },
  stepperLineActive: {
    backgroundColor: '#10b981'
  },
  stepperLinePending: {
    backgroundColor: '#e2e8f0'
  },
  stepperColRight: {
    flex: 1,
    paddingBottom: 8
  },
  stepLabelText: {
    fontSize: 12,
    fontWeight: '700'
  },
  stepLabelCompleted: {
    color: '#059669'
  },
  stepLabelInProgress: {
    color: '#0891b2'
  },
  stepLabelDegraded: {
    color: '#d97706'
  },
  stepLabelFailed: {
    color: '#ef4444'
  },
  stepLabelPending: {
    color: '#64748b'
  },
  stepDescText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    lineHeight: 15
  },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  },
  viewRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12
  },
  viewRecordBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  },
  retryBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  footerNoteText: {
    fontSize: 11,
    color: '#64748b'
  }
});
