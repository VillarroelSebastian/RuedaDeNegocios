import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard, Building2, CreditCard, Armchair, MoreHorizontal,
  CalendarCheck, Newspaper, Users, BarChart3, Settings, ListChecks,
} from 'lucide-react-native';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView
} from 'react-native';

import DashboardScreen from '../screens/admin/DashboardScreen';
import EmpresasScreen from '../screens/admin/EmpresasScreen';
import PagosScreen from '../screens/admin/PagosScreen';
import PagoDetailScreen from '../screens/admin/PagoDetailScreen';
import MesasScreen from '../screens/admin/MesasScreen';
import ActividadesScreen from '../screens/admin/ActividadesScreen';
import NoticiasScreen from '../screens/admin/NoticiasScreen';
import TecnicosScreen from '../screens/admin/TecnicosScreen';
import EstadisticasScreen from '../screens/admin/EstadisticasScreen';
import ConfiguracionScreen from '../screens/admin/ConfiguracionScreen';
import AgendaScreen from '../screens/admin/AgendaScreen';

const Tab = createBottomTabNavigator();
const AdminStack = createNativeStackNavigator();

const GREEN = '#449D3A';
const GRAY = '#9ca3af';

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: GREEN,
  tabBarInactiveTintColor: GRAY,
  tabBarStyle: { borderTopColor: '#f3f4f6', backgroundColor: '#ffffff', height: 60, paddingBottom: 10, paddingTop: 5 },
};

function MenuScreen({ navigation }: any) {
  const menuItems = [
    { name: 'Actividades', icon: CalendarCheck, screen: 'Actividades', desc: 'Programa del evento' },
    { name: 'Agenda', icon: ListChecks, screen: 'Agenda', desc: 'Ocupación de mesas' },
    { name: 'Noticias', icon: Newspaper, screen: 'Noticias', desc: 'Comunicados' },
    { name: 'Técnicos', icon: Users, screen: 'Tecnicos', desc: 'Gestión de técnicos' },
    { name: 'Estadísticas', icon: BarChart3, screen: 'Estadisticas', desc: 'Reportes del evento' },
    { name: 'Configuración', icon: Settings, screen: 'Configuracion', desc: 'Mi perfil y cuenta' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <View className="px-6 py-4 bg-white border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Menú</Text>
        <Text className="text-sm text-gray-500 mt-0.5">Accede a todos los módulos del sistema</Text>
      </View>
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="flex-row flex-wrap gap-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.screen}
                onPress={() => navigation.navigate(item.screen)}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm w-[47%]"
              >
                <View className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                  <Icon color={GREEN} size={22} />
                </View>
                <Text className="font-bold text-gray-900 text-sm">{item.name}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{item.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ title: 'Panel', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} /> }} />
      <Tab.Screen name="Empresas" component={EmpresasScreen}
        options={{ title: 'Empresas', tabBarIcon: ({ color }) => <Building2 color={color} size={22} /> }} />
      <Tab.Screen name="Pagos" component={PagosScreen}
        options={{ title: 'Pagos', tabBarIcon: ({ color }) => <CreditCard color={color} size={22} /> }} />
      <Tab.Screen name="Mesas" component={MesasScreen}
        options={{ title: 'Mesas', tabBarIcon: ({ color }) => <Armchair color={color} size={22} /> }} />
      <Tab.Screen name="Menu" component={MenuScreen}
        options={{ title: 'Más', tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={22} /> }} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  const screenOptions = {
    headerStyle: { backgroundColor: '#ffffff' },
    headerTintColor: '#1f2937',
    headerTitleStyle: { fontWeight: 'bold' as const },
    headerShadowVisible: false,
    headerBackTitle: 'Volver',
  };

  return (
    <AdminStack.Navigator screenOptions={screenOptions}>
      <AdminStack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <AdminStack.Screen name="Actividades" component={ActividadesScreen} options={{ title: 'Actividades del Programa' }} />
      <AdminStack.Screen name="Noticias" component={NoticiasScreen} options={{ title: 'Noticias y Comunicados' }} />
      <AdminStack.Screen name="Tecnicos" component={TecnicosScreen} options={{ title: 'Técnicos' }} />
      <AdminStack.Screen name="Estadisticas" component={EstadisticasScreen} options={{ title: 'Estadísticas' }} />
      <AdminStack.Screen name="Configuracion" component={ConfiguracionScreen} options={{ title: 'Configuración' }} />
      <AdminStack.Screen name="Agenda" component={AgendaScreen} options={{ title: 'Agenda de Mesas' }} />
      <AdminStack.Screen name="PagoDetail" component={PagoDetailScreen} options={{ title: 'Verificar Pago' }} />
    </AdminStack.Navigator>
  );
}
