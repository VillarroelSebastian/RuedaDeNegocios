import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Building2, Send, CalendarDays, User } from 'lucide-react-native';

import EmpresaDashboardScreen  from '../screens/empresa/EmpresaDashboardScreen';
import EmpresaEmpresasScreen   from '../screens/empresa/EmpresaEmpresasScreen';
import EmpresaSolicitudesScreen from '../screens/empresa/EmpresaSolicitudesScreen';
import EmpresaReunionesScreen  from '../screens/empresa/EmpresaReunionesScreen';
import EmpresaPerfilScreen     from '../screens/empresa/EmpresaPerfilScreen';
import EmpresaComunicadosScreen from '../screens/empresa/EmpresaComunicadosScreen';
import EmpresaEventosScreen    from '../screens/empresa/EmpresaEventosScreen';
import EmpresaResultadosScreen from '../screens/empresa/EmpresaResultadosScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const GREEN = '#449D3A';
const GRAY  = '#9ca3af';

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

function EmpresaTabs() {
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
        name="Perfil"
        component={EmpresaPerfilScreen}
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <User color={color} size={22} /> }}
      />
    </Tab.Navigator>
  );
}

export default function EmpresaNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: '#ffffff' },
        headerTintColor:  '#0f172a',
        headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 16 },
        headerShadowVisible: false,
        headerBackTitle:  'Volver',
      }}
    >
      <Stack.Screen name="EmpresaTabs"  component={EmpresaTabs}           options={{ headerShown: false }} />
      <Stack.Screen name="Comunicados"  component={EmpresaComunicadosScreen} options={{ title: 'Comunicados' }} />
      <Stack.Screen name="Eventos"      component={EmpresaEventosScreen}  options={{ title: 'Actividades' }} />
      <Stack.Screen name="Resultados"   component={EmpresaResultadosScreen} options={{ title: 'Resultados' }} />
    </Stack.Navigator>
  );
}
