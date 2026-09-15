import React from 'react';
import ActividadesScreen from '../admin/ActividadesScreen';

// Acceso directo desde el dashboard del técnico (ver TecnicoDashboardScreen).
// Delega por completo en ActividadesScreen para que este atajo muestre
// exactamente lo mismo que la pestaña "En vivo" y la pantalla del admin:
// cronograma en vivo + crear/editar eventos del programa.
export default function TecnicoEventosVivoScreen() {
  return <ActividadesScreen mostrarCronograma />;
}
