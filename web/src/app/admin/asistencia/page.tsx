"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Users, Building2, UserCheck, RefreshCw, Search, CheckCircle2, XCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ResumenCard({ titulo, color, bg, registrados, asistentes, sinAsistencia, subEtiqueta }: {
  titulo: string; color: string; bg: string; registrados: number; asistentes: number; sinAsistencia: number; subEtiqueta: string;
}) {
  const pct = registrados > 0 ? Math.round((asistentes / registrados) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-bold text-gray-900 mb-4">{titulo}</h3>
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="32" stroke="#f1f5f9" strokeWidth="10" fill="none" />
            <circle
              cx="40" cy="40" r="32" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 32}
              strokeDashoffset={2 * Math.PI * 32 * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 700ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-gray-900">{pct}%</div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-extrabold text-gray-900">{registrados}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{subEtiqueta}</p>
          </div>
          <div>
            <p className={`text-xl font-extrabold ${color === "#449D3A" ? "text-[#449D3A]" : "text-blue-600"}`}>{asistentes}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Asistieron</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-gray-400">{sinAsistencia}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Sin asistir</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AsistenciaPage() {
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "EMPRESA" | "FORO">("todos");

  const cargar = () => {
    setLoading(true);
    fetch(`${API}/admin/asistencia`)
      .then((r) => r.json())
      .then(setDatos)
      .catch(() => setDatos(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    const lista: any[] = datos?.listado ?? [];
    return lista.filter((p) => {
      if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
      if (!busqueda.trim()) return true;
      const termino = busqueda.toLowerCase();
      return p.nombre.toLowerCase().includes(termino) || (p.empresa ?? "").toLowerCase().includes(termino);
    });
  }, [datos, busqueda, filtroTipo]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-36 bg-gray-200 rounded-xl" />
            <div className="h-36 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">No se pudo cargar la asistencia.</p>
        <button onClick={cargar} className="mt-3 text-[#449D3A] font-semibold text-sm">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#449D3A]" /> Asistencia al evento
          </h1>
          <p className="text-sm text-gray-500 mt-1">Registrados frente a quienes tuvieron al menos un ingreso por QR, separado por empresa y Foro · Personal.</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 border border-gray-200 text-gray-600 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Resumen separado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <ResumenCard
          titulo="Empresas (participantes)"
          color="#449D3A" bg="bg-green-50"
          registrados={datos.empresa.registrados}
          asistentes={datos.empresa.asistentes}
          sinAsistencia={datos.empresa.sinAsistencia}
          subEtiqueta="Personas"
        />
        <ResumenCard
          titulo="Foro · Personal"
          color="#2563eb" bg="bg-blue-50"
          registrados={datos.foro.registrados}
          asistentes={datos.foro.asistentes}
          sinAsistencia={datos.foro.sinAsistencia}
          subEtiqueta="Registrados"
        />
      </div>

      {/* Empresas: registradas vs con al menos un asistente */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-1">Empresas con al menos un asistente</h3>
        <p className="text-xs text-gray-500 mb-4">Distinto de "personas": una empresa cuenta aquí si alguno de sus participantes ingresó.</p>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-gray-900">{datos.empresa.empresasRegistradas}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Empresas registradas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-[#449D3A]">{datos.empresa.empresasAsistentes}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Con asistencia</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-gray-400">{datos.empresa.empresasSinAsistencia}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Sin asistencia</p>
          </div>
        </div>
      </div>

      {/* Listado combinado con columna de tipo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Listado de participantes</h2>
            <p className="text-xs text-gray-500 mt-0.5">{filtrados.length} de {datos.listado.length} participante(s)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar nombre o empresa..."
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] w-56"
              />
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(["todos", "EMPRESA", "FORO"] as const).map((t) => (
                <button key={t} onClick={() => setFiltroTipo(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroTipo === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                  {t === "todos" ? "Todos" : t === "EMPRESA" ? "Empresa" : "Foro"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Asistencias</th>
                <th className="px-5 py-3">Última asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Sin resultados.</td></tr>
              ) : filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-semibold text-gray-800">{p.nombre}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      p.tipo === "FORO" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                    }`}>
                      {p.tipo === "FORO" ? <Users className="w-3 h-3 mr-1" /> : <Building2 className="w-3 h-3 mr-1" />}
                      {p.tipo === "FORO" ? "Foro" : "Empresa"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.empresa ?? "—"}</td>
                  <td className="px-5 py-3">
                    {p.cantidadAsistencias > 0 ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />{p.cantidadAsistencias}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <XCircle className="w-3.5 h-3.5" />0
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{fmtFecha(p.ultimaAsistencia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
