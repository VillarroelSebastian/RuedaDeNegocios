// El selector de fotos del sistema (Android Photo Picker / iOS PHPicker) no
// necesita permiso de acceso a la galería: el usuario elige explícitamente las
// imágenes. Pedir READ_MEDIA_* de más obliga a justificarlo ante Google Play.
export async function permisoGaleria(): Promise<{ granted: boolean }> {
  return { granted: true };
}
