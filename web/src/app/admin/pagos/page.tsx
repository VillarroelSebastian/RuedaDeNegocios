"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Eye, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API = 'http://localhost:3334';

const TABS = [
  { value: '', label: 'Todos', icon: CreditCard },
  { value: 'PENDIENTE', label: 'Pendientes', icon: Clock },
  { value: 'COMPLETADO', label: 'Completados', icon: CheckCircle },
  { value: 'OBSERVADO', label: 'Observados', icon: AlertCircle },
  { value: 'RECHAZADO', label: 'Rechazados', icon: XCircle },
];

export default function PagosPage() {
  const searchParams = useSearchParams();
  const defaultEstado = searchParams.get('estado') || '';
  const [tab, setTab] = useState(defaultEstado);
  const [pagos, setPagos] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(tab && { estado: tab }) });
      const res = await fetch(`${API}/admin/pagos?${params}`);
      const data = await res.json();
      setPagos(data.data || []);
      setTotal(data.total || 0);
    } catch { setPagos([]); }
    finally { setLoading(false); }
  }, [tab, page]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);
  useEffect(() => { setPage(1); }, [tab]);

  const badgeEstado = (estado: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      COMPLETADO: { cls: 'bg-green-100 text-green-700', label: 'Pagado' },
      PENDIENTE: { cls: 'bg-orange-100 text-orange-700', label: 'Pendiente' },
      OBSERVADO: { cls: 'bg-yellow-100 text-yellow-700', label: 'Observado' },
      RECHAZADO: { cls: 'bg-red-100 text-red-700', label: 'Rechazado' },
    };
    const b = map[estado] || { cls: 'bg-gray-100 text-gray-600', label: estado };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${b.cls}`}>{b.label}</span>;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verificación de Pagos</h1>
        <p className="text-sm text-gray-500 mt-1">Revisa y aprueba los comprobantes de pago de las empresas inscritas.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Evento</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Participantes</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monto Pagado</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fecha Envío</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => <td key={j} className="py-4 px-5"><div className="h-4 bg-gray-200 rounded" /></td>)}
                  </tr>
                ))
              ) : pagos.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">No hay pagos en esta categoría</td></tr>
              ) : (
                pagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{pago.empresa?.nombre}</p>
                        <p className="text-[11px] text-gray-400">{pago.empresa?.ciudad?.nombre} · {pago.empresa?.rubro}</p>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-gray-600">{pago.evento?.nombre}</td>
                    <td className="py-4 px-5 text-sm text-gray-600">{pago.numeroParticipantes}</td>
                    <td className="py-4 px-5 text-sm font-semibold text-gray-900">
                      {pago.montoPagado ? `${Number(pago.montoPagado).toLocaleString('es-BO')} BOB` : '—'}
                    </td>
                    <td className="py-4 px-5 text-sm text-gray-500">
                      {pago.fechaHoraEnvioComprobante
                        ? new Date(pago.fechaHoraEnvioComprobante).toLocaleDateString('es-BO')
                        : '—'}
                    </td>
                    <td className="py-4 px-5">{badgeEstado(pago.estadoVerificacionPago)}</td>
                    <td className="py-4 px-5">
                      <Link href={`/admin/pagos/${pago.id}`}>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#449D3A] border border-[#449D3A] hover:bg-green-50 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> Verificar
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} de {total} pagos
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold ${page === i + 1 ? 'bg-[#449D3A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
