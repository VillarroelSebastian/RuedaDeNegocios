"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Images, Upload, X, Trash2, Camera, User } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export type Foto = {
  id: number;
  urlFoto: string;
  descripcion: string | null;
  autorNombre: string;
  empresa_usuario_id: number | null;
  fechaCreacion: string;
};

/**
 * Repositorio de fotos del evento. Cualquier participante habilitado sube y
 * todos ven. `puedeSubir` viene de quién esté logueado; `esStaff` habilita la
 * moderación (borrar cualquier foto, no solo las propias).
 */
export default function GaleriaEvento({
  empresaUsuarioId,
  usuarioId,
  autorNombre,
  puedeSubir = false,
  esStaff = false,
  onError,
  onOk,
  soloTecnicos = false,
}: {
  empresaUsuarioId?: number | null;
  usuarioId?: number | null;
  autorNombre?: string;
  puedeSubir?: boolean;
  esStaff?: boolean;
  onError?: (m: string) => void;
  onOk?: (t: string, m: string) => void;
  soloTecnicos?: boolean;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [ampliada, setAmpliada] = useState<Foto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/public/galeria${soloTecnicos ? '?soloTecnicos=1' : ''}`);
      setFotos(res.ok ? await res.json() : []);
    } catch {
      onError?.("No se pudo cargar la galería.");
    } finally {
      setCargando(false);
    }
  }, [soloTecnicos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  // Dos pasos: la imagen va al backend y luego se registra en la galería.
  const subir = async (file: File) => {
    if (!file.type.startsWith("image/")) return onError?.("Solo se permiten imágenes.");
    if (file.size > 5 * 1024 * 1024) return onError?.("La imagen no puede pesar más de 5 MB.");

    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch(`${API}/admin/imagenes/upload`, { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok || !upData.url) throw new Error(upData?.message || "No se pudo subir la imagen.");

      const res = await fetch(`${API}/galeria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlFoto: upData.url,
          autorNombre: autorNombre || "Participante",
          empresa_usuario_id: empresaUsuarioId ?? null,
          usuario_id: usuarioId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo publicar la foto.");
      setFotos((prev) => [data, ...prev]);
      onOk?.("Foto publicada", "Ya es visible para todos los participantes.");
    } catch (e: any) {
      onError?.(e.message);
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const eliminar = async (foto: Foto) => {
    try {
      const params = new URLSearchParams();
      if (esStaff) params.set("esStaff", "1");
      if (empresaUsuarioId) params.set("empresa_usuario_id", String(empresaUsuarioId));
      const res = await fetch(`${API}/galeria/${foto.id}?${params}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo eliminar.");
      setFotos((prev) => prev.filter((f) => f.id !== foto.id));
      setAmpliada(null);
      onOk?.("Foto eliminada", "La foto se quitó de la galería.");
    } catch (e: any) {
      onError?.(e.message);
    }
  };

  const puedeBorrar = (f: Foto) =>
    esStaff || (empresaUsuarioId != null && f.empresa_usuario_id === empresaUsuarioId);

  return (
    <div>
      {puedeSubir && (
        <div className="mb-6">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={subiendo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#367d2e] text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
            {subiendo ? <><Upload className="w-4 h-4 animate-pulse" /> Subiendo…</> : <><Camera className="w-4 h-4" /> Subir una foto</>}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Saca una foto o elige una de tu galería. La verán todos los participantes.
          </p>
        </div>
      )}

      {cargando ? (
        <p className="text-center text-gray-400 py-10">Cargando fotos…</p>
      ) : fotos.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
          <Images className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">Todavía no hay fotos</p>
          <p className="text-sm text-gray-400 mt-1">
            {puedeSubir ? "Sé el primero en compartir un momento del evento." : "Pronto se llenará de momentos del evento."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {fotos.map((f) => (
            <button key={f.id} onClick={() => setAmpliada(f)}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-[#449D3A] transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.urlFoto} alt={f.descripcion ?? `Foto de ${f.autorNombre}`}
                loading="lazy" className="w-full h-full object-contain" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2 text-left opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="block text-[11px] font-semibold text-white truncate">{f.autorNombre}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Previsualización a pantalla completa */}
      {ampliada && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAmpliada(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ampliada.urlFoto} alt={ampliada.descripcion ?? ""}
              className="w-full max-h-[75vh] object-contain rounded-2xl" />
            <div className="mt-3 flex items-center justify-between gap-3 text-white">
              <p className="text-sm inline-flex items-center gap-1.5 min-w-0">
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{ampliada.autorNombre}</span>
              </p>
              {puedeBorrar(ampliada) && (
                <button onClick={() => eliminar(ampliada)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-300 hover:text-red-200 flex-shrink-0">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              )}
            </div>
            <button onClick={() => setAmpliada(null)} aria-label="Cerrar"
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-gray-800 flex items-center justify-center shadow-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
