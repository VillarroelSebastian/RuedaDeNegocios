import { useCallback, useEffect, useState } from 'react';
import { subscribeNotifications } from '../utils/notificationEvents';
import { userStore, API_URL } from '../utils/userStore';

// Pendientes de respuesta del encargado: solicitudes de reunión recibidas y
// cambios de horario por responder. Alimenta el badge rojo de la pestaña
// "Agenda" y de la subpestaña "Reuniones".
export function useSolicitudesPendientesCount() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    const eeId = userStore.get()?.empresaeventoId;
    if (!eeId) return;
    try {
      const [resSol, resCam] = await Promise.all([
        fetch(`${API_URL}/empresa/solicitudes?eeId=${eeId}`),
        fetch(`${API_URL}/empresa/reuniones/cambios?eeId=${eeId}`),
      ]);
      const sol = resSol.ok ? await resSol.json() : [];
      const cam = resCam.ok ? await resCam.json() : [];
      setCount(
        (Array.isArray(sol) ? sol.filter((s: any) => s.estado === 'PENDIENTE' && !s.esMiSolicitud).length : 0) +
        (Array.isArray(cam) ? cam.filter((c: any) => c.estado === 'PENDIENTE' && c.direccion === 'recibida').length : 0),
      );
    } catch {}
  }, []);
  useEffect(() => { refresh(); const iv = setInterval(refresh, 15_000); return () => clearInterval(iv); }, [refresh]);
  useEffect(() => subscribeNotifications(() => { void refresh(); }), [refresh]);
  return count;
}
