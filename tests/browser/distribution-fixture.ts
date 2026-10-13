import { readFileSync } from "node:fs";
const raw=JSON.parse(readFileSync(new URL('../../content/distributions.json',import.meta.url),'utf8')) as {species: Record<string,{links:{locationId:string}[]}>};
export const mappedSpeciesCount=Object.values(raw.species).filter(s=>s.links.length).length;
export const locationSpeciesCount=Object.values(raw.species).reduce((m,s)=>{for(const l of s.links)m.set(l.locationId,(m.get(l.locationId)??0)+1);return m;},new Map<string,number>());
