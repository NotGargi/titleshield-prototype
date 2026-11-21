import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Bot, CheckCircle2, Globe2 } from 'lucide-react-native';

interface Step {
  stepIndex: number;
  message: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface TinyFishStatusModalProps {
  visible: boolean;
  steps: Step[];
  currentStepMessage?: string;
}

export const TinyFishStatusModal: React.FC<TinyFishStatusModalProps> = ({
  visible,
  steps,
  currentStepMessage = 'TinyFish AI agent navigating land registry...'
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Bot size={28} color="#0891b2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>TinyFish AI Autonomous Agent</Text>
              <Text style={styles.subtitle}>Direct State Registry Automation</Text>
            </View>
          </View>

          <View style={styles.spinnerRow}>
            <ActivityIndicator size="small" color="#0891b2" />
            <Text style={styles.activeStepText}>{currentStepMessage}</Text>
          </View>

          <View style={styles.stepsList}>
            {steps.map((step, idx) => (
              <View key={idx} style={styles.stepItem}>
                <CheckCircle2 size={16} color="#059669" />
                <Text style={styles.stepText}>{step.message}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Globe2 size={14} color="#64748b" />
            <Text style={styles.footerText}>
              Bypassing CAPTCHAs, parsing dynamic tables & extracting signed record
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#06b6d440',
    width: '100%',
    padding: 20,
    shadowColor: '#0891b2',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0891b220',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    fontSize: 12,
    color: '#0891b2'
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  activeStepText: {
    fontSize: 13,
    color: '#334155',
    flex: 1
  },
  stepsList: {
    gap: 10,
    marginBottom: 16
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stepText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1
  }
});
