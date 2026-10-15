import { geoContains, geoBounds, geoDistance } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { ExploreSpecies } from "./exploreProfiles";
import { distributions, fishLocations, locationById } from "./distribution";
import { assignRepresentativeLocations } from "./representativeLocations";
import type { WaterLocation } from "./distribution";
import world from "world-atlas/land-110m.json";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

export type BasinPhotoPin = { key: string; fish: ExploreSpecies; basinId: string; coordinates: [number, number] };
const land = feature(world as unknown as Topology<{ land: GeometryCollection }>,
  (world as unknown as Topology<{ land: GeometryCollection }>).objects.land) as GeoPermissibleObjects;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const representativeLocations = assignRepresentativeLocations(new Map(
  Object.entries(distributions).map(([id, distribution]) => {
    const linked = distribution.links.map((link) => link.locationId).filter((location) => locationById.has(location));
    const specific = linked.filter((location) => !["sea-7", "sea-8", "sea-9"].includes(location));
    return [id, specific.length ? specific : linked];
  }),
));
function inside(location: WaterLocation, point: [number, number]): boolean {
  return !!location.geometry && geoContains({ type: "Feature", properties: {}, geometry: location.geometry } as GeoPermissibleObjects, point)
    && (location.kind !== "sea" || !geoContains(land, point));
}
function latitudeBand(fish: ExploreSpecies, location: WaterLocation): [number, number] {
  const text = distributions[fish.id]?.rangeText.toLowerCase() ?? "";
  // Keep endemics on their sourced side of a lake when grouping display anchors.
  if (location.id === "lake-tanganyika") {
    if (text.includes("northern") && !text.includes("southern")) return [-6, 91];
    if (text.includes("southern") && !text.includes("northern")) return [-91, -6];
  }
  if (location.id === "lake-malawi" && text.includes("northwestern")) return [-11.7, 91];
  // FishBase confines native Asian tench to western Yenisei south of 60°N.
  // The catchment's generic centre is farther north than that supported range.
  if (fish.scientific === "Tinca tinca" && location.id === "2117") return [-91, 60];
  return [-91, 91];
}
const displayAnchors = new Map<string, [number, number]>();
function displayAnchor(fish: ExploreSpecies, location: WaterLocation): [number, number] {
  const sourced = distributions[fish.id]?.links.find((link) => link.locationId === location.id)?.displayCoordinates;
  if (sourced) return [sourced[0], sourced[1]];
  // A point-only source retains its published coordinates exactly. Polygon
  // links support waterbody membership, not individual observation positions.
  // Share a verified interior display anchor instead of inventing scattered
  // fish coordinates; Globe handles photo separation in screen space.
  if (!location.geometry) return [...location.center];
  const [minLat, maxLat] = latitudeBand(fish, location);
  const cacheKey = `${location.id}:${minLat}:${maxLat}`;
  const cached = displayAnchors.get(cacheKey);
  if (cached) return [...cached];
  const permitted = (point: [number, number]) => inside(location, point)
    && point[1] > minLat && point[1] < maxLat;
  let coordinates: [number, number] = [...location.center];
  if (!permitted(coordinates)) {
    const polygon = { type: "Feature", properties: {}, geometry: location.geometry } as GeoPermissibleObjects;
    const bounds = geoBounds(polygon);
    let lonSpan = bounds[1][0] - bounds[0][0];
    if (lonSpan < 0) lonSpan += 360;
    let nearestDistance = Infinity;
    // Search the complete deterministic candidate set and choose the nearest
    // allowed interior anchor. Its position does not depend on fish ordering.
    for (let n = 1; n <= 2400; n++) {
      const lon = bounds[0][0] + lonSpan * ((n * 0.61803398875) % 1);
      const lat = bounds[0][1] + (bounds[1][1] - bounds[0][1]) * ((n * 0.41421356237) % 1);
      const candidate: [number, number] = [lon > 180 ? lon - 360 : lon, lat];
      if (!permitted(candidate)) continue;
      const distance = geoDistance(location.center, candidate);
      if (distance < nearestDistance) { coordinates = candidate; nearestDistance = distance; }
    }
  }
  displayAnchors.set(cacheKey, coordinates);
  return [...coordinates];
}
export function makeBasinPhotoPins(fish: ExploreSpecies[], selectedLocation = ""): BasinPhotoPin[] {
  const pins: BasinPhotoPin[] = [];
  // One representative native waterbody per fish at overview level, assigned
  // from the complete snapshot to keep search/category filters geographically
  // stable. Selecting a waterbody shows every fish with a supported link there.
  for (const item of [...fish].sort((a,b) => a.id.localeCompare(b.id))) {
    const linked = fishLocations(item.item).filter((l) => !selectedLocation || l.id === selectedLocation);
    const location = selectedLocation ? linked[0] : linked.find((place) => place.id === representativeLocations.get(item.id));
    if (location) pins.push({ key: `${item.id}:${location.id}`, fish: item,
      basinId: location.id, coordinates: displayAnchor(item, location) });
  }
  return pins;
}
export { goldenAngle };
