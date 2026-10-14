# coding: utf-8
"""Write an auditable species-by-species native waterbody coverage report."""
import json, re
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
raw=json.loads((ROOT/'content/distributions.json').read_text())['species']
fish=json.loads((ROOT/'content/species.json').read_text())+json.loads((ROOT/'content/photo-profiles.json').read_text())
places={b['id']:{**b,'label':b['name'],'kind':'basin'} for b in json.loads((ROOT/'content/major-basins.json').read_text())}
places.update({b['id']:b for b in json.loads((ROOT/'content/waterbodies.json').read_text())})
for id, label in re.findall(r'"(\d+)": "([^"]+)"', (ROOT/'src/lib/basins.ts').read_text()):
 if id in places:places[id]['label']=label
located=sum(bool(d['links']) for d in raw.values());pending=len(raw)-located
counts=Counter(l['locationId'] for d in raw.values() for l in d['links']);kinds=Counter(places[id]['kind'] for id in counts)
lines=['# 鱼类原生水域补齐记录','', f'2026-10-13。全部 {len(raw)} 种有照片条目已匹配 FishBase 26.06 分布文字；接受异名与原始学名同时保留。原先只有 30 种可定位，前轮补至 169 种，本轮再补齐 {located-169} 种，共 **{located} 种可在地球展示，{pending} 种待具体定位**。', '',f'共有 {len(counts)} 个关联水域：{kinds["basin"]} 个 GRDC 流域、{kinds["sea"]} 个海域、{kinds["lake"]} 个湖泊／潟湖、{kinds["river"]} 个补充河流水系。共 {sum(counts.values())} 条鱼—水域关系；同一种鱼可以有多条关联，所以各类型鱼种数不能简单相加。','', '## 资料与定位口径', '', '- [FishBase / rOpenSci 数据](https://github.com/ropensci/rfishbase)使用 Source Cooperative 的 26.06 Parquet 快照：species、synonyms、stocks、ecosystem、ecosystemref。species-in-general 分布段落保存于运行数据；完整生态系统原始状态、引入关系、参考文献编号保留在 research 缓存。文字与数据按 [CC BY-NC 3.0](https://fishbaseapi.readme.io/reference/license) 署名，非商业使用；照片仍遵循各自 Commons 许可。', '- 只接受有依据的原生关系。生态系统 native/endemic + present 是候选依据，还需与物种范围和分类修订核对；引入地、可疑记录、旧种广义范围均不据此落点。尤其排除金鱼在 Chesapeake、叉尾斗鱼在黑龙江、意大利花鳅在莱茵河，以及部分热带礁鱼在黄海的冲突记录。', '- [GRDC 2020](https://mrb.grdc.bafg.de/) 的 520 个主要流域继续全部可筛选，选择水域时显示范围；总览默认显示主要河网。支流明确属于该水系才向父流域关联；例如 Xingu 属亚马孙，关联不等于鱼占据整个亚马孙。', '- 湖泊独立关联：[Natural Earth 湖面](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-lakes/)包含马拉维、坦噶尼喀、琵琶、尼加拉瓜、马那瓜、瓦伦西亚。茵莱、仙谷、阿亚马鲁、坎波马使用有来源的水域锚点，不虚构边界。茵莱湖特有鱼不再泛化成整个萨尔温江。', '- 海域采用 [Natural Earth 海域示意](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/)或 FishBase 生态系统位置。Natural Earth marine polygons 为地理标签示意，不是严格海洋管理边界，更不是鱼的分布多边形。邦盖天竺鲷限定邦盖群岛，夏威夷特有隆头鱼限定夏威夷，红海特有鱼限定红海。只有宽泛大洋依据时如实标注“宽泛分布”。', '- 海域、湖泊与河流关系在同一个筛选器里搜索；地图总览每种鱼保留一个固定代表水域，搜索／类别筛选不改变该归属，水域筛选展示其所有关联鱼。同水域使用经过边界校验的共同展示锚点；北／南湖区特有鱼保留来源限制，海域锚点排除陆地。照片仅在锚点附近紧凑排列，不再沿整片水域散布或向屏幕远处避让；选中／悬停水域时显示名称、高亮边界及短连接线。照片展示位不代表其拍摄地点；小水域锚点可取自有来源的馆藏／调查坐标，但不表示物种完整分布。', '- 本轮 14 种的复核表见 [剩余条目补齐记录](remaining-distributions-completed.md)，原始馆藏来源见 `content/research/remaining-museum-occurrences.json`。小水系保留命名地点与来源坐标，不虚构边界；新分类拆分、同名河流与引入地排除记录也保留在详情。', '- 补充关系逐条保留 Seriously Fish、IUCN、模式描述／分类修订、原生种群论文等链接。引用依据、原文和地理位置来源在鱼详情内展开，卡片显示鱼名、照片和简短水域名。', '', f'## 待定位条目（{pending} 种）','', '| 鱼名 | 学名 | 当前限制 |','| --- | --- | --- |']
if not pending:
 lines=lines[:-2]+['当前没有未定位的照片条目。']
for f in fish:
 d=raw[f['id']]
 if not d['links']:lines.append(f"| {f['name']} | {f['scientific']} | {d['unlocatedReason']} |")
lines+=['','当前有照片条目均已有至少一处具名原生水域关系；这不是完整自然分布普查。库利泥鳅采用爪哇 Klawing 河发表的形态鉴定记录，置信度中等，缺少馆藏号和分子复核。Garra flavatra 使用 NRM 原始模式标本坐标解决旧转录冲突，保留错误来源的审计记录。','', '## 全量逐种关联','', '| 鱼名 | 学名 | 原生水域 |','| --- | --- | --- |']
for f in fish:
 d=raw[f['id']];names='、'.join(places[l['locationId']]['label'] for l in d['links']) or '待定位（已补文字分布）'
 lines.append(f"| {f['name']} | [{f['scientific']}]({d['sourceUrl']}) | {names} |")
lines+=['','## 复现与验证','','```sh','# 先准备 FishBase 26.06 五个 Parquet 表和 Natural Earth 10m lakes / marine shapefiles','python scripts/import-fishbase-distributions.py /path/to/fishbase-tables','python scripts/build-distribution-map.py /path/to/natural-earth /path/to/fishbase-tables','python scripts/report-distributions.py','npx tsx scripts/check-distribution-pins.ts','npm test','npm run build','npm run test:e2e','```','','运行数据：`content/distributions.json`、`content/waterbodies.json`。完整来源缓存：`content/research/fishbase-distribution.json`。最终 14 种的构建输入：`content/research/remaining-reviewed-distributions.json`；每条水域与物种关系分别保存坐标出处、分布证据与编辑说明。构建脚本需要 pyarrow、pyshp、shapely；应用运行时不依赖 Python 或外部联网请求。']
(ROOT/'docs/native-distribution-expansion.md').write_text('\n'.join(lines)+'\n')
print('Coverage report:',len(raw),'profiles,',sum(bool(d['links']) for d in raw.values()),'located;',dict(kinds))
