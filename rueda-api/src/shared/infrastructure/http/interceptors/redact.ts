export const MAX_AUDIT_DETAIL_LENGTH = 4000;

/** Field names never written to the audit trail, in both naming generations. */
const SECRET_FIELDS = new Set(
  [
    'password',
    'currentPassword',
    'newPassword',
    'contrasenia',
    'passwordActual',
    'passwordNueva',
    'nuevaContrasenia',
    'code',
    'codigo',
    'token',
  ].map((field) => field.toLowerCase()),
);

/** Serialises a request body for the audit trail, without its secrets. */
export function redactBody(body: Record<string, unknown> | undefined): string {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body ?? {})) {
    if (!SECRET_FIELDS.has(key.toLowerCase())) safe[key] = value;
  }

  try {
    return JSON.stringify(safe).slice(0, MAX_AUDIT_DETAIL_LENGTH);
  } catch {
    // A body that cannot be serialised is not worth failing the request over.
    return '{}';
  }
}
