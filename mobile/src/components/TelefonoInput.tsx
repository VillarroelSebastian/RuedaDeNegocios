import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleProp, Text, TextInput, TextStyle, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';
import { PAISES_TEL, DIAL_BOLIVIA, MAX_DIGITOS_NUMERO, componerTelefono, parsearTelefono, soloDigitos } from '../utils/telefono';

const GREEN = '#449D3A';

// Teléfono con selector de código de país (Bolivia por defecto). Solo acepta
// dígitos en el número y entrega el valor como "+591 70000000". La lista de
// países se despliega en línea (no en un Modal) para poder usarlo dentro de
// formularios que ya están en un Modal.
export default function TelefonoInput({ value, onChange, dialDefecto = DIAL_BOLIVIA, inputStyle, placeholder = '70000000', editable = true }: {
  value: string; onChange: (v: string) => void; dialDefecto?: string; inputStyle?: StyleProp<TextStyle>; placeholder?: string; editable?: boolean;
}) {
  const { dial, numero } = useMemo(() => parsearTelefono(value, dialDefecto), [value, dialDefecto]);
  // Mientras no hay número se respeta el código elegido aunque el valor sea ''.
  const [dialLocal, setDialLocal] = useState(dial);
  useEffect(() => { if (value) setDialLocal(dial); }, [value, dial]);
  useEffect(() => { if (!value) setDialLocal(dialDefecto); }, [dialDefecto]); // eslint-disable-line react-hooks/exhaustive-deps
  const dialActual = value ? dial : dialLocal;
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const pais = PAISES_TEL.find((p) => p.dial === dialActual) ?? PAISES_TEL[0];
  const lista = PAISES_TEL.filter((p) => `${p.nombre} ${p.iso} +${p.dial}`.toLowerCase().includes(busqueda.trim().toLowerCase()));
  const base: TextStyle = { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#0f172a' };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity disabled={!editable} onPress={() => { setAbierto((a) => !a); setBusqueda(''); }} activeOpacity={0.8}
          style={[base, { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', minWidth: 94 }]}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{pais.iso} +{pais.dial}</Text>
          <ChevronDown size={14} color="#64748b" />
        </TouchableOpacity>
        <TextInput
          editable={editable} value={numero} maxLength={MAX_DIGITOS_NUMERO} keyboardType="number-pad"
          onChangeText={(v) => onChange(componerTelefono(dialActual, soloDigitos(v)))}
          placeholder={placeholder} placeholderTextColor="#9ca3af"
          style={[base, { flex: 1 }, inputStyle]}
        />
      </View>
      {abierto && (
        <View style={{ marginTop: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Search size={14} color="#94a3b8" />
            <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar país…" placeholderTextColor="#9ca3af" style={{ flex: 1, paddingVertical: 9, fontSize: 13 }} />
          </View>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {lista.map((p) => (
              <TouchableOpacity key={p.iso} onPress={() => { setDialLocal(p.dial); onChange(componerTelefono(p.dial, numero)); setAbierto(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: p.dial === dialActual ? '#f0fdf4' : '#fff' }}>
                <Text style={{ flex: 1, fontSize: 13, color: '#0f172a' }}>{p.nombre}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>{p.iso} +{p.dial}</Text>
                {p.dial === dialActual && <Check size={14} color={GREEN} />}
              </TouchableOpacity>
            ))}
            {lista.length === 0 && <Text style={{ padding: 12, fontSize: 12, color: '#94a3b8' }}>Sin resultados</Text>}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
