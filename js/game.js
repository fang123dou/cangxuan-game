/* 苍玄界 · 文字修仙 引擎（GM 动态叙事版）
   剧情由「天道推演」实时生成：AI（可选）→ 同源服务端（可选）→ 内置程序化 GM。
   数值系统（属性/抽卡/战斗/昼夜/轮回）始终由引擎确定性结算。 */
"use strict";

/* ================= 存档（跨周目） ================= */
const META_KEY = "cangxuan_meta_v1";
let META = { world: 1, deaths: 0, ach: [], rebirth: null, sysLv: 1, totalPulls: 0 };
try { const m = JSON.parse(localStorage.getItem(META_KEY)); if (m && m.world) META = m; } catch (e) {}
if (!META.sysLv) META.sysLv = 1; // 系统等级随魂（跨周目）
if (META.totalPulls == null) META.totalPulls = 0;
if (!META.titles) META.titles = []; // 称号随魂封存（轮回法则：千秋录成就与称号随魂封存）
if (!META.comments) META.comments = []; // 历世评语钉面板（15.2：评语随魂封存）
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch (e) {} }

/* ================= 全局状态 ================= */
let S = null;
const REALM_NAMES = ["凡躯", "淬体境", "炼皮境", "锻骨境", "通脉境", "聚气境", "开元境"];
const REALM_NEED  = [0, 60, 100, 150, 210, 280, 360];
const NAMES = ["小石头", "杏儿", "阿禾", "铁柱", "晚晚", "青禾", "狗子", "阿黎"];

function newLife() {
  window.__inCombat = false;
  const rb = META.rebirth || null;
  const first = META.world === 1 && !rb;
  let base = { str: 2, agi: 2, int: 2, con: 2, luck: 3 };
  let money = 2, name = "阿七", iden = null, points = 100;
  if (!first && rb) {
    iden = rb.identity;
    name = NAMES[Math.floor(Math.random() * NAMES.length)];
    points = rb.points;
    money = iden.money;
    for (const k in iden.mods) base[k] += iden.mods[k];
    if (rb.attrBonus) { const ks = ["str", "agi", "int", "con"]; for (let i = 0; i < rb.attrBonus; i++) base[ks[i % 4]] += 1; }
    if (rb.luckBonus) base.luck += rb.luckBonus;
    if (rb.attrMalus) { const ks = ["str", "agi", "int", "con"].sort(() => Math.random() - 0.5); for (let i = 0; i < rb.attrMalus; i++) base[ks[i % 4]] = Math.max(1, base[ks[i % 4]] - (1 + (Math.random() < 0.3 ? 1 : 0))); } // 潦草/败笔：随机不同属性折损（设定：随机两项 -1~2）
    if (rb.luckMalus) base.luck = Math.max(1, base.luck - rb.luckMalus);
  }
  S = {
    name, first, iden, world: META.world,
    day: 1, slot: 0, weather: "大雪",
    base, hp: 0, sta: 0, mp: 0,
    hunger: 55, money, stones: 0, points,
    pity10: 0, pity100: 0, pity1000: 0, pulls: 0, stoneExch: 0,
    linggen: rollLinggen(first), // 灵根五行：首世阿七固定杂灵根（设定原文），再世按稀有度重 roll
    gaimai: 0,
    cards: {}, cardOrder: [],
    inv: { heimu: 1, wood: 0 }, skills: {},
    realm: 0, cult: 0, daoXin: 40,
    npc: {}, npcMin: {}, flags: {}, debuff: null,
    job: null, foodStreak: 0, kills: 0,
    realmBreaks: 0, tempLuckDays: 0,
    gmRecent: [], over: false, mods: {},
    yaoshi: 0, drugUse: {}, // 药蚀度（0~100，隐藏数值）与同种服药计数
    xinmo: META.world > 1 ? 10 : 0, // 心魔（0~100，半隐藏）：前世死亡记忆是它的养料
    quests: { active: [], done: [], failed: [], refused: {} },
    chronicle: [], lifeAch: [], // lifeAch：本世新刻成就（轮回结算用；千秋录本体随魂跨世）
    stats: { trains: 0, meditates: 0, begs: 0, chops: 0, gambles: 0, maxMoney: money },
  };
  S.wx = genWx(S.linggen); // 先天五行亲和：总和恒 100
  if (!first && rb && rb.echo && findCard(rb.echo)) { // 词条残影：上一世词条半效伴生
    S.cards[rb.echo] = 1; S.cardOrder.push(rb.echo);
    const ec = findCard(rb.echo);
    setTimeout(() => sys(`【伴生残影】「${ec.name}」——上一世的词条没有散干净，半效随你入胎。`), 0);
  }
  computeMods();
  META.poolTheme = POOL_THEMES[Math.floor(Math.random() * POOL_THEMES.length)].name; // 卡池预览：每世（每月）一个倾向主题
  saveMeta();
  S.hp = first ? Math.round(hpMax() * 0.6) : hpMax(); // 首世开局高烧三天，只剩六成气血（对齐设定集 12/20）
  S.sta = staMax(); S.mp = 0;
}

/* ================= 属性与修正 ================= */
function computeMods() {
  const m = { strP:0, agiP:0, intP:0, conP:0, allP:0, luckFlat:0, hungerR:0, foodP:0,
    hpRegenP:0, staRegen:1, moneyP:0, socialP:0, trainP:0, dmgP:0, escapeP:0, pityR:0, defP:0 };
  for (const id in S.cards) {
    const c = findCard(id); if (!c) continue;
    const mod = c.mod || {};
    for (const k in mod) m[k] = (m[k] || 0) + mod[k];
  }
  const lg = LINGGENS[S.linggen]; // 变异灵根的天生特性
  if (lg && lg.mods) for (const k in lg.mods) m[k] = (m[k] || 0) + lg.mods[k];
  for (const tid of (META.titles || [])) { const t = TITLES[tid]; if (t && t.mod) for (const k in t.mod) m[k] = (m[k] || 0) + t.mod[k]; } // 称号效果永续
  S.mods = m;
}
function findCard(id) {
  for (const tier of CARD_POOL) for (const c of tier) if (c.id === id) return c;
  if (id.endsWith("_fuse")) { const src = FUSION[id.replace("_fuse", "")]; if (src) return Object.assign({ id }, src); }
  if (COMBO_CARDS[id]) return Object.assign({ id }, COMBO_CARDS[id]);
  if (id.startsWith("echo_")) { // 词条残影（轮回法则 15.2）：上一世词条的半效伴生版
    const src = findCard(id.slice(5));
    if (src) {
      const hm = {};
      for (const k in (src.mod || {})) hm[k] = Math.round(src.mod[k] * 50) / 100; // 半效
      return Object.assign({}, src, { id, name: src.name + "·残影", eff: "【残影·半效（上一世伴生）】" + src.eff, mod: hm, special: undefined });
    }
  }
  return null;
}
function cardTier(id) {
  for (let t = 0; t < CARD_POOL.length; t++) for (const c of CARD_POOL[t]) if (c.id === id) return t;
  if (id.endsWith("_fuse")) { const f = FUSION[id.replace("_fuse", "")]; return f ? f.tier : 0; }
  if (COMBO_CARDS[id]) return COMBO_CARDS[id].tier;
  return 0;
}
function hasSpecial(sp) { for (const id in S.cards) { const c = findCard(id); if (c && c.special === sp) return true; } return false; }
function attr(k) {
  const b = S.base[k];
  const pct = (S.mods[k + "P"] || 0) + (S.mods.allP || 0);
  let v = b * (1 + pct / 100);
  if (k === "luck") { v = b + (S.mods.luckFlat || 0) + (S.tempLuckDays > 0 ? 1 : 0); v = Math.max(1, Math.min(10, v)); }
  if (S.debuff === "weak" && k !== "luck") v *= 0.8;
  return Math.round(v * 10) / 10;
}
function hpMax() { return Math.max(10, Math.round(attr("con") * 10)); }
function staMax() { return Math.max(5, Math.round(attr("con") * 5)); }
function mpMax() { const v = S.realm >= 6 ? attr("int") * 10 : S.realm >= 5 ? attr("int") * 5 : 0; return Math.round(v * (S.linggen === "za" ? 1.2 : 1)); }
function combatPower() {
  const a = attr("str") + attr("agi") + attr("int") * 0.8 + attr("con") * 0.6;
  let p = a * (1 + S.realm * 0.45) * (1 + (S.mods.dmgP || 0) / 100);
  if (S.hunger > 70) p *= 0.9;
  p *= 1 - injuryTier().pen / 100; // 设定：伤病四级压常态战力
  return Math.round(p * 10) / 10;
}
/* 康健 · 伤病四级（设定集）：轻伤 -10% ｜ 中伤 -30% ｜ 重伤 -50% ｜ 濒死 -80% */
function injuryTier() {
  const r = S.hp / hpMax();
  if (r >= 0.999 && S.debuff !== "weak") return { name: "无恙", pen: 0 };
  if (r >= 0.7) return { name: "轻伤", pen: 10 };
  if (r >= 0.4) return { name: "中伤", pen: 30 };
  if (r >= 0.1) return { name: "重伤", pen: 50 };
  return { name: "濒死", pen: 80 };
}
/* 战力拆解（设定：系统给出完整拆解——常态值 / 修正 / 成因） */
function powerBreakdown() {
  const base = attr("str") + attr("agi") + attr("int") * 0.8 + attr("con") * 0.6;
  const lines = [`五维加权基础：${base.toFixed(1)}（力 + 敏 + 智×0.8 + 体×0.6）`,
    `境界加幅：×${(1 + S.realm * 0.45).toFixed(2)}（${REALM_NAMES[S.realm]}）`,
    `词条攻伐：${(S.mods.dmgP || 0) >= 0 ? "+" : ""}${S.mods.dmgP || 0}%`];
  const normal = base * (1 + S.realm * 0.45) * (1 + (S.mods.dmgP || 0) / 100);
  const inj = injuryTier();
  if (S.hunger > 70) lines.push(`饥饿缠身：-10%（饱食不足三成）`);
  if (inj.pen) lines.push(`${inj.name}：-${inj.pen}%（伤病四级）`);
  if (S.debuff === "weak") lines.push(`元气大伤：五维 ×0.8（修养 ${S.debuffDays || 0} 日）`);
  lines.push(`——常态战力（满状态）：${(Math.round(normal * 10) / 10)}`);
  if (hasSpecial("yaoyao")) lines.push(`「遥遥领先」生效中：对外显示 ${displayPower()}（虚高 30%，真实战力不变）`);
  return lines;
}
/* 「遥遥领先」：战力对外显示虚高 30%，真实战力不变 */
function displayPower() { return Math.round(combatPower() * (hasSpecial("yaoyao") ? 1.3 : 1) * 10) / 10; }
function daoText() { const d = S.daoXin; return d >= 80 ? "坚如磐石" : d >= 60 ? "古井无波" : d >= 40 ? "微澜不惊" : d >= 25 ? "心浮气躁" : "暗流涌动"; }
function gainAttr(k, amt) {
  const cap = 10;
  const cur = S.base[k];
  if (cur >= cap) return 0;
  const eff = amt * Math.pow(0.8, Math.floor(cur - 2)) * (1 + (S.mods.trainP || 0) / 100) * (hasTitle("renjiT") ? 1.1 : 1); // 称号「人极」：日常磨炼 +10%
  S.base[k] = Math.min(cap, cur + Math.max(0.02, eff));
  return eff;
}
/* 修为须有功法托底：无功法时灵气穿体而过，修为不增（每日提示一次） */
function hasTechnique() { return (S.inv.yinqi || 0) > 0 || (S.inv.quanpu || 0) > 0; }
function noteNoTechnique() {
  if (S.noTechDay === S.day) return;
  S.noTechDay = S.day;
  log(`【你尚无功法。灵气穿体而过，留不住分毫——修为须有功法方能增长。（商铺奇珍、药庐知遇，皆有功法可得）】`, "dim");
}
/* 灵根：当前资质定义、修炼乘区与测灵碑加成 */
function linggen() { return LINGGENS[S.linggen] || LINGGENS.za; }
function linggenTestBonus() { const v = { za: 0, san: 8, shuang: 16, tian: 30 }[S.linggen]; return v == null ? 24 : v; }
/* 五行亲和：旧档无 wx 时按灵根补生成（兼容历史存档） */
function wxOf() { if (!S.wx) S.wx = genWx(S.linggen || "za"); return S.wx; }
function wxSum() { return Object.values(wxOf()).reduce((a, b) => a + b, 0); }
/* 战斗五行：变异灵根用其异变轨道，否则取亲和最高的一行 */
function dominantWxEl() {
  const v = LINGGENS[S.linggen];
  if (v && v.el) return v.el;
  const wx = wxOf(); let best = "tu", bv = -1;
  for (const e of WX_ELS) if (wx[e] > bv) { bv = wx[e]; best = e; }
  return best;
}
/* 该行功法修炼速度 = 1 + 亲和×0.005（×1.5 封顶）；亲和 <10 强行修炼该行 → 效率 ×0.5 */
function wxTrainMult(sk) {
  const el = TECH_EL[sk]; if (!el) return 1;
  const v = wxOf()[el] || 0;
  return v < 10 ? 0.5 : Math.min(1.5, 1 + v * 0.005);
}
/* 四小层：初期/中期/后期/圆满（设定：每境四分，小层突破全属性微涨 2%） */
const LAYER_NAMES = ["初期", "中期", "后期", "圆满"];
function miniLayer() {
  if (S.realm < 1 || S.realm >= 6) return -1;
  const p = S.cult / (REALM_NEED[S.realm + 1] || 1);
  return p >= 0.75 ? 3 : p >= 0.5 ? 2 : p >= 0.25 ? 1 : 0;
}
function gainCult(amt) {
  if (S.realm >= 6) return false;
  if (!hasTechnique()) { if (amt > 0) noteNoTechnique(); return false; }
  const before = miniLayer();
  S.cult = Math.min(REALM_NEED[S.realm + 1], S.cult + amt * linggen().mult * (1 + (S.mods.trainP || 0) / 100) * ((S.yaoshi || 0) >= 30 ? 0.9 : 1) * ((S.xinmo || 0) >= 25 ? 0.95 : 1)); // 药蚀 30+：修炼 -10% ｜ 心魔杂念：修炼 -5%
  const after = miniLayer();
  if (before >= 0 && after > before) { // 小层突破：全属性微涨（当境上限的 2%）
    for (const k of ["str", "agi", "int", "con"]) S.base[k] = Math.min(10, Math.round((S.base[k] + 0.2) * 10) / 10);
    sys(`【${REALM_NAMES[S.realm]} · ${LAYER_NAMES[after]}】小层突破，气血圆融——全属性微涨。`);
    computeMods();
  }
  return true;
}
function checkBreakthrough() { return S.realm < 6 && S.cult >= REALM_NEED[S.realm + 1]; }
/* ---------- 药蚀（设定集）：同种递减 100%→50%→25%→无效且翻倍；异种累积计入药蚀度 ---------- */
function yaoshiState() {
  const v = S.yaoshi || 0;
  if (v >= 90) return { name: "丹毒爆发边缘", desc: "丹毒爆发：属性暴跌、境界松动，随时可能暴毙" };
  if (v >= 60) return { name: "丹毒蚀体", desc: "体质开始受损，破境时走火入魔概率上升" };
  if (v >= 30) return { name: "药蚀渐积", desc: "修炼效率 -10%，丹药吸收率下降" };
  return { name: "无碍", desc: "药蚀尚未成患" };
}
function takeDrug(id, cultAmt, hpAmt) {
  S.drugUse = S.drugUse || {};
  const used = S.drugUse[id] || 0;
  S.drugUse[id] = used + 1;
  const mult = used === 0 ? 1 : used === 1 ? 0.5 : used === 2 ? 0.25 : 0; // 同种递减
  let shi = (DRUG_SHI[id] || 4) * (used >= 3 ? 2 : 1); // 第四次起药蚀翻倍
  if (hasSpecial("zhichang")) shi = 0; // 直肠子食神：药蚀免疫
  else if (hasSpecial("huachang") || hasSpecial("baidu")) shi *= 0.5; // 拉得快，毒留不住
  S.yaoshi = Math.min(100, Math.max(0, (S.yaoshi || 0) + shi));
  let effMult = mult;
  if (S.yaoshi >= 30) effMult *= 0.85; // 药蚀 30+：丹药吸收率下降
  if (cultAmt) gainCult(cultAmt * effMult);
  if (hpAmt) S.hp = Math.min(hpMax(), S.hp + hpAmt * effMult);
  if (mult === 0) log(`是药三分毒——这味药你已服过太多次，药性入口即散，只留下燥热的药蚀。`, "hurt");
  else if (mult < 1) log(`同种递减：这味药的药效只剩 ${Math.round(mult * 100)}%，药蚀却一分不少。`, "dim");
  if (yaoshiState().name !== "无碍") sys(`【药蚀 ${Math.round(S.yaoshi)}/100 · ${yaoshiState().name}】${yaoshiState().desc}。`);
  return effMult;
}
/* ---------- 心魔（设定集）：六种养料喂养，四阶段递进；道心是对抗面 ---------- */
function xinmoStage() {
  const v = S.xinmo || 0;
  if (v >= 100) return { name: "化魔", desc: "神智沦丧——魔道六宗的兵源，一半是这么来的" };
  if (v >= 75) return { name: "心魔将劫", desc: "心魔劫一触即发：破境时它必具现拦路" };
  if (v >= 50) return { name: "执念成形", desc: "梦中低语，情绪起落不定；破境将引动心魔劫" };
  if (v >= 25) return { name: "杂念丛生", desc: "修炼效率 -5%" };
  return { name: "心境清明", desc: "杂念未起" };
}
function addXinmo(n, why) {
  if (!S || S.over) return;
  if (n > 0 && hasTitle("panshiT")) n = Math.max(1, Math.round(n * 0.7)); // 称号「磐石道心」：心魔抗性 +30%
  const before = xinmoStage().name;
  S.xinmo = Math.min(100, Math.max(0, (S.xinmo || 0) + n));
  const after = xinmoStage().name;
  if (n > 0 && after !== before) sys(`【心魔 · ${after}】${why ? why + "——" : ""}${xinmoStage().desc}。`);
  if ((S.xinmo || 0) >= 100) { // 化魔：神智沦丧，此世终结
    die("心魔噬主。你眼底最后一点清明熄灭时，识海里那声音笑了——用你的嗓音。魔道又多了一具兵源。", "化魔");
  }
}
/* 功法解锁反哺：第一次握到功法的那一刻，门就开了 */
function techniqueUnlockFx(id) {
  if (id === "yinqi") { gainAttr("int", 0.3); sys(`【功法解锁】《引气诀》入心——吐纳从此有门，智力 +0.3。修为之道，自今日始。`); }
  else if (id === "quanpu") { gainAttr("str", 0.3); sys(`【功法解锁】《锻骨拳谱》入心——筋骨从此有路，力量 +0.3。修为之道，自今日始。`); }
  else return;
  chronicle(`习得功法「${id === "yinqi" ? "引气诀" : "锻骨拳谱"}」`, "evt");
}
/* 功法里程碑：小成（熟练度过半）与圆满两档反哺——0 阶功法 +0.3/+0.7，1 阶引气诀 +2/+5（对齐设定集「功法反哺」） */
const TECH_CAPS = { 乱拳: 100, 锻骨拳谱: 100, 引气诀: 200 };
function checkSkillMilestone(sk) {
  if (!(sk in TECH_CAPS)) return;
  const cap = TECH_CAPS[sk];
  const fb = sk === "引气诀" ? { a: "int", an: "智力", half: 2, full: 5 } : { a: "str", an: "力量", half: 0.3, full: 0.7 };
  if ((S.skills[sk] || 0) >= cap / 2 && !S.flags["fb50" + sk]) { S.flags["fb50" + sk] = 1; gainAttr(fb.a, fb.half); sys(`【功法小成】「${sk}」反哺：${fb.an} +${fb.half}。`); }
  if ((S.skills[sk] || 0) >= cap && !S.flags["fb100" + sk]) { S.flags["fb100" + sk] = 1; gainAttr(fb.a, fb.full); sys(`【功法圆满】「${sk}」反哺：${fb.an} +${fb.full}。后续功法灰显封存，待修为突破。`); }
  // 功法自动进阶（设定 v5：连续推演下一阶段功法）——野路子也能磨出正经传承
  if ((S.skills[sk] || 0) >= cap && !S.flags["adv" + sk]) {
    S.flags["adv" + sk] = 1;
    if (sk === "乱拳" && !S.inv.quanpu) { techniqueUnlockFx("quanpu"); S.inv.quanpu = 1; sys(`【连续推演】野路子走到头，你竟自「乱拳」中推演出正经拳路——《锻骨拳谱》入手。`); }
    else if (sk === "锻骨拳谱" && !S.inv.yinqi) { techniqueUnlockFx("yinqi"); S.inv.yinqi = 1; sys(`【连续推演】拳谱圆满，气感自生——你从中推演出吐纳之法，《引气诀》入手。`); }
    else if (sk === "引气诀") sys(`【「引气诀」已推演至尽头——此卷只到此处。更高的传承，要去更高的地方找。】`);
  }
}

/* ================= 界面工具 ================= */
const $ = s => document.querySelector(s);
function log(text, cls) {
  const div = document.createElement("div");
  div.className = "logline" + (cls ? " " + cls : "");
  div.innerHTML = text;
  $("#log").appendChild(div);
  requestAnimationFrame(() => div.scrollIntoView({ behavior: "smooth", block: "end" }));
}
function sys(t) { log(t, "sys"); }
function toast(t) {
  const el = $("#toast"); el.innerHTML = t; el.classList.add("show");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2600);
}
function setChoices(list) {
  if (S) S._choiceSet = true;
  const box = $("#choices"); box.innerHTML = "";
  const keys = ["A", "B", "C", "D", "E", "F", "G", "H"];
  list.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "choice" + (c.free ? " free" : "") + (c.cls ? " " + c.cls : "");
    b.disabled = !!c.disabled;
    b.innerHTML = `<span class="key">${keys[i]}</span>${esc(c.label)}` + (c.hint ? `<span class="hint">${esc(c.hint)}</span>` : "");
    b.onclick = () => { if (!c.disabled) c.fn(); };
    box.appendChild(b);
  });
}
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

/* ================= 面板渲染 ================= */
function bar(cls, cur, max, label) {
  const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  return `<div class="bar-label"><span>${label}</span><b>${Math.round(cur)} / ${max}</b></div>
    <div class="bar ${cls}"><i style="transform:scaleX(${pct})"></i></div>`;
}
function renderPanel() {
  if (!S) return;
  const idenNote = S.iden ? `${S.iden.name} · ${S.iden.grade}档` : "青石城 · 乞丐";
  $("#whoName").textContent = S.name;
  const layerTxt = miniLayer() >= 0 ? "·" + LAYER_NAMES[miniLayer()] : "";
  $("#whoRealm").textContent = `${S.sect ? S.sect + " · " : ""}${REALM_NAMES[S.realm]}${layerTxt}${S.realm >= 6 ? "（凡阶圆满）" : S.realm >= 1 ? `（修为 ${Math.round(S.cult)}/${REALM_NEED[S.realm + 1]}）` : "（未入流）"} · 第${S.world}世 · ${idenNote}`;
  const need = REALM_NEED[S.realm + 1];
  $("#bars").innerHTML =
    bar("hp", S.hp, hpMax(), "气血") +
    bar("sta", S.sta, staMax(), "体力") +
    (S.realm >= 5 ? bar("mp", S.mp, mpMax(), "法力") : `<div class="bar-label"><span>法力</span><b>未开气海</b></div><div class="bar mp"><i style="transform:scaleX(0)"></i></div>`) +
    bar("hun", 100 - S.hunger, 100, "饱食") +
    bar("cult", S.realm >= 6 ? 1 : S.cult, S.realm >= 6 ? 1 : (need || 1), "修为");
  const A = [["str", "力量"], ["agi", "敏捷"], ["int", "智力"], ["con", "体质"], ["luck", "气运"]];
  $("#attrs").innerHTML = A.map(([k, n]) =>
    `<div class="attr${k === "luck" ? " luck" : ""}"><em>${n}</em><b>${attr(k)}</b></div>`).join("");
  $("#rows").innerHTML =
    `<div class="p-row pv-row" data-pv="1"><span>综合战力</span><b>${displayPower()}</b></div>
     <div class="p-row dx-row" data-dx="1"><span>道心</span><b>${daoText()}${(S.xinmo || 0) >= 25 ? " ·【" + xinmoStage().name + "】" : ""}</b></div>
     <div class="p-row ht-row" data-ht="1"><span>康健</span><b>${injuryTier().name}${injuryTier().pen ? "（战力 -" + injuryTier().pen + "%）" : ""}${S.debuff === "weak" ? " ·【元气大伤】" : ""}${(S.yaoshi || 0) >= 30 ? " ·【" + yaoshiState().name + "】" : ""}</b></div>
     <div class="p-row"><span>铜钱</span><b>${S.money} 文</b></div>
     <div class="p-row"><span>下品灵石</span><b>${S.stones} 枚</b></div>
     <div class="p-row"><span>万象点</span><b class="gold">${S.points}</b></div>
     <div class="p-row lg-row" data-lg="1"><span>灵根</span><b>${linggen().name}</b></div>
     <div class="p-row tt-row" data-tt="1"><span>称号</span><b>${S.wornTitle && TITLES[S.wornTitle] ? "「" + TITLES[S.wornTitle].name + "」" : (META.titles && META.titles.length ? "未佩戴 · " + META.titles.length + " 枚" : "无")}</b></div>
     ${(META.comments && META.comments.length) ? `<div class="p-row tt-row" data-cm="1"><span>前世评语</span><b>${META.comments[META.comments.length - 1].grade} · ${META.comments.length} 世留评</b></div>` : ""}
     ${S.job ? `<div class="p-row"><span>职业</span><b>${S.job}</b></div>` : ""}
     <div class="p-row"><span>状态</span><b>${S.debuff === "weak" ? "【元气大伤】" : S.hunger > 85 ? "【极度饥饿】" : S.hunger > 70 ? "【饥饿】" : "尚可"}</b></div>`;
  const lgRow = $("#rows [data-lg]"); // 灵根详情：五行亲和与实务规则
  if (lgRow) lgRow.onclick = () => {
    const wx = wxOf();
    const sum = wxSum();
    showInfo(`灵根 · ${linggen().name}`, `<span style="color:var(--gold-dim)">${linggen().variant ? "变异灵根" : "先天五行资质"}</span>`,
      esc(linggen().desc || "") + (linggen().bonus ? " " + esc(linggen().bonus) + "。" : ""),
      `五行亲和（总和 ${sum}${sum > 100 ? "，后天已破百" : " / 100"}）：` + WX_ELS.map(e => `${WX_NAMES[e]} ${wx[e]}`).join(" · ") +
      `<br>该行功法修炼速度 = 1 + 亲和×0.005；抗性 = 亲和×0.003（封顶 30%）；亲和不足 10 强行修炼该行减半<br>生克：金克木、木克土、土克水、水克火、火克金——克制方 +20%，被克方 -20%`);
  };
  const pvRow = $("#rows [data-pv]"); // 战力拆解：常态值 / 修正 / 成因
  if (pvRow) pvRow.onclick = () => showInfo("战力拆解", `<span style="color:var(--gold-dim)">系统推演 · 完整拆解</span>`,
    `当前 ${combatPower()} ｜ 对外显示 ${displayPower()}`, powerBreakdown().join("<br>"));
  const ttRow = $("#rows [data-tt]"); // 称号：佩戴示人，效果永续
  if (ttRow) ttRow.onclick = () => {
    const owned = META.titles || [];
    const acts = owned.map(tid => ({ label: (S.wornTitle === tid ? "卸下「" : "佩戴「") + TITLES[tid].name + "」", fn: () => {
      S.wornTitle = S.wornTitle === tid ? null : tid;
      $("#infoModal").classList.remove("open");
      sys(S.wornTitle ? `你亮出名号——「${TITLES[S.wornTitle].name}」。江湖看人，先看名号。` : `你收起了名号。`);
      renderPanel();
    } }));
    showInfo("称号", `<span style="color:var(--gold-dim)">随魂封存 · 效果永续</span>`,
      owned.length ? owned.map(tid => `${S.wornTitle === tid ? "◈" : "◇"}「${TITLES[tid].name}」——${TITLES[tid].desc}（源自：${TITLES[tid].from}）`).join("<br>") : "尚无称号。千秋录里的一些成就，会赠你一个江湖名号。",
      "称号效果无需佩戴、永续生效；佩戴只是把名号亮给江湖看。", acts);
  };
  const cmRow = $("#rows [data-cm]"); // 前世评语：钉在面板上的历世判词（轮回法则 15.2）
  if (cmRow) cmRow.onclick = () => showInfo("历世评语", `<span style="color:var(--gold-dim)">系统阅卷 · 随魂封存</span>`,
    META.comments.slice().reverse().map(c => `第${c.world}世 ·【${c.grade}】${c.text}`).join("<br><br>"),
    "评级解释权归系统所有。它偶尔毒舌，但从不克扣。");
  const htRow = $("#rows [data-ht]"); // 康健：伤病四级
  if (htRow) htRow.onclick = () => showInfo("康健 · 伤病四级", `<span style="color:var(--gold-dim)">世界会记住你受过的伤</span>`,
    `当前：${injuryTier().name}（气血 ${Math.round(S.hp)}/${hpMax()}）｜ 药蚀 ${Math.round(S.yaoshi || 0)}/100 · ${yaoshiState().name}`,
    `轻伤 -10% ｜ 中伤 -30% ｜ 重伤 -50% ｜ 濒死 -80%。伤势按体质判定：同样的刀，体质高者皮开肉绽，体质低者当场透胸。<br>治疗途径：凡俗医药、丹药、运功疗伤、灵物奇缘。带伤硬撑是有利息的——旧伤未愈再添新伤，落下【暗伤】便难逆转。<br>——药蚀（面板隐藏数值，系统推演可见）：${yaoshiState().desc}。同种丹药递减（100% → 50% → 25% → 无效且药蚀翻倍）；每月自然代谢 -5（境界越高越快），排毒丹可解，以毒攻毒非长久之计。`);
  const dxRow = $("#rows [data-dx]"); // 道心 × 心魔
  if (dxRow) dxRow.onclick = () => showInfo("道心 × 心魔", `<span style="color:var(--gold-dim)">心魔用你的声音说话</span>`,
    `道心 ${Math.round(S.daoXin)}/100 · ${daoText()} ｜ 心魔 ${Math.round(S.xinmo || 0)}/100 · ${xinmoStage().name}`,
    `${xinmoStage().desc}。<br>心魔的养料：执念、愧疚、恐惧（濒死与前世死亡记忆）、欲望、心境与修为不匹配（词条让你战力一夜暴涨，道心一步没走）、天地异动。道心的涨跌：红尘历练、问心无愧则涨；违心背信、临阵脱逃则跌。<br>四阶段：杂念（修炼 -5%）→ 执念成形（梦中低语）→ 心魔劫（破境时具现，斩/渡/笑三种过法）→ 化魔（神智沦丧）。<br>化解：打坐静心、道心 60+ 自净、渡劫直面。`);
  const lv = sysLv();
  $("#pity").innerHTML =
    `<span>十抽保底 ${Math.floor(S.pity10)}/10（${lv >= 4 ? "紫" : "青"}↑）</span><span>百抽保底 ${Math.floor(S.pity100)}/100（${lv >= 6 ? "金" : "紫"}↑）</span>${lv >= 8 ? `<span>千抽 ${Math.floor(S.pity1000 || 0)}/${lv >= 10 ? 500 : 1000}（红）</span>` : ""}<span>累计 ${S.pulls} 抽 · 轮盘 Lv${lv}</span>`;
  $("#cal-date").innerHTML = `仙陨历 30000年 · 冬 · 第 <b>${S.day}</b> 日 · <b>${["晨", "午", "昏", "夜"][S.slot]}</b>`;
  $("#cal-weather").textContent = S.weather + (S.flags.coldSnap ? " · 寒潮" : "") + (AI.getCfg() && AI.getCfg().key ? " · AI 天道" : " · 推演天道");
  renderTab();
}
let curTab = 0;
/* ---------- 详情弹窗 ---------- */
const ITEM_INFO = {
  heimu: { name: "黑馍", tier: "凡物", desc: "又冷又硬的黑面馍馍，乞丐的主食。磨牙，但顶饿。食用恢复饱食 22 点——点开即可直接吃，不必等剧情选项。" },
  wood: { name: "柴薪", tier: "凡物", desc: "城外矮林砍来的干柴。雪天柴贵，市集六文一捆；夜里生火可御风寒（柴薪 ×2）。" },
  mianao: { name: "老棉袄", tier: "凡物", desc: "厚实的老棉袄，浆洗得发硬。穿上它，风雪与寒潮夜不再冻伤气血。" },
  chaidao: { name: "豁口柴刀", tier: "凡物", desc: "一柄磨得只剩半个豁口的柴刀。砍柴效率 +1，关键时刻也能当兵器使。" },
  jiansui: { name: "玄铁剑穗", tier: "来历不明", desc: "一截乌沉沉的剑穗，非金非铁，坠手冰凉。识货的人见了会变色——它不该出现在一个乞丐手里。" },
  quanpu: { name: "《锻骨拳谱》", tier: "0 阶功法", desc: "无名残卷，记载淬体拳路。演练可增长修为与力量，熟练度满 100% 反哺力量。" },
  yinqi: { name: "《引气诀》", tier: "1 阶功法", desc: "吐纳引气之法诀。修行效率大增，打坐收益远胜寻常吐纳。" },
  juqiDan: { name: "聚气丹", tier: "1 阶丹药", desc: "低阶丹药，服之助涨修为约 30 点。卡在破境门槛前用，恰到好处——点开即可直接服用。" },
  hotnoodle: { name: "热汤面", tier: "凡食", desc: "一碗下肚，从舌尖暖到脚尖。点开即食（饱食 +40，算一顿热食）。" },
  shaojiu: { name: "烧刀子", tier: "凡品", desc: "烈酒穿喉。点开饮下（饱食 +10，气血微暖，道心一荡）。" },
  medicine: { name: "跌打药", tier: "凡药", desc: "回春堂金疮药，外伤圣品。点开敷用（气血 +6）。" },
  huobun: { name: "火把", tier: "凡物", desc: "松脂火把。夜探密林时的底气，囤着总没错。" },
  gongfuTea: { name: "凝神香片", tier: "丹茶", desc: "茶棚的看家货。点开泡饮，打坐吐纳效率倍增一次（修为 +12）。" },
  zhuJidan: { name: "筑基丹", tier: "南荒奇珍", desc: "南荒流出的奇丹，低阶散修梦寐以求。点开服之（修为 +60）。" },
  paiduDan: { name: "排毒丹", tier: "凡品丹药", desc: "排解药蚀的丹药。点开服之（药蚀 -15）——治标不治本，本身也含微量药蚀，以毒攻毒非长久之计。" },
  fangcun: { name: "方寸戒", tier: "法器", desc: "内蕴一方小空间的储物法器。得此戒者，行囊各 +10。" },
};
function showInfo(title, tierHTML, desc, meta, actions) {
  $("#infoBody").innerHTML = `<h3>${title}</h3>${tierHTML ? `<div class="info-tier">${tierHTML}</div>` : ""}
    <p class="info-desc">${desc}</p>${meta ? `<div class="info-meta">${meta}</div>` : ""}
    <div class="info-actions"></div>`;
  const abox = $("#infoBody .info-actions");
  (actions || []).forEach(a => {
    const b = document.createElement("button");
    b.className = "gbtn small"; b.textContent = a.label; b.onclick = a.fn;
    abox.appendChild(b);
  });
  $("#infoModal").classList.add("open");
}
function renderTab() {
  const body = $("#panelTabBody");
  document.querySelectorAll(".tabrow button").forEach((b, i) => b.classList.toggle("on", i === curTab));
  if (curTab === 0) {
    const ids = S.cardOrder;
    body.innerHTML = ids.length ? `<div class="chips">` + ids.map(id => {
      const c = findCard(id); const t = cardTier(id);
      return `<span class="chip" data-card="${id}" style="color:${TIERS[t].css};border-color:${TIERS[t].css}55">${c.name}<small>${TIERS[t].name}</small></span>`;
    }).join("") + `</div>` : `<div class="empty">词条栏空空如也。转动轮盘，或承受命运。</div>`;
    body.querySelectorAll("[data-card]").forEach(el => el.onclick = () => {
      const id = el.dataset.card, c = findCard(id), t = cardTier(id);
      const acts = [];
      const cost = STRIP_COST[t]; // 万象点第二用途：剥离不合心意的词条
      if (cost != null) acts.push({ label: `剥离此词条（-${cost} 万象点）`, fn: () => {
        if (S.points < cost) { toast("万象点不足，剥离不起。"); return; }
        S.points -= cost;
        S.cards[id]--;
        if (S.cards[id] <= 0) { delete S.cards[id]; S.cardOrder = S.cardOrder.filter(x => x !== id); }
        sys(`【词条剥离】「${c.name}」化作光点散去。祸福相倚——昨天的霉运，可能是明天的救命稻草。`);
        $("#infoModal").classList.remove("open");
        computeMods(); renderPanel();
      } });
      showInfo(`「${c.name}」`, `<span style="color:${TIERS[t].css}">${TIERS[t].name}词条</span>`,
        esc(c.eff) + "。",
        `持有 ${S.cards[id]} 个 · 同类 ×3 自动合成更高阶<br>效果已实时结算于面板，点词条可随时回看。` + (cost == null ? "<br>仙品词条欲剥离——系统沉默了很久，只回了三个字：不建议。" : ""),
        acts);
    });
  } else if (curTab === 1) {
    const inv = [];
    if (S.inv.heimu) inv.push(["heimu", `黑馍 ×${S.inv.heimu}`]);
    if (S.inv.wood) inv.push(["wood", `柴薪 ×${S.inv.wood}`]);
    if (S.inv.mianao) inv.push(["mianao", "老棉袄"]);
    if (S.inv.chaidao) inv.push(["chaidao", "豁口柴刀"]);
    if (S.inv.jiansui) inv.push(["jiansui", "玄铁剑穗"]);
    if (S.inv.quanpu) inv.push(["quanpu", "《锻骨拳谱》"]);
    if (S.inv.yinqi) inv.push(["yinqi", "《引气诀》"]);
    if (S.inv.juqiDan) inv.push(["juqiDan", `聚气丹 ×${S.inv.juqiDan}`]);
    if (S.inv.hotnoodle) inv.push(["hotnoodle", `热汤面 ×${S.inv.hotnoodle}`]);
    if (S.inv.shaojiu) inv.push(["shaojiu", `烧刀子 ×${S.inv.shaojiu}`]);
    if (S.inv.medicine) inv.push(["medicine", `跌打药 ×${S.inv.medicine}`]);
    if (S.inv.huobun) inv.push(["huobun", `火把 ×${S.inv.huobun}`]);
    if (S.inv.gongfuTea) inv.push(["gongfuTea", `凝神香片 ×${S.inv.gongfuTea}`]);
    if (S.inv.zhuJidan) inv.push(["zhuJidan", `筑基丹 ×${S.inv.zhuJidan}`]);
    if (S.inv.paiduDan) inv.push(["paiduDan", `排毒丹 ×${S.inv.paiduDan}`]);
    if (S.inv.fangcun && !S.flags.fangcunUsed) inv.push(["fangcun", "方寸戒"]);
    const skills = Object.keys(S.skills).map(k => `${k} ${Math.round(S.skills[k])}%`);
    body.innerHTML = (inv.length || skills.length)
      ? `<div class="chips">${inv.map(([id, label]) => `<span class="chip" data-item="${id}" style="color:var(--paper-70);border-color:var(--line)">${label}</span>`).join("")}</div>
        ${skills.length ? `<div class="p-row" style="margin-top:10px"><span>技艺</span><b>${skills.join(" · ")}</b></div>` : ""}`
      : `<div class="empty">两袖清风。破庙神像的裂缝里也许有东西。</div>`;
    body.querySelectorAll("[data-item]").forEach(el => el.onclick = () => {
      const it = ITEM_INFO[el.dataset.item];
      const id = el.dataset.item;
      const acts = [];
      const busyGuard = () => {
        if (gmBusy) { toast("天道推演中，稍候片刻。"); return true; }
        if (window.__inCombat) { toast("生死相搏，无暇他顾。"); return true; }
        return false;
      };
      const closeAnd = fn => () => { if (busyGuard()) return; $("#infoModal").classList.remove("open"); fn(); computeMods(); renderPanel(); advanceSlot(); };
      if (id === "heimu" && S.inv.heimu > 0) acts.push({ label: "吃掉（饱食 +22）", fn: closeAnd(() => {
        S.inv.heimu--;
        eatFood(22, "你啃完一块黑馍，又冷又硬，但胃里有了底。");
      })});
      if (id === "hotnoodle" && (S.inv.hotnoodle || 0) > 0) acts.push({ label: "吃下（饱食 +40）", fn: closeAnd(() => {
        S.inv.hotnoodle--;
        eatFood(40, "汤面下肚，你幸福得眯起眼。", true);
      })});
      if (id === "shaojiu" && (S.inv.shaojiu || 0) > 0) acts.push({ label: "饮下（御寒壮胆）", fn: closeAnd(() => {
        S.inv.shaojiu--;
        S.hunger = Math.max(0, S.hunger - 10);
        S.hp = Math.min(hpMax(), S.hp + 1);
        S.daoXin = Math.min(100, S.daoXin + 0.3);
        log("烈酒穿喉，一股火线落进胃里。雪夜似乎没那么冷了。", "good");
      })});
      if (id === "medicine" && (S.inv.medicine || 0) > 0) acts.push({ label: "敷药（气血 +6）", fn: closeAnd(() => {
        S.inv.medicine--;
        takeDrug("medicine", 0, 6);
        log("药粉洒在伤处，一阵清凉。气血回了些。", "good");
      })});
      if (id === "gongfuTea" && (S.inv.gongfuTea || 0) > 0) acts.push({ label: "泡饮（吐纳大增）", fn: closeAnd(() => {
        S.inv.gongfuTea--;
        takeDrug("gongfuTea", 12, 0);
        log("一盏香片入喉，杂念俱消。这一炷香的吐纳，抵得上平日半日之功。", "good");
      })});
      if (id === "juqiDan" && (S.inv.juqiDan || 0) > 0) acts.push({ label: "服丹（修为大涨）", fn: closeAnd(() => {
        S.inv.juqiDan--;
        takeDrug("juqiDan", 30, 0);
        log("【聚气丹】药力在腹中化开，一股暖流直冲四肢百骸，修为大涨一截。", "good");
        if (checkBreakthrough()) sys("【修为已圆满——「破境」契机已现，等待你的临门一脚。】");
      })});
      if (id === "zhuJidan" && (S.inv.zhuJidan || 0) > 0) acts.push({ label: "服丹（修为大进）", fn: closeAnd(() => {
        S.inv.zhuJidan--;
        takeDrug("zhuJidan", 60, 0);
        log("【筑基丹】南荒奇丹名不虚传，药力如洪流入海，修为硬生生拔高一截！", "good");
        if (checkBreakthrough()) sys("【修为已圆满——「破境」契机已现。】");
      })});
      if (id === "paiduDan" && (S.inv.paiduDan || 0) > 0) acts.push({ label: "服丹（药蚀 -15）", fn: closeAnd(() => {
        S.inv.paiduDan--;
        const own = (DRUG_SHI.paiduDan || 0) * (hasSpecial("huachang") || hasSpecial("baidu") ? 0.5 : 1) * (hasSpecial("zhichang") ? 0 : 1);
        S.yaoshi = Math.min(100, Math.max(0, (S.yaoshi || 0) - 15 + own)); // 以毒攻毒：本身含微量药蚀
        log("【排毒丹】清苦直下丹田，淤积的药蚀化开些许——以毒攻毒，终究不是长久之计。", "good");
      })});
      if (id === "fangcun" && (S.inv.fangcun || 0) > 0 && !S.flags.fangcunUsed) acts.push({ label: "滴血认主", fn: closeAnd(() => {
        S.flags.fangcunUsed = 1;
        S.inv.fangcun = 0; // 法器认主即随身
        log("一滴血落在戒面，方寸之间隐约有山川之影。行囊豁然开朗。", "good");
      })});
      showInfo(it.name, it.tier, it.desc,
        "行囊之物，随魂封存——下一世尽数清空，只余千秋录。",
        acts);
    });
  } else if (curTab === 3) {
    /* ---------- 任务栏（天道卷宗） ---------- */
    const q = S.quests || { active: [], done: [], failed: [] };
    const renderOne = id => {
      const d = QU.DEFS[id];
      if (!d) return "";
      const objs = d.objectives.map(o => {
        const done = (() => { try { return o.done(); } catch (e) { return false; } })();
        return `<div class="q-obj${done ? " done" : ""}">${done ? "✓ " : "· "}${esc(o.text())}</div>`;
      }).join("");
      return `<div class="quest-main${d.type === "side" ? " side" : ""}" data-qid="${id}">
        <div class="p-title"><b>${d.type === "main" ? "主 线" : "支 线"}</b><span>${esc(d.name)}</span></div>
        ${objs}<div class="q-desc">${esc(d.desc)}</div></div>`;
    };
    let html = q.active.length ? q.active.map(renderOne).join("") : `<div class="empty">卷宗空白。去活着，事会来找你。</div>`;
    if (q.done.length) html += `<div class="p-title" style="margin-top:16px"><b>已 了</b><span>${q.done.length} 项</span></div>
      <div class="q-done">${q.done.map(id => QU.DEFS[id] ? esc(QU.DEFS[id].name) : id).join(" · ")}</div>`;
    if (q.failed.length) html += `<div class="q-done" style="color:var(--blood-hi)">未成：${q.failed.map(id => QU.DEFS[id] ? esc(QU.DEFS[id].name) : id).join(" · ")}</div>`;
    body.innerHTML = html;
    body.querySelectorAll("[data-qid]").forEach(el => el.onclick = () => {
      const d = QU.DEFS[el.dataset.qid];
      showInfo(`「${d.name}」`, `<span style="color:var(--gold-dim)">${d.type === "main" ? "主线任务" : "支线任务"}</span>`,
        esc(d.desc), "目标随你的行动自动推进，完成即发放奖励。");
    });
  } else if (curTab === 2) {
    /* ---------- 商铺 · 云州杂货 ---------- */
    let html = `<div class="p-title"><b>云 州 杂 货</b><span>铜钱 ${S.money} 文 · 灵石 ${S.stones} 枚</span></div>`;
    const unlocked = SHOP_UNLOCK.filter(it => { try { return it.cond(); } catch (e) { return false; } });
    const lockedN = SHOP_UNLOCK.length - unlocked.length;
    const row = (it, isNew) => {
      const price = hasTitle("caishen") ? Math.ceil(it.price * 0.9) : it.price; // 称号「财神眷顾」：交易议价 +10%
      const pay = it.stones ? `${it.stones} 枚灵石${price ? " + " + price + " 文" : ""}` : `${price} 文`;
      const afford = it.stones ? S.stones >= it.stones && S.money >= price : S.money >= price;
      const stoneAlt = isNew && !it.stones ? Math.ceil(price / 200) : 0; // 修士物价：奇珍可全灵石折价（1 枚 ≈ 200 文）
      return `<div class="shop-row${isNew ? " new" : ""}" data-buy="${it.id}">
        <div class="shop-head"><b>${esc(it.name)}</b><span class="shop-kind">${esc(it.kind)}${isNew ? " · 新" : ""}</span><span class="shop-price">${pay}</span></div>
        <div class="shop-desc">${esc(it.desc)}</div>
        <button class="gbtn small" ${afford ? "" : "disabled"}>买下</button>
        ${stoneAlt ? `<button class="gbtn small ghost" data-stone="${stoneAlt}" ${S.stones >= stoneAlt ? "" : "disabled"}>灵石 ×${stoneAlt}</button>` : ""}</div>`;
    };
    html += SHOP_BASE.map(it => row(it, false)).join("");
    if (unlocked.length) html += `<div class="p-title" style="margin-top:14px"><b>奇 珍</b><span>闻你之名，店家从匣底取出的</span></div>` + unlocked.map(it => row(it, true)).join("")
      + `<div class="pityline" style="margin-top:8px"><span>修士物价与凡俗隔着重山——奇珍可用灵石折价支付（1 枚 ≈ 200 文）。</span></div>`;
    if (lockedN) html += `<div class="pityline" style="margin-top:10px"><span>尚有 ${lockedN} 件压箱底的东西——你的修为、缘分与身家，还差些火候。</span></div>`;
    body.innerHTML = html;
    body.querySelectorAll("[data-buy]").forEach(el => el.querySelector("button").onclick = () => {
      const all = SHOP_BASE.concat(SHOP_UNLOCK);
      const it = all.find(x => x.id === el.dataset.buy);
      if (!it) return;
      const price = hasTitle("caishen") ? Math.ceil(it.price * 0.9) : it.price;
      if (it.stones) { if (S.stones < it.stones) { toast("灵石不足。"); return; } S.stones -= it.stones; }
      if (S.money < price) { toast("铜钱不够。"); return; }
      S.money -= price;
      const had = (S.inv[it.id] || 0) > 0;
      S.inv[it.id] = (S.inv[it.id] || 0) + 1;
      if (!had && (it.id === "yinqi" || it.id === "quanpu")) techniqueUnlockFx(it.id); // 功法解锁反哺
      sys(`【购得】${it.name}（-${it.stones ? it.stones + " 灵石" : ""}${price ? price + " 文" : ""}）`);
      chronicle(`购得「${it.name}」`, "evt");
      S.stats.maxMoney = Math.max(S.stats.maxMoney || 0, S.money);
      computeMods(); renderPanel();
    });
    body.querySelectorAll("[data-stone]").forEach(btn => btn.onclick = () => {
      const rowEl = btn.closest("[data-buy]");
      const it = SHOP_BASE.concat(SHOP_UNLOCK).find(x => x.id === rowEl.dataset.buy);
      const n = +btn.dataset.stone;
      if (!it || S.stones < n) { toast("灵石不足。"); return; }
      S.stones -= n;
      const had = (S.inv[it.id] || 0) > 0;
      S.inv[it.id] = (S.inv[it.id] || 0) + 1;
      if (!had && (it.id === "yinqi" || it.id === "quanpu")) techniqueUnlockFx(it.id);
      sys(`【购得】${it.name}（-${n} 灵石，折价）`);
      chronicle(`以灵石折价购得「${it.name}」`, "evt");
      computeMods(); renderPanel();
    });
  } else if (curTab === 4) {
    /* ---------- 时间线（编年史） ---------- */
    let html = "";
    const lives = META.lives || [];
    if (lives.length) {
      html += `<div class="p-title"><b>轮 回</b><span>${lives.length} 世已逝</span></div><div class="tl-lives">` +
        lives.map(l => `<span class="tl-life ${l.end}">第${l.world}世 · ${l.end === "spring" ? "见春" : "殁"} · ${l.days}日 · ${esc(l.realm)}</span>`).join("") + `</div>`;
    }
    const ch = (S.chronicle || []).slice().reverse();
    html += `<div class="p-title" style="margin-top:14px"><b>此 世</b><span>${ch.length} 笔</span></div>`;
    if (!ch.length) html += `<div class="empty">时间尚未留下痕迹。</div>`;
    let lastDay = -1;
    html += `<div class="tl">` + ch.map(e => {
      let head = "";
      if (e.day !== lastDay) { head = `<div class="tl-day">— 第 ${e.day} 日 —</div>`; lastDay = e.day; }
      const icon = { scene: "·", evt: "◆", choice: "›", quest: "✦", "quest-fail": "✧", break: "▲", death: "✝" }[e.kind] || "·";
      return `${head}<div class="tl-row k-${e.kind}"><span class="tl-ico">${icon}</span><span class="tl-slot">${["晨", "午", "昏", "夜"][e.slot] || ""}</span><span class="tl-text">${esc(e.text)}</span></div>`;
    }).join("") + `</div>`;
    body.innerHTML = html;
  } else if (curTab === 5) {
    body.innerHTML = META.ach.length ? `<div class="chips">` + META.ach.map(id => {
      const a = ACHIEVEMENTS[id]; if (!a) return "";
      return `<span class="chip" data-ach="${id}" style="color:${TIERS[a.tier].css};border-color:${TIERS[a.tier].css}55">${a.name}</span>`;
    }).join("") + `</div><div class="pityline" style="margin-top:10px"><span>千秋录 · 随魂不灭 · 已刻 ${META.ach.length} 项</span></div>`
      : `<div class="empty">千秋录尚无一笔。去做成一件值得被记住的事。</div>`;
    body.querySelectorAll("[data-ach]").forEach(el => el.onclick = () => {
      const a = ACHIEVEMENTS[el.dataset.ach];
      showInfo(`「${a.name}」`, `<span style="color:${TIERS[a.tier].css}">${a.secret ? "隐藏成就" : "成就"}</span>`, esc(a.desc) + "。", "奖励：" + esc(a.reward));
    });
  } else {
    const ns = Object.keys(S.npc);
    body.innerHTML = ns.length ? ns.map(n => {
      const v = S.npc[n];
      const flavor = v >= 80 ? "生死之交。你若开口，他愿以命相陪。" :
        v >= 40 ? "贵人。逢他之处，多是顺遂。" :
        v >= 20 ? "对你有几分好感，记得你的名字。" :
        v > -20 ? "萍水相逢，点头之交。" :
        v > -40 ? "猜疑、微怨。冷脸与绊子，都从小事起。" :
        v > -70 ? "记恨在心。当心背后。" :
        v > -90 ? "深仇大恨。他会在暗处等你失足。" : "不死不休。见之即杀。";
      return `<div class="p-row" data-npc="${esc(n)}"><span>${esc(n)}</span><b>${v > 0 ? "+" : ""}${v} ${relText(v)}</b></div>
        <div style="display:none" data-flavor="${esc(n)}">${flavor}</div>`;
    }).join("") : `<div class="empty">缘分簿空白。你遇到的每个人，都会被记下。</div>`;
    body.querySelectorAll("[data-npc]").forEach(el => el.onclick = () => {
      const n = el.dataset.npc, v = S.npc[n];
      showInfo(n, `<span style="color:${v >= 0 ? "var(--gold-dim)" : "var(--blood-hi)"}">${relText(v)}（${v > 0 ? "+" : ""}${v}）</span>`,
        el.nextElementSibling.textContent,
        "缘分由你的抉择增减，随此生而终，不随轮回。生死之交（+80）：每世一次，他会在你必死时赶来（人情是债，缘分 -20）；死仇（-70 以下）会雇人寻上门，-90 以下不死不休、亲自前来——但若能把死仇走回正缘，便是「化干戈」，气运 +1。");
    });
  }
}
function relText(v) { return v >= 80 ? "生死之交" : v >= 40 ? "贵人" : v >= 20 ? "好感" : v > -20 ? "路人" : v > -40 ? "微怨" : v > -70 ? "记恨" : v > -90 ? "深仇" : "不死不休"; }

/* ---------- 编年史（时间线） ---------- */
function chronicle(text, kind) {
  if (!S || !S.chronicle) return;
  S.chronicle.push({ day: S.day, slot: S.slot, text: String(text).slice(0, 80), kind: kind || "evt" });
  if (S.chronicle.length > 400) S.chronicle = S.chronicle.slice(-400);
}
function lifeRecord() {
  if (!META.lives) META.lives = [];
  return META.lives;
}

function gainAch(id) {
  if (META.ach.includes(id)) return;
  META.ach.push(id); saveMeta();
  if (S && S.lifeAch && !S.lifeAch.includes(id)) S.lifeAch.push(id); // 当世首达名录（轮回结算 · 千秋录维度）
  const a = ACHIEVEMENTS[id];
  sys(`【千秋录 · 新刻成就】${a.secret ? "（隐藏）" : ""}「${a.name}」——${a.desc}。奖励：${a.reward}。`);
  if (id === "baonuan") S.points += 5;
  if (id === "firstPot") S.points += 10;
  if (id === "gacha10") S.points += 10;
  if (id === "juqi") S.points += 100;
  if (id === "xuanCard") S.points += 50;
  if (id === "shengCard") S.base.luck = Math.min(10, S.base.luck + 1);
  if (id === "hotRice") S.base.con += 1;
  if (id === "wolfKill") S.base.str += 1;
  if (id === "survive30") S.points += 150;
  if (id === "quest1") S.points += 5;
  if (id === "shengsi") S.flags.yibao = 1; // 称号「义薄云天」：陌生人初始好感 +10
  if (id === "huagan") S.base.luck = Math.min(10, S.base.luck + 1); // 化干戈：气运 +1
  if (id === "mingbu") S.base.con = Math.min(10, Math.round((S.base.con + 1) * 10) / 10); // 命不该绝：体质 +1
  if (ACH_TITLE[id]) gainTitle(ACH_TITLE[id]); // 成就授称号
  // 翻页奖励：千秋录每刻满 10 项翻过一页，赠一次「天命一抽」——必出青品以上，不耗万象点、不占保底计数
  if (META.ach.length % 10 === 0) {
    const t = rollTier(2);
    const card = CARD_POOL[t][Math.floor(Math.random() * CARD_POOL[t].length)];
    sys(`【千秋录 · 翻页】刻满 ${META.ach.length} 项成就，赠「天命一抽」——「${card.name}」（${TIERS[t].name}），不占保底。`);
    addCard(card, t);
  }
  computeMods(); renderPanel();
}
/* ---------- 称号（随魂封存，效果永续） ---------- */
function hasTitle(id) { return (META.titles || []).includes(id); }
function gainTitle(id) {
  if (!TITLES[id] || hasTitle(id)) return;
  META.titles.push(id); saveMeta();
  const t = TITLES[id];
  sys(`【称号 ·「${t.name}」】${t.desc}——称号随魂封存，生生世世的江湖都记得。`);
  computeMods();
}
function addNpc(name, v) {  const mult = 1 + (S.mods.socialP || 0) / 100;
  if (v > 0) v = Math.round(v * mult);
  if (!(name in S.npc) && S.flags.yibao) S.npc[name] = 10; // 称号「义薄云天」：陌生人初始好感 +10
  const before = S.npc[name] || 0;
  S.npc[name] = Math.max(-100, Math.min(100, before + v));
  S.npcMin = S.npcMin || {};
  if (S.npcMin[name] == null || S.npc[name] < S.npcMin[name]) S.npcMin[name] = S.npc[name];
  if (before < 80 && S.npc[name] >= 80) { // 人缘类成就：第一位生死之交
    chronicle(`与「${name}」结为生死之交`, "npc");
    sys(`【生死之交】${name}——你若开口，他愿以命相陪。人情是债，你攒的不是人情，是天看见你的次数。`);
    gainAch("shengsi");
  }
  if ((S.npcMin[name] || 0) <= -90 && S.npc[name] > 0) { // 死仇化解为正缘
    chronicle(`与「${name}」化干戈为玉帛`, "npc");
    sys(`【化干戈】一段不死不休的死仇，竟被你走回了正缘。说书人都不敢这么编。`);
    gainAch("huagan");
  }
}

/* ================= 万象轮盘 ================= */
function sysLv() { return META.sysLv || 1; }
/* 概率随系统等级成长：偶数级沿用前一奇数级概率表 */
function curProb() { const lv = sysLv(); return SYS_PROB[lv] || SYS_PROB[lv - 1] || SYS_PROB[1]; }
/* 升级门槛 = 累计抽卡（跨世）+ 宿主修为；升级不清空任何保底与词条 */
function checkSysLvUp() {
  const cur = sysLv();
  if (cur >= 10) return;
  const next = SYS_LV[cur]; // SYS_LV[0] 是 Lv1，下一级即索引 cur
  if (!next) return;
  if ((META.totalPulls || 0) >= next.pulls && S.realm >= (next.realm || 0)) {
    META.sysLv = cur + 1; saveMeta();
    sys(`【万象轮盘升级 · Lv${META.sysLv}】${next.note}。`);
  }
}
function rollTier(guaranteeMin) {
  const probs = curProb();
  const r = Math.random() * 100; let acc = 0, t = 0;
  for (let i = 0; i < probs.length; i++) { acc += probs[i]; if (r < acc) { t = i; break; } }
  if (guaranteeMin != null && t < guaranteeMin) t = guaranteeMin;
  return t;
}
/* 卡池预览（Lv2）：青品以上大概率偏向当月主题 */
function pickCardThemed(t) {
  const pool = CARD_POOL[t];
  if (sysLv() >= 2 && t >= 2 && META.poolTheme && Math.random() < 0.5) {
    const th = POOL_THEMES.find(x => x.name === META.poolTheme);
    if (th) {
      const sub = pool.filter(c => th.kw.some(k => (c.name + c.eff).includes(k)));
      if (sub.length) return sub[Math.floor(Math.random() * sub.length)];
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
function pullOnce(forceMin) {
  let minT = null;
  const speed = 1 + (S.mods.pityR || 0) / 100;
  const lv = sysLv();
  const tenFloor = lv >= 4 ? 3 : 2, hunFloor = lv >= 6 ? 4 : 3; // 保底随系统一同长大
  const p1000need = lv >= 10 ? 500 : 1000;
  if (lv >= 8 && (S.pity1000 || 0) + speed >= p1000need) minT = 5;
  else if (S.pity100 + speed >= 100) minT = hunFloor;
  else if (S.pity10 + speed >= 10) minT = tenFloor;
  if (forceMin != null) minT = Math.max(minT || 0, forceMin);
  const t = rollTier(minT);
  const card = pickCardThemed(t);
  // 自然抽出该档保底品级以上 → 该档计数清零（高档清零低档）
  if (t >= 5) { S.pity1000 = 0; S.pity100 = 0; S.pity10 = 0; }
  else {
    if (t >= hunFloor) S.pity100 = 0; else S.pity100 += speed;
    if (t >= tenFloor) S.pity10 = 0; else S.pity10 += speed;
    S.pity1000 = (S.pity1000 || 0) + speed;
  }
  S.pulls++;
  META.totalPulls = (META.totalPulls || 0) + 1; saveMeta();
  addCard(card, t);
  checkSysLvUp();
  return { card, t };
}
function addCard(card, t) {
  S.cards[card.id] = (S.cards[card.id] || 0) + 1;
  if (!S.cardOrder.includes(card.id)) S.cardOrder.push(card.id);
  if (S.cards[card.id] >= 3) {
    const fuse = FUSION[card.id];
    S.cards[card.id] -= 3;
    if (S.cards[card.id] === 0) { delete S.cards[card.id]; S.cardOrder = S.cardOrder.filter(x => x !== card.id); }
    if (fuse) {
      const fid = card.id + "_fuse";
      S.cards[fid] = 1; if (!S.cardOrder.includes(fid)) S.cardOrder.push(fid);
      setTimeout(() => sys(`【同类词条 ×3，轮盘自动合成】「${fuse.name}」——${fuse.eff}`), 400);
    } else {
      S.points += 30;
      setTimeout(() => sys(`【重复词条 ×3，无处安放，轮盘将其熔为万象点 ×30。】`), 400);
    }
  }
  if (t >= 3) gainAch("xuanCard");
  if (t >= 4) gainAch("shengCard");
  if (t >= 5) gainAch("xianCard");
  if (t >= 3) addXinmo(2, "词条让你一夜暴涨，道心一步没走"); // 设定：心境与修为不匹配是心魔养料
  gainAch("gacha10");
  if (S.pulls >= 100) gainAch("gacha100");
  if (card.special === "yinguo" && S.cards[card.id] === 1) { // 因果赊账：立得万象点，债已记账
    S.points += 300;
    setTimeout(() => sys(`【因果赊账】万象点 ×300 已到账。天道记账，概不退换——它总会在你最不想还债的时候来敲门。`), 500);
  }
  for (const [a, b, rid] of COMBO_PAIRS) { // 彩蛋组合：撞对即自动合成，系统从不提示
    if (S.cards[a] > 0 && S.cards[b] > 0) {
      S.cards[a]--; if (!S.cards[a]) { delete S.cards[a]; S.cardOrder = S.cardOrder.filter(x => x !== a); }
      S.cards[b]--; if (!S.cards[b]) { delete S.cards[b]; S.cardOrder = S.cardOrder.filter(x => x !== b); }
      S.cards[rid] = 1; S.cardOrder.push(rid);
      const rc = COMBO_CARDS[rid];
      setTimeout(() => sys(`【彩蛋组合】「${rc.name}」——${rc.eff}`), 700);
    }
  }
  computeMods();
}
function openGacha() {
  $("#gacha").classList.add("open");
  $("#pulls").innerHTML = "";
  const lv = sysLv();
  const next = SYS_LV[lv]; // 下一级
  const probs = curProb();
  let info = `万象轮盘 · <b>Lv${lv}</b>（累计 ${META.totalPulls || 0} 抽）`;
  if (next) info += ` ｜ 下级 Lv${next.lv}：${next.pulls} 抽${next.realm ? " ＋ " + (REALM_NAMES[next.realm] || "更高境界") : ""}`;
  info += `<br>概率：${TIERS.map((t, i) => `${t.name} ${probs[i]}%`).join(" · ")}`;
  info += lv >= 4 ? ` ｜ 十抽必出紫↑` : ` ｜ 十抽必出青↑`;
  info += lv >= 6 ? ` ｜ 百抽必出金↑` : ` ｜ 百抽必出紫↑`;
  if (lv >= 8) info += ` ｜ ${lv >= 10 ? "五百" : "千"}抽必出红`;
  if (lv >= 2) info += `<br>本月卡池倾向：「${META.poolTheme || "？"}」——青品以上大概率偏向`;
  $("#sysInfo").innerHTML = info;
  const ex = $("#stoneExch");
  if (lv >= 3) { // 以石易点：1 灵石 = 1 点，另收 10% 手续费，每世限兑 100 点
    ex.style.display = "";
    const left = Math.max(0, 100 - (S.stoneExch || 0));
    $("#btnStoneExch").disabled = S.stones < 11 || left < 10;
    $("#btnStoneExch").innerHTML = `以石易点<small style="opacity:.6">（11 灵石 → 10 万象点 · 本期余 ${left} 点）</small>`;
  } else ex.style.display = "none";
  updateGachaBtns();
}
function updateGachaBtns() {
  $("#btnPull1").disabled = S.points < 100;
  $("#btnPull10").disabled = S.points < 1000;
  $("#btnPull1").innerHTML = `单 抽<small style="opacity:.6">（100 点）</small>`;
  $("#btnPull10").innerHTML = `十 连<small style="opacity:.6">（1000 点）</small>`;
}
function doPulls(n) {
  if (S.points < n * 100) return;
  S.points -= n * 100;
  updateGachaBtns(); renderPanel();
  const wheel = $("#wheel"); wheel.classList.add("spin");
  $("#pulls").innerHTML = "";
  setTimeout(() => {
    wheel.classList.remove("spin");
    const results = [];
    for (let i = 0; i < n; i++) results.push(pullOnce());
    results.forEach((r, i) => {
      const c = r.card;
      const el = document.createElement("div");
      el.className = "card";
      el.style.color = TIERS[r.t].css;
      el.style.borderColor = TIERS[r.t].css + "88";
      el.style.animationDelay = (i * 0.12) + "s";
      el.innerHTML = `<span class="glow"></span><span class="tier">${TIERS[r.t].name}</span>
        <span class="name">${c.name}</span><span class="eff">${c.eff}</span>`;
      $("#pulls").appendChild(el);
    });
    const best = Math.max(...results.map(r => r.t));
    if (best >= 4) sys("【轮盘迸出万丈金光——不，是血色的。它沉默了一瞬。】");
    else if (best >= 3) sys("【紫光乍现。质变级的词条落进你的识海。】");
    else if (best >= 2) sys("【青光一闪。这轮盘偶尔也做人事。】");
    renderPanel();
  }, n > 1 ? 1400 : 900);
}

/* ================= 时间推进 ================= */
function advanceSlot() {
  if (S.over) return;
  try { QU.check(); } catch (e) {}
  S.slot++;
  if (S.hunger < 100 && !hasSpecial("bigu")) S.hunger = Math.min(100, S.hunger + 6 * (S.mods.hungerR || 1));
  if (S.slot >= 4) { night(); return; }
  renderPanel(); gmTurn();
}
function night() {
  let lines = [];
  if (S.tempLuckDays > 0) S.tempLuckDays--;
  if (!hasSpecial("bigu")) S.hunger = Math.min(100, S.hunger + 4 * (S.mods.hungerR || 1));
  const cold = S.weather === "大雪" || S.weather === "风雪" || S.flags.coldSnap;
  if (cold && !S.inv.mianao && !S.flags.fireTonight) {
    const chk = attr("con") * 10 + attr("luck") * 4;
    if (chk < 45 + (S.flags.coldSnap ? 15 : 0)) {
      const dmg = Math.max(1, Math.round((2 + Math.floor(Math.random() * 2)) * (hasTitle("xiaoqiang") ? 0.9 : 1))); // 称号「小强」：环境伤害 -10%
      S.hp -= dmg; S.daoXin -= 0.5;
      lines.push(`<span style="color:var(--blood-hi)">寒气钻进骨头缝，你蜷缩着熬过一夜。气血 -${dmg}。</span>`);
    } else lines.push(`你把破毯裹紧了些，硬是扛过了这夜的寒。`);
  }
  if (hasSpecial("bigu")) { /* 辟谷 */ }
  else if (S.hunger >= 100) { S.hp -= 4; lines.push(`<span style="color:var(--blood-hi)">胃里像有把钝刀在搅。气血 -4。</span>`); }
  else if (S.hunger > 85) { S.hp -= 2; lines.push(`【极度饥饿】啃噬着你。气血 -2。`); }
  if (S.hunger < 70 && S.hp > 0) S.hp = Math.min(hpMax(), S.hp + attr("con") * 0.8 * (1 + (S.mods.hpRegenP || 0) / 100));
  S.sta = staMax() * (S.mods.staRegen >= 2 ? 1 : 0.85);
  if (S.realm >= 5 && S.mp < mpMax()) S.mp = Math.min(mpMax(), S.mp + mpMax() * 0.3 * (S.linggen === "za" ? 1.5 : 1)); // 杂灵根：回蓝 ×1.5
  if (S.debuff === "weak") { S.debuffDays = (S.debuffDays || 0) - 1; if (S.debuffDays <= 0) { S.debuff = null; lines.push(`元气终于回转，手脚重新有了力气。`); } }
  if (S.flags.ateHot) { S.foodStreak++; S.flags.ateHot = false; if (S.foodStreak >= 100) gainAch("hotRice"); } // 设定集：连续百日热食
  else S.foodStreak = 0;
  if (S.daoXin >= 90) gainAch("wukui"); // 问心无愧：道心 90
  if (S.money + S.stones * 200 >= 3000) gainAch("fujia"); // 富甲一方：身家三千文
  if (hasSpecial("meishen")) { S.flags.meishenDays = (S.flags.meishenDays || 0) + 1; if (S.flags.meishenDays >= 15) gainAch("dabusi"); } // 打不死的（趣味）
  if (hasSpecial("huaibi") && S.stones >= 15 && Math.random() < 0.08) { // 身怀重宝必被觊觎
    const stolen = Math.max(1, Math.floor(S.stones * 0.1)); S.stones -= stolen;
    lines.push(`<span style="color:var(--blood-hi)">【怀璧其罪】夜里有人摸进了破庙——灵石少了 ${stolen} 枚。财不外露，古人不欺你。</span>`);
  }
  // 药蚀（设定集）：每月自然代谢 -5、境界越高越快；60+ 蚀体损体；90+ 丹毒爆发，可能暴毙
  if (S.day % 30 === 0 && (S.yaoshi || 0) > 0) {
    const drain = 5 + S.realm;
    S.yaoshi = Math.max(0, S.yaoshi - drain);
    lines.push(`一月代谢，药蚀消解些许（-${drain}，余 ${Math.round(S.yaoshi)}）。`);
    if (S.yaoshi >= 60) { S.base.con = Math.max(1, Math.round((S.base.con - 0.1) * 10) / 10); lines.push(`<span style="color:var(--blood-hi)">丹毒蚀体：体质永久微损。</span>`); computeMods(); }
  }
  if ((S.yaoshi || 0) >= 90 && Math.random() < 0.1) {
    for (const k of ["str", "agi", "int", "con"]) S.base[k] = Math.max(1, Math.round(S.base[k] * 0.9 * 10) / 10);
    S.yaoshi = 60; S.hp -= hpMax() * 0.4; computeMods();
    lines.push(`<span style="color:var(--blood-hi)">【丹毒爆发】淤积的药毒在你睡梦里炸开——经脉如焚，属性暴跌，境界松动！</span>`);
    if (S.hp <= 0) { lines.forEach(l => log(l, "dim")); die("丹毒爆发，经脉俱焚。是药三分毒，你用命验证了后半句。", "丹毒"); return; }
  }
  // 心魔（设定集）：道心 60+ 自净；执念成形则梦中低语（穿越者两世记忆，双倍素材）
  if (S.daoXin >= 60 && (S.xinmo || 0) > 0 && Math.random() < 0.5) addXinmo(-2);
  if ((S.xinmo || 0) >= 50 && Math.random() < 0.4) {
    const whispers = S.world > 1
      ? ["梦里有人用你的声音问：「这一世，又要死在哪？」", "它给你看了一扇门——门后是另一个世界的灯火。你惊醒时，枕边一片凉。"]
      : ["梦里有人用你的声音问：「值得吗？」", "你在梦里数你怕的东西，数到天亮。", "半梦半醒间，有什么东西替你翻了个身。"];
    lines.push(`<span style="color:var(--paper-70,#cbb)">${whispers[Math.floor(Math.random() * whispers.length)]}</span>`);
  }
  S.day++;
  S.slot = 0;
  S.weather = ["大雪", "阴晦", "风雪", "晴冷", "冻雨"][Math.floor(Math.random() * 5)];
  if (S.day === 9 || S.day === 28) S.flags.coldSnap = true;
  if (S.day === 11 || S.day === 30) S.flags.coldSnap = false;
  S.flags.fireTonight = false;
  S.daySeen = [];
  log(`—— 冬 · 第 ${S.day} 日 · ${S.weather} ——`, "daybreak");
  lines.forEach(l => log(l, "dim"));
  if (S.hp <= 0) { die("冻饿而死。破庙的角落里，你安静地蜷缩成了一尊冰雕。", "冻毙"); return; }
  if (S.day >= 31) { ending(); return; }
  autoSave(); // 每天清晨自动落笔
  const foes = Object.entries(S.npc || {}).filter(([n, v]) => v <= -70); // 记恨以上：暗处等你失足
  if (foes.length && Math.random() < 0.06) {
    const [fn, fv] = foes[Math.floor(Math.random() * foes.length)];
    const self = fv <= -90; // 不死不休：亲至
    log(`<span style="color:var(--blood-hi)">【仇家寻上门】${self ? fn + "亲自来了——不死不休。" : fn + "雇的人摸到了你栖身的地方。"}</span>`);
    renderPanel();
    combat({ name: self ? fn : "仇家打手", power: Math.max(5, Math.round(4 + S.realm * 3 + Math.random() * 3 + (self ? 2 : 0))), canBeg: false }, () => { if (!S.over) gmTurn(); });
    return;
  }
  renderPanel(); gmTurn();
}

/* ================= GM 回合 ================= */
let gmBusy = false;
async function gmTurn() {
  if (S.over || gmBusy) return;
  gmBusy = true;
  setChoices([]);
  const loading = document.createElement("div");
  loading.className = "logline dim gm-loading";
  loading.innerHTML = `【天道推演中${AI.getCfg() && AI.getCfg().key ? " · Kimi 执笔" : ""}……】`;
  $("#log").appendChild(loading);
  loading.scrollIntoView({ behavior: "smooth", block: "end" });
  let turn;
  try { turn = await AI.narrate(); } catch (e) { turn = GM.compose(); }
  loading.remove();
  gmBusy = false;
  if (S.over) return;
  // 填了 Key 但 AI 没接管：明确告知原因，不再静默降级
  if (turn._src === "gm" && AI.getCfg() && AI.getCfg().key) {
    const why = AI.failInfo && AI.failInfo();
    toast("AI 未接管：" + (why ? esc(why) : "未知原因") + "，本回合由离线引擎推演");
  }
  // 承接上文的引子
  if (S.echoLine) { log(esc(S.echoLine), "dim"); chronicle(S.echoLine, "evt"); S.echoLine = null; }
  const srcKey = turn._src === "ai" || turn._src === "server" ? turn._src : "gm";
  const srcName = { ai: "Kimi 执笔", server: "服务端执笔", gm: "离线推演" }[srcKey];
  log(esc(turn.scene) + `<span class="src-tag src-${srcKey}" title="本场景剧情来源">${srcName}</span>`);
  chronicle(turn.scene.slice(0, 46), "scene");
  S.gmRecent = (S.gmRecent || []).concat(["scene:" + turn.scene.slice(0, 12)]).slice(-8);
  const choices = turn.choices.map(c => ({
    label: c.label, hint: c.hint, free: true,
    fn: () => { S._choiceSet = false; resolveFx(c.fx || {}, c.label); },
  }));
  if (checkBreakthrough()) {
    choices.unshift({ label: "【破境】积累已圆满", hint: "临门一脚。失败会元气大伤。", free: true, fn: () => askBreakthrough() });
  }
  // 任务选项注入（主线行动 + 支线邀约）
  for (const o of QU.offers()) {
    if (o.kind === "act") {
      choices.push({ label: `【主线】${o.label}`, hint: o.hint, cls: "quest", free: true,
        fn: () => { S._choiceSet = false; o.act(); } });
    } else {
      const id = o.id;
      if (!S.flags["qseen_" + id] && QU.DEFS[id] && QU.DEFS[id].offerText) {
        log(esc(QU.DEFS[id].offerText), "dim");
        S.flags["qseen_" + id] = 1;
      }
      choices.push({ label: `【${o.type === "main" ? "主线" : "支线"}】${o.label}`, hint: o.hint, cls: "quest", free: true,
        fn: () => { S._choiceSet = false; QU.activate(id); advanceSlot(); } });
      choices.push({ label: "推辞这门差事", hint: "机缘不等人，但也不会一夜跑光。", cls: "quest-dim", free: true,
        fn: () => { S._choiceSet = false; QU.refuse(id); advanceSlot(); } });
    }
  }
  // 卷宗催办：主线 4 日 / 支线 6 日未推进，系统检索相关剧情，询问是否推进（AI 已给出同任务选项时不重复注入）
  const ng = (typeof QU !== "undefined" && QU.nudge) ? QU.nudge() : null;
  if (ng && !turn.choices.some(c => c.fx && c.fx.quest && c.fx.quest.slice(-ng.id.length - 1) === ":" + ng.id)) {
    choices.push({ label: `【催办】${ng.d.name.replace(/^主线：|^支线：|^凡品任务：/, "")}（搁置 ${ng.days} 日）`, hint: "系统检索了相关剧情——要现在推进吗？", cls: "quest", free: true,
      fn: () => { S._choiceSet = false; QU.nudgeAct(ng.id); } });
  }
  choices.push({ label: "歇口气，静观其变", hint: "什么也不做，让时辰自己走过去。", free: true, fn: () => { S.daoXin = Math.min(100, S.daoXin + 0.3); S.sta = Math.min(staMax(), S.sta + 2); advanceSlot(); } });
  setChoices(choices);
}

/* ================= FX 结算 ================= */
function judgeState() {
  return { str: attr("str"), agi: attr("agi"), int: attr("int"), con: attr("con"), luck: attr("luck"),
    realm: S.realm, day: S.day, sta: Math.round(S.sta), hunger: Math.round(S.hunger), esc: S.mods.escapeP || 0,
    lg: linggenTestBonus() };
}
/* 数值/物品/缘分等核心应用（resolveFx 与任务奖励共用） */
function applyCore(fx) {
  fx = fx || {};
  const out = [];
  const num = (k, name, unit) => {
    if (!fx[k]) return;
    if (k === "cult") { if (gainCult(fx[k])) out.push(`修为 +${fx[k]}`); return; } // 无功法时修为机缘流失（gainCult 内有提示）
    applyNum(k, fx[k]); out.push(`${name} ${fx[k] > 0 ? "+" : ""}${fx[k]}${unit || ""}`);
  };
  function applyNum(k, v) {
    if (k === "money") S.money = Math.max(0, S.money + v);
    if (k === "stones") S.stones = Math.max(0, S.stones + v);
    if (k === "hp") S.hp += v;
    if (k === "sta") S.sta = Math.max(0, Math.min(staMax(), S.sta + v));
    if (k === "mp") S.mp = Math.max(0, Math.min(mpMax(), S.mp + v));
    if (k === "hunger") { if (!hasSpecial("bigu")) S.hunger = Math.max(0, S.hunger - v); }
    if (k === "dao") S.daoXin = Math.max(0, Math.min(100, S.daoXin + v));
    if (k === "points") S.points = Math.max(0, S.points + v);
  }
  num("money", "铜钱", " 文"); num("stones", "灵石", " 枚"); num("hp", "气血"); num("sta", "体力");
  num("mp", "法力"); num("hunger", "饱食"); num("cult", "修为"); num("dao", "道心"); num("points", "万象点");
  if (fx.attr) for (const k in fx.attr) { gainAttr(k, fx.attr[k]); out.push(`${{str:"力量",agi:"敏捷",int:"智力",con:"体质"}[k]} +${fx.attr[k]}`); } // 途径一·日常磨炼：日常成长有效
  if (fx.item) { const m = /^([a-zA-Z]+):(-?\d+)$/.exec(fx.item); if (m) { const id = m[1], n = +m[2];
    if (n > 0 && (id === "yinqi" || id === "quanpu") && !(S.inv[id] > 0)) techniqueUnlockFx(id); // 首次获得功法：解锁反哺
    S.inv[id] = Math.max(0, (S.inv[id] || 0) + n); out.push(`${{wood:"柴薪",heimu:"黑馍",mianao:"棉袄",chaidao:"柴刀",jiansui:"玄铁剑穗",quanpu:"《锻骨拳谱》",yinqi:"《引气诀》",juqiDan:"聚气丹"}[id] || id} ${n > 0 ? "+" : ""}${n}`); } }
  if (fx.clearWood) { S.inv.wood = 0; }
  if (fx.skill) { const m = /^(.+):(-?\d+)$/.exec(fx.skill); if (m) { const cap = TECH_CAPS[m[1]] || 100; S.skills[m[1]] = Math.min(cap, (S.skills[m[1]] || 0) + (+m[2])); checkSkillMilestone(m[1]); } }
  if (fx.wx) { const m = /^(jin|mu|shui|huo|tu):(-?\d+)$/.exec(fx.wx); if (m) { const wx = wxOf(); wx[m[1]] = Math.min(100, Math.max(0, wx[m[1]] + (+m[2]))); out.push(`${WX_NAMES[m[1]]}行亲和 ${+m[2] > 0 ? "+" : ""}${m[2]}`); } } // 后天亲和，可破先天总和
  if (fx.npc) for (const n in fx.npc) { addNpc(n, fx.npc[n]); out.push(`${n} 缘分 ${fx.npc[n] > 0 ? "+" : ""}${fx.npc[n]}`); }
  if (fx.flag) S.flags[fx.flag] = 1;
  if (fx.ach) gainAch(fx.ach);
  if (fx.card) { const r = pullOnce(1); out.push(`天降词条「${r.card.name}」（${TIERS[r.t].name}）`); }
  if (fx.luckCharm) { S.tempLuckDays = Math.max(S.tempLuckDays, fx.luckCharm * 2); out.push(`气运临时 +1（数日）`); }
  if (fx.coincidence) {
    S.flags.coincidence = (S.flags.coincidence || 0) + fx.coincidence;
    if (S.flags.coincidence >= 3) gainAch("hidden");
    out.push(`【你留意到这处「巧合」——棋盘似乎比你想象的大。】`);
  }
  // ---------- 连续性引子：挑一条最值得一记的后果，留给下一场景 ----------
  if (!S.echoLine) {
    if (fx.item) {
      const id = (String(fx.item).split(":")[0]) || "";
      if (["jiansui", "yinqi", "quanpu", "mianao", "chaidao"].includes(id) && S.inv[id] > 0)
        S.echoLine = `怀里新得的${{ jiansui: "玄铁剑穗", yinqi: "《引气诀》", quanpu: "《锻骨拳谱》", mianao: "老棉袄", chaidao: "柴刀" }[id]}，你还不敢相信是真的。`;
    }
    if (!S.echoLine && fx.npc) for (const n in fx.npc) {
      if (fx.npc[n] >= 15) { S.echoLine = `${n}的事，你还搁在心里。`; break; }
      if (fx.npc[n] <= -15) { S.echoLine = `${n}临去时的眼神，让你后颈发凉。`; break; }
    }
    if (!S.echoLine && fx.money && fx.money < 0 && S.money < 8) S.echoLine = `荷包瘪了下去。雪天里，铜板比脸面重要。`;
    if (!S.echoLine && fx.hp && fx.hp <= -3) S.echoLine = `伤处的疼一阵紧似一阵，你咬着牙没吭声。`;
  }
  return out;
}
async function resolveFx(fx, label) {
  fx = fx || {};
  // ---------- 判定：优先 Python 服务端裁决，本地兜底 ----------
  if (fx.check) {
    const r = await AI.judge(fx.check, judgeState());
    const ok = !!(r && r.success);
    try { console.debug("[判定]", fx.check, r && r.detail); } catch (e) {}
    if (ok && fx.successText) log(fx.successText, "good");
    if (!ok && fx.failText) log(fx.failText, "hurt");
    const outer = Object.assign({}, fx);
    ["check", "success", "fail", "successText", "failText", "checkText"].forEach(k => delete outer[k]);
    fx = Object.assign({}, outer, ok ? (fx.success || {}) : (fx.fail || {}));
  }
  if (fx.quest) {
    const qm = /^(accept|act):([a-z_]+)$/.exec(fx.quest);
    if (qm && typeof QU !== "undefined") {
      if (qm[1] === "act" && QU.questAct) { chronicle(label || "推进任务", "choice"); QU.questAct(qm[2]); return; } // 催办推进：questAct 自行推进时辰
      QU.activate(qm[2]);
    }
  }
  const out = applyCore(fx);
  S.stats.maxMoney = Math.max(S.stats.maxMoney || 0, S.money);
  if (label && (fx.check || fx.combat || fx.special === "escort" || fx.quest)) chronicle(label, "choice");
  if (out.length) log(`【结算】${out.join("，")}。`, "dim");
  computeMods();
  if (S.hp <= 0) { chronicle(`死于「${label || "意外"}」`, "death"); die(`你在「${label || "意外"}」中咽了气。世界没有停顿。`, "横死"); return; }
  renderPanel();
  // 特殊流（自行推进时间）
  if (fx.special && /^combat:/.test(fx.special)) {
    const m = /^combat:(.+):(\d+)$/.exec(fx.special);
    if (m) { combat({ name: m[1], power: +m[2], canBeg: true }, () => { if (!S.over) advanceSlot(); }); return; }
  }
  if (fx.special) { runSpecial(fx.special, fx); return; }
  if (fx.combat) { const m = /^(.+):(\d+)$/.exec(fx.combat); if (m) { combat({ name: m[1], power: +m[2], canBeg: true }, () => { if (!S.over) advanceSlot(); }); return; } }
  if (fx.danger) { await runDanger(fx.danger); return; }
  advanceSlot();
}

/* ---------- special 动作 ---------- */
function runSpecial(sp, fx) {
  if (sp === "beg") {
    S.stats.begs++;
    const roll = attr("int") * 6 + attr("luck") * 5 + Math.random() * 40;
    let gain = Math.max(0, Math.round((roll - 30) / 3));
    if (S.weather === "大雪" || S.weather === "风雪") gain = Math.round(gain * 0.6);
    gain = Math.round(gain * (1 + (S.mods.moneyP || 0) / 100));
    S.money += gain; S.sta = Math.max(0, S.sta - 1);
    log(gain > 0 ? `你把豁口碗摆在雪里。暮色四合时，碗底躺着 ${gain} 文铜钱。` : `你跪到膝盖发麻，只收获了几记白眼。`, gain > 0 ? "good" : "dim");
    advanceSlot();
  } else if (sp === "chop") {
    S.stats.chops++;
    S.skills["伐木"] = Math.min(100, (S.skills["伐木"] || 0) + 3); // 生活技能：磨炼自然积累熟练度
    const w = 1 + (attr("str") >= 4 ? 1 : 0) + (S.inv.chaidao ? 1 : 0) + ((S.skills["伐木"] || 0) >= 50 ? 1 : 0);
    S.inv.wood += w; gainAttr("str", 0.09); gainCult(2.5); S.sta = Math.max(0, S.sta - 3);
    log(`你在矮林里忙了一个${["晨", "午", "昏", "夜"][S.slot]}，柴薪 +${w}。臂膀酸胀——【力量】在缓慢增长。`, "dim");
    advanceSlot();
  } else if (sp === "rest") {
    S.hp = Math.min(hpMax(), S.hp + 3 * (1 + (S.mods.hpRegenP || 100) / 100 * 0));
    S.hp = Math.min(hpMax(), S.hp + attr("con") * 0.3 * (1 + (S.mods.hpRegenP || 0) / 100));
    S.sta = Math.min(staMax(), S.sta + 4);
    log(`你寻了个避风的角落阖眼。醒来时手脚回了暖。`, "dim");
    advanceSlot();
  } else if (sp === "fire") {
    S.flags.fireTonight = true;
    log(`火苗噼啪，映着几张枯瘦的脸。今夜破庙不再冷。`, "good");
    advanceSlot();
  } else if (sp === "eat") { openEat(); }
  else if (sp === "meditate") {
    S.stats.meditates++;
    gainCult(8); gainAttr("int", 0.03);
    if ((S.xinmo || 0) > 0) { addXinmo(-2); if (xinmoStage().name === "心境清明") log(`杂念尽去，灵台一片清明。`, "good"); }
    if (S.realm >= 5) S.mp = Math.min(mpMax(), S.mp + mpMax() * 0.2 * (S.linggen === "za" ? 1.5 : 1)); // 杂灵根：回蓝 ×1.5
    if (Math.random() < attr("luck") * 0.015) { gainCult(20); sys(`【顿悟】灵光毫无预兆地炸开，修为大涨一截！`); }
    log(`你五心朝天，感一丝凉意自鼻尖沉入丹田。灵气潮汐正涨。`, "dim");
    advanceSlot();
  } else if (sp === "train") {
    const sk = S.inv.yinqi ? "引气诀" : S.inv.quanpu ? "锻骨拳谱" : "乱拳";
    const cap = TECH_CAPS[sk] || 100;
    const wxm = wxTrainMult(sk); // 功法五行修炼速度 = 1 + 亲和×0.005；亲和 <10 强行修炼减半
    S.skills[sk] = Math.min(cap, (S.skills[sk] || 0) + 8 * (1 + (S.mods.trainP || 0) / 100) * wxm);
    gainCult((S.inv.yinqi ? 7 : 4) * wxm); gainAttr("str", 0.05); S.sta = Math.max(0, S.sta - 2);
    log(`你依着口诀演练「${sk}」（熟练度 ${Math.round(S.skills[sk])}/${cap}）。${TECH_EL[sk] ? `此功法属${WX_NAMES[TECH_EL[sk]]}行，你的亲和 ${wxOf()[TECH_EL[sk]] || 0}${wxm < 1 ? "——亲和不足，事倍功半。" : wxm > 1 ? "——亲和加持，修行顺势。" : "。"}` : "气血随招式流转。"}`, "dim");
    checkSkillMilestone(sk);
    advanceSlot();
  } else if (sp === "gamble") {
    S.stats.gambles++;
    S.money -= 10;
    if (Math.random() < 0.3 + attr("luck") * 0.05) { const g = 25 + Math.floor(Math.random() * 10); S.money += g; log(`骰子落定——你赢了 ${g} 文！庄家脸黑得像锅底。`, "good"); }
    else if (hasSpecial("dayuan")) log(`输光了。但走出巷口时，你捡到一张完整的饼——【大冤种】的补偿机缘到了。`, "dim"), S.hunger = Math.max(0, S.hunger - 15);
    else log(`骰子落定。你输得干脆。`, "hurt");
    S.flags.gambled = 1; advanceSlot();
  } else if (sp === "yaopu") {
    S.job = "药庐学徒"; addNpc("周先生", 30);
    log(`你抓起药斗里的饮片一一道来。周先生眉毛一挑：「从明日起，来铺里帮工。月钱五百，管一顿午饭。」`, "good");
    sys(`【职业获得：药庐学徒（凡品）】职业管世界认不认你这个人。`);
    S.daoXin += 1; advanceSlot();
  } else if (sp === "hotmeal") {
    S.flags.ateHot = true; S.hp = Math.min(hpMax(), S.hp + 1);
    gainAch("baonuan");
    log(`热食下肚，你幸福得眯起眼。`, "good");
    advanceSlot();
  } else if (sp === "escort") {
    S.flags.huoDan = 1;
    if (combatPower() >= 8 || Math.random() < 0.5) {
      const g = Math.round(45 * (1 + (S.mods.moneyP || 0) / 100));
      S.money += g; addNpc("福源商会管事钱三", 20);
      log(`一路有惊无险。管事数钱时多给了几文：「实诚孩子，商会记你一个人情。」（+${g} 文）`, "good");
      if (S.money >= 100) gainAch("firstPot");
      advanceSlot();
    } else {
      log(`半路杀出两个劫道的——「买路钱，或者命。」`, "hurt");
      combat({ name: "劫道山贼", power: 9, canBeg: true, loot: () => { S.money += 30; log(`你从山贼怀里摸出 30 文。风水轮流转。`, "good"); } },
        (res) => { if (res === "win") { S.money += 45; addNpc("福源商会管事钱三", 20); } if (!S.over) advanceSlot(); });
    }
  } else if (sp === "dockjob") {
    S.job = "码头脚夫"; addNpc("码头工头蛮牛", 10);
    log(`蛮牛把一条汗巾甩上你肩膀：「从明天起，你就是码头上的人。扛包的钱，给你加三成。」`, "good");
    sys(`【职业获得：码头脚夫（凡品）】职业管世界认不认你这个人。`);
    S.daoXin += 1; advanceSlot();
  } else if (sp === "gaimai") {
    S.money = Math.max(0, S.money - 50);
    const n = S.gaimai || 0;
    const rate = [10, 25, 40, 60][Math.min(n, 3)];
    S.gaimai = n + 1;
    if (Math.random() * 100 < rate) {
      if (n >= 2) { S.debuff = "weak"; S.debuffDays = 3; log(`<span style="color:var(--blood-hi)">改脉失败——道基震荡，经脉里像有火在烧。【元气大伤】静养三日。</span>`); }
      else log(`老者枯指一颤，收手：「淤塞太沉，冲不开。」你白白疼出一身冷汗。`, "hurt");
      chronicle("洗髓改脉失败，道基多一道改脉痕", "evt");
    } else {
      S.linggen = { za: "san", san: "shuang" }[S.linggen] || S.linggen;
      S.wx = genWx(S.linggen); // 提纯后亲和按新资质重排（总和仍恒 100）
      sys(`【洗髓改脉 · 成】淤塞尽去，灵根提纯——你从此是【${linggen().name}】。${linggen().desc || ""}`);
      chronicle(`改脉成功，灵根提纯为「${linggen().name}」`, "evt");
      computeMods();
    }
    advanceSlot();
  } else advanceSlot();
}
function openEat() {
  setChoices([
    { label: "啃黑馍（存货）", hint: "又冷又硬，但管饱。", disabled: S.inv.heimu < 1, fn: () => { S.inv.heimu--; eatFood(22, "你小口小口啃完黑馍，胃里有了底。"); advanceSlot(); } },
    { label: "买黑馍（2 文）", hint: "城北馍铺。", disabled: S.money < 2, fn: () => { S.money -= 2; eatFood(22, "热乎是没有的，顶饿是真的。"); advanceSlot(); } },
    { label: "热汤面（5 文）", hint: "一碗下肚，从舌尖暖到脚尖。", disabled: S.money < 5, fn: () => { S.money -= 5; eatFood(40, "汤面下肚，你幸福得眯起眼。", true); advanceSlot(); } },
    { label: "再扛扛", hint: "挨饿抗冻也是一种磨炼。", free: true, fn: () => { gainAttr("con", 0.05); log("你灌了半瓢凉水，把裤腰带又勒紧一格。", "dim"); advanceSlot(); } },
  ]);
}
function eatFood(amount, text, hot) {
  if (hasSpecial("bigu")) { sys(`【早产辟谷】你早已不食五谷。`); return; }
  S.hunger = Math.max(0, S.hunger - amount * (1 + (S.mods.foodP || 0) / 100));
  log(text, "good");
  if (hot) { S.flags.ateHot = true; gainAch("baonuan"); }
  if (hasSpecial("huachang") && Math.random() < 0.25 && !hasSpecial("tiewei") && !hasSpecial("baidu") && !hasSpecial("zhichang")) {
    S.hp -= 1; log(`<span style="color:var(--blood-hi)">半个时辰后肚子翻江倒海——【腹泻】气血 -1。</span>`);
  }
}
/* ---------- 危机分支 ---------- */
async function runDanger(d) {
  if (d === "pickpocket") {
    const r = await AI.judge("agi*8+d40>38", judgeState());
    if (r.success) { const g = 5 + Math.floor(Math.random() * 8); S.money += g; log(`你指尖一勾，对方的荷包到了你手里（+${g} 文）。三只手的行当，三只手的因果。`, "dim"); S.daoXin -= 1; }
    else { const lose = Math.min(S.money, 4); S.money -= lose; log(`手生，被对方察觉，反丢了 ${lose} 文。`, "hurt"); }
    advanceSlot();
  } else if (d === "trace") {
    S.flags.coincidence = (S.flags.coincidence || 0) + 1;
    if (S.flags.coincidence >= 3) gainAch("hidden");
    log(`你循迹查到城隍庙后墙，只找到一枚不该出现在此处的上古铜钱——纹路，和你怀里某样东西隐隐共鸣。`, "dim");
    gainCult(3); advanceSlot();
  } else if (d === "deep") {
    if (Math.random() < 0.35) {
      combat({ name: "林中的冬狼", power: 6, canBeg: false, loot: () => { gainAch("wolfKill"); S.inv.heimu += 2; log(`你剥下狼肉——接下来几日的嚼用有了。`, "good"); } }, () => { if (!S.over) advanceSlot(); });
    } else if (Math.random() < 0.5) { gainAttr("con", 0.2); log(`林深处你发现一株埋在雪下的赤血芝，嚼了半株，一股暖流散入四肢。（体质 +）`, "good"); advanceSlot(); }
    else { S.inv.wood += 1; log(`深处只捡到几根干透的好柴。你不敢再深入。`, "dim"); advanceSlot(); }
  } else if (d === "caught") {
    addNpc("周先生", -25); S.daoXin -= 1;
    log(`周先生不知什么时候站在了你身后：「偷方子？」他夺过纸页烧了，「念你帮工勤勉，滚吧。」（周先生 缘分大跌）`, "hurt");
    advanceSlot();
  } else if (d === "fleeDog") {
    const r = await AI.judge("agi*8+luck*4+esc+d40>26", judgeState());
    if (r.success) { log(`你转身钻进窄巷，七拐八绕——甩掉了。`, "good"); advanceSlot(); }
    else combat({ name: "饿疯的野狗", power: 5, canBeg: false }, () => { if (!S.over) advanceSlot(); });
  } else if (d === "catchThief") {
    const r = await AI.judge("agi*8+d40>35", judgeState());
    if (r.success) {
      setChoices([
        { label: "放了他", hint: "都是破庙里爬出来的命。", fn: () => { addNpc("小贼细猴", 25); S.daoXin += 1; log(`他愣了愣，朝你深深作了个揖，跑远了。`, "good"); advanceSlot(); } },
        { label: "搜他的身", hint: "贼不走空，你也可以。", fn: () => { const g = 8 + Math.floor(Math.random() * 8); S.money += g; addNpc("小贼细猴", -30); S.daoXin -= 1; log(`你从他怀里摸出 ${g} 文。他看你的眼神像淬了毒。`, "hurt"); advanceSlot(); } },
      ]);
    } else {
      const lose = Math.min(S.money, 5 + Math.floor(Math.random() * 6));
      S.money -= lose;
      log(`等你察觉时，兜里已经少了 ${lose} 文。雪地里只有一串远去的小脚印。`, "hurt");
      advanceSlot();
    }
  } else advanceSlot();
}
function freeAction() { // 已弃用（保留以防旧档引用）
  const ans = prompt("你想做什么？（世界会判定可行性与后果）");
  if (ans == null || !(ans || "").trim()) { gmTurn(); return; }
  const a = ans.trim();
  log(`你决定：${esc(a)}。`, "dim");
  const r = Math.random() + attr("luck") * 0.03;
  if (/睡|躺|休息/.test(a)) { S.sta = Math.min(staMax(), S.sta + 2); log(`【系统：这个我熟。】你寻了个避风的角落眯了一觉。`, "dim"); advanceSlot(); }
  else if (/神像|裂缝|破庙.*(找|翻|搜)/.test(a)) {
    if (!S.flags.gotStatue) { S.flags.gotStatue = 1; S.money += 2; sys(`【你在神像裂缝里摸到两枚前朝铜钱。系统批注：它等这一手等了很久了。】`); }
    else log(`裂缝里只剩香灰。`, "dim");
    advanceSlot();
  } else if (/美人|搭讪|表白/.test(a)) { log(`路人上下打量你一眼，加快脚步走了。`, "dim"); S.daoXin -= 0.2; advanceSlot(); }
  else if (r > 0.85) { S.money += 3; log(`瞎折腾半天，竟真让你摸到三枚铜钱——气运偶尔就是这么不讲道理。`, "good"); advanceSlot(); }
  else if (r > 0.5) { log(`你照着想法试了试。没什么结果，但也不算白忙。`, "dim"); gainCult(1); advanceSlot(); }
  else { log(`【系统：不建议。但你坚持。】一番折腾，一无所获，还惹得路人侧目。`, "dim"); advanceSlot(); }
}

/* ================= 战斗 ================= */
function combat(enemy, onEnd) {
  window.__inCombat = true;
  const done = res => { window.__inCombat = false; onEnd && onEnd(res); };
  const eEl = enemy.el || ENEMY_EL[enemy.name] || "tu";
  // 系统评估：由战力推演五维轮廓（同名敌人评估恒定）
  const seed = [...enemy.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const wave = i => { const x = Math.sin(seed * 7.13 + i * 91.7) * 10000; return x - Math.floor(x); };
  const w = [0.3 + wave(0) * 0.3, 0.2 + wave(1) * 0.3, 0.1 + wave(2) * 0.25, 0.25 + wave(3) * 0.3];
  const wSum = w.reduce((a, b) => a + b, 0);
  const est = w.map(x => Math.max(1, Math.round(enemy.power * 0.62 * (x / wSum) * 10) / 10));
  const ratio = enemy.power / Math.max(1, combatPower());
  const cmp = ratio >= 1.5 ? `<span style="color:var(--blood-hi)">远强于你——三思</span>` : ratio >= 1.1 ? `<span style="color:var(--blood-hi)">强于你</span>` : ratio >= 0.9 ? `伯仲之间` : ratio >= 0.6 ? `弱于你` : `<span style="color:#9fc3a5">远弱于你</span>`;
  const myEl = dominantWxEl();
  const wxHint = WX_KE[myEl] === eEl ? `你的${WX_NAMES[myEl]}行正克它——天时在你`
    : (WX_KE[eEl] === myEl && S.linggen !== "za") ? `它的${WX_NAMES[eEl]}行克你的${WX_NAMES[myEl]}行——今日不宜硬拼`
    : S.linggen === "za" ? `你五行俱全，无人能克` : `五行互不相克`;
  log(`<div class="foe-info"><b>${enemy.name}</b>${enemy.desc || ""}<br>战力约 ${enemy.power} ｜ ${WX_NAMES[eEl]}行 ｜ 对比你：${cmp}<br><span class="dim">五维评估：力≈${est[0]} 敏≈${est[1]} 智≈${est[2]} 体≈${est[3]}（推演所得，或有偏差）</span><br><span class="dim">${wxHint} ｜ 你的战力：${displayPower()}</span></div>`);
  const opts = [
    { label: "战！", hint: "狭路相逢。", fn: () => resolveCombat(enemy, "fight", done) },
    { label: "逃", hint: `敏捷 ${attr("agi")}，跑赢就算赢。`, fn: () => resolveCombat(enemy, "flee", done) },
  ];
  if (attr("int") >= 4) opts.push({ label: "智取", hint: "战局推演：找它的破绽。", fn: () => resolveCombat(enemy, "trick", done) });
  if (enemy.canBeg) opts.push({ label: "求饶", hint: "尊严换命，有时值。", fn: () => resolveCombat(enemy, "beg", done) });
  setChoices(opts);
}
function resolveCombat(enemy, mode, onEnd) {
  const myP = combatPower();
  const startHp = S.hp;
  if (mode === "flee") {
    const chk = attr("agi") * 8 + attr("luck") * 4 + Math.random() * 40 + (S.mods.escapeP || 0);
    if (chk > enemy.power * 4) { log(`你转身钻进窄巷，七拐八绕——甩掉了。`, "good"); addXinmo(2, "临阵脱逃，道心微裂"); onEnd("fled"); return; }
    log(`没跑掉，后背挨了一记狠的。`, "hurt"); S.hp -= hpMax() * 0.15;
  }
  if (mode === "beg") {
    if (Math.random() < 0.4 + attr("luck") * 0.03) { log(`你趴得干脆利落。对方啐了一口，觉得没意思，走了。`, "dim"); S.daoXin -= 2; addXinmo(2, "摇尾乞怜，愧疚沉入识海"); onEnd("begged"); return; }
    log(`求饶换来的是变本加厉。`, "hurt"); S.hp -= hpMax() * 0.1;
  }
  if (mode === "trick") {
    const chk = attr("int") * 10 + attr("luck") * 3 + Math.random() * 50;
    if (chk > enemy.power * 5) { log(`你佯装跌倒，引它扑空，反手一击正中要害。`, "good"); onEnd("win"); return; }
    log(`智取失败，对方比看起来精。`, "dim");
  }
  // 五行生克：克制方 +20%，被克方 -20%；该行抗性 = 亲和×0.003（封顶 30%）；杂灵根五行俱全，没有任何一系能克制你
  const myEl = dominantWxEl();
  const eEl = enemy.el || ENEMY_EL[enemy.name] || "tu";
  const za = S.linggen === "za";
  let myDmg = 1, foeDmg = 1;
  if (WX_KE[myEl] === eEl) { myDmg *= 1.2; foeDmg *= 0.8; }
  else if (WX_KE[eEl] === myEl && !za) { myDmg *= 0.8; foeDmg *= 1.2; }
  if (hasTitle("yike") && enemy.power > myP) myDmg *= 1.05; // 称号「以下克上」：对高于己者伤害 +5%
  if (hasTitle("xisheng") && S.hp < hpMax() * 0.1) myDmg *= 1.3; // 「向死而生」：濒死攻伐 +30%
  foeDmg *= Math.max(0.7, 1 - (wxOf()[eEl] || 0) * 0.003);
  if (S.weather === "大雪" || S.weather === "风雪" || S.flags.coldSnap) { // 环境即五行：雪天水旺火衰
    if (myEl === "shui") myDmg *= 1.1;
    else if (myEl === "huo") myDmg *= 0.9;
  }
  let round = 0, myHp = S.hp, eHp = enemy.power * 8;
  const lines = [];
  if (WX_KE[myEl] === eEl) lines.push(`【五行生克】你的${WX_NAMES[myEl]}行克它的${WX_NAMES[eEl]}行——你伤害 +20%，它 -20%。`);
  else if (WX_KE[eEl] === myEl && !za) lines.push(`【五行生克】它的${WX_NAMES[eEl]}行克你的${WX_NAMES[myEl]}行——你伤害 -20%，小心。`);
  else if (za) lines.push(`【杂灵根】五行俱全，没有任何一系能克制你。`);
  while (round < 8 && myHp > 0 && eHp > 0) {
    round++;
    const hitRate = Math.max(12, Math.min(90, 50 + (myP - enemy.power) * 4 + attr("luck") * 1.5));
    if (Math.random() * 100 < hitRate) { eHp -= myP * (0.8 + Math.random() * 0.5) * myDmg; lines.push(`第${round}合：你抢得先机，一击建功。`); }
    else { myHp -= enemy.power * (0.7 + Math.random() * 0.6) * (1 - (S.mods.defP || 0) / 100) * foeDmg; lines.push(`第${round}合：你吃了对方一记，眼前发黑。`); }
  }
  S.hp = Math.max(0, Math.round(myHp));
  lines.forEach(l => log(l, "dim"));
  if (S.hp <= 0) { lethalCheck(enemy.name, onEnd); return; }
  if (eHp <= 0) {
    log(`<span style="color:#9fc3a5">【胜】${enemy.name}倒下了。你扶着膝盖喘气，手心全是汗。</span>`);
    S.kills++; gainAch("firstBlood");
    if (enemy.power >= myP * 1.3) { gainAch("yuejie"); S.stats.yuejieN = (S.stats.yuejieN || 0) + 1; } // 跨越一个小境界取胜（轮回结算：越阶战绩加成）
    if (startHp <= hpMax() * 0.2 && enemy.power >= myP) gainAch("juejing"); // 濒死反杀强敌
    if (enemy.loot) enemy.loot();
    onEnd("win");
  } else {
    log(`<span style="color:var(--blood-hi)">你渐落下风，只能且战且退，狼狈脱身。</span>`);
    onEnd("lose");
  }
}
function lethalCheck(killer, onEnd) {
  if (hasSpecial("fate") && !S.flags.fateUsed) {
    S.flags.fateUsed = 1; S.hp = 1; gainAch("mingbu");
    delete S.cards["tianming"]; S.cardOrder = S.cardOrder.filter(x => x !== "tianming");
    sys(`【天命在我 · 生效】必死的结局被强行扭转。因果已记账，词条化作飞灰。`);
    addXinmo(3, "死亡擦身而过，恐惧留在了识海里");
    computeMods(); renderPanel(); onEnd && onEnd("cheated"); return;
  }
  if (hasSpecial("cheatdeath") && Math.random() < 0.5) {
    S.hp = 1; gainAch("mingbu");
    sys(`【逢凶化吉】必死之局，硬是漏进一线生机。`);
    addXinmo(3, "死亡擦身而过，恐惧留在了识海里");
    if (hasSpecial("jingyi")) { S.tempLuckDays = 3; sys(`【敬自己一杯】死里逃生，气运临时 +1（三日）。`); }
    renderPanel(); onEnd && onEnd("cheated"); return;
  }
  if (hasSpecial("xinxi") && Math.random() < 0.3) { // 睡着也生效：刀落下前把你叫醒
    S.hp = 1; gainAch("mingbu");
    sys(`【心血来潮】刀落下前的一瞬，你毫无道理地惊醒，翻身滚开——杀机贴着你刚才躺的地方劈下。`);
    addXinmo(3, "死亡擦身而过，恐惧留在了识海里");
    if (hasSpecial("jingyi")) { S.tempLuckDays = 3; sys(`【敬自己一杯】死里逃生，气运临时 +1（三日）。`); }
    renderPanel(); onEnd && onEnd("cheated"); return;
  }
  if (!S.flags.friendSaved) { // 生死之交：每世一次，鬼门关前有人会来（人情是债）
    const friend = Object.entries(S.npc || {}).find(([n, v]) => v >= 80);
    if (friend) {
      S.flags.friendSaved = 1; S.hp = 1; gainAch("mingbu");
      addNpc(friend[0], -20);
      sys(`【生死之交】${friend[0]}闻讯赶来，硬生生把你从鬼门关拽了回来。（人情是债：缘分 -20）`);
      renderPanel(); onEnd && onEnd("cheated"); return;
    }
  }
  die(`死于「${killer}」。`, "战死");
}
function askBreakthrough() {
  let rate = 55 + attr("luck") * 2 + S.realmBreaks * -5;
  if (hasSpecial("ding")) rate += 15;
  if (hasSpecial("yinguo")) rate -= 5; // 因果赊账：债未清，天道卡你的门槛
  if (S.flags.coldSnap) rate -= 10;
  rate = Math.max(15, Math.min(92, Math.round(rate)));
  if ((S.xinmo || 0) >= 50) return xinmoTribulation(rate); // 心魔劫：突破大境界时具现为幻境
  setChoices([
    { label: `破境！（成功率 ${rate}%）`, hint: "机不可失。涨潮期天地灵气正浓。", fn: () => resolveBreakthrough(rate) },
    { label: "再沉淀沉淀", hint: "失败的代价不轻。", fn: () => gmTurn() },
  ]);
}
function resolveBreakthrough(rate) {
  if (Math.random() * 100 < rate) {
    S.realm++; S.cult = 0; S.realmBreaks = 0;
    if (S.lastBreakDay && S.day - S.lastBreakDay <= 10) gainAch("yushi"); // 与天争时：十日之内连破两境
    S.lastBreakDay = S.day;
    for (const k of ["str", "agi", "int", "con"]) S.base[k] = Math.min(10, Math.round(S.base[k] * 1.05 * 10) / 10); // 途径三：大境突破，全属性 +5%
    chronicle(`破境成功，踏入【${REALM_NAMES[S.realm]}】`, "break");
    sys(`【破境反哺】大境突破，五维随境跃升（+5%）。`);
    checkSysLvUp();
    sys(`【破境成功】气血轰鸣，枷锁寸寸崩解——你踏入【${REALM_NAMES[S.realm]}】！`);
    if (S.realm >= 1) gainAch("tuotai");
    if (S.realm >= 5) { gainAch("juqi"); S.mp = mpMax(); sys(`【气海初开，法力解锁。凡人眼中，你已是「仙师」之流。】`); }
    if (S.realm >= 6) { S.mp = mpMax(); sys(`【丹田气海开辟】法力正式奔涌——你已脱去凡胎，立身凡阶之巅【开元境】。`); }
    S.hp = hpMax(); S.sta = staMax();
  } else {
    S.realmBreaks++;
    if (hasSpecial("ding")) { S.cult *= 0.85; sys(`【破境失败——「助我破鼎」生效：道基未损，只折了些积累。】`); }
    else {
      S.debuff = "weak"; S.debuffDays = 3; S.cult *= 0.7; S.hp = Math.max(1, S.hp - hpMax() * 0.3);
      log(`<span style="color:var(--blood-hi)">气血逆冲，喉头一甜。【破境失败 · 元气大伤】全属性暂时 -20%，静养三日。</span>`);
      if ((S.yaoshi || 0) >= 60 && Math.random() < 0.25) { // 药蚀 60+：破境走火入魔概率上升
        S.base.int = Math.max(1, Math.round((S.base.int - 0.3) * 10) / 10); S.daoXin = Math.max(0, S.daoXin - 6);
        sys(`【走火入魔】药蚀淤堵经脉，真气逆行——智力受损，道心震荡。（药蚀 ${Math.round(S.yaoshi)}/100，是时候排毒了）`);
        computeMods();
      }
    }
  }
  computeMods(); renderPanel(); advanceSlot();
}

/* ---------- 心魔劫（设定集：破境之际心魔具现为幻境，三种过法） ---------- */
function xinmoTribulation(rate) {
  sys(`【心魔劫】灵气倒卷入识海，那声音用你的嗓音开口：「${S.world > 1 ? "你死过一次了——门后的灯火，你不想吗？" : "你这种人，也配？"}」`);
  chronicle("破境之际心魔具现，幻境拦路", "xinmo");
  const opts = [
    { label: `斩！（成功率 ${rate}%）`, hint: "快刀斩乱麻：道心微损，除根不净。", fn: () => {
      S.daoXin = Math.max(0, S.daoXin - 2); addXinmo(-15);
      log("你并指如剑，一剑斩碎幻境。碎片深处，那声音低低笑了——它还会回来。", "dim");
      resolveBreakthrough(rate);
    } },
    { label: "渡（直面化解）", hint: "道心×智力×气运。成则道心大涨反哺智力，败则伤得更重。", fn: () => {
      let score = S.daoXin * 0.6 + attr("int") * 8 + attr("luck") * 4 + Math.random() * 40;
      if (hasSpecial("aini")) score += 10;   // 爱你老己：心魔抗性
      if (hasSpecial("pofang")) score += 10; // 破防了：话术助战
      if (hasSpecial("daoxin")) score += 20; // 磐石道心
      if (hasTitle("panshiT")) score += 20;  // 称号「磐石道心」（成就版）
      if (S.world > 1) score += 10;          // 重开者特权：死亡主题的威慑减半
      if (score > 70) {
        addXinmo(-40); S.daoXin = Math.min(100, S.daoXin + 8); gainAttr("int", 0.3);
        log("你直面它，认出它，放下它。幻境化作清风拂面——道心大涨，灵台更明。", "good");
        resolveBreakthrough(Math.min(92, rate + 15));
      } else {
        addXinmo(10); S.daoXin = Math.max(0, S.daoXin - 4);
        log(`<span style="color:var(--blood-hi)">幻境反噬：你险些信了它的话。道心震荡，心魔更壮。</span>`);
        resolveBreakthrough(Math.max(15, rate - 15));
      }
    } },
    { label: "退避（暂不破境）", hint: "心魔不除，它还会再来。", fn: () => gmTurn() },
  ];
  if (hasSpecial("mindshield")) opts.splice(2, 0, { // 「如何呢又能怎」：笑——可遇不可求
    label: `笑（如何呢又能怎）`, hint: "看穿了，笑一声。心魔像个笑话。", fn: () => {
      addXinmo(-50); S.daoXin = Math.min(100, S.daoXin + 3);
      log("你看穿了它——执念、恐惧、欲望，不过是识海里的皮影戏。你笑一声：「如何呢，又能怎？」幻境如雪遇沸汤。", "good");
      resolveBreakthrough(Math.min(92, rate + 10));
    } });
  setChoices(opts);
}

/* ================= 死亡与轮回 ================= */
/* 轮回法则 15.2：六维评分（各 0~100，加权汇总），五档定级，奖惩对应下一世 */
const GRADE_RULES = [
  { min: 85, grade: "传世", color: "#d4af6e", points: 200, attrBonus: 3, luckBonus: 1, pool: "吉", dice: "adv", echoPick: 3 },
  { min: 70, grade: "无愧", color: "#6fa8a0", points: 150, attrBonus: 2, pool: "吉", dice: "adv", echoRandom: 1 },
  { min: 50, grade: "平庸", color: "#ddd7c7", points: 100, pool: "平" },
  { min: 30, grade: "潦草", color: "#8f8f8f", points: 70, pool: "劣", dice: "dis", attrMalus: 1, echoBadP: 0.3, pinned: true },
  { min: -1, grade: "败笔", color: "#a84036", points: 50, pool: "狱", attrMalus: 2, echoBad: true, pinned: true, snark: true },
];
function settleLife(cause) {
  const life = S.lifeAch || [];
  const q = S.quests || { done: [], failed: [] };
  const qType = id => (typeof QU !== "undefined" && QU.DEFS[id]) ? QU.DEFS[id].type : null;
  const mainDone = q.done.filter(id => qType(id) === "main").length;
  const sideDone = q.done.filter(id => qType(id) === "side").length;
  const mainFail = q.failed.filter(id => qType(id) === "main").length;
  const c100 = v => Math.max(0, Math.min(100, v));
  // 修行高度（25%）：凡阶 10 分起，每跨一阶 +15；越阶战绩加成
  const d1 = c100(10 + S.realm * 15 + Math.min(20, (S.stats.yuejieN || 0) * 4));
  // 任务绩效（20%）：主线必做，失败或放弃直接扣一大截；支线按完成加权
  const d2 = c100(mainDone * 45 + sideDone * 12 - mainFail * 30);
  // 千秋录（15%）：当世成就 × 品级系数
  const tierW = [4, 8, 15, 25, 40];
  const d3 = c100(life.reduce((s, id) => s + (tierW[(ACHIEVEMENTS[id] || { tier: 0 }).tier] || 4), 0));
  // 因果质量（15%）：善缘结构；触及世界隐秘（隐藏成就「察觉者」）直接拉满
  let d4 = Object.values(S.npc).filter(v => v >= 80).length * 30 + Object.values(S.npc).filter(v => v >= 40 && v < 80).length * 10;
  if (life.includes("hidden")) d4 = 100;
  d4 = c100(d4);
  // 道心与活法（15%）：道心曲线 + 死法体面程度（战死 > 横死 > 病死 > 冻饿）
  const FACE = { 战死: 30, 横死: 20, 化魔: 15, 丹毒: 10, 冻毙: 10 };
  const d5 = c100(S.daoXin * 0.7 + (FACE[cause] != null ? FACE[cause] : 10));
  // 寿数（10%）：乞丐之冬，三十一日为满
  const d6 = c100(S.day / 31 * 100);
  let total = d1 * 0.25 + d2 * 0.20 + d3 * 0.15 + d4 * 0.15 + d5 * 0.15 + d6 * 0.10;
  let extra = "";
  if (cause === "战死" && S.kills > 0) { total += 5; extra = "死得其所"; } // 横死加成：天道看得见怎么死
  if (!life.length && mainDone === 0) total = Math.min(total, 25); // 摆烂惩罚：一生无成就且主线皆未竟，压到潦草以下
  return { dims: [d1, d2, d3, d4, d5, d6].map(Math.round), total: Math.round(total), extra, mainDone, mainFail, sideDone };
}
function gradeComment(grade, st) {
  const banks = {
    "传世": ["此生虽短，光焰灼灼。系统真心夸你一句：干得漂亮。", "六维俱全，死后有余响。系统真心夸你一句：这一世，值得被记住。"],
    "无愧": ["没输给这个冬天，也没输给自己。", "账算完了：你尽力了。系统记账，从不亏待尽力的人。"],
    "平庸": ["来过，活过，走了。大多数人的一生。", "不出错，也不出彩。卷宗翻到你这页，停了停，又翻过去了。"],
    "潦草": [`你活了 ${S.day} 天。你用这些日子证明了「活着」确实是一种天赋。`, "评语系统斟酌良久，只回了四个字：下回努力。"],
    "败笔": [`${S.day} 天。一头猪养这些日子都该出栏了。`, "你用一生证明了「活着」确实是一种天赋——而你恰好没有。", "系统把你的卷宗翻了翻，又默默合上了。"],
  };
  if (grade === "败笔") return banks["败笔"].join("<br>"); // 败笔：系统阴阳你三句话
  const b = banks[grade] || banks["平庸"];
  return b[Math.floor(Math.random() * b.length)];
}
function die(reason, cause) {
  S.over = true;
  gainAch("death1"); META.deaths++;
  log(`<span style="color:var(--blood-hi)">${reason}</span>`);
  const st = settleLife(cause);
  const rule = GRADE_RULES.find(r => st.total >= r.min);
  const grade = rule.grade;
  const comment = gradeComment(grade, st);
  if (!META.comments) META.comments = []; // 评语钉面板，随魂封存
  META.comments.push({ world: S.world, grade, text: comment.replace(/<br>/g, " ") });
  if (META.comments.length > 12) META.comments = META.comments.slice(-12);
  lifeRecord().push({ world: S.world, end: "death", days: S.day, realm: REALM_NAMES[S.realm], grade });
  saveMeta();
  sys(`【宿主死亡。死因：${cause || "寿尽"}。】`);
  sys(`【正在结算此生……境界：${REALM_NAMES[S.realm]}。任务：完成 ${st.mainDone + st.sideDone} / 失败 ${st.mainFail}。成就：${(S.lifeAch || []).length} 项。存活：${S.day} 日。】`);
  sys(`【评级：${grade}。】${st.extra ? "（评语追加：" + st.extra + "）" : ""}`);
  sys(`【评语：${comment.replace(/<br>/g, "")}】`);
  const rb = { points: rule.points, attrBonus: rule.attrBonus || 0, luckBonus: rule.luckBonus || 0,
    attrMalus: rule.attrMalus || 0, luckMalus: (rule.snark && Math.random() < 0.05) ? 1 : 0,
    identity: pickIdentity(rule.pool, rule.dice), echo: null };
  const echoCands = (S.cardOrder || []).filter(id => !id.startsWith("echo_") && findCard(id));
  const badCards = [];
  for (const tier of CARD_POOL) for (const c of tier) if (c.bad) badCards.push(c.id);
  const randOf = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  const finish = () => {
    const c0 = document.querySelector("#infoModal .gacha-close"); if (c0) c0.style.display = ""; // 恢复通用收起钮
    META.rebirth = rb; META.world++; saveMeta();
    sys(`【下一世初始万象点：${rb.points}。${rb.echo ? "伴生残影：「" + findCard(rb.echo).name + "」（半效）。" : "无伴生残影。"}身份掷骰中……「${rb.identity.name}」（${rb.identity.grade}档）。】`);
    showEnd({
      title: "此生结算", grade, color: rule.color, score: st.total,
      quote: comment,
      stats: [["修行高度", st.dims[0]], ["任务绩效", st.dims[1]], ["千秋录", st.dims[2]], ["因果质量", st.dims[3]], ["道心活法", st.dims[4]], ["寿数", st.dims[5]], ["加权总分", st.total]],
      note: `词条回收中……保底计数清零。千秋录、称号与评语随魂封存，下一世解封。<br>下一世：${rb.identity.name}（${rb.identity.grade}档）· 初始万象点 ${rb.points}${rb.attrMalus ? " · 属性折损 ×" + rb.attrMalus : ""}${rb.echo ? " · 伴生残影「" + findCard(rb.echo).name + "」（半效）" : ""}`,
      btns: [{ label: "再入轮回", fn: () => { closeEnd(); newLife(); startLife(); } }],
    });
    renderPanel();
  };
  if (rule.echoPick && echoCands.length) { // 传世：词条残影三选一（半效伴生）
    const picks = [...echoCands].sort(() => Math.random() - 0.5).slice(0, rule.echoPick);
    showInfo("词条残影 · 三选一", `<span style="color:var(--gold-dim)">传世之世：上一世词条，可择其一伴生（半效）</span>`,
      picks.map(id => { const c = findCard(id); return `「${c.name}」——${c.eff}`; }).join("<br>"),
      "残影随魂入胎，下一世系统激活时伴生；未选的词条，归入轮回。",
      picks.map(id => ({ label: "带走「" + findCard(id).name + "」", fn: () => { rb.echo = "echo_" + id; $("#infoModal").classList.remove("open"); finish(); } }))
        .concat([{ label: "都不带走", fn: () => { $("#infoModal").classList.remove("open"); finish(); } }]));
    const c1 = document.querySelector("#infoModal .gacha-close"); if (c1) c1.style.display = "none"; // 三选一必须作答，收起视为放弃会令结算卡死
    return;
  }
  if (rule.echoRandom && echoCands.length) rb.echo = "echo_" + randOf(echoCands); // 无愧：随机残影一条
  if ((rule.echoBad || (rule.echoBadP && Math.random() < rule.echoBadP)) && badCards.length) rb.echo = "echo_" + randOf(badCards); // 潦草 30% / 败笔必带：负面残影
  finish();
}
function pickIdentity(poolGrade, dice) { // 身份骰：传世/无愧掷两次取优，潦草取劣，败笔锁死狱档
  const rank = { "吉": 3, "平": 2, "劣": 1, "狱": 0 };
  let pool = IDENTITIES.filter(i => i.grade === poolGrade);
  if (poolGrade === "吉" && Math.random() < 0.3) pool = pool.concat(IDENTITIES.filter(i => i.grade === "平"));
  if (poolGrade === "劣" && Math.random() < 0.2) pool = pool.concat(IDENTITIES.filter(i => i.grade === "狱"));
  if (!pool.length) pool = IDENTITIES.filter(i => i.grade === "平");
  const draw = () => pool[Math.floor(Math.random() * pool.length)];
  if (dice === "adv") { const a = draw(), b = draw(); return rank[a.grade] >= rank[b.grade] ? a : b; }
  if (dice === "dis") { const a = draw(), b = draw(); return rank[a.grade] <= rank[b.grade] ? a : b; }
  return draw();
}
function ending() {
  S.over = true;
  lifeRecord().push({ world: S.world, end: "spring", days: S.day, realm: REALM_NAMES[S.realm], grade: "" });
  saveMeta();
  QU.check(); // 结算「活过这个冬天」
  const win = S.realm >= 5 || S.flags.qingyan;
  gainAch("survive30");
  if (win) { log(`<b>开春的第一缕阳光照进破庙时，你已不再是那个高烧等死的阿七。</b>`, "good"); sys(`【大世将启，群雄并起。乞丐登天的时代，你赶上了。】`); }
  else log(`开春了。你活着看到了冰雪消融——在这个世界，这本身就不容易。`, "good");
  showEnd({
    title: win ? "第一卷 · 潜龙在渊" : "第一卷 · 苟活",
    grade: win ? "潜 龙" : "存 活", color: win ? "#d4af6e" : "#6fa8a0", score: "",
    quote: win
      ? "青岩门的山门在春风里矗立。你握着身份木牌回头望了一眼青石城——破庙、雪夜，都只是序章。「现在，你的每一次选择，都在改写这个世界的剧本。」"
      : "冬天过去了，你还活着。没有仙缘，没有奇遇，但命是自己的。下一个冬天到来之前，也许来得及变得更强。",
    stats: [["存活", S.day + " 日"], ["境界", REALM_NAMES[S.realm]], ["词条", S.cardOrder.length + " 条"], ["缘分", Object.keys(S.npc).length + " 人"], ["成就", META.ach.length + " 项"], ["周目", "第 " + S.world + " 世"]],
    note: "可继续在此世漫游（自由模式），或再入轮回开启下一世——身份随机，因果继承。",
    btns: [
      { label: "继续此世（自由漫游）", fn: () => { closeEnd(); S.over = false; S.flags.freeRoam = true; log("—— 自由漫游：冬天已过，青山城依旧。——", "daybreak"); gmTurn(); } },
      { label: "再入轮回", fn: () => { META.rebirth = { points: 100 + (win ? 50 : 0), attrBonus: win ? 2 : 0, identity: pickIdentity(win ? "吉" : "平") }; META.world++; saveMeta(); closeEnd(); newLife(); startLife(); } },
    ],
  });
  renderPanel();
}
function showEnd(o) {
  const m = $("#endModal");
  $("#endBody").innerHTML = `
    <h2>${o.title}</h2>
    <div class="stamp" style="color:${o.color};border-color:${o.color}">${o.grade}</div>
    <p class="end-quote">${o.quote}</p>
    <div class="end-stats">${o.stats.map(s => `<div><em>${s[0]}</em><b>${s[1]}</b></div>`).join("")}</div>
    <p class="end-note">${o.note}</p>`;
  const box = $("#endBtns"); box.innerHTML = "";
  o.btns.forEach(b => {
    const btn = document.createElement("button");
    btn.className = "gbtn"; btn.textContent = b.label; btn.onclick = b.fn;
    box.appendChild(btn);
  });
  m.classList.add("open");
}
function closeEnd() { $("#endModal").classList.remove("open"); }

/* ================= 存档 / 读档 ================= */
const SAVE_KEYS = { auto: "cangxuan_save_auto", 1: "cangxuan_save_1", 2: "cangxuan_save_2", 3: "cangxuan_save_3" };
const SLOT_WORDS = ["晨", "午", "昏", "夜"];
function saveSummary(s) { return `第${s.world}世 · ${s.name} · 冬第${s.day}日${SLOT_WORDS[s.slot] || ""} · ${REALM_NAMES[s.realm]}`; }
function canSave() { return !!(S && !S.over && !gmBusy && !window.__inCombat); }
function writeSave(key, quiet) {
  if (!canSave()) { if (!quiet) toast("此刻天道未稳（战斗或结算中），稍候再存。"); return false; }
  const logHtml = [...document.querySelectorAll("#log .logline")].slice(-120).map(d => d.outerHTML).join("");
  try {
    localStorage.setItem(key, JSON.stringify({ v: 1, at: Date.now(), S, META, log: logHtml }));
    if (!quiet) toast("已写入存档：" + saveSummary(S));
    return true;
  } catch (e) { if (!quiet) toast("存档失败：浏览器存储不可用或已满。"); return false; }
}
function autoSave() { writeSave(SAVE_KEYS.auto, true); }
function readSave(key) {
  try { const d = JSON.parse(localStorage.getItem(key)); return d && d.S ? d : null; } catch (e) { return null; }
}
function loadSaveData(d) {
  S = d.S; META = d.META; saveMeta();
  gmBusy = false; window.__inCombat = false;
  closeEnd();
  $("#settings").classList.remove("open");
  $("#gacha").classList.remove("open");
  $("#saveModal").classList.remove("open");
  $("#log").innerHTML = d.log || "";
  computeMods(); renderPanel(); renderTab();
  log(`—— 读档归来：${saveSummary(S)} ——`, "daybreak");
  toast("读档完成，故事继续");
  gmTurn();
}
function loadSave(key) {
  const d = readSave(key);
  if (!d) { toast("此档位空空如也。"); return; }
  loadSaveData(d);
}
/* 导出档位为 JSON 文件（可跨设备、防清缓存） */
function exportSave(key) {
  const d = readSave(key);
  if (!d) { toast("此档位空空如也。"); return; }
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `cangxuan_第${d.S.world}世_冬第${d.S.day}日.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast("存档已导出为文件。");
}
/* 从 JSON 文件导入：校验 → 当前进度备份进自动档 → 立即恢复 */
function importSaveFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    let d = null;
    try { d = JSON.parse(rd.result); } catch (e) {}
    if (!d || !d.S || !d.META || !d.S.world) { toast("这不是一份《苍玄界》存档。"); return; }
    if (S && !S.over && !window.__inCombat) writeSave(SAVE_KEYS.auto, true); // 导入前把当前进度备份进自动档
    loadSaveData(d);
    renderSaveModal();
    toast("存档已导入");
  };
  rd.onerror = () => toast("导入失败：文件读取错误。");
  rd.readAsText(file);
}
function fmtSaveTime(at) { const d = new Date(at); const p = n => String(n).padStart(2, "0"); return `${d.getMonth() + 1}-${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function renderSaveModal() {
  const box = $("#saveSlots"); box.innerHTML = "";
  const mkRow = (key, title, manual) => {
    const d = readSave(key);
    const row = document.createElement("div"); row.className = "save-row";
    row.innerHTML = `<div class="save-tag">${title}</div>
      <div class="save-info">${d ? `<b>${esc(saveSummary(d.S))}</b><span>${fmtSaveTime(d.at)} 落笔</span>` : `<b class="dim">空档位</b><span>尚无笔墨</span>`}</div>
      <div class="save-ops"></div>`;
    const ops = row.querySelector(".save-ops");
    if (manual) {
      const w = document.createElement("button"); w.className = "gbtn ghost"; w.textContent = "存";
      w.onclick = () => { if (writeSave(key)) renderSaveModal(); };
      ops.appendChild(w);
    }
    if (d) {
      const r = document.createElement("button"); r.className = "gbtn"; r.textContent = "读";
      r.onclick = () => loadSave(key); ops.appendChild(r);
      const ex = document.createElement("button"); ex.className = "gbtn ghost"; ex.textContent = "导出";
      ex.onclick = () => exportSave(key); ops.appendChild(ex);
      const del = document.createElement("button"); del.className = "gbtn ghost"; del.textContent = "删";
      del.onclick = () => { localStorage.removeItem(key); renderSaveModal(); toast("已抹除该档。"); };
      ops.appendChild(del);
    }
    box.appendChild(row);
  };
  mkRow(SAVE_KEYS.auto, "自动", false);
  [1, 2, 3].forEach(i => mkRow(SAVE_KEYS[i], "档 · " + ["壹", "贰", "叁"][i - 1], true));
}

/* ================= 开局 ================= */
function startLife() {
  $("#log").innerHTML = "";
  gmBusy = false;
  if (S.first) {
    log(`<div class="scene-head"><div class="place">东荒 · 云州 · 青石城 · 城南破庙</div>
      <h1>雪 夜 破 庙</h1><div class="sub">仙陨历三万年 · 冬 · 大雪 —— 灵气潮汐三百年一涨一落，你穿越之时，正值涨潮之初。</div></div>`);
    [
      { t: "sys", s: "【万象轮盘已激活。】" },
      { t: "sys", s: "【开局赠礼：万象点 ×100（仅此一次，用完即止）。】" },
      { t: "sys", s: "【检测到宿主命格：天绝之命（原注定冻死于今夜）。】" },
      { t: "sys", s: "【检测到未知因果介入……命格已改写。】" },
      { t: "dim", s: "你睁开眼时，正躺在青石城南的破庙里。高烧三天，浑身滚烫，怀里揣着半个冻硬的黑馍。" },
      { t: "dim", s: "庙外有狼嚎。庙里有七个同样衣衫褴褛的乞丐，分食最后一点烤火余温——你是其中之一，排行最末，他们叫你「阿七」。" },
      { t: "sys", s: "【凡品任务已发布：活过这个冬天。奖励：万象点 ×20。】" },
    ].filter(l => l.s).forEach(l => log(l.s, l.t));
    S.gmRecent = ["anchor"];
    renderPanel();
    QU.check(); // 激活主线（活过这个冬天），任务链随后由世界状态推进
    // 设定集第一章：庙门之外，雪地里躺着尚有微弱呼吸的黑衣人——开局三选，因果各异
    log(`庙门之外的风雪里，似乎有重物倒下的闷响。你扒开门缝——雪地里躺着一个浑身是血的黑衣人，尚有微弱呼吸。他怀里，鼓鼓囊囊。`, "dim");
    const after = () => {
      computeMods(); renderPanel();
      setChoices([
        { label: "熬过今晚", hint: "天道已苏醒，从明天起，路自己选。", fn: () => advanceSlot() },
        { label: "先翻翻破庙家底", hint: "看看这庙里有什么。", free: true, fn: () => {
          const found = 1 + Math.floor(Math.random() * 2);
          S.money += found;
          log(`你在神像底座和墙缝里摸到 ${found} 枚铜钱，还有半捆受潮的柴。`, "good");
          if (!S.inv.wood) S.inv.wood = 1;
          computeMods(); renderPanel();
          gmTurn(); } },
      ]);
    };
    setChoices([
      { label: "拖他进来，替他包扎", hint: "救一个本该死去的人。因果自负。", fn: () => {
        gainAch("savior"); S.flags.tingyuMark = 1;
        log(`你把他拖进庙里最暖的角落，撕了半条衣袖替他按住伤口。黑衣人昏迷前死死盯了你一眼，像要把你的脸刻进骨头。天亮前他消失了，只留下一枚刻着「听雨」二字的木牌。`, "good");
        chronicle("雪夜救下重伤黑衣人，得「听雨」木牌", "evt");
        after();
      } },
      { label: "摸走他怀里的东西", hint: "发死人财，有伤阴德。", fn: () => {
        S.money += 15; S.daoXin = Math.max(0, S.daoXin - 1); S.flags.tingyuGrudge = 1;
        gainAch("merciless");
        log(`你蹲下身，从他怀里摸出十五文铜钱——手抽回来时，他的手指似乎动了一下。你头也不回地走回庙里。身后雪地里，那双眼睛睁开了。`, "hurt");
        chronicle("搜刮了重伤黑衣人的行囊", "evt");
        after();
      } },
      { label: "掩上门，当作没看见", hint: "雪夜里，先顾自己的命。", fn: () => {
        gainAch("merciless"); S.daoXin = Math.max(0, S.daoXin - 0.5);
        log(`你轻轻掩上门。风雪声盖住了一切——也许，什么都没有发生过。`, "dim");
        after();
      } },
    ]);
  } else {
    log(`<div class="scene-head"><div class="place">第 ${S.world} 世 · 时间线继承</div>
      <h1>再 世</h1><div class="sub">世界不为你回档。上一世你死去至今，已过了十余年。</div></div>`);
    log(`【序章 · 本地人生涯】十几年间，你以「${S.name}」的身份长大：${S.iden.desc}（${S.iden.note}）——不知系统，不知轮回，全情投入这一世的命。`, "dim");
    log(`直到今夜，命定的死局收紧，「不想死」烧到最烈的那一瞬间——`);
    sys(`【万象轮盘检测到宿主求生意志峰值。封印解除。欢迎回来。】`);
    sys(`【前世记忆决堤。千秋录、称号、评语一次性涌入——融合冲击判定：通过。这一世，你是第 ${S.world} 次睁眼。】`);
    sys(`【今生资质：${linggen().name}】${linggen().desc}${linggen().bonus ? "（" + linggen().bonus + "）" : ""}`);
    S.gmRecent = ["rebirth"];
    renderPanel();
    setChoices([{ label: "睁眼，看这新的一世", hint: "", fn: () => advanceSlot() }]);
  }
}

/* ================= 设置（AI Key） ================= */
function openSettings() {
  const c = AI.getCfg() || {};
  $("#aiBase").value = c.base || "https://api.moonshot.cn/v1";
  $("#aiKey").value = c.key || "";
  $("#aiModel").value = c.model || "kimi-k2-0711-preview";
  $("#aiStatus").textContent = c.key ? "已启用 AI 天道（Kimi 实时生成剧情）" : "未配置：当前为内置推演引擎。填入 Key 后剧情由 Kimi 实时生成。";
  $("#settings").classList.add("open");
}
async function testAiKey() {
  const c = { base: $("#aiBase").value.trim(), key: $("#aiKey").value.trim(), model: $("#aiModel").value.trim() };
  if (!c.key) { $("#aiStatus").textContent = "请先填入 API Key。"; return; }
  $("#aiStatus").textContent = "连接中……"; $("#aiDebug").textContent = "";
  try { const r = await AI.testKey(c); $("#aiStatus").textContent = "连接成功 ✓ 模型回应：" + r.slice(0, 20); AI.saveCfg(c); renderPanel(); }
  catch (e) {
    $("#aiStatus").textContent = "连接失败：" + e.message;
    $("#aiDebug").textContent = `调试信息（可截图给我）：\nBase: ${c.base}\nKey: ${c.key ? c.key.slice(0, 6) + "…" : "(空)"}\nModel: ${c.model}\n错误: ${e.name}: ${e.message}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tabrow button").forEach((b, i) => b.onclick = () => { curTab = i; renderTab(); });
  $("#btnGacha").onclick = openGacha;
  $("#gachaClose").onclick = () => $("#gacha").classList.remove("open");
  $("#btnPull1").onclick = () => doPulls(1);
  $("#btnPull10").onclick = () => doPulls(10);
  $("#btnStoneExch").onclick = () => { // 以石易点：系统必毒舌
    if (S.stones < 11 || (S.stoneExch || 0) >= 100) return;
    S.stones -= 11; S.points += 10; S.stoneExch = (S.stoneExch || 0) + 10;
    sys(`【灵石……也行吧。它收的不是钱，是你为变强舍弃的东西。】（万象点 +10）`);
    openGacha(); renderPanel();
  };
  $("#gacha").addEventListener("click", e => { if (e.target.id === "gacha") $("#gacha").classList.remove("open"); });
  $("#btnSettings").onclick = openSettings;
  $("#settingsClose").onclick = () => $("#settings").classList.remove("open");
  $("#btnSave").onclick = () => { renderSaveModal(); $("#saveModal").classList.add("open"); };
  $("#saveClose").onclick = () => $("#saveModal").classList.remove("open");
  $("#btnImportSave").onclick = () => $("#importSaveFile").click();
  $("#importSaveFile").onchange = e => { if (e.target.files && e.target.files[0]) importSaveFile(e.target.files[0]); e.target.value = ""; };
  $("#saveModal").addEventListener("click", e => { if (e.target.id === "saveModal") $("#saveModal").classList.remove("open"); });
  $("#aiSave").onclick = () => {
    const key = $("#aiKey").value.trim();
    if (key) AI.saveCfg({ base: $("#aiBase").value.trim(), key, model: $("#aiModel").value.trim() });
    else AI.saveCfg(null);
    $("#settings").classList.remove("open"); renderPanel();
    toast(key ? "AI 天道已启用" : "已恢复内置推演引擎");
  };
  $("#aiTest").onclick = testAiKey;
  $("#btnTianDao").onclick = () => { // 天道视野：把发给模型的东西原样摊开
    const box = $("#tdView");
    if (box.style.display === "none") {
      const d = AI.debugInfo();
      const src = AI.getCfg() && AI.getCfg().key ? "你的 API Key（真 AI 推演）" : "内置推演引擎 / 同源服务端（未填 Key，模型未参与）";
      box.textContent = `◆ 当前叙事源：${src}\n\n◆ 系统提示词（世界观与规则，每回合全文发给模型）：\n${d.system}\n\n◆ 最近一回合发给模型的「当前状态」（你的实时游戏数据）：\n${d.prompt || "（本局尚未推演，随便点一个选项后再来看）"}`;
      box.style.display = "";
      $("#btnTianDao").textContent = "收起天道视野";
    } else { box.style.display = "none"; $("#btnTianDao").textContent = "窥视天道视野"; }
  };
  $("#aiListModels").onclick = async () => {
    const c = { base: $("#aiBase").value.trim(), key: $("#aiKey").value.trim(), model: $("#aiModel").value.trim() };
    const box = $("#modelList");
    if (!c.key) { $("#aiStatus").textContent = "请先填入 API Key。"; return; }
    box.innerHTML = `<span class="dim">查询中……</span>`;
    try {
      const ids = await AI.listModels(c);
      $("#aiBase").value = c.base;
      $("#aiDebug").textContent = "";
      box.innerHTML = ids.map(id => `<button class="model-chip${id === c.model ? ' on' : ''}" data-m="${esc(id)}">${esc(id)}</button>`).join("");
      box.querySelectorAll(".model-chip").forEach(b => b.onclick = () => {
        $("#aiModel").value = b.dataset.m;
        box.querySelectorAll(".model-chip").forEach(x => x.classList.remove("on"));
        b.classList.add("on");
        $("#aiStatus").textContent = "已选择模型：" + b.dataset.m + "，点「保存」生效。";
      });
      $("#aiStatus").textContent = `共 ${ids.length} 个可用模型，点选即可填入 Model 栏。`;
    } catch (e) {
      box.innerHTML = "";
      $("#aiStatus").textContent = "查询失败：" + e.message;
      $("#aiDebug").textContent = `调试信息（可截图给我）：\nBase: ${c.base}\nKey: ${c.key ? c.key.slice(0, 6) + "…" : "(空)"}\nModel: ${c.model}\n错误: ${e.name}: ${e.message}`;
    }
  };
  newLife(); startLife();
});
