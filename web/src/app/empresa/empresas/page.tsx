"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, MapPin, Search, AlertCircle, Globe, Star, X,
  Mail, Phone, FileText, Send, Filter, Hash, MessageSquare,
} from "lucide-react";
import ImagenLightbox from "@/components/ui/ImagenLightbox";
import { paisConBandera } from "@/lib/pais";
import { NuevaSolicitudModal } from "@/components/empresa/NuevaSolicitudModal";
import { ModalExito } from "@/components/empresa/ModalExito";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

function afinidadBadge(afinidad: string | null) {
  if (afinidad === "alta") {
    return (
      <div className="flex items-center gap-1 mb-2">
        <Star className="w-3 h-3 text-[#449D3A] fill-[#449D3A]" />
        <span className="text-[10px] font-bold text-[#449D3A] uppercase tracking-wide">Mismo rubro</span>
      </div>
    );
  }
  if (afinidad === "media") {
    return (
      <div className="flex items-center gap-1 mb-2">
        <Star className="w-3 h-3 text-amber-500" />
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Rubro complementario</span>
      </div>
    );
  }
  return null;
}

function PerfilModal({ empresa, esEncargado, onClose, onSolicitar }: {
  empresa: any; esEncargado: boolean; onClose: () => void; onSolicitar: (empresa: any) => void;
}) {
  if (!empresa) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-extrabold text-gray-900">Perfil de empresa</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            {empresa.urlFotoPerfil ? (
              <ImagenLightbox src={empresa.urlFotoPerfil} alt={empresa.nombre} className="w-16 h-16 rounded-xl border border-gray-100 shrink-0 overflow-hidden" />
            ) : (
              <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-[#449D3A]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 leading-snug">{empresa.nombre}</h3>
              {empresa.codigo && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 mt-0.5">
                  <Hash className="w-3 h-3" />{empresa.codigo}
                </span>
              )}
              {empresa.rubro && <p className="text-xs text-gray-500 mt-0.5">{empresa.rubro}</p>}
              {(empresa.ciudad || empresa.pais) && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[empresa.ciudad, paisConBandera(empresa.pais)].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>

          {afinidadBadge(empresa.afinidad)}

          {empresa.descripcion && (
            <p className="text-sm text-gray-600 leading-relaxed">{empresa.descripcion}</p>
          )}

          {empresa.oferta && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">Ofrece</p>
              <p className="text-sm text-green-800">{empresa.oferta}</p>
            </div>
          )}
          {empresa.demanda && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Busca</p>
              <p className="text-sm text-blue-800">{empresa.demanda}</p>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            {empresa.correoCorporativo && (
              <p className="text-xs text-gray-500 flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{empresa.correoCorporativo}</p>
            )}
            {empresa.telefonoWhatsapp && (
              <p className="text-xs text-gray-500 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{empresa.telefonoWhatsapp}</p>
            )}
            {empresa.sitioWeb && (
              <a href={empresa.sitioWeb} target="_blank" rel="noopener noreferrer" className="text-xs text-[#449D3A] font-semibold flex items-center gap-2 hover:underline">
                <Globe className="w-3.5 h-3.5" />{empresa.sitioWeb}
              </a>
            )}
            {empresa.urlPdf && (
              <a href={empresa.urlPdf} target="_blank" rel="noopener noreferrer" className="text-xs text-[#449D3A] font-semibold flex items-center gap-2 hover:underline">
                <FileText className="w-3.5 h-3.5" />Ver catálogo / brochure
              </a>
            )}
          </div>

          {esEncargado && (
            <div className="space-y-2">
              <button
                onClick={() => onSolicitar(empresa)}
                className="w-full flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Solicitar reunión
              </button>
              <Link
                href={`/empresa/mensajes?con=${empresa.empresaeventoId}&nombre=${encodeURIComponent(empresa.nombre)}`}
                className="w-full flex items-center justify-center gap-2 border-[1.5px] border-[#449D3A] text-[#449D3A] hover:bg-green-50 text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Enviar mensaje
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmpresasPage() {
  const router = useRouter();
  const [ctx, setCtx] = useState<any>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [esEncargado, setEsEncargado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroOferta, setFiltroOferta] = useState("");
  const [filtroDemanda, setFiltroDemanda] = useState("");
  const [filtroLugar, setFiltroLugar] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState<any>(null);
  const [modalNueva, setModalNueva] = useState<{ id: number; nombre: string } | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const cargar = useCallback((ee: number) => {
    setLoading(true);
    const params = new URLSearchParams({ eeId: String(ee) });
    if (filtroOferta.trim()) params.set("oferta", filtroOferta.trim());
    if (filtroDemanda.trim()) params.set("demanda", filtroDemanda.trim());
    if (filtroLugar.trim()) params.set("lugar", filtroLugar.trim());
    fetch(`${API}/empresa/directorio?${params}`)
      .then((r) => r.json())
      .then((data) => setEmpresas(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar la lista de empresas."))
      .finally(() => setLoading(false));
  }, [filtroOferta, filtroDemanda, filtroLugar]);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((c) => {
        setCtx(c);
        setEsEncargado(!!c.esResponsable);
        cargar(c.empresaeventoId);
      })
      .catch(() => setError("No se pudo cargar la lista de empresas."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (ctx?.empresaeventoId) cargar(ctx.empresaeventoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroOferta, filtroDemanda, filtroLugar]);

  const filtradas = empresas.filter((e) =>
    [e.nombre, e.rubro, e.codigo].some((v) => v && String(v).toLowerCase().includes(busqueda.toLowerCase()))
  );

  if (error) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">{error}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <PerfilModal
        empresa={perfilAbierto}
        esEncargado={esEncargado}
        onClose={() => setPerfilAbierto(null)}
        onSolicitar={(em) => { setPerfilAbierto(null); setModalNueva({ id: em.empresaeventoId, nombre: em.nombre }); }}
      />
      {modalNueva && ctx && (
        <NuevaSolicitudModal
          ctx={ctx} receptoraId={modalNueva.id} receptoraNombre={modalNueva.nombre}
          onClose={() => setModalNueva(null)}
          onCreada={() => {
            setModalNueva(null);
            setExitoMsg("Tu solicitud de reunión fue enviada correctamente. Puedes ver su estado en la sección Solicitudes.");
          }}
        />
      )}
      {exitoMsg && (
        <ModalExito titulo="¡Solicitud enviada!" mensaje={exitoMsg} onClose={() => setExitoMsg(null)} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Consulta el perfil de las empresas participantes{esEncargado ? " y solicita una reunión" : ""}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, rubro o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] w-full sm:w-64"
            />
          </div>
          <button
            onClick={() => setMostrarFiltros((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
              mostrarFiltros || filtroOferta || filtroDemanda || filtroLugar
                ? "bg-[#449D3A] text-white border-[#449D3A]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#449D3A]"
            }`}
          >
            <Filter className="w-4 h-4" />Filtros
          </button>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Ofrece</label>
            <input value={filtroOferta} onChange={(e) => setFiltroOferta(e.target.value)}
              placeholder="Ej: café, logística..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Busca</label>
            <input value={filtroDemanda} onChange={(e) => setFiltroDemanda(e.target.value)}
              placeholder="Ej: proveedores, distribución..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Lugar (ciudad o país)</label>
            <input value={filtroLugar} onChange={(e) => setFiltroLugar(e.target.value)}
              placeholder="Ej: Trinidad, Bolivia..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-gray-400">{busqueda || filtroOferta || filtroDemanda || filtroLugar ? "Sin resultados para tu búsqueda." : "No hay otras empresas habilitadas aún."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map((em: any) => (
            <button
              key={em.empresaeventoId}
              onClick={() => setPerfilAbierto(em)}
              className={`text-left bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                em.afinidad === "alta" ? "border-[#449D3A]/40 ring-1 ring-[#449D3A]/20" : "border-gray-100"
              }`}
            >
              <div className="p-5">
                {afinidadBadge(em.afinidad)}
                <div className="flex items-start gap-3 mb-3">
                  {em.urlFotoPerfil ? (
                    <ImagenLightbox src={em.urlFotoPerfil} alt={em.nombre} className="w-12 h-12 rounded-xl border border-gray-100 shrink-0 overflow-hidden" />
                  ) : (
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-[#449D3A]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{em.nombre}</h3>
                    {em.codigo && <p className="text-[10px] text-gray-400 font-semibold">{em.codigo}</p>}
                    {em.rubro && <p className="text-xs text-gray-500 mt-0.5 truncate">{em.rubro}</p>}
                  </div>
                </div>

                {em.oferta && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2"><span className="font-bold text-gray-700">Ofrece:</span> {em.oferta}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                  {(em.ciudad || em.pais) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[em.ciudad, paisConBandera(em.pais)].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>

                <span className="mt-3 w-full flex items-center justify-center gap-1.5 border-[1.5px] border-[#449D3A] text-[#449D3A] hover:bg-green-50 text-xs font-bold py-2 rounded-xl transition-colors">
                  Ver perfil completo →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
