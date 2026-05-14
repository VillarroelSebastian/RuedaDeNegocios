import { Platform } from 'react-native';

let currentUser: any = null;

export const userStore = {
  set: (user: any) => { currentUser = user; },
  get: () => currentUser,
  clear: () => { currentUser = null; },
};

// 192.168.100.3 es la IP local del PC — funciona en emulador Android y en
// dispositivo físico conectado a la misma red WiFi.
export const API_URL = Platform.OS === 'android'
  ? 'http://192.168.100.3:3334'
  : 'http://localhost:3334';
