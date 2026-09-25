/* 苍玄界 · 任务系统（天道卷宗）
   主线按世界设定推进：卷一「潜龙在渊」——活过冬天 → 求武之路 → 小宗门应试 → 外门立足 →
   岁末大比 → 后山枯井（上古信物）→ 灭门之夜（卷一终局）；修行线「问道之途」「大世之巅」并行。
   【设定集 · 灵根恒定（01:51 定稿）】主角首世恒为杂灵根（五行各 20，天定不得置换）——
   青岩门测灵碑择根而取，杂灵根灵光不过尺，必遭拒收：「拜入青岩门」对杂灵根主角不可完成，
   拒收后主线改道隐藏线「杂灵根的逆袭」（mq_sanxiu 散修之路）；再世 roll 出三灵根以上方可走仙门线。
   支线由 NPC 缘分与伏笔触发，GM 回合中作为「任务选项」出现。
   任务完成判定由引擎执行，AI 层只能呼应、不能替玩家宣告完成。 */
"use strict";

const QU = (() => {

  /* ---------- 奖励执行器（与 fx 白名单同源的子集） ---------- */
  function applyReward(r) {
    if (!r) return;
    const notes = [];
    if (r.money) { S.money = Math.max(0, S.money + r.money); notes.push(`铜钱 ${r.money > 0 ? "+" : ""}${r.money}`); }
    if (r.stones) { S.stones = Math.max(0, S.stones + r.stones); notes.push(`灵石 ${r.stones > 0 ? "+" : ""}${r.stones}`); }
    if (r.points) { S.points = Math.max(0, S.points + r.points); notes.push(`万象点 ${r.points > 0 ? "+" : ""}${r.points}`); }
    if (r.cult) { if (gainCult(r.cult)) notes.push(`修为 +${r.cult}`); }
    if (r.dao) { S.daoXin = Math.max(0, Math.min(100, S.daoXin + r.dao)); notes.push(`道心 ${r.dao > 0 ? "+" : ""}${r.dao}`); }
    if (r.attr) for (const k in r.attr) { gainAttr(k, r.attr[k]); notes.push(`${{ str: "力量", agi: "敏捷", int: "智力", con: "体质" }[k]} +${r.attr[k]}`); }
    if (r.item) { const m = /^([a-zA-Z]+):(-?\d+)$/.exec(r.item); if (m) { S.inv[m[1]] = Math.max(0, (S.inv[m[1]] || 0) + (+m[2])); notes.push(`获得物品`); } }
    if (r.npc) for (const n in r.npc) { addNpc(n, r.npc[n], { special: true }); notes.push(`${n} 缘分 ${r.npc[n] > 0 ? "+" : ""}${r.npc[n]}`); } // 任务酬谢属特殊剧情：不受「日常行为每日一次」之限
    if (r.flag) S.flags[r.flag] = 1;
    if (r.luckCharm) { S.tempLuckDays = Math.max(S.tempLuckDays, r.luckCharm * 2); notes.push("气运临时 +1（数日）"); } // 伏笔兑现：吉星之兆（与 fx 白名单同源）
    computeMods();
    return notes.join("，");
  }

  /* ---------- 任务定义 ---------- */
  /* 开局存活任务锚定当前身份/地域（第十章铁律一：名随身份与地域，型不变——惨境濒死，先活下来） */
  const SURVIVE_BY_OPENING = {
    pomiao: { name: "凡品任务：活过这个冬天", desc: "灵气潮汐涨潮之初，大雪封城。先活下来——热食、炭火、修为，都是命。" },
    laofang: { name: "凡品任务：活过死牢寒夜", desc: "死囚牢里最不缺的就是死人。先活下来——熬过寒夜、熬过狱卒、熬过这座吃人的牢。" },
    heikuang: { name: "凡品任务：从矿道里爬出去", desc: "塌方的黑矿窑只给了你一条缝。先活下来——爬出去、讨口水、别进工伤簿的死亡名单。" },
    jitan: { name: "凡品任务：挣脱祭坛，活过雪夜", desc: "山民的巫祝随时会醒，绳索随时会收紧。先活下来——挣脱、跑路、别成为山神的嚼用。" },
    yasong: { name: "凡品任务：活着走到下一座城", desc: "解差死绝的雪道上，逃犯活不过三日。先活下来——走出雪道、挣口热食、甩掉身后的马蹄声。" },
  };
  for (const k in REGIONS) for (const op of (REGIONS[k].openings || [])) SURVIVE_BY_OPENING[op.id] = { name: REGIONS[k].surviveName, desc: REGIONS[k].surviveDesc };
  const regionOfSafe = () => (typeof regionOf === "function") ? regionOf(S.place) : null;
  const curSect = () => { const r = regionOfSafe() || REGIONS.yunzhou; return r.sect || REGIONS.yunzhou.sect; }; // 出生地所属小宗门（五域各一），主线宗门名与引路弟子随之变化
  const elderName = () => `${curSect().name}内门长老`; // 卷一后半段的关键引路人（上宗眼线，角色不可知）
  const storyStage = () => { const m = (typeof META !== "undefined") ? META : null; return (m && m.story) ? (m.story.stage || 0) : -1; }; // 卷二跨世进度（灭门之夜里写入 META.story）
  const burntSect = () => { const m = (typeof META !== "undefined") ? META : null; return (REGIONS[(m && m.story && m.story.sectBurnt) || "yunzhou"] || REGIONS.yunzhou).sect; }; // 上一世被灭的宗门
  const locLex = () => (({ // 卷一终局场景用语随地域（云州味不再穿帮到沙海与冰原）
    yunzhou: { cross: "渡口", leave: "云州", hide: "雪沟", water: "河" },
    beiyuan: { cross: "冰桥", leave: "北地", hide: "雪沟", water: "冰河" },
    zhongzhou: { cross: "城门渡口", leave: "帝畿", hide: "雪沟", water: "护城河" },
    ximo: { cross: "绿洲井台", leave: "沙海", hide: "沙沟", water: "暗渠" },
    nanling: { cross: "山溪渡", leave: "南岭", hide: "苇丛", water: "山溪" },
    sihai: { cross: "礁间浅滩", leave: "这片海", hide: "礁缝", water: "海" },
  })[(regionOfSafe() || REGIONS.yunzhou).key]);
  const DEFS = {
    /* ===== 主线 · 卷一 潜龙在渊 ===== */
    mq_survive: {
      get name() { const o = SURVIVE_BY_OPENING[S.flags && S.flags.opening]; return o ? o.name : "凡品任务：活过眼前这一关"; },
      get desc() { const o = SURVIVE_BY_OPENING[S.flags && S.flags.opening]; return o ? o.desc : "命格改写只是死缓。先活下来——这是所有算计的地基。"; },
      type: "main", passive: true,
      auto: () => true,
      objectives: [{ text: () => `撑过这一关（第 ${Math.min(S.day, 31)} / 31 日）`, done: () => S.day >= 31 }],
      reward: { points: 20 },
      doneText: "你熬过了这一关。命，暂时是你自己的了。",
    },
    mq_wudao: {
      name: "主线：求武之路", type: "main",
      desc: "活下来只是第一步。这世道，没有拳脚与气感的穷人死得最快——寻一门功法传承，择一而修，踏入武道。",
      auto: () => (S.quests.done || []).includes("mq_survive"),
      objectives: [{ text: () => "获得功法传承，择一而修（《引气诀》/《锻骨拳谱》）", done: () => (typeof GONGFU !== "undefined") ? GONGFU.some(g => (S.inv[g.id] || 0) > 0) : ((S.inv.yinqi || 0) > 0 || (S.inv.quanpu || 0) > 0) }],
      reward: { points: 30 },
      doneText: "吐纳入体、拳意入骨——从这一刻起，你不再是任人拿捏的凡骨。武道之门，正式踏入。",
    },
    mq_qingyan: {
      get name() { return `主线：拜入${curSect().name}`; }, type: "main",
      get desc() { return `三流小宗${curSect().name}大开山门收徒。测灵碑、问心关、演武台——三关皆过，才是仙途起点。`; },
      auto: () => S.day >= 10 || !!S.flags.qingyanRumor,
      objectives: [
        { text: () => "前往山门，参加三关应试", done: () => !!S.flags.qy_tried },
        { text: () => "过测灵碑（灵光显化）", done: () => !!S.flags.qy_step1 },
        { text: () => "过问心关（道心可鉴）", done: () => !!S.flags.qy_step2 },
        { text: () => "过演武台（胜外门教习）", done: () => !!S.flags.qy_step3 },
      ],
      get reward() { return { points: 50, cult: 30, npc: { [curSect().npc]: 20 } }; },
      get doneText() { return `青袍加身，木牌入手。从今往后，你是有${curSect().name}的人了。`; },
    },
    /* 【杂灵根的逆袭】测灵碑拒收杂灵根后的主线改道（设定集：灵根恒定，仙门捷径不通则无门无派自证大道） */
    mq_sanxiu: {
      name: "主线：逆天改命", type: "main",
      desc: "测灵碑前一寸微光，仙门的捷径就此断绝。但大道朝天，各走一边——杂灵根五份地基，前期慢，却无人可克。无门无派，便凿自己的井。",
      auto: () => !!S.flags.qy_za_reject,
      objectives: [
        { text: () => `锻骨立足，无师自通（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 3 },
        { text: () => `踏入聚气境，以五份地基证道（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 5 },
        { text: () => `凡阶圆满，开元境（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 6 },
      ],
      reward: { points: 130, cult: 30, attr: { con: 0.3 } }, // 对齐仙门线两任务合计（青岩门 50 + 外门立足 80），不偏不倚
      doneText: "无门无派，你一境一境凿上来。说书人拍案：「仙门不收的杂灵根，走到了凡阶圆满。」——杂灵根的逆袭，自此有了第一段实证。",
    },
    mq_outer: {
      get name() { return `主线：${curSect().name}外门立足`; }, type: "main",
      get desc() { return `外门弟子三千，资源只向强者倾斜。锻骨境与同门之谊，是你立足${curSect().name}的根本。`; },
      auto: () => !!S.flags.qingyan,
      objectives: [
        { text: () => `踏入锻骨境（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 3 },
        { get npc() { return curSect().npc; }, need: 20, text: () => `与${curSect().npc}结成同门之谊（缘分 ${S.npc[curSect().npc] || 0} / 20）`, done: () => (S.npc[curSect().npc] || 0) >= 20 },
      ],
      reward: { points: 80, attr: { con: 0.3 }, dao: 2 },
      get doneText() { return `外门名册上，你的名字被朱笔圈了一道——${curSect().name}的资源、功法、师承，从此向你敞开一线。`; },
    },
    mq_dengfeng: {
      name: "主线：问道之途", type: "main",
      get desc() { return "仙途没有尽头，只有一境更比一境难。破境、历练、寻缘——一步步向上走，直到有资格看见这世间真正的风景（以及风景背后那只手）。"; },
      auto: () => (S.quests.done || []).includes("mq_outer") || (S.quests.done || []).includes("mq_sanxiu"),
      objectives: [
        { text: () => `踏入通脉境（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 4 },
        { text: () => `踏入聚气境（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 5 },
        { text: () => `踏入开元境，凡阶圆满（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 6 },
      ],
      reward: { points: 120, cult: 40, luckCharm: 1 },
      doneText: "凡阶六境，你一境一境走过来了。抬头看——灵泉之上，还有玄、圣，还有那件传说中的东西，和藏在它后面的影子。路，才刚刚开始。",
    },

    /* ===== 主线 · 卷一后半段（仙门线专属；散修线无此劫）=====
       外门大比崭露头角 → 长老差遣探后山枯井（出土不该存在的信物）→ 灭门之夜，第一世以逃亡收束。
       终局事件锁定、过程自由；与「问道之途」并行不悖（一个是故事线，一个是修行线）。 */
    mq_dabi: {
      get name() { return `主线：${curSect().name}岁末大比`; }, type: "main",
      get desc() { return `岁末大比，外门弟子只取前十。名次即资源，资源即命——长老们会来看台，站上去，让他们看见你。`; },
      auto: () => !!S.flags.qingyan && (S.quests.done || []).includes("mq_outer"),
      objectives: [
        { text: () => "登台连过三阵（报名即入册）", done: () => !!S.flags.dabiJoin },
        { text: () => "跻身大比前十", done: () => !!S.flags.dabiWin },
      ],
      get reward() { return { points: 60, stones: 2, npc: { [elderName()]: 20 } }; },
      get doneText() { return `前十的朱榜上有了你的名字。看台上，${elderName()}朝你这边多看了两眼——恰好在大比这日「路过」看台的，偏偏是他。`; },
    },
    mq_jing: {
      get name() { return `主线：后山枯井`; }, type: "main",
      get desc() { return `${elderName()}把你单独叫到偏殿：后山那口枯了三百年的井，昨夜开始往外冒灵气。宗门决定让你下去看看——只探，不取。可井下的东西，未必是宗门的东西。`; },
      auto: () => !!S.flags.qingyan && (isDone("mq_dabi") || isFailed("mq_dabi")), // 大比无论成败，你都已被「看见」
      objectives: [
        { text: () => "受长老之托，探后山枯井", done: () => !!S.flags.jingGo },
        { text: () => "下到井底", done: () => !!S.flags.jingDeep },
        { text: () => "寻得井底之物", done: () => !!S.flags.xianRelic },
      ],
      rewardFn: () => { S.flags.jingDoneDay = S.day; return applyReward({ points: 60, stones: 3, luckCharm: 1 }); },
      doneText: "你活着从井里上来了。暮色里长老等在井口，第一句话不是问伤势，而是问：「拿到什么了？」——他说过，只探，不取。",
    },
    mq_mie: {
      get name() { return `主线：灭门之夜`; }, type: "main", passive: true,
      get desc() { return `宗门传讯符烧到一半就灭了。回去，或者不回去——有些东西，从你带出井底那一刻起，就已经在路上了。`; },
      auto: () => !!S.flags.xianRelic && !!S.flags.jingDoneDay && S.day >= S.flags.jingDoneDay + 2,
      objectives: [
        { text: () => "赶回山门", done: () => !!S.flags.mieStart },
        { text: () => "活着出山", done: () => !!S.flags.mieEsc },
        { text: () => "在渡口做个了断", done: () => !!S.flags.mieDone },
      ],
      reward: { points: 100, dao: 3, luckCharm: 1 },
      get doneText() { return `${curSect().name}成了焦土。你站在渡口，怀里是半块不该存在的玉佩——从今往后，你没有宗门，只有债。`; },
    },

    /* ===== 主线 · 卷二 风起（跨世链：进度记 META.story.stage，死亡不清零，下一世接着查）=====
       焦土立誓（0）→ 循线查踪：多宝阁销赃册 + 天机楼消息（1）→ 了断夺信（战/交易/嫁祸；信物被夺则循线夺回或放手）（2）
       → 听雨楼旧档拼出真相第一层：世间有一只看不见的手（3）。终点锁定、过程自由、分支入 META.story.l2Choice。 */
    mq_ruins: {
      name: "主线：焦土", type: "main",
      get desc() { return `上一世，${burntSect().name}在一夜之间成了焦土。这一世你以新的名字长大，可有些火，隔着一世也烫。回去看看——然后，查。`; },
      auto: () => storyStage() === 0 && (typeof META !== "undefined") && META.world >= 2,
      objectives: [{ text: () => "重访灭门宗门的焦土", done: () => !!S.flags.l2Ruins }],
      rewardFn: () => { if (typeof META !== "undefined") { META.story.stage = 1; saveMeta(); } return applyReward({ points: 40, dao: 2 }); },
      doneText: "焦土无言。你在断碑前站到天黑——从这一刻起，你查的不是一案，是一世。",
    },
    mq_chaxian: {
      name: "主线：看不见的买家", type: "main",
      desc: "灭门者不伤山下凡人、不劫库房灵石，专杀人、专烧殿——这不是仇杀，是灭口。顺着信物的线查：多宝阁的销赃册、天机楼的消息网，总有人经手过「不该出世的东西」。",
      auto: () => storyStage() === 1,
      objectives: [
        { text: () => "多宝阁：查灭门当夜的销赃记录（300 文）", done: () => !!S.flags.l2Duobao },
        { text: () => "天机楼：买一条消息（500 文）", done: () => !!S.flags.l2Tianji },
      ],
      rewardFn: () => { if (typeof META !== "undefined") { META.story.stage = 2; saveMeta(); } return applyReward({ points: 60, cult: 20 }); },
      doneText: "两条线在同一处断了——经手人的代号「灰鹭」，不属于魔道六宗的任何一宗。买主，是个不存在的人。",
    },
    mq_duoxin: {
      name: "主线：了断夺信", type: "main",
      get desc() { return (typeof META !== "undefined" && META.story && META.story.relic === "taken")
        ? "斗笠人拿走玉佩之后，它出现在了魔道的暗市里。去夺回来——或者，让它去吧。"
        : "你怀里的半块玉佩，灭门者隔了一世还在惦记。他们不会一直客气。"; },
      auto: () => storyStage() === 2,
      objectives: [{ text: () => (typeof META !== "undefined" && META.story && META.story.relic === "taken") ? "循线夺回信物，或亲手放弃" : "了断魔道夺信这桩因果", done: () => !!S.flags.l2Resolve }],
      rewardFn: () => { if (typeof META !== "undefined") { META.story.stage = 3; saveMeta(); } return applyReward({ points: 80, dao: 2 }); },
      doneText: "这桩因果翻篇了。怎么翻的，江湖会替你记住。",
    },
    mq_zhenxiang: {
      name: "主线：拼图", type: "main",
      desc: "听雨楼收天下消息。把你两世的遭遇拼在一起——掐着时辰的灭门、不存在的买主、上古信物——楼里的老执事听完，沉默了很久，然后翻出了一册百年前的旧档。",
      auto: () => storyStage() === 3,
      objectives: [{ text: () => "听雨楼：听完那册旧档", done: () => !!S.flags.l2Truth }],
      rewardFn: () => { if (typeof META !== "undefined") { META.story.stage = 4; saveMeta(); } return applyReward({ points: 120, dao: 3 }); },
      doneText: "旧档合上的那一刻，拼图成了：世间有一只看不见的手，在安排强者相杀，在喂养这场三万年不止的乱。再往上走——灵阶、玄阶、圣域。站得够高，才看得见那只手的胳膊。",
    },
    /* ===== 主线 · 卷三 大世之争（构件已备，此卷将其锁成一条明线）=====
       涨潮大世五域争锋（mq_dingfeng 修行线并行）→ 亲历断灵大劫 → 听完裂缝低语（吞世者递话）→ 问天（系统异样暴露）。终点之后，归墟终局自启。 */
    mq_dashi: {
      name: "主线：大世之争", type: "main",
      desc: "涨潮大世，秘境频出、天骄并起，你被裹入五域争锋。断灵大劫的征兆已在天边聚云——老祖们接连「莫名寻衅」，而系统开始「恰好」把你推向北方。站住，看清这只手是怎么运作的。",
      auto: () => (S.quests.done || []).includes("mq_dingfeng"),
      objectives: [
        { text: () => `亲历断灵大劫之威（劫数 ${Math.min(S.flags.doomLv || 0, 4)} / 风起）`, done: () => (S.flags.doomLv || 0) >= 1 || !!S.flags.devourSlain },
        { text: () => "听完界壁裂缝里的「低语」（北地 · 渊口）", done: () => !!S.flags.devourWhisper },
        { text: () => "向「系统」问出那句话", done: () => !!S.flags.sysQuestioned },
      ],
      reward: { points: 200, dao: 5 },
      doneText: "低语听过，问天问过。大劫是天罚，还是人喂出来的——你心里已经有了答案的轮廓。它要的那缕「鸿蒙紫气」，天道要的那把刀，都是局。归墟在北，它又要去进食了。",
    },

    /* ===== 仙品任务（第十一章 · 隐藏设定） =====
       伏笔碎屑（coincidence）攒够三笔，尘封的卷宗自行浮现——只留痕、不点破、不命名。
       被动触发、不受催办（仙品不按常理出牌）；目标靠剧情际遇推进，无拜访动作。 */
    xian_henji: {
      name: "仙品任务：雪泥鸿爪", type: "xian", passive: true,
      desc: "那些「巧合」连在一起，就不像巧合了。破庙的雪、城隍庙的老墙、行迹古怪的贵人——鸿爪划过雪泥，总要留下点什么。去找到它。",
      auto: () => (S.flags.coincidence || 0) >= 3,
      objectives: [
        { text: () => `碎屑上的纹路（巧合之痕 ${Math.min(S.flags.coincidence || 0, 3)} / 3）`, done: () => (S.flags.coincidence || 0) >= 3 },
        { text: () => "寻得「不该存在的东西」", done: () => !!S.flags.xianRelic },
        { text: () => "为它做个了断", done: () => !!S.flags.xianChoice },
      ],
      rewardFn: () => { S.flags.xianTouched = 1; return applyReward({ points: 100, luckCharm: 1 }); },
      doneText: "信物离手的那一刻，你忽然觉得有什么视线移开了——又好像从来没有过。卷宗合上，这一页没有署名。",
    },

    /* ===== 支线 ===== */
    sq_laogaitou: {
      name: "支线：老丐头的心愿", type: "side",
      desc: "老丐头咳得像要散架，却总把最暖的位置让给你。他没什么可求的——只想要一个肯听他讲完故事的人。",
      offer: () => (S.npc["老丐头"] || 0) >= 20,
      offerText: "老丐头招你坐到火边，欲言又止：「娃儿，陪我……听我说段陈年旧事？」",
      objectives: [{ npc: "老丐头", need: 60, text: () => `老丐头的托付（缘分 ${S.npc["老丐头"] || 0} / 60）`, done: () => (S.npc["老丐头"] || 0) >= 60 }],
      reward: { points: 30, cult: 10, flag: "laogaitouWish" },
      doneText: "老丐头浑浊的眼睛亮了：「好，好。」他从怀里摸出半张发黄的纸——是半张旧地图。",
    },
    sq_zhou: {
      name: "支线：药庐的知遇", type: "side",
      desc: "周先生嘴上骂你朽木，手里的活却总在教你。识药过半、缘分到份，他许你一件东西。",
      offer: () => S.job === "药庐学徒",
      offerText: "周先生撂下药杵，忽然道：「小子，识得几味药了？答得上来，老夫教你点真东西。」",
      objectives: [
        { text: () => `识药技艺（${Math.round(S.skills["识药"] || 0)} / 50）`, done: () => (S.skills["识药"] || 0) >= 50 },
        { npc: "周先生", need: 40, text: () => `周先生的认可（缘分 ${S.npc["周先生"] || 0} / 40）`, done: () => (S.npc["周先生"] || 0) >= 40 },
      ],
      reward: {},
      rewardFn: () => {
        if (!S.inv.yinqi) { techniqueUnlockFx("yinqi"); S.inv.yinqi = 1; computeMods(); return "获得《引气诀》（1 阶功法）——周先生压箱底的真东西"; }
        applyReward({ points: 40 }); return "万象点 +40（引气诀早已在手，他多给了你些盘缠）";
      },
      doneText: "周先生从柜底取出一册油布包着的旧书，塞进你怀里：「别让药炉熄了，也别让心气熄了。」",
    },
    sq_xihou: {
      name: "支线：细猴的归处", type: "side",
      desc: "那个比你还瘦的小贼，手快，眼神更快。他偷的不是钱，是活路。给他指条道，或给他一顿饭。",
      offer: () => (S.npc["小贼细猴"] || 0) >= 10, // 须先「放了他」结下善缘；若搜身结仇（缘分为负），他躲你还来不及，不会来投奔
      offerText: "细猴缩在墙根，见你来了也不跑——他在等你开口。",
      objectives: [{ npc: "小贼细猴", need: 40, text: () => `细猴的信服（缘分 ${S.npc["小贼细猴"] || 0} / 40）`, done: () => (S.npc["小贼细猴"] || 0) >= 40 }],
      reward: { points: 20, dao: 1, item: "heimu:3" },
      doneText: "细猴把三个黑馍揣进怀里，朝你重重点头：「哥，以后你的口袋，我罩着。」",
    },
    /* ===== 炼丹炼器材料支线（22:41 补丁）：主材只走三通道——任务奖励/NPC 交易/击杀取材 ===== */
    sq_dan_cai: {
      name: "支线：丹材有缺", type: "side", giver: "周先生",
      desc: "丹炉已点，料却未备。周先生把一张药单拍给你：主材不上坊市，只走三条正路——任务、交易、取材。跑一趟药市，把该备的备齐。",
      offer: () => hasProfession("danshi"),
      offerText: "周先生把一张药单拍在你面前：「炉都点了，料呢？」",
      objectives: [{ text: () => { const st = (((S.quests || {}).acceptDay) || {}).sq_dan_cai; return `跑腿采买（${st == null ? 0 : Math.min(2, S.day - st)} / 2 日）`; }, done: () => { const st = (((S.quests || {}).acceptDay) || {}).sq_dan_cai; return st != null && S.day - st >= 2; } }],
      rewardFn: () => {
        S.mats = S.mats || {};
        S.mats["赤血芝"] = (S.mats["赤血芝"] || 0) + 1;
        S.mats["灵炭"] = (S.mats["灵炭"] || 0) + 2;
        let extra = "";
        if (!(S.inv.ludian > 0) && Math.random() < 0.5) { S.inv.ludian = 1; extra = "、青铜丹炉 ×1"; }
        return `赤血芝 ×1、灵炭 ×2${extra}`;
      },
      doneText: "药市归来，周先生验过货色，点了点头：「像回事。记住——好丹师的第一课，是认得什么料值得用命去换。」",
    },
    sq_qi_cai: {
      name: "支线：器料之托", type: "side", giver: "云游器师",
      desc: "开炉炼器，先得有料。云游师傅说他的库袋里存着好精铁，可手艺不能白传——替他跑两天腿，坯料分你一块。",
      offer: () => hasProfession("qishi"),
      offerText: "云游师傅把行囊往肩上一搭：「想抡锤？先替我跑两天腿——袋里的坯，分你一块。」",
      objectives: [{ text: () => { const st = (((S.quests || {}).acceptDay) || {}).sq_qi_cai; return `跑腿出力（${st == null ? 0 : Math.min(2, S.day - st)} / 2 日）`; }, done: () => { const st = (((S.quests || {}).acceptDay) || {}).sq_qi_cai; return st != null && S.day - st >= 2; } }],
      rewardFn: () => {
        S.mats = S.mats || {};
        S.mats["精铁坯"] = (S.mats["精铁坯"] || 0) + 1;
        S.mats["灵炭"] = (S.mats["灵炭"] || 0) + 2;
        let extra = "";
        if (!(S.inv.lianchui > 0) && Math.random() < 0.5) { S.inv.lianchui = 1; extra = "、精铁炼锤 ×1"; }
        return `精铁坯 ×1、灵炭 ×2${extra}`;
      },
      doneText: "云游师傅把一块精铁坯抛给你：「料正，火才正。去吧，锤底下见真章。」",
    },

    /* ===== 灵根专属支线：专属法术唯对应灵根可修（data.js SPELLS linggen 字段） ===== */
    sq_za_diji: {
      name: "支线：五份地基", type: "side",
      desc: "五行均分，各亲和二十。旁人笑你废根，你自己知道——前期慢，是在打五份地基。气海既开，把这份「慢」走成「全」。",
      offer: () => S.linggen === "za" && S.realm >= 3,
      offerText: "夜深人静，你内视气海——五缕灵力各行其道，互不侵扰。一个念头浮上来：五份地基，能不能打出一份别人没有的杀伐？",
      objectives: [
        { text: () => `踏入聚气境，以五份地基证道（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 5 },
        { text: () => `修习法术，触类旁通（${knownSpells().length} / 2 门）`, done: () => knownSpells().length >= 2 },
      ],
      rewardFn: () => { learnSpell("sp_wuxingci"); applyReward({ points: 40 }); return "习得杂灵根专属法术「五行刺」，万象点 +40"; },
      doneText: "五气随手而转，刺出皆成兵——杂灵根不是废，是五行俱全。你的故事，在说书人那里有了新段子。",
    },
    sq_za_nixi: {
      name: "隐藏：杂灵根的逆袭", type: "side", passive: true,
      desc: "测灵碑前的一寸微光，仙门拒收；但凡阶之上还有灵阶——以杂灵根之身踏入灵阶，再把一门法术磨至圆满，让「逆袭」从安慰变成实证。",
      auto: () => S.linggen === "za" && S.realm >= 6 && (S.quests.done || []).includes("sq_za_diji"),
      objectives: [
        { text: () => `踏入灵泉境，脱凡入灵（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 7 },
        { text: () => `任一法术修至圆满（${knownSpells().filter(sp => spellProf(sp.id) >= spellCap(sp)).length} / 1 门）`, done: () => knownSpells().some(sp => spellProf(sp.id) >= spellCap(sp)) },
      ],
      rewardFn: () => { learnSpell("sp_wuchao"); applyReward({ points: 80, attr: { int: 0.5 } }); return "习得杂灵根专属法术「五气朝元」，智力 +0.5，万象点 +80"; },
      doneText: "五气朝元，五行归一——当年碑前被拒的杂灵根，站上了灵阶。逆袭是设定，不是安慰。",
    },
  };

  /* ===== 变异灵根试炼（六脉）：天生特性之外各有一门专属法术，只认本根骨——以战养术，施法五次，它自会认主 ===== */
  const VARIANT_SPELL = { lei: "sp_palm", jian: "sp_jianzhi", bing: "sp_bingfeng", feng: "sp_fengren", du: "sp_duzhang", ying: "sp_yingxi" };
  if (typeof LINGGENS !== "undefined" && typeof SPELLS_BY_ID !== "undefined") for (const lg in VARIANT_SPELL) {
    const spId = VARIANT_SPELL[lg], Lg = LINGGENS[lg];
    DEFS["sq_lg_" + lg] = {
      name: `支线：${Lg.name}的试炼`, type: "side",
      desc: `${Lg.desc}——变异灵根是天赋，也是枷锁：这一门的专属法术，只认你这一脉的根骨。`,
      offer: () => S.linggen === lg && S.realm >= 5,
      offerText: `气海之中，${Lg.name}的灵力躁动不安——它在等一场真正的战斗，把血脉里的东西逼出来。`,
      objectives: [{ text: () => `实战中施法（${Math.min(S.stats.spellCasts || 0, 5)} / 5 次）`, done: () => (S.stats.spellCasts || 0) >= 5 }],
      rewardFn: () => { learnSpell(spId); applyReward({ points: 30 }); return `习得${Lg.name}专属法术「${SPELLS_BY_ID[spId].name}」，万象点 +30`; },
      doneText: "血脉里的东西被逼了出来——从此这门术，只认你。",
    };
  }

  /* ===== 副职业入行支线（设定补丁 v5 · 第三章 职业系统） =====
     遇到生活职业者（行当 NPC 缘分 ≥20「好感」）→ 邀约入行支线 →
     得师傅认可（缘分 ≥40「贵人」）+ 跟随见习 2 日 → 拜师入册，解锁该职业。
     转轨职业（灵品）另需原职业满级 + 更高缘分；账房先生需智力 ≥5。
     定义由 PROFESSIONS（data.js）生成，奖励即「解锁副职业」。 */
  if (typeof PROFESSIONS !== "undefined") {
    for (const pid in PROFESSIONS) {
      const P = PROFESSIONS[pid];
      if (P.dynamic) continue; // 云游师傅一脉（丹师/器火）走下方专属支线，不自动生成
      DEFS["pq_" + pid] = {
        name: `支线：入行 · ${P.name}`, type: "side", giver: P.master,
        desc: P.questDesc,
        offer: () => profReqMet(P) && !hasProfession(pid),
        offerText: P.offerText,
        objectives: [
          { npc: P.master, need: 40, text: () => `${P.master}的认可（缘分 ${S.npc[P.master] || 0} / 40）`, done: () => (S.npc[P.master] || 0) >= 40 },
          { text: () => { const st = (((S.quests || {}).acceptDay) || {})["pq_" + pid]; return `跟随见习（${st == null ? 0 : Math.min(2, S.day - st)} / 2 日）`; }, done: () => { const st = (((S.quests || {}).acceptDay) || {})["pq_" + pid]; return st != null && S.day - st >= 2; } },
        ],
        reward: {},
        rewardFn: () => { const n = unlockProfession(pid); return n ? `解锁${P.tierName}职业「${n}」` : ""; },
        doneText: "", // 解锁文案由 unlockProfession 播报
      };
    }
  }

  /* ===== 云游师傅一脉（23:10 补丁）：丹师/器火不系固定 NPC =====
     名号每世随机生成（masterOf）；前置职业熟练度登顶即瓶颈——瓶颈时云游师傅随机现身；
     须手动承接支线方可进阶/转轨（熟练度满绝不自动进阶，固定身份已废除）。 */
  const dynDayObj = id => ({ text: () => { const st = (((S.quests || {}).acceptDay) || {})[id]; return `跟随见习（${st == null ? 0 : Math.min(2, S.day - st)} / 2 日）`; }, done: () => { const st = (((S.quests || {}).acceptDay) || {})[id]; return st != null && S.day - st >= 2; } });
  const dynBondObj = (pid, need) => ({ get npc() { return masterOf(pid); }, need, text: () => `${masterOf(pid)}的认可（缘分 ${S.npc[masterOf(pid)] || 0} / ${need}）`, done: () => (S.npc[masterOf(pid)] || 0) >= need });
  DEFS.dyn_tiejiang = {
    name: "支线：入行 · 铁匠学徒", type: "side", giver: "云游铁匠",
    desc: "炉边缺个打杂的。器火一脉与药庐不同——师傅云游四方，名号每世不同，遇见了就是缘。",
    offer: () => {
      if (hasProfession("tiejiang")) return false;
      if ((S.npc[masterOf("tiejiang")] || 0) >= 20) { // 入行机缘已近：机缘册至此才翻开这一页
        revealMaster("tiejiang", `【机缘册】你听闻一位云游铁匠的名号——「${masterOf("tiejiang")}」。炉火的缘分，快到了。`);
        return true;
      }
      return false;
    },
    offerText: "炉火的召唤：你听闻一位铁匠师傅正在寻个肯下力气、耐得住烟火的学徒。",
    objectives: [dynBondObj("tiejiang", 40), dynDayObj("dyn_tiejiang")],
    reward: {},
    rewardFn: () => { const n = unlockProfession("tiejiang"); return n ? `解锁凡品职业「${n}」（师承${masterOf("tiejiang")}）` : ""; },
    doneText: "第一炉火烧透，你学会了看火色。铁坯在你手里，慢慢开始听话。",
  };
  DEFS.dyn_zhushi = {
    name: "支线：转轨 · 铸师", type: "side", giver: "云游铁匠",
    desc: "铁匠学徒做到凡品之巅，便是瓶颈。想再进一步，须见过更大的炉、打过更硬的铁——铸师之路，从一块不听话的铁坯开始。",
    offer: () => {
      const q = profList()["tiejiang"];
      if (!q || q.lv < (TABLES.PROF.tierCaps["0"] || 3) || hasProfession("zhushi")) return false;
      if ((S.npc[masterOf("zhushi")] || 0) >= 20) { // 前置（铁匠学徒）登顶、瓶颈之期：机缘册翻开铸师一页
        revealMaster("zhushi", `【机缘册 · 瓶颈之期】你的锤声已至凡品之巅。你听闻一位铸师的名号——「${masterOf("zhushi")}」。`);
        return true;
      }
      return false;
    },
    offerText: "瓶颈之期：你的铁匠手艺已至凡品之巅。一位铸师听闻了你的锤声，循着火星寻到了你。",
    objectives: [dynBondObj("zhushi", 80), dynDayObj("dyn_zhushi")],
    reward: {},
    rewardFn: () => { const n = unlockProfession("zhushi"); return n ? `解锁灵品职业「${n}」（师承${masterOf("zhushi")}）` : ""; },
    doneText: "大炉开火，百炼始成。你终于明白什么叫「铁过百遍，其义自见」。",
  };
  DEFS.sq_dandao = { // 丹师进阶：药师（前置）熟练度登顶 → 云游丹师现身，须手动承接
    name: "支线：进阶 · 丹道有缘", type: "side", giver: "云游丹师",
    desc: "药师造诣已至灵品之巅，进无可进。丹道不系于一家一店——云游四方的丹师们，只在前路断绝处现身。瓶颈之期，机缘已叩门。",
    offer: () => {
      if (hasProfession("danshi")) return false;
      const q = profList()["yaoshi"];
      if (!q || q.lv < (TABLES.PROF.tierCaps["1"] || 5)) return false;
      const m = masterOf("danshi");
      if (!S.flags.danMasterArrive) { S.flags.danMasterArrive = 1; addNpc(m, 20); sys(`【瓶颈之期】药师之路已至绝顶。一位云游丹师「${m}」听闻了你的名号，循着药香寻到了你。`); }
      return true;
    },
    offerText: "一位背着药篓的游方人拦下你：「小友，识药坐堂皆已见顶——可愿随我学那『掌炉』之道？」",
    objectives: [dynBondObj("danshi", 40), dynDayObj("sq_dandao")],
    reward: {},
    rewardFn: () => { const n = unlockProfession("danshi"); return n ? `解锁灵品职业「${n}」（师承${masterOf("danshi")}）` : ""; },
    doneText: "丹炉第一炉火光亮起。云游师傅没说话，只把随身的旧丹铲搁在了你手心。",
  };
  DEFS.sq_qidao = { // 炼器师进阶：铸师（前置）熟练度登顶 → 云游器师现身，须手动承接
    name: "支线：进阶 · 器火相传", type: "side", giver: "云游器师",
    desc: "铸师做到灵品之巅，凡火凡铁再无可教你。真正的炼器师云游天下，只在前路断绝处现身——瓶颈之期，机缘已叩门。",
    offer: () => {
      if (hasProfession("qishi")) return false;
      const q = profList()["zhushi"];
      if (!q || q.lv < (TABLES.PROF.tierCaps["1"] || 5)) return false;
      const m = masterOf("qishi");
      if (!S.flags.qiMasterArrive) { S.flags.qiMasterArrive = 1; addNpc(m, 20); sys(`【瓶颈之期】铸师之路已至绝顶。一位云游器师「${m}」听闻了你的名号，循着你的锤声寻到了你。`); }
      return true;
    },
    offerText: "一位风尘仆仆的背锤人蹲在你的炉边看了半晌：「火候有了灵性。可愿随我学那『通灵之器』的炼法？」",
    objectives: [dynBondObj("qishi", 40), dynDayObj("sq_qidao")],
    reward: {},
    rewardFn: () => { const n = unlockProfession("qishi"); return n ? `解锁灵品职业「${n}」（师承${masterOf("qishi")}）` : ""; },
    doneText: "异地之火点燃，风箱拉出的风声像龙吟。云游师傅咧嘴：「从今天起，器火一脉有你一支。」",
  };

  /* ===== 终局 · 卷三 三方棋局（设定集第十一章：天道腐化 / 吞世者 / 五结局） =====
     真相分层：先驱遗痕（3 处）→ 仙品「天有二心」（低语 + 问天）→ 仙品「归墟终局」（入缝、终结进食、终局抉择）。
     五结局由引擎终局场景结算（game.js endGame）：一般「守界人」｜坏「炉鼎」｜完美「登仙超脱」｜特殊「弑天」「换天」｜隐藏「界外之路」。 */
  const pioneerCount = () => ["pioneer_kezi", "pioneer_xinwu", "pioneer_fen"].filter(f => S.flags[f]).length;
  Object.assign(DEFS, {
    mq_dingfeng: {
      name: "主线：大世之巅", type: "main",
      desc: "凡阶、灵阶、玄阶……你走的每一步，都有一只看不见的手替你校正方向。登顶的路上，留意那些「不该存在的东西」——它们比功法更值钱。",
      auto: () => (S.quests.done || []).includes("mq_dengfeng"),
      objectives: [
        { text: () => `踏入玄阶（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 13 },
        { text: () => `踏入圣域（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 19 },
        { text: () => `集齐先驱宿主遗痕（${pioneerCount()} / 3）`, done: () => pioneerCount() >= 3 },
      ],
      reward: { points: 300, dao: 5 },
      doneText: "圣域之巅，四顾无人。牢房刻字、半张信物、无名孤坟——你不是第一把刀。这个认知，比任何功法都烫。",
    },
    xian_truth: {
      name: "仙品任务：天有二心", type: "xian", passive: true,
      desc: "鸿爪之下，雪泥全开。牢房墙上的刻字、裂缝边缘的背影、读不出你命格的那盏灯——它们指向同一件事：天，有二心。",
      auto: () => pioneerCount() >= 3 && (S.flags.coincidence || 0) >= 6,
      objectives: [
        { text: () => "听完界壁裂缝里的「低语」（北地 · 渊口）", done: () => !!S.flags.devourWhisper },
        { text: () => "向「系统」问出那句话", done: () => !!S.flags.sysQuestioned },
      ],
      rewardFn: () => { S.flags.truthKnown = 1; return applyReward({ points: 200, dao: 5 }); },
      doneText: "【跑好你自己的。】它只回了这五个字。但你听懂了——刀用完了，是要回炉的。从今日起，它写下的每一行字，你都多看出一层意思。",
    },
    mq_guixu: {
      name: "仙品任务：归墟终局", type: "xian", passive: true,
      desc: "断灵大劫的周期将至，它又要去天地尽头「进食」了。渊口裂缝——守夜人守了不知多少年的那道缝，这一次，换你走进去。",
      auto: () => S.realm >= 21 && pioneerCount() >= 3 && (typeof castMet === "function") && castMet("shouyeren"),
      objectives: [
        { text: () => `圣域五境之上（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 21 },
        { text: () => "得守夜人引路，踏入渊口裂缝", done: () => !!S.flags.guixuEnter },
        { text: () => "终结那场持续三万年的「进食」", done: () => !!S.flags.devourSlain },
      ],
      reward: { points: 500 },
      doneText: "归墟深处，进食停了。三万年的账，今日平了一半——剩下那一半，在天上。",
    },
  });

  /* ---------- 状态 ---------- */
  function ensure() {
    if (!S.quests) S.quests = { active: [], done: [], failed: [], refused: {} };
    const q = S.quests;
    if (!q.stamp) q.stamp = {};        // 激活/最近一次推进的日子
    if (!q.offerStamp) q.offerStamp = {}; // 支线邀约条件首次成立的日子
    if (!q.prog) q.prog = {};          // 目标完成数快照（用于识别「推进」）
    if (!q.acceptDay) q.acceptDay = {}; // 接取日子（见习类目标用它计时，不被推进刷新干扰）
    return q;
  }
  const isActive = id => ensure().active.includes(id);
  const isDone = id => ensure().done.includes(id);
  const isFailed = id => ensure().failed.includes(id);
  const touched = id => isActive(id) || isDone(id) || isFailed(id);

  function progOf(id) {
    const d = DEFS[id];
    let n = 0;
    for (const o of d.objectives) { try { if (o.done()) n++; } catch (e) {} }
    return n;
  }
  function activate(id) {
    if (touched(id)) return;
    const q = ensure();
    q.active.push(id);
    q.stamp[id] = S.day; q.acceptDay[id] = S.day; q.prog[id] = progOf(id);
    const d = DEFS[id];
    const typeLabel = d.type === "main" ? "主线" : d.type === "xian" ? "仙品" : "支线";
    sys(`【任务·${typeLabel}】「${d.name}」已录入天道卷宗。`);
    log(d.desc, "dim");
    try { chronicle(`承接${typeLabel}「${d.name}」`, "quest"); } catch (e) {}
  }

  function complete(id) {
    const q = ensure();
    q.active = q.active.filter(x => x !== id);
    if (!q.done.includes(id)) q.done.push(id);
    const d = DEFS[id];
    const extra = d.rewardFn ? d.rewardFn() : applyReward(d.reward);
    sys(`【任务完成】「${d.name}」${extra ? "——" + extra : ""}`);
    log(d.doneText, "good");
    try { chronicle(`完成「${d.name}」`, "quest"); } catch (e) {}
    toast(`任务完成 · ${d.name}`);
    gainAch("quest1");
    try { for (const pid in (S.professions || {})) profExpGain(pid, d.type === "main" ? 3 : 2); } catch (e) {} // 行业事件：关键经历涨职业经验（3.3）
    renderPanel();
  }

  function fail(id, reason) {
    const q = ensure();
    q.active = q.active.filter(x => x !== id);
    if (!q.failed.includes(id)) q.failed.push(id);
    if (id === "mq_qingyan") S.flags.qy_failDay = S.day; // 宗门应试失败日记账：五日后可补考（防主线死锁）
    sys(`【任务失败】「${DEFS[id].name}」——${reason}`);
    try { chronicle(`「${DEFS[id].name}」未成——${String(reason).slice(0, 30)}`, "quest-fail"); } catch (e) {}
    renderPanel();
  }

  /* ---------- 每回合检查：激活主线 / 结算目标 / 记录搁置 ---------- */
  function check() {
    if (!S || S.over) return;
    const q = ensure();
    for (const id in DEFS) {
      const d = DEFS[id];
      if (!touched(id) && d.auto) { try { if (d.auto()) activate(id); } catch (e) {} }
      // 支线邀约条件首次成立的日子（催办计时的起点）
      if (!touched(id) && d.offer && !q.offerStamp[id]) { try { if (d.offer()) q.offerStamp[id] = S.day; } catch (e) {} }
    }
    for (const id of [...q.active]) {
      const d = DEFS[id];
      try {
        const p = progOf(id);
        if (p !== q.prog[id]) { q.prog[id] = p; q.stamp[id] = S.day; } // 有推进即刷新搁置计时
        if (d.objectives.every(o => o.done())) complete(id);
      } catch (e) {}
    }
  }

  /* ---------- 搁置任务（久置未推进，由系统检索剧情并询问是否推进） ----------
     主线 4 日无推进、支线 6 日无人问津（未接或接了没动），视为搁置。
     被动任务（如「活过这个冬天」）不催；推辞后 3 日冷却；催办全局间隔 2 日。 */
  const MAIN_STALE = 4, SIDE_STALE = 6, NUDGE_GAP = 2;
  function staleList() {
    if (!S || S.over) return [];
    const q = ensure();
    const out = [];
    for (const id in DEFS) {
      const d = DEFS[id];
      if (d.passive) continue;
      if (isDone(id)) continue;
      const lastRefuse = q.refused[id] || -99;
      if (S.day - lastRefuse < 3) continue;
      let since = null, kind = null;
      if (isActive(id) || isFailed(id)) {
        if (d.type !== "main" && !isActive(id)) continue; // 支线失败后不再催
        since = q.stamp[id] != null ? q.stamp[id] : S.day;
        kind = d.type;
        const lim = d.type === "main" ? MAIN_STALE : SIDE_STALE;
        if (S.day - since >= lim) out.push({ id, d, days: S.day - since, kind, failed: isFailed(id) });
      } else if (d.offer && q.offerStamp[id]) { // 支线：条件已成立却迟迟未接
        since = q.offerStamp[id];
        if (S.day - since >= SIDE_STALE) out.push({ id, d, days: S.day - since, kind: "side", unoffered: true });
      }
    }
    out.sort((a, b) => (a.kind === b.kind ? b.days - a.days : a.kind === "main" ? -1 : 1)); // 主线优先，同级取搁置最久
    return out;
  }
  function nudge() { // 每回合至多一条催办；展示即计入全局间隔
    const q = ensure();
    if (S.day - (q.lastNudgeDay || -99) < NUDGE_GAP) return null;
    const list = staleList();
    if (!list.length) return null;
    q.lastNudgeDay = S.day;
    return list[0];
  }
  /* 登门拜访的演出文案（推进缘分目标的实质动作） */
  const VISIT_LINES = [
    n => `你专程去寻「${n}」，陪他说了半日话，顺手把杂活揽了过来。`,
    n => `你给「${n}」捎了些吃食。对方嘴上不说，眼神暖和了几分。`,
    n => `你替「${n}」跑了一趟腿，回来时天已擦黑。`,
    n => `「${n}」见你登门有些意外，末了还是留你多坐了一会儿。`,
  ];
  function questAct(id) { // 催办/AI 选项的「推进」出口：花一个时段，实质推进（01:55 修复——此前只打印进度，任务永远原地踏步）
    const d = DEFS[id];
    if (!d) { advanceSlot(); return; }
    if (id === "mq_qingyan" && !S.flags.qingyan && !S.flags.qy_za_reject && S.day >= 11 && (!S.flags.qy_step1 || isFailed("mq_qingyan"))) { startTrials(); return; }
    if (!touched(id)) { activate(id); advanceSlot(); return; }
    // 有未完成的「缘分」目标：登门拜访、出力相助——这是玩家主动花时段推进，记作特殊剧情（不受日常一次之限），且必定有进展
    const bond = d.objectives.find(o => o.npc && (() => { try { return !o.done(); } catch (e) { return false; } })());
    if (bond) {
      const before = S.npc[bond.npc] || 0;
      addNpc(bond.npc, 8, { special: true });
      const after = S.npc[bond.npc] || 0;
      log(VISIT_LINES[Math.floor(Math.random() * VISIT_LINES.length)](bond.npc), "dim");
      log(`（${bond.npc} 缘分 ${Math.round(before)} → ${Math.round(after)}，目标 ${bond.need}）`, "dim");
      try { chronicle(`为「${d.name.replace(/^主线：|^支线：|^凡品任务：/, "")}」奔走：拜访${bond.npc}`, "quest"); } catch (e) {}
      try { check(); } catch (e) {} // 缘分到档当场结算完成
      advanceSlot();
      return;
    }
    sys(`【卷宗】「${d.name}」当前进度：`);
    d.objectives.forEach(o => { try { log(`${o.done() ? "☑" : "☐"} ${o.text()}`, "dim"); } catch (e) {} });
    advanceSlot();
  }
  function nudgeAct(id) {
    const d = DEFS[id];
    if (!d) { advanceSlot(); return; }
    setChoices([
      { label: `推进「${d.name.replace(/^主线：|^支线：|^凡品任务：/, "")}」`, hint: "择日不如撞日。", cls: "quest", fn: () => questAct(id) },
      { label: "再缓几日", hint: "机缘不等人，但也不会一夜就跑光。", cls: "quest-dim", fn: () => { refuse(id); advanceSlot(); } },
    ]);
  }

  /* ---------- 任务选项（GM 回合注入） ---------- */
  function offers() {
    if (!S || S.over) return [];
    ensure();
    const list = [];
    // 主线行动：拜入出生地所属小宗门（五域各一，三关应试）；失败后五日可补考（三关重考，防主线死锁）
    const qyRetry = isFailed("mq_qingyan") && !S.flags.qingyan && !S.flags.qy_za_reject && S.day >= ((S.flags.qy_failDay || 0) + 5);
    if ((isActive("mq_qingyan") && !S.flags.qy_step1 && S.day >= 11) || qyRetry) {
      list.push({
        kind: "act", type: "main", label: qyRetry ? `重整旗鼓，再闯${curSect().name}山门（补考三关）` : `前往${curSect().name}山门，闯三关应试`,
        hint: S.linggen === "za"
          ? "测灵碑择根而取——杂灵根灵光不过尺，此路多半不通。但不走这一趟，心不甘。"
          : "测灵碑、问心、演武。败则今年无缘。",
        act: () => startTrials(),
      });
    }
    // 主线行动：卷一后半段（外门大比 → 后山枯井 → 灭门之夜回山）
    if (isActive("mq_dabi") && !S.flags.dabiJoin) {
      list.push({
        kind: "act", type: "main", label: `参加${curSect().name}岁末大比`,
        hint: "岁末大比，只取前十。长老们会来看台。",
        act: () => startDabi(),
      });
    }
    if (isActive("mq_jing") && !S.flags.jingGo) {
      list.push({
        kind: "act", type: "main", label: `后山枯井：${elderName()}的差事`,
        hint: "枯了三百年的井冒灵气。长老说：只探，不取。",
        act: () => startJing(),
      });
    }
    if (isActive("mq_mie") && !S.flags.mieStart) {
      list.push({
        kind: "act", type: "main", label: "宗门火讯：连夜回山",
        hint: "传讯符烧到一半就灭了。晚了，可能就见不到了。",
        act: () => startMie(),
      });
    }
    // 主线行动：卷二 风起（跨世链，进度在 META.story.stage）
    if (isActive("mq_ruins") && !S.flags.l2Ruins) {
      list.push({
        kind: "act", type: "main", label: `重访${burntSect().name}焦土`,
        hint: "上一世的火，隔着一世也烫。",
        act: () => startRuins(),
      });
    }
    if (isActive("mq_chaxian")) {
      if (!S.flags.l2Duobao) list.push({
        kind: "act", type: "main", label: "多宝阁：查销赃旧账（300 文）",
        hint: "灭门当夜的货，总要有人经手。",
        act: () => startDuobao(),
      });
      if (!S.flags.l2Tianji) list.push({
        kind: "act", type: "main", label: "天机楼：买一条消息（500 文）",
        hint: "买消息去天机楼，买命去多宝阁。",
        act: () => startTianji(),
      });
    }
    if (isActive("mq_duoxin") && !S.flags.l2Resolve) {
      const taken = (typeof META !== "undefined") && META.story && META.story.relic === "taken";
      list.push({
        kind: "act", type: "main", label: taken ? "暗市线报：夺回信物" : "血河教拜帖：了断夺信",
        hint: taken ? "半块古玉三日后在血河教分舵过手。" : "「贵客怀璧，借观三日。」——有些因果，躲不过，就了断。",
        act: () => startDuoxin(),
      });
    }
    if (isActive("mq_zhenxiang") && !S.flags.l2Truth) {
      list.push({
        kind: "act", type: "main", label: "听雨楼：听完那册旧档",
        hint: "楼里的旧档，比说书人的话本厚，也比它们真。",
        act: () => startZhenxiang(),
      });
    }
    // 支线邀约：情境合适才出现——间隔两日、优先与方才剧情相关者
    if (S.day - (ensure().lastOfferDay || -9) >= 2) {
      const recent = ((S.gmRecent || []).join(">")) + (S.echoLine || "");
      const cands = [];
      for (const id in DEFS) {
        const d = DEFS[id];
        if (!d.offer || touched(id)) continue;
        let ok = false;
        try { ok = d.offer(); } catch (e) { continue; }
        if (!ok) continue;
        const lastRefuse = ensure().refused[id] || -99;
        if (S.day - lastRefuse < 3) continue; // 推辞后隔几日再邀
        const rel = d.giver && recent.includes(d.giver) ? 1 : 0;
        cands.push({ id, d, rel });
      }
      cands.sort((a, b) => b.rel - a.rel);
      if (cands.length) {
        ensure().lastOfferDay = S.day;
        const { id, d } = cands[0];
        list.push({ kind: "quest", id, type: d.type, label: d.name.replace(/^支线：/, "").replace(/^主线：/, ""), hint: "任务邀约" });
      }
    }
    return list;
  }

  function refuse(id) {
    ensure().refused[id] = S.day;
    S.flags["qseen_" + id] = 0; delete S.flags["qseen_" + id]; // 下次邀约重新播报
    log("你暂且推辞了。机缘不等人，但也不会一夜就跑光。", "dim");
  }

  /* ---------- 小宗门三关（主线演出，宗门随出生地地域） ---------- */
  async function startTrials() {
    S.flags.qy_tried = 1; // 应试足迹：主线第一目标「前往山门」就此勾销（成败另说）
    S.flags.qy_step1 = 0; S.flags.qy_step2 = 0; S.flags.qy_step3 = 0; // 补考：三关清零重考
    const qq = ensure(); // 补考即重录卷宗：失败态转回进行态（否则过了三关也拿不到「拜入」任务的完成结算）
    if (qq.failed.includes("mq_qingyan")) { qq.failed = qq.failed.filter(x => x !== "mq_qingyan"); if (!qq.active.includes("mq_qingyan")) qq.active.push("mq_qingyan"); }
    sys(`【你踏上了${curSect().name}山门前的九百级石阶。测灵碑如剑倒插，碑前已排了百余凡人。】`);
    log("外门执事瞥你一眼：「排队。灵光过三尺者，留。」", "dim");
    await lingTest();
  }
  async function lingTest() {
    // 【设定集 · 灵根恒定】杂灵根五行均分，测灵碑灵光不过尺——小宗门不予收录（此主线对杂灵根不可完成）
    if (S.linggen === "za") {
      S.flags.qy_za_reject = 1;
      log(`碑身只浮起一寸微光，五色杂驳，转瞬即散。执事看都懒得细看：「五行均分的杂灵根，碑灵不显——${curSect().name}收不得。回吧。」`, "hurt");
      log("身后有人嗤笑，有人叹息。你攥紧拳头下了山——仙门的梯子抽走了，路，还得自己一镐一镐地凿。", "dim");
      fail("mq_qingyan", `测灵碑前止步：杂灵根灵光不过尺，${curSect().name}不予收录。仙门捷径，此世已断。`);
      sys("【仙途改道】大道朝天，各走一边。隐藏线「杂灵根的逆袭」开启——无门无派，以五份地基自证大道。");
      activate("mq_sanxiu");
      gainCult(5);
      advanceSlot();
      return;
    }
    const r = await AI.judge("luck*8+realm*25+lg+d40>50", judgeState());
    try { console.debug("[判定] 测灵碑", r && r.detail); } catch (e) {}
    if (!r.success) {
      log("碑身只浮起一寸微光便散了。执事摇摇头：「灵韵太薄，回吧。」", "hurt");
      fail("mq_qingyan", "测灵碑灵光未显。待来年，或待修为。");
      gainCult(5);
      advanceSlot();
      return;
    }
    S.flags.qy_step1 = 1;
    if (S.linggen === "tian" || (LINGGENS[S.linggen] && LINGGENS[S.linggen].variant)) {
      log(`碑身灵光冲起五尺，随即「咔」地裂开一道细纹！执事脸色大变，失声：「${linggen().name}……竟是${linggen().name}！」`, "good");
    } else {
      log(`碑身三尺灵光，青碧如水（${linggen().name}）。执事多看了你一眼：「过了。问心关，随我来。」`, "good");
    }
    log(`碑面显化你的五行亲和：${WX_ELS.map(e => `${WX_NAMES[e]} ${wxOf()[e]}`).join(" · ")}。`, "dim");
    heartTest();
  }
  function heartTest() {
    setChoices([
      { label: "如实作答：我欲长生，也欲不再挨饿", hint: "道心可鉴，不欺心。", fn: () => {
        S.flags.qy_step2 = 1; S.daoXin = Math.min(100, S.daoXin + 1);
        log("老者抚须：「不欺心，可教。」", "good");
        wuTest();
      } },
      { label: "拣好听的说：一心向道，别无他念", hint: "欺心之言，全看演技。", fn: async () => {
        const r = await AI.judge("int*8+d20>28", judgeState());
        try { console.debug("[判定] 问心", r && r.detail); } catch (e) {}
        if (r.success) {
          S.flags.qy_step2 = 1;
          log("老者盯了你半晌，终究点头：「口齿伶俐也是本事。过。」", "good");
          wuTest();
        } else {
          log("老者冷笑：「眼神飘忽，欺心。」拂袖而去。", "hurt");
          fail("mq_qingyan", "问心关被逐。心不诚，碑灵不显。");
          advanceSlot();
        }
      } },
    ]);
  }
  function wuTest() {
    log("演武台上，外门教习抱剑而立：「接我十招，或把我打下去。」", "dim");
    combat({ name: `${curSect().name}外门教习`, power: 10, canBeg: false, desc: "（演武较技，点到为止）" }, res => {
      if (res === "win" || res === "cheated") {
        S.flags.qy_step3 = 1;
        S.flags.qingyan = 1; S.sect = curSect().name;
        sys(`【三关皆过。青袍加身，木牌入手——「${curSect().name}外门弟子」。】`);
        log("教习收剑，难得一笑：「有点东西。明日辰时，外门演武场点卯。」", "good");
        check();
      } else {
        fail("mq_qingyan", "演武台惜败。教习留了句话：『冬末还有一次补考。』");
      }
      if (!S.over) advanceSlot();
    });
  }

  /* ---------- 卷一后半段 · 三个主线演出（大比 → 枯井 → 灭门之夜） ---------- */
  /* 外门大比：三阵连过，跻身前十；看台上「恰好」路过的长老（上宗眼线，角色不可知） */
  function startDabi() {
    S.flags.dabiJoin = 1;
    const sect = curSect().name;
    sys(`【${sect}岁末大比。演武台四座，外门弟子只取前十。教习唱名，声落即战。】`);
    log("第一场——「铁塔」赵猛。一个满脸横肉的汉子跳上台，冲你咧嘴：「新来的？小心筋骨。」", "dim");
    combat({ name: "外门师兄赵猛", power: 12, el: "jin", canBeg: false, desc: "（大比较技，点到为止）" }, res => {
      if (res === "win" || res === "cheated") {
        log("赵猛抱拳下台：「兄弟好力气。」看台起了一片嗡嗡声。", "good");
        dabiRound2();
      } else dabiStop(res);
    });
  }
  function dabiRound2() {
    log("第二场——教习韩厉亲自下场压阵：「能接我二十招的，外门不出五人。」", "dim");
    combat({ name: "外门教习韩厉", power: 14, el: "huo", canBeg: false, desc: "（大比较技，点到为止）" }, res => {
      if (res === "win" || res === "cheated") {
        log("韩厉收势，深深看你一眼：「去吧。最后的台子，给你留了个老熟人。」", "good");
        dabiFinal();
      } else dabiStop(res);
    });
  }
  function dabiFinal() {
    const bond = S.npc[curSect().npc] || 0;
    if (bond >= 40) { // 与引路弟子缘分到份：决赛相逢，台下皆惊
      log(`最后一座台——${curSect().npc}抱剑而立，朝你一笑：「我等着一天了。别留手。」`, "dim");
      combat({ name: curSect().npc, power: 16, el: "jin", canBeg: false, desc: "（同门较技，全力以赴）" }, res => {
        if (res === "win" || res === "cheated") {
          addNpc(curSect().npc, 10, { special: true });
          log("双剑相交，三十招后他主动收剑，抱拳大笑：「痛快！这第一，你拿得比我有底气。」", "good");
          dabiWin();
        } else dabiStop(res);
      });
    } else {
      log("最后一座台——外门首席顾长风，通脉境，三年没输过。", "dim");
      combat({ name: "外门首席顾长风", power: 16, el: "feng", canBeg: false, desc: "（大比较技，点到为止）" }, res => {
        if (res === "win" || res === "cheated") dabiWin();
        else dabiStop(res);
      });
    }
  }
  function dabiWin() {
    S.flags.dabiWin = 1;
    chronicle(`${curSect().name}岁末大比跻身前十`, "quest");
    log(`前十的朱榜贴上影壁，你的名字在列。看台上，${elderName()}朝这边多看了两眼——恰好在大比这日「路过」看台的，偏偏是他。`, "good");
    addNpc(elderName(), 20, { special: true });
    applyCore({ coincidence: 1 }); // 伏笔：长老的「恰好」
    check(); // 当场结算 mq_dabi
    if (!S.over) advanceSlot();
  }
  function dabiStop(res) {
    if (res === "fled") log("你跳下了台。教习摇头：「怯战者，不与评。」", "hurt");
    log("大比之路到此为止。朱榜上没有你，但看台上那双眼睛，似乎已经记住了你。", "dim");
    fail("mq_dabi", "大比止步十名之外。来年再战——若有来年。");
    if (!S.over) advanceSlot();
  }
  /* 后山枯井：井下石函里的半块上古信物（仙品任务「雪泥鸿爪」的 xianRelic 由此开启） */
  function startJing() {
    S.flags.jingGo = 1;
    const elder = elderName();
    sys(`【${elder}把你单独叫到偏殿：后山那口枯了三百年的井，昨夜开始往外冒灵气。宗门决定——让你下去看看。】`);
    log(`${elder}把一枚旧铜铃塞进你手心：「井深三十丈，铃响为号。记住——只探，不取。井下的东西，未必是宗门的东西。」他说这话时，眼睛亮得反常。`, "dim");
    addNpc(elder, 5, { special: true });
    chronicle(`受${elder}之托，探后山枯井`, "quest");
    setChoices([
      { label: "先绕井口查探一圈", hint: "智者先看出什么不能吃。", fn: async () => {
        const r = await AI.judge("int*8+d25>40", judgeState());
        if (r.success) {
          S.flags.jingScout = 1;
          log("你俯身细看：井口的青苔断口新鲜，井壁凿痕里隐约有阵纹流转——这不是一口井，是一道封。你默默记下了几处落脚的石棱。", "good");
        } else log("井口除了湿气和一股说不清的旧土味，什么也看不出来。", "dim");
        jingDescend();
      } },
      { label: "系绳下井", hint: "三十丈枯井，绳结与腿脚都是命。", fn: () => jingDescend() },
    ]);
  }
  async function jingDescend() {
    const r = await AI.judge("agi*8+luck*4+d30>" + (S.flags.jingScout ? "45" : "55"), judgeState());
    if (r.success) log("你贴着井壁一寸寸下放，绳结咬得死紧，脚底石棱蹬得稳稳的——三十丈，有惊无险。", "good");
    else { log("下到一半井绳猛地一荡，你在井壁上撞得七荤八素，硬撑着滑到了底。（气血折损）", "hurt"); S.hp = Math.max(1, Math.round(S.hp - hpMax() * 0.15)); }
    S.flags.jingDeep = 1;
    log("井底竟是一座石室。一具坐化的骸骨盘膝守着一方石函，函上无锁，只覆着一层薄薄的青光——像是等了很多年，等一个够格打开它的人。", "dim");
    jingBox();
  }
  function jingBox() {
    setChoices([
      { label: "开函", hint: "禁制认手段，也认人心。", fn: async () => {
        const r = await AI.judge("int*8+d25>40", judgeState());
        if (r.success) jingRelic();
        else {
          S.hp = Math.max(1, Math.round(S.hp - hpMax() * 0.1));
          log("指尖刚碰到青光，一股柔力把你弹开，胸口像挨了一记闷捶。这禁制不讲蛮力——换个法子。", "hurt");
          jingBox();
        }
      } },
      { label: "先向骸骨行礼", hint: "无主之物，先敬其人。", fn: () => {
        S.daoXin = Math.min(100, S.daoXin + 2);
        log("你整衣，向坐化的骸骨恭恭敬敬行了一个弟子礼。礼毕，骸骨垂着的指尖忽然滑落，正落在石函的青光上——光，熄了。", "good");
        jingRelic();
      } },
      { label: "不碰，原路返回", hint: "长老说，只探，不取。", fn: () => {
        log("你退出两步——石室四壁的阵纹骤然亮起，风压从四面八方挤过来，逼得你寸步难行。这口井不许空手而归。你回过头，重新看向那方石函。", "hurt");
        jingBox();
      } },
    ]);
  }
  function jingRelic() {
    S.flags.xianRelic = 1;
    S.inv.guxin = 1; // 上古信物·残片（剧情道具，不入商铺）
    log("石函中没有金银。锦垫之上，静静躺着半块温凉的玉佩——玉质非金非石，纹路古拙，你从没见过，却在看见它的第一眼，心口莫名一紧。", "good");
    sys("【获得：上古信物 · 残片（半块）——它不该出现在三流宗门的后山枯井里。】");
    applyCore({ coincidence: 1 }); // 伏笔：不该存在的东西
    log("就在玉佩入怀的一瞬，井壁剧震，古阵苏醒——头顶传来「啪」的一声脆响：绳，断了。", "hurt");
    chronicle("枯井石函，得半块上古信物", "quest");
    jingClimb();
  }
  function jingClimb() {
    setChoices([
      { label: "攀井壁而上", hint: "三十丈湿壁，九死一生。", fn: async () => {
        const r = await AI.judge("agi*8+con*4+d30>60", judgeState());
        if (r.success) { log("你抠着石缝、蹬着阵纹的凹槽，一寸一寸把自己钉了上去。指甲翻了两片，但你出来了。", "good"); jingOut(); }
        else { log("爬到一半气力一泄，你从半空摔回井底——与此同时，古阵的杀意凝成了一道虚影。", "hurt"); jingArray(); }
      } },
      { label: "摇响铜铃求援", hint: "铃响为号——长老还在井口。", fn: () => {
        addNpc(elderName(), 5, { special: true });
        log("你把铜铃摇得山响。片刻，一条新绳垂了下来，绳尾系着长老的手书：「抓住。」你被一寸寸拽出了黑暗。", "good");
        jingOut();
      } },
    ]);
  }
  function jingArray() {
    combat({ name: "枯井古阵·杀意虚影", power: 15, el: "tu", canBeg: false, desc: "（古阵残灵，无智，只有杀意）" }, res => {
      if (res === "win" || res === "cheated") log("虚影溃散成漫天光屑。井壁露出一线微光——是出口。", "good");
      else log("你且战且退，从古阵崩开的裂缝里连滚带爬挤了出去——狼狈，但活着。", "hurt");
      if (!S.over) jingOut();
    });
  }
  function jingOut() {
    const elder = elderName();
    log(`暮色里，${elder}负手等在井口。他看你的第一眼，落在你的怀间，第二眼，才落在你的脸上。`, "dim");
    log(`「拿到什么了？」——他问得又轻又快。你想起他交代的那四个字：只探，不取。`, "dim");
    log("你没有答。他盯了你很久，忽然笑了，摆摆手：「活着回来就好。下去吧。」——那笑意没有到眼底。", "hurt");
    addNpc(elder, 10, { special: true });
    applyCore({ coincidence: 1 }); // 伏笔：长老早知道井里有什么
    check(); // 当场结算 mq_jing（rewardFn 记账 jingDoneDay）
    if (!S.over) advanceSlot();
  }
  /* 灭门之夜：卷一终局。终点事件锁定（山门成焦土、渡口了断），死活由玩家的刀、腿与运气决定 */
  function startMie() {
    S.flags.mieStart = 1;
    const sect = curSect().name;
    if (typeof META !== "undefined") { META.story = META.story || {}; META.story.sectBurnt = regionOfSafe() ? regionOfSafe().key : "yunzhou"; saveMeta(); } // 卷二伏笔：宗门焦土，时间线继承
    sys(`【连夜回山。离山门还有三里，你看见了火光。】`);
    chronicle(`${sect}遇袭，山门火光冲天`, "quest");
    log("喊杀声顺着北风压下来。一个满脸是血的杂役抓住你的袖子：「同时……所有峰头同时遇袭！护山大阵连一刻都没撑住……」", "hurt");
    log("太巧了。巧得像有一只手，把每一座峰头的时辰，掐得分毫不差。", "dim");
    applyCore({ coincidence: 1 }); // 伏笔：被安排的灭门
    setChoices([
      { label: "冲进去救人", hint: "宗门在烧。你的同门在里面。", fn: () => mieCharge(false) },
      { label: "先伏在暗处看清来路", hint: "看清楚是谁再动——智力定生死。", fn: async () => {
        const r = await AI.judge("int*8+d25>40", judgeState());
        if (r.success) {
          log(`你伏在${locLex().hide}里看清了：黑衣人进退有序，不伤山下凡人，不劫库房的灵石——专杀人，专烧殿。不是山贼，不是仇家。是灭口。`, "good");
          S.daoXin = Math.max(0, S.daoXin - 1); // 看清了的代价
        } else log("夜太黑，你只看见火光里晃动的人影，数不清，也认不出。", "dim");
        mieCharge(true);
      } },
    ]);
  }
  function mieCharge(scouted) {
    const elder = elderName();
    log(`一道熟悉的身影从火里撞出来，一把攥住你的手腕——${elder}，道袍烧去半幅，须发皆焦。`, "hurt");
    log(`「宗门没了。」他把一只储物袋狠狠按进你怀里，推着你往山后的密道去，「你还活着。走密道，去${locLex().cross}，离开${locLex().leave}——别回头！」`, "dim");
    log("你回头的那一刻，看见他转身迎向追来的黑衣人，枯瘦的背影在火光里站得笔直。", "hurt");
    S.stones += 5; addNpc(elder, 20, { special: true });
    chronicle(`${elder}以死断后`, "evt");
    combat({ name: "黑衣灭门者", power: 20, el: "shui", canBeg: false, desc: "（远超凡阶——正面对上，九死一生）" }, res => {
      if (S.over) return; // 身死道消，结算由 die() 接管
      if (res === "win" || res === "cheated") log("你拼着一身伤撕开了包围圈，撞进密道。身后火光冲天，无人再追。", "good");
      else log("你挨了一记重的，借着密道的岔口和黑暗，连滚带爬甩掉了追兵。", "hurt");
      mieDukou();
    });
  }
  function mieDukou() {
    S.flags.mieEsc = 1;
    log(`密道尽头是${locLex().water}。天将亮未亮，${locLex().cross}的薄雾里立着一个人——斗笠，麻衣，抱刀，像等了你很久。`, "dim");
    log("「井底的东西。」斗笠人开口，声音不高，「留下。你走。」", "hurt");
    sys("【对方战力：？？？（深不可测——系统建议：跑。可你跑得掉吗？）】");
    setChoices([
      { label: "交出玉佩", hint: "舍财保命。但交出去的，还回得来吗？", fn: () => mieGive() },
      { label: "纵身跳河", hint: "敏捷与气运，全都押上。", fn: async () => {
        const r = await AI.judge("agi*10+luck*5+d40>70", judgeState());
        if (r.success) {
          S.hp = Math.max(1, Math.round(S.hp - hpMax() * 0.3));
          mieResolve("kept", "你抱着玉佩扎进冰河，潜流卷着你冲出半里。爬上对岸时你只剩半条命——但玉佩还在你怀里。");
        } else {
          log("你刚起势，斗笠人已经到了河边，刀背轻轻巧巧一挑，把你拍回了渡口。「再想想。」", "hurt");
          mieDukou(); // 摔回来，重新抉择
        }
      } },
      { label: "拔刀，死战", hint: "有些东西，交出去比死还难受。", fn: () => {
        combat({ name: "渡口斗笠人", power: 30, el: "shui", canBeg: false, desc: "（远超凡阶——这一战，几乎没有胜算）" }, res => {
          if (S.over) return; // 死于渡口：第一世以死亡收束，结算由 die() 接管
          if (res === "win" || res === "cheated") {
            log("你不知道自己是怎么站着的。斗笠人退开半步，斗笠下传出一声很轻的「咦」——然后他收刀入怀，侧身让开了路。", "good");
            sys("【「有趣。」他丢下两个字，消失在雾里。这一战的分量，你很多年后才会明白。】");
            mieResolve("kept", "你赢了——或者说，他被你吓住了。玉佩还在你怀里，渡口的风冷得刺骨。");
          } else {
            log("你输了，但斗笠人没有补刀。他取下你怀里的玉佩，掂了掂，转身走入雾中——从头到尾，没再看你第二眼。", "hurt");
            mieResolve("taken", "玉佩没了。你躺在渡口，听着自己的心跳，一下，一下。命还在，债也在。");
          }
        });
      } },
    ]);
  }
  function mieGive() {
    delete S.inv.guxin;
    log("你取出那半块玉佩，放在渡口的船板上。斗笠人拾起它，对着天光看了看——就在那一瞬，你分明看见，雾散了一线。", "dim");
    mieResolve("taken", "他收了玉佩，抱刀一礼，走入雾中。你空着手站在渡口，忽然觉得怀间轻得发慌。");
  }
  function mieResolve(how, text) {
    S.flags.mieDone = 1; S.flags.xianChoice = 1; // 仙品「雪泥鸿爪」的「了断」随之勾销（交出或守住，皆是了断）
    if (typeof META !== "undefined") { META.story = META.story || {}; META.story.relic = how; saveMeta(); } // 卷二伏笔：信物的下落
    log(text, "good");
    chronicle(`渡口了断：信物${how === "kept" ? "仍在怀" : "易主"}`, "quest");
    check(); // 当场结算 mq_mie（及联动的 xian_henji）
    if (!S.over) advanceSlot();
  }

  /* ---------- 卷二 · 风起（跨世主线，进度 META.story.stage：焦土→查线→夺信→真相第一层） ---------- */
  function l2RuinsDone(text, cls) {
    S.flags.l2Ruins = 1;
    log(text, cls || "good");
    chronicle(`重访${burntSect().name}焦土，立誓追查`, "quest");
    check(); // 当场结算 mq_ruins（rewardFn 推进 stage）
    if (!S.over) advanceSlot();
  }
  function startRuins() {
    const sect = burntSect().name;
    sys(`【你循着前世模糊的记忆寻回去——${sect}的山门，如今只剩一片焦土。】`);
    log("九百级石阶还在，石阶尽头什么都没有。断碑斜插在灰里，你抹开碑上的焦痕，认出半道褪色的朱笔——那是外门名册的方向。", "dim");
    log("前世的同门，死的死，散的散。一场说不清的火一夜之间烧掉了一座宗门，世人早已淡忘，连说书人都不肯编这段——没头没尾，编不成书。", "dim");
    setChoices([
      { label: "在断碑前立誓：查到底", hint: "执念成形：道心与心魔，同涨。", fn: () => {
        applyCore({ dao: 2, xinmo: 5 });
        l2RuinsDone("你对着断碑一字一句立誓，声音不大，灰里的风却静了一瞬。这一世的名字、身份、前程，从此都要排在这桩誓后面。");
      } },
      { label: "三叩首，不发誓", hint: "有些誓不必出口。道心更稳，恨意更深。", fn: () => {
        applyCore({ dao: 3, xinmo: 3 });
        l2RuinsDone("你恭恭敬敬磕了三个头，什么也没说。起身时，你把碑前的一块碎石揣进了怀里——没什么用，但你就是想带走一点。");
      } },
    ]);
  }
  function startDuobao() {
    if (S.money < 300) { log("多宝阁掌柜眼皮都没抬：「查旧账，三百文，不赊。」——先去攒点钱。", "dim"); if (!S.over) advanceSlot(); return; }
    applyCore({ money: -300 });
    log("你被引进后堂。掌柜抱出一册销赃旧档，翻到灭门当夜那一页，指尖停在一行小字上：「当夜过手的货里，有一件『不该出世的东西』——经手人代号，灰鹭。」", "dim");
    log("「灰鹭这号人，」掌柜慢悠悠合上册子，「阁里查了十年，没查到根脚。客官，你这条线，烫手。」", "hurt");
    S.flags.l2Duobao = 1;
    applyCore({ coincidence: 1 }); // 伏笔：查无根脚的经手人
    addNpc("多宝阁掌柜", 10, { special: true });
    chronicle("多宝阁旧档：经手人代号「灰鹭」", "quest");
    check(); // 当场结算 mq_chaxian 目标
    if (!S.over) advanceSlot();
  }
  function startTianji() {
    if (S.money < 500) { log("天机楼的柜台只认钱：「一条消息，五百文，童叟无欺。」——先去攒点钱。", "dim"); if (!S.over) advanceSlot(); return; }
    applyCore({ money: -500 });
    log("天机楼的信纸只有一行字：「灰鹭，不属于魔道六宗任何一宗；灭门当夜在场，事后即焚了落脚处。另：近百年，每逢天下大乱，必有人收『上古之物』。」", "dim");
    log("字很少，你的后背很凉。买主是个不存在的人——不存在的人，最难杀。", "hurt");
    S.flags.l2Tianji = 1;
    applyCore({ coincidence: 1 }); // 伏笔：不存在的买主
    chronicle("天机楼消息：灰鹭不属于任何一宗", "quest");
    check();
    if (!S.over) advanceSlot();
  }
  function startDuoxin() {
    const taken = (typeof META !== "undefined") && META.story && META.story.relic === "taken";
    if (!taken) l2VisitKeepers();
    else l2HuntRelic();
  }
  /* 信物在手：血河教「借观」——战 / 交易 / 嫁祸三择（首个影响终局阵营的重大抉择） */
  function l2VisitKeepers() {
    sys("【夜半，一叠拜帖送到你门口——血河教使者，一袭红衣，笑得客气：「贵客怀璧，借观三日。」】");
    log("你知道这不是借。魔道六宗并非人人该杀，但最好绕着走——可惜，是他们找上了你。", "dim");
    setChoices([
      { label: "战：「东西在我命里，来拿」", hint: "血河教使者（战力随你修为而涨，九死一生）。", fn: () => {
        combat({ name: "血河教使者", power: Math.max(16, Math.round(8 + S.realm * 3)), el: "huo", canBeg: false, desc: "（魔道六宗，手段狠辣）" }, res => {
          if (S.over) return;
          if (res === "win" || res === "cheated") l2Resolve("war", "红衣使者躺在你脚边，血把雪浸成了黑泥。你擦了擦刀，知道从今夜起，血河教的账簿上有了你的名字。");
          else { log("你且战且退，使者也不深追，只留下一句笑：「三日，慢慢想。」", "hurt"); if (!S.over) advanceSlot(); }
        });
      } },
      { label: "交易：出钱买断这桩「借观」", hint: "800 文或 5 灵石。魔道也认钱。", fn: () => {
        if (S.stones >= 5) { applyCore({ stones: -5 }); l2Resolve("deal", "使者掂了掂灵石，笑容真诚了几分：「痛快人。」血河教从此认钱不认玉——这买卖说不上体面，但命保住了。"); }
        else if (S.money >= 800) { applyCore({ money: -800 }); l2Resolve("deal", "使者数完铜钱，把拜帖撕了：「痛快人。」血河教从此认钱不认玉——这买卖说不上体面，但命保住了。"); }
        else {
          log("使者听完你的报价，笑出了声：「穷鬼的命，不值这个价。」——谈崩了。", "hurt");
          combat({ name: "血河教使者", power: Math.max(16, Math.round(8 + S.realm * 3)), el: "huo", canBeg: false, desc: "（谈判破裂）" }, res => {
            if (S.over) return;
            if (res === "win" || res === "cheated") l2Resolve("war", "红衣使者躺在你脚边。谈崩了的买卖，最后都这个结局。");
            else { log("你且战且退，使者也不深追，只留下一句笑：「三日，慢慢想。」", "hurt"); if (!S.over) advanceSlot(); }
          });
        }
      } },
      { label: "嫁祸：供出「灰鹭」这根线", hint: "智力判定：把水搅浑，让狼咬狼。", fn: async () => {
        const r = await AI.judge("int*8+d25>45", judgeState());
        if (r.success) {
          log("你把多宝阁旧档里的「灰鹭」和盘托出，半真半假。使者眯起眼睛听完，红衣一展，没入夜色——他们去找更值钱的东西了。", "good");
          applyCore({ coincidence: 1 }); // 伏笔：嫁出去的祸，也是账
          l2Resolve("frame", "你借魔道的手，去捅那只看不见的手的影子。这步棋险到极处——但从今夜起，棋盘上有两拨人互相提防了。");
        } else {
          log("使者听完，笑容冷下去：「耍我？」——谈崩了。", "hurt");
          combat({ name: "血河教使者", power: Math.max(16, Math.round(8 + S.realm * 3)), el: "huo", canBeg: false, desc: "（弄巧成拙）" }, res => {
            if (S.over) return;
            if (res === "win" || res === "cheated") l2Resolve("war", "红衣使者躺在你脚边。弄巧成拙的局，最后用拳头收了个尾。");
            else { log("你且战且退，使者也不深追，只留下一句笑：「三日，慢慢想。」", "hurt"); if (!S.over) advanceSlot(); }
          });
        }
      } },
    ]);
  }
  /* 信物被夺：暗市循线——强夺 / 以物易物 / 放手三择 */
  function l2HuntRelic() {
    sys("【暗市的线报：半块古玉，三日后在血河教分舵过手。斗笠人把它卖了个好价钱。】");
    log("前世渡口的雾仿佛还在你怀里。那半块玉佩离你只有一座分舵的距离——也隔着一整座分舵的刀。", "dim");
    setChoices([
      { label: "强夺", hint: "血河教分舵（战力随你修为而涨，九死一生）。", fn: () => {
        combat({ name: "血河教分舵主", power: Math.max(18, Math.round(10 + S.realm * 3)), el: "huo", canBeg: false, desc: "（魔道分舵，刀口舔血）" }, res => {
          if (S.over) return;
          if (res === "win" || res === "cheated") { S.inv.guxin = 1; l2Resolve("war", "你从分舵的暗格里取回了那半块玉佩。它还是凉的，和前世一模一样。只是这一次，你握得更紧了。"); }
          else { log("你折在分舵的刀阵里，拼死才退出来。线还在，命先留着。", "hurt"); if (!S.over) advanceSlot(); }
        });
      } },
      { label: "以物易物", hint: "10 灵石，或 1500 文。魔道也认钱。", fn: () => {
        if (S.stones >= 10) { applyCore({ stones: -10 }); S.inv.guxin = 1; l2Resolve("deal", "分舵主把玉佩抛还给你，像抛一块烫手的炭：「买主说了，它认你。拿走，别再来。」"); }
        else if (S.money >= 1500) { applyCore({ money: -1500 }); S.inv.guxin = 1; l2Resolve("deal", "分舵主把玉佩抛还给你，像抛一块烫手的炭：「买主说了，它认你。拿走，别再来。」"); }
        else { log("分舵主听完你的报价，嗤笑一声：「打发要饭的？」——被轰了出来。", "hurt"); if (!S.over) advanceSlot(); }
      } },
      { label: "放手", hint: "前世你没能守住它，这一世……也许它本就不该在你手里。", fn: () => {
        applyCore({ dao: 2, xinmo: -5 });
        l2Resolve("giveup", "你在暗市对面站了一夜，天亮时转身走了。怀里的位置空着，心里某处也空着——但奇怪的是，脚步轻了。");
      } },
    ]);
  }
  function l2Resolve(how, text) {
    S.flags.l2Resolve = 1;
    if (typeof META !== "undefined") { META.story.l2Choice = how; saveMeta(); } // 卷三伏笔：了断的方式，终局站队的引子
    log(text, "good");
    chronicle(`了断夺信（${{ war: "以战", deal: "以钱", frame: "嫁祸", giveup: "放手" }[how]}）`, "quest");
    check(); // 当场结算 mq_duoxin
    if (!S.over) advanceSlot();
  }
  function startZhenxiang() {
    sys("【听雨楼，后堂。老执事听完你两世的遭遇，沉默了很久，然后翻出一册落灰的旧档。】");
    log("「百年间，每次天下大乱之前，都有人在收这类『上古信物』。」他的手指点着档上一行小字，「灭门、掘墓、血祭开秘境——手法不同，胃口相同。经手的，都不长命。」", "dim");
    log(({ // 卷二拼图夹页：各域一条本地旧闻，与本地主线链互证
      yunzhou: "旧档的夹页里，还有半页关于青岩山枯井的旧闻——三百年前，那口井也冒过一次灵气。也是那位「恰好路过」的长老，亲自压下了记载。",
      beiyuan: "旧档的夹页里，夹着北原各部千年内乱的旧记录——每一次，最强的两部都「恰好」在极夜斗到两败俱伤。时间点整齐得像有人掐着表。",
      zhongzhou: "旧档的夹页里，是一册皇朝与上宗的丹药往来账——谁家在收丹、收的到底是什么，账上不敢写，只画了一只鸟。",
      ximo: "旧档的夹页里，是佛国的香火账与沙盗的买路钱底册——两边记的是同一批货，同一个收货的代号。",
      nanling: "旧档的夹页里，粘着半页驱兽香的方子——南岭被兽潮踏平的寨子，被踏平之前，总有人先闻到了这股香。",
      sihai: "旧档的夹页里，抄着龙宫与鲛国旧怨的卷宗——三万年前结下的梁子，每隔几百年就被「恰好」翻出来一回。",
    })[(regionOfSafe() || REGIONS.yunzhou).key], "dim");
    log("碎片在你心里拼到了一起：掐着时辰的灭门、不存在的买主、喂给大劫的信物——有一只看不见的手，在安排强者相杀，在喂养这场三万年不止的乱。", "hurt");
    setChoices([
      { label: "接受这个真相", hint: "道心受冲击，但从此你的眼睛不一样了。", fn: () => {
        applyCore({ dao: 3, xinmo: 5, coincidence: 1 }); // 伏笔：真相本身就是最大的巧合
        S.flags.l2Truth = 1;
        addNpc("听雨楼老执事", 20, { special: true });
        chronicle("卷二·真相第一层：世间有一只看不见的手", "quest");
        check(); // 当场结算 mq_zhenxiang（stage 4：卷二完）
        if (!S.over) advanceSlot();
      } },
    ]);
  }

  return { DEFS, check, offers, refuse, activate, isActive, isDone, isFailed, staleList, nudge, nudgeAct, questAct };
})();
