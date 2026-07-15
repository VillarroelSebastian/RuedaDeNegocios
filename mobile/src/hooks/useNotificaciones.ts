import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Alert } from 'react-native';
import { API_URL } from '../utils/userStore';

// Socket.IO se conecta al ORIGEN del backend (sin el prefijo /api que usa el
// proxy en producción): la ruta /socket.io/ la enruta Nginx directamente.
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const EVENTO_LABELS: Record<string, string> = {
  'pago:aprobado':            'Pago aprobado',
  'pago:rechazado':           'Pago rechazado',
  'pago-adicional:aprobado':  'Pago adicional aprobado',
  'pago-adicional:rechazado': 'Pago adicional rechazado',
  'solicitud:nueva':          'Nueva solicitud de reunión',
  'solicitud:aceptada':       'Solicitud aceptada',
  'solicitud:rechazada':      'Solicitud rechazada',
  'reunion:reprogramada':     'Reunión reprogramada',
  'reunion:recordatorio':     'Reunión próxima',
  'comunicado:nuevo':         'Nuevo comunicado',
};

export interface NotifMobile {
  id: string;
  evento: string;
  mensaje: string;
  titulo?: string;
  timestamp: number;
}

export function useNotificacionesMobile(eeId: number | null) {
  const socketRef = useRef<Socket | null>(null);
  const [notifs, setNotifs] = useState<NotifMobile[]>([]);

  const addNotif = useCallback((evento: string, payload: any) => {
    const notif: NotifMobile = {
      id: `${Date.now()}-${Math.random()}`,
      evento,
      mensaje: payload.mensaje ?? evento,
      titulo: payload.titulo ?? EVENTO_LABELS[evento] ?? 'Notificación',
      timestamp: Date.now(),
    };
    setNotifs((prev) => [notif, ...prev].slice(0, 10));
    // Show native alert for important events
    Alert.alert(
      notif.titulo ?? 'Notificación',
      notif.mensaje,
      [{ text: 'OK', style: 'default' }],
    );
  }, []);

  useEffect(() => {
    if (!eeId) return;

    const socket = io(`${SOCKET_URL}/notificaciones`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('unirse', { eeId });
    });

    const EVENTOS = [
      'pago:aprobado', 'pago:rechazado',
      'pago-adicional:aprobado', 'pago-adicional:rechazado',
      'solicitud:nueva', 'solicitud:aceptada', 'solicitud:rechazada',
      'reunion:reprogramada', 'reunion:recordatorio',
      'comunicado:nuevo',
    ];

    EVENTOS.forEach((ev) => {
      socket.on(ev, (payload: any) => addNotif(ev, payload));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eeId, addNotif]);

  const dismiss = useCallback((id: string) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifs, dismiss };
}
