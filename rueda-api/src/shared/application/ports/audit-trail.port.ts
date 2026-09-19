export interface AuditEntry {
  userId: number | null;
  role: string;
  action: string;
  route: string;
  method: string;
  ip: string;
  /** Redacted request body, already serialised and truncated. */
  details: string;
}

/** Records who changed what. Writes must never block or fail the request. */
export interface AuditTrailPort {
  record(entry: AuditEntry): Promise<void>;
}

export const AUDIT_TRAIL_PORT = Symbol('AuditTrailPort');
