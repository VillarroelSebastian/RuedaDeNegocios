"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, X, Clock, Users, Armchair,
  Building2, Video, MapPin, Link2, Search,
  Star, ChevronDown, ChevronUp, History,
  Play, Square, XCircle, UserCheck, Lock, Unlock,
} from 'lucide-react';
import { useModal } from '@/components/ui/Modal';

const API = 'http://localhost:3334';

const ESTADO_MESA: Record<string, { label: string; badge: string; grid: string }> = {
  LIBRE:     { label: 'Libre',     badge: 'bg-green-100 text-green-700',   grid: '#449D3A' },
  RESERVADA: { label: 'Reservada', badge: 'bg-blue-100 text-blue-700',     grid: '#3b82f6' },
  EN_USO:    { label: 'En uso',    badge: 'bg-orange-100 text-orange-700', grid: '#f97316' },
};

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function minutesFromNow(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}
function elapsedMin(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

function CompanyBadge({ empresa, side }: { empresa: any; side: 'A' | 'B' }) {
  const bg = side === 'A' ? 'bg-green-100' : 'bg-blue-100';
  const ic = side === 'A' ? 'text-green-700' : 'text-blue-700';
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {empresa?.urlFotoPerfil
        ? <img src={empresa.urlFotoPerfil} className="w-8 h-8 rounded-full object-contain shrink-0 border border-gray-100" alt="" />
        : <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}><Building2 className={`w-4 h-4 ${ic}`} /></div>}
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{empresa?.nombre ?? '—'}</p>
        <p className="text-xs text-gray-400 truncate">{empresa?.rubro ?? ''}</p>
      </div>
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function EvalBlock({ empresa, resultado, side }: { empresa: any; resultado: any; side: 'A' | 'B' }) {
  const bg = side === 'A' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100';
  const ic = side === 'A' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${bg}`}>
      <div className="flex items-center gap-2">
        {empresa?.urlFotoPerfil
          ? <img src={empresa.urlFotoPerfil} className="w-6 h-6 rounded-full object-contain border border-white shrink-0" alt="" />
          : <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${ic}`}><Building2 className="w-3 h-3" /></div>}
        <p className="text-xs font-bold text-gray-800 truncate">{empresa?.nombre ?? '—'}</p>
      </div>
      {resultado ? (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <StarRow value={resultado.calificacionReunion} />
            <span className="text-[10px] text-gray-500 font-semibold">{resultado.calificacionReunion}/5</span>
            {resultado.rangoAcuerdoComercial && (
              <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 truncate max-w-[120px]">
                {resultado.rangoAcuerdoComercial}
              </span>
            )}
          </div>
          {resultado.observacionesPuntosTratados && (
            <p className="text-[10px] text-gray-500 italic leading-relaxed">"{resultado.observacionesPuntosTratados}"</p>
          )}
        </>
      ) : (
        <p className="text-[10px] text-gray-400 italic">Evaluación pendiente</p>
      )}
    </div>
  );
}

function HistorialRow({ r }: { r: any }) {
  const [open, setOpen] = useState(false);
  const sol  = r.solicitudreunion;
  const eeA  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
  const eeB  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
  const ea   = eeA?.empresa;
  const eb   = eeB?.empresa;
  const resultados: any[] = r.resultadoreunion ?? [];
  const resA = resultados.find((res: any) => res.empresaeventoCalificadora_id === eeA?.id);
  const resB = resultados.find((res: any) => res.empresaeventoCalificadora_id === eeB?.id);

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-bold">{String(r.mesa?.numeroMesa ?? '?').padStart(2, '0')}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {ea?.nombre ?? '—'} <span className="text-gray-400 font-normal">vs</span> {eb?.nombre ?? '—'}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">{fmtDT(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            r.tipoReunion === 'VIRTUAL' ? 'bg-blue-50 text-blue-500' :
            r.tipoReunion === 'MIXTA'   ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-600'
          }`}>{r.tipoReunion}</span>
          <span className="text-[9px] text-gray-400 font-semibold">
            {resA && resB ? '2 eval.' : resA || resB ? '1 eval.' : 'Sin eval.'}
          </span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 bg-gray-50/50 space-y-2">
          {r.observacionesReunion && (
            <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">"{r.observacionesReunion}"</p>
          )}
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide pt-1">Evaluaciones de encargados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <EvalBlock empresa={ea} resultado={resA} side="A" />
            <EvalBlock empresa={eb} resultado={resB} side="B" />
          </div>
        </div>
      )}
    </div>
  );
}

type Tab = 'mesas' | 'historial';
type FiltroEstado = 'TODAS' | 'LIBRE' | 'RESERVADA' | 'EN_USO' | 'INHABILITADA';

export default function MesasPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();

  const [tab,          setTab]          = useState<Tab>('mesas');
  const [mesas,        setMesas]        = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [filtro,       setFiltro]       = useState<FiltroEstado>('TODAS');
  const [reunionModal, setReunionModal] = useState<any | null>(null);
  const [asistentes,   setAsistentes]   = useState('');
  const [acting,       setActing]       = useState(false);
  const [toggling,     setToggling]     = useState(false);

  const [historial,        setHistorial]        = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [searchQ,          setSearchQ]          = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/mesas`);
      const data = await res.json();
      setMesas(Array.isArray(data) ? data : (data.mesas ?? []));
      if (data.eventoConfig) setEventoConfig(data.eventoConfig);
    } catch { setMesas([]); }
    finally { setLoading(false); }
  }, []);

  const fetchHistorial = useCallback(async (q?: string) => {
    setLoadingHistorial(true);
    try {
      const url = q?.trim() ? `${API}/admin/mesas/historial?q=${encodeURIComponent(q)}` : `${API}/admin/mesas/historial`;
      const data = await (await fetch(url)).json();
      setHistorial(Array.isArray(data) ? data : []);
    } catch { setHistorial([]); }
    finally { setLoadingHistorial(false); }
  }, []);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);
  useEffect(() => { if (tab === 'historial') fetchHistorial(); }, [tab, fetchHistorial]);

  const handleSearch = (val: string) => {
    setSearchQ(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchHistorial(val), 400);
  };

  const toggleHabilitar = async (mesa: any) => {
    const nuevo = mesa.estaHabilitada === 1 ? 0 : 1;
    const accion = nuevo === 1 ? 'habilitar' : 'deshabilitar';
    showConfirm(
      `${nuevo === 1 ? 'Habilitar' : 'Deshabilitar'} mesa ${mesa.numeroMesa}`,
      `¿Deseas ${accion} la Mesa ${mesa.numeroMesa}? ${nuevo === 0 ? 'Los usuarios no podrán usarla.' : 'Estará disponible para reuniones.'}`,
      async () => {
        setToggling(true);
        try {
          await fetch(`${API}/admin/mesas/${mesa.id}/habilitar`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estaHabilitada: nuevo }),
          });
          showSuccess('Listo', `Mesa ${mesa.numeroMesa} ${nuevo === 1 ? 'habilitada' : 'deshabilitada'} correctamente.`);
          setReunionModal(null);
          fetchGrid();
        } catch { showError('Error', 'No se pudo cambiar el estado de disponibilidad.'); }
        finally { setToggling(false); }
      }
    );
  };

  const actualizarReunion = async (reunionId: number, estado: string, extra?: { asistentes?: number }) => {
    setActing(true);
    try {
      const body: any = { estadoReunion: estado };
      if (extra?.asistentes !== undefined) body.asistentes = extra.asistentes;
      await fetch(`${API}/admin/reuniones/${reunionId}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const labels: Record<string, string> = {
        EN_CURSO: 'Reunión iniciada correctamente.',
        FINALIZADA: 'Reunión finalizada y registrada.',
        CANCELADA: 'Reunión cancelada.',
      };
      showSuccess('Listo', labels[estado] ?? 'Estado actualizado.');
      setReunionModal(null);
      fetchGrid();
    } catch { showError('Error', 'No se pudo actualizar el estado de la reunión.'); }
    finally { setActing(false); }
  };

  const openModal = (m: any) => {
    setReunionModal(m);
    setAsistentes(String(m.reunionActual?.cantidadAsistentesRegistrados ?? ''));
  };

  const mesasFiltradas = mesas.filter((m) => {
    if (filtro === 'INHABILITADA') return m.estaHabilitada === 0;
    if (filtro === 'TODAS') return true;
    return m.estadoMesa === filtro;
  });

  const counts = {
    total:        mesas.length,
    libre:        mesas.filter((m) => m.estadoMesa === 'LIBRE').length,
    reservada:    mesas.filter((m) => m.estadoMesa === 'RESERVADA').length,
    enUso:        mesas.filter((m) => m.estadoMesa === 'EN_USO').length,
    inhabilitada: mesas.filter((m) => m.estaHabilitada === 0).length,
  };

  const FILTROS: { key: FiltroEstado; label: string }[] = [
    { key: 'TODAS',       label: `Todas (${counts.total})` },
    { key: 'LIBRE',       label: `Libres (${counts.libre})` },
    { key: 'RESERVADA',   label: `Reservadas (${counts.reservada})` },
    { key: 'EN_USO',      label: `En uso (${counts.enUso})` },
    { key: 'INHABILITADA',label: `Inhabilitadas (${counts.inhabilitada})` },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ModalComponent />

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Estado en tiempo real y registro histórico de reuniones.</p>
        </div>
        <button onClick={() => { fetchGrid(); if (tab === 'historial') fetchHistorial(searchQ); }}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 text-sm">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Config card */}
      {eventoConfig && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-5">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-3">Configuración del evento</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-blue-500 font-semibold">Duración reunión</p>
                <p className="text-sm font-bold text-blue-900">{eventoConfig.duracionReunion} min</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Armchair className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-blue-500 font-semibold">Mesas del evento</p>
                <p className="text-sm font-bold text-blue-900">{eventoConfig.cantidadTotalMesasEvento}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-blue-500 font-semibold">Cap. por mesa</p>
                <p className="text-sm font-bold text-blue-900">{eventoConfig.capacidadPersonasPorMesa} personas</p>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
              {Object.entries(ESTADO_MESA).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1 text-[10px] text-gray-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.grid }} />
                  {v.label}
                </div>
              ))}
              <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <span className="w-2 h-2 rounded-full bg-gray-400" /> Inhabilitada
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {([['mesas', 'Mesas'], ['historial', 'Historial']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {key === 'historial' && <History className="w-3.5 h-3.5 inline mr-1.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* ── MESAS TAB ── */}
      {tab === 'mesas' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {FILTROS.map((f) => (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filtro === f.key
                    ? 'bg-[#449D3A] text-white border-[#449D3A]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#449D3A] hover:text-[#449D3A]'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {[...Array(20)].map((_, i) => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : mesasFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Armchair className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No hay mesas con ese filtro.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="grid gap-2 grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                {mesasFiltradas.map((m) => {
                  const cfg      = ESTADO_MESA[m.estadoMesa] ?? ESTADO_MESA.LIBRE;
                  const disabled = m.estaHabilitada === 0 && m.estadoMesa === 'LIBRE';
                  const color    = disabled ? '#9ca3af' : cfg.grid;
                  const label    = disabled ? 'Inhabilitada' : cfg.label;
                  return (
                    <button key={m.id}
                      onClick={() => openModal(m)}
                      title={`Mesa ${m.numeroMesa} · ${label}`}
                      style={{ backgroundColor: color }}
                      className="relative flex flex-col items-center justify-center h-14 rounded-xl text-white transition-all hover:brightness-90 hover:scale-105 shadow-sm">
                      {disabled && (
                        <Lock className="absolute top-1 right-1 w-2.5 h-2.5 text-white/70" />
                      )}
                      <span className="text-[11px] font-bold">{String(m.numeroMesa).padStart(2, '0')}</span>
                      <span className="text-[7px] font-semibold opacity-80 mt-0.5 leading-none">{label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{counts.total} mesas</span>
                <span className="text-green-600 font-semibold">{counts.libre} libres</span>
                <span className="text-orange-600 font-semibold">{counts.enUso} en uso</span>
                <span className="text-blue-600 font-semibold">{counts.reservada} reservadas</span>
                {counts.inhabilitada > 0 && (
                  <span className="text-gray-500 font-semibold">{counts.inhabilitada} inhabilitadas</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── HISTORIAL TAB ── */}
      {tab === 'historial' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={searchQ} onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar por mesa (ej: 3) o empresa..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#449D3A] bg-gray-50" />
            </div>
          </div>
          {loadingHistorial ? (
            <div className="p-10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historial.length === 0 ? (
            <div className="p-14 text-center">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">{searchQ ? 'Sin resultados.' : 'Aún no hay reuniones finalizadas.'}</p>
            </div>
          ) : (
            <div>
              <p className="px-4 pt-3 pb-2 text-xs text-gray-400 font-semibold">{historial.length} reunión(es) finalizada(s)</p>
              {historial.map((r) => <HistorialRow key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL DETALLE MESA ── */}
      {reunionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReunionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const m   = reunionModal;
              const cfg = ESTADO_MESA[m.estadoMesa] ?? ESTADO_MESA.LIBRE;
              const r   = m.reunionActual;
              const sol = r?.solicitudreunion;
              const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
              const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
              const esVirtual    = r?.tipoReunion === 'VIRTUAL' || r?.tipoReunion === 'MIXTA';
              const esPresencial = r?.tipoReunion === 'PRESENCIAL' || r?.tipoReunion === 'MIXTA';
              const isReservada  = m.estadoMesa === 'RESERVADA';
              const isEnUso      = m.estadoMesa === 'EN_USO';
              const isLibre      = m.estadoMesa === 'LIBRE';
              const inhabilitada = m.estaHabilitada === 0;
              const minsFromNow  = r ? minutesFromNow(r.fechaHoraInicioReunion) : 0;
              const elapsed      = r ? elapsedMin(r.fechaHoraInicioReunion) : 0;
              const remaining    = r ? Math.max(0, Math.round((new Date(r.fechaHoraFinReunion).getTime() - Date.now()) / 60000)) : 0;
              const gridColor    = inhabilitada && isLibre ? '#9ca3af' : cfg.grid;

              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <div style={{ backgroundColor: gridColor }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-base text-white shrink-0 shadow-sm">
                      {String(m.numeroMesa).padStart(2, '0')}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">Mesa {m.numeroMesa}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                        {inhabilitada && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Inhabilitada
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{m.capacidadPersonas} personas</span>
                        {isReservada && r && (
                          <span className="text-[10px] text-blue-600 font-semibold">
                            Inicia en {minsFromNow > 0 ? `${minsFromNow} min` : 'ahora'}
                          </span>
                        )}
                        {isEnUso && r && (
                          <span className="text-[10px] text-orange-600 font-semibold">
                            {elapsed} min · {remaining} min restantes
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setReunionModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

                    {/* ── LIBRE: mensaje informativo ── */}
                    {isLibre && (
                      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${inhabilitada ? 'bg-gray-50 border border-gray-200' : 'bg-green-50 border border-green-100'}`}>
                        {inhabilitada
                          ? <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                          : <Armchair className="w-5 h-5 text-green-600 shrink-0" />}
                        <div>
                          <p className={`text-sm font-semibold ${inhabilitada ? 'text-gray-600' : 'text-green-700'}`}>
                            {inhabilitada ? 'Mesa inhabilitada para usuarios' : 'Mesa libre y disponible'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {inhabilitada
                              ? 'Los usuarios no pueden programar reuniones en esta mesa.'
                              : 'No hay reuniones programadas ni en curso.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── Contenido reunión (RESERVADA / EN_USO) ── */}
                    {r && (
                      <>
                        {/* Horario */}
                        <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5">
                          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-mono font-semibold">{fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}</span>
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.tipoReunion === 'VIRTUAL' ? 'bg-blue-50 text-blue-600' :
                            r.tipoReunion === 'MIXTA'   ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-700'
                          }`}>{r.tipoReunion}</span>
                        </div>

                        {/* Empresas */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Empresas en reunión</p>
                          <div className="flex items-center gap-2">
                            <CompanyBadge empresa={ea} side="A" />
                            <span className="text-gray-300 font-bold text-sm shrink-0">vs</span>
                            <CompanyBadge empresa={eb} side="B" />
                          </div>
                        </div>

                        {esVirtual && sol?.enlaceReunionVirtual && (
                          <a href={sol.enlaceReunionVirtual} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                            <Video className="w-4 h-4" /> Entrar a reunión virtual
                          </a>
                        )}
                        {esPresencial && (sol?.ubicacionGoogleMapsReunion || sol?.direccionTexto) && (
                          <a href={sol.ubicacionGoogleMapsReunion || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                            <MapPin className="w-4 h-4" /> Ver ubicación
                          </a>
                        )}
                        {r.tipoReunion === 'MIXTA' && (
                          <p className="text-xs text-gray-400 flex items-center gap-1"><Link2 className="w-3 h-3" /> Reunión mixta · presencial + virtual</p>
                        )}
                        {r.observacionesReunion && (
                          <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">"{r.observacionesReunion}"</p>
                        )}

                        {/* Acciones según estado */}
                        <div className="border-t border-gray-100 pt-4 space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Acciones</p>
                          {isReservada && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                disabled={acting}
                                onClick={() => showConfirm('Iniciar reunión', `¿Deseas iniciar la reunión en Mesa ${m.numeroMesa} ahora?`, () => actualizarReunion(r.id, 'EN_CURSO'))}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#367d2e] text-white font-semibold text-sm disabled:opacity-50 transition-colors">
                                <Play className="w-4 h-4" /> Iniciar
                              </button>
                              <button
                                disabled={acting}
                                onClick={() => showConfirm('Cancelar reunión', `¿Deseas cancelar la reunión en Mesa ${m.numeroMesa}?`, () => actualizarReunion(r.id, 'CANCELADA'))}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm disabled:opacity-50 transition-colors">
                                <XCircle className="w-4 h-4" /> Cancelar
                              </button>
                            </div>
                          )}
                          {isEnUso && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-gray-400 shrink-0" />
                                <label className="text-xs text-gray-600 font-semibold shrink-0">Asistentes registrados:</label>
                                <input
                                  type="number" min="0" value={asistentes}
                                  onChange={(e) => setAsistentes(e.target.value)}
                                  className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#449D3A]"
                                />
                              </div>
                              <button
                                disabled={acting}
                                onClick={() => showConfirm('Finalizar reunión', `¿Finalizar la reunión en Mesa ${m.numeroMesa}?`, () => actualizarReunion(r.id, 'FINALIZADA', { asistentes: Number(asistentes) || 0 }))}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#367d2e] text-white font-semibold text-sm disabled:opacity-50 transition-colors">
                                <Square className="w-4 h-4" /> Finalizar reunión
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── Toggle habilitar/deshabilitar (siempre visible) ── */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Disponibilidad</p>
                      <button
                        disabled={toggling}
                        onClick={() => toggleHabilitar(m)}
                        className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border font-semibold text-sm transition-colors disabled:opacity-50 ${
                          inhabilitada
                            ? 'border-green-200 text-green-700 hover:bg-green-50'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        {inhabilitada
                          ? <><Unlock className="w-4 h-4" /> Habilitar mesa para usuarios</>
                          : <><Lock className="w-4 h-4" /> Deshabilitar mesa para usuarios</>}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
