"""Build the curated atlas from reviewed summaries and cached source facts. No network."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
# Chinese text is editorial synthesis; numeric values retain the source's measurement basis.
notes={
'paracheirodon-innesi':['森林溪流','蓝绿光带与后半身红色相遇，是雨林溪流里的一抹微光。','已知来自巴西、秘鲁与哥伦比亚的亚马孙支流；完整自然分布仍有不确定性。','通常温和，来源建议以 8–10 条或更多的群体饲养。','避免与能吞食它的大型鱼同养；人工繁育个体与野生个体的适应性可能不同。','#69cce0','slender','霓虹灯|Neon tetra'],
'paracheirodon-axelrodi':['黑水支流','明亮的蓝线下是一整条红色，像在黑水中游动的灯。','巴西内格罗河中上游及部分支流，也见于奥里诺科水系；本站在亚马孙区域收录。','偏好同类群体，来源建议至少 8–10 条，并选择体型接近的温和同伴。','相似外形不代表与红绿灯需求完全相同；不要仅按颜色选择混养对象。','#f27069','slender','红莲灯|Cardinal tetra'],
'paracheirodon-simulans':['黑水溪流','细小的身体上，一条蓝绿色光带格外醒目。','巴西内格罗河中上游，以及委内瑞拉与哥伦比亚交界的部分奥里诺科水系。','以群体生活，适合单独观赏或与很小且不具攻击性的鱼共处。','来源列出的温度跨度很大，不能将上限当成长期饲养目标；选购前需进一步核实来源条件。','#70d5b6','slender','绿霓虹灯|Green neon tetra'],
'pterophyllum-scalare':['河流缓水区','高耸的背鳍与臀鳍，让身体像一片竖立在水中的银叶。','包括秘鲁、巴西等地的亚马孙水系，也见于圭亚那地区的部分河流。','同类间会发生争执，体型较小时温和的表现不代表成年后没有捕食风险。','可捕食小型灯鱼。所列体长不包含鳍展开后的整体高度，缸高同样重要。','#d7c68e','angel','燕鱼|Angelfish'],
'hemigrammus-bleheri':['河流支流','红色头部与黑白尾纹，让紧密游动的鱼群容易辨认。','来源记录为哥伦比亚与巴西的梅塔河、内格罗河；具体分布请核对原文。','温和且群游明显，来源建议至少 10 条，避免大型或过分活跃的同伴。','相近的红鼻鱼容易混淆。本条旧学名 Hemigrammus bleheri 也保留用于检索。','#d39588','slender','红头剪刀|Petitella bleheri|Rummy nose tetra'],
'nannostomus-beckfordi':['林间缓流水域','细长的身体带着纵向条纹，像一支轻巧的水下铅笔。','圭亚那地区河流及巴西亚马孙东部，也有内格罗河下游等地的记录。','来源建议较大的同类群体，通常不适合与过于活跃或体型悬殊的鱼共处。','小缸中不宜与安静的表层鱼强行搭配；同类互动也需要空间。','#d0af76','slender','铅笔鱼|Golden pencilfish'],
'carnegiella-strigata':['水面与林间溪流','胸腹部轮廓宽阔，如一把小斧头，身体上布满大理石般的纹路。','广泛记录于亚马孙及部分相邻水系，来源提示其分类与分布范围仍有讨论。','偏中上层活动，同类群居；来源建议尽可能组成较大群体。','小型、胆怯的鱼，不宜与强势或体型悬殊的同伴混养。','#c1c3a9','round','斧头鱼|Marbled hatchetfish'],
'apistogramma-cacatuoides':['上游支流','雄鱼背鳍前部的高耸鳍条，让它有了凤尾般的轮廓。','亚马孙上游，从秘鲁乌卡亚利河、亚马孙河到巴西西部索利蒙伊斯河。','来源区分人工繁育与野生个体；野生个体更适合单养或配温和小鱼。','不同短鲷混养需谨慎。体长按来源雄鱼标准体长列示，雌鱼通常较小。','#e4a460','round','Cockatoo dwarf cichlid'],
'symphysodon-aequifasciatus':['亚马孙缓流水域','圆盘状的侧扁身体，是七彩神仙最鲜明的轮廓。','索利蒙伊斯河及亚马孙干流一带；圭亚那、苏里南的引入种群不列为原生地。','本版尚未补全该条的行为与水质建议，请阅读原始资料后判断。','商品七彩包含多种人工品系及复杂来源，不能把所有商品鱼直接归为这一野生种。','#d99d76','round','Discus'],
'hyphessobrycon-eques':['河流与植被水域','鲜红的身体和黑色鳍斑很醒目，活跃的性格同样需要留意。','巴西、秘鲁、玻利维亚的亚马孙水系，也分布于巴拉圭河流域。','同类间建立松散等级，来源建议至少 12 条以分散相互作用。','可能追咬其他鱼的鳍；数量少、空间不足时尤其需要注意。','#d96b5d','round','血心红裙|Serpae tetra'],
'betta-splendens':['沼泽与缓流水域','斗鱼能从水面呼吸空气；常见长鳍照片多来自人工培育品系。','自然分布以泰国中部至马来半岛北缘为主。其他地区的部分记录属于引入或相似物种。','通常以单独饲养为稳妥起点，同类特别是雄鱼间可能发生严重冲突。','不因同样是小型鱼就默认能合养；长鳍、相似外形及繁殖状态都可能影响冲突。','#b076b8','betta','泰国斗鱼|Siamese fighting fish'],
 'trichopodus-leerii':['沼泽与植被水域','细密珠点洒在身体和鳍上，腹鳍像两条细长的触须。','泰国、马来西亚、婆罗洲与苏门答腊；新加坡和哥伦比亚存在引入记录。','总体较温和，但雄鱼之间及繁殖期间可能产生领地行为。','避免强势、过度活跃的同伴，准备足够的植物与隐蔽空间。','#b8a17f','round','珍珠鱼|Pearl gourami'],
 'trichopsis-pumila':['湄公河及缓水区','小小的身体上有闪烁色点，是体型很小的迷鳃鱼。','湄公河下游，涉及老挝、越南、柬埔寨和泰国，也见于泰国中南部水系。','可成对或小群饲养，适合同样温和、体型接近的同伴。','来源提到捕食小型观赏虾的经历，不能承诺鱼虾混养绝对安全。','#88b8b2','slender','小丽丽|Sparkling gourami'],
 'trigonostigma-heteromorpha':['森林沼泽','银铜色身体后方的大块黑色三角，是它最常见的识别特征。','马来半岛、新加坡及附近部分岛屿；大巽他群岛的完整分布仍需进一步厘清。','温和的群游鱼，适合经过选择的群养组合。','要考虑成年体型及同伴捕食风险，不能仅凭“温和”标签完成混养决策。','#d4ae83','slender','三角波鱼|Harlequin rasbora'],
 'trigonostigma-espei':['溪流与植被水域','橙红身体上的黑色楔形斑，比三角灯更细长。','泰国西南、东南部与柬埔寨部分水系，另有越南富国岛种群。','偏好同类群体，来源建议至少 8–10 条。','不同产地颜色可能不同；与相似波鱼的区别应结合可靠照片和学名。','#e8a46c','slender','Espei rasbora'],
 'trigonostigma-hengeli':['苏门答腊水系','黑色楔形斑上方的一线橙光，像身体侧面的细小灯带。','确认记录涉及苏门答腊占碑及淡柏西河；婆罗洲部分报告在来源中仍标为不明确。','群游，来源建议至少 8–10 条，并搭配体型接近的温和同伴。','自然分布存在资料缺口，本站不把未确认地区绘制成确定边界。','#e3bc82','slender','Hengel rasbora'],
 'boraras-brigittae':['婆罗洲黑水区','红色身体上有暗色纵斑，是适合细看的一种微型波鱼。','主要记录于婆罗洲西南部，涉及南加里曼丹及相邻水系，记录仍较少。','小而胆怯，来源建议 8–10 条以上的群体，与相近体型的鱼相处。','体型小不等于能放进任意小容器；留意投喂竞争与稳定环境。','#ed806e','slender','蚊子灯|Chili rasbora'],
 'boraras-maculatus':['森林溪流','身体侧面的深色圆斑，是这条微型波鱼的视觉重点。','马来半岛、泰国南部、苏门答腊东部、新加坡及民丹岛等地。','同类群居、较胆怯，来源建议至少 8–10 条。','不要与明显更大或抢食猛烈的鱼混养；产地间体色可能存在差异。','#dba087','slender','Dwarf rasbora'],
 'pangio-kuhlii':['沙底与隐蔽处','细长身体上的深浅环带，让它在底部阴影里很有辨识度。','来源列出马来半岛及大巽他群岛部分地区，同时指出分类与分布仍有疑问。','喜欢与同类聚集，来源建议至少 5–6 条，并提供隐蔽空间。','商售条纹泥鳅可能来自相近物种；也可能捕食鱼卵或幼鱼。','#c6a772','loach','苦力泥鳅|Kuhli loach'],
 'chromobotia-macracanthus':['岛屿河流','橙色身体上的三条黑带非常醒目；幼鱼会成长为大型泥鳅。','婆罗洲与苏门答腊的多条河流，各地种群在花纹及体型等方面可能不同。','具有群居与社会等级行为，需要按成年体型准备宽敞空间。','不要把幼鱼尺寸当成成鱼尺寸；长鳍、慢游鱼可能被追咬。','#e4ae67','loach','小丑泥鳅|Clown loach'],
 'labidochromis-caeruleus':['马拉维湖岩区','常见黄色品系十分醒目，但本物种并非所有产地都呈鲜黄色。','马拉维湖北部；电光黄形态在来源中对应更局部的湖岸范围。','在马拉维湖丽鱼中相对温和，繁殖期仍会维护领地。','需要考虑硬水环境与同伴性格；不能直接与软水鱼按颜色拼缸。','#e6d275','round','黄王子|Electric yellow cichlid'],
 'pseudotropheus-demasoni':['马拉维湖岩区','深浅蓝色竖纹几乎覆盖全身，强烈的领地性也很突出。','马拉维湖坦桑尼亚岸的 Pombo Rocks 附近，来源记录范围较局部。','对同类及相似花纹的鱼可能非常强势。','并非普通温和混养鱼，不能只凭体型小就把它放进小型群养缸。','#7298c8','round','德氏拟丽鱼|Chindongo demasoni|Demasoni'],
 'melanochromis-auratus':['马拉维湖岩区','纵向条纹是它的特征，成年雄雌的体色可能显著不同。','马拉维湖西岸、南部及东岸部分区域。','具有很强的攻击性与领地性，同类之间也可能发生严重冲突。','即使多配雌鱼也不保证消除攻击，不适合温和鱼组成的普通混养缸。','#d9c282','slender','黄金斑马|Golden mbuna'],
 'pseudotropheus-socolofi':['马拉维湖岸','淡蓝色身体与深色鳍边形成清晰对比，商售白化品系需单独识别。','马拉维湖莫桑比克岸 Cobue 至 Tumbi Point 一带；其他部分地区有引入。','雄鱼有领地性，多个雄鱼需要更大的空间。','在岩栖丽鱼中相对不那么强势，仍不适合普通综合混养缸。','#9cbdd4','round','索氏拟丽鱼|Chindongo socolofi|Pindani'],
 'julidochromis-ornatus':['坦噶尼喀湖岩区','修长的身体上排列着深色纵纹，常在岩石边缘活动。','坦噶尼喀湖特有种，具体记录见原始鱼种资料。','配对与领地行为需要结合岩石布局和足够的空间考虑。','同为湖区鱼也不意味着可以直接混养，需关注领地重叠。','#c9b986','slender','金茱莉|Golden julie'],
 'neolamprologus-multifasciatus':['坦噶尼喀湖贝壳区','体型虽小，却会认真守护自己的贝壳和周边领地。','坦噶尼喀湖特有种。地图上的东非入口并非具体贝壳床位置。','可形成群落，需准备足够贝壳与底部空间。','不要因为个体小就忽略领地需求；底部空间比单独看水体积更有意义。','#c7b797','slender','多带贝鱼|Multies'],
 'neolamprologus-brichardi':['坦噶尼喀湖岩区','延长的鳍缘和优雅尾鳍，给它带来轻盈的外观。','坦噶尼喀湖，主要涉及布隆迪、坦桑尼亚及刚果（金）湖岸的北部种群。','会持续维护领地，育幼期间尤甚，单品种缸更容易规划。','与近缘 brichardi 复合群混养可能杂交；也需要避免其他岩栖鱼领地重叠。','#cbbdc7','angel','Princess of Burundi'],
 'neolamprologus-leleupi':['坦噶尼喀湖岩区','鲜明的黄橙色与修长轮廓，让它成为湖区鱼中的亮色。','坦噶尼喀湖南部，来源认为在这一部分分布较广。','繁殖期领地性增强，同类之间可能发生强烈攻击。','不宜与强势的马拉维湖岩栖鱼混搭；需要考虑足够的岩隙与分区。','#edc468','slender','黄珍珠|Lemon cichlid'],
 'cyphotilapia-frontosa':['坦噶尼喀湖北部','宽阔额部和黑白竖纹构成了六间鱼稳重的轮廓。','坦噶尼喀湖北部，来源列出西岸 Cape Tembwe 至东岸 Bulu Point 间的范围。','群居并形成等级，来源建议至少 5 条，条件允许时更大群体。','可能吞食明显更小的鱼。需按成鱼群体准备大型鱼缸，不能按幼鱼阶段规划。','#a5b7d1','round','布隆迪六间|Frontosa'],
 'cyprichromis-leptosoma':['坦噶尼喀湖开阔水层','细长的身体适合开阔水层活动，雄鱼色彩因个体与产地而异。','坦噶尼喀湖特有种。','温和且群居，来源建议至少 8 条，并给出充分的游动空间。','避免过于强势的同伴；不同水层的分工也不能代替空间与行为评估。','#a6bdd9','slender','Sardine cichlid'],
}
seed=json.loads((ROOT/'content/seed.json').read_text());out=[]
for row in seed:
 id=row['id'];raw=json.loads((ROOT/'content/research'/f'{id}.json').read_text());s=raw.get('text','');q=s[s.find('Quick facts'):s.find('Difficulty')];n=notes[id]
 def number(pattern):
  m=re.search(pattern,q);return float(m.group(1)) if m else None
 def rng(label,end):
  m=re.search(label+r'([\d.]+)[–-]([\d.]+)'+end,q);return [float(m.group(1)),float(m.group(2))] if m else None
 length=number(r'Length(?:♂\s*)?(\d+(?:\.\d+)?)')
 m=ROOT/'content/research'/f'{id}.media.json';photo=json.loads(m.read_text()) if m.exists() else None
 name=row['name']
 if id=='neolamprologus-leleupi':name='黄珍珠丽鱼'
 if id=='pseudotropheus-socolofi':name='索氏岩栖丽鱼'
 sci=id.replace('-',' ').capitalize()
 out.append(dict(id=id,name=name,scientific=sci,aliases=n[7].split('|'),region=row['region'],family='',habitat=n[0],description=n[1],distribution=n[2],behavior=n[3],caution=n[4],color=n[5],shape=n[6],length=length/10 if length else None,lengthType='TL' if re.search(r'Length[^\n]*?mm TL',q) else 'SL',tank=number(r'Tank base(\d+)'),temperature=rng('Temp','°C'),ph=rng('pH','Hardness'),hardness=rng('Hardness','dGH'),sourceUrl=raw['sourceUrl'],sourceTitle='Seriously Fish species profile',accessedAt='2026-10-09',reviewStatus='source-checked',photo=photo))
overrides=ROOT/'content/enrichment/overrides.json'
if overrides.exists():
 additions=json.loads(overrides.read_text())
 for f in out:f.update(additions.get(f['id'],{}))
marine=ROOT/'content/marine.json'
if marine.exists():out.extend(json.loads(marine.read_text()))
geography=ROOT/'content/enrichment/geography.json'
if geography.exists():
 taxa=json.loads(geography.read_text())
 for f in out:
  taxon=taxa.get(f['id'],{})
  if taxon.get('review')=='exact-species-match':
   f['family']=taxon.get('family') or f['family']
   accepted=taxon.get('acceptedName')
   if accepted and accepted!=f['scientific'] and accepted not in f['aliases']:f['aliases'].append(accepted)
(ROOT/'content/species.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
(ROOT/'content/media-manifest.json').write_text(json.dumps([dict(speciesId=f['id'],**f['photo']) for f in out if f['photo']],ensure_ascii=False,indent=2))
print('Built',len(out),'species,',sum(bool(f['photo']) for f in out),'licensed photos')
