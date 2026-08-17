import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Handshake, Plus, X } from 'lucide-react-native';
import { useModal } from '../../components/AppModal';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';
type Persona = { nombreCompleto: string; cargo: string; correo: string };
const personaVacia = (): Persona => ({ nombreCompleto: '', cargo: '', correo: '' });
const formVacio = { nombreEmpresa: '', descripcion: '', tipoAporte: 'DINERO', montoAporte: '', detalleAporte: '', cantidadIngresos: 1 };

export default function AuspiciadoresScreen() {
  const { show, modal } = useModal();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...formVacio });
  const [personas, setPersonas] = useState<Persona[]>([personaVacia()]);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/auspiciadores`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'No se pudo cargar');
      setLista(data);
    } catch (e: any) {
      show({ type: 'error', title: 'Sin conexión', message: e.message });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const nuevo = () => {
    setEditId(null); setForm({ ...formVacio }); setPersonas([personaVacia()]); setVisible(true);
  };
  const editar = (a: any) => {
    setEditId(a.id);
    setForm({
      nombreEmpresa: a.nombreEmpresa, descripcion: a.descripcion || '', tipoAporte: a.tipoAporte,
      montoAporte: a.montoAporte == null ? '' : String(a.montoAporte), detalleAporte: a.detalleAporte || '',
      cantidadIngresos: a.cantidadIngresos,
    });
    setPersonas(a.personas.map((p: any) => ({ nombreCompleto: p.nombreCompleto, cargo: p.cargo || '', correo: p.correo || '' })));
    setVisible(true);
  };
  const cambiarCantidad = (cantidad: number) => {
    const n = Math.max(1, Math.min(50, cantidad));
    setForm((f) => ({ ...f, cantidadIngresos: n }));
    setPersonas((actuales) => {
      const copia = [...actuales];
      while (copia.length < n) copia.push(personaVacia());
      return copia.slice(0, n);
    });
  };
  const setPersona = (i: number, campo: keyof Persona, valor: string) =>
    setPersonas((actuales) => actuales.map((p, j) => j === i ? { ...p, [campo]: valor } : p));

  const guardar = async () => {
    if (!form.nombreEmpresa.trim() || !form.descripcion.trim())
      return show({ type: 'warning', title: 'Campos requeridos', message: 'Completa el nombre y la descripción de la empresa.' });
    if (form.tipoAporte !== 'INSUMOS' && !(Number(form.montoAporte) > 0))
      return show({ type: 'warning', title: 'Monto requerido', message: 'Indica un monto mayor a cero.' });
    if (form.tipoAporte !== 'DINERO' && !form.detalleAporte.trim())
      return show({ type: 'warning', title: 'Detalle requerido', message: 'Describe los insumos aportados.' });
    const invalida = personas.findIndex((p) => !p.nombreCompleto.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo.trim()));
    if (invalida >= 0)
      return show({ type: 'warning', title: 'Persona incompleta', message: `Completa el nombre y un correo válido para la persona ${invalida + 1}.` });
    setSaving(true);
    try {
      const res = await fetch(editId ? `${API_URL}/admin/auspiciadores/${editId}` : `${API_URL}/admin/auspiciadores`, {
        method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, montoAporte: form.montoAporte ? Number(form.montoAporte) : null, personas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'No se pudo guardar');
      setVisible(false); await cargar();
      show({ type: 'success', title: editId ? 'Auspiciador actualizado' : 'Auspiciador registrado', message: editId ? 'Los cambios fueron guardados.' : 'Las credenciales fueron enviadas por correo.' });
    } catch (e: any) { show({ type: 'error', title: 'No se pudo guardar', message: e.message }); }
    finally { setSaving(false); }
  };

  const eliminar = (a: any) => show({
    type: 'confirm', title: 'Eliminar auspiciador',
    message: `¿Eliminar a “${a.nombreEmpresa}”? Sus credenciales dejarán de ser válidas.`,
    confirmText: 'Eliminar', cancelText: 'Cancelar', onConfirm: async () => {
      try {
        const res = await fetch(`${API_URL}/admin/auspiciadores/${a.id}`, { method: 'DELETE' });
        const data = await res.json(); if (!res.ok) throw new Error(data?.message || 'No se pudo eliminar');
        await cargar(); show({ type: 'success', title: 'Auspiciador eliminado', message: 'La eliminación lógica fue aplicada.' });
      } catch (e: any) { show({ type: 'error', title: 'No se pudo eliminar', message: e.message }); }
    },
  });

  return <>
    {modal}
    <View className="flex-1 bg-[#F9FAFB]">
      <View className="bg-white px-4 py-4 border-b border-gray-100 flex-row justify-between items-center">
        <View><Text className="text-lg font-extrabold text-gray-900">Auspiciadores</Text><Text className="text-xs text-gray-500">Credenciales enviadas por correo</Text></View>
        <TouchableOpacity onPress={nuevo} style={{ backgroundColor: GREEN }} className="flex-row items-center gap-1 px-4 py-2.5 rounded-xl"><Plus color="white" size={16}/><Text className="text-white font-bold">Nuevo</Text></TouchableOpacity>
      </View>
      {loading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color={GREEN} size="large"/></View> :
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={GREEN}/>}>
          {lista.length === 0 ? <View className="items-center py-20"><Handshake color="#9ca3af" size={36}/><Text className="text-gray-400 mt-3">No hay auspiciadores registrados</Text></View> : lista.map((a) =>
            <View key={a.id} className="m-4 mb-0 bg-white border border-gray-100 rounded-2xl p-4">
              <Text className="font-extrabold text-gray-900">{a.nombreEmpresa}</Text>
              <Text className="text-xs text-gray-500 mt-1">{a.tipoAporte} · {a.cantidadIngresos} credencial(es)</Text>
              <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>{a.descripcion}</Text>
              <View className="flex-row gap-2 mt-4"><TouchableOpacity onPress={() => editar(a)} className="flex-1 bg-green-50 py-2.5 rounded-xl items-center"><Text style={{ color: GREEN }} className="font-bold">Editar</Text></TouchableOpacity><TouchableOpacity onPress={() => eliminar(a)} className="flex-1 bg-red-50 py-2.5 rounded-xl items-center"><Text className="text-red-600 font-bold">Eliminar</Text></TouchableOpacity></View>
            </View>)}<View className="h-8"/>
        </ScrollView>}
    </View>
    <Modal visible={visible} transparent animationType="slide"><View className="flex-1 bg-black/40 justify-end"><View className="bg-white rounded-t-3xl max-h-[92%] p-5">
      <View className="flex-row justify-between items-center mb-4"><Text className="text-lg font-extrabold">{editId ? 'Editar' : 'Nuevo'} auspiciador</Text><TouchableOpacity onPress={() => setVisible(false)}><X color="#6b7280" size={22}/></TouchableOpacity></View>
      <ScrollView>
        {[['Empresa *','nombreEmpresa'],['Descripción *','descripcion']].map(([label,key]) => <View key={key} className="mb-3"><Text className="text-xs font-bold text-gray-700 mb-1">{label}</Text><TextInput value={(form as any)[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))} multiline={key === 'descripcion'} className="border border-gray-200 rounded-xl px-3 py-2.5"/></View>)}
        <Text className="text-xs font-bold text-gray-700 mb-2">Tipo de aporte *</Text><View className="flex-row gap-2 mb-3">{['DINERO','INSUMOS','AMBOS'].map((tipo) => <TouchableOpacity key={tipo} onPress={() => setForm((f) => ({ ...f, tipoAporte: tipo }))} style={{ backgroundColor: form.tipoAporte === tipo ? GREEN : '#f3f4f6' }} className="flex-1 py-2.5 rounded-xl items-center"><Text style={{ color: form.tipoAporte === tipo ? 'white' : '#6b7280', fontSize: 11, fontWeight: '700' }}>{tipo}</Text></TouchableOpacity>)}</View>
        {form.tipoAporte !== 'INSUMOS' && <View className="mb-3"><Text className="text-xs font-bold mb-1">Monto (Bs.) *</Text><TextInput value={form.montoAporte} onChangeText={(v) => setForm((f) => ({ ...f, montoAporte: v }))} keyboardType="numeric" className="border border-gray-200 rounded-xl px-3 py-2.5"/></View>}
        {form.tipoAporte !== 'DINERO' && <View className="mb-3"><Text className="text-xs font-bold mb-1">Detalle de insumos *</Text><TextInput value={form.detalleAporte} onChangeText={(v) => setForm((f) => ({ ...f, detalleAporte: v }))} className="border border-gray-200 rounded-xl px-3 py-2.5"/></View>}
        <View className="flex-row items-center justify-between my-3"><Text className="text-xs font-bold">Cantidad de credenciales *</Text><View className="flex-row items-center gap-4"><TouchableOpacity onPress={() => cambiarCantidad(form.cantidadIngresos - 1)}><Text className="text-2xl">−</Text></TouchableOpacity><Text className="text-lg font-extrabold">{form.cantidadIngresos}</Text><TouchableOpacity onPress={() => cambiarCantidad(form.cantidadIngresos + 1)}><Text className="text-2xl">+</Text></TouchableOpacity></View></View>
        {personas.map((p,i) => <View key={i} className="bg-gray-50 rounded-xl p-3 mb-2"><Text className="font-bold text-xs mb-2">Persona {i+1}</Text><TextInput value={p.nombreCompleto} onChangeText={(v) => setPersona(i,'nombreCompleto',v)} placeholder="Nombre completo *" className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2"/><TextInput value={p.cargo} onChangeText={(v) => setPersona(i,'cargo',v)} placeholder="Cargo" className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2"/><TextInput value={p.correo} onChangeText={(v) => setPersona(i,'correo',v)} placeholder="Correo para enviar credencial *" keyboardType="email-address" autoCapitalize="none" className="bg-white border border-gray-200 rounded-lg px-3 py-2"/></View>)}
      </ScrollView>
      <TouchableOpacity onPress={guardar} disabled={saving} style={{ backgroundColor: GREEN, opacity: saving ? .6 : 1 }} className="py-3.5 rounded-2xl items-center mt-4"><Text className="text-white font-extrabold">{saving ? 'Guardando…' : 'Guardar'}</Text></TouchableOpacity>
    </View></View></Modal>
  </>;
}
