"use client";

import { useEffect, useState } from "react";
import { Building2, Sparkles } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
type EmpresaOportunidad = { empresaeventoId: number; nombre: string; codigo?: string | null; rubro?: string | null };
type Oportunidad = { empresaA: EmpresaOportunidad; empresaB: EmpresaOportunidad; motivos: string[] };

export default function OportunidadesStaff() {
  const [items, setItems] = useState<Oportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${API}/staff/oportunidades`).then(async (r) => {
      const data = await r.json(); if (!r.ok) throw new Error(data?.message || "No se pudieron cargar las coincidencias."); return data;
    }).then((data) => setItems(Array.isArray(data) ? data : [])).catch((e) => setError(e.message)).finally(() => setCargando(false));
  }, []);
  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><Sparkles className="h-6 w-6 text-[#449D3A]" />Oportunidades entre empresas</h1><p className="mt-1 text-sm text-gray-500">Sugerencias para que el equipo conecte empresas con oferta, demanda o intereses compatibles.</p></div>
    {cargando ? <div className="py-20 text-center text-sm text-gray-400">Analizando coincidencias…</div> : error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">No se encontraron coincidencias con las fichas actuales.</div> : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <article key={`${item.empresaA.empresaeventoId}-${item.empresaB.empresaeventoId}`} className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><Empresa empresa={item.empresaA} /><Sparkles className="h-5 w-5 text-amber-500" /><Empresa empresa={item.empresaB} /></div>
      <div className="mt-4 space-y-1.5">{item.motivos.map((motivo: string, i: number) => <p key={i} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">{motivo}</p>)}</div>
    </article>)}</div>}
  </div>;
}

function Empresa({ empresa }: { empresa: EmpresaOportunidad }) {
  return <div className="min-w-0 text-center"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50"><Building2 className="h-5 w-5 text-[#449D3A]" /></div><p className="truncate text-sm font-extrabold text-gray-900">{empresa.nombre}</p><p className="text-[10px] font-bold text-gray-400">{empresa.codigo || "Sin código"}</p><p className="truncate text-xs text-gray-500">{empresa.rubro}</p></div>;
}
