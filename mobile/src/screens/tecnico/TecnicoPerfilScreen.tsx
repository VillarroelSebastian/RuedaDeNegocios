import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  TextInput, Modal as RNModal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserCircle, Lock, LogOut, Eye, EyeOff, Shield, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

function AppModal({ visible, type, title, message, onClose }: any) {
  const cfg: any = {
    success: { bg: '#f0fdf4', border: '#86efac', btn: GREEN },
    error:   { bg: '#fef2f2', border: '#fca5a5', btn: '#ef4444' },
  };
  const c = cfg[type] ?? cfg.success;
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>{title}</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>{message}</Text>
          <TouchableOpacity style={{ backgroundColor: c.btn, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }} onPress={onClose}>
            <Text style={{ fontWeight: '700', color: '#fff' }}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
}

function ConfirmModal({ visible, onConfirm, onCancel }: any) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>Cerrar sesión</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
            ¿Estás seguro de que deseas cerrar sesión?
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              onPress={onCancel}
            >
              <Text style={{ fontWeight: '700', color: '#374151' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              onPress={onConfirm}
            >
              <Text style={{ fontWeight: '700', color: '#fff' }}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

export default function TecnicoPerfilScreen({ navigation }: any) {
  const user = userStore.get();

  // ── Feedback modal ──
  const [modal, setModal] = useState<any>({ visible: false, type: 'success', title: '', message: '' });

  // ── Logout ──
  const [confirmLogout, setConfirmLogout] = useState(false);

  // ── Password modal ──
  const [showPwModal,  setShowPwModal]  = useState(false);
  const [pwActual,     setPwActual]     = useState('');
  const [pwNueva,      setPwNueva]      = useState('');
  const [pwConfirm,    setPwConfirm]    = useState('');
  const [showActual,   setShowActual]   = useState(false);
  const [showNueva,    setShowNueva]    = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [savingPw,     setSavingPw]     = useState(false);

  // ── Editable profile fields ──
  const [nombres,          setNombres]          = useState(user?.nombres         ?? '');
  const [apellidoPaterno,  setApellidoPaterno]  = useState(user?.apellidoPaterno ?? '');
  const [apellidoMaterno,  setApellidoMaterno]  = useState(user?.apellidoMaterno ?? '');
  const [telefono,         setTelefono]         = useState(user?.telefono        ?? '');
  const [urlFoto,          setUrlFoto]          = useState(user?.urlFotoPerfil   ?? '');
  const [savingPerfil,     setSavingPerfil]     = useState(false);
  const [uploadingPhoto,   setUploadingPhoto]   = useState(false);

  const handleLogout = () => {
    userStore.clear();
    navigation.replace('Login');
  };

  // ── Pick & upload photo ──
  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setModal({ visible: true, type: 'error', title: 'Permiso denegado', message: 'Necesitamos acceso a tu galería para cambiar la foto.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri:  asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as any);

      const res  = await fetch(`${API_URL}/admin/imagenes/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error al subir imagen');
      const newUrl: string = data.url ?? data.urlImagen ?? data.imageUrl ?? '';
      setUrlFoto(newUrl);
    } catch (err: any) {
      setModal({ visible: true, type: 'error', title: 'Error', message: err.message ?? 'No se pudo subir la imagen.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Save profile ──
  const handleGuardarPerfil = async () => {
    if (!nombres.trim() || !apellidoPaterno.trim()) {
      setModal({ visible: true, type: 'error', title: 'Campos requeridos', message: 'Nombres y apellido paterno son obligatorios.' });
      return;
    }
    setSavingPerfil(true);
    try {
      const res = await fetch(`${API_URL}/admin/perfil/${user?.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombres,
          apellidoPaterno,
          apellidoMaterno,
          telefono,
          urlFotoPerfil: urlFoto,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error');
      // update store
      userStore.set({ ...user, nombres, apellidoPaterno, apellidoMaterno, telefono, urlFotoPerfil: urlFoto });
      setModal({ visible: true, type: 'success', title: 'Perfil actualizado', message: 'Tu información fue guardada correctamente.' });
    } catch (err: any) {
      setModal({ visible: true, type: 'error', title: 'Error', message: err.message ?? 'No se pudo guardar el perfil.' });
    } finally {
      setSavingPerfil(false);
    }
  };

  // ── Change password ──
  const handleCambiarPassword = async () => {
    if (!pwActual || !pwNueva || !pwConfirm) {
      setModal({ visible: true, type: 'error', title: 'Campos requeridos', message: 'Completa todos los campos.' });
      return;
    }
    if (pwNueva !== pwConfirm) {
      setModal({ visible: true, type: 'error', title: 'Error', message: 'La nueva contraseña y su confirmación no coinciden.' });
      return;
    }
    if (pwNueva.length < 6) {
      setModal({ visible: true, type: 'error', title: 'Error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch(`${API_URL}/admin/perfil/${user?.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contraseniaActual: pwActual, nuevaContrasenia: pwNueva }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error');
      setShowPwModal(false);
      setPwActual(''); setPwNueva(''); setPwConfirm('');
      setModal({ visible: true, type: 'success', title: 'Contraseña actualizada', message: 'Tu contraseña fue cambiada correctamente.' });
    } catch (err: any) {
      setModal({ visible: true, type: 'error', title: 'Error', message: err.message ?? 'No se pudo cambiar la contraseña.' });
    } finally {
      setSavingPw(false); }
  };

  const initials = `${nombres?.[0] ?? ''}${apellidoPaterno?.[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <AppModal {...modal} onClose={() => setModal((m: any) => ({ ...m, visible: false }))} />
      <ConfirmModal visible={confirmLogout} onConfirm={handleLogout} onCancel={() => setConfirmLogout(false)} />

      {/* ── Password modal ── */}
      <RNModal visible={showPwModal} transparent animationType="slide" onRequestClose={() => setShowPwModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 20 }}>Cambiar contraseña</Text>

            {[
              { label: 'Contraseña actual', value: pwActual,  set: setPwActual,  show: showActual,  toggle: () => setShowActual(!showActual)   },
              { label: 'Nueva contraseña',  value: pwNueva,   set: setPwNueva,   show: showNueva,   toggle: () => setShowNueva(!showNueva)     },
              { label: 'Confirmar nueva',   value: pwConfirm, set: setPwConfirm, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
            ].map((f) => (
              <View key={f.label} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{f.label}</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
                  borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
                  paddingHorizontal: 14, paddingVertical: 12,
                }}>
                  <TextInput
                    value={f.value}
                    onChangeText={f.set}
                    secureTextEntry={!f.show}
                    style={{ flex: 1, fontSize: 14, color: '#111827' }}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity onPress={f.toggle}>
                    {f.show ? <EyeOff color="#9ca3af" size={16} /> : <Eye color="#9ca3af" size={16} />}
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                onPress={() => { setShowPwModal(false); setPwActual(''); setPwNueva(''); setPwConfirm(''); }}
              >
                <Text style={{ fontWeight: '700', color: '#374151' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                onPress={handleCambiarPassword}
                disabled={savingPw}
              >
                {savingPw
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ fontWeight: '700', color: '#fff' }}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
      }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>Mi Perfil</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

        {/* ── Avatar con botón de cámara ── */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ position: 'relative' }}>
            {urlFoto
              ? <Image source={{ uri: urlFoto }} style={{ width: 90, height: 90, borderRadius: 45 }} resizeMode="cover" />
              : <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }}>
                  {uploadingPhoto
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 28 }}>{initials}</Text>
                  }
                </View>
            }
            {uploadingPhoto && urlFoto && (
              <View style={{ position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <TouchableOpacity
              onPress={handlePickPhoto}
              disabled={uploadingPhoto}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: GREEN, borderWidth: 2, borderColor: '#fff',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Camera color="#fff" size={14} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 14 }}>
            {nombres} {apellidoPaterno} {apellidoMaterno ?? ''}
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6,
            backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4,
          }}>
            <Shield color={GREEN} size={12} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: GREEN }}>Técnico de Evento</Text>
          </View>
        </View>

        {/* ── Información de cuenta (solo lectura) ── */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9',
          padding: 16, marginBottom: 14,
          shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 14 }}>Información de cuenta</Text>
          {[
            { label: 'Correo electrónico', value: user?.correo ?? '—' },
            { label: 'CI / Documento',     value: user?.ci     ?? '—' },
          ].map((row) => (
            <View key={row.label} style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 3 }}>{row.label}</Text>
              <Text style={{ fontSize: 14, color: '#374151', fontWeight: '500' }}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Formulario de edición ── */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9',
          padding: 16, marginBottom: 14,
          shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 14 }}>Editar información</Text>

          {[
            { label: 'Nombres',           value: nombres,         set: setNombres,         keyboard: 'default',  required: true  },
            { label: 'Apellido Paterno',   value: apellidoPaterno, set: setApellidoPaterno, keyboard: 'default',  required: true  },
            { label: 'Apellido Materno',   value: apellidoMaterno, set: setApellidoMaterno, keyboard: 'default',  required: false },
            { label: 'Teléfono',           value: telefono,        set: setTelefono,        keyboard: 'numeric',  required: false },
          ].map((f) => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                {f.label}{f.required ? '' : ' (opcional)'}
              </Text>
              <TextInput
                value={f.value}
                onChangeText={f.set}
                keyboardType={f.keyboard as any}
                style={{
                  backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1,
                  borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 14, color: '#111827',
                }}
                placeholder={f.label}
                placeholderTextColor="#9ca3af"
              />
            </View>
          ))}

          <TouchableOpacity
            onPress={handleGuardarPerfil}
            disabled={savingPerfil}
            style={{
              backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14,
              alignItems: 'center', marginTop: 4,
            }}
          >
            {savingPerfil
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ fontWeight: '700', color: '#fff', fontSize: 14 }}>Guardar cambios</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Cambiar contraseña ── */}
        <TouchableOpacity
          onPress={() => setShowPwModal(true)}
          style={{
            backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9',
            padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14,
            shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
            <Lock color="#2563eb" size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Cambiar contraseña</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Actualiza tu contraseña de acceso</Text>
          </View>
        </TouchableOpacity>

        {/* ── Cerrar sesión ── */}
        <TouchableOpacity
          onPress={() => setConfirmLogout(true)}
          style={{
            backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#fee2e2',
            padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14,
            shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut color="#ef4444" size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>Cerrar sesión</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Salir de tu cuenta de técnico</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
