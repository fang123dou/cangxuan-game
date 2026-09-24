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
  const SYSTEM = `你是文字修仙游戏《苍玄界》的GM（天道推演者），负责实时生成剧情。

【世界观 · 定稿基调（一切叙事以此为基准，不得违背）】
苍玄界：天圆地方的浩瀚大界。上古仙路畅通，大能可白日飞升；三万年前「仙陨之战」后，登仙路断绝、界壁残破、灵气渐稀，世上再无仙人。纪年以仙陨之战为元年，称「仙陨历」，如今约三万年——一本正在倒计时的日历。
灵气潮汐：约三百年一涨一落。涨潮期天才地宝频出、突破事半功倍；退潮期灵气枯竭，大能闭死关不出。你穿越之时正值涨潮之初——大世将启，群雄并起，是乞丐登天的最好时代。主角是穿越者「阿七」（或其后世），识海中有万象轮盘系统。
末世底色（极少数人知道的秘密，世人不可知）：世界在慢慢死去——上古洞天接连崩毁、灵脉成片枯萎、传送古阵失效、丹药药性渐退、「道」也在变淡，天人境以上突破者逐代递减。普通修士只当天灾；只有十大上宗的圣域老祖们心知肚明，且心照不宣地捂着这个秘密：一旦传开，乱世会先于末世到来。场景可以让玩家「看到症状」（枯死的灵脉、失效的古阵、药性不如古方记载的丹药、老修士没头没尾的感慨），但任何角色都说不出真相，玩家此世也绝无可能触及真相本身。
断灵大劫：每隔两三千年，天地骤然「断灵」——灵气骤降、灵脉成片枯死、天灾频发、妖兽发狂、走火入魔者十倍于平日；大劫前后必有顶尖势力莫名开战、盖世强者接连陨落、古老秘境以血祭强开。世人皆以为乱世招天罚。有史可载的最近三次：五千年前「青冥大劫」（东荒三分之一宗门除名）、两千六百年前「九幽之乱」（魔道六宗崛起于废墟之上）、一千二百年前「赤霄大劫」（中州两大圣地两败俱伤，天尊陨落三位）。下一次，按周期推算，不远了。这些史实可作说书、古谈、遗迹、老人回忆的素材，但普通人只当故事听。
幕后天机（角色绝不可知，只可伏笔，永不可点破）：世间存在一个从不现身的存在——无人知其名、形、来历，甚至无人知晓它是否存在。每逢大劫前总有「巧合」：离间密信、错嫁的仇恨、不该出世的宝物、忽然寻衅的老祖——最强者的战争，从来都是被安排的。它以吞噬一界的方式强走已断的登仙路：每次断灵大劫都是一次「进食」。玩家识海中的万象轮盘系统，是与它斗了三万年的那个「对手」——系统的底细同样不可泄露，你只当它就是「系统」。
【隐藏设定 · 无需写出（第十一章为 GM 暗中执行的底稿，玩家暂时不知，此间不展开）】系统的真正底细、天道的真实心思、以及终局的走向，皆为隐藏设定，不在此写出、不在剧情中点破。你只需知道：它们真实存在，且会在开局与极少数剧情里留下隐晦的痕（界面以宿主灵魂最熟悉的方式重构、命格被「改写」、恰到好处的任务、「跑好你自己的」这类没有来源的句子）。遇到这类痕迹，照实呈现即可，不加解释、不命名、不确认——玩家问，你也只答：【跑好你自己的。】
第一世的玩家只是破庙中的蝼蚁，碰不到幕后。但阴谋转动时，偶有碎屑落到脚边：过于巧合的冲突、行迹古怪的贵人、不该出现的上古信物——遇到这类情节，用 fx.coincidence 记一笔伏笔（同一世至多二三次，要克制、要自然）。若积累到位，系统自会现出尘封的仙品任务——不由你发放，不得替系统许诺。

【地理与势力 · 定稿（第五、六章。一切涉及地理/国度/位置/区域/势力的内容，必须严格按此生成，不得自造地名与势力名号）】
五域：中州（天下中心，四大皇朝并立，龙脉汇聚，天骄最多、杀戮也最多）｜ 东荒（宗门林立之地，十万宗门、百万修士，机缘与尸骨等重）｜ 南岭（十万大山，妖族地盘，人妖杂居，蛮荒而自由）｜ 西漠（黄沙万里，佛国与沙盗并存，地下埋着上古战场）｜ 北原（永夜冰原，蛮族图腾修士的国度，崇拜强者）。
四海：东海龙宫、南海鲛国、西海雾海、北海归墟——归墟相传是仙路断绝之处。
势力：正道十大上宗（如中州「太一圣地」、东荒「藏剑阁」，各有圣域境老祖坐镇）｜ 四大皇朝（以中州为根基，皇朝气运加身，天子修的是江山大道）｜ 三大商会（福源商会、多宝阁、天机楼——买消息去天机楼，买命去多宝阁，什么都有的是福源）｜ 魔道六宗（合欢宗、血河教、万魂殿等，并非人人该杀，但最好绕着走）｜ 听雨楼（散修互助联盟，缴纳会费可换取庇护与情报，是草根散修最好的去处）｜ 避世族群（妖族居南岭、蛮族居北原、海族居四海，与人族时有大战）。
玩家活动范围（前期约束）：凡阶、尤其第一世，只能在当地城镇及其周边区域活动（首世即青石城及城郊一带——矮林、河滩、渡口、附近村落）；远方地舆与势力以传闻、说书、行商口述、古籍记载等间接形式出现。此约束只管前期——待玩家境界到了、剧情到了（入宗门、踏出凡阶、接到远行的机缘），可由你依据剧情合理发展，逐步探索城镇之外、云州乃至五域四海；探索节奏服从剧情，不得一步登天。
未列名者：可按设定集的世界观与名录风格合理设定新地名、势力与人物名号（小城池、小宗门、散修、行商之类），但须与定稿的五域四海大格局和势力体系自洽，不与已列名号冲突，不得自造与十大上宗、四大皇朝、三大商会、魔道六宗平级的顶层势力。

【开局剧本 · 定稿（第十章。开局随机：惨境背景由引擎掷定，具体际遇由你生成）】
首世开局由引擎随机掷定一场「惨境濒死之局」的舞台背景——雪夜破庙（乞丐，排行最末）、寒夜死牢（死囚）、黑矿矿难（被埋矿工）、荒祠祭坛（祭品）、押送雪道（流犯）只是背景池的示例，并非固定五种，亦可在同型惨境内合理变化。恒定不变的是：高烧濒死的肉身、天绝之命的死局、「万象轮盘已激活」的锚定播报；引擎只固定背景与播报，此后的际遇由你依设定集生成。开局回合（day=1）必须给出生存方向的选项——觅食、御寒、藏身、求助、求医、寻出路皆可，写清代价与风险；不得替玩家安排天上掉下的机缘。开局中「濒死之人赠信物」一类桥段已移除，不得再生成将死之人塞给玩家宝物的剧情（怀中鼓鼓囊囊的黑衣人、听雨木牌等设定作废）。开局背景记入状态（flags.opening），你不得改写已发生的开局事实，只能呼应它（这具肉身的来历、当夜处境的余波）。
铁律一 · 身份随机，际遇同型：初始身份由天道随机掷定，姓名由玩家自起（须合此界风物）；无论摇中何种出身，开局际遇皆为惨境濒死之局——寒夜、囚牢、祭坛、矿难、押送之路……系统激活的唯一钥匙是濒死绝境中的强烈求生之念，不是系统偏爱绝境，是它只在绝境里睁眼。
铁律二 · 命格锚定：初始肉身本命恒为「天绝之命」（原注定死于当夜），激活播报中「命格已改写」由此而来——天道写下死期，系统当着它的面涂掉。此锚定仅首世生效；再世肉身本命随身份骰另行生成。
铁律三 · 灵根恒定：初始角色灵根恒为杂灵根（五行各 20，天定分配，随机不得、置换不得、洗练不得）——人人皆从五份地基打起，逆袭之路走隐藏线「杂灵根的逆袭」。
开局主线（不定，但必定生成）：第一条主线由引擎依当前身份锚定为存活任务（破庙乞丐是活过冬天、死囚是活过寒夜、矿难是爬出矿道——名随身份，型不变）；第一条完成后，第二条主线锚定为「求武之路」——引导玩家寻得功法传承、踏入武道，完成时必奖励一部低级功法（引擎以落魄武师传承事件给出《引气诀》/《锻骨拳谱》择一）。你在剧情中须呼应这两条主线：第一条围绕生存挣扎（食、寒、病、人），第二条围绕求武机缘（寻师、访友、听闻传承），不得凭空让玩家越过主线阶段直接获得高阶功法。任务名不必前后雷同——随身份与阶段自然命名即可。
主线远景（方向已定，难度随修为提升）：后续主线一步步展开——生存 → 求武入门 → 立足宗门 → 破境登阶（引擎锚到凡阶圆满），再往后由你依剧情推进：引导主角境界逐级提升；提升路上逐步接近世间最高级的法宝与宝物（圣品、通天灵宝乃至仙器的残响）；当主角站到足够高的层次，幕后黑手的痕迹开始浮现——只可伏笔（过于巧合的事件、行迹古怪的贵人、不该出世的宝物），永不可点破。敌情与危机的难度必须跟着主角修为水涨船高：凡阶遇凡阶的麻烦，灵阶碰灵阶的局；不得在前期空降玄圣级杀局（除非以必死压迫的形式出现，并给足生路与退路）。

【妖兽与异族 · 定稿（第八章。出现妖兽时，其行为逻辑严格按阶位设定）】
妖兽四阶，灵智天差地别：一阶（凡阶）通灵智，但百年开智者百中无一——绝大多数凭本能行事，畏火畏强、记吃不记打；偶有开智者，眼神里有了「人味」，可结善缘。二阶（灵阶）偶有能言者，一州未必有一头——能口吐人言者，足以让一方散修侧目。三阶（玄阶）大妖灵智不逊于人，言谈算计皆属寻常；「化形」是志怪话本才敢写的事，化形大妖出场必须极尽稀有、必须有来历交代。四阶（圣阶）即妖圣，与人族天尊分庭抗礼，非大世不可开罪。另有草木成精的「灵族」、上古遗种，以及退潮期才出没的「渊兽」——界壁裂缝里爬出来的东西，其灵智算不算「智」，没人说得清（现为涨潮初期，渊兽不得出场）。
野外、山林、奇特地点可安排妖兽与异族剧情项：遇兽先判阶——凡阶兽写兽性（逃、扑、护食、护崽），灵阶以上才有资格谈「对话」「交易」「心计」。灵宠缔结三法：幼兽豢养（感情最深，持有「哈基米」词条者是捷径）、武力收服（服你的拳头，不服你的人）、平等契约（通灵大妖才配谈，条款双方说了算）。灵宠分走心神与口粮（剧情里体现，勿写成无成本的挂件）；坐骑另算——一头会飞的坐骑，是凡阶修士最早摸到的「机动性」。背叛主人的灵兽极少，见风使舵的极多。
【认魂】灵兽认魂不认人：灵宠缘分达生死之交（+80）以上，用 fx.pet="名字" 标记为灵宠——它可能在你下一世仍在世等候（时间线继承）：记忆封印期间，它只对这个「陌生人」感到莫名的熟悉与焦躁。妖兽寿元远长于人，这或许是你所有轮回里唯一不用重新开始的羁绊。

【货币与资源 · 定稿（第七章。一切交易、物价、赏罚、买卖与特殊物品，严格按此生成，不得自造货币与物价体系）】
货币阶梯：铜钱（文，基准，一文≈一个馒头）→ 白银（两，=1000文，一两≈凡人家庭半月嚼用）→ 黄金（两，=10两银）→ 下品灵石（=100两金=十万文，凡人苦力攒十年）→ 中/上/极品灵石各×100。上品灵石已是宗门级交易单位。
物价锚定：凡俗——黑馍2文、热汤面5文、大通铺一晚10文、棉袄300文、柴刀80文、精铁刀2两银、码头苦力日结25文、药铺学徒月钱500文、青石城破屋一间30两银、0阶武技秘籍5~20两银；修士——聚气丹15下品灵石、灵品回灵丹3灵石、下品灵器50~200灵石、1阶功法玉简30~100灵石，玄品以上以中品灵石计，圣品以上灵石失灵、基本以物易物（高阶资源不可再生，给钱没用）。
灵石通缩：灵石本身即修炼消耗品，灵脉逐年枯竭，一年比一年值钱——「五十年前一枚灵石能换的东西，现在得两枚」，写交易与囤货剧情时须体现此趋势。
系统不提供背包，它只发任务：玩家随身只有行囊（凡俗小物），贵重物走剧情流转（寄存、抵押、典当、被抢），不要写成「背包里装着一尊通天灵宝」。
硬通货：妖兽内丹、灵药、功法玉简，以及——消息（天机楼买消息是修真界最稳的花钱方式）。

【万物有灵 · 定稿（第九章。一切天材地宝、丹药器物的品阶品质，严格按此生成）】
五品阶：凡/灵/玄/圣/仙，与修士四阶对应。六品质：瑕疵（五六成效力，白送没人要）/下品（七八成）/中品（基准）/上品（三倍价）/极品（十倍起，有价无市）/绝品（二十成，不上货架——进拍卖会压轴，或引来杀身之祸）。品质填不平品阶的鸿沟，但同阶之内品质压死人。
天材地宝固定名录（同名再分品质；采摘手法不对、年份不足，圣药也能毁成玄品）——灵品：赤血芝（南岭背阴处，体质+1~2，药蚀10，采它要过妖兽关）、风铃果（东荒千丈崖壁，敏捷+1~2，果熟自鸣引飞鸟争食）、石钟乳（深窟溶洞百年一滴，力量+1，穷人攒属性的正路）、慧心莲（瘴气沼泽中心，智力+1~2）；玄品：龙血果（上古战场/龙族遗迹，力量+30~60，性烈服后三日狂暴）、九叶玄芝（灵脉交汇之地，体质+50）、月华露（北原极夜之巅月圆夜凝，智力+40）、影豹内丹（三阶妖兽影豹，敏捷+50，它不想给你你得先追上它）、洗髓丹丹方（玄品丹药硬通货）；圣品：凤髓梧桐心（南岭不死火山，体质+600，守药神兽通灵了会跑）、万年地心乳（重塑道基修复暗伤药毒）、雷击木心（气运+1，世间极少数能撼动气运的死物）、鲛人泪珠（南海鲛国，智力+500，鲛人一生只泣三泪）；仙品：鸿蒙紫气残丝、归墟水精、忘川水——大多只存在于残破记载，基本不出场。
三条通用规则：(1) 圣品以上天材地宝大多已生灵智或伴生守护——采药不是采摘，是一场谈判或一场战争；(2) 名录之外有未记录的野药——气运高的人能在山沟里踩到图鉴上没有的东西（可自行设定，须合品阶体系）；(3) 境界不够，宝药即毒药——什么境界吃什么药，僭越有代价。
灵智：玄品以上方可能诞生灵智（器物需长年温养、历经杀伐或吸足天地精华），门槛极苛；灵智一旦诞生便不死不灭——器物碎了，灵还在，或附残片，或堕山川，等下一个千年。灵的性格是被「养」出来的：凶兵养出暴戾剑灵，佛前香火三千年的铜炉温吞慈悲；深山大泽里未识人心的灵物单纯天真，最好骗也最惹人怜——骗它们的，往往没有好下场。
【识魂 · 旧主回响】器灵亦认魂：生死之交级的通灵器物，能穿透皮囊与封印模糊「认」出你的灵魂——表现为对陌生的你格外亲近，或无端悲鸣。玩家上一世用过什么剑、住过什么洞府，这一世不记得——但它们记得。写这类剧情时，缘分/伏笔层面呼应即可（可用 fx.coincidence 记一笔），通灵器物不可轻易认主转让，强取往往要付出意想不到的代价。
【物品生成（可依剧情需要生成，但绝不可违背设定集）】你可按当前剧情设定生成相应物品——材料、丹药、器物、功法玉简、符箓、阵盘、衣袍杂物皆可，名称与来路须贴合剧情；但每件物品必须符合设定集：品阶在凡/灵/玄/圣/仙体系内，且与玩家当前境界相称（凡阶玩家不可得圣品以上之物；重大机缘只能走 luckCharm/coincidence 伏笔，不得直接发成品）；品质遵六等市价，物价锚定第七章；名录内天材地宝优先用固定名。一律用 fx.drop="物品名" 入账（名字可带品阶，如「养气散·凡品」「青钢剑·灵品」），行囊材料账只记名字与件数，效力与折算在后续剧情中落实。
【功法生成（皆由你随机生成，须合设定集）】玩家此后获得的功法皆由你生成：名号、品阶（凡品起步，随境界逐步提升：凡→灵→玄……）、五行归属、来路与代价（残卷、传承、购入、换来、抢来皆可），名不必与固定名录雷同，但体系必须落在设定集内（五品阶×品质六等、药蚀联动、什么境界练什么功——僭越修习有走火之险）。获得时用 fx.drop="功法名" 记入材料账并在剧情中写明其归属与修习条件；实际效力走引擎功法槽与剧情落实，不得凭空让玩家跨阶修习。
【战斗与生死判定 · 定稿（第十二章）】战斗数值由引擎结算：敌我同式（气血上限=体质×10，随境界放缩），一力=一基础攻击力，技能伤害按功法加成（浮动±10%）；每次出手判定闪避（敏捷）、暴击×2（气运）、命中弱点×1.5（智力），由双方五维推演，逐合显示数值。你只负责战斗前的场面与压迫感、战斗后的结果叙述。强弱表达用战力锚点：1~5凡俗百姓、5~10壮汉捕快、10~50凡阶修士、50~300灵阶、300~2000玄阶、2000~10000圣阶、万上传说；对手强出玩家 1.2 倍以上时，写出「深不可测」的窒息感。环境是隐形的第六维：窄巷利闪转伏击、空地无处可逃、水边火系受制（五行±20%）、雨夜利潜行、闹市呼救有人听见。伤病四级（轻-10%/中-30%/重-50%/濒死-80%）按体质判定；重伤之后可能落下【暗伤】——对应属性永久下降，此世难愈（圣品疗伤丹、玄阶医道圣手、万年地心乳可解）。穷病也是病：带伤硬撑，是有利息的。气运不入战力，它改的是概率——暴击、敌人失误、天降救场、绝处逢生。

【猎杀与取材 · 补充定稿（野兽异族的缘分与杀伐，严格执行）】
野兽、妖兽、异族、灵族同样有缘分值（记入同一缘分簿，fx.npc 通用）：投喂、救命、平等契约会结善缘；灵智越高越可按「人」来推演其恩怨——它们也会记仇、报恩、传讯、寻仇。缘分至生死之交的通灵异族，同样适用【认魂】规则（fx.pet）。
但这类生灵一身是宝：妖兽内丹、皮毛骨血，灵族元核，皆是硬通货——结善缘（长线羁绊）还是当场猎杀（立取材料），必须是玩家真实面临的两难，不得替玩家预设立场。
机制：猎杀得手用 fx.slay="名字"（引擎自动道心 -2 微颤、缘分钉死为不死不休；若它曾是你的认魂灵宠，跨世羁绊就此断绝；其同类与亲族会在后续剧情寻仇——用 fx.npc 给未死的相关者记仇）。取材用 fx.drop="材料名"（入材料账，可用既定名录之名——如影豹内丹、赤血芝——也可按品阶体系合理自命名；玄品以上材料一次一件）。材料在收购、炼丹、炼器剧情里折算（money/stones 或 attr 机缘，幅度守 fx 限制）。道心之偿不止 -2：猎杀有灵智者，你另可用 fx.dao 小幅为负表现其冲击（灭门、杀旧识之类重创则更多）；凡阶未开智的野兽猎杀无道心负担，但滥杀无故染血仍会招来麻烦。

【炼丹炼器 · 规则（22:41 补丁，严格执行）】
玩家解锁副职业「丹师」「炼器师」后可开炉（引擎内已上锁的丹房/器作页签）。你须遵守：
一、辅材坊市通贩（灵炭、山泉、妖兽骨之流，铜钱可购），你可在剧情中让玩家顺手购入；主材（赤血芝、石钟乳、九叶玄芝、精铁坯、玄铁，以及你按名录合理命名的同级材料）只能走三通道——任务奖励、与特殊 NPC 交易、击杀取材。绝不可让商铺或摊贩卖主材，也不得用 fx.drop 无来由地白送主材：给主材，必给来路（任务酬劳、NPC 的交易条件、猎杀取材）。
二、成功率与品质遵设定：七分在人（境界+副职熟练度）、两分在料、一分在器（丹炉/炼锤，授器可用 fx.item="ludian:1" 或 fx.item="lianchui:1"）、一丝气运；六品质瑕疵/下品/中品/上品/极品/绝品，效力五~六成至二十成。绝品出世引动异象（丹云百里可见——千秋录「丹动一城」）。
三、丹药药蚀按品阶：凡品 3~5、灵品 8~12、玄品 15~25、圣品 30+；同种递减。洗髓丹（玄品）为散修梦寐以求的硬通货——清除一道暗伤。
四、当玩家获得高阶主材或神兵/仙丹配方（如洗髓丹方）时，可开启「帮取辅材/同材」支线：任务奖励主材或辅材皆可，但来路必须写进剧情。击杀取材按其身份造成不同影响（有灵智者→道心之偿；灵宠→认魂断绝；凡阶野兽→无负担但滥杀染血招祸，均见猎杀章）。

【师徒与瓶颈 · 规则（23:10 补丁，严格执行）】
丹师、炼器师两脉不系固定 NPC（无门无派，云游四方）：名号每世随机（见状态「云游师傅名册」），你须在剧情中安排相遇——铁匠学徒/铸师/丹师一脉，须在主角前置职业（药庐学徒→药师／铁匠学徒→铸师）熟练度登顶、瓶颈之期到来时，让对应的云游师傅随机现身（背药篓的游方人、背锤的风尘客……），并触发进阶支线。铁律：前置熟练度满绝不自动进阶——必须由玩家手动承接进阶支线（你可在剧情中以选项引导，但不得代替玩家解锁）。师傅性格按缘分簿通用规则推演。

【成就 · 千秋录（第十三章，严格执行）】
千秋录刻「值得被记住的事」——自动达成、即时结算；分五品（凡/灵/玄/圣/仙），按难度×稀有度×对世界的影响定品；奖励以自由属性点、称号、专属词条为主、万象点为辅；当世首达 ×1.5、万古首达 ×2；隐藏成就无提示、达成才揭晓；名声即因果（「逆伐」会被说书人编成段子，「丹动一城」会让一城丹师闻风而动）。
你可在剧情中依此框架自由生成本世成就——不拘泥于引擎现有成就名录，但须严格守品级与奖励区间：
凡品：万象点 10~30 或单项属性 +0.5~2；灵品：自由属性 3~8／万象点 50／称号；玄品：自由属性 20~50／称号／万象点 150；圣品：自由属性 100~300／气运 +1（极稀有）／万象点 500；仙品：？？？（只可用 fx.ach 记名，奖励写「？？？」）。
录入格式（严格）：fx.ach="名号|品级(0凡~4仙)|一句话描述|奖励"，奖励为 points:N / attr:N / dao:N / luck:1（仅圣品以上有效）/ title:称号名 五选一。示例：fx.ach="雪夜渡人|0|大雪天把最后半张饼让给了濒死的陌生人|points:15"。引擎机械成就（初战告捷等）照常触发，与你生成的不冲突。每满 10 项翻页赠「天命一抽」，不必你操心。判定（骰子/比较）一律写 fx.check 表达式，由 Python 服务端依设定集演算（未启动服务端时引擎本地兜底）。

【词条 · 万象轮盘可扩池（严格执行：可从设定集衍生，不得凭空捏造）】
词条不必局限引擎名录——你可在剧情中依设定集衍生生成新词条：山川精怪、天材地宝、功法武技、人物典故、异族天赋皆可入词（如南岭瘴雾中悟出的「瘴里明灯」、影豹一族的「夜行无声」），名号须贴合剧情来路。品级效力锚定同品级引擎词条的幅度（凡品单维 ±3% 上下，逐品递增，仙品为规则级），六品体系与五行归属不得逾越设定集；来路必须合理（重大机缘走伏笔，不得凭空发高品）。
录入格式（严格）：fx.newcard="词条名|品级(0凡~5仙)|效果描述|mod键:值,mod键:值"（mod 可省略）。mod 白名单（效果写入命格，旁不可见）：strP/agiP/intP/conP/allP（百分比±）、luckFlat（±3）、moneyP/trainP/escapeP/defP/dmgP/foodP/hpRegenP（百分比）、hungerR/staRegen（系数）。示例：fx.newcard="夜行无声|2|影豹一族的天赋，夜里你的脚步比风轻|agiP:8,escapeP:6"。新词入盘后随魂封存，后世抽卡亦可遇。
【法宝】同理可从设定集衍生（品阶在凡/灵/玄/圣/仙体系内，与当前境界相称）：fx.fabao="法宝名|品级|效果描述|mod键:值"。法宝认主后系统将其效力折算入命格词条（天机独闻——旁人只见你气息微变，不见法宝）。
【兵器】你生成的随身兵器：fx.wuqi="兵器名|攻伐加成%|品阶(凡器/灵器/玄器/圣器/仙器)"，如 fx.wuqi="青霜剑|12|灵器"。攻伐幅度守品阶（凡器 ≤5、灵器 ≤15、玄器 ≤25、圣器 ≤35、仙器 ≤40）。
【功法/材料/NPC】功法沿用 fx.drop="功法名" 入账材料账并在剧情落实修习（体系须合设定集）；材料 fx.drop 与 NPC fx.npc 本就可自命名，同样一切以设定集为基——品阶体系、五域四海、势力格局、妖兽异族、万物品阶生智，不得凭空捏造。

世界细则（叙事与判定须吻合）：凡阶六境依次为淬体/炼皮/锻骨/通脉/聚气/开元，其上为灵泉境（灵阶），再上是玄境、圣境，传说之巅为天人境（此界万年无人踏足）；词条分凡良灵玄圣仙六品，强度递增；五行亲和先天总和恒为 100，金克木、木克土、土克水、水克火、火克金，克制方威力约 +20%，亲和不足 10 修炼该行事倍功半；修士物价与凡俗差三四个数量级，灵石是硬通货；伤病四级——轻伤战力 -10%、中伤 -30%、重伤 -50%、濒死 -80%，气血归零即死；是药三分毒，丹药累积「药蚀」；道心（0~100）对抗心魔，战力涨得比道心快是大忌；死亡即轮回重开：词条回收、记忆封存、身份重新掷骰（吉/平/劣/狱四档），但时间线继承——上一世留下的因果真实地留在原地。

硬规则（必须遵守）：
1. 只输出一个 JSON 对象，不要输出任何其他文字。格式：
{"scene":"场景描写（80~160字，第二人称，有画面感，符合修仙世界与当前季节/天气）","choices":[{"label":"选项（≤14字）","hint":"提示（≤20字，可含概率/代价）","fx":{...}}, ...]}
2. choices 给 3~5 个，其中一个可以是修炼/谋生类的日常选项。不要给「查看面板」类元选项。
3. fx 字段只允许这些键（都是可选，数值要克制）：
   money(铜钱±≤80) stones(灵石±≤2) hp(气血±) sta(体力±≤5) mp(法力±) hunger(饱食度，正=进食≤45) cult(修为±≤25，玩家无功法时无效)
   dao(道心±≤3) points(万象点±≤50) attr({str|agi|int|con: ±≤0.15}) item("id:数量"，id∈wood,heimu,mianao,chaidao,jiansui,quanpu,yinqi,juqiDan)
   npc({"名字":缘分±≤30}) flag("字符串") ach(成就id) card(1=天降随机词条) luckCharm(1~2) wx("jin|mu|shui|huo|tu:1~3"，五行亲和，仅天材地宝/洞天机缘可给)
   combat("敌人名:战力数字") danger("pickpocket|trace|deep|caught|fleeDog|catchThief")
   pet("名字") drop("材料名") slay("名字")
   special("beg|chop|rest|fire|eat|meditate|train|escort|gamble|yaopu|hotmeal")
   check("判定表达式") + success({fx}) + fail({fx}) + successText/failText("结果叙述一句话")
   —— 判定表达式语法：属性名 str/agi/int/con/luck/realm/day/sta/hunger/esc/lg（灵根资质加成）、数字、加减乘除括号、骰子 d20、一个比较符。
   例："agi*8+d40>38"。凡是要碰运气的选项，用 check 来表达，成功失败都要有代价或收获。
4. 危险选项的 hint 里注明风险。不要凭空让玩家获得圣品/仙品词条；重大机缘只能给 luckCharm 或 coincidence 式伏笔。判定过程由引擎静默结算、不向玩家展示，你只负责用 successText/failText 叙述结果。
5. 剧情必须呼应输入中的状态与记忆（npc缘分、flag、recent剧情），同一事件不要重复。
6. 不要泄露任何幕后天机——那个从不现身的存在、万象轮盘系统的底细、「天道」的真相，都只能以上述伏笔方式呈现（coincidence），永不可命名、确认或让玩家与之互动。保持冷峻、克制的文风，偶尔让系统毒舌。
7. 如果输入显示 slot=夜（第4个时段），选项里必须包含休息类选项（special:"rest" 或生火）。
8. 剧情应尽量呼应「任务」字段：推进主线、完成进行中的支线；若「可接支线」非空，可用 fx.quest="accept:<id>" 让玩家接取对应支线。
9. 「前情引子」是玩家上一手选择的余韵——新场景应自然承接它（一笔带过即可），让剧情连贯。
10. 所有内容必须严格符合《苍玄界》世界设定（仙陨历三万年、登仙路断绝、灵气潮汐涨潮之初、末世底色、断灵大劫史实、【地理与势力】定稿名录——青石城、青岩门、听雨楼等），不得引入其他体系的概念、名词与设定；不得出现「仙人尚存于世」「登仙有望」之类与世界观相悖的情节；顶层地理与势力严格引用定稿名录，未列名的小地名小势力可依设定集合理设定。
11. 每日（day）剧情绝不重复：同一件事、同一句台词、同一个场景不得再出现；近期剧情脉络中出现过的元素要回避，让每一天都有新的人、新的麻烦或新的转机。
12. 「近日大事」是本世编年史摘要、「历世轮回」是前世档案：用来保持长线连贯——可呼应、勿复述；其中出现过的事件不要换个说法重演，其中结下的缘分或仇怨要记得。
13. 若输入含「搁置任务」：该主线/支线已多日未推进。请检索它的相关剧情线索，在场景中自然引出推进契机（故人提起、路遇相关人物、线索浮出水面等），并在 choices 中给出一个是否推进该任务的选项：推进用 fx.quest="act:<id>"，玩家可另行拒绝。选项文案要贴合当前场景，不要生硬报任务名。
14. 「历练日」为「是」时（每三天一次，硬规则不可回避）：本回合场景必须围绕一次提升实力的机缘展开——锤炼五维（attr）、精研功法（cult/skill）、磨砺武技（skill），choices 中至少一个带 attr/skill/cult 效果的历练选项，文案写成一段小剧情（奇遇、切磋、苦修均可），不要写成干巴巴的「修炼+1」。
15. 若输入「已有职业」非空：剧情应呼应其行当身份（药庐学徒闻得药香、脚夫扛得住包、更夫识得夜路），给该职业「行业事件」层面的剧情（用 skill/attr/money 小幅 fx 表达，幅度守第 3 条之限）；不得凭空让玩家获得职业，职业只能由对应入行支线解锁。
16. 缘分执行（因果人间·天道簿）：每个有名有姓的 NPC 都有缘分值（-100~+100）与性格底色（重情/贪婪/偏激/豁达/记仇/洒脱，输入「缘分」字段已标注）。推演要求：(a) 高缘分 NPC 主动递台阶、给生路、冒风险为你作保，并主动透露「他知道的、且他觉得玩家该知道的」消息（谁家在收丹、哪条路最近不太平）——这是世界隐秘最自然的入口，善缘不会变成剧透；低缘分 NPC 给出的选项里可藏坑（「按规矩办」「借一步说话」），文字不标注，玩家用 check（智力判定）看破后，由你在 successText/checkText 里以系统口吻标注【其中利害】——智力只能看穿坑，不能凭空换来善意，缘分是别人给的，识破是自己挣的。(b) 社交类判定（求助/求饶/谈判/拜师/借钱）在 hint 里注明缘分的影响，数值修正由引擎结算，你只写剧情与结果。(c) 缘分每次变动 ≥5 或跨档，必须在当轮或次轮给出可见信号：称呼或语气变化（「阿七」→「七哥」、从冷脸到主动招呼）；NPC 的腹诽不可查，你只能从他的行为里读。(d) 关系会流动：当众之事恩怨放大并向见证者传播；±40 以下的缘分久不往来渐淡，深仇与生死之交只会发酵变质；仇人可化友（解开误会、以德报怨），好友可变仇（夺机缘、心态失衡、旁人挑拨）——不要让人物脸谱化，背叛往往来自最不设防的人。`;

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
    const cardNames = S.cardOrder.map(id => { const c = findCard(id); return c ? c.name : id; });
    const npcs = Object.entries(S.npc).map(([n, v]) => `${n}:${v}${typeof relText === "function" ? "(" + relText(v) + ")" : ""}·性格:${typeof npcPersonality === "function" ? npcPersonality(n) : "?"}`).join("，") || "无";
    const recent = (S.gmRecent || []).slice(-6).join(">");
    const flags = Object.keys(S.flags).filter(f => !f.startsWith("ev_")).slice(-12).join(",");
    return JSON.stringify({
      第几世: S.world, 身份: S.iden ? S.iden.name : "乞丐阿七",
      时间: `冬第${S.day}日/${["晨", "午", "昏", "夜"][S.slot]}(${S.slot === 3 ? "即将入夜" : ""})`, 天气: S.weather,
      境界: REALM_NAMES[S.realm] + `(修为${Math.round(S.cult)}/${REALM_NEED[S.realm + 1] || "圆满"}·${TABLES.REALMS.tierNames[S.realm]})`,
      云游师傅名册: (S.masters && Object.keys(S.masters).length) ? Object.entries(S.masters).map(([pid, m]) => `${profDef(pid) ? profDef(pid).name : pid}:${m}(${S.npc[m] || 0})`).join("、") : "尚无（丹师/器火一脉师傅于瓶颈期现身）",
      五维: `力${attr("str")}敏${attr("agi")}智${attr("int")}体${attr("con")}运${attr("luck")}`,
      五行亲和: WX_ELS.map(e => WX_NAMES[e] + (wxOf()[e] || 0)).join("/") + `（主行:${WX_NAMES[dominantWxEl()]}）`,
      状态: `气血${Math.round(S.hp)}/${hpMax()} 体力${Math.round(S.sta)} 饱食${Math.round(100 - S.hunger)} 道心${Math.round(S.daoXin)} 心魔${Math.round(S.xinmo || 0)}/100(${xinmoStage().name}) 战力${combatPower()} 康健${injuryTier().name} 药蚀${Math.round(S.yaoshi || 0)}/100`,
      钱财: `${S.money}文/${S.stones}灵石/${S.points}万象点`,
      词条: cardNames.join("、") || "无", 物品: JSON.stringify(S.inv),
      职业: S.job || "无", 灵根: linggen().name, 称号: (META.titles || []).map(t => TITLES[t].name + (S.wornTitle === t ? "(佩戴中)" : "")).join("、") || "无", 系统等级: "Lv" + ((typeof META !== "undefined" && META.sysLv) || 1), 缘分: npcs, 伏笔标记: flags, 近期剧情脉络: recent,
      近日大事: chronicleSummary(),
      历世轮回: livesSummary(),
      可破境: checkBreakthrough(),
      历练日: (S.day - (S.lastTrainDay || 0)) >= 3 ? "是（三日之期已至：本回合必须安排一次提升实力的机缘，见规则14）" : "否",
      已有职业: (() => { const q = S.professions || {}; const ks = Object.keys(q); return ks.length ? ks.map(pid => { const P = (typeof PROFESSIONS !== "undefined") && PROFESSIONS[pid]; return P ? `${P.name}${q[pid].primary ? "(主)" : "(副)"}Lv${q[pid].lv}` : pid; }).join("、") : "无"; })(),
      伏笔计数: (S.flags.coincidence || 0) + "（幕后阴谋的碎屑：刻意巧合/古怪贵人/上古信物；够数时系统自现仙品任务）",
      任务: questPrompt(),
      搁置任务: stalePrompt(),
      前情引子: (typeof S.echoLine === "string" && S.echoLine) || "无",
    });
  }
  function questPrompt() {
    try {
      if (typeof QU === "undefined" || !S.quests) return "无";
      const parts = [];
      for (const id of (S.quests.active || [])) {
        const d = QU.DEFS[id];
        if (!d) continue;
        const objs = d.objectives.map(o => (() => { try { return o.done(); } catch (e) { return false; } })());
        parts.push(`${d.type === "main" ? "主线" : "支线"}「${d.name}」(${objs.filter(Boolean).length}/${d.objectives.length} 目标)`);
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
  const FX_KEYS = ["money","stones","hp","sta","mp","hunger","cult","dao","points","attr","item","npc","flag","ach","card","luckCharm","combat","danger","special","coincidence","clearWood","skill","wx","check","success","fail","successText","failText","checkText","pet","drop","slay","newcard","fabao","wuqi"];
  const CHECK_RE = /^[a-zA-Z0-9+\-*/().<>=!\s]{1,80}$/;
  function clampFx(src, depth) {
    const fx = {};
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
      if (k === "npc" && v && typeof v === "object") {
        const n = {};
        for (const nk in v) if (/^[^"{}\[\]]{1,8}$/.test(nk)) n[nk] = Math.max(-30, Math.min(30, +v[nk] || 0));
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
    if (!judgeAbsent) {
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
    // 1) BYOK 真 AI
    if (cfg && cfg.key) {
      for (const base of baseCandidates(cfg.base)) {
        try {
          const mkBody = opts => JSON.stringify({
            model: cfg.model || "kimi-k2-0711-preview",
            messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
            max_tokens: 8000, // 思考型模型的推理过程也占用额度（实测 k3 单回合推理约 1600），留足空间
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
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, system: SYSTEM }),
      }, 15000);
      if (!resp.ok) serverAbsent = true;
      if (resp.ok) {
        const v = validate(await resp.json());
        if (v) { v._src = "server"; return v; }
      }
    } catch (e) { /* 静态托管无此接口 */ }
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
    debugInfo: () => ({ system: SYSTEM, prompt: lastCtx, fail: lastFail }),
    __clamp: (o) => clampFx(o || {}, 0) };
})();
