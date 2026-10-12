import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { permisoGaleria } from '../utils/permisosMedia';
import { ArrowDown, Pencil, Plus, Trash2, Upload, X } from 'lucide-react-native';
import { API_URL } from '../utils/userStore';
import { useModal } from './AppModal';
import ImagenLightbox from './ImagenLightbox';

const GREEN = '#449D3A';
const bs = (n: number | string) => `Bs. ${Number(n).toLocaleString('es-BO')}`;

// Paquetes de empresa de menor a mayor; entre cada par seguido va el espacio
// para configurar la mejora (costo + QR de pago).
export default function FlujoEmpresaMobile({ paquetes, eventoId, tarjeta }: { paquetes: any[]; eventoId: number | null; tarjeta: (p: any) => React.ReactNode }) {
  const { show, modal } = useModal();
  const guardandoRef = useRef(false);
  const empresa = paquetes.filter((p) => p.tipoPaquete === 'EMPRESA').sort((a, b) => Number(a.costo) - Number(b.costo));

  const [mejoras, setMejoras] = useState<any[]>([]);
  const [par, setPar] = useState<{ origen: any; destino: any; mejora: any | null } | null>(null);
  const [costo, setCosto] = useState('');
  const [urlQR, setUrlQR] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/admin/paquetes/mejoras${eventoId ? `?eventoId=${eventoId}` : ''}`);
      const d = r.ok ? await r.json() : [];
      setMejoras(Array.isArray(d) ? d : []);
    } catch { setMejoras([]); }
  }, [eventoId]);
  useEffect(() => { cargar(); }, [cargar, paquetes.length]);

  const mejoraEntre = (o: any, d: any) => mejoras.find((m) => m.origen_id === o.id && m.destino_id === d.id) ?? null;
  const abrir = (origen: any, destino: any) => {
    const mejora = mejoraEntre(origen, destino);
    setPar({ origen, destino, mejora });
    setCosto(mejora ? String(mejora.costo) : '');
    setUrlQR(mejora?.urlQR ?? '');
  };

  const elegirQR = async () => {
    const permiso = await permisoGaleria();
    if (!permiso.granted) return show({ type: 'warning', title: 'Permiso requerido', message: 'Se necesita acceso a las fotos para seleccionar el QR.' });
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9 });
    if (r.canceled) return;
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.append('file', { uri: r.assets[0].uri, name: 'qr.jpg', type: 'image/jpeg' } as any);
      const res = await fetch(`${API_URL}/admin/imagenes/upload`, { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.message || 'No se pudo subir.');
      setUrlQR(d.url);
    } catch (e: any) { show({ type: 'error', title: 'Error al subir', message: e.message }); }
    finally { setGuardando(false); }
  };

  const guardar = async () => {
    if (!par) return;
    if (costo.trim() === '' || !(Number(costo) >= 0) || !urlQR)
      return show({ type: 'warning', title: 'Datos incompletos', message: 'Indica el costo de la mejora y sube su QR de pago.' });
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const r = await fetch(par.mejora ? `${API_URL}/admin/paquetes/mejoras/${par.mejora.id}` : `${API_URL}/admin/paquetes/mejoras`, {
        method: par.mejora ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origenId: par.origen.id, destinoId: par.destino.id, costo: Number(costo), urlQR }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'No se pudo guardar.');
      setPar(null);
      await cargar();
      show({ type: 'success', title: 'Mejora guardada', message: 'Las empresas ya pueden pedir esta mejora.' });
    } catch (e: any) { show({ type: 'error', title: 'No se pudo guardar', message: e.message }); }
    finally { setGuardando(false); guardandoRef.current = false; }
  };

  const quitar = (o: any, d: any, m: any) => show({
    type: 'confirm', title: 'Quitar mejora', message: `¿Quitar la mejora de "${o.nombre}" a "${d.nombre}"?`,
    onConfirm: async () => {
      const r = await fetch(`${API_URL}/admin/paquetes/mejoras/${m.id}`, { method: 'DELETE' });
      const d2 = await r.json().catch(() => ({}));
      if (!r.ok) return show({ type: 'error', title: 'No se pudo quitar', message: d2.message || 'Intenta nuevamente.' });
      await cargar();
    },
  });

  if (!empresa.length) return null;

  return (
    <View style={{ gap: 12 }}>
      {modal}
      <Text style={{ color: '#64748b', fontSize: 12 }}>
        Paquetes de empresa de menor a mayor. Entre dos paquetes añade el QR de mejora: lo que paga una empresa para pasar del primero al segundo.
      </Text>
      {empresa.map((p, i) => {
        const sig = empresa[i + 1];
        const m = sig ? mejoraEntre(p, sig) : null;
        return (
          <View key={p.id} style={{ gap: 12 }}>
            {tarjeta(p)}
            {sig && (
              <View style={{ alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(68,157,58,.45)', backgroundColor: 'rgba(68,157,58,.05)', borderRadius: 16, padding: 14 }}>
                <ArrowDown size={18} color={GREEN} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 }}>MEJORA</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', textAlign: 'center' }}>{p.nombre} → {sig.nombre}</Text>
                {m ? (
                  <>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: GREEN }}>{bs(m.costo)}</Text>
                    <ImagenLightbox uri={m.urlQR} style={{ width: 64, height: 64, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' }} imgStyle={{ width: 64, height: 64 }} />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity onPress={() => abrir(p, sig)} style={{ padding: 8 }}><Pencil size={18} color="#475569" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => quitar(p, sig, m)} style={{ padding: 8 }}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity onPress={() => abrir(p, sig)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: GREEN, borderRadius: 11, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Plus size={16} color={GREEN} /><Text style={{ color: GREEN, fontWeight: '800', fontSize: 12 }}>Añadir QR de mejora</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}

      <Modal visible={!!par} transparent animationType="slide" onRequestClose={() => setPar(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
              <View style={{ padding: 17, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900' }}>{par?.mejora ? 'Editar mejora' : 'Añadir mejora'}</Text>
                  {par && <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{par.origen.nombre} ({bs(par.origen.costo)}) → {par.destino.nombre} ({bs(par.destino.costo)})</Text>}
                </View>
                <TouchableOpacity onPress={() => setPar(null)}><X size={22} color="#64748b" /></TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 17 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 5 }}>Costo de la mejora (Bs.) *</Text>
                <TextInput value={costo} onChangeText={setCosto} keyboardType="numeric" placeholder="100"
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 11 }} />
                {par && <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>Diferencia de precio entre ambos paquetes: {bs(Number(par.destino.costo) - Number(par.origen.costo))}.</Text>}
                <TouchableOpacity onPress={elegirQR} disabled={guardando} style={{ borderWidth: 1, borderColor: GREEN, borderRadius: 11, padding: 11, alignItems: 'center', marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 7 }}>
                  <Upload size={16} color={GREEN} /><Text style={{ color: GREEN, fontWeight: '800' }}>{urlQR ? 'Cambiar QR de la mejora' : 'Seleccionar QR de la mejora *'}</Text>
                </TouchableOpacity>
                {urlQR ? <View style={{ alignItems: 'center', marginTop: 10 }}><ImagenLightbox uri={urlQR} style={{ width: 110, height: 110, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' }} imgStyle={{ width: 110, height: 110 }} /></View> : null}
                <TouchableOpacity onPress={guardar} disabled={guardando} style={{ backgroundColor: GREEN, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, opacity: guardando ? 0.5 : 1 }}>
                  {guardando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>Guardar mejora</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
