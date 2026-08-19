import 'react-native-gesture-handler';
import './global.css';
import React, { useState, useEffect, Component } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen      from './src/screens/auth/LoginScreen';
import RegistroScreen   from './src/screens/RegistroScreen';
import AdminNavigator   from './src/navigation/AdminNavigator';
import TecnicoNavigator from './src/navigation/TecnicoNavigator';
import EmpresaNavigator from './src/navigation/EmpresaNavigator';
import { userStore, API_URL } from './src/utils/userStore';

const Stack = createNativeStackNavigator();
const VALID_ROLES = ['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS', 'EMPRESA'];

// Ref global de navegación: permite navegar desde fuera de componentes (p. ej.
// al tocar "Ver" en una notificación push) directo a la sección correspondiente.
export const navigationRef = createNavigationContainerRef();

// ── Error Boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; errorMsg: string }
class AppErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: any): EBState {
    return { hasError: true, errorMsg: error?.message ?? String(error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.root}>
          <Text style={eb.title}>Error al iniciar la app móvil</Text>
          <Text style={eb.msg}>{this.state.errorMsg || 'Error desconocido'}</Text>
          <TouchableOpacity
            style={eb.btn}
            onPress={() => {
              userStore.clear();
              this.setState({ hasError: false, errorMsg: '' });
            }}
          >
            <Text style={eb.btnText}>Cerrar sesión y reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
const eb = StyleSheet.create({
  root:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 32 },
  title:   { fontSize: 18, fontWeight: '800', color: '#dc2626', textAlign: 'center', marginBottom: 12 },
  msg:     { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn:     { backgroundColor: '#449D3A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [isLoading,    setIsLoading]    = useState(true);
  const [initialRoute, setInitialRoute] = useState<string>('Login');

  useEffect(() => {
    console.log('[App] API_URL =', API_URL);

    let didFinish = false;
    const finish = (route: string) => {
      if (didFinish) return;
      didFinish = true;
      setInitialRoute(route);
      setIsLoading(false);
    };

    // Safety timeout: si AsyncStorage no responde en 6s mostramos Login
    const timer = setTimeout(() => {
      console.warn('[App] Session restore timed out (6s) — showing Login');
      userStore.clear();
      finish('Login');
    }, 6000);

    userStore.load()
      .then((user) => {
        clearTimeout(timer);
        const role: string | undefined = user?.rolEvento;
        if (user?.id && role && VALID_ROLES.includes(role)) {
          console.log('[App] Session restored. id:', user.id, 'role:', role);
          if (role === 'ADMINISTRADOR')  finish('AdminRoot');
          else if (role === 'TECNICO' || role === 'TECNICO_EVENTOS') finish('TecnicoRoot');
          else                           finish('EmpresaRoot');
        } else {
          if (user) {
            console.warn('[App] Stored session invalid (role:', role, ') — clearing');
            userStore.clear();
          }
          finish('Login');
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        console.error('[App] Session load error:', err);
        userStore.clear();
        finish('Login');
      });

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#449D3A" />
        <Text style={{ marginTop: 16, color: '#94a3b8', fontSize: 13 }}>Iniciando...</Text>
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
          <Stack.Screen name="Login"       component={LoginScreen}      />
          <Stack.Screen name="Registro"    component={RegistroScreen}   />
          <Stack.Screen name="AdminRoot"   component={AdminNavigator}   />
          <Stack.Screen name="TecnicoRoot" component={TecnicoNavigator} />
          <Stack.Screen name="EmpresaRoot" component={EmpresaNavigator} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </AppErrorBoundary>
  );
}
