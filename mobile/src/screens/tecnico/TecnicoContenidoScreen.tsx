import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import NoticiasScreen from '../admin/NoticiasScreen';
import EventConfigScreen from '../admin/EventConfigScreen';
import TecnicoEventosVivoScreen from './TecnicoEventosVivoScreen';
import ActividadesScreen from '../admin/ActividadesScreen';

export default function TecnicoContenidoScreen() {
  const [tab, setTab] = useState<'comunicados'|'actividades'|'eventos'|'vivo'>('comunicados');
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <View style={{ flexDirection: 'row', gap: 6, padding: 10, backgroundColor: '#fff' }}>
      {([['comunicados','Comunicados'],['actividades','Actividades'],['eventos','Eventos'],['vivo','En vivo']] as const).map(([id,label]) =>
        <TouchableOpacity key={id} onPress={() => setTab(id)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: tab === id ? '#449D3A' : '#f1f5f9' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: tab === id ? '#fff' : '#475569' }}>{label}</Text>
        </TouchableOpacity>)}
    </View>
    <View style={{ flex: 1 }}>
      {tab === 'comunicados' && <NoticiasScreen />}
      {tab === 'actividades' && <ActividadesScreen />}
      {tab === 'eventos' && <EventConfigScreen />}
      {tab === 'vivo' && <TecnicoEventosVivoScreen />}
    </View>
  </View>;
}
