import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Works out where the backend (port 4000) is running:
// - Phone with Expo Go: uses the same laptop IP that Expo is served from
// - Phone/laptop browser: uses the address in the browser bar
// - Android emulator: 10.0.2.2
// You can override everything with EXPO_PUBLIC_API_URL if needed.
function resolveHost(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  }
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    return String(hostUri).split(':')[0];
  }
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

export const API_HOST = resolveHost();

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${API_HOST}:4000/api`;
