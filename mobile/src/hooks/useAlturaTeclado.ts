import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Altura real del teclado en pantalla, en píxeles (0 si está oculto).
//
// KeyboardAvoidingView no sirve dentro de un <Modal statusBarTranslucent> en
// Android: la ventana del modal no recibe el redimensionado de adjustResize,
// así que el teclado termina tapando los campos. Escuchar los eventos del
// teclado y reservar ese espacio a mano funciona en ambas plataformas.
export function useAlturaTeclado(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    // En iOS los eventos "will" llegan antes de la animación y el movimiento
    // acompaña al teclado; en Android solo existen los "did".
    const mostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const ocultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const alMostrar = Keyboard.addListener(mostrar, (e) => setAltura(e.endCoordinates?.height ?? 0));
    const alOcultar = Keyboard.addListener(ocultar, () => setAltura(0));

    return () => { alMostrar.remove(); alOcultar.remove(); };
  }, []);

  return altura;
}
