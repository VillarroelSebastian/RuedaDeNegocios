// A qué subopción de Reuniones lleva cada notificación de una empresa, para
// abrir exactamente donde está la reunión o la solicitud. La misma tabla vive en
// backend/src/notificaciones/destino-notificacion.ts y mobile/src/utils/destinoNotificacion.ts.
export type FiltroReuniones = "todas" | "pendientes" | "enviadas" | "proximas" | "cambios" | "finalizadas";

export function destinoReuniones(tipo: string, referenciaId?: number | null, referenciaTipo?: string | null): { filtro: FiltroReuniones; reunionId?: number } | null {
  const t = tipo || "";
  const id = Number(referenciaId);
  const reunionId = referenciaTipo === "reunion" && Number.isFinite(id) && id > 0 ? id : undefined;
  if (t.startsWith("reunion:cambio")) return { filtro: "cambios", reunionId };
  // Solicitudes recibidas que esperan respuesta.
  if (["solicitud:nueva", "solicitud:editada", "solicitud:cancelada", "solicitud:mesa-no-disponible"].includes(t)) return { filtro: "pendientes" };
  // La solicitud enviada fue rechazada: ya no está pendiente; se revisa entre las enviadas.
  if (t === "solicitud:rechazada") return { filtro: "enviadas" };
  // Aceptada: ya es una reunión confirmada, en Próximas.
  if (t === "solicitud:aceptada") return { filtro: "proximas", reunionId };
  if (["reunion:agendada", "reunion:recordatorio", "reunion:iniciada", "reunion:inicio-solicitado", "reunion:enlace-actualizado", "reunion:reprogramada"].includes(t))
    return { filtro: "proximas", reunionId };
  if (t === "reunion:cancelada") return { filtro: "todas" };
  if (t.startsWith("reunion") || t.startsWith("solicitud")) return { filtro: "todas", reunionId };
  return null;
}

export function enlaceReuniones(tipo: string, referenciaId?: number | null, referenciaTipo?: string | null): string | null {
  const d = destinoReuniones(tipo, referenciaId, referenciaTipo);
  if (!d) return null;
  const q = new URLSearchParams({ tab: "reuniones", filtro: d.filtro });
  if (d.reunionId) q.set("reunionId", String(d.reunionId));
  return `/empresa/solicitudes?${q.toString()}`;
}
