"use client";
import React, { useState, useEffect } from 'react';
import { Newspaper, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';
const PAGE_SIZE = 5;

const TIPO_CFG: Record<string, { badge: string; label: string }> = {
  COMUNICADO:   { badge: 'bg-blue-100 text-blue-700',   label: 'Comunicado' },
  EVENTO:       { badge: 'bg-green-100 text-green-700', label: 'Evento' },
  ACTUALIZACIÓN:{ badge: 'bg-orange-100 text-orange-700',label: 'Actualización' },
};

function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function NoticiaCard({ noticia }: { noticia: any }) {
  const [expanded, setExpanded] = useState(false);
  const tipoCfg = TIPO_CFG[noticia.tipoNoticia] ?? { badge: 'bg-gray-100 text-gray-600', label: noticia.tipoNoticia ?? 'Noticia' };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="flex gap-0">
        {/* Image */}
        <div className="shrink-0 w-36 sm:w-48">
          {noticia.urlImagenNoticia ? (
            <img
              src={noticia.urlImagenNoticia}
              alt={noticia.tituloNoticia}
              className="w-full h-full object-contain bg-gray-50"
              style={{ minHeight: '120px', maxHeight: '160px' }}
            />
          ) : (
            <div className="w-full flex items-center justify-center bg-gray-50" style={{ minHeight: '120px' }}>
              <Newspaper className="w-10 h-10 text-gray-200" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${tipoCfg.badge}`}>
              {tipoCfg.label}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
              <Calendar className="w-3 h-3" />
              {fmtDatetime(noticia.fechaCreacion)}
            </span>
          </div>

          <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight">{noticia.tituloNoticia}</h3>

          <p className={`text-sm text-gray-600 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
            {noticia.contenidoNoticia}
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[#449D3A] text-xs font-semibold hover:text-[#367d2e] transition-colors"
          >
            {expanded ? (
              <>Mostrar menos <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Leer más <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TecnicoNoticiasPage() {
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/tecnico/noticias`);
        const data = await res.json();
        setNoticias(Array.isArray(data) ? data : (data?.noticias ?? []));
      } catch {
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const shown = noticias.slice(0, visible);
  const hasMore = visible < noticias.length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-[#449D3A]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Noticias del evento</h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          Comunicados importantes y actualizaciones para participantes y técnicos.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#449D3A]" />
        </div>
      ) : noticias.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Newspaper className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold">Sin noticias publicadas</p>
          <p className="text-gray-300 text-sm mt-1">Vuelve más tarde para ver actualizaciones</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {shown.map((noticia) => (
              <NoticiaCard key={noticia.id} noticia={noticia} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-5">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cargar más noticias ({noticias.length - visible} restantes)
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-4">
            Mostrando {shown.length} de {noticias.length} noticias
          </p>
        </>
      )}
    </div>
  );
}
