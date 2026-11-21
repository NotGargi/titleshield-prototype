import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  TextInput
} from 'react-native';
import { ChevronDown, Search, X, HelpCircle, Bell, Check, User, LogOut, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

export const ALL_STATES = [
  // --- Western India ---
  { code: 'MH', name: 'Maharashtra', native: 'महाराष्ट्र', popular: 'Mahabhumi 7/12 & 8A, Ferfar, Index-II' },
  { code: 'GJ', name: 'Gujarat', native: 'ગુજરાત', popular: 'AnyRoR 7/12, VF6 Hakk Patrak, e-Milkat' },
  { code: 'GA', name: 'Goa', native: 'गोंय', popular: 'Directorate of Land Records Form I & XIV' },
  { code: 'DNHDD', name: 'Dadra & Nagar Haveli and Daman & Diu', native: 'દાદરા અને નગર હવેલી', popular: 'UT Land Revenue Card & Mutation' },

  // --- Northern India ---
  { code: 'UP', name: 'Uttar Pradesh', native: 'उत्तर प्रदेश', popular: 'Bhulekh UP Khasra/Khatauni, IGRS Deed' },
  { code: 'DL', name: 'Delhi', native: 'दिल्ली', popular: 'DORIS Registered Deed, Bhulekh Girdawari' },
  { code: 'HR', name: 'Haryana', native: 'हरियाणा', popular: 'Jamabandi Nakal, Inteqal Mutation' },
  { code: 'PB', name: 'Punjab', native: 'ਪੰਜਾਬ', popular: 'PLRS Jamabandi Fard, Roznamcha' },
  { code: 'RJ', name: 'Rajasthan', native: 'राजस्थान', popular: 'Apna Khata (e-Dharti) Jamabandi, Nakal' },
  { code: 'UK', name: 'Uttarakhand', native: 'उत्तराखंड', popular: 'Devbhoomi ROR Khatoni 1-A' },
  { code: 'HP', name: 'Himachal Pradesh', native: 'हिमाचल प्रदेश', popular: 'Himbhoomi Jamabandi Nakal, Shajra' },
  { code: 'JK', name: 'Jammu & Kashmir', native: 'جموں و کشمیر', popular: 'LRIS Digital Jamabandi, Girdawari' },
  { code: 'CH', name: 'Chandigarh', native: 'ਚੰਡੀਗੜ੍ਹ', popular: 'Chandigarh Estate Office Registry' },
  { code: 'LA', name: 'Ladakh', native: 'ལ་དྭགས', popular: 'Ladakh Revenue Portal & Jamabandi' },

  // --- Southern India ---
  { code: 'KA', name: 'Karnataka', native: 'ಕರ್ನಾಟಕ', popular: 'Bhoomi RTC Pahani, e-Swathu, BBMP Khata' },
  { code: 'TG', name: 'Telangana', native: 'తెలంగాಣ', popular: 'Dharani EC, Pattadar Passbook, PTIN' },
  { code: 'AP', name: 'Andhra Pradesh', native: 'ఆంధ్ర ప్రదేశ್', popular: 'Meebhoomi Adangal, 1-B ROR, EC' },
  { code: 'TN', name: 'Tamil Nadu', native: 'தமிழ்நாடு', popular: 'Tamil Nilam Patta & Chitta, TSLR' },
  { code: 'KL', name: 'Kerala', native: 'കേരളം', popular: 'e-Rekha FMB Sketch, Settlement RoR' },
  { code: 'PY', name: 'Puducherry', native: 'புதுச்சேரி', popular: 'Nilamagal Patta & SRO Encumbrance' },

  // --- Eastern India ---
  { code: 'WB', name: 'West Bengal', native: 'পশ্চিমবঙ্গ', popular: 'Banglarbhumi ROR Khatian, Plot Info' },
  { code: 'BR', name: 'Bihar', native: 'बिहार', popular: 'Bihar Bhumi Dakhil Kharij, LPC, Jamabandi' },
  { code: 'OD', name: 'Odisha', native: 'ଓଡ଼ିଶା', popular: 'Bhulekh Odisha ROR, Bhu-Naksha Map' },
  { code: 'JH', name: 'Jharkhand', native: 'झारखंड', popular: 'Jharbhoomi Khatian, Register-II Dakhil Kharij' },

  // --- Central India ---
  { code: 'MP', name: 'Madhya Pradesh', native: 'मध्य प्रदेश', popular: 'MP Bhulekh Khasra P-II, B-1 Khatauni' },
  { code: 'CG', name: 'Chhattisgarh', native: 'छत्तीसगढ़', popular: 'Bhuiyan B-1 Khasra, P-II Khatauni' },

  // --- North-Eastern India ---
  { code: 'AS', name: 'Assam', native: 'অসম', popular: 'Dharitree Jamabandi & Chitha Register' },
  { code: 'TR', name: 'Tripura', native: 'ত্রিপুরা', popular: 'Jami Tripura Khatian (ROR)' },
  { code: 'ML', name: 'Meghalaya', native: 'Meghalaya', popular: 'Directorate of Land Records Cadastre' },
  { code: 'MN', name: 'Manipur', native: 'মণিপুর', popular: 'Loucha Pathap Jamabandi / Dag Info' },
  { code: 'NL', name: 'Nagaland', native: 'Nagaland', popular: 'Land Revenue & Customary Titles' },
  { code: 'AR', name: 'Arunachal Pradesh', native: 'Arunachal Pradesh', popular: 'Department of Land Management' },
  { code: 'MZ', name: 'Mizoram', native: 'Mizoram', popular: 'Land Revenue & Settlement Register' },
  { code: 'SK', name: 'Sikkim', native: 'सिक्किम', popular: 'Land Revenue & Disaster Management RoR' },

  // --- Island Territories ---
  { code: 'AN', name: 'Andaman & Nicobar Islands', native: 'अंडमान और निकोबार', popular: 'UT Land Records & Allotment Register' },
  { code: 'LD', name: 'Lakshadweep', native: 'ലക്ഷദ്വീപ്', popular: 'UT Revenue Record of Rights' }
];

interface LandeedHeaderProps {
  selectedState: string;
  onSelectState: (code: string) => void;
  onOpenHelp?: () => void;
}

export function LandeedHeader({ selectedState, onSelectState, onOpenHelp }: LandeedHeaderProps) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 600;
  const { user, isAuthenticated, logout } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const currentState = ALL_STATES.find(s => s.code === selectedState) || ALL_STATES[0];

  const filteredStates = ALL_STATES.filter(s =>
    s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.native.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.code.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <View style={styles.headerContainer}>
      <View style={[styles.topRow, isCompact && { gap: 6 }]}>
        {/* Landeed Official Logo from APK */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../assets/images/src_images_landeed_logo_medium_transparent.png')}
            style={[styles.logoImage, isCompact && { width: 40 }]}
            resizeMode="contain"
          />
        </View>

        {/* State Selector Pill */}
        <TouchableOpacity
          testID="header-state-selector"
          style={styles.stateSelectorPill}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.statePinDot} />
          <Text style={styles.stateNameText}>{currentState.name}</Text>
          <ChevronDown size={14} color="#64748b" />
        </TouchableOpacity>

        {/* Right Action Icons */}
        <View style={styles.rightIcons}>
          <TouchableOpacity
            testID="header-diligence-btn"
            style={styles.diligencePill}
            onPress={() => navigateTo(router, '/diligence')}
            activeOpacity={0.7}
          >
            <Shield size={13} color="#059669" />
            {!isCompact && <Text style={styles.diligencePillText}>Diligence</Text>}
          </TouchableOpacity>

          {!isCompact && (<>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={onOpenHelp}
            activeOpacity={0.7}
          >
            <HelpCircle size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconCircle}
            activeOpacity={0.7}
          >
            <Bell size={18} color="#64748b" />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
          </>)}

          {/* User Profile Pill or Login Link */}
          {isAuthenticated && user ? (
            <TouchableOpacity
              testID="header-user-avatar"
              style={styles.userAvatarPill}
              onPress={() => setProfileModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.userAvatarCircle}>
                <Text style={styles.userAvatarInitial}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              {!isCompact && <View style={styles.userPillInfo}>
                <Text style={styles.userPillName} numberOfLines={1}>
                  {user.name?.split(' ')[0] || 'User'}
                </Text>
                <View style={styles.userRoleTag}>
                  <Text style={styles.userRoleTagText}>{user.role || 'CITIZEN'}</Text>
                </View>
              </View>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="header-login-btn"
              style={styles.loginPillBtn}
              onPress={() => navigateTo(router, '/login')}
              activeOpacity={0.7}
            >
              <User size={14} color="#FFFFFF" />
              <Text style={styles.loginPillText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* State Picker Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select State</Text>
                <Text style={styles.modalSubtitle}>Choose jurisdiction for land records</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Search Filter */}
            <View style={styles.modalSearchBox}>
              <Search size={16} color="#64748B" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search state or region..."
                placeholderTextColor="#64748B"
                value={searchFilter}
                onChangeText={setSearchFilter}
              />
            </View>

            {/* States List */}
            <ScrollView style={styles.stateList} showsVerticalScrollIndicator={false}>
              {filteredStates.map((st) => {
                const isSelected = st.code === selectedState;
                return (
                  <TouchableOpacity
                    key={st.code}
                    style={[styles.stateRow, isSelected && styles.stateRowSelected]}
                    onPress={() => {
                      onSelectState(st.code);
                      setModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stateRowLeft}>
                      <View style={[styles.stateBadge, isSelected && styles.stateBadgeActive]}>
                        <Text style={[styles.stateBadgeText, isSelected && styles.stateBadgeTextActive]}>
                          {st.code}
                        </Text>
                      </View>
                      <View>
                        <View style={styles.stateNameRow}>
                          <Text style={styles.stateRowName}>{st.name}</Text>
                          <Text style={styles.stateRowNative}>({st.native})</Text>
                        </View>
                        <Text style={styles.stateRowPopular}>{st.popular}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* User Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarLargeText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setProfileModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>

            <View style={styles.profileMetaBox}>
              <View style={styles.profileMetaRow}>
                <Text style={styles.profileMetaLabel}>Role:</Text>
                <View style={styles.roleBadgeLarge}>
                  <Shield size={12} color="#2563EB" />
                  <Text style={styles.roleBadgeLargeText}>{user?.role || 'CITIZEN'}</Text>
                </View>
              </View>
              {user?.phone ? (
                <View style={styles.profileMetaRow}>
                  <Text style={styles.profileMetaLabel}>Mobile:</Text>
                  <Text style={styles.profileMetaValue}>{user.phone}</Text>
                </View>
              ) : null}
              {user?.id ? (
                <View style={styles.profileMetaRow}>
                  <Text style={styles.profileMetaLabel}>User ID:</Text>
                  <Text style={styles.profileMetaValue} numberOfLines={1}>
                    {user.id}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              testID="header-signout-button"
              style={styles.signOutBtn}
              onPress={async () => {
                setProfileModalVisible(false);
                await logout();
                navigateTo(router, '/login');
              }}
              activeOpacity={0.8}
            >
              <LogOut size={16} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#f4f6fa',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoImage: {
    width: 110,
    height: 32
  },
  stateSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6
  },
  statePinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB'
  },
  stateNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a'
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  diligencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  diligencePillText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9'
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalSearchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    padding: 0
  },
  stateList: {
    maxHeight: 400
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#ffffff'
  },
  stateRowSelected: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#2563EB'
  },
  stateRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  stateBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stateBadgeActive: {
    backgroundColor: '#2563EB'
  },
  stateBadgeText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 12
  },
  stateBadgeTextActive: {
    color: '#FFFFFF'
  },
  stateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  stateRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a'
  },
  stateRowNative: {
    fontSize: 13,
    color: '#64748b'
  },
  stateRowPopular: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  userAvatarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 6
  },
  userAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  userAvatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  },
  userPillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  userPillName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    maxWidth: 70
  },
  userRoleTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  userRoleTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b'
  },
  loginPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4
  },
  loginPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  profileAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileAvatarLargeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700'
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16
  },
  profileMetaBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8
  },
  profileMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  profileMetaLabel: {
    fontSize: 12,
    color: '#64748B'
  },
  profileMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a'
  },
  roleBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4
  },
  roleBadgeLargeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb'
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444'
  }
});
