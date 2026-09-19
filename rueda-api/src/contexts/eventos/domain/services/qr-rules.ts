import type { QrRule } from '../ports/event.repository.port.js';

/**
 * QR payment rules come from a repeatable form, so partially filled rows are
 * normal. They are coerced to safe defaults rather than rejected.
 */
export function sanitizeQrRules(submitted: unknown): QrRule[] {
  if (!Array.isArray(submitted)) return [];

  return submitted.map((rule: Record<string, unknown>) => ({
    rangoDesde: Number(rule?.rangoDesde) || 1,
    rangoHasta: Number(rule?.rangoHasta) || 1,
    monto: Number(rule?.monto) || 0,
    urlQR: typeof rule?.urlQR === 'string' ? rule.urlQR : '',
  }));
}
