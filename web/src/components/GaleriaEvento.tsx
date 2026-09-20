"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Images, Upload, X, Trash2, Camera, User, Star, Building2, Wrench } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export type Foto = {
  id: number;
  urlFoto: string;
  descripcion: string | null;
  autorNombre: string;
  empresa_usuario_id: number | null;
  usuario_id: number | null;
  visibleLanding: number;
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
}: {
  empresaUsuarioId?: number | null;
  usuarioId?: number | null;
  autorNombre?: string;
  puedeSubir?: boolean;
  esStaff?: boolean;
  onError?: (m: string) => void;
  onOk?: (t: string, m: string) => void;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [ampliada, setAmpliada] = useState<Foto | null>(null);
  const [actualizandoLanding, setActualizandoLanding] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      const ruta = (esStaff || empresaUsuarioId || puedeSubir) ? 'galeria' : 'public/galeria';
      const res = await fetch(`${API}/${ruta}`);
      setFotos(res.ok ? await res.json() : []);
    } catch {
      onError?.("No se pudo cargar la galería.");
    } finally {
      setCargando(false);
    }
  }, [esStaff, empresaUsuarioId, puedeSubir]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  // Dos pasos: la imagen va al backend y luego se registra en la galería.
  const subir = async (file: File) => {
    if (!file.type.startsWith("image/")) return onError?.("Solo se permiten imágenes.");
    if (file.size > 5 * 1024 * 1024) return onError?.("La imagen no puede pesar más de 5 MB.");

    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Las empresas no pueden llamar rutas /admin. El endpoint público aplica
      // las mismas validaciones de tipo, firma, dimensiones y tamaño del archivo.
      const uploadPath = esStaff || usuarioId ? "admin/imagenes/upload" : "public/imagenes/upload";
      const up = await fetch(`${API}/${uploadPath}`, { method: "POST", body: fd });
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
          descripcion: descripcion.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo publicar la foto.");
      setFotos((prev) => [data, ...prev]);
      setDescripcion("");
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

  const toggleLanding = async (foto: Foto) => {
    setActualizandoLanding(foto.id);
    try {
      const nuevo = foto.visibleLanding ? 0 : 1;
      const res = await fetch(`${API}/galeria/${foto.id}/landing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: nuevo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo actualizar.");
      setFotos((prev) => prev.map((f) => (f.id === foto.id ? { ...f, visibleLanding: nuevo } : f)));
      setAmpliada((prev) => (prev && prev.id === foto.id ? { ...prev, visibleLanding: nuevo } : prev));
      onOk?.(nuevo ? "Agregada al landing" : "Quitada del landing",
        nuevo ? "Esta foto ahora aparece en la página pública del evento." : "Esta foto ya no aparece en la página pública.");
    } catch (e: any) {
      onError?.(e.message);
    } finally {
      setActualizandoLanding(null);
    }
  };

  const puedeBorrar = (f: Foto) =>
    esStaff || (empresaUsuarioId != null && f.empresa_usuario_id === empresaUsuarioId);

  // Vista de staff: agrupa por quién subió cada foto para poder ubicar y
  // curar rápido lo que se muestra en el landing.
  const grupos = esStaff
    ? (() => {
        const map = new Map<string, { key: string; nombre: string; tipo: "EMPRESA" | "STAFF"; fotos: Foto[] }>();
        for (const f of fotos) {
          const key = f.empresa_usuario_id != null ? `eu-${f.empresa_usuario_id}` : `u-${f.usuario_id ?? "x"}`;
          if (!map.has(key)) map.set(key, { key, nombre: f.autorNombre, tipo: f.empresa_usuario_id != null ? "EMPRESA" : "STAFF", fotos: [] });
          map.get(key)!.fotos.push(f);
        }
        return Array.from(map.values()).sort((a, b) => b.fotos.length - a.fotos.length);
      })()
    : null;

  const fotosLanding = fotos.filter((f) => !!f.visibleLanding);

  return (
    <div>
      {puedeSubir && (
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
            Descripción (opcional)
          </label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value.slice(0, 305))}
            placeholder="Ej.: Encuentro entre productores y distribuidores"
            className="mb-3 w-full max-w-xl rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#449D3A] focus:outline-none focus:ring-2 focus:ring-[#449D3A]/20"
          />
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
      ) : esStaff && grupos ? (
        <div className="space-y-8">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-600">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
              </span>
              <p className="text-sm font-bold text-gray-900">En el landing ahora</p>
              <span className="text-xs font-semibold text-gray-400">{fotosLanding.length} foto(s)</span>
            </div>
            {fotosLanding.length === 0 ? (
              <div className="text-center py-10 bg-amber-50/60 border border-dashed border-amber-200 rounded-2xl">
                <Star className="w-8 h-8 text-amber-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Ninguna foto seleccionada todavía. Toca la estrella de una foto para agregarla aquí.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {fotosLanding.map((f) => (
                  <FotoCard key={f.id} f={f} onClick={() => setAmpliada(f)}
                    onToggleLanding={() => toggleLanding(f)} actualizando={actualizandoLanding === f.id} />
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mt-6 mb-1">Todas las fotos, por participante</p>
          </div>
          {grupos.map((g) => (
            <div key={g.key}>
              <div className="mb-3 flex items-center gap-2">
                {g.tipo === "EMPRESA"
                  ? <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700"><Building2 className="w-3.5 h-3.5" /></span>
                  : <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700"><Wrench className="w-3.5 h-3.5" /></span>
                }
                <p className="text-sm font-bold text-gray-900">{g.nombre}</p>
                <span className="text-xs font-semibold text-gray-400">{g.fotos.length} foto(s)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {g.fotos.map((f) => (
                  <FotoCard key={f.id} f={f} onClick={() => setAmpliada(f)}
                    onToggleLanding={() => toggleLanding(f)} actualizando={actualizandoLanding === f.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {fotos.map((f) => (
            <FotoCard key={f.id} f={f} onClick={() => setAmpliada(f)} />
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
              <span className="flex items-center gap-2 flex-shrink-0">
                {esStaff && (
                  <button onClick={() => toggleLanding(ampliada)} disabled={actualizandoLanding === ampliada.id}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-50 ${
                      ampliada.visibleLanding ? "text-amber-300 hover:text-amber-200" : "text-white/70 hover:text-white"
                    }`}>
                    <Star className={`w-4 h-4 ${ampliada.visibleLanding ? "fill-amber-300" : ""}`} />
                    {ampliada.visibleLanding ? "En el landing" : "Mostrar en landing"}
                  </button>
                )}
                {puedeBorrar(ampliada) && (
                  <button onClick={() => eliminar(ampliada)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-300 hover:text-red-200">
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                )}
              </span>
            </div>
            {ampliada.descripcion && <p className="mt-2 text-sm text-white/80">{ampliada.descripcion}</p>}
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

function FotoCard({
  f, onClick, onToggleLanding, actualizando,
}: {
  f: Foto;
  onClick: () => void;
  onToggleLanding?: () => void;
  actualizando?: boolean;
}) {
  return (
    <div className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-[#449D3A] transition-colors">
      <button onClick={onClick} className="absolute inset-0 w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.urlFoto} alt={f.descripcion ?? `Foto de ${f.autorNombre}`}
          loading="lazy" className="w-full h-full object-contain" />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2 text-left opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="block text-[11px] font-semibold text-white truncate">{f.autorNombre}</span>
        </span>
      </button>
      {!!f.visibleLanding && (
        <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-amber-400/95 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none">
          <Star className="w-2.5 h-2.5 fill-amber-950" /> Landing
        </span>
      )}
      {onToggleLanding && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLanding(); }}
          disabled={actualizando}
          title={f.visibleLanding ? "Quitar del landing" : "Mostrar en landing"}
          className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow disabled:opacity-50 ${
            f.visibleLanding ? "bg-amber-400 text-amber-950" : "bg-white/90 text-gray-500 hover:text-amber-500"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${f.visibleLanding ? "fill-amber-950" : ""}`} />
        </button>
      )}
    </div>
  );
}
