import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { photoProfileSchema } from "../src/lib/photoProfiles";

const root = resolve(import.meta.dirname, "..");
const read = (name: string) => JSON.parse(readFileSync(resolve(root, "content", name), "utf8"));
const profiles = photoProfileSchema.array().parse(read("photo-profiles.json"));
const catalog = read("catalog.json") as { key: number; scientific: string; family: string; curatedId?: string }[];
const byKey = new Map(catalog.map((row) => [row.key, row]));
const ids = new Set<string>();
const keys = new Set<number>();
for (const profile of profiles) {
  if (ids.has(profile.id) || keys.has(profile.gbifKey)) throw new Error(`Duplicate photo profile: ${profile.scientific}`);
  ids.add(profile.id);
  keys.add(profile.gbifKey);
  const row = byKey.get(profile.gbifKey);
  if (!row || row.curatedId || row.scientific !== profile.scientific || row.family !== profile.family) {
    throw new Error(`Catalog mismatch: ${profile.scientific}`);
  }
  if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(profile.photo.pageUrl)) throw new Error(`Missing Commons file: ${profile.scientific}`);
  if (!/^CC BY(?:-SA)? [\d.]+(?: de)?$|^CC0$/.test(profile.photo.license)) throw new Error(`Unexpected license: ${profile.scientific}`);
  if (!/^\/media\/wikimedia\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/.test(profile.photo.path)) throw new Error(`Bad local path: ${profile.scientific}`);
  const bytes = readFileSync(resolve(root, "public", profile.photo.path.slice(1)));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (bytes.length < 5_000 || !(jpeg || png || webp)) throw new Error(`Invalid photo file: ${profile.scientific}`);
}
console.log(`Photo profiles validated: ${profiles.length} local images linked to GBIF and Commons`);
