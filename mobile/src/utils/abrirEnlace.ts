import { Linking } from 'react-native';

// Abre un enlace externo sin romper la app si el enlace es inválido o no hay
// una aplicación que lo maneje (navegador, correo, teléfono).
export function abrirEnlace(url?: string | null): void {
  const destino = String(url ?? '').trim();
  if (!destino) return;
  Linking.openURL(destino).catch(() => {});
}
