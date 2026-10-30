import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { X, Plus, Trash2 } from 'lucide-react-native';
import { API_URL } from '../utils/userStore';
import { RUBROS } from '../constants/rubros';

const GREEN = '#449D3A';
const personaVacia = () => ({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', cargo: '', correo: '', telefono: '' });
const empresaVacia = () => ({ nombre: '', rubro: '', correoCorporativo: '', telefonoWhatsapp: '', ciudadNombre: '', paisNombre: 'Bolivia' });
const inputStyle = { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#111827' } as const;

// Alta directa: crea la empresa y sus participantes y la deja habilitada sin
// comprobante de pago. Las credenciales se envían por correo.
export default function NuevaEmpresaModal({ visible, onClose, onCreada }: { visible: boolean; onClose: () => void; onCreada: (mensaje: string) => void }) {
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [paqueteId, setPaqueteId] = useState<number | null>(null);
  const [empresa, setEmpresa] = useState(empresaVacia());
  const [personas, setPersonas] = useState([personaVacia()]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    fetch(`${API_URL}/public/paquetes?tipo=EMPRESA`).then((r) => (r.ok ? r.json() : [])).then((d) => setPaquetes(Array.isArray(d) ? d : [])).catch(() => setPaquetes([]));
  }, [visible]);

  const paquete = paquetes.find((p) => p.id === paqueteId);
  const maxPersonas = Math.max(1, paquete?.credencialesIncluidas ?? 1);
  const setP = (i: number, campo: string, valor: string) => setPersonas((prev) => prev.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

  const guardar = async () => {
    setError('');
    if (!paqueteId) return setError('Selecciona un paquete.');
    if (!empresa.nombre.trim() || !empresa.rubro || !empresa.correoCorporativo.trim() || !empresa.telefonoWhatsapp.trim())
      return setError('Completa nombre, rubro, correo y teléfono de la empresa.');
    if (personas.some((p) => !p.nombres.trim() || !p.apellidoPaterno.trim() || !p.correo.trim() || !p.telefono.trim()))
      return setError('Cada participante necesita nombres, apellido paterno, correo y teléfono.');
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/admin/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: { ...empresa, nombre: empresa.nombre.trim(), ciudadNombre: empresa.ciudadNombre.trim() || 'Trinidad' },
          participacion: { paquete_id: paqueteId },
          participantes: personas.map((p, i) => ({ ...p, esResponsable: i === 0 })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(Array.isArray(data?.message) ? data.message.join(' ') : data?.message || 'No se pudo crear la empresa.');
      const aviso = data.correosFallidos?.length
        ? ` No se pudo enviar el correo a: ${data.correosFallidos.join(', ')}. Usa "Generar" contraseña en sus participantes.`
        : ' Las credenciales se enviaron por correo.';
      setEmpresa(empresaVacia());
      setPersonas([personaVacia()]);
      setPaqueteId(null);
      onCreada(`Empresa creada y habilitada.${aviso}`);
      onClose();
    } catch (e: any) {
      setError(e.message || 'No se pudo crear la empresa.');
    } finally {
      setEnviando(false);
    }
  };

  const chip = (activo: boolean) => ({ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: activo ? GREEN : '#e5e7eb', backgroundColor: activo ? '#f0fdf4' : '#fff' });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Nueva empresa</Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>Se crea habilitada, sin comprobante de pago.</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}><X size={22} color="#9ca3af" /></TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={{ fontWeight: '700', color: '#374151' }}>Paquete</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {paquetes.map((p) => (
              <TouchableOpacity key={p.id} style={chip(p.id === paqueteId)} onPress={() => { setPaqueteId(p.id); setPersonas((prev) => prev.slice(0, 1)); }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: p.id === paqueteId ? GREEN : '#374151' }}>{p.nombre} · Bs {Number(p.costo).toLocaleString('es-BO')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={inputStyle} placeholder="Nombre de la empresa" maxLength={55} value={empresa.nombre} onChangeText={(v) => setEmpresa({ ...empresa, nombre: v })} />
          <Text style={{ fontWeight: '700', color: '#374151' }}>Rubro</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RUBROS.map((r) => (
              <TouchableOpacity key={r} style={chip(r === empresa.rubro)} onPress={() => setEmpresa({ ...empresa, rubro: r })}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: r === empresa.rubro ? GREEN : '#374151' }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={inputStyle} placeholder="Correo corporativo" autoCapitalize="none" keyboardType="email-address" value={empresa.correoCorporativo} onChangeText={(v) => setEmpresa({ ...empresa, correoCorporativo: v })} />
          <TextInput style={inputStyle} placeholder="Teléfono / WhatsApp" keyboardType="phone-pad" value={empresa.telefonoWhatsapp} onChangeText={(v) => setEmpresa({ ...empresa, telefonoWhatsapp: v })} />
          <TextInput style={inputStyle} placeholder="País" value={empresa.paisNombre} onChangeText={(v) => setEmpresa({ ...empresa, paisNombre: v })} />
          <TextInput style={inputStyle} placeholder="Ciudad (por defecto Trinidad)" value={empresa.ciudadNombre} onChangeText={(v) => setEmpresa({ ...empresa, ciudadNombre: v })} />

          <Text style={{ fontWeight: '700', color: '#374151', marginTop: 6 }}>
            Participantes <Text style={{ fontWeight: '400', color: '#9ca3af' }}>(el primero es el encargado{paquete ? `, máx. ${maxPersonas}` : ''})</Text>
          </Text>
          {personas.map((p, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 14, padding: 10, gap: 8 }}>
              {i > 0 && (
                <TouchableOpacity onPress={() => setPersonas((prev) => prev.filter((_, j) => j !== i))} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
              <TextInput style={inputStyle} placeholder="Nombres" value={p.nombres} onChangeText={(v) => setP(i, 'nombres', v)} />
              <TextInput style={inputStyle} placeholder="Apellido paterno" value={p.apellidoPaterno} onChangeText={(v) => setP(i, 'apellidoPaterno', v)} />
              <TextInput style={inputStyle} placeholder="Apellido materno (opcional)" value={p.apellidoMaterno} onChangeText={(v) => setP(i, 'apellidoMaterno', v)} />
              <TextInput style={inputStyle} placeholder="Cargo" value={p.cargo} onChangeText={(v) => setP(i, 'cargo', v)} />
              <TextInput style={inputStyle} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" value={p.correo} onChangeText={(v) => setP(i, 'correo', v)} />
              <TextInput style={inputStyle} placeholder="Teléfono" keyboardType="phone-pad" value={p.telefono} onChangeText={(v) => setP(i, 'telefono', v)} />
            </View>
          ))}
          {personas.length < maxPersonas && (
            <TouchableOpacity onPress={() => setPersonas((prev) => [...prev, personaVacia()])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color={GREEN} /><Text style={{ color: GREEN, fontWeight: '700' }}>Agregar participante</Text>
            </TouchableOpacity>
          )}
          {!!error && <Text style={{ color: '#b91c1c', backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, fontSize: 13 }}>{error}</Text>}
          <TouchableOpacity disabled={enviando} onPress={guardar} style={{ backgroundColor: GREEN, borderRadius: 12, padding: 14, alignItems: 'center', opacity: enviando ? 0.6 : 1, marginBottom: 24 }}>
            {enviando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Crear y habilitar</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
