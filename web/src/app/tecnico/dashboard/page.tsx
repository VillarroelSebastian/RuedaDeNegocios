"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarCheck, Video, Armchair, CheckCircle,
  AlertCircle, X, ChevronRight, Calendar, Zap,
  Activity, Newspaper,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

const ESTADO_CFG: Record<string, { color: string; bg: string; dot: string; badge: string; label: string }> = {
  PROGRAMADA: { color:'text-blue-700',   bg:'bg-blue-50',    dot:'bg-blue-400',   badge:'bg-blue-100 text-blue-700',    label:'Programada' },
  EN_CURSO:   { color:'text-orange-700', bg:'bg-orange-50',  dot:'bg-orange-400', badge:'bg-orange-100 text-orange-700', label:'En curso' },
  FINALIZADA: { color:'text-green-700',  bg:'bg-green-50',   dot:'bg-green-400',  badge:'bg-green-100 text-green-700',  label:'Finalizada' },
  CANCELADA:  { color:'text-gray-500',   bg:'bg-gray-50',    dot:'bg-gray-400',   badge:'bg-gray-100 text-gray-500',    label:'Cancelada' },
};
const TIPO_CFG: Record<string, { badge: string; label: string }> = {
  VIRTUAL:    { badge:'bg-blue-100 text-blue-700',      label:'Virtual' },
  PRESENCIAL: { badge:'bg-emerald-100 text-emerald-700', label:'Mesa' },
  MIXTA:      { badge:'bg-purple-100 text-purple-700',   label:'Mixta' },
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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTimeObj(t: any) {
  if (!t) return '—';
  return new Date(t).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
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

function EstadoModal({ visible, reunion, onClose, onSave }: any) {
  const [selected, setSelected] = useState(reunion?.estadoReunion ?? '');
  useEffect(() => { setSelected(reunion?.estadoReunion ?? ''); }, [reunion]);
  if (!visible || !reunion) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Estado de reunión</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-2">
          {Object.entries(ESTADO_CFG).map(([key, cfg]) => (
            <button key={key} onClick={() => setSelected(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                selected === key ? `${cfg.bg} ${cfg.color} border-current` : 'bg-gray-50 text-gray-700 border-transparent hover:bg-gray-100'
              }`}>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
              {cfg.label}
              {selected === key && <CheckCircle className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onSave(reunion.id, selected)}
            className="flex-1 py-2.5 rounded-xl bg-[#449D3A] text-white text-sm font-bold hover:bg-[#3a8530] transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default function TecnicoDashboardPage() {
  const [data,        setData]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<any>({ visible:false, type:'success', title:'', message:'' });
  const [estadoModal, setEstadoModal] = useState<{ visible:boolean; reunion:any }>({ visible:false, reunion:null });

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/tecnico/dashboard`);
      const json = await res.json();
      setData(json);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveEstado = async (id: number, estado: string) => {
    setEstadoModal({ visible:false, reunion:null });
    try {
      const res = await fetch(`${API}/tecnico/reuniones/${id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoReunion: estado }),
      });
      if (!res.ok) throw new Error();
      setModal({ visible:true, type:'success', title:'Estado actualizado', message:`Reunión marcada como ${ESTADO_CFG[estado]?.label ?? estado}.` });
      fetchData();
    } catch {
      setModal({ visible:true, type:'error', title:'Error', message:'No se pudo actualizar el estado.' });
    }
  };

  const stats    = data?.stats ?? {};
  const proximas = data?.proximasReuniones ?? [];
  const actividades = data?.proximasActividades ?? [];
  const evento   = data?.evento;

  const statCards = [
    { label:'Reuniones en curso', value: stats.reunionesEnCurso  ?? 0, icon: Activity,     color:'text-orange-600', bg:'bg-orange-50', border:'border-orange-100' },
    { label:'Próximas reuniones', value: stats.proximasReuniones ?? 0, icon: CalendarCheck, color:'text-blue-600',   bg:'bg-blue-50',   border:'border-blue-100' },
    { label:'Reuniones virtuales',value: stats.reunionesVirtuales?? 0, icon: Video,         color:'text-purple-600', bg:'bg-purple-50', border:'border-purple-100' },
    { label:'Mesas activas',      value: stats.mesasActivas      ?? 0, icon: Armchair,      color:'text-green-600',  bg:'bg-green-50',  border:'border-green-100' },
  ];

  const accesosRapidos = [
    { label:'Ver agenda de mesas',       icon: Armchair,      href:'/tecnico/mesas',     color:'text-green-600',  bg:'bg-green-50' },
    { label:'Ver reuniones virtuales',   icon: Video,         href:'/tecnico/virtuales', color:'text-blue-600',   bg:'bg-blue-50' },
    { label:'Buscar empresa o reunión',  icon: Zap,           href:'/tecnico/buscar',    color:'text-purple-600', bg:'bg-purple-50' },
    { label:'Noticias del evento',       icon: Newspaper,     href:'/tecnico/noticias',  color:'text-orange-600', bg:'bg-orange-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Modal {...modal} onClose={() => setModal((m: any) => ({ ...m, visible: false }))} />
      <EstadoModal visible={estadoModal.visible} reunion={estadoModal.reunion}
        onClose={() => setEstadoModal({ visible:false, reunion:null })} onSave={handleSaveEstado} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Bienvenido al sistema de apoyo del evento</h1>
        <p className="text-sm text-gray-500 mt-1">
          {evento ? `${evento.nombre} ${evento.edicion ?? ''} · Monitoreo y gestión en tiempo real` : 'Monitoreo y gestión en tiempo real'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#449D3A]" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className={`bg-white rounded-2xl border ${s.border} p-5`}>
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className={`text-3xl font-extrabold ${s.color}`}>{String(s.value).padStart(2, '0')}</p>
                <p className="text-xs font-semibold text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Próximas reuniones */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900">Próximas reuniones</h2>
                  <Link href="/tecnico/reuniones" className="text-xs font-semibold text-[#449D3A] hover:underline flex items-center gap-1">
                    Ver todas <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {proximas.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <CalendarCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No hay reuniones próximas</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                      {['HORA','EMPRESA A','EMPRESA B','MESA / VIRTUAL'].map(h => (
                        <p key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</p>
                      ))}
                    </div>
                    {proximas.slice(0, 6).map((r: any) => {
                      const sol  = r.solicitudreunion;
                      const ea   = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
                      const eb   = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
                      const est  = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
                      const tip  = TIPO_CFG[r.tipoReunion]    ?? TIPO_CFG.PRESENCIAL;
                      const link = sol?.enlaceReunionVirtual;
                      const mapsUrl = getMapsUrl(sol);
                      const esVirtual   = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
                      const esPresencial= r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';
                      return (
                        <div key={r.id} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <div>
                            <p className="text-xs font-bold text-gray-900">{fmtTime(r.fechaHoraInicioReunion)}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${est.badge}`}>{est.label}</span>
                          </div>
                          <p className="text-xs text-gray-700 font-medium truncate self-center">{ea?.nombre ?? '—'}</p>
                          <p className="text-xs text-gray-700 font-medium truncate self-center">{eb?.nombre ?? '—'}</p>
                          <div className="flex items-center gap-1.5 flex-wrap self-center">
                            {esVirtual && link
                              ? <a href={link} target="_blank" rel="noreferrer"
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors whitespace-nowrap">
                                  Virtual {r.solicitudreunion?.id ? `(ID: ${r.id})` : ''}
                                </a>
                              : esPresencial
                              ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tip.badge} whitespace-nowrap`}>
                                  Mesa {r.mesa?.numeroMesa}
                                </span>
                              : null
                            }
                            <button onClick={() => setEstadoModal({ visible:true, reunion:r })}
                              className="text-[10px] text-[#449D3A] hover:underline font-semibold">
                              Cambiar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Próximos eventos */}
              {actividades.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-4">Próximos eventos</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {actividades.map((a: any) => (
                      <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 text-[#449D3A]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{a.nombreActividad}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {fmtTimeObj(a.horaInicioActividad)}
                            {a.lugarActividad ? ` · ${a.lugarActividad}` : ''}
                          </p>
                          {a.tipoActividad && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full mt-1 inline-block">
                              {a.tipoActividad}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Accesos rápidos + Estado */}
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-4">Accesos rápidos</h2>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {accesosRapidos.map((a, i) => (
                    <Link key={a.label} href={a.href}
                      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <div className={`w-8 h-8 rounded-xl ${a.bg} flex items-center justify-center shrink-0`}>
                        <a.icon className={`w-4 h-4 ${a.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 flex-1">{a.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
