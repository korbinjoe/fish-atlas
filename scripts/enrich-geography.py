"""Optional cached GBIF/Natural Earth fetch. Does not run during builds."""
from pathlib import Path
import urllib.request,urllib.parse,json,time
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT/'content/research/gbif';CACHE.mkdir(exist_ok=True)
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'FishAtlas/0.2 educational atlas'}),timeout=25) as r:return json.load(r)
def cached(name,url):
 p=CACHE/(name+'.json')
 if p.exists():return json.loads(p.read_text())
 d=get(url);p.write_text(json.dumps(d));time.sleep(.35);return d
species=json.loads((ROOT/'content/species.json').read_text());species += json.loads((ROOT/'content/marine.json').read_text()) if (ROOT/'content/marine.json').exists() else []
result={};report=[]
for f in {f['id']:f for f in species}.values():
 try:
  m=cached(f['id']+'-match','https://api.gbif.org/v1/species/match?'+urllib.parse.urlencode({'name':f['scientific'],'strict':'true'}))
  good=m.get('matchType')=='EXACT' and m.get('rank')=='SPECIES' and m.get('confidence',0)>=95
  key=m.get('acceptedUsageKey',m.get('usageKey'));accepted=cached(str(key),'https://api.gbif.org/v1/species/'+str(key)) if good else {}
  item={'queriedName':f['scientific'],'matchedName':m.get('scientificName'),'acceptedName':accepted.get('canonicalName'),'key':key,'matchType':m.get('matchType'),'confidence':m.get('confidence'),'status':m.get('status'),'family':accepted.get('family'),'accessedAt':'2026-10-09','review':'exact-species-match' if good else 'needs-review','url':'https://www.gbif.org/species/'+str(key),'occurrences':[]}
  if good:
   occ=cached(f['id']+'-occ','https://api.gbif.org/v1/occurrence/search?'+urllib.parse.urlencode({'taxonKey':key,'hasCoordinate':'true','hasGeospatialIssue':'false','basisOfRecord':'HUMAN_OBSERVATION','limit':100}))
   seen=set()
   for o in occ.get('results',[]):
    uncertainty=o.get('coordinateUncertaintyInMeters');lon=o.get('decimalLongitude');lat=o.get('decimalLatitude');lic=o.get('license','');year=o.get('year');basis=o.get('basisOfRecord');est=o.get('establishmentMeans','unknown');est=est if isinstance(est,str) else est.get('concept','unknown')
    if o.get('speciesKey')!=key or o.get('occurrenceStatus')!='PRESENT' or basis!='HUMAN_OBSERVATION' or uncertainty is None or uncertainty>10000 or uncertainty<0 or not year or year<1950 or not isinstance(lon,(int,float)) or not isinstance(lat,(int,float)) or not -180<=lon<=180 or not -90<=lat<=90 or (lon==0 and lat==0) or not any(x in lic for x in ['creativecommons.org/licenses/by/','creativecommons.org/publicdomain/zero/']):continue
    if o.get('degreeOfEstablishment') in ['captive','cultivated'] or any('captive' in str(v).lower() for v in [o.get('organismRemarks',''),o.get('occurrenceRemarks','')]):continue
    coord=(round(lon,3),round(lat,3))
    if coord in seen:continue
    seen.add(coord)
    item['occurrences'].append({'id':str(o['key']),'coordinates':[lon,lat],'uncertaintyMeters':uncertainty,'eventDate':o.get('eventDate',str(year)),'establishment':est if est in ['native','introduced'] else 'unknown','datasetKey':o['datasetKey'],'datasetTitle':o.get('datasetName') or o.get('institutionCode') or 'GBIF dataset','license':lic,'recordedBy':o.get('recordedBy','未提供'),'url':'https://www.gbif.org/occurrence/'+str(o['key']),'basis':basis})
    if len(item['occurrences'])==5:break
  result[f['id']]=item;print(f['id'],item['acceptedName'],len(item['occurrences']),flush=True)
 except Exception as e:report.append({'id':f['id'],'error':str(e)});print(f['id'],str(e),flush=True)
# Preserve published records when upstream fails; never replace them with an empty response.
out=ROOT/'content/enrichment/geography.json';old=json.loads(out.read_text()) if out.exists() else {};old.update(result);out.write_text(json.dumps(old,ensure_ascii=False,indent=2));(ROOT/'docs/geography-fetch.json').write_text(json.dumps({'date':'2026-10-09','errors':report},indent=2))
