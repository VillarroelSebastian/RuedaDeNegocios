import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rueda_push_token';
const ENABLED = 'rueda_push_enabled';
const ASKED = 'rueda_push_permission_asked';
let permissionTask: Promise<boolean> | null = null;

async function notifications() {
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo')
    throw new Error('Las notificaciones push requieren la aplicación instalada.');
  return import('expo-notifications');
}
export async function pedirPermisoInicial(): Promise<boolean> {
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo' || !Device.isDevice) return false;
  if (permissionTask) return permissionTask;
  permissionTask = (async () => {
    const n = await notifications();
    if (Platform.OS === 'android') await n.setNotificationChannelAsync('eventos', {
      name: 'Eventos y mensajes', importance: n.AndroidImportance.HIGH, sound: 'default',
    });
    let permission = await n.getPermissionsAsync();
    if (permission.status !== 'granted' && permission.canAskAgain && !await AsyncStorage.getItem(ASKED)) {
      await AsyncStorage.setItem(ASKED, '1');
      permission = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    }
    return permission.status === 'granted';
  })().finally(() => { permissionTask = null; });
  return permissionTask;
}
async function registrar(api: string, token: string, pushToken: string) {
  const res = await fetch(api + '/push/suscripcion', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ tipo: 'expo', token: pushToken }),
  });
  if (!res.ok) throw new Error('No se pudo registrar el dispositivo. Reintenta con conexión a internet.');
}
export async function activarPush(api: string, token: string, pedirPermiso = true) {
  if (!Device.isDevice) throw new Error('Activa push desde un dispositivo físico.');
  const n = await notifications();
  await pedirPermisoInicial();
  let permission = await n.getPermissionsAsync();
  if (pedirPermiso && permission.status !== 'granted' && permission.canAskAgain)
    permission = await n.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Habilita las notificaciones en los ajustes del dispositivo.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Falta configurar el proyecto de notificaciones.');
  const pushToken = (await n.getExpoPushTokenAsync({ projectId })).data;
  await registrar(api, token, pushToken);
  await AsyncStorage.multiSet([[KEY, pushToken], [ENABLED, '1']]);
  return pushToken;
}
export async function restaurarPush(api: string, token: string) {
  const permitted = await pedirPermisoInicial();
  if (!permitted || await AsyncStorage.getItem(ENABLED) === '0') return false;
  await activarPush(api, token, false);
  return true;
}
export async function desactivarPush(api: string, token: string, cerrarSesion = false) {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored) {
    const res = await fetch(api + '/push/suscripcion', {
      method: 'DELETE', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ token: stored }),
    });
    if (!res.ok) throw new Error('No se pudo desactivar push. Intenta de nuevo.');
    await AsyncStorage.removeItem(KEY);
  }
  if (!cerrarSesion) await AsyncStorage.setItem(ENABLED, '0');
}
export async function escucharPush(onOpen: (data: any) => boolean) {
  try {
    const n = await notifications();
    n.setNotificationHandler({ handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
    }) });
    let pending: any = null;
    const open = async () => {
      if (pending && onOpen(pending)) { pending = null; await n.clearLastNotificationResponseAsync(); }
    };
    const listener = n.addNotificationResponseReceivedListener(r => { pending = r.notification.request.content.data; void open(); });
    const last = await n.getLastNotificationResponseAsync();
    if (last) { pending = last.notification.request.content.data; void open(); }
    const timer = setInterval(() => { void open(); }, 1000);
    return () => { listener.remove(); clearInterval(timer); };
  } catch { return () => {}; }
}
