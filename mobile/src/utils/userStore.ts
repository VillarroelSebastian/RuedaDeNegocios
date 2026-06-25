import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'rueda_current_user';
const BACKEND_PORT = 3334;

let currentUser: any = null;

export const userStore = {
  set: async (user: any) => {
    currentUser = user;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },
  get: () => currentUser,
  clear: async () => {
    currentUser = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
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
  // 1. Variable de entorno explícita (override manual si se necesita)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }

  // 2. URL del bundle Metro — siempre tiene la IP real del servidor de desarrollo
  //    (funciona con Expo Go y builds de desarrollo en dispositivo real)
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([\d.]+)/);
      if (match?.[1] && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:${BACKEND_PORT}`;
      }
    }
  } catch {}

  // 3. Expo Constants — múltiples variantes según la versión del SDK
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${BACKEND_PORT}`;
    }
  }

  // 4. Emulador Android
  if (Platform.OS === 'android') return `http://10.0.2.2:${BACKEND_PORT}`;

  // 5. Simulador iOS / último recurso
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_URL = resolveApiUrl();
