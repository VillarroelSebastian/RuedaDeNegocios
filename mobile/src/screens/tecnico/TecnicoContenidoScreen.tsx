import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Bell, Megaphone, CalendarCheck, Radio } from 'lucide-react-native';
import NoticiasScreen from '../admin/NoticiasScreen';
import TecnicoEventosVivoScreen from './TecnicoEventosVivoScreen';
import ActividadesScreen from '../admin/ActividadesScreen';
import StaffNotificacionesScreen from '../shared/StaffNotificacionesScreen';

const GREEN = '#449D3A';
const TABS = [
  ['avisos', 'Alertas', Bell],
  ['comunicados', 'Comunicados', Megaphone],
  ['actividades', 'Actividades', CalendarCheck],
  ['vivo', 'En vivo', Radio],
] as const;

export default function TecnicoContenidoScreen({ navigation }: any) {
  const [tab, setTab] = useState<'avisos' | 'comunicados' | 'actividades' | 'vivo'>('avisos');
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, gap: 8 }}>
        {TABS.map(([id, label, Icon]) => {
          const activo = tab === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setTab(id)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
                backgroundColor: activo ? GREEN : '#fff',
                borderWidth: 1.5, borderColor: activo ? GREEN : '#e2e8f0',
              }}
            >
              <Icon size={15} color={activo ? '#fff' : '#64748b'} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: activo ? '#fff' : '#475569' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
    <View style={{ flex: 1 }}>
      {tab === 'avisos' && <StaffNotificacionesScreen navigation={navigation} />}
      {tab === 'comunicados' && <NoticiasScreen />}
      {tab === 'actividades' && <ActividadesScreen mostrarCronograma={false} />}
      {tab === 'vivo' && <TecnicoEventosVivoScreen />}
    </View>
  </View>;
}
