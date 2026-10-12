"use client";

import React, { useMemo } from "react";
import { PAISES_TEL, DIAL_BOLIVIA, componerTelefono, parsearTelefono, soloDigitos, MAX_DIGITOS_NUMERO } from "@/lib/telefono";

// Teléfono con selector de código de país (Bolivia por defecto). Solo acepta
// dígitos en el número y entrega el valor como "+591 70000000".
export default function TelefonoInput({ value, onChange, dialDefecto = DIAL_BOLIVIA, className = "", disabled = false, required = false, id, placeholder = "70000000" }: {
  value: string; onChange: (v: string) => void; dialDefecto?: string; className?: string; disabled?: boolean; required?: boolean; id?: string; placeholder?: string;
}) {
  const { dial, numero } = useMemo(() => parsearTelefono(value, dialDefecto), [value, dialDefecto]);
  // Mientras no hay número se respeta el código elegido aunque el valor sea "".
  const [dialLocal, setDialLocal] = React.useState(dial);
  React.useEffect(() => { if (value) setDialLocal(dial); }, [value, dial]);
  React.useEffect(() => { if (!value) setDialLocal(dialDefecto); }, [dialDefecto]); // eslint-disable-line react-hooks/exhaustive-deps
  const dialActual = value ? dial : dialLocal;

  return (
    <div className="flex gap-2">
      <select
        aria-label="Código de país" disabled={disabled} value={dialActual}
        onChange={(e) => { setDialLocal(e.target.value); onChange(componerTelefono(e.target.value, numero)); }}
        className={`${className} !w-auto shrink-0 max-w-[9.5rem] bg-white`}
      >
        {PAISES_TEL.map((p) => <option key={p.iso} value={p.dial}>{p.iso} +{p.dial}</option>)}
      </select>
      <input
        id={id} type="tel" inputMode="numeric" autoComplete="tel-national" disabled={disabled} required={required}
        value={numero} maxLength={MAX_DIGITOS_NUMERO} placeholder={placeholder}
        onChange={(e) => onChange(componerTelefono(dialActual, soloDigitos(e.target.value)))}
        className={`${className} min-w-0 flex-1`}
      />
    </div>
  );
}
