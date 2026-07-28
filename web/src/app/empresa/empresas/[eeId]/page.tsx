"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, MapPin, Hash, Star, Globe, Mail, Phone, FileText, Send,
  MessageSquare, ArrowLeft, Users, Sparkles, Target, Handshake, AlertCircle,
} from "lucide-react";
import { paisConBandera } from "@/lib/pais";
import { NuevaSolicitudModal } from "@/components/empresa/NuevaSolicitudModal";
import { ModalExito } from "@/components/empresa/ModalExito";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

function afinidadInfo(afinidad: string | null) {
  if (afinidad === "alta")
    return {
      titulo: "Alta afinidad — mismo rubro",
      detalle: "Esta empresa pertenece a tu mismo rubro. Suelen compartir intereses, proveedores o clientes: una reunión puede abrir alianzas o acuerdos directos.",
      color: "text-[#449D3A]", bg: "bg-green-50", border: "border-green-200", fill: true,
    };
  if (afinidad === "media")
    return {
      titulo: "Afinidad media — rubro complementario",
      detalle: "Su rubro complementa al tuyo. Podrían ser proveedor, cliente o socio estratégico. Vale la pena explorar cómo se apoyan mutuamente.",
      color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", fill: false,
    };
  return null;
}

export default function PerfilEmpresaPage() {
  const params = useParams();
  const router = useRouter();
  const eeId = params?.eeId as string;

  const [ctx, setCtx] = useState<any>(null);
  const [emp, setEmp] = useState<any>(null);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const [modalSolicitar, setModalSolicitar] = useState(false);
  const [exito, setExito] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((c) => {
        setCtx(c);
        return fetch(`${API}/empresa/perfil-empresa/${eeId}?miEeId=${c.empresaeventoId}`);
      })
      .then((r) => r.json())
      .then((d) => { if (d?.empresaeventoId) { setEmp(d); setEstado("ok"); } else setEstado("error"); })
      .catch(() => setEstado("error"));
  }, [eeId, router]);

  if (estado === "cargando") return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (estado === "error" || !emp) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">No se pudo cargar el perfil de la empresa.</p>
      <Link href="/empresa/empresas" className="text-[#449D3A] font-bold text-sm mt-3 inline-block">← Volver a Empresas</Link>
    </div>
  );

  const esEncargado = !!ctx?.esResponsable;
  const afin = afinidadInfo(emp.afinidad);
  const waLink = emp.telefonoWhatsapp ? `https://wa.me/${String(emp.telefonoWhatsapp).replace(/[^\d]/g, "")}` : null;

  return (
    <div className="pb-10">
      {modalSolicitar && ctx && (
        <NuevaSolicitudModal
          ctx={ctx} receptoraId={emp.empresaeventoId} receptoraNombre={emp.nombre}
          onClose={() => setModalSolicitar(false)}
          onCreada={() => { setModalSolicitar(false); setExito("Tu solicitud de reunión fue enviada correctamente. Puedes ver su estado en la sección Solicitudes."); }}
        />
      )}
      {exito && <ModalExito titulo="¡Solicitud enviada!" mensaje={exito} onClose={() => setExito(null)} />}

      {/* Barra superior */}
      <div className="px-6 pt-5">
        <Link href="/empresa/empresas" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />Volver a Empresas
        </Link>
      </div>

      {/* Hero */}
      <div className="px-6 mt-4">
        <div className="relative bg-gradient-to-br from-[#449D3A] to-emerald-600 rounded-3xl px-6 pt-6 pb-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2">
            {emp.rubro && <span className="text-[11px] font-bold text-white bg-white/20 border border-white/30 px-3 py-1 rounded-full">{emp.rubro}</span>}
            {emp.tipoParticipacion && <span className="text-[11px] font-bold text-white/90 bg-white/15 px-3 py-1 rounded-full">{emp.tipoParticipacion}</span>}
          </div>
        </div>
        {/* Avatar + nombre superpuestos */}
        <div className="px-2 -mt-12">
          <div className="flex items-end gap-4">
            {emp.urlFotoPerfil ? (
              <img src={emp.urlFotoPerfil} alt={emp.nombre} className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl object-cover bg-white shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl bg-green-50 flex items-center justify-center shrink-0">
                <Building2 className="w-11 h-11 text-[#449D3A]" />
              </div>
            )}
            <div className="pb-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{emp.nombre}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {emp.codigo && <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400"><Hash className="w-3.5 h-3.5" />{emp.codigo}</span>}
                {(emp.ciudad || emp.pais) && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />{[emp.ciudad, paisConBandera(emp.pais)].filter(Boolean).join(", ")}
                  </span>
                )}
                {emp.numeroParticipantes ? (
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{emp.numeroParticipantes} participante(s)</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Afinidad — didáctico */}
          {afin && (
            <div className={`rounded-2xl border ${afin.border} ${afin.bg} p-5`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className={`w-4 h-4 ${afin.color}`} />
                <h2 className={`font-extrabold text-sm ${afin.color}`}>{afin.titulo}</h2>
                <Star className={`w-4 h-4 ${afin.color} ${afin.fill ? "fill-current" : ""} ml-auto`} />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{afin.detalle}</p>
            </div>
          )}

          {/* Descripción */}
          {emp.descripcion && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-extrabold text-gray-900 text-sm mb-2 flex items-center gap-2"><Building2 className="w-4 h-4 text-[#449D3A]" />Sobre la empresa</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{emp.descripcion}</p>
            </div>
          )}

          {/* Oferta / Demanda */}
          {(emp.oferta || emp.demanda) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {emp.oferta && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1.5"><Handshake className="w-4 h-4 text-green-700" /><p className="text-[11px] font-extrabold text-green-700 uppercase tracking-wider">Qué ofrece</p></div>
                  <p className="text-sm text-green-900 leading-relaxed">{emp.oferta}</p>
                </div>
              )}
              {emp.demanda && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1.5"><Target className="w-4 h-4 text-blue-700" /><p className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">Qué busca</p></div>
                  <p className="text-sm text-blue-900 leading-relaxed">{emp.demanda}</p>
                </div>
              )}
            </div>
          )}

          {/* Sectores de interés */}
          {emp.interesesBusqueda && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-extrabold text-gray-900 text-sm mb-2">Sectores de interés</h2>
              <div className="flex flex-wrap gap-2">
                {String(emp.interesesBusqueda).split(",").map((s: string, i: number) => s.trim() && (
                  <span key={i} className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">{s.trim()}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna lateral — contacto + acciones */}
        <div className="space-y-5">
          {/* Acciones (encargado) */}
          {esEncargado && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2.5">
              <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Acciones</p>
              <button
                onClick={() => setModalSolicitar(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold py-3 rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />Solicitar reunión
              </button>
              <Link
                href={`/empresa/mensajes?con=${emp.empresaeventoId}&nombre=${encodeURIComponent(emp.nombre)}`}
                className="w-full flex items-center justify-center gap-2 border-[1.5px] border-[#449D3A] text-[#449D3A] hover:bg-green-50 text-sm font-bold py-3 rounded-xl transition-colors"
              >
                <MessageSquare className="w-4 h-4" />Enviar mensaje
              </Link>
            </div>
          )}

          {/* Contacto */}
          {(emp.encargado || emp.correoCorporativo || waLink || emp.sitioWeb || emp.urlPdf) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Contacto</p>
              <div className="space-y-2">
                {emp.encargado && (
                  <div className="flex items-center gap-2.5 px-1 py-1">
                    <Users className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Encargado</p>
                      <p className="text-sm text-gray-700 font-semibold truncate">{emp.encargado}</p>
                    </div>
                  </div>
                )}
                {emp.correoCorporativo && (
                  <a href={`mailto:${emp.correoCorporativo}`} className="flex items-center gap-2.5 border border-gray-100 hover:border-green-200 hover:bg-green-50/50 rounded-xl px-3 py-2.5 transition-colors">
                    <Mail className="w-4 h-4 text-[#449D3A] shrink-0" /><span className="text-xs text-gray-600 font-semibold truncate">{emp.correoCorporativo}</span>
                  </a>
                )}
                {waLink && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 border border-gray-100 hover:border-green-200 hover:bg-green-50/50 rounded-xl px-3 py-2.5 transition-colors">
                    <Phone className="w-4 h-4 text-[#449D3A] shrink-0" /><span className="text-xs text-gray-600 font-semibold truncate">{emp.telefonoWhatsapp}</span>
                  </a>
                )}
                {emp.sitioWeb && (
                  <a href={emp.sitioWeb} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 border border-gray-100 hover:border-green-200 hover:bg-green-50/50 rounded-xl px-3 py-2.5 transition-colors">
                    <Globe className="w-4 h-4 text-[#449D3A] shrink-0" /><span className="text-xs text-gray-600 font-semibold truncate">Sitio web</span>
                  </a>
                )}
                {emp.urlPdf && (
                  <a href={emp.urlPdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 border border-gray-100 hover:border-green-200 hover:bg-green-50/50 rounded-xl px-3 py-2.5 transition-colors">
                    <FileText className="w-4 h-4 text-[#449D3A] shrink-0" /><span className="text-xs text-gray-600 font-semibold truncate">Catálogo / brochure</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
