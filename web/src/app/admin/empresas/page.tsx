"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building2, Users, Eye, Trash2, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { useModal } from '@/components/ui/Modal';

const API = 'http://localhost:3334';

const ESTADOS_PAGO = [
  { value: '', label: 'Todos los estados' },
  { value: 'COMPLETADO', label: 'Pagado' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'SIN_REGISTRO', label: 'Sin registro' },
];

/* ── Participants Modal ──────────────────────────────────────── */
function ParticipantesModal({ empresa, onClose }: { empresa: { id: number; nombre: string } | null; onClose: () => void }) {
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresa) return;
    fetch(`${API}/admin/empresas/${empresa.id}/participantes`)
      .then(r => r.json())
      .then(data => setParticipantes(Array.isArray(data) ? data : []))
      .catch(() => setParticipantes([]))
      .finally(() => setLoading(false));
  }, [empresa]);

  if (!empresa) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Participantes</h2>
            <p className="text-sm text-gray-500 mt-0.5">{empresa.nombre}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : participantes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay participantes registrados</div>
          ) : (
            <div className="space-y-3">
              {participantes.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                      {p.nombres?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{p.nombres} {p.apellidoPaterno}</p>
                      <p className="text-xs text-gray-500">{p.cargo} · {p.correo}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.esResponsable && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Responsable</span>
                    )}
                    <span className={`text-[10px] font-semibold ${p.estaActivo ? 'text-gray-400' : 'text-red-400'}`}>
                      {p.estaActivo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          {participantes.length} participante{participantes.length !== 1 ? 's' : ''} registrado{participantes.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function EmpresasPage() {
  const { modalState, showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [estadoPago, setEstadoPago] = useState('');
  const [rubro, setRubro] = useState('');
  const [participantesEmpresa, setParticipantesEmpresa] = useState<{ id: number; nombre: string } | null>(null);
  const limit = 10;

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(estadoPago && { estadoPago }),
        ...(rubro && { rubro }),
      });
      const res = await fetch(`${API}/admin/empresas?${params}`);
      const data = await res.json();
      setEmpresas(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, estadoPago, rubro]);

  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

  const handleDelete = (id: number, nombre: string) => {
    showConfirm(
      `¿Eliminar empresa "${nombre}"?`,
      'Esta acción desactivará la empresa del sistema.',
      async () => {
        try {
          await fetch(`${API}/admin/empresas/${id}`, { method: 'DELETE' });
          showSuccess('Empresa eliminada', 'La empresa fue desactivada correctamente.');
          fetchEmpresas();
        } catch {
          showError('Error', 'No se pudo eliminar la empresa.');
        }
      }
    );
  };

  const badgePago = (estado: string) => {
    const map: Record<string, string> = {
      COMPLETADO: 'bg-green-100 text-green-700',
      PENDIENTE: 'bg-orange-100 text-orange-700',
      OBSERVADO: 'bg-yellow-100 text-yellow-700',
      SIN_REGISTRO: 'bg-gray-100 text-gray-500',
    };
    const labels: Record<string, string> = {
      COMPLETADO: 'Pagado', PENDIENTE: 'Pendiente', OBSERVADO: 'Observado', SIN_REGISTRO: 'Sin registro',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${map[estado] || 'bg-gray-100 text-gray-500'}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  const badgeAcceso = (estado: string) => {
    const isHab = estado === 'HABILITADO';
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isHab ? 'text-green-600' : 'text-gray-400'}`}>
        <span className={`w-2 h-2 rounded-full ${isHab ? 'bg-green-500' : 'bg-gray-300'}`} />
        {isHab ? 'Habilitado' : 'No habilitado'}
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ModalComponent />
      <ParticipantesModal empresa={participantesEmpresa} onClose={() => setParticipantesEmpresa(null)} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empresas registradas</h1>
        <p className="text-sm text-gray-500 mt-1">Consulta las empresas inscritas en el evento y su estado de habilitación.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nombre de empresa..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A] bg-gray-50"
            />
          </div>
          <select
            value={estadoPago}
            onChange={(e) => { setEstadoPago(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#449D3A] min-w-40"
          >
            {ESTADOS_PAGO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <input
            value={rubro}
            onChange={(e) => { setRubro(e.target.value); setPage(1); }}
            placeholder="Filtrar por sector..."
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#449D3A] min-w-40"
          />
          {(search || estadoPago || rubro) && (
            <button
              onClick={() => { setSearch(''); setEstadoPago(''); setRubro(''); setPage(1); }}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <Filter className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sector / Rubro</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ciudad</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Participantes</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado de Pago</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado de Acceso</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="py-4 px-5"><div className="h-4 bg-gray-200 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : empresas.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">No se encontraron empresas</td></tr>
              ) : (
                empresas.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {emp.urlFotoPerfil
                            ? <img src={emp.urlFotoPerfil} alt="" className="w-full h-full object-contain" />
                            : <Building2 className="w-5 h-5 text-green-600" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{emp.nombre}</p>
                          <p className="text-[11px] text-gray-400">ID: {emp.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-gray-600">{emp.rubro}</td>
                    <td className="py-4 px-5 text-sm text-gray-600">{emp.ciudad}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        {emp.numeroParticipantes} participantes
                      </div>
                    </td>
                    <td className="py-4 px-5">{badgePago(emp.estadoVerificacionPago)}</td>
                    <td className="py-4 px-5">{badgeAcceso(emp.estadoHabilitacionAcceso)}</td>
                    <td className="py-4 px-5 text-sm text-gray-500">
                      {new Date(emp.fechaCreacion).toLocaleDateString('es-BO')}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setParticipantesEmpresa({ id: emp.id, nombre: emp.nombre })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Ver participantes"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        {emp.empresaEventoId && (
                          <a href={`/admin/pagos/${emp.empresaEventoId}`}>
                            <button className="p-1.5 rounded-lg text-gray-400 hover:text-[#449D3A] hover:bg-green-50 transition-colors" title="Ver pago">
                              <Eye className="w-4 h-4" />
                            </button>
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(emp.id, emp.nombre)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} de {total} empresas
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold ${page === p ? 'bg-[#449D3A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
