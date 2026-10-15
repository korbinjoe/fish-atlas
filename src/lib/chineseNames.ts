import policy from "../../content/chinese-name-policy.json";

type NameSource = { name: string; scientific?: string };
export type ChineseNameEntry = { name: string; formalName?: string; aliases: string[]; rejectedNames: string[]; sourceUrls: string[]; reason: string };
const replacements: Record<string, string> = policy.characterReplacements;
const preferred = new Map<string, ChineseNameEntry>(Object.entries(policy.preferredNames)
  .map(([scientific, entry]) => [scientific.trim().toLowerCase().replace(/\s+/g, " "), entry as ChineseNameEntry]));

// Iterate code points, not UTF-16 halves: several earlier source names contain
// newly encoded fish characters outside the Basic Multilingual Plane.
export function normalizeChineseName(value: string): string {
  return Array.from(value.normalize("NFC"), character => replacements[character] ?? character).join("");
}
export function chineseNameEntry(scientific = ""): ChineseNameEntry | undefined {
  return preferred.get(scientific.trim().toLowerCase().replace(/\s+/g, " "));
}
export function chineseFishName(fish: NameSource): string {
  return chineseNameEntry(fish.scientific)?.name ?? normalizeChineseName(fish.name);
}
