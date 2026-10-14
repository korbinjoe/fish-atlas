from pathlib import Path
import json,urllib.request,urllib.parse,time,subprocess
R=Path(__file__).resolve().parents[1]
for f in json.loads((R/'content/marine.json').read_text()):
 p=R/'content/research'/(f['id']+'.json')
 if p.exists():continue
 try:
  q=urllib.parse.urlencode({'action':'query','format':'json','prop':'pageimages','piprop':'original','redirects':1,'titles':f['scientific']})
  req=urllib.request.Request('https://en.wikipedia.org/w/api.php?'+q,headers={'User-Agent':'FishAtlas/0.2 educational atlas'})
  data=json.load(urllib.request.urlopen(req,timeout=30));wiki=list(data['query']['pages'].values())[0]
  p.write_text(json.dumps({'id':f['id'],'wiki':wiki}));print(f['id'],wiki.get('original'),flush=True);time.sleep(4)
 except Exception as e: print(str(e),flush=True);break
subprocess.run(['python3',str(R/'scripts/collect-media.py')],check=True)
