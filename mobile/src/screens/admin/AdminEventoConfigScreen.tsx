import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Settings, Clock, Users, DollarSign, Timer, Save, RefreshCw, AlertCircle,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

interface ConfigField {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  keyboardType: 'numeric' | 'default';
  min: number;
  unit?: string;
}

const FIELDS: ConfigField[] = [
  { key: 'duracionReunion',              label: 'Duración de reunión',              sublabel: 'Minutos por reunión entre empresas',       icon: Clock,       keyboardType: 'numeric', min: 1,  unit: 'min' },
  { key: 'tiempoEntreReuniones',         label: 'Tiempo entre reuniones',           sublabel: 'Minutos de pausa entre cada reunión',      icon: Timer,       keyboardType: 'numeric', min: 0,  unit: 'min' },
  { key: 'maxParticipantesPorEmpresa',   label: 'Máx. participantes por empresa',   sublabel: 'Límite total de personas por empresa',     icon: Users,       keyboardType: 'numeric', min: 1 },
  { key: 'cantidadParticipantesIncluidos',label: 'Participantes incluidos',          sublabel: 'Cubiertos en la inscripción base',         icon: Users,       keyboardType: 'numeric', min: 0 },
  { key: 'costoParticipanteExtra',       label: 'Costo participante extra (Bs.)',   sublabel: 'Precio por cupo adicional aprobado',      icon: DollarSign,  keyboardType: 'numeric', min: 0,  unit: 'Bs.' },
  { key: 'montoBaseIncripcionBolivianos',label: 'Monto base inscripción (Bs.)',     sublabel: 'Costo de inscripción incluidos los cupos', icon: DollarSign,  keyboardType: 'numeric', min: 0,  unit: 'Bs.' },
];

export default function AdminEventoConfigScreen() {
  const { show, modal } = useModal();
  const [config,   setConfig]   = useState<Record<string, string>>({});
  const [evento,   setEvento]   = useState<{ nombre?: string; edicion?: string } | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/evento/config`);
      if (!res.ok) throw new Error('No hay evento principal configurado');
      const data = await res.json();
      setEvento({ nombre: data.nombre, edicion: data.edicion });
      const mapped: Record<string, string> = {};
      FIELDS.forEach((f) => { mapped[f.key] = String(data[f.key] ?? ''); });
      setConfig(mapped);
      setDirty(false);
    } catch (e: any) {
      show({ type: 'error', title: 'Error', message: e.message || 'No se pudo cargar la configuración.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchConfig(); }, [fetchConfig]));

  const handleChange = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    for (const f of FIELDS) {
      const val = Number(config[f.key]);
      if (isNaN(val) || val < f.min) {
        show({ type: 'warning', title: 'Valor inválido', message: `"${f.label}" debe ser un número mayor o igual a ${f.min}.` });
        return;
      }
    }
    setSaving(true);
    try {
      const body: Record<string, number> = {};
      FIELDS.forEach((f) => { body[f.key] = Number(config[f.key]); });
      const res = await fetch(`${API_URL}/admin/evento/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al guardar');
      // Update local config with server response
      const mapped: Record<string, string> = {};
      FIELDS.forEach((f) => { mapped[f.key] = String(data[f.key] ?? config[f.key]); });
      setConfig(mapped);
      setDirty(false);
      show({ type: 'success', title: '¡Guardado!', message: 'La configuración del evento fue actualizada.' });
    } catch (e: any) {
      show({ type: 'error', title: 'Error', message: e.message || 'No se pudo guardar la configuración.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {modal}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Evento info banner */}
        {evento && (
          <View style={s.eventoBanner}>
            <Settings color={GREEN} size={16} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.eventoBannerTitle}>{evento.nombre ?? 'Evento principal'}</Text>
              {evento.edicion ? <Text style={s.eventoBannerSub}>Edición: {evento.edicion}</Text> : null}
            </View>
          </View>
        )}

        {/* Info */}
        <View style={s.infoBox}>
          <AlertCircle size={14} color="#1e40af" style={{ marginRight: 8 }} />
          <Text style={s.infoText}>
            Estos valores afectan el evento principal activo. Los cambios son inmediatos.
          </Text>
        </View>

        {/* Campos */}
        {FIELDS.map((field) => {
          const Icon = field.icon;
          return (
            <View key={field.key} style={s.fieldCard}>
              <View style={s.fieldHeader}>
                <View style={s.fieldIconBox}>
                  <Icon color={GREEN} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>{field.label}</Text>
                  <Text style={s.fieldSublabel}>{field.sublabel}</Text>
                </View>
                {field.unit && (
                  <View style={s.unitBadge}>
                    <Text style={s.unitText}>{field.unit}</Text>
                  </View>
                )}
              </View>
              <TextInput
                value={config[field.key] ?? ''}
                onChangeText={(v) => handleChange(field.key, v)}
                keyboardType={field.keyboardType}
                style={s.input}
                placeholderTextColor="#9ca3af"
                placeholder={`Ej: ${field.min}`}
              />
            </View>
          );
        })}

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, (!dirty || saving) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!dirty || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.saveBtnText}>{dirty ? 'Guardar cambios' : 'Sin cambios pendientes'}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Refresh */}
        <TouchableOpacity style={s.refreshBtn} onPress={fetchConfig} activeOpacity={0.8}>
          <RefreshCw size={14} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={s.refreshBtnText}>Recargar desde el servidor</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16 },

  eventoBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  eventoBannerTitle: { fontSize: 14, fontWeight: '800', color: '#14532d' },
  eventoBannerSub:   { fontSize: 11, color: '#166534', marginTop: 1 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#dbeafe', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  infoText: { fontSize: 12, color: '#1e40af', flex: 1, lineHeight: 18 },

  fieldCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  fieldIconBox: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  fieldLabel:    { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  fieldSublabel: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  unitBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  unitText: { fontSize: 11, fontWeight: '700', color: GREEN },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700', color: '#0f172a',
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  saveBtnDisabled: { backgroundColor: '#94a3b8' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 12, paddingVertical: 10,
  },
  refreshBtnText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
});
