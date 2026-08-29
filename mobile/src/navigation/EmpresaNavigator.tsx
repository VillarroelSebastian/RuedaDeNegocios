import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ScrollView } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { useNavigation }              from '@react-navigation/native';
import { LayoutDashboard, Building2, Send, CalendarDays, User, Bell, MoreHorizontal, Star, Clock, Newspaper, Lightbulb, MessageCircle, Images } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AsistenteChatModal, { AsistenteChatButton } from '../components/AsistenteChatMobile';
import { rutaDeNotifMobile, useNotificacionesMobile } from '../hooks/useNotificaciones';
import { navigationRef } from '../../App';

import EmpresaDashboardScreen   from '../screens/empresa/EmpresaDashboardScreen';
import EmpresaEmpresasScreen    from '../screens/empresa/EmpresaEmpresasScreen';
import EmpresaSolicitudesScreen from '../screens/empresa/EmpresaSolicitudesScreen';
import EmpresaReunionesScreen   from '../screens/empresa/EmpresaReunionesScreen';
import EmpresaPerfilScreen      from '../screens/empresa/EmpresaPerfilScreen';
import EmpresaComunicadosScreen from '../screens/empresa/EmpresaComunicadosScreen';
import EmpresaEventosScreen     from '../screens/empresa/EmpresaEventosScreen';
import EmpresaResultadosScreen  from '../screens/empresa/EmpresaResultadosScreen';
import EmpresaHorariosScreen    from '../screens/empresa/EmpresaHorariosScreen';
import EmpresaOportunidadesScreen from '../screens/empresa/EmpresaOportunidadesScreen';
import EmpresaMensajesScreen    from '../screens/empresa/EmpresaMensajesScreen';
import EmpresaPerfilEmpresaScreen from '../screens/empresa/EmpresaPerfilEmpresaScreen';
import TecnicoGaleriaScreen from '../screens/tecnico/TecnicoGaleriaScreen';
import { userStore, API_URL }   from '../utils/userStore';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const GREEN = '#449D3A';
const GRAY  = '#9ca3af';
const LS_KEY = 'comunicadosLastSeen';

function EmpresaMenuScreen({ navigation }: any) {
  const esEncargado = !!userStore.get()?.esResponsable;
  const opciones = [
    { nombre: 'Perfil', pantalla: 'Perfil', icono: User },
    { nombre: 'Actividades', pantalla: 'Eventos', icono: CalendarDays },
    { nombre: 'Comunicados', pantalla: 'Comunicados', icono: Newspaper },
    { nombre: 'Oportunidades', pantalla: 'Oportunidades', icono: Lightbulb },
    { nombre: 'Mensajes', pantalla: 'Mensajes', icono: MessageCircle },
    { nombre: 'Galería', pantalla: 'Galeria', icono: Images },
    ...(esEncargado ? [
      { nombre: 'Resultados', pantalla: 'Resultados', icono: Star },
      { nombre: 'Mis horarios', pantalla: 'Horarios', icono: Clock },
    ] : []),
  ];
  return (
    <ScrollView style={{ flex:1, backgroundColor:'#f8fafc' }} contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'800', color:'#0f172a', marginBottom:4 }}>Todas las opciones</Text>
      <Text style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Accede a todas las funciones disponibles para tu cuenta.</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:12 }}>
        {opciones.map(({ nombre, pantalla, icono: Icon }) => (
          <TouchableOpacity key={pantalla} onPress={() => navigation.navigate(pantalla)} activeOpacity={0.75}
            style={{ width:'47%', minHeight:112, backgroundColor:'#fff', borderRadius:18, borderWidth:1, borderColor:'#e5e7eb', padding:16 }}>
            <View style={{ width:42, height:42, borderRadius:13, backgroundColor:'#f0fdf4', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
              <Icon color={GREEN} size={21}/>
            </View>
            <Text style={{ fontSize:14, fontWeight:'800', color:'#111827' }}>{nombre}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Bell button ─────────────────────────────────────────────────────────────

function BellButton() {
  const navigation = useNavigation<any>();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const lastSeen = await AsyncStorage.getItem(LS_KEY);
      const res = await fetch(`${API_URL}/empresa/comunicados`);
      if (!res.ok) return;
      const data: any[] = await res.json();
      const n = lastSeen
        ? data.filter((c) => new Date(c.fechaHoraPublicacion).getTime() > new Date(lastSeen).getTime()).length
        : data.length;
      setCount(n);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 30_000);
    return () => clearInterval(iv);
  }, [refresh]);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Comunicados')}
      style={bell.btn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      <Bell size={22} color="#374151" />
      {count > 0 && (
        <View style={bell.badge}>
          <Text style={bell.badgeTxt}>{count > 99 ? '99+' : String(count)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const bell = StyleSheet.create({
  btn:      { marginRight: 8, padding: 6 },
  badge:    {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
});

// ── Tab options ──────────────────────────────────────────────────────────────

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor:   GREEN,
  tabBarInactiveTintColor: GRAY,
  tabBarStyle: {
    borderTopColor:  '#f1f5f9',
    backgroundColor: '#ffffff',
    height: 62,
    paddingBottom: 10,
    paddingTop: 6,
  },
  tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
};

// Encargado: acceso completo
function EncargadoTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen
        name="Inicio"
        component={EmpresaDashboardScreen}
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Empresas"
        component={EmpresaEmpresasScreen}
        options={{ title: 'Empresas', tabBarIcon: ({ color }) => <Building2 color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Solicitudes"
        component={EmpresaSolicitudesScreen}
        options={{ title: 'Solicitudes', tabBarIcon: ({ color }) => <Send color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Reuniones"
        component={EmpresaReunionesScreen}
        options={{ title: 'Reuniones', tabBarIcon: ({ color }) => <CalendarDays color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Mas"
        component={EmpresaMenuScreen}
        options={{ title: 'Más', tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={22} /> }}
      />
    </Tab.Navigator>
  );
}

// Participante: solo info — reuniones, comunicados, eventos, perfil
function ParticipanteTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen
        name="Inicio"
        component={EmpresaDashboardScreen}
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Reuniones"
        component={EmpresaReunionesScreen}
        options={{ title: 'Reuniones', tabBarIcon: ({ color }) => <CalendarDays color={color} size={22} /> }}
      />
      <Tab.Screen
        name="Mas"
        component={EmpresaMenuScreen}
        options={{ title: 'Más', tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={22} /> }}
      />
    </Tab.Navigator>
  );
}

export default function EmpresaNavigator() {
  const [esEncargado, setEsEncargado] = useState(!!userStore.get()?.esResponsable);
  const [chatOpen, setChatOpen] = useState(false);
  const [eeId, setEeId] = useState<number | null>(userStore.get()?.empresaeventoId ?? null);
  const { notifs, dismiss } = useNotificacionesMobile(eeId);
  const notifActual = notifs[0];

  // Resolver el contexto empresa (eeId, euId) apenas se monta el navigator,
  // sin depender de que el Dashboard cargue primero.
  useEffect(() => {
    const usuarioId = userStore.get()?.id;
    if (!usuarioId) return;
    fetch(`${API_URL}/empresa/mi-empresa?usuarioId=${usuarioId}`)
      .then((r) => r.json())
      .then((ctx) => {
        if (ctx?.empresaeventoId) {
          userStore.set({
            ...userStore.get(),
            empresaeventoId: ctx.empresaeventoId,
            empresaUsuarioId: ctx.empresaUsuarioId,
            esResponsable: ctx.esResponsable,
          });
          setEsEncargado(Boolean(ctx.esResponsable));
          setEeId(ctx.empresaeventoId);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <AsistenteChatModal visible={chatOpen} onClose={() => setChatOpen(false)} />
      <Stack.Navigator
        screenOptions={{
          headerStyle:      { backgroundColor: '#ffffff' },
          headerTintColor:  '#0f172a',
          headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 16 },
          headerShadowVisible: false,
          headerBackTitle:  'Volver',
        }}
      >
        <Stack.Screen
          name="EmpresaTabs"
          component={esEncargado ? EncargadoTabs : ParticipanteTabs}
          options={{
            headerShown: true,
            headerTitle: 'Rueda de Negocios',
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AsistenteChatButton onOpen={() => setChatOpen(true)} />
                <BellButton />
              </View>
            ),
          }}
        />
      <Stack.Screen name="Comunicados"   component={EmpresaComunicadosScreen}   options={{ title: 'Comunicados' }} />
      <Stack.Screen name="Eventos"       component={EmpresaEventosScreen}       options={{ title: 'Actividades' }} />
      <Stack.Screen name="Oportunidades" component={EmpresaOportunidadesScreen} options={{ title: 'Oportunidades' }} />
      <Stack.Screen name="Mensajes"      component={EmpresaMensajesScreen}      options={{ title: 'Mensajes' }} />
      <Stack.Screen name="Galeria"       component={TecnicoGaleriaScreen}       options={{ title: 'Galería del evento' }} />
      <Stack.Screen name="Perfil"        component={EmpresaPerfilScreen}        options={{ title: 'Perfil' }} />
      <Stack.Screen name="PerfilEmpresa" component={EmpresaPerfilEmpresaScreen} options={{ title: 'Perfil de empresa', headerShown: false }} />
      {esEncargado && (
        <Stack.Screen name="Resultados"  component={EmpresaResultadosScreen}  options={{ title: 'Resultados' }} />
      )}
      {esEncargado && (
        <Stack.Screen name="Horarios"    component={EmpresaHorariosScreen}    options={{ title: 'Mis horarios disponibles' }} />
      )}
      {/* "Empresas" ya existe como Tab.Screen anidado dentro de EncargadoTabs — registrar
          este Stack.Screen de nivel superior solo para participantes evita tener dos rutas
          con el mismo nombre alcanzables simultáneamente desde el mismo árbol de navegación. */}
      {!esEncargado && (
        <Stack.Screen name="Empresas"    component={EmpresaEmpresasScreen}    options={{ title: 'Empresas' }} />
      )}
      </Stack.Navigator>
      {notifActual && (
        <View style={{ position: 'absolute', top: 62, left: 12, right: 12, zIndex: 100, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#bbf7d0', padding: 14, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }} numberOfLines={1}>{notifActual.titulo}</Text>
          <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }} numberOfLines={3}>{notifActual.mensaje}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <TouchableOpacity onPress={() => dismiss(notifActual.id)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: '#6b7280', fontWeight: '700', fontSize: 12 }}>Cerrar</Text>
            </TouchableOpacity>
            {rutaDeNotifMobile(notifActual.evento) && (
              <TouchableOpacity onPress={() => {
                const ruta = rutaDeNotifMobile(notifActual.evento);
                dismiss(notifActual.id);
                if (ruta && navigationRef.isReady()) navigationRef.navigate(ruta as never);
              }} style={{ backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Ver</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </>
  );
}
