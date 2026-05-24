import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import {
  Calendar, Building2, Video, MapPin, Link2,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function dayKey(iso: string) {
  return iso.substring(0, 10);
}

function fmtDay(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS[dt.getDay()]}, ${d} de ${MESES[m - 1]} de ${y}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const ESTADO_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  PROGRAMADA: { color: '#1d4ed8', bg: '#dbeafe', dot: '#60a5fa', label: 'Programada' },
  EN_CURSO:   { color: '#c2410c', bg: '#ffedd5', dot: '#f97316',  label: 'En curso'   },
};

export default function AgendaScreen() {
  const [reservaciones, setReservaciones] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgenda = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/admin/mesas/agenda`);
      const data = await res.json();
      const mesas: any[] = data.mesas ?? (Array.isArray(data) ? data : []);
      const items: any[] = [];
      for (const mesa of mesas) {
        for (const r of mesa.reunion ?? []) {
          if (r.estadoReunion === 'PROGRAMADA' || r.estadoReunion === 'EN_CURSO') {
            items.push({ ...r, mesa });
          }
        }
      }
      items.sort((a, b) =>
        new Date(a.fechaHoraInicioReunion).getTime() - new Date(b.fechaHoraInicioReunion).getTime()
      );
      setReservaciones(items);
    } catch { setReservaciones([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAgenda(); }, []);

  const byDay: Record<string, any[]> = {};
  for (const r of reservaciones) {
    const k = dayKey(r.fechaHoraInicioReunion);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(r);
  }
  const days = Object.keys(byDay).sort((a, b) => a.localeCompare(b));

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

        {days.length === 0 ? (
          <View className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 items-center mt-8">
            <Calendar color="#d1d5db" size={40} />
            <Text className="text-gray-500 font-semibold text-sm mt-3 text-center">
              No hay reservaciones activas
            </Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">
              Todas las reuniones están finalizadas o no hay mesas programadas.
            </Text>
          </View>
        ) : (
          <View className="gap-6">
            {days.map((day) => (
              <View key={day}>
                {/* Day header */}
                <View className="flex-row items-center gap-3 mb-3">
                  <View
                    className="flex-row items-center gap-2 px-3 py-2 rounded-xl shadow-sm"
                    style={{ backgroundColor: GREEN }}
                  >
                    <Calendar color="white" size={14} />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }} className="capitalize">
                      {fmtDay(day)}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400 font-semibold">
                    {byDay[day].length} reservación(es)
                  </Text>
                </View>

                {/* Cards del día */}
                <View className="gap-2">
                  {byDay[day].map((r) => {
                    const sol = r.solicitudreunion;
                    const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
                    const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
                    const est = ESTADO_CONFIG[r.estadoReunion] ?? ESTADO_CONFIG.PROGRAMADA;
                    const mesa = r.mesa;
                    const badgeColor = r.estadoReunion === 'EN_CURSO' ? '#f97316' : '#3b82f6';

                    return (
                      <View
                        key={r.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                      >
                        <View className="flex-row items-center gap-3 px-4 py-3">
                          {/* Mesa badge */}
                          <View
                            className="w-11 h-11 rounded-xl items-center justify-center shrink-0 shadow-sm"
                            style={{ backgroundColor: badgeColor }}
                          >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
                              {String(mesa?.numeroMesa ?? '?').padStart(2, '0')}
                            </Text>
                          </View>

                          {/* Horario */}
                          <View className="shrink-0 items-center" style={{ minWidth: 44 }}>
                            <Text className="text-xs font-extrabold text-gray-900">
                              {fmtTime(r.fechaHoraInicioReunion)}
                            </Text>
                            <Text className="text-[10px] text-gray-400">–</Text>
                            <Text className="text-xs font-bold text-gray-600">
                              {fmtTime(r.fechaHoraFinReunion)}
                            </Text>
                          </View>

                          {/* Separator */}
                          <View className="w-px self-stretch bg-gray-100 shrink-0" />

                          {/* Empresas */}
                          <View className="flex-1 min-w-0">
                            <CompanyRow empresa={ea} isA />
                            <View className="flex-row items-center gap-1 my-0.5">
                              <View className="flex-1 h-px bg-gray-100" />
                              <Text className="text-[9px] text-gray-300 font-bold">vs</Text>
                              <View className="flex-1 h-px bg-gray-100" />
                            </View>
                            <CompanyRow empresa={eb} isA={false} />
                          </View>
                        </View>

                        {/* Footer badges */}
                        <View className="flex-row items-center gap-2 px-4 pb-3 flex-wrap">
                          {/* Estado */}
                          <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: est.bg }}>
                            <View className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: est.dot }} />
                            <Text style={{ color: est.color, fontSize: 9, fontWeight: '700' }}>
                              {est.label}
                            </Text>
                          </View>
                          {/* Tipo */}
                          <TipoBadge tipo={r.tipoReunion} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="h-8" />
      </View>
    </ScrollView>
  );
}

function CompanyRow({ empresa, isA }: Readonly<{ empresa: any; isA: boolean }>) {
  return (
    <View className="flex-row items-center gap-1.5">
      {empresa?.urlFotoPerfil ? (
        <Image
          source={{ uri: empresa.urlFotoPerfil }}
          className="w-6 h-6 rounded-full shrink-0 border border-gray-100"
          resizeMode="contain"
        />
      ) : (
        <View
          className="w-6 h-6 rounded-full items-center justify-center shrink-0"
          style={{ backgroundColor: isA ? '#dcfce7' : '#dbeafe' }}
        >
          <Building2 color={isA ? '#15803d' : '#2563eb'} size={12} />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
          {empresa?.nombre ?? '—'}
        </Text>
        {empresa?.rubro ? (
          <Text className="text-[9px] text-gray-400" numberOfLines={1}>{empresa.rubro}</Text>
        ) : null}
      </View>
    </View>
  );
}

function TipoBadge({ tipo }: Readonly<{ tipo: string }>) {
  const cfg: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    VIRTUAL:    { label: 'Virtual',    color: '#2563eb', bg: '#dbeafe', Icon: Video   },
    PRESENCIAL: { label: 'Presencial', color: '#059669', bg: '#d1fae5', Icon: MapPin  },
    MIXTA:      { label: 'Mixta',      color: '#7c3aed', bg: '#ede9fe', Icon: Link2   },
  };
  const c = cfg[tipo] ?? cfg.PRESENCIAL;
  const Icon = c.Icon;
  return (
    <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg }}>
      <Icon color={c.color} size={9} />
      <Text style={{ color: c.color, fontSize: 9, fontWeight: '700' }}>{c.label}</Text>
    </View>
  );
}
