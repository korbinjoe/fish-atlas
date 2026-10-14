import { expect, test } from "vitest";
import { assignRepresentativeLocations } from "../src/lib/representativeLocations";

test("shared widespread species do not leave supported regional waterbodies empty", () => {
  const links = new Map([
    ["wide-a", ["rhine", "danube", "volga"]],
    ["wide-b", ["rhine", "danube"]],
    ["endemic", ["rhine"]],
    ["wide-c", ["rhine", "danube", "volga"]],
    ["unlocated", []],
  ]);
  const assignments = assignRepresentativeLocations(links);
  expect(new Set(assignments.values())).toEqual(new Set(["rhine", "danube", "volga"]));
  expect(assignments.get("endemic")).toBe("rhine");
  expect(assignments.has("unlocated")).toBe(false);
  for (const [id, location] of assignments) expect(links.get(id)).toContain(location);
  expect(assignRepresentativeLocations(new Map([...links].reverse()))).toEqual(assignments);
});

test("augmenting a matching preserves narrow habitats when source order overlaps", () => {
  const assignments = assignRepresentativeLocations(new Map([
    ["ab", ["a", "b"]], ["bc", ["b", "c"]], ["a-only", ["a"]],
  ]));
  expect(assignments.get("a-only")).toBe("a");
  expect(new Set(assignments.values()).size).toBe(3);
});
