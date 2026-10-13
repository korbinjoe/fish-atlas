import { expect, test } from "vitest";
import rawFish from "../content/species.json";
import rawProfiles from "../content/photo-profiles.json";
import { basinById, basins, findBasinAt } from "../src/lib/basins";
import { basinSpeciesCount, fishBasinIds } from "../src/lib/basinSpecies";
import { fishSchema } from "../src/lib/model";
import { photoProfileSchema } from "../src/lib/photoProfiles";
import { distributions, fishLocationIds, locationById, mappedSpeciesCount, findWaterbodyAt } from "../src/lib/distribution";
import { makeBasinPhotoPins } from "../src/lib/basinPins";
import { geoContains } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { ExploreSpecies } from "../src/lib/exploreProfiles";

const fishes = fishSchema.array().parse(rawFish);
const profiles = photoProfileSchema.array().parse(rawProfiles);

test("the official global basin snapshot is complete and independently locatable", () => {
  expect(basins).toHaveLength(520);
  expect(new Set(basins.map((basin) => basin.id)).size).toBe(520);
  expect(new Set(basins.map((basin) => basin.continent)).size).toBe(6);
  for (const basin of basins) {
    expect(basin.areaKm2).toBeGreaterThan(0);
    expect(findBasinAt(...basin.center)?.id).toBe(basin.id);
  }
  expect(findBasinAt(-63, -5)?.id).toBe("3203"); // Amazon
  expect(findBasinAt(-90, 35)?.id).toBe("4219"); // Mississippi
  expect(findBasinAt(20, 45)?.id).toBe("6202"); // Danube
  expect(findBasinAt(110, 30)?.id).toBe("2433"); // Yangtze
  expect(findBasinAt(144, -35)?.id).toBe("5309"); // Murray
});

test("fish links only reference existing freshwater basins and sourced profiles", () => {
  const allFish = [...fishes, ...profiles];
  for (const fish of allFish) {
    for (const id of fishBasinIds(fish)) {
      expect(basinById.has(id)).toBe(true);
      expect(fish.water).toBe("freshwater");
      expect(distributions[fish.id].rangeText.length).toBeGreaterThan(0);
    }
  }
  expect(basinSpeciesCount.get("3203")).toBeGreaterThan(20);
  expect(basinSpeciesCount.get("2433")).toBe(2);
});

test("every displayed fish photo point is inside its own sourced basin", () => {
  const photoFish: ExploreSpecies[] = [
    ...fishes.flatMap((fish) => fish.photo ? [{ id: fish.id, name: fish.name, scientific: fish.scientific, region: fish.region, photo: fish.photo, item: fish }] : []),
    ...profiles.map((fish) => ({ id: fish.id, name: fish.name, scientific: fish.scientific, region: null, photo: fish.photo, item: fish })),
  ];
  const pins = makeBasinPhotoPins(photoFish);
  expect(pins).toHaveLength(mappedSpeciesCount);
  expect(new Set(pins.map((pin) => pin.fish.id)).size).toBe(mappedSpeciesCount);
  for (const pin of pins) {
    const basin = locationById.get(pin.basinId)!;
    expect(fishLocationIds(pin.fish.item)).toContain(pin.basinId);
    if (basin.geometry) expect(geoContains({ type: "Feature", properties: {}, geometry: basin.geometry } as GeoPermissibleObjects, pin.coordinates)).toBe(true);
  }
  expect(makeBasinPhotoPins(photoFish, "3203")).toHaveLength(basinSpeciesCount.get("3203")!);
  expect(makeBasinPhotoPins(photoFish, "2433")).toHaveLength(2);
});


test("every distribution has sources and narrow endemic or introduced ranges stay honest", () => {
  expect(Object.keys(distributions)).toHaveLength(183);
  expect(mappedSpeciesCount).toBe(183);
  for (const fish of [...fishes,...profiles]) {
    const d=distributions[fish.id]; expect(d.scientific).toBe(fish.scientific);
    expect(d.rangeText.length).toBeGreaterThan(0);
    for (const link of d.links) { expect(locationById.has(link.locationId)).toBe(true); expect(link.sourceUrl).toMatch(/^https:/); expect(link.evidence.length).toBeGreaterThan(0); }
  }
  expect(fishLocationIds({id:"wm-danio-erythromicron"})).toEqual(["lake-inle"]);
  expect(fishLocationIds({id:"pterapogon-kauderni"})).toEqual(["sea-banggai"]);
  expect(fishLocationIds({id:"wm-anampses-cuvier"})).toEqual(["sea-166"]);
  expect(fishLocationIds({id:"wm-pseudochromis-fridmani"}).sort()).toEqual(["sea-5","sea-525"].sort());
  expect(fishLocationIds({id:"wm-carassius-auratus"})).not.toContain("2401");
  expect(fishLocationIds({id:"wm-cobitis-bilineata"})).not.toContain("6242");
  expect(fishLocationIds({id:"wm-acantopsis-dialuzona"})).toContain("5415");
  expect(fishLocationIds({id:"wm-acantopsis-dialuzona"})).not.toContain("2421"); // Old broad species records in Mekong
  expect(fishLocationIds({id:"wm-hemigrammus-erythrozonus"})).toEqual(["3219"]);
});

test("new native localities retain taxonomy limits, inland habitat and published anchors", () => {
  expect(fishLocationIds({id:"trigonostigma-heteromorpha"}).sort()).toEqual(["river-nee-soon","5419"].sort());
  expect(fishLocationIds({id:"trigonostigma-heteromorpha"})).not.toContain("2322"); // India's Tapi is not Thailand's Tapi
  expect(fishLocationIds({id:"pangio-kuhlii"})).toEqual(["river-klawing"]);
  expect(distributions["pangio-kuhlii"].reviewConfidence).toBe("medium");
  expect(distributions["pangio-kuhlii"].reviewNotes?.join(" ")).toContain("形态鉴定");
  expect(fishLocationIds({id:"wm-macrotocinclus-affinis"})).toEqual(["3242"]); // Specimen-backed Ribeira, not trade-name Amazon records
  expect(fishLocationIds({id:"wm-xiphophorus-hellerii"})).not.toContain("river-balsas");
  const inland = ["wm-garra-flavatra","wm-macropodus-hongkongensis","wm-pseudomugil-furcatus","wm-aphyosemion-australe"];
  for (const id of inland) {
    expect(fishLocationIds({id}).length).toBeGreaterThan(0);
    expect(fishLocationIds({id}).every((place) => locationById.get(place)?.kind !== "sea")).toBe(true);
    expect(distributions[id].unlocatedReason).toBe("");
  }
  const garra = locationById.get("river-kananmae-chaung")!;
  expect(garra.center).toEqual([94.37916,18.59416]); // NRM holotype; excludes the 8-degree transcription error
  expect(garra.geometry).toBe(null);
  const photoFish = profiles.filter((fish) => inland.includes(fish.id)).map((fish) => ({id:fish.id,name:fish.name,scientific:fish.scientific,region:null,photo:fish.photo,item:fish}));
  for (const location of ["river-kananmae-chaung","river-sha-lo-tung","river-kwagira","river-yombo-congo"]) {
    const pins=makeBasinPhotoPins(photoFish,location);
    expect(pins).toHaveLength(1);
    expect(pins[0].coordinates).toEqual(locationById.get(location)!.center); // No geographic jitter of point-only sources
  }
});


test("lakes are independent of outlet catchments and marine hit areas do not cover land", () => {
  expect(findWaterbodyAt(29.6,-5)?.id).toBe("lake-tanganyika");
  expect(findWaterbodyAt(38,20)?.kind).toBe("sea");
  expect(findWaterbodyAt(104.6,-2.5)).toBe(null); // Sumatra land, not the rough marine label polygon
});
