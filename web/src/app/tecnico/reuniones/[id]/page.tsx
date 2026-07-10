"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Building2, Clock, Calendar, User,
  MapPin, Video, Wifi, MessageSquare, Users,
} from 'lucide-react';

const API = 'http://localhost:3334';

const ESTADO_CFG: Record<string, { badge: string; dot: string; label: string; animated?: boolean }> = {
  PROGRAMADA: { badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',   label: 'Programada' },
  EN_CURSO:   { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', label: 'En curso', animated: true },
  FINALIZADA: { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-400',  label: 'Finalizada' },
  CANCELADA:  { badge: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-300',   label: 'Cancelada' },
};

const TIPO_CFG: Record<string, { badge: string; label: string; icon: React.ReactNode }> = {
  PRESENCIAL: {
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Presencial',
    icon: <MapPin className="w-4 h-4" />,
  },
  VIRTUAL: {
    badge: 'bg-blue-100 text-blue-700',
    label: 'Virtual',
    icon: <Wifi className="w-4 h-4" />,
  },
  MIXTA: {
    badge: 'bg-purple-100 text-purple-700',
    label: 'Mixta (Presencial + Virtual)',
    icon: <Video className="w-4 h-4" />,
  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

function CompanySection({ empresa, label }: { empresa: any; label: string }) {
  const usuarios = empresa?.empresa_usuario ?? [];
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
        {empresa?.urlFotoPerfil
          ? <img src={empresa.urlFotoPerfil} className="w-10 h-10 rounded-full object-contain border border-gray-100 shrink-0" alt={empresa.nombre} />
          : (
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
          )
        }
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{empresa?.nombre ?? '—'}</p>
          {empresa?.sector && <p className="text-xs text-gray-500 truncate">{empresa.sector}</p>}
          {usuarios.length > 0 && (
            <p className="text-xs text-gray-400 truncate">
              Rep: {usuarios[0]?.usuario?.nombres} {usuarios[0]?.usuario?.apellidoPaterno}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReunionDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [reunion, setReunion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        <Link href="/tecnico/mesas" className="mt-4 inline-block text-[#449D3A] font-semibold hover:underline">
          ← Volver a agenda
        </Link>
      </div>
    );
  }

  const sol  = reunion.solicitudreunion;
  const ea   = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb   = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est  = ESTADO_CFG[reunion.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  const tip  = TIPO_CFG[reunion.tipoReunion] ?? TIPO_CFG.PRESENCIAL;
  const link = sol?.enlaceReunionVirtual;
  const mapsUrl = getMapsUrl(sol);

  const esPresencial = reunion.tipoReunion === 'PRESENCIAL' || reunion.tipoReunion === 'MIXTA';
  const esVirtual    = reunion.tipoReunion === 'VIRTUAL'    || reunion.tipoReunion === 'MIXTA';

  // Responsables from both companies
  const representantesA = ea?.empresa_usuario ?? [];
  const representantesB = eb?.empresa_usuario ?? [];
  const allReps = [...representantesA, ...representantesB];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back + Status */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/tecnico/mesas"
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a agenda
        </Link>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${est.badge}`}>
          {est.animated
            ? <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            : <span className={`w-2 h-2 rounded-full ${est.dot}`} />
          }
          {est.label}
        </span>
      </div>

      {/* Title */}
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-gray-900">Reunión #{reunion.id}</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="capitalize">{fmtDate(reunion.fechaHoraInicioReunion)}</span>
          <span>·</span>
          <span>{fmtTime(reunion.fechaHoraInicioReunion)} – {fmtTime(reunion.fechaHoraFinReunion)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left column (col-span-3) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Participantes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Participantes</h2>
            </div>
            <div className="space-y-4">
              <CompanySection empresa={ea} label="Empresa solicitante" />
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300 font-bold">↔</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <CompanySection empresa={eb} label="Empresa invitada" />
            </div>
          </div>

          {/* Observaciones */}
          {sol?.mensajeParaEmpresaReceptora && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Observaciones</h2>
              </div>
              <p className="text-sm text-gray-500 italic leading-relaxed">
                "{sol.mensajeParaEmpresaReceptora}"
              </p>
            </div>
          )}
        </div>

        {/* Right column (col-span-2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Logística */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Logística</h2>

            {/* Tipo */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Tipo de reunión</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${tip.badge}`}>
                {tip.icon}
                {tip.label}
              </span>
            </div>

            {/* Mesa / Ubicación */}
            {esPresencial && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Ubicación / Mesa</p>
                {reunion.mesa ? (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg">
                    <div className="w-8 h-8 bg-[#449D3A] rounded-lg flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                      {String(reunion.mesa.numeroMesa).padStart(2, '0')}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Mesa {reunion.mesa.numeroMesa}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Mesa no asignada</p>
                )}

                {/* Google Maps placeholder */}
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                  <div className="w-full h-28 bg-gray-100 flex flex-col items-center justify-center gap-2">
                    <MapPin className="w-6 h-6 text-gray-300" />
                    <p className="text-xs text-gray-400">Vista de mapa</p>
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 bg-[#449D3A] text-white text-xs font-bold hover:bg-[#367d2e] transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      Ver mapa
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Virtual link */}
            {esVirtual && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Enlace virtual</p>
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    Entrar a reunión
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sin enlace registrado</p>
                )}
              </div>
            )}
          </div>

          {/* Responsables */}
          {allReps.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Responsables</h2>
              </div>
              <div className="space-y-2">
                {allReps.map((eu: any, idx: number) => {
                  const u = eu.usuario;
                  if (!u) return null;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50">
                      {u.urlFotoPerfil
                        ? <img src={u.urlFotoPerfil} className="w-7 h-7 rounded-full object-contain shrink-0" alt="" />
                        : (
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )
                      }
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {u.nombres} {u.apellidoPaterno}
                        </p>
                        {u.correo && <p className="text-[10px] text-gray-400 truncate">{u.correo}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
