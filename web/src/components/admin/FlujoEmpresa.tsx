"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Pencil, Plus, Trash2, TrendingUp, Upload, X } from "lucide-react";
import { useModal } from "@/components/ui/Modal";
import ImagenLightbox from "@/components/ui/ImagenLightbox";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type Mejora = { id: number; origen_id: number; destino_id: number; costo: number; urlQR: string };
const bs = (n: number | string) => `Bs. ${Number(n).toLocaleString("es-BO")}`;

// Paquetes de empresa ordenados de menor a mayor costo; entre cada par de
// paquetes seguidos va el espacio para configurar la mejora (costo + QR de pago).
export default function FlujoEmpresa({ paquetes, eventoId, tarjeta }: {
  paquetes: any[]; eventoId: number | null; tarjeta: (p: any) => React.ReactNode;
}) {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const fileRef = useRef<HTMLInputElement>(null);
  const guardandoRef = useRef(false);

  const empresa = paquetes.filter((p) => p.tipoPaquete === "EMPRESA").sort((a, b) => Number(a.costo) - Number(b.costo));

  const [mejoras, setMejoras] = useState<Mejora[]>([]);
  const [par, setPar] = useState<{ origen: any; destino: any; mejora: Mejora | null } | null>(null);
  const [costo, setCosto] = useState("");
  const [urlQR, setUrlQR] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/paquetes/mejoras${eventoId ? `?eventoId=${eventoId}` : ""}`);
      const data = res.ok ? await res.json() : [];
      setMejoras(Array.isArray(data) ? data : []);
    } catch { setMejoras([]); }
  }, [eventoId]);
  useEffect(() => { cargar(); }, [cargar, paquetes.length]);

  const mejoraEntre = (o: any, d: any) => mejoras.find((m) => m.origen_id === o.id && m.destino_id === d.id) ?? null;

  const abrir = (origen: any, destino: any) => {
    const mejora = mejoraEntre(origen, destino);
    setPar({ origen, destino, mejora });
    setCosto(mejora ? String(mejora.costo) : "");
    setUrlQR(mejora?.urlQR ?? "");
  };

  const subirQR = async (file: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/admin/imagenes/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.message || "No se pudo subir la imagen.");
      setUrlQR(data.url);
    } catch (e: any) {
      showError("Error al subir", e.message);
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    if (!par) return;
    if (costo.trim() === "" || !(Number(costo) >= 0)) return showError("Falta un dato", "Indica cuánto debe pagar la empresa por la mejora.");
    if (!urlQR) return showError("Falta un dato", "Sube el QR de pago de esta mejora.");
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const res = await fetch(par.mejora ? `${API}/admin/paquetes/mejoras/${par.mejora.id}` : `${API}/admin/paquetes/mejoras`, {
        method: par.mejora ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origenId: par.origen.id, destinoId: par.destino.id, costo: Number(costo), urlQR }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar.");
      setPar(null);
      await cargar();
      showSuccess("Mejora guardada", `Las empresas con "${par.origen.nombre}" ya pueden pedir pasar a "${par.destino.nombre}".`);
    } catch (e: any) {
      showError("No se pudo guardar", e.message);
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const quitar = (o: any, d: any, m: Mejora) =>
    showConfirm("Quitar mejora", `¿Quitar la mejora de "${o.nombre}" a "${d.nombre}"? Las empresas dejarán de verla.`, async () => {
      try {
        const res = await fetch(`${API}/admin/paquetes/mejoras/${m.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "No se pudo quitar.");
        await cargar();
      } catch (e: any) {
        showError("No se pudo quitar", e.message);
      }
    });

  if (empresa.length === 0) return null;

  return (
    <div>
      {ModalComponent}
      <div className="flex items-start gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#449D3A] mt-0.5 shrink-0" />
        <p className="text-sm text-gray-500">
          Paquetes de empresa de menor a mayor. Entre dos paquetes puedes añadir el <b>QR de mejora</b>: lo que paga una
          empresa para pasar del primero al segundo. Sin él, la empresa no verá la opción de mejorar.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 lg:overflow-x-auto pb-2">
        {empresa.map((p, i) => {
          const sig = empresa[i + 1];
          const m = sig ? mejoraEntre(p, sig) : null;
          return (
            <React.Fragment key={p.id}>
              <div className="lg:w-80 lg:shrink-0 flex flex-col [&>div]:flex-1">{tarjeta(p)}</div>
              {sig && (
                <div className="lg:w-52 lg:shrink-0 flex flex-col items-center justify-center text-center gap-2 rounded-2xl border border-dashed border-[#449D3A]/40 bg-green-50/40 p-4">
                  <ArrowRight className="w-5 h-5 text-[#449D3A] hidden lg:block" />
                  <ArrowDown className="w-5 h-5 text-[#449D3A] lg:hidden" />
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Mejora</p>
                  <p className="text-xs text-gray-600 font-semibold">{p.nombre} → {sig.nombre}</p>
                  {m ? (
                    <>
                      <p className="text-xl font-extrabold text-[#449D3A]">{bs(m.costo)}</p>
                      <ImagenLightbox src={m.urlQR} alt="QR de mejora" className="w-16 h-16 border border-gray-200 rounded-xl bg-white p-1" />
                      <div className="flex gap-1">
                        <button onClick={() => abrir(p, sig)} title="Editar mejora" className="p-2 rounded-lg text-gray-500 hover:bg-white">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => quitar(p, sig, m)} title="Quitar mejora" className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => abrir(p, sig)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#449D3A] bg-white px-3 py-2 text-xs font-bold text-[#449D3A] hover:bg-green-50">
                      <Plus className="w-4 h-4" /> Añadir QR de mejora
                    </button>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {par && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-gray-900">{par.mejora ? "Editar mejora" : "Añadir mejora"}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{par.origen.nombre} ({bs(par.origen.costo)}) → {par.destino.nombre} ({bs(par.destino.costo)})</p>
              </div>
              <button onClick={() => setPar(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Costo de la mejora (Bs.) <span className="text-red-500">*</span></label>
                <input type="number" min={0} value={costo} onChange={(e) => setCosto(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" placeholder="100" />
                <p className="text-[11px] text-gray-400 mt-1">Diferencia de precio entre ambos paquetes: {bs(Number(par.destino.costo) - Number(par.origen.costo))}.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">QR de pago de la mejora <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-3">
                  {urlQR && <ImagenLightbox src={urlQR} alt="QR de mejora" className="w-16 h-16 border border-gray-200 rounded-xl bg-white p-1" />}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) subirQR(f); e.target.value = ""; }} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendo}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    <Upload className="w-4 h-4" /> {subiendo ? "Subiendo…" : urlQR ? "Cambiar QR" : "Subir QR"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setPar(null)} disabled={guardando}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2.5 bg-[#449D3A] hover:bg-[#367d2e] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {guardando ? "Guardando…" : "Guardar mejora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
