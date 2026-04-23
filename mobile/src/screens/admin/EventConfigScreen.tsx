import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Info, LayoutGrid, CreditCard, QrCode, Plus, Trash2, Save,
  CalendarCheck, Star, Edit2, Calendar, ChevronLeft, ImageIcon, Camera,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

// ── Componente reutilizable para campos de imagen ──────────────────────────────
function ImageField({
  label, value, fieldKey, uploading, onPick, required,
}: {
  label: string; value: string; fieldKey: string;
  uploading: string | null; onPick: (key: string) => void; required?: boolean;
}) {
  const isUploading = uploading === fieldKey;
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-gray-700 mb-2">
        {label}{required ? ' *' : ''}
      </Text>
      <TouchableOpacity
        onPress={() => onPick(fieldKey)}
        disabled={isUploading}
        className="flex-row items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
        style={{ borderStyle: 'dashed', borderColor: value ? GREEN : '#e5e7eb' }}
        activeOpacity={0.7}
      >
        {isUploading ? (
          <ActivityIndicator color={GREEN} size="small" />
        ) : (
          <Camera color={value ? GREEN : '#9ca3af'} size={18} />
        )}
        <Text style={{ color: value ? GREEN : '#9ca3af', fontSize: 13, fontWeight: '600' }}>
          {isUploading ? 'Subiendo...' : value ? 'Cambiar imagen' : 'Seleccionar imagen'}
        </Text>
      </TouchableOpacity>
      {value ? (
        <View className="mt-2 rounded-xl overflow-hidden border border-gray-200" style={{ height: 100 }}>
          <Image source={{ uri: value }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </View>
      ) : null}
    </View>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function EventConfigScreen() {
  const { show, modal } = useModal();
  const [viewState, setViewState] = useState<'lista' | 'formulario'>('lista');

  const [eventos, setEventos] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | 'nuevo'>('nuevo');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: 0,
    nombre: '',
    edicion: '',
    descripcion: '',
    fechaInicioEvento: '',
    fechaFinEvento: '',
    duracionReunion: '20',
    tiempoEntreReuniones: '5',
    cantidadTotalMesasEvento: '50',
    capacidadPersonasPorMesa: '4',
    montoBaseIncripcionBolivianos: '500',
    cantidadParticipantesIncluidos: '2',
    costoParticipanteExtra: '100',
    urlImagenMapaRecinto: '',
    urlImagenCronogramaCharlas: '',
    urlLogoEvento: '',
    sobreElEvento: '',
    correoContacto: '',
    telefonoContacto: '',
    enlaceFacebook: '',
    enlaceInstagram: '',
    enlaceTwitterX: '',
  });

  const [reglasQR, setReglasQR] = useState([
    { rangoDesde: '1', rangoHasta: '2', monto: '500', urlQR: '' },
  ]);

  // ── Fetch lista ──────────────────────────────────────────────────────────────
  const fetchEventos = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_URL}/admin/eventos`);
      const data = await res.json();
      setEventos(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoadingList(false); }
  };

  useEffect(() => { fetchEventos(); }, [viewState]);

  // ── Subir imagen a Cloudinary ────────────────────────────────────────────────
  const handlePickImage = async (fieldKey: string, qrIndex?: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      show({ type: 'warning', title: 'Permiso requerido', message: 'Necesitamos acceso a tus fotos.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const uploadKey = qrIndex !== undefined ? `${fieldKey}-${qrIndex}` : fieldKey;
    setUploadingField(uploadKey);
    try {
      const fd = new FormData();
      fd.append('file', { uri, name: 'image.jpg', type: 'image/jpeg' } as any);
      const res = await fetch(`${API_URL}/admin/imagenes/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.url) throw new Error('Sin URL');

      if (fieldKey === 'urlQR' && qrIndex !== undefined) {
        setReglasQR((prev) => prev.map((r, i) => i === qrIndex ? { ...r, urlQR: data.url } : r));
      } else {
        setFormData((prev) => ({ ...prev, [fieldKey]: data.url }));
      }
    } catch {
      show({ type: 'error', title: 'Error', message: 'No se pudo subir la imagen.' });
    } finally {
      setUploadingField(null);
    }
  };

  // ── Acciones lista ───────────────────────────────────────────────────────────
  const handleSetPrincipal = (id: number, nombre: string) => {
    show({
      type: 'confirm',
      title: 'Cambiar evento principal',
      message: `¿Deseas establecer "${nombre}" como el evento principal? Esto cambiará el evento activo de todo el sistema.`,
      confirmText: 'Sí, cambiar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/admin/eventos/${id}/set-principal`, { method: 'PUT' });
          fetchEventos();
          show({ type: 'success', title: '¡Listo!', message: `"${nombre}" es ahora el evento principal.` });
        } catch {
          show({ type: 'error', title: 'Error', message: 'No se pudo cambiar a principal.' });
        }
      },
    });
  };

  const handleDelete = (id: number, esPrincipal: number) => {
    if (esPrincipal === 1) {
      show({ type: 'warning', title: 'Acción no permitida', message: 'No puedes eliminar el evento principal. Nombra a otro como principal primero.' });
      return;
    }
    show({
      type: 'confirm',
      title: 'Eliminar evento',
      message: '¿Seguro que deseas eliminar este evento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/admin/eventos/${id}`, { method: 'DELETE' });
          fetchEventos();
        } catch {
          show({ type: 'error', title: 'Error', message: 'No se pudo eliminar el evento.' });
        }
      },
    });
  };

  // ── Abrir formulario ─────────────────────────────────────────────────────────
  const openForm = async (id: number | 'nuevo') => {
    setEditingId(id);
    setViewState('formulario');
    if (id === 'nuevo') {
      setFormData({
        id: 0, nombre: '', edicion: '', descripcion: '', fechaInicioEvento: '', fechaFinEvento: '',
        duracionReunion: '20', tiempoEntreReuniones: '5', cantidadTotalMesasEvento: '50',
        capacidadPersonasPorMesa: '4', montoBaseIncripcionBolivianos: '500',
        cantidadParticipantesIncluidos: '2', costoParticipanteExtra: '100',
        urlImagenMapaRecinto: '', urlImagenCronogramaCharlas: '', urlLogoEvento: '',
        sobreElEvento: '', correoContacto: '', telefonoContacto: '',
        enlaceFacebook: '', enlaceInstagram: '', enlaceTwitterX: '',
      });
      setReglasQR([{ rangoDesde: '1', rangoHasta: '2', monto: '500', urlQR: '' }]);
      return;
    }
    setLoadingForm(true);
    try {
      const res = await fetch(`${API_URL}/admin/eventos/${id}`);
      const data = await res.json();
      if (data?.id) {
        setFormData({
          id: data.id,
          nombre: data.nombre || '', edicion: data.edicion || '', descripcion: data.descripcion || '',
          fechaInicioEvento: data.fechaInicioEvento ? new Date(data.fechaInicioEvento).toISOString().split('T')[0] : '',
          fechaFinEvento: data.fechaFinEvento ? new Date(data.fechaFinEvento).toISOString().split('T')[0] : '',
          duracionReunion: String(data.duracionReunion || 20),
          tiempoEntreReuniones: String(data.tiempoEntreReuniones || 5),
          cantidadTotalMesasEvento: String(data.cantidadTotalMesasEvento || 50),
          capacidadPersonasPorMesa: String(data.capacidadPersonasPorMesa || 4),
          montoBaseIncripcionBolivianos: String(data.montoBaseIncripcionBolivianos || 500),
          cantidadParticipantesIncluidos: String(data.cantidadParticipantesIncluidos || 2),
          costoParticipanteExtra: String(data.costoParticipanteExtra || 100),
          urlImagenMapaRecinto: data.urlImagenMapaRecinto || '',
          urlImagenCronogramaCharlas: data.urlImagenCronogramaCharlas || '',
          urlLogoEvento: data.urlLogoEvento || '',
          sobreElEvento: data.sobreElEvento || '',
          correoContacto: data.correoContacto || '',
          telefonoContacto: data.telefonoContacto || '',
          enlaceFacebook: data.enlaceFacebook || '',
          enlaceInstagram: data.enlaceInstagram || '',
          enlaceTwitterX: data.enlaceTwitterX || '',
        });
        if (data.eventoreglaqr?.length > 0) {
          setReglasQR(data.eventoreglaqr.map((r: any) => ({
            rangoDesde: String(r.rangoDesde), rangoHasta: String(r.rangoHasta),
            monto: String(r.monto), urlQR: r.urlQR || '',
          })));
        }
      }
    } catch {}
    finally { setLoadingForm(false); }
  };

  const handleChange = (name: string, value: string) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  const handleQRChange = (index: number, field: string, value: string) =>
    setReglasQR((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));

  const addRule = () =>
    setReglasQR((prev) => [...prev, { rangoDesde: '1', rangoHasta: '1', monto: '0', urlQR: '' }]);

  const removeRule = (index: number) => {
    if (reglasQR.length <= 1) {
      show({ type: 'warning', title: 'Regla requerida', message: 'Debe existir al menos una regla QR de pago.' });
      return;
    }
    setReglasQR((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.nombre || !formData.fechaInicioEvento || !formData.fechaFinEvento) {
      show({ type: 'warning', title: 'Campos obligatorios', message: 'Por favor completa: Nombre, Fecha Inicio y Fecha Fin.' });
      return;
    }
    if (Number(formData.duracionReunion) <= 0 || Number(formData.cantidadTotalMesasEvento) <= 0) {
      show({ type: 'warning', title: 'Datos inválidos', message: 'La duración y número de mesas deben ser mayores a 0.' });
      return;
    }
    setSaving(true);
    const orNull = (v: string) => (v === '' ? null : v);
    const payload: any = {
      nombre: formData.nombre, edicion: formData.edicion || '',
      descripcion: orNull(formData.descripcion),
      fechaInicioEvento: new Date(formData.fechaInicioEvento).toISOString(),
      fechaFinEvento: new Date(formData.fechaFinEvento).toISOString(),
      duracionReunion: Number(formData.duracionReunion),
      tiempoEntreReuniones: Number(formData.tiempoEntreReuniones),
      cantidadTotalMesasEvento: Number(formData.cantidadTotalMesasEvento),
      capacidadPersonasPorMesa: Number(formData.capacidadPersonasPorMesa),
      montoBaseIncripcionBolivianos: Number(formData.montoBaseIncripcionBolivianos),
      cantidadParticipantesIncluidos: Number(formData.cantidadParticipantesIncluidos),
      costoParticipanteExtra: Number(formData.costoParticipanteExtra),
      urlImagenMapaRecinto: orNull(formData.urlImagenMapaRecinto),
      urlImagenCronogramaCharlas: orNull(formData.urlImagenCronogramaCharlas),
      urlLogoEvento: orNull(formData.urlLogoEvento),
      sobreElEvento: orNull(formData.sobreElEvento),
      correoContacto: orNull(formData.correoContacto),
      telefonoContacto: orNull(formData.telefonoContacto),
      enlaceFacebook: orNull(formData.enlaceFacebook),
      enlaceInstagram: orNull(formData.enlaceInstagram),
      enlaceTwitterX: orNull(formData.enlaceTwitterX),
      reglasQR: reglasQR.map((r) => ({
        rangoDesde: Number(r.rangoDesde), rangoHasta: Number(r.rangoHasta),
        monto: Number(r.monto), urlQR: r.urlQR || '',
      })),
    };
    try {
      const url = editingId === 'nuevo' ? `${API_URL}/admin/eventos` : `${API_URL}/admin/eventos/${formData.id}`;
      const method = editingId === 'nuevo' ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        show({ type: 'success', title: '¡Guardado!', message: 'El evento fue guardado exitosamente.', onConfirm: () => setViewState('lista') });
      } else {
        const errorData = await res.json().catch(() => null);
        show({ type: 'error', title: 'Error al guardar', message: errorData?.message || 'Error desconocido.' });
      }
    } catch {
      show({ type: 'error', title: 'Sin conexión', message: 'No se pudo conectar con el servidor.' });
    } finally {
      setSaving(false); }
  };

  // ── VISTA LISTA ──────────────────────────────────────────────────────────────
  if (viewState === 'lista') {
    return (
      <>
      {modal}
      <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <View className="mb-6 mt-2 flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Eventos</Text>
              <Text className="text-sm text-gray-500 mt-1">Define la Rueda principal</Text>
            </View>
            <TouchableOpacity onPress={() => openForm('nuevo')} className="px-4 py-2.5 rounded-lg flex-row items-center" style={{ backgroundColor: GREEN }}>
              <Plus color="#fff" size={16} />
              <Text className="text-white font-bold ml-2">Crear</Text>
            </TouchableOpacity>
          </View>

          {loadingList ? (
            <ActivityIndicator size="large" color={GREEN} className="mt-10" />
          ) : eventos.length === 0 ? (
            <View className="items-center py-10">
              <CalendarCheck color="#d1d5db" size={48} />
              <Text className="text-lg font-medium text-gray-900 mt-4">Vacío</Text>
              <Text className="text-sm text-gray-500 text-center mt-1">Presiona "Crear" para añadir tu primer evento</Text>
            </View>
          ) : (
            eventos.map((evento) => (
              <View key={evento.id} className={`bg-white rounded-xl shadow-sm border p-5 mb-4 ${evento.esPrincipal === 1 ? 'border-[#5B9A27]' : 'border-gray-100'}`}>
                {evento.esPrincipal === 1 && (
                  <View className="absolute top-0 right-0 px-2 py-1 rounded-bl-lg rounded-tr-xl flex-row items-center" style={{ backgroundColor: GREEN }}>
                    <Star color="#fff" size={10} fill="#fff" />
                    <Text className="text-white text-[9px] font-bold ml-1">PRINCIPAL</Text>
                  </View>
                )}
                <View className="flex-row items-start gap-3 mb-3">
                  {evento.urlLogoEvento ? (
                    <View className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                      <Image source={{ uri: evento.urlLogoEvento }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    </View>
                  ) : (
                    <View className={`p-3 rounded-lg shrink-0 ${evento.esPrincipal === 1 ? 'bg-[#f4f7ee]' : 'bg-gray-50'}`}>
                      <CalendarCheck color={evento.esPrincipal === 1 ? GREEN : '#9ca3af'} size={24} />
                    </View>
                  )}
                  <View className="flex-1 pr-6">
                    <Text className="text-lg font-bold text-gray-900">{evento.nombre}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">{evento.edicion ? `Edición: ${evento.edicion}` : 'Sin edición'}</Text>
                  </View>
                </View>
                <View className="flex-row items-center bg-gray-50 p-2.5 rounded-lg mb-4">
                  <Calendar color="#9ca3af" size={14} />
                  <Text className="text-xs text-gray-600 font-medium ml-2">
                    {new Date(evento.fechaInicioEvento).toLocaleDateString()} - {new Date(evento.fechaFinEvento).toLocaleDateString()}
                  </Text>
                </View>
                <View className="flex-row flex-wrap justify-between gap-y-2 gap-x-2">
                  {evento.esPrincipal === 0 && (
                    <TouchableOpacity onPress={() => handleSetPrincipal(evento.id, evento.nombre)}
                      className="flex-1 bg-white border border-[#d3e5b5] py-2.5 rounded-lg flex-row items-center justify-center min-w-[45%]">
                      <Star color={GREEN} size={14} />
                      <Text className="font-bold text-xs ml-1.5" style={{ color: GREEN }}>+ Principal</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => openForm(evento.id)}
                    className={`bg-gray-50 py-2.5 rounded-lg flex-row items-center justify-center ${evento.esPrincipal === 1 ? 'flex-1' : 'flex-1 min-w-[45%]'}`}>
                    <Edit2 color="#374151" size={14} />
                    <Text className="text-gray-700 font-bold text-xs ml-1.5">Editar</Text>
                  </TouchableOpacity>
                  {evento.esPrincipal === 0 && (
                    <TouchableOpacity onPress={() => handleDelete(evento.id, evento.esPrincipal)}
                      className="bg-red-50 py-2.5 px-3 rounded-lg flex-row items-center justify-center">
                      <Trash2 color="#ef4444" size={14} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
      </>
    );
  }

  // ── CARGANDO FORMULARIO ──────────────────────────────────────────────────────
  if (loadingForm) {
    return (
      <>{modal}<View className="flex-1 justify-center items-center bg-[#F9FAFB]"><ActivityIndicator size="large" color={GREEN} /></View></>
    );
  }

  // ── VISTA FORMULARIO ─────────────────────────────────────────────────────────
  return (
    <>
    {modal}
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={['top']}>
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center bg-white shadow-sm z-10">
        <TouchableOpacity onPress={() => setViewState('lista')} className="p-2 -ml-2">
          <ChevronLeft color="#374151" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-lg text-gray-900 ml-2">
          {editingId === 'nuevo' ? 'Nuevo Evento' : 'Editar Evento'}
        </Text>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>

        {/* ── Información General ── */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5 mt-2">
          <View className="flex-row items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Info color={GREEN} size={20} />
            <Text className="text-base font-bold text-gray-900 ml-1">Información General</Text>
          </View>

          <Text className="text-xs font-bold text-gray-700 mb-2">Nombre del evento *</Text>
          <TextInput value={formData.nombre} onChangeText={(t) => handleChange('nombre', t)}
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="Requerido" />

          <Text className="text-xs font-bold text-gray-700 mb-2">Edición</Text>
          <TextInput value={formData.edicion} onChangeText={(t) => handleChange('edicion', t)}
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="Ej. 2026" />

          <Text className="text-xs font-bold text-gray-700 mb-2">Descripción</Text>
          <TextInput value={formData.descripcion} onChangeText={(t) => handleChange('descripcion', t)}
            multiline textAlignVertical="top"
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 h-24" placeholder="Historia o detalles" />

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-700 mb-2">Fecha inicio *</Text>
              <TextInput value={formData.fechaInicioEvento} onChangeText={(t) => handleChange('fechaInicioEvento', t)}
                className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" placeholder="YYYY-MM-DD" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-700 mb-2">Fecha fin *</Text>
              <TextInput value={formData.fechaFinEvento} onChangeText={(t) => handleChange('fechaFinEvento', t)}
                className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" placeholder="YYYY-MM-DD" />
            </View>
          </View>

          {/* Imágenes */}
          <View className="border-t border-gray-100 pt-4">
            <View className="flex-row items-center gap-2 mb-3">
              <ImageIcon color={GREEN} size={16} />
              <Text className="text-sm font-bold text-gray-800">Imágenes del Evento</Text>
            </View>
            <ImageField label="Mapa del Recinto" value={formData.urlImagenMapaRecinto}
              fieldKey="urlImagenMapaRecinto" uploading={uploadingField} onPick={handlePickImage} />
            <ImageField label="Cronograma de Charlas" value={formData.urlImagenCronogramaCharlas}
              fieldKey="urlImagenCronogramaCharlas" uploading={uploadingField} onPick={handlePickImage} />
          </View>
        </View>

        {/* ── Información Pública ── */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <View className="flex-row items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Info color={GREEN} size={20} />
            <Text className="text-base font-bold text-gray-900 ml-1">Información Pública</Text>
          </View>

          {/* Logo */}
          <ImageField label="Logo del Evento" value={formData.urlLogoEvento}
            fieldKey="urlLogoEvento" uploading={uploadingField} onPick={handlePickImage} />

          <Text className="text-xs font-bold text-gray-700 mb-2">Correo de Contacto</Text>
          <TextInput value={formData.correoContacto} onChangeText={(t) => handleChange('correoContacto', t)}
            keyboardType="email-address"
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="info@ejemplo.com" />

          <Text className="text-xs font-bold text-gray-700 mb-2">Teléfono / WhatsApp</Text>
          <TextInput value={formData.telefonoContacto} onChangeText={(t) => handleChange('telefonoContacto', t)}
            keyboardType="phone-pad"
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="+591 70000000" />

          <Text className="text-xs font-bold text-gray-700 mb-2">Facebook</Text>
          <TextInput value={formData.enlaceFacebook} onChangeText={(t) => handleChange('enlaceFacebook', t)}
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="https://facebook.com/..." />

          <Text className="text-xs font-bold text-gray-700 mb-2">Instagram</Text>
          <TextInput value={formData.enlaceInstagram} onChangeText={(t) => handleChange('enlaceInstagram', t)}
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="https://instagram.com/..." />

          <Text className="text-xs font-bold text-gray-700 mb-2">Twitter / X</Text>
          <TextInput value={formData.enlaceTwitterX} onChangeText={(t) => handleChange('enlaceTwitterX', t)}
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="https://x.com/..." />

          <Text className="text-xs font-bold text-gray-700 mb-2">Sobre el Evento</Text>
          <TextInput value={formData.sobreElEvento} onChangeText={(t) => handleChange('sobreElEvento', t)}
            multiline textAlignVertical="top"
            className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm h-24" placeholder="Historia detallada..." />
        </View>

        {/* ── Logística ── */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <View className="flex-row items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <LayoutGrid color={GREEN} size={20} />
            <Text className="text-base font-bold text-gray-900 ml-1">Logística de Reuniones</Text>
          </View>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-700 mb-2">Total de mesas *</Text>
              <TextInput value={formData.cantidadTotalMesasEvento} onChangeText={(t) => handleChange('cantidadTotalMesasEvento', t)}
                keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-700 mb-2">Cap. p/mesa *</Text>
              <TextInput value={formData.capacidadPersonasPorMesa} onChangeText={(t) => handleChange('capacidadPersonasPorMesa', t)}
                keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-gray-700 mb-2">Duración reunión (min) *</Text>
              <TextInput value={formData.duracionReunion} onChangeText={(t) => handleChange('duracionReunion', t)}
                keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-gray-700 mb-2">Pausa entre citas (min) *</Text>
              <TextInput value={formData.tiempoEntreReuniones} onChangeText={(t) => handleChange('tiempoEntreReuniones', t)}
                keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
          </View>
        </View>

        {/* ── Pagos ── */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <View className="flex-row items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <CreditCard color={GREEN} size={20} />
            <Text className="text-base font-bold text-gray-900 ml-1">Pagos y Tarifas</Text>
          </View>
          <Text className="text-xs font-bold text-gray-700 mb-2">Monto base (Bs.) *</Text>
          <TextInput value={formData.montoBaseIncripcionBolivianos} onChangeText={(t) => handleChange('montoBaseIncripcionBolivianos', t)}
            keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-gray-700 mb-2">Participantes incluidos *</Text>
              <TextInput value={formData.cantidadParticipantesIncluidos} onChangeText={(t) => handleChange('cantidadParticipantesIncluidos', t)}
                keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-gray-700 mb-2">Costo p. extra (Bs.) *</Text>
              <TextInput value={formData.costoParticipanteExtra} onChangeText={(t) => handleChange('costoParticipanteExtra', t)}
                keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
          </View>
        </View>

        {/* ── Reglas QR ── */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-3">
            <View className="flex-row items-center gap-2">
              <QrCode color={GREEN} size={20} />
              <Text className="text-base font-bold text-gray-900 ml-1">Reglas QR de Pago</Text>
            </View>
            <TouchableOpacity onPress={addRule} className="bg-[#f4f7ee] p-2 rounded-lg border border-[#d3e5b5]">
              <Plus color="#4d8321" size={16} />
            </TouchableOpacity>
          </View>

          {reglasQR.map((regla, index) => (
            <View key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xs font-bold text-gray-700">Regla #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeRule(index)} className="bg-red-50 p-1.5 rounded-full">
                  <Trash2 color="#ef4444" size={14} />
                </TouchableOpacity>
              </View>

              <Text className="text-xs font-semibold text-gray-600 mb-1.5">Rango de participantes *</Text>
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput value={regla.rangoDesde} onChangeText={(t) => handleQRChange(index, 'rangoDesde', t)}
                  keyboardType="numeric" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-center" placeholder="Mín" />
                <Text className="text-gray-400 font-bold">a</Text>
                <TextInput value={regla.rangoHasta} onChangeText={(t) => handleQRChange(index, 'rangoHasta', t)}
                  keyboardType="numeric" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-center" placeholder="Máx" />
              </View>

              <Text className="text-xs font-semibold text-gray-600 mb-1.5">Monto (Bs.) *</Text>
              <TextInput value={regla.monto} onChangeText={(t) => handleQRChange(index, 'monto', t)}
                keyboardType="numeric" className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3" placeholder="Monto en bolivianos" />

              <Text className="text-xs font-semibold text-gray-600 mb-1.5">Imagen QR de pago</Text>
              <TouchableOpacity
                onPress={() => handlePickImage('urlQR', index)}
                disabled={uploadingField === `urlQR-${index}`}
                className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl border"
                style={{
                  borderColor: regla.urlQR ? GREEN : '#e5e7eb',
                  borderStyle: 'dashed',
                  backgroundColor: regla.urlQR ? '#f0fdf4' : '#fafafa',
                }}
                activeOpacity={0.7}
              >
                {uploadingField === `urlQR-${index}` ? (
                  <ActivityIndicator color={GREEN} size="small" />
                ) : (
                  <QrCode color={regla.urlQR ? GREEN : '#9ca3af'} size={16} />
                )}
                <Text style={{ color: regla.urlQR ? GREEN : '#9ca3af', fontSize: 13, fontWeight: '600' }}>
                  {uploadingField === `urlQR-${index}` ? 'Subiendo...' : regla.urlQR ? 'Cambiar QR' : 'Subir imagen QR'}
                </Text>
              </TouchableOpacity>

              {regla.urlQR ? (
                <View className="mt-2 rounded-xl overflow-hidden border border-gray-200 items-center bg-white" style={{ height: 80 }}>
                  <Image source={{ uri: regla.urlQR }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* ── Guardar ── */}
        <TouchableOpacity
          disabled={saving}
          onPress={handleSave}
          className={`py-4 rounded-xl items-center justify-center flex-row mb-12 shadow-sm ${saving ? 'opacity-70' : ''}`}
          style={{ backgroundColor: GREEN }}
        >
          <Save color="#fff" size={20} />
          <Text className="text-white font-bold text-base ml-2">
            {saving ? 'Guardando...' : 'Guardar Evento'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
    </>
  );
}
