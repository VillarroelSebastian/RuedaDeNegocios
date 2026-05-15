import { Platform } from 'react-native';
import Constants from 'expo-constants';

let currentUser: any = null;

export const userStore = {
  set: (user: any) => { currentUser = user; },
  get: () => currentUser,
  clear: () => { currentUser = null; },
};

function resolveApiUrl(): string {
  // En dispositivo real con Expo Go, hostUri = "192.168.x.x:8081"
  // Extraemos la IP del servidor de desarrollo (misma máquina que el backend)
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3334`;
    }
  }
  // Emulador Android
  if (Platform.OS === 'android') return 'http://10.0.2.2:3334';
  // Simulador iOS
  return 'http://localhost:3334';
}

export const API_URL = resolveApiUrl();
