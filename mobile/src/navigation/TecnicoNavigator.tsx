import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Armchair, Video, Search, Newspaper, UserCircle, Handshake } from 'lucide-react-native';

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
import { userStore } from '../utils/userStore';

const Tab          = createBottomTabNavigator();
const TecnicoStack = createNativeStackNavigator();

const GREEN = '#449D3A';
const GRAY  = '#9ca3af';

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: GREEN,
  tabBarInactiveTintColor: GRAY,
  tabBarStyle: {
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    height: 62,
    paddingBottom: 10,
    paddingTop: 6,
  },
  tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
};

const IconDashboard  = ({ color }: { color: string }) => <LayoutDashboard color={color} size={22} />;
const IconMesas      = ({ color }: { color: string }) => <Armchair         color={color} size={22} />;
const IconVirtuales  = ({ color }: { color: string }) => <Video            color={color} size={22} />;
const IconBuscador   = ({ color }: { color: string }) => <Search           color={color} size={22} />;
const IconNoticias   = ({ color }: { color: string }) => <Newspaper        color={color} size={22} />;
const IconPerfil     = ({ color }: { color: string }) => <UserCircle       color={color} size={22} />;
const IconOportunidades = ({ color }: { color: string }) => <Handshake color={color} size={22} />;

function TecnicoTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
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
        options={{ title: 'Contenido', tabBarIcon: IconNoticias }} />
      <Tab.Screen name="TecnicoPerfil"     component={TecnicoPerfilScreen}
        options={{ title: 'Mi Perfil', tabBarIcon: IconPerfil }} />
    </Tab.Navigator>
  );
}

function TecnicoEventosTabs() {
  return <Tab.Navigator screenOptions={tabOptions}>
    <Tab.Screen name="TecnicoContenido" component={TecnicoContenidoScreen} options={{ title: 'Contenido', tabBarIcon: IconNoticias }} />
    <Tab.Screen name="TecnicoGaleria" component={TecnicoGaleriaScreen} options={{ title: 'Fotos', tabBarIcon: ({color}) => <Newspaper color={color} size={22}/> }} />
    <Tab.Screen name="TecnicoPerfil" component={TecnicoPerfilScreen} options={{ title: 'Mi Perfil', tabBarIcon: IconPerfil }} />
  </Tab.Navigator>;
}

export default function TecnicoNavigator() {
  if (userStore.get()?.rolEvento === 'TECNICO_EVENTOS') return <TecnicoEventosTabs />;
  return (
    <TecnicoStack.Navigator screenOptions={{ headerShown: false }}>
      <TecnicoStack.Screen name="TecnicoTabs"     component={TecnicoTabs} />
      <TecnicoStack.Screen name="TecnicoReuniones" component={TecnicoReunionesScreen} />
      <TecnicoStack.Screen name="TecnicoAgendar"   component={TecnicoAgendarScreen} />
      <TecnicoStack.Screen name="TecnicoAsistencia" component={TecnicoAsistenciaScreen} />
      <TecnicoStack.Screen name="TecnicoEventosVivo" component={TecnicoEventosVivoScreen} />
      <TecnicoStack.Screen name="TecnicoGaleria" component={TecnicoGaleriaScreen} />
    </TecnicoStack.Navigator>
  );
}
