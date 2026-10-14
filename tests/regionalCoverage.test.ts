import { expect, test } from "vitest";
import { fishLocationIds, locationById, locationSpeciesCount, distributions } from "../src/lib/distribution";

test("regional imports retain fish in previously empty major waterbodies", () => {
  for (const id of ["4219", "4238", "6242", "6202", "6903", "2434", "2437", "2401"]) {
    expect(locationSpeciesCount.get(id), `Native fish missing from ${locationById.get(id)?.name}`).toBeGreaterThan(0);
  }
  for (const id of ["lake-superior", "lake-michigan", "lake-huron", "lake-erie", "lake-ontario"]) {
    expect(locationById.get(id)?.kind).toBe("lake");
    expect(locationSpeciesCount.get(id)).toBeGreaterThan(0);
  }
});

test("reviewed source conflicts cannot reintroduce false native ranges", () => {
  expect(fishLocationIds({ id: "wm-chromis-viridis" })).not.toContain("sea-13");
  expect(fishLocationIds({ id: "wm-gila-atraria" })).toContain("4901");
  expect(fishLocationIds({ id: "wm-gila-atraria" })).not.toContain("4405");
  for (const fish of ["wm-lepomis-macrochirus", "wm-oncorhynchus-mykiss"]) {
    expect(distributions[fish]).toBeDefined();
    expect(fishLocationIds({ id: fish })).not.toContain("6202"); // Introduced to the Danube, not native.
    expect(fishLocationIds({ id: fish })).not.toContain("2433"); // Introduced to China.
  }
});
