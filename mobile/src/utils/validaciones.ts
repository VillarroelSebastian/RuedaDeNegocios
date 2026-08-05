// Validaciones compartidas para formularios que llena el usuario (registro,
// login, edición de perfil). Mismas reglas que en web
// (web/src/lib/validaciones.ts) para mantener paridad web/móvil.

// Límites de caracteres para campos de texto largo.
export const LIMITES = {
  descripcion: 1000,
  oferta: 500,
  demanda: 500,
  nombreEmpresa: 55,
} as const;

// Formato de correo electrónico (sin espacios, con dominio y TLD).
export const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function correoValido(v: string): boolean {
  return REGEX_CORREO.test((v || '').trim());
}

// Caracteres permitidos en el nombre de la empresa: letras (con acentos y ñ),
// dígitos, espacios y puntuación básica de razón social (. , & - ' ( )).
const REGEX_NOMBRE_PERMITIDO = /^[a-zA-ZÀ-ÿ0-9\s.,&\-'()]+$/;

// Valida el nombre de la empresa. Devuelve un mensaje de error o null si es válido.
export function validarNombreEmpresa(valor: string): string | null {
  const v = (valor || '').trim();
  if (!v) return 'El nombre de la empresa es obligatorio.';
  if (v.length < 3) return 'El nombre de la empresa debe tener al menos 3 caracteres.';
  if (v.length > LIMITES.nombreEmpresa) return `El nombre no debe superar los ${LIMITES.nombreEmpresa} caracteres.`;
  if (!REGEX_NOMBRE_PERMITIDO.test(v)) return 'El nombre solo puede contener letras, números y . , & - \' ( ).';
  const letras = (v.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (letras < 2) return 'El nombre debe incluir al menos 2 letras (no puede ser solo números).';
  return null;
}

// Colapsa espacios repetidos y recorta extremos (para nombres, cargos, etc.).
export function limpiarEspacios(v: string): string {
  return (v || '').replace(/\s+/g, ' ').trim();
}

// Elimina TODO espacio en blanco (para correo y contraseña en el login).
export function sinEspacios(v: string): string {
  return (v || '').replace(/\s+/g, '');
}
