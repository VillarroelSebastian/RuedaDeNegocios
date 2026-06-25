import 'react-native-gesture-handler';
import "./global.css";
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegistroScreen from './src/screens/RegistroScreen';
import AdminNavigator from './src/navigation/AdminNavigator';
import TecnicoNavigator from './src/navigation/TecnicoNavigator';
import { userStore } from './src/utils/userStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading,       setLoading]       = useState(true);
  const [initialRoute,  setInitialRoute]  = useState<'Login' | 'AdminRoot' | 'TecnicoRoot'>('Login');

  useEffect(() => {
    userStore.load().then((user) => {
      if (user?.rolEvento === 'ADMINISTRADOR') setInitialRoute('AdminRoot');
      else if (user?.rolEvento === 'TECNICO')  setInitialRoute('TecnicoRoot');
      else                                      setInitialRoute('Login');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#449D3A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="Login"       component={LoginScreen}      />
        <Stack.Screen name="Registro"    component={RegistroScreen}   />
        <Stack.Screen name="AdminRoot"   component={AdminNavigator}   />
        <Stack.Screen name="TecnicoRoot" component={TecnicoNavigator} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
