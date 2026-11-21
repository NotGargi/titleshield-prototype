import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking
} from 'react-native';
import {
  FileText,
  X,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Building,
  QrCode,
  Calendar,
  MapPin,
  ExternalLink,
  Lock,
  Layers
} from 'lucide-react-native';
import { LandPaper, CadastralParcel } from '../constants/cadastralData';

export interface LandPaperViewerModalProps {
  paper: LandPaper | null;
  parcel: CadastralParcel | null;
  visible: boolean;
  onClose: () => void;
}

export function LandPaperViewerModal({
  paper,
  parcel,
  visible,
  onClose
}: LandPaperViewerModalProps) {
  if (!paper || !parcel) {
    return null;
  }

  const ledger = paper.ledgerData;
  const isMahabhumi = parcel.state === 'MH';
  const isUP = parcel.state === 'UP';

  const handleDownload = () => {
    if (paper.downloadUrl) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(paper.downloadUrl, '_blank');
      } else {
        Linking.openURL(paper.downloadUrl).catch(console.error);
      }
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay} testID="land-paper-modal">
        <View style={styles.modalContainer}>
          {/* Modal Header Actions */}
          <View style={styles.topControlBar}>
            <View style={styles.pillTag}>
              <ShieldCheck size={14} color="#059669" />
              <Text style={styles.pillTagText}>STATUTORY CITIZEN RECORD</Text>
            </View>

            <View style={styles.topActionsGroup}>
              {paper.downloadUrl && (
                <TouchableOpacity
                  style={styles.actionIconButton}
                  onPress={handleDownload}
                  testID="paper-modal-download-btn"
                  accessibilityLabel="Download Certified PDF"
                >
                  <Download size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnLabel}>PDF</Text>
                </TouchableOpacity>
              )}

              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={styles.actionIconButtonSecondary}
                  onPress={handlePrint}
                  accessibilityLabel="Print Paper"
                >
                  <Printer size={16} color="#64748b" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={onClose}
                testID="paper-modal-close-btn"
                accessibilityLabel="Close Document Modal"
              >
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Document Sheet Body */}
          <ScrollView
            style={styles.documentScrollView}
            contentContainerStyle={styles.documentContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Authentic Government Paper Frame */}
            <View style={styles.paperFrame}>
              {/* Government Seal & Letterhead */}
              <View style={styles.govtLetterhead}>
                <View style={styles.ashokaEmblemBox}>
                  <Text style={styles.satyamevJayate}>सत्यमेव जयते</Text>
                  <Text style={styles.emblemSub}>GOVERNMENT OF INDIA</Text>
                </View>

                <Text style={styles.stateGovtText}>
                  {ledger?.stateGovt || (isMahabhumi ? 'महाराष्ट्र शासन' : isUP ? 'उत्तर प्रदेश सरकार' : 'GOVERNMENT CADASTRE')}
                </Text>
                <Text style={styles.deptText}>
                  {ledger?.department || 'महसूल व भूमी अभिलेख विभाग (Department of Revenue)'}
                </Text>
                {ledger?.villageForm && (
                  <View style={styles.villageFormBadge}>
                    <Text style={styles.villageFormText}>{ledger.villageForm}</Text>
                  </View>
                )}
              </View>

              {/* Title & Document Badge */}
              <View style={styles.docTitleSection}>
                <Text style={styles.docTitlePrimary}>{paper.title}</Text>
                {paper.titleNative && (
                  <Text style={styles.docTitleNative}>{paper.titleNative}</Text>
                )}
                <View style={styles.metaRow}>
                  <Text style={styles.docIdText}>Doc No: {paper.documentNumber || paper.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${paper.statusColor}25`, borderColor: paper.statusColor }]}>
                    <CheckCircle2 size={12} color={paper.statusColor} />
                    <Text style={[styles.statusBadgeText, { color: paper.statusColor }]}>{paper.statusLabel}</Text>
                  </View>
                </View>
              </View>

              {/* Official Ledger Table */}
              <View style={styles.ledgerTable}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>JURISDICTION / REVENUE DETAILS</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>LEGAL & REVENUE RECORD ENTRY</Text>
                </View>

                {/* Village / Taluka / District */}
                <View style={styles.tableRow}>
                  <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                    <Text style={styles.cellLabelText}>गावाचे नाव / Village</Text>
                    <Text style={styles.cellSubLabelText}>तालुका / जिल्हा (District)</Text>
                  </View>
                  <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                    <Text style={styles.cellValueStrong}>{parcel.village}</Text>
                    <Text style={styles.cellValueNormal}>Taluka: {parcel.taluka} | Dist: {parcel.district} ({parcel.stateName})</Text>
                  </View>
                </View>

                {/* Survey / Gat / Plot Number */}
                <View style={styles.tableRow}>
                  <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                    <Text style={styles.cellLabelText}>गट / सर्व्हे / खसरा क्र.</Text>
                    <Text style={styles.cellSubLabelText}>Cadastral Survey / Plot</Text>
                  </View>
                  <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                    <Text style={[styles.cellValueStrong, { color: '#0284C7', fontSize: 16 }]}>
                      {ledger?.surveyGatNumber || parcel.surveyNumber}
                    </Text>
                    {parcel.subDivision && (
                      <Text style={styles.cellValueNormal}>Sub-Division: {parcel.subDivision}</Text>
                    )}
                  </View>
                </View>

                {/* Khata / Holding Account */}
                {ledger?.khataNumber && (
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                      <Text style={styles.cellLabelText}>खाते क्रमांक / Khata No.</Text>
                    </View>
                    <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                      <Text style={styles.cellValueStrong}>{ledger.khataNumber}</Text>
                    </View>
                  </View>
                )}

                {/* Area / Extent */}
                <View style={styles.tableRow}>
                  <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                    <Text style={styles.cellLabelText}>क्षेत्रफळ / Holding Area</Text>
                    <Text style={styles.cellSubLabelText}>Pot Kharaba / Cultivable</Text>
                  </View>
                  <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                    <Text style={styles.cellValueStrong}>{ledger?.area || parcel.extent}</Text>
                    {ledger?.assessmentTax && (
                      <Text style={styles.cellValueNormal}>Assessment Tax: {ledger.assessmentTax}</Text>
                    )}
                  </View>
                </View>

                {/* Tenure / Land Classification */}
                <View style={styles.tableRow}>
                  <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                    <Text style={styles.cellLabelText}>भोगवटादार वर्ग / Tenure</Text>
                  </View>
                  <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                    <Text style={styles.cellValueStrong}>{ledger?.tenureClass || parcel.landType}</Text>
                  </View>
                </View>

                {/* Registered Owners / Khatedars */}
                <View style={styles.tableRow}>
                  <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                    <Text style={styles.cellLabelText}>खातेदाराचे नाव / Owner(s)</Text>
                    <Text style={styles.cellSubLabelText}>Occupant / Transferee</Text>
                  </View>
                  <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                    {ledger?.owners && ledger.owners.length > 0 ? (
                      ledger.owners.map((owner, idx) => (
                        <View key={idx} style={styles.ownerItem}>
                          <Text style={styles.ownerNameText}>• {owner.name}</Text>
                          {owner.share && <Text style={styles.ownerShareText}>Share: {owner.share}</Text>}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.cellValueStrong}>{parcel.claimedOwner}</Text>
                    )}
                  </View>
                </View>

                {/* Consideration & Stamp Duty (if Deed) */}
                {ledger?.considerationAmount && (
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                      <Text style={styles.cellLabelText}>दस्तऐवज मूल्य व मुद्रांक</Text>
                      <Text style={styles.cellSubLabelText}>Consideration & Stamp Duty</Text>
                    </View>
                    <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                      <Text style={styles.cellValueStrong}>Valuation: {ledger.considerationAmount}</Text>
                      {ledger.stampDuty && <Text style={styles.cellValueNormal}>Stamp Duty Paid: {ledger.stampDuty}</Text>}
                      {ledger.sroOffice && <Text style={styles.cellValueNormal}>Registering Authority: {ledger.sroOffice}</Text>}
                    </View>
                  </View>
                )}

                {/* Mutations / Ferfar Entries */}
                {ledger?.mutations && ledger.mutations.length > 0 && (
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                      <Text style={styles.cellLabelText}>फेरफार नोंदी / Mutations</Text>
                    </View>
                    <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                      {ledger.mutations.map((m, idx) => (
                        <Text key={idx} style={styles.mutationEntryText}>• {m}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Other Rights & Encumbrances */}
                <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                  <View style={[styles.tableCellLabel, { flex: 1.2 }]}>
                    <Text style={styles.cellLabelText}>इतर हक्क व बोजा</Text>
                    <Text style={styles.cellSubLabelText}>Encumbrance / Liens</Text>
                  </View>
                  <View style={[styles.tableCellValue, { flex: 1.8 }]}>
                    {ledger?.otherRights && ledger.otherRights.length > 0 ? (
                      ledger.otherRights.map((r, idx) => (
                        <Text key={idx} style={styles.otherRightsText}>• {r}</Text>
                      ))
                    ) : (
                      <Text style={styles.cleanEncumbranceText}>
                        ✓ सदर मिळकतीवर कोणताही बोजा अथवा न्यायालयीन स्थगिती नाही (Clean Title)
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Cryptographic Statutory Stamping Section */}
              <View style={styles.statutoryFooter}>
                <View style={styles.statutoryLeft}>
                  <Text style={styles.statutoryTitle}>OFFICIAL STATUTORY DIGITAL ATTESTATION</Text>
                  <Text style={styles.statutoryText}>
                    This document extract is synchronized from the State Land Registry and anchored on the Ethereum Attestation Service (EAS) Merkle DAG under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023.
                  </Text>
                  <Text style={styles.statutoryAuthority}>
                    Issued by: {paper.issuingAuthority}
                  </Text>
                  <Text style={styles.statutoryDate}>
                    Certified Extraction Date: {paper.date || new Date().toLocaleDateString('en-IN')}
                  </Text>
                </View>

                <View style={styles.qrSealBox}>
                  <QrCode size={54} color="#0F172A" />
                  <Text style={styles.qrCaption}>SCAN TO VERIFY</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContainer: {
    width: '100%',
    maxWidth: 820,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    flexDirection: 'column'
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1'
  },
  pillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  pillTagText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  topActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  actionIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  actionBtnLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  actionIconButtonSecondary: {
    padding: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8
  },
  closeModalButton: {
    padding: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 8
  },
  documentScrollView: {
    flex: 1,
    backgroundColor: '#E2E8F0'
  },
  documentContent: {
    padding: 16
  },
  paperFrame: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#94A3B8',
    borderRadius: 4,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  govtLetterhead: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 14,
    marginBottom: 14
  },
  ashokaEmblemBox: {
    alignItems: 'center',
    marginBottom: 6
  },
  satyamevJayate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1
  },
  emblemSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5
  },
  stateGovtText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginTop: 2
  },
  deptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2
  },
  villageFormBadge: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 4
  },
  villageFormText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700'
  },
  docTitleSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1'
  },
  docTitlePrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  docTitleNative: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  docIdText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748B',
    fontWeight: '600'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  ledgerTable: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 16
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  tableHeaderCell: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    minHeight: 44
  },
  tableCellLabel: {
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    padding: 8,
    justifyContent: 'center'
  },
  cellLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A'
  },
  cellSubLabelText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1
  },
  tableCellValue: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    justifyContent: 'center'
  },
  cellValueStrong: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  cellValueNormal: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2
  },
  ownerItem: {
    marginBottom: 4
  },
  ownerNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  ownerShareText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    marginLeft: 12
  },
  mutationEntryText: {
    fontSize: 11,
    color: '#0F172A',
    marginBottom: 2
  },
  otherRightsText: {
    fontSize: 11,
    color: '#334155',
    marginBottom: 2
  },
  cleanEncumbranceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D'
  },
  statutoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#e2e8f0',
    gap: 16
  },
  statutoryLeft: {
    flex: 1
  },
  statutoryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  statutoryText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 13
  },
  statutoryAuthority: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4
  },
  statutoryDate: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1
  },
  qrSealBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 4,
    backgroundColor: '#F8FAFC'
  },
  qrCaption: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: 0.5
  }
});
