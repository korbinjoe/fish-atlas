import { describe, expect, it } from "vitest";
import {
  filterFish,
  fishSchema,
  latLonToXYZ,
  readSaved,
} from "../src/lib/model";
import data from "../content/species.json";
const fish = fishSchema.array().parse(data);
describe("geography and content", () => {
  it("projects the prime meridian, east longitude and north pole consistently", () => {
    expect(latLonToXYZ(0, 0)).toEqual([1, 0, -0]);
    expect(latLonToXYZ(90, 0)[2]).toBeCloseTo(-1);
    expect(latLonToXYZ(0, 90)[1]).toBeCloseTo(1);
    expect(latLonToXYZ(180, 0)[0]).toBeCloseTo(latLonToXYZ(-180, 0)[0]);
  });
  it("finds Chinese aliases and scientific names without changing region constraints", () => {
    expect(
      filterFish(fish, "Neon tetra", "", "", false, []).map((f) => f.id),
    ).toContain("paracheirodon-innesi");
    expect(
      filterFish(fish, "  BETTA SPLENDENS  ", "asia", "", false, []),
    ).toHaveLength(1);
    expect(filterFish(fish, "斗鱼", "amazon", "", false, [])).toHaveLength(0);
  });
  it("does not consider unknown length as small", () => {
    const missing = { ...fish[0], length: null };
    expect(filterFish([missing], "", "", "small", false, [])).toHaveLength(0);
  });
  it("intersects favorites with other filters", () => {
    expect(filterFish(fish, "", "", "", true, [fish[0].id])).toHaveLength(1);
    expect(filterFish(fish, "", "africa", "", true, [fish[0].id])).toHaveLength(
      0,
    );
  });
  it("survives malformed, unavailable and old local storage", () => {
    expect(readSaved({ getItem: () => "{oops" })).toEqual([]);
    expect(
      readSaved({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toEqual([]);
    expect(readSaved({ getItem: () => '{"version":0,"saved":["a"]}' })).toEqual(
      [],
    );
    expect(
      readSaved({ getItem: () => '{"version":1,"saved":["a",2]}' }),
    ).toEqual(["a"]);
  });
});
