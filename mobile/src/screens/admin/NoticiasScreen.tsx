import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Modal, Image
} from 'react-native';
import { Plus, Pencil, Trash2, X, Newspaper } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

const TIPOS = ['COMUNICADO', 'NOTICIA', 'ANUNCIO', 'ALERTA'];

const defaultForm = {
  tituloNoticia: '',
  contenidoNoticia: '',
  tipoNoticia: 'COMUNICADO',
  estadoPublicacion: 'PUBLICADO',
  urlImagenNoticia: '',
};

export default function NoticiasScreen() {
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchNoticias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/noticias`);
      setNoticias(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchNoticias(); }, []);

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', { uri, name: 'image.jpg', type: 'image/jpeg' } as any);
        const res = await fetch(`${API_URL}/admin/imagenes/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        setForm((f) => ({ ...f, urlImagenNoticia: data.url }));
      } catch { Alert.alert('Error', 'No se pudo subir la imagen.'); }
      finally { setUploading(false); }
    }
  };

  const handleSave = async () => {
    if (!form.tituloNoticia || !form.contenidoNoticia) {
      Alert.alert('Requerido', 'Ingresa título y contenido.');
      return;
    }
    setSaving(true);
    try {
      const user = userStore.get();
      const payload = { ...form, usuario_id: user?.id || 1 };
      const url = editId ? `${API_URL}/admin/noticias/${editId}` : `${API_URL}/admin/noticias`;
      await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      Alert.alert('Éxito', editId ? 'Comunicado actualizado.' : 'Comunicado publicado.');
      setShowForm(false);
      fetchNoticias();
    } catch { Alert.alert('Error', 'No se pudo guardar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number, titulo: string) => {
    Alert.alert('Eliminar', `¿Eliminar "${titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await fetch(`${API_URL}/admin/noticias/${id}`, { method: 'DELETE' }); fetchNoticias(); } },
    ]);
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Noticias ({noticias.length})</Text>
        <TouchableOpacity
          onPress={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}
          style={{ backgroundColor: GREEN }}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
        >
          <Plus color="white" size={16} />
          <Text className="text-white font-semibold text-sm">Nueva</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center"><ActivityIndicator color={GREEN} size="large" /></View>
      ) : (
        <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNoticias(); }} tintColor={GREEN} />}>
          {noticias.length === 0 ? (
            <View className="items-center py-16">
              <Newspaper color="#d1d5db" size={40} />
              <Text className="text-gray-400 text-sm mt-3">No hay comunicados publicados</Text>
            </View>
          ) : (
            noticias.map((n) => (
              <View key={n.id} className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {n.urlImagenNoticia && (
                  <Image source={{ uri: n.urlImagenNoticia }} className="w-full h-32" resizeMode="cover" />
                )}
                <View className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ color: '#1e40af', fontSize: 10, fontWeight: '700' }}>{n.tipoNoticia}</Text>
                    </View>
                    <View style={{ backgroundColor: n.estadoPublicacion === 'PUBLICADO' ? '#dcfce7' : '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ color: n.estadoPublicacion === 'PUBLICADO' ? '#166534' : '#9ca3af', fontSize: 10, fontWeight: '700' }}>
                        {n.estadoPublicacion === 'PUBLICADO' ? 'Publicado' : 'Borrador'}
                      </Text>
                    </View>
                  </View>
                  <Text className="font-bold text-gray-900 text-sm mb-1" numberOfLines={2}>{n.tituloNoticia}</Text>
                  <Text className="text-xs text-gray-500" numberOfLines={2}>{n.contenidoNoticia}</Text>
                  <Text className="text-[10px] text-gray-400 mt-2">{new Date(n.fechaCreacion).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-50">
                    <TouchableOpacity onPress={() => { setForm({ tituloNoticia: n.tituloNoticia, contenidoNoticia: n.contenidoNoticia, tipoNoticia: n.tipoNoticia, estadoPublicacion: n.estadoPublicacion, urlImagenNoticia: n.urlImagenNoticia || '' }); setEditId(n.id); setShowForm(true); }}
                      className="flex-1 py-2 bg-green-50 rounded-xl items-center">
                      <Text style={{ color: GREEN }} className="text-xs font-semibold">Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(n.id, n.tituloNoticia)}
                      className="flex-1 py-2 bg-red-50 rounded-xl items-center">
                      <Text className="text-xs font-semibold text-red-600">Eliminar</Text>
                    </TouchableOpacity>
                  </View>
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
              <Text className="text-lg font-bold text-gray-900">{editId ? 'Editar' : 'Nuevo'} comunicado</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><X color="#9ca3af" size={22} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-1">Título *</Text>
                <TextInput value={form.tituloNoticia} onChangeText={(v) => set('tituloNoticia', v)}
                  placeholder="Bienvenidos a la Rueda de Negocios 2024"
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              </View>
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-1">Contenido *</Text>
                <TextInput value={form.contenidoNoticia} onChangeText={(v) => set('contenidoNoticia', v)}
                  multiline numberOfLines={4} textAlignVertical="top"
                  placeholder="Escribe el mensaje aquí..."
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              </View>
              {/* Imagen */}
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-1">Imagen (opcional)</Text>
                {form.urlImagenNoticia ? (
                  <View>
                    <Image source={{ uri: form.urlImagenNoticia }} className="w-full h-24 rounded-xl" resizeMode="cover" />
                    <TouchableOpacity onPress={() => set('urlImagenNoticia', '')} className="mt-1">
                      <Text className="text-xs text-red-500">Eliminar imagen</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handlePickImage}
                    className="border-2 border-dashed border-gray-200 rounded-xl py-6 items-center">
                    <Text style={{ color: GREEN }} className="text-sm font-semibold">{uploading ? 'Subiendo...' : 'Seleccionar imagen'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Estado */}
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Estado de publicación</Text>
                <View className="flex-row gap-3">
                  {['PUBLICADO', 'BORRADOR'].map((s) => (
                    <TouchableOpacity key={s} onPress={() => set('estadoPublicacion', s)}
                      style={{ borderWidth: 1.5, borderColor: form.estadoPublicacion === s ? GREEN : '#e5e7eb', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                      <Text style={{ color: form.estadoPublicacion === s ? GREEN : '#6b7280', fontWeight: '600', fontSize: 13 }}>
                        {s === 'PUBLICADO' ? 'Publicar' : 'Borrador'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity onPress={() => setShowForm(false)}
                className="flex-1 py-3.5 border border-gray-200 rounded-2xl items-center">
                <Text className="font-semibold text-gray-600">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving}
                style={{ backgroundColor: saving ? '#9ca3af' : GREEN }}
                className="flex-1 py-3.5 rounded-2xl items-center">
                <Text className="text-white font-semibold">{saving ? 'Publicando...' : 'Publicar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
