import { readFileSync } from "node:fs";
import { z } from "zod";

const root = new URL("../content/", import.meta.url);
const read = (name: string) => JSON.parse(readFileSync(new URL(name, root), "utf8"));
const entrySchema = z.object({
  key: z.number().int(),
  scientific: z.string().regex(/^[A-Z][a-z-]+ [a-z][a-z-]+$/),
  family: z.string().min(1),
  genus: z.string().min(1),
  habitats: z.array(z.enum(["FRESHWATER", "MARINE", "BRACKISH"])),
  vernacular: z.string(),
  curatedId: z.string().optional(),
  reviewCandidate: z.boolean(),
}).strict();
const catalog = z.array(entrySchema).parse(read("catalog.json"));
const manifest = read("catalog-manifest.json");
const curated = read("species.json") as { id: string }[];
const curatedIds = new Set(curated.map((fish) => fish.id));
const keys = catalog.map((entry) => entry.key);
const names = catalog.map((entry) => entry.scientific.toLocaleLowerCase());
if (new Set(keys).size !== keys.length) throw new Error("Catalog contains duplicate GBIF keys");
if (new Set(names).size !== names.length) throw new Error("Catalog contains duplicate scientific names");
if (catalog.length !== manifest.totalEntries || manifest.basicEntries < 3500) throw new Error("Catalog total mismatch or too small");
if (catalog.filter((entry) => !!entry.curatedId).length !== curated.length) throw new Error("Curated profile count mismatch");
if (catalog.filter((entry) => !entry.curatedId).length !== manifest.basicEntries) throw new Error("Basic entry count mismatch");
if (catalog.filter((entry) => entry.reviewCandidate).length !== manifest.reviewQueue) throw new Error("Review queue count mismatch");
if (catalog.some((entry) => entry.curatedId && !curatedIds.has(entry.curatedId))) throw new Error("Unknown curated profile reference");
if (catalog.some((entry) => entry.curatedId && !entry.reviewCandidate)) throw new Error("Curated profile missing from review queue");
if (manifest.license !== "CC BY 4.0" || !manifest.datasetUrl) throw new Error("Missing GBIF attribution");
const queue = readFileSync(new URL("../docs/catalog-review-queue.csv", import.meta.url), "utf8").trim().split(/\r?\n/);
const queueKeys = queue.slice(1).map((line) => Number(line.split(",")[3]));
const priorityKeys = catalog.filter((entry) => entry.reviewCandidate).map((entry) => entry.key);
if (queue[0] !== "stage,scientific,family,gbif_key,profile_id,gbif_url" || queueKeys.length !== priorityKeys.length || new Set(queueKeys).size !== queueKeys.length || queueKeys.some((key) => !priorityKeys.includes(key))) throw new Error("Review queue CSV mismatch");
console.log(`Catalog validated: ${catalog.length} records, ${manifest.reviewQueue} review candidates`);
