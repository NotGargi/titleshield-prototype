import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator
} from 'react-native';
import { ChevronDown, Search, X, Check, MapPin, AlertCircle } from 'lucide-react-native';

export interface LocationDropdownSelectorProps {
  label: string;
  nativeLabel?: string;
  selectedValue?: string;
  value?: string;
  placeholder?: string;
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  helperText?: string;
  contextSubtitle?: string;
}

export function LocationDropdownSelector({
  label,
  nativeLabel,
  selectedValue,
  value,
  placeholder,
  options = [],
  onSelect,
  disabled = false,
  loading = false,
  testID,
  helperText,
  contextSubtitle
}: LocationDropdownSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentVal = selectedValue !== undefined ? selectedValue : (value || '');
  const displayPlaceholder = placeholder || `Select ${label}`;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((opt) => opt && opt.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const handleOpen = () => {
    if (disabled || loading) return;
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSelectOption = (item: string) => {
    onSelect(item);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.triggerCard,
          disabled && styles.triggerDisabled,
          modalVisible && styles.triggerActive
        ]}
        onPress={handleOpen}
        activeOpacity={0.75}
        disabled={disabled || loading}
        testID={testID}
        accessibilityLabel={`${label}. ${currentVal ? `Selected: ${currentVal}` : displayPlaceholder}`}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: modalVisible, disabled: !!disabled }}
      >
        <View style={styles.triggerLeft}>
          <View style={[styles.iconPill, currentVal ? styles.iconPillActive : null]}>
            <MapPin size={16} color={currentVal ? '#0284c7' : '#64748B'} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, disabled && styles.disabledText]}>{label}</Text>
              {nativeLabel ? <Text style={styles.nativeLabel}>({nativeLabel})</Text> : null}
            </View>
            <Text
              style={[
                styles.valueText,
                !currentVal && styles.placeholderText,
                disabled && styles.disabledText
              ]}
              numberOfLines={1}
              testID={testID ? `${testID}-value` : undefined}
            >
              {loading ? `Loading ${label.toLowerCase()}...` : (currentVal || displayPlaceholder)}
            </Text>
          </View>
        </View>

        <View style={styles.triggerRight}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" testID={testID ? `${testID}-loading` : undefined} />
          ) : (
            <ChevronDown size={18} color={disabled ? '#475569' : '#64748b'} />
          )}
        </View>
      </TouchableOpacity>

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      {/* Responsive Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
            testID={testID ? `${testID}-backdrop` : undefined}
            accessibilityLabel="Close modal backdrop"
          />

          <View
            style={styles.modalSheet}
            testID={testID ? `${testID}-modal` : `modal-${label.toLowerCase()}`}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Select {label}</Text>
                {contextSubtitle ? (
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {contextSubtitle}
                  </Text>
                ) : (
                  <Text style={styles.modalSubtitle}>
                    {options.length} {label.toLowerCase()}{options.length === 1 ? '' : 's'} available
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
                testID={testID ? `${testID}-close` : `close-modal-${label.toLowerCase()}`}
                accessibilityLabel="Close selection dialog"
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Quick-Search Filter Input */}
            <View style={styles.modalSearchBox}>
              <Search size={16} color="#64748B" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus={Platform.OS === 'web'}
                testID={testID ? `${testID}-search-input` : `search-input-${label.toLowerCase()}`}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                  testID={testID ? `${testID}-search-clear` : undefined}
                  accessibilityLabel="Clear search text"
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {/* Counter Badge */}
            <View style={styles.counterRow}>
              <View style={styles.counterBadge}>
                <Text style={styles.counterText} testID={testID ? `${testID}-count` : undefined}>
                  Showing {filteredOptions.length} of {options.length}
                </Text>
              </View>
            </View>

            {/* Scrollable Items List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              style={styles.optionsList}
              renderItem={({ item }) => {
                const isSelected = item.toLowerCase() === currentVal.toLowerCase();
                const sanitizedId = item.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => handleSelectOption(item)}
                    activeOpacity={0.7}
                    testID={testID ? `${testID}-option-${sanitizedId}` : `option-${sanitizedId}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer} testID={testID ? `${testID}-empty` : undefined}>
                  <AlertCircle size={28} color="#64748B" />
                  <Text style={styles.emptyTitle}>No {label} Found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? `No match found for "${searchQuery}"`
                      : `No ${label.toLowerCase()} options available for this selection.`}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  nativeLabel: {
    fontSize: 11,
    color: '#64748B'
  },
  triggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 56
  },
  triggerDisabled: {
    opacity: 0.5,
    backgroundColor: '#f4f6fa',
    borderColor: '#e2e8f0'
  },
  triggerActive: {
    borderColor: '#2563EB'
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  iconPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  textContainer: {
    flex: 1
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a'
  },
  placeholderText: {
    color: '#64748B',
    fontWeight: '400'
  },
  disabledText: {
    color: '#475569'
  },
  triggerRight: {
    marginLeft: 8
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    paddingHorizontal: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 20 : 0
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 24 : 32,
    maxHeight: Platform.OS === 'web' ? '85%' : '80%',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    ...(Platform.OS === 'web'
      ? {
          width: '100%',
          maxWidth: 500,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#e2e8f0'
        }
      : {})
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
    marginBottom: 14
  },
  modalHeaderLeft: {
    flex: 1
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
    borderRadius: 14,
    backgroundColor: '#f1f5f9'
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 10
  },
  modalSearchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    padding: 0
  },
  clearSearchBtn: {
    padding: 4
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  counterBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  counterText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500'
  },
  optionsList: {
    maxHeight: 360
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#ffffff',
    minHeight: 46
  },
  optionRowSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
    borderWidth: 1,
    borderColor: '#2563EB'
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    flex: 1
  },
  optionTextSelected: {
    color: '#1d4ed8',
    fontWeight: '700'
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 260
  }
});
