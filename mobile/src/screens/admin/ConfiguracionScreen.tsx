import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Image, ActivityIndicator
} from 'react-native';
import { User, Camera, Save, LogOut, Lock } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

export default function ConfiguracionScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', urlFotoPerfil: '' });
  const [passForm, setPassForm] = useState({ contraseniaActual: '', nuevaContrasenia: '', confirmar: '' });
  const [tab, setTab] = useState<'perfil' | 'seguridad'>('perfil');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const u = userStore.get();
    if (u) {
      setUser(u);
      setForm({ nombres: u.nombres || '', apellidoPaterno: u.apellidoPaterno || '', apellidoMaterno: u.apellidoMaterno || '', telefono: u.telefono || '', urlFotoPerfil: u.urlFotoPerfil || '' });
    }
  }, []);

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

  const handleSavePerfil = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/perfil/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      const newUser = { ...user, ...updated };
      userStore.set(newUser);
      setUser(newUser);
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch { Alert.alert('Error', 'No se pudo actualizar el perfil.'); }
    finally { setSaving(false); }
  };

  const handleSavePassword = async () => {
    if (!user) return;
    if (!passForm.contraseniaActual || !passForm.nuevaContrasenia) {
      Alert.alert('Requerido', 'Ingresa la contraseña actual y la nueva.');
      return;
    }
    if (passForm.nuevaContrasenia !== passForm.confirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (passForm.nuevaContrasenia.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await fetch(`${API_URL}/admin/perfil/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contraseniaActual: passForm.contraseniaActual, nuevaContrasenia: passForm.nuevaContrasenia }),
      });
      Alert.alert('Éxito', 'Contraseña cambiada correctamente.');
      setPassForm({ contraseniaActual: '', nuevaContrasenia: '', confirmar: '' });
    } catch { Alert.alert('Error', 'No se pudo cambiar la contraseña. Verifica la contraseña actual.'); }
    finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => { userStore.clear(); navigation.replace('Login'); } },
    ]);
  };

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setP = (k: string, v: string) => setPassForm((f) => ({ ...f, [k]: v }));

  return (
    <ScrollView className="flex-1 bg-[#F9FAFB]">
      <View className="p-4 space-y-4">
        {/* Perfil header */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 items-center">
          <View className="relative">
            <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center overflow-hidden border-4 border-white shadow-md">
              {form.urlFotoPerfil
                ? <Image source={{ uri: form.urlFotoPerfil }} className="w-full h-full" resizeMode="cover" />
                : <User color="#9ca3af" size={36} />
              }
            </View>
            <TouchableOpacity
              onPress={handlePickPhoto}
              style={{ backgroundColor: GREEN }}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center shadow-sm"
            >
              <Camera color="white" size={14} />
            </TouchableOpacity>
          </View>
          {uploading && <Text style={{ color: GREEN }} className="text-xs mt-2">Subiendo imagen...</Text>}
          <Text className="font-bold text-gray-900 mt-3 text-lg">{user?.nombres} {user?.apellidoPaterno}</Text>
          <Text className="text-sm text-gray-500">{user?.correo}</Text>
          <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 6 }}>
            <Text style={{ color: GREEN, fontSize: 11, fontWeight: '700' }}>{user?.rolEvento?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row gap-2">
          {(['perfil', 'seguridad'] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)}
              style={{ flex: 1, backgroundColor: tab === t ? GREEN : '#f3f4f6', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: tab === t ? 'white' : '#6b7280', fontWeight: '600', fontSize: 14 }}>
                {t === 'perfil' ? 'Mi perfil' : 'Seguridad'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'perfil' && (
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            {[
              { label: 'Nombres', key: 'nombres' },
              { label: 'Apellido paterno', key: 'apellidoPaterno' },
              { label: 'Apellido materno', key: 'apellidoMaterno' },
              { label: 'Teléfono', key: 'telefono', keyboardType: 'phone-pad' },
            ].map(({ label, key, keyboardType }: any) => (
              <View key={key} className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-1.5">{label}</Text>
                <TextInput
                  value={(form as any)[key]}
                  onChangeText={(v) => setF(key, v)}
                  keyboardType={keyboardType || 'default'}
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                />
              </View>
            ))}
            <View className="mb-3">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico</Text>
              <TextInput value={user?.correo || ''} editable={false}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400" />
            </View>
            <TouchableOpacity onPress={handleSavePerfil} disabled={saving}
              style={{ backgroundColor: saving ? '#9ca3af' : GREEN }}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl mt-2">
              <Save color="white" size={18} />
              <Text className="text-white font-bold">{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'seguridad' && (
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <View className="flex-row items-center gap-3 mb-5">
              <View className="w-10 h-10 bg-orange-50 rounded-xl items-center justify-center">
                <Lock color="#ea580c" size={20} />
              </View>
              <View>
                <Text className="font-bold text-gray-900">Cambiar contraseña</Text>
                <Text className="text-xs text-gray-400">Mínimo 6 caracteres</Text>
              </View>
            </View>
            {[
              { label: 'Contraseña actual', key: 'contraseniaActual' },
              { label: 'Nueva contraseña', key: 'nuevaContrasenia' },
              { label: 'Confirmar contraseña', key: 'confirmar' },
            ].map(({ label, key }) => (
              <View key={key} className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-1.5">{label}</Text>
                <TextInput
                  value={(passForm as any)[key]}
                  onChangeText={(v) => setP(key, v)}
                  secureTextEntry
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                />
              </View>
            ))}
            <TouchableOpacity onPress={handleSavePassword} disabled={saving}
              style={{ backgroundColor: saving ? '#9ca3af' : GREEN }}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl mt-2">
              <Save color="white" size={18} />
              <Text className="text-white font-bold">{saving ? 'Cambiando...' : 'Cambiar contraseña'}</Text>
            </TouchableOpacity>

            {/* Logout */}
            <View className="mt-6 pt-5 border-t border-gray-100">
              <Text className="font-bold text-red-600 mb-3">Cerrar sesión</Text>
              <TouchableOpacity onPress={handleLogout}
                className="flex-row items-center gap-3 py-4 px-5 border border-red-200 rounded-2xl bg-red-50">
                <LogOut color="#dc2626" size={20} />
                <Text className="text-red-600 font-semibold">Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
