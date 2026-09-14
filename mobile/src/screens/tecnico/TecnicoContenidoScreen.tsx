import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import NoticiasScreen from '../admin/NoticiasScreen';
import TecnicoEventosVivoScreen from './TecnicoEventosVivoScreen';
import ActividadesScreen from '../admin/ActividadesScreen';
import StaffNotificacionesScreen from '../shared/StaffNotificacionesScreen';

export default function TecnicoContenidoScreen({ navigation }: any) {
  const [tab, setTab] = useState<'avisos'|'comunicados'|'actividades'|'vivo'>('avisos');
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <View style={{ flexDirection: 'row', gap: 6, padding: 10, backgroundColor: '#fff' }}>
      {([['avisos','Alertas'],['comunicados','Comunicados'],['actividades','Actividades'],['vivo','En vivo']] as const).map(([id,label]) =>
        <TouchableOpacity key={id} onPress={() => setTab(id)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: tab === id ? '#449D3A' : '#f1f5f9' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: tab === id ? '#fff' : '#475569' }}>{label}</Text>
        </TouchableOpacity>)}
    </View>
    <View style={{ flex: 1 }}>
      {tab === 'avisos' && <StaffNotificacionesScreen navigation={navigation} />}
      {tab === 'comunicados' && <NoticiasScreen />}
      {tab === 'actividades' && <ActividadesScreen />}
      {tab === 'vivo' && <TecnicoEventosVivoScreen />}
    </View>
  </View>;
}
