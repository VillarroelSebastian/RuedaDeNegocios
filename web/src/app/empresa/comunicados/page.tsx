"use client";

import React, { useState, useEffect } from "react";
import { Newspaper, Clock, Tag, AlertCircle, User } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString("es-BO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function tipoColor(tipo: string) {
  const map: Record<string, string> = {
    NOTICIA:       "bg-blue-100 text-blue-700",
    COMUNICADO:    "bg-purple-100 text-purple-700",
    AVISO:         "bg-amber-100 text-amber-700",
    CONVOCATORIA:  "bg-green-100 text-green-700",
  };
  return map[tipo] ?? "bg-gray-100 text-gray-600";
}

export default function EmpresaComunicadosPage() {
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('comunicadosLastSeen', new Date().toISOString());
  }, []);

  useEffect(() => {
    fetch(`${API}/empresa/comunicados`)
      .then((r) => r.json())
      .then((data) => setComunicados(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar los comunicados."))
      .finally(() => setLoading(false));
  }, []);

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
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Comunicados</h1>
        <span className="text-sm text-gray-400">{comunicados.length} publicaciones</span>
      </div>

      {comunicados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay comunicados publicados aún.</p>
        </div>
      ) : (
        comunicados.map((c: any) => (
          <article
            key={c.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {c.tipoNoticia && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${tipoColor(c.tipoNoticia)}`}>
                    {c.tipoNoticia}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                  <Clock className="w-3 h-3" />
                  {formatFecha(c.fechaHoraPublicacion)}
                </span>
              </div>

              <h2 className="font-extrabold text-gray-900 text-base mb-1">{c.titulo}</h2>

              {c.usuario && (
                <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                  <User className="w-3 h-3" />
                  {c.usuario.nombres} {c.usuario.apellidoPaterno}
                </p>
              )}

              <div
                className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap overflow-hidden transition-all ${
                  expandido === c.id ? "" : "max-h-20 relative"
                }`}
              >
                {expandido !== c.id && (
                  <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white" />
                )}
                {c.contenido}
              </div>

              {c.contenido && c.contenido.length > 150 && (
                <button
                  onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                  className="mt-2 text-xs font-bold text-[#449D3A] hover:underline"
                >
                  {expandido === c.id ? "Ver menos" : "Leer más"}
                </button>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
