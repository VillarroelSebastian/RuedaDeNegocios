"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Search, AlertCircle, Star, Filter, Grid2X2, List } from "lucide-react";
import ImagenLightbox from "@/components/ui/ImagenLightbox";
import { paisConBandera } from "@/lib/pais";

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
  const [orden, setOrden] = useState<"afinidad" | "az" | "za" | "rubro">("afinidad");
  const [vista, setVista] = useState<"tarjetas" | "lista">("tarjetas");

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

  // Restaurar después de que las tarjetas vuelvan al DOM; hacerlo antes de
  // terminar la carga deja la página sin altura y el navegador vuelve arriba.
  useEffect(() => {
    if (loading || empresas.length === 0) return;
    const anterior = Number(sessionStorage.getItem("directorio_scroll") || 0);
    if (anterior > 0) requestAnimationFrame(() => window.scrollTo({ top: anterior, behavior: "auto" }));
  }, [loading, empresas.length]);

  const filtradas = empresas.filter((e) =>
    [e.nombre, e.rubro, e.codigo].some((v) => v && String(v).toLowerCase().includes(busqueda.toLowerCase()))
  ).sort((a, b) => {
    if (orden === "az") return String(a.nombre).localeCompare(String(b.nombre), "es");
    if (orden === "za") return String(b.nombre).localeCompare(String(a.nombre), "es");
    if (orden === "rubro") return String(a.rubro || "").localeCompare(String(b.rubro || ""), "es") || String(a.nombre).localeCompare(String(b.nombre), "es");
    const peso = (v: any) => v.afinidad === "alta" ? 2 : v.afinidad === "media" ? 1 : 0;
    return peso(b) - peso(a) || String(a.nombre).localeCompare(String(b.nombre), "es");
  });

  if (error) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">{error}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500">Ordenar
          <select value={orden} onChange={(e) => setOrden(e.target.value as any)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
            <option value="afinidad">Coincidencias primero</option><option value="az">Nombre A–Z</option><option value="za">Nombre Z–A</option><option value="rubro">Categoría/rubro</option>
          </select>
        </label>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1">
          <button type="button" onClick={() => setVista("tarjetas")} className={`rounded-lg p-2 ${vista === "tarjetas" ? "bg-green-50 text-[#449D3A]" : "text-gray-400"}`} aria-label="Vista de tarjetas"><Grid2X2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => setVista("lista")} className={`rounded-lg p-2 ${vista === "lista" ? "bg-green-50 text-[#449D3A]" : "text-gray-400"}`} aria-label="Vista de lista"><List className="h-4 w-4" /></button>
        </div>
      </div>

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
        <div className={vista === "tarjetas" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "grid grid-cols-1 gap-3"}>
          {filtradas.map((em: any) => (
            <Link
              key={em.empresaeventoId}
              href={`/empresa/empresas/${em.empresaeventoId}`}
              onClick={() => sessionStorage.setItem("directorio_scroll", String(window.scrollY))}
              className={`block text-left bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
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

                <div className="mt-4 border-t border-gray-100 pt-3">
                  <span className="group/cta flex w-full items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-[#449D3A] transition-colors hover:bg-green-100">
                    Ver empresa
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
