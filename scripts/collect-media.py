from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,urllib.parse,json,re,html,time
ROOT=Path(__file__).resolve().parents[1]
def get(url):return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'FishAtlasPrototype/0.1 (local educational reference)'}),timeout=40).read()
def clean(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
def job(p):
 d=json.loads(p.read_text())
 if not isinstance(d,dict) or 'id' not in d:return
 out=ROOT/'content'/'research'/(d['id']+'.media.json')
 if out.exists(): return
 time.sleep(4)
 orig=d.get('wiki',{}).get('original',{}).get('source')
 if not orig:return
 file=urllib.parse.unquote(urllib.parse.urlparse(orig).path.split('/')[-1]);q=urllib.parse.urlencode({'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':640,'titles':'File:'+file})
 try:
  v=json.loads(get('https://commons.wikimedia.org/w/api.php?'+q));info=list(v['query']['pages'].values())[0]['imageinfo'][0];meta=info['extmetadata'];lic=clean(meta.get('LicenseShortName',{}).get('value',''))
  if not lic or not any(x in lic.lower() for x in ['cc','public domain']):print('Unclear license',file,lic,flush=True);return
  url=info.get('thumburl',info['url']);raw=get(url);ext='.png' if '.png' in urllib.parse.urlparse(url).path.lower() else '.jpg';target=ROOT/'public'/'media'/(d['id']+ext);target.write_bytes(raw)
  m={'path':'media/'+target.name,'author':clean(meta.get('Artist',{}).get('value','Unknown')),'license':lic,'licenseUrl':meta.get('LicenseUrl',{}).get('value','https://creativecommons.org/publicdomain/mark/1.0/'),'pageUrl':info.get('descriptionurl'),'caption':clean(meta.get('ImageDescription',{}).get('value',''))[:500]}
  out.write_text(json.dumps(m,ensure_ascii=False,indent=2));print(d['id'],lic,len(raw),flush=True)
 except Exception as e:print(d['id'],str(e),flush=True)
with ThreadPoolExecutor(max_workers=1) as pool:list(pool.map(job,[p for p in sorted((ROOT/'content'/'research').glob('*.json')) if '.media.' not in p.name]))
