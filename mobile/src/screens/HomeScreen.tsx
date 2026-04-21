import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Linking, ImageBackground, Image,
} from 'react-native';
import { API_URL } from '../utils/userStore';

interface EventoPublico {
  id: number;
  nombre: string;
  edicion: string;
  descripcion: string | null;
  sobreElEvento: string | null;
  fechaInicioEvento: string;
  fechaFinEvento: string;
  correoContacto: string | null;
  telefonoContacto: string | null;
  enlaceFacebook: string | null;
  enlaceInstagram: string | null;
  urlLogoEvento: string | null;
  stats: { empresasCount: number; mesasCount: number; actividadesCount: number; tecnicosCount: number };
}

interface Actividad {
  id: number;
  tipoActividad: string;
  nombreActividad: string;
  descripcionActividad: string;
  nombreSalaEspacio: string;
  horaInicioActividad: string;
  horaFinActividad: string;
  nombreCompletoPilaExpositor: string | null;
}

const tipoColor: Record<string, string> = {
  CONFERENCIA: '#3b82f6',
  TALLER:      '#16a34a',
  PANEL:       '#7c3aed',
  Seminario:   '#d97706',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function HomeScreen({ navigation }: any) {
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/public/evento`).then((r) => r.json()),
      fetch(`${API_URL}/public/actividades`).then((r) => r.json()),
    ])
      .then(([ev, acts]) => { setEvento(ev); setActividades(acts?.slice(0, 3) ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-green-900 items-center justify-center">
        <StatusBar barStyle="light-content" backgroundColor="#14532d" />
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4 text-base">Cargando evento…</Text>
      </View>
    );
  }

  if (!evento) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <StatusBar barStyle="dark-content" />
        <Text className="text-xl font-bold text-gray-700 text-center">No hay evento activo</Text>
        <Text className="text-gray-500 mt-2 text-center">Contacta al administrador.</Text>
        <TouchableOpacity
          className="mt-6 bg-green-700 px-8 py-3 rounded-xl"
          onPress={() => navigation.navigate('Login')}
        >
          <Text className="text-white font-semibold">Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── HERO ───────────────────────────────────────────── */}
        <View className="relative" style={{ height: 440 }}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80' }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(5,46,22,0.85)' }} />
          </ImageBackground>

          <View className="absolute inset-0 px-6 justify-center items-center" style={{ paddingTop: 50 }}>
            {evento.urlLogoEvento ? (
              <Image
                source={{ uri: evento.urlLogoEvento }}
                style={{ width: 70, height: 70, borderRadius: 14, marginBottom: 16 }}
                resizeMode="contain"
              />
            ) : (
              <View className="w-16 h-16 bg-green-700 rounded-2xl items-center justify-center mb-4">
                <Text className="text-white font-extrabold text-lg">RN</Text>
              </View>
            )}

            <View className="bg-white/20 border border-white/30 rounded-full px-4 py-1 mb-4">
              <Text className="text-white/90 text-xs">Edición {evento.edicion} · Beni, Bolivia</Text>
            </View>

            <Text className="text-white text-2xl font-extrabold text-center leading-tight mb-3">
              {evento.nombre}
            </Text>

            {evento.descripcion && (
              <Text className="text-white/75 text-sm text-center mb-5 leading-relaxed px-4">
                {evento.descripcion}
              </Text>
            )}

            <Text className="text-green-300 text-xs text-center mb-6">
              📅 {fmtDate(evento.fechaInicioEvento)} – {fmtDate(evento.fechaFinEvento)}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <TouchableOpacity
                className="bg-white rounded-xl px-7 py-3.5 shadow-lg"
                onPress={() => navigation.navigate('Registro')}
                activeOpacity={0.85}
              >
                <Text className="text-green-800 font-bold text-base">Registrar empresa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 }}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Iniciar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── STATS ──────────────────────────────────────────── */}
        <View className="bg-green-800 py-6 px-4">
          <View className="flex-row flex-wrap">
            {[
              { label: 'Empresas',   value: evento.stats.empresasCount,   icon: '🏢' },
              { label: 'Mesas',      value: evento.stats.mesasCount,       icon: '🪑' },
              { label: 'Actividades',value: evento.stats.actividadesCount, icon: '📋' },
              { label: 'Técnicos',   value: evento.stats.tecnicosCount,    icon: '👥' },
            ].map((s) => (
              <View key={s.label} className="w-1/2 items-center py-3">
                <Text className="text-2xl mb-1">{s.icon}</Text>
                <Text className="text-white text-2xl font-extrabold">{s.value}</Text>
                <Text className="text-green-200 text-xs mt-0.5">{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── SOBRE EL EVENTO ────────────────────────────────── */}
        <View className="px-6 py-8 bg-gray-50">
          <Text className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-2">Sobre el Evento</Text>
          <Text className="text-gray-900 text-xl font-extrabold mb-4">El encuentro empresarial del Beni</Text>
          <Text className="text-gray-600 leading-relaxed text-sm">
            {evento.sobreElEvento ??
              'La Rueda de Negocios del Beni es el espacio más importante de encuentro empresarial del departamento. Conectamos empresas, emprendedores y actores del sector productivo mediante reuniones previamente agendadas, facilitando oportunidades comerciales y alianzas estratégicas.'}
          </Text>

          {/* Feature bullets */}
          <View className="mt-5 space-y-2">
            {['Reuniones de negocios de 20 minutos', 'Agenda previamente coordinada', 'Empresas de todo el país'].map((item) => (
              <View key={item} className="flex-row items-center gap-2 mt-2">
                <View className="w-5 h-5 bg-green-100 rounded-full items-center justify-center">
                  <View className="w-2 h-2 bg-green-600 rounded-full" />
                </View>
                <Text className="text-gray-600 text-sm flex-1">{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── ACTIVIDADES ────────────────────────────────────── */}
        {actividades.length > 0 && (
          <View className="px-6 py-8 bg-white">
            <Text className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-2">Programa</Text>
            <Text className="text-gray-900 text-xl font-extrabold mb-5">Actividades del Evento</Text>
            {actividades.map((act) => (
              <View key={act.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="rounded-full px-3 py-1" style={{ backgroundColor: (tipoColor[act.tipoActividad] ?? '#6b7280') + '20' }}>
                    <Text className="text-xs font-semibold" style={{ color: tipoColor[act.tipoActividad] ?? '#6b7280' }}>
                      {act.tipoActividad}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-xs">
                    {fmtTime(act.horaInicioActividad)} – {fmtTime(act.horaFinActividad)}
                  </Text>
                </View>
                <Text className="text-gray-900 font-bold text-sm leading-snug mb-1">{act.nombreActividad}</Text>
                <Text className="text-gray-500 text-xs">{act.nombreSalaEspacio}</Text>
                {act.nombreCompletoPilaExpositor && (
                  <Text className="text-green-700 text-xs font-medium mt-2">🎤 {act.nombreCompletoPilaExpositor}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── CONTACTO ───────────────────────────────────────── */}
        <View className="px-6 py-8 bg-gray-50">
          <Text className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-2">Información</Text>
          <Text className="text-gray-900 text-xl font-extrabold mb-5">Contacto</Text>

          {evento.telefonoContacto && (
            <TouchableOpacity
              className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center gap-4 mb-3"
              onPress={() => Linking.openURL(`tel:${evento.telefonoContacto}`)}
            >
              <View className="w-11 h-11 bg-green-100 rounded-xl items-center justify-center">
                <Text className="text-lg">📞</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs">Teléfono / WhatsApp</Text>
                <Text className="text-gray-800 font-semibold text-sm">{evento.telefonoContacto}</Text>
              </View>
            </TouchableOpacity>
          )}

          {evento.correoContacto && (
            <TouchableOpacity
              className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center gap-4 mb-3"
              onPress={() => Linking.openURL(`mailto:${evento.correoContacto}`)}
            >
              <View className="w-11 h-11 bg-blue-100 rounded-xl items-center justify-center">
                <Text className="text-lg">✉️</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs">Correo Electrónico</Text>
                <Text className="text-gray-800 font-semibold text-sm">{evento.correoContacto}</Text>
              </View>
            </TouchableOpacity>
          )}

          <View className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center gap-4">
            <View className="w-11 h-11 bg-amber-100 rounded-xl items-center justify-center">
              <Text className="text-lg">📍</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Ubicación</Text>
              <Text className="text-gray-800 font-semibold text-sm">Trinidad, Beni — Bolivia</Text>
            </View>
          </View>
        </View>

        {/* ── CTA FINAL ──────────────────────────────────────── */}
        <View className="bg-green-800 px-6 py-10 items-center">
          <Text className="text-white text-xl font-extrabold text-center mb-2">
            ¿Quieres participar en el evento?
          </Text>
          <Text className="text-green-200 text-sm text-center mb-6">
            Registra tu empresa o accede con tu cuenta.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 }}
              onPress={() => navigation.navigate('Registro')}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#14532d', fontWeight: '700', fontSize: 14 }}>Registrarse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 }}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View className="bg-green-950 px-6 py-6 items-center">
          <Text className="text-green-400 text-xs text-center">
            © {new Date().getFullYear()} {evento.nombre}
          </Text>
          <Text className="text-green-600 text-xs text-center mt-1">Edición {evento.edicion} · Beni, Bolivia</Text>
        </View>

      </ScrollView>
    </View>
  );
}
