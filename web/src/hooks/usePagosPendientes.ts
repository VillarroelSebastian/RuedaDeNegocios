"use client";
import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export type ResumenPagos = { iniciales: number; foro: number; adicionales: number; mejoras: number; total: number };
const VACIO: ResumenPagos = { iniciales: 0, foro: 0, adicionales: 0, mejoras: 0, total: 0 };

// Pagos esperando revisión del administrador (badges rojos). Se refresca cada
// 20 s y cuando otra parte de la pantalla avisa con el evento "pagosActualizados".
export function usePagosPendientes(activo = true): ResumenPagos {
  const [resumen, setResumen] = useState<ResumenPagos>(VACIO);
  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/pagos-resumen`);
      if (!res.ok) return;
      const d = await res.json();
      setResumen({ iniciales: d.iniciales ?? 0, foro: d.foro ?? 0, adicionales: d.adicionales ?? 0, mejoras: d.mejoras ?? 0, total: d.total ?? 0 });
    } catch {}
  }, []);
  useEffect(() => {
    if (!activo) return;
    cargar();
    const timer = window.setInterval(cargar, 20000);
    window.addEventListener("pagosActualizados", cargar);
    return () => { window.clearInterval(timer); window.removeEventListener("pagosActualizados", cargar); };
  }, [activo, cargar]);
  return resumen;
}

export const avisarPagosActualizados = () => window.dispatchEvent(new Event("pagosActualizados"));
