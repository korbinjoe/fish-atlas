import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fishSchema, regions } from "../src/lib/model";
import { geography } from "../src/lib/evidence";
import { rules } from "../src/lib/planner";
import datasets from "../content/enrichment/datasets.json";
const fish = fishSchema
  .array()
  .parse(JSON.parse(readFileSync(resolve("content/species.json"), "utf8")));
const ids = new Set<string>();
for (const f of fish) {
  if (ids.has(f.id)) throw new Error(`Duplicate ID ${f.id}`);
  ids.add(f.id);
  if (!regions.some((r) => r.id === f.region))
    throw new Error(`Unknown region ${f.region}`);
  if (!f.sourceUrl.startsWith("https://"))
    throw new Error(`Missing source: ${f.id}`);
  if (!f.photo) throw new Error(`Missing identification photo: ${f.id}`);
  if (f.photo) {
    if (!existsSync(resolve("public", f.photo.path)))
      throw new Error(`Missing photo: ${f.id}`);
    if (!f.photo.author || !f.photo.license || !f.photo.pageUrl)
      throw new Error(`Missing attribution ${f.id}`);
  }
  if (f.length !== null && f.length <= 0)
    throw new Error(`Invalid length ${f.id}`);
  const g = geography[f.id];
  if (!g) throw new Error(`Missing taxonomy audit: ${f.id}`);
  for (const o of g.occurrences) {
    if (!(o.datasetKey in datasets)) throw new Error(`Missing dataset credit: ${o.id}`);
    if (!/^https?:\/\/creativecommons\.org\/(licenses\/by\/|publicdomain\/zero\/)/.test(o.license)) throw new Error(`Unapproved record license: ${o.id}`);
  }
}
for (const [id,r] of Object.entries(rules)) {
  if (!ids.has(id) || !r.source.startsWith("https://")) throw new Error(`Invalid behavior rule ${id}`);
  for (const target of r.prey ?? []) if (!ids.has(target)) throw new Error(`Unknown prey ${target}`);
}
writeFileSync("docs/content-review.json", JSON.stringify({
  version:"0.2.0",date:"2026-10-09",speciesCount:fish.length,photoCount:fish.filter(f=>f.photo).length,
  reviewLevel:"source-page-checked; not expert-reviewed",taxonomyMatches:Object.values(geography).filter(g=>g.review==='exact-species-match').length,
  occurrenceCount:Object.values(geography).reduce((n,g)=>n+g.occurrences.length,0),behaviorProfiles:Object.keys(rules).length,
  missingParameters:fish.map(f=>({id:f.id,fields:(["tank","temperature","ph",f.water==='marine'?"specificGravity":"hardness"] as const).filter(k=>f[k]===null)})).filter(f=>f.fields.length),
  note:"Marine volume recommendations are distinct from tank length. Expert review and physical-device QA remain pending."
},null,2));
console.log(
  `Content valid: ${fish.length} species, ${fish.filter((f) => f.photo).length} attributed photographs, ${regions.length} regions.`,
);
