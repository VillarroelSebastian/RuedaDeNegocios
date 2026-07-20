"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, Send, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import ImagenLightbox from "@/components/ui/ImagenLightbox";
import { paisConBandera } from "@/lib/pais";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export default function OportunidadesPage() {
  const router = useRouter();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [esEncargado, setEsEncargado] = useState(false);

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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {oportunidades.map((em: any) => (
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
      )}
    </div>
  );
}
