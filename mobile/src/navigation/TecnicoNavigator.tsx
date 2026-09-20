import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Armchair, Video, Search, Newspaper, UserCircle, Handshake, Bell, LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModal } from '../components/AppModal';

import TecnicoDashboardScreen  from '../screens/tecnico/TecnicoDashboardScreen';
import TecnicoMesasScreen      from '../screens/tecnico/TecnicoMesasScreen';
import TecnicoVirtualesScreen  from '../screens/tecnico/TecnicoVirtualesScreen';
import TecnicoReunionesScreen  from '../screens/tecnico/TecnicoReunionesScreen';
import TecnicoBuscadorScreen   from '../screens/tecnico/TecnicoBuscadorScreen';
import TecnicoNoticiasScreen   from '../screens/tecnico/TecnicoNoticiasScreen';
import TecnicoPerfilScreen     from '../screens/tecnico/TecnicoPerfilScreen';
import TecnicoAgendarScreen    from '../screens/tecnico/TecnicoAgendarScreen';
import TecnicoAsistenciaScreen from '../screens/tecnico/TecnicoAsistenciaScreen';
import TecnicoEventosVivoScreen from '../screens/tecnico/TecnicoEventosVivoScreen';
import TecnicoGaleriaScreen from '../screens/tecnico/TecnicoGaleriaScreen';
import TecnicoContenidoScreen from '../screens/tecnico/TecnicoContenidoScreen';
import OportunidadesStaffScreen from '../screens/shared/OportunidadesStaffScreen';
import StaffMensajesScreen from '../screens/shared/StaffMensajesScreen';
import { io } from 'socket.io-client';
import { userStore, API_URL } from '../utils/userStore';
import { navigationRef } from '../../App';

const Tab          = createBottomTabNavigator();
const TecnicoStack = createNativeStackNavigator();

const GREEN = '#449D3A';
const GRAY  = '#9ca3af';

const baseTabOptions = {
  headerShown: false,
  tabBarActiveTintColor: GREEN,
  tabBarInactiveTintColor: GRAY,
  tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
};

// La barra de pestañas necesita el inset inferior real del dispositivo: en
// teléfonos con barra de navegación de Android (los "botones/flechas" de
// abajo, comunes en Xiaomi), una altura fija deja las pestañas tapadas o muy
// pegadas a esos botones.
function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  return {
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    height: 52 + Math.max(insets.bottom, 10),
    paddingBottom: Math.max(insets.bottom, 10),
    paddingTop: 6,
  };
}

const IconDashboard  = ({ color }: { color: string }) => <LayoutDashboard color={color} size={22} />;
const IconMesas      = ({ color }: { color: string }) => <Armchair         color={color} size={22} />;
const IconVirtuales  = ({ color }: { color: string }) => <Video            color={color} size={22} />;
const IconBuscador   = ({ color }: { color: string }) => <Search           color={color} size={22} />;
const IconNoticias   = ({ color }: { color: string }) => <Newspaper        color={color} size={22} />;
const IconAlertas    = ({ color }: { color: string }) => <Bell             color={color} size={22} />;
const IconPerfil     = ({ color }: { color: string }) => <UserCircle       color={color} size={22} />;
const IconOportunidades = ({ color }: { color: string }) => <Handshake color={color} size={22} />;
const IconLogout = ({ color }: { color: string }) => <LogOut color={color} size={22} />;

// Pantalla vacía requerida por Tab.Screen; nunca llega a mostrarse porque el
// listener de `tabPress` de abajo intercepta la pulsación antes de navegar.
function LogoutPlaceholder() { return null; }

function TecnicoTabs() {
  const { show, modal } = useModal();
  const tabBarStyle = useTabBarStyle();
  const handleLogout = (navigation: any) => {
    show({
      type: 'confirm',
      title: 'Cerrar sesión',
      message: '¿Estás seguro que quieres cerrar sesión?',
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      onConfirm: () => { userStore.clear().then(() => navigation.replace('Login')); },
    });
  };
  return (
    <>
      {modal}
      <Tab.Navigator screenOptions={{ ...baseTabOptions, tabBarStyle }}>
        <Tab.Screen name="TecnicoDashboard"  component={TecnicoDashboardScreen}
          options={{ title: 'Panel',     tabBarIcon: IconDashboard }} />
        <Tab.Screen name="TecnicoMesas"      component={TecnicoMesasScreen}
          options={{ title: 'Mesas',     tabBarIcon: IconMesas }} />
        <Tab.Screen name="TecnicoVirtuales"  component={TecnicoVirtualesScreen}
          options={{ title: 'Virtuales', tabBarIcon: IconVirtuales }} />
        <Tab.Screen name="TecnicoBuscador"   component={TecnicoBuscadorScreen}
          options={{ title: 'Buscar',    tabBarIcon: IconBuscador }} />
        <Tab.Screen name="TecnicoOportunidades" component={OportunidadesStaffScreen}
          options={{ title: 'Oportun.', tabBarIcon: IconOportunidades }} />
        <Tab.Screen name="TecnicoContenido"  component={TecnicoContenidoScreen}
          options={{ title: 'Alertas', tabBarIcon: IconAlertas }} />
        <Tab.Screen name="TecnicoPerfil"     component={TecnicoPerfilScreen}
          options={{ title: 'Mi Perfil', tabBarIcon: IconPerfil }} />
        <Tab.Screen name="TecnicoCerrarSesion" component={LogoutPlaceholder}
          options={{ title: 'Salir', tabBarIcon: IconLogout }}
          listeners={({ navigation }) => ({
            tabPress: (e) => { e.preventDefault(); handleLogout(navigation); },
          })}
        />
      </Tab.Navigator>
    </>
  );
}

function TecnicoEventosTabs() {
  const tabBarStyle = useTabBarStyle();
  return <Tab.Navigator screenOptions={{ ...baseTabOptions, tabBarStyle }}>
    <Tab.Screen name="TecnicoContenido" component={TecnicoContenidoScreen} options={{ title: 'Alertas', tabBarIcon: IconAlertas }} />
    <Tab.Screen name="TecnicoGaleria" component={TecnicoGaleriaScreen} options={{ title: 'Fotos', tabBarIcon: ({color}) => <Newspaper color={color} size={22}/> }} />
    <Tab.Screen name="TecnicoPerfil" component={TecnicoPerfilScreen} options={{ title: 'Mi Perfil', tabBarIcon: IconPerfil }} />
  </Tab.Navigator>;
}

export default function TecnicoNavigator() {
  const [alerta, setAlerta] = useState<{ titulo: string; mensaje: string } | null>(null);
  useEffect(() => {
    const token = userStore.get()?.token;
    if (!token || userStore.get()?.rolEvento === 'TECNICO_EVENTOS') return;
    const socket = io(`${API_URL.replace(/\/api\/?$/, '')}/notificaciones`, { transports: ['websocket'], auth: { token } });
    const recibir = (payload: any) => setAlerta({
      titulo: payload?.titulo || 'Aviso de reunión virtual',
      mensaje: payload?.mensaje || 'Revisa la reunión virtual próxima.',
    });
    socket.on('staff:reunion-sin-enlace-30m', recibir);
    socket.on('staff:reunion-sin-enlace-urgente', recibir);
    socket.on('staff:reunion-teams-iniciar', recibir);
    socket.on('staff:reunion-teams-responsable', recibir);
    return () => { socket.disconnect(); };
  }, []);

  if (userStore.get()?.rolEvento === 'TECNICO_EVENTOS') return <TecnicoEventosTabs />;
  return (
    <>
      <TecnicoStack.Navigator screenOptions={{ headerShown: false }}>
        <TecnicoStack.Screen name="TecnicoTabs"     component={TecnicoTabs} />
        <TecnicoStack.Screen name="TecnicoReuniones" component={TecnicoReunionesScreen} />
        <TecnicoStack.Screen name="TecnicoAgendar"   component={TecnicoAgendarScreen} />
        <TecnicoStack.Screen name="TecnicoAsistencia" component={TecnicoAsistenciaScreen} />
        <TecnicoStack.Screen name="TecnicoEventosVivo" component={TecnicoEventosVivoScreen} />
        <TecnicoStack.Screen name="TecnicoGaleria" component={TecnicoGaleriaScreen} />
        <TecnicoStack.Screen name="TecnicoMensajes" component={StaffMensajesScreen} />
      </TecnicoStack.Navigator>
      {alerta && <View style={{ position: 'absolute', top: 58, left: 12, right: 12, zIndex: 100, borderRadius: 16, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2', padding: 14, elevation: 10 }}>
        <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 14 }}>{alerta.titulo}</Text>
        <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>{alerta.mensaje}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <TouchableOpacity onPress={() => setAlerta(null)} style={{ padding: 8 }}><Text style={{ color: '#6b7280', fontWeight: '700' }}>Cerrar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setAlerta(null); if (navigationRef.isReady()) (navigationRef.navigate as any)('TecnicoRoot', { screen: 'TecnicoTabs', params: { screen: 'TecnicoVirtuales' } }); }} style={{ borderRadius: 10, backgroundColor: GREEN, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: '#fff', fontWeight: '800' }}>Ver virtuales</Text></TouchableOpacity>
        </View>
      </View>}
    </>
  );
}
