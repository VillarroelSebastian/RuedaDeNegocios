"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle2, Building2, MapPin, Calendar, User, ShieldCheck,
  BadgeCheck, XCircle, Hash, Star,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

function paisFlag(pais: string | null) {
  if (!pais) return "";
  const map: Record<string, string> = { Bolivia: "🇧🇴", Argentina: "🇦🇷", Brasil: "🇧🇷", Perú: "🇵🇪", Chile: "🇨🇱", Paraguay: "🇵🇾" };
  return map[pais] ?? "";
}
function fmtFecha(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" });
}

export default function CredencialPage() {
  const params = useParams();
  const search = useSearchParams();
  const euId = params?.euId;
  const t = search.get("t");

  const [data, setData] = useState<any>(null);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");

  useEffect(() => {
    if (!euId || !t) { setEstado("error"); return; }
    fetch(`${API}/public/credencial/${euId}?t=${encodeURIComponent(t)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => { setData(d); setEstado("ok"); })
      .catch(() => setEstado("error"));
  }, [euId, t]);

  if (estado === "cargando") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="w-10 h-10 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (estado === "error" || !data?.valida) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-red-100 max-w-sm w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-9 h-9 text-red-500" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 mb-1">Credencial no válida</h1>
          <p className="text-sm text-gray-500">Este código no corresponde a una credencial registrada o el enlace fue alterado.</p>
        </div>
      </div>
    );
  }

  const { participante, empresa, evento, habilitado, tipoParticipacion } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#449D3A] to-emerald-700 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Encabezado del evento */}
        <div className="text-center mb-5">
          {evento.urlLogoEvento ? (
            <img src={evento.urlLogoEvento} alt={evento.nombre} className="h-14 mx-auto object-contain mb-2" />
          ) : null}
          <p className="text-white/90 text-sm font-semibold">{evento.nombre}{evento.edicion ? ` · ${evento.edicion}` : ""}</p>
        </div>

        {/* Tarjeta de credencial */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Banda de estado */}
          <div className={`px-6 py-5 text-center ${habilitado ? "bg-gradient-to-r from-[#449D3A] to-emerald-500" : "bg-gradient-to-r from-amber-500 to-orange-500"}`}>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 border-2 border-white/40">
              {habilitado ? <CheckCircle2 className="w-9 h-9 text-white" /> : <ShieldCheck className="w-9 h-9 text-white" />}
            </div>
            <h1 className="text-white font-extrabold text-lg leading-tight">
              {habilitado ? "Registrado correctamente" : "Registro en proceso"}
            </h1>
            <p className="text-white/85 text-xs mt-1">
              {habilitado
                ? "Esta empresa participa oficialmente en la Rueda de Negocios"
                : "El pago o la habilitación aún están pendientes"}
            </p>
          </div>

          {/* Participante */}
          <div className="px-6 pt-6 pb-4 flex items-center gap-4 border-b border-gray-50">
            {participante.urlFotoPerfil ? (
              <img src={participante.urlFotoPerfil} alt={participante.nombre} className="w-16 h-16 rounded-2xl object-contain border border-gray-100 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-[#449D3A]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Participante</p>
              <p className="font-extrabold text-gray-900 leading-snug">{participante.nombre}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {participante.esResponsable && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#449D3A] bg-green-50 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-[#449D3A]" />Encargado
                  </span>
                )}
                {participante.cargo && (
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{participante.cargo}</span>
                )}
              </div>
            </div>
          </div>

          {/* Empresa */}
          <div className="px-6 py-4 border-b border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Empresa</p>
            <div className="flex items-center gap-3">
              {empresa.urlFotoPerfil ? (
                <img src={empresa.urlFotoPerfil} alt={empresa.nombre} className="w-12 h-12 rounded-xl object-contain border border-gray-100 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-[#449D3A]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 leading-snug truncate">{empresa.nombre}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {empresa.codigo && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500">
                      <Hash className="w-3 h-3" />{empresa.codigo}
                    </span>
                  )}
                  {(empresa.ciudad || empresa.pais) && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[empresa.ciudad, `${paisFlag(empresa.pais)} ${empresa.pais ?? ""}`.trim()].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                {empresa.rubro && <p className="text-xs text-[#449D3A] font-semibold mt-1">{empresa.rubro}</p>}
              </div>
            </div>
          </div>

          {/* Estado / verificación */}
          <div className="px-6 py-4 grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 text-center ${habilitado ? "bg-green-50" : "bg-amber-50"}`}>
              <BadgeCheck className={`w-5 h-5 mx-auto mb-1 ${habilitado ? "text-[#449D3A]" : "text-amber-500"}`} />
              <p className={`text-[11px] font-bold ${habilitado ? "text-green-700" : "text-amber-700"}`}>
                {habilitado ? "Pago aprobado" : "Pago pendiente"}
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center ${habilitado ? "bg-green-50" : "bg-amber-50"}`}>
              <ShieldCheck className={`w-5 h-5 mx-auto mb-1 ${habilitado ? "text-[#449D3A]" : "text-amber-500"}`} />
              <p className={`text-[11px] font-bold ${habilitado ? "text-green-700" : "text-amber-700"}`}>
                {habilitado ? "Acceso habilitado" : "Acceso pendiente"}
              </p>
            </div>
          </div>

          {/* Datos del evento */}
          <div className="px-6 pb-6">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {tipoParticipacion && (
                <div className="flex items-center gap-2 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Participación:</span>
                  <span className="font-semibold text-gray-800">{tipoParticipacion}</span>
                </div>
              )}
              {(evento.fechaInicio || evento.fechaFin) && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Fechas:</span>
                  <span className="font-semibold text-gray-800">{fmtFecha(evento.fechaInicio)} – {fmtFecha(evento.fechaFin)}</span>
                </div>
              )}
              {(evento.ciudad || evento.pais) && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Lugar:</span>
                  <span className="font-semibold text-gray-800">{[evento.ciudad, evento.pais].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-white/70 text-[11px] mt-4">
          Credencial digital verificada · Rueda de Negocios del Beni
        </p>
      </div>
    </div>
  );
}
