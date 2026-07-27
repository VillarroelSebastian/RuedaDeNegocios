"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Armchair, Calendar, Building2, Video, MapPin, RefreshCw, X, Link2, CheckCircle2, AlertCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

// Modal para agregar/cambiar el enlace virtual de una reunión (admin)
function LinkModal({ reunion, onClose, onGuardado }: { reunion: any; onClose: () => void; onGuardado: () => void }) {
  const [enlace, setEnlace] = useState(reunion?.solicitudreunion?.enlaceReunionVirtual ?? '');
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  const guardar = async () => {
    setGuardando(true);
    setErr('');
    try {
      const res = await fetch(`${API}/tecnico/reuniones/${reunion.id}/link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enlace: enlace.trim() }),
      });
      if (!res.ok) throw new Error();
      onGuardado();
    } catch {
      setErr('No se pudo guardar el enlace.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#449D3A]" />
            Enlace de la reunión
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Reunión #{reunion.id} · las empresas verán este enlace en su sección de Reuniones.
        </p>
        <input
          type="url"
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          placeholder="https://meet.google.com/..."
          autoFocus
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] mb-3"
        />
        {err && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 mb-3"><AlertCircle className="w-3.5 h-3.5" />{err}</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
            {guardando ? 'Guardando...' : <><CheckCircle2 className="w-4 h-4" />Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const ESTADO_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  PROGRAMADA: { badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',   label: 'Programada' },
  EN_CURSO:   { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400 animate-pulse', label: 'En curso' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function dayKey(iso: string) {
  return new Date(iso).toISOString().substring(0, 10);
}

export default function AgendaMesasPage() {
  const [reservaciones, setReservaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkModal, setLinkModal] = useState<any>(null);

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/mesas/agenda`);
      const data = await res.json();
      const mesas: any[] = data.mesas ?? (Array.isArray(data) ? data : []);
      // Flatten to individual reservaciones (PROGRAMADA + EN_CURSO only)
      const items: any[] = [];
      for (const mesa of mesas) {
        for (const r of mesa.reunion ?? []) {
          if (r.estadoReunion === 'PROGRAMADA' || r.estadoReunion === 'EN_CURSO') {
            items.push({ ...r, mesa });
          }
        }
      }
      items.sort((a, b) => new Date(a.fechaHoraInicioReunion).getTime() - new Date(b.fechaHoraInicioReunion).getTime());
      setReservaciones(items);
    } catch { setReservaciones([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAgenda(); }, [fetchAgenda]);

  // Group by day
  const byDay: Record<string, any[]> = {};
  for (const r of reservaciones) {
    const k = dayKey(r.fechaHoraInicioReunion);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(r);
  }
  const days = Object.keys(byDay).sort();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {linkModal && (
        <LinkModal
          reunion={linkModal}
          onClose={() => setLinkModal(null)}
          onGuardado={() => { setLinkModal(null); fetchAgenda(); }}
        />
      )}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Mesas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reservaciones activas y programadas. Las finalizadas no aparecen aquí.</p>
        </div>
        <button onClick={fetchAgenda}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 text-sm">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : days.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No hay reservaciones activas</p>
          <p className="text-sm text-gray-400 mt-1">Todas las reuniones están finalizadas o no hay mesas programadas.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-[#449D3A] text-white rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-bold capitalize">{fmtDay(day + 'T12:00:00')}</span>
                </div>
                <span className="text-xs text-gray-400 font-semibold">{byDay[day].length} reservación(es)</span>
              </div>

              {/* Reservaciones del día */}
              <div className="space-y-2">
                {byDay[day].map((r) => {
                  const sol = r.solicitudreunion;
                  const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
                  const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
                  const est = ESTADO_CONFIG[r.estadoReunion] ?? ESTADO_CONFIG.PROGRAMADA;
                  const mesa = r.mesa;
                  const cfgMesa = mesa?.estaActivo === 1 ? (
                    r.estadoReunion === 'EN_CURSO' ? '#f97316' : '#3b82f6'
                  ) : '#d1d5db';

                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 px-5 py-4 hover:border-gray-200 transition-colors">
                      {/* Mesa badge */}
                      <div style={{ backgroundColor: cfgMesa }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-base text-white shrink-0 shadow-sm">
                        {String(mesa?.numeroMesa ?? '?').padStart(2, '0')}
                      </div>

                      {/* Horario */}
                      <div className="shrink-0 text-center">
                        <p className="text-sm font-extrabold text-gray-900">{fmtTime(r.fechaHoraInicioReunion)}</p>
                        <p className="text-xs text-gray-400">–</p>
                        <p className="text-sm font-bold text-gray-600">{fmtTime(r.fechaHoraFinReunion)}</p>
                      </div>

                      {/* Separator */}
                      <div className="w-px h-10 bg-gray-100 shrink-0" />

                      {/* Empresas */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {ea?.urlFotoPerfil
                            ? <img src={ea.urlFotoPerfil} className="w-7 h-7 rounded-full object-contain shrink-0 border border-gray-100" />
                            : <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0"><Building2 className="w-3.5 h-3.5 text-green-700" /></div>}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{ea?.nombre ?? '—'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{ea?.rubro ?? ''}</p>
                          </div>
                        </div>
                        <span className="text-gray-300 text-xs font-bold shrink-0">vs</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {eb?.urlFotoPerfil
                            ? <img src={eb.urlFotoPerfil} className="w-7 h-7 rounded-full object-contain shrink-0 border border-gray-100" />
                            : <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Building2 className="w-3.5 h-3.5 text-blue-700" /></div>}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{eb?.nombre ?? '—'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{eb?.rubro ?? ''}</p>
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${est.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                          {est.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.tipoReunion === 'VIRTUAL'    ? 'bg-blue-50 text-blue-600' :
                          r.tipoReunion === 'MIXTA'      ? 'bg-purple-50 text-purple-600' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {r.tipoReunion === 'VIRTUAL' ? <span className="flex items-center gap-0.5"><Video className="w-2.5 h-2.5" /> Virtual</span> :
                           r.tipoReunion === 'MIXTA'   ? 'Mixta' :
                           <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> Presencial</span>}
                        </span>
                        <span className="text-[10px] text-gray-400 hidden sm:block">
                          <Armchair className="w-3 h-3 inline mr-0.5" />Mesa {mesa?.numeroMesa}
                        </span>
                        {(r.tipoReunion === 'VIRTUAL' || r.tipoReunion === 'MIXTA') && (
                          <button
                            onClick={() => setLinkModal(r)}
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border-[1.5px] border-[#449D3A] text-[#449D3A] hover:bg-green-50 transition-colors"
                            title={sol?.enlaceReunionVirtual ? 'Cambiar enlace' : 'Agregar enlace'}
                          >
                            <Link2 className="w-3 h-3" />
                            {sol?.enlaceReunionVirtual ? 'Cambiar enlace' : 'Agregar enlace'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
