import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// We use basic MaterialIcons which are usually bundled with Expo
export default function LoginScreen({ navigation }: any) {
  const [correo, setCorreo] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!correo || !contrasenia) {
      setError('Por favor, ingresa tus credenciales.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // Usamos la IP local de la computadora para el emulador (ej: 192.168.x.x o 10.0.2.2 en Android)
      const res = await fetch("http://192.168.100.3:3334/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasenia }),
      });

      if (!res.ok) {
        throw new Error("Credenciales inválidas");
      }

      const user = await res.json();
      if (user.rolEvento === "Administrador") {
        navigation.replace('AdminRoot');
      } else {
        setError('Acceso denegado: No tienes rol de administrador');
      }
    } catch (err: any) {
      setError('Error al iniciar sesión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          
          {/* Logo Section */}
          <View className="px-8 pt-12 pb-6 items-center sm:items-start">
            <Image 
              source={require('../../../assets/iconos/logo.png')}
              className="w-48 h-16"
              resizeMode="contain"
            />
          </View>

          {/* Form Section */}
          <View className="px-8 w-full max-w-md mx-auto">
            <Text className="text-3xl font-bold tracking-tight text-gray-900">
              Iniciar sesión
            </Text>
            <Text className="mt-3 text-sm text-gray-500 mb-8">
              Accede a tu cuenta para gestionar reuniones, participantes y actividades del evento.
            </Text>

            {error ? (
              <View className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <Text className="text-red-600 text-sm font-semibold text-center">{error}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Correo electrónico
              </Text>
              <View className="relative flex-row items-center border border-gray-200 bg-gray-50 rounded-xl px-3 h-14">
                <Text className="text-gray-400 mr-2">✉️</Text>
                <TextInput
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={correo}
                  onChangeText={setCorreo}
                  className="flex-1 text-gray-900 h-full"
                />
              </View>
            </View>

            {/* Password Field */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </Text>
              <View className="relative flex-row items-center border border-gray-200 bg-gray-50 rounded-xl px-3 h-14">
                <Text className="text-gray-400 mr-2">🔒</Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={contrasenia}
                  onChangeText={setContrasenia}
                  className="flex-1 text-gray-900 h-full"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                  <Text className="text-gray-400">👁️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me & Forgot Password */}
            <View className="flex-row items-center justify-between mb-8">
              <TouchableOpacity 
                className="flex-row items-center" 
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View className={`w-5 h-5 rounded border items-center justify-center mr-2 ${rememberMe ? 'bg-[#5B9A27] border-[#5B9A27]' : 'border-gray-300'}`}>
                  {rememberMe && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className="text-sm text-gray-600">Recordarme</Text>
              </TouchableOpacity>

              <TouchableOpacity>
                <Text className="text-sm font-semibold text-[#66A124]">
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View className="gap-y-3 mb-10">
              <TouchableOpacity 
                disabled={loading}
                onPress={handleLogin}
                className={`w-full h-14 rounded-xl items-center justify-center shadow-sm ${loading ? 'bg-[#8ac64b]' : 'bg-[#66A124]'}`}
              >
                <Text className="text-white font-semibold text-base">
                  {loading ? 'Cargando...' : 'Iniciar sesión'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="w-full h-14 bg-[#F4F4F5] border border-gray-200 rounded-xl items-center justify-center shadow-sm">
                <Text className="text-gray-900 font-semibold text-base">
                  Crear cuenta nueva
                </Text>
              </TouchableOpacity>
            </View>
            
          </View>

          {/* Promotional / Info Section - Adapted for Mobile */}
          <View className="bg-[#121A2F] mt-auto w-full px-8 py-10 rounded-t-3xl items-center">
            
            <View className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl mb-6">
              <Image 
                source={require('../../../assets/iconos/reunion.png')}
                className="w-full h-40 rounded-2xl mb-4"
                resizeMode="cover"
              />
              <Text className="text-2xl font-bold text-white text-center mb-2">Impulsando el Beni</Text>
              <Text className="text-sm text-gray-300 text-center leading-relaxed">
                Conectando empresas, generando oportunidades y fortaleciendo la economía regional.
              </Text>
            </View>

            <View className="flex-row justify-between w-full mb-8">
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-white mb-1">200+</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresas</Text>
              </View>
              <View className="w-[1px] bg-white/20 h-10" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-white mb-1">1k+</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reuniones</Text>
              </View>
              <View className="w-[1px] bg-white/20 h-10" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-white mb-1">$5M+</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Negocios</Text>
              </View>
            </View>

            <Text className="text-xs text-center text-gray-400">
              © 2026 Rueda de Negocios del Beni.{'\n'}Todos los derechos reservados.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
