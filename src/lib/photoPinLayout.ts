export type PhotoPinAnchor = {
  key: string;
  x: number;
  y: number;
  facing: number;
  /** Native waterbody; nearby projected anchors can share a compact layout. */
  groupId?: string;
};

export type PhotoPinLayoutOptions = {
  width: number;
  height: number;
  mobile?: boolean;
  diameter?: number;
  minDiameter?: number;
  maxOffset?: number;
};

export type PositionedPhotoPin = {
  key: string;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  offsetX: number;
  offsetY: number;
  diameter: number;
  /** Number of nearby front-facing markers, excluding this marker. */
  density: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

function pairDirection(first: string, second: string) {
  // Coincident source anchors have no natural separation direction. Stable
  // keys keep that direction unchanged while the camera moves or data reorders.
  let hash = 2166136261;
  for (const character of `${first}\0${second}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  const angle = (hash >>> 0) / 4294967296 * Math.PI * 2;
  return [Math.cos(angle), Math.sin(angle)] as const;
}

const compactSlots = new Map<number, readonly { x: number; y: number }[]>();

function slotsForCount(count: number) {
  const cached = compactSlots.get(count);
  if (cached) return cached;
  const extent = Math.ceil(Math.sqrt(count)) + 1;
  const pairs: { x: number; y: number; distance: number; angle: number }[] = [];
  for (let q = -extent; q <= extent; q++) {
    for (let r = 0; r <= extent; r++) {
      if (r === 0 && q <= 0) continue;
      const x = q + r / 2;
      const y = r * Math.sqrt(3) / 2;
      pairs.push({x,y,distance:q*q+q*r+r*r,angle:Math.atan2(y,x)});
    }
  }
  // Fill the center and nearest pairs first. Opposite pairs keep a partially
  // filled ring balanced and distinguish inner photographs from outer ones.
  pairs.sort((a,b) => a.distance-b.distance || a.angle-b.angle);
  const slots = [{x:0,y:0}];
  for (const pair of pairs) {
    if (slots.length >= count) break;
    slots.push({x:pair.x,y:pair.y});
    if (slots.length < count) slots.push({x:-pair.x,y:-pair.y});
  }
  compactSlots.set(count,slots);
  return slots;
}

/**
 * Keep every visible photo attached to its projected geographic position.
 * Dense areas use smaller overlapping photos instead of spreading them across
 * other catchments. The caller can bring a hovered/focused photo to the front.
 */
export function layoutPhotoPins(
  anchors: readonly PhotoPinAnchor[],
  options: PhotoPinLayoutOptions,
): PositionedPhotoPin[] {
  const { width, height } = options;
  if (!(width > 0 && height > 0)) return [];
  const maximumOffset = Math.max(0, options.maxOffset ?? (options.mobile ? 14 : 18));
  const baseDiameter = Math.max(1, options.diameter ?? (options.mobile ? 34 : 44));
  const minimumDiameter = clamp(options.minDiameter ?? (options.mobile ? 20 : 24), 1, baseDiameter);
  const visible = anchors.filter((anchor) =>
    Number.isFinite(anchor.x) && Number.isFinite(anchor.y) &&
    Number.isFinite(anchor.facing) && anchor.facing > .16 &&
    anchor.x >= 0 && anchor.x <= width && anchor.y >= 0 && anchor.y <= height,
  );
  // Key ordering makes pair calculations and floating-point sums independent
  // of the input order. Return order still follows the visible input anchors.
  const ordered = [...visible].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const density = ordered.map(() => 0);
  const neighborhood = baseDiameter * 1.35;
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      if (Math.hypot(ordered[i].x - ordered[j].x, ordered[i].y - ordered[j].y) < neighborhood) {
        density[i]++;
        density[j]++;
      }
    }
  }
  const diameters = density.map((count) =>
    clamp(baseDiameter / Math.sqrt(1 + count * .22), minimumDiameter, baseDiameter),
  );
  const offsets = ordered.map(() => ({ x: 0, y: 0 }));
  const groupsByAnchor = new Map<string, number[]>();
  ordered.forEach((anchor,index) => {
    const key = anchor.groupId ? `waterbody:${anchor.groupId}` : `coordinate:${anchor.x.toFixed(3)},${anchor.y.toFixed(3)}`;
    const indices = groupsByAnchor.get(key) ?? [];
    indices.push(index);
    groupsByAnchor.set(key,indices);
  });
  const proximityGroups: number[][] = [];
  for (const indices of groupsByAnchor.values()) {
    if (!ordered[indices[0]].groupId) {
      proximityGroups.push(indices);
      continue;
    }
    const subgroups: {indices:number[];minimumX:number;maximumX:number;minimumY:number;maximumY:number}[] = [];
    for (const index of indices) {
      const {x,y} = ordered[index];
      const group = subgroups.find((candidate) => Math.hypot(
        Math.max(candidate.maximumX,x)-Math.min(candidate.minimumX,x),
        Math.max(candidate.maximumY,y)-Math.min(candidate.minimumY,y),
      ) <= maximumOffset*.5);
      if (group) {
        group.indices.push(index);
        group.minimumX = Math.min(group.minimumX,x);
        group.maximumX = Math.max(group.maximumX,x);
        group.minimumY = Math.min(group.minimumY,y);
        group.maximumY = Math.max(group.maximumY,y);
      } else subgroups.push({indices:[index],minimumX:x,maximumX:x,minimumY:y,maximumY:y});
    }
    proximityGroups.push(...subgroups.map((group) => group.indices));
  }
  const groups = proximityGroups.map((indices) => {
    const slots = slotsForCount(indices.length);
    const furthest = Math.max(...slots.map((slot) => Math.hypot(slot.x,slot.y)));
    const diameter = Math.min(...indices.map((index) => diameters[index]));
    const x = indices.reduce((sum,index) => sum+ordered[index].x,0)/indices.length;
    const y = indices.reduce((sum,index) => sum+ordered[index].y,0)/indices.length;
    const anchorRadius = Math.max(...indices.map((index) => Math.hypot(ordered[index].x-x,ordered[index].y-y)));
    // A finite compact grid can overlap when the caller's radius is too small;
    // it never grows into unrelated catchments or drops the extra photographs.
    // Reserve the distance from each source point to the group mean so even
    // neighboring north/south locality anchors retain their individual bounds.
    const spacing = furthest ? Math.min(diameter+2,Math.max(0,maximumOffset-anchorRadius)/furthest) : 0;
    indices.forEach((index,slot) => {
      offsets[index].x = x-ordered[index].x + slots[slot].x * spacing;
      offsets[index].y = y-ordered[index].y + slots[slot].y * spacing;
    });
    return {indices,x,y,dx:0,dy:0,diameter};
  });
  // Different native anchors receive only a small local nudge. The compact
  // layout above is reserved for the same source point or nearby localities
  // within one native waterbody, never neighboring unrelated catchments.
  for (let i = 0; i < groups.length; i++) {
    for (let j = i+1; j < groups.length; j++) {
      const first = groups[i], second = groups[j];
      const dx = second.x-first.x, dy = second.y-first.y;
      const distance = Math.hypot(dx,dy);
      const spacing = (first.diameter+second.diameter)/2+2;
      if (distance >= spacing) continue;
      const [ux,uy] = distance > .001 ? [dx/distance,dy/distance] : pairDirection(ordered[first.indices[0]].key,ordered[second.indices[0]].key);
      const push = (spacing-distance)/2;
      first.dx -= ux*push;
      first.dy -= uy*push;
      second.dx += ux*push;
      second.dy += uy*push;
    }
  }
  for (const group of groups) {
    const length = Math.hypot(group.dx,group.dy);
    const adjustmentLimit = Math.min(8,maximumOffset);
    const scale = length > adjustmentLimit ? adjustmentLimit/length : 1;
    for (const index of group.indices) {
      offsets[index].x += group.dx*scale;
      offsets[index].y += group.dy*scale;
    }
  }
  const byKey = new Map(ordered.map((anchor, index) => {
    const offset = offsets[index];
    const length = Math.hypot(offset.x, offset.y);
    const scale = length > maximumOffset ? maximumOffset / length : 1;
    // At viewport boundaries, reduce the local nudge. Never move an anchor
    // toward a common parking line or into a distant empty screen position.
    const offsetX = clamp(offset.x * scale, -anchor.x, width - anchor.x);
    const offsetY = clamp(offset.y * scale, -anchor.y, height - anchor.y);
    const positioned: PositionedPhotoPin = {
      key: anchor.key,
      x: anchor.x + offsetX,
      y: anchor.y + offsetY,
      anchorX: anchor.x,
      anchorY: anchor.y,
      offsetX,
      offsetY,
      diameter: diameters[index],
      density: density[index],
    };
    return [anchor.key, positioned] as const;
  }));
  return visible.map((anchor) => byKey.get(anchor.key)!);
}
