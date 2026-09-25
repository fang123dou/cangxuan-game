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
    { id:"dandan", name:"胆子肥嘟嘟",  eff:"胆气与威慑抗性：承伤减免 +8%；作死倾向 +20%（剧情表现）", mod:{defP:8} },
    { id:"buzao",  name:"我去，不早说", eff:"踩坑后习得速度翻倍——错题本体质", mod:{trainP:6} },
    { id:"langlang",name:"浪浪山小妖怪", eff:"扮小人物毫无破绽，大能不屑看你；功劳易被抢", mod:{escapeP:6} },
    { id:"yemao",  name:"夜猫眼",      eff:"夜视守静：黑暗里你的耳朵比刀快，逃脱 +4%", mod:{escapeP:4} },
    { id:"jiejin", name:"勒紧裤腰带",  eff:"挨饿的本事刻进骨头：饥饿累积 -8%", mod:{hungerR:0.92} },
    { id:"dongchuang",name:"冻疮疤",   eff:"冻出来的老茧：体质提升 2%，风雪夜不再那么要命", mod:{conP:2} },
    { id:"xiaoqi", name:"小气得福",    eff:"一个铜板掰两半花：利润与工钱 +4%", mod:{moneyP:4} },
    { id:"feiqiu", name:"非酋",        eff:"【负面】气运 -1；保底计数速度 +25%", mod:{luckFlat:-1, pityR:25}, bad:true },
    { id:"dayuan", name:"大冤种",      eff:"【负面】易被坑骗：单次破财 ≥10 文即记账，三日内必有补偿机缘（铜钱 +8~23）", mod:{}, bad:true, special:"yuanchang" },
    { id:"huachang",name:"滑肠之体",   eff:"【负面】吃不洁食物必腹泻；但药蚀累积减半", mod:{conP:-2}, bad:true, special:"huachang" },
    { id:"shouwen", name:"手稳",       eff:"手上功夫扎实：敏捷提升 2%，修炼 +4%", mod:{agiP:2, trainP:4} },
    { id:"kangzao", name:"抗造",       eff:"皮实耐揍：体质提升 2%，承伤 +2%", mod:{conP:2, defP:2} },
    { id:"jizhi",   name:"急智",       eff:"脑子转得快：智力提升 2%，逃脱 +3%", mod:{intP:2, escapeP:3} },
  ],
  /* ---- 良品（白） ---- */
  [
    { id:"tongpi", name:"铜皮铁骨",    eff:"体魄提升 10%", mod:{conP:10}, fuse:"jinji" },
    { id:"ganfan", name:"干饭人",      eff:"吃饱后两时辰力量 +5%，热饭滋养体质；饭量 ×1.5，饿得更快", mod:{strP:2, foodP:25, hungerR:1.45} },
    { id:"tiewei", name:"铁胃",        eff:"免疫食源性腹泻，毒抗 +20%（瘴毒判定 +20）", mod:{conP:2,poiRes:20}, special:"tiewei" },
    { id:"hajimi", name:"哈基米",      eff:"善缘 +5%；遇恶犬拦路它对你摇尾臣服（任何天气皆可触发，坏天气更频）——可收为同伴（瘦狗缘分 +30、道心 +2）", mod:{socialP:5}, special:"hajimi" },
    { id:"aini",   name:"爱你老己",    eff:"独处恢复 +30%，心魔抗性 +20%（心魔劫判定 +10）", mod:{hpRegenP:30}, special:"aini" },
    { id:"jingyi", name:"敬自己一杯",  eff:"死里逃生后饮一杯，气运临时 +1（三日）", mod:{}, special:"jingyi" },
    { id:"wude",   name:"不讲武德",    eff:"攻伐 +8%；出手不讲章法：战斗首回合伤害 +30%（偷袭抢先手）", mod:{dmgP:8}, special:"wude" },
    { id:"wubian", name:"闪电五连鞭",  eff:"攻伐 +10%、敏捷 +3%；普攻 40% 概率化作【五连鞭】（出鞭之合敌方无法反击）：五鞭各打 35% 攻击力、逐鞭独立命中（单鞭命中 55%+双方敏捷差×6%，介于 25%~95%）——全中即 175% 总伤，敏高鞭鞭到肉，敏低五鞭全空", mod:{dmgP:10, agiP:3}, special:"wubian" },
    { id:"qingxu", name:"情绪价值",    eff:"善缘积累 +20%", mod:{socialP:20} },
    { id:"xianyan",name:"显眼包",      eff:"善缘 +10%；结缘类遭遇权重 ×1.5（贵人更容易注意到你）；仇家寻上门概率 6%→10%——存在感是双刃剑", mod:{socialP:10}, special:"xianyan" },
    { id:"meikong",name:"真没空陪你闹了", eff:"脱离无意义缠斗成功率 +30%", mod:{escapeP:30} },
    { id:"tangzhe",name:"全职研究如何躺着收租", eff:"破境走火入魔率 25%→5%；破境失败保留修为 +20%；破境成功后三日内修炼收益减半（出关动力 -50%）", mod:{}, special:"tangzhe" },
    { id:"shenxing",name:"神行",       eff:"日行百里不喘：敏捷提升 8%，逃脱 +8%", mod:{agiP:8, escapeP:8} },
    { id:"zhangfang",name:"账房先生",  eff:"算盘一响，黄金万两：利润与工钱 +10%", mod:{moneyP:10} },
    { id:"ercong", name:"耳聪目明",    eff:"六识敏锐：智力提升 6%，守夜察觉先人一步", mod:{intP:6, escapeP:4} },
    { id:"yijing", name:"半卷医经",    eff:"自救救人两相宜：气血恢复 +15%", mod:{hpRegenP:15} },
    { id:"huaibi", name:"怀璧其罪",    eff:"【负面】身怀重宝必被觊觎：灵石过夜可能招贼；睡不踏实，逃脱警觉 +10%", mod:{escapeP:10}, bad:true, special:"huaibi" },
    { id:"mensheng",name:"闷声发财",   eff:"不显山不露水：利润与工钱 +8%，逃脱 +4%", mod:{moneyP:8, escapeP:4} },
    { id:"jiaodi", name:"脚底抹油",    eff:"说溜就溜：逃脱 +12%，敏捷 +4%", mod:{escapeP:12, agiP:4} },
  ],
  /* ---- 灵品（青） ---- */
  [
    { id:"jixing", name:"吉星高照",    eff:"气运 +1；吉星垂照：每日 5% 天降小机缘（铜钱 +5~15 ／ 修为 +3 ／ 随机缘分 +3）", mod:{luckFlat:1}, special:"jixing" },
    { id:"shuishen",name:"睡神附体",   eff:"睡眠恢复 ×2，打坐吐纳 +20%；眠中自警：夜间寒气/暑热/病痛之苦 -30%", mod:{hpRegenP:100, trainP:20}, special:"shuishen" },
    { id:"jiujian",name:"酒剑仙",      eff:"出手总带三分醉意：攻伐 +6%；饮烈酒后两时辰内战力 +15%——次日宿醉，智力减半", mod:{dmgP:6}, special:"jiujian" },
    { id:"bigu",   name:"早产辟谷",    eff:"凡阶即可辟谷，饭钱全省；永久失去食补渠道", mod:{}, special:"bigu" },
    { id:"yanpai", name:"我要验牌",    eff:"每三日强制重检天道判定：验对（智力相关）万象点 +5，验错道心 -1", mod:{}, special:"yanpai" },
    { id:"xiexiu", name:"邪修",        eff:"旁门左道，进境邪快：吐纳修炼 +18%；做成一笔时甜也 ×1.5（三只手得手 +50%）", mod:{trainP:18} },
    { id:"laicai", name:"来财",        eff:"财运大涨：经商利润与工钱 +12%；露富招贼（身携 300 文以上，每夜 4% 被摸走 5%）", mod:{moneyP:12}, special:"laicai" },
    { id:"ruhe",   name:"如何呢又能怎", eff:"嘲讽、乱心、心魔类侵扰效果 -50%（心魔增速减半）；心魔劫中多一法「笑」", mod:{}, special:"mindshield" },
    { id:"pofang", name:"破防了",      eff:"话术暴击：开战时戳中痛处，对方战力 -8%；善缘 +8%、攻伐 +3%；结怨深两成（结仇速度 +20%）", mod:{socialP:8, dmgP:3}, special:"pofang" },
    { id:"moyu",   name:"摸鱼圣手",    eff:"多线修炼惩罚减半：兼修多门时各门所得 ÷n 变 ÷√n（单修不受影响）；修炼 +10%", mod:{trainP:10}, special:"moyu" },
    { id:"juanwang",name:"卷王",       eff:"修炼速度 +20%，睡眠需求增加", mod:{trainP:20, hpRegenP:-15} },
    { id:"niuma",  name:"先天牛马圣体", eff:"体力恢复 ×2，工钱 +10%；劳作磨炼收益 +50%（砍柴之力与柴薪 ×1.5）；贵人见你就想使唤你（GM 剧情呈现）", mod:{staRegen:2, moneyP:10}, special:"niuma" },
    { id:"yaoyao", name:"遥遥领先",    eff:"欺诈：战力对外显示虚高 30%——挑战者络绎不绝", mod:{}, special:"yaoyao" },
    { id:"chulei", name:"触类旁通",    eff:"一通百通：全系熟练度获取 +18%", mod:{trainP:18} },
    { id:"jucai",  name:"小聚财库",    eff:"财源广进：经商利润与工钱 +15%；露富更招贼（身携 300 文以上，每夜 6% 被摸走 5%）", mod:{moneyP:15}, special:"jucai" },
    { id:"renyuan",name:"人缘广结",    eff:"善缘积累 +25%，陌生人看你顺眼（GM 剧情呈现）", mod:{socialP:25} },
    { id:"mengwu", name:"梦中悟道",    eff:"睡眠恢复 +20%，修炼 +10%；气运 6 以上者偶有预警之梦（每夜 4%：次日气运临时 +1）", mod:{hpRegenP:20, trainP:10}, special:"mengwu" },
    { id:"meishen",name:"霉神附体",    eff:"【负面】霉运缠身，身边人跟着倒霉：气运 -1；保底计数 +25%——坏卡用好了，是把不见血的刀", mod:{luckFlat:-1, pityR:25}, bad:true, special:"meishen" },
    { id:"guomu",  name:"过目不忘",    eff:"见过的招式与丹方过目不忘：修炼 +15%，智力 +4%", mod:{trainP:15, intP:4} },
    { id:"liugan", name:"六感灵通",    eff:"六识过人：智力 +4%，逃脱 +10%", mod:{intP:4, escapeP:10} },
  ],
  /* ---- 玄品（紫） ---- */
  [
    { id:"fengxiong",name:"逢凶化吉",  eff:"质变：必死之局总有一线生机（致死判定 50% 概率生还）", mod:{}, special:"cheatdeath" },
    { id:"meihuo",  name:"天生魅魔",   eff:"对异性 NPC 生效：初遇好感 +40、善缘获取 ×1.4、魅力判定大幅加成；对同性仅平常；情怨结仇 ×2（GM 剧情呈现）——魅力是债", mod:{socialP:35}, special:"meihuo" },
    { id:"zhenxiang",name:"真香定律",  eff:"修炼 +8%、利润工钱 +8%；每月末（30 日）必然当众真香一次：气运临时 +1（三日）、道心 -1——真香，是真律", mod:{trainP:8, moneyP:8}, special:"zhenxiang" },
    { id:"laosou",  name:"老叟戏顽童", eff:"攻伐 +12%；碾压局（战力 ≥2 倍）承伤减半；每戏耍 5 名弱者，引一名真正的强者寻上门（对方战力 +15%）", mod:{dmgP:12}, special:"laosou" },
    { id:"leiyi",   name:"一缕雷意",   eff:"金行亲和 +10，全属性 +4%——雷为金之异，完整变异灵根的一点火星", mod:{allP:4} },
    { id:"tiansha", name:"天煞孤星",   eff:"【负面】亲近之人易遭横祸（GM 剧情呈现）：善缘 -20%；孤星照命，独处以恒——修炼 +10%", mod:{socialP:-20, trainP:10}, bad:true },
    { id:"xinxi",  name:"心血来潮",    eff:"规则：睡着也生效——刀落下前会把你叫醒（致死袭击 30% 概率预感避开）", mod:{}, special:"xinxi" },
    { id:"baidu",  name:"百毒不侵",    eff:"毒吃多了不死，也是条路：免疫食源性腹泻与瘴毒，体质 +8%", mod:{conP:8}, special:"baidu" },
    { id:"shafa",  name:"杀伐果断",    eff:"攻伐 +30%——犹豫是留给活人的", mod:{dmgP:30} },
    { id:"cangfeng",name:"藏锋",       eff:"锋藏于鞘，出则必杀：攻伐 +15%，承伤 +5%", mod:{dmgP:15, defP:5} },
  ],
  /* ---- 圣品（金） ---- */
  [
    { id:"qiyunzi",name:"气运之子",    eff:"气运 +2；走路捡钱（每日 10%，铜钱 +3~15）；高运压场：敌方气运视为 -5，暴击更难成——强敌也会降智", mod:{luckFlat:2}, special:"lucky" },
    { id:"zhupo",   name:"助我破鼎",   eff:"破境成功率 +15%；突破失败道基不损", mod:{}, special:"ding" },
    { id:"daoxinzhu",name:"磐石道心",  eff:"道心恒稳：心魔增速 -30%，破境心境判定大幅加成；体质 +8%、智力 +8%", mod:{conP:8, intP:8}, special:"daoxin" },
    { id:"chouqin",name:"天道酬勤",    eff:"大道级勤勉：修炼速度 +60%——天道不亏待人", mod:{trainP:60} },
    { id:"wuwo",   name:"刀剑无我",    eff:"攻伐 +60%，防御 -10%——眼里只有进手，没有退路", mod:{dmgP:60, defP:-10} },
    { id:"wanfa",  name:"万法归一",    eff:"触类旁通至极境：全属性 +8%，修炼 +20%", mod:{allP:8, trainP:20} },
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

/* ============ 随机身份（再世 · 设定集 15.5 开局表，四档：吉/平/劣/狱） ============ */
const IDENTITIES = [
  /* ---- 吉档 ---- */
  { grade:"吉", name:"小家族庶子",   desc:"有饭吃有书读，嫡母的猜忌比寒冬更长。", mods:{int:1}, money:400, note:"「灯下苦学」修炼效率 +5%、智力 +2%", place:"东荒 · 云州 · 青石城 · 内城宅院" },
  { grade:"吉", name:"宗门记名弟子", desc:"月例三块灵石，外门倾轧月比淘汰。", mods:{con:1}, money:120, note:"「早课不辍」修炼效率 +5%", place:"东荒 · 云州 · 青石城 · 青岩山脚" },
  { grade:"吉", name:"药王谷药童",   desc:"识药辨草的童子，月有薄俸。", mods:{int:1,con:0}, money:300, note:"「药圃岁月」药蚀累积 -15%（药性亲和）", place:"中州 · 药王谷 · 外门药圃" },
  { grade:"吉", name:"商队少东",     desc:"拨算盘的手比握剑稳，沙盗的眼睛盯着货。", mods:{int:1,luck:0}, money:800, note:"「算盘精」工钱利钱 +5%", place:"东荒 · 云州 · 青石城 · 福源商会货栈" },
  { grade:"吉", name:"将门遗孤",     desc:"军营里长大的骨头，仇家环伺。", mods:{con:1,str:1}, money:200, note:"「军营长大的骨头」体质 +3%", place:"东荒 · 云州 · 青石城 · 城郊军营" },
  /* ---- 平档 ---- */
  { grade:"平", name:"市井孩童",     desc:"跑街串巷，帮派的保护费比年关难过。", mods:{agi:1}, money:60, note:"「跑街」敏捷 +2%", place:"东荒 · 云州 · 青石城 · 市井" },
  { grade:"平", name:"猎户遗孤",     desc:"山里的鼻子，冬荒夺田的族亲。", mods:{agi:1,con:0}, money:80, note:"「山里的鼻子」野外生存：逃脱 +5%、饿得慢 5%", place:"东荒 · 云州 · 青石城 · 城外猎户村" },
  { grade:"平", name:"私塾伴读",     desc:"旁听生，主仆名分随时被逐。", mods:{int:1}, money:40, note:"「旁听生」悟性过人：修炼效率 +5%", place:"东荒 · 云州 · 青石城 · 私塾" },
  { grade:"平", name:"渔民之子",     desc:"海税、风暴、渔霸，一样比浪凶。", mods:{con:1}, money:50, note:"「浪里白条」水性：敏捷 +2%、逃脱 +5%", place:"东荒 · 云州 · 临河镇 · 临河渔村" },
  { grade:"平", name:"铁匠学徒",     desc:"酗酒的师父，催命的军械订单。", mods:{str:1}, money:70, note:"「千锤百炼」锤出来的筋骨：力量 +2%", place:"东荒 · 云州 · 青石城 · 铁匠铺" },
  /* ---- 劣档 ---- */
  { grade:"劣", name:"奴籍",         desc:"契书在身，赎身天价。", mods:{agi:1}, money:0, note:"「忍字诀」忍气吞声、抽身得快：逃脱 +8%", place:"东荒 · 云州 · 青石城 · 某府柴房" },
  { grade:"劣", name:"疫村遗孤",     desc:"人人避你如瘟神；你的血对某种毒免疫。", mods:{con:-1,luck:0}, money:10, note:"「病骨」毒抗 +10%（瘴毒判定 +10）、体质 -3%", place:"东荒 · 云州 · 白蒿镇 · 隔离废村" },
  { grade:"劣", name:"弃婴·寺中长大", desc:"寺贫，武僧的拳头比经文硬。", mods:{int:1}, money:0, note:"「佛性」心魔累积 -15%", place:"东荒 · 云州 · 落鸦镇 · 山寺" },
  { grade:"劣", name:"矿奴",         desc:"地底肺，黑暗中的感知异于常人。", mods:{con:1,int:0}, money:0, note:"「地底肺」黑暗里耳朵比眼睛快：逃脱 +5%", place:"东荒 · 云州 · 铁山镇 · 黑矿窑" },
  { grade:"劣", name:"死囚之子",     desc:"烙印贱籍，见惯生死。", mods:{luck:-1,con:1}, money:0, note:"「见惯生死」心魔累积 -10%", place:"东荒 · 云州 · 青石城 · 城墙根" },
  /* ---- 狱档 ---- */
  { grade:"狱", name:"死囚",         desc:"开局在牢里，秋后问斩，只剩百日。", mods:{con:1}, money:0, note:"「向死而生·伪」濒死战力 +15%（仅此一条，非词条）", place:"东荒 · 云州 · 青石城 · 死囚牢" },
  { grade:"狱", name:"祭品",         desc:"山村十年一祭，你是今年的「山神新娘/新郎」。", mods:{luck:-1}, money:0, note:"「祭品的镇定」疼痛忍耐：承伤减免 +5%", place:"东荒 · 云州 · 山阴村 · 荒祠祭坛" },
  { grade:"狱", name:"炉鼎苗子",     desc:"被合欢宗外使挑中，已在押送路上。", mods:{agi:1}, money:0, note:"「锁情印」情怨不扰心：心魔累积 -10%", place:"东荒 · 云州 · 落马驿 · 押送官道" },
  { grade:"狱", name:"渊口守夜人",   desc:"北地界壁裂缝戍卒，上一任疯了。", mods:{con:1}, money:0, note:"「听过渊声」气运 +1、心魔累积 +10%（灵感与疯狂，一线之隔）", place:"北地 · 渊口戍堡" },
];
/* 身份特性落地表：note 里写的每一句都在这里兑现为数值（computeMods 注入 S.mods；拒绝纯文案空转）。
   抗性五件：coldRes 冻寒（雪夜判定 +n）｜heatRes 暑热（酷热判定 +n）｜poiRes 瘴毒（瘴夜判定 +n）｜xinmoRes 心魔累积减免%｜yaoRes 药蚀累积减免% */
const NOTE_FX = {
  "小家族庶子": { trainP: 5, intP: 2 },
  "宗门记名弟子": { trainP: 5 },
  "药王谷药童": { yaoRes: 15 },
  "商队少东": { moneyP: 5 },
  "将门遗孤": { conP: 3 },
  "市井孩童": { agiP: 2 },
  "猎户遗孤": { escapeP: 5, hungerR: 0.95 },
  "私塾伴读": { trainP: 5 },
  "渔民之子": { agiP: 2, escapeP: 5 },
  "铁匠学徒": { strP: 2 },
  "奴籍": { escapeP: 8 },
  "疫村遗孤": { poiRes: 10, conP: -3 },
  "弃婴·寺中长大": { xinmoRes: 15 },
  "矿奴": { escapeP: 5 },
  "死囚之子": { xinmoRes: 10 },
  "祭品": { defP: 5 },
  "炉鼎苗子": { xinmoRes: 10 },
  "渊口守夜人": { luckFlat: 1, xinmoRes: -10 },
  "烽堡病卒": { coldRes: 10 },
  "雪原弃工": { coldRes: 10 },
  "药圃病役": { yaoRes: 15 },
  "帝畿欠账人": { moneyP: 10 },
  "沙海弃儿": { heatRes: 10 },
  "瘴林逃难人": { poiRes: 10 },
};

/* ============ 地域风物（五域四海 · 设定集第五、六章。开局惨境、存活任务、天气、物价、AI 提示皆按此生成） ============
   再世身份掷在何处，开局就是何处的濒死之局：名随地域，型不变（铁律一：际遇同型——惨境濒死）。 */
const REGIONS = {
  yunzhou: { key:"yunzhou", name:"东荒 · 云州", match: p => /云州|青石城|临河镇|白蒿镇|落鸦镇|铁山镇|山阴村|落马驿|青岩/.test(p),
    surviveName: "凡品任务：活过这个冬天",
    surviveDesc: "灵气潮汐涨潮之初，大雪封城。先活下来——热食、炭火、修为，都是命。",
    weatherW: ["大雪", "阴晦", "风雪", "晴冷", "冻雨"], weatherS: ["晴", "阴", "细雨", "微风", "扬沙"],
    badWx: ["大雪", "风雪", "冻雨"],
    foodMult: 1, foodNote: "",
    aiHint: "本地为东荒云州一带（青石城及周边市镇）：寒冬大雪，物价按第七章锚定（黑馍2文、热汤面5文、棉袄300文）。本地名录：回春堂（周先生坐堂）、福源商会分号（钱三）、茶棚（雪夜寡妇）、城隍庙（瞎眼老者）、码头（蛮牛）、青岩门（测灵碑三关招录外门）。",
    sect: { name: "青岩门", npc: "青岩门外门弟子陆沉" },
    openings: [] /* 首世与云州再世沿用 OPENINGS 五惨境 */ },
  beiyuan: { key:"beiyuan", name:"北原", match: p => /北地|北原|渊口/.test(p),
    surviveName: "凡品任务：熬过极夜",
    surviveDesc: "北原的冬没有尽头的白夜与冻风，戍堡的柴比肉贵。先活下来——火、皮裘、不冻掉的手指，都是命。",
    weatherW: ["冻风", "暴雪", "白夜晴", "冰雾", "细雪"], weatherS: ["白夜晴", "融冰", "冻风", "晴冷", "雪线雨"],
    badWx: ["冻风", "暴雪", "冰雾"],
    foodMult: 1.5, foodNote: "北原苦寒，粮肉比云州贵五成",
    aiHint: "本地为北原（永夜冰原，设定集第五章）：蛮族图腾修士的国度，崇拜强者，实力就是规矩；极夜漫长、冻风割面，粮肉昂贵（商铺食物价 ×1.5），柴薪比肉金贵；戍卒、图腾祭司、雪盗与冰下遗迹是本地常客；渊口界壁裂缝在北地深处，渊兽虽不得出场，裂缝的『渊声』可作风闻与幻觉素材。",
    sect: { name: "灰狼图腾殿", npc: "灰狼部见习勇士乌勒" },
    openings: [
      { id: "rb_shubao", place: "北地 · 渊口戍堡 · 烽堡暗哨", title: "极 夜 烽 堡",
        lines: [
          "你在戍堡最底层的暗哨里醒来——高烧三天，浑身滚烫，怀里揣着半块冻硬的肉干。堡外是北原没有尽头的白夜，冻风卷着雪粒子，敲打得铁皮烽楼吱呀作响。",
          (n) => `同哨的老戍卒把皮裘往你这边推了半寸：「${n}，撑住。在北原，病死和冻死是同一栏账——堡里只记『没了』。」`,
        ], quest: "熬过极夜，别上『没了』的名册",
        iden: { grade: "狱", name: "烽堡病卒", desc: "渊口戍堡最底层的暗哨病卒，高烧三日，名册上离『没了』只差一笔。", note: "「烽堡病卒」极夜冻风判定 +10%", place: "北地 · 渊口戍堡 · 烽堡暗哨" } },
      { id: "rb_bingdao", place: "北地 · 冰原商道", title: "雪 原 弃 货",
        lines: [
          "你在冰原商道旁的废帐篷里醒来——商队昨夜卷货跑了，把你这个烧得不省人事的雇工丢在了雪原上。高烧三天，浑身滚烫，帐篷外连狼嚎都被冻住了。",
          (n) => `雪里插着半截商队的木牌，指向最近的戍堡——三百里。你摸了摸怀里：半块冻肉，一把豁口小刀。${n}，走，或者死在这里。`,
        ], quest: "在被冻死之前走到有人烟的地方",
        iden: { grade: "狱", name: "雪原弃工", desc: "被商队丢在冰原上的病雇工，高烧三日，离最近的戍堡三百里。", note: "「雪原弃工」冻寒抗性 +10%", place: "北地 · 冰原商道" } },
    ] },
  zhongzhou: { key:"zhongzhou", name:"中州", match: p => /中州|药王谷/.test(p),
    surviveName: "凡品任务：在大城活下去",
    surviveDesc: "中州居不易：房租、药钱、人情，样样吃人。先活下来——月钱、门路、不惹上惹不起的人，都是命。",
    weatherW: ["阴雪", "细雪", "干冷", "雾霾", "晴冷"], weatherS: ["晴", "微风", "细雨", "扬沙", "阴"],
    badWx: ["阴雪", "细雪", "雾霾"],
    foodMult: 1.3, foodNote: "中州大城，米粮比云州贵三成",
    aiHint: "本地为中州（天下中心，设定集第五、六章）：四大皇朝并立，龙脉汇聚，天骄最多、杀戮也最多；大城居不易（商铺食物价 ×1.3），房租牙行、皇朝差役、宗门执事都是惹不起的地头蛇；药王谷一系以丹道立世，药童试药、丹房火候、药圃规矩是本地特色剧情素材；十大上宗与皇朝的传闻在此最盛。",
    sect: { name: "落霞剑宗", npc: "落霞剑宗外门弟子沈青梧" },
    openings: [
      { id: "rb_yaopu", place: "中州 · 药王谷 · 外门药圃", title: "药 圃 寒 夜",
        lines: [
          "你在药圃角落的柴房里醒来——高烧三天，浑身滚烫，怀里揣着半个冷透的药膳饼。谷中规矩：病过三日未起的杂役，除名出谷，任尔自生自灭。",
          (n) => `同屋的老药童把一碗尚温的药汤塞进你手里：「${n}，快喝。明日管事来点卯——你烧退不退，决定你是『药童』还是『药渣』。」`,
        ], quest: "退烧，别被点卯除名",
        iden: { grade: "狱", name: "药圃病役", desc: "药王谷外门药圃的病杂役，高烧三日，再不退烧就要被除名出谷。", note: "「药圃病役」药性亲和 +10%", place: "中州 · 药王谷 · 外门药圃" } },
      { id: "rb_dacheng", place: "中州 · 皇朝大城 · 城南脚店", title: "帝 畿 雪 巷",
        lines: [
          "你在城南脚店的通铺底下醒来——高烧三天，浑身滚烫，怀里揣着仅剩的两枚铜钱。中州大城居不易：今夜交不出铺钱，店保就会把你扔进雪巷。",
          (n) => `脚店老板娘拨着算盘，头也没抬：「${n}，铺钱、药钱、火钱，三笔账。帝都的规矩——穷病可以忍，欠账不行。」`,
        ], quest: "在三笔账到期前挣到活路",
        iden: { grade: "狱", name: "帝畿欠账人", desc: "皇朝大城脚店的通铺病客，高烧三日，三笔账压顶，雪巷在门外等着。", note: "「帝畿欠账人」市井洞察 +10%", place: "中州 · 皇朝大城 · 城南脚店" } },
    ] },
  ximo: { key:"ximo", name:"西漠", match: p => /西漠|沙海/.test(p),
    surviveName: "凡品任务：活过沙暴季",
    surviveDesc: "西漠的暑气白天烙人、夜里闷人，沙暴季说来就来。先活下来——水囊、荫凉、不碰沙盗的刀，都是命。",
    weatherW: ["干冷", "风沙", "晴寒", "沙暴", "霜晨"], weatherS: ["酷热", "热风", "风沙", "晴", "沙暴"],
    badWx: ["风沙", "沙暴"],
    hazard: "heat", /* 酷热地域：酷热/热风/沙暴之夜无水囊且未生火，气血受损并可能中暑 */
    foodMult: 1.8, foodNote: "西漠沙海路遥，食物比云州贵八成",
    aiHint: "本地为西漠（黄沙万里，设定集第五章）：佛国与沙盗并存，地下埋着上古战场——白日酷热、沙暴季频繁（『酷热』『热风』『沙暴』天气下易中暑，备好水囊方可夜行）；粮货远道而来，商铺食物价 ×1.8；绿洲市集物价随行就市，僧人化缘与沙盗收『买路钱』都是常态；上古战场遗迹、佛国石窟、沙盗马队是本地特色剧情素材。",
    sect: { name: "枯泉寺", npc: "枯泉寺沙弥了尘" },
    openings: [
      { id: "rb_shahai", place: "西漠 · 沙海 · 废弃驼队营地", title: "沙 海 残 营",
        lines: [
          "你在半埋的驼队帐篷里醒来——高烧三天，浑身滚烫，水囊里只剩一口浑水。昨夜沙暴卷走了半支商队，活下来的驼工抛下你，带着最后一峰骆驼走了。",
          (n) => `沙里露出半截佛国的石刻经幢——往西三十里据说有座小寺。${n}，最后一口水，喝掉它，然后走。`,
        ], quest: "在暑气与沙暴收走你之前找到绿洲或人烟",
        iden: { grade: "狱", name: "沙海弃儿", desc: "被驼队丢在沙海残营的病工，高烧三日，水囊见底，沙暴季说来就来。", note: "「沙海弃儿」暑热抗性 +10%", place: "西漠 · 沙海 · 废弃驼队营地" } },
    ] },
  nanling: { key:"nanling", name:"南岭", match: p => /南岭|十万大山/.test(p),
    surviveName: "凡品任务：别成为山里的吃食",
    surviveDesc: "南岭的十万大山，瘴气与妖兽平分地盘。先活下来——驱瘴的草药、夜里的火、避开大妖的鼻子，都是命。",
    weatherW: ["瘴雨", "湿冷", "阴雨", "山雾", "寒晴"], weatherS: ["雷雨", "湿热", "瘴雨", "晴", "山雾"],
    badWx: ["瘴雨", "山雾", "阴雨"],
    hazard: "miasma", /* 瘴气地域：瘴雨/山雾之夜无驱瘴草且未生火，气血受损并可能染瘴病（百毒不侵免疫） */
    foodMult: 1.2, foodNote: "南岭山货贵、净粮贵两成",
    aiHint: "本地为南岭（十万大山，设定集第五、八章）：妖族地盘，人妖杂居，蛮荒而自由——瘴气入夜尤重（『瘴雨』『山雾』天气下易染瘴病）；人族寨子与妖族洞府比邻，寨老、巫医、妖族巡山者都是常见 NPC；山林馈赠丰厚但守山的未必是人；切莫把妖族写成任人宰割的野兽，灵阶以上皆可有算计。",
    sect: { name: "百苗巫寨", npc: "百苗寨巫徒蓝朵" },
    openings: [
      { id: "rb_zhanglin", place: "南岭 · 十万大山 · 瘴林边缘", title: "瘴 林 雪 夜",
        lines: [
          "你在瘴林边缘的破猎棚里醒来——高烧三天，浑身滚烫，怀里揣着半把苦涩的驱瘴草药。山外的世道乱了，寨子烧了，逃难的人一头扎进大山，十去其九。",
          (n) => `棚外的夜色里有不属于人的脚步声，一圈，又一圈——是巡山的鼻子闻到了生人的气味。${n}，火快熄了，添柴，或者喂它。`,
        ], quest: "守住火，别进任何一张嘴",
        iden: { grade: "狱", name: "瘴林逃难人", desc: "寨子烧了以后扎进十万大山的逃难者，高烧三日，半把驱瘴草是全部家当。", note: "「瘴林逃难人」瘴毒抗性 +10%", place: "南岭 · 十万大山 · 瘴林边缘" } },
    ] },
};
function regionOf(place) { // 按出生地匹配地域；无匹配归云州（主角活动核心区）
  for (const k in REGIONS) if (REGIONS[k].match(place || "")) return REGIONS[k];
  return REGIONS.yunzhou;
}

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
  survive30:{ name:"熬过凛冬",   tier:2, desc:"活过这个冬天", reward:"万象点 ×150" },
  qingyan:  { name:"仙门弟子",   tier:2, desc:"拜入青岩门", reward:"自由属性 ×3" },
  death1:   { name:"向死而生",   tier:1, desc:"第一次死亡——死亡是昂贵的，也是公平的", reward:"轮回开启" },
  hidden:   { name:"察觉者",     tier:4, desc:"注意到三次不该存在的「巧合」", reward:"棋盘上多了一双看你的眼睛", secret:true },
  shengsi:  { name:"生死之交",   tier:1, desc:"拥有第一位缘分值 +80 以上的人", reward:"称号「义薄云天」：陌生人初始好感 +10" },
  huagan:   { name:"化干戈",     tier:2, desc:"将一段 -90 以下的死仇化解为正缘", reward:"气运 +1" },
  yuejie:   { name:"越阶而战",   tier:1, desc:"跨越一个小境界取胜（以弱胜强）", reward:"称号「以下克上」：对高于己者伤害 +5%" },
  juejing:  { name:"绝境反杀",   tier:2, desc:"濒死状态下反杀强敌", reward:"称号「向死而生」：濒死时攻伐 +30%" },
  mingbu:   { name:"命不该绝",   tier:1, desc:"濒死生还", reward:"体质 +1" },
  yushi:    { name:"与天争时",   tier:3, desc:"十日之内连破两境，打破当世该境界最快纪录", reward:"称号「赶路人」：修炼速度 +5%" },
  wukui:    { name:"问心无愧",   tier:3, desc:"道心达到 90", reward:"称号「磐石道心」：心魔抗性 +30%" },
  fujia:    { name:"富甲一方",   tier:2, desc:"身家进入一城财富前列（三万文身家）", reward:"称号「财神眷顾」：交易议价 +10%" },
  dabusi:   { name:"打不死的",   tier:1, desc:"身负「霉神附体」满一年而毫发无损", reward:"称号「小强」：环境伤害 -10%" },
  danyun:   { name:"丹动一城",   tier:3, desc:"炼出绝品——九纹圆满，出世引动异象", reward:"气运 +1" },
  renji:    { name:"凡俗之巅",   tier:3, desc:"不入聚气境，纯以凡躯将力/敏/体全部磨到 10", reward:"破境成功率永久 +10%，未来属性上限 +10%，称号「人极」", secret:true },
  /* —— 结局名录（第十一章 · 五结局；终局场景结算，随魂封存，死亡不回收） —— */
  endShoujie: { name:"守界人",     tier:3, desc:"一般结局：斩了吞世者，接过镇守归墟的担子。天还是那个天。", reward:"轮回馈赠：初始万象点 +150" },
  endLuding:  { name:"炉鼎",       tier:3, desc:"坏结局：赢了吞世者，死在天道温柔的「恭喜」里。最坏的结局，离最好只差一步。", reward:"轮回馈赠：伴生残影必得", secret:true },
  endDengxian:{ name:"登仙超脱",   tier:4, desc:"完美结局：识破回炉之局，修补界壁、重开仙路，携所有羁绊跳出棋盘。", reward:"轮回馈赠：初始气运 +2，万象点 +300" },
  endSitian:  { name:"弑天",       tier:4, desc:"特殊结局：先斩吞世者，再反手炼化天道。古往今来，无人做到。", reward:"轮回馈赠：全属性 +2", secret:true },
  endHuantian:{ name:"换天",       tier:4, desc:"特殊结局：打碎棋盘，让此界众生共掌天道——从此没有棋手。", reward:"轮回馈赠：陌生人初始好感 +20" },
  endBeyond:  { name:"界外之路",   tier:4, desc:"隐藏结局：一条连系统都推演不到的路。你来自界外——「界外」意味着什么，它比你更想知道。", reward:"？？？", secret:true },
};

/* ============ 称号（随魂封存，效果永续；面板可佩戴其一示人） ============ */
const TITLES = {
  yibao:    { name: "义薄云天", from: "生死之交", desc: "陌生人初始好感 +10" },
  lunpan:   { name: "轮盘常客", from: "轮盘常客", desc: "轮盘保底计数速度 +5%", mod: { pityR: 5 } },
  renjiT:   { name: "人极",     from: "凡俗之巅", desc: "凡躯极点：破境成功率 +10%，属性上限 +10%" },
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
   方寸戒为储物法器（六十三章·咫尺物）。
   物价锚定第七章：凡俗品铜钱计价；修士货（丹药/功法/法器）一律灵石计价——
   聚气丹 15 下品灵石、1 阶功法玉简 30~100 灵石、下品灵器 50~200 灵石。 */
const SHOP_BASE = [
  { id: "heimu", name: "黑馍", price: 2, desc: "又冷又硬的黑面馍馍，顶饿。", kind: "食物" },
  { id: "hotnoodle", name: "热汤面", price: 5, desc: "一碗下肚，从舌尖暖到脚尖。立食，饱食 +40。", kind: "食物", use: "eat" },
  { id: "shaojiu", name: "烧刀子", price: 8, desc: "烈酒。喝一口，雪夜就不那么冷了。", kind: "食物", use: "drink" },
  { id: "wood", name: "柴薪", price: 6, desc: "一捆干柴。夜里生火御寒，或囤着等雪天涨价。", kind: "日用" },
  { id: "medicine", name: "跌打药", price: 12, desc: "回春堂出品的金疮药。气血 +6。", kind: "药物", use: "heal" },
  { id: "quhanTang", name: "驱寒汤", price: 25, desc: "姜桂浓汤。对症【风寒】立即痊愈；无病暖胃（气血 +2）。", kind: "药物" },
  { id: "huoxiangSan", name: "藿香正气散", price: 25, desc: "解暑化湿。对症【中暑】立即痊愈；无病醒神（气血 +2）。", kind: "药物" },
  { id: "jieduSan", name: "解毒散", price: 60, desc: "以毒攻毒。对症【丹毒侵脉】立即痊愈、药蚀 -10；无病清热解毒（气血 +3、药蚀 -5）。", kind: "药物" },
  { id: "jinchuangYao", name: "金疮药", price: 30, desc: "外伤圣药，比跌打药更猛。气血 +10，重伤之人尤宜。", kind: "药物" },
  { id: "shengjiang", name: "生姜", price: 6, desc: "辛温解表的药草。【风寒】病程 -1 日；无病暖胃（气血 +1）。", kind: "药草" },
  { id: "quzhangcao", name: "驱瘴草", price: 8, desc: "南岭辟瘴药草。【瘴毒侵体】立即痊愈；无病清神（气血 +1）。带着它，瘴雨、山雾之夜瘴毒不侵。", kind: "药草" },
  { id: "gancao", name: "甘草", price: 5, desc: "调和百药的甜草根。气血 +2，药蚀 -2。", kind: "药草" },
  { id: "huobun", name: "火把", price: 3, desc: "松脂火把。夜里赶路、探林深处都用得上。", kind: "日用" },
  { id: "mianao", name: "老棉袄", price: 300, desc: "厚实的老棉袄（第七章锚：棉袄 300 文）。风雪与寒潮夜不再冻伤。", kind: "衣物" },
  { id: "shuinang", name: "水囊", price: 40, desc: "牛皮水囊。西漠酷热、热风、沙暴之夜带着它，可防暑热伤气、免生中暑。", kind: "日用" },
  { id: "chaidao", name: "豁口柴刀", price: 80, desc: "砍柴效率 +1，关键时刻也能当兵器（第七章锚：柴刀 80 文）。", kind: "工具" },
];
const SHOP_UNLOCK = [
  { id: "gongfuTea", name: "凝神香片", price: 18, desc: "茶棚货。泡一盏，打坐吐纳效率倍增一次（修为 +12）。", kind: "丹茶", flag: "shop_tea",
    cond: () => !!(S && (S.npc["雪夜寡妇"] || 0) >= 20) },
  { id: "zhuJidan", name: "筑基丹", price: 0, desc: "南荒奇珍，低阶散修梦寐以求。服之修为大涨（修为 +60）。", kind: "丹药", flag: "shop_zhuji", stones: 20,
    cond: () => S && S.realm >= 2 },
  { id: "juqiDan", name: "聚气丹", price: 0, desc: "低阶丹药，服之助涨修为（修为 +30）。第七章锚：15 下品灵石。", kind: "丹药", flag: "shop_juqi", stones: 15,
    cond: () => S && S.realm >= 1 },
  { id: "yinqi", name: "《引气诀》", price: 0, desc: "一阶功法玉简全卷（第七章锚：30~100 灵石）。无功法者修为寸步难进——这是敲门砖。", kind: "功法", flag: "shop_yinqi", stones: 50,
    cond: () => S && ((S.stats.maxMoney || 0) >= 150 || S.stones >= 10) },
  { id: "paiduDan", name: "排毒丹", price: 0, desc: "排解药蚀（药蚀 -15）。治标不治本——本身也含微量药蚀，以毒攻毒。", kind: "丹药", flag: "shop_paidu", stones: 1,
    cond: () => S && S.realm >= 1 },
  { id: "fangcun", name: "方寸戒", price: 0, desc: "内蕴一方小空间的储物法器。行囊上限不再成忧（行囊各 +10）。", kind: "法器", flag: "shop_ring", stones: 30,
    cond: () => S && S.realm >= 2 && S.day >= 15 },
];
/* 药蚀（设定集）：凡品 3~5 ｜ 灵品 8~12 ｜ 玄品 15~25 ｜ 圣品 30+；排毒丹本身含微量药蚀 */
const DRUG_SHI = { medicine: 4, gongfuTea: 4, juqiDan: 4, zhuJidan: 10, paiduDan: 2, huiLingDan: 10, xisuiDan: 20 }; // 药蚀按品档：聚气丹凡品 3~5、筑基丹灵品 8~12（判定表演算 DRUG.shiByPin）

/* ============ 任务系统见 js/quests.js（天道卷宗） ============ */
/* ============ 文案 ============ */
const TXT = {
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
  jian:   { name: "剑灵根", mult: 1.4, variant: true, el: "jin", desc: "变异：锋锐——攻伐威力 +40%，万物可为剑。", mods: { dmgP: 40 } },
  bing:   { name: "冰灵根", mult: 1.4, variant: true, el: "shui", desc: "变异：寒意蚀体，攻伐 +10%。", mods: { dmgP: 10 } },
  feng:   { name: "风灵根", mult: 1.4, variant: true, el: "mu", desc: "变异：极速——身法 +30%，来去无形。", mods: { escapeP: 30 } },
  du:     { name: "毒灵根", mult: 1.4, variant: true, el: "mu", desc: "变异：百毒不侵，气血恢复 +20%。", mods: { hpRegenP: 20 } },
  ying:   { name: "影灵根", mult: 1.4, variant: true, el: "shui", desc: "变异：敛息潜行，逃脱 +20%，天生战力伪装。", mods: { escapeP: 20 } },
};
const LINGGEN_VARIANTS = ["lei", "jian", "bing", "feng", "du", "ying"];
/* 资质天梯：首世阿七固定杂灵根（设定原文）；再世按稀有度重 roll */
function rollLinggen(first) {
  if (first) return "za";
  const r = Math.random() * 100; // 资质天梯：杂灵根十之七八（70%）、三灵根常见（20%）、双灵根百里挑一（7%）、天灵根万中无一（2%）、变异灵根（1%）
  if (r < 70) return "za";
  if (r < 90) return "san";
  if (r < 97) return "shuang";
  if (r < 99) return "tian";
  return LINGGEN_VARIANTS[Math.floor(Math.random() * LINGGEN_VARIANTS.length)];
}

/* ============ 系统等级（设定集第三章） ============
   升级门槛 = 累计抽卡（跨世累计）+ 宿主修为；升级不清空任何保底与词条。 */
const SYS_LV = [
  { lv: 1,  pulls: 0,   realm: 0,  note: "基础抽卡、任务、面板" },
  { lv: 2,  pulls: 10,  realm: 0,  note: "卡池预览：每月公布卡池倾向" },
  { lv: 3,  pulls: 30,  realm: 0,  note: "概率提升；解锁「以石易点」" },
  { lv: 4,  pulls: 60,  realm: 0,  note: "十抽保底升级：必出紫品以上" },
  { lv: 5,  pulls: 100, realm: 7,  note: "概率提升（需踏入灵阶：灵泉境）" },
  { lv: 6,  pulls: 150, realm: 0,  note: "五十抽保底升级：必出金品以上" },
  { lv: 7,  pulls: 220, realm: 13, note: "概率提升（需踏入玄阶：化神境——此界难至）" },
  { lv: 8,  pulls: 300, realm: 0,  note: "百抽保底：必出红品" },
  { lv: 9,  pulls: 400, realm: 19, note: "概率提升（需踏入圣阶：涅槃境——此界难至）" },
  { lv: 10, pulls: 520, realm: 0,  note: "满级：百抽大保底缩短为五十抽（另需完成一次圣品以上任务——尚未开放）" },
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
/* ============ 功法谱系（设定集第二章 · 功法品级与反哺） ============
   品阶与修炼门槛（设定原文）：0 阶凡俗无门槛 ｜ 1 阶灵品·凡阶后期 ｜ 2 阶玄品·灵阶以上 ｜ 3 阶圣品·玄阶以上 ｜ 4 阶仙品·圣阶以上
   反哺（小成 50% / 圆满 100%）：0 阶 +0.3/+0.7 ｜ 1 阶 +2/+5 ｜ 2 阶 +20/+50 ｜ 3 阶 +100/+250 ｜ 4 阶 +500/+1000
   谱系三源：宗门（五域小宗门各一脉，入册后传功/内门考核授予）、散修（按灵根主行求法）、推演（野路子圆满自衍）。
   3 阶以上此界难至（设定：圣域称尊、仙品不出世）——只作风闻伏笔，不入可获得池。 */
const GONGFU = [
  /* —— 起手无门无派 —— */
  { id: "quanpu", name: "锻骨拳谱", tier: 0, tierName: "0 阶功法", el: "jin", cap: 100, fb: { a: "str", an: "力量", half: 0.3, full: 0.7 }, gate: 0, line: "start",
    desc: "无名残卷，记载淬体拳路。演练可增长修为与力量，圆满后气感自生，可推演吐纳之法。", src: "传承事件或商铺购得。" },
  { id: "yinqi", name: "引气诀", tier: 1, tierName: "1 阶功法", el: "shui", cap: 200, fb: { a: "int", an: "智力", half: 2, full: 5 }, gate: 5, line: "start",
    desc: "吐纳引气之法诀。修行效率大增，打坐收益远胜寻常吐纳。", src: "落魄武师一脉的传承；亦可于商铺购得。" },
  /* —— 宗门 1 阶（外门传功，入册后境界至锻骨境可领） —— */
  { id: "gfqingyan", name: "青岩炼形诀", tier: 1, tierName: "1 阶功法", el: "tu", cap: 200, fb: { a: "con", an: "体质", half: 2, full: 5 }, gate: 3, line: "sect", sect: "青岩门",
    desc: "青岩门外门根本法：引山间石气淬体，稳字当头——进境不快，却最不易出岔子。", src: "青岩门传功殿授予外门弟子。" },
  { id: "gfhuilang", name: "苍狼血勇图", tier: 1, tierName: "1 阶功法", el: "huo", cap: 200, fb: { a: "str", an: "力量", half: 2, full: 5 }, gate: 3, line: "sect", sect: "灰狼图腾殿",
    desc: "灰狼图腾殿图腾武法：以血勇引狼灵入体，愈战愈勇，极夜冻风里气血自热。", src: "灰狼图腾殿授予见习勇士。" },
  { id: "gfluoxia", name: "落霞剑引", tier: 1, tierName: "1 阶功法", el: "jin", cap: 200, fb: { a: "str", an: "力量", half: 2, full: 5 }, gate: 3, line: "sect", sect: "落霞剑宗",
    desc: "落霞剑宗外门剑引：剑势如晚霞铺天，连绵不绝——中州剑宗的体面，在一招一式的规矩里。", src: "落霞剑宗传剑阁授予外门弟子。" },
  { id: "gfkuquan", name: "枯泉禅心咒", tier: 1, tierName: "1 阶功法", el: "shui", cap: 200, fb: { a: "con", an: "体质", half: 2, full: 5 }, gate: 3, line: "sect", sect: "枯泉寺",
    desc: "枯泉寺禅法：心如枯泉，波澜不兴——暑热风沙不侵，杂念不生。", src: "枯泉寺知客僧授予沙弥。" },
  { id: "gfbaimiao", name: "青蛊养灵术", tier: 1, tierName: "1 阶功法", el: "mu", cap: 200, fb: { a: "int", an: "智力", half: 2, full: 5 }, gate: 3, line: "sect", sect: "百苗巫寨",
    desc: "百苗巫寨巫法：以蛊养灵、以灵饲蛊，瘴林之中如鱼得水。", src: "百苗巫寨寨老授予巫徒。" },
  /* —— 宗门 2 阶内篇（内门考核后授予，门槛：灵阶） —— */
  { id: "gfqingyannei", name: "青岩内篇", tier: 2, tierName: "2 阶功法", el: "tu", cap: 400, fb: { a: "con", an: "体质", half: 20, full: 50 }, gate: 7, line: "sect", sect: "青岩门",
    desc: "青岩门内门真传：石气入骨，不动如山——外门弟子穷其一生也摸不到的半页。", src: "青岩门内门考核后授予。" },
  { id: "gfhuilangnei", name: "狼灵战典", tier: 2, tierName: "2 阶功法", el: "huo", cap: 400, fb: { a: "str", an: "力量", half: 20, full: 50 }, gate: 7, line: "sect", sect: "灰狼图腾殿",
    desc: "图腾殿内殿战典：狼灵附体，血勇化煞——北原崇拜强者，这卷就是强者的凭证。", src: "灰狼图腾殿内殿试炼后授予。" },
  { id: "gfluoxianei", name: "落霞神剑谱", tier: 2, tierName: "2 阶功法", el: "jin", cap: 400, fb: { a: "str", an: "力量", half: 20, full: 50 }, gate: 7, line: "sect", sect: "落霞剑宗",
    desc: "落霞剑宗内门剑谱：一剑既出，霞光千里——剑宗的招牌，从来只靠剑说话。", src: "落霞剑宗内门考核后授予。" },
  { id: "gfkuquannei", name: "枯荣禅经", tier: 2, tierName: "2 阶功法", el: "shui", cap: 400, fb: { a: "con", an: "体质", half: 20, full: 50 }, gate: 7, line: "sect", sect: "枯泉寺",
    desc: "枯泉寺镇寺禅经：一枯一荣，生死轮转——僧人圆寂前口传心授，不落文字。", src: "枯泉寺方丈座前悟得。" },
  { id: "gfbaimiaonei", name: "万蛊朝天术", tier: 2, tierName: "2 阶功法", el: "mu", cap: 400, fb: { a: "int", an: "智力", half: 20, full: 50 }, gate: 7, line: "sect", sect: "百苗巫寨",
    desc: "巫寨秘传：万蛊朝宗，瘴气为衣——寨老之位，历来从这部术里出。", src: "百苗巫寨蛊祭大典后授予。" },
  /* —— 散修 2 阶玄品（按灵根主行求法：古籍残卷、遗迹、高人指点） —— */
  { id: "gfruijin", name: "锐金吐纳功", tier: 2, tierName: "2 阶功法", el: "jin", cap: 400, fb: { a: "str", an: "力量", half: 20, full: 50 }, gate: 7, line: "sanxiu",
    desc: "玄品散修功法：吐纳如刀，金气淬脉——锋锐有余，绵长不足，是散修的拼命路数。", src: "古籍残卷、上古遗迹或高人指点，按主行求得。" },
  { id: "gfqingmu", name: "青木长春功", tier: 2, tierName: "2 阶功法", el: "mu", cap: 400, fb: { a: "con", an: "体质", half: 20, full: 50 }, gate: 7, line: "sanxiu",
    desc: "玄品散修功法：木气绵长，生机不绝——活得久，才熬得出头。", src: "古籍残卷、上古遗迹或高人指点，按主行求得。" },
  { id: "gfxuanshui", name: "玄水真解", tier: 2, tierName: "2 阶功法", el: "shui", cap: 400, fb: { a: "int", an: "智力", half: 20, full: 50 }, gate: 7, line: "sanxiu",
    desc: "玄品散修功法：水性至柔，绕行百脉——灵台澄澈，悟道先行。", src: "古籍残卷、上古遗迹或高人指点，按主行求得。" },
    { id: "gflihuo", name: "离火熔金录", tier: 2, tierName: "2 阶功法", el: "huo", cap: 400, fb: { a: "str", an: "力量", half: 20, full: 50 }, gate: 7, line: "sanxiu",
    desc: "玄品散修功法：离火淬体，熔金锻骨——猛则猛矣，须防灼伤经脉。", src: "古籍残卷、上古遗迹或高人指点，按主行求得。" },
  { id: "gfhoutu", name: "厚土藏形诀", tier: 2, tierName: "2 阶功法", el: "tu", cap: 400, fb: { a: "con", an: "体质", half: 20, full: 50 }, gate: 7, line: "sanxiu",
    desc: "玄品散修功法：厚土载物，藏形养晦——散修持身保命的正道。", src: "古籍残卷、上古遗迹或高人指点，按主行求得。" },
];
const GONGFU_BY_ID = {}; for (const g of GONGFU) GONGFU_BY_ID[g.id] = g;
const GONGFU_BY_NAME = {}; for (const g of GONGFU) GONGFU_BY_NAME[g.name] = g;
/* 功法五行：亲和决定该行功法修炼速度；乱拳是凡俗野路子，无行 */
const TECH_EL = { 乱拳: null }; for (const g of GONGFU) TECH_EL[g.name] = g.el;
/* 功法熟练度上限（game.js 与各引擎共用） */
const TECH_CAPS = { 乱拳: 100 }; for (const g of GONGFU) TECH_CAPS[g.name] = g.cap;
/* 谱系风闻（3 阶圣品 / 4 阶仙品——此界难至，AI 推演可作伏笔素材，绝不可直接授予） */
const GONGFU_RUMORS = [
  "圣品功法只闻其名：十大上宗镇宗传承，非真传弟子不得一观。",
  "上古洞天或藏仙品残卷，然洞天接连崩毁，入者十死无生。",
  "三千年前「赤霄大劫」前有圣品功法现世的记载，此后只余传说。",
];

/* ============ 具名法术 · 首批名录（每行 2 门：1 阶灵品 + 2 阶玄品） ============
   威力公式（设定集「法力与技能威力」原文）：威力 = 基础 × 智力系数（智力每高于同境均值一成 +5%）× 存量系数（满蓝 ×1.0，半蓝 ×0.85，残蓝不足 20% ×0.65）。
   品阶对应功法品级：1 阶灵品（聚气开海可修）｜ 2 阶玄品（灵阶可修）。
   耗法标定（设定原文）：满蓝约放同阶法术 5~10 次，越阶一两次见底；法力不足放不出，强行催动遭反噬。 */
const SPELLS = [
  /* —— 金行 —— */
  { id: "sp_gengjin", name: "庚金剑气", el: "jin", tier: 1, tierName: "1 阶法术", mp: 6, base: 12, gate: 5,
    desc: "并指如剑，庚金之气透体而出，锋锐无俦——剑修入门的杀伐第一术。", src: "落霞剑宗传功同授 / 古籍玉简。" },
  { id: "sp_taibai", name: "太白分光剑", el: "jin", tier: 2, tierName: "2 阶法术", mp: 20, base: 80, gate: 7,
    desc: "一剑分光，数十道庚金剑气攒射如瀑——剑宗内门真传，方得见此术。", src: "古籍残卷 / 高人指点（灵阶可修）。" },
  /* —— 木行 —— */
  { id: "sp_qingteng", name: "青藤绞", el: "mu", tier: 1, tierName: "1 阶法术", mp: 6, base: 12, gate: 5,
    desc: "木气催生藤蔓破土而出，缠敌手足——百苗巫寨巫徒的护身术。", src: "百苗巫寨传功同授 / 古籍玉简。" },
  { id: "sp_yimu", name: "乙木天牢", el: "mu", tier: 2, tierName: "2 阶法术", mp: 20, base: 80, gate: 7,
    desc: "乙木成牢，四面八方藤蔓如墙合围，绞杀于内——中者如陷深林，挣无可挣。", src: "古籍残卷 / 高人指点（灵阶可修）。" },
  /* —— 水行 —— */
  { id: "sp_shuijian", name: "水箭术", el: "shui", tier: 1, tierName: "1 阶法术", mp: 6, base: 12, gate: 5,
    desc: "凝水成箭，破空而至——最稳扎稳打的一门杀伐术。", src: "枯泉寺传功同授 / 古籍玉简。" },
  { id: "sp_xuanbing", name: "玄冰刺", el: "shui", tier: 2, tierName: "2 阶法术", mp: 20, base: 80, gate: 7,
    desc: "玄水凝冰，冰锥透骨——中者血缓筋僵，行动迟滞。", src: "古籍残卷 / 高人指点（灵阶可修）。" },
  /* —— 火行 —— */
  { id: "sp_huoqiu", name: "火球术", el: "huo", tier: 1, tierName: "1 阶法术", mp: 6, base: 12, gate: 5,
    desc: "最朴素的杀伐术——一团火球砸过去。俗，但有效。", src: "灰狼图腾殿传功同授 / 古籍玉简。" },
  { id: "sp_lihuo", name: "离火焚心咒", el: "huo", tier: 2, tierName: "2 阶法术", mp: 20, base: 80, gate: 7,
    desc: "离火焚心，焰由心生——中术者五脏六腑如遭火燎，由里向外烧。", src: "古籍残卷 / 高人指点（灵阶可修）。" },
  /* —— 土行 —— */
  { id: "sp_dici", name: "地刺术", el: "tu", tier: 1, tierName: "1 阶法术", mp: 6, base: 12, gate: 5,
    desc: "土灵翻涌，地刺突起——青岩门弟子防身的看家本领。", src: "青岩门传功同授 / 古籍玉简。" },
  { id: "sp_bengshan", name: "崩山印", el: "tu", tier: 2, tierName: "2 阶法术", mp: 20, base: 80, gate: 7,
    desc: "山形法印凌空砸落，崩山裂石——势大力沉，避无可避。", src: "古籍残卷 / 高人指点（灵阶可修）。" },
  /* —— 灵根专属（杂灵根 / 变异灵根）：不入古籍玉简池，唯对应灵根可修（quests.js 灵根支线授予） ——
     trait：randEl 五行轮转（行属随机、不乘生克——五行不克）｜ chain 余雷追加五成 ｜ critUp 暴击 +15%（锋锐）
     ｜ weaken 敌方下次攻击 -30%（寒意蚀体）｜ noCounter 先制，敌方不反击（极速）｜ bonusDmg 追加五成毒发之伤 ｜ sure 必中（敛息） */
  { id: "sp_wuxingci", name: "五行刺", el: null, tier: 1, tierName: "1 阶法术", mp: 8, base: 14, gate: 5, linggen: "za", trait: "randEl",
    desc: "杂灵根专属：五行灵力随指而转，刺出皆成兵——无人可克，也不克人。", src: "杂灵根支线「五份地基」授予。" },
  { id: "sp_wuchao", name: "五气朝元", el: null, tier: 2, tierName: "2 阶法术", mp: 30, base: 100, gate: 7, linggen: "za",
    desc: "杂灵根专属：五气朝元，五行归一——前期慢是在打地基；地基之上，一击倾城。", src: "隐藏支线「杂灵根的逆袭」授予。" },
  { id: "sp_palm", name: "掌心雷", el: "jin", tier: 1, tierName: "1 阶法术", mp: 7, base: 13, gate: 5, linggen: "lei", trait: "chain",
    desc: "雷灵根专属：雷光自掌心炸开，命中之后再炸一道余雷。", src: "雷灵根试炼支线授予。" },
  { id: "sp_jianzhi", name: "剑指", el: "jin", tier: 1, tierName: "1 阶法术", mp: 7, base: 13, gate: 5, linggen: "jian", trait: "critUp",
    desc: "剑灵根专属：万物可为剑，一缕剑气破空——锋锐无匹，更易暴击。", src: "剑灵根试炼支线授予。" },
  { id: "sp_bingfeng", name: "冰封诀", el: "shui", tier: 1, tierName: "1 阶法术", mp: 7, base: 12, gate: 5, linggen: "bing", trait: "weaken",
    desc: "冰灵根专属：寒意蚀体，中招者血脉僵滞，出手为之一缓。", src: "冰灵根试炼支线授予。" },
  { id: "sp_fengren", name: "风刃", el: "mu", tier: 1, tierName: "1 阶法术", mp: 7, base: 12, gate: 5, linggen: "feng", trait: "noCounter",
    desc: "风灵根专属：风刃无形，去来无踪——先手即杀招，敌不及还手。", src: "风灵根试炼支线授予。" },
  { id: "sp_duzhang", name: "毒瘴掌", el: "mu", tier: 1, tierName: "1 阶法术", mp: 7, base: 10, gate: 5, linggen: "du", trait: "bonusDmg",
    desc: "毒灵根专属：掌风带瘴——伤可见，毒难防（命中追加五成毒发之伤）。", src: "毒灵根试炼支线授予。" },
  { id: "sp_yingxi", name: "影袭", el: "shui", tier: 1, tierName: "1 阶法术", mp: 7, base: 12, gate: 5, linggen: "ying", trait: "sure",
    desc: "影灵根专属：敛息潜行，自影中暴起——防不胜防，避无可避。", src: "影灵根试炼支线授予。" },
];
const SPELLS_BY_ID = {}; for (const sp of SPELLS) SPELLS_BY_ID[sp.id] = sp;
/* 法术熟练度上限（设定集「等阶划分」：1 阶 200 ｜ 2 阶 400）；瓶颈（最后 10% 获取减半）与小成/圆满反哺对齐功法体系 */
const SPELL_CAP = { 1: 200, 2: 400 };
const SPELL_TRAIT_TEXT = { randEl: "五行轮转：行属随机，不乘生克", chain: "余雷：命中追加五成", critUp: "锋锐：暴击 +15%", weaken: "寒意蚀体：敌方下次攻击 -30%", noCounter: "极速：先制，敌方不反击", bonusDmg: "毒发：命中追加五成", sure: "敛息：必中" };

/* ============ 远行（第五章 · 五域四海） ============
   踏入灵阶（脱凡）解锁远行：启程 → 旅途 N 日（脚程随境界缩短）→ 抵达目标地域枢纽。
   地域切换后，天气/物价/名录人物/宗门随之而变（regionOf 按地点字符串解析）。 */
const REGION_HUBS = {
  yunzhou: "云州 · 青石城",
  beiyuan: "北地 · 渊口戍堡",
  zhongzhou: "中州 · 皇朝大城",
  ximo: "西漠 · 沙海绿洲",
  nanling: "南岭 · 十万大山 · 苗寨",
};

/* ============ 世界角色谱（设定集第五、六章 · 名录人物） ============
   三性：boss（一方最强者，可拜谒/讨教）｜ neutral（中立角色，可攀谈/交易服务）｜ hidden（隐藏角色，只可远观留痕，缘法具足方可接触）。
   境界按角色定位与地域格局而定：边城小宗掌门止于灵阶，郡域强者入玄阶，圣域老祖级永不现身（只可留痕）。
   region 为地域 key（data.js REGIONS），"sea" 为四海（远行后）。cond 说明见 gm.js worldcast 场景。 */
const WORLDCAST = [
  /* —— 东荒 · 云州（首世活动区，境界压在凡阶~灵阶） —— */
  { id: "yueqingyan", name: "岳青岩", title: "青岩门掌门", kind: "boss", region: "yunzhou", realm: 8, pers: "豁达",
    hook: "山门演武场偶见其指点弟子", desc: "三流小宗的掌门人，灵阶气海境。青岩门衰落到只剩一座山门，他却还把山道扫得干干净净。" },
  { id: "linzhenshan", name: "林镇山", title: "青石城林家家主", kind: "boss", region: "yunzhou", realm: 6, pers: "记仇",
    hook: "林家坞堡前车马喧阗", desc: "豪族林家之主，凡阶巅峰开元境。青石城三分之二的铺面姓林——他不是修士里的强者，是穷人眼里的天。" },
  { id: "tingyulouzhu", name: "莫听雨", title: "听雨楼云州分楼主", kind: "neutral", region: "yunzhou", realm: 5, pers: "洒脱",
    hook: "茶楼后堂，一局没下完的棋", desc: "散修联盟听雨楼的分楼主，聚气境。会费换庇护与情报——草根散修最好的去处，门槛不高，人情要还。" },
  { id: "tianjiEye", name: "天机楼眼线", title: "青石城账房先生打扮的人", kind: "neutral", region: "yunzhou", realm: 4, pers: "贪婪",
    hook: "总在城南账房拨算盘", desc: "没人知道他的名字。天机楼买消息，按字计费——他什么都知道一点，什么都不白说。" },
  { id: "duobaoCi", name: "多宝阁刺客", title: "买命钱收取人", kind: "hidden", region: "yunzhou", realm: 9, pers: "偏激",
    hook: "屋檐上一闪而逝的影子", desc: "多宝阁的刀。买命去多宝阁——你若看见他，多半是别人的命被买了。", hiddenHint: "只在仇怨或悬赏剧情里现身" },
  /* —— 北原 —— */
  { id: "hulangdianzhu", name: "狼主巴图", title: "灰狼图腾殿殿主", kind: "boss", region: "beiyuan", realm: 10, pers: "偏激",
    hook: "图腾殿前的雪地里，狼群为他让路", desc: "灵阶玄府境，极夜冰原的强者规矩：拳头即道理。崇拜强者的国度里，他是被崇拜的那个。" },
  { id: "shouyeren", name: "守夜人", title: "渊口裂缝的守望者", kind: "hidden", region: "beiyuan", realm: 15, pers: "豁达",
    hook: "界壁裂缝边缘，一个从不回头的背影", desc: "没人知道他守了多少年。渊声起时他总在——比戍堡的烽燧还准时。", hiddenHint: "渊兽相关伏笔具足时方可接触" },
  /* —— 中州 —— */
  { id: "luoxiaZongzhu", name: "沈落霞", title: "落霞剑宗宗主", kind: "boss", region: "zhongzhou", realm: 12, pers: "洒脱",
    hook: "剑宗最高的那座峰上，晚霞不散", desc: "灵阶神游境。她的剑挑不出天下第一，但中州的天骄名录里总有她弟子的名字。" },
  { id: "jianzheng", name: "钦天监监正", title: "皇朝观命者", kind: "hidden", region: "zhongzhou", realm: 13, pers: "重情",
    hook: "观星台上彻夜不熄的灯", desc: "替皇朝读了四十年命格。有些人的命格他读不出来——比如你的。", hiddenHint: "命格相关剧情具足时方可接触" },
  /* —— 西漠 —— */
  { id: "kuquanzhuchi", name: "枯泉寺住持", title: "枯荣禅师", kind: "boss", region: "ximo", realm: 11, pers: "豁达",
    hook: "寺前枯泉边，一个扫地的老僧", desc: "灵阶紫府境。佛国的香火他没份，沙盗的刀他到——方圆三百里，活人比经文记得他牢。" },
  { id: "shoumu", name: "守墓人", title: "上古战场的拾骨者", kind: "hidden", region: "ximo", realm: 14, pers: "记仇",
    hook: "沙暴过后，战场遗迹里独行的佝偻身影", desc: "他在捡三万年前的骨头，也在埋三天前的。别碰他怀里的东西。", hiddenHint: "上古战场探索具足时方可接触" },
  /* —— 南岭 —— */
  { id: "dawu", name: "大巫蓝蚩", title: "百苗巫寨大巫", kind: "boss", region: "nanling", realm: 12, pers: "偏激",
    hook: "瘴林深处，蛊铃先于人至", desc: "灵阶神游境。人妖杂居的地界，规矩是蛊定的——外人进寨先问巫，不问路。" },
  { id: "xunshanyao", name: "巡山使青塬", title: "妖族巡山者头目", kind: "neutral", region: "nanling", realm: 9, pers: "重情",
    hook: "山道上拦路的一支短矛", desc: "二阶大妖，已能言。妖族地盘上他算是讲理的——讲理的代价是买路的山货。" },
  { id: "shujing", name: "老樟", title: "化形未遂的灵族", kind: "hidden", region: "nanling", realm: 16, pers: "重情",
    hook: "十万大山里一棵会挪位置的古樟", desc: "草木成精的灵族。化形是志怪话本才敢写的事——他写了一半，卡住三千年了。", hiddenHint: "灵族机缘具足时方可接触" },
  /* —— 四海（远行后） —— */
  { id: "jiaoguoNv", name: "鲛国女王", title: "南海鲛国之主", kind: "boss", region: "sea", realm: 17, pers: "记仇",
    hook: "潮起时，海面浮起的王帐", desc: "玄阶合体境。鲛人不落泪，泪落便成珠——她的国库是用葬礼堆起来的。" },
  { id: "chuixianzhe", name: "垂钓者", title: "归墟边缘的钓叟", kind: "hidden", region: "sea", realm: 20, pers: "豁达",
    hook: "北海尽头，一根没有线的钓竿", desc: "没人知道他钓什么。归墟相传是仙路断绝之处——他在那里坐了多久，浪知道。", hiddenHint: "终局伏笔，只可远观，不可交互" },
];
const CAST_BY_ID = {}; for (const c of WORLDCAST) CAST_BY_ID[c.id] = c;
/* 敌方五行（按名取，默认土行） */
const ENEMY_EL = {
  "林中的冬狼": "shui", "野狗": "tu", "饿疯的野狗": "tu",
  "劫道山贼": "jin", "青岩外门教习": "jin", "陆沉": "jin", "多宝阁刺客": "shui",
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

/* ============ 职业名录（设定补丁 v5 · 第三章 职业系统） ============
   品阶基数（3.4）：凡品 0.3~0.5 ｜ 灵品 3~5；境界系数：凡阶 ×1（灵阶 ×10 预留）
   入门三选一（3.3）：从业满一月 ／ 拜师入册 ／ 灰色职业做成对应的事
   品阶封顶：凡品最高 3 级，再往上须行当升品转轨（药庐学徒→药师→丹师→丹圣 是换轨，不是原地升级）
/* 名录仅为示例、绝非全集；master 为可拜师的行当 NPC（缘分 ≥20「好感」后触发入行支线） */
const PROFESSIONS = {
  yaolu: {
    name: "药庐学徒", tier: 0, tierName: "凡品", master: "周先生", skill: "识药",
    attrs: { int: 0.3, con: 0.3 }, traitMod: { foodP: 10 },
    trait: "「识药人」：辨药、制药、炮制经验 +10%（进食效果 +10%）",
    questDesc: "回春堂的药香是最好的老师。周先生嘴上骂你朽木，手里的活却总在教你——得他认可，便可拜师入册。",
    offerText: "周先生瞥你一眼：「想当学徒？先让我看看你的良心和耐性。」",
    doneText: "周先生把一本手抄药谱拍在你胸口：「从今往后，你是药庐的人了。」",
    next: "yaoshi",
  },
  jiaofu: {
    name: "脚夫", tier: 0, tierName: "凡品", master: "码头工头蛮牛", skill: "扛包",
    attrs: { str: 0.4, con: 0.5 }, traitMod: { defP: 4 },
    trait: "「压不垮」：承重承伤，皮实耐造（承伤 -4%）",
    questDesc: "码头上的日子是扛出来的。蛮牛说，肯下力气的人，码头认得他的脸。",
    offerText: "蛮牛上下打量你：「扛得动一包米，才扛得动一个前程。试试？」",
    doneText: "蛮牛把一条汗巾甩上你的肩：「从今天起，码头有你一碗饭。」",
  },
  dianxiaoer: {
    name: "店小二", tier: 0, tierName: "凡品", master: "雪夜寡妇", skill: "跑堂",
    attrs: { agi: 0.3, int: 0.3 }, traitMod: { socialP: 5 },
    trait: "「察言观色」：眼观六路，人情练达（缘分获取 +5%）",
    questDesc: "茶棚里进出的都是消息。寡妇说，手脚麻利、嘴上带笑的人，到哪儿都饿不死。",
    offerText: "雪夜寡妇擦着桌子，头也不抬：「缺个跑堂的。吃得苦，就留下。」",
    doneText: "寡妇丢给你一条围裙：「棚里多点人气，我的茶也好卖些。」",
  },
  huolang: {
    name: "货郎", tier: 0, tierName: "凡品", master: "卖炭婆", skill: "叫卖",
    attrs: { agi: 0.3, int: 0.3 }, traitMod: { moneyP: 5 },
    trait: "「十里乡情」：走街串巷皆认得你（挣钱 +5%）",
    questDesc: "卖炭婆认得满城的人。她说，一张笑脸一双快腿，就是货郎的全部家当。",
    offerText: "卖炭婆眯眼笑：「后生，替我跑几趟腿？手脚干净，比什么都强。」",
    doneText: "卖炭婆把一只货箱递给你：「走街串巷去吧，青石城认你这个脸。」",
  },
  gengfu: {
    name: "更夫", tier: 0, tierName: "凡品", master: "瞎眼老者", skill: "打更",
    attrs: { con: 0.4, int: 0.3 }, traitMod: { escapeP: 4 },
    trait: "「一更一世界」：夜路走得多了，脚下自有分寸（逃脱 +4%）",
    questDesc: "瞎眼老者眼睛看不见，耳朵却比谁都灵。他说，打更人敲的不是梆子，是这座城的觉。",
    offerText: "瞎眼老者侧过脸：「后生，脚步比旁人稳。想学打更？」",
    doneText: "老者把梆子塞进你手里：「一更人定，二更火烛。记住，更夫是夜里醒着的人。」",
  },
  sanzhishou: {
    name: "三只手", tier: 0, tierName: "灰色", master: "小贼细猴", skill: "手上功夫", grey: true,
    attrs: { agi: 0.5 }, traitMod: { moneyP: 8 },
    trait: "灰色职业：加成高，代价各表（名声带毒 / 道心 / 仇家）",
    questDesc: "细猴的手比脑子快。他说，摸到第一只钱包的那一刻，这行就点亮了——只是做过的事，不随换马甲消失。",
    offerText: "细猴咧嘴一笑，掌心翻出一枚铜钱：「哥，想学制钱怎么自己长腿么？」",
    doneText: "细猴教你出手的角度、收手的时机。你学会的那一刻，心里某个地方悄悄沉了一块。",
  },
  yaoshi: {
    name: "药师", tier: 1, tierName: "灵品", master: "周先生", skill: "识药",
    attrs: { int: 3, con: 3 }, traitMod: {},
    trait: "「坐堂」：规则型特性——丹药药蚀积累减半（识得药性，丹毒不侵）",
    requires: { prof: "yaolu", lv: 3, bond: 80 },
    next: "danshi",
    questDesc: "药庐学徒做到头，便是转轨之时：修为境界与行业深度双到位，方可挂上「药师」的牌。",
    offerText: "周先生捻须良久：「学徒做得，坐堂可做得？这一声『药师』，我拿不准——你自己挣。」",
    doneText: "回春堂门口多了一块小木牌。周先生背着手走开了，嘴角是翘的。",
  },
  zhangfang: {
    name: "账房先生", tier: 1, tierName: "灵品", master: "商会管事钱三", skill: "算盘",
    attrs: { int: 4 }, traitMod: { moneyP: 10 }, reqAttr: { int: 5 },
    trait: "「算盘精」：心中有数，落笔生钱（挣钱 +10%）",
    questDesc: "钱三的算盘成精，认人也认数。他说，脑子不够快的人，账台都上不去。",
    offerText: "钱三拨了下算盘：「心算过我，账台就是你的。」",
    doneText: "钱三把一方旧算盘推给你：「从今天起，商会的账，过你的手。」",
  },
  danshi: { // 药庐学徒→药师→丹师 是换轨（3.4）；丹师不系固定 NPC——前置瓶颈时云游丹师随机现身（23:10 补丁）
    name: "丹师", tier: 1, tierName: "灵品", master: "", skill: "炼丹", dynamic: true,
    attrs: { int: 4, con: 2 }, traitMod: {},
    trait: "「掌炉」：开炉炼丹——丹纹数随境界与熟练度而涨，药蚀了然于胸",
    questDesc: "", offerText: "", doneText: "",
  },
  qishi: { // 铁匠学徒→铸师→炼器师；器火一脉同样云游无定（23:10 补丁）
    name: "炼器师", tier: 1, tierName: "灵品", master: "", skill: "炼器", dynamic: true,
    attrs: { str: 3, int: 3 }, traitMod: {},
    trait: "「抡锤」：起灶炼器——凡器起步，锤下见真章",
    questDesc: "", offerText: "", doneText: "",
  },
  tiejiang: { // 器火一脉前置（凡品）：师傅为每世随机NPC
    name: "铁匠学徒", tier: 0, tierName: "凡品", master: "", skill: "拉风箱", dynamic: true,
    attrs: { str: 0.4, con: 0.3 }, traitMod: {},
    trait: "「火性」：炉边打滚的人，懂铁也懂火——器火一脉的筑基",
    questDesc: "", offerText: "", doneText: "",
    next: "zhushi",
  },
  zhushi: { // 器火一脉转轨（灵品）：铁匠学徒满级 + 师傅缘分 ≥80
    name: "铸师", tier: 1, tierName: "灵品", master: "", skill: "锻打", dynamic: true,
    attrs: { str: 3, int: 2 }, traitMod: {},
    requires: { prof: "tiejiang", lv: 3, bond: 80 },
    trait: "「百炼」：一块铁坯过百遍火、千遍锤，才算听话",
    questDesc: "", offerText: "", doneText: "",
    next: "qishi",
  },
};

/* ============ 炼丹 · 炼器（设定补丁 v5 · 第七/九章 + 22:41 补丁） ============
   辅材坊市通贩（商铺可购，铜钱）；主材只走三通道：任务奖励 / 特殊 NPC 交易 / 击杀取材——永不进店。
   配方主材锚定设定集名录：赤血芝·石钟乳·九叶玄芝（第九章灵/玄品名录）、精铁（第七章凡俗物价锚定 2 两银）、玄铁（灵器之胚）。
   品质来源：七分在人（境界+副职熟练度）、两分在料（料足）、一分在器（丹炉/炼锤）、一丝气运。
   六品质效力（第九章）：瑕疵五~六成 / 下品七~八成 / 中品十成 / 上品十二成 / 极品十五成 / 绝品二十成 */
const QUALITY_TIERS = [
  { key: "xiaci",   name: "瑕疵", mult: 0.55 },
  { key: "xiaping", name: "下品", mult: 0.75 },
  { key: "zhong",   name: "中品", mult: 1.0 },
  { key: "shang",   name: "上品", mult: 1.2 },
  { key: "jipin",   name: "极品", mult: 1.5 },
  { key: "jue",     name: "绝品", mult: 2.0 },
];
const CRAFT_AUX = [ // 辅材：坊市通贩（商铺「辅材」区，铜钱购入，入材料账）
  { id: "lingtan",   name: "灵炭", price: 8,  desc: "松烟与树脂炼的炭，火性稳，丹炉灶膛都用它。" },
  { id: "shanquan",  name: "山泉", price: 3,  desc: "城外石缝间的活泉水，煎药淬火的引子。" },
  { id: "yaoshougu", name: "妖兽骨", price: 30, desc: "妖兽遗骨，磨粉入坯，可增器物韧性。" },
];
const RECIPES = {
  dan: [
    { id: "r_juqi", name: "聚气丹", pin: "凡品", main: "赤血芝", aux: { lingtan: 2, shanquan: 1 },
      out: { item: "juqiDan", n: 1 }, base: 65, desc: "凡阶破境之丹。主材赤血芝（南岭深山背阴处，灵品名录——采它要过妖兽那一关）。" },
    { id: "r_huiling", name: "回灵丹", pin: "灵品", main: "石钟乳", aux: { lingtan: 1, shanquan: 2 },
      out: { item: "huiLingDan", n: 1 }, base: 50, desc: "灵品丹药，回气养元（气血 +25）。主材石钟乳（深窟溶洞，百年一滴）。" },
    { id: "r_xisui", name: "洗髓丹", pin: "玄品", main: "九叶玄芝", aux: { lingtan: 3, shanquan: 3 },
      out: { item: "xisuiDan", n: 1 }, base: 30, desc: "洗经伐髓，清除一道暗伤——玄品丹药中的硬通货，散修梦寐以求。主材九叶玄芝（灵脉交汇之地，一叶一品）。" },
  ],
  qi: [
    { id: "r_jingtie", name: "精铁刀", pin: "凡器", main: "精铁坯", aux: { lingtan: 2 },
      out: { gear: "weapon", name: "精铁刀", baseDmg: 4 }, base: 65, desc: "凡俗好刀（第七章锚：精铁刀 2 两银）。主材精铁坯走 NPC 交易——铁匠师傅的库袋里存着好料。" },
    { id: "r_qinggang", name: "青钢剑", pin: "灵器", main: "玄铁", aux: { lingtan: 3, yaoshougu: 1 },
      out: { gear: "weapon", name: "青钢剑", baseDmg: 8 }, base: 45, desc: "下品灵器（第七章锚：50~200 灵石）。主材玄铁须击杀取材或任务所得，坊市无售。" },
  ],
};

/* ============ NPC 性格底色（设定补丁 v5 · 第四章 缘分与仇怨） ============
   同样的行为落在不同性格上，结出的果完全不同：
   记仇者对伤害 ×1.5 计、对善意 ×0.7 记；重情者对善意 ×1.5 记。
   未列名的 NPC 按名字确定性分配（人间百态，不偏不倚）。 */
const NPC_CHAR = {
  "老丐头": "重情", "周先生": "重情", "说书人柳先生": "洒脱", "商会管事钱三": "贪婪",
  "瞎眼老者": "豁达", "小贼细猴": "偏激", "码头工头蛮牛": "豁达", "青岩门外门弟子陆沉": "洒脱",
  "赌档庄家笑面佛": "贪婪", "卖炭婆": "豁达", "游方郎中": "重情", "雪夜寡妇": "重情",
  "灰狼部见习勇士乌勒": "豁达", "落霞剑宗外门弟子沈青梧": "洒脱", "枯泉寺沙弥了尘": "重情", "百苗寨巫徒蓝朵": "偏激",
};
const NPC_CHAR_POOL = ["重情", "贪婪", "偏激", "豁达", "记仇", "洒脱"];
/* 性格底色落点文案（缘分信号用） */
const NPC_CHAR_FLAVOR = {
  "重情": "他记恩记得深。", "贪婪": "他心里拨的是利益算盘。", "偏激": "他认定的事，十头牛拉不回。",
  "豁达": "他不与人计较，但也看得通透。", "记仇": "他记仇记得牢——恩打折，怨加倍。", "洒脱": "他笑笑，不往心里去。",
};
