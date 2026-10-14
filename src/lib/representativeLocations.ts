/** Assign one stable, sourced overview location to each fish.
 *
 * First cover as many supported waterbodies as possible with a bipartite
 * matching, then balance the remaining fish. Call this with the full snapshot,
 * never the current search results, so filtering cannot move a fish abroad.
 */
export function assignRepresentativeLocations(candidates: ReadonlyMap<string, readonly string[]>): Map<string, string> {
  const byLocation = new Map<string, string[]>();
  const ids = [...candidates.keys()].sort();
  for (const id of ids) for (const location of new Set(candidates.get(id))) {
    const fish = byLocation.get(location) ?? [];
    fish.push(id);
    byLocation.set(location, fish);
  }
  const locationOrder = [...byLocation.keys()].sort((a, b) =>
    byLocation.get(a)!.length - byLocation.get(b)!.length || a.localeCompare(b, "en"));
  for (const fish of byLocation.values()) fish.sort((a, b) =>
    candidates.get(a)!.length - candidates.get(b)!.length || a.localeCompare(b, "en"));
  const assigned = new Map<string, string>();
  function cover(location: string, visited: Set<string>): boolean {
    for (const id of byLocation.get(location) ?? []) {
      if (visited.has(id)) continue;
      visited.add(id);
      const previous = assigned.get(id);
      if (previous === undefined || cover(previous, visited)) {
        assigned.set(id, location);
        return true;
      }
    }
    return false;
  }
  for (const location of locationOrder) cover(location, new Set());
  const counts = new Map<string, number>();
  for (const location of assigned.values()) counts.set(location, (counts.get(location) ?? 0) + 1);
  for (const id of ids) {
    if (assigned.has(id)) continue;
    const locations = candidates.get(id) ?? [];
    // Retain source order as the tie-breaker after balancing.
    const location = [...locations].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0];
    if (location !== undefined) {
      assigned.set(id, location);
      counts.set(location, (counts.get(location) ?? 0) + 1);
    }
  }
  return assigned;
}
