import raw from "../../content/distributions.json";
import waterbodies from "../../content/waterbodies.json";
import { basins } from "./basins";
import type { Basin } from "./basins";
import { geoContains } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";

import world from "world-atlas/land-110m.json";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
const land = feature(world as unknown as Topology<{land: GeometryCollection}>,
  (world as unknown as Topology<{land: GeometryCollection}>).objects.land) as GeoPermissibleObjects;

export type WaterLocation = {
  id: string; name: string; label: string; kind: "basin" | "river" | "lake" | "sea";
  center: [number, number]; geometry: Basin["geometry"] | null;
  sourceUrl: string; coordinateMethod: string; anchorNote?: string;
};
export type DistributionLink = { locationId: string; evidence: string; sourceUrl: string; ecosystemCode: number | null; additionalSourceUrls?: string[] };
export type Distribution = { scientific: string; acceptedScientific: string; sourceUrl: string; snapshot: string; rangeText: string; rangeRef: number | null; links: DistributionLink[]; unlocatedReason: string; reviewNotes?: string[]; reviewConfidence?: "high" | "medium" };
export const distributions = raw.species as Record<string, Distribution>;
export const locationKindNames = { basin: "流域", river: "河流水系", lake: "湖泊／潟湖", sea: "海域" };
export const locations: WaterLocation[] = [
  ...basins.map((b) => ({ ...b, kind: "basin" as const, sourceUrl: "https://mrb.grdc.bafg.de/", coordinateMethod: "polygon-interior" })),
  ...waterbodies as WaterLocation[],
];
export const locationById = new Map(locations.map((l) => [l.id, l]));
export function fishLocationIds(fish: { id: string }): string[] { return distributions[fish.id]?.links.map((l) => l.locationId) ?? []; }
export function fishLocations(fish: { id: string }): WaterLocation[] { return fishLocationIds(fish).map((id) => locationById.get(id)!).filter(Boolean); }
export const locationSpeciesCount = Object.values(distributions).reduce((counts, s) => {
  s.links.forEach((l) => counts.set(l.locationId, (counts.get(l.locationId) ?? 0) + 1)); return counts;
}, new Map<string, number>());
export const mappedSpeciesCount = Object.values(distributions).filter((s) => s.links.length).length;
export function findWaterbodyAt(lon: number, lat: number): WaterLocation | null {
  // Lakes have priority over their encompassing outlet basin; seas never get
  // interpreted as a nearby catchment. Point-only anchors have no fake boundary.
  return locations.filter((l) => l.kind === "lake" || (l.kind === "sea" && !geoContains(land, [lon,lat])))
    .find((l) => l.geometry && geoContains({ type: "Feature", properties: {}, geometry: l.geometry } as GeoPermissibleObjects, [lon, lat])) ?? null;
}
