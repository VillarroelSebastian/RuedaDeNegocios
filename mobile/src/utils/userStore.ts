import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'rueda_current_user';
const TOKEN_KEY = 'rueda_session_token';
const BACKEND_PORT = 3334;

let currentUser: any = null;
let loggingOut = false;
let logoutTask: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
export function sessionExpiry(user: any): number {
  try {
    const payload = JSON.parse(atob(user.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number(payload.exp) * 1000;
  } catch { return Number(user?.sessionExpiresAt) || 0; }
}

const nativeFetch = global.fetch.bind(global);
// Sin timeout, una petición puede quedar colgada indefinidamente con una
// conexión mala — el usuario ve un spinner que nunca termina en vez de un
// error claro para reintentar. Los uploads (FormData: fotos, comprobantes)
// llevan más tiempo en conexión lenta, así que tienen más margen.
const TIMEOUT_MS = 20000;
const TIMEOUT_MS_UPLOAD = 60000;
global.fetch = ((input: any, init: RequestInit = {}) => {
  const target = typeof input === 'string' ? input : input?.url;
  if (typeof target !== 'string' || !(target === API_URL || target.startsWith(API_URL.replace(/\/$/, '') + '/'))) return nativeFetch(input, init);
  const token = currentUser?.token;
  const headers = new Headers(init.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined));
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  // Si el caller ya trae su propia señal de cancelación, se respeta tal
  // cual; si no, se agrega un timeout por defecto.
  if (init.signal) return nativeFetch(input, { ...init, headers });
  const esFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const controller = new AbortController();
  let agotado = false;
  const timer = setTimeout(() => { agotado = true; controller.abort(); }, esFormData ? TIMEOUT_MS_UPLOAD : TIMEOUT_MS);
  return nativeFetch(input, { ...init, headers, signal: controller.signal })
    .catch(() => {
      // fetch solo rechaza por fallas de red (nunca por un status HTTP como
      // 404/500), así que cualquier rechazo acá es un problema de conexión;
      // se reemplaza el error nativo en inglés ("Network request failed")
      // por un mensaje claro en español.
      throw new Error(agotado
        ? 'La conexión tardó demasiado. Revisa tu internet e intenta de nuevo.'
        : 'No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo.');
    })
    .then((res) => {
      // Si el servidor responde algo que no es JSON (p. ej. una página de
      // error del proxy), que falle res.json() en pantalla con un
      // "Unexpected token..." en inglés tampoco dice nada al usuario.
      const parseoOriginal = res.json.bind(res);
      res.json = () => parseoOriginal().catch(() => {
        throw new Error('El servidor no respondió correctamente. Intenta de nuevo en unos minutos.');
      });
      return res;
    })
    .finally(() => clearTimeout(timer));
}) as typeof fetch;

// El token de sesión vive en el almacén cifrado del sistema (Keystore); el resto
// del perfil, en AsyncStorage. Si el almacén seguro no está disponible se usa
// AsyncStorage para no dejar al usuario sin poder iniciar sesión.
async function guardarToken(token: string) {
  try { await SecureStore.setItemAsync(TOKEN_KEY, token); await AsyncStorage.removeItem(TOKEN_KEY); }
  catch { await AsyncStorage.setItem(TOKEN_KEY, token); }
}
async function leerToken(): Promise<string | null> {
  try { const t = await SecureStore.getItemAsync(TOKEN_KEY); if (t) return t; } catch {}
  return AsyncStorage.getItem(TOKEN_KEY);
}
async function borrarToken() {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export const userStore = {
  subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  set: async (user: any) => {
    currentUser = user;
    notify();
    const { token, ...resto } = user ?? {};
    if (token) await guardarToken(String(token));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resto));
  },
  get: () => currentUser,
  isSessionActive: (token: string) => !loggingOut && currentUser?.token === token && sessionExpiry(currentUser) > Date.now(),
  clear: async () => {
    if (logoutTask) return logoutTask;
    loggingOut = true;
    const user = currentUser;
    logoutTask = (async () => {
      if (user?.token) await import('./push').then(m => m.desactivarPush(API_URL, user.token, true));
      currentUser = null;
      notify();
      await AsyncStorage.removeItem(STORAGE_KEY);
      await borrarToken();
    })().finally(() => { loggingOut = false; logoutTask = null; });
    return logoutTask;
  },
  load: async (): Promise<any | null> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        // Sesiones guardadas por versiones anteriores traen el token dentro del
        // JSON: se migra al almacén seguro la primera vez.
        const tokenSeguro = await leerToken();
        if (tokenSeguro) user.token = tokenSeguro;
        else if (user.token) {
          await guardarToken(String(user.token));
          const { token: _migrado, ...sinToken } = user;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sinToken));
        }
        const expiry = sessionExpiry(user);
        if (!user.token || !expiry || expiry <= Date.now()) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          await borrarToken();
          return null;
        }
        currentUser = user;
        notify();
        return user;
      }
    } catch (e) {
      if (__DEV__) console.warn('[userStore] AsyncStorage load error:', e);
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

  if (!__DEV__) throw new Error('Esta compilación no tiene configurada la API de producción.');

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
