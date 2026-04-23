import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, Image, Linking,
} from 'react-native';
import {
  Armchair, Calendar, Clock, Building2, Video, MapPin,
  Link2, Star, FileText, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  VIRTUAL:    { label: 'Virtual',    color: '#2563eb', bg: '#dbeafe' },
  PRESENCIAL: { label: 'Presencial', color: '#059669', bg: '#d1fae5' },
  MIXTA:      { label: 'Mixta',      color: '#7c3aed', bg: '#ede9fe' },
};

const ESTADO_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  FINALIZADA: { color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  EN_CURSO:   { color: '#c2410c', bg: '#ffedd5', dot: '#f97316' },
  PROGRAMADA: { color: '#1d4ed8', bg: '#dbeafe', dot: '#60a5fa' },
  CANCELADA:  { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
};

function CompanyChip({ empresa }: { empresa: any }) {
  return (
    <View className="flex-row items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2 flex-1 min-w-0">
      {empresa?.urlFotoPerfil ? (
        <Image
          source={{ uri: empresa.urlFotoPerfil }}
          className="w-8 h-8 rounded-full shrink-0"
          resizeMode="cover"
        />
      ) : (
        <View className="w-8 h-8 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: '#dcfce7' }}>
          <Building2 color={GREEN} size={14} />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>{empresa?.nombre ?? '—'}</Text>
        <Text className="text-[10px] text-gray-500" numberOfLines={1}>{empresa?.rubro ?? ''}</Text>
      </View>
    </View>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} size={12} color={s <= value ? '#f59e0b' : '#e5e7eb'} fill={s <= value ? '#f59e0b' : 'none'} />
      ))}
    </View>
  );
}

function getMapsUrl(sol: any): string | null {
  if (sol?.ubicacionGoogleMapsReunion) return sol.ubicacionGoogleMapsReunion;
  if (sol?.latitudPresencial && sol?.longitudPresencial)
    return `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}`;
  if (sol?.direccionTexto)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`;
  return null;
}

function ReunionCard({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);
  const estado = ESTADO_CONFIG[r.estadoReunion] ?? ESTADO_CONFIG.PROGRAMADA;
  const tipo = TIPO_CONFIG[r.tipoReunion] ?? TIPO_CONFIG.PRESENCIAL;
  const sol = r.solicitudreunion;
  const empresaA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const empresaB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const resultados = r.resultadoreunion ?? [];
  const linkVirtual = sol?.enlaceReunionVirtual;
  const direccion = sol?.direccionTexto;
  const mapsUrl = getMapsUrl(sol);
  const esVirtual = r.tipoReunion === 'VIRTUAL' || r.tipoReunion === 'MIXTA';
  const esPresencial = r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';

  return (
    <View className="border-t border-gray-50">
      {/* Row principal */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        className="px-4 py-3"
        activeOpacity={0.8}
      >
        {/* Empresas */}
        <View className="flex-row items-center gap-2 mb-2">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: estado.dot }} />
          <CompanyChip empresa={empresaA} />
          <Text className="text-gray-300 font-bold text-xs shrink-0">↔</Text>
          <CompanyChip empresa={empresaB} />
          {expanded
            ? <ChevronUp color="#9ca3af" size={16} />
            : <ChevronDown color="#9ca3af" size={16} />
          }
        </View>

        {/* Info row */}
        <View className="flex-row items-center gap-2 flex-wrap ml-4">
          {/* Tipo */}
          <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: tipo.bg }}>
            {r.tipoReunion === 'VIRTUAL' && <Video color={tipo.color} size={10} />}
            {r.tipoReunion === 'PRESENCIAL' && <MapPin color={tipo.color} size={10} />}
            {r.tipoReunion === 'MIXTA' && <Link2 color={tipo.color} size={10} />}
            <Text style={{ color: tipo.color, fontSize: 9, fontWeight: '700' }}>{tipo.label}</Text>
          </View>
          {/* Fecha */}
          <View className="flex-row items-center gap-1">
            <Calendar color="#9ca3af" size={11} />
            <Text className="text-[10px] text-gray-500">{fmtDate(r.fechaHoraInicioReunion)}</Text>
          </View>
          {/* Hora */}
          <View className="flex-row items-center gap-1">
            <Clock color="#9ca3af" size={11} />
            <Text className="text-[10px] text-gray-500">
              {fmtTime(r.fechaHoraInicioReunion)}–{fmtTime(r.fechaHoraFinReunion)}
            </Text>
          </View>
          {/* Estado */}
          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: estado.bg }}>
            <Text style={{ color: estado.color, fontSize: 9, fontWeight: '700' }}>{r.estadoReunion}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Detalles expandidos */}
      {expanded && (
        <View className="px-4 pb-4 bg-gray-50/60 space-y-3">

          {/* Asistentes */}
          {r.cantidadAsistentesRegistrados > 0 && (
            <Text className="text-xs text-gray-500">
              <Text className="font-semibold">Asistentes: </Text>{r.cantidadAsistentesRegistrados}
            </Text>
          )}

          {/* Botones de acción principales */}
          {(esVirtual && linkVirtual) || (esPresencial && mapsUrl) ? (
            <View className="gap-2">
              {esVirtual && linkVirtual && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(linkVirtual)}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-xl"
                  style={{ backgroundColor: '#2563eb' }}
                  activeOpacity={0.85}
                >
                  <Video color="white" size={16} />
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
                    Entrar a reunión virtual
                  </Text>
                </TouchableOpacity>
              )}
              {esPresencial && mapsUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(mapsUrl)}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-xl"
                  style={{ backgroundColor: '#059669' }}
                  activeOpacity={0.85}
                >
                  <MapPin color="white" size={16} />
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
                    Ver ubicación en Google Maps
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Dirección texto (siempre visible si hay) */}
          {esPresencial && direccion && (
            <View className="flex-row items-start gap-1.5">
              <MapPin color="#059669" size={13} style={{ marginTop: 2 }} />
              <Text className="text-xs text-gray-600 flex-1">{direccion}</Text>
            </View>
          )}

          {/* Observaciones */}
          {r.observacionesReunion && (
            <View>
              <View className="flex-row items-center gap-1 mb-1">
                <FileText color="#6b7280" size={13} />
                <Text className="text-xs font-semibold text-gray-700">Observaciones</Text>
              </View>
              <Text className="text-xs text-gray-600">{r.observacionesReunion}</Text>
            </View>
          )}

          {/* Mensaje solicitud */}
          {sol?.mensajeParaEmpresaReceptora && (
            <View>
              <Text className="text-xs font-semibold text-gray-700 mb-1">Mensaje al receptor</Text>
              <Text className="text-xs text-gray-500 italic">"{sol.mensajeParaEmpresaReceptora}"</Text>
            </View>
          )}

          {/* Resultados */}
          {resultados.length > 0 && (
            <View className="border-t border-gray-200 pt-3">
              <Text className="text-xs font-bold text-gray-700 mb-2">Resultados de la reunión</Text>
              {resultados.map((res: any) => (
                <View key={res.id} className="bg-white rounded-lg border border-gray-100 p-3 mb-2 space-y-1">
                  <View className="flex-row items-center justify-between">
                    <StarRating value={res.calificacionReunion} />
                    {res.rangoAcuerdoComercial && (
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef3c7' }}>
                        <Text style={{ color: '#b45309', fontSize: 9, fontWeight: '700' }}>
                          Acuerdo: {res.rangoAcuerdoComercial}
                        </Text>
                      </View>
                    )}
                  </View>
                  {res.observacionesPuntosTratados && (
                    <Text className="text-[10px] text-gray-500">{res.observacionesPuntosTratados}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function AgendaScreen() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/mesas/agenda`);
      const data = await res.json();
      setMesas(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAgenda(); }, []);

  const todasReuniones = mesas.flatMap((m) => m.reunion ?? []);
  const mesasConReuniones = mesas.filter((m) => (m.reunion?.length ?? 0) > 0);
  const estados = ['TODOS', 'PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'];

  const mesasFiltradas = mesas
    .map((m) => ({
      ...m,
      reunion: (m.reunion ?? []).filter((r: any) =>
        filtroEstado === 'TODOS' || r.estadoReunion === filtroEstado
      ),
    }))
    .filter((m) => filtroEstado === 'TODOS' || m.reunion.length > 0);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F9FAFB]">
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F9FAFB]"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchAgenda(); }}
          tintColor={GREEN}
        />
      }
    >
      <View className="px-4 py-4">

        {/* Summary cards */}
        <View className="flex-row gap-2 mb-4 flex-wrap">
          {[
            { label: 'Mesas', value: mesas.length, color: '#1f2937' },
            { label: 'Ocupadas', value: mesasConReuniones.length, color: GREEN },
            { label: 'Reuniones', value: todasReuniones.length, color: '#2563eb' },
            { label: 'Finalizadas', value: todasReuniones.filter((r) => r.estadoReunion === 'FINALIZADA').length, color: '#6b7280' },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, minWidth: '22%' }}
              className="bg-white rounded-xl border border-gray-100 px-3 py-3 shadow-sm items-center">
              <Text style={{ color: s.color }} className="text-xl font-bold">{s.value}</Text>
              <Text className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filtro de estado */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {estados.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setFiltroEstado(e)}
                className="px-3 py-1.5 rounded-lg border"
                style={{
                  backgroundColor: filtroEstado === e ? GREEN : 'white',
                  borderColor: filtroEstado === e ? GREEN : '#e5e7eb',
                }}
              >
                <Text style={{
                  color: filtroEstado === e ? 'white' : '#6b7280',
                  fontSize: 11,
                  fontWeight: '600',
                }}>
                  {e === 'TODOS' ? 'Todos' : e}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {mesas.length === 0 ? (
          <View className="bg-white rounded-xl border border-gray-100 p-12 items-center">
            <Armchair color="#d1d5db" size={40} />
            <Text className="text-gray-400 text-sm mt-3 text-center">No hay mesas configuradas para el evento</Text>
          </View>
        ) : (
          mesasFiltradas.map((mesa) => (
            <View key={mesa.id} className="bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
              {/* Mesa header */}
              <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50"
                style={{ backgroundColor: '#f9fafb' }}>
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                  style={{ backgroundColor: mesa.estaActivo === 1 ? GREEN : '#e5e7eb' }}
                >
                  <Text style={{
                    color: mesa.estaActivo === 1 ? '#fff' : '#9ca3af',
                    fontWeight: '700',
                    fontSize: 13,
                  }}>
                    {String(mesa.numeroMesa).padStart(2, '0')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-sm">Mesa {mesa.numeroMesa}</Text>
                  <Text className="text-xs text-gray-400">
                    {mesa.reunion?.length ?? 0} reunión(es) · {mesa.capacidadPersonas} personas
                  </Text>
                </View>
                <View
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: mesa.estaActivo === 1 ? '#dcfce7' : '#f3f4f6' }}
                >
                  <Text style={{
                    color: mesa.estaActivo === 1 ? '#15803d' : '#9ca3af',
                    fontSize: 11,
                    fontWeight: '700',
                  }}>
                    {mesa.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                  </Text>
                </View>
              </View>

              {/* Reuniones */}
              {mesa.reunion && mesa.reunion.length > 0 ? (
                mesa.reunion.map((r: any) => (
                  <ReunionCard key={r.id} r={r} />
                ))
              ) : (
                <Text className="px-4 py-4 text-xs text-gray-400 italic text-center">
                  Sin reuniones programadas
                </Text>
              )}
            </View>
          ))
        )}

        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
