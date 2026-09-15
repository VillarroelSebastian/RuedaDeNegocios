import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Radio } from 'lucide-react-native';
import { useModal } from '../../components/AppModal';
import CronogramaVivo from '../../components/CronogramaVivo';

const GREEN = '#449D3A';

export default function TecnicoEventosVivoScreen() {
  const { show, modal } = useModal();
  // El refresco automático vive dentro de CronogramaVivo; este pull-to-refresh
  // solo le da al usuario una señal visual de "ya se actualizó".
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {modal}
      <View style={{ padding: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Radio size={22} color="#dc2626" />
        <View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>Cronograma en vivo</Text>
          <Text style={{ color: '#64748b', fontSize: 12 }}>Actualiza en tiempo real qué está pasando en el evento.</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
      >
        <CronogramaVivo staff onError={(m) => show({ type: 'error', title: 'No se pudo actualizar', message: m })} />
      </ScrollView>
    </View>
  );
}
