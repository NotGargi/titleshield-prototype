import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../constants/api';
import { navigateTo } from '../utils/navigation';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tfKey, setTfKey] = useState('');
  const [tfState, setTfState] = useState<'idle' | 'checking' | 'ok' | 'bad' | 'unreachable'>('idle');
  const [tfMsg, setTfMsg] = useState('');

  const verifyTf = async (): Promise<'ok' | 'bad' | 'unreachable'> => {
    if (!tfKey.trim()) {
      setTfState('bad');
      setTfMsg('Enter your TinyFish API key.');
      return 'bad';
    }
    setTfState('checking');
    setTfMsg('Checking key with TinyFish…');
    try {
      const r = await fetch(`${API_BASE_URL}/auth/tinyfish/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: tfKey.trim() })
      });
      const d = await r.json();
      if (d.ok) {
        setTfState('ok');
        setTfMsg('✓ Key verified with TinyFish');
        return 'ok';
      }
      if (d.status === 401 || d.status === 403) {
        setTfState('bad');
        setTfMsg(d.message || 'TinyFish rejected this key.');
        return 'bad';
      }
      setTfState('unreachable');
      setTfMsg((d.message || 'Could not verify right now.') + ' The key will still be saved.');
      return 'unreachable';
    } catch {
      setTfState('unreachable');
      setTfMsg('Could not reach the server to verify. The key will still be saved.');
      return 'unreachable';
    }
  };

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Full name is required (minimum 2 characters).');
      return;
    }
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!tfKey.trim()) {
      setErrorMessage('Please enter your TinyFish API key. Your searches run on it.');
      return;
    }
    let tfResult: 'ok' | 'bad' | 'unreachable' = tfState === 'ok' ? 'ok' : 'unreachable';
    if (tfState !== 'ok') {
      tfResult = await verifyTf();
      if (tfResult === 'bad') {
        setErrorMessage('TinyFish rejected this key. Please check it.');
        return;
      }
    }

    setLoading(true);
    setErrorMessage('');

    const res = await register({
      tinyfishApiKey: tfKey.trim(),
      tinyfishVerified: tfResult === 'ok',
      name: trimmedName,
      email: trimmedEmail,
      password,
      phone: trimmedPhone || undefined,
      role: 'CITIZEN'
    });

    setLoading(false);

    if (res.success) {
      navigateTo(router, '/');
    } else {
      setErrorMessage(res.error || 'Registration failed. Please try again.');
    }
  };

  const passwordsMatch = password.length >= 8 && password === confirmPassword;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <Image
              source={require('../assets/images/src_images_landeed_logo_medium_transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.badgeRow}>
              <View style={styles.secureBadge}>
                <ShieldCheck size={12} color="#059669" />
                <Text style={styles.secureBadgeText}>CITIZEN REGISTRY</Text>
              </View>
            </View>
            <Text style={styles.brandTitle}>Create Landeed Account</Text>
            <Text style={styles.brandSubtitle}>
              Secure title verification, mutation notices & on-chain deed locker
            </Text>
          </View>

          {/* Registration Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Account Details</Text>

            {/* Error Banner */}
            {Boolean(errorMessage) && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Legal Name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="register-name-input"
                  style={styles.input}
                  placeholder="e.g. Vikramaditya Shinde"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="register-email-input"
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Number (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="register-phone-input"
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#64748B"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password (Min 8 Characters)</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="register-password-input"
                  style={styles.input}
                  placeholder="Create secure password"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="register-confirm-password-input"
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor="#64748B"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onSubmitEditing={handleRegister}
                />
                {passwordsMatch && (
                  <View style={styles.matchIndicator}>
                    <CheckCircle2 size={18} color="#059669" />
                  </View>
                )}
              </View>
            </View>

            {/* TinyFish API key */}
            <View style={styles.tfBox}>
              <Text style={styles.tfHeading}>Connect TinyFish</Text>
              <Text style={styles.tfHelp}>
                TitleShield's agents read government portals through TinyFish. Your searches run on your own TinyFish key. Get one free at agent.tinyfish.ai/api-keys.
              </Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="register-tinyfish-input"
                  style={styles.input}
                  placeholder="sk-tinyfish-…"
                  placeholderTextColor="#64748B"
                  value={tfKey}
                  onChangeText={(t) => {
                    setTfKey(t);
                    setTfState('idle');
                    setTfMsg('');
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.tfRow}>
                <TouchableOpacity style={styles.tfVerifyBtn} onPress={verifyTf} disabled={tfState === 'checking'}>
                  <Text style={styles.tfVerifyText}>{tfState === 'checking' ? 'Checking…' : 'Verify key'}</Text>
                </TouchableOpacity>
                {!!tfMsg && (
                  <Text style={[styles.tfStatus, tfState === 'ok' ? { color: '#059669' } : tfState === 'bad' ? { color: '#dc2626' } : { color: '#b45309' }]}>
                    {tfMsg}
                  </Text>
                )}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              testID="register-submit-button"
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.submitBtnRow}>
                  <Text style={styles.submitBtnText}>Create Account</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Navigation back to Login */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigateTo(router, '/login')}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLinkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tfBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18
  },
  tfHeading: { fontSize: 15, fontWeight: '800', color: '#0369a1', marginBottom: 4 },
  tfHelp: { fontSize: 12, color: '#475569', lineHeight: 17, marginBottom: 10 },
  tfRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  tfVerifyBtn: { backgroundColor: '#0284c7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tfVerifyText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  tfStatus: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fa'
  },
  keyboardAvoid: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    paddingVertical: 30
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  logoImage: {
    width: 140,
    height: 40,
    marginBottom: 8
  },
  badgeRow: {
    marginBottom: 8
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    flex: 1
  },
  inputGroup: {
    marginBottom: 14
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    padding: 0
  },
  eyeBtn: {
    padding: 6
  },
  matchIndicator: {
    paddingLeft: 6
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  submitBtnDisabled: {
    opacity: 0.6
  },
  submitBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6
  },
  footerText: {
    fontSize: 13,
    color: '#64748b'
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB'
  }
});
