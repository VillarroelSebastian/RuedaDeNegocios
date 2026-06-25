import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'rueda_current_user';

let currentUser: any = null;

export const userStore = {
  set: (user: any) => {
    currentUser = user;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user)).catch(() => {});
  },
  get: () => currentUser,
  clear: () => {
    currentUser = null;
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
  /** Carga el usuario guardado desde AsyncStorage. */
  load: async (): Promise<any | null> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        currentUser = user;
        return user;
      }
    } catch (e) {
      console.warn('[userStore] AsyncStorage load error:', e);
    }
    return null;
  },
};

function resolveApiUrl(): string {
  // Priority 1: explicit env var — set in .env for LAN/device testing
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }

  // Priority 2: derive host from Expo Metro server (dev mode on same LAN)
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest?.debuggerHost ??
    (Constants as any).manifest2?.launchAsset?.url;
  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3334`;
    }
  }

  // Priority 3: emulator / simulator defaults
  if (Platform.OS === 'android') return 'http://10.0.2.2:3334';
  return 'http://localhost:3334';
}

export const API_URL = resolveApiUrl();
