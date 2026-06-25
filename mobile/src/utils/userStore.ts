import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'currentUser';
const BACKEND_PORT = 3334;

let currentUser: any = null;

export const userStore = {
  set: async (user: any) => {
    currentUser = user;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  get: () => currentUser,
  load: async (): Promise<any | null> => {
    if (currentUser) return currentUser;
    try {
      const stored = await AsyncStorage.getItem(USER_KEY);
      if (stored) { currentUser = JSON.parse(stored); }
    } catch {}
    return currentUser;
  },
  clear: async () => {
    currentUser = null;
    await AsyncStorage.removeItem(USER_KEY);
  },
};

function resolveApiUrl(): string {
  // 1. Variable de entorno explícita (override manual si se necesita)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
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
    const host = hostUri.split(':')[0];
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
