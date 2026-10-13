# 鱼类原生水域补齐记录

2026-10-13。全部 183 种有照片条目已匹配 FishBase 26.06 分布文字；接受异名与原始学名同时保留。原先只有 30 种可定位，前轮补至 169 种，本轮再补齐 14 种，共 **183 种可在地球展示，0 种待具体定位**。

共有 133 个关联水域：43 个 GRDC 流域、42 个海域、11 个湖泊／潟湖、37 个补充河流水系。共 628 条鱼—水域关系；同一种鱼可以有多条关联，所以各类型鱼种数不能简单相加。

## 资料与定位口径

- [FishBase / rOpenSci 数据](https://github.com/ropensci/rfishbase)使用 Source Cooperative 的 26.06 Parquet 快照：species、synonyms、stocks、ecosystem、ecosystemref。species-in-general 分布段落保存于运行数据；完整生态系统原始状态、引入关系、参考文献编号保留在 research 缓存。文字与数据按 [CC BY-NC 3.0](https://fishbaseapi.readme.io/reference/license) 署名，非商业使用；照片仍遵循各自 Commons 许可。
- 只接受有依据的原生关系。生态系统 native/endemic + present 是候选依据，还需与物种范围和分类修订核对；引入地、可疑记录、旧种广义范围均不据此落点。尤其排除金鱼在 Chesapeake、叉尾斗鱼在黑龙江、意大利花鳅在莱茵河，以及部分热带礁鱼在黄海的冲突记录。
- [GRDC 2020](https://mrb.grdc.bafg.de/) 的 520 个主要流域继续全部可筛选，选择水域时显示范围；总览默认显示主要河网。支流明确属于该水系才向父流域关联；例如 Xingu 属亚马孙，关联不等于鱼占据整个亚马孙。
- 湖泊独立关联：[Natural Earth 湖面](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-lakes/)包含马拉维、坦噶尼喀、琵琶、尼加拉瓜、马那瓜、瓦伦西亚。茵莱、仙谷、阿亚马鲁、坎波马使用有来源的水域锚点，不虚构边界。茵莱湖特有鱼不再泛化成整个萨尔温江。
- 海域采用 [Natural Earth 海域示意](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/)或 FishBase 生态系统位置。Natural Earth marine polygons 为地理标签示意，不是严格海洋管理边界，更不是鱼的分布多边形。邦盖天竺鲷限定邦盖群岛，夏威夷特有隆头鱼限定夏威夷，红海特有鱼限定红海。只有宽泛大洋依据时如实标注“宽泛分布”。
- 海域、湖泊与河流关系在同一个筛选器里搜索；地图总览每种鱼保留一个固定代表水域，搜索／类别筛选不改变该归属，水域筛选展示其所有关联鱼。同水域使用经过边界校验的共同展示锚点；北／南湖区特有鱼保留来源限制，海域锚点排除陆地。照片仅在锚点附近紧凑排列，不再沿整片水域散布或向屏幕远处避让；选中／悬停水域时显示名称、高亮边界及短连接线。照片展示位不代表其拍摄地点；小水域锚点可取自有来源的馆藏／调查坐标，但不表示物种完整分布。
- 本轮 14 种的复核表见 [剩余条目补齐记录](remaining-distributions-completed.md)，原始馆藏来源见 `content/research/remaining-museum-occurrences.json`。小水系保留命名地点与来源坐标，不虚构边界；新分类拆分、同名河流与引入地排除记录也保留在详情。
- 补充关系逐条保留 Seriously Fish、IUCN、模式描述／分类修订、原生种群论文等链接。引用依据、原文和地理位置来源在鱼详情内展开，卡片显示鱼名、照片和简短水域名。

## 待定位条目（0 种）

当前没有未定位的照片条目。

当前有照片条目均已有至少一处具名原生水域关系；这不是完整自然分布普查。库利泥鳅采用爪哇 Klawing 河发表的形态鉴定记录，置信度中等，缺少馆藏号和分子复核。Garra flavatra 使用 NRM 原始模式标本坐标解决旧转录冲突，保留错误来源的审计记录。

## 全量逐种关联

| 鱼名 | 学名 | 原生水域 |
| --- | --- | --- |
| 红绿灯 | [Paracheirodon innesi](https://www.fishbase.se/summary/10691) | 亚马孙河流域 |
| 宝莲灯 | [Paracheirodon axelrodi](https://www.fishbase.se/summary/8195) | 奥里诺科河流域、亚马孙河流域 |
| 绿莲灯 | [Paracheirodon simulans](https://www.fishbase.se/summary/12394) | 奥里诺科河流域、亚马孙河流域 |
| 神仙鱼 | [Pterophyllum scalare](https://www.fishbase.se/summary/4717) | 亚马孙河流域、埃塞奎博河流域 |
| 红鼻剪刀 | [Hemigrammus bleheri](https://www.fishbase.se/summary/12365) | 亚马孙河流域、奥里诺科河流域 |
| 金线铅笔 | [Nannostomus beckfordi](https://www.fishbase.se/summary/10750) | 亚马孙河流域 |
| 大理石燕子 | [Carnegiella strigata](https://www.fishbase.se/summary/10736) | 亚马孙河流域 |
| 凤尾短鲷 | [Apistogramma cacatuoides](https://www.fishbase.se/summary/12282) | 亚马孙河流域 |
| 七彩神仙 | [Symphysodon aequifasciatus](https://www.fishbase.se/summary/11185) | 亚马孙河流域、托坎廷斯河流域 |
| 红裙鱼 | [Hyphessobrycon eques](https://www.fishbase.se/summary/46294) | 亚马孙河流域、巴拉那河流域、托坎廷斯河流域 |
| 暹罗斗鱼 | [Betta splendens](https://www.fishbase.se/summary/4768) | 湄公河流域 |
| 珍珠马甲 | [Trichopodus leerii](https://www.fishbase.se/summary/4674) | 卡普阿斯河流域 |
| 侏儒丽丽 | [Trichopsis pumila](https://www.fishbase.se/summary/12082) | 湄公河流域、湄南河流域 |
| 三角灯 | [Trigonostigma heteromorpha](https://www.fishbase.se/summary/10881) | 义顺沼泽森林溪流水系、因陀罗吉里—关丹河流域 |
| 红三角灯 | [Trigonostigma espei](https://www.fishbase.se/summary/27073) | 湄公河流域 |
| 灯光三角 | [Trigonostigma hengeli](https://www.fishbase.se/summary/12182) | 巴当哈里河流域 |
| 辣椒灯 | [Boraras brigittae](https://www.fishbase.se/summary/22509) | 巴里托河流域 |
| 斑点波鱼 | [Boraras maculatus](https://www.fishbase.se/summary/10879) | 义顺沼泽森林溪流水系 |
| 库利泥鳅 | [Pangio kuhlii](https://www.fishbase.se/summary/12276) | 克拉温河（Klawing） |
| 皇冠泥鳅 | [Chromobotia macracanthus](https://www.fishbase.se/summary/10897) | 巴当哈里河流域 |
| 非洲王子 | [Labidochromis caeruleus](https://www.fishbase.se/summary/2327) | 马拉维湖 |
| 德氏岩栖丽鱼 | [Pseudotropheus demasoni](https://www.fishbase.se/summary/53380) | 马拉维湖 |
| 金色岩栖丽鱼 | [Melanochromis auratus](https://www.fishbase.se/summary/2343) | 马拉维湖 |
| 索氏岩栖丽鱼 | [Pseudotropheus socolofi](https://www.fishbase.se/summary/2380) | 马拉维湖 |
| 黄金茱莉 | [Julidochromis ornatus](https://www.fishbase.se/summary/8609) | 坦噶尼喀湖 |
| 多带卷贝 | [Neolamprologus multifasciatus](https://www.fishbase.se/summary/8744) | 坦噶尼喀湖 |
| 布氏丽鱼 | [Neolamprologus brichardi](https://www.fishbase.se/summary/8652) | 坦噶尼喀湖 |
| 黄珍珠丽鱼 | [Neolamprologus leleupi](https://www.fishbase.se/summary/8670) | 坦噶尼喀湖 |
| 六间鱼 | [Cyphotilapia frontosa](https://www.fishbase.se/summary/8572) | 坦噶尼喀湖 |
| 细鳞剑沙 | [Cyprichromis leptosoma](https://www.fishbase.se/summary/8573) | 坦噶尼喀湖 |
| 公子小丑鱼 | [Amphiprion ocellaris](https://www.fishbase.se/summary/6509) | 泰国湾、印度尼西亚群岛海域、苏禄—西里伯斯海、安达曼海、孟加拉湾、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 蓝倒吊 | [Paracanthurus hepatus](https://www.fishbase.se/summary/6017) | 澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 泗水玫瑰 | [Pterapogon kauderni](https://www.fishbase.se/summary/15426) | 邦盖群岛近海 |
| 孟加拉豆娘魚 | [Abudefduf bengalensis](https://www.fishbase.se/summary/6517) | 澳大利亚西北近海、泰国湾、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、安达曼海、孟加拉湾、阿拉伯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 雜色豆娘魚 | [Abudefduf concolor](https://www.fishbase.se/summary/11793) | 加利福尼亚湾、秘鲁—加拉帕戈斯海域、太平洋（宽泛分布） |
| 巴西刺鮨 | [Acanthistius brasilianus](https://www.fishbase.se/summary/351) | 巴西南岸海域、巴西东岸海域、巴塔哥尼亚大陆架海域、大西洋（宽泛分布） |
| 環帶刺鮨 | [Acanthistius cinctus](https://www.fishbase.se/summary/12690) | 澳大利亚东岸海域、新西兰近海、塔斯曼海、太平洋（宽泛分布） |
| 睛斑刺鮨 | [Acanthistius ocellatus](https://www.fishbase.se/summary/15036) | 澳大利亚东岸海域、太平洋（宽泛分布） |
| 黃鰭刺鰕虎魚 | [Acanthogobius flavimanus](https://www.fishbase.se/summary/3832) | 东海、黄海、南海、太平洋（宽泛分布） |
| 心斑刺尾魚 | [Acanthurus achilles](https://www.fishbase.se/summary/4306) | 夏威夷群岛海域、波利尼西亚海域、太平洋（宽泛分布） |
| 白胸鰭刺尾魚 | [Acanthurus albipectoralis](https://www.fishbase.se/summary/13770) | 大堡礁海域、珊瑚海与大堡礁、太平洋（宽泛分布） |
| 橘色刺尾魚 | [Acanthurus auranticavus](https://www.fishbase.se/summary/4748) | 印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 粉蓝倒吊 | [Acanthurus leucosternon](https://www.fishbase.se/summary/1257) | 安达曼海、孟加拉湾、阿曼湾、印度洋（宽泛分布） |
| 蒼帶小刺眼鰍 | [Acantopsis dialuzona](https://www.fishbase.se/summary/23015) | 卡普阿斯河流域、马哈坎河流域、哥洛河流域、董里河水系（Trang）、赛布里河（Sai Buri）、Padang Terap 河、Besut 河、登嘉楼河、大素里里河水系、柔佛河水系、穆西河水系、Sungkai 河、Pegadungan 河、Sekampung 河水系 |
| 八線小刺眼鰍 | [Acantopsis octoactinotos](https://www.fishbase.se/summary/23017) | 京那巴当岸河流域 |
| 短身細尾海龍 | [Acentronura breviperula](https://www.fishbase.se/summary/66887) | 大堡礁海域、安达曼海、印度洋（宽泛分布） |
| 南非細尾海馬 | [Acentronura tentaculata](https://www.fishbase.se/summary/16862) | 大堡礁海域、珊瑚海与大堡礁、亚丁湾、波斯湾、阿拉伯海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 綠藍唇魚 | [Achoerodus viridis](https://www.fishbase.se/summary/50808) | 澳大利亚东岸海域、太平洋（宽泛分布） |
| 長鰭鱥 | [Agosia chrysogaster](https://www.fishbase.se/summary/2742) | 科罗拉多河流域 |
| 刀鱗鱂 | [Alfaro cultratus](https://www.fishbase.se/summary/46449) | 圣胡安河流域（中美洲） |
| 無斑鴛鴛鮨 | [Alphestes immaculatus](https://www.fishbase.se/summary/8727) | 秘鲁—加拉帕戈斯海域、太平洋（宽泛分布） |
| Pacific Leaping Blenny | [Alticus arnoldorum](https://www.fishbase.se/summary/56805) | 太平洋（宽泛分布） |
| 單色跳彈䲁 | [Alticus monochrus](https://www.fishbase.se/summary/9919) | 印度洋（宽泛分布） |
| 九间菠萝 | [Amatitlania nigrofasciata](https://www.fishbase.se/summary/3615) | 帕图卡河流域、苏奇亚特河流域 |
| 橘斑嬌麗魚 | [Amatitlania siquia](https://www.fishbase.se/summary/63629) | 锡基亚河（尼加拉瓜） |
| 黄身宽齿雀鲷 | [Amblyglyphidodon aureus](https://www.fishbase.se/summary/5690) | 澳大利亚西北近海、泰国湾、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、安达曼海、孟加拉湾、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 黑吻宽齿雀鲷 | [Amblyglyphidodon curacao](https://www.fishbase.se/summary/5477) | 澳大利亚西北近海、泰国湾、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 黃側凹牙豆娘魚 | [Amblyglyphidodon flavilatus](https://www.fishbase.se/summary/11834) | 亚丁湾、红海 |
| 短頭鈍雀鯛 | [Amblypomacentrus breviceps](https://www.fishbase.se/summary/9721) | 印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 白點寬吻魨 | [Amblyrhynchotes honckenii](https://www.fishbase.se/summary/8071) | 南海、太平洋（宽泛分布）、大西洋（宽泛分布）、印度洋（宽泛分布） |
| 橘色雙冠麗魚 | [Amphilophus citrinellus](https://www.fishbase.se/summary/4786) | 圣胡安河流域（中美洲）、尼加拉瓜湖、马那瓜湖 |
| 真小丑鱼 | [Amphiprion percula](https://www.fishbase.se/summary/9209) | 大堡礁海域、珊瑚海与大堡礁 |
| 青斑阿南魚 | [Anampses caeruleopunctatus](https://www.fishbase.se/summary/4888) | 亚喀巴湾、澳大利亚东岸海域、印度尼西亚群岛海域、大堡礁海域、新西兰近海、塔斯曼海、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、波斯湾、阿拉伯海、南海、红海、太平洋（宽泛分布）、大西洋（宽泛分布）、印度洋（宽泛分布） |
| 居氏阿南魚 | [Anampses cuvier](https://www.fishbase.se/summary/4916) | 夏威夷群岛海域 |
| 胡子异形（代表种） | [Ancistrus cirrhosus](https://www.fishbase.se/summary/23347) | 巴拉那河流域、乌拉圭河流域 |
| 蓝阿卡拉 | [Andinoacara pulcher](https://www.fishbase.se/summary/4727) | 奥里诺科河流域 |
| 花鮨 | [Anthias anthias](https://www.fishbase.se/summary/1692) | 爱奥尼亚海、马尔马拉海、爱琴海、几内亚湾海域、地中海、大西洋（宽泛分布） |
| 白线光腭鲈 | [Anyperodon leucogrammicus](https://www.fishbase.se/summary/4922) | 澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、安达曼海、波斯湾、阿拉伯海、南海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 斑條祕鱂 | [Aphanius fasciatus](https://www.fishbase.se/summary/4834) | 爱奥尼亚海、马尔马拉海、爱琴海、地中海 |
| 孔雀鳉 | [Aphyosemion australe](https://www.fishbase.se/summary/8770) | 永博河（刚果共和国）、邦多溪／扬加拉湖支流（刚果）、姆博索溪／科班比湖支流（刚果）、穆埃拉溪／南加湖支流（刚果）、波洛河／奥果韦水系、奥果韦河流域 |
| 阿卡西短鲷 | [Apistogramma agassizii](https://www.fishbase.se/summary/26703) | 亚马孙河流域 |
| 斑马短鲷 | [Apistogramma borellii](https://www.fishbase.se/summary/11138) | 巴拉那河流域 |
| 黑幼背天竺鯛 | [Apogon atradorsatus](https://www.fishbase.se/summary/25507) | 秘鲁—加拉帕戈斯海域、太平洋（宽泛分布） |
| 紅海叉鼻魨 | [Arothron diadematus](https://www.fishbase.se/summary/25413) | 红海 |
| 瓣叉鼻魨 | [Arothron firmamentum](https://www.fishbase.se/summary/14568) | 澳大利亚东岸海域、新西兰近海、塔斯曼海、苏禄—西里伯斯海、巴塔哥尼亚大陆架海域、南海、太平洋（宽泛分布）、大西洋（宽泛分布）、印度洋（宽泛分布） |
| 棕點盾皮鮠 | [Aspidoras fuscoguttatus](https://www.fishbase.se/summary/46253) | 巴拉那河流域 |
| 地圖魚 | [Astronotus ocellatus](https://www.fishbase.se/summary/3612) | 亚马孙河流域、奥里诺科河流域 |
| 里氏阿克塞脂鯉 | [Axelrodia riesei](https://www.fishbase.se/summary/26439) | 奥里诺科河流域 |
| 墨西哥魣鱂 | [Belonesox belizanus](https://www.fishbase.se/summary/3214) | 圣胡利安潟湖（韦拉克鲁斯）、尼加拉瓜湖、帕帕洛阿潘河流域、夸察夸尔科斯河水系、拉安蒂瓜河水系、格里哈尔瓦河水系、乌苏马辛塔河流域 |
| 梳尾格鬥魚 | [Belontia signata](https://www.fishbase.se/summary/6353) | 凯拉尼河流域 |
| Giant Betta | [Betta anabatoides](https://www.fishbase.se/summary/12034) | 巴里托河流域 |
| 伯德氏沙鰍 | [Botia birdi](https://www.fishbase.se/summary/24689) | 印度河流域 |
| 達林沙鰍 | [Botia dario](https://www.fishbase.se/summary/12248) | 布拉马普特拉河流域、恒河流域 |
| 斑马鳅 | [Botia striata](https://www.fishbase.se/summary/12255) | 克里希纳河流域 |
| 美鯰 | [Callichthys callichthys](https://www.fishbase.se/summary/10922) | 巴拉那河流域、乌拉圭河流域 |
| 三帶尖鼻魨 | [Canthigaster axiologus](https://www.fishbase.se/summary/65366) | 大堡礁海域、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 笨氏尖鼻魨 | [Canthigaster bennetti](https://www.fishbase.se/summary/6541) | 澳大利亚东岸海域、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、大西洋（宽泛分布）、印度洋（宽泛分布） |
| 金鱼 | [Carassius auratus](https://www.fishbase.se/summary/271) | 长江流域、琵琶湖、珠江流域 |
| 小口棘隆頭魚 | [Centrolabrus exoletus](https://www.fishbase.se/summary/55) | 爱尔兰海、北海、挪威海、大西洋（宽泛分布） |
| 珊瑚美人 | [Centropyge bispinosa](https://www.fishbase.se/summary/5458) | 澳大利亚东岸海域、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 火焰神仙 | [Centropyge loriculus](https://www.fishbase.se/summary/7814) | 大堡礁海域、夏威夷群岛海域、珊瑚海与大堡礁、波利尼西亚海域、南海、太平洋（宽泛分布） |
| 项斑蝴蝶鱼 | [Chaetodon adiergastos](https://www.fishbase.se/summary/6515) | 印度尼西亚群岛海域、苏禄—西里伯斯海、南海、太平洋（宽泛分布） |
| 黃蝴蝶魚 | [Chaetodon andamanensis](https://www.fishbase.se/summary/58164) | 安达曼海、印度洋（宽泛分布） |
| 銀身蝴蝶魚 | [Chaetodon argentatus](https://www.fishbase.se/summary/6665) | 苏禄—西里伯斯海、南海、太平洋（宽泛分布） |
| 绿尾唇鱼 | [Cheilinus chlorourus](https://www.fishbase.se/summary/5598) | 印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、孟加拉湾、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 横带唇鱼 | [Cheilinus fasciatus](https://www.fishbase.se/summary/5600) | 亚喀巴湾、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、安达曼海、孟加拉湾、波斯湾、南海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 钻嘴鱼 | [Chelmon rostratus](https://www.fishbase.se/summary/5483) | 澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、安达曼海、孟加拉湾、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 截尾鑷蝶魚 | [Chelmonops truncatus](https://www.fishbase.se/summary/10286) | 澳大利亚东南近海、澳大利亚东岸海域、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 蓝绿光鳃鱼 | [Chromis viridis](https://www.fishbase.se/summary/5679) | 亚喀巴湾、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、波斯湾、阿拉伯海、地中海、南海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 蓝魔雀鲷 | [Chrysiptera cyanea](https://www.fishbase.se/summary/5695) | 澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 黄尾蓝魔鬼 | [Chrysiptera parasema](https://www.fishbase.se/summary/12448) | 印度尼西亚群岛海域、苏禄—西里伯斯海、南海、太平洋（宽泛分布） |
| 钥匙孔慈鲷 | [Cleithracara maronii](https://www.fishbase.se/summary/11136) | 奥里诺科河流域 |
| 十斑銼齒鱂 | [Cnesterodon decemmaculatus](https://www.fishbase.se/summary/4753) | 乌拉圭河流域 |
| 雙線鰍 | [Cobitis bilineata](https://www.fishbase.se/summary/49105) | 罗讷河流域、波河流域 |
| 褐帶少女魚 | [Coradion altivelis](https://www.fishbase.se/summary/11250) | 澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、安达曼海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 青铜鼠 | [Corydoras aeneus](https://www.fishbase.se/summary/7777) | 巴拉那河流域、亚马孙河流域 |
| 哈氏鼠 | [Corydoras habrosus](https://www.fishbase.se/summary/46083) | 奥里诺科河流域 |
| 花椒鼠 | [Corydoras paleatus](https://www.fishbase.se/summary/10926) | 巴拉那河流域、乌拉圭河流域 |
| 熊猫鼠 | [Corydoras panda](https://www.fishbase.se/summary/12188) | 亚马孙河流域 |
| 小精灵鼠 | [Corydoras pygmaeus](https://www.fishbase.se/summary/12194) | 亚马孙河流域 |
| 翡翠鼠 | [Corydoras splendens](https://www.fishbase.se/summary/12154) | 亚马孙河流域 |
| 暹罗食藻鱼 | [Crossocheilus oblongus](https://www.fishbase.se/summary/12063) | 湄公河流域、湄南河流域 |
| 黄守望虾虎 | [Cryptocentrus cinctus](https://www.fishbase.se/summary/7208) | 印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、南海、太平洋（宽泛分布） |
| 双斑栉齿刺尾鱼 | [Ctenochaetus binotatus](https://www.fishbase.se/summary/6012) | 澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 绿宝石斑马鱼 | [Danio erythromicron](https://www.fishbase.se/summary/24410) | 茵莱湖 |
| 银河斑马鱼 | [Danio margaritatus](https://www.fishbase.se/summary/63298) | 萨尔温江流域 |
| 斑马鱼 | [Danio rerio](https://www.fishbase.se/summary/4653) | 恒河流域、高韦里河流域、克里希纳河流域 |
| 德古拉小鿕 | [Danionella dracula](https://www.fishbase.se/summary/65081) | 伊洛瓦底江流域 |
| 双色鳚 | [Ecsenius bicolor](https://www.fishbase.se/summary/6033) | 澳大利亚西北近海、泰国湾、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 金色鳚 | [Ecsenius midas](https://www.fishbase.se/summary/7561) | 亚喀巴湾、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、波斯湾、阿拉伯海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 尾斑鳚 | [Ecsenius stigmatura](https://www.fishbase.se/summary/7663) | 印度尼西亚群岛海域、太平洋（宽泛分布） |
| 霓虹虾虎 | [Elacatinus oceanops](https://www.fishbase.se/summary/3876) | 加勒比海、墨西哥湾、大西洋（宽泛分布） |
| 小猴飞狐 | [Garra flavatra](https://www.fishbase.se/summary/61929) | 卡南梅溪（缅甸）、卡米特溪（缅甸）、鲍迪溪（缅甸） |
| 猶他骨尾魚 | [Gila atraria](https://www.fishbase.se/summary/2756) | 哥伦比亚河流域 |
| 红彩虹鱼 | [Glossolepis incisus](https://www.fishbase.se/summary/10477) | 仙谷湖（Sentani） |
| 黄小丑虾虎 | [Gobiodon okinawae](https://www.fishbase.se/summary/7217) | 澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 皇家格兰玛 | [Gramma loreto](https://www.fishbase.se/summary/5281) | 加勒比海、大西洋（宽泛分布） |
| 黑裙灯 | [Gymnocorymbus ternetzi](https://www.fishbase.se/summary/4682) | 巴拉那河流域、亚马孙河流域 |
| 黄龙 | [Halichoeres chrysus](https://www.fishbase.se/summary/4855) | 澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 银尖灯 | [Hasemania nana](https://www.fishbase.se/summary/12360) | 圣弗朗西斯科河流域 |
| 接吻鱼 | [Helostoma temminckii](https://www.fishbase.se/summary/500) | 湄公河流域 |
| 條紋半齧脂鯉 | [Hemibrycon taeniurus](https://www.fishbase.se/summary/23414) | 卡罗尼河（特立尼达） |
| 红线灯 | [Hemigrammus erythrozonus](https://www.fishbase.se/summary/10642) | 埃塞奎博河流域 |
| 斑馬下鈎鯰 | [Hypancistrus zebra](https://www.fishbase.se/summary/53570) | 亚马孙河流域 |
| 火焰灯 | [Hyphessobrycon amandae](https://www.fishbase.se/summary/12376) | 托坎廷斯河流域 |
| 黑霓虹灯 | [Hyphessobrycon herbertaxelrodi](https://www.fishbase.se/summary/10654) | 巴拉那河流域 |
| 柠檬灯 | [Hyphessobrycon pulchripinnis](https://www.fishbase.se/summary/10656) | 亚马孙河流域 |
| 異牙兔甲鯰 | [Leporacanthicus heterodon](https://www.fishbase.se/summary/57544) | 亚马孙河流域 |
| 香港鬥魚 | [Macropodus hongkongensis](https://www.fishbase.se/summary/59719) | 沙螺洞溪流与湿地（香港） |
| 蓋斑鬥魚 | [Macropodus opercularis](https://www.fishbase.se/summary/4777) | 长江流域、珠江流域、红河流域 |
| 小精灵（代表种） | [Macrotocinclus affinis](https://www.fishbase.se/summary/11332) | 里贝拉—伊瓜佩河流域 |
| 博氏虹银汉鱼 | [Melanotaenia boesemani](https://www.fishbase.se/summary/10489) | 阿亚马鲁湖群 |
| 霓虹彩虹鱼 | [Melanotaenia praecox](https://www.fishbase.se/summary/10516) | 曼伯拉莫河流域 |
| 绿晶灯 | [Microdevario kubotai](https://www.fishbase.se/summary/58581) | 萨尔温江流域 |
| 玻利维亚短鲷 | [Mikrogeophagus altispinosus](https://www.fishbase.se/summary/15902) | 亚马孙河流域 |
| 荷兰凤凰 | [Mikrogeophagus ramirezi](https://www.fishbase.se/summary/12305) | 奥里诺科河流域 |
| 博奈直線脂鯉 | [Moenkhausia bonita](https://www.fishbase.se/summary/62261) | 巴拉那河流域 |
| 钻石灯 | [Moenkhausia pittieri](https://www.fishbase.se/summary/10664) | 瓦伦西亚湖 |
| 突角鼻鱼 | [Naso annulatus](https://www.fishbase.se/summary/6019) | 澳大利亚东岸海域、印度尼西亚群岛海域、大堡礁海域、夏威夷群岛海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、安达曼海、南海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 短吻鼻鱼 | [Naso brevirostris](https://www.fishbase.se/summary/6021) | 澳大利亚西北近海、澳大利亚东岸海域、印度尼西亚群岛海域、大堡礁海域、夏威夷群岛海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、安达曼海、波斯湾、阿拉伯海、南海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 紫火箭鱼 | [Nemateleotris decora](https://www.fishbase.se/summary/6616) | 印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、安达曼海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 雷达鱼 | [Nemateleotris magnifica](https://www.fishbase.se/summary/6629) | 印度尼西亚群岛海域、大堡礁海域、夏威夷群岛海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 火焰鹰鱼 | [Neocirrhites armatus](https://www.fishbase.se/summary/5832) | 印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、波利尼西亚海域、太平洋（宽泛分布） |
| Elephant Ear Gourami | [Osphronemus exodon](https://www.fishbase.se/summary/26871) | 湄公河流域 |
| Giant Red Tail Gourami | [Osphronemus laticlavius](https://www.fishbase.se/summary/16572) | 京那巴当岸河流域 |
| 玫瑰鲃 | [Pethia conchonius](https://www.fishbase.se/summary/4714) | 印度河流域、布拉马普特拉河流域、恒河流域 |
| 奥德萨鲃 | [Pethia padamya](https://www.fishbase.se/summary/64645) | 伊洛瓦底江流域 |
| 刚果灯 | [Phenacogrammus interruptus](https://www.fishbase.se/summary/10660) | 刚果河流域 |
| 帆鳍玛丽 | [Poecilia latipinna](https://www.fishbase.se/summary/3226) | 开普菲尔河流域、墨西哥湾 |
| 孔雀鱼 | [Poecilia reticulata](https://www.fishbase.se/summary/3228) | 卡罗尼河（特立尼达） |
| 玛丽鱼 | [Poecilia sphenops](https://www.fishbase.se/summary/4680) | 巴尔萨斯河流域 |
| 安德勒孔雀鱼 | [Poecilia wingei](https://www.fishbase.se/summary/63223) | 坎波马潟湖 |
| 比夫拉多板盾尾魚 | [Prionurus biafraensis](https://www.fishbase.se/summary/4944) | 几内亚湾海域、大西洋（宽泛分布） |
| 六线龙 | [Pseudocheilinus hexataenia](https://www.fishbase.se/summary/5617) | 亚喀巴湾、澳大利亚西北近海、澳大利亚东岸海域、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、波利尼西亚海域、苏禄—西里伯斯海、安达曼海、孟加拉湾、亚丁湾、波斯湾、阿拉伯海、南海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 兰花拟雀鲷 | [Pseudochromis fridmani](https://www.fishbase.se/summary/12741) | 亚喀巴湾、红海 |
| 叉尾蓝眼 | [Pseudomugil furcatus](https://www.fishbase.se/summary/10530) | 夸吉拉河／佩里亚溪（巴新）、穆萨河水系（巴新） |
| 米字蓝眼 | [Pseudomugil gertrudae](https://www.fishbase.se/summary/22749) | 弗莱河流域、戴利河流域 |
| 虎皮鱼 | [Puntigrus tetrazona](https://www.fishbase.se/summary/4766) | 巴当哈里河流域、因陀罗吉里—关丹河流域 |
| 樱桃鲃 | [Puntius titteya](https://www.fishbase.se/summary/6147) | 凯拉尼河流域 |
| 剪刀波鱼 | [Rasbora trilineata](https://www.fishbase.se/summary/4771) | 湄公河流域、湄南河流域、湄克隆河流域 |
| 食藻鳚 | [Salarias fasciatus](https://www.fishbase.se/summary/6058) | 亚喀巴湾、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、波斯湾、阿拉伯海、南海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 睡衣天竺鲷 | [Sphaeramia nematoptera](https://www.fishbase.se/summary/5778) | 印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 青蛙鱼 | [Synchiropus splendidus](https://www.fishbase.se/summary/12644) | 印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、苏禄—西里伯斯海、南海、太平洋（宽泛分布） |
| 白云金丝 | [Tanichthys albonubes](https://www.fishbase.se/summary/4758) | 珠江流域 |
| 蜜丽鱼 | [Trichogaster chuna](https://www.fishbase.se/summary/11201) | 恒河流域 |
| 矮丽鱼 | [Trichogaster lalius](https://www.fishbase.se/summary/4774) | 恒河流域 |
| 三点丝足鲈 | [Trichopodus trichopterus](https://www.fishbase.se/summary/4675) | 湄公河流域、萨尔温江流域、湄南河流域 |
| 钻石虾虎 | [Valenciennea puellaris](https://www.fishbase.se/summary/7246) | 亚喀巴湾、澳大利亚西北近海、印度尼西亚群岛海域、大堡礁海域、珊瑚海与大堡礁、南海、红海、太平洋（宽泛分布）、印度洋（宽泛分布） |
| 剑尾鱼 | [Xiphophorus hellerii](https://www.fishbase.se/summary/3231) | 瑙特拉河水系、阿克托潘河水系、拉安蒂瓜河水系、哈马帕河水系、松特科马潘淡水水系、夸察夸尔科斯河水系、托纳拉河水系、格里哈尔瓦河水系、帕帕洛阿潘河流域、乌苏马辛塔河流域 |
| 月光鱼 | [Xiphophorus maculatus](https://www.fishbase.se/summary/3232) | 帕帕洛阿潘河流域 |
| 花斑月光鱼 | [Xiphophorus variatus](https://www.fishbase.se/summary/3233) | 帕努科河流域 |
| 黄倒吊 | [Zebrasoma flavescens](https://www.fishbase.se/summary/6018) | 夏威夷群岛海域、太平洋（宽泛分布） |
| 紫倒吊 | [Zebrasoma xanthurum](https://www.fishbase.se/summary/12023) | 亚喀巴湾、阿曼湾、亚丁湾、波斯湾、阿拉伯海、红海、印度洋（宽泛分布） |

## 复现与验证

```sh
# 先准备 FishBase 26.06 五个 Parquet 表和 Natural Earth 10m lakes / marine shapefiles
python scripts/import-fishbase-distributions.py /path/to/fishbase-tables
python scripts/build-distribution-map.py /path/to/natural-earth /path/to/fishbase-tables
python scripts/report-distributions.py
npx tsx scripts/check-distribution-pins.ts
npm test
npm run build
npm run test:e2e
```

运行数据：`content/distributions.json`、`content/waterbodies.json`。完整来源缓存：`content/research/fishbase-distribution.json`。最终 14 种的构建输入：`content/research/remaining-reviewed-distributions.json`；每条水域与物种关系分别保存坐标出处、分布证据与编辑说明。构建脚本需要 pyarrow、pyshp、shapely；应用运行时不依赖 Python 或外部联网请求。
