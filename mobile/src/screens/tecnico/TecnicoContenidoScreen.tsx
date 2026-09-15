import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Megaphone, Radio } from 'lucide-react-native';
import NoticiasScreen from '../admin/NoticiasScreen';
import ActividadesScreen from '../admin/ActividadesScreen';
import StaffNotificacionesScreen from '../shared/StaffNotificacionesScreen';

const GREEN = '#449D3A';
// "En vivo" incluye el cronograma Y el crear/editar eventos del programa,
// igual que la pantalla del admin y que la página web — antes estaba
// separado en dos pestañas ("Actividades" y "En vivo") y no coincidía
// con ninguna de las otras versiones.
const TABS = [
  ['avisos', 'Alertas', Bell],
  ['comunicados', 'Comunicados', Megaphone],
  ['vivo', 'En vivo', Radio],
] as const;

export default function TecnicoContenidoScreen({ navigation }: any) {
  const [tab, setTab] = useState<'avisos' | 'comunicados' | 'vivo'>('avisos');
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12, gap: 8 }}>
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
      {tab === 'vivo' && <ActividadesScreen mostrarCronograma />}
    </View>
  </SafeAreaView>;
}
