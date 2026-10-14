/** Convert geographic paths into short, independent chords on the globe.
 * Each chord follows the shortest great-circle arc. In particular, a segment
 * crossing 180° stays at the dateline rather than crossing the whole map.
 */
export function geographicLineSegments(
  source: unknown,
  radius = 1.003,
  maxAngleDegrees = 0.35,
): Float32Array {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(maxAngleDegrees) || maxAngleDegrees <= 0) {
    throw new RangeError("Globe line radius and maximum angle must be positive");
  }
  const positions: number[] = [];
  const maxAngle = Math.min(maxAngleDegrees, 0.35) * Math.PI / 180;
  const unit = (point: number[]): [number, number, number] => {
    const latitude = point[1] * Math.PI / 180, longitude = point[0] * Math.PI / 180;
    return [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), -Math.cos(latitude) * Math.sin(longitude)];
  };
  const valid = (point: unknown): point is number[] => Array.isArray(point) &&
    point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    Math.abs(point[1] as number) <= 90;
  const appendPath = (coordinates: unknown) => {
    if (!Array.isArray(coordinates)) return;
    for (let index = 1; index < coordinates.length; index++) {
      const start = coordinates[index - 1], end = coordinates[index];
      // Invalid points break a path, rather than joining across missing data.
      if (!valid(start) || !valid(end)) continue;
      const a = unit(start), b = unit(end);
      const angle = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
      if (angle < 1e-9) continue;
      const steps = Math.ceil(angle / maxAngle);
      const sinAngle = Math.sin(angle);
      let tangent: [number, number, number] | null = null;
      if (Math.abs(sinAngle) < 1e-6) {
        // Antipodes have no unique shortest arc. A deterministic perpendicular
        // avoids NaNs while retaining short, surface-following segments.
        const reference: [number, number, number] = Math.abs(a[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
        tangent = [a[1] * reference[2] - a[2] * reference[1], a[2] * reference[0] - a[0] * reference[2], a[0] * reference[1] - a[1] * reference[0]];
        const length = Math.hypot(...tangent);
        tangent = tangent.map((value) => value / length) as [number, number, number];
      }
      let previous = a;
      for (let step = 1; step <= steps; step++) {
        const fraction = step / steps;
        let next: [number, number, number];
        if (step === steps) next = b;
        else if (tangent) {
          const cos = Math.cos(angle * fraction), sin = Math.sin(angle * fraction);
          next = [a[0] * cos + tangent[0] * sin, a[1] * cos + tangent[1] * sin, a[2] * cos + tangent[2] * sin];
        } else {
          const startWeight = Math.sin((1 - fraction) * angle) / sinAngle;
          const endWeight = Math.sin(fraction * angle) / sinAngle;
          next = [a[0] * startWeight + b[0] * endWeight, a[1] * startWeight + b[1] * endWeight, a[2] * startWeight + b[2] * endWeight];
        }
        positions.push(previous[0] * radius, previous[1] * radius, previous[2] * radius, next[0] * radius, next[1] * radius, next[2] * radius);
        previous = next;
      }
    }
  };
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    switch (object.type) {
      case "Feature": visit(object.geometry); break;
      case "FeatureCollection": if (Array.isArray(object.features)) object.features.forEach(visit); break;
      case "GeometryCollection": if (Array.isArray(object.geometries)) object.geometries.forEach(visit); break;
      case "LineString": appendPath(object.coordinates); break;
      case "MultiLineString":
      case "Polygon": if (Array.isArray(object.coordinates)) object.coordinates.forEach(appendPath); break;
      case "MultiPolygon": if (Array.isArray(object.coordinates)) object.coordinates.forEach((polygon) => {
        if (Array.isArray(polygon)) polygon.forEach(appendPath);
      }); break;
    }
  };
  visit(source);
  return new Float32Array(positions);
}

/** Natural Earth ranks are coarse map priorities, not river-flow measurements. */
export function waterwayIsMain(feature: { properties?: unknown }): boolean {
  const properties = feature.properties as Record<string, unknown> | null | undefined;
  const rawRank = properties?.scalerank ?? properties?.scaleRank ?? properties?.SCALERANK;
  const rank = typeof rawRank === "number" ? rawRank : typeof rawRank === "string" && rawRank.trim() ? Number(rawRank) : NaN;
  return !Number.isFinite(rank) || rank <= 4;
}
