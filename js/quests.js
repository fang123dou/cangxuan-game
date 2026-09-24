/* 苍玄界 · 任务系统（天道卷宗）
   主线按世界设定推进：卷一「潜龙在渊」——活过冬天 → 青岩门应试 → 外门立足。
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
    if (r.npc) for (const n in r.npc) { addNpc(n, r.npc[n]); notes.push(`${n} 缘分 ${r.npc[n] > 0 ? "+" : ""}${r.npc[n]}`); }
    if (r.flag) S.flags[r.flag] = 1;
    computeMods();
    return notes.join("，");
  }

  /* ---------- 任务定义 ---------- */
  const DEFS = {
    /* ===== 主线 · 卷一 潜龙在渊 ===== */
    mq_survive: {
      name: "凡品任务：活过这个冬天", type: "main", passive: true,
      desc: "灵气潮汐涨潮之初，大雪封城。先活下来——热食、炭火、修为，都是命。",
      auto: () => true,
      objectives: [{ text: () => `撑到开春（第 ${Math.min(S.day, 31)} / 31 日）`, done: () => S.day >= 31 }],
      reward: { points: 20 },
      doneText: "你看到了开春的太阳。这一冬，没白熬。",
    },
    mq_qingyan: {
      name: "主线：拜入青岩门", type: "main",
      desc: "三流小宗青岩门大开山门收徒。测灵碑、问心关、演武台——三关皆过，才是仙途起点。",
      auto: () => S.day >= 10 || !!S.flags.qingyanRumor || !!S.flags.tingyuToken,
      objectives: [
        { text: () => "前往山门，参加三关应试", done: () => !!S.flags.qy_step1 },
        { text: () => "过测灵碑（灵光显化）", done: () => !!S.flags.qy_step1 },
        { text: () => "过问心关（道心可鉴）", done: () => !!S.flags.qy_step2 },
        { text: () => "过演武台（胜外门教习）", done: () => !!S.flags.qy_step3 },
      ],
      reward: { points: 50, cult: 30, npc: { "青岩门外门弟子陆沉": 20 } },
      doneText: "青袍加身，木牌入手。从今往后，你是有宗门的人了。",
    },
    mq_outer: {
      name: "主线：外门立足", type: "main",
      desc: "外门弟子三千，资源只向强者倾斜。锻骨境与同门之谊，是你立足的根本。",
      auto: () => !!S.flags.qingyan,
      objectives: [
        { text: () => `踏入锻骨境（当前：${REALM_NAMES[S.realm]}）`, done: () => S.realm >= 3 },
        { text: () => `与陆沉结成同门之谊（缘分 ${S.npc["青岩门外门弟子陆沉"] || 0} / 20）`, done: () => (S.npc["青岩门外门弟子陆沉"] || 0) >= 20 },
      ],
      reward: { points: 80, attr: { con: 0.3 }, dao: 2 },
      doneText: "外门名册上，你的名字被朱笔圈了一道——资源、功法、师承，从此向你敞开一线。",
    },

    /* ===== 支线 ===== */
    sq_laogaitou: {
      name: "支线：老丐头的心愿", type: "side",
      desc: "老丐头咳得像要散架，却总把最暖的位置让给你。他没什么可求的——只想要一个肯听他讲完故事的人。",
      offer: () => (S.npc["老丐头"] || 0) >= 20,
      offerText: "老丐头招你坐到火边，欲言又止：「娃儿，陪我……听我说段陈年旧事？」",
      objectives: [{ text: () => `老丐头的托付（缘分 ${S.npc["老丐头"] || 0} / 60）`, done: () => (S.npc["老丐头"] || 0) >= 60 }],
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
        { text: () => `周先生的认可（缘分 ${S.npc["周先生"] || 0} / 40）`, done: () => (S.npc["周先生"] || 0) >= 40 },
      ],
      reward: {},
      rewardFn: () => {
        if (!S.inv.yinqi) { techniqueUnlockFx("yinqi"); S.inv.yinqi = 1; computeMods(); return "获得《引气诀》（1 阶功法）——周先生压箱底的真东西"; }
        applyReward({ points: 40 }); return "万象点 +40（引气诀早已在手，他多给了你些盘缠）";
      },
      doneText: "周先生从柜底取出一册油布包着的旧书，塞进你怀里：「别让药炉熄了，也别让心气熄了。」",
    },
    sq_tingyu: {
      name: "支线：听雨楼的因果", type: "side",
      desc: "那枚「听雨」木牌是好是坏，还两说。了断这桩因果，不管以什么方式。",
      offer: () => !!S.flags.tingyuMark || !!S.flags.tingyuGrudge,
      offerText: "你察觉雨意森森——听雨楼的人又在暗处看你的方向了。这桩因果，该有个了断。",
      objectives: [{ text: () => "了断听雨楼的这桩因果", done: () => !!S.flags.tingyuDone }],
      reward: { points: 40, dao: 2 },
      doneText: "雨声歇了。你知道，这桩因果翻篇了——下一页写什么，看你。",
    },
    sq_xihou: {
      name: "支线：细猴的归处", type: "side",
      desc: "那个比你还瘦的小贼，手快，眼神更快。他偷的不是钱，是活路。给他指条道，或给他一顿饭。",
      offer: () => (S.npc["小贼细猴"] || 0) !== 0,
      offerText: "细猴缩在墙根，见你来了也不跑——他在等你开口。",
      objectives: [{ text: () => `细猴的信服（缘分 ${S.npc["小贼细猴"] || 0} / 40）`, done: () => (S.npc["小贼细猴"] || 0) >= 40 }],
      reward: { points: 20, dao: 1, item: "heimu:3" },
      doneText: "细猴把三个黑馍揣进怀里，朝你重重点头：「哥，以后你的口袋，我罩着。」",
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
      DEFS["pq_" + pid] = {
        name: `支线：入行 · ${P.name}`, type: "side", giver: P.master,
        desc: P.questDesc,
        offer: () => profReqMet(P) && !hasProfession(pid),
        offerText: P.offerText,
        objectives: [
          { text: () => `${P.master}的认可（缘分 ${S.npc[P.master] || 0} / 40）`, done: () => (S.npc[P.master] || 0) >= 40 },
          { text: () => { const st = (((S.quests || {}).acceptDay) || {})["pq_" + pid]; return `跟随见习（${st == null ? 0 : Math.min(2, S.day - st)} / 2 日）`; }, done: () => { const st = (((S.quests || {}).acceptDay) || {})["pq_" + pid]; return st != null && S.day - st >= 2; } },
        ],
        reward: {},
        rewardFn: () => { const n = unlockProfession(pid); return n ? `解锁${P.tierName}职业「${n}」` : ""; },
        doneText: "", // 解锁文案由 unlockProfession 播报
      };
    }
  }

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
  function questAct(id) { // 催办/AI 选项的「推进」出口
    const d = DEFS[id];
    if (!d) { advanceSlot(); return; }
    if (id === "mq_qingyan" && !S.flags.qy_step1 && S.day >= 11) { startTrials(); return; }
    if (!touched(id)) { activate(id); advanceSlot(); return; }
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
    // 主线行动：青岩门应试
    if (isActive("mq_qingyan") && !S.flags.qy_step1 && S.day >= 11) {
      list.push({
        kind: "act", type: "main", label: "前往青岩山，闯三关应试",
        hint: "测灵碑、问心、演武。败则今年无缘。",
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

  /* ---------- 青岩门三关（主线演出） ---------- */
  async function startTrials() {
    sys("【你踏上了青岩山九百级石阶。山门之前，测灵碑如剑倒插，碑前已排了百余凡人。】");
    log("外门执事瞥你一眼：「排队。灵光过三尺者，留。」", "dim");
    await lingTest();
  }
  async function lingTest() {
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
    combat({ name: "青岩外门教习", power: 10, canBeg: false, desc: "（演武较技，点到为止）" }, res => {
      if (res === "win" || res === "cheated") {
        S.flags.qy_step3 = 1;
        S.flags.qingyan = 1; S.sect = "青岩门";
        sys("【三关皆过。青袍加身，木牌入手——「青岩门外门弟子」。】");
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
