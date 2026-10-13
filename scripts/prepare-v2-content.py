"""Curated editorial additions. Reproducible without network."""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1]
def save(p,x):(R/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
profiles=[
 dict(id='amphiprion-ocellaris',name='公子小丑鱼',scientific='Amphiprion ocellaris',aliases=['眼斑双锯鱼','Ocellaris clownfish','尼莫'],family='Pomacentridae',habitat='海葵与珊瑚礁',description='橙色身体上的三道白纹，让这条小鱼很容易被记住。',distribution='原生于印度洋和西太平洋的暖水海域，从琉球群岛、东南亚延伸至澳大利亚西北部。',behavior='与海葵形成共生关系，群体有等级；配对个体在繁殖期维护领地。',caution='“温和”不等于没有领地行为；不要把多条未经配对的小丑鱼直接视为稳定群体。',color='#f0a564',shape='round',length=11,lengthType='TL',tank=None,minVolume=75.71,sourceUrl='https://www.liveaquaria.com/products/ocellaris-clownfish',distributionSource='https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/clown-anemonefish/',lengthSource='https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/clown-anemonefish/'),
 dict(id='paracanthurus-hepatus',name='蓝倒吊',scientific='Paracanthurus hepatus',aliases=['拟刺尾鲷','蓝吊','Blue tang','多莉'],family='Acanthuridae',habitat='外礁与礁区水道',description='明亮蓝色、深色纹路和黄色尾鳍，属于一条需要充足游动空间的海水鱼。',distribution='热带印度洋—西太平洋及中太平洋；澳大利亚记录包括大堡礁、珊瑚海及部分东岸水域。',behavior='活跃的游泳者，需要开阔空间与岩石躲避处；同类间可能发生竞争。',caution='商店里的幼鱼体型不能代表成鱼空间需求，来源建议至少六英尺缸长。',color='#6387e9',shape='round',length=31,lengthType='TL',tank=182.88,minVolume=681.37,sourceUrl='https://www.liveaquaria.com/products/blue-tang-1',distributionSource='https://fishesofaustralia.net.au/home/species/2203',lengthSource='https://fishesofaustralia.net.au/home/species/2203'),
 dict(id='pterapogon-kauderni',name='泗水玫瑰',scientific='Pterapogon kauderni',aliases=['邦盖天竺鲷','Banggai cardinalfish','Kaudern cardinal'],family='Apogonidae',habitat='浅水礁区与海草床',description='银色身体、黑色条纹与散布的白点，组成了这条口孵鱼的鲜明外形。',distribution='原生范围位于印度尼西亚邦盖群岛；观赏鱼贸易也使它在原生范围外出现。',behavior='游动较缓，雄鱼口孵育幼；同类之间可能有攻击，不宜据野外群体现象直接规划大群混养。',caution='需要遮蔽物与温和同伴。来源不建议大群饲养；选购时关注人工繁育来源。',color='#c6c8d1',shape='angel',length=8.64,lengthType='来源未注明 SL/TL',tank=None,minVolume=113.57,sourceUrl='https://www.liveaquaria.com/products/kauderns-cardinal-1',distributionSource='https://www.fisheries.noaa.gov/species/banggai-cardinalfish',lengthSource='https://www.fisheries.noaa.gov/species/banggai-cardinalfish')]
for f in profiles:
 f.update(region='reef',water='marine',temperature=[22.2,25.6],ph=[8.1,8.4],hardness=None,specificGravity=[1.020,1.025],sourceTitle='LiveAquaria',accessedAt='2026-10-09',reviewStatus='source-checked',photo=None,tankNote='容积由来源美制加仑换算为升（1 US gal = 3.785411784 L），不是由缸长推测；岩石和底砂会减少有效水量。',parameterNote='温度由来源 72–78°F 换算为 °C；比重按来源原值保留，不换算为盐度。海水 dKH 与淡水 dGH 含义不同，此处不混用。')
 p=R/'content/research'/(f['id']+'.media.json')
 if p.exists(): f['photo']=json.loads(p.read_text())
save('content/marine.json',profiles)
overrides={
 'hemigrammus-bleheri':{'tank':90,'tankNote':'正文要求至少 10 条群体，缸长至少 90 cm；不能按单鱼缩小缸长。'},
 'symphysodon-aequifasciatus':{'tank':120,'tankWidth':45,'tankHeight':45,'tankNote':'正文 120 × 45 × 45 cm 适用于少量幼鱼或一对繁殖成鱼，不能套用于成年群体。'},
 'julidochromis-ornatus':{'tank':75,'tankWidth':30,'tankHeight':30,'tankNote':'正文 75 × 30 × 30 cm 仅为一对的参考；繁殖段另建议至少 36 英寸缸长。需要洞穴与领地分隔。'},
 'neolamprologus-multifasciatus':{'tank':45,'tankWidth':30,'tankHeight':30,'tankNote':'正文 45 × 30 × 30 cm 仅适用于一对；群落需更大的底部空间和多于鱼数量的贝壳。'},
 'neolamprologus-leleupi':{'tank':75,'tankWidth':30,'tankHeight':30,'tankNote':'正文 75 × 30 × 30 cm 仅适用于一对；同类攻击与繁殖领地另行评估。'},
 'pterophyllum-scalare':{'tankHeight':50,'tankNote':'来源最低尺寸 100 × 40 × 50 cm，成鱼尤其需要高度。'},
 'betta-splendens':{'parameterNote':'pH 6–8 对应人工观赏品系；来源称野生个体可能偏好 pH 5–7。品系未确认时不能直接套用。','tankNote':'45 × 30 cm 是来源参考底面积；行为章节通常建议单养，尺寸段提到一对不代表可长期混养。'},
 'hyphessobrycon-eques':{'tankNote':'80 × 30 cm 对应 12–15 条且不加其他上层鱼；混养需要更大鱼缸。'},
}
for f in json.loads((R/'content/species.json').read_text()):
 if f['region']=='reef':continue
 text=json.loads((R/'content/research'/(f['id']+'.json')).read_text())['text'];q=text[text.find('Quick facts'):text.find('Difficulty')];m=re.search(r'Tank base([\d.]+)\s*×\s*([\d.]+)cm',q)
 if m:overrides.setdefault(f['id'],{})['tankWidth']=float(m.group(2))
save('content/enrichment/overrides.json',overrides)
# These flags are source-backed screening triggers, not a full compatibility matrix.
rules={}
for ids,n in [('paracheirodon-innesi paracheirodon-axelrodi',8),('hemigrammus-bleheri',10),('hyphessobrycon-eques',12),('cyphotilapia-frontosa',5),('cyprichromis-leptosoma',8)]:
 for id in ids.split():rules[id]={'minGroup':n,'source':'https://www.seriouslyfish.com/species/'+id+'/','note':'来源行为或缸体章节的群体下限；增加数量仍需要足够空间。'}
for id in ['betta-splendens','melanochromis-auratus','pseudotropheus-demasoni','neolamprologus-leleupi','julidochromis-ornatus','neolamprologus-multifasciatus','neolamprologus-brichardi']:
 rules.setdefault(id,{}).update(territorial=True,source='https://www.seriouslyfish.com/species/'+id+'/',note='来源描述领地或同类攻击；数量、性别、配对与布局必须单独核对。')
rules['betta-splendens']['solitary']=True
rules['hyphessobrycon-eques']['finNipper']=True
for id in ['pterophyllum-scalare','betta-splendens','trichopodus-leerii','neolamprologus-brichardi']:
 rules.setdefault(id,{}).update(longFins=True,source='https://www.seriouslyfish.com/species/'+id+'/',note='延长鳍形易与咬鳍同伴产生冲突；具体品系仍需核实。')
for id,targets in [('pterophyllum-scalare',['paracheirodon-innesi','paracheirodon-simulans','boraras-brigittae','boraras-maculatus']),('cyphotilapia-frontosa',['cyprichromis-leptosoma','paracheirodon-innesi','paracheirodon-simulans','boraras-brigittae','boraras-maculatus'])]:
 rules.setdefault(id,{}).update(prey=targets,source='https://www.seriouslyfish.com/species/'+id+'/',note='来源提示吞食小型鱼；此列表是谨慎的风险触发，不代表未列出的组合安全。')
for f in profiles:rules[f['id']]={'territorial':True,'source':f['sourceUrl'],'note':f['caution']}
save('content/enrichment/behavior-rules.json',rules)
print('Prepared 3 marine species,',len(overrides),'parameter annotations,',len(rules),'behavior profiles')
