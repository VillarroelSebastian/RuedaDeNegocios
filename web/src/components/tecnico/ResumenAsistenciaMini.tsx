"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Search, RefreshCw, CheckCircle2, Circle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const FILAS_INICIALES = 8;

type Empresa = { empresaEventoId: number; nombre: string; registrados: number; asistentes: number };
type Filtro = "todas" | "con" | "sin";

// Versión compacta de la vista de asistencia del admin: permite al técnico ver
// qué empresas ya tienen asistentes registrados sin salir del escaneo QR.
export default function ResumenAsistenciaMini({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [verTodas, setVerTodas] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tecnico/asistencia/resumen`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(false);
    } catch { setError(true); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    cargar();
    const iv = setInterval(cargar, 30000);
    return () => clearInterval(iv);
  }, [cargar, refreshKey]);

  const empresas: Empresa[] = data?.empresas ?? [];
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empresas.filter((e) => {
      if (filtro === "con" && e.asistentes === 0) return false;
      if (filtro === "sin" && e.asistentes > 0) return false;
      return !q || e.nombre.toLowerCase().includes(q);
    });
  }, [empresas, busqueda, filtro]);

  const resumen = data?.empresa;
  const pct = resumen?.empresasRegistradas ? Math.round((resumen.empresasAsistentes / resumen.empresasRegistradas) * 100) : 0;
  const visibles = verTodas ? filtradas : filtradas.slice(0, FILAS_INICIALES);

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 mb-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="font-extrabold text-gray-900">Asistencia de empresas</h2>
          <p className="text-xs text-gray-500">Resumen rápido del evento actual.</p>
        </div>
        <button onClick={cargar} aria-label="Actualizar resumen" className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400 py-4 text-center">Cargando resumen…</p>
      ) : error || !resumen ? (
        <p className="text-sm text-red-600 py-3 text-center">No se pudo cargar el resumen de asistencia.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-gray-50 p-3"><p className="text-xl font-extrabold text-gray-900">{resumen.empresasRegistradas}</p><p className="text-[11px] font-bold text-gray-400 uppercase">Empresas</p></div>
            <div className="rounded-xl bg-green-50 p-3"><p className="text-xl font-extrabold text-[#449D3A]">{resumen.empresasAsistentes}</p><p className="text-[11px] font-bold text-green-700 uppercase">Con asistencia</p></div>
            <div className="rounded-xl bg-amber-50 p-3"><p className="text-xl font-extrabold text-amber-600">{resumen.empresasSinAsistencia}</p><p className="text-[11px] font-bold text-amber-700 uppercase">Sin asistencia</p></div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-[#449D3A] transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="text-[11px] text-gray-500 mt-1">{pct}% de las empresas con al menos un asistente · {resumen.asistentes} de {resumen.registrados} personas</p>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setVerTodas(false); }} placeholder="Buscar empresa…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1 shrink-0">
              {([["todas", "Todas"], ["con", "Con"], ["sin", "Sin"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => { setFiltro(k); setVerTodas(false); }}
                  className={`flex-1 px-3 py-1 rounded-lg text-xs font-bold ${filtro === k ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>{l}</button>
              ))}
            </div>
          </div>

          <ul className="mt-3 divide-y divide-gray-50">
            {visibles.length === 0 && <li className="py-4 text-center text-sm text-gray-400">Sin empresas con ese filtro.</li>}
            {visibles.map((e) => (
              <li key={e.empresaEventoId} className="flex items-center gap-2.5 py-2">
                {e.asistentes > 0 ? <CheckCircle2 className="w-4 h-4 text-[#449D3A] shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                <Building2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-800">{e.nombre}</span>
                <span className={`text-xs font-bold shrink-0 ${e.asistentes > 0 ? "text-[#449D3A]" : "text-gray-400"}`}>{e.asistentes}/{e.registrados}</span>
              </li>
            ))}
          </ul>
          {filtradas.length > FILAS_INICIALES && (
            <button onClick={() => setVerTodas((v) => !v)} className="mt-2 w-full text-xs font-bold text-[#449D3A] py-2 hover:bg-green-50 rounded-lg">
              {verTodas ? "Ver menos" : `Ver las ${filtradas.length} empresas`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
