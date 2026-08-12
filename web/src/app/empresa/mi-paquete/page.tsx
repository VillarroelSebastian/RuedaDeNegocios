"use client";

import React, { useEffect, useState } from "react";
import { Package, Check, Users, Armchair, Star, Globe, X as XIcon } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type MiPaquete = {
  paqueteId: number | null;
  paqueteNombre: string | null;
  paqueteCosto: number | null;
  beneficios: string[];
  maxParticipantes: number;
  credencialesIncluidas: number;
  nivelMesa: "NORMAL" | "PREFERENCIAL" | "VIP";
  apareceEnCatalogo: boolean;
  logoEnWeb: boolean;
  destacadoEnListados: boolean;
  participantesUsados: number;
  participantesDisponibles: number;
};

const ETIQUETA_MESA: Record<string, string> = {
  NORMAL: "Mesa estándar",
  PREFERENCIAL: "Mesa preferencial",
  VIP: "Mesa VIP",
};

export default function MiPaquetePage() {
  const [datos, setDatos] = useState<MiPaquete | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { setCargando(false); return; }
    const user = JSON.parse(raw);
    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx) => {
        if (!ctx?.empresaeventoId) return null;
        return fetch(`${API}/empresa/mi-paquete?eeId=${ctx.empresaeventoId}`).then((r) => (r.ok ? r.json() : null));
      })
      .then((d) => setDatos(d))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="p-6 text-center text-gray-400">Cargando tu paquete…</p>;

  if (!datos) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-16">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">No pudimos cargar tu paquete</p>
        <p className="text-sm text-gray-400 mt-1">Vuelve a intentarlo en unos momentos.</p>
      </div>
    );
  }

  // Las empresas inscritas antes de que existieran los paquetes no tienen uno.
  const sinPaquete = !datos.paqueteId;

  const capacidades = [
    { ok: true, Icon: Users, texto: `${datos.credencialesIncluidas} credenciales incluidas (hasta ${datos.maxParticipantes} personas)` },
    { ok: datos.nivelMesa !== "NORMAL", Icon: Armchair, texto: ETIQUETA_MESA[datos.nivelMesa] },
    { ok: datos.apareceEnCatalogo, Icon: Globe, texto: "Visible en el catálogo de participantes" },
    { ok: datos.destacadoEnListados, Icon: Star, texto: "Destacada en los listados" },
    { ok: datos.logoEnWeb, Icon: Globe, texto: "Logo en la web del evento" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-[#449D3A]" /> Mi paquete
        </h1>
        <p className="text-sm text-gray-500 mt-1">Lo que tu inscripción te habilita en el evento.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        {sinPaquete ? (
          <p className="text-gray-600">
            Tu empresa se inscribió con la tarifa general del evento, sin paquete asignado.
          </p>
        ) : (
          <>
            <p className="text-xs font-bold text-[#449D3A] uppercase tracking-wide">Paquete contratado</p>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">{datos.paqueteNombre}</h2>
            <p className="text-lg font-bold text-gray-500">Bs. {datos.paqueteCosto}</p>
          </>
        )}

        {/* Uso de credenciales */}
        <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">Participantes registrados</span>
            <span className="font-extrabold text-gray-900">
              {datos.participantesUsados} / {datos.maxParticipantes}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-[#449D3A] transition-all"
              style={{ width: `${Math.min(100, (datos.participantesUsados / Math.max(1, datos.maxParticipantes)) * 100)}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {datos.participantesDisponibles > 0
              ? `Puedes registrar ${datos.participantesDisponibles} persona(s) más.`
              : "Alcanzaste el máximo de tu paquete."}
          </p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-3">
            Qué incluye en la plataforma
          </p>
          <ul className="space-y-2">
            {capacidades.map(({ ok, Icon, texto }) => (
              <li key={texto} className={`flex items-center gap-2.5 text-sm ${ok ? "text-gray-800" : "text-gray-400"}`}>
                {ok
                  ? <Check className="w-4 h-4 text-[#449D3A] flex-shrink-0" strokeWidth={3} />
                  : <XIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                <Icon className={`w-4 h-4 flex-shrink-0 ${ok ? "text-gray-500" : "text-gray-300"}`} />
                <span className={ok ? "" : "line-through"}>{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        {datos.beneficios.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-3">
              Beneficios de difusión
            </p>
            {/* Se entregan fuera de la plataforma; aquí solo se listan. */}
            <ul className="space-y-1.5">
              {datos.beneficios.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-[#449D3A] flex-shrink-0 mt-1" strokeWidth={3} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-400 mt-3">
              La organización coordina contigo la entrega de estos beneficios.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
