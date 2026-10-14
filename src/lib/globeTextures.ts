import * as THREE from "three";
import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { WaterLocation } from "./distribution";

export function globeTextureWidth(maximum: number, mobile: boolean) {
  // Canvas uploads can briefly require CPU, driver-copy and mipmap allocations.
  // Keep flat geographic fills within budget; vector coastlines/rivers carry
  // the detail at every zoom level, independent of this raster resolution.
  return Math.min(mobile ? 2048 : 4096, 2 ** Math.floor(Math.log2(Math.max(2, maximum))));
}

function canvasMap(width: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = width / 2;
  const context = canvas.getContext("2d")!;
  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, width / 4]);
  return { canvas, context, projection, path: geoPath(projection, context), scale: width / 2048 };
}

function textureFor(canvas: HTMLCanvasElement, anisotropy = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, anisotropy);
  return texture;
}

/** Stable high-resolution fill; coastlines and rivers are separate vector layers. */
export function createGlobeBaseTexture(land: GeoPermissibleObjects, places: WaterLocation[], width: number, anisotropy: number) {
  const { canvas, context: c, path, scale } = canvasMap(width);
  c.fillStyle = "#143f4d";
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.beginPath(); path(geoGraticule10());
  c.strokeStyle = "#346370"; c.lineWidth = .45 * scale; c.stroke();
  c.beginPath(); path(land);
  c.fillStyle = "#618a83"; c.fill();
  c.save();
  c.beginPath(); path(land); c.clip();
  // Draw the grain once through the complex coastline clip. Thousands of
  // individually clipped rectangles stall software-backed canvas renderers.
  const grain = document.createElement("canvas");
  grain.width = 512 * scale; grain.height = 256 * scale;
  const grainContext = grain.getContext("2d")!;
  for (let i = 0; i < 1625; i++) {
    grainContext.fillStyle = i % 3 ? "#3d706725" : "#9cbaa525";
    grainContext.fillRect(((i * 613.37) % 512) * scale, ((i * 237.17) % 256) * scale, .8 * scale, .8 * scale);
  }
  c.fillStyle = c.createPattern(grain, "repeat")!;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.beginPath(); path(geoGraticule10());
  c.strokeStyle = "#b5cbb522"; c.lineWidth = .45 * scale; c.stroke();
  c.restore();
  for (const place of places) {
    if (place.kind !== "lake" || !place.geometry) continue;
    c.beginPath(); path({ type: "Feature", properties: {}, geometry: place.geometry } as GeoPermissibleObjects);
    c.fillStyle = "#347d94"; c.fill();
  }
  // No default catchment or sea-label outlines. Hydrology is the map's main layer.
  return textureFor(canvas, anisotropy);
}

/** Hover fills are isolated so changing ownership never rebuilds the large base map. */
export function createWaterbodyHighlightTexture(place: WaterLocation | undefined) {
  if (!place) return null;
  const { canvas, context: c, projection, path } = canvasMap(2048);
  if (place.geometry) {
    c.beginPath(); path({ type: "Feature", properties: {}, geometry: place.geometry } as GeoPermissibleObjects);
    c.fillStyle = "#c0e9ae55"; c.fill();
  } else {
    const point = projection(place.center);
    if (point) {
      c.beginPath(); c.arc(point[0], point[1], 6, 0, Math.PI * 2);
      c.fillStyle = "#c7f4ca88"; c.fill();
      c.strokeStyle = "#edffdb"; c.lineWidth = 1.5; c.stroke();
    }
  }
  return textureFor(canvas);
}
