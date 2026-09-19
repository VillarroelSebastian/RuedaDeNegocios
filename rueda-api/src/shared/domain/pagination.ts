/** One page of rows, together with the window that produced it. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Pages start at one; a missing, negative or unreadable number lands there. */
export function clampPage(page?: number): number {
  return Math.max(1, Math.trunc(page ?? 1) || 1);
}

/**
 * Keeps the page size inside its bounds, so no single request can pull a whole
 * table. An unreadable or empty size falls back instead of failing the request.
 */
export function clampLimit(limit: number | undefined, fallback: number, max: number): number {
  return Math.min(max, Math.max(1, Math.trunc(limit ?? fallback) || fallback));
}
