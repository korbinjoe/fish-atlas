"""Build reviewed native-waterbody links. Requires FishBase 26.06 cache, pyarrow,
pyshp and shapely; Natural Earth 10m lakes/marine shapes passed as directory.
No country/continent labels are turned into river assignments. Native ecosystem
records are an allowlist, with explicit taxonomic/introduced exceptions below.
"""
import json, re, sys
from pathlib import Path
import shapefile
import pyarrow.parquet as pq
from shapely.geometry import shape, mapping
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
fb=json.loads((ROOT/'content/research/fishbase-distribution.json').read_text())
fish=fb['species']; bodies={}; output={}
ecoref={r['E_CODE']:r for r in pq.read_table(Path(sys.argv[2])/'ecosystemref.parquet').to_pylist()}
geo=Path(sys.argv[1]); shapes={}
for layer in ['lakes','geography_marine_polys']:
 for sr in shapefile.Reader(str(geo/layer/f'ne_10m_{layer}.shp')).iterShapeRecords():
  d=sr.record.as_dict(); shapes.setdefault(d['name'],[]).append((shape(sr.shape.__geo_interface__),d))
def geometry(g):
 if g.geom_type=='MultiPolygon':g=type(g)([orient(p,sign=-1) for p in g.geoms])
 else:g=orient(g,sign=-1)
 def rounded(v):
  if isinstance(v, (list,tuple)):return [rounded(x) for x in v]
  if isinstance(v,dict):return {k:rounded(x) for k,x in v.items()}
  return round(v,4) if isinstance(v,float) else v
 return rounded(mapping(g))
def body(id,name,label,kind,source_names=None,point=None,source=None):
 if id in bodies:return id
 rows=[row for n in (source_names or []) for row in shapes.get(n,[])]
 obj={'id':id,'name':name,'label':label,'kind':kind,'center':point,'geometry':None,'sourceUrl':source or 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/','coordinateMethod':'source-anchor' if point else 'polygon-interior'}
 if rows:
  g=unary_union([r[0] for r in rows]).simplify(.015,preserve_topology=True);p=g.representative_point();obj['center']=[round(p.x,5),round(p.y,5)];obj['geometry']=geometry(g)
 assert obj['center'],id
 bodies[id]=obj;return id
lake_defs={12:('lake-malawi','Lake Malawi','马拉维湖'),4:('lake-tanganyika','Lake Tanganyika','坦噶尼喀湖'),214:('lake-biwa','Biwa Ko','琵琶湖')}
for code,(id,n,l) in lake_defs.items():body(id,n,l,'lake',[n])
for id,n,l in [('lake-nicaragua','Lago de Nicaragua','尼加拉瓜湖'),('lake-managua','Lago de Managua','马那瓜湖'),('lake-valencia','Lago de Valencia','瓦伦西亚湖')]:body(id,n,l,'lake',[n])
body('lake-inle','Inle Lake','茵莱湖','lake',point=[96.916092,20.547351],source='https://www.geonames.org/search.html?country=MM&q=Inle+Lake')
body('lake-sentani','Lake Sentani','仙谷湖（Sentani）','lake',point=[140.5172,-2.6122],source='https://www.geonames.org/2082459/danau-sentani.html')
body('lake-ajamaru','Ayamaru Lakes','阿亚马鲁湖群','lake',point=[132.2,-1.25],source='https://en.wikipedia.org/wiki/Ayamaru_Lakes')
# Exact named marine areas. Combined FishBase ecosystem names remain combined.
sea_defs={5:('Red Sea','红海'),11:('South China Sea','南海'),109:('Bay of Bengal','孟加拉湾'),110:('Andaman Sea','安达曼海'),105:('Arabian Sea','阿拉伯海'),106:('Persian Gulf','波斯湾'),107:('Gulf of Aden','亚丁湾'),108:('Gulf of Oman','阿曼湾'),257:('Yellow Sea','黄海'),258:('East China Sea','东海'),260:('Gulf of Thailand','泰国湾'),129:('Tasman Sea','塔斯曼海'),13:('Mediterranean Sea','地中海'),145:('Caribbean Sea','加勒比海'),144:('Gulf of Mexico','墨西哥湾'),138:('Norwegian Sea','挪威海'),139:('North Sea','北海'),533:('Irish Sea','爱尔兰海'),525:('Gulf of Aqaba','亚喀巴湾'),548:('Aegean Sea','爱琴海'),549:('Sea of Marmara','马尔马拉海'),1104:('Ionian Sea','爱奥尼亚海'),165:('Golfo de California','加利福尼亚湾')}
sea_codes={}
for code,(n,l) in sea_defs.items():
 if n in shapes:sea_codes[code]=body(f'sea-{code}',n,l,'sea',[n])
for code,n,l,parts in [(126,'Sulu-Celebes Sea','苏禄—西里伯斯海',['Sulu Sea','Celebes Sea']),(128,'Coral Sea and GBR','珊瑚海与大堡礁',['Coral Sea','Great Barrier Reef']),(243,'Great Barrier Reef','大堡礁海域',['Great Barrier Reef']),(245,'Indonesian Sea','印度尼西亚群岛海域',['Java Sea','Banda Sea','Bali Sea','Molucca Sea','Flores Sea','Savu Sea']),(130,'Peru-Galapagos Waters','秘鲁—加拉帕戈斯海域',[]),(166,'Insular Pacific-Hawaiian','夏威夷群岛海域',[]),(268,'East Brazil Shelf','巴西东岸海域',[]),(269,'South Brazil Shelf','巴西南岸海域',[]),(114,'Patagonian Shelf','巴塔哥尼亚大陆架海域',[]),(164,'New Zealand Shelf','新西兰近海',[]),(263,'East Central Australian Shelf','澳大利亚东岸海域',[]),(264,'Southeast Australian Shelf','澳大利亚东南近海',[]),(148,'Guinea Current','几内亚湾海域',['Gulf of Guinea']),(127,'Polynesian Waters','波利尼西亚海域',[]),(267,'Northwest Australian Shelf','澳大利亚西北近海',[])]:
 r=ecoref[code];lat=(r['LatDegFill'] or 0)+(r['LatMinFill'] or 0)/60;lon=(r['LongDegFill'] or 0)+(r['LongMinFill'] or 0)/60
 if r['NorthSouthFill']=='S':lat=-lat
 if r['EastWestFill']=='W':lon=-lon
 sea_codes[code]=body(f'sea-{code}',n,l,'sea',parts,point=None if parts else [round(lon,5),round(lat,5)],source=None if parts else f'https://www.fishbase.se/Ecosystems/EcosystemSummary.php?ve_code={code}')
# Sources identify ranges as oceans only; preserve that precision rather than
# inventing a particular named sea. FishBase's ecosystem anchors are display positions.
for code in [7,8,9]:
 r=ecoref[code];lon=(r['LongDegFill'] or 0)+(r['LongMinFill'] or 0)/60;lat=(r['LatDegFill'] or 0)+(r['LatMinFill'] or 0)/60
 if r['EastWestFill']=='W':lon=-lon
 if r['NorthSouthFill']=='S':lat=-lat
 sea_codes[code]=body(f'sea-{code}',r['EcosystemName'],{7:'印度洋（宽泛分布）',8:'大西洋（宽泛分布）',9:'太平洋（宽泛分布）'}[code],'sea',point=[lon,lat],source=f'https://www.fishbase.se/Ecosystems/EcosystemSummary.php?ve_code={code}')
# Special native endemics, using geographically named anchors rather than a whole ocean.
body('sea-banggai','Banggai Archipelago','邦盖群岛近海','sea',point=[123.5,-1.6],source='https://www.fisheries.noaa.gov/s3/2021-10/Banggai%20cardinalfish%205%20year%20review.pdf')
# Basin allowlist: tributaries collapse to their named parent drainage.
basin_ecos={1:'3203',53:'3234',63:'3203',1171:'3203',1172:'3203',43:'3247',19:'3238',48:'3238',528:'3238',71:'3248',21:'2421',161:'2403',157:'2319',441:'2420',22:'2401',57:'4405',74:'3227',34:'2309',358:'2309',41:'2302',52:'2306',353:'2306',354:'2306',356:'2306',1170:'2306',314:'2312',312:'2303',14:'2433',824:'2437',364:'6243',597:'6241',32:'3203',70:'3203',1134:'4406',38:'3245',47:'3247',946:'2426',60:'2310',6:'1209'}
for code in [791,793,794,797,801,803,804,807,808,809,811,813,815,818,821,822]:basin_ecos[code]='1209'
# These source records conflict with current range text or are introduced.
blocked={'wm-acantopsis-dialuzona':set(basin_ecos),'wm-carassius-auratus':set(basin_ecos)-{14,824},'wm-macropodus-opercularis':{22,21},'wm-cobitis-bilineata':{83,333},'wm-andinoacara-pulcher':{74},'wm-pethia-conchonius':{312,314,315}}
text_rules={'Amazon':'3203','Solim':'3203','Negro River':'3203','Ucayali':'3203','Madeira':'3203','Mamor':'3203','Guapor':'3203','Tapaj':'3203','Xingu':'3203','Orinoco':'3234','Meta River':'3234','Paraguay':'3238','Paraná':'3238','Uruguay':'3248','Mekong':'2421','Chao Phraya':'2403','Indus':'2309','Brahmaputra':'2302','Ganges':'2306','Yangtze':'2433','Kelani':None,'Essequibo':'3219','Mamberamo':'5423','São Francisco':'3245','Araguaia':'3247','Colorado River':'4405','San Juan River':'4240','Chindwin':'2310','Congo River':'1209','Durance':'6243','Po to Soca':'6241'}
for id,s in fish.items():
 text=next((d['text'] for d in s['distribution'] if d['level']=='species in general'),'');native=re.split(r'Introduced|introduced|Africa:  Feral',text)[0];links=[]
 def add(place,evidence,source=s['url'],code=None):
  if not any(x['locationId']==place for x in links):links.append({'locationId':place,'evidence':evidence,'sourceUrl':source,'ecosystemCode':code})
 if not s['marine']:
  for e in s['ecosystems']:
   code=e['E_CODE']
   if str(e['Status']).lower() not in ['native','endemic'] or str(e['CurrentPresence']).lower()!='present':continue
   if code in basin_ecos and code not in blocked.get(id,set()):add(basin_ecos[code],f"FishBase: {e['EcosystemName']} · {e['Status']} / {e['CurrentPresence']}",code=code)
   if code in lake_defs:add(lake_defs[code][0],f"FishBase: {e['EcosystemName']} · {e['Status']} / {e['CurrentPresence']}",code=code)
  for term,place in text_rules.items():
   if place and term.lower() in native.lower():add(place,f'原生分布段落提及 {term}')
  for term,place in [('Lake Inle','lake-inle'),('Lake Sentani','lake-sentani'),('Ajamaru','lake-ajamaru'),('Lake Valencia','lake-valencia'),('Lakes Nicaragua','lake-nicaragua'),('Managua','lake-managua')]:
   if term.lower() in native.lower():add(place,f'原生分布段落提及 {term}')
  # Lake endemics must not be broadened to their outlet drainage.
  if id=='wm-danio-erythromicron':links=[x for x in links if x['locationId']=='lake-inle']
 else:
  for e in s['ecosystems']:
   code=e['E_CODE']
   if code in sea_codes and str(e['Status']).lower() in ['native','endemic'] and str(e['CurrentPresence']).lower()=='present':add(sea_codes[code],f"FishBase: {e['EcosystemName']} · {e['Status']} / {e['CurrentPresence']}",code=code)
  # Restrict narrowly endemic taxa even where legacy ecosystems use a wider ocean.
  restrict={'pterapogon-kauderni':['sea-banggai'],'wm-anampses-cuvier':['sea-166'],'wm-pseudochromis-fridmani':['sea-5','sea-525'],'wm-arothron-diadematus':['sea-5'],'wm-amblyglyphidodon-flavilatus':['sea-5','sea-107']}
  if id in restrict:
   links=[]
   for place in restrict[id]:add(place,'物种原生分布明确限定于该海域')
  # Tropical reef records labelled as Yellow Sea in legacy ecosystem joins
  # conflict with the species range; accept that sea only when explicitly named.
  if 'yellow sea' not in native.lower():links=[x for x in links if x['locationId']!='sea-257']
  narrower={
   'wm-amphiprion-percula':['sea-243','sea-128'],
   'wm-aphanius-fasciatus':['sea-13','sea-548','sea-549','sea-1104'],
   'wm-zebrasoma-flavescens':['sea-166','sea-9'],
   'wm-acanthistius-cinctus':['sea-263','sea-264','sea-129','sea-164','sea-9'],
   'wm-acanthistius-ocellatus':['sea-263','sea-264','sea-129','sea-164','sea-9'],
   'wm-alticus-monochrus':['sea-7'],
   'wm-achoerodus-viridis':['sea-264','sea-263','sea-129','sea-9'],
   'wm-chaetodon-andamanensis':['sea-110','sea-109','sea-7'],
   'wm-centrolabrus-exoletus':['sea-138','sea-139','sea-533','sea-8'],
  }
  if id in narrower:links=[x for x in links if x['locationId'] in narrower[id]]
  # Keep specific waterbodies ahead of ocean-wide labels.
  links.sort(key=lambda x: (x['locationId'] in ['sea-7','sea-8','sea-9'], -int(x['locationId'].split('-')[-1]) if x['locationId'].split('-')[-1].isdigit() else 0))
 output[id]={'scientific':s['scientific'],'acceptedScientific':s['acceptedScientific'],'sourceUrl':s['url'],'snapshot':s['snapshot'],'rangeText':text,'rangeRef':next((d['ref'] for d in s['distribution'] if d['level']=='species in general'),None),'links':links,'unlocatedReason':'资料目前仅明确到国家或区域，尚未核实具体水域。' if not links else ''}
# Reviewed supplements, with a source at every species-location relation.
def supplement(id,places,evidence,url=None,replace=False):
 o=output[id]
 if replace:o['links']=[]
 for p in places:
  if not any(x['locationId']==p for x in o['links']):o['links'].append({'locationId':p,'evidence':evidence,'sourceUrl':url or o['sourceUrl'],'ecosystemCode':None})
 o['unlocatedReason']=''
SF='https://www.seriouslyfish.com/species/'
supplement('wm-acantopsis-octoactinotos',['5417'],'2017 Acantopsis 分类修订明确记载 Kinabatangan / Segama 原生河流。','https://mapress.com/zt/article/download/zootaxa.4341.2.1/12794/12814')
supplement('wm-alfaro-cultratus',['4240'],'分布条目列出 San Juan、Sarapiqui、Sapoa 等河流。',SF+'alfaro-cultratus')
supplement('wm-microdevario-kubotai',['2319'],'原生记录包括萨尔温江所属 Ataran 和 Suriya；湄克隆 Songgaria 为引入，排除。',SF+'microdevario-kubotai')
supplement('wm-tanichthys-albonubes',['2437'],'模式产地广州白云山与珠江三角洲；其余沿海独立种群未推断流域。',SF+'tanichthys-albonubes')
supplement('wm-puntigrus-tetrazona',['5414','5419'],'新版分布记载 Sumatra 的 Batang Hari 和 Indragiri；不采用未核实的婆罗洲旧记录。',SF+'puntigrus-tetrazona',replace=True)
supplement('chromobotia-macracanthus',['5414'],'IUCN 评估明确 Batang Hari 与 Musi 原生种群。','https://doi.org/10.2305/IUCN.UK.2020-2.RLTS.T89807166A89807177.en')
supplement('trigonostigma-hengeli',['5414'],'模式标本来自 Tambesi，属于 Batang Hari 流域。',SF+'trigonostigma-hengeli')
supplement('wm-pseudomugil-gertrudae',['5434','5407'],'分布明确 Fly、Daly 等河流；淡水鱼不放到相邻阿拉弗拉海。',SF+'pseudomugil-gertrudae')
supplement('wm-danio-margaritatus',['2319'],'原资料已明确萨尔温江水系上游支流。',SF+'danio-margaritatus')
supplement('wm-hemigrammus-erythrozonus',['3219'],'FishBase 原生分布仅明确 Essequibo；移除旧的库兰太因关联。',replace=True)
supplement('wm-osphronemus-laticlavius',['5417'],'现有物种词条明确 Kinabatangan 分布。','https://en.wikipedia.org/wiki/Giant_red_tail_gourami')

# Additional sources resolve several initially country-only records.
supplement('trichopodus-leerii',['5415'],'博物馆标本目录记录 Kapuas 流域多处采集。','https://file.iflora.cn/fastdfs/group1/M00/64/0B/wKhnoV2IAVmAbKz-ATGoVqySogc513.pdf')
supplement('wm-danionella-dracula',['2310'],'原生水域 Mogaung Chaung 为伊洛瓦底江支流。',SF+'danionella-dracula')
supplement('wm-hypancistrus-zebra',['3203'],'Xingu 河局限河段的原生特有种；关联其亚马孙父流域，非整流域分布。','https://onlinelibrary.wiley.com/doi/10.1155/2023/5158180')
supplement('wm-moenkhausia-bonita',['3238'],'模式产地 Rio Miranda 属于 Paraguay—Paraná 流域。')
supplement('wm-amatitlania-nigrofasciata',['4226','4429'],'分布段落明确 Patuca / Suchiate；排除旧种广义范围中的尼加拉瓜和哥斯达黎加。')
supplement('wm-poecilia-latipinna',['4205','sea-144'],'原生分布明确 Cape Fear 及墨西哥湾沿岸；广盐性鱼可关联河流与海湾。')
supplement('wm-xiphophorus-maculatus',['4225'],'Papaloapan 原生标本与分布。','https://www.biodiversidad.gob.mx/pdf/libros/paguadulceB.pdf')
supplement('wm-xiphophorus-variatus',['4224'],'原生范围包括 Río Pánuco 水系。','https://www.biodiversidad.gob.mx/pdf/libros/paguadulceB.pdf')
body('river-balsas','Balsas River','巴尔萨斯河流域','river',point=[-100,17.95],source='https://www.fishbase.se/Ecosystems/EcosystemSummary.php?ve_code=554')
supplement('wm-poecilia-sphenops',['river-balsas'],'FishBase 记录巴尔萨斯原生水系；容易与 P. mexicana 混淆。')
body('river-caroni-trinidad','Caroni River (Trinidad)','卡罗尼河（特立尼达）','river',point=[-61.5,10.616667],source='https://www.wikidata.org/wiki/Q5045524')
supplement('wm-poecilia-reticulata',['river-caroni-trinidad'],'原生种群研究明确特立尼达 Caroni 河流域；不采用其它大陆的引入地。','https://onlinelibrary.wiley.com/doi/full/10.1111/j.1420-9101.2008.01675.x')
body('lake-campoma','Laguna Campoma','坎波马潟湖','lake',point=[-63.516667,10.530556],source='https://geographic.org/geographic_names/name.php?c=venezuela&fid=6587&uni=-1386683')
supplement('wm-poecilia-wingei',['lake-campoma'],'FishBase 与加州科学院模式产地均记载 Campoma。','https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=68976')

body('river-kelani','Kelani River','凯拉尼河流域','river',point=[79.87,6.97889],source='https://en.wikipedia.org/wiki/Kelani_River')
supplement('wm-belontia-signata',['river-kelani'],'原生分布明确 Kelani、Kalu 和 Mahaweli 河流域。')
supplement('wm-puntius-titteya',['river-kelani'],'原生分布明确 Sri Lanka 的 Kelani 至 Nilwala 河流域。')
body('river-barito','Barito River','巴里托河流域','river',point=[114.491111,-3.515278],source='https://www.wikidata.org/wiki/Q979518')
supplement('wm-betta-anabatoides',['river-barito'],'原生分布明确下 Barito 及中加里曼丹若干独立水系。')
# A reviewed, versioned allowlist resolves the final country-only records.
# Coordinates and species evidence stay separate: a named river's display anchor
# is not automatically a fish observation, nor a boundary of its natural range.
review=json.loads((ROOT/'content/research/remaining-reviewed-distributions.json').read_text())
known_basins={b['id'] for b in json.loads((ROOT/'content/major-basins.json').read_text())}
for loc in review['locations']:
 assert loc['id'] not in bodies,loc['id']
 assert loc['kind'] in ['river','lake','sea'] and loc['sourceUrl'].startswith('https://'),loc['id']
 lon,lat=loc['center'];assert -180<=lon<=180 and -90<=lat<=90,loc['id']
 body(loc['id'],loc['name'],loc['label'],loc['kind'],point=loc['center'],source=loc['sourceUrl'])
 bodies[loc['id']]['anchorNote']=loc['anchorNote']
for record in review['species']:
 o=output[record['fishId']]
 # These were unlocated, so every association must come from the reviewed list.
 assert not o['links'],record['fishId']
 for link in record['links']:
  assert link['locationId'] in bodies or link['locationId'] in known_basins,link['locationId']
  assert link['sourceUrl'].startswith('https://') and link['evidence'],record['fishId']
  o['links'].append(link)
 o['reviewNotes']=record['reviewNotes'];o['reviewConfidence']=record['confidence']
 o['unlocatedReason']='' if o['links'] else o['unlocatedReason']
# Normalized geodata and compact runtime evidence; full extraction stays in research/.
(ROOT/'content/waterbodies.json').write_text(json.dumps(list(bodies.values()),ensure_ascii=False,separators=(',',':'))+'\n')
(ROOT/'content/distributions.json').write_text(json.dumps({'provider':fb['provider'],'version':fb['version'],'license':'CC BY-NC 3.0','licenseUrl':'https://fishbaseapi.readme.io/reference/license','species':output},ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print('Located',sum(bool(s['links']) for s in output.values()),'/',len(output),'bodies',len(bodies))
print('Unlocated',[(id,o['rangeText']) for id,o in output.items() if not o['links']])
