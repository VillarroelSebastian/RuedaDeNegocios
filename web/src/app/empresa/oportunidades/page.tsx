"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Building2, CheckCircle2, ChevronLeft, ChevronRight, MapPin, Search, Send, Sparkles } from "lucide-react";
import ImagenLightbox from "@/components/ui/ImagenLightbox";
import { paisConBandera } from "@/lib/pais";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export default function OportunidadesPage() {
  const router = useRouter();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [esEncargado, setEsEncargado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [rubro, setRubro] = useState("");
  const [orden, setOrden] = useState<"relevancia" | "alfabetico">("relevancia");
  const [pagina, setPagina] = useState(1);

  const rubros = useMemo(() => Array.from(new Set(oportunidades.map((item) => item.rubro).filter(Boolean))).sort(), [oportunidades]);
  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    const resultado = oportunidades.filter((item) => {
      const texto = [item.nombre, item.codigo, item.rubro, item.ciudad, item.pais, ...(item.motivos || [])].filter(Boolean).join(" ").toLocaleLowerCase("es");
      return (!termino || texto.includes(termino)) && (!rubro || item.rubro === rubro);
    });
    return orden === "alfabetico" ? resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) : resultado;
  }, [busqueda, oportunidades, orden, rubro]);
  const porPagina = 9;
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const visibles = filtradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((ctx) => {
        setEsEncargado(!!ctx.esResponsable);
        return fetch(`${API}/empresa/oportunidades?eeId=${ctx.empresaeventoId}`);
      })
      .then((r) => r.json())
      .then((data) => setOportunidades(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudieron cargar las oportunidades."))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">{error}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#449D3A]" />Oportunidades para tu empresa
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Empresas cuyo interés, oferta o demanda coincide con el perfil de tu empresa.
        </p>
      </div>

      {oportunidades.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col lg:flex-row gap-3">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} placeholder="Buscar por empresa, código, rubro o coincidencia..." className="w-full border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#449D3A]" />
          </label>
          <select value={rubro} onChange={(e) => { setRubro(e.target.value); setPagina(1); }} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-[#449D3A]">
            <option value="">Todos los rubros</option>
            {rubros.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={orden} onChange={(e) => { setOrden(e.target.value as "relevancia" | "alfabetico"); setPagina(1); }} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-[#449D3A]">
            <option value="relevancia">Mayor afinidad</option>
            <option value="alfabetico">Orden alfabético</option>
          </select>
        </div>
      )}

      {oportunidades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-300" />
          <p className="text-sm text-gray-400">
            Aún no encontramos coincidencias. Completa la oferta, demanda y sectores de interés en tu perfil para mejorar las sugerencias.
          </p>
          <Link href="/empresa/perfil" className="inline-block mt-4 text-sm font-bold text-[#449D3A] hover:underline">
            Ir a Mi Perfil →
          </Link>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-500">No hay oportunidades que coincidan con los filtros.</div>
      ) : (
        <>
        <div className="flex items-center justify-between text-xs text-gray-500"><span>{filtradas.length} resultado(s)</span><span>Página {pagina} de {totalPaginas}</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibles.map((em: any) => (
            <div key={em.empresaeventoId} className="bg-white rounded-2xl border border-[#449D3A]/30 ring-1 ring-[#449D3A]/10 shadow-sm overflow-hidden">
              <div className="p-5">
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

                <div className="space-y-1.5 mb-3">
                  {em.motivos.map((m: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {m}
                    </div>
                  ))}
                </div>

                {(em.ciudad || em.pais) && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin className="w-3 h-3" />
                    {[em.ciudad, paisConBandera(em.pais)].filter(Boolean).join(", ")}
                  </span>
                )}

                {esEncargado && (
                  <Link
                    href={`/empresa/solicitudes?nueva=1&receptoraId=${em.empresaeventoId}&receptoraNombre=${encodeURIComponent(em.nombre)}`}
                    className="w-full flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Solicitar reunión
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button type="button" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)} className="flex items-center gap-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"><ChevronLeft className="w-4 h-4" />Anterior</button>
            <span className="text-sm text-gray-500">{pagina} / {totalPaginas}</span>
            <button type="button" disabled={pagina === totalPaginas} onClick={() => setPagina((p) => p + 1)} className="flex items-center gap-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40">Siguiente<ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
