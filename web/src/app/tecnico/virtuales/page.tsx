"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2, Clock, Video, Search, ExternalLink,
  Wifi, AlertCircle, RefreshCw, Mail, Send, X, UserCheck, Check,
} from 'lucide-react';
import { useModal } from '@/components/ui/Modal';

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
  { key: 'SIN_ENLACE', label: 'Sin enlace' },
  { key: 'FINALIZADA', label: 'Finalizadas' },
  { key: 'CANCELADA',  label: 'Canceladas' },
];

const CANCELADAS_VISTA_KEY = 'rueda_virtuales_canceladas_vista_at';

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

function VirtualCard({
  r, base, acting, onMessage, onFinalizar,
}: {
  r: any; base: string; acting: boolean;
  onMessage: (reunionId: number, empresa: 'A' | 'B', empresaNombre: string, encargadoNombre: string) => void;
  onFinalizar: (reunion: any, asistentes: number) => void;
}) {
  const [asistentes, setAsistentes] = useState(String(r.cantidadAsistentesRegistrados ?? ''));

  const sol = r.solicitudreunion;
  const eeA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
  const eeB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
  const ea  = eeA?.empresa;
  const eb  = eeB?.empresa;
  const encA = eeA?.empresa_usuario?.[0]?.usuario;
  const encB = eeB?.empresa_usuario?.[0]?.usuario;
  const nombreEncA = encA ? `${encA.nombres} ${encA.apellidoPaterno}` : 'Encargado';
  const nombreEncB = encB ? `${encB.nombres} ${encB.apellidoPaterno}` : 'Encargado';
  const est = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  const tip = TIPO_CFG[r.tipoReunion] ?? TIPO_CFG.VIRTUAL;
  const link = sol?.enlaceReunionVirtual;
  const cancelada = r.estadoReunion === 'CANCELADA';
  const enlaceOperativo = ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'].includes(r.estadoReunion);
  const canceladaPorEmpresa = cancelada && /^Cancelada por /i.test(r.observacionesReunion ?? '');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      {/* Info: estado, empresas, horario, tipo */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${est.badge}`}>
          {est.animated
            ? <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            : <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
          }
          {est.label}
        </span>

        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <CompanyChip empresa={ea} colorClass="bg-green-100 text-green-700" />
          <span className="text-gray-300 text-sm font-bold shrink-0">↔</span>
          <CompanyChip empresa={eb} colorClass="bg-blue-100 text-blue-700" />
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tip.badge}`}>
          {tip.label}
        </span>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 sm:ml-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {fmtDate(r.fechaHoraInicioReunion)} · {fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}
          </span>
        </div>
      </div>

      {r.estadoReunion === 'EN_CURSO' && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          <UserCheck className="w-4 h-4 text-gray-400 shrink-0" />
          <label className="text-xs text-gray-600 font-semibold shrink-0">Asistentes:</label>
          <input type="number" min="0" value={asistentes} onChange={(e) => setAsistentes(e.target.value)}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-50">
        {r.estadoReunion === 'EN_CURSO' && (
          <button disabled={acting} onClick={() => onFinalizar(r, Number(asistentes) || 0)}
            className="flex items-center gap-1.5 rounded-lg bg-[#449D3A] hover:bg-[#367d2e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 transition-colors">
            <Check className="w-3.5 h-3.5" /> Finalizar reunión
          </button>
        )}
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
        <Link
          href={`${base}/virtuales/${r.id}`}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Ver detalles
        </Link>
        <button
          onClick={() => onMessage(r.id, 'A', ea?.nombre ?? 'Empresa A', nombreEncA)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-50 transition-colors max-w-[180px]"
        >
          <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">Mensaje a {ea?.nombre ?? 'Empresa A'}</span>
        </button>
        <button
          onClick={() => onMessage(r.id, 'B', eb?.nombre ?? 'Empresa B', nombreEncB)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors max-w-[180px]"
        >
          <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">Mensaje a {eb?.nombre ?? 'Empresa B'}</span>
        </button>
      </div>

      {canceladaPorEmpresa && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{r.observacionesReunion}</span>
        </div>
      )}
    </div>
  );
}

export default function TecnicoVirtualesPage() {
  const pathname = usePathname();
  const base = pathname?.startsWith('/admin') ? '/admin' : '/tecnico';
  const { showSuccess, showError, ModalComponent } = useModal();
  const [reuniones, setReuniones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('TODOS');
  const [canceladasVistaAt, setCanceladasVistaAt] = useState(0);
  const [msgModal, setMsgModal] = useState<{ reunionId: number; empresa: 'A' | 'B'; empresaNombre: string; encargadoNombre: string } | null>(null);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);

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

  const finalizarReunion = async (reunion: any, asistentes: number) => {
    setActing(true);
    try {
      const res = await fetch(`${API}/tecnico/reuniones/${reunion.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoReunion: 'FINALIZADA', asistentes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'No se pudo finalizar la reunión.');
      showSuccess('Reunión finalizada', 'La reunión quedó registrada y las empresas fueron notificadas para evaluar.');
      load();
    } catch (e: any) { showError('Error', e?.message || 'No se pudo finalizar la reunión.'); }
    finally { setActing(false); }
  };

  useEffect(() => {
    try { setCanceladasVistaAt(Number(localStorage.getItem(CANCELADAS_VISTA_KEY)) || 0); } catch {}
  }, []);

  const seleccionarFiltro = (key: string) => {
    setFiltro(key);
    if (key === 'CANCELADA') {
      const ahora = Date.now();
      setCanceladasVistaAt(ahora);
      try { localStorage.setItem(CANCELADAS_VISTA_KEY, String(ahora)); } catch {}
    }
  };

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
    const matchFiltro = filtro === 'TODOS' ? true
      : filtro === 'SIN_ENLACE' ? (['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'].includes(r.estadoReunion) && !sol?.enlaceReunionVirtual)
      : r.estadoReunion === filtro;
    return matchSearch && matchFiltro;
  });
  const sinEnlace = reuniones.filter((r) =>
    ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'].includes(r.estadoReunion) &&
    !r.solicitudreunion?.enlaceReunionVirtual,
  );
  const canceladasNuevas = reuniones.filter((r) =>
    r.estadoReunion === 'CANCELADA' &&
    new Date(r.creadoModificadoFecha ?? r.fechaCreacion).getTime() > canceladasVistaAt,
  ).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
          {FILTER_TABS.map((tab) => {
            const badge = tab.key === 'SIN_ENLACE' ? sinEnlace.length : tab.key === 'CANCELADA' ? canceladasNuevas : 0;
            return (
              <button
                key={tab.key}
                onClick={() => seleccionarFiltro(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filtro === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {badge > 0 && (
                  <span className={`flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white ${
                    tab.key === 'SIN_ENLACE' ? 'bg-amber-500' : 'bg-red-500'
                  }`}>
                    {Math.min(badge, 99)}
                  </span>
                )}
              </button>
            );
          })}
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
          {filtered.map((r) => (
            <VirtualCard key={r.id} r={r} base={base} acting={acting}
              onMessage={(reunionId, empresa, empresaNombre, encargadoNombre) => { setMsgModal({ reunionId, empresa, empresaNombre, encargadoNombre }); setMsgText(''); }}
              onFinalizar={finalizarReunion} />
          ))}
        </div>
      )}
    </div>
  );
}
