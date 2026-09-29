import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Users } from 'lucide-react-native';
import StaffMensajesScreen from './StaffMensajesScreen';
import ChatInternoScreen from './ChatInternoScreen';

const GREEN = '#449D3A';

// Unifica "Mensajes" (empresa <-> staff) y "Equipo del evento" (chat interno
// admin <-> técnicos) en una sola pantalla con pestañas: son dos canales de
// mensajería distintos, pero no tenía sentido que vivieran en secciones
// separadas del menú.
export default function EquipoMensajesScreen() {
  const [tab, setTab] = useState<'empresas' | 'equipo'>('empresas');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.switcher}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'empresas' && s.tabBtnActive]}
          onPress={() => setTab('empresas')}
          activeOpacity={0.8}
        >
          <Building2 size={14} color={tab === 'empresas' ? '#fff' : '#6b7280'} />
          <Text style={[s.tabText, tab === 'empresas' && s.tabTextActive]}>Empresas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'equipo' && s.tabBtnActive]}
          onPress={() => setTab('equipo')}
          activeOpacity={0.8}
        >
          <Users size={14} color={tab === 'equipo' ? '#fff' : '#6b7280'} />
          <Text style={[s.tabText, tab === 'equipo' && s.tabTextActive]}>Equipo del evento</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'empresas' ? <StaffMensajesScreen embedded /> : <ChatInternoScreen embedded />}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  switcher: {
    flexDirection: 'row', gap: 6, padding: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 12, backgroundColor: '#f1f5f9',
  },
  tabBtnActive: { backgroundColor: GREEN },
  tabText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
});
