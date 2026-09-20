import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActividadesScreen from '../admin/ActividadesScreen';

// Acceso directo desde el dashboard del técnico (ver TecnicoDashboardScreen).
// Delega por completo en ActividadesScreen para que este atajo muestre
// exactamente lo mismo que la pestaña "En vivo" y la pantalla del admin:
// cronograma en vivo + crear/editar eventos del programa.
// Se navega aquí desde una ruta sin header nativo (TecnicoStack con
// headerShown:false), así que hay que reservar el espacio del status bar
// nosotros mismos; ActividadesScreen no lo hace porque normalmente ya
// vive dentro del SafeAreaView de TecnicoContenidoScreen.
export default function TecnicoEventosVivoScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ActividadesScreen mostrarCronograma />
    </SafeAreaView>
  );
}
