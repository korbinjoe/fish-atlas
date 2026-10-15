import { expect, test, vi } from "vitest";
import { geoContains } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { ExploreSpecies } from "../src/lib/exploreProfiles";

const fixture = vi.hoisted(() => {
  const polygon = (west: number, south: number, east: number, north: number) => ({
    type: "Polygon" as const,
    coordinates: [[[west, south], [west, north], [east, north], [east, south], [west, south]]],
  });
  const locations = new Map([
    ["basin-a", { id: "basin-a", kind: "basin", center: [-5, 15], geometry: polygon(-10, 10, 0, 20) }],
    ["basin-b", { id: "basin-b", kind: "basin", center: [15, 15], geometry: polygon(10, 10, 20, 20) }],
    ["river-point", { id: "river-point", kind: "river", center: [23.125, -4.375], geometry: null }],
    ["2117", { id: "2117", kind: "basin", center: [90, 64], geometry: polygon(80, 50, 100, 66) }],
  ]);
  const distributions = {
    controlled: { rangeText: "Native to a restricted river reach.", links: [
      { locationId: "basin-a", displayCoordinates: [-8, 12],
        displayCoordinateSourceUrl: "https://museum.example/native-voucher",
        displayCoordinateNote: "The vouchered native spring creek." },
      { locationId: "basin-b" },
    ] },
    fallback: { rangeText: "Native to basin A.", links: [{ locationId: "basin-a" }] },
    point: { rangeText: "Native to the named point-only river.", links: [{ locationId: "river-point" }] },
    tench: { rangeText: "Native in the western Yenisei south of 60 degrees N.", links: [{ locationId: "2117" }] },
  };
  return { locations, distributions };
});

vi.mock("../src/lib/distribution", () => ({
  distributions: fixture.distributions,
  locationById: fixture.locations,
  fishLocations: (fish: { id: keyof typeof fixture.distributions }) => fixture.distributions[fish.id].links
    .map((link) => fixture.locations.get(link.locationId)).filter(Boolean),
}));

import { makeBasinPhotoPins } from "../src/lib/basinPins";

function fish(id: string, scientific = "Example nativefish"): ExploreSpecies {
  return { id, name: id, scientific, item: { id } } as unknown as ExploreSpecies;
}

test("selecting a basin uses the fish's sourced local anchor instead of its generic centre", () => {
  const [pin] = makeBasinPhotoPins([fish("controlled")], "basin-a");
  expect(pin.basinId).toBe("basin-a");
  expect(pin.coordinates).toEqual([-8, 12]);
  expect(pin.coordinates).not.toEqual(fixture.locations.get("basin-a")!.center);
});

test("a local anchor applies only to its own linked waterbody", () => {
  const [pin] = makeBasinPhotoPins([fish("controlled")], "basin-b");
  expect(pin.basinId).toBe("basin-b");
  expect(pin.coordinates).toEqual([15, 15]);
  expect(makeBasinPhotoPins([fish("controlled")], "river-point")).toEqual([]);
});

test("restricted anchors do not pollute the fallback shared by other fish in the same basin", () => {
  const selectedFish = [fish("controlled"), fish("fallback")];
  const pins = makeBasinPhotoPins(selectedFish, "basin-a");
  expect(pins.find((pin) => pin.fish.id === "controlled")!.coordinates).toEqual([-8, 12]);
  expect(pins.find((pin) => pin.fish.id === "fallback")!.coordinates).toEqual([-5, 15]);
  expect(makeBasinPhotoPins([...selectedFish].reverse(), "basin-a")).toEqual(pins);

  pins[0].coordinates[0] = 99;
  expect(makeBasinPhotoPins([fish("controlled")], "basin-a")[0].coordinates).toEqual([-8, 12]);
  expect(fixture.distributions.controlled.links[0].displayCoordinates).toEqual([-8, 12]);
});

test("without a local override, point-only sources keep their exact published coordinates", () => {
  const [pin] = makeBasinPhotoPins([fish("point")], "river-point");
  expect(pin.coordinates).toEqual([23.125, -4.375]);
  pin.coordinates[1] = 20;
  expect(makeBasinPhotoPins([fish("point")], "river-point")[0].coordinates).toEqual([23.125, -4.375]);
});

test("fallback polygon anchors still obey the existing tench latitude restriction", () => {
  const [pin] = makeBasinPhotoPins([fish("tench", "Tinca tinca")], "2117");
  expect(pin.coordinates[1]).toBeLessThan(60);
  expect(pin.coordinates).not.toEqual(fixture.locations.get("2117")!.center);
  const polygon = { type: "Feature", properties: {}, geometry: fixture.locations.get("2117")!.geometry } as GeoPermissibleObjects;
  expect(geoContains(polygon, pin.coordinates)).toBe(true);
  expect(makeBasinPhotoPins([fish("tench", "Tinca tinca")], "2117")[0].coordinates).toEqual(pin.coordinates);
});
