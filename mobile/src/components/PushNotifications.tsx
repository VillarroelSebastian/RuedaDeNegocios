import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { userStore, API_URL } from '../utils/userStore';
import { restaurarPush, escucharPush, pedirPermisoInicial } from '../utils/push';

// Notificaciones push: sin interfaz propia.
//
// Antes mostraba una franja fija ("Activar notificaciones") en todas las
// pantallas, con un botón para activar o desactivar. Ahora el permiso se pide
// solo al entrar a la aplicación y el dispositivo se registra en segundo plano:
// el usuario no ve nada y los errores no interrumpen (si falla, se reintenta
// al volver a la app o al minuto siguiente).
//
// El componente sigue montado porque mantiene tres cosas vivas: el permiso
// inicial, el registro del token y la navegación al tocar una notificación.
export default function PushNotifications({ onOpen }: { onOpen: (data: any) => boolean }) {
  const [user, setUser] = useState(userStore.get());

  useEffect(() => userStore.subscribe(() => setUser(userStore.get())), []);

  // Permiso del sistema, una sola vez al abrir la app.
  useEffect(() => { void pedirPermisoInicial().catch(() => {}); }, []);

  // Registro del dispositivo mientras haya sesión. Se reintenta al volver a
  // primer plano y cada minuto, por si la primera vez no había internet.
  useEffect(() => {
    let alive = true, running = false;
    const restore = async () => {
      if (!user?.token || running || userStore.get()?.token !== user.token) return;
      running = true;
      try { await restaurarPush(API_URL, user.token); }
      catch { /* sin conexión o permiso denegado: se reintenta más tarde */ }
      finally { running = false; }
    };
    void restore();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void restore(); });
    const retry = setInterval(() => { if (AppState.currentState === 'active') void restore(); }, 60000);
    return () => { alive = false; clearInterval(retry); listener.remove(); };
  }, [user?.token]);

  // Tocar una notificación del sistema abre su sección.
  useEffect(() => {
    let stop: undefined | (() => void), cancelled = false;
    escucharPush(onOpen).then(fn => { if (cancelled) fn(); else stop = fn; });
    return () => { cancelled = true; stop?.(); };
  }, [onOpen]);

  return null;
}
