import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CreditCard, PlusCircle, TrendingUp } from 'lucide-react-native';
import PagosScreen from './PagosScreen';
import PagosAdicionalesScreen from './PagosAdicionalesScreen';
import { usePagosPendientes } from '../../hooks/usePagosPendientes';

const GREEN = '#449D3A';

const Badge = ({ n, claro = false }: { n: number; claro?: boolean }) => n > 0 ? (
  <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: claro ? 0 : 1, borderColor: '#fff' }}>
    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{n > 99 ? '99+' : n}</Text>
  </View>
) : null;

// Unifica "Pagos" (verificación de inscripción) y los pagos "Adicionales":
// cupos extra y mejoras de paquete (dos subsecciones), con badges rojos de pendientes.
export default function PagosUnificadoScreen({ navigation, route }: any) {
  const [tab, setTab] = useState<'iniciales' | 'adicionales'>(
    route?.params?.initialTab === 'adicionales' ? 'adicionales' : 'iniciales',
  );
  const [sub, setSub] = useState<'cupos' | 'mejoras'>(route?.params?.initialSub === 'mejoras' ? 'mejoras' : 'cupos');
  const pendientes = usePagosPendientes();

  React.useEffect(() => {
    if (route?.params?.initialTab === 'adicionales') setTab('adicionales');
    if (route?.params?.initialSub === 'mejoras') setSub('mejoras');
  }, [route?.params?.initialTab, route?.params?.initialSub]);

  const pill = (activo: boolean) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: activo ? GREEN : '#f3f4f6' });
  const txt = (activo: boolean) => ({ color: activo ? '#fff' : '#6b7280', fontSize: 13, fontWeight: '600' as const });

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>Pagos</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Inscripción, cupos adicionales y mejoras de paquete</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity onPress={() => setTab('iniciales')} style={pill(tab === 'iniciales')}>
            <CreditCard color={tab === 'iniciales' ? '#fff' : '#6b7280'} size={14} />
            <Text style={txt(tab === 'iniciales')}>Iniciales</Text>
            <Badge n={pendientes.iniciales} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('adicionales')} style={pill(tab === 'adicionales')}>
            <PlusCircle color={tab === 'adicionales' ? '#fff' : '#6b7280'} size={14} />
            <Text style={txt(tab === 'adicionales')}>Adicionales</Text>
            <Badge n={pendientes.adicionales + pendientes.mejoras} />
          </TouchableOpacity>
        </View>
        {tab === 'adicionales' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity onPress={() => setSub('cupos')} style={{ ...pill(sub === 'cupos'), paddingVertical: 6 }}>
              <PlusCircle color={sub === 'cupos' ? '#fff' : '#6b7280'} size={13} />
              <Text style={{ ...txt(sub === 'cupos'), fontSize: 12 }}>Cupos</Text>
              <Badge n={pendientes.adicionales} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSub('mejoras')} style={{ ...pill(sub === 'mejoras'), paddingVertical: 6 }}>
              <TrendingUp color={sub === 'mejoras' ? '#fff' : '#6b7280'} size={13} />
              <Text style={{ ...txt(sub === 'mejoras'), fontSize: 12 }}>Mejoras de paquete</Text>
              <Badge n={pendientes.mejoras} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {tab === 'iniciales'
        ? <PagosScreen navigation={navigation} embedded />
        : <PagosAdicionalesScreen key={sub} embedded tipo={sub === 'mejoras' ? 'mejora' : 'adicional'} />}
    </View>
  );
}
