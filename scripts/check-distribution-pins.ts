import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/land-110m.json";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { GeoPermissibleObjects } from "d3-geo";
import rawFish from "../content/species.json";
import rawProfiles from "../content/photo-profiles.json";
import { makeBasinPhotoPins } from "../src/lib/basinPins";
import { fishSchema } from "../src/lib/model";
import { photoProfileSchema } from "../src/lib/photoProfiles";
import { distributions, locations, locationById } from "../src/lib/distribution";
import type { ExploreSpecies } from "../src/lib/exploreProfiles";
const fishes = fishSchema.array().parse(rawFish), profiles=photoProfileSchema.array().parse(rawProfiles);
const photos:ExploreSpecies[]=[...fishes.flatMap(f=>f.photo?[{id:f.id,name:f.name,scientific:f.scientific,region:f.region,photo:f.photo,item:f}]:[]),...profiles.map(f=>({id:f.id,name:f.name,scientific:f.scientific,region:null,photo:f.photo,item:f}))];
const land=feature(world as unknown as Topology<{land:GeometryCollection}>, (world as unknown as Topology<{land:GeometryCollection}>).objects.land) as GeoPermissibleObjects;
let errors=0;
for (const [id, record] of Object.entries(distributions)) {
 for (const link of record.links) {
  if (![link.displayCoordinates, link.displayCoordinateSourceUrl, link.displayCoordinateNote].some(value => value !== undefined)) continue;
  const point = link.displayCoordinates;
  const location = locationById.get(link.locationId);
  if (!point || point.length !== 2 || !point.every(Number.isFinite) ||
      point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90 ||
      !link.displayCoordinateSourceUrl?.startsWith("https://") || !link.displayCoordinateNote?.trim() ||
      !location?.geometry || !geoContains({type:"Feature",properties:{},geometry:location.geometry} as GeoPermissibleObjects,[point[0],point[1]])) {
   console.log("INVALID_LOCAL_ANCHOR",id,link.locationId,point);errors++;
  }
 }
}
for(const location of locations) {
 for(const pin of makeBasinPhotoPins(photos,location.id)) {
  const l=locationById.get(pin.basinId)!;
  if(l.kind==='sea'&&geoContains(land,pin.coordinates)) {console.log('LAND',pin.fish.id,l.id,pin.coordinates);errors++;}
  if(l.geometry&&!geoContains({type:'Feature',properties:{},geometry:l.geometry} as GeoPermissibleObjects,pin.coordinates)) {console.log('OUTSIDE',pin.fish.id,l.id,pin.coordinates);errors++;}
 }
}
console.log('Geography errors:',errors);if(errors)process.exitCode=1;
