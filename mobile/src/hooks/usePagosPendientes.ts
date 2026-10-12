import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../utils/userStore';

export type ResumenPagos = { iniciales: number; adicionales: number; mejoras: number; total: number };

// Pagos esperando revisión del administrador (badges rojos). Se refresca al
// enfocar la pantalla y cada 20 s mientras está visible.
export function usePagosPendientes(): ResumenPagos & { refrescar: () => void } {
  const [resumen, setResumen] = useState<ResumenPagos>({ iniciales: 0, adicionales: 0, mejoras: 0, total: 0 });
  const refrescar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/pagos-resumen`);
      if (!res.ok) return;
      const d = await res.json();
      setResumen({ iniciales: d.iniciales ?? 0, adicionales: d.adicionales ?? 0, mejoras: d.mejoras ?? 0, total: d.total ?? 0 });
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => {
    refrescar();
    const iv = setInterval(refrescar, 20_000);
    return () => clearInterval(iv);
  }, [refrescar]));
  return { ...resumen, refrescar };
}
