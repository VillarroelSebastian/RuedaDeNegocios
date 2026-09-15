import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal
} from 'react-native';
import { useModal } from '../../components/AppModal';
import { Plus, Clock, X, Radio } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';
import CronogramaVivo from '../../components/CronogramaVivo';

const GREEN = '#449D3A';

const horaBolivia = (iso: string) => iso
  ? new Date(iso).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false })
  : '';

const TIPOS = ['Seminario', 'Taller', 'Actividad', 'Conferencia', 'Panel'];
const ESTADOS = ['Activo', 'Inactivo'];

const defaultForm = {
  tipoActividad: 'Seminario',
  nombreActividad: '',
  descripcionActividad: '',
  nombreSalaEspacio: '',
  capacidadPersonasSala: '',
  fechaActividad: '',
  horaInicioActividad: '',
  horaFinActividad: '',
  nombreCompletoPilaExpositor: '',
  linkReunionVirtual: '',
  estadoActividad: 'Activo',
};

export default function ActividadesScreen({ mostrarCronograma = true }: { mostrarCronograma?: boolean }) {
  const { show, modal } = useModal();
  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  const fetchActividades = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/actividades`);
      setActividades(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchActividades(); }, []);

  const openEdit = (a: any) => {
    setForm({
      tipoActividad: a.tipoActividad,
      nombreActividad: a.nombreActividad,
      descripcionActividad: a.descripcionActividad,
      nombreSalaEspacio: a.nombreSalaEspacio,
      capacidadPersonasSala: String(a.capacidadPersonasSala),
      fechaActividad: a.fechaActividad?.substring(0, 10) || '',
      horaInicioActividad: horaBolivia(a.horaInicioActividad),
      horaFinActividad: horaBolivia(a.horaFinActividad),
      nombreCompletoPilaExpositor: a.nombreCompletoPilaExpositor || '',
      linkReunionVirtual: a.linkReunionVirtual || '',
      estadoActividad: a.estadoActividad,
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nombreActividad.trim() || !form.descripcionActividad.trim() || !form.nombreSalaEspacio.trim() ||
        !(Number(form.capacidadPersonasSala) > 0) || !form.fechaActividad || !form.horaInicioActividad || !form.horaFinActividad) {
      show({ type: 'warning', title: 'Campos requeridos', message: 'Completa nombre, descripción, sala, capacidad, fecha y horario.' });
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `${API_URL}/admin/actividades/${editId}` : `${API_URL}/admin/actividades`;
      await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      show({ type: 'success', title: '¡Listo!', message: editId ? 'Actividad actualizada correctamente.' : 'Actividad creada correctamente.' });
      setShowForm(false);
      fetchActividades();
    } catch { show({ type: 'error', title: 'Error', message: 'No se pudo guardar la actividad.' }); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number, nombre: string) => {
    show({
      type: 'confirm',
      title: 'Eliminar actividad',
      message: `¿Deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        await fetch(`${API_URL}/admin/actividades/${id}`, { method: 'DELETE' });
        fetchActividades();
      },
    });
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const tipoBadgeColor = (tipo: string) => {
    const map: Record<string, string> = { Seminario: '#7c3aed', Taller: '#2563eb', Actividad: GREEN, Conferencia: '#ea580c', Panel: '#db2777' };
    return map[tipo] || '#6b7280';
  };

  return (
    <>
    {modal}
    <View className="flex-1 bg-[#F9FAFB]">
      {mostrarCronograma && (
        <View style={{ padding: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Radio size={22} color="#dc2626" />
          <View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>Cronograma en vivo</Text>
            <Text style={{ color: '#64748b', fontSize: 12 }}>Marca qué actividad está ocurriendo ahora. Los participantes lo ven al instante.</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View className="flex-1 justify-center items-center"><ActivityIndicator color={GREEN} size="large" /></View>
      ) : (
        <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchActividades(); }} tintColor={GREEN} />}>
          {/* Mismo componente que usa el técnico (pestaña "En vivo") y la web: marcar
              en vivo/finalizada y publicar anuncios. Se omite aquí cuando la pantalla
              ya se muestra dentro de una pestaña "En vivo" propia, para no duplicarlo. */}
          {mostrarCronograma && (
            <View className="pt-4">
              <CronogramaVivo staff onError={(m) => show({ type: 'error', title: 'No se pudo actualizar', message: m })} />
            </View>
          )}

          <View className={`flex-row items-center justify-between mx-4 mb-1 ${mostrarCronograma ? 'mt-8 pt-4 border-t border-gray-200' : 'mt-4'}`}>
            <Text className="text-sm font-extrabold text-gray-500 uppercase tracking-wide">
              {mostrarCronograma ? `Gestionar actividades (${actividades.length})` : `Eventos del programa (${actividades.length})`}
            </Text>
            <TouchableOpacity
              onPress={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}
              style={{ backgroundColor: GREEN }}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl"
            >
              <Plus color="white" size={14} />
              <Text className="text-white font-semibold text-xs">Crear</Text>
            </TouchableOpacity>
          </View>

          {actividades.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-gray-400 text-sm">No hay actividades registradas</Text>
            </View>
          ) : (
            actividades.map((a) => {
              const inicio = horaBolivia(a.horaInicioActividad);
              const fin = horaBolivia(a.horaFinActividad);
              return (
                <View key={a.id} className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View style={{ backgroundColor: tipoBadgeColor(a.tipoActividad) + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ color: tipoBadgeColor(a.tipoActividad), fontSize: 11, fontWeight: '700' }}>{a.tipoActividad}</Text>
                    </View>
                    <View style={{ backgroundColor: a.estadoActividad === 'Activo' ? '#dcfce7' : '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ color: a.estadoActividad === 'Activo' ? '#166534' : '#9ca3af', fontSize: 11, fontWeight: '700' }}>{a.estadoActividad}</Text>
                    </View>
                  </View>
                  <Text className={`font-bold text-sm ${a.estadoActividad === 'Inactivo' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{a.nombreActividad}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{a.nombreSalaEspacio}</Text>
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <Clock color="#9ca3af" size={12} />
                    <Text className="text-xs text-gray-400">{inicio} - {fin}</Text>
                    <Text className="text-xs text-gray-400">· {a.capacidadPersonasSala} personas</Text>
                  </View>
                  <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-50">
                    <TouchableOpacity onPress={() => openEdit(a)}
                      className="flex-1 py-2 bg-green-50 rounded-xl items-center">
                      <Text style={{ color: GREEN }} className="text-xs font-semibold">Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(a.id, a.nombreActividad)}
                      className="flex-1 py-2 bg-red-50 rounded-xl items-center">
                      <Text className="text-xs font-semibold text-red-600">Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View className="h-8" />
        </ScrollView>
      )}

      {/* Modal Form */}
      <Modal visible={showForm} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">{editId ? 'Editar' : 'Nueva'} actividad</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><X color="#9ca3af" size={22} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Nombre *', key: 'nombreActividad', placeholder: 'Nombre del evento' },
                { label: 'Sala / Espacio *', key: 'nombreSalaEspacio', placeholder: 'Auditorio Principal' },
                { label: 'Capacidad *', key: 'capacidadPersonasSala', placeholder: '50', keyboardType: 'numeric' },
                { label: 'Fecha (YYYY-MM-DD) *', key: 'fechaActividad', placeholder: '2024-05-15' },
                { label: 'Hora inicio (HH:MM) *', key: 'horaInicioActividad', placeholder: '10:00' },
                { label: 'Hora fin (HH:MM) *', key: 'horaFinActividad', placeholder: '11:30' },
                { label: 'Expositor', key: 'nombreCompletoPilaExpositor', placeholder: 'Nombre completo' },
                { label: 'Link de transmisión', key: 'linkReunionVirtual', placeholder: 'https://...' },
              ].map(({ label, key, placeholder, keyboardType }: any) => (
                <View key={key} className="mb-3">
                  <Text className="text-sm font-semibold text-gray-700 mb-1">{label}</Text>
                  <TextInput
                    value={(form as any)[key]}
                    onChangeText={(v) => set(key, v)}
                    placeholder={placeholder}
                    keyboardType={keyboardType || 'default'}
                    placeholderTextColor="#9ca3af"
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  />
                </View>
              ))}
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-1">Descripción</Text>
                <TextInput
                  value={form.descripcionActividad}
                  onChangeText={(v) => set('descripcionActividad', v)}
                  multiline numberOfLines={3} textAlignVertical="top"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  placeholderTextColor="#9ca3af"
                />
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
                <Text className="text-white font-semibold">{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </>
  );
}
