import { Platform } from 'react-native';

export function navigateTo(router: any, path: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = path;
  } else {
    router.push(path as any);
  }
}
