import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { geoArea, geoContains } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import rivers from "../content/enrichment/waterways.json";
import land from "../content/enrichment/globe-land.json";
import metadata from "../content/enrichment/globe-geography.json";

test("global river map includes major systems on all populated continents and their connections", () => {
  expect(rivers.features).toHaveLength(metadata.sources.rivers.outputFeatureCount);
  expect(rivers.features.length).toBeGreaterThan(1_000);
  const names = new Set(rivers.features.map((feature) => feature.properties.name));
  for (const name of ["Amazon", "Nile", "Congo", "Yangtze", "Mekong", "Ganges", "Brahmaputra", "Danube", "Mississippi", "Niger", "Zambezi", "Orinoco", "Rhine", "Volga", "Amur", "Murray"]) {
    expect(names.has(name), name).toBe(true);
    expect(rivers.features.some((feature) => feature.properties.name === name && feature.properties.main), name).toBe(true);
  }
  expect(rivers.features.some((feature) => feature.properties.featureClass === "Lake Centerline")).toBe(true);
  for (const feature of rivers.features) {
    expect(feature.properties.scalerank).toBeLessThanOrEqual(6);
    expect(feature.properties.main).toBe(feature.properties.scalerank <= 4);
    expect(["LineString", "MultiLineString"]).toContain(feature.geometry.type);
  }
});

test("detailed land uses correct spherical polygon orientation, with seas and continents distinct", () => {
  const globeLand = land as unknown as GeoPermissibleObjects;
  expect(land.features).toHaveLength(metadata.sources.land.outputFeatureCount);
  for (const point of [[2.35, 48.85], [-63, -5], [110, 30], [151, -33], [104, -2], [18, 0]]) {
    expect(geoContains(globeLand, point as [number, number]), point.toString()).toBe(true);
  }
  for (const point of [[-140, 0], [0, 0], [-30, 30], [85, -20]]) {
    expect(geoContains(globeLand, point as [number, number]), point.toString()).toBe(false);
  }
  // The entire collection is land (~29% of a sphere), not inverted oceans.
  expect(geoArea(globeLand) / (4 * Math.PI)).toBeGreaterThan(0.25);
  expect(geoArea(globeLand) / (4 * Math.PI)).toBeLessThan(0.35);
});

test("globe geometry remains bounded, finite and compact for vector rendering", () => {
  function coordinates(value: unknown): void {
    expect(Array.isArray(value)).toBe(true);
    const values = value as unknown[];
    if (typeof values[0] === "number") {
      const [longitude, latitude] = values as number[];
      expect(Number.isFinite(longitude) && Number.isFinite(latitude)).toBe(true);
      expect(Math.abs(longitude)).toBeLessThanOrEqual(180);
      expect(Math.abs(latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(longitude * 1e5 - Math.round(longitude * 1e5))).toBeLessThan(1e-7);
      expect(Math.abs(latitude * 1e5 - Math.round(latitude * 1e5))).toBeLessThan(1e-7);
    } else {
      for (const child of values) coordinates(child);
    }
  }
  for (const feature of [...rivers.features, ...land.features]) coordinates(feature.geometry.coordinates);
  const riverBytes = readFileSync(new URL("../content/enrichment/waterways.json", import.meta.url)).length;
  const landBytes = readFileSync(new URL("../content/enrichment/globe-land.json", import.meta.url)).length;
  expect(riverBytes).toBe(metadata.sources.rivers.runtimeBytes);
  expect(landBytes).toBe(metadata.sources.land.runtimeBytes);
  expect(riverBytes + landBytes).toBeLessThanOrEqual(3_000_000);
  expect(metadata.sources.rivers.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(metadata.sources.land.sha256).toMatch(/^[a-f0-9]{64}$/);
});
