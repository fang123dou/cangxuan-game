/* 苍玄界 · 游戏数据：卡池 / 事件 / 身份 / 文案 */
"use strict";

/* ============ 卡品 ============ */
const TIERS = [
  { key:0, name:"凡品", css:"#8f8f8f", prob:68 },
  { key:1, name:"良品", css:"#ddd7c7", prob:25 },
  { key:2, name:"灵品", css:"#6fa8a0", prob:5 },
  { key:3, name:"玄品", css:"#9170bd", prob:1.5 },
  { key:4, name:"圣品", css:"#d4af6e", prob:0.49 },
  { key:5, name:"仙品", css:"#d05a4a", prob:0.01 },
];

/* mod 字段说明：
   strP/agiP/intP/conP/luckP 百分比属性 | luckFlat 气运直加 | hungerR 饥饿速率倍率
   foodP 进食效果% | hpRegenP 夜间恢复% | staRegen 体力恢复倍率 | moneyP 挣钱%
   socialP 缘分获取% | trainP 修炼/磨炼速度% | dmgP 伤害% | escapeP 逃脱%
   pityR 保底计数加速% | defP 承伤减免% | allP 全属性%
   special: 特殊机制标记                                  */
const CARD_POOL = [
  /* ---- 凡品（灰） ---- */
  [
    { id:"dali",   name:"大力",        eff:"力量提升 3%", mod:{strP:3} },
    { id:"pihou",  name:"皮厚",        eff:"体质提升 3%", mod:{conP:3} },
    { id:"jiaokuai",name:"脚快",       eff:"敏捷提升 3%", mod:{agiP:3} },
    { id:"lingguang",name:"灵光",      eff:"智力提升 3%", mod:{intP:3} },
    { id:"tuitui", name:"退退退",      eff:"每日可喝退一次远弱于你的目标；对强者使用会激怒对方", mod:{escapeP:12} },
    { id:"dandan", name:"胆子肥嘟嘟",  eff:"胆气与威慑抗性 +20%；作死倾向 +20%", mod:{defP:3} },
    { id:"buzao",  name:"我去，不早说", eff:"踩坑后习得速度翻倍——错题本体质", mod:{trainP:6} },
    { id:"langlang",name:"浪浪山小妖怪", eff:"扮小人物毫无破绽，大能不屑看你；功劳易被抢", mod:{escapeP:6} },
    { id:"yemao",  name:"夜猫眼",      eff:"夜视守静：黑暗里你的耳朵比刀快，逃脱 +4%", mod:{escapeP:4} },
    { id:"jiejin", name:"勒紧裤腰带",  eff:"挨饿的本事刻进骨头：饥饿累积 -8%", mod:{hungerR:0.92} },
    { id:"dongchuang",name:"冻疮疤",   eff:"冻出来的老茧：体质提升 2%，风雪夜不再那么要命", mod:{conP:2} },
    { id:"xiaoqi", name:"小气得福",    eff:"一个铜板掰两半花：利润与工钱 +4%", mod:{moneyP:4} },
    { id:"feiqiu", name:"非酋",        eff:"【负面】气运 -1；保底计数速度 +25%", mod:{luckFlat:-1, pityR:25}, bad:true },
    { id:"dayuan", name:"大冤种",      eff:"【负面】易被坑骗；每次被坑后三日内必有补偿机缘", mod:{}, bad:true, special:"yuanchang" },
    { id:"huachang",name:"滑肠之体",   eff:"【负面】吃不洁食物必腹泻；但药蚀累积减半", mod:{conP:-2}, bad:true, special:"huachang" },
  ],
  /* ---- 良品（白） ---- */
  [
    { id:"tongpi", name:"铜皮铁骨",    eff:"体魄提升 10%", mod:{conP:10}, fuse:"jinji" },
    { id:"ganfan", name:"干饭人",      eff:"吃饱后两时辰力量 +5%，热饭滋养体质；饭量 ×1.5，饿得更快", mod:{strP:2, foodP:25, hungerR:1.45} },
    { id:"tiewei", name:"铁胃",        eff:"免疫食源性腹泻，毒抗 +20%", mod:{conP:2}, special:"tiewei" },
    { id:"hajimi", name:"哈基米",      eff:"小动物与妖兽幼崽天然亲近你", mod:{socialP:5}, special:"hajimi" },
    { id:"aini",   name:"爱你老己",    eff:"独处恢复 +30%，心魔抗性 +20%", mod:{hpRegenP:30} },
    { id:"jingyi", name:"敬自己一杯",  eff:"死里逃生后饮一杯，气运临时 +1（三日）", mod:{}, special:"jingyi" },
    { id:"wude",   name:"不讲武德",    eff:"偷袭暗算威力 +30%；被围观则声望大跌", mod:{dmgP:8} },
    { id:"wubian", name:"闪电五连鞭",  eff:"五连击总伤 +50%，每鞭独立命中——敏捷低者五鞭全空", mod:{dmgP:10, agiP:3} },
    { id:"qingxu", name:"情绪价值",    eff:"善缘积累 +20%", mod:{socialP:20} },
    { id:"xianyan",name:"显眼包",      eff:"存在感爆棚：贵人更容易注意到你——仇家也是", mod:{socialP:10} },
    { id:"meikong",name:"真没空陪你闹了", eff:"脱离无意义缠斗成功率 +30%", mod:{escapeP:30} },
    { id:"tangzhe",name:"全职研究如何躺着收租", eff:"闭关走火入魔率大降；出关动力 -50%", mod:{}, special:"tangzhe" },
    { id:"shenxing",name:"神行",       eff:"日行百里不喘：敏捷提升 8%，逃脱 +8%", mod:{agiP:8, escapeP:8} },
    { id:"zhangfang",name:"账房先生",  eff:"算盘一响，黄金万两：利润与工钱 +10%", mod:{moneyP:10} },
    { id:"ercong", name:"耳聪目明",    eff:"六识敏锐：智力提升 6%，守夜察觉先人一步", mod:{intP:6, escapeP:4} },
    { id:"yijing", name:"半卷医经",    eff:"自救救人两相宜：气血恢复 +15%", mod:{hpRegenP:15} },
    { id:"huaibi", name:"怀璧其罪",    eff:"【负面】身怀重宝必被觊觎：灵石过夜可能招贼；睡不踏实，逃脱警觉 +10%", mod:{escapeP:10}, bad:true, special:"huaibi" },
  ],
  /* ---- 灵品（青） ---- */
  [
    { id:"jixing", name:"吉星高照",    eff:"气运大幅提升，偶有机缘天降", mod:{luckFlat:1} },
    { id:"shuishen",name:"睡神附体",   eff:"睡眠恢复 ×2，打坐效率 +20%；睡梦中遇袭判定 -30%", mod:{hpRegenP:60, trainP:5} },
    { id:"jiujian",name:"酒剑仙",      eff:"酒醉状态战力不降反升 +15%；宿醉次日智力减半", mod:{dmgP:6} },
    { id:"bigu",   name:"早产辟谷",    eff:"凡阶即可辟谷，饭钱全省；永久失去食补渠道", mod:{}, special:"bigu" },
    { id:"yanpai", name:"我要验牌",    eff:"每三日一次强制系统重检判定；验错则暴露你的怀疑", mod:{}, special:"yanpai" },
    { id:"xiexiu", name:"邪修",        eff:"旁门左道效率 +50%：成功时效果 ×1.5", mod:{trainP:18} },
    { id:"laicai", name:"来财",        eff:"财运大涨，经商利润 +10%；露富招贼", mod:{moneyP:12} },
    { id:"ruhe",   name:"如何呢又能怎", eff:"嘲讽、乱心、心魔类攻击效果 -50%", mod:{}, special:"mindshield" },
    { id:"pofang", name:"破防了",      eff:"话术暴击：说中心结，对方战力 -8%；结仇速度 +20%", mod:{socialP:8, dmgP:3} },
    { id:"moyu",   name:"摸鱼圣手",    eff:"多线修炼惩罚减半（÷n 变 ÷√n）", mod:{trainP:10} },
    { id:"juanwang",name:"卷王",       eff:"修炼速度 +20%，睡眠需求增加", mod:{trainP:20, hpRegenP:-15} },
    { id:"niuma",  name:"先天牛马圣体", eff:"体力恢复 ×2，劳作磨炼收益 +50%；贵人见你就想使唤你", mod:{staRegen:2, moneyP:10} },
    { id:"yaoyao", name:"遥遥领先",    eff:"欺诈：战力对外显示虚高 30%——挑战者络绎不绝", mod:{}, special:"yaoyao" },
    { id:"chulei", name:"触类旁通",    eff:"一通百通：全系熟练度获取 +18%", mod:{trainP:18} },
    { id:"jucai",  name:"小聚财库",    eff:"财源广进：经商利润与工钱 +15%；露富招贼", mod:{moneyP:15} },
    { id:"renyuan",name:"人缘广结",    eff:"善缘积累 +25%，陌生人看你顺眼", mod:{socialP:25} },
    { id:"mengwu", name:"梦中悟道",    eff:"气运高者偶有预警之梦：睡眠恢复 +20%，修炼 +10%", mod:{hpRegenP:20, trainP:10} },
    { id:"meishen",name:"霉神附体",    eff:"【负面】霉运缠身，身边人跟着倒霉：气运 -1；保底计数 +25%——坏卡用好了，是把不见血的刀", mod:{luckFlat:-1, pityR:25}, bad:true, special:"meishen" },
  ],
  /* ---- 玄品（紫） ---- */
  [
    { id:"fengxiong",name:"逢凶化吉",  eff:"质变：必死之局总有一线生机（致命伤害概率生还）", mod:{}, special:"cheatdeath" },
    { id:"meihuo",  name:"天生魅魔",   eff:"异性初始好感 +40，魅力判定大幅加成；情怨结仇 ×2——魅力是债", mod:{socialP:35}, special:"meihuo" },
    { id:"zhenxiang",name:"真香定律",  eff:"规则：立誓「宁死不做」的事做了收益 ×2；每月至少当众真香一次", mod:{trainP:8, moneyP:8}, special:"zhenxiang" },
    { id:"laosou",  name:"老叟戏顽童", eff:"碾压低战力目标消耗减半；虐菜多了遇强者先手 -5%", mod:{dmgP:12}, special:"laosou" },
    { id:"leiyi",   name:"一缕雷意",   eff:"雷亲和 +10：完整变异灵根的火星，体质才是炉子", mod:{allP:4} },
    { id:"tiansha", name:"天煞孤星",   eff:"【负面】亲近之人易遭横祸：善缘 -20%；孤星照命，独处以恒——修炼 +10%", mod:{socialP:-20, trainP:10}, bad:true },
    { id:"xinxi",  name:"心血来潮",    eff:"规则：睡着也生效——刀落下前会把你叫醒（致死袭击 30% 概率预感避开）", mod:{}, special:"xinxi" },
    { id:"baidu",  name:"百毒不侵",    eff:"毒吃多了不死，也是条路：免疫食源性腹泻与瘴毒，体质 +8%", mod:{conP:8}, special:"baidu" },
    { id:"shafa",  name:"杀伐果断",    eff:"攻伐 +30%——犹豫是留给活人的", mod:{dmgP:30} },
  ],
  /* ---- 圣品（金） ---- */
  [
    { id:"qiyunzi",name:"气运之子",    eff:"逆天：走路捡钱，秘境认主，强敌降智（气运 +2）", mod:{luckFlat:2}, special:"lucky" },
    { id:"zhupo",   name:"助我破鼎",   eff:"破境成功率 +15%；突破失败道基不损", mod:{}, special:"ding" },
    { id:"daoxinzhu",name:"磐石道心",  eff:"道心恒稳：心魔抗性 +30%，破境时心境判定大幅加成", mod:{conP:8, intP:8}, special:"daoxin" },
    { id:"chouqin",name:"天道酬勤",    eff:"大道级勤勉：修炼速度 +60%——天道不亏待人", mod:{trainP:60} },
    { id:"wuwo",   name:"刀剑无我",    eff:"攻伐 +60%，防御 -10%——眼里只有进手，没有退路", mod:{dmgP:60, defP:-10} },
  ],
  /* ---- 仙品（红） ---- */
  [
    { id:"tianming",name:"天命在我",   eff:"涉及因果命运：可强行扭转一次必死结局", mod:{}, special:"fate" },
    { id:"hundun", name:"混沌道体",    eff:"五行合一：全属性 +15%，万法不克、万法皆通（天道预支，需自证）", mod:{allP:15} },
    { id:"yinguo", name:"因果赊账",    eff:"涉及因果命运：立得万象点 ×300；天道记账，概不退换——此后每次破境成功率 -5%", mod:{}, special:"yinguo" },
  ],
];
/* 合成进阶（三合一）：词条强度按高一品级区间的下限重算 */
const FUSION = {
  tongpi:{ name:"金肌玉骨", tier:2, eff:"体魄提升 15%（由三枚「铜皮铁骨」合成）", mod:{conP:15} },
  dali:  { name:"拔山之力", tier:1, eff:"力量提升 8%（由三枚「大力」合成）", mod:{strP:8} },
  ganfan:{ name:"食神",     tier:2, eff:"进食灵谷灵肉可永久微增属性，药膳效果 ×2（由三枚「干饭人」合成）", mod:{foodP:30, conP:10} },
  lingguang:{ name:"心明眼亮", tier:1, eff:"智力提升 5%（由三枚「灵光」合成）", mod:{intP:5} },
  jiaokuai:{ name:"草上飞", tier:1, eff:"敏捷提升 5%（由三枚「脚快」合成）", mod:{agiP:5} },
  pihou: { name:"铁布衫",   tier:1, eff:"体质提升 5%（由三枚「皮厚」合成）", mod:{conP:5} },
};
/* 彩蛋组合卡（不入卡池，撞对组合自动合成，原卡各消耗一张） */
const COMBO_CARDS = {
  zhangchi:{ name:"张弛有度", tier:3, eff:"修炼时卷王附体，休息时恢复 ×2（「卷王」×「摸鱼圣手」彩蛋合成）", mod:{trainP:20, hpRegenP:60} },
  zhichang:{ name:"直肠子食神", tier:2, eff:"属性成长与药蚀免疫兼得（「滑肠之体」×「干饭人」彩蛋合成）", mod:{strP:2, foodP:25, conP:4}, special:"zhichang" },
};
const COMBO_PAIRS = [["juanwang", "moyu", "zhangchi"], ["huachang", "ganfan", "zhichang"]];

/* ============ 随机身份（再世） ============ */
const IDENTITIES = [
  { grade:"吉", name:"药王谷药童",   desc:"识药辨草的童子，月有薄俸。", mods:{int:1,con:0}, money:300, note:"「药圃岁月」丹道熟练度 +10%" },
  { grade:"吉", name:"将门遗孤",     desc:"军营里长大的骨头，仇家环伺。", mods:{con:1,str:1}, money:200, note:"「军营长大的骨头」体质成长 +10%" },
  { grade:"吉", name:"商队少东",     desc:"拨算盘的手比握剑稳。", mods:{int:1,luck:0}, money:800, note:"「算盘精」议价 +5%" },
  { grade:"平", name:"市井孩童",     desc:"跑街串巷，帮派的保护费比年关难过。", mods:{agi:1}, money:60, note:"「跑街」敏捷成长 +5%" },
  { grade:"平", name:"猎户遗孤",     desc:"山里的鼻子，冬荒夺田的族亲。", mods:{agi:1,con:0}, money:80, note:"「山里的鼻子」野外生存 +10%" },
  { grade:"平", name:"私塾伴读",     desc:"旁听生，主仆名分随时被逐。", mods:{int:1}, money:40, note:"「旁听生」悟性 +5%" },
  { grade:"劣", name:"疫村遗孤",     desc:"人人避你如瘟神；你的血对某种毒免疫。", mods:{con:-1,luck:0}, money:10, note:"「病骨」毒抗 +10%、体质成长 -10%" },
  { grade:"劣", name:"矿奴",         desc:"地底肺，黑暗中的感知异于常人。", mods:{con:1,int:0}, money:0, note:"「地底肺」黑暗中感知 +15%" },
  { grade:"狱", name:"死囚之子",     desc:"烙印贱籍，见惯生死。", mods:{luck:-1,con:1}, money:0, note:"「见惯生死」恐惧判定 +15%" },
  { grade:"狱", name:"祭品",         desc:"山村十年一祭，你是今年的「山神新娘」。", mods:{luck:-1}, money:0, note:"「祭品的镇定」疼痛忍耐 +20%" },
];

/* ============ 成就（千秋录） ============ */
const ACHIEVEMENTS = {
  baonuan:  { name:"饱暖",       tier:0, desc:"穿越后第一次吃上热饭、睡个安稳觉", reward:"万象点 ×5" },
  firstBlood:{name:"初战告捷",   tier:0, desc:"赢下人生第一场生死战", reward:"自由属性 ×1" },
  firstPot:  {name:"第一桶金",   tier:0, desc:"凭本事挣到第一块灵石", reward:"万象点 ×10" },
  hotRice:  { name:"干饭之王",   tier:0, desc:"连续百日吃上热食", reward:"体质 +1" },  tuotai:   { name:"脱胎换骨",   tier:0, desc:"首次突破小境界", reward:"自由属性 ×1" },
  juqi:     { name:"一步一登天", tier:2, desc:"踏入聚气境，初窥仙门", reward:"自由属性 ×3，万象点 ×100" },
  gacha10:  { name:"初试轮盘",   tier:0, desc:"完成第一次抽卡", reward:"万象点 ×10" },
  gacha100: { name:"轮盘常客",   tier:2, desc:"累计抽卡一百次", reward:"称号「轮盘常客」" },
  xuanCard: { name:"紫气东来",   tier:2, desc:"抽得第一张玄品词条", reward:"万象点 ×50" },
  shengCard:{ name:"圣眷",       tier:3, desc:"抽得第一张圣品词条", reward:"气运 +1" },
  xianCard: { name:"？？？",     tier:4, desc:"抽得仙品词条——轮盘都安静了一瞬", reward:"达成时揭晓" },
  wolfKill: { name:"屠狼",       tier:1, desc:"独自击杀冬狼", reward:"力量 +1" },
  savior:   { name:"雪中送炭",   tier:1, desc:"救下那个本该死去的黑衣人", reward:"缘分簿记下一笔" },
  merciless:{ name:"见死不救",   tier:0, desc:"雪夜里，你选择了自己", reward:"道心微澜" },
  survive30:{ name:"熬过凛冬",   tier:2, desc:"活过这个冬天", reward:"万象点 ×150" },
  qingyan:  { name:"仙门弟子",   tier:2, desc:"拜入青岩门", reward:"自由属性 ×3" },
  death1:   { name:"向死而生",   tier:1, desc:"第一次死亡——死亡是昂贵的，也是公平的", reward:"轮回开启" },
  hidden:   { name:"察觉者",     tier:4, desc:"注意到三次不该存在的「巧合」", reward:"棋盘上多了一双看你的眼睛", secret:true },
  renji:    { name:"凡俗之巅",   tier:3, desc:"不入聚气，纯以凡躯将一项属性磨到 10", reward:"称号「人极」", secret:true },
  quest1:   { name:"初入卷宗",   tier:0, desc:"完成第一个任务（主线或支线）", reward:"万象点 ×5" },
  shengsi:  { name:"生死之交",   tier:2, desc:"拥有第一位缘分值 +80 以上的人", reward:"称号「义薄云天」：陌生人初始好感 +10" },
  huagan:   { name:"化干戈",     tier:3, desc:"将一段 -90 以下的死仇化解为正缘", reward:"气运 +1" },
  yuejie:   { name:"越阶而战",   tier:2, desc:"跨越一个小境界取胜（以弱胜强）", reward:"称号「以下克上」：对高于己者伤害 +5%" },
  juejing:  { name:"绝境反杀",   tier:3, desc:"濒死状态下反杀强敌", reward:"称号「向死而生」：濒死时攻伐 +30%" },
  mingbu:   { name:"命不该绝",   tier:2, desc:"濒死生还", reward:"体质 +1" },
  yushi:    { name:"与天争时",   tier:3, desc:"十日之内连破两境，打破当世该境界最快纪录", reward:"称号「赶路人」：修炼速度 +5%" },
  wukui:    { name:"问心无愧",   tier:4, desc:"道心达到 90", reward:"称号「磐石道心」：心魔抗性 +30%" },
  fujia:    { name:"富甲一方",   tier:3, desc:"身家进入一城财富前列（三千文身家）", reward:"称号「财神眷顾」：交易议价 +10%" },
  dabusi:   { name:"打不死的",   tier:2, desc:"身负「霉神附体」满十五日而毫发无损", reward:"称号「小强」：环境伤害 -10%" },
};

/* ============ 称号（随魂封存，效果永续；面板可佩戴其一示人） ============ */
const TITLES = {
  yibao:    { name: "义薄云天", from: "生死之交", desc: "陌生人初始好感 +10" },
  lunpan:   { name: "轮盘常客", from: "轮盘常客", desc: "轮盘保底计数速度 +5%", mod: { pityR: 5 } },
  renjiT:   { name: "人极",     from: "凡俗之巅", desc: "凡躯极点：日常磨炼收益 +10%" },
  yike:     { name: "以下克上", from: "越阶而战", desc: "对强于己者伤害 +5%" },
  xisheng:  { name: "向死而生", from: "绝境反杀", desc: "濒死时攻伐 +30%" },
  ganlu:    { name: "赶路人",   from: "与天争时", desc: "修炼速度 +5%", mod: { trainP: 5 } },
  panshiT:  { name: "磐石道心", from: "问心无愧", desc: "心魔抗性 +30%（心魔增长减缓，渡劫更稳）" },
  caishen:  { name: "财神眷顾", from: "富甲一方", desc: "交易议价 +10%（商铺价格 -10%）" },
  xiaoqiang:{ name: "小强",     from: "打不死的", desc: "环境伤害 -10%（寒潮冻伤等减免）" },
};
/* 成就 → 称号 */
const ACH_TITLE = { shengsi: "yibao", gacha100: "lunpan", renji: "renjiT", yuejie: "yike", juejing: "xisheng", yushi: "ganlu", wukui: "panshiT", fujia: "caishen", dabusi: "xiaoqiang" };

/* ============ 商铺 · 云州杂货 ============
   品类依《苍玄界世界设定集》：南荒奇珍为筑基丹（二十三章·南荒篇），
   方寸戒为储物法器（六十三章·咫尺物），青冥引气诀为二阶功法。 */
const SHOP_BASE = [
  { id: "heimu", name: "黑馍", price: 2, desc: "又冷又硬的黑面馍馍，顶饿。", kind: "食物" },
  { id: "hotnoodle", name: "热汤面", price: 5, desc: "一碗下肚，从舌尖暖到脚尖。立食，饱食 +40。", kind: "食物", use: "eat" },
  { id: "shaojiu", name: "烧刀子", price: 8, desc: "烈酒。喝一口，雪夜就不那么冷了。", kind: "食物", use: "drink" },
  { id: "wood", name: "柴薪", price: 6, desc: "一捆干柴。夜里生火御寒，或囤着等雪天涨价。", kind: "日用" },
  { id: "medicine", name: "跌打药", price: 12, desc: "回春堂出品的金疮药。气血 +6。", kind: "药物", use: "heal" },
  { id: "huobun", name: "火把", price: 3, desc: "松脂火把。夜里赶路、探林深处都用得上。", kind: "日用" },
  { id: "mianao", name: "老棉袄", price: 60, desc: "厚实的老棉袄。风雪与寒潮夜不再冻伤。", kind: "衣物" },
  { id: "chaidao", name: "豁口柴刀", price: 45, desc: "砍柴效率 +1，关键时刻也能当兵器。", kind: "工具" },
];
const SHOP_UNLOCK = [
  { id: "gongfuTea", name: "凝神香片", price: 18, desc: "茶棚货。泡一盏，打坐吐纳效率倍增一次（修为 +12）。", kind: "丹茶", flag: "shop_tea",
    cond: () => !!(S && (S.npc["雪夜寡妇"] || 0) >= 20) },
  { id: "zhuJidan", name: "筑基丹", price: 480, desc: "南荒奇珍，低阶散修梦寐以求。服之修为大涨（修为 +60）。", kind: "丹药", flag: "shop_zhuji", stones: 1,
    cond: () => S && S.realm >= 2 },
  { id: "juqiDan", name: "聚气丹", price: 150, desc: "低阶丹药，服之助涨修为（修为 +30）。", kind: "丹药", flag: "shop_juqi",
    cond: () => S && S.realm >= 1 },
  { id: "yinqi", name: "《青冥引气诀》", price: 380, desc: "二阶功法残卷，吐纳效率倍增。凡俗市面上绝难一见。无功法者修为寸步难进——这是敲门砖。", kind: "功法", flag: "shop_yinqi",
    cond: () => S && (S.stats.maxMoney || 0) >= 150 },
  { id: "paiduDan", name: "排毒丹", price: 60, desc: "排解药蚀（药蚀 -15）。治标不治本——本身也含微量药蚀，以毒攻毒。", kind: "丹药", flag: "shop_paidu",
    cond: () => S && S.realm >= 1 },
  { id: "fangcun", name: "方寸戒", price: 900, desc: "内蕴一方小空间的储物法器。行囊上限不再成忧（行囊各 +10）。", kind: "法器", flag: "shop_ring", stones: 2,
    cond: () => S && S.realm >= 2 && S.day >= 15 },
];
/* 药蚀（设定集）：凡品 3~5 ｜ 灵品 8~12 ｜ 玄品 15~25 ｜ 圣品 30+；排毒丹本身含微量药蚀 */
const DRUG_SHI = { medicine: 4, gongfuTea: 4, juqiDan: 10, zhuJidan: 20, paiduDan: 2 };

/* ============ 任务系统见 js/quests.js（天道卷宗） ============ */
/* ============ 文案 ============ */
const TXT = {
  opening:[
    { t:"sys", s:"【万象轮盘已激活。】" },
    { t:"sys", s:"【开局赠礼：万象点 ×100（仅此一次，用完即止）。】" },
    { t:"sys", s:"【检测到宿主命格：天绝之命（原注定冻死于今夜）。】" },
    { t:"sys", s:"【检测到未知因果介入……命格已改写。】" },
    { t:"dim", s:"你睁开眼时，正躺在青石城南的破庙里。高烧三天，浑身滚烫，怀里揣着半个冻硬的黑馍。" },
    { t:"dim", s:"庙外有狼嚎。庙里有七个同样衣衫褴褛的乞丐，分食最后一点烤火余温——你是其中之一，排行最末，他们叫你「阿七」。" },
    { t:"sys", s:"【凡品任务已发布：活过这个冬天。奖励：万象点 ×20。】" },
  ],
  winters:["大雪","阴晦","风雪","晴冷","冻雨"],
};

/* ============ 灵根五行（设定集第二章） ============
   先天五行亲和总和恒为 100；mult 为功法修炼速度乘区。
   杂灵根真相：法力上限 +20%、回蓝 ×1.5、五行不克（前期慢是在打五份地基）。
   变异灵根：独立亲和轨道 + 天生特性白送被动。 */
const LINGGENS = {
  za:     { name: "杂灵根", mult: 0.9, desc: "五行均分，各亲和 20。前期慢——你在打五份地基。", bonus: "法力上限 +20%，回蓝 ×1.5，没有任何一系能克制你" },
  san:    { name: "三灵根", mult: 1.0, desc: "三系分百。常见，外门标准。" },
  shuang: { name: "双灵根", mult: 1.3, desc: "两系分百。百里挑一，内门苗子。" },
  tian:   { name: "天灵根", mult: 1.7, desc: "单行亲和近乎圆满。万中无一，真传之资。" },
  lei:    { name: "雷灵根", mult: 1.4, variant: true, el: "jin", desc: "变异：穿透——无视三成抗性，攻伐 +15%。", mods: { dmgP: 15 } },
  jian:   { name: "剑灵根", mult: 1.4, variant: true, el: "jin", desc: "变异：锋锐——攻伐威力 +20%，万物可为剑。", mods: { dmgP: 20 } },
  bing:   { name: "冰灵根", mult: 1.4, variant: true, el: "shui", desc: "变异：寒意蚀体，攻伐 +10%。", mods: { dmgP: 10 } },
  feng:   { name: "风灵根", mult: 1.4, variant: true, el: "mu", desc: "变异：极速——身法 +30%，来去无形。", mods: { escapeP: 30 } },
  du:     { name: "毒灵根", mult: 1.4, variant: true, el: "mu", desc: "变异：百毒不侵，气血恢复 +20%。", mods: { hpRegenP: 20 } },
  ying:   { name: "影灵根", mult: 1.4, variant: true, el: "shui", desc: "变异：敛息潜行，逃脱 +20%，天生战力伪装。", mods: { escapeP: 20 } },
};
const LINGGEN_VARIANTS = ["lei", "jian", "bing", "feng", "du", "ying"];
/* 资质天梯：首世阿七固定杂灵根（设定原文）；再世按稀有度重 roll */
function rollLinggen(first) {
  if (first) return "za";
  const r = Math.random() * 100;
  if (r < 55) return "za";
  if (r < 79) return "san";
  if (r < 90) return "shuang";
  if (r < 97) return "tian";
  return LINGGEN_VARIANTS[Math.floor(Math.random() * LINGGEN_VARIANTS.length)];
}

/* ============ 系统等级（设定集第三章） ============
   升级门槛 = 累计抽卡（跨世累计）+ 宿主修为；升级不清空任何保底与词条。 */
const SYS_LV = [
  { lv: 1,  pulls: 0,   realm: 0, note: "基础抽卡、任务、面板" },
  { lv: 2,  pulls: 10,  realm: 0, note: "卡池预览：每月公布卡池倾向" },
  { lv: 3,  pulls: 30,  realm: 0, note: "概率提升；解锁「以石易点」" },
  { lv: 4,  pulls: 60,  realm: 0, note: "十抽保底升级：必出紫品以上" },
  { lv: 5,  pulls: 100, realm: 6, note: "概率提升（需脱去凡胎：开元境）" },
  { lv: 6,  pulls: 150, realm: 0, note: "百抽保底升级：必出金品以上" },
  { lv: 7,  pulls: 220, realm: 7, note: "概率提升（需踏入玄阶——此界难至）" },
  { lv: 8,  pulls: 300, realm: 0, note: "千抽保底：必出红品" },
  { lv: 9,  pulls: 400, realm: 7, note: "概率提升（此界难至）" },
  { lv: 10, pulls: 520, realm: 0, note: "满级：千抽大保底缩短为五百抽" },
];
/* 概率表（灰/白/青/紫/金/红）——偶数级沿用前一奇数级 */
const SYS_PROB = {
  1: [68, 25, 5, 1.5, 0.49, 0.01],
  3: [50, 32, 10, 5, 2.9, 0.1],
  5: [30, 35, 20, 10, 4.8, 0.2],
  7: [15, 30, 30, 15, 9.7, 0.3],
  9: [5, 20, 35, 25, 14.5, 0.5],
  10: [0, 15, 34, 30, 20, 1],
};
/* 卡池预览：每月（每世）卡池倾向主题与命中关键词 */
const POOL_THEMES = [
  { name: "刀剑", kw: ["剑", "鞭", "武德", "破防"] },
  { name: "身法", kw: ["脚快", "退", "逃", "摸鱼"] },
  { name: "丹道", kw: ["辟谷", "铁胃", "干饭", "滑肠"] },
  { name: "悟性", kw: ["灵光", "错题", "研究", "卷王"] },
  { name: "气运", kw: ["吉星", "气运", "非酋", "冤种"] },
];
/* 剥离词条价格（万象点）：凡10 良50 灵200 玄800 圣3000，仙品——不建议 */
const STRIP_COST = [10, 50, 200, 800, 3000, null];

/* ============ 五行亲和（设定集第二章·亲和的实务规则） ============
   该行技能威力 = 1 + 亲和×0.005（100 → ×1.5 封顶）；该行抗性 = 亲和×0.003（封顶 +30%）；
   亲和 <10 强行修炼该行 → 效率 ×0.5；先天总和恒 100，后天可破百；单行上限 100。 */
const WX_ELS = ["jin", "mu", "shui", "huo", "tu"];
const WX_NAMES = { jin: "金", mu: "木", shui: "水", huo: "火", tu: "土" };
/* 生克：金克木、木克土、土克水、水克火、火克金 */
const WX_KE = { jin: "mu", mu: "tu", tu: "shui", shui: "huo", huo: "jin" };
/* 功法五行：亲和决定该行功法修炼速度；乱拳是凡俗野路子，无行 */
const TECH_EL = { 锻骨拳谱: "jin", 引气诀: "shui" };
/* 敌方五行（按名取，默认土行） */
const ENEMY_EL = {
  "林中的冬狼": "shui", "野狗": "tu", "饿疯的野狗": "tu",
  "劫道山贼": "jin", "青岩外门教习": "jin", "陆沉": "jin", "听雨楼刺客": "shui",
};
/* 先天亲和分配：杂灵根五行各 20；三灵根 40/30/30；双灵根 60/40；天灵根单行 90；
   变异灵根 = 三系分百 + 独立变异轨道（战斗属性见 LINGGENS[].el） */
function genWx(key) {
  const wx = { jin: 0, mu: 0, shui: 0, huo: 0, tu: 0 };
  const shuffled = WX_ELS.slice().sort(() => Math.random() - 0.5);
  if (key === "za") { WX_ELS.forEach(e => wx[e] = 20); return wx; }
  if (key === "tian") { wx[shuffled[0]] = 90; shuffled.slice(1).forEach(e => wx[e] = 2.5); return wx; }
  if (key === "shuang") { wx[shuffled[0]] = 60; wx[shuffled[1]] = 40; return wx; }
  const v = LINGGENS[key]; // 变异灵根：异变轨道亲和必为本行最高（60），余下两行各 20
  if (v && v.el) { const rest = shuffled.filter(e => e !== v.el); wx[v.el] = 60; wx[rest[0]] = 20; wx[rest[1]] = 20; return wx; }
  wx[shuffled[0]] = 40; wx[shuffled[1]] = 30; wx[shuffled[2]] = 30; // san
  return wx;
}
