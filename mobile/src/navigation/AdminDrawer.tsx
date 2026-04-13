import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, CalendarCheck } from 'lucide-react-native';
import DashboardScreen from '../screens/admin/DashboardScreen';
import EventConfigScreen from '../screens/admin/EventConfigScreen';

const Tab = createBottomTabNavigator();

export default function AdminDrawer() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff', shadowColor: 'transparent', elevation: 0, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
        headerTintColor: '#1f2937',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: '#449D3A',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f3f4f6', backgroundColor: '#ffffff', height: 60, paddingBottom: 10, paddingTop: 5 }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          title: 'Panel',
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={24} />
        }} 
      />
      <Tab.Screen 
        name="Eventos" 
        component={EventConfigScreen} 
        options={{
          title: 'Evento',
          tabBarIcon: ({ color }) => <CalendarCheck color={color} size={24} />
        }}
      />
    </Tab.Navigator>
  );
}
