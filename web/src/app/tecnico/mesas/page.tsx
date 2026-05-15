"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Armchair, Building2, Clock, Video, MapPin, ChevronDown, ChevronUp, Search, X, Timer } from 'lucide-react';

const API = 'http://localhost:3334';

const ESTADO_MESA: Record<string, { badge: string; dot: string; label: string }> = {
  LIBRE:      { badge: 'bg-green-100 text-green-700',   dot: 'bg-green-400',  label: 'Libre' },
  PROGRAMADA: { badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',   label: 'Programada' },
  EN_USO:     { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', label: 'En uso' },
  EN_ESPERA:  { badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',  label: 'En espera' },
  FINALIZADA: { badge: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-300',   label: 'Finalizada' },
};

const ESTADO_REUNION: Record<string, { badge: string; dot: string; label: string }> = {
  PROGRAMADA: { badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',   label: 'Programada' },
  EN_CURSO:   { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', label: 'En curso' },
  FINALIZADA: { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-400',  label: 'Finalizada' },
  CANCELADA:  { badge: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400',   label: 'Cancelada' },
};

function getMapsUrl(sol: any): string | null {
  if (sol?.ubicacionGoogleMapsReunion) return sol.ubicacionGoogleMapsReunion;
  if (sol?.latitudPresencial && sol?.longitudPresencial)
    return `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}`;
  if (sol?.direccionTexto)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`;
  return null;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ReunionSlot({ r }: { r: any }) {
  const [open, setOpen] = useState(false);
  const sol  = r.solicitudreunion;
  const ea   = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb   = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est  = ESTADO_REUNION[r.estadoReunion] ?? ESTADO_REUNION.PROGRAMADA;
  const link = sol?.enlaceReunionVirtual;
  const mapsUrl = getMapsUrl(sol);
  const esVirtual    = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial = r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';
  const repsA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa_usuario ?? [];
  const repsB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa_usuario ?? [];

  return (
    <div className="border-t border-gray-50">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors">
        <div className="w-24 shrink-0">
          <p className="text-xs font-bold text-gray-800">
            {fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {ea?.urlFotoPerfil
            ? <img src={ea.urlFotoPerfil} className="w-7 h-7 rounded-full object-contain shrink-0 border border-gray-100" />
            : <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-green-700" /></div>}
          <span className="text-sm font-semibold text-gray-900 truncate">{ea?.nombre ?? '—'}</span>
          <span className="text-gray-300 font-bold text-sm shrink-0">·</span>
          {eb?.urlFotoPerfil
            ? <img src={eb.urlFotoPerfil} className="w-7 h-7 rounded-full object-contain shrink-0 border border-gray-100" />
            : <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-blue-700" /></div>}
          <span className="text-sm font-semibold text-gray-900 truncate">{eb?.nombre ?? '—'}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 hidden sm:inline ${est.badge}`}>
          {est.label}
        </span>
        <Link href={`/tecnico/reuniones/${r.id}`}
          className="text-xs font-semibold text-[#449D3A] hover:underline shrink-0 hidden sm:block">
          Ver detalles
        </Link>
        <button onClick={() => setOpen(!open)} className="shrink-0 text-gray-400 hover:text-gray-600">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            {sol?.mensajeParaEmpresaReceptora && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tema de reunión</p>
                <p className="text-xs text-gray-600 italic">"{sol.mensajeParaEmpresaReceptora}"</p>
              </div>
            )}
            {(repsA.length > 0 || repsB.length > 0) && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Representantes</p>
                <div className="flex flex-wrap gap-2">
                  {repsA.slice(0, 1).map((eu: any) => (
                    <span key={eu.usuario?.id} className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      {eu.usuario?.nombres} {eu.usuario?.apellidoPaterno} · {ea?.nombre}
                    </span>
                  ))}
                  {repsB.slice(0, 1).map((eu: any) => (
                    <span key={eu.usuario?.id} className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      {eu.usuario?.nombres} {eu.usuario?.apellidoPaterno} · {eb?.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {esVirtual && link && (
              <a href={link} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                <Video className="w-3 h-3" /> Reunión virtual
              </a>
            )}
            {esPresencial && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                <MapPin className="w-3 h-3" /> Google Maps
              </a>
            )}
            <Link href={`/tecnico/reuniones/${r.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100">
              Ver detalles completos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

type FiltroEstado = 'TODAS' | 'LIBRE' | 'PROGRAMADA' | 'EN_USO' | 'EN_ESPERA' | 'FINALIZADA';

export default function TecnicoMesasPage() {
  const [mesas,       setMesas]       = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODAS');
  const [search,      setSearch]      = useState('');

  const fetchMesas = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/tecnico/mesas`);
      const data = await res.json();
      setMesas(data.mesas ?? []);
      if (data.eventoConfig) setEventoConfig(data.eventoConfig);
    } catch { setMesas([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, [fetchMesas]);

  const mesasFiltradas = mesas.filter((m) => {
    const passEstado = filtroEstado === 'TODAS' || m.estadoMesa === filtroEstado;
    if (!passEstado) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(m.numeroMesa).includes(q) ||
      m.reunion?.some((r: any) => {
        const sol = r.solicitudreunion;
        const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
        const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
        return ea?.nombre?.toLowerCase().includes(q) || eb?.nombre?.toLowerCase().includes(q);
      })
    );
  });

  const counts = {
    total:      mesas.length,
    activas:    mesas.filter((m) => m.estaActivo === 1).length,
    libre:      mesas.filter((m) => m.estadoMesa === 'LIBRE').length,
    programada: mesas.filter((m) => m.estadoMesa === 'PROGRAMADA').length,
    enUso:      mesas.filter((m) => m.estadoMesa === 'EN_USO').length,
    enEspera:   mesas.filter((m) => m.estadoMesa === 'EN_ESPERA').length,
    finalizada: mesas.filter((m) => m.estadoMesa === 'FINALIZADA').length,
  };

  const FILTROS: { key: FiltroEstado; label: string }[] = [
    { key: 'TODAS',      label: `Todas (${counts.total})` },
    { key: 'LIBRE',      label: `Libres (${counts.libre})` },
    { key: 'EN_USO',     label: `En uso (${counts.enUso})` },
    { key: 'EN_ESPERA',  label: `En espera (${counts.enEspera})` },
    { key: 'PROGRAMADA', label: `Programadas (${counts.programada})` },
    { key: 'FINALIZADA', label: `Finalizadas (${counts.finalizada})` },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Agenda de mesas</h1>
        <p className="text-sm text-gray-500 mt-1">Estado en tiempo real de cada mesa del evento.</p>
      </div>

      {/* Config info */}
      {eventoConfig && (
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Duración: <strong className="text-gray-700">{eventoConfig.duracionReunion} min</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-gray-400" />
            <span>Limpieza: <strong className="text-gray-700">{eventoConfig.tiempoEntreReuniones} min</strong></span>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 space-y-3">
        {/* Estado chips */}
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button key={f.key} onClick={() => setFiltroEstado(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filtroEstado === f.key
                  ? 'bg-[#449D3A] text-white border-[#449D3A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#449D3A] hover:text-[#449D3A]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa participante..."
            className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
        {Object.entries(ESTADO_MESA).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${v.dot}`} />
            {v.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#449D3A]" />
        </div>
      ) : (
        <div className="space-y-4">
          {mesasFiltradas.map((mesa) => {
            const cfg = ESTADO_MESA[mesa.estadoMesa] ?? ESTADO_MESA.LIBRE;
            return (
              <div key={mesa.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Mesa header */}
                <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-base text-white shrink-0 ${
                    mesa.estaActivo === 1
                      ? mesa.estadoMesa === 'EN_USO'    ? 'bg-orange-500'
                      : mesa.estadoMesa === 'EN_ESPERA' ? 'bg-amber-500'
                      : mesa.estadoMesa === 'PROGRAMADA'? 'bg-blue-500'
                      : mesa.estadoMesa === 'FINALIZADA'? 'bg-gray-400'
                      : 'bg-[#449D3A]'
                      : 'bg-gray-200'
                  }`}>
                    <span className={mesa.estaActivo !== 1 ? 'text-gray-400' : 'text-white'}>
                      {String(mesa.numeroMesa).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-900">Mesa {mesa.numeroMesa}</p>
                    <p className="text-xs text-gray-400">
                      {mesa._count?.reunion ?? mesa.reunion?.length ?? 0} reunión(es) · {mesa.capacidadPersonas} personas
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    mesa.estaActivo === 1 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {mesa.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Reuniones / slots */}
                {mesa.reunion && mesa.reunion.length > 0 ? (
                  mesa.reunion.map((r: any) => <ReunionSlot key={r.id} r={r} />)
                ) : (
                  <div className="px-4 py-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-300 shrink-0" />
                    <p className="text-sm text-gray-400 font-medium">Disponible — sin reuniones asignadas</p>
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">LIBRE</span>
                  </div>
                )}
              </div>
            );
          })}
          {mesasFiltradas.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Armchair className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 font-medium">Sin mesas con ese filtro</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
