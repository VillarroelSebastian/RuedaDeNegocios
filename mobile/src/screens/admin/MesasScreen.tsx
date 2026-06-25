import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, Modal, Image, TextInput, Linking,
} from 'react-native';
import {
  RefreshCw, X, Clock, Users, Armchair,
  Building2, Video, MapPin, Link2, Search,
  Star, ChevronDown, ChevronUp, History,
  Play, Square, XCircle, UserCheck, Lock, Unlock,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

const ESTADO_MESA: Record<string, { label: string; color: string; bg: string; grid: string }> = {
  LIBRE:     { label: 'Libre',     color: '#15803d', bg: '#dcfce7', grid: GREEN     },
  RESERVADA: { label: 'Reservada', color: '#1d4ed8', bg: '#dbeafe', grid: '#3b82f6' },
  EN_USO:    { label: 'En uso',    color: '#c2410c', bg: '#ffedd5', grid: '#f97316' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
function minutesFromNow(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}
function elapsedMin(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

function StarRow({ value }: Readonly<{ value: number }>) {
  return (
    <View className="flex-row gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} size={11} color={s <= value ? '#f59e0b' : '#e5e7eb'} fill={s <= value ? '#f59e0b' : 'none'} />
      ))}
    </View>
  );
}

function CompanyRow({ empresa, isA }: Readonly<{ empresa: any; isA: boolean }>) {
  const bgColor = isA ? '#dcfce7' : '#dbeafe';
  const icColor = isA ? '#15803d' : '#2563eb';
  return (
    <View className="flex-row items-center gap-2 flex-1 min-w-0">
      {empresa?.urlFotoPerfil ? (
        <Image source={{ uri: empresa.urlFotoPerfil }} className="w-8 h-8 rounded-full shrink-0 border border-gray-100" resizeMode="contain" />
      ) : (
        <View className="w-8 h-8 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: bgColor }}>
          <Building2 color={icColor} size={14} />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>{empresa?.nombre ?? '—'}</Text>
        <Text className="text-[10px] text-gray-400" numberOfLines={1}>{empresa?.rubro ?? ''}</Text>
      </View>
    </View>
  );
}

function EvalBlock({ empresa, resultado, isA }: Readonly<{ empresa: any; resultado: any; isA: boolean }>) {
  const bgColor = isA ? '#f0fdf4' : '#eff6ff';
  const borderColor = isA ? '#bbf7d0' : '#bfdbfe';
  const icBg = isA ? '#dcfce7' : '#dbeafe';
  const icColor = isA ? '#15803d' : '#1d4ed8';

  return (
    <View className="rounded-xl p-3 gap-2" style={{ backgroundColor: bgColor, borderWidth: 1, borderColor }}>
      {/* Empresa header */}
      <View className="flex-row items-center gap-1.5">
        {empresa?.urlFotoPerfil ? (
          <Image source={{ uri: empresa.urlFotoPerfil }} style={{ width: 20, height: 20, borderRadius: 10 }} resizeMode="contain" />
        ) : (
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: icBg, alignItems: 'center', justifyContent: 'center' }}>
            <Building2 color={icColor} size={11} />
          </View>
        )}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1f2937' }} numberOfLines={1} className="flex-1">
          {empresa?.nombre ?? '—'}
        </Text>
      </View>

      {resultado ? (
        <>
          <View className="flex-row items-center gap-2 flex-wrap">
            <StarRow value={resultado.calificacionReunion} />
            <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600' }}>{resultado.calificacionReunion}/5</Text>
            {resultado.rangoAcuerdoComercial ? (
              <View className="ml-auto px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#fef3c7' }}>
                <Text style={{ color: '#b45309', fontSize: 9, fontWeight: '700' }} numberOfLines={1}>
                  {resultado.rangoAcuerdoComercial}
                </Text>
              </View>
            ) : null}
          </View>
          {resultado.observacionesPuntosTratados ? (
            <Text style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic', lineHeight: 14 }}>
              "{resultado.observacionesPuntosTratados}"
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>Evaluación pendiente</Text>
      )}
    </View>
  );
}

function HistorialRow({ r }: Readonly<{ r: any }>) {
  const [open, setOpen] = useState(false);
  const sol  = r.solicitudreunion;
  const eeA  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
  const eeB  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
  const ea   = eeA?.empresa;
  const eb   = eeB?.empresa;
  const resultados: any[] = r.resultadoreunion ?? [];
  const resA = resultados.find((res: any) => res.empresaeventoCalificadora_id === eeA?.id);
  const resB = resultados.find((res: any) => res.empresaeventoCalificadora_id === eeB?.id);
  const evalLabel = resA && resB ? '2 eval.' : (resA || resB) ? '1 eval.' : 'Sin eval.';

  return (
    <View className="border-b border-gray-50">
      <TouchableOpacity onPress={() => setOpen(!open)} className="px-4 py-3" activeOpacity={0.8}>
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg items-center justify-center shrink-0" style={{ backgroundColor: '#374151' }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 11 }}>
              {String(r.mesa?.numeroMesa ?? '?').padStart(2, '0')}
            </Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-xs font-semibold text-gray-800" numberOfLines={1}>
              {ea?.nombre ?? '—'}{' '}<Text className="text-gray-400 font-normal">vs</Text>{' '}{eb?.nombre ?? '—'}
            </Text>
            <Text className="text-[10px] text-gray-400">{fmtDT(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}</Text>
          </View>
          <View className="items-end gap-0.5 shrink-0">
            <View className="px-1.5 py-0.5 rounded" style={{
              backgroundColor: r.tipoReunion === 'VIRTUAL' ? '#eff6ff' : r.tipoReunion === 'MIXTA' ? '#f5f3ff' : '#ecfdf5',
            }}>
              <Text style={{
                color: r.tipoReunion === 'VIRTUAL' ? '#2563eb' : r.tipoReunion === 'MIXTA' ? '#7c3aed' : '#059669',
                fontSize: 9, fontWeight: '700',
              }}>{r.tipoReunion}</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: '600' }}>{evalLabel}</Text>
          </View>
          {open ? <ChevronUp color="#9ca3af" size={14} /> : <ChevronDown color="#9ca3af" size={14} />}
        </View>
      </TouchableOpacity>
      {open && (
        <View className="px-4 pb-4 bg-gray-50/60 gap-3">
          {r.observacionesReunion ? (
            <Text className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">"{r.observacionesReunion}"</Text>
          ) : null}
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Evaluaciones de encargados
          </Text>
          <EvalBlock empresa={ea} resultado={resA} isA={true} />
          <EvalBlock empresa={eb} resultado={resB} isA={false} />
        </View>
      )}
    </View>
  );
}

type Tab = 'mesas' | 'historial';
type FiltroEstado = 'TODAS' | 'LIBRE' | 'RESERVADA' | 'EN_USO' | 'INHABILITADA';

export default function MesasScreen() {
  const { show, hide, modal } = useModal();
  const showSuccess = (title: string, message: string) => show({ type: 'success', title, message });
  const showError   = (title: string, message: string) => show({ type: 'error',   title, message });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => show({ type: 'confirm', title, message, onConfirm });

  const [tab,          setTab]          = useState<Tab>('mesas');
  const [mesas,        setMesas]        = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filtro,       setFiltro]       = useState<FiltroEstado>('TODAS');
  const [reunionModal, setReunionModal] = useState<any | null>(null);
  const [asistentes,   setAsistentes]   = useState('');
  const [acting,       setActing]       = useState(false);
  const [toggling,     setToggling]     = useState(false);

  const [historial,        setHistorial]        = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [searchQ,          setSearchQ]          = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGrid = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/admin/mesas`);
      const data = await res.json();
      setMesas(Array.isArray(data) ? data : (data.mesas ?? []));
      if (data.eventoConfig) setEventoConfig(data.eventoConfig);
    } catch { setMesas([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchHistorial = useCallback(async (q?: string) => {
    setLoadingHistorial(true);
    try {
      const url = q?.trim()
        ? `${API_URL}/admin/mesas/historial?q=${encodeURIComponent(q)}`
        : `${API_URL}/admin/mesas/historial`;
      const data = await (await fetch(url)).json();
      setHistorial(Array.isArray(data) ? data : []);
    } catch { setHistorial([]); }
    finally { setLoadingHistorial(false); }
  }, []);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);
  useEffect(() => { if (tab === 'historial') fetchHistorial(); }, [tab, fetchHistorial]);

  const handleSearch = (val: string) => {
    setSearchQ(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchHistorial(val), 400);
  };

  const toggleHabilitar = async (mesa: any) => {
    const nuevo = mesa.estaHabilitada === 1 ? 0 : 1;
    showConfirm(
      `${nuevo === 1 ? 'Habilitar' : 'Deshabilitar'} mesa ${mesa.numeroMesa}`,
      `¿Deseas ${nuevo === 1 ? 'habilitar' : 'deshabilitar'} la Mesa ${mesa.numeroMesa}? ${nuevo === 0 ? 'Los usuarios no podrán usarla.' : 'Estará disponible para reuniones.'}`,
      async () => {
        setToggling(true);
        try {
          await fetch(`${API_URL}/admin/mesas/${mesa.id}/habilitar`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estaHabilitada: nuevo }),
          });
          showSuccess('Listo', `Mesa ${mesa.numeroMesa} ${nuevo === 1 ? 'habilitada' : 'deshabilitada'} correctamente.`);
          setReunionModal(null);
          fetchGrid();
        } catch { showError('Error', 'No se pudo cambiar la disponibilidad de la mesa.'); }
        finally { setToggling(false); }
      }
    );
  };

  const actualizarReunion = async (reunionId: number, estado: string, extra?: { asistentes?: number }) => {
    setActing(true);
    try {
      const body: any = { estadoReunion: estado };
      if (extra?.asistentes !== undefined) body.asistentes = extra.asistentes;
      await fetch(`${API_URL}/admin/reuniones/${reunionId}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const labels: Record<string, string> = {
        EN_CURSO: 'Reunión iniciada correctamente.',
        FINALIZADA: 'Reunión finalizada y registrada.',
        CANCELADA: 'Reunión cancelada.',
      };
      showSuccess('Listo', labels[estado] ?? 'Estado actualizado.');
      setReunionModal(null);
      fetchGrid();
    } catch { showError('Error', 'No se pudo actualizar el estado.'); }
    finally { setActing(false); }
  };

  const openModal = (m: any) => {
    setReunionModal(m);
    setAsistentes(String(m.reunionActual?.cantidadAsistentesRegistrados ?? ''));
  };

  const mesasFiltradas = mesas.filter((m) => {
    if (filtro === 'INHABILITADA') return m.estaHabilitada === 0;
    if (filtro === 'TODAS') return true;
    return m.estadoMesa === filtro;
  });

  const counts = {
    total:        mesas.length,
    libre:        mesas.filter((m) => m.estadoMesa === 'LIBRE').length,
    reservada:    mesas.filter((m) => m.estadoMesa === 'RESERVADA').length,
    enUso:        mesas.filter((m) => m.estadoMesa === 'EN_USO').length,
    inhabilitada: mesas.filter((m) => m.estaHabilitada === 0).length,
  };

  const FILTROS: { key: FiltroEstado; label: string }[] = [
    { key: 'TODAS',        label: `Todas (${counts.total})`              },
    { key: 'LIBRE',        label: `Libres (${counts.libre})`             },
    { key: 'RESERVADA',    label: `Reservadas (${counts.reservada})`     },
    { key: 'EN_USO',       label: `En uso (${counts.enUso})`             },
    { key: 'INHABILITADA', label: `Inhabilitadas (${counts.inhabilitada})` },
  ];

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F9FAFB]">
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      {modal}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGrid(); }} tintColor={GREEN} />}
      >
        <View className="px-4 pt-4 pb-8">

          {/* Config card */}
          {eventoConfig && (
            <View className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-2">Configuración del evento</Text>
              <View className="flex-row flex-wrap gap-4">
                <View className="flex-row items-center gap-2">
                  <Clock color="#3b82f6" size={14} />
                  <View>
                    <Text className="text-[10px] text-blue-500 font-semibold">Duración reunión</Text>
                    <Text className="text-sm font-bold text-blue-900">{eventoConfig.duracionReunion} min</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Armchair color="#3b82f6" size={14} />
                  <View>
                    <Text className="text-[10px] text-blue-500 font-semibold">Mesas del evento</Text>
                    <Text className="text-sm font-bold text-blue-900">{eventoConfig.cantidadTotalMesasEvento}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Users color="#3b82f6" size={14} />
                  <View>
                    <Text className="text-[10px] text-blue-500 font-semibold">Cap. por mesa</Text>
                    <Text className="text-sm font-bold text-blue-900">{eventoConfig.capacidadPersonasPorMesa} personas</Text>
                  </View>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-3 mt-2">
                {Object.entries(ESTADO_MESA).map(([k, v]) => (
                  <View key={k} className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: v.grid }} />
                    <Text className="text-[10px] text-gray-600">{v.label}</Text>
                  </View>
                ))}
                <View className="flex-row items-center gap-1">
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9ca3af' }} />
                  <Text className="text-[10px] text-gray-600">Inhabilitada</Text>
                </View>
              </View>
            </View>
          )}

          {/* Tabs + refresh */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="flex-row bg-gray-100 rounded-xl p-1 flex-1">
              {(['mesas', 'historial'] as Tab[]).map((key) => (
                <TouchableOpacity key={key} onPress={() => setTab(key)}
                  className={`flex-1 py-1.5 rounded-lg items-center ${tab === key ? 'bg-white shadow-sm' : ''}`}
                  activeOpacity={0.8}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: tab === key ? '#111827' : '#6b7280' }}>
                    {key === 'mesas' ? 'Mesas' : 'Historial'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => { fetchGrid(); if (tab === 'historial') fetchHistorial(searchQ); }}
              className="p-2.5 border border-gray-200 rounded-xl bg-white" activeOpacity={0.8}>
              <RefreshCw color="#6b7280" size={16} />
            </TouchableOpacity>
          </View>

          {/* ── MESAS TAB ── */}
          {tab === 'mesas' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {FILTROS.map((f) => (
                    <TouchableOpacity key={f.key} onPress={() => setFiltro(f.key)}
                      className="px-3 py-1.5 rounded-full border"
                      style={{ backgroundColor: filtro === f.key ? GREEN : 'white', borderColor: filtro === f.key ? GREEN : '#e5e7eb' }}
                      activeOpacity={0.8}>
                      <Text style={{ color: filtro === f.key ? 'white' : '#6b7280', fontSize: 11, fontWeight: '600' }}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {mesasFiltradas.length === 0 ? (
                <View className="bg-white rounded-2xl border border-gray-100 p-12 items-center">
                  <Armchair color="#d1d5db" size={36} />
                  <Text className="text-gray-400 text-sm mt-3 text-center">No hay mesas con ese filtro.</Text>
                </View>
              ) : (
                <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <View className="flex-row flex-wrap gap-2">
                    {mesasFiltradas.map((m) => {
                      const cfg        = ESTADO_MESA[m.estadoMesa] ?? ESTADO_MESA.LIBRE;
                      const inhabilitada = m.estaHabilitada === 0 && m.estadoMesa === 'LIBRE';
                      const color      = inhabilitada ? '#9ca3af' : cfg.grid;
                      const label      = inhabilitada ? 'Inhabilitada' : cfg.label;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => openModal(m)}
                          style={{ width: '17%', aspectRatio: 1, backgroundColor: color, borderRadius: 12 }}
                          className="items-center justify-center shadow-sm"
                          activeOpacity={0.8}
                        >
                          {inhabilitada && (
                            <View style={{ position: 'absolute', top: 2, right: 3 }}>
                              <Lock color="rgba(255,255,255,0.7)" size={8} />
                            </View>
                          )}
                          <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>
                            {String(m.numeroMesa).padStart(2, '0')}
                          </Text>
                          <Text style={{ color: 'white', fontSize: 7, fontWeight: '600', opacity: 0.85, marginTop: 1 }}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View className="flex-row flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
                    <Text className="text-xs font-bold text-gray-700">{counts.total} mesas</Text>
                    <Text style={{ color: GREEN, fontSize: 12, fontWeight: '600' }}>{counts.libre} libres</Text>
                    <Text style={{ color: '#f97316', fontSize: 12, fontWeight: '600' }}>{counts.enUso} en uso</Text>
                    <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>{counts.reservada} reservadas</Text>
                    {counts.inhabilitada > 0 && (
                      <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '600' }}>{counts.inhabilitada} inhabilitadas</Text>
                    )}
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── HISTORIAL TAB ── */}
          {tab === 'historial' && (
            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <View className="p-3 border-b border-gray-100">
                <View className="flex-row items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                  <Search color="#9ca3af" size={14} />
                  <TextInput value={searchQ} onChangeText={handleSearch}
                    placeholder="Buscar por mesa o empresa..."
                    placeholderTextColor="#9ca3af"
                    className="flex-1 text-sm text-gray-800" />
                </View>
              </View>
              {loadingHistorial ? (
                <View className="p-10 items-center"><ActivityIndicator size="small" color={GREEN} /></View>
              ) : historial.length === 0 ? (
                <View className="p-12 items-center">
                  <History color="#d1d5db" size={36} />
                  <Text className="text-gray-400 text-sm mt-3 text-center">
                    {searchQ ? 'Sin resultados.' : 'Aún no hay reuniones finalizadas.'}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text className="px-4 pt-3 pb-1 text-xs text-gray-400 font-semibold">
                    {historial.length} reunión(es) finalizada(s)
                  </Text>
                  {historial.map((r) => <HistorialRow key={r.id} r={r} />)}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── MODAL DETALLE MESA ── */}
      <Modal visible={!!reunionModal} transparent animationType="slide" onRequestClose={() => setReunionModal(null)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: '90%' }}>
            {reunionModal ? (() => {
              const m            = reunionModal;
              const cfg          = ESTADO_MESA[m.estadoMesa] ?? ESTADO_MESA.LIBRE;
              const r            = m.reunionActual;
              const sol          = r?.solicitudreunion;
              const ea           = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
              const eb           = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
              const esVirtual    = r?.tipoReunion === 'VIRTUAL' || r?.tipoReunion === 'MIXTA';
              const esPresencial = r?.tipoReunion === 'PRESENCIAL' || r?.tipoReunion === 'MIXTA';
              const isReservada  = m.estadoMesa === 'RESERVADA';
              const isEnUso      = m.estadoMesa === 'EN_USO';
              const isLibre      = m.estadoMesa === 'LIBRE';
              const inhabilitada = m.estaHabilitada === 0;
              const minsFromNow  = r ? minutesFromNow(r.fechaHoraInicioReunion) : 0;
              const elapsed      = r ? elapsedMin(r.fechaHoraInicioReunion) : 0;
              const remaining    = r ? Math.max(0, Math.round((new Date(r.fechaHoraFinReunion).getTime() - Date.now()) / 60000)) : 0;
              const gridColor    = inhabilitada && isLibre ? '#9ca3af' : cfg.grid;

              return (
                <ScrollView>
                  {/* Header */}
                  <View className="flex-row items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <View className="w-12 h-12 rounded-xl items-center justify-center shrink-0"
                      style={{ backgroundColor: gridColor }}>
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>
                        {String(m.numeroMesa).padStart(2, '0')}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-900 text-sm">Mesa {m.numeroMesa}</Text>
                      <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
                        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg }}>
                          <Text style={{ color: cfg.color, fontSize: 10, fontWeight: '700' }}>{cfg.label}</Text>
                        </View>
                        {inhabilitada && (
                          <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full bg-gray-100">
                            <Lock color="#6b7280" size={9} />
                            <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700' }}>Inhabilitada</Text>
                          </View>
                        )}
                        <Text className="text-xs text-gray-400">{m.capacidadPersonas} personas</Text>
                        {isReservada && r ? (
                          <Text style={{ color: '#2563eb', fontSize: 10, fontWeight: '600' }}>
                            Inicia en {minsFromNow > 0 ? `${minsFromNow} min` : 'ahora'}
                          </Text>
                        ) : null}
                        {isEnUso && r ? (
                          <Text style={{ color: '#c2410c', fontSize: 10, fontWeight: '600' }}>
                            {elapsed} min · {remaining} min restantes
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setReunionModal(null)} className="p-1.5 rounded-lg bg-gray-100" activeOpacity={0.8}>
                      <X color="#6b7280" size={16} />
                    </TouchableOpacity>
                  </View>

                  <View className="p-5 gap-4">

                    {/* LIBRE: mensaje informativo */}
                    {isLibre && (
                      <View className="flex-row items-center gap-3 rounded-xl px-4 py-3"
                        style={{ backgroundColor: inhabilitada ? '#f9fafb' : '#f0fdf4', borderWidth: 1, borderColor: inhabilitada ? '#e5e7eb' : '#bbf7d0' }}>
                        {inhabilitada
                          ? <Lock color="#9ca3af" size={20} />
                          : <Armchair color="#16a34a" size={20} />}
                        <View className="flex-1">
                          <Text style={{ color: inhabilitada ? '#4b5563' : '#15803d', fontWeight: '600', fontSize: 13 }}>
                            {inhabilitada ? 'Mesa inhabilitada para usuarios' : 'Mesa libre y disponible'}
                          </Text>
                          <Text className="text-xs text-gray-400 mt-0.5">
                            {inhabilitada
                              ? 'Los usuarios no pueden programar reuniones en esta mesa.'
                              : 'No hay reuniones programadas ni en curso.'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Contenido reunión */}
                    {r && (
                      <>
                        {/* Horario */}
                        <View className="flex-row items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                          <Clock color="#9ca3af" size={16} />
                          <Text className="text-sm font-semibold text-gray-700">
                            {fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}
                          </Text>
                          <View className="ml-auto px-2 py-0.5 rounded-full" style={{
                            backgroundColor: r.tipoReunion === 'VIRTUAL' ? '#eff6ff' : r.tipoReunion === 'MIXTA' ? '#f5f3ff' : '#ecfdf5',
                          }}>
                            <Text style={{
                              color: r.tipoReunion === 'VIRTUAL' ? '#2563eb' : r.tipoReunion === 'MIXTA' ? '#7c3aed' : '#059669',
                              fontSize: 10, fontWeight: '700',
                            }}>{r.tipoReunion}</Text>
                          </View>
                        </View>

                        {/* Empresas */}
                        <View className="gap-2">
                          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Empresas en reunión</Text>
                          <View className="flex-row items-center gap-2">
                            <CompanyRow empresa={ea} isA={true} />
                            <Text className="text-gray-300 font-bold text-sm shrink-0">vs</Text>
                            <CompanyRow empresa={eb} isA={false} />
                          </View>
                        </View>

                        {esVirtual && sol?.enlaceReunionVirtual ? (
                          <TouchableOpacity onPress={() => Linking.openURL(sol.enlaceReunionVirtual)}
                            className="flex-row items-center justify-center gap-2 py-3 rounded-xl"
                            style={{ backgroundColor: '#2563eb' }} activeOpacity={0.85}>
                            <Video color="white" size={16} />
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Entrar a reunión virtual</Text>
                          </TouchableOpacity>
                        ) : null}

                        {esPresencial && (sol?.ubicacionGoogleMapsReunion || sol?.direccionTexto) ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(sol.ubicacionGoogleMapsReunion || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`)}
                            className="flex-row items-center justify-center gap-2 py-3 rounded-xl"
                            style={{ backgroundColor: '#059669' }} activeOpacity={0.85}>
                            <MapPin color="white" size={16} />
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Ver ubicación</Text>
                          </TouchableOpacity>
                        ) : null}

                        {r.tipoReunion === 'MIXTA' ? (
                          <View className="flex-row items-center gap-1">
                            <Link2 color="#9ca3af" size={12} />
                            <Text className="text-xs text-gray-400">Reunión mixta · presencial + virtual</Text>
                          </View>
                        ) : null}

                        {r.observacionesReunion ? (
                          <Text className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">"{r.observacionesReunion}"</Text>
                        ) : null}

                        {/* Acciones */}
                        <View className="border-t border-gray-100 pt-4 gap-3">
                          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Acciones</Text>

                          {isReservada && (
                            <View className="flex-row gap-2">
                              <TouchableOpacity
                                disabled={acting}
                                onPress={() => showConfirm('Iniciar reunión', `¿Iniciar la reunión en Mesa ${m.numeroMesa} ahora?`, () => actualizarReunion(r.id, 'EN_CURSO'))}
                                className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl"
                                style={{ backgroundColor: acting ? '#9ca3af' : GREEN }} activeOpacity={0.85}>
                                <Play color="white" size={16} />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Iniciar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                disabled={acting}
                                onPress={() => showConfirm('Cancelar reunión', `¿Cancelar la reunión en Mesa ${m.numeroMesa}?`, () => actualizarReunion(r.id, 'CANCELADA'))}
                                className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border border-red-200"
                                style={{ backgroundColor: 'white' }} activeOpacity={0.85}>
                                <XCircle color="#dc2626" size={16} />
                                <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {isEnUso && (
                            <View className="gap-2">
                              <View className="flex-row items-center gap-2">
                                <UserCheck color="#6b7280" size={16} />
                                <Text className="text-xs text-gray-600 font-semibold">Asistentes:</Text>
                                <TextInput
                                  value={asistentes}
                                  onChangeText={setAsistentes}
                                  keyboardType="numeric"
                                  className="border border-gray-200 rounded-lg px-3 py-1 text-sm text-gray-900 text-center"
                                  style={{ width: 64 }}
                                />
                              </View>
                              <TouchableOpacity
                                disabled={acting}
                                onPress={() => showConfirm('Finalizar reunión', `¿Finalizar la reunión en Mesa ${m.numeroMesa}?`, () => actualizarReunion(r.id, 'FINALIZADA', { asistentes: Number(asistentes) || 0 }))}
                                className="flex-row items-center justify-center gap-2 py-3 rounded-xl"
                                style={{ backgroundColor: acting ? '#9ca3af' : GREEN }} activeOpacity={0.85}>
                                <Square color="white" size={16} />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Finalizar reunión</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </>
                    )}

                    {/* Toggle habilitar/deshabilitar */}
                    <View className="border-t border-gray-100 pt-4 gap-2">
                      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Disponibilidad</Text>
                      <TouchableOpacity
                        disabled={toggling}
                        onPress={() => toggleHabilitar(m)}
                        className="flex-row items-center justify-center gap-2 py-3 rounded-xl border"
                        style={{
                          borderColor: inhabilitada ? '#bbf7d0' : '#e5e7eb',
                          backgroundColor: 'white',
                          opacity: toggling ? 0.5 : 1,
                        }}
                        activeOpacity={0.85}>
                        {inhabilitada
                          ? <Unlock color="#15803d" size={16} />
                          : <Lock color="#6b7280" size={16} />}
                        <Text style={{
                          color: inhabilitada ? '#15803d' : '#6b7280',
                          fontWeight: '700', fontSize: 13,
                        }}>
                          {inhabilitada ? 'Habilitar mesa para usuarios' : 'Deshabilitar mesa para usuarios'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                </ScrollView>
              );
            })() : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
