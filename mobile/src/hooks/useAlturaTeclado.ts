import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Espacio que hay que dejar libre abajo para que el teclado no tape nada
// (0 si está oculto).
//
// Por qué no KeyboardAvoidingView: dentro de un <Modal> no recibe el
// redimensionado de la ventana en Android, y desde Android 16 —que impone
// edge-to-edge— tampoco es fiable en pantalla completa. Escuchar los eventos
// del teclado funciona en ambas plataformas y en cualquier contenedor.
export function useAlturaTeclado(): number {
  const [altura, setAltura] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // En iOS los eventos "will" llegan antes de la animación y el movimiento
    // acompaña al teclado; en Android solo existen los "did".
    const mostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const ocultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const alMostrar = Keyboard.addListener(mostrar, (e) => setAltura(e.endCoordinates?.height ?? 0));
    const alOcultar = Keyboard.addListener(ocultar, () => setAltura(0));

    return () => { alMostrar.remove(); alOcultar.remove(); };
  }, []);

  // Con edge-to-edge la altura informada llega hasta el borde de la pantalla e
  // incluye la franja de la barra de navegación. Esa franja ya la reserva el
  // área segura, así que contarla otra vez dejaba un hueco de más y encogía la
  // interfaz más de la cuenta.
  if (altura <= 0) return 0;
  return Math.max(0, altura - insets.bottom);
}
