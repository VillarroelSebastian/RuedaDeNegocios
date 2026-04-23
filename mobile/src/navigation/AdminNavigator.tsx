import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard, Building2, CreditCard, Armchair, MoreHorizontal,
  CalendarCheck, Newspaper, Users, BarChart3, Settings, ListChecks,
  CalendarRange,
} from 'lucide-react-native';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DashboardScreen    from '../screens/admin/DashboardScreen';
import EmpresasScreen     from '../screens/admin/EmpresasScreen';
import PagosScreen        from '../screens/admin/PagosScreen';
import PagoDetailScreen   from '../screens/admin/PagoDetailScreen';
import MesasScreen        from '../screens/admin/MesasScreen';
import ActividadesScreen  from '../screens/admin/ActividadesScreen';
import NoticiasScreen     from '../screens/admin/NoticiasScreen';
import TecnicosScreen     from '../screens/admin/TecnicosScreen';
import EstadisticasScreen from '../screens/admin/EstadisticasScreen';
import ConfiguracionScreen from '../screens/admin/ConfiguracionScreen';
import AgendaScreen       from '../screens/admin/AgendaScreen';
import EventConfigScreen  from '../screens/admin/EventConfigScreen';

const Tab        = createBottomTabNavigator();
const AdminStack = createNativeStackNavigator();

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

// ─── Pantalla "Más" ───────────────────────────────────────────────────────────
function MenuScreen({ navigation }: any) {
  const menuItems = [
    { name: 'Eventos',       icon: CalendarRange, screen: 'Eventos',      desc: 'Gestión de eventos',     highlight: true },
    { name: 'Actividades',   icon: CalendarCheck, screen: 'Actividades',  desc: 'Programa del evento'  },
    { name: 'Agenda',        icon: ListChecks,    screen: 'Agenda',       desc: 'Ocupación de mesas'   },
    { name: 'Noticias',      icon: Newspaper,     screen: 'Noticias',     desc: 'Comunicados'          },
    { name: 'Técnicos',      icon: Users,         screen: 'Tecnicos',     desc: 'Gestión de técnicos'  },
    { name: 'Estadísticas',  icon: BarChart3,     screen: 'Estadisticas', desc: 'Reportes del evento'  },
    { name: 'Configuración', icon: Settings,      screen: 'Configuracion',desc: 'Mi perfil y cuenta'   },
  ];

  return (
    <SafeAreaView style={ms.root} edges={['top']}>
      <View style={ms.header}>
        <Text style={ms.headerTitle}>Más opciones</Text>
        <Text style={ms.headerSub}>Accede a todos los módulos del sistema</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.grid} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.screen}
              onPress={() => navigation.navigate(item.screen)}
              style={[ms.card, item.highlight && ms.cardHighlight]}
              activeOpacity={0.75}
            >
              <View style={[ms.iconBox, item.highlight && ms.iconBoxHighlight]}>
                <Icon color={item.highlight ? '#fff' : GREEN} size={22} />
              </View>
              <Text style={[ms.cardName, item.highlight && ms.cardNameHighlight]}>{item.name}</Text>
              <Text style={[ms.cardDesc, item.highlight && ms.cardDescHighlight]}>{item.desc}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 18,
    width: '47%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHighlight: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  iconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#f0fdf4',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconBoxHighlight: { backgroundColor: 'rgba(255,255,255,0.2)' },
  cardName:         { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  cardNameHighlight:{ color: '#fff' },
  cardDesc:         { fontSize: 11, color: '#94a3b8' },
  cardDescHighlight:{ color: 'rgba(255,255,255,0.75)' },
});

// ─── Iconos de tabs (fuera del componente para evitar re-renders) ─────────────
const IconDashboard    = ({ color }: { color: string }) => <LayoutDashboard color={color} size={22} />;
const IconEmpresas     = ({ color }: { color: string }) => <Building2       color={color} size={22} />;
const IconPagos        = ({ color }: { color: string }) => <CreditCard      color={color} size={22} />;
const IconMesas        = ({ color }: { color: string }) => <Armchair        color={color} size={22} />;
const IconMenu         = ({ color }: { color: string }) => <MoreHorizontal  color={color} size={22} />;

// ─── Tabs principales ─────────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ title: 'Panel',    tabBarIcon: IconDashboard }} />
      <Tab.Screen name="Empresas"   component={EmpresasScreen}
        options={{ title: 'Empresas', tabBarIcon: IconEmpresas }} />
      <Tab.Screen name="Pagos"      component={PagosScreen}
        options={{ title: 'Pagos',    tabBarIcon: IconPagos }} />
      <Tab.Screen name="Mesas"      component={MesasScreen}
        options={{ title: 'Mesas',    tabBarIcon: IconMesas }} />
      <Tab.Screen name="Menu"       component={MenuScreen}
        options={{ title: 'Más',      tabBarIcon: IconMenu }} />
    </Tab.Navigator>
  );
}

// ─── Navigator raíz admin ─────────────────────────────────────────────────────
export default function AdminNavigator() {
  const screenOptions = {
    headerStyle:       { backgroundColor: '#ffffff' },
    headerTintColor:   '#0f172a',
    headerTitleStyle:  { fontWeight: 'bold' as const, fontSize: 16 },
    headerShadowVisible: false,
    headerBackTitle:   'Volver',
  };

  return (
    <AdminStack.Navigator screenOptions={screenOptions}>
      <AdminStack.Screen name="AdminTabs"    component={AdminTabs}          options={{ headerShown: false }} />
      <AdminStack.Screen name="Eventos"      component={EventConfigScreen}  options={{ title: 'Gestión de Eventos' }} />
      <AdminStack.Screen name="Actividades"  component={ActividadesScreen}  options={{ title: 'Actividades del Programa' }} />
      <AdminStack.Screen name="Noticias"     component={NoticiasScreen}     options={{ title: 'Noticias y Comunicados' }} />
      <AdminStack.Screen name="Tecnicos"     component={TecnicosScreen}     options={{ title: 'Técnicos' }} />
      <AdminStack.Screen name="Estadisticas" component={EstadisticasScreen} options={{ title: 'Estadísticas' }} />
      <AdminStack.Screen name="Configuracion"component={ConfiguracionScreen}options={{ title: 'Configuración' }} />
      <AdminStack.Screen name="Agenda"       component={AgendaScreen}       options={{ title: 'Agenda de Mesas' }} />
      <AdminStack.Screen name="PagoDetail"   component={PagoDetailScreen}   options={{ title: 'Verificar Pago' }} />
    </AdminStack.Navigator>
  );
}
