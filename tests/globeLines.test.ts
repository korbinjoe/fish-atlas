import { expect, test } from "vitest";
import { geographicLineSegments, waterwayIsMain } from "../src/lib/globeLines";

const line = (coordinates: number[][]) => ({ type: "LineString", coordinates });

test("river chords remain outside the globe and are never longer than 0.35 degrees", () => {
  const radius = 1.003;
  const positions = geographicLineSegments(line([[101, 12], [110, 40]]), radius);
  expect(positions.length).toBeGreaterThan(6 * 50);
  for (let index = 0; index < positions.length; index += 6) {
    const a = [...positions.slice(index, index + 3)], b = [...positions.slice(index + 3, index + 6)];
    expect(Math.hypot(...a)).toBeCloseTo(radius, 6);
    expect(Math.hypot(...b)).toBeCloseTo(radius, 6);
    const angle = Math.acos(Math.max(-1, Math.min(1, a.reduce((sum, value, axis) => sum + value * b[axis], 0) / (Math.hypot(...a) * Math.hypot(...b))))) * 180 / Math.PI;
    expect(angle).toBeLessThanOrEqual(.35001);
    expect(Math.hypot(...a.map((value, axis) => (value + b[axis]) / 2))).toBeGreaterThan(1);
  }
});

test("dateline paths use their short arc rather than an almost full circumference", () => {
  const positions = geographicLineSegments(line([[179, 0], [-179, 0]]));
  expect(positions.length / 6).toBe(6);
  for (let index = 0; index < positions.length; index += 3) {
    expect(positions[index]).toBeLessThan(-1);
    expect(Math.abs(positions[index + 2])).toBeLessThan(.018);
  }
});

test("polygons, islands and feature collections retain their separate rings", () => {
  const island = { type: "Polygon", coordinates: [[[1, 0], [1.1, 0], [1.1, .1], [1, 0]]] };
  const mainland = { type: "MultiPolygon", coordinates: [[[[100, 0], [100.1, 0], [100.1, .1], [100, 0]]]] };
  const positions = geographicLineSegments({ type: "FeatureCollection", features: [{ type: "Feature", geometry: island }, { type: "Feature", geometry: mainland }] });
  expect(positions.length / 6).toBe(6);
  for (let index = 0; index < positions.length; index += 6) {
    const start = positions.slice(index, index + 3), end = positions.slice(index + 3, index + 6);
    expect(Math.hypot(...start.map((value, axis) => value - end[axis]))).toBeLessThan(.004);
  }
});

test("invalid points break river paths, and degenerate and antipodal inputs stay finite", () => {
  expect(geographicLineSegments({ type: "LineString", coordinates: [[0, 0], [NaN, 0], [2, 0]] }).length).toBe(0);
  expect(geographicLineSegments(line([[0, 0], [0, 0]])).length).toBe(0);
  const antipodal = geographicLineSegments(line([[0, 0], [180, 0]]));
  expect([...antipodal].every(Number.isFinite)).toBe(true);
  expect(antipodal.length / 6).toBe(515);
  expect(() => geographicLineSegments(line([[0, 0], [1, 0]]), 1, 0)).toThrow(RangeError);
});

test("major rivers remain present by default; detail ranks are reserved for close views", () => {
  expect(waterwayIsMain({ properties: { scalerank: 4 } })).toBe(true);
  expect(waterwayIsMain({ properties: { scalerank: "5" } })).toBe(false);
  expect(waterwayIsMain({ properties: { SCALERANK: 2 } })).toBe(true);
  expect(waterwayIsMain({ properties: { name: "Unknown rank" } })).toBe(true);
  expect(waterwayIsMain({ properties: { scalerank: null } })).toBe(true);
});
