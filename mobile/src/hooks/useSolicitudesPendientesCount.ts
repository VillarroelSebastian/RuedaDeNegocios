import { useCallback, useEffect, useState } from 'react';
import { subscribeNotifications } from '../utils/notificationEvents';
import { userStore, API_URL } from '../utils/userStore';

// Solicitudes de reunión recibidas y todavía sin responder: alimenta el badge
// rojo de la pestaña "Agenda" y de la subpestaña "Reuniones".
export function useSolicitudesPendientesCount() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    const eeId = userStore.get()?.empresaeventoId;
    if (!eeId) return;
    try {
      const res = await fetch(`${API_URL}/empresa/solicitudes?eeId=${eeId}`);
      if (!res.ok) return;
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setCount(lista.filter((s: any) => s.estado === 'PENDIENTE' && !s.esMiSolicitud).length);
    } catch {}
  }, []);
  useEffect(() => { refresh(); const iv = setInterval(refresh, 15_000); return () => clearInterval(iv); }, [refresh]);
  useEffect(() => subscribeNotifications(() => { void refresh(); }), [refresh]);
  return count;
}
