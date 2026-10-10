import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays, MapPin, Building2, Users, Armchair, Sparkles,
  Images as ImagesIcon, Radio, ChevronRight, Clock,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

// Inicio del rol FORO: versión resumida del landing público para quien ya está
// dentro de la plataforma. Es el equivalente móvil de /empresa/inicio en web.

const GREEN = '#449D3A';

type Evento = {
  id: number;
  nombre: string;
  edicion?: string | null;
  descripcion?: string | null;
  ciudadEvento?: string | null;
  paisEvento?: string | null;
  fechaInicioEvento: string;
  fechaFinEvento: string;
  urlImagenBannerEvento?: string | null;
  urlLogoForo?: string | null;
  stats?: { empresasCount: number; actividadesCount: number; mesasCount: number; tecnicosCount: number };
};

type Actividad = {
  id: number;
  nombreActividad: string;
  nombreSalaEspacio: string;
  fechaActividad: string;
  horaInicioActividad: string;
  horaFinActividad: string;
};

// Las horas del programa son "de reloj de pared": se muestran tal como se
// guardaron, sin convertir de zona horaria.
const hora = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-BO', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }) : '';

const fechaCorta = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('es-BO', { timeZone: 'UTC', day: 'numeric', month: 'long' }) : '';

export default function ForoInicioScreen({ navigation }: any) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [ev, act] = await Promise.all([
        fetch(`${API_URL}/public/evento`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_URL}/public/actividades`).then((r) => (r.ok ? r.json() : [])),
      ]);
      setEvento(ev);
      setActividades(Array.isArray(act) ? act : []);
    } catch {
      // Sin conexión: queda el aviso de no disponible.
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  if (cargando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  if (!evento) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
        <View style={{ margin: 16, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
          <Text style={{ fontWeight: '800', color: '#92400e', textAlign: 'center' }}>No se pudo cargar el evento</Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: '#92400e', textAlign: 'center' }}>Revisa tu conexión e intenta nuevamente.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = evento.stats;
  const lugar = [evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(', ');
  const proximas = actividades.slice(0, 4);

  const cifras: Array<[any, number | undefined, string]> = [
    [Building2, stats?.empresasCount, 'Empresas'],
    [Sparkles, stats?.actividadesCount, 'Actividades'],
    [Armchair, stats?.mesasCount, 'Mesas'],
    [Users, stats?.tecnicosCount, 'Equipo'],
  ];

  const accesos: Array<[any, string, string, string]> = [
    [Radio, 'Cronograma en vivo', 'Sigue el evento minuto a minuto', 'CronogramaVivo'],
    [CalendarDays, 'Comunicados', 'Avisos de la organización', 'Inicio'],
    [ImagesIcon, 'Galería', 'Fotos del evento', 'GaleriaTab'],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); void cargar(); }} tintColor={GREEN} />}
      >
        {/* Portada */}
        <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#166534' }}>
          {!!evento.urlImagenBannerEvento && (
            <Image
              source={{ uri: evento.urlImagenBannerEvento }}
              style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.25 }}
              resizeMode="contain"
            />
          )}
          <View style={{ padding: 20 }}>
            {!!evento.urlLogoForo && (
              <Image source={{ uri: evento.urlLogoForo }} style={{ height: 44, width: 140, marginBottom: 10 }} resizeMode="contain" />
            )}
            {!!evento.edicion && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{evento.edicion}</Text>
              </View>
            )}
            <Text style={{ marginTop: 10, color: '#fff', fontSize: 20, fontWeight: '800' }}>{evento.nombre}</Text>
            <View style={{ marginTop: 10, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CalendarDays color="rgba(255,255,255,.9)" size={14} />
                <Text style={{ color: 'rgba(255,255,255,.9)', fontSize: 12 }}>
                  {fechaCorta(evento.fechaInicioEvento)} – {fechaCorta(evento.fechaFinEvento)}
                </Text>
              </View>
              {!!lugar && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapPin color="rgba(255,255,255,.9)" size={14} />
                  <Text style={{ color: 'rgba(255,255,255,.9)', fontSize: 12 }}>{lugar}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Cifras */}
        {!!stats && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {cifras.map(([Icono, valor, etiqueta]) => (
              <View key={etiqueta} style={{ flexGrow: 1, flexBasis: '45%', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, alignItems: 'center' }}>
                <Icono color={GREEN} size={18} />
                <Text style={{ marginTop: 6, fontSize: 20, fontWeight: '800', color: '#0f172a' }}>{valor ?? 0}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{etiqueta}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sobre el evento */}
        {!!evento.descripcion && (
          <View style={{ marginTop: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 16 }}>
            <Text style={{ fontWeight: '800', color: '#0f172a' }}>Sobre el evento</Text>
            <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 20, color: '#475569' }}>{evento.descripcion}</Text>
          </View>
        )}

        {/* Próximas actividades */}
        {proximas.length > 0 && (
          <View style={{ marginTop: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 16 }}>
            <Text style={{ fontWeight: '800', color: '#0f172a', marginBottom: 10 }}>Próximas actividades</Text>
            {proximas.map((a) => (
              <View key={a.id} style={{ borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <Text style={{ fontWeight: '700', color: '#0f172a' }}>{a.nombreActividad}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CalendarDays color="#94a3b8" size={12} />
                    <Text style={{ fontSize: 11, color: '#64748b' }}>{fechaCorta(a.fechaActividad)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock color="#94a3b8" size={12} />
                    <Text style={{ fontSize: 11, color: '#64748b' }}>{hora(a.horaInicioActividad)} – {hora(a.horaFinActividad)}</Text>
                  </View>
                  {!!a.nombreSalaEspacio && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MapPin color="#94a3b8" size={12} />
                      <Text style={{ fontSize: 11, color: '#64748b' }}>{a.nombreSalaEspacio}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Accesos rápidos */}
        <View style={{ marginTop: 14, gap: 10 }}>
          {accesos.map(([Icono, titulo, texto, destino]) => (
            <TouchableOpacity
              key={titulo}
              activeOpacity={0.85}
              onPress={() => { try { navigation.navigate(destino); } catch { /* la pestaña puede no existir para este rol */ } }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                <Icono color={GREEN} size={18} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>{titulo}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: '#64748b' }}>{texto}</Text>
              </View>
              <ChevronRight color="#94a3b8" size={18} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
