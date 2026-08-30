"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileText, Download, Printer, Building2, CalendarDays, Star, RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

const TIPOS = [
  { key: "empresas",   label: "Empresas participantes", Icon: Building2 },
  { key: "reuniones",  label: "Reuniones",              Icon: CalendarDays },
  { key: "resultados", label: "Resultados y acuerdos",  Icon: Star },
];

function exportarCSV(filas: any[], nombre: string) {
  if (filas.length === 0) return;
  const cols = Object.keys(filas[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(";"), ...filas.map((f) => cols.map((c) => escape(f[c])).join(";"))].join("\n");
  // BOM para que Excel abra bien los acentos
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesPage() {
  const [tipo, setTipo] = useState("empresas");
  const [filas, setFilas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/reportes?tipo=${tipo}`);
      const data = await res.json();
      setFilas(Array.isArray(data.filas) ? data.filas : []);
    } catch {
      setFilas([]);
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => { setFiltro(""); cargar(); }, [cargar]);

  const columnas = filas.length > 0 ? Object.keys(filas[0]) : [];
  const filtradas = filtro.trim()
    ? filas.filter((f) => Object.values(f).some((v) => String(v).toLowerCase().includes(filtro.toLowerCase())))
    : filas;

  return (
    <div className="report-print-area p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#449D3A]" />Reportes del evento
          </h1>
          <p className="text-sm text-gray-500 mt-1">Información consolidada de la rueda de negocios</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-xl">
            <RefreshCw className="w-4 h-4" />Actualizar
          </button>
          <button onClick={() => exportarCSV(filtradas, tipo)} disabled={filtradas.length === 0}
            className="flex items-center gap-2 text-sm font-bold text-white bg-[#449D3A] hover:bg-[#3a8531] px-4 py-2 rounded-xl disabled:opacity-50">
            <Download className="w-4 h-4" />Exportar CSV
          </button>
          <button onClick={() => window.print()} disabled={filtradas.length === 0}
            className="flex items-center gap-2 text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl disabled:opacity-50">
            <Printer className="w-4 h-4" />Imprimir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {TIPOS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTipo(key)}
            className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border transition-all ${
              tipo === key
                ? "bg-[#449D3A] text-white border-[#449D3A]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#449D3A]"
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Filtrar por cualquier columna..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full sm:w-80 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] print:hidden"
      />

      {/* Título para impresión */}
      <div className="hidden print:block">
        <h2 className="text-lg font-bold">Reporte: {TIPOS.find((t) => t.key === tipo)?.label}</h2>
        <p className="text-xs text-gray-500">Generado el {new Date().toLocaleDateString("es-BO")} — {filtradas.length} registros</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-sm text-gray-400">No hay datos para este reporte{filtro ? " con ese filtro" : ""}.</p>
        </div>
      ) : (
        <div className="report-table-wrap bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="report-table-scroll overflow-x-auto">
            <table className="report-table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {columnas.map((c) => (
                    <th key={c} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {c.replace(/([A-Z])/g, " $1").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map((f, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    {columnas.map((c) => (
                      <td key={c} className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-[280px] truncate" title={String(f[c])}>
                        {String(f[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 print:hidden">
            {filtradas.length} registro(s){filtro ? ` de ${filas.length}` : ""}
          </div>
        </div>
      )}
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 8mm; }
          body * { visibility: hidden !important; }
          .report-print-area, .report-print-area * { visibility: visible !important; }
          .report-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .report-table-wrap, .report-table-scroll {
            overflow: visible !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .report-table {
            width: 100% !important;
            table-layout: auto !important;
            font-size: 8px !important;
          }
          .report-table thead { display: table-header-group; }
          .report-table tr { break-inside: avoid; }
          .report-table th, .report-table td {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            max-width: none !important;
            overflow-wrap: anywhere !important;
            padding: 4px 5px !important;
          }
        }
      `}</style>
    </div>
  );
}
