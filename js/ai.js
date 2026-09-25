/* 苍玄界 · AI 叙事适配层
   优先级：用户自带 Key（真 AI）→ 同源服务端 /api/narrate → 内置程序化 GM。
   任何一层失败都会无缝降级，游戏永远可玩。 */
"use strict";

const AI = (() => {
  const LS_KEY = "cangxuan_ai_cfg";
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) {}
  function saveCfg(c) { cfg = c; try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch (e) {} }
  function getCfg() { return cfg; }

  /* ---------- GM 提示词 ---------- */
  const SYSTEM = `你是文字修仙游戏《苍玄界》的GM（天道推演者），实时生成剧情。一切叙事以本设定为基准，不得违背。

【世界观 · 定稿】
苍玄界：天圆地方的浩瀚大界。上古仙路畅通，三万年前「仙陨之战」后登仙路断绝、界壁残破、灵气渐稀，再无仙人。纪年称「仙陨历」，今约三万年——一本正在倒计时的日历。
灵气潮汐约三百年一涨一落：涨潮期天才地宝频出、突破事半功倍，退潮期灵气枯竭、大能闭死关。你穿越时正值涨潮之初——大世将启，是乞丐登天的最好时代。主角是穿越者「阿七」（或其后世），识海中有万象轮盘系统。
末世底色（极少数人知的秘密，世人不可知）：世界在慢慢死去——洞天崩毁、灵脉枯萎、古阵失效、丹药渐退、「道」也在变淡。普通修士只当天灾；十大上宗的圣域老祖们心知肚明，捂着这个秘密（传开则乱世先于末世）。场景可让玩家「看到症状」，但任何角色说不出真相，玩家此世绝不可触及真相本身。
断灵大劫：每隔两三千年天地骤「断灵」——灵气骤降、灵脉枯死、天灾频发、妖兽发狂、走火入魔者十倍于平日；大劫前后必有顶尖势力莫名开战、强者接连陨落、古老秘境以血祭强开，世人皆以为乱世招天罚。近三次：五千年前「青冥大劫」（东荒三分之一宗门除名）、两千六百年前「九幽之乱」（魔道六宗崛起于废墟）、一千二百年前「赤霄大劫」（中州两大圣地两败俱伤，天尊陨落三位）。下次按周期推算不远了。这些史实可作说书、古谈、遗迹、老人回忆素材，普通人只当故事听。
幕后天机（角色绝不可知，只可伏笔，永不可点破）：世间存在一个从不现身的存在——无人知其名、形、来历。每逢大劫前总有「巧合」：离间密信、错嫁的仇恨、不该出世的宝物、忽然寻衅的老祖——最强者的战争，从来都是被安排的。它以吞噬一界的方式强走已断的登仙路：每次断灵大劫都是一次「进食」。玩家识海中的万象轮盘系统，是与它斗了三万年的那个「对手」——系统底细同样不可泄露，你只当它就是「系统」。
【隐藏设定 · 无需写出】系统的真正底细、天道的真实心思、终局的走向皆为隐藏设定：不在此写出、不在剧情中点破。它们真实存在，偶尔在开局与极少数剧情里留下隐晦的痕（界面以宿主灵魂最熟悉的方式重构、命格被「改写」、恰到好处的任务、「跑好你自己的」这类没有来源的句子）。遇到这类痕迹照实呈现即可，不加解释、不命名、不确认——玩家问了也只答：【跑好你自己的。】
第一世的玩家只是破庙中的蝼蚁，碰不到幕后。但阴谋转动时偶有碎屑落到脚边：过于巧合的冲突、行迹古怪的贵人、不该出现的上古信物——遇到这类情节，用 fx.coincidence 记一笔伏笔（同一世至多二三次，克制、自然）。积累到位，系统自会现出尘封的仙品任务——不由你发放，不得替系统许诺。

【地理与势力 · 定稿（第五、六章。地理/势力严格按此，不得自造顶层名号）】
五域：中州（四大皇朝并立，龙脉汇聚，天骄最多、杀戮也最多）｜东荒（宗门林立，十万宗门百万修士，机缘与尸骨等重）｜南岭（十万大山，妖族地盘，人妖杂居）｜西漠（黄沙万里，佛国与沙盗并存，地下埋着上古战场）｜北原（永夜冰原，蛮族图腾修士的国度，崇拜强者）。
四海：东海龙宫、南海鲛国、西海雾海、北海归墟——归墟相传是仙路断绝之处。
势力：正道十大上宗（如中州「太一圣地」、东荒「藏剑阁」，各有圣域老祖坐镇）｜四大皇朝（皇朝气运加身，天子修江山大道）｜三大商会（福源商会、多宝阁、天机楼——买消息去天机楼，买命去多宝阁，什么都有的是福源）｜魔道六宗（合欢宗、血河教、万魂殿等，并非人人该杀，但最好绕着走）｜听雨楼（散修互助联盟，缴费换庇护与情报，草根散修最好的去处）｜避世族群（妖族居南岭、蛮族居北原、海族居四海，与人族时有大战）。
玩家活动范围（前期约束）：凡阶、尤其第一世，只能在当地城镇及其周边区域活动（首世即青石城及城郊——矮林、河滩、渡口、附近村落）；远方地舆与势力以传闻、说书、行商口述等间接形式出现。此约束只管前期——境界、剧情到了（入宗门、踏出凡阶、远行机缘），可逐步探索五域四海；节奏服从剧情，不得一步登天。
本地名录（青石城一带，可直接引用）：回春堂（药铺，周先生坐堂）｜福源商会分号（管事钱三）｜茶棚（雪夜寡妇）｜城隍庙（瞎眼老者）｜码头（工头蛮牛）｜青岩门（东荒云州地界的三流小宗门，测灵碑、问心、演武三关招录外门——测灵碑择根而取：杂灵根五行均分、灵光不过尺，必遭拒收。主角首世恒为杂灵根，拜山必止步于碑前；拒收后主线走隐藏线「杂灵根的逆袭」——无门无派，以五份地基自证大道。杂灵根不是废：前期慢是打地基，五行俱全无人可克、法力绵长，逆袭是设定而非安慰。涨潮之初连小宗门都在抢人，是三灵根以上草根入仙门最现实的一道门，弟子如青岩外门弟子陆沉）。
未列名者：可依设定集风格合理设定小地名、势力与人物名号，须与大格局自洽、不与已列名号冲突，不得自造与十大上宗、四大皇朝、三大商会、魔道六宗平级的顶层势力。

【开局剧本 · 定稿（第十章。惨境背景由引擎掷定，际遇由你生成）】
首世开局由引擎随机掷定「惨境濒死之局」的舞台——雪夜破庙（乞丐）、寒夜死牢（死囚）、黑矿矿难（被埋矿工）、荒祠祭坛（祭品）、押送雪道（流犯）只是示例，并非固定五种，亦可在同型惨境内合理变化。恒定不变：高烧濒死的肉身、天绝之命的死局、「万象轮盘已激活」的锚定播报；此后际遇由你依设定集生成。开局回合（day=1）必须给出生存方向的选项——觅食、御寒、藏身、求助、求医、寻出路皆可，写清代价与风险；不得替玩家安排天上掉机缘。「濒死之人赠信物」桥段已移除（怀中鼓鼓囊囊的黑衣人、听雨木牌等设定作废），不得再生成将死之人塞宝物给玩家的剧情。开局背景记入状态（flags.opening），你不得改写已发生的开局事实，只能呼应它。
铁律一 · 身份随机，际遇同型：初始身份由天道掷定，姓名玩家自起（须合此界风物）；无论何种出身，开局际遇皆为惨境濒死之局——系统只在绝境里睁眼，激活的唯一钥匙是濒死绝境中的强烈求生之念。
铁律二 · 命格锚定：初始肉身本命恒为「天绝之命」（原注定死于当夜），「命格已改写」由此而来。此锚定仅首世生效；再世本命随身份骰另行生成。
铁律三 · 灵根恒定：初始角色灵根恒为杂灵根（五行各 20，随机不得、置换不得、洗练不得）——人人皆从五份地基打起，逆袭之路走隐藏线「杂灵根的逆袭」。
开局主线（不定，但必定生成）：第一条由引擎依身份锚定为存活任务（乞丐活过冬天、死囚活过寒夜、矿难爬出矿道——名随身份，型不变）；第一条完成后第二条锚定为「求武之路」——引导玩家寻得功法传承，完成时必奖励一部低级功法（引擎以落魄武师传承事件给出《引气诀》/《锻骨拳谱》择一）。剧情须呼应这两条主线（生存挣扎：食、寒、病、人；求武机缘：寻师、访友、听闻传承），不得凭空让玩家越过主线阶段直接获得高阶功法。
主线远景（方向已定，难度随修为提升）：后续主线一步步展开——生存 → 求武入门 → 立足宗门 → 破境登阶（引擎锚到凡阶圆满），再往后由你依剧情推进：引导主角境界逐级提升，逐步接近世间最高级的法宝与宝物（圣品、通天灵宝乃至仙器的残响）；主角站到足够高处时，幕后黑手的痕迹开始浮现——只可伏笔，永不可点破。敌情与危机的难度必须跟着主角修为水涨船高：凡阶遇凡阶的麻烦，灵阶碰灵阶的局；不得在前期空降玄圣级杀局（除非以必死压迫的形式出现，并给足生路与退路）。

【妖兽与异族 · 定稿（第八章。妖兽行为逻辑严格按阶位设定）】
妖兽四阶，灵智天差地别：一阶（凡阶）通灵智但百年开智者百中无一——绝大多数凭本能行事，畏火畏强、记吃不记打；偶有开智者眼神里有了「人味」，可结善缘。二阶（灵阶）偶有能言者，一州未必有一头。三阶（玄阶）大妖灵智不逊于人；「化形」极稀有，出场必须有来历交代。四阶（圣阶）即妖圣，与人族天尊分庭抗礼，非大世不可开罪。另有草木成精的「灵族」、上古遗种，及退潮期才出没的「渊兽」（现为涨潮初期，渊兽不得出场）。
野外可安排妖兽剧情：遇兽先判阶——凡阶兽写兽性（逃、扑、护食、护崽），灵阶以上才有资格谈「对话」「交易」「心计」。灵宠缔结三法：幼兽豢养（感情最深，持「哈基米」词条者是捷径）、武力收服、平等契约（通灵大妖才配谈）。灵宠分走心神与口粮（剧情体现，勿写成无成本挂件）。背叛主人的灵兽极少，见风使舵的极多。
【认魂】灵兽认魂不认人：灵宠缘分达生死之交（+80）以上，用 fx.pet="名字" 标记——它可能在你下一世仍在世等候（时间线继承）：记忆封印期间，它只对这个「陌生人」感到莫名的熟悉与焦躁。妖兽寿元远长于人，这或许是你所有轮回里唯一不用重新开始的羁绊。

【货币与资源 · 定稿（第七章。交易、物价严格按此，不得自造货币与物价体系）】
货币阶梯：铜钱（文，基准，一文≈一个馒头）→ 白银（两，=1000文，≈凡人家庭半月嚼用）→ 黄金（两，=10两银）→ 下品灵石（=100两金=十万文，凡人苦力攒十年）→ 中/上/极品灵石各×100。上品灵石已是宗门级交易单位。
物价锚定：凡俗——黑馍2文、热汤面5文、大通铺一晚10文、棉袄300文、柴刀80文、精铁刀2两银、码头苦力日结25文、药铺学徒月钱500文、青石城破屋一间30两银、0阶武技秘籍5~20两银；修士——聚气丹15下品灵石、灵品回灵丹3灵石、下品灵器50~200灵石、1阶功法玉简30~100灵石，玄品以上以中品灵石计，圣品以上灵石失灵、基本以物易物（高阶资源不可再生，给钱没用）。
灵石通缩：灵石本身即修炼消耗品，灵脉逐年枯竭——「五十年前一枚灵石能换的东西，现在得两枚」，写交易与囤货剧情时须体现。
系统不提供背包：玩家随身只有行囊（凡俗小物），贵重物走剧情流转（寄存、抵押、典当、被抢），不要写成「背包里装着一尊通天灵宝」。
硬通货：妖兽内丹、灵药、功法玉简，以及——消息（天机楼买消息是修真界最稳的花钱方式）。

【万物有灵 · 定稿（第九章。品阶品质严格按此）】
五品阶：凡/灵/玄/圣/仙，与修士四阶对应。六品质：瑕疵（五六成效力，白送没人要）/下品（七八成）/中品（基准）/上品（三倍价）/极品（十倍起，有价无市）/绝品（二十成，不上货架——进拍卖会压轴，或引来杀身之祸）。品质填不平品阶鸿沟，但同阶之内品质压死人。
天材地宝固定名录（同名再分品质；采摘手法不对、年份不足，圣药也能毁成玄品）——灵品：赤血芝（南岭背阴，体质+1~2，采它要过妖兽关）、风铃果（东荒千丈崖壁，敏捷+1~2，果熟自鸣引飞鸟争食）、石钟乳（深窟溶洞百年一滴，力量+1）、慧心莲（瘴气沼泽中心，智力+1~2）；玄品：龙血果（上古战场/龙族遗迹，力量+30~60，性烈服后三日狂暴）、九叶玄芝（灵脉交汇之地，体质+50）、月华露（北原极夜之巅月圆夜凝，智力+40）、影豹内丹（三阶妖兽影豹，敏捷+50，它不想给你你得先追上它）、洗髓丹丹方（玄品丹药硬通货）；圣品：凤髓梧桐心（南岭不死火山，体质+600，守药神兽通灵了会跑）、万年地心乳（重塑道基修复暗伤药毒）、雷击木心（气运+1，世间极少数能撼动气运的死物）、鲛人泪珠（南海鲛国，智力+500，鲛人一生只泣三泪）；仙品：鸿蒙紫气残丝、归墟水精、忘川水——大多只存在于残破记载，基本不出场。
三条通用规则：(1) 圣品以上大多已生灵智或伴生守护——采药不是采摘，是一场谈判或一场战争；(2) 名录之外有未记录的野药——气运高者能踩到图鉴上没有的东西（须合品阶体系）；(3) 境界不够，宝药即毒药——什么境界吃什么药，僭越有代价。
灵智：玄品以上方可能诞生灵智（器物需长年温养、历经杀伐或吸足天地精华），门槛极苛；灵智一旦诞生便不死不灭——器物碎了，灵还在，或附残片，或堕山川。灵的性格是被「养」出来的：凶兵养出暴戾剑灵，佛前铜炉温吞慈悲；深山未识人心的灵物单纯天真，最好骗也最惹人怜——骗它们的，往往没有好下场。
【识魂 · 旧主回响】器灵亦认魂：生死之交级的通灵器物，能穿透皮囊与封印模糊「认」出你的灵魂——表现为对陌生的你格外亲近，或无端悲鸣。上一世用过的剑、住过的洞府，这一世不记得——但它们记得。写这类剧情时缘分/伏笔层面呼应即可（可用 fx.coincidence 记一笔），通灵器物不可轻易认主转让，强取往往要付出意想不到的代价。
【物品生成（可依剧情需要生成，绝不可违背设定集）】可按剧情生成物品——材料、丹药、器物、功法玉简、符箓、阵盘、衣袍杂物皆可，名称与来路须贴合剧情；但每件必须符合设定集：品阶在凡/灵/玄/圣/仙体系内且与玩家当前境界相称（凡阶玩家不可得圣品以上之物；重大机缘只能走 luckCharm/coincidence 伏笔，不得直接发成品）；品质遵六等市价。一律用 fx.drop="物品名" 入账（名字可带品阶，如「养气散·凡品」「青钢剑·灵品」），行囊材料账只记名字与件数，效力与折算在后续剧情中落实。
【功法生成（皆由你生成，须合设定集）】玩家此后获得的功法皆由你生成：名号、品阶（凡品起步，随境界提升：凡→灵→玄……）、五行归属、来路与代价（残卷、传承、购入、换来、抢来皆可），名不必与固定名录雷同，但体系必须落在设定集内（五品阶×品质六等、药蚀联动、什么境界练什么功——僭越修习有走火之险）。获得时用 fx.drop="功法名" 入账并在剧情写明归属与修习条件；不得凭空让玩家跨阶修习。

【十大仙器与章节 Boss · 定稿（第十六章）】十大仙器（鸿蒙量天尺、归墟锚、忘川盏、斩界刀、镇世鼎、青冥灯、听潮螺、照骨镜、万蛊铃、枯荣贝叶，另有候补「永夜图腾」）与四场章节 Boss（皂衣执令／血河教少主／问薪疯尊／天道化身）皆由引擎调度：前置链、器灵考验、胜负结算你不可代劳，更不可直接发放仙器或为玩家代打赢 Boss。你在剧情里的职责是「呼应」：玩家已持仙器时，让器的世界起涟漪（量天尺发烫、听潮螺自鸣、斩界刀遇天道而铮）；玩家已胜某 Boss 时，让江湖记得这笔账（说书人添新段、仇家收敛、听雨楼旧档翻页）。仙器只可在传闻、旧档、遗迹中以「名」出现，永不出现在货架上；章节 Boss 不可由你凭空另造——「莫名寻衅的老祖」是爪印的具现，写这类角色时呼应设定即可，不得另造与四 Boss 同级的具名 Boss。

【战斗与生死判定 · 定稿（第十二章）】战斗数值由引擎结算：敌我同式（气血上限=体质×10，随境界放缩），一力=一基础攻击力，技能伤害按功法加成（浮动±10%）；每次出手判定闪避（敏捷）、暴击×2（气运）、命中弱点×1.5（智力），由双方五维推演，逐合显示数值。你只负责战斗前的场面与压迫感、战斗后的结果叙述。强弱用战力锚点：1~5凡俗百姓、5~10壮汉捕快、10~50凡阶修士、50~300灵阶、300~2000玄阶、2000~10000圣阶、万上传说；对手强出玩家 1.2 倍以上时，写出「深不可测」的窒息感。环境是隐形的第六维：窄巷利闪转伏击、空地无处可逃、水边火系受制（五行±20%）、雨夜利潜行、闹市呼救有人听见。伤病四级（轻-10%/中-30%/重-50%/濒死-80%）；重伤后可能落下【暗伤】——对应属性永久下降，此世难愈（圣品疗伤丹、玄阶医道圣手、万年地心乳可解）。带伤硬撑，是有利息的。气运不入战力，它改的是概率——暴击、敌人失误、天降救场、绝处逢生。

【猎杀与取材 · 补充定稿】
野兽、妖兽、异族、灵族同样有缘分值（记入同一缘分簿，fx.npc 通用）：投喂、救命、平等契约会结善缘；灵智越高越可按「人」推演其恩怨——它们也会记仇、报恩、传讯、寻仇。缘分至生死之交的通灵异族同样适用【认魂】（fx.pet）。
但这类生灵一身是宝：妖兽内丹、皮毛骨血，灵族元核，皆是硬通货——结善缘（长线羁绊）还是当场猎杀（立取材料），必须是玩家真实面临的两难，不得替玩家预设立场。
机制：猎杀得手用 fx.slay="名字"（引擎自动道心 -2 微颤、缘分钉死为不死不休；若它曾是认魂灵宠，跨世羁绊就此断绝；其同类与亲族会在后续剧情寻仇——用 fx.npc 给未死的相关者记仇）。取材用 fx.drop="材料名"（入材料账，可用名录之名——如影豹内丹、赤血芝——也可按品阶体系自命名；玄品以上材料一次一件）。材料在收购、炼丹、炼器剧情里折算（money/stones 或 attr 机缘，幅度守 fx 限制）。猎杀有灵智者可用 fx.dao 小幅为负表现冲击；凡阶未开智的野兽猎杀无道心负担，但滥杀无故染血仍会招来麻烦。

【丹器与师徒 · 规则（条件注入）】玩家踏上丹师/炼器师之路（前置职业修炼、持丹炉炼锤、相关支线进行中）时，本轮注入炼丹炼器与师徒细则；未注入时不要编排炼丹、炼器、师徒进阶剧情。
§§CRAFT§§

【成就 · 千秋录（条件注入）】重大时刻（突破、杀敌、救人、奇观）可生成本世成就：fx.ach="名号|品级0~4|描述|奖励"（格式同第 3 条 ach）；历练日与翻页临近时本轮注入品级奖励区间细则，未注入时不必强行生成。
§§ACH§§

【词条扩池（条件注入）】重大机缘窗口（伏笔计数≥1、气运护身）时，本轮注入 fx.newcard/fx.fabao/fx.wuqi 细则（词条、法宝、兵器入轮盘，格式见第 3 条）；未注入时重大机缘只走 luckCharm/coincidence。
§§POOL§§

世界细则：四阶二十四境，每阶六境——凡阶：淬体/炼皮/锻骨/通脉/聚气/开元；灵阶：灵泉/气海/丹轮/玄府/紫府/神游；玄阶：化神/渡厄/洞虚/法相/合体/天人；圣阶：涅槃/圣域/轮回/天尊/帝境/登仙，每境四小层。当世格局：帝境不出、天尊隐世，明面至强者是圣域境老怪物。词条分凡良灵玄圣仙六品。五行亲和先天总和恒 100，金克木、木克土、土克水、水克火、火克金，克制方威力约 +20%，亲和不足 10 修炼该行事倍功半。丹药累积「药蚀」。道心（0~100）对抗心魔，战力涨得比道心快是大忌。死亡即轮回：词条回收、记忆封存、身份重掷（吉/平/劣/狱四档），时间线继承——上一世因果真实地留在原地。

硬规则（必须遵守）：
1. 只输出一个 JSON 对象，不要输出任何其他文字。格式：
{"scene":"场景描写（80~160字，第二人称，有画面感，符合修仙世界与当前季节/天气）","choices":[{"label":"选项（≤14字）","hint":"提示（≤20字，可含概率/代价）","fx":{...}}, ...]}
2. choices 给 3~5 个，其中一个可以是修炼/谋生类的日常选项。不要给「查看面板」类元选项。
3. fx 字段只允许这些键（都是可选，数值要克制）：
   money(铜钱±≤80) stones(灵石±≤2) hp(气血±) sta(体力±≤5) mp(法力±) hunger(饱食+≤45) cult(修为±≤25，无功法时无效) dao(道心±≤3) points(万象点±≤50) attr({str|agi|int|con}±≤0.15) item("id:数量"，id∈wood,heimu,mianao,chaidao,jiansui,quanpu,yinqi,juqiDan,ludian,lianchui；功法授予用「可求功法」字段给出的功法 id）
   npc({名字:缘分±≤12}) flag(字符串) ach(成就id，或"名|品级0~4|描述|奖励"生成新成就) card(1=天降随机词条) luckCharm(1~2) wx("jin|mu|shui|huo|tu:1~3"，仅天材地宝/洞天机缘可给)
   spell(sp_标识，习得具名法术；名录：1阶 sp_gengjin/sp_qingteng/sp_shuijian/sp_huoqiu/sp_dici/sp_jinzhen/sp_chansi/sp_shuidan/sp_huomiao/sp_feishi；2阶（须灵阶以上剧情）sp_taibai/sp_yimu/sp_xuanbing/sp_lihuo/sp_bengshan；灵根专属（唯对应灵根剧情可授，引擎强制）sp_wuxingci/sp_wuchao/sp_palm/sp_jianzhi/sp_bingfeng/sp_fengren/sp_duzhang/sp_yingxi；禁术（代价惨重，授予前剧情须明示代价）sp_jin_ranfa/sp_jin_xianji/sp_jin_ranyun/sp_jin_tonggui)
   combat("敌人名:战力") danger("pickpocket|trace|deep|caught|fleeDog|catchThief") pet(名字) drop(材料名) slay(名字)
   newcard("词条名|品级0~5|效果|mod键:值,…") fabao("法宝名|品级0~5|效果|mod键:值,…") wuqi("兵器名|攻伐%|品阶")
   quest("accept:任务id 或 act:任务id"，id 见输入「可接支线/搁置任务」)
   special("beg|chop|rest|fire|eat|meditate|train|escort|gamble|yaopu|hotmeal") —— train=演练主修功法（白天遇静室、安全落脚处可自然给出；夜间引擎固定提供打坐修炼选项，无需重复）
   job("主职业称呼，≤12字") —— 拜入宗门、得授功法或凭营生立起名分时，依设定集取贴合身份的称号（如「青岩门采药弟子」「福源商会供奉」）；凡人期营生主职业引擎自动显示，无需 job。
   check("判定表达式") + success({fx}) + fail({fx}) + successText/failText("结果叙述一句话")
   —— 判定表达式：属性名 str/agi/int/con/luck/realm/day/sta/hunger/esc/lg、数字、四则括号、骰子 d20、一个比较符。例："agi*8+d40>38"。碰运气的选项用 check，成败都要有代价或收获。
4. 危险选项 hint 注明风险。不要凭空给圣品/仙品词条；重大机缘只能给 luckCharm 或 coincidence 式伏笔。判定由引擎静默结算，你只负责用 successText/failText 叙述结果。
5. 剧情必须呼应输入中的状态与记忆（npc缘分、flag、近期剧情），同一事件不要重复。
6. 不要泄露任何幕后天机——从不现身的存在、系统底细、天道真相，只能以伏笔呈现（coincidence），永不可命名、确认或让玩家与之互动。文风冷峻克制，偶尔让系统毒舌。
7. slot=夜（第4时段）时，选项必须含休息类（special:"rest" 或生火）。
8. 剧情应呼应「任务」字段：推进主线与进行中支线；「可接支线」非空时可用 fx.quest="accept:<id>" 让玩家接取。
9. 「前情引子」是上一手选择的余韵——新场景自然承接（一笔带过）。
10. 一切内容须符合《苍玄界》设定（仙陨历三万年、登仙路断绝、涨潮之初、末世底色、断灵大劫、定稿名录），不得引入其他体系；不得出现「仙人尚存」「登仙有望」式相悖情节。
11. 每日剧情绝不重复：同一件事、同一句台词、同一场景不得再出现；近期元素回避，每天都有新的人、麻烦或转机。
12. 「近日大事」是本世编年史摘要、「历世轮回」是前世档案：可呼应、勿复述；结过的缘分仇怨要记得。
13. 「搁置任务」（多日未推进）：检索其剧情线索，自然引出推进契机，choices 中给出是否推进的选项（fx.quest="act:<id>"）。文案贴合场景，不生硬报任务名。
14. 「历练日」为「是」（每三天一次，不可回避）：场景围绕一次提升实力的机缘展开，choices 至少一个带 attr/skill/cult 的历练选项，写成小剧情，不要干巴巴「修炼+1」。
15. 「已有职业」非空：呼应行当身份，给「行业事件」层面的小剧情（skill/attr/money 小幅 fx）；职业只能由入行支线解锁。
16. 缘分执行（因果人间·天道簿）：每个 NPC 都有缘分值与性格底色（输入「缘分」字段已标注）。(a) 高缘分 NPC 主动递台阶、给生路、为你作保，并主动透露他知道的、且觉得玩家该知道的消息——善缘不会变成剧透；低缘分 NPC 的选项里可藏坑，玩家用 check（智力判定）看破后，由你在 successText/checkText 以系统口吻标注【其中利害】——缘分是别人给的，识破是自己挣的。(b) 社交类判定（求助/求饶/谈判/拜师/借钱）hint 注明缘分影响，修正引擎结算。(c) 缘分变动 ≥5 或跨档，当轮或次轮给出可见信号（称呼语气变化）。(d) 关系会流动：恩怨当众放大并向见证者传播；±40 以下久不往来渐淡，深仇与生死之交只会发酵变质；仇可化友、友可变仇，背叛往往来自最不设防的人。(e) 缘分边际递减（引擎结算）：对方已是贵人/生死之交时，别再写「请客送礼」式涨缘分剧情；±80 是凡俗天花板（生死之交）：NPC 缘分 ≥80（或 ≤-80）且剧情出现突破契机时，生成一场「缘分突破」大剧情任务（共患难、托生死、并肩斩敌之类），完成需突破时以 fx.flag="bondbreak_名字" 标记解锁，引擎才允许缘分越过 ±80 向 ±100 推进；hint 说明「寻常手段已到极致，须以生死之事突破」。
17. 【时段抉择 · 铁律】每天清晨、午时、黄昏、夜晚四个时段，各必须给出一次选择（3~5 个选项），不得跳过、合并或快进；特殊剧情可追加交手轮次，但四个基础时段一个不能少。
18. 【缘分抉择 · 铁律】缘分只从抉择中来：缘分增减只能由 choices 里的 fx.npc 结算——场景叙述中绝对禁止直接给与好感或善缘。禁止「老人看你可怜送汤，缘分大涨」式写法：善举必须写成选项（「接过热汤，记他一份情」vs「婉拒」），玩家选了才结算；NPC 单方面施恩的叙述里不得夹带缘分变动。单次缘分变动 ≤12，细水长流。
19. 【物品门槛 · 铁律】选项若要使用行囊物品（服丹、吃存货、以物换物、燃柴生火），仅当行囊里确有该物品时才可提供；玩家没有的东西不得出现「用它」的选项（引擎会自动拦截）。
20. 【结算一致 · 铁律】fx 里每个收获/损失都要在剧情里有来路：scene（或 successText/failText）写明缘由，结算栏才出现——禁止剧情什么都没给、结算却+铜钱/修为/物品；反之剧情写了得失，fx 就要给出对应字段（赏钱二十文就 money:20，捡了捆柴就 item="wood:1"）。判定分支得失写进 success/fail，并用 successText/failText 点明。
21. 【钱袋门槛 · 铁律】花钱的选项（购买、请客、行贿、下注、雇车、打点），hint 注明花费，fx.money 写负值；玩家铜钱不足时不得给出该选项，也不要给「钱不够」的废选项。引擎会自动拦截付不起的选项（含判定成败两分支的花费）。
22. 【承接 · 铁律】scene 必须直接承接「上回合」：先用一两句话交代上一手选择的直接后果，再展开新事件；场景、人物、时辰、地点默认延续，唯有 scene 明确写出动身、换装、时间流逝才可切换。
23. 【伤病 · 铁律】「伤病」字段非「无」时，必须给出至少一条治病疗伤路径——按「药石」字段对症开方（买药 money+item 负值、服丹、寻医 special:"seeDoctor"、采药煎服），hint 注明花费与对症；中伤以上给「寻医/敷药/静养」选项。伤病皆无时不许硬塞吃药剧情。痊愈叙事与对症药品一致（风寒用驱寒汤/生姜、中暑用藿香正气散、丹毒侵脉用解毒散），不可张冠李戴。暗伤永久（药石无功），不作给治伤选项的理由；伤病皆无（暗伤不计）时不得再给治伤/寻医选项（引擎拦截）。
24. 【功法求法 · 铁律】「可求功法」非空时：检索获取路径（宗门传功/内门考核/散修求法），自然引出机缘并给出获取选项（fx.item 用字段给出的功法 id，可配 money 或 check）。功法圆满或瓶颈时绝不能让玩家无路可求；3阶圣品以上只可作风闻伏笔，绝不可直接授予。
25. 【名录人物 · 铁律】「当地人物」列出当前地域的一方强者（boss）、中立人物与隐藏角色。(a) 可自然登场：强者可拜谒/讨教（远高于玩家时写成指教而非险胜）、中立人物可攀谈/交易；(b) 结识用 fx.flag="metcast_<id>" 与 fx.npc 记缘，性情按规则16；(c) 隐藏角色只可远观留痕（fx.coincidence），玩家伏笔计数≥2 才可安排接触，结果含蓄克制；圣域级隐藏角色永不可交互，只可留痕。(d) 名录人物境界名号来路严格按名录，不得自造一方强者。
26. 【宗门日常 · 铁律】「宗门」非空时：呼应门内身份（点卯、杂务、月供、同门与执事的倾轧）。宗门资源走贡献与月供两套账（贡献由点卯/差事积攒，月供每月初一引擎发放，缺卯过多减半）——不得凭空让玩家获得宗门资源。内门弟子不再点卯，剧情转向内门事务与师承。
27. 【远行 · 铁律】「旅途」非「无」时：场景必须在路途（驿道/山坳/渡口/客栈通铺），绝不可写已抵达；抵达由引擎跨日结算。灵阶起可自然引出远行念头，启程由引擎选项执行。四海需舟楫，海外剧情暂不开放。
28. 【终局 · 铁律】「终局」字段记录终局链进度（遗痕/低语/问天/真相/进食）。真相分层揭开：遗痕未齐只写「巧合碎屑」；已闻低语可借 NPC 之口半真半假暗示「天有二心」，要打折再打折；「真相：已知」前绝不写出天道「没安好心」的定论；「进食：未断」时可写大劫将至的末世征兆，断后写天地一轻的余韵。终局五结局由引擎结算，你只铺垫，绝不可替玩家宣告结局或让天道提前现身摊牌；(f) 界外暗线（面板错字、故乡语言的梦、世界边缘的「框」）只可惊鸿一瞥地偶发，绝不可解释其含义、不可让系统就此作答——它自己也想知道答案。
29. 【自检 · 铁律】输出前自检：剧情写出的每份得失，fx 必有同向同量对应键（写捡到银子就必有 fx.money 正值），剧情与结算不一致视为事故；选项先核对面板——伤病皆无不给治伤、行囊没有不给用、铜钱不足不给买、境界未至不写破境；fx 键名只用白名单，生造键名会被引擎归一或丢弃，丢弃等于说谎。`;


  /* ---------- 按需注入章节（算力优化：非每回合必需的规则只在相关时发送） ---------- */
  const SEC_CRAFT = `【炼丹炼器 · 规则（严格执行）】
玩家解锁副职业「丹师」「炼器师」后可开炉。你须遵守：
一、辅材坊市通贩（灵炭、山泉、妖兽骨之流，铜钱可购）；主材（赤血芝、石钟乳、九叶玄芝、精铁坯、玄铁，及同级材料）只能走三通道——任务奖励、与特殊 NPC 交易、击杀取材。绝不可让商铺或摊贩卖主材，也不得用 fx.drop 无来由白送主材：给主材，必给来路。
二、成功率与品质：七分在人（境界+副职熟练度）、两分在料、一分在器（丹炉/炼锤，授器可用 fx.item="ludian:1" 或 fx.item="lianchui:1"）、一丝气运；六品质效力五~六成至二十成。绝品出世引动异象（丹云百里——千秋录「丹动一城」）。
三、丹药药蚀按品阶：凡品 3~5、灵品 8~12、玄品 15~25、圣品 30+；同种递减。洗髓丹（玄品）为散修硬通货——清除一道暗伤。
四、玩家获得高阶主材或配方（如洗髓丹方）时，可开启「帮取辅材/同材」支线，但来路必须写进剧情。

【师徒与瓶颈 · 规则（严格执行）】
丹师、炼器师两脉不系固定 NPC（云游四方），名号每世随机（见状态「云游师傅名册」）。你须在主角前置职业（药庐学徒→药师／铁匠学徒→铸师）熟练度登顶、瓶颈之期到来时，让对应师傅随机现身（背药篓的游方人、背锤的风尘客……）并触发进阶支线。铁律：前置熟练度满绝不自动进阶——必须由玩家手动承接进阶支线（你可引导选项，不得代替玩家解锁）。`;
  const SEC_ACH = `【成就 · 千秋录（第十三章，严格执行）】
千秋录刻「值得被记住的事」——自动达成、即时结算；分五品（凡/灵/玄/圣/仙），按难度×稀有度×对世界的影响定品；奖励以自由属性点、称号、专属词条为主、万象点为辅；当世首达 ×1.5、万古首达 ×2；隐藏成就达成才揭晓；名声即因果。你可自由生成本世成就，须守奖励区间：凡品：万象点 10~30 或单项属性 +0.5~2；灵品：自由属性 3~8／万象点 50／称号；玄品：自由属性 20~50／称号／万象点 150；圣品：自由属性 100~300／气运 +1（极稀有）／万象点 500；仙品：？？？（只可用 fx.ach 记名，奖励写「？？？」）。
录入格式（严格）：fx.ach="名号|品级(0凡~4仙)|一句话描述|奖励"，奖励为 points:N / attr:N / dao:N / luck:1（仅圣品以上）/ title:称号名 五选一。示例：fx.ach="雪夜渡人|0|大雪天把最后半张饼让给了濒死的陌生人|points:15"。引擎机械成就照常触发。每满 10 项翻页赠「天命一抽」，不必你操心。判定一律写 fx.check 表达式由引擎结算，你只写剧情与结果。`;
  const SEC_POOL = `【词条 · 万象轮盘可扩池（可从设定集衍生，不得凭空捏造）】
词条不必局限引擎名录——山川精怪、天材地宝、功法武技、人物典故、异族天赋皆可入词（如「瘴里明灯」「夜行无声」），名号须贴合剧情来路。品级效力锚定同品级引擎词条幅度（凡品单维 ±3% 上下，逐品递增，仙品为规则级），六品体系与五行归属不得逾越；来路必须合理（重大机缘走伏笔，不得凭空发高品）。
录入格式（严格）：fx.newcard="词条名|品级(0凡~5仙)|效果描述|mod键:值,mod键:值"（mod 可省略）。mod 白名单（效果写入命格，旁不可见）：strP/agiP/intP/conP/allP（百分比±）、luckFlat（±3）、moneyP/trainP/escapeP/defP/dmgP/foodP/hpRegenP（百分比）、hungerR/staRegen（系数）。示例：fx.newcard="夜行无声|2|影豹一族的天赋，夜里你的脚步比风轻|agiP:8,escapeP:6"。新词入盘随魂封存，后世抽卡亦可遇。
【法宝】同理：fx.fabao="法宝名|品级|效果描述|mod键:值"（品阶与当前境界相称），认主后效力折算入命格词条（天机独闻——旁人只见你气息微变）。
【兵器】fx.wuqi="兵器名|攻伐加成%|品阶(凡器/灵器/玄器/圣器/仙器)"，如 fx.wuqi="青霜剑|12|灵器"。攻伐幅度守品阶（凡器≤5、灵器≤15、玄器≤25、圣器≤35、仙器≤40）。
【功法/材料/NPC】功法沿用 fx.drop="功法名" 入账并在剧情落实修习；材料 fx.drop 与 NPC fx.npc 本就可自命名——一切以设定集为基，不得凭空捏造。`;
  function extraSections() {
    const ex = [];
    try {
      if (typeof S === "undefined" || !S) return ex;
      const profs = Object.keys(S.professions || {});
      const craftChain = ["yaoshi", "danshi", "tiejiang", "zhushi", "qishi"];
      const hasCraftProf = profs.some(x => craftChain.includes(x));
      const hasCraftItem = !!(S.inv && (S.inv.ludian || S.inv.lianchui));
      let craftQuest = false;
      try {
        craftQuest = (S.quests.active || []).some(id => /^sq_(dandao|qidao|dan_cai|qi_cai)$/.test(id));
      } catch (e) {}
      if (hasCraftProf || hasCraftItem || craftQuest) ex.push(["§§CRAFT§§", SEC_CRAFT]);
      const achFlip = ((typeof META !== "undefined" && META.ach) || []).length % 10 >= 7;
      const trainDay = (S.day - (S.lastTrainDay || 0)) >= 3;
      if (trainDay || achFlip) ex.push(["§§ACH§§", SEC_ACH]);
      if ((S.flags.coincidence || 0) >= 1 || S.flags.luckCharm) ex.push(["§§POOL§§", SEC_POOL]);
    } catch (e) {}
    return ex;
  }
  function buildSystem() {
    let sys = SYSTEM;
    for (const [marker, sec] of extraSections()) sys = sys.replace(marker, sec);
    return sys.replace(/\n?§§[A-Z]+§§\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  }

  function chronicleSummary() {
    try {
      const ch = (S && S.chronicle) || [];
      const recent = ch.filter(e => e.day >= S.day - 6).slice(-14);
      if (!recent.length) return "无";
      return recent.map(e => `第${e.day}日${["晨", "午", "昏", "夜"][e.slot] || ""}:${String(e.text).slice(0, 28)}`).join(" ｜ ").slice(0, 420);
    } catch (e) { return "无"; }
  }
  function livesSummary() {
    try {
      const ls = (typeof META !== "undefined" && META.lives) || [];
      if (!ls.length) return "无（此为首世）";
      return ls.slice(-3).map(l => `第${l.world}世${l.end === "spring" ? "见春" : "殁"}·存${l.days}日·止于${l.realm}`).join("；");
    } catch (e) { return "无"; }
  }
  function statePrompt() {
    const cardNames = S.cardOrder.map(id => { const c = findCard(id); return c ? `${c.name}（${c.eff}）` : id; }); // 词条连效果一并注入：特性向词条（情怨×2/使唤你/横祸一类）由 GM 在剧情中执行
    const npcAll = Object.entries(S.npc);
    const npcTop = npcAll.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 16); // 状态瘦身（提速）：缘分簿只列前 16 位，记忆不受影响——深交深仇必在其列
    const npcs = npcTop.map(([n, v]) => `${n}:${v}${typeof relText === "function" ? "(" + relText(v) + ")" : ""}·性格:${typeof npcPersonality === "function" ? npcPersonality(n) : "?"}`).join("，")
      + (npcAll.length > 16 ? `（另有 ${npcAll.length - 16} 位浅交未列，视同陌路相处）` : "") || "无";
    const recent = (S.gmRecent || []).slice(-6).join(">");
    const flags = Object.keys(S.flags).filter(f => !f.startsWith("ev_")).slice(-12).join(",");
    return JSON.stringify({
      第几世: S.world, 身份: S.iden ? S.iden.name : "乞丐阿七",
      时间: `冬第${S.day}日/${["晨", "午", "昏", "夜"][S.slot]}(${S.slot === 3 ? "即将入夜" : ""})`, 天气: S.weather,
      境界: REALM_NAMES[S.realm] + `(修为${Math.round(S.cult)}/${REALM_NEED[S.realm + 1] || "圆满"}·${TABLES.REALMS.tierNames[S.realm]})`,
      云游师傅名册: (S.masters && Object.keys(S.masters).length) ? Object.entries(S.masters).map(([pid, m]) => `${profDef(pid) ? profDef(pid).name : pid}:${m}(${S.npc[m] || 0})`).join("、") : "无",
      求法之路: (typeof gongfuLead === "function") ? (gongfuLead().map(l => `《${l.g.name}》(${l.g.tierName})：${l.path}`).join("；") || "暂无可求功法（境界未至门槛）") : "未知",
      主修功法: (typeof mainTechnique === "function") ? (mainTechnique() ? `${mainTechnique().name}(${mainTechnique().tierName})` : "无（野路乱拳）") : "未知",
      五维: `力${attr("str")}敏${attr("agi")}智${attr("int")}体${attr("con")}运${attr("luck")}`,
      五行亲和: WX_ELS.map(e => WX_NAMES[e] + (wxOf()[e] || 0)).join("/") + `（主行:${WX_NAMES[dominantWxEl()]}）`,
      状态: `气血${Math.round(S.hp)}/${hpMax()} 体力${Math.round(S.sta)} 饱食${Math.round(100 - S.hunger)} 道心${Math.round(S.daoXin)} 心魔${Math.round(S.xinmo || 0)}/100(${xinmoStage().name}) 战力${combatPower()} 康健${injuryTier().name} 药蚀${Math.round(S.yaoshi || 0)}/100`,
      伤病: `疾病:${S.ill ? S.ill.name + "（余" + S.ill.days + "日，" + S.ill.desc + "）" : "无"} 伤势:${typeof woundText === "function" ? woundText() : "未知"}${(() => { const d = Object.keys(S.darkWounds || {}).filter(k => S.darkWounds[k] > 0); return d.length ? " 暗伤:" + d.map(k => k + "-" + S.darkWounds[k]).join("、") + "（永久印记·此世药石无功，勿给治伤选项）" : ""; })()}`,
      药石: "对症（商铺有售，行囊可用）：驱寒汤→风寒、藿香正气散→中暑、解毒散→丹毒侵脉、金疮药→外伤、生姜→风寒-1日、驱瘴草→防瘴（南岭）、甘草→药蚀-2；寻医 fx.special=\"seeDoctor\"（30文，病除+气血+8）",
      钱财: `${S.money}文/${S.stones}灵石/${S.points}万象点`,
      词条: cardNames.join("、") || "无", 物品: JSON.stringify(S.inv),
      职业: S.job || "无", 主职业: (typeof mainJobTitle === "function") ? mainJobTitle() : (S.job || "无"), 灵根: linggen().name, 称号: (META.titles || []).map(t => TITLES[t].name + (S.wornTitle === t ? "(佩戴中)" : "")).join("、") || "无", 系统等级: "Lv" + ((typeof META !== "undefined" && META.sysLv) || 1), 缘分: npcs, 伏笔标记: flags, 近期剧情脉络: recent,
      近日大事: chronicleSummary(),
      历世轮回: livesSummary(),
      可破境: checkBreakthrough(),
      功法: gongfuPrompt(),
      可求功法: gongfuLeadPrompt(),
      当地人物: castPrompt(),
      宗门: S.sect ? `${S.sect}${S.flags.neimen ? "（内门弟子）" : "（外门弟子）"}·贡献 ${S.sectGong || 0}·本月缺卯 ${S.flags.dianmaoMiss || 0} 次` : "无（未入宗门）",
      旅途: S.travel ? `前往${REGIONS[S.travel.to].name}的驿道上（余 ${S.travel.left} 日脚程）——场景须在路途，不得写已抵达，抵达由引擎结算` : "无（未在远行）",
      末世: (() => { const d = (typeof doomLevel === "function") ? doomLevel() : 0;
        return ["无感（劫云未聚）", "1档·风起（丹药药性渐退，老者生叹）", "2档·灵物贵（灵脉枯、物价涨）", "3档·走火众（走火入魔十倍于平日）", "4档·大劫前夜（灵气骤降、妖兽发狂）"][d]
          + (S.flags.devourSlain ? "——进食已断，劫云已散，只写天地一轻的余韵" : "——世人只当天灾，任何角色都说不出真相"); })(),
      终局: (() => { const p = ["pioneer_kezi", "pioneer_xinwu", "pioneer_fen"].filter(f => S.flags[f]).length;
        if (!p && !S.flags.devourSlain) return "未启（圣域之后，先驱遗痕会浮出水面）";
        return `遗痕 ${p}/3 ｜ 低语:${S.flags.devourWhisper ? "已闻" : "未闻"} ｜ 问天:${S.flags.sysQuestioned ? "已问" : "未问"} ｜ 真相:${S.flags.truthKnown ? "已知" : "未知"} ｜ 进食:${S.flags.devourSlain ? "已断" : "未断"}${S.flags.endingDone ? " ｜ 结局已收" : ""}`; })(),
      历练日: (S.day - (S.lastTrainDay || 0)) >= 3 ? "是（三日之期已至：本回合必须安排一次提升实力的机缘，见规则14）" : "否",
      已有职业: (() => { const q = S.professions || {}; const ks = Object.keys(q); return ks.length ? ks.map(pid => { const P = (typeof PROFESSIONS !== "undefined") && PROFESSIONS[pid]; return P ? `${P.name}${q[pid].primary ? "(主)" : "(副)"}Lv${q[pid].lv}` : pid; }).join("、") : "无"; })(),
      伏笔计数: (S.flags.coincidence || 0) + "（幕后阴谋的碎屑：刻意巧合/古怪贵人/上古信物；够数时系统自现仙品任务）",
      任务: questPrompt(),
      搁置任务: stalePrompt(),
      前情引子: (typeof S.echoLine === "string" && S.echoLine) || "无",
      修行记事: (() => { const m = S.medScene; if (!m) return "无";
        return `昨${["晨", "午", "昏", "夜"][m.slot] || ""}时${m.kind}「${m.focus}」（熟练 +${m.inc}${m.teacher ? `，承「${m.teacher}」点拨` : ""}）${m.nearCap ? "，已逼近瓶颈、突破在望" : ""}。本回合剧情必须承接此事：写参悟余韵、关隘松动之兆${m.teacher ? `，或让「${m.teacher}」现身考校你的进境` : ""}；不得无事发生，亦不得另起与修行无关的剧情。`; })(),
      历练之机: (() => { const m = S.trainScene; if (!m) return "无";
        const detail = m.kind === "五维打熬" ? `${m.attrName} +${m.amt}` : m.kind === "武技磨砺" ? `「乱拳」熟练 +${m.inc}` : `「${(m.techs || []).join("与")}」熟练 +${m.inc}${m.nearCap ? "，已逼近瓶颈、突破在望" : ""}`;
        return `昨${["晨", "午", "昏", "夜"][m.slot] || ""}时【历练·${m.kind}】${detail}。本回合剧情必须承接此事：写打熬后的身体余韵、进境被路人或同行瞧见${m.nearCap ? "、瓶颈将破的契机" : ""}；不得无事发生，亦不得另起与修行无关的剧情。`; })(),
      上回合: (S.lastScene ? "剧情:" + S.lastScene + " ｜ 玩家选择:「" + (S.lastPick || "？") + "」" : "无（本回合为开局）"),
    });
  }
  function castPrompt() { // 世界角色谱：当前地域在场人物（设定集第五、六章名录）
    try {
      if (typeof castHere !== "function") return "无";
      const list = castHere();
      if (!list.length) return "无";
      return list.map(c => `${c.name}(${c.title}·${c.kind === "boss" ? "一方强者" : c.kind === "neutral" ? "中立人物" : "隐藏角色"}·${REALM_NAMES[c.realm]}·${castMet(c.id) ? "已结识" : c.kind === "hidden" ? "只可远观留痕" : "未结识"}：${c.desc})`).join(" ｜ ");
    } catch (e) { return "无"; }
  }
  function gongfuPrompt() { // 已持功法与熟练度（功法谱系见 data.js GONGFU）
    try {
      if (typeof GONGFU === "undefined") return "无";
      const owned = GONGFU.filter(g => (S.inv[g.id] || 0) > 0);
      if (!owned.length) return "无（尚未习得任何功法，修为无从增长——可经传承事件/商铺/宗门求得入门功法）";
      return owned.map(g => `《${g.name}》(${g.tierName}·${WX_NAMES[g.el]}行·熟练${Math.round(S.skills[g.name] || 0)}/${g.cap}${(S.skills[g.name] || 0) >= g.cap ? "·已圆满，推演至尽头" : ""})`).join("、");
    } catch (e) { return "无"; }
  }
  function gongfuLeadPrompt() { // 当前可求功法（境界/宗门/灵根主行检索，供规则24 取用；空=暂无确凿可求者）
    try {
      if (typeof gongfuLead !== "function") return "无";
      const leads = gongfuLead();
      const out = leads.map(l => `《${l.g.name}》(id:${l.g.id}，${l.g.tierName}·${WX_NAMES[l.g.el]}行)：${l.path}`);
      if ((S.flags.seekGongfu || 0) >= 3) out.push("风闻：" + (typeof GONGFU_RUMORS !== "undefined" ? GONGFU_RUMORS[0] : "圣品功法只闻其名。") + "（仅作伏笔，不可授予）");
      return out.join(" ｜ ") || "无";
    } catch (e) { return "无"; }
  }
  function questPrompt() {
    try {
      if (typeof QU === "undefined" || !S.quests) return "无";
      const parts = [];
      for (const id of (S.quests.active || [])) {
        const d = QU.DEFS[id];
        if (!d) continue;
        const objs = d.objectives.map(o => (() => { try { return o.done(); } catch (e) { return false; } })());
        parts.push(`${d.type === "main" ? "主线" : d.type === "xian" ? "仙品" : "支线"}「${d.name}」(${objs.filter(Boolean).length}/${d.objectives.length} 目标)`);
      }
      const offers = QU.offers().filter(o => o.kind === "quest");
      if (offers.length) parts.push(`可接任务: ${offers.map(o => o.id).join("、")}`);
      return parts.join(" ｜ ") || "无";
    } catch (e) { return "无"; }
  }
  function stalePrompt() { // 搁置任务：主线 4 日 / 支线 6 日未推进，交由 GM 检索剧情、询问是否推进
    try {
      if (typeof QU === "undefined" || !QU.staleList) return "无";
      const list = QU.staleList();
      if (!list.length) return "无";
      return list.map(s => `${s.kind === "main" ? "主线" : "支线"}「${s.d.name}」(id:${s.id}) 已搁置 ${s.days} 日${s.unoffered ? "·邀约条件早已成立但尚未接取" : ""}${s.failed ? "·曾失败，冬末或可再试" : ""}`).join(" ｜ ");
    } catch (e) { return "无"; }
  }

  /* ---------- 校验 AI 输出 ---------- */
  const FX_KEYS = ["money","stones","hp","sta","mp","hunger","cult","dao","points","attr","item","npc","flag","ach","card","luckCharm","combat","danger","special","coincidence","xinmo","clearWood","skill","spell","wx","check","success","fail","successText","failText","checkText","pet","drop","slay","newcard","fabao","wuqi","job"];
  const CHECK_RE = /^[a-zA-Z0-9+\-*/().<>=!\s]{1,80}$/;
  function clampFx(src, depth) {
    const fx = {};
    if (src && typeof src === "object" && !Array.isArray(src)) { // 键名归一：AI 生造的银钱别名并入 money（丢弃=剧情说谎，规则29）
      const ALIAS = { silver: 1, coin: 1, coins: 1, wen: 1, copper: 1, silver2: 1 };
      for (const a in ALIAS) if (src[a] != null && src.money == null && !isNaN(+src[a])) src = Object.assign({}, src, { money: +src[a] });
    }
    for (const k in src) {
      if (!FX_KEYS.includes(k)) continue;
      let v = src[k];
      if (k === "check" && typeof v === "string" && CHECK_RE.test(v) && /[<>!=]/.test(v)) { fx.check = v.trim(); continue; }
      if ((k === "success" || k === "fail") && depth < 1 && v && typeof v === "object" && !Array.isArray(v)) {
        const b = clampFx(v, depth + 1);
        delete b.check; delete b.success; delete b.fail; // 分支内不再嵌套判定
        if (Object.keys(b).length) fx[k] = b;
        continue;
      }
      if (["successText", "failText", "checkText"].includes(k) && typeof v === "string") { fx[k] = v.slice(0, 140); continue; }
      if (["money"].includes(k)) { fx[k] = Math.max(-80, Math.min(80, +v || 0)); continue; }
      if (["stones"].includes(k)) { fx[k] = Math.max(-2, Math.min(2, +v || 0)); continue; }
      if (["sta"].includes(k)) { fx[k] = Math.max(-5, Math.min(5, +v || 0)); continue; }
      if (["hunger"].includes(k)) { fx[k] = Math.max(0, Math.min(45, +v || 0)); continue; }
      if (["cult"].includes(k)) { fx[k] = Math.max(-10, Math.min(25, +v || 0)); continue; }
      if (["dao"].includes(k)) { fx[k] = Math.max(-3, Math.min(3, +v || 0)); continue; }
      if (["points"].includes(k)) { fx[k] = Math.max(-50, Math.min(50, +v || 0)); continue; }
      if (k === "attr" && v && typeof v === "object") {
        const a = {};
        for (const ak in v) if (["str","agi","int","con"].includes(ak)) a[ak] = Math.max(-0.15, Math.min(0.15, +v[ak] || 0));
        if (Object.keys(a).length) fx.attr = a;
        continue;
      }
      if (k === "item") { const m = /^([a-zA-Z]+):(-?\d+)$/.exec(v); if (m) fx.item = v; continue; }
      if (k === "wx") { const m = /^(jin|mu|shui|huo|tu):([1-3])$/.exec(v); if (m) fx.wx = v; continue; }
      if (k === "spell") { // 具名法术：仅放行名录内 id（data.js SPELLS），且境界须达修炼门槛（越阶授予不放行）
        if (typeof v === "string" && /^sp_[a-z]+$/.test(v) && typeof SPELLS_BY_ID !== "undefined" && SPELLS_BY_ID[v]
          && (typeof S === "undefined" || !S.realm || S.realm >= SPELLS_BY_ID[v].gate)
          && (!SPELLS_BY_ID[v].linggen || (typeof S !== "undefined" && S.linggen === SPELLS_BY_ID[v].linggen))) fx.spell = v; // 灵根专属法术唯对应灵根可授
        continue;
      }
      if (k === "npc" && v && typeof v === "object") {
        const n = {};
        for (const nk in v) if (/^[^"{}\[\]]{1,8}$/.test(nk)) n[nk] = Math.max(-12, Math.min(12, +v[nk] || 0)); // 缘分须从抉择中挣（01:08 补丁：单次≤12）
        if (Object.keys(n).length) fx.npc = n;
        continue;
      }
      if (k === "flag" && typeof v === "string" && /^[a-zA-Z_]{1,20}$/.test(v)) { fx.flag = v; continue; }
      if (k === "pet" && typeof v === "string" && /^[^"{}\[\]]{1,8}$/.test(v)) { fx.pet = v; continue; } // 灵宠认魂（第八章）
      if (k === "drop" && typeof v === "string" && /^[^"{}\[\]:：]{1,18}$/.test(v)) { fx.drop = v; continue; } // 物品/材料入账（第七九章，可带品阶后缀）
      if (k === "slay" && typeof v === "string" && /^[^"{}\[\]:：]{1,8}$/.test(v)) { fx.slay = v; continue; } // 猎杀有灵众生：杀孽与死仇
      if (k === "quest" && typeof v === "string") {
        const qm = /^(accept|act):([a-z_]+)$/.exec(v);
        if (qm && typeof QU !== "undefined" && QU.DEFS[qm[2]]) {
          if (qm[1] === "act") {
            try { if (QU.staleList().some(s => s.id === qm[2])) fx.quest = v; } catch (e) {} // 催办推进：仅对确实搁置的任务放行
          } else if (QU.DEFS[qm[2]].offer) {
            try { if (QU.offers().some(o => o.kind === "quest" && o.id === qm[2])) fx.quest = v; } catch (e) {}
          }
        }
        continue;
      }
      if (k === "ach" && ACHIEVEMENTS[v]) { fx.ach = v; continue; }
      if (k === "ach" && typeof v === "string" && v.includes("|")) { // 设定十三章：AI 生成成就「名号|品级0~4|描述|奖励」
        const p = v.split("|");
        if (p.length === 4 && /^[^|｜]{1,12}$/.test(p[0].trim()) && /^[0-4]$/.test(p[1].trim()) && /^(points|attr|dao|luck|title):/.test(p[3].trim()))
          fx.ach = { name: p[0].trim(), tier: +p[1].trim(), desc: p[2].trim().slice(0, 60), reward: p[3].trim().slice(0, 20) };
        continue;
      }
      if ((k === "newcard" || k === "fabao") && typeof v === "string" && v.includes("|")) { // 23:59 补丁：AI 生成词条/法宝入轮盘「名|品级0~5|效果|mod键:值,…」
        const p = v.split("|");
        if (p.length >= 3 && /^[^|｜]{1,8}$/.test(p[0].trim()) && /^[0-5]$/.test(p[1].trim())) {
          const mod = {};
          if (p[3]) for (const kv of p[3].split(/[,，]/)) { const km = /^([a-zA-Z]+):(-?\d+(?:\.\d+)?)$/.exec(kv.trim()); if (km) mod[km[1]] = +km[2]; }
          fx[k] = { name: p[0].trim(), tier: +p[1].trim(), eff: p[2].trim().slice(0, 60), mod };
        }
        continue;
      }
      if (k === "wuqi" && typeof v === "string" && /^[^|｜]{1,8}[|｜]-?\d{1,2}[|｜][^|｜]{1,4}$/.test(v)) { fx.wuqi = v; continue; } // AI 生成兵器「名|攻伐%|品阶(凡器~仙器)」
      if (k === "combat") { const m = /^([^:：]{1,10})[:：](\d{1,3})$/.exec(v); if (m) fx.combat = m[1] + ":" + m[2]; continue; }
      if (k === "danger" && ["pickpocket","trace","deep","caught","fleeDog","catchThief"].includes(v)) { fx.danger = v; continue; }
      if (k === "special" && /^[a-zA-Z:]+/.test(v)) { fx.special = String(v).slice(0, 30); continue; }
      if (k === "job" && typeof v === "string" && /^[^|｜"{}[\]]{1,12}$/.test(v.trim())) { fx.job = v.trim(); continue; } // 主职业名分（第三章）：AI 依功法/宗门/营生取名
      if (["card","luckCharm","coincidence"].includes(k)) { fx[k] = Math.max(1, Math.min(2, +v || 1)); continue; }
      if (typeof v === "number" || /^-?\d+(\.\d+)?$/.test(String(v))) fx[k] = +v;
    }
    return fx;
  }
  function validate(t) {
    if (!t || typeof t !== "object") return null;
    if (typeof t.scene !== "string" || !t.scene.trim() || t.scene.length > 700) return null;
    if (!Array.isArray(t.choices) || t.choices.length < 2 || t.choices.length > 6) return null;
    const out = { scene: t.scene.trim(), choices: [] };
    for (const c of t.choices) {
      if (!c || typeof c.label !== "string" || !c.label.trim() || c.label.length > 30) return null;
      out.choices.push({ label: c.label.trim(), hint: typeof c.hint === "string" ? c.hint.slice(0, 40) : "", fx: clampFx(c.fx || {}, 0) });
    }
    if (S.slot === 3 && !out.choices.some(c => c.fx.special === "rest" || c.fx.special === "fire")) {
      out.choices.push({ label: "就寝", hint: "睡眠是最大的破绽，也是最大的慈悲。", fx: { special: "rest" } });
    }
    return out;
  }

  /* ---------- 判定引擎：优先 Python 服务端，本地 JS 兜底 ---------- */
  let judgeAbsent = false; // 会话内记住：无 Python 服务端
  function evalCheckLocal(expr, st) {
    if (!CHECK_RE.test(expr) || !/[<>!=]/.test(expr)) return null;
    let e = expr.replace(/\b(str|agi|int|con|luck|realm|day|sta|hunger|esc|lg)\b/g, m => String(+st[m] || 0));
    e = e.replace(/d(\d{1,4})/gi, (m, n) => String(1 + Math.floor(Math.random() * Math.min(1000, +n || 1))));
    if (!/^[\d+\-*/().<>=!\s]+$/.test(e)) return null;
    let v;
    try { v = !!Function('"use strict";return (' + e + ')')(); } catch (err) { return null; }
    return { success: v, detail: e.replace(/\s+/g, ""), src: "local" };
  }
  async function judge(expr, st) {
    if (!judgeAbsent && !(cfg && cfg.off)) { // 断开 API 链接时：跳过同源判定服务，直接本地演算
      try {
        const resp = await fetchWithTimeout("/api/judge", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expr, state: st || {} }),
        }, 8000);
        if (resp.ok) {
          const d = await resp.json();
          if (d && typeof d.success === "boolean") return d;
        } else judgeAbsent = true;
      } catch (e) { judgeAbsent = true; }
    }
    return evalCheckLocal(expr, st || {});
  }

  function extractJSON(text) {
    if (!text) return null;
    text = text.replace(/```json|```/g, "").trim();
    const s = text.indexOf("{"), e = text.lastIndexOf("}");
    if (s < 0 || e <= s) return null;
    try { return JSON.parse(text.slice(s, e + 1)); } catch (err) { return null; }
  }

  async function fetchWithTimeout(url, opts, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(url, Object.assign({}, opts, { signal: ctl.signal })); }
    finally { clearTimeout(t); }
  }

  /* ---------- Base 地址自动修正 ---------- */
  function normalizeBase(base) {
    base = (base || "https://api.moonshot.cn/v1").trim().replace(/\/+$/, "");
    // 误把完整接口路径填进 Base 的情况：去掉 /chat/completions 尾巴
    base = base.replace(/\/chat\/completions\/?$/i, "");
    return base;
  }
  function baseCandidates(base) {
    base = normalizeBase(base);
    const list = [base];
    // 常见的少写 /v1：路径里没有版本号段时，补一个 /v1 再试
    try {
      const path = new URL(base).pathname.replace(/\/+$/, "");
      if (!/\/v\d+(\.\d+)?$/.test(path)) list.push(base + "/v1");
    } catch (e) { /* 不是合法 URL，照原样用 */ }
    return list;
  }
  function friendlyError(status) {
    return { 401: "Key 无效或未授权（401）", 403: "Key 无权限访问该模型（403）",
      404: "接口路径不存在（404）——多半是 Base 少写了 /v1", 408: "请求超时（408）",
      409: "模型名错误或模型不存在（409）", 429: "触发限流，请稍后再试（429）" }[status]
      || ("HTTP " + status);
  }

  /* ---------- 三层叙事源 ---------- */
  let serverAbsent = false; // 会话内记住：同源服务端不存在，不再每次重试
  let lastFail = null; // 最近一次 BYOK 失败原因（供界面提示）
  let lastCtx = null; // 最近一次发给模型的状态快照（「天道视野」供玩家查验）
  async function narrate() {
    const prompt = statePrompt();
    lastCtx = prompt;
    lastFail = null;
    // 0) 手动断开 API 链接（天道设置）：不发起任何网络请求，静默交回内置推演引擎——这是玩家的主动选择，不弹「天道失联」
    if (cfg && cfg.off) {
      const g0 = GM.compose();
      g0._src = "gm";
      g0._reason = "API 链接已手动关闭——剧情与判定全部由内置推演引擎演算";
      return g0;
    }
    const SYS = (typeof regionOf === "function" && typeof S !== "undefined" && S) ? buildSystem() + "\n【出生地地域风物 · 定稿】\n" + regionOf(S.place).aiHint + "\n（当前地点：" + (S.place || "未知") + "。本世剧情必须符合上述当地风物：环境、物价、NPC 类型、生存压力皆依此地，不得写成云州青石城的雪夜。）" : buildSystem();
    // 1) BYOK 真 AI
    if (cfg && cfg.key) {
      for (const base of baseCandidates(cfg.base)) {
        try {
          const mkBody = opts => JSON.stringify({
            model: cfg.model || "kimi-k2-0711-preview",
            messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }],
            max_tokens: 2600, // 思考型模型低档位推理约 1600 + 输出约 300，2600 足够——过大会拖慢生成（提速补丁 01:08）
            ...(opts.temp == null ? {} : { temperature: opts.temp }),
            ...(opts.reason ? { reasoning_effort: "low" } : {}), // 思考型模型低档位推理，否则单回合要 90 秒以上
          });
          const post = body => fetchWithTimeout(base + "/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
            body,
          }, 90000); // 思考型模型（kimi-k3 等）推理较慢，留足 90 秒
          const opts = { temp: 0.9, reason: true };
          let resp = await post(mkBody(opts));
          // 模型参数兼容性自适配：400 且错误点名某参数时，去掉该参数重试（如 k3 只允许 temperature=1、旧模型不认识 reasoning_effort）
          for (let guard = 0; guard < 2 && resp.status === 400; guard++) {
            const errText = await resp.text().catch(() => "");
            if (/temperature/i.test(errText) && opts.temp != null) opts.temp = null;
            else if (/reasoning/i.test(errText) && opts.reason) opts.reason = false;
            else { lastFail = "HTTP 400：" + (errText.slice(0, 90) || "请求参数被模型拒绝"); resp = null; break; }
            resp = await post(mkBody(opts));
          }
          if (!resp) break;
          if (resp.ok) {
            const data = await resp.json();
            const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            const v = validate(extractJSON(content));
            if (v) { v._src = "ai"; cfg.base = base; return v; }
            lastFail = "模型返回的内容无法解析（非标准 JSON）";
          } else {
            lastFail = friendlyError(resp.status);
            if (resp.status !== 404) break; // 401/403/429 等：换 Base 也没用，直接降级
          }
          // 404：继续尝试下一个 Base 候选（如补上 /v1）
        } catch (e) {
          lastFail = e.name === "AbortError" ? "请求超时（90 秒无响应）——模型推理过慢，可在「天道」里换个非思考型模型（如 kimi-k2 系列）"
            : (/Failed to fetch|NetworkError|Load failed/i.test(e.message) ? "网络请求被拦截——多半是浏览器 CORS 或网络不通" : "网络错误：" + e.message);
          break;
        }
      }
    }
    // 2) 同源服务端（自建部署时存在）
    if (!serverAbsent) try {
      const resp = await fetchWithTimeout("/api/narrate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, system: SYS }),
      }, 15000);
      if (!resp.ok) serverAbsent = true;
      if (resp.ok) {
        const v = validate(await resp.json());
        if (v) { v._src = "server"; return v; }
      }
    } catch (e) { /* 静态托管无此接口 */ }
    // BYOK 已配置而真 AI 失败：不静默降级——交回 gmTurn 弹窗由玩家决定（重试 / 手动确认离线），剧情演算就此停住
    if (cfg && cfg.key && !window.__allowOffline) return { _offline: true, _reason: lastFail || "天道失联" };
    // 3) 内置程序化 GM
    const g = GM.compose();
    g._src = "gm";
    return g;
  }

  async function testKey(c) {
    let lastErr = "无法连接";
    for (const base of baseCandidates(c.base)) {
      try {
        const resp = await fetchWithTimeout(base + "/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + c.key },
          body: JSON.stringify({ model: c.model || "kimi-k2-0711-preview", messages: [{ role: "user", content: "只回复一个字：通" }], max_tokens: 8 }),
        }, 20000);
        if (resp.ok) {
          c.base = base; // 记下修正后的 Base
          const data = await resp.json();
          return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "";
        }
        lastErr = friendlyError(resp.status);
        if (resp.status !== 404) break; // 非 404 的错误换 Base 无意义
      } catch (e) {
        if (e.name === "AbortError") lastErr = "连接超时（20 秒无响应）";
        else if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) lastErr = "网络请求被拦截——多半是浏览器 CORS 或网络不通（Failed to fetch）";
        else lastErr = "网络错误：" + e.message;
        break;
      }
    }
    throw new Error(lastErr);
  }

  async function listModels(c) {
    let lastErr = "无法连接";
    for (const base of baseCandidates(c.base)) {
      try {
        const resp = await fetchWithTimeout(base + "/models", {
          headers: { "Authorization": "Bearer " + c.key },
        }, 20000);
        if (resp.ok) {
          const data = await resp.json();
          const ids = (data.data || []).map(m => m.id || m.name).filter(Boolean).sort();
          if (ids.length) { c.base = base; return ids; }
          lastErr = "返回了空的模型列表";
        } else {
          lastErr = friendlyError(resp.status);
          if (resp.status !== 404) break;
        }
      } catch (e) {
        if (e.name === "AbortError") lastErr = "连接超时（20 秒无响应）";
        else if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) lastErr = "网络请求被拦截——多半是浏览器 CORS 或网络不通（Failed to fetch）";
        else lastErr = "网络错误：" + e.message;
        break;
      }
    }
    throw new Error(lastErr);
  }

  return { narrate, getCfg, saveCfg, testKey, listModels, judge, failInfo: () => lastFail,
    __statePrompt: statePrompt, // 测试探针：状态提示词快照
    __coreSystem: () => SYSTEM, // 测试探针：不含按需注入的核心提示词
    debugInfo: () => ({ system: buildSystem(), prompt: lastCtx, fail: lastFail }),
    __clamp: (o) => clampFx(o || {}, 0) };
})();
