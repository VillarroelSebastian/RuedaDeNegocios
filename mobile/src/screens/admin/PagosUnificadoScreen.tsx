import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CreditCard, PlusCircle } from 'lucide-react-native';
import PagosScreen from './PagosScreen';
import PagosAdicionalesScreen from './PagosAdicionalesScreen';

const GREEN = '#449D3A';

// Unifica "Pagos" (verificación de inscripción) y "Pagos Adicionales" (cupos
// extra) en una sola pantalla con pestañas: son dos flujos de pago
// distintos, pero no tenía sentido que vivieran en secciones separadas.
export default function PagosUnificadoScreen({ navigation, route }: any) {
  const [tab, setTab] = useState<'iniciales' | 'adicionales'>(
    route?.params?.initialTab === 'adicionales' ? 'adicionales' : 'iniciales',
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>Pagos</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Inscripción y cupos adicionales</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity onPress={() => setTab('iniciales')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: tab === 'iniciales' ? GREEN : '#f3f4f6' }}>
            <CreditCard color={tab === 'iniciales' ? '#fff' : '#6b7280'} size={14} />
            <Text style={{ color: tab === 'iniciales' ? '#fff' : '#6b7280', fontSize: 13, fontWeight: '600' }}>Iniciales</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('adicionales')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: tab === 'adicionales' ? GREEN : '#f3f4f6' }}>
            <PlusCircle color={tab === 'adicionales' ? '#fff' : '#6b7280'} size={14} />
            <Text style={{ color: tab === 'adicionales' ? '#fff' : '#6b7280', fontSize: 13, fontWeight: '600' }}>Adicionales</Text>
          </TouchableOpacity>
        </View>
      </View>
      {tab === 'iniciales'
        ? <PagosScreen navigation={navigation} embedded />
        : <PagosAdicionalesScreen embedded />}
    </View>
  );
}
