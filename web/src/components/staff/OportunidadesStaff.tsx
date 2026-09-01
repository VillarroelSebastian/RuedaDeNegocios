"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const PAGE_SIZE = 12;

type EmpresaOportunidad = {
  empresaeventoId: number;
  nombre: string;
  codigo?: string | null;
  rubro?: string | null;
};
type Oportunidad = { empresaA: EmpresaOportunidad; empresaB: EmpresaOportunidad; motivos: string[] };

function textoBusqueda(item: Oportunidad) {
  return [
    item.empresaA.nombre, item.empresaA.codigo, item.empresaA.rubro,
    item.empresaB.nombre, item.empresaB.codigo, item.empresaB.rubro,
    ...item.motivos,
  ].filter(Boolean).join(" ").toLocaleLowerCase("es");
}

export default function OportunidadesStaff() {
  const [items, setItems] = useState<Oportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [rubro, setRubro] = useState("TODOS");
  const [orden, setOrden] = useState<"RELEVANCIA" | "ALFABETICO">("RELEVANCIA");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    fetch(`${API}/staff/oportunidades`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || "No se pudieron cargar las coincidencias.");
      return data;
    }).then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const rubros = useMemo(() => [...new Set(items.flatMap((item) => [item.empresaA.rubro, item.empresaB.rubro]).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "es")), [items]);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return items
      .filter((item) => !q || textoBusqueda(item).includes(q))
      .filter((item) => rubro === "TODOS" || item.empresaA.rubro === rubro || item.empresaB.rubro === rubro)
      .sort((a, b) => orden === "ALFABETICO"
        ? a.empresaA.nombre.localeCompare(b.empresaA.nombre, "es") || a.empresaB.nombre.localeCompare(b.empresaB.nombre, "es")
        : b.motivos.length - a.motivos.length || a.empresaA.nombre.localeCompare(b.empresaA.nombre, "es"));
  }, [items, busqueda, rubro, orden]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><Sparkles className="h-6 w-6 text-[#449D3A]" />Oportunidades entre empresas</h1>
      <p className="mt-1 text-sm text-gray-500">Mejores conexiones sugeridas según oferta, demanda e intereses. La lista prioriza calidad y cobertura, no todas las combinaciones posibles.</p>
    </div>

    {!cargando && !error && items.length > 0 && <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} placeholder="Buscar por empresa, código, rubro o motivo..." className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-[#449D3A] focus:outline-none focus:ring-2 focus:ring-green-100" />
      </label>
      <select value={rubro} onChange={(e) => { setRubro(e.target.value); setPagina(1); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#449D3A] focus:outline-none focus:ring-2 focus:ring-green-100">
        <option value="TODOS">Todos los rubros</option>
        {rubros.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={orden} onChange={(e) => { setOrden(e.target.value as typeof orden); setPagina(1); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#449D3A] focus:outline-none focus:ring-2 focus:ring-green-100">
        <option value="RELEVANCIA">Más relevantes</option>
        <option value="ALFABETICO">Alfabéticamente</option>
      </select>
    </div>}

    {cargando ? <div className="py-20 text-center text-sm text-gray-400">Analizando coincidencias…</div>
      : error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      : items.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">No se encontraron coincidencias con las fichas actuales.</div>
      : filtrados.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">No hay oportunidades que coincidan con los filtros.</div>
      : <>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filtrados.length} recomendación(es) priorizada(s)</span>
          <span>Página {paginaActual} de {totalPaginas}</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{visibles.map((item) => <article key={`${item.empresaA.empresaeventoId}-${item.empresaB.empresaeventoId}`} className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><Empresa empresa={item.empresaA} /><Sparkles className="h-5 w-5 text-amber-500" /><Empresa empresa={item.empresaB} /></div>
          <div className="mt-4 space-y-1.5">{item.motivos.map((motivo, i) => <p key={i} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">{motivo}</p>)}</div>
        </article>)}</div>
        {totalPaginas > 1 && <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Anterior</button>
          <span className="text-sm font-semibold text-gray-500">{paginaActual} / {totalPaginas}</span>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40">Siguiente<ChevronRight className="h-4 w-4" /></button>
        </div>}
      </>}
  </div>;
}

function Empresa({ empresa }: { empresa: EmpresaOportunidad }) {
  return <div className="min-w-0 text-center"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50"><Building2 className="h-5 w-5 text-[#449D3A]" /></div><p className="truncate text-sm font-extrabold text-gray-900" title={empresa.nombre}>{empresa.nombre}</p><p className="text-[10px] font-bold text-gray-400">{empresa.codigo || "Sin código"}</p><p className="truncate text-xs text-gray-500" title={empresa.rubro ?? ""}>{empresa.rubro}</p></div>;
}
