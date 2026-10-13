"""Read public species profiles and Commons metadata; keep research separate from shipped content."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import urllib.request,urllib.parse,json,re,time
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content'/'research'; OUT.mkdir(exist_ok=True)
SPECIES=[(x['id'],x['name'],x['region']) for x in json.loads((ROOT/'content'/'seed.json').read_text())]
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style']:self.skip+=1
  if tag in ['h1','h2','h3','p','dt','dd','li']:self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ['script','style']:self.skip=max(0,self.skip-1)
 def handle_data(self,d):
  if not self.skip:self.parts.append(d)
def get(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'FishAtlas/0.1 local educational prototype'}),timeout=35).read()
def job(row):
 slug,name,region=row; path=OUT/(slug+'.json')
 if path.exists():return
 result={'id':slug,'name':name,'region':region,'accessedAt':'2026-10-09','sourceUrl':'https://www.seriouslyfish.com/species/'+slug+'/'}
 try:
  t=Text();t.feed(get(result['sourceUrl']).decode());result['text']='\n'.join(x.strip() for x in ''.join(t.parts).splitlines() if x.strip())
 except Exception as e:result['error']=str(e)
 try:
  q=urllib.parse.urlencode({'action':'query','format':'json','prop':'pageimages','piprop':'original','redirects':1,'titles':slug.replace('-',' ')})
  data=json.loads(get('https://en.wikipedia.org/w/api.php?'+q));pages=list(data['query']['pages'].values());result['wiki']=pages[0]
 except Exception as e:result['wikiError']=str(e)
 path.write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(slug,'source' if result.get('text') else 'FAIL','photo' if result.get('wiki',{}).get('original') else '-',flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(job,SPECIES))
(ROOT/'content'/'seed.json').write_text(json.dumps([{'id':s,'name':n,'region':r} for s,n,r in SPECIES],ensure_ascii=False,indent=2))
