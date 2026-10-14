from pathlib import Path
import json,urllib.request
R=Path(__file__).resolve().parents[1];p=R/'content/enrichment/geography.json';g=json.loads(p.read_text());datasets={}
for key in sorted({o['datasetKey'] for v in g.values() for o in v['occurrences']}):
 c=R/'content/research/gbif'/('dataset-'+key+'.json')
 if c.exists():d=json.loads(c.read_text())
 else:
  d=json.load(urllib.request.urlopen('https://api.gbif.org/v1/dataset/'+key,timeout=25));c.write_text(json.dumps(d))
 datasets[key]={'title':d.get('title'),'citation':d.get('citation'),'doi':d.get('doi'),'url':'https://www.gbif.org/dataset/'+key};print(datasets[key])
(R/'content/enrichment/datasets.json').write_text(json.dumps(datasets,ensure_ascii=False,indent=2))
