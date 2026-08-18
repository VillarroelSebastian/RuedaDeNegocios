import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { CheckCircle2, QrCode } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL, userStore } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

export default function TecnicoAsistenciaScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { show, modal } = useModal();
  const tecnicoId = userStore.get()?.id;

  const cargar = useCallback(async () => {
    if (!tecnicoId) return;
    try {
      const res = await fetch(`${API_URL}/tecnico/asistencias?tecnicoId=${tecnicoId}`);
      const data = await res.json();
      setAsistencias(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [tecnicoId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const procesarQR = async (contenido: string) => {
    if (procesando) return;
    const match = contenido.match(/\/credencial\/(\d+)\?t=([a-zA-Z0-9]+)/);
    if (!match) {
      setEscaneando(false);
      show({ type: 'error', title: 'QR no valido', message: 'Este codigo no corresponde a una credencial del evento.' });
      return;
    }
    setProcesando(true);
    try {
      const res = await fetch(`${API_URL}/tecnico/asistencias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tecnicoId, euId: Number(match[1]), token: match[2] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'No se pudo registrar la asistencia.');
      setEscaneando(false);
      show({ type: data.yaRegistrada ? 'warning' : 'success', title: data.yaRegistrada ? 'Asistencia ya registrada' : 'Asistencia registrada', message: `${data.participante.nombre} · ${data.participante.empresa}` });
      cargar();
    } catch (e: any) {
      setEscaneando(false);
      show({ type: 'error', title: 'No se pudo registrar', message: e.message });
    } finally { setProcesando(false); }
  };

  if (escaneando) {
    if (!permission?.granted) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <QrCode size={48} color={GREEN} />
      <Text style={{ textAlign: 'center', marginVertical: 16, color: '#475569' }}>Se necesita permiso de camara para escanear credenciales.</Text>
      <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}><Text style={{ color: '#fff', fontWeight: '800' }}>Permitir camara</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setEscaneando(false)} style={{ padding: 16 }}><Text style={{ color: '#64748b' }}>Volver</Text></TouchableOpacity>
    </View>;
    return <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => procesarQR(data)} />
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: 30, gap: 10 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{procesando ? 'Registrando...' : 'Apunta al QR de la credencial'}</Text>
        <TouchableOpacity onPress={() => setEscaneando(false)} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 13, alignItems: 'center' }}><Text style={{ fontWeight: '800', color: '#111827' }}>Cancelar</Text></TouchableOpacity>
      </View>{modal}
    </View>;
  }

  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <View style={{ padding: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>Control de asistencia</Text>
      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Escanea la credencial y registra la hora de llegada.</Text>
      <TouchableOpacity onPress={() => setEscaneando(true)} style={{ marginTop: 14, backgroundColor: GREEN, borderRadius: 14, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}><QrCode size={20} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800' }}>Escanear QR</Text></TouchableOpacity>
    </View>
    {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={GREEN} /> : <FlatList data={asistencias} keyExtractor={(item) => String(item.id)} contentContainerStyle={{ padding: 16, gap: 10 }} ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 50 }}>Todavia no registraste asistencias.</Text>} renderItem={({ item }) => <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, flexDirection: 'row', gap: 10 }}><CheckCircle2 size={20} color={GREEN} /><View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: '#0f172a' }}>{item.empresa_usuario?.usuario?.nombres} {item.empresa_usuario?.usuario?.apellidoPaterno}</Text><Text style={{ color: '#64748b', fontSize: 12 }}>{item.empresa_usuario?.empresa?.nombre}</Text><Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 3 }}>{new Date(item.fechaHoraAsistencia).toLocaleString('es-BO')}</Text></View></View>} refreshing={loading} onRefresh={cargar} />}
    {modal}
  </View>;
}
