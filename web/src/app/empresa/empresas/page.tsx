"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, Send, Search, AlertCircle, Globe } from "lucide-react";

const API = "http://localhost:3334";

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eeId, setEeId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((ctx) => {
        setEeId(ctx.empresaeventoId);
        return fetch(`${API}/empresa/empresas?eeId=${ctx.empresaeventoId}`);
      })
      .then((r) => r.json())
      .then((data) => setEmpresas(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar el directorio de empresas."))
      .finally(() => setLoading(false));
  }, [router]);

  const filtradas = empresas.filter((e) =>
    [e.nombre, e.rubro, e.ciudad, e.pais].some(
      (v) => v && v.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Empresas participantes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtradas.length} de {empresas.length} empresas</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar empresa, rubro..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] w-64"
          />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{busqueda ? "Sin resultados para tu búsqueda." : "No hay otras empresas habilitadas aún."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map((em: any) => (
            <div key={em.empresaeventoId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  {em.urlFotoPerfil ? (
                    <img
                      src={em.urlFotoPerfil}
                      alt={em.nombre}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-[#449D3A]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{em.nombre}</h3>
                    {em.rubro && <p className="text-xs text-gray-500 mt-0.5 truncate">{em.rubro}</p>}
                  </div>
                </div>

                {em.descripcion && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{em.descripcion}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-4">
                  {(em.ciudad || em.pais) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[em.ciudad, em.pais].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {em.sitioWeb && (
                    <a href={em.sitioWeb} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-[#449D3A] transition-colors">
                      <Globe className="w-3 h-3" />
                      Web
                    </a>
                  )}
                </div>

                <Link
                  href={`/empresa/solicitudes?nueva=1&receptoraId=${em.empresaeventoId}&receptoraNombre=${encodeURIComponent(em.nombre)}`}
                  className="w-full flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Solicitar reunión
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
