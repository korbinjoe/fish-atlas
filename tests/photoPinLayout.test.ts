import { expect, test } from "vitest";
import { layoutPhotoPins, type PhotoPinAnchor } from "../src/lib/photoPinLayout";

const viewport = { width: 1000, height: 700 };
const anchor = (key: string, x: number, y: number, facing = 1): PhotoPinAnchor => ({key,x,y,facing});

test("isolated photographs stay exactly on their geographic anchors at full size", () => {
  const result = layoutPhotoPins([anchor("amazon",200,400),anchor("mekong",700,350)],viewport);
  expect(result.map(({x,y,diameter,density}) => ({x,y,diameter,density}))).toEqual([
    {x:200,y:400,diameter:44,density:0},
    {x:700,y:350,diameter:44,density:0},
  ]);
});

test("all 183 dense source photographs remain local, with smaller markers instead of scattering", () => {
  const input = Array.from({length:183}, (_, i) => anchor(`fish-${i}`,500 + i % 3,350 + i % 5));
  const result = layoutPhotoPins(input,viewport);
  expect(result).toHaveLength(183);
  expect(new Set(result.map((pin) => pin.key)).size).toBe(183);
  for (const pin of result) {
    expect(Math.hypot(pin.offsetX,pin.offsetY)).toBeLessThanOrEqual(18 + 1e-9);
    expect(pin.diameter).toBe(24);
    expect(pin.density).toBe(182);
    expect(Math.hypot(pin.x-pin.anchorX,pin.y-pin.anchorY)).toBeLessThanOrEqual(18 + 1e-9);
  }
});

test("caller-provided mobile radius is respected and a coincident cluster fills inner rings first", () => {
  const input = Array.from({length:25}, (_, i) => anchor(`fish-${i}`,140,160));
  const result = layoutPhotoPins(input,{width:320,height:400,mobile:true,maxOffset:48,diameter:32,minDiameter:24});
  for (const pin of result) {
    expect(Math.hypot(pin.offsetX,pin.offsetY)).toBeLessThanOrEqual(48 + 1e-9);
    expect(pin.diameter).toBe(24);
  }
  expect(new Set(result.map((pin) => `${pin.x},${pin.y}`)).size).toBe(25);
  const radii = result.map((pin) => Math.hypot(pin.offsetX,pin.offsetY));
  expect(Math.min(...radii)).toBe(0);
  expect(radii.filter((radius) => radius < 36).length).toBeGreaterThan(7);
  expect(radii.filter((radius) => radius > 40).length).toBeGreaterThan(0);
  expect(Math.max(...radii)).toBeGreaterThan(40);
});

test("chosen waterbody clusters use the requested photo size and compact multiple rings", () => {
  const input = Array.from({length:21}, (_, i) => anchor(`fish-${i}`,500,350));
  const result = layoutPhotoPins(input,{...viewport,maxOffset:72,diameter:44,minDiameter:30});
  expect(result).toHaveLength(21);
  const radii = result.map((pin) => Math.hypot(pin.offsetX,pin.offsetY));
  for (const pin of result) {
    expect(pin.diameter).toBe(30);
    expect(Math.hypot(pin.offsetX,pin.offsetY)).toBeLessThanOrEqual(72+1e-9);
  }
  expect(radii.filter((radius) => radius < 36)).toHaveLength(7);
  expect(radii.filter((radius) => radius >= 36 && radius < 65).length).toBeGreaterThan(6);
  expect(new Set(radii.map((radius) => radius.toFixed(3))).size).toBeGreaterThanOrEqual(4);
  const reordered = [...input.filter((_,index) => index%2),...input.filter((_,index) => !(index%2))];
  const byKey = new Map(layoutPhotoPins(reordered,{...viewport,maxOffset:72,diameter:44,minDiameter:30}).map((pin) => [pin.key,pin]));
  expect(result.map((pin) => byKey.get(pin.key))).toEqual(result);
});

test("default mobile radius stays small and group nudges cannot exceed the requested radius", () => {
  const input = Array.from({length:12}, (_, i) => anchor(`fish-${i}`,140,160));
  const defaults = layoutPhotoPins(input,{width:320,height:400,mobile:true});
  for (const pin of defaults) expect(Math.hypot(pin.offsetX,pin.offsetY)).toBeLessThanOrEqual(14+1e-9);
  const nearby = [...input,anchor("other-waterbody",143,160)];
  const result = layoutPhotoPins(nearby,{width:320,height:400,mobile:true,maxOffset:34,diameter:26,minDiameter:20});
  expect(result).toHaveLength(13);
  for (const pin of result) expect(Math.hypot(pin.offsetX,pin.offsetY)).toBeLessThanOrEqual(34+1e-9);
});

test("different geographic anchors receive only local nudges even with a wide cluster radius", () => {
  const input = [anchor("first",400,350),anchor("second",405,350),anchor("third",410,350)];
  const result = layoutPhotoPins(input,{...viewport,maxOffset:72,diameter:44,minDiameter:30});
  for (const pin of result) expect(Math.hypot(pin.offsetX,pin.offsetY)).toBeLessThanOrEqual(8+1e-9);
});

test("nearby localities within one lake share a hittable compact grid while retaining source anchors", () => {
  const input = Array.from({length:6}, (_,index) => ({
    ...anchor(`tanganyika-${index}`,500+(index%3),350+(index%2)),groupId:"lake-tanganyika",
  }));
  const options = {...viewport,maxOffset:72,diameter:44,minDiameter:30};
  const result = layoutPhotoPins(input,options);
  expect(result).toHaveLength(6);
  for (const [index,pin] of result.entries()) {
    expect(pin.anchorX).toBe(input[index].x);
    expect(pin.anchorY).toBe(input[index].y);
    expect(Math.hypot(pin.x-pin.anchorX,pin.y-pin.anchorY)).toBeLessThanOrEqual(72+1e-9);
    // Any photograph's center must remain outside every other photo's circle,
    // independent of DOM paint order, so a pointer can hit each of the six.
    for (const other of result) {
      if (other.key === pin.key) continue;
      expect(Math.hypot(pin.x-other.x,pin.y-other.y)).toBeGreaterThan(other.diameter/2);
    }
  }
  const reordered = layoutPhotoPins([...input].reverse(),options).reverse();
  expect(reordered).toEqual(result);
});

test("distant localities and separate waterbodies do not merge into the same photo grid", () => {
  const input = [
    {...anchor("north-a",200,150),groupId:"long-river"},
    {...anchor("north-b",201,151),groupId:"long-river"},
    {...anchor("south-a",600,500),groupId:"long-river"},
    {...anchor("south-b",601,501),groupId:"long-river"},
    {...anchor("other",900,200),groupId:"other-river"},
  ];
  const result = layoutPhotoPins(input,{...viewport,maxOffset:48,diameter:32,minDiameter:24});
  for (const [index,pin] of result.entries()) {
    expect(pin.anchorX).toBe(input[index].x);
    expect(pin.anchorY).toBe(input[index].y);
    expect(Math.hypot(pin.offsetX,pin.offsetY)).toBeLessThanOrEqual(48+1e-9);
  }
  expect(result[0].x).toBeLessThan(250);
  expect(result[2].x).toBeGreaterThan(550);
  expect(result[4]).toMatchObject({x:900,y:200,offsetX:0,offsetY:0});
});

test("same-waterbody groups retain strict per-fish radius after nearby group adjustment", () => {
  const input = [
    ...Array.from({length:12},(_,index) => ({...anchor(`a-${index}`,140+index%3,160+index%2),groupId:"a"})),
    ...Array.from({length:6},(_,index) => ({...anchor(`b-${index}`,145+index%3,160+index%2),groupId:"b"})),
  ];
  const result = layoutPhotoPins(input,{width:320,height:400,mobile:true,maxOffset:34,diameter:26,minDiameter:20});
  expect(result).toHaveLength(18);
  for (const pin of result) expect(Math.hypot(pin.x-pin.anchorX,pin.y-pin.anchorY)).toBeLessThanOrEqual(34+1e-9);
});

test("coincident markers use stable separation regardless of input ordering or small camera movement", () => {
  const input = [anchor("a",250,250),anchor("b",250,250),anchor("c",250,250)];
  const result = layoutPhotoPins(input,viewport);
  expect(layoutPhotoPins([...input].reverse(),viewport).reverse()).toEqual(result);
  const moved = layoutPhotoPins(input.map((pin) => ({...pin,x:pin.x+1,y:pin.y+2})),viewport);
  expect(moved.map(({offsetX,offsetY}) => ({offsetX,offsetY}))).toEqual(result.map(({offsetX,offsetY}) => ({offsetX,offsetY})));
  expect(new Set(result.map(({x,y}) => `${x},${y}`)).size).toBe(3);
});

test("edge collisions do not send photographs to distant empty positions or common parking lines", () => {
  const input = [anchor("left-a",1,30),anchor("left-b",2,31),anchor("right-a",998,600),anchor("right-b",999,601)];
  const result = layoutPhotoPins(input,viewport);
  for (const pin of result) {
    expect(pin.x).toBeGreaterThanOrEqual(0);
    expect(pin.x).toBeLessThanOrEqual(viewport.width);
    expect(pin.y).toBeGreaterThanOrEqual(0);
    expect(pin.y).toBeLessThanOrEqual(viewport.height);
    expect(Math.hypot(pin.offsetX,pin.offsetY)).toBeLessThanOrEqual(18 + 1e-9);
  }
  expect(result[0].x).toBeLessThan(20);
  expect(result[2].x).toBeGreaterThan(980);
});

test("hidden, back-facing and invalid projections do not influence visible density or layout", () => {
  const input = [anchor("visible",500,350),anchor("back",500,350,-.5),anchor("outside",-1,350),anchor("invalid",NaN,350)];
  const result = layoutPhotoPins(input,viewport);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({key:"visible",x:500,y:350,diameter:44,density:0});
  expect(layoutPhotoPins(input,{width:0,height:0})).toEqual([]);
});
