import { expect, it } from "vitest";
import {
  assessFish,
  assessPairs,
  emptyTank,
  parsePlan,
  recommendedStockCount,
  tankSchema,
} from "../src/lib/planner";
import { fishSchema } from "../src/lib/model";
import { applyTankPreset, applyTankScenario, estimatedEffectiveLiters, grossLiters, tankPresets, tankScenarios } from "../src/lib/tankPresets";
import raw from "../content/species.json";
const fishes = fishSchema.array().parse(raw);
const by = (id: string) => fishes.find((f) => f.id === id)!;
it("tank presets fill dimensions and a provisional volume without inventing water conditions", () => {
  const freshwater = tankPresets.find((preset) => preset.id === "fresh-60")!;
  expect(grossLiters(freshwater)).toBe(64.8);
  expect(estimatedEffectiveLiters(freshwater)).toBe(52);
  const values = Object.fromEntries(Object.entries(emptyTank).map(([key, value]) => [key, value === null ? "" : String(value)]));
  const applied = applyTankPreset(values, freshwater);
  expect([applied.length, applied.width, applied.height, applied.volume]).toEqual(["60", "30", "36", "52"]);
  expect([applied.temperature, applied.ph, applied.hardness, applied.specificGravity]).toEqual(["", "", "", ""]);
  expect(tankSchema.safeParse(Object.fromEntries(Object.entries(applied).map(([key, value]) => [key, key === "water" ? value : value === "" ? null : Number(value)]))).success).toBe(true);
});
it("beginner scenarios give complete planning assumptions for distinct water types", () => {
  const values = Object.fromEntries(Object.entries(emptyTank).map(([key, value]) => [key, value === null ? "" : String(value)]));
  const community = applyTankScenario(values, tankScenarios.find((item) => item.id === "community")!);
  expect([community.length, community.temperature, community.ph, community.hardness, community.specificGravity]).toEqual(["60", "25", "7", "6", ""]);
  const marine = applyTankScenario(community, tankScenarios.find((item) => item.id === "marine")!);
  expect([marine.water, marine.length, marine.ph, marine.hardness, marine.specificGravity]).toEqual(["marine", "90", "8.2", "", "1.025"]);
});
it("unknown values never become successful checks or zero water parameters", () => {
  const issues = assessFish(by("paracheirodon-innesi"), emptyTank, 10);
  expect(
    issues.some((x) => x.code === "temperature" && x.level === "unknown"),
  ).toBe(true);
  expect(issues.some((x) => x.code === "length" && x.level === "unknown")).toBe(
    true,
  );
  expect(tankSchema.safeParse({ ...emptyTank, ph: 15 }).success).toBe(false);
  expect(tankSchema.safeParse({ ...emptyTank, length: 0 }).success).toBe(false);
});
it("tank length and width are independent and missing discus data stays unknown", () => {
  const f = by("pterophyllum-scalare");
  const issues = assessFish(f, {
    ...emptyTank,
    length: 200,
    width: 20,
    height: 30,
    temperature: 26,
    ph: 6.5,
    hardness: 5,
  });
  expect(
    issues.filter((x) => x.level === "conflict").map((x) => x.code),
  ).toEqual(["width", "height"]);
  expect(
    assessFish(by("symphysodon-aequifasciatus"), emptyTank).filter(
      (x) => x.code === "temperature",
    )[0].level,
  ).toBe("unknown");
});
it("marine volume does not substitute for length and SG is distinct from hardness", () => {
  const issues = assessFish(by("paracanthurus-hepatus"), {
    ...emptyTank,
    water: "marine",
    length: 200,
    volume: 100,
    specificGravity: 1.01,
    hardness: 10,
  });
  expect(
    issues.some((x) => x.code === "volume" && x.level === "conflict"),
  ).toBe(true);
  expect(
    issues.some((x) => x.code === "specificGravity" && x.level === "conflict"),
  ).toBe(true);
  expect(issues.some((x) => x.code === "hardness")).toBe(false);
});
it("quantity rules flag group deficits and multiple solitary fish", () => {
  expect(recommendedStockCount(by("paracheirodon-innesi"))).toBe(8);
  expect(recommendedStockCount(by("trigonostigma-espei"))).toBe(8);
  expect(recommendedStockCount(by("pangio-kuhlii"))).toBe(5);
  expect(recommendedStockCount(by("betta-splendens"))).toBe(1);
  expect(recommendedStockCount(by("pterophyllum-scalare"))).toBe(1);
  expect(
    assessFish(by("hemigrammus-bleheri"), emptyTank, 2).some(
      (x) => x.code === "group",
    ),
  ).toBe(true);
  expect(
    assessFish(by("hemigrammus-bleheri"), emptyTank, 10).some(
      (x) => x.code === "group",
    ),
  ).toBe(false);
  expect(
    assessFish(by("betta-splendens"), emptyTank, 2).some(
      (x) => x.code === "solitary" && x.level === "conflict",
    ),
  ).toBe(true);
});
it("pair findings are symmetric and never produce a safe verdict", () => {
  const stocks = [
    { id: "hyphessobrycon-eques", count: 12 },
    { id: "betta-splendens", count: 1 },
  ];
  expect(
    assessPairs(stocks, fishes).some((x) => x.code.endsWith(":fins")),
  ).toBe(true);
  expect(
    assessPairs([...stocks].reverse(), fishes).some((x) =>
      x.code.endsWith(":fins"),
    ),
  ).toBe(true);
  expect(
    assessPairs(stocks, fishes).some((x) => x.code.endsWith(":coverage")),
  ).toBe(true);
});
it("predation and mixed water types trigger explained conflicts", () => {
  expect(
    assessPairs(
      [
        { id: "pterophyllum-scalare", count: 1 },
        { id: "paracheirodon-innesi", count: 10 },
      ],
      fishes,
    ).some((x) => x.code.endsWith(":predation")),
  ).toBe(true);
  expect(
    assessPairs(
      [
        { id: "amphiprion-ocellaris", count: 1 },
        { id: "paracheirodon-innesi", count: 10 },
      ],
      fishes,
    )[0].code.endsWith(":water"),
  ).toBe(true);
});
it("rejects malformed, duplicate, unknown, out of range and excessive saved plans", () => {
  const plan = {
    version: 1,
    tank: emptyTank,
    stock: [{ id: fishes[0].id, count: 10 }],
  };
  expect(parsePlan(plan, fishes)).not.toBeNull();
  for (const stock of [
    [{ id: "bad", count: 1 }],
    [{ id: fishes[0].id, count: 0 }],
    [...plan.stock, ...plan.stock],
    Array(7).fill(plan.stock[0]),
  ])
    expect(parsePlan({ ...plan, stock }, fishes)).toBeNull();
  expect(
    parsePlan(
      { ...plan, tank: { ...emptyTank, temperature: Infinity } },
      fishes,
    ),
  ).toBeNull();
});
