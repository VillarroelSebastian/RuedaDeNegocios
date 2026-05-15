import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Image, Linking,
} from 'react-native';
import {
  Armchair, Building2, Clock, Video, MapPin, ChevronDown,
  ChevronUp, Timer,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

const ESTADO_MESA: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  LIBRE:      { label: 'Libre',      color: '#166534', bg: '#dcfce7', dot: '#22c55e' },
  PROGRAMADA: { label: 'Programada', color: '#1e40af', bg: '#dbeafe', dot: '#60a5fa' },
  EN_USO:     { label: 'En uso',     color: '#9a3412', bg: '#ffedd5', dot: '#f97316' },
  EN_ESPERA:  { label: 'En espera',  color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  FINALIZADA: { label: 'Finalizada', color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
};

const GRID_COLOR: Record<string, string> = {
  LIBRE: GREEN, PROGRAMADA: '#3b82f6', EN_USO: '#f97316', EN_ESPERA: '#d97706', FINALIZADA: '#9ca3af',
};

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

function CompanyChip({ empresa }: { empresa: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
      backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }}>
      {empresa?.urlFotoPerfil
        ? <Image source={{ uri: empresa.urlFotoPerfil }}
            style={{ width: 28, height: 28, borderRadius: 14 }} resizeMode="contain" />
        : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#dcfce7',
            alignItems: 'center', justifyContent: 'center' }}>
            <Building2 color={GREEN} size={12} />
          </View>
      }
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
          {empresa?.nombre ?? '—'}
        </Text>
        <Text style={{ fontSize: 9, color: '#6b7280' }} numberOfLines={1}>{empresa?.rubro ?? ''}</Text>
      </View>
    </View>
  );
}

function ReunionRow({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);
  const sol = r.solicitudreunion;
  const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
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

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ padding: 12 }} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: est.bg === '#dbeafe' ? '#60a5fa' : est.color }} />
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
          {sol?.mensajeParaEmpresaReceptora && (
            <Text style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
              "{sol.mensajeParaEmpresaReceptora}"
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

type FiltroEstado = 'TODAS' | 'LIBRE' | 'PROGRAMADA' | 'EN_USO' | 'EN_ESPERA' | 'FINALIZADA';

export default function TecnicoMesasScreen() {
  const [mesas,        setMesas]        = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filtro,       setFiltro]       = useState<FiltroEstado>('TODAS');
  const [search,       setSearch]       = useState('');

  const fetchMesas = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/tecnico/mesas`);
      const data = await res.json();
      setMesas(data.mesas ?? []);
      if (data.eventoConfig) setEventoConfig(data.eventoConfig);
    } catch { setMesas([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, []);

  const mesasFiltradas = mesas.filter((m) => {
    const passEstado = filtro === 'TODAS' || m.estadoMesa === filtro;
    if (!passEstado) return false;
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
    total:      mesas.length,
    libre:      mesas.filter((m) => m.estadoMesa === 'LIBRE').length,
    enUso:      mesas.filter((m) => m.estadoMesa === 'EN_USO').length,
    enEspera:   mesas.filter((m) => m.estadoMesa === 'EN_ESPERA').length,
    programada: mesas.filter((m) => m.estadoMesa === 'PROGRAMADA').length,
    finalizada: mesas.filter((m) => m.estadoMesa === 'FINALIZADA').length,
  };

  const FILTROS: { key: FiltroEstado; label: string }[] = [
    { key: 'TODAS',      label: `Todas (${counts.total})` },
    { key: 'LIBRE',      label: `Libres (${counts.libre})` },
    { key: 'EN_USO',     label: `En uso (${counts.enUso})` },
    { key: 'EN_ESPERA',  label: `Espera (${counts.enEspera})` },
    { key: 'PROGRAMADA', label: `Program. (${counts.programada})` },
    { key: 'FINALIZADA', label: `Finaliz. (${counts.finalizada})` },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>Mesas del evento</Text>

        {/* Config info */}
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
        <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb',
          borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
          paddingVertical: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: '#9ca3af', marginRight: 6 }}>🔍</Text>
          <TextInput value={search} onChangeText={setSearch}
            placeholder="Buscar empresa..."
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, fontSize: 13, color: '#374151' }} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ fontSize: 16, color: '#9ca3af' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 2 }}>
            {FILTROS.map((f) => (
              <TouchableOpacity key={f.key} onPress={() => setFiltro(f.key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                  backgroundColor: filtro === f.key ? GREEN : '#fff',
                  borderColor: filtro === f.key ? GREEN : '#e5e7eb' }}>
                <Text style={{ fontSize: 11, fontWeight: '600',
                  color: filtro === f.key ? '#fff' : '#6b7280' }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchMesas(); }} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}>

        {mesasFiltradas.map((mesa) => {
          const cfg = ESTADO_MESA[mesa.estadoMesa] ?? ESTADO_MESA.LIBRE;
          const gridColor = mesa.estaActivo === 1
            ? (GRID_COLOR[mesa.estadoMesa] ?? GREEN)
            : '#9ca3af';
          return (
            <View key={mesa.id} style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
              borderColor: '#f1f5f9', marginBottom: 14, overflow: 'hidden',
              shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
              {/* Mesa header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center',
                  justifyContent: 'center', backgroundColor: gridColor }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                    {String(mesa.numeroMesa).padStart(2, '0')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>Mesa {mesa.numeroMesa}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                    {mesa._count?.reunion ?? mesa.reunion?.length ?? 0} reunión(es) · {mesa.capacidadPersonas} personas
                  </Text>
                </View>
                {/* Estado mesa badge */}
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                  backgroundColor: cfg.bg }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
                </View>
              </View>

              {/* Reuniones */}
              {mesa.reunion && mesa.reunion.length > 0
                ? mesa.reunion.map((r: any) => <ReunionRow key={r.id} r={r} />)
                : (
                  <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#86efac' }} />
                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>Disponible — sin reuniones asignadas</Text>
                  </View>
                )
              }
            </View>
          );
        })}

        {mesasFiltradas.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Armchair color="#d1d5db" size={40} />
            <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 10, fontWeight: '500' }}>
              Sin mesas con ese filtro
            </Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
