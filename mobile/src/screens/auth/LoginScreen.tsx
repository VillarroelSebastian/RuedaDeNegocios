import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN  = '#449D3A';
const GREEN2 = '#166534';
const DARK   = '#0f172a';

export default function LoginScreen({ navigation }: any) {
  const [correo,      setCorreo]      = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleLogin = async () => {
    if (!correo.trim() || !contrasenia) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo.trim(), contrasenia }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Credenciales inválidas');
      if (data.rolEvento === 'Administrador' || data.rolEvento === 'TECNICO') {
        userStore.set(data);
        navigation.replace('AdminRoot');
      } else {
        setError('No tienes permisos de acceso.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Formulario ─────────────────────────────────────── */}
          <View style={s.formArea}>

            {/* Logo */}
            <Image
              source={require('../../../assets/iconos/logo.png')}
              style={s.logo}
              resizeMode="contain"
            />

            <Text style={s.title}>Iniciar sesión</Text>
            <Text style={s.subtitle}>
              Accede para gestionar empresas, reuniones y actividades del evento.
            </Text>

            {/* Error */}
            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Correo */}
            <Text style={s.label}>Correo electrónico</Text>
            <View style={[s.inputRow, !!error && correo === '' && s.inputError]}>
              <Mail size={18} color="#9ca3af" style={{ marginRight: 10 }} />
              <TextInput
                style={s.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={correo}
                onChangeText={setCorreo}
              />
            </View>

            {/* Contraseña */}
            <Text style={[s.label, { marginTop: 16 }]}>Contraseña</Text>
            <View style={s.inputRow}>
              <Lock size={18} color="#9ca3af" style={{ marginRight: 10 }} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPwd}
                value={contrasenia}
                onChangeText={setContrasenia}
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPwd
                  ? <EyeOff size={18} color="#9ca3af" />
                  : <Eye    size={18} color="#9ca3af" />}
              </TouchableOpacity>
            </View>

            {/* Botones */}
            <TouchableOpacity
              style={[s.btnPrimary, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnPrimaryText}>Iniciar sesión</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.btnSecondary}
              onPress={() => navigation.navigate('Registro')}
              activeOpacity={0.85}
            >
              <Text style={s.btnSecondaryText}>Registrar mi empresa</Text>
            </TouchableOpacity>
          </View>

          {/* ── Panel inferior ─────────────────────────────────── */}
          <View style={s.panel}>
            <Image
              source={require('../../../assets/iconos/reunion.png')}
              style={s.panelImg}
              resizeMode="cover"
            />

            <Text style={s.panelTitle}>Impulsando el Beni</Text>
            <Text style={s.panelSub}>
              Conectando empresas, generando oportunidades y fortaleciendo la economía regional.
            </Text>

            {/* Métricas */}
            <View style={s.metrics}>
              {[
                { val: '200+', lbl: 'Empresas' },
                { val: '1k+',  lbl: 'Reuniones' },
                { val: '$5M+', lbl: 'Negocios' },
              ].map((m, i) => (
                <React.Fragment key={m.lbl}>
                  {i > 0 && <View style={s.metricDiv} />}
                  <View style={s.metricItem}>
                    <Text style={s.metricVal}>{m.val}</Text>
                    <Text style={s.metricLbl}>{m.lbl}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <Text style={s.copy}>© {new Date().getFullYear()} Rueda de Negocios del Beni</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  // Formulario
  formArea: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 32 },
  logo:     { width: 180, height: 56, marginBottom: 32 },
  title:    { fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 22, marginBottom: 28 },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'center', fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  inputError: { borderColor: '#fca5a5' },
  input: { flex: 1, fontSize: 15, color: '#0f172a', height: '100%' },

  btnPrimary: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    shadowColor: GREEN,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  btnSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnSecondaryText: { color: '#1e293b', fontWeight: '600', fontSize: 15 },

  // Panel inferior
  panel: {
    backgroundColor: DARK,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
    marginTop: 'auto',
  },
  panelImg: {
    width: '100%',
    height: 160,
    borderRadius: 18,
    marginBottom: 22,
  },
  panelTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  panelSub:   { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  metrics: { flexDirection: 'row', width: '100%', marginBottom: 24 },
  metricItem: { flex: 1, alignItems: 'center' },
  metricDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 },
  metricVal: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  metricLbl: { color: '#64748b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  copy: { color: '#334155', fontSize: 11, textAlign: 'center' },
});
