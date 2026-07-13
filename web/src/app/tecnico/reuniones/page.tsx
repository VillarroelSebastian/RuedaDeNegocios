"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Clock, Video, MapPin, CheckCircle, AlertCircle, X, ChevronDown } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

const ESTADO_CFG: Record<string, { color: string; bg: string; dot: string; badge: string; label: string }> = {
  PROGRAMADA: { color:'text-blue-700',   bg:'bg-blue-50',    dot:'bg-blue-400',   badge:'bg-blue-100 text-blue-700',   label:'Programada' },
  EN_CURSO:   { color:'text-orange-700', bg:'bg-orange-50',  dot:'bg-orange-400', badge:'bg-orange-100 text-orange-700',label:'En curso' },
  FINALIZADA: { color:'text-green-700',  bg:'bg-green-50',   dot:'bg-green-400',  badge:'bg-green-100 text-green-700', label:'Finalizada' },
  CANCELADA:  { color:'text-gray-500',   bg:'bg-gray-50',    dot:'bg-gray-400',   badge:'bg-gray-100 text-gray-500',   label:'Cancelada' },
};
const TIPO_CFG: Record<string, { badge: string; label: string }> = {
  VIRTUAL:    { badge:'bg-blue-100 text-blue-700',      label:'Virtual' },
  PRESENCIAL: { badge:'bg-emerald-100 text-emerald-700', label:'Presencial' },
  MIXTA:      { badge:'bg-purple-100 text-purple-700',   label:'Mixta' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

function Modal({ visible, type, title, message, onClose }: any) {
  if (!visible) return null;
  const isError = type === 'error';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl p-6 w-full max-w-sm border ${isError ? 'border-red-200' : 'border-green-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          {isError ? <AlertCircle className="w-6 h-6 text-red-500 shrink-0" /> : <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />}
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600 ml-9">{message}</p>
        <button onClick={onClose} className={`mt-4 w-full py-2 rounded-xl text-sm font-bold text-white ${isError ? 'bg-red-500' : 'bg-[#449D3A]'}`}>
          Entendido
        </button>
      </div>
    </div>
  );
}

function EstadoDropdown({ reunion, onChange }: { reunion: any; onChange: (id: number, estado: string) => void }) {
  const [open, setOpen] = useState(false);
  const est = ESTADO_CFG[reunion.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${est.badge} border-current`}
      >
        <span className={`w-2 h-2 rounded-full ${est.dot}`} />
        {est.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
          {Object.entries(ESTADO_CFG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setOpen(false); onChange(reunion.id, key); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left hover:bg-gray-50 ${
                reunion.estadoReunion === key ? cfg.color + ' ' + cfg.bg : 'text-gray-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              {cfg.label}
              {reunion.estadoReunion === key && <CheckCircle className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getMapsUrl(sol: any): string | null {
  if (sol?.ubicacionGoogleMapsReunion) return sol.ubicacionGoogleMapsReunion;
  if (sol?.latitudPresencial && sol?.longitudPresencial)
    return `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}`;
  if (sol?.direccionTexto)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`;
  return null;
}

function ReunionRow({ r, onChange }: { r: any; onChange: (id: number, estado: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sol        = r.solicitudreunion;
  const ea         = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb         = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const tip        = TIPO_CFG[r.tipoReunion] ?? TIPO_CFG.PRESENCIAL;
  const link       = sol?.enlaceReunionVirtual;
  const mapsUrl    = getMapsUrl(sol);
  const esVirtual  = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial= r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Companies */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {ea?.urlFotoPerfil
            ? <img src={ea.urlFotoPerfil} className="w-8 h-8 rounded-full object-contain shrink-0" />
            : <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-green-700" /></div>
          }
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">{ea?.nombre ?? '—'}</span>
          <span className="text-gray-400 text-xs shrink-0">↔</span>
          {eb?.urlFotoPerfil
            ? <img src={eb.urlFotoPerfil} className="w-8 h-8 rounded-full object-contain shrink-0" />
            : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-blue-700" /></div>
          }
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">{eb?.nombre ?? '—'}</span>
        </div>

        {/* Meta */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            Mesa {r.mesa?.numeroMesa} · {fmtDate(r.fechaHoraInicioReunion)} {fmtTime(r.fechaHoraInicioReunion)}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tip.badge}`}>{tip.label}</span>
        </div>

        {/* Estado dropdown */}
        <div className="shrink-0">
          <EstadoDropdown reunion={r} onChange={onChange} />
        </div>

        {/* Expand */}
        {((esVirtual && link) || (esPresencial && mapsUrl)) && (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-gray-400 hover:text-gray-600">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-3 pt-2 flex flex-wrap gap-2">
          {esVirtual && link && (
            <a href={link} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
              <Video className="w-3 h-3" /> Reunión virtual
            </a>
          )}
          {esPresencial && mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">
              <MapPin className="w-3 h-3" /> Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function TecnicoReunionesPage() {
  const [reuniones, setReuniones] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filtroEst, setFiltroEst] = useState('TODOS');
  const [filtroTip, setFiltroTip] = useState('TODOS');
  const [modal,     setModal]     = useState<any>({ visible:false, type:'success', title:'', message:'' });

  const fetchReuniones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEst !== 'TODOS') params.set('estado', filtroEst);
      if (filtroTip !== 'TODOS') params.set('tipo',   filtroTip);
      const res  = await fetch(`${API}/tecnico/reuniones?${params}`);
      const data = await res.json();
      setReuniones(Array.isArray(data) ? data : []);
    } catch { setReuniones([]); }
    finally { setLoading(false); }
  }, [filtroEst, filtroTip]);

  useEffect(() => { fetchReuniones(); }, [fetchReuniones]);

  const handleCambiarEstado = async (id: number, estado: string) => {
    try {
      const res = await fetch(`${API}/tecnico/reuniones/${id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoReunion: estado }),
      });
      if (!res.ok) throw new Error();
      setModal({ visible:true, type:'success', title:'Estado actualizado', message:`Reunión marcada como ${ESTADO_CFG[estado]?.label ?? estado}.` });
      fetchReuniones();
    } catch {
      setModal({ visible:true, type:'error', title:'Error', message:'No se pudo actualizar el estado.' });
    }
  };

  const estados = ['TODOS', 'PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'];
  const tipos   = ['TODOS', 'PRESENCIAL', 'VIRTUAL', 'MIXTA'];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Modal {...modal} onClose={() => setModal((m: any) => ({ ...m, visible:false }))} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Reuniones</h1>
        <p className="text-sm text-gray-500 mt-1">{reuniones.length} resultado(s)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {estados.map((e) => {
            const cfg = e !== 'TODOS' ? ESTADO_CFG[e] : null;
            const activo = filtroEst === e;
            return (
              <button
                key={e}
                onClick={() => setFiltroEst(e)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  activo
                    ? (cfg ? `${cfg.bg} ${cfg.color} border-current` : 'bg-gray-900 text-white border-gray-900')
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {e === 'TODOS' ? 'Todos' : cfg?.label ?? e}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => {
            const cfg = t !== 'TODOS' ? TIPO_CFG[t] : null;
            const activo = filtroTip === t;
            return (
              <button
                key={t}
                onClick={() => setFiltroTip(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activo
                    ? (cfg ? `${cfg.badge} border-current` : 'bg-gray-100 text-gray-700 border-gray-300')
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t === 'TODOS' ? 'Todos los tipos' : cfg?.label ?? t}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#449D3A]" />
        </div>
      ) : reuniones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 font-medium">Sin reuniones con este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reuniones.map((r) => (
            <ReunionRow key={r.id} r={r} onChange={handleCambiarEstado} />
          ))}
        </div>
      )}
    </div>
  );
}
