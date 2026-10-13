"""Fill missing Commons photos, serially with pauses; stop if server rate-limits."""
from pathlib import Path
import urllib.request,urllib.parse,urllib.error,json,time
ROOT=Path(__file__).resolve().parents[1]
seed=json.loads((ROOT/'content/seed.json').read_text())
for row in seed:
 p=ROOT/'content/research'/(row['id']+'.json');d=json.loads(p.read_text())
 if d.get('wiki',{}).get('original'):continue
 time.sleep(4)
 title=row['id'].replace('-',' ')
 if title=='chromobotia macracanthus':title='Clown loach'
 if title=='trichopsis pumila':title='Pygmy gourami'
 q=urllib.parse.urlencode({'action':'query','format':'json','prop':'pageimages','piprop':'original','redirects':1,'titles':title})
 try:
  r=urllib.request.urlopen(urllib.request.Request('https://en.wikipedia.org/w/api.php?'+q,headers={'User-Agent':'FishAtlasPrototype/0.1 (local educational reference)'}),timeout=35)
  v=json.load(r);d['wiki']=list(v['query']['pages'].values())[0];p.write_text(json.dumps(d,ensure_ascii=False,indent=2));print(row['id'],d['wiki'].get('title'),bool(d['wiki'].get('original')),flush=True)
 except urllib.error.HTTPError as e:
  print('HTTP',e.code,'stopping',flush=True);break
 except Exception as e:print(str(e),flush=True)
