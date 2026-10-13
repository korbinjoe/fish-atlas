import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type { GeoPermissibleObjects } from "d3-geo";
import waterways from "../../content/enrichment/waterways.json";
import { locations } from "../lib/distribution";
import type { WaterLocation } from "../lib/distribution";
import { geographicLineSegments, waterwayIsMain } from "../lib/globeLines";

type Props = {
  highlightedLocation?: WaterLocation | null;
  land?: GeoPermissibleObjects;
};

function makeBatch(source: unknown, radius: number, color: string, width: number, name: string) {
  const positions = geographicLineSegments(source, radius);
  if (!positions.length) return null;
  const geometry = new LineSegmentsGeometry().setPositions(positions);
  const material = new LineMaterial({ color, worldUnits: false, alphaToCoverage: true, depthTest: true, depthWrite: false, toneMapped: false });
  material.linewidth = width;
  const line = new LineSegments2(geometry, material);
  line.name = name;
  line.renderOrder = name === "waterbody-highlight" ? 4 : 2;
  // Geographic hit testing belongs to the globe surface, not decorative lines.
  line.raycast = () => {};
  return line;
}

const featureCollection = (features: unknown[]) => ({ type: "FeatureCollection", features });
const mainWaterways = featureCollection(waterways.features.filter(waterwayIsMain));
const detailedWaterways = featureCollection(waterways.features.filter((river) => !waterwayIsMain(river)));
const lakeGeometry = { type: "GeometryCollection", geometries: locations.filter((location) => location.kind === "lake" && location.geometry).map((location) => location.geometry) };

/** Crisp screen-space river/coast lines; no global catchment borders by default. */
export default function GlobeHydrology({ highlightedLocation, land }: Props) {
  const { size, gl } = useThree();
  const main = useMemo(() => makeBatch(mainWaterways, 1.003, "#a9d7dc", 1.45, "main-rivers"), []);
  const detailed = useMemo(() => {
    const batch = makeBatch(detailedWaterways, 1.003, "#a9d7dc", 1.2, "detail-rivers");
    if (batch) batch.visible = false;
    return batch;
  }, []);
  const coastline = useMemo(() => makeBatch(land, 1.002, "#90b5a7", .65, "coastline"), [land]);
  const lakes = useMemo(() => makeBatch(lakeGeometry, 1.004, "#a9d7dc", 1.25, "lake-shores"), []);
  const highlighted = useMemo(() => makeBatch(highlightedLocation?.geometry, 1.007, "#d5f5c8", 1.9, "waterbody-highlight"), [highlightedLocation]);

  useEffect(() => {
    gl.domElement.dataset.mainRiverFeatures = String(mainWaterways.features.length);
    // Three 0.180 LineSegments2.onBeforeRender updates this from getViewport(),
    // which returns logical pixels. Do not multiply these widths by the DPR.
    for (const batch of [main, detailed, coastline, lakes, highlighted]) {
      batch?.material.resolution.set(size.width, size.height);
    }
  }, [gl, main, detailed, coastline, lakes, highlighted, size.width, size.height]);
  useEffect(() => () => {
    for (const batch of [main, detailed, lakes]) {
      batch?.geometry.dispose();
      batch?.material.dispose();
    }
  }, [main, detailed, lakes]);
  useEffect(() => () => {
    coastline?.geometry.dispose();
    coastline?.material.dispose();
  }, [coastline]);
  useEffect(() => () => {
    highlighted?.geometry.dispose();
    highlighted?.material.dispose();
  }, [highlighted]);
  useFrame(({ camera }) => {
    const visible = camera.position.lengthSq() < 2.7 * 2.7;
    if (detailed) detailed.visible = visible;
    const detailState = String(visible);
    if (gl.domElement.dataset.riverDetailVisible !== detailState) gl.domElement.dataset.riverDetailVisible = detailState;
  });

  return <group name="globe-hydrology">
    {main && <primitive object={main} dispose={null} />}
    {detailed && <primitive object={detailed} dispose={null} />}
    {coastline && <primitive object={coastline} dispose={null} />}
    {lakes && <primitive object={lakes} dispose={null} />}
    {highlighted && <primitive object={highlighted} dispose={null} />}
  </group>;
}
