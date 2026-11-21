import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ShieldCheck, ExternalLink } from 'lucide-react-native';

interface BlockchainBadgeProps {
  docHash: string;
  txHash: string;
  network?: string;
  blockNumber?: number;
}

export const BlockchainBadge: React.FC<BlockchainBadgeProps> = ({
  docHash,
  txHash,
  network = 'Polygon Amoy',
  blockNumber = 14208152
}) => {
  const shortHash = docHash ? `${docHash.slice(0, 10)}...${docHash.slice(-8)}` : '';
  const shortTx = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : '';

  const openExplorer = () => {
    if (txHash) {
      Linking.openURL(`https://amoy.polygonscan.com/tx/${txHash}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <ShieldCheck size={20} color="#059669" />
          <Text style={styles.title}>Blockchain Verified</Text>
        </View>
        <View style={styles.networkPill}>
          <Text style={styles.networkText}>{network}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Cryptographically anchored & tamper-proof on public ledger
      </Text>

      <View style={styles.metaBox}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Document SHA-256:</Text>
          <Text style={styles.metaValue}>{shortHash}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Tx Hash:</Text>
          <Text style={styles.metaValue}>{shortTx}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Block Height:</Text>
          <Text style={styles.metaValue}>#{blockNumber}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={openExplorer}>
        <Text style={styles.buttonText}>View on Polygonscan</Text>
        <ExternalLink size={14} color="#059669" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#05966950',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669'
  },
  networkPill: {
    backgroundColor: '#05966930',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  networkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857'
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 12
  },
  metaBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 10,
    gap: 6
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748b'
  },
  metaValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#047857'
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#04785720'
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669'
  }
});
