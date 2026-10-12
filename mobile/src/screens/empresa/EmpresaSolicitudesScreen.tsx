import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Building2, CalendarDays } from 'lucide-react-native';
import { userStore } from '../../utils/userStore';
import EmpresaEmpresasScreen from './EmpresaEmpresasScreen';
import EmpresaReunionesScreen from './EmpresaReunionesScreen';

const GREEN = '#449D3A';

// Las antiguas pestañas "Enviadas"/"Recibidas" se eliminaron: toda la
// gestión de solicitudes (aceptar, rechazar, editar, cancelar) ahora vive
// directamente en "Reuniones", junto a las reuniones ya confirmadas.
export default function EmpresaSolicitudesScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const [esEncargado, setEsEncargado] = useState(!!userStore.get()?.esResponsable);
  useEffect(() => userStore.subscribe(() => setEsEncargado(!!userStore.get()?.esResponsable)), []);
  const [tab, setTab] = useState<'empresas' | 'reuniones'>('empresas');

  useEffect(() => {
    // Un participante (no encargado) solo tiene la vista de reuniones.
    if (!esEncargado) { setTab('reuniones'); return; }
    const solicitada = route?.params?.tab;
    if (solicitada) setTab(solicitada === 'empresas' ? 'empresas' : 'reuniones');
  }, [route?.params?.tab, esEncargado]);

  // 'recibidas'/'enviadas' son destinos heredados de notificaciones viejas:
  // ahora apuntan al filtro correspondiente dentro de "Reuniones".
  const filtroHeredado = route?.params?.tab === 'recibidas' ? 'pendientes'
    : route?.params?.tab === 'enviadas' ? 'enviadas'
    : route?.params?.filtro;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {esEncargado && (
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab === 'empresas' && s.tabActive]} onPress={() => setTab('empresas')}>
            <Building2 size={15} color={tab === 'empresas' ? GREEN : '#9ca3af'} />
            <Text style={[s.tabText, tab === 'empresas' && s.tabTextActive]}>Empresas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === 'reuniones' && s.tabActive]} onPress={() => setTab('reuniones')}>
            <CalendarDays size={15} color={tab === 'reuniones' ? GREEN : '#9ca3af'} />
            <Text style={[s.tabText, tab === 'reuniones' && s.tabTextActive]}>Reuniones</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={s.companySection}>
        {tab === 'empresas' ? (
          <EmpresaEmpresasScreen embedded />
        ) : (
          <EmpresaReunionesScreen
            navigation={navigation}
            embedded
            reunionIdProp={route?.params?.reunionId}
            filtroProp={filtroHeredado}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  companySection: { flex: 1 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  // Las dos pestañas quedaban pegadas y era fácil pulsar la de al lado: se
  // separan un poco y el texto baja de tamaño para que quepan holgadas.
  tab:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 4, marginHorizontal: 3, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: GREEN },
  tabText:       { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  tabTextActive: { color: GREEN },
});
