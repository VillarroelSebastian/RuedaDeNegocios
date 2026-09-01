"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2, Clock, Video, Search, ExternalLink,
  Wifi, AlertCircle, RefreshCw,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

const ESTADO_CFG: Record<string, { badge: string; dot: string; label: string; animated?: boolean }> = {
  PROGRAMADA: { badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',   label: 'Programada' },
  EN_CURSO:   { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', label: 'En curso', animated: true },
  FINALIZADA: { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-400',  label: 'Finalizada' },
  CANCELADA:  { badge: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-300',   label: 'Cancelada' },
};

const TIPO_CFG: Record<string, { badge: string; label: string }> = {
  VIRTUAL: { badge: 'bg-blue-100 text-blue-700',    label: 'Virtual' },
  MIXTA:   { badge: 'bg-purple-100 text-purple-700', label: 'Mixta' },
};

const FILTER_TABS = [
  { key: 'TODOS',      label: 'Todas' },
  { key: 'EN_CURSO',   label: 'En curso' },
  { key: 'PROGRAMADA', label: 'Programadas' },
  { key: 'FINALIZADA', label: 'Finalizadas' },
  { key: 'CANCELADA',  label: 'Canceladas' },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'short', year: 'numeric' });
}

function CompanyChip({ empresa, colorClass }: { empresa: any; colorClass: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {empresa?.urlFotoPerfil
        ? <img src={empresa.urlFotoPerfil} className="w-8 h-8 rounded-full object-contain shrink-0 border border-gray-100" alt={empresa.nombre} />
        : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
            <Building2 className="w-3.5 h-3.5" />
          </div>
        )
      }
      <span className="text-sm font-semibold text-gray-900 truncate">{empresa?.nombre ?? '—'}</span>
    </div>
  );
}

export default function TecnicoVirtualesPage() {
  const [reuniones, setReuniones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('TODOS');

  const load = useCallback(async (mostrarCarga = false) => {
      if (mostrarCarga) setLoading(true);
      try {
        const [resV, resM] = await Promise.all([
          fetch(`${API}/tecnico/reuniones?tipo=VIRTUAL`, { cache: 'no-store' }),
          fetch(`${API}/tecnico/reuniones?tipo=MIXTA`, { cache: 'no-store' }),
        ]);
        const dataV = await resV.json();
        const dataM = await resM.json();
        const all = [...(Array.isArray(dataV) ? dataV : []), ...(Array.isArray(dataM) ? dataM : [])];
        // Deduplicate by id
        const seen = new Set<number>();
        const unique = all.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
        setReuniones(unique);
      } catch {
        setReuniones([]);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    load(true);
    const timer = window.setInterval(() => load(), 15_000);
    const actualizar = () => load();
    window.addEventListener('rueda:notificacion', actualizar);
    window.addEventListener('focus', actualizar);
    const alCambiarVisibilidad = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('rueda:notificacion', actualizar);
      window.removeEventListener('focus', actualizar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, [load]);

  const filtered = reuniones.filter((r) => {
    const sol = r.solicitudreunion;
    const ea = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
    const eb = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
    const matchSearch = !search.trim() ||
      (ea?.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (eb?.nombre ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === 'TODOS' || r.estadoReunion === filtro;
    return matchSearch && matchFiltro;
  });
  const canceladasPorEmpresa = reuniones.filter((r) =>
    r.estadoReunion === 'CANCELADA' && /^Cancelada por /i.test(r.observacionesReunion ?? ''),
  );
  const sinEnlace = reuniones.filter((r) =>
    ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'].includes(r.estadoReunion) &&
    !r.solicitudreunion?.enlaceReunionVirtual,
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Reuniones Virtuales</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          {filtered.length} reunión(es) virtual(es) o mixta(s)
        </p>
        </div>
        <button onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {sinEnlace.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">{sinEnlace.length} reunión(es) pendiente(s) de enlace virtual</p>
            <p className="mt-1 text-xs text-amber-800">Abre sus detalles y agrega un enlace HTTPS antes de la hora programada.</p>
          </div>
        </div>
      )}

      {canceladasPorEmpresa.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">{canceladasPorEmpresa.length} reunión(es) virtual(es) cancelada(s) por empresas</p>
            <p className="mt-1 text-xs text-red-700">El motivo aparece directamente en la reunión cancelada.</p>
          </div>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
          />
        </div>
        <div className="flex max-w-full gap-1.5 overflow-x-auto bg-gray-100 p-1 rounded-xl">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFiltro(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filtro === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#449D3A]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Wifi className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold">Sin reuniones virtuales</p>
          <p className="text-gray-300 text-sm mt-1">Intenta con otro filtro o búsqueda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const sol = r.solicitudreunion;
            const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
            const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
            const est = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
            const tip = TIPO_CFG[r.tipoReunion] ?? TIPO_CFG.VIRTUAL;
            const link = sol?.enlaceReunionVirtual;
            const cancelada = r.estadoReunion === 'CANCELADA';
            const enlaceOperativo = ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'].includes(r.estadoReunion);
            const canceladaPorEmpresa = cancelada && /^Cancelada por /i.test(r.observacionesReunion ?? '');

            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold self-start ${est.badge}`}>
                    {est.animated
                      ? <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      : <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                    }
                    {est.label}
                  </span>

                  {/* Companies */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CompanyChip empresa={ea} colorClass="bg-green-100 text-green-700" />
                    <span className="text-gray-300 text-sm font-bold shrink-0">↔</span>
                    <CompanyChip empresa={eb} colorClass="bg-blue-100 text-blue-700" />
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {fmtDate(r.fechaHoraInicioReunion)} · {fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}
                    </span>
                  </div>

                  {/* Type badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tip.badge}`}>
                    {tip.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {r.estadoReunion === 'EN_CURSO' && (
                      <Link href="/tecnico/reuniones" className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600">
                        Finalizar y evaluar
                      </Link>
                    )}
                    <Link
                      href={`/tecnico/virtuales/${r.id}`}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Ver detalles
                    </Link>
                    {link && enlaceOperativo && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir enlace
                      </a>
                    )}
                  </div>
                </div>
                {canceladaPorEmpresa && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{r.observacionesReunion}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
