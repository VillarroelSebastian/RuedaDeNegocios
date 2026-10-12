import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL, userStore } from './userStore';

// Envía al servidor los errores no controlados de usuarios reales (solo con
// sesión iniciada) para poder diagnosticarlos. Nunca lanza ni bloquea la app.
let ultimo = '';
let ultimoEn = 0;

export function reportarError(error: any, pantalla = '', pila = '') {
  try {
    const mensaje = String(error?.message ?? error ?? 'Error desconocido');
    const ahora = Date.now();
    // El mismo error repetido en un bucle de render no debe inundar el servidor.
    if (mensaje === ultimo && ahora - ultimoEn < 30_000) return;
    ultimo = mensaje; ultimoEn = ahora;
    if (__DEV__) console.warn('[error]', mensaje);
    if (!userStore.get()?.token) return;
    void fetch(`${API_URL}/app/error-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje, pantalla, pila: pila || String(error?.stack ?? ''),
        version: Constants.expoConfig?.version, plataforma: `${Platform.OS} ${Platform.Version}`,
      }),
    }).catch(() => {});
  } catch {}
}

// Errores JS fuera de React (promesas, callbacks): se reportan y se deja que el
// manejador original siga su curso.
export function instalarManejadorGlobal() {
  const g: any = global;
  const original = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((error: any, esFatal?: boolean) => {
    reportarError(error, esFatal ? 'fatal' : 'global');
    original?.(error, esFatal);
  });
}
