import { Platform } from 'react-native';

let currentUser: any = null;

export const userStore = {
  set: (user: any) => { currentUser = user; },
  get: () => currentUser,
  clear: () => { currentUser = null; },
};

// Android emulator uses 10.0.2.2 to reach host; iOS simulator and web use localhost
export const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3334' : 'http://localhost:3334';
