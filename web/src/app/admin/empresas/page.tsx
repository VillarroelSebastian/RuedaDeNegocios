"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building2, Users, Eye, Trash2, ChevronLeft, ChevronRight, Filter, X, MessageSquare, KeyRound, CalendarClock } from 'lucide-react';
import ImagenLightbox from '@/components/ui/ImagenLightbox';
import { useModal } from '@/components/ui/Modal';
import { EnviarMensajeEmpresaModal } from '@/components/EnviarMensajeEmpresaModal';
import FichaEmpresaModal from '@/components/admin/FichaEmpresaModal';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

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
  const [credencial, setCredencial] = useState<{ correo: string; password: string } | null>(null);
  const [reiniciando, setReiniciando] = useState<number | null>(null);

  const reiniciarPassword = async (p: any) => {
    setReiniciando(p.usuarioId);
    try {
      const res = await fetch(`${API}/admin/participantes/${p.usuarioId}/password-temporal`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo cambiar la contraseña');
      setCredencial({ correo: data.correo, password: data.nuevaContrasenia });
    } catch (error: any) { setCredencial({ correo: p.correo, password: `ERROR: ${error.message}` }); }
    finally { setReiniciando(null); }
  };

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
          {credencial && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">Nueva contraseña temporal</p><p className="mt-1 break-all">{credencial.correo}</p><code className="mt-2 block rounded bg-white p-2 font-bold">{credencial.password}</code>
            <p className="mt-2 text-xs">Cópiala ahora: por seguridad la contraseña anterior no se puede ver y esta clave solo se muestra en este momento.</p>
          </div>}
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
                    {p.estaActivo && <button disabled={reiniciando === p.usuarioId} onClick={() => reiniciarPassword(p)} className="mt-1 inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1 text-[10px] font-bold text-amber-700 disabled:opacity-50"><KeyRound className="h-3 w-3" />Nueva clave</button>}
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

function AgendaEmpresaModal({ empresa, onClose }: { empresa: { eeId: number; nombre: string } | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!empresa) return;
    setData(null);
    fetch(`${API}/staff/empresas/${empresa.eeId}/agenda`).then((r) => r.json()).then(setData).catch(() => setData({ reuniones: [] }));
  }, [empresa]);
  if (!empresa) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
    <div className="mb-5 flex justify-between"><div><h2 className="text-lg font-bold">Agenda de {empresa.nombre}</h2><p className="text-sm text-gray-500">Reuniones del evento activo</p></div><button onClick={onClose}><X /></button></div>
    {!data ? <div className="py-12 text-center text-gray-400">Cargando…</div> : data.reuniones?.length === 0 ? <div className="py-12 text-center text-gray-400">No tiene reuniones registradas.</div> : <div className="space-y-3">{data.reuniones.map((r: any) => {
      const sol = r.solicitudreunion; const a = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa; const b = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
      const otra = sol?.empresaEvento_id === empresa.eeId ? b : a;
      return <div key={r.id} className="rounded-xl border border-gray-200 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{otra?.nombre ?? 'Empresa'}</p><span className="text-xs font-bold text-[#449D3A]">{r.estadoReunion}</span></div><p className="mt-1 text-sm text-gray-600">{new Date(r.fechaHoraInicioReunion).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })} · {r.mesa ? `Mesa ${r.mesa.numeroMesa}` : r.tipoReunion}</p></div>;
    })}</div>}
  </div></div>;
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function EmpresasPage() {
  const { modalState, showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const [fichaEmpresaId, setFichaEmpresaId] = useState<number | null>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [estadoPago, setEstadoPago] = useState('');
  const [rubro, setRubro] = useState('');
  const [participantesEmpresa, setParticipantesEmpresa] = useState<{ id: number; nombre: string } | null>(null);
  const [mensajeEmpresa, setMensajeEmpresa] = useState<{ eeId: number; nombre: string } | null>(null);
  const [agendaEmpresa, setAgendaEmpresa] = useState<{ eeId: number; nombre: string } | null>(null);
  const [adminUserId, setAdminUserId] = useState<number | null>(null);
  const limit = 10;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminUser');
      if (raw) setAdminUserId(JSON.parse(raw).id ?? null);
    } catch {}
  }, []);

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
          const res = await fetch(`${API}/admin/empresas/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || 'No se pudo desactivar la empresa.');
          showSuccess('Empresa eliminada', 'La empresa fue desactivada correctamente.');
          fetchEmpresas();
        } catch (e: any) {
          showError('Error', e.message || 'No se pudo eliminar la empresa.');
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
      <FichaEmpresaModal empresaId={fichaEmpresaId} onClose={() => setFichaEmpresaId(null)} />
      <AgendaEmpresaModal empresa={agendaEmpresa} onClose={() => setAgendaEmpresa(null)} />
      {mensajeEmpresa && adminUserId && (
        <EnviarMensajeEmpresaModal
          usuarioId={adminUserId}
          receptorEeId={mensajeEmpresa.eeId}
          empresaNombre={mensajeEmpresa.nombre}
          onClose={() => setMensajeEmpresa(null)}
        />
      )}

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
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Paquete</th>
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
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="py-4 px-5"><div className="h-4 bg-gray-200 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : empresas.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">No se encontraron empresas</td></tr>
              ) : (
                empresas.map((emp) => (
                  <tr key={emp.id}
                    onClick={() => setFichaEmpresaId(emp.id)}
                    title="Ver ficha completa"
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {emp.urlFotoPerfil
                            ? <ImagenLightbox src={emp.urlFotoPerfil} className="w-full h-full" />
                            : <Building2 className="w-5 h-5 text-green-600" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{emp.nombre}</p>
                          {emp.codigo
                            ? <p className="text-[11px] font-mono font-semibold text-[#449D3A]">{emp.codigo}</p>
                            : <p className="text-[11px] text-gray-400">ID: {emp.id}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-gray-600">{emp.rubro}</td>
                    <td className="py-4 px-5 text-sm text-gray-600">{emp.ciudad}</td>
                    <td className="py-4 px-5">
                      {emp.paquete ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{emp.paquete.nombre}</p>
                          <p className="text-[11px] text-gray-400">
                            Bs. {emp.paquete.costo} · {emp.paquete.credencialesIncluidas} cred.
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin paquete</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        {emp.participantesRegistrados ?? 0} de {emp.numeroParticipantes} cupos
                      </div>
                    </td>
                    <td className="py-4 px-5">{badgePago(emp.estadoVerificacionPago)}</td>
                    <td className="py-4 px-5">{badgeAcceso(emp.estadoHabilitacionAcceso)}</td>
                    <td className="py-4 px-5 text-sm text-gray-500">
                      {new Date(emp.fechaCreacion).toLocaleDateString('es-BO')}
                    </td>
                    <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
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
                        {emp.empresaEventoId && emp.estadoHabilitacionAcceso === 'HABILITADO' && adminUserId && (
                          <button
                            onClick={() => setMensajeEmpresa({ eeId: emp.empresaEventoId, nombre: emp.nombre })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                            title="Enviar mensaje"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        {emp.empresaEventoId && <button onClick={() => setAgendaEmpresa({ eeId: emp.empresaEventoId, nombre: emp.nombre })} className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50" title="Ver agenda"><CalendarClock className="h-4 w-4" /></button>}
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
