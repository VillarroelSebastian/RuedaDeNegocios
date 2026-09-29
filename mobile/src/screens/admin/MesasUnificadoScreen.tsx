import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Armchair, ClipboardList } from 'lucide-react-native';
import AgendaScreen from './AgendaScreen';
import MesasScreen from './MesasScreen';
import TecnicoReunionesScreen from '../tecnico/TecnicoReunionesScreen';

const GREEN = '#449D3A';

// Unifica Agenda de Mesas, Mesas y Control de Reuniones en una sola
// pantalla con pestañas: son 3 vistas del mismo dato (mesas + reuniones),
// no tenía sentido que vivieran en secciones separadas del menú. La agenda
// (la vista más visual) queda primero/por defecto.
export default function MesasUnificadoScreen() {
  const [tab, setTab] = useState<'agenda' | 'mesas' | 'reuniones'>('agenda');

  const TABS = [
    { key: 'agenda' as const, label: 'Agenda', Icon: Calendar },
    { key: 'mesas' as const, label: 'Mesas', Icon: Armchair },
    { key: 'reuniones' as const, label: 'Reuniones', Icon: ClipboardList },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.switcher}>
        {TABS.map(({ key, label, Icon }) => (
          <TouchableOpacity key={key}
            style={[s.tabBtn, tab === key && s.tabBtnActive]}
            onPress={() => setTab(key)}
            activeOpacity={0.8}
          >
            <Icon size={14} color={tab === key ? '#fff' : '#6b7280'} />
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'agenda' && <AgendaScreen />}
        {tab === 'mesas' && <MesasScreen embedded />}
        {tab === 'reuniones' && <TecnicoReunionesScreen embedded />}
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
