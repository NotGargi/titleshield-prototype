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
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tfKey, setTfKey] = useState('');

  const handleLogin = async () => {
    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setErrorMessage('Please enter your email or username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const res = await login(trimmedId, password, tfKey.trim() || undefined);
    setLoading(false);

    if (res.success) {
      navigateTo(router, '/');
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Please try again.');
    }
  };

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
                <Text style={styles.secureBadgeText}>SECURE PROTOCOL</Text>
              </View>
            </View>
            <Text style={styles.brandTitle}>Sovereign Title Diligence</Text>
            <Text style={styles.brandSubtitle}>
              Sign in to access your deed locker & title verification
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.cardHeaderTitle}>Sign In</Text>

            {/* Error Banner */}
            {Boolean(errorMessage) && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Email / Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email or Username</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="login-identifier-input"
                  style={styles.input}
                  placeholder="Enter your email or username"
                  placeholderTextColor="#64748B"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="login-password-input"
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onSubmitEditing={handleLogin}
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

            {/* Optional: connect / update TinyFish key */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TinyFish API Key (optional, to connect or update)</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  testID="login-tinyfish-input"
                  style={styles.input}
                  placeholder="sk-tinyfish-…"
                  placeholderTextColor="#64748B"
                  value={tfKey}
                  onChangeText={setTfKey}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              testID="login-submit-button"
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.submitBtnRow}>
                  <Text style={styles.submitBtnText}>Sign In</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Switch to Registration */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity
                testID="navigate-register-button"
                onPress={() => navigateTo(router, '/register')}
                activeOpacity={0.7}
              >
                <Text style={styles.registerLinkText}>Create an Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    minHeight: '100%'
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoImage: {
    width: 140,
    height: 40,
    marginBottom: 10
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
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center'
  },
  loginCard: {
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
    marginBottom: 18
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
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 13,
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
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 18
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
  registerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB'
  }
});
