/**
 * Which free table a meeting should be placed on. Spreading meetings evenly
 * keeps every table in use instead of wearing out the first few, and the
 * tiebreak is random so two requests arriving together rarely pick the same one.
 */
export function pickBalancedTable(
  free: { id: number }[],
  usageByTable: Map<number, number>,
  tiebreak: (tableId: number) => number = () => Math.random(),
): number | null {
  if (free.length === 0) return null;

  const ranked = free
    .map((table) => ({
      id: table.id,
      uso: usageByTable.get(table.id) ?? 0,
      desempate: tiebreak(table.id),
    }))
    .sort((left, right) => left.uso - right.uso || left.desempate - right.desempate);

  return ranked[0].id;
}
