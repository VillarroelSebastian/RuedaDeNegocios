"use client";
import React, { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { RUBROS } from "@/lib/rubros";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A]";
const personaVacia = () => ({ nombres: "", apellidoPaterno: "", apellidoMaterno: "", cargo: "", correo: "", telefono: "" });
const empresaVacia = () => ({ nombre: "", rubro: "", correoCorporativo: "", telefonoWhatsapp: "", ciudadNombre: "", paisNombre: "Bolivia" });

// Alta directa: crea la empresa y sus participantes y la deja habilitada sin
// comprobante de pago. Las credenciales de acceso se envían por correo.
export default function NuevaEmpresaModal({ abierto, onClose, onCreada }: { abierto: boolean; onClose: () => void; onCreada: (mensaje: string) => void }) {
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [paqueteId, setPaqueteId] = useState<number | "">("");
  const [empresa, setEmpresa] = useState(empresaVacia());
  const [personas, setPersonas] = useState([personaVacia()]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;
    fetch(`${API}/public/paquetes?tipo=EMPRESA`).then((r) => r.json()).then((d) => setPaquetes(Array.isArray(d) ? d : [])).catch(() => setPaquetes([]));
  }, [abierto]);

  if (!abierto) return null;
  const paquete = paquetes.find((p) => p.id === paqueteId);
  const maxPersonas = Math.max(1, paquete?.credencialesIncluidas ?? 1);
  const setP = (i: number, campo: string, valor: string) => setPersonas((prev) => prev.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

  const guardar = async () => {
    setError("");
    if (!paqueteId) return setError("Selecciona un paquete.");
    if (!empresa.nombre.trim() || !empresa.rubro || !empresa.correoCorporativo.trim() || !empresa.telefonoWhatsapp.trim())
      return setError("Completa nombre, rubro, correo y teléfono de la empresa.");
    if (personas.some((p) => !p.nombres.trim() || !p.apellidoPaterno.trim() || !p.correo.trim() || !p.telefono.trim()))
      return setError("Cada participante necesita nombres, apellido paterno, correo y teléfono.");
    setEnviando(true);
    try {
      const res = await fetch(`${API}/admin/empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: { ...empresa, nombre: empresa.nombre.trim(), ciudadNombre: empresa.ciudadNombre.trim() || "Trinidad" },
          participacion: { paquete_id: paqueteId },
          participantes: personas.map((p, i) => ({ ...p, esResponsable: i === 0 })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(Array.isArray(data?.message) ? data.message.join(" ") : data?.message || "No se pudo crear la empresa.");
      const aviso = data.correosFallidos?.length
        ? ` No se pudo enviar el correo a: ${data.correosFallidos.join(", ")}. Usa "Generar contraseña" en sus participantes.`
        : " Las credenciales se enviaron por correo.";
      setEmpresa(empresaVacia());
      setPersonas([personaVacia()]);
      setPaqueteId("");
      onCreada(`Empresa creada y habilitada.${aviso}`);
      onClose();
    } catch (e: any) {
      setError(e.message || "No se pudo crear la empresa.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div><h2 className="text-lg font-bold text-gray-900">Nueva empresa</h2><p className="text-xs text-gray-500">Se crea habilitada, sin comprobante de pago.</p></div>
          <button onClick={onClose} aria-label="Cerrar"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block text-sm font-semibold text-gray-700">Paquete
            <select value={paqueteId} onChange={(e) => { setPaqueteId(e.target.value ? Number(e.target.value) : ""); setPersonas((prev) => prev.slice(0, 1)); }} className={`${inputCls} mt-1`}>
              <option value="">Selecciona un paquete…</option>
              {paquetes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — Bs {Number(p.costo).toLocaleString("es-BO")}</option>)}
            </select>
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Nombre de la empresa" maxLength={55} value={empresa.nombre} onChange={(e) => setEmpresa({ ...empresa, nombre: e.target.value })} />
            <select className={inputCls} value={empresa.rubro} onChange={(e) => setEmpresa({ ...empresa, rubro: e.target.value })}>
              <option value="">Rubro…</option>{RUBROS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className={inputCls} type="email" placeholder="Correo corporativo" value={empresa.correoCorporativo} onChange={(e) => setEmpresa({ ...empresa, correoCorporativo: e.target.value })} />
            <input className={inputCls} placeholder="Teléfono / WhatsApp" value={empresa.telefonoWhatsapp} onChange={(e) => setEmpresa({ ...empresa, telefonoWhatsapp: e.target.value })} />
            <input className={inputCls} placeholder="País" value={empresa.paisNombre} onChange={(e) => setEmpresa({ ...empresa, paisNombre: e.target.value })} />
            <input className={inputCls} placeholder="Ciudad (por defecto Trinidad)" value={empresa.ciudadNombre} onChange={(e) => setEmpresa({ ...empresa, ciudadNombre: e.target.value })} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-700">Participantes <span className="font-normal text-gray-400">(el primero es el encargado{paquete ? `, máximo ${maxPersonas}` : ""})</span></p>
            {personas.map((p, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 grid sm:grid-cols-2 gap-2 relative">
                <input className={inputCls} placeholder="Nombres" value={p.nombres} onChange={(e) => setP(i, "nombres", e.target.value)} />
                <input className={inputCls} placeholder="Apellido paterno" value={p.apellidoPaterno} onChange={(e) => setP(i, "apellidoPaterno", e.target.value)} />
                <input className={inputCls} placeholder="Apellido materno (opcional)" value={p.apellidoMaterno} onChange={(e) => setP(i, "apellidoMaterno", e.target.value)} />
                <input className={inputCls} placeholder="Cargo" value={p.cargo} onChange={(e) => setP(i, "cargo", e.target.value)} />
                <input className={inputCls} type="email" placeholder="Correo" value={p.correo} onChange={(e) => setP(i, "correo", e.target.value)} />
                <input className={inputCls} placeholder="Teléfono" value={p.telefono} onChange={(e) => setP(i, "telefono", e.target.value)} />
                {i > 0 && <button type="button" onClick={() => setPersonas((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1" aria-label="Quitar"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
              </div>
            ))}
            {personas.length < maxPersonas && <button type="button" onClick={() => setPersonas((prev) => [...prev, personaVacia()])} className="text-sm font-bold text-[#449D3A] flex items-center gap-1"><Plus className="w-4 h-4" />Agregar participante</button>}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600">Cancelar</button>
          <button onClick={guardar} disabled={enviando} className="px-5 py-2 rounded-lg bg-[#449D3A] text-white text-sm font-bold disabled:opacity-50">{enviando ? "Creando…" : "Crear y habilitar"}</button>
        </div>
      </div>
    </div>
  );
}
