"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, X, Clock, Users, Armchair, Timer,
  Building2, Video, MapPin, ChevronDown, ChevronUp, Pencil, Check,
} from 'lucide-react';
import { useModal } from '@/components/ui/Modal';

const API = 'http://localhost:3334';

const ESTADO_MESA: Record<string, { label: string; badge: string; grid: string; dot: string }> = {
  LIBRE:      { label: 'Libre',      badge: 'bg-green-100 text-green-700',   grid: '#449D3A', dot: 'bg-green-400' },
  PROGRAMADA: { label: 'Programada', badge: 'bg-blue-100 text-blue-700',     grid: '#3b82f6', dot: 'bg-blue-400' },
  EN_USO:     { label: 'En uso',     badge: 'bg-orange-100 text-orange-700', grid: '#f97316', dot: 'bg-orange-400' },
  EN_ESPERA:  { label: 'En espera',  badge: 'bg-amber-100 text-amber-700',   grid: '#d97706', dot: 'bg-amber-400' },
  FINALIZADA: { label: 'Finalizada', badge: 'bg-gray-100 text-gray-500',     grid: '#9ca3af', dot: 'bg-gray-300' },
};

const ESTADO_REUNION: Record<string, { badge: string; label: string }> = {
  PROGRAMADA: { badge: 'bg-blue-100 text-blue-700',    label: 'Programada' },
  EN_CURSO:   { badge: 'bg-orange-100 text-orange-700', label: 'En curso' },
  FINALIZADA: { badge: 'bg-green-100 text-green-700',  label: 'Finalizada' },
  CANCELADA:  { badge: 'bg-gray-100 text-gray-500',    label: 'Cancelada' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getMapsUrl(sol: any): string | null {
  if (sol?.ubicacionGoogleMapsReunion) return sol.ubicacionGoogleMapsReunion;
  if (sol?.latitudPresencial && sol?.longitudPresencial)
    return `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}`;
  if (sol?.direccionTexto)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`;
  return null;
}

function ReunionSlot({ r }: { r: any }) {
  const [open, setOpen] = useState(false);
  const sol  = r.solicitudreunion;
  const ea   = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb   = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est  = ESTADO_REUNION[r.estadoReunion] ?? ESTADO_REUNION.PROGRAMADA;
  const esVirtual    = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial = r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';
  const link   = sol?.enlaceReunionVirtual;
  const mapsUrl = getMapsUrl(sol);

  return (
    <div className="border-t border-gray-50">
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/70 transition-colors">
        <span className="text-xs font-bold text-gray-700 w-28 shrink-0">
          {fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}
        </span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {ea?.urlFotoPerfil
            ? <img src={ea.urlFotoPerfil} className="w-6 h-6 rounded-full object-contain shrink-0 border border-gray-100" />
            : <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-green-700" /></div>}
          <span className="text-xs text-gray-800 font-semibold truncate">{ea?.nombre ?? '—'}</span>
          <span className="text-gray-300 shrink-0">·</span>
          {eb?.urlFotoPerfil
            ? <img src={eb.urlFotoPerfil} className="w-6 h-6 rounded-full object-contain shrink-0 border border-gray-100" />
            : <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-blue-700" /></div>}
          <span className="text-xs text-gray-800 font-semibold truncate">{eb?.nombre ?? '—'}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${est.badge}`}>{est.label}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
          r.tipoReunion === 'VIRTUAL' ? 'bg-blue-50 text-blue-500' :
          r.tipoReunion === 'MIXTA'   ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-600'
        }`}>{r.tipoReunion}</span>
        <button onClick={() => setOpen(!open)} className="shrink-0 text-gray-400 hover:text-gray-600">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-3 bg-gray-50/50 border-t border-gray-100">
          <div className="flex flex-wrap gap-2 pt-2">
            {esVirtual && link && (
              <a href={link} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                <Video className="w-3 h-3" /> Reunión virtual
              </a>
            )}
            {esPresencial && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                <MapPin className="w-3 h-3" /> Google Maps
              </a>
            )}
          </div>
          {sol?.mensajeParaEmpresaReceptora && (
            <p className="text-[11px] text-gray-500 italic mt-2">"{sol.mensajeParaEmpresaReceptora}"</p>
          )}
        </div>
      )}
    </div>
  );
}

type FiltroEstado = 'TODAS' | 'LIBRE' | 'PROGRAMADA' | 'EN_USO' | 'EN_ESPERA' | 'FINALIZADA';

export default function MesasPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();

  // Grid (admin/mesas)
  const [mesas,       setMesas]       = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODAS');
  const [vista,       setVista]       = useState<'grid' | 'agenda'>('grid');

  // Agenda (admin/mesas/agenda)
  const [agenda,      setAgenda]      = useState<any[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);

  // Generar modal
  const [showGenerar, setShowGenerar] = useState(false);
  const [cantidad,    setCantidad]    = useState('');
  const [capacidad,   setCapacidad]   = useState('');
  const [generating,  setGenerating]  = useState(false);

  // Editar tiempo de limpieza
  const [editandoTiempo, setEditandoTiempo] = useState(false);
  const [tiempoEdit,     setTiempoEdit]     = useState('');

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/mesas`);
      const data = await res.json();
      setMesas(Array.isArray(data) ? data : (data.mesas ?? []));
      if (data.eventoConfig) {
        setEventoConfig(data.eventoConfig);
        setCantidad(String(data.eventoConfig.cantidadTotalMesasEvento ?? 10));
        setCapacidad(String(data.eventoConfig.capacidadPersonasPorMesa ?? 4));
        setTiempoEdit(String(data.eventoConfig.tiempoEntreReuniones ?? 15));
      }
    } catch { setMesas([]); }
    finally { setLoading(false); }
  }, []);

  const fetchAgenda = useCallback(async () => {
    setAgendaLoading(true);
    try {
      const res  = await fetch(`${API}/admin/mesas/agenda`);
      const data = await res.json();
      setAgenda(data.mesas ?? (Array.isArray(data) ? data : []));
      if (data.eventoConfig) setEventoConfig(data.eventoConfig);
    } catch { setAgenda([]); }
    finally { setAgendaLoading(false); }
  }, []);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);
  useEffect(() => { if (vista === 'agenda') fetchAgenda(); }, [vista, fetchAgenda]);

  const toggleMesa = async (mesa: any) => {
    const nuevoEstado = mesa.estaActivo === 1 ? 0 : 1;
    const accion = nuevoEstado === 1 ? 'activar' : 'desactivar';
    showConfirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} mesa ${mesa.numeroMesa}?`, '', async () => {
      try {
        await fetch(`${API}/admin/mesas/${mesa.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estaActivo: nuevoEstado }),
        });
        setMesas((prev) => prev.map((m) => m.id === mesa.id ? { ...m, estaActivo: nuevoEstado } : m));
      } catch { showError('Error', 'No se pudo cambiar el estado de la mesa.'); }
    });
  };

  const handleSaveTiempo = async () => {
    const val = Number(tiempoEdit);
    if (!val || val < 1 || val > 120) {
      showError('Error', 'El tiempo debe estar entre 1 y 120 minutos.');
      return;
    }
    try {
      await fetch(`${API}/admin/evento/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiempoEntreReuniones: val }),
      });
      setEventoConfig((prev: any) => ({ ...prev, tiempoEntreReuniones: val }));
      setEditandoTiempo(false);
      showSuccess('Guardado', `Tiempo de limpieza actualizado a ${val} min.`);
      fetchGrid();
    } catch { showError('Error', 'No se pudo guardar el tiempo.'); }
  };

  const handleGenerar = async () => {
    if (!cantidad || Number(cantidad) <= 0) {
      showError('Error', 'Ingresa una cantidad válida de mesas.');
      return;
    }
    setGenerating(true);
    try {
      const res  = await fetch(`${API}/admin/mesas/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: Number(cantidad), capacidadPersonas: Number(capacidad) }),
      });
      const data = await res.json();
      showSuccess('Mesas generadas', data.mensaje);
      setShowGenerar(false);
      fetchGrid();
    } catch { showError('Error', 'No se pudieron generar las mesas.'); }
    finally { setGenerating(false); }
  };

  const mesasFiltradas = mesas.filter((m) =>
    filtroEstado === 'TODAS' || m.estadoMesa === filtroEstado
  );
  const agendaFiltrada = agenda.filter((m) =>
    filtroEstado === 'TODAS' || m.estadoMesa === filtroEstado
  );

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
    { key: 'PROGRAMADA', label: `Programadas (${counts.programada})` },
    { key: 'EN_USO',     label: `En uso (${counts.enUso})` },
    { key: 'EN_ESPERA',  label: `En espera (${counts.enEspera})` },
    { key: 'FINALIZADA', label: `Finalizadas (${counts.finalizada})` },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ModalComponent />

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Mesas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitorea el estado de cada mesa en tiempo real.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { fetchGrid(); if (vista === 'agenda') fetchAgenda(); }}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={() => setShowGenerar(true)}
            className="flex items-center gap-1.5 bg-[#449D3A] text-white font-semibold px-4 py-2 rounded-xl hover:bg-[#367d2e] shadow-sm text-sm">
            <Plus className="w-4 h-4" /> Generar mesas
          </button>
        </div>
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
            {/* Editable tiempo de limpieza */}
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-blue-500 font-semibold">Tiempo de limpieza</p>
                {editandoTiempo ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input type="number" min="1" max="120" value={tiempoEdit}
                      onChange={(e) => setTiempoEdit(e.target.value)}
                      className="w-16 text-xs font-bold text-blue-900 border border-blue-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    <span className="text-xs text-blue-700 font-medium">min</span>
                    <button onClick={handleSaveTiempo} className="p-0.5 rounded text-green-600 hover:text-green-700">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditandoTiempo(false)} className="p-0.5 rounded text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-blue-900">{eventoConfig.tiempoEntreReuniones} min</p>
                    <button onClick={() => { setTiempoEdit(String(eventoConfig.tiempoEntreReuniones)); setEditandoTiempo(true); }}
                      className="p-0.5 rounded text-blue-400 hover:text-blue-600">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Armchair className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-blue-500 font-semibold">Mesas planificadas</p>
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
          </div>
        </div>
      )}

      {/* Leyenda de estados */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(ESTADO_MESA).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.grid }} />
            {v.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          Inactiva
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {(['grid', 'agenda'] as const).map((v) => (
          <button key={v} onClick={() => setVista(v)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              vista === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {v === 'grid' ? 'Vista general' : 'Agenda detallada'}
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
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

      {/* ─── VISTA GENERAL ─── */}
      {vista === 'grid' && (
        loading ? (
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
            {[...Array(30)].map((_, i) => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : mesasFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Armchair className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No hay mesas con ese filtro.</p>
            {mesas.length === 0 && (
              <button onClick={() => setShowGenerar(true)}
                className="mt-3 text-[#449D3A] font-semibold text-sm hover:underline">
                Generar mesas →
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {mesasFiltradas.map((m) => {
                const cfg = ESTADO_MESA[m.estadoMesa] ?? ESTADO_MESA.LIBRE;
                const color = m.estaActivo === 1 ? cfg.grid : '#9ca3af';
                return (
                  <button key={m.id} onClick={() => toggleMesa(m)}
                    title={`Mesa ${m.numeroMesa} — ${m.estaActivo === 1 ? cfg.label : 'Inactiva'} · clic para ${m.estaActivo === 1 ? 'desactivar' : 'activar'}`}
                    style={{ backgroundColor: color }}
                    className="relative flex flex-col items-center justify-center h-14 rounded-xl text-white transition-all hover:scale-105 shadow-sm">
                    <span className="text-[11px] font-bold">{String(m.numeroMesa).padStart(2, '0')}</span>
                    {m.estaActivo === 1 && (
                      <span className="text-[7px] font-semibold opacity-80 mt-0.5 leading-none">
                        {cfg.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{counts.total} mesas totales</span>
              <span className="text-green-600 font-semibold">{counts.libre} libres</span>
              <span className="text-orange-600 font-semibold">{counts.enUso} en uso</span>
              <span className="text-amber-600 font-semibold">{counts.enEspera} en espera</span>
              <span className="text-blue-600 font-semibold">{counts.programada} programadas</span>
              <span className="text-gray-400">{counts.finalizada} finalizadas</span>
            </div>
          </div>
        )
      )}

      {/* ─── AGENDA DETALLADA ─── */}
      {vista === 'agenda' && (
        agendaLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : agendaFiltrada.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Armchair className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Sin mesas con ese filtro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agendaFiltrada.map((mesa) => {
              const cfg = ESTADO_MESA[mesa.estadoMesa] ?? ESTADO_MESA.LIBRE;
              return (
                <div key={mesa.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
                    <div style={{ backgroundColor: mesa.estaActivo === 1 ? cfg.grid : '#9ca3af' }}
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-base text-white shrink-0">
                      {String(mesa.numeroMesa).padStart(2, '0')}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Mesa {mesa.numeroMesa}</p>
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
                  {mesa.reunion && mesa.reunion.length > 0 ? (
                    mesa.reunion.map((r: any) => <ReunionSlot key={r.id} r={r} />)
                  ) : (
                    <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-2 h-2 rounded-full bg-green-300" />
                      Disponible — sin reuniones asignadas
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─── Modal generar mesas ─── */}
      {showGenerar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Generar mesas</h2>
              <button onClick={() => setShowGenerar(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            {eventoConfig && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 text-xs text-gray-500">
                Evento configurado con{' '}
                <span className="font-semibold text-gray-700">{eventoConfig.cantidadTotalMesasEvento} mesas</span> y{' '}
                <span className="font-semibold text-gray-700">{eventoConfig.capacidadPersonasPorMesa} personas/mesa</span>.
                Valores pre-llenados.
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cantidad de mesas *</label>
                <input type="number" min="1" max="200" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capacidad por mesa (personas) *</label>
                <input type="number" min="1" max="30" value={capacidad} onChange={(e) => setCapacidad(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>
              <p className="text-xs text-gray-400">Las mesas se numerarán consecutivamente al último número existente.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowGenerar(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleGenerar} disabled={generating}
                className="flex-1 bg-[#449D3A] text-white font-semibold py-2.5 rounded-xl hover:bg-[#367d2e] disabled:opacity-50">
                {generating ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
