// Bandera emoji + nombre para identificar mejor el país en tarjetas de empresa.
const BANDERAS: Record<string, string> = {
  "Bolivia": "🇧🇴",
  "Argentina": "🇦🇷",
  "Brasil": "🇧🇷",
  "Chile": "🇨🇱",
  "Colombia": "🇨🇴",
  "Ecuador": "🇪🇨",
  "Paraguay": "🇵🇾",
  "Perú": "🇵🇪",
  "Uruguay": "🇺🇾",
  "Venezuela": "🇻🇪",
};

export function paisConBandera(nombre?: string | null): string {
  if (!nombre) return "";
  const bandera = BANDERAS[nombre];
  return bandera ? `${bandera} ${nombre}` : nombre;
}
