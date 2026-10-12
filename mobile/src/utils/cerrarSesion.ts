import { userStore } from './userStore';
import { navigationRef } from '../../App';

// Cierra la sesión y vuelve al Login desde cualquier pantalla. Se usa el
// navegador raíz (no el de la pestaña actual) para que funcione igual desde
// los menús anidados de cada rol.
export async function cerrarSesion(): Promise<void> {
  await userStore.clear();
  if (navigationRef.isReady()) navigationRef.reset({ index: 0, routes: [{ name: 'Login' as never }] });
}
