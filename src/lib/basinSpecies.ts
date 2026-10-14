import { distributions, fishLocationIds, locationById, locationSpeciesCount } from "./distribution";
// Compatibility helpers for basin-specific counts; sea and lake links have
// their own IDs and are never promoted to a wider outlet drainage.
export function fishBasinIds(fish: { id: string }): string[] {
  return fishLocationIds(fish).filter((id) => locationById.get(id)?.kind === "basin");
}
export const basinSpeciesCount = new Map([...locationSpeciesCount].filter(([id]) => locationById.get(id)?.kind === "basin"));
export { distributions };
