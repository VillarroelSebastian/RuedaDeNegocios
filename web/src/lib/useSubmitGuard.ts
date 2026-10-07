import { useCallback, useRef, useState } from "react";

// Evita doble envío: un segundo clic/tap mientras `fn` sigue en curso no hace
// nada. Se usa un ref (síncrono) además del estado `pending` porque el estado
// de React no se actualiza al instante — un doble clic muy rápido podía
// ejecutar la función dos veces antes de que React re-renderizara con el
// botón deshabilitado, disparando la petición real por duplicado.
export function useSubmitGuard() {
  const bloqueadoRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (bloqueadoRef.current) return undefined;
    bloqueadoRef.current = true;
    setPending(true);
    try {
      return await fn();
    } finally {
      bloqueadoRef.current = false;
      setPending(false);
    }
  }, []);

  return { run, pending };
}
