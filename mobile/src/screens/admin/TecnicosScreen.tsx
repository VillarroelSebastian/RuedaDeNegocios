import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Modal, Image
} from 'react-native';
import { Plus, Pencil, Trash2, X, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

const defaultForm = {
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  correo: '',
  telefono: '',
  contrasenia: '',
  urlFotoPerfil: '',
};

export default function TecnicosScreen() {
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchTecnicos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/tecnicos`);
      setTecnicos(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchTecnicos(); }, []);

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
        const res = await fetch(`${API_URL}/admin/imagenes/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        setForm((f) => ({ ...f, urlFotoPerfil: data.url }));
      } catch { Alert.alert('Error', 'No se pudo subir la foto.'); }
      finally { setUploading(false); }
    }
  };

  const handleSave = async () => {
    if (!form.nombres || !form.apellidoPaterno || !form.correo || !form.telefono) {
      Alert.alert('Requerido', 'Completa nombre, apellido, correo y teléfono.');
      return;
    }
    if (!editId && !form.contrasenia) {
      Alert.alert('Requerido', 'La contraseña es obligatoria para crear un técnico.');
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `${API_URL}/admin/tecnicos/${editId}` : `${API_URL}/admin/tecnicos`;
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      Alert.alert('Éxito', editId ? 'Técnico actualizado.' : 'Técnico creado correctamente.');
      setShowForm(false);
      fetchTecnicos();
    } catch (e: any) { Alert.alert('Error', e.message || 'No se pudo guardar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number, nombre: string) => {
    Alert.alert('Eliminar', `¿Eliminar a "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await fetch(`${API_URL}/admin/tecnicos/${id}`, { method: 'DELETE' }); fetchTecnicos(); } },
    ]);
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Técnicos ({tecnicos.length})</Text>
        <TouchableOpacity
          onPress={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}
          style={{ backgroundColor: GREEN }}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
        >
          <Plus color="white" size={16} />
          <Text className="text-white font-semibold text-sm">Agregar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center"><ActivityIndicator color={GREEN} size="large" /></View>
      ) : (
        <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTecnicos(); }} tintColor={GREEN} />}>
          {tecnicos.length === 0 ? (
            <View className="items-center py-16">
              <User color="#d1d5db" size={40} />
              <Text className="text-gray-400 text-sm mt-3">No hay técnicos registrados</Text>
            </View>
          ) : (
            tecnicos.map((t) => (
              <View key={t.id} className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex-row items-center gap-4">
                <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center overflow-hidden shrink-0">
                  {t.urlFotoPerfil
                    ? <Image source={{ uri: t.urlFotoPerfil }} className="w-full h-full" />
                    : <User color="#9ca3af" size={24} />
                  }
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-sm">{t.nombres} {t.apellidoPaterno}</Text>
                  <Text className="text-xs text-gray-500">{t.correo}</Text>
                  <Text className="text-xs text-gray-400">{t.telefono}</Text>
                  <View className="flex-row flex-wrap gap-1 mt-1">
                    <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: GREEN, fontSize: 9, fontWeight: '700' }}>TÉCNICO</Text>
                    </View>
                    {t.evento && (
                      <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                        <Text style={{ color: '#2563eb', fontSize: 9, fontWeight: '600' }} numberOfLines={1}>
                          {t.evento.nombre} {t.evento.edicion}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="gap-2">
                  <TouchableOpacity onPress={() => {
                    setForm({ nombres: t.nombres, apellidoPaterno: t.apellidoPaterno, apellidoMaterno: t.apellidoMaterno || '', correo: t.correo, telefono: t.telefono, contrasenia: '', urlFotoPerfil: t.urlFotoPerfil || '' });
                    setEditId(t.id); setShowForm(true);
                  }} className="p-2 bg-green-50 rounded-xl">
                    <Pencil color={GREEN} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(t.id, `${t.nombres} ${t.apellidoPaterno}`)}
                    className="p-2 bg-red-50 rounded-xl">
                    <Trash2 color="#ef4444" size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View className="h-8" />
        </ScrollView>
      )}

      {/* Modal Form */}
      <Modal visible={showForm} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">{editId ? 'Editar' : 'Nuevo'} técnico</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><X color="#9ca3af" size={22} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Foto */}
              <View className="items-center mb-4">
                <TouchableOpacity onPress={handlePickPhoto}>
                  <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center overflow-hidden">
                    {form.urlFotoPerfil
                      ? <Image source={{ uri: form.urlFotoPerfil }} className="w-full h-full" />
                      : <User color="#9ca3af" size={32} />
                    }
                  </View>
                  <Text style={{ color: GREEN }} className="text-xs font-semibold text-center mt-2">{uploading ? 'Subiendo...' : 'Cambiar foto'}</Text>
                </TouchableOpacity>
              </View>
              {[
                { label: 'Nombres *', key: 'nombres' },
                { label: 'Apellido paterno *', key: 'apellidoPaterno' },
                { label: 'Apellido materno', key: 'apellidoMaterno' },
                { label: 'Teléfono *', key: 'telefono', keyboardType: 'phone-pad' },
                { label: 'Correo electrónico *', key: 'correo', keyboardType: 'email-address' },
                { label: editId ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña *', key: 'contrasenia', secureTextEntry: true },
              ].map(({ label, key, keyboardType, secureTextEntry }: any) => (
                <View key={key} className="mb-3">
                  <Text className="text-sm font-semibold text-gray-700 mb-1">{label}</Text>
                  <TextInput
                    value={(form as any)[key]}
                    onChangeText={(v) => set(key, v)}
                    keyboardType={keyboardType || 'default'}
                    secureTextEntry={secureTextEntry}
                    editable={key !== 'correo' || !editId}
                    placeholderTextColor="#9ca3af"
                    className={`border border-gray-200 rounded-xl px-3 py-2.5 text-sm ${key === 'correo' && editId ? 'bg-gray-50 text-gray-400' : ''}`}
                  />
                </View>
              ))}
            </ScrollView>
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity onPress={() => setShowForm(false)}
                className="flex-1 py-3.5 border border-gray-200 rounded-2xl items-center">
                <Text className="font-semibold text-gray-600">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving}
                style={{ backgroundColor: saving ? '#9ca3af' : GREEN }}
                className="flex-1 py-3.5 rounded-2xl items-center">
                <Text className="text-white font-semibold">{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
