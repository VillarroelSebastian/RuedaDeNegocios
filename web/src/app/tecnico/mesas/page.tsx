"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Armchair, Building2, Clock, Video, MapPin, ChevronDown, ChevronUp,
  Search, X, Timer, Star, History, Mail, Link2, Send,
} from 'lucide-react';
import { useModal } from '@/components/ui/Modal';

const API = 'http://localhost:3334';

const ESTADO_MESA: Record<string, { badge: string; dot: string; label: string }> = {
  LIBRE:    { badge: 'bg-green-100 text-green-700',   dot: 'bg-green-400',  label: 'Libre' },
  RESERVADA:{ badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',   label: 'Programada' },
  EN_USO:   { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', label: 'En uso' },
};

const ESTADO_REUNION: Record<string, { badge: string; label: string }> = {
  PROGRAMADA: { badge: 'bg-blue-100 text-blue-700',    label: 'Programada' },
  EN_CURSO:   { badge: 'bg-orange-100 text-orange-700', label: 'En curso' },
  FINALIZADA: { badge: 'bg-green-100 text-green-700',  label: 'Finalizada' },
  CANCELADA:  { badge: 'bg-gray-100 text-gray-500',    label: 'Cancelada' },
};

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
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
  const sol = r.solicitudreunion;
  const eeA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
  const eeB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
  const ea  = eeA?.empresa;
  const eb  = eeB?.empresa;
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

function ReunionSlot({
  r,
  onMessage,
  onChangeLink,
}: {
  r: any;
  onMessage: (reunionId: number, empresa: 'A' | 'B', empresaNombre: string, encargadoNombre: string) => void;
  onChangeLink: (reunion: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const sol   = r.solicitudreunion;
  const eeA   = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
  const eeB   = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
  const ea    = eeA?.empresa;
  const eb    = eeB?.empresa;
  const encA  = eeA?.empresa_usuario?.[0]?.usuario;
  const encB  = eeB?.empresa_usuario?.[0]?.usuario;
  const est   = ESTADO_REUNION[r.estadoReunion] ?? ESTADO_REUNION.PROGRAMADA;
  const link  = sol?.enlaceReunionVirtual;
  const mapsUrl = getMapsUrl(sol);
  const esVirtual    = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial = r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';

  const nombreEncA = encA ? `${encA.nombres} ${encA.apellidoPaterno}` : 'Encargado';
  const nombreEncB = encB ? `${encB.nombres} ${encB.apellidoPaterno}` : 'Encargado';

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
            ? <img src={ea.urlFotoPerfil} className="w-7 h-7 rounded-full object-contain shrink-0 border border-gray-100" alt="" />
            : <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-green-700" /></div>}
          <span className="text-sm font-semibold text-gray-900 truncate">{ea?.nombre ?? '—'}</span>
          <span className="text-gray-300 font-bold text-sm shrink-0">·</span>
          {eb?.urlFotoPerfil
            ? <img src={eb.urlFotoPerfil} className="w-7 h-7 rounded-full object-contain shrink-0 border border-gray-100" alt="" />
            : <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-blue-700" /></div>}
          <span className="text-sm font-semibold text-gray-900 truncate">{eb?.nombre ?? '—'}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 hidden sm:inline ${est.badge}`}>
          {est.label}
        </span>
        <button onClick={() => setOpen(!open)} className="shrink-0 text-gray-400 hover:text-gray-600">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100 space-y-3 pt-3">
          {/* Links */}
          <div className="flex flex-wrap gap-2">
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
            {esVirtual && (
              <button onClick={() => onChangeLink(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100">
                <Link2 className="w-3 h-3" /> {link ? 'Cambiar link' : 'Agregar link'}
              </button>
            )}
          </div>

          {/* Acciones técnico */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Contactar encargados</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onMessage(r.id, 'A', ea?.nombre ?? 'Empresa A', nombreEncA)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-100 text-xs font-semibold hover:bg-green-100">
                <Mail className="w-3 h-3" />
                <span className="truncate max-w-[140px]">{nombreEncA} · {ea?.nombre ?? 'A'}</span>
              </button>
              <button onClick={() => onMessage(r.id, 'B', eb?.nombre ?? 'Empresa B', nombreEncB)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold hover:bg-blue-100">
                <Mail className="w-3 h-3" />
                <span className="truncate max-w-[140px]">{nombreEncB} · {eb?.nombre ?? 'B'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type FiltroEstado = 'EN_USO' | 'PROGRAMADA' | 'LIBRE' | 'TODAS' | 'HISTORIAL';

export default function TecnicoMesasPage() {
  const { showSuccess, showError, ModalComponent } = useModal();

  const [mesas,        setMesas]        = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [filtro,       setFiltro]       = useState<FiltroEstado>('EN_USO');
  const [search,       setSearch]       = useState('');

  const [historial,        setHistorial]        = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [searchH,          setSearchH]          = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal de mensaje
  const [msgModal, setMsgModal] = useState<{ reunionId: number; empresa: 'A' | 'B'; empresaNombre: string; encargadoNombre: string } | null>(null);
  const [msgText,  setMsgText]  = useState('');
  const [sending,  setSending]  = useState(false);

  // Modal de link
  const [linkModal, setLinkModal]  = useState<{ reunion: any } | null>(null);
  const [linkText,  setLinkText]   = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const fetchMesas = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/tecnico/mesas`);
      const data = await res.json();
      setMesas(data.mesas ?? []);
      if (data.eventoConfig) setEventoConfig(data.eventoConfig);
    } catch { setMesas([]); }
    finally { setLoading(false); }
  }, []);

  const fetchHistorial = useCallback(async (q?: string) => {
    setLoadingHistorial(true);
    try {
      const url = q?.trim() ? `${API}/tecnico/mesas/historial?q=${encodeURIComponent(q)}` : `${API}/tecnico/mesas/historial`;
      const data = await (await fetch(url)).json();
      setHistorial(Array.isArray(data) ? data : []);
    } catch { setHistorial([]); }
    finally { setLoadingHistorial(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, [fetchMesas]);
  useEffect(() => { if (filtro === 'HISTORIAL') fetchHistorial(); }, [filtro, fetchHistorial]);

  const handleSearchH = (val: string) => {
    setSearchH(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchHistorial(val), 400);
  };

  const mesasFiltradas = mesas.filter((m) => {
    if (filtro === 'EN_USO')     { if (m.estadoMesa !== 'EN_USO')    return false; }
    if (filtro === 'PROGRAMADA') { if (m.estadoMesa !== 'RESERVADA') return false; }
    if (filtro === 'LIBRE')      { if (m.estadoMesa !== 'LIBRE')     return false; }
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
    enUso:     mesas.filter((m) => m.estadoMesa === 'EN_USO').length,
    programada: mesas.filter((m) => m.estadoMesa === 'RESERVADA').length,
    libre:     mesas.filter((m) => m.estadoMesa === 'LIBRE').length,
    total:     mesas.length,
  };

  const FILTROS: { key: FiltroEstado; label: string; icon?: React.ReactNode }[] = [
    { key: 'EN_USO',     label: `En uso (${counts.enUso})` },
    { key: 'PROGRAMADA', label: `Programadas (${counts.programada})` },
    { key: 'LIBRE',      label: `Libres (${counts.libre})` },
    { key: 'TODAS',      label: `Todas (${counts.total})` },
    { key: 'HISTORIAL',  label: 'Historial', icon: <History className="w-3 h-3" /> },
  ];

  const openMessageModal = (reunionId: number, empresa: 'A' | 'B', empresaNombre: string, encargadoNombre: string) => {
    setMsgModal({ reunionId, empresa, empresaNombre, encargadoNombre });
    setMsgText('');
  };

  const openLinkModal = (reunion: any) => {
    setLinkModal({ reunion });
    setLinkText(reunion.solicitudreunion?.enlaceReunionVirtual ?? '');
  };

  const sendMessage = async () => {
    if (!msgModal || !msgText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/tecnico/reuniones/${msgModal.reunionId}/mensaje`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa: msgModal.empresa, mensaje: msgText.trim() }),
      });
      if (!res.ok) throw new Error();
      showSuccess('Mensaje enviado', `El mensaje fue enviado al encargado de ${msgModal.empresaNombre}.`);
      setMsgModal(null);
    } catch { showError('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.'); }
    finally { setSending(false); }
  };

  const saveLink = async () => {
    if (!linkModal) return;
    setSavingLink(true);
    try {
      const res = await fetch(`${API}/tecnico/reuniones/${linkModal.reunion.id}/link`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enlace: linkText.trim() }),
      });
      if (!res.ok) throw new Error();
      showSuccess('Link actualizado', 'El enlace de la reunión virtual fue actualizado.');
      setLinkModal(null);
      fetchMesas();
    } catch { showError('Error', 'No se pudo actualizar el link. Intenta de nuevo.'); }
    finally { setSavingLink(false); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <ModalComponent />

      {/* Modal de mensaje */}
      {msgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Enviar mensaje</p>
                <p className="text-xs text-gray-400">{msgModal.encargadoNombre} · {msgModal.empresaNombre}</p>
              </div>
              <button onClick={() => setMsgModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <textarea
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={5}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#449D3A]"
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setMsgModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">
                Cancelar
              </button>
              <button onClick={sendMessage} disabled={sending || !msgText.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#449D3A] rounded-xl hover:bg-[#388030] disabled:opacity-50">
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Enviando…' : 'Enviar mensaje'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de link */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Enlace de reunión virtual</p>
              <button onClick={() => setLinkModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-gray-500">Actualiza el enlace para la reunión virtual. Todos los participantes podrán verlo.</p>
              <input
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="https://meet.google.com/... o https://zoom.us/..."
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#449D3A]"
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setLinkModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl">
                Cancelar
              </button>
              <button onClick={saveLink} disabled={savingLink}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#449D3A] rounded-xl hover:bg-[#388030] disabled:opacity-50">
                <Link2 className="w-3.5 h-3.5" />
                {savingLink ? 'Guardando…' : 'Guardar link'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filtro === f.key
                  ? 'bg-[#449D3A] text-white border-[#449D3A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#449D3A] hover:text-[#449D3A]'
              }`}>
              {f.icon}{f.label}
            </button>
          ))}
        </div>

        {filtro !== 'HISTORIAL' && (
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
        )}

        {filtro === 'HISTORIAL' && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={searchH} onChange={(e) => handleSearchH(e.target.value)}
              placeholder="Buscar empresa o mesa..."
              className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
            {searchH && (
              <button onClick={() => { setSearchH(''); fetchHistorial(); }} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leyenda */}
      {filtro !== 'HISTORIAL' && (
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
          {Object.entries(ESTADO_MESA).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${v.dot}`} />
              {v.label}
            </div>
          ))}
        </div>
      )}

      {/* Historial tab */}
      {filtro === 'HISTORIAL' ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loadingHistorial ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#449D3A]" />
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 font-medium text-sm">Sin reuniones finalizadas</p>
            </div>
          ) : (
            historial.map((r) => <HistorialRow key={r.id} r={r} />)
          )}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#449D3A]" />
        </div>
      ) : (
        <div className="space-y-4">
          {mesasFiltradas.map((mesa) => {
            const cfg = ESTADO_MESA[mesa.estadoMesa] ?? ESTADO_MESA.LIBRE;
            return (
              <div key={mesa.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-base text-white shrink-0 ${
                    mesa.estadoMesa === 'EN_USO'    ? 'bg-orange-500'
                    : mesa.estadoMesa === 'RESERVADA'? 'bg-blue-500'
                    : 'bg-[#449D3A]'
                  }`}>
                    {String(mesa.numeroMesa).padStart(2, '0')}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-900">Mesa {mesa.numeroMesa}</p>
                    <p className="text-xs text-gray-400">
                      {mesa.reunion?.length ?? 0} reunión(es) · {mesa.capacidadPersonas} personas
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>

                {mesa.reunion && mesa.reunion.length > 0 ? (
                  mesa.reunion.map((r: any) => (
                    <ReunionSlot
                      key={r.id}
                      r={r}
                      onMessage={openMessageModal}
                      onChangeLink={openLinkModal}
                    />
                  ))
                ) : (
                  <div className="px-4 py-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-300 shrink-0" />
                    <p className="text-sm text-gray-400 font-medium">Disponible — sin reuniones asignadas</p>
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
