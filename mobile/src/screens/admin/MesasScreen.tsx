import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Image, Linking, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Armchair, Building2, Clock, Video, MapPin, ChevronDown,
  ChevronUp, Timer, Star, History, Mail, Link2, Send, X,
  Play, Square, XCircle, UserCheck, Lock, Unlock,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

const ESTADO_MESA: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  LIBRE:         { label: 'Libre',      color: '#166534', bg: '#dcfce7', dot: '#22c55e' },
  RESERVADA:     { label: 'Reservada',  color: '#1e40af', bg: '#dbeafe', dot: '#60a5fa' },
  EN_USO:        { label: 'En uso',     color: '#9a3412', bg: '#ffedd5', dot: '#f97316' },
  PRE_RESERVADA: { label: 'Pendiente',  color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
};
const GRID_COLOR: Record<string, string> = { LIBRE: GREEN, RESERVADA: '#3b82f6', EN_USO: '#f97316', PRE_RESERVADA: '#f59e0b' };
const ESTADO_REUNION: Record<string, { color: string; bg: string; label: string }> = {
  PROGRAMADA: { color: '#1d4ed8', bg: '#dbeafe', label: 'Programada' },
  EN_CURSO:   { color: '#c2410c', bg: '#ffedd5', label: 'En curso' },
  FINALIZADA: { color: '#15803d', bg: '#dcfce7', label: 'Finalizada' },
  CANCELADA:  { color: '#6b7280', bg: '#f3f4f6', label: 'Cancelada' },
};
const TIPO_CFG: Record<string, { color: string; bg: string; label: string }> = {
  VIRTUAL:    { color: '#2563eb', bg: '#dbeafe', label: 'Virtual' },
  PRESENCIAL: { color: '#059669', bg: '#d1fae5', label: 'Presencial' },
  MIXTA:      { color: '#7c3aed', bg: '#ede9fe', label: 'Mixta' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

function StarRow({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={11} color={s <= value ? '#fbbf24' : '#e5e7eb'} fill={s <= value ? '#fbbf24' : 'transparent'} />
      ))}
    </View>
  );
}

function EvalBlock({ empresa, resultado, side }: { empresa: any; resultado: any; side: 'A' | 'B' }) {
  const bg  = side === 'A' ? '#f0fdf4' : '#eff6ff';
  const brd = side === 'A' ? '#bbf7d0' : '#bfdbfe';
  const ic  = side === 'A' ? { bg: '#dcfce7', color: GREEN } : { bg: '#dbeafe', color: '#1d4ed8' };
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: brd, backgroundColor: bg, padding: 10, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {empresa?.urlFotoPerfil
          ? <Image source={{ uri: empresa.urlFotoPerfil }} style={{ width: 22, height: 22, borderRadius: 11 }} resizeMode="contain" />
          : <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: ic.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={10} color={ic.color} />
            </View>}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827', flex: 1 }} numberOfLines={1}>{empresa?.nombre ?? '—'}</Text>
      </View>
      {resultado ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <StarRow value={resultado.calificacionReunion} />
            <Text style={{ fontSize: 9, color: '#6b7280', fontWeight: '600' }}>{resultado.calificacionReunion}/5</Text>
            {resultado.rangoAcuerdoComercial && (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 999, borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#92400e' }} numberOfLines={1}>{resultado.rangoAcuerdoComercial}</Text>
              </View>
            )}
          </View>
          {resultado.observacionesPuntosTratados && (
            <Text style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic' }} numberOfLines={3}>"{resultado.observacionesPuntosTratados}"</Text>
          )}
        </>
      ) : (
        <Text style={{ fontSize: 9, color: '#9ca3af', fontStyle: 'italic' }}>Evaluación pendiente</Text>
      )}
    </View>
  );
}

function HistorialRow({ r }: { r: any }) {
  const [open, setOpen] = useState(false);
  const sol = r.solicitudreunion;
  const eeA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
  const eeB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
  const ea  = eeA?.empresa;
  const eb  = eeB?.empresa;
  const resultados: any[] = r.resultadoreunion ?? [];
  const resA = resultados.find((res: any) => res.empresaeventoCalificadora_id === eeA?.id);
  const resB = resultados.find((res: any) => res.empresaeventoCalificadora_id === eeB?.id);
  const tipo = TIPO_CFG[r.tipoReunion] ?? TIPO_CFG.PRESENCIAL;

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ padding: 12 }} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{r.mesa?.numeroMesa ? String(r.mesa.numeroMesa).padStart(2, '0') : 'VR'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#1f2937' }} numberOfLines={1}>
              {ea?.nombre ?? '—'} <Text style={{ color: '#9ca3af', fontWeight: '400' }}>vs</Text> {eb?.nombre ?? '—'}
            </Text>
            <Text style={{ fontSize: 9, color: '#9ca3af' }}>{fmtDT(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <View style={{ backgroundColor: tipo.bg, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: tipo.color }}>{tipo.label}</Text>
            </View>
            <Text style={{ fontSize: 8, color: '#9ca3af', fontWeight: '600' }}>
              {resA && resB ? '2 eval.' : resA || resB ? '1 eval.' : 'Sin eval.'}
            </Text>
          </View>
          {open ? <ChevronUp color="#9ca3af" size={14} /> : <ChevronDown color="#9ca3af" size={14} />}
        </View>
      </TouchableOpacity>
      {open && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
          {r.observacionesReunion && (
            <Text style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: '#e5e7eb', paddingLeft: 8 }}>"{r.observacionesReunion}"</Text>
          )}
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Evaluaciones</Text>
          <EvalBlock empresa={ea} resultado={resA} side="A" />
          <EvalBlock empresa={eb} resultado={resB} side="B" />
        </View>
      )}
    </View>
  );
}

function CompanyChip({ empresa }: { empresa: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
      backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }}>
      {empresa?.urlFotoPerfil
        ? <Image source={{ uri: empresa.urlFotoPerfil }} style={{ width: 26, height: 26, borderRadius: 13 }} resizeMode="contain" />
        : <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 color={GREEN} size={11} />
          </View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827' }} numberOfLines={1}>{empresa?.nombre ?? '—'}</Text>
        <Text style={{ fontSize: 9, color: '#6b7280' }} numberOfLines={1}>{empresa?.rubro ?? ''}</Text>
      </View>
    </View>
  );
}

function ReunionRow({
  r, mesaNumero, acting, onMessage, onChangeLink, onCambiarEstado,
}: {
  r: any; mesaNumero: number; acting: boolean;
  onMessage: (reunionId: number, empresa: 'A' | 'B', empresaNombre: string, encargadoNombre: string) => void;
  onChangeLink: (reunion: any) => void;
  onCambiarEstado: (reunion: any, estado: string, asistentes?: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [asistentes, setAsistentes] = useState(String(r.cantidadAsistentesRegistrados ?? ''));
  const sol = r.solicitudreunion;
  const eeA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
  const eeB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
  const ea  = eeA?.empresa;
  const eb  = eeB?.empresa;
  const encA = eeA?.empresa_usuario?.[0]?.usuario;
  const encB = eeB?.empresa_usuario?.[0]?.usuario;
  const est = ESTADO_REUNION[r.estadoReunion] ?? ESTADO_REUNION.PROGRAMADA;
  const tip = TIPO_CFG[r.tipoReunion]         ?? TIPO_CFG.PRESENCIAL;
  const link    = sol?.enlaceReunionVirtual;
  const mapsUrl = sol?.ubicacionGoogleMapsReunion
    ?? (sol?.latitudPresencial && sol?.longitudPresencial
        ? `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}`
        : null)
    ?? (sol?.direccionTexto
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`
        : null);
  const esVirtual    = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial = r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';
  const esProgramada = r.estadoReunion === 'PROGRAMADA' || r.estadoReunion === 'REPROGRAMADA';
  const esEnCurso     = r.estadoReunion === 'EN_CURSO';

  const nombreEncA = encA ? `${encA.nombres} ${encA.apellidoPaterno}` : 'Encargado';
  const nombreEncB = encB ? `${encB.nombres} ${encB.apellidoPaterno}` : 'Encargado';

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ padding: 12 }} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: est.color }} />
          <CompanyChip empresa={ea} />
          <Text style={{ color: '#9ca3af', fontSize: 11 }}>↔</Text>
          <CompanyChip empresa={eb} />
          {expanded ? <ChevronUp color="#9ca3af" size={15} /> : <ChevronDown color="#9ca3af" size={15} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Clock color="#9ca3af" size={10} />
            <Text style={{ fontSize: 10, color: '#6b7280' }}>
              {fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: tip.bg }}>
            <Text style={{ fontSize: 8, fontWeight: '700', color: tip.color }}>{tip.label}</Text>
          </View>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: est.bg }}>
            <Text style={{ fontSize: 8, fontWeight: '700', color: est.color }}>{est.label}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
          {esVirtual && link && (
            <TouchableOpacity onPress={() => Linking.openURL(link)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 10, borderRadius: 12, backgroundColor: '#2563eb' }}>
              <Video color="#fff" size={14} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Entrar a reunión virtual</Text>
            </TouchableOpacity>
          )}
          {esPresencial && mapsUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 10, borderRadius: 12, backgroundColor: '#059669' }}>
              <MapPin color="#fff" size={14} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Ver en Google Maps</Text>
            </TouchableOpacity>
          )}
          {esVirtual && (
            <TouchableOpacity onPress={() => onChangeLink(r)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
              <Link2 color="#374151" size={14} />
              <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13 }}>{link ? 'Cambiar link virtual' : 'Agregar link virtual'}</Text>
            </TouchableOpacity>
          )}

          {/* Acciones de estado (solo admin) */}
          {esProgramada && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity disabled={acting} onPress={() => onCambiarEstado(r, 'EN_CURSO')}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  paddingVertical: 10, borderRadius: 12, backgroundColor: acting ? '#9ca3af' : GREEN }}>
                <Play color="#fff" size={14} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Iniciar</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={acting} onPress={() => onCambiarEstado(r, 'CANCELADA')}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff' }}>
                <XCircle color="#dc2626" size={14} />
                <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
          {esEnCurso && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <UserCheck color="#6b7280" size={16} />
                <Text style={{ fontSize: 12, color: '#374151', fontWeight: '600' }}>Asistentes:</Text>
                <TextInput value={asistentes} onChangeText={setAsistentes} keyboardType="numeric"
                  style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                    fontSize: 13, color: '#111827', textAlign: 'center', width: 60 }} />
              </View>
              <TouchableOpacity disabled={acting} onPress={() => onCambiarEstado(r, 'FINALIZADA', Number(asistentes) || 0)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  paddingVertical: 10, borderRadius: 12, backgroundColor: acting ? '#9ca3af' : GREEN }}>
                <Square color="#fff" size={14} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Finalizar reunión</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Contactar encargados */}
          <View>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Contactar encargados</Text>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => onMessage(r.id, 'A', ea?.nombre ?? 'Empresa A', nombreEncA)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12,
                  borderRadius: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' }}>
                <Mail color={GREEN} size={14} />
                <Text style={{ color: '#166534', fontWeight: '600', fontSize: 12, flex: 1 }} numberOfLines={1}>
                  {nombreEncA} · {ea?.nombre ?? 'Empresa A'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onMessage(r.id, 'B', eb?.nombre ?? 'Empresa B', nombreEncB)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12,
                  borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' }}>
                <Mail color="#1d4ed8" size={14} />
                <Text style={{ color: '#1d4ed8', fontWeight: '600', fontSize: 12, flex: 1 }} numberOfLines={1}>
                  {nombreEncB} · {eb?.nombre ?? 'Empresa B'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function SolicitudPendienteRow({ s }: { s: any }) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 12, backgroundColor: '#fffbeb' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#f59e0b' }} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }} numberOfLines={1}>
          {s.solicitante}
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 11 }}>↔</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }} numberOfLines={1}>
          {s.receptora}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Clock color="#9ca3af" size={10} />
          <Text style={{ fontSize: 10, color: '#6b7280' }}>
            {fmtTime(s.inicio)} – {fmtTime(s.fin)}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#fef3c7' }}>
          <Text style={{ fontSize: 8, fontWeight: '700', color: '#92400e' }}>Pendiente de respuesta</Text>
        </View>
      </View>
    </View>
  );
}

type FiltroEstado = 'EN_USO' | 'PROGRAMADA' | 'LIBRE' | 'TODAS' | 'INHABILITADA' | 'HISTORIAL';

export default function MesasScreen() {
  const { show: showModal, modal } = useModal();
  const insets = useSafeAreaInsets();

  const [mesas,        setMesas]        = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filtro,       setFiltro]       = useState<FiltroEstado>('EN_USO');
  const [search,       setSearch]       = useState('');
  const [sinReunion, setSinReunion] = useState<any[]>([]);
  const [acting, setActing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [historial,        setHistorial]        = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [searchH,          setSearchH]          = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [msgModal, setMsgModal]  = useState<{ reunionId: number; empresa: 'A' | 'B'; empresaNombre: string; encargadoNombre: string } | null>(null);
  const [msgText,  setMsgText]   = useState('');
  const [sending,  setSending]   = useState(false);

  const [linkModal,  setLinkModal]  = useState<{ reunion: any } | null>(null);
  const [linkText,   setLinkText]   = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const fetchMesas = useCallback(async () => {
    try {
      const [res, libresRes] = await Promise.all([fetch(`${API_URL}/admin/mesas`), fetch(`${API_URL}/staff/empresas-sin-reunion`)]);
      const [data, libres] = await Promise.all([res.json(), libresRes.json()]);
      setMesas(Array.isArray(data) ? data : (data.mesas ?? []));
      setSinReunion(Array.isArray(libres?.empresas) ? libres.empresas : []);
      if (data.eventoConfig) setEventoConfig(data.eventoConfig);
    } catch { setMesas([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchHistorial = useCallback(async (q?: string) => {
    setLoadingHistorial(true);
    try {
      const url = q?.trim() ? `${API_URL}/admin/mesas/historial?q=${encodeURIComponent(q)}` : `${API_URL}/admin/mesas/historial`;
      const data = await (await fetch(url)).json();
      setHistorial(Array.isArray(data) ? data : []);
    } catch { setHistorial([]); }
    finally { setLoadingHistorial(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, []);
  useEffect(() => { if (filtro === 'HISTORIAL') fetchHistorial(); }, [filtro]);

  const handleSearchH = (val: string) => {
    setSearchH(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchHistorial(val), 400);
  };

  const mesasFiltradas = mesas.filter((m) => {
    if (filtro === 'INHABILITADA') { if (m.estaHabilitada !== 0) return false; }
    else if (filtro === 'EN_USO')     { if (m.estadoMesa !== 'EN_USO')    return false; }
    else if (filtro === 'PROGRAMADA') { if (m.estadoMesa !== 'RESERVADA' && m.estadoMesa !== 'PRE_RESERVADA') return false; }
    else if (filtro === 'LIBRE')      { if (m.estadoMesa !== 'LIBRE')     return false; }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(m.numeroMesa).includes(q) ||
      m.reunion?.some((r: any) => {
        const sol = r.solicitudreunion;
        const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
        const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
        return ea?.nombre?.toLowerCase().includes(q) || eb?.nombre?.toLowerCase().includes(q);
      })
    );
  });

  const counts = {
    enUso:     mesas.filter((m) => m.estadoMesa === 'EN_USO').length,
    programada: mesas.filter((m) => m.estadoMesa === 'RESERVADA' || m.estadoMesa === 'PRE_RESERVADA').length,
    libre:     mesas.filter((m) => m.estadoMesa === 'LIBRE').length,
    inhabilitada: mesas.filter((m) => m.estaHabilitada === 0).length,
    total:     mesas.length,
  };

  const FILTROS: { key: FiltroEstado; label: string }[] = [
    { key: 'EN_USO',       label: `En uso (${counts.enUso})` },
    { key: 'PROGRAMADA',   label: `Programadas (${counts.programada})` },
    { key: 'LIBRE',        label: `Libres (${counts.libre})` },
    { key: 'TODAS',        label: `Todas (${counts.total})` },
    { key: 'INHABILITADA', label: `Inhabilitadas (${counts.inhabilitada})` },
    { key: 'HISTORIAL',    label: 'Historial' },
  ];

  const openMessageModal = (reunionId: number, empresa: 'A' | 'B', empresaNombre: string, encargadoNombre: string) => {
    setMsgModal({ reunionId, empresa, empresaNombre, encargadoNombre });
    setMsgText('');
  };
  const openLinkModal = (reunion: any) => {
    setLinkModal({ reunion });
    setLinkText(reunion.solicitudreunion?.enlaceReunionVirtual ?? '');
  };

  const cambiarEstadoReunion = (reunion: any, estado: string, asistentes?: number) => {
    const labels: Record<string, string> = { EN_CURSO: 'iniciar', CANCELADA: 'cancelar', FINALIZADA: 'finalizar' };
    showModal({
      type: 'confirm',
      title: `${estado === 'EN_CURSO' ? 'Iniciar' : estado === 'CANCELADA' ? 'Cancelar' : 'Finalizar'} reunión`,
      message: `¿Deseas ${labels[estado]} esta reunión en la Mesa ${reunion.mesa_id}?`,
      confirmColor: estado === 'CANCELADA' ? '#dc2626' : GREEN,
      onConfirm: async () => {
        setActing(true);
        try {
          const body: any = { estadoReunion: estado };
          if (asistentes !== undefined) body.asistentes = asistentes;
          const res = await fetch(`${API_URL}/admin/reuniones/${reunion.id}/estado`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error();
          const doneLabels: Record<string, string> = {
            EN_CURSO: 'Reunión iniciada correctamente.', FINALIZADA: 'Reunión finalizada y registrada.', CANCELADA: 'Reunión cancelada.',
          };
          showModal({ type: 'success', title: '¡Listo!', message: doneLabels[estado] ?? 'Estado actualizado.' });
          fetchMesas();
        } catch { showModal({ type: 'error', title: 'Error', message: 'No se pudo actualizar el estado.' }); }
        finally { setActing(false); }
      },
    });
  };

  const toggleHabilitar = (mesa: any) => {
    const nuevo = mesa.estaHabilitada === 1 ? 0 : 1;
    showModal({
      type: 'confirm',
      title: `${nuevo === 1 ? 'Habilitar' : 'Deshabilitar'} mesa ${mesa.numeroMesa}`,
      message: `¿Deseas ${nuevo === 1 ? 'habilitar' : 'deshabilitar'} la Mesa ${mesa.numeroMesa}? ${nuevo === 0 ? 'Los usuarios no podrán usarla.' : 'Estará disponible para reuniones.'}`,
      onConfirm: async () => {
        setToggling(true);
        try {
          await fetch(`${API_URL}/admin/mesas/${mesa.id}/habilitar`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estaHabilitada: nuevo }),
          });
          showModal({ type: 'success', title: '¡Listo!', message: `Mesa ${mesa.numeroMesa} ${nuevo === 1 ? 'habilitada' : 'deshabilitada'} correctamente.` });
          fetchMesas();
        } catch { showModal({ type: 'error', title: 'Error', message: 'No se pudo cambiar la disponibilidad de la mesa.' }); }
        finally { setToggling(false); }
      },
    });
  };

  const sendMessage = async () => {
    if (!msgModal || !msgText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/tecnico/reuniones/${msgModal.reunionId}/mensaje`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa: msgModal.empresa, mensaje: msgText.trim() }),
      });
      if (!res.ok) throw new Error();
      setMsgModal(null);
      showModal({ type: 'success', title: 'Mensaje enviado', message: `Mensaje enviado al encargado de ${msgModal.empresaNombre}.` });
    } catch { showModal({ type: 'error', title: 'Error', message: 'No se pudo enviar el mensaje. Intenta de nuevo.' }); }
    finally { setSending(false); }
  };

  const saveLink = async () => {
    if (!linkModal) return;
    setSavingLink(true);
    try {
      const res = await fetch(`${API_URL}/tecnico/reuniones/${linkModal.reunion.id}/link`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enlace: linkText.trim() }),
      });
      if (!res.ok) throw new Error();
      setLinkModal(null);
      showModal({ type: 'success', title: 'Link actualizado', message: 'El enlace de la reunión fue actualizado correctamente.' });
      fetchMesas();
    } catch { showModal({ type: 'error', title: 'Error', message: 'No se pudo actualizar el link. Intenta de nuevo.' }); }
    finally { setSavingLink(false); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {modal}

      {/* Modal mensaje */}
      <Modal visible={!!msgModal} transparent animationType="slide" onRequestClose={() => setMsgModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Enviar mensaje</Text>
                  {msgModal && (
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {msgModal.encargadoNombre} · {msgModal.empresaNombre}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setMsgModal(null)}>
                  <X color="#9ca3af" size={20} />
                </TouchableOpacity>
              </View>
              <TextInput
                value={msgText} onChangeText={setMsgText}
                placeholder="Escribe tu mensaje aquí..." placeholderTextColor="#9ca3af"
                multiline numberOfLines={5}
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 12, fontSize: 13,
                  color: '#374151', minHeight: 120, textAlignVertical: 'top', marginBottom: 12 }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setMsgModal(null)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={sendMessage} disabled={sending || !msgText.trim()}
                  style={{ flex: 2, paddingVertical: 12, borderRadius: 14, backgroundColor: sending || !msgText.trim() ? '#d1d5db' : GREEN,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Send color="#fff" size={14} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{sending ? 'Enviando…' : 'Enviar mensaje'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal link */}
      <Modal visible={!!linkModal} transparent animationType="slide" onRequestClose={() => setLinkModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Enlace de reunión virtual</Text>
                <TouchableOpacity onPress={() => setLinkModal(null)}>
                  <X color="#9ca3af" size={20} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                Actualiza el enlace para la reunión virtual. Todos los participantes podrán verlo.
              </Text>
              <TextInput
                value={linkText} onChangeText={setLinkText}
                placeholder="https://meet.google.com/... o https://zoom.us/..."
                placeholderTextColor="#9ca3af"
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 12, fontSize: 13, color: '#374151', marginBottom: 12 }}
                autoCapitalize="none" keyboardType="url"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setLinkModal(null)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveLink} disabled={savingLink}
                  style={{ flex: 2, paddingVertical: 12, borderRadius: 14, backgroundColor: savingLink ? '#d1d5db' : GREEN,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Link2 color="#fff" size={14} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{savingLink ? 'Guardando…' : 'Guardar link'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>Mesas del evento</Text>

        {eventoConfig && (
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 6, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock color="#9ca3af" size={11} />
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                Reunión: <Text style={{ fontWeight: '700', color: '#6b7280' }}>{eventoConfig.duracionReunion} min</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Timer color="#9ca3af" size={11} />
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                Limpieza: <Text style={{ fontWeight: '700', color: '#6b7280' }}>{eventoConfig.tiempoEntreReuniones} min</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Search */}
        {filtro !== 'HISTORIAL' ? (
          <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb',
            borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginRight: 6 }}>🔍</Text>
            <TextInput value={search} onChangeText={setSearch}
              placeholder="Buscar empresa o mesa..." placeholderTextColor="#9ca3af"
              style={{ flex: 1, fontSize: 13, color: '#374151' }} />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={{ fontSize: 16, color: '#9ca3af' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb',
            borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginRight: 6 }}>🔍</Text>
            <TextInput value={searchH} onChangeText={handleSearchH}
              placeholder="Buscar empresa o mesa..." placeholderTextColor="#9ca3af"
              style={{ flex: 1, fontSize: 13, color: '#374151' }} />
            {searchH.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchH(''); fetchHistorial(); }}>
                <Text style={{ fontSize: 16, color: '#9ca3af' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 2 }}>
            {FILTROS.map((f) => (
              <TouchableOpacity key={f.key} onPress={() => setFiltro(f.key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                  backgroundColor: filtro === f.key ? GREEN : '#fff', borderColor: filtro === f.key ? GREEN : '#e5e7eb' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: filtro === f.key ? '#fff' : '#6b7280' }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Body */}
      <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#dcfce7', backgroundColor: '#fff', padding: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>Empresas sin reunión ahora</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803d', backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>{sinReunion.length}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {sinReunion.map((e) => (
            <Text key={e.empresaeventoId} style={{ fontSize: 9, fontWeight: '600', color: '#374151', backgroundColor: '#f9fafb', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 }}>
              {e.codigo ? `${e.codigo} · ` : ''}{e.nombre}
            </Text>
          ))}
        </View>
      </View>

      {filtro === 'HISTORIAL' ? (
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}
          refreshControl={<RefreshControl refreshing={loadingHistorial} onRefresh={() => fetchHistorial(searchH)} tintColor={GREEN} />}
          showsVerticalScrollIndicator={false}>
          {loadingHistorial ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}><ActivityIndicator size="large" color={GREEN} /></View>
          ) : historial.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <History color="#d1d5db" size={40} />
              <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 10, fontWeight: '500' }}>Sin reuniones finalizadas</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' }}>
              {historial.map((r) => <HistorialRow key={r.id} r={r} />)}
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMesas(); }} tintColor={GREEN} />}
          showsVerticalScrollIndicator={false}>

          {mesasFiltradas.map((mesa) => {
            const inhabilitada = mesa.estaHabilitada === 0;
            const cfg        = ESTADO_MESA[mesa.estadoMesa] ?? ESTADO_MESA.LIBRE;
            const gridColor  = inhabilitada && mesa.estadoMesa === 'LIBRE' ? '#9ca3af' : (GRID_COLOR[mesa.estadoMesa] ?? GREEN);
            const label      = inhabilitada && mesa.estadoMesa === 'LIBRE' ? 'Inhabilitada' : cfg.label;
            return (
              <View key={mesa.id} style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
                borderColor: '#f1f5f9', marginBottom: 14, overflow: 'hidden',
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                  backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                  <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: gridColor }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{String(mesa.numeroMesa).padStart(2, '0')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>Mesa {mesa.numeroMesa}</Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                      {mesa.reunion?.length ?? 0} reunión(es){mesa.solicitudesEnEspera?.length ? ` · ${mesa.solicitudesEnEspera.length} pendiente(s)` : ''} · {mesa.capacidadPersonas} personas
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: inhabilitada && mesa.estadoMesa === 'LIBRE' ? '#f3f4f6' : cfg.bg }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: inhabilitada && mesa.estadoMesa === 'LIBRE' ? '#6b7280' : cfg.color }}>{label}</Text>
                  </View>
                </View>

                {mesa.reunion && mesa.reunion.length > 0 && mesa.reunion.map((r: any) => (
                  <ReunionRow key={r.id} r={{ ...r, mesa_id: mesa.numeroMesa }} mesaNumero={mesa.numeroMesa} acting={acting}
                    onMessage={openMessageModal} onChangeLink={openLinkModal} onCambiarEstado={cambiarEstadoReunion} />
                ))}

                {mesa.solicitudesEnEspera && mesa.solicitudesEnEspera.length > 0 && mesa.solicitudesEnEspera.map((s: any) => (
                  <SolicitudPendienteRow key={s.solicitudId} s={s} />
                ))}

                {(!mesa.reunion || mesa.reunion.length === 0) && (
                  <View style={{ padding: 16, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: inhabilitada ? '#d1d5db' : '#86efac' }} />
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>
                        {inhabilitada ? 'Inhabilitada — los usuarios no pueden usarla' : (mesa.solicitudesEnEspera?.length ? 'Sin reuniones confirmadas' : 'Disponible — sin reuniones asignadas')}
                      </Text>
                    </View>
                    <TouchableOpacity disabled={toggling} onPress={() => toggleHabilitar(mesa)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        paddingVertical: 9, borderRadius: 10, borderWidth: 1,
                        borderColor: inhabilitada ? '#bbf7d0' : '#e5e7eb', opacity: toggling ? 0.5 : 1 }}>
                      {inhabilitada ? <Unlock color="#15803d" size={14} /> : <Lock color="#6b7280" size={14} />}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: inhabilitada ? '#15803d' : '#6b7280' }}>
                        {inhabilitada ? 'Habilitar mesa' : 'Deshabilitar mesa'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {mesasFiltradas.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Armchair color="#d1d5db" size={40} />
              <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 10, fontWeight: '500' }}>Sin mesas con ese filtro</Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
