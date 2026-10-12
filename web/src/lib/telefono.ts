// Teléfonos con código de país. Se guardan como "+591 70000000": el código de
// país elegido en un selector + solo los dígitos del número (nunca letras ni
// símbolos). Mismos países y reglas en mobile/src/utils/telefono.ts.
export type PaisTel = { iso: string; nombre: string; dial: string };

export const PAISES_TEL: PaisTel[] = [
  { iso: "BO", nombre: "Bolivia", dial: "591" },
  { iso: "AR", nombre: "Argentina", dial: "54" },
  { iso: "BR", nombre: "Brasil", dial: "55" },
  { iso: "CL", nombre: "Chile", dial: "56" },
  { iso: "CO", nombre: "Colombia", dial: "57" },
  { iso: "EC", nombre: "Ecuador", dial: "593" },
  { iso: "PY", nombre: "Paraguay", dial: "595" },
  { iso: "PE", nombre: "Perú", dial: "51" },
  { iso: "UY", nombre: "Uruguay", dial: "598" },
  { iso: "VE", nombre: "Venezuela", dial: "58" },
  { iso: "MX", nombre: "México", dial: "52" },
  { iso: "US", nombre: "Estados Unidos / Canadá", dial: "1" },
  { iso: "ES", nombre: "España", dial: "34" },
  { iso: "PA", nombre: "Panamá", dial: "507" },
  { iso: "CR", nombre: "Costa Rica", dial: "506" },
  { iso: "GT", nombre: "Guatemala", dial: "502" },
  { iso: "SV", nombre: "El Salvador", dial: "503" },
  { iso: "HN", nombre: "Honduras", dial: "504" },
  { iso: "NI", nombre: "Nicaragua", dial: "505" },
  { iso: "CU", nombre: "Cuba", dial: "53" },
  { iso: "FR", nombre: "Francia", dial: "33" },
  { iso: "DE", nombre: "Alemania", dial: "49" },
  { iso: "IT", nombre: "Italia", dial: "39" },
  { iso: "GB", nombre: "Reino Unido", dial: "44" },
  { iso: "CN", nombre: "China", dial: "86" },
  { iso: "JP", nombre: "Japón", dial: "81" },
  { iso: "KR", nombre: "Corea del Sur", dial: "82" },
  { iso: "IN", nombre: "India", dial: "91" },
];

export const DIAL_BOLIVIA = "591";
export const MAX_DIGITOS_NUMERO = 12;

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Código de país a partir del nombre de un país (p. ej. el de la empresa en el registro).
export function dialDePais(nombrePais?: string | null): string {
  const n = sinTildes(String(nombrePais ?? ""));
  if (!n) return DIAL_BOLIVIA;
  const p = PAISES_TEL.find((x) => sinTildes(x.nombre).split(" / ").some((parte) => parte === n || n.includes(parte)));
  return p?.dial ?? DIAL_BOLIVIA;
}

export function soloDigitos(v: string): string {
  return String(v ?? "").replace(/\D/g, "");
}

// Separa un teléfono guardado en código de país + número. Sin "+" se asume el
// código por defecto (teléfonos antiguos guardados sin prefijo).
export function parsearTelefono(valor: string | null | undefined, dialDefecto = DIAL_BOLIVIA): { dial: string; numero: string } {
  const v = String(valor ?? "").trim();
  if (!v) return { dial: dialDefecto, numero: "" };
  if (!v.startsWith("+")) return { dial: dialDefecto, numero: soloDigitos(v) };
  const digitos = soloDigitos(v);
  const candidatos = [...new Set(PAISES_TEL.map((p) => p.dial))].sort((a, b) => b.length - a.length);
  const dial = candidatos.find((d) => digitos.startsWith(d));
  return dial ? { dial, numero: digitos.slice(dial.length) } : { dial: dialDefecto, numero: digitos };
}

// Texto que se guarda: vacío si todavía no hay número.
export function componerTelefono(dial: string, numero: string): string {
  const n = soloDigitos(numero).slice(0, MAX_DIGITOS_NUMERO);
  return n ? `+${dial} ${n}` : "";
}

export function validarTelefonoCompleto(valor: string, etiqueta = "El teléfono"): string | null {
  const { numero } = parsearTelefono(valor);
  if (!numero) return `${etiqueta} es obligatorio.`;
  if (numero.length < 6) return `${etiqueta} debe tener al menos 6 dígitos.`;
  return null;
}
