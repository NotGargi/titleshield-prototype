import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Search, Compass, Sparkles, FolderLock, FileCheck } from 'lucide-react-native';

interface BottomNavProps {
  currentTab: 'search' | 'explorer' | 'terra' | 'locker' | 'orders';
}

export function LandeedBottomNav({ currentTab }: BottomNavProps) {
  const router = useRouter();

  const handleNav = (path: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = path;
    } else {
      router.push(path as any);
    }
  };

  return (
    <View style={styles.navBar}>
      {/* 1. Search (Home) */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleNav('/')}
        activeOpacity={0.7}
      >
        <Search
          size={22}
          color={currentTab === 'search' ? '#2563EB' : '#64748B'}
          strokeWidth={currentTab === 'search' ? 2.5 : 2}
        />
        <Text style={[styles.navText, currentTab === 'search' && styles.navTextActive]}>
          Search
        </Text>
      </TouchableOpacity>

      {/* 2. Survey Explorer */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleNav('/explorer')}
        activeOpacity={0.7}
      >
        <Compass
          size={22}
          color={currentTab === 'explorer' ? '#2563EB' : '#64748B'}
          strokeWidth={currentTab === 'explorer' ? 2.5 : 2}
        />
        <Text style={[styles.navText, currentTab === 'explorer' && styles.navTextActive]}>
          Explorer
        </Text>
      </TouchableOpacity>

      {/* 3. Terra AI (Signature Center Button) */}
      <TouchableOpacity
        style={styles.terraCenterBtn}
        onPress={() => handleNav('/terra')}
        activeOpacity={0.8}
      >
        <View style={styles.terraGlowOuter}>
          <View style={[styles.terraInnerCircle, currentTab === 'terra' && styles.terraInnerActive]}>
            <Sparkles size={22} color="#FFFFFF" />
          </View>
        </View>
        <Text style={[styles.navText, styles.terraText, currentTab === 'terra' && styles.navTextActive]}>
          Terra AI
        </Text>
      </TouchableOpacity>

      {/* 4. Document Locker */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleNav('/vault')}
        activeOpacity={0.7}
      >
        <FolderLock
          size={22}
          color={currentTab === 'locker' ? '#2563EB' : '#64748B'}
          strokeWidth={currentTab === 'locker' ? 2.5 : 2}
        />
        <Text style={[styles.navText, currentTab === 'locker' && styles.navTextActive]}>
          Locker
        </Text>
      </TouchableOpacity>

      {/* 5. Orders */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleNav('/orders')}
        activeOpacity={0.7}
      >
        <FileCheck
          size={22}
          color={currentTab === 'orders' ? '#2563EB' : '#64748B'}
          strokeWidth={currentTab === 'orders' ? 2.5 : 2}
        />
        <Text style={[styles.navText, currentTab === 'orders' && styles.navTextActive]}>
          Orders
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f4f6fa',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    paddingBottom: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 20
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    cursor: 'pointer' as any
  },
  navText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4
  },
  navTextActive: {
    color: '#2563EB',
    fontWeight: '700'
  },
  terraCenterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -16,
    cursor: 'pointer' as any
  },
  terraGlowOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)'
  },
  terraInnerCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6
  },
  terraInnerActive: {
    backgroundColor: '#1D4ED8'
  },
  terraText: {
    marginTop: 2
  }
});
