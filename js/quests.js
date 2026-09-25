/* 苍玄界 · 任务系统（天道卷宗）
   主线按世界设定推进：卷一「潜龙在渊」——活过冬天 → 青岩门应试 → 外门立足。
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
  };

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
    sys(`【任务·${d.type === "main" ? "主线" : "支线"}】「${d.name}」已录入天道卷宗。`);
    log(d.desc, "dim");
    try { chronicle(`承接${d.type === "main" ? "主线" : "支线"}「${d.name}」`, "quest"); } catch (e) {}
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
    if (id === "mq_qingyan" && !S.flags.qy_step1 && S.day >= 11) { startTrials(); return; }
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
    // 主线行动：拜入出生地所属小宗门（五域各一，三关应试）
    if (isActive("mq_qingyan") && !S.flags.qy_step1 && S.day >= 11) {
      list.push({
        kind: "act", type: "main", label: `前往${curSect().name}山门，闯三关应试`,
        hint: S.linggen === "za"
          ? "测灵碑择根而取——杂灵根灵光不过尺，此路多半不通。但不走这一趟，心不甘。"
          : "测灵碑、问心、演武。败则今年无缘。",
        act: () => startTrials(),
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

  return { DEFS, check, offers, refuse, activate, isActive, isDone, isFailed, staleList, nudge, nudgeAct, questAct };
})();
