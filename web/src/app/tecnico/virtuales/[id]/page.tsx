"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Building2, Clock, Calendar, User,
  ExternalLink, Copy, CheckCircle, AlertCircle, X, Wifi,
} from 'lucide-react';

const API = 'http://localhost:3334';

const ESTADO_CFG: Record<string, { badge: string; dot: string; label: string; animated?: boolean }> = {
  PROGRAMADA: { badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',   label: 'Programada' },
  EN_CURSO:   { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  label: 'En curso', animated: true },
  FINALIZADA: { badge: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   label: 'Finalizada' },
  CANCELADA:  { badge: 'bg-red-100 text-red-600',      dot: 'bg-red-400',    label: 'Cancelada' },
};

const TIPO_CFG: Record<string, { badge: string; label: string }> = {
  VIRTUAL: { badge: 'bg-blue-100 text-blue-700',    label: 'Virtual' },
  MIXTA:   { badge: 'bg-purple-100 text-purple-700', label: 'Mixta' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function Modal({ visible, type, title, message, onClose }: {
  visible: boolean; type: 'success' | 'error'; title: string; message: string; onClose: () => void;
}) {
  if (!visible) return null;
  const isError = type === 'error';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl p-6 w-full max-w-sm border ${isError ? 'border-red-200' : 'border-green-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          {isError
            ? <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            : <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
          }
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600 ml-9">{message}</p>
        <button
          onClick={onClose}
          className={`mt-4 w-full py-2 rounded-xl text-sm font-bold text-white ${isError ? 'bg-red-500' : 'bg-[#449D3A]'}`}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

function CompanyCard({ empresa, label }: { empresa: any; label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      {empresa?.urlFotoPerfil
        ? <img src={empresa.urlFotoPerfil} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" alt={empresa.nombre} />
        : (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-green-600" />
          </div>
        )
      }
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-gray-900 truncate">{empresa?.nombre ?? '—'}</p>
        {empresa?.sector && <p className="text-xs text-gray-500 truncate">{empresa.sector}</p>}
      </div>
    </div>
  );
}

export default function VirtualDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [reunion, setReunion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error'; title: string; message: string }>({
    visible: false, type: 'success', title: '', message: '',
  });

  const fetchReunion = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/tecnico/reuniones/${id}`);
      const data = await res.json();
      setReunion(data);
    } catch {
      setReunion(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReunion(); }, [fetchReunion]);

  const handleCopy = async () => {
    const link = reunion?.solicitudreunion?.enlaceReunionVirtual;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setModal({ visible: true, type: 'error', title: 'Error', message: 'No se pudo copiar el enlace.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#449D3A]" />
      </div>
    );
  }

  if (!reunion) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center mt-20">
        <p className="text-gray-400 font-semibold">No se encontró la reunión.</p>
        <Link href="/tecnico/virtuales" className="mt-4 inline-block text-[#449D3A] font-semibold hover:underline">
          ← Volver a reuniones virtuales
        </Link>
      </div>
    );
  }

  const sol  = reunion.solicitudreunion;
  const ea   = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb   = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est  = ESTADO_CFG[reunion.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  const tip  = TIPO_CFG[reunion.tipoReunion] ?? TIPO_CFG.VIRTUAL;
  const link = sol?.enlaceReunionVirtual;

  // Responsable from empresa A's users
  const responsable = ea?.empresa_usuario?.[0]?.usuario;
  const responsableNombre = responsable
    ? `${responsable.nombres ?? ''} ${responsable.apellidoPaterno ?? ''}`.trim()
    : '—';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Modal {...modal} onClose={() => setModal((m) => ({ ...m, visible: false }))} />

      {/* Back + Status */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/tecnico/virtuales"
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a reuniones virtuales
        </Link>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${est.badge}`}>
          {est.animated
            ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            : <span className={`w-2 h-2 rounded-full ${est.dot}`} />
          }
          {est.label}
        </span>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-900">Reunión #{reunion.id}</h1>
        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${tip.badge}`}>
          <Wifi className="w-3 h-3" /> {tip.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Información */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Información de la reunión</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fecha</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{fmtDate(reunion.fechaHoraInicioReunion)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Hora (GMT-4)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {fmtTime(reunion.fechaHoraInicioReunion)} – {fmtTime(reunion.fechaHoraFinReunion)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Responsable</p>
                  <p className="text-sm font-semibold text-gray-900">{responsableNombre}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Participantes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Participantes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CompanyCard empresa={ea} label="Empresa 1" />
              <CompanyCard empresa={eb} label="Empresa 2" />
            </div>
          </div>
        </div>

        {/* Right column — virtual access card */}
        <div className="space-y-4">
          <div className="bg-[#449D3A] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5" />
              <h2 className="font-bold text-base">Acceso a reunión virtual</h2>
            </div>
            <p className="text-green-100 text-xs mb-5 leading-relaxed">
              Plataformas compatibles: Zoom / Google Meet / Teams
            </p>

            {link ? (
              <div className="space-y-2">
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-[#449D3A] font-bold text-sm rounded-xl hover:bg-green-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Entrar a la reunión
                </a>
                <button
                  onClick={handleCopy}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 font-bold text-sm rounded-xl border-2 border-white/40 transition-colors ${
                    copied ? 'bg-white/30 text-white' : 'bg-transparent text-white hover:bg-white/10'
                  }`}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
                </button>
              </div>
            ) : (
              <p className="text-green-100 text-sm italic text-center py-3">
                No hay enlace virtual registrado aún.
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-green-100 text-xs leading-relaxed">
                Los técnicos pueden usar este acceso para ayudar a los participantes en caso de problemas de conexión.
              </p>
            </div>
          </div>

          {/* Back button */}
          <Link
            href="/tecnico/virtuales"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a reuniones virtuales
          </Link>
        </div>
      </div>
    </div>
  );
}
