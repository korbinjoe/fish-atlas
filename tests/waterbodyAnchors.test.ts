import { expect, test } from "vitest";
import { geoContains } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "world-atlas/land-110m.json";
import rawFish from "../content/species.json";
import rawProfiles from "../content/photo-profiles.json";
import { fishSchema } from "../src/lib/model";
import { photoProfileSchema } from "../src/lib/photoProfiles";
import type { ExploreSpecies } from "../src/lib/exploreProfiles";
import { makeBasinPhotoPins } from "../src/lib/basinPins";
import { fishLocations, locationById, mappedSpeciesCount } from "../src/lib/distribution";

const fishes = fishSchema.array().parse(rawFish);
const profiles = photoProfileSchema.array().parse(rawProfiles);
const photoFish: ExploreSpecies[] = [
  ...fishes.flatMap((fish) => fish.photo ? [{ id: fish.id, name: fish.name,
    scientific: fish.scientific, region: fish.region, photo: fish.photo, item: fish }] : []),
  ...profiles.map((fish) => ({ id: fish.id, name: fish.name,
    scientific: fish.scientific, region: null, photo: fish.photo, item: fish })),
];

test("representative waterbodies and anchors stay fixed when fish are filtered or reordered", () => {
  const allPins = makeBasinPhotoPins(photoFish);
  expect(allPins).toHaveLength(mappedSpeciesCount);
  for (const pin of allPins) {
    const filteredPin = makeBasinPhotoPins([pin.fish])[0];
    expect(filteredPin.basinId).toBe(pin.basinId);
    expect(filteredPin.coordinates).toEqual(pin.coordinates);
    const linked = fishLocations(pin.fish.item);
    const specific = linked.filter((location) => !["sea-7", "sea-8", "sea-9"].includes(location.id));
    expect((specific.length ? specific : linked).map((location) => location.id)).toContain(pin.basinId);
  }
  expect(makeBasinPhotoPins([...photoFish].reverse())).toEqual(allPins);
});

test("Amazon photos share its verified display anchor rather than scattering throughout the basin", () => {
  const pins = makeBasinPhotoPins(photoFish, "3203");
  expect(pins.length).toBeGreaterThan(20);
  for (const pin of pins) expect(pin.coordinates).toEqual(locationById.get("3203")!.center);
});

test("lake subregion anchors preserve northern and southern endemic limits", () => {
  const tanganyika = makeBasinPhotoPins(photoFish, "lake-tanganyika");
  const brichardi = tanganyika.find((pin) => pin.fish.id === "neolamprologus-brichardi")!;
  const frontosa = tanganyika.find((pin) => pin.fish.id === "cyphotilapia-frontosa")!;
  const leleupi = tanganyika.find((pin) => pin.fish.id === "neolamprologus-leleupi")!;
  expect(brichardi.coordinates[1]).toBeGreaterThan(-6);
  expect(frontosa.coordinates).toEqual(brichardi.coordinates);
  expect(leleupi.coordinates[1]).toBeLessThan(-6);
  const malawi = makeBasinPhotoPins(photoFish, "lake-malawi");
  const caeruleus = malawi.find((pin) => pin.fish.id === "labidochromis-caeruleus")!;
  expect(caeruleus.coordinates[1]).toBeGreaterThan(-11.7);
  for (const pin of [...tanganyika, ...malawi]) {
    const location = locationById.get(pin.basinId)!;
    expect(geoContains({ type: "Feature", properties: {}, geometry: location.geometry } as GeoPermissibleObjects,
      pin.coordinates)).toBe(true);
    expect(makeBasinPhotoPins([pin.fish], pin.basinId)[0].coordinates).toEqual(pin.coordinates);
  }
});

test("published point anchors retain their exact coordinates and sea anchors remain offshore", () => {
  const topology = world as unknown as Topology<{ land: GeometryCollection }>;
  const land = feature(topology, topology.objects.land) as GeoPermissibleObjects;
  let publishedPoints = 0, marineAnchors = 0;
  for (const pin of makeBasinPhotoPins(photoFish)) {
    const location = locationById.get(pin.basinId)!;
    if (!location.geometry) {
      expect(pin.coordinates).toEqual(location.center);
      publishedPoints++;
    }
    if (location.kind === "sea") {
      expect(geoContains(land, pin.coordinates)).toBe(false);
      expect(pin.coordinates).toEqual(location.center);
      marineAnchors++;
    }
  }
  expect(publishedPoints).toBeGreaterThan(0);
  expect(marineAnchors).toBeGreaterThan(0);
});
