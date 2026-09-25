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
if (!META.titles) META.titles = []; // 称号随魂封存（轮回法则：称号与评语随魂封存；千秋录成就自新一世清零重刻）
if (!META.comments) META.comments = []; // 历世评语钉面板（15.2：评语随魂封存）
if (!META.dynCards) META.dynCards = {}; // AI 生成词条库（随魂封存：轮盘不局限引擎名录）
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch (e) {} }

/* ================= 全局状态 ================= */
let S = null;
const REALM_NAMES = TABLES.REALMS.names;   // 判定演算表（tools/calc_tables.py 生成）：四阶二十四境（凡/灵/玄/圣各六境）
const REALM_NEED  = TABLES.REALMS.need;
const REALM_TOP   = TABLES.REALMS.top;     // 登仙境（圣阶之巅，传说之顶；此界三万载无人踏足）
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
    if (rb.attrMalus) { const ks = ["str", "agi", "int", "con"].sort(() => Math.random() - 0.5); for (let i = 0; i < rb.attrMalus; i++) base[ks[i % 4]] = Math.max(1, base[ks[i % 4]] - (rb.attrMalus >= 2 ? 1 + (Math.random() < 0.5 ? 1 : 0) : 1)); } // 潦草：随机一项 -1；败笔：随机两项 -1~2（设定 15.2 奖励对照）
    if (rb.luckMalus) base.luck = Math.max(1, base.luck - rb.luckMalus);
  }
  S = {
    name, first, iden, world: META.world,
    gender: META.gender || "男", // 性别：首世由玩家在命名时选定，存入 META 随魂不变；魅魔等词条依此生效
    place: (iden && iden.place) || null, // 当前所在之地（再世随身份落定；首世在开局剧本落定；顶栏常显）
    day: 1, slot: 0, weather: "大雪",
    base, hp: 0, sta: 0, mp: 0,
    hunger: 55, money, stones: 0, points,
    pity10: 0, pity100: 0, pity1000: 0, pulls: 0, stoneExch: 0,
    linggen: rollLinggen(first), // 灵根五行：首世阿七固定杂灵根（设定原文），再世按稀有度重 roll
    shutong: 0,
    cards: {}, cardOrder: [],
    inv: { heimu: 1, wood: 0 }, skills: {}, spells: {}, // spells：具名法术名册（玉简/传功习得，不占用行囊）
    mats: {}, // 材料账（第七九章）：妖兽内丹、灵药等硬通货，剧情中折算
    realm: 0, cult: 0, daoXin: 40,
    npc: {}, npcMin: {}, flags: {}, debuff: null,
    bondDaily: {}, // 缘分日常账：{ NPC名: 日子 }——日常行为带来的善缘，同一 NPC 每日最多一次（特殊剧情不受限）
    wound: null, // 受伤部位 { part, day }：伤势升档时登记一处，痊愈自动销记
    ill: null, // 疾病 { name, days, desc }：夜寒入体、丹毒爆发等落下，逐日痊愈
    job: null, foodStreak: 0, kills: 0,
    realmBreaks: 0, tempLuckDays: 0,
    lastTrainDay: 0, // 三日历练：上次实力机缘的日子（每 3 天必触发一次）
    professions: {}, // 职业系统（第三章）：{ id: { lv, exp, primary } }
    masters: {}, // 云游师傅名册（23:10）：{ pid: 本世随机名号 }——丹师/器火一脉不系固定 NPC
    gmRecent: [], over: false, mods: {},
    yaoshi: 0, drugUse: {}, // 药蚀度（0~100，隐藏数值）与同种服药计数
    darkWounds: {}, // 暗伤账（第十二章·永久损伤）：{ 属性: 累计损伤 }，压常态，此世难愈
    xinmo: META.world > 1 ? 10 : 0, // 心魔（0~100，半隐藏）：前世死亡记忆是它的养料
    quests: { active: [], done: [], failed: [], refused: {} },
    chronicle: [], lifeAch: [], // lifeAch：本世新刻成就（轮回结算用；千秋录本体每世清零，从新人生重新刻起）
    stats: { trains: 0, meditates: 0, begs: 0, chops: 0, gambles: 0, spellCasts: 0, maxMoney: money },
  };
  S.wx = genWx(S.linggen); // 先天五行亲和：总和恒 100
  if (!first && rb && rb.echo && findCard(rb.echo)) { // 词条残影：上一世词条半效伴生
    S.cards[rb.echo] = 1; S.cardOrder.push(rb.echo);
    const ec = findCard(rb.echo);
    setTimeout(() => sys(`【伴生残影】「${ec.name}」——上一世的词条没有散干净，半效随你入胎。`), 0);
  }
  (META.soulPets || []).forEach(name => { // 【认魂】灵宠跨世：妖兽寿元远长于人，缘分够深可破一世之约
    if (Math.random() < 0.6) { // 约六成仍在世（寿数、天时各有定数）
      S.npc[name] = 0; S.flags["soulpet_" + name] = 1;
      setTimeout(() => sys(`【似曾相识】不知为何，你无端想起一个名字——「${name}」。像隔着很多年的雪，有一双眼睛在某个地方等你长大。`), 0);
    }
  });
  computeMods();
  META.poolTheme = POOL_THEMES[Math.floor(Math.random() * POOL_THEMES.length)].name; // 卡池预览：每世（每月）一个倾向主题
  saveMeta();
  S.hp = first ? Math.round(hpMax() * 0.6) : Math.round(hpMax() * 0.5); // 首世开局高烧三天只剩六成（对齐设定集 12/20）；再世系统激活于死局之巅，带伤睁眼（15.4/15.6）
  S.sta = staMax(); S.mp = 0;
}

/* ================= 属性与修正 ================= */
function computeMods() {
  const m = { strP:0, agiP:0, intP:0, conP:0, allP:0, luckFlat:0, hungerR:0, foodP:0,
    hpRegenP:0, staRegen:1, moneyP:0, socialP:0, trainP:0, dmgP:0, escapeP:0, pityR:0, defP:0,
    coldRes:0, heatRes:0, poiRes:0, xinmoRes:0, yaoRes:0 }; // 抗性五件：冻寒/暑热/瘴毒/心魔/药蚀（身份特性与词条实装处）
  for (const id in S.cards) {
    const c = findCard(id); if (!c) continue;
    const mod = c.mod || {};
    for (const k in mod) m[k] = (m[k] || 0) + mod[k];
  }
  const lg = LINGGENS[S.linggen]; // 变异灵根的天生特性
  if (lg && lg.mods) for (const k in lg.mods) m[k] = (m[k] || 0) + lg.mods[k];
  for (const tid of (META.titles || [])) { const t = TITLES[tid]; if (t && t.mod) for (const k in t.mod) m[k] = (m[k] || 0) + t.mod[k]; } // 称号效果永续
  if (S.iden && typeof NOTE_FX !== "undefined" && NOTE_FX[S.iden.name]) { const fx = NOTE_FX[S.iden.name]; for (const k in fx) m[k] = (m[k] || 0) + fx[k]; } // 身份特性：note 里的承诺在此落地（拒绝纯文案）
  for (const pid in (S.professions || {})) { // 职业特性（设定补丁 v5·3.4/3.5）：凡品判定随级成长，灵品起为常驻规则
    const P = (typeof PROFESSIONS !== "undefined") && PROFESSIONS[pid];
    if (!P || !P.traitMod) continue;
    const lv = S.professions[pid].lv || 1;
    const mult = (P.tier || 0) === 0 ? lv : 1;
    for (const k in P.traitMod) m[k] = (m[k] || 0) + P.traitMod[k] * mult;
  }
  if (S.flags && S.flags.tangzheLazy > S.day) m.trainP = (m.trainP || 0) * 0.5; // 躺者出关动力 -50%：破境成功后三日内修炼收益减半
  if (S.gear && S.gear.weapon) m.dmgP = (m.dmgP || 0) + (S.gear.weapon.dmgP || 0); // 炼器（22:41 补丁）：随身兵器的攻伐加成
  S.mods = m;
}
function findCard(id) {
  for (const tier of CARD_POOL) for (const c of tier) if (c.id === id) return c;
  if (META.dynCards && META.dynCards[id]) return META.dynCards[id]; // AI 生成词条（23:59 补丁）
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
  if (META.dynCards && META.dynCards[id]) return META.dynCards[id].tier;
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
  const pb = profAttrBonus(k); // 职业每级属性加成（3.4）：品阶基数 × 境界系数
  if (pb > 0) { const ceil = attrCeiling(); v += Math.min(pb, Math.max(0, ceil - v)); } // 天花板条款：不得突破当前境界的单项属性天花板
  if (S.debuff === "weak" && k !== "luck") v *= 0.8;
  if (S.jinshuWeak > 0 && k !== "luck") v *= 0.5; // 禁术·虚弱：全属性 -50%（蓝锁 0，3~7 日体质定恢复）
  if (k === "int" && S.flags.hangoverDay === S.day) v *= 0.5; // 酒剑仙：宿醉次日智力减半
  if ((k === "int" || k === "agi") && S.flags.sleepDebtDay === S.day) v *= 0.9; // 睡眠不足：智力敏捷先掉（设定·凡俗生存）
  return Math.round(v * 10) / 10;
}
/* 职业属性加成合计：Σ(品阶基数[k] × 等级) × 境界系数（凡 ×1 ｜ 灵 ×10 ｜ 玄 ×100 ｜ 圣 ×1000，设定·品阶与加成） */
function profAttrBonus(k) {
  if (!S.professions) return 0;
  const rc = (TABLES.PROF.realmCoeff || { "0": 1, "7": 10, "13": 100, "19": 1000 });
  const coeff = S.realm >= 19 ? rc["19"] : S.realm >= 13 ? rc["13"] : S.realm >= 7 ? rc["7"] : rc["0"];
  let sum = 0;
  for (const pid in S.professions) {
    const P = (typeof PROFESSIONS !== "undefined") && PROFESSIONS[pid];
    if (!P || !P.attrs || !P.attrs[k]) continue;
    sum += P.attrs[k] * (S.professions[pid].lv || 1) * coeff;
  }
  return Math.round(sum * 100) / 100;
}
function hpMax() { return Math.max(10, Math.round(attr("con") * 10)); }
function staMax() { return Math.max(5, Math.round(attr("con") * 5)); }
function mpMax() { const v = S.realm >= 6 ? attr("int") * 10 : S.realm >= 5 ? attr("int") * 5 : 0; return Math.round(v * (S.linggen === "za" ? 1.2 : 1)); }
/* ---------- 具名法术（设定集「法力与技能威力」）：威力 = 基础 × 智力系数 × 存量系数；熟练度对齐「等阶 + 熟练度」体系 ---------- */
function knownSpells() { return (typeof SPELLS !== "undefined") ? SPELLS.filter(sp => ((S.spells || {})[sp.id] || 0) > 0) : []; }
function realmAttrAvg() { return S.realm >= 19 ? 1000 : S.realm >= 13 ? 100 : S.realm >= 7 ? 10 : 1; } // 同境均值：基准取当前境界属性下限（灵泉境 10、化神境 100，依此类推）
function spellIntCoef() { return Math.round((0.5 + 0.5 * attr("int") / realmAttrAvg()) * 100) / 100; } // 智力系数：智力每高于同境均值一成 +5%
function mpReserveCoef() { // 存量系数：满蓝 ×1.0 ｜ 半蓝 ×0.85 ｜ 残蓝不足 20% ×0.65（三锚点间线性过渡）
  const r = mpMax() > 0 ? S.mp / mpMax() : 0;
  const c = r >= 0.999 ? 1 : r >= 0.5 ? 0.85 + (r - 0.5) * 0.3 : r >= 0.2 ? 0.65 + (r - 0.2) / 0.3 * 0.2 : 0.65;
  return Math.round(c * 100) / 100;
}
function spellCap(sp) { return (typeof SPELL_CAP !== "undefined") ? (SPELL_CAP[sp.tier] || 200) : (sp.tier === 1 ? 200 : 400); }
function spellProf(id) { return (S.spells || {})[id] || 0; }
function spellPower(sp) { // 威力预估：基础随熟练成长（圆满 +30%）× 智力系数 × 存量系数（按当前蓝量）
  const profGrow = 1 + 0.3 * Math.min(1, spellProf(sp.id) / spellCap(sp));
  return Math.max(1, Math.round(sp.base * profGrow * spellIntCoef() * mpReserveCoef() * 10) / 10);
}
function spellPowerJinshu(sp) { // 禁术威力预估：燃法随当前蓝量上涨（倾蓝一击），其余为基础 × 智力系数；称号「孤注」+10%
  let p = sp.jsKind === "ranfa" ? (sp.base + S.mp * 2) : sp.base;
  p *= spellIntCoef();
  if (hasTitle("guzhu")) p *= 1.1;
  return Math.max(1, Math.round(p * 10) / 10);
}
function gainSpellProf(sp, why) { // 施法积攒：实战中掐诀求真知（设定·自然习得）；瓶颈（最后 10%）获取减半；小成/圆满反哺智力（法术看智力）
  S.spells = S.spells || {};
  const cap = spellCap(sp);
  const cur = S.spells[sp.id] || 0;
  if (cur >= cap) return;
  let g = attr("int") >= realmAttrAvg() * 2 ? 2 : 1; // 智力倍于同境均值者，一次施法多悟一分
  if (cur >= cap * 0.9) g = Math.max(0.5, Math.round(g * 0.5 * 10) / 10); // 瓶颈：最后 10% 熟练度获取减半（设定原文）
  S.spells[sp.id] = Math.min(cap, Math.round((cur + g) * 10) / 10);
  S.stats.spellCasts = (S.stats.spellCasts || 0) + 1;
  if (S.spells[sp.id] >= cap / 2 && !S.flags["sp50_" + sp.id]) { S.flags["sp50_" + sp.id] = 1; const b = sp.tier === 1 ? 0.5 : 3; gainAttr("int", b); sys(`【法术小成】「${sp.name}」铭刻入微——施法如臂使指，智力 +${b}。`); }
  if (S.spells[sp.id] >= cap && !S.flags["sp100_" + sp.id]) { S.flags["sp100_" + sp.id] = 1; const b = sp.tier === 1 ? 1 : 6; gainAttr("int", b); sys(`【法术圆满】「${sp.name}」炉火纯青——此术已与你的神识合一，智力 +${b}。`); }
}
function learnSpell(id) { // 习得具名法术（玉简/传功/灵根支线；重复习得不叠加；灵根专属唯对应灵根可修）
  const sp = (typeof SPELLS_BY_ID !== "undefined") && SPELLS_BY_ID[id];
  if (!sp) return;
  if (sp.linggen && S.linggen !== sp.linggen) return; // 灵根专属：非其根不可修
  S.spells = S.spells || {};
  if (S.spells[id]) return;
  S.spells[id] = 1;
  sys(`【习得法术】「${sp.name}」——${sp.desc}`);
  chronicle(`习得法术「${sp.name}」`, "evt");
}
/* 法术一击结算（开场/战中共用）：行属（randEl 随机）、trait、判定 → 伤害与战报附注 */
function spellHit(sp, power, j, eEl0, za) {
  let el = sp.el, note = "";
  if (sp.trait === "randEl") { el = WX_ELS[Math.floor(Math.random() * WX_ELS.length)]; note = `（五行轮转·${WX_NAMES[el]}行）`; }
  let m = 1; // 行属生克（randEl 不乘生克——五行不克，杂灵根设定）
  if (sp.trait !== "randEl") { if (WX_KE[el] === eEl0) m = 1.2; else if (WX_KE[eEl0] === el && !za) m = 0.8; }
  let dodged = j.kind === "dodge", mult = j.mult, kind = j.kind;
  if (dodged && sp.trait === "sure") { dodged = false; mult = 1; kind = "hit"; note += "（敛息·必中）"; }
  if (!dodged && sp.trait === "critUp" && kind === "hit" && Math.random() * 100 < 15) { mult = TABLES.JUDGE.crit.mult; kind = "crit"; note += "（锋锐·暴）"; }
  let dmg = dodged ? 0 : Math.max(1, Math.round(power * m * mult));
  if (dmg > 0 && (sp.trait === "chain" || sp.trait === "bonusDmg")) { const extra = Math.max(1, Math.round(dmg * 0.5)); dmg += extra; note += sp.trait === "chain" ? `（余雷 +${extra}）` : `（毒发 +${extra}）`; }
  return { dmg, el, dodged, kind, note, m };
}
function combatPower() {
  const a = attr("str") + attr("agi") + attr("int") * 0.8 + attr("con") * 0.6;
  let p = a * (1 + S.realm * TABLES.REALMS.realmDmgPerRealm) * (1 + (S.mods.dmgP || 0) / 100);
  if (S.iden && S.iden.name === "死囚" && S.hp < hpMax() * 0.3) p *= 1.15; // 身份「死囚」向死而生·伪：濒死战力 +15%（命格之火，先于伤病饥饿折算）
  if (S.hunger > 70) p *= 0.9; // 饥饿 -10%（设定·状态浮动）
  if (S.hunger > 85) p *= 0.78; // 极度饥饿再扣（累计约 -30%）：眼冒金星，手脚发软
  p *= 1 - injuryTier().pen / 100; // 设定：伤病四级压常态战力
  if ((S.flags.drunkSlots || 0) > 0 && hasSpecial("jiujian")) p *= 1.15; // 酒剑仙：酒意酣畅，战力 +15%
  if (S.realm >= 5) { const mr = mpMax() > 0 ? S.mp / mpMax() : 0; p *= 0.7 + 0.4 * mr; } // 法力存量计入战力浮动（设定·禁术节接口）：满蓝 ×1.1 / 半蓝 ×0.9 / 空蓝 ×0.7
  return Math.round(p * 10) / 10;
}
/* 康健 · 伤病四级（设定集）：轻伤 -10% ｜ 中伤 -30% ｜ 重伤 -50% ｜ 濒死 -80%（判定表演算） */
function injuryTier() {
  const r = S.hp / hpMax();
  const th = TABLES.INJURY.thresholds, pen = TABLES.INJURY.penalties;
  if (r >= th[0] && S.debuff !== "weak") return { name: "无恙", pen: pen[0] };
  if (r >= th[1]) return { name: "轻伤", pen: pen[1] };
  if (r >= th[2]) return { name: "中伤", pen: pen[2] };
  if (r >= th[3]) return { name: "重伤", pen: pen[3] };
  return { name: "濒死", pen: pen[4] };
}
/* 暗伤（第十二章 · 永久损伤）：重伤之后未妥善处理，身体会记账——对应属性永久下降（此世） */
const DARK_WOUND_NAMES = { str: "力量", agi: "敏捷", int: "智力", con: "体质" };
/* 攻击力（= 战力）：不运功法时，每记普通攻击皆造成等同攻击力之伤害（其他伤害公式不变） */
function attackPower() { return Math.max(1, combatPower()); }
/* ---------- 受伤部位 & 疾病（人物页细节） ---------- */
const WOUND_PARTS = ["头面", "左肩", "右臂", "胸腹", "后背", "左腿", "右腿"];
const WOUND_TIER_IDX = { "无恙": 0, "轻伤": 1, "中伤": 2, "重伤": 3, "濒死": 4 };
/* 伤势升档时在身上登记一处新伤（不与前伤同部）；痊愈（回到无恙）自动销记 */
function registerWound() {
  const idx = WOUND_TIER_IDX[injuryTier().name] || 0;
  if (idx <= 0) { S.wound = null; S.woundDayTier = 0; return; }
  if (!S.wound || idx > (S.woundDayTier || 0)) {
    const pool = WOUND_PARTS.filter(p => !S.wound || p !== S.wound.part);
    S.wound = { part: pool[Math.floor(Math.random() * pool.length)], day: S.day };
  }
  S.woundDayTier = idx;
}
function woundText() {
  if (!S.wound) return "周身无伤";
  return `${S.wound.part} · ${injuryTier().name}（第 ${S.wound.day} 日至今）`;
}
function setIll(name, days, desc) {
  if (S.ill && S.ill.name === name) S.ill.days = Math.max(S.ill.days, days);
  else S.ill = { name, days, desc };
  sys(`【疾病 · ${name}】${desc}（约 ${days} 日可愈）`);
}
function illText() { return S.ill ? `${S.ill.name}（余 ${S.ill.days} 日）` : "无疾"; }
function gearText() {
  const g = [];
  if (S.gear && S.gear.weapon) g.push(`⚔ ${S.gear.weapon.name}（攻伐 +${S.gear.weapon.dmgP}%）`);
  if (S.inv.mianao) g.push("老棉袄（御寒）");
  if (S.inv.shuinang) g.push("水囊（防暑）");
  if (S.flags.fangcunUsed) g.push("方寸戒（储物法器）");
  return g.length ? g.join("、") : "身无长物";
}
function maybeDarkWound() {
  const dw = TABLES.INJURY.darkWound;
  const chance = Math.max(dw.cap[0], Math.min(dw.cap[1], dw.chanceBase - attr("con") * dw.conFactor)); // 体质高者皮开肉绽，体质低者当场透胸
  if (Math.random() >= chance) return;
  const ks = ["str", "agi", "int", "con"];
  const k = ks[Math.floor(Math.random() * 4)];
  const amt = Math.round((dw.dmgLo + Math.random() * (dw.dmgHi - dw.dmgLo)) * 100) / 100;
  S.base[k] = Math.max(1, Math.round((S.base[k] - amt) * 100) / 100);
  S.darkWounds = S.darkWounds || {};
  S.darkWounds[k] = Math.round(((S.darkWounds[k] || 0) + amt) * 100) / 100;
  computeMods();
  sys(`【暗伤】这一战在你${{ str: "筋骨", agi: "身法", int: "神识", con: "脏腑" }[k]}里留下了记号——${DARK_WOUND_NAMES[k]} -${amt}（永久，此世难愈：圣品疗伤丹、玄阶医道圣手、万年地心乳可解）。穷病也是病：带伤硬撑，是有利息的。`);
}
/* 战力拆解（设定：系统给出完整拆解——常态值 / 修正 / 成因） */
function powerBreakdown() {
  const base = attr("str") + attr("agi") + attr("int") * 0.8 + attr("con") * 0.6;
  const lines = [`五维加权基础：${base.toFixed(1)}（力 + 敏 + 智×0.8 + 体×0.6）`,
    `境界加幅：×${(1 + S.realm * TABLES.REALMS.realmDmgPerRealm).toFixed(2)}（${REALM_NAMES[S.realm]}）`,
    `词条攻伐：${(S.mods.dmgP || 0) >= 0 ? "+" : ""}${S.mods.dmgP || 0}%`];
  const normal = base * (1 + S.realm * TABLES.REALMS.realmDmgPerRealm) * (1 + (S.mods.dmgP || 0) / 100);
  const inj = injuryTier();
  if (S.hunger > 85) lines.push(`极度饥饿：约 -30%（与饥饿叠加，眼冒金星）`);
  else if (S.hunger > 70) lines.push(`饥饿缠身：-10%（饱食不足三成）`);
  if (inj.pen) lines.push(`${inj.name}：-${inj.pen}%（伤病四级）`);
  if (S.debuff === "weak") lines.push(`元气大伤：五维 ×0.8（修养 ${S.debuffDays || 0} 日）`);
  if (S.jinshuWeak > 0) lines.push(`禁术虚耗：全属性 -50%、法力锁 0（${S.jinshuWeak} 日后恢复）`);
  if ((S.flags.drunkSlots || 0) > 0 && hasSpecial("jiujian")) lines.push(`酒剑仙 · 酒意酣畅：战力 +15%（余 ${S.flags.drunkSlots} 时辰；明日宿醉智力减半）`);
  lines.push(`——常态战力（满状态）：${(Math.round(normal * 10) / 10)}`);
  const dw = Object.keys(S.darkWounds || {}).filter(k => S.darkWounds[k] > 0);
  if (dw.length) lines.push(`暗伤压体：${dw.map(k => `${DARK_WOUND_NAMES[k]} -${S.darkWounds[k]}`).join("、")}（永久损伤，圣药/医道圣手可解）`);
  if (hasSpecial("yaoyao")) lines.push(`「遥遥领先」生效中：对外显示 ${displayPower()}（虚高 30%，真实战力不变）`);
  return lines;
}
/* 「遥遥领先」：战力对外显示虚高 30%，真实战力不变 */
function displayPower() { return Math.round(combatPower() * (hasSpecial("yaoyao") ? 1.3 : 1) * 10) / 10; }
function daoText() { const d = S.daoXin; return d >= 80 ? "坚如磐石" : d >= 60 ? "古井无波" : d >= 40 ? "微澜不惊" : d >= 25 ? "心浮气躁" : "暗流涌动"; }
function gainAttr(k, amt) {
  const cap = attrCeiling(); // 磨炼上限随大阶抬升（凡阶之躯冲不过 10）
  const cur = S.base[k];
  if (cur >= cap) return 0;
  const eff = amt * Math.pow(0.8, Math.floor(cur - 2)) * (1 + (S.mods.trainP || 0) / 100);
  S.base[k] = Math.min(cap, cur + Math.max(0.02, eff));
  if (S.realm < 5 && S.base.str >= 10 && S.base.agi >= 10 && S.base.con >= 10) gainAch("renji"); // 凡俗之巅：不入聚气境，纯以凡躯将力/敏/体全部磨到 10
  return eff;
}
/* 修为须有功法托底：无功法时灵气穿体而过，修为不增（每日提示一次） */
function hasTechnique() { return GONGFU.some(g => (S.inv[g.id] || 0) > 0); }
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
/* 四小层：初期/中期/后期/圆满（设定：每境四分，小层突破全属性微涨） */
const LAYER_NAMES = ["初期", "中期", "后期", "圆满"];
function attrCeiling() { // 属性天花板（设定·属性标尺）：凡阶 10 / 灵阶 100 / 玄阶 1000 / 圣阶 10000；称号「人极」上限 +10%
  const cs = TABLES.REALMS.attrCeilings || { "0": 10 };
  const base = S.realm >= 19 ? cs["19"] : S.realm >= 13 ? cs["13"] : S.realm >= 7 ? cs["7"] : cs["0"];
  return Math.round(base * (hasTitle("renjiT") ? 1.1 : 1));
}
function miniLayer() {
  if (S.realm < 1 || S.realm >= REALM_TOP) return -1;
  const p = S.cult / (REALM_NEED[S.realm + 1] || 1);
  const th = TABLES.REALMS.layerThresholds;
  return p >= th[2] ? 3 : p >= th[1] ? 2 : p >= th[0] ? 1 : 0;
}
function gainCult(amt) {
  if (S.realm >= REALM_TOP) return false;
  if (!hasTechnique()) { if (amt > 0) noteNoTechnique(); return false; }
  const before = miniLayer();
  S.cult = Math.min(REALM_NEED[S.realm + 1], S.cult + amt * linggen().mult * (1 + (S.mods.trainP || 0) / 100) * ((S.yaoshi || 0) >= 30 ? 0.9 : 1) * ((S.xinmo || 0) >= 25 ? 0.95 : 1)); // 药蚀 30+：修炼 -10% ｜ 心魔杂念：修炼 -5%
  const after = miniLayer();
  if (before >= 0 && after > before) { // 小层突破：全属性微涨（天花板 = 10+境界）
    for (const k of ["str", "agi", "int", "con"]) S.base[k] = Math.min(attrCeiling(), Math.round((S.base[k] + TABLES.REALMS.layerBonus) * 10) / 10);
    sys(`【${REALM_NAMES[S.realm]} · ${LAYER_NAMES[after]}】小层突破，气血圆融——全属性微涨。`);
    computeMods();
  }
  return true;
}
function checkBreakthrough() { return S.realm < REALM_TOP && S.cult >= REALM_NEED[S.realm + 1]; }
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
  const D = TABLES.DRUG; // 药蚀判定（判定表演算）
  const used = S.drugUse[id] || 0;
  S.drugUse[id] = used + 1;
  const mult = D.decayMults[Math.min(used, D.decayMults.length - 1)]; // 同种递减 100%→50%→25%→无效
  let shi = (DRUG_SHI[id] || 4) * (used >= D.doubleFromUse - 1 ? 2 : 1); // 第四次起药蚀翻倍
  if (hasProfession("yaoshi")) shi = Math.round(shi * 0.5); // 灵品药师「坐堂」：识得药性，丹毒不侵（药蚀减半）
  if (hasSpecial("zhichang")) shi = 0; // 直肠子食神：药蚀免疫
  else if (hasSpecial("huachang") || hasSpecial("baidu")) shi *= 0.5; // 拉得快，毒留不住
  if (shi > 0 && (S.mods.yaoRes || 0) > 0) shi = Math.max(1, Math.round(shi * (1 - Math.min(50, S.mods.yaoRes) / 100))); // 身份特性「药圃岁月/药性亲和」：药蚀累积减免
  S.yaoshi = Math.min(100, Math.max(0, (S.yaoshi || 0) + shi));
  let effMult = mult;
  if (S.yaoshi >= D.absorbPenaltyAt) effMult *= D.absorbPenalty; // 药蚀 30+：丹药吸收率下降
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
  if (n > 0 && hasSpecial("daoxin")) n = Math.max(1, Math.round(n * 0.7)); // 磐石道心（词条）：心魔增速 -30%
  if (n > 0 && hasSpecial("mindshield")) n = Math.max(1, Math.ceil(n * 0.5)); // 如何呢又能怎：心魔类侵扰效果 -50%
  if (n > 0 && (S.mods.xinmoRes || 0) > 0) n = Math.max(1, Math.round(n * (1 - Math.min(60, S.mods.xinmoRes) / 100))); // 身份特性「佛性/见惯生死/锁情印」等：心魔累积减免
  const before = xinmoStage().name;
  S.xinmo = Math.min(100, Math.max(0, (S.xinmo || 0) + n));
  const after = xinmoStage().name;
  if (n > 0 && after !== before) sys(`【心魔 · ${after}】${why ? why + "——" : ""}${xinmoStage().desc}。`);
  if ((S.xinmo || 0) >= 100) { // 化魔：神智沦丧，此世终结
    die("心魔噬主。你眼底最后一点清明熄灭时，识海里那声音笑了——用你的嗓音。魔道又多了一具兵源。", "化魔");
  }
}
/* 已入手功法（品阶降序）与当前主修功法：高阶功法入手即为主修，修炼/战斗皆以其为纲（谱系表锁定，不空转） */
function ownedTechs() {
  const out = [];
  for (const g of GONGFU) if ((S.inv[g.id] || 0) > 0) out.push(g);
  return out.sort((a, b) => b.tier - a.tier || b.cap - a.cap);
}
function mainTechnique() { const o = ownedTechs(); return o.length ? o[0] : null; }
/* 打坐参悟（设定·修炼涨幅：每实际修炼一个时辰，熟练度 = 时长 ×（关联主属性 ÷ 当前境界基准值）× 状态系数 0.8~1.2） */
const REALM_ATTR_BASE = (() => { const t = []; for (let r = 0; r <= 24; r++) t.push(r >= 19 ? 1000 : r >= 13 ? 100 : r >= 7 ? 10 : 5); return t; })(); // 境界属性下限基准：凡阶 5 ｜ 灵泉 10 ｜ 化神 100（设定原文，依此类推）
function medStateCoef() { // 状态系数：伤病/心魔/疲惫拖累，道心通明提振，心境浮动 ±0.1——钳在设定区间 0.8~1.2
  let c = 1;
  if (S.ill || S.hp < hpMax() * 0.6) c *= 0.85;
  if ((S.xinmo || 0) >= 50) c *= 0.9;
  if (S.sta < staMax() * 0.3) c *= 0.9;
  if (S.daoXin >= 80) c *= 1.1;
  c *= 0.9 + Math.random() * 0.2;
  return Math.max(0.8, Math.min(1.2, Math.round(c * 100) / 100));
}
/* 功法解锁反哺：第一次握到功法的那一刻，门就开了（谱系见 data.js GONGFU 表） */
function techniqueUnlockFx(id) {
  const g = GONGFU_BY_ID[id];
  if (!g) return;
  const unlock = g.tier >= 3 ? 20 : g.tier === 2 ? 2 : 0.3; // 高阶功法入手即开一重门（对齐反哺档的约 1/10）
  gainAttr(g.fb.a, unlock);
  sys(`【功法解锁】《${g.name}》入心——${g.tier >= 1 ? "吐纳从此有门" : "筋骨从此有路"}，${g.fb.an} +${unlock}。修为之道，自今日始。`);
  chronicle(`习得功法「${g.name}」`, "evt");
}
/* 功法里程碑：小成（熟练度过半）与圆满两档反哺——数值按谱系品阶（0阶 +0.3/+0.7，1阶 +2/+5，2阶 +20/+50，对齐设定集「功法反哺」） */
function checkSkillMilestone(sk) {
  if (!(sk in TECH_CAPS)) return;
  const cap = TECH_CAPS[sk];
  const g = GONGFU_BY_NAME[sk];
  const fb = g ? g.fb : { a: "str", an: "力量", half: 0.3, full: 0.7 }; // 乱拳等谱外野路子
  const tierName = g ? g.tierName : "凡俗武技";
  if ((S.skills[sk] || 0) >= cap / 2 && !S.flags["fb50" + sk]) { S.flags["fb50" + sk] = 1; gainAttr(fb.a, fb.half); sys(`【功法小成】「${sk}」反哺：${fb.an} +${fb.half}。`); }
  if ((S.skills[sk] || 0) >= cap && !S.flags["fb100" + sk]) { S.flags["fb100" + sk] = 1; gainAttr(fb.a, fb.full); sys(`【功法圆满】「${sk}」反哺：${fb.an} +${fb.full}。后续功法灰显封存，待修为突破。`); }
  // 功法自动进阶（设定 v5：连续推演下一阶段功法）——野路子也能磨出正经传承
  if ((S.skills[sk] || 0) >= cap && !S.flags["adv" + sk]) {
    S.flags["adv" + sk] = 1;
    if (sk === "乱拳" && !(S.inv.quanpu > 0)) { techniqueUnlockFx("quanpu"); S.inv.quanpu = 1; sys(`【连续推演】野路子走到头，你竟自「乱拳」中推演出正经拳路——《锻骨拳谱》入手。`); }
    else if (sk === "锻骨拳谱" && !(S.inv.yinqi > 0)) { techniqueUnlockFx("yinqi"); S.inv.yinqi = 1; sys(`【连续推演】拳谱圆满，气感自生——你从中推演出吐纳之法，《引气诀》入手。`); }
    else if (g && g.tier === 1) { // 灵品功法圆满：此卷已至尽头，求法有路（宗门内门 / 散修按主行求玄品）
      S.flags.seekGongfu = Math.max(S.flags.seekGongfu || 0, 2);
      const lead = gongfuLead();
      sys(`【「${sk}」已推演至尽头——此卷只到此处。】`);
      if (lead.length) log(`【求法之路】${lead.map(l => `「${l.g.name}」：${l.path}`).join("；")}。`, "dim");
      else log("【求法之路】玄品功法门槛在灵阶——境界未到，先把修为垒上去。", "dim");
    } else if (g && g.tier === 2) { // 玄品功法圆满：圣品此界难至，只作风闻伏笔
      S.flags.seekGongfu = Math.max(S.flags.seekGongfu || 0, 3);
      sys(`【「${sk}」已推演至尽头。】${GONGFU_RUMORS[Math.floor(Math.random() * GONGFU_RUMORS.length)]}`);
    }
  }
}
/* 求法线索（AI 提示词与离线引擎共用，保证「不空转」）：按境界/宗门/灵根主行检索当前可求的功法与获取路径 */
function gongfuLead() {
  const out = [];
  const has = id => (S.inv[id] || 0) > 0;
  // 宗门线：外门 1 阶（锻骨境起）与内门 2 阶（灵阶起），随地域宗门而名
  if (S.sect) {
    const g1 = GONGFU.find(g => g.line === "sect" && g.tier === 1 && g.sect === S.sect && !has(g.id));
    if (g1 && S.realm >= g1.gate) out.push({ g: g1, path: `宗门传功：回${S.sect}传功殿（或寻外门教习/执事），请传本门功法` });
    const g2 = GONGFU.find(g => g.line === "sect" && g.tier === 2 && g.sect === S.sect && !has(g.id));
    if (g2 && S.realm >= g2.gate) out.push({ g: g2, path: `内门考核：境界已入灵阶，可求${S.sect}内门真传（须宗门缘分打底、经考核剧情）` });
  }
  // 散修线：2 阶玄品按灵根主行求得（灵阶门槛）
  const el = dominantWxEl();
  const sg = GONGFU.find(g => g.line === "sanxiu" && g.el === el && !has(g.id));
  if (sg && S.realm >= sg.gate) out.push({ g: sg, path: `散修求法：你的主行为${WX_NAMES[el]}——古籍残卷、遗迹探险、高人指点（城隍庙瞎眼老者一脉），可求得玄品功法` });
  return out;
}
/* ---------- 世界角色谱（data.js WORLDCAST）：当前地域在场人物 ----------
   boss/中性人物可结识（metcast_ 标记）；hidden 人物只留痕，缘法（伏笔）具足方可接触。 */
function castHere() {
  if (typeof WORLDCAST === "undefined") return [];
  const rg = (typeof regionOf === "function") ? regionOf(S.place) : null;
  const key = rg ? rg.key : "yunzhou";
  return WORLDCAST.filter(c => c.region === key);
}
function castMet(id) { return !!S.flags["metcast_" + id]; }
function castMeet(c) { // 结识入账：一面之缘起，缘分初始 0 记入簿（性格底色随之可见）
  if (!castMet(c.id)) {
    S.flags["metcast_" + c.id] = 1;
    if (typeof S.npc[c.name] !== "number") S.npc[c.name] = 0;
    try { chronicle(`结识「${c.name}」（${c.title}）`, "npc"); } catch (e) {}
  }
}

/* ================= 界面工具 ================= */
/* ================= 职业系统（设定补丁 v5 · 第三章） =================
   入门三选一：从业满一月 ／ 拜师入册（本作主线：行当 NPC 缘分 ≥20 触发入行支线，缘分 ≥40 得认可入册）
   灰色职业：做成对应的事即点亮（不占副职名额，但占因果）
   经验：从业时长（每 3 日 +1）／ 技艺印证（生活技能每满 10 熟练 +1）／ 行业事件（完成任务 +2，主线 +3）／ 口碑
   升级：2/4/8/16/32 经验一次考核；凡品封顶 3 级，须升品转轨；副职惩罚：全部活跃职业经验 -30%（3.6） */
const PROF_NEED = TABLES.PROF.need;
const PROF_LV_NAMES = ["", "学徒", "熟手", "师傅", "名家", "圣手"];
function profList() { if (!S.professions) S.professions = {}; return S.professions; }
function hasProfession(pid) { return !!profList()[pid]; }
function profDef(pid) { return (typeof PROFESSIONS !== "undefined") ? PROFESSIONS[pid] : null; }
function profTierCap(tier) { return TABLES.PROF.tierCaps[String(tier || 0)] ?? 5; }
/* 云游师傅名册（23:10 补丁）：丹师/炼器师一脉不系固定 NPC——名号每世随机生成，
   主角前置职业瓶颈时其人随机现身；固定师傅（药庐一脉等）仍用 P.master。 */
const MASTER_POOLS = {
  tiejiang: ["铁匠岑大锤", "炉匠蒲火头", "锻工鄂三砧"],
  zhushi: ["铸师莫千钧", "火炉翁乌炎", "女匠祁红"],
  danshi: ["游方丹师鹤翁", "云游丹师半炉", "青囊散人苏守拙"],
  qishi: ["游方器师铁心兰", "铸器散人葛洪炉", "百炼散人风胡子"],
};
function masterOf(pid) { // 随用随取：首次调用时生成本世名号并录入缘分簿（静默——不在开局惊动机缘册）
  const P = profDef(pid);
  if (!P) return "";
  if (P.master) return P.master;
  S.masters = S.masters || {};
  if (!S.masters[pid]) {
    const pool = MASTER_POOLS[pid] || ["无名氏"];
    S.masters[pid] = pool[Math.floor(Math.random() * pool.length)];
    if (typeof S.npc[S.masters[pid]] !== "number") S.npc[S.masters[pid]] = 0;
  }
  return S.masters[pid];
}
/* 机缘册：仅在主角快完成相应前置时触发（前置登顶/瓶颈之期/入行机缘），每世每脉只播报一次。
   开局不再听闻任何名号——缘分未到，名号不显。 */
function revealMaster(pid, text) {
  const m = masterOf(pid);
  if (!m || S.flags["revealed_" + pid]) return m;
  S.flags["revealed_" + pid] = 1;
  sys(text || `【机缘册】你听闻一位${profDef(pid).name}师傅的名号——「${m}」。云游之人，萍水相逢即是缘。`);
  return m;
}
/* 遇到生活职业者：已结识该 NPC，且缘分到了「好感」（≥20）；转轨职业另需原职业等级与更高缘分 */
function profReqMet(P) {
  if (typeof S.npc[P.master] !== "number") return false; // 素未谋面
  if ((S.npc[P.master] || 0) < 20) return false;
  if (P.reqAttr) for (const k in P.reqAttr) if (attr(k) < P.reqAttr[k]) return false;
  if (P.requires) {
    const r = P.requires;
    if (!hasProfession(r.prof) || profList()[r.prof].lv < (r.lv || 1)) return false;
    if ((S.npc[P.master] || 0) < (r.bond || 80)) return false;
  }
  return true;
}
/* ---------- 炼丹 · 炼器（22:41 补丁）：成功率与品质依设定集 ----------
   成功率 = 品阶基准 + 七分在人（境界+熟练度）+ 一分在器（炉/锤）+ 一丝气运；
   品质 = 七分在人 + 两分在料 + 一分在器 + 气运抖动 → 六品质（瑕疵~绝品）。 */
function auxName(aid) { const a = CRAFT_AUX.find(x => x.id === aid); return a ? a.name : aid; }
const CT = () => TABLES.CRAFT; // 判定表演算（tools/calc_tables.py）
function craftHumanScore(pid) { // 七分在人：境界×8 + 副职熟练度×6（封顶 70）
  const c = CT(), lv = (profList()[pid] || {}).lv || 0;
  return Math.min(c.humanCap, S.realm * c.humanRealmW + lv * c.humanLvW);
}
function craftToolHeld(kind) { return kind === "dan" ? (S.inv.ludian || 0) > 0 : (S.inv.lianchui || 0) > 0; }
function craftChance(kind, rec) { // 成功率 = 品阶基准 + 人在加成 + 一分在器 + 一丝气运
  const c = CT(), pid = kind === "dan" ? "danshi" : "qishi";
  const lv = (profList()[pid] || {}).lv || 0;
  return Math.min(c.chanceCap, rec.base + Math.min(c.chanceHumanCap, S.realm * 4 + lv * 3) + (craftToolHeld(kind) ? c.chanceTool : 0) + attr("luck") * 0.5);
}
function craftQualityRoll(kind) { // 品质六等（瑕疵~绝品，效力五~六成至二十成）
  const c = CT(), pid = kind === "dan" ? "danshi" : "qishi";
  const score = craftHumanScore(pid) + c.materialScore + (craftToolHeld(kind) ? c.toolScore : 0) + Math.random() * c.luckJitter + attr("luck");
  const b = c.qualityBounds;
  const idx = score < b[0] ? 0 : score < b[1] ? 1 : score < b[2] ? 2 : score < b[3] ? 3 : score < b[4] ? 4 : 5;
  return QUALITY_TIERS[idx];
}
function craftCan(rec) { // 主材 ×1 + 辅材足额
  S.mats = S.mats || {};
  if (!(S.mats[rec.main] > 0)) return false;
  for (const a in rec.aux) if ((S.mats[auxName(a)] || 0) < rec.aux[a]) return false;
  return true;
}
function doCraft(kind, rec) {
  if (gmBusy) { toast("天道推演中，稍候片刻。"); return; }
  if (window.__inCombat) { toast("生死相搏，无暇开炉。"); return; }
  S.mats = S.mats || {};
  if (!craftCan(rec)) { toast("材料不足——主材只走任务、交易、取材三途。"); return; }
  const pid = kind === "dan" ? "danshi" : "qishi";
  const word = kind === "dan" ? "炼丹" : "炼器";
  S.mats[rec.main]--;
  const auxUsed = [];
  for (const a in rec.aux) { const nm = auxName(a); S.mats[nm] = (S.mats[nm] || 0) - rec.aux[a]; auxUsed.push(`${nm}×${rec.aux[a]}`); }
  const chance = craftChance(kind, rec);
  const ok = Math.random() * 100 < chance;
  profExpGain(pid, ok ? TABLES.CRAFT.expGain.ok : TABLES.CRAFT.expGain.fail); // 成败皆长经验：失手也是学费
  if (!ok) {
    log(`【${word}·失手】${rec.name}——火候差了一口气，${rec.main}化为一撮焦灰。材料尽损，经验照得。`, "hurt");
    sys(`【开炉】成功率 ${Math.round(chance)}% 未过——七分在人，这七分还不够。`);
  } else {
    const q = craftQualityRoll(kind);
    if (rec.out.item) {
      S.inv[rec.out.item] = (S.inv[rec.out.item] || 0) + rec.out.n;
      log(`【${word}·功成】${q.name}「${rec.name}」出炉${q.key === "jue" ? "——九纹圆满，丹云乍现，百里可见！" : q.key === "jipin" ? "——三纹流转，一物难求。" : q.key === "shang" ? "——丹生一纹，匠心独运。" : "。"}（耗 ${rec.main}×1、${auxUsed.join("、")}）`, "good");
    } else if (rec.out.gear === "weapon") {
      const dmg = Math.max(1, Math.round(rec.out.baseDmg * q.mult));
      S.gear = S.gear || {};
      S.gear.weapon = { name: `${rec.out.name}·${q.name}`, pin: rec.out.pin, q: q.name, dmgP: dmg };
      log(`【${word}·功成】${q.name}「${rec.out.name}」出炉——器${q.key === "jue" ? "成九纹，引动异象" : q.key === "jipin" ? "起三纹" : q.key === "shang" ? "起灵纹" : "成"}，攻伐 +${dmg}%，已随身佩用。`, "good");
    }
    if (q.key === "jue") gainAch("danyun"); // 千秋录「丹动一城」：绝品出世
    chronicle(`开炉炼成${q.name}「${rec.name}」`, "evt");
  }
  computeMods(); renderPanel(); advanceSlot();
}
function unlockProfession(pid) {
  const P = profDef(pid);
  if (!P || hasProfession(pid)) return "";
  const q = profList();
  const first = Object.keys(q).length === 0;
  q[pid] = { lv: 1, exp: 0, primary: first };
  if (!S.job) S.job = P.name;
  const master = P.master || masterOf(pid); // 云游师傅（dynamic）按本世名册取号
  addNpc(master, 10);
  sys(`【职业解锁】${first ? "主职业" : "副职业"} · ${P.tierName}「${P.name}」（1 级 · ${PROF_LV_NAMES[1]}）${P.dynamic ? `——师承「${master}」` : ""}`);
  if (P.dynamic) log(`${master}把行当的门槛踏给你看了一遍：「从今往后，你是我的入门弟子。」`, "good");
  else log(`${P.doneText}`, "good");
  if (P.grey) { // 灰色职业不占副职名额，但占因果
    S.daoXin = Math.max(0, S.daoXin - 3); S.flags.greyKarma = 1;
    sys(`【因果】灰色职业：名声带毒，道心 -3。做过的事，不随换马甲消失。`);
  }
  computeMods(); renderPanel();
  return P.name;
}
/* 职业经验入账：主职全计、兼职减半；多职业并存全部经验 -30% */
function profExpGain(pid, n) {
  const q = profList()[pid]; const P = profDef(pid);
  if (!q || !P || !n) return;
  const owned = Object.keys(profList()).length;
  q.exp += n * (q.primary ? 1 : 0.5) * (owned > 1 ? 0.7 : 1);
  const cap = profTierCap(P.tier);
  if (q.lv < cap && q.exp >= (PROF_NEED[q.lv + 1] ?? Infinity)) {
    q.exp = 0; q.lv++;
    const mName = P.master || masterOf(pid);
    const pass = (S.npc[mName] || 0) >= 30;
    sys(`【职业晋升】「${P.name}」升至 ${q.lv} 级（${PROF_LV_NAMES[q.lv]}）——${pass ? mName + "点头认可" : "行会评定通过"}。天道酬勤，也酬有心人。`);
    S.daoXin = Math.min(100, S.daoXin + 1);
    if (q.lv >= cap) {
      if (P.next) sys(`【转轨之期】「${P.name}」已至${P.tierName}之巅——想再进一步，须行当升品转轨（${profDef(P.next) ? "「" + profDef(P.next).name + "」" : "更高品阶"}）。修为境界与行业深度，双到位方可挂牌。`);
      else sys(`【行当登顶】「${P.name}」已至${P.tierName}之巅。一方名家，从此是你的底牌。`);
    }
    computeMods(); renderPanel();
  }
}
/* 每夜结算：从业时长（每 3 日 +1）＋ 技艺印证（捆绑生活技能每满 10 熟练 +1） */
function profDailyTick() {
  if (!S.professions) return;
  for (const pid in S.professions) {
    const P = profDef(pid); if (!P) continue;
    let n = 0;
    if (S.day % 3 === 0) n += 1;
    if (P.skill) {
      const cur = Math.floor((S.skills[P.skill] || 0) / 10);
      const key = "psk_" + pid, prev = S.flags[key] || 0;
      if (cur > prev) { n += cur - prev; S.flags[key] = cur; }
    }
    if (n > 0) profExpGain(pid, n);
  }
}
/* 主职业名分（第三章 · 职业管世界认不认你这个人）：
   修士期由 GM 依功法/宗门取名（fx.job 落盘，如「青岩门采药弟子」「枯泉寺沙弥」）；
   AI 未取名时引擎回退：拜入宗门 → 「宗名+内/外门弟子」；无门无派 → 依功法称散修。
   凡人期（凡阶）不看功法宗门——主职业就是手头活计（工作/本职行当）。 */
function mainJobTitle() {
  if (S.realm <= 0) return S.job || primaryProfName() || (S.iden ? S.iden.name : "市井流民");
  if (S.mainJob) return S.mainJob;
  const sect = S.sect || ((regionOf(S.place) || {}).sect || {}).name;
  if (S.flags.qingyan && sect) return sect + (S.realm >= 7 ? "内门弟子" : "外门弟子");
  const yi = (S.inv.yinqi || 0) > 0, quan = (S.inv.quanpu || 0) > 0;
  if (yi && quan) return "散修 · 引气锻骨兼修";
  if (yi) return "练气散修";
  if (quan) return "武修散人";
  return "无门散修";
}
function mainJobSource() {
  if (S.realm <= 0) return "凡人期：主职业随营生而定——做什么活计，就是什么人。";
  if (S.mainJob) return `此名分由天道推演所录（AI 依你的功法/宗门所取）：「${S.mainJob}」。名分随身，旁人眼里你就是个${S.mainJob}。`;
  const sect = S.sect || ((regionOf(S.place) || {}).sect || {}).name;
  if (S.flags.qingyan && sect) return `未得专人赐名，世人依山门称呼你——${sect}${S.realm >= 7 ? "内门" : "外门"}弟子。剧情中拜得师承、立下名号时，天道推演会为你取一个更贴切的名分（fx.job）。`;
  return "无门无派，世人以功法称你。剧情中若投得宗门或立下名号，天道推演会为你取名（fx.job）。";
}
function primaryProfName() {
  for (const pid in (S.professions || {})) if (S.professions[pid].primary) { const P = profDef(pid); return P ? P.name : null; }
  return null;
}
/* 面板职业行：主职业（工作/名分）＋ 主副职业特性一览，点击看详情 */
function profRowsHTML() {
  const q = S.professions || {};
  const ids = Object.keys(q);
  const mortal = S.realm <= 0;
  let html = "";
  if (mortal) { // 凡人期：主职业 = 手头活计；行当本职与之一体
    const pn = primaryProfName();
    const mainLabel = S.job || pn || (S.iden ? S.iden.name : "市井流民");
    html += `<div class="p-row prof-row" data-prof="__main"><span>主职业</span><b>${esc(mainLabel)}</b></div>`;
    let sub = 0;
    for (const pid of ids) {
      const P = profDef(pid), qq = q[pid];
      if (!P) continue;
      if (P.name === mainLabel) continue; // 本职已与主职业行合一
      html += profRowHTML(pid, "副职业"); sub++;
    }
    if (!sub) html += `<div class="p-row"><span>副职业</span><b>未入门——市井处处是生计</b></div>`;
  } else { // 修士期：主职业 = 功法/宗门名分（AI 取名或引擎回退），凡品行当皆为副职业
    html += `<div class="p-row prof-row" data-prof="__main"><span>主职业</span><b>${esc(mainJobTitle())}</b></div>`;
    for (const pid of ids) html += profRowHTML(pid, "副职业");
    if (!ids.length) html += `<div class="p-row"><span>副职业</span><b>未入门——市井处处是生计</b></div>`;
  }
  return html;
}
function profRowHTML(pid, label) {
  const P = profDef(pid), q = S.professions[pid];
  if (!P) return "";
  const cap = profTierCap(P.tier), need = PROF_NEED[q.lv + 1];
  const prog = q.lv >= cap ? "已封顶" : `经验 ${Math.floor(q.exp)}/${need}`;
  return `<div class="p-row prof-row" data-prof="${pid}"><span>${label}</span><b>${P.tierName} · ${P.name} ${q.lv} 级（${prog}）</b></div>`;
}

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
/* 设定铁律：行囊中没有的物品，不得出现使用它的选项（选项文案引用即校验） */
const ITEM_NEED_RES = [
  { re: /黑馍/, id: "heimu" }, { re: /柴薪|捆柴/, id: "wood" },
  { re: /聚气丹/, id: "juqiDan" }, { re: /洗髓丹/, id: "xisuiDan" },
  { re: /排毒丹/, id: "paiduDan" }, { re: /回灵丹/, id: "huiLingDan" },
  { re: /凝神香片/, id: "gongfuTea" }, { re: /烧刀子/, id: "shaojiu" },
  { re: /筑基丹/, id: "zhuJidan" }, { re: /跌打药/, id: "medicine" },
  { re: /火把/, id: "huobun" },
];
function setChoices(list) {
  if (S) S._choiceSet = true;
  const raw = list || [];
  const filtered = raw.filter(c => { // 使用类选项：无货不出（买/砍/拾/寻/换/借类除外）
    const t = (c.label || "") + (c.hint || "");
    if (/买|购|砍|拾|拣|寻|找|换|借|讨/.test(t)) return true;
    return !ITEM_NEED_RES.some(n => n.re.test(t) && !(S && S.inv[n.id] > 0));
  });
  list = filtered.length || !raw.length ? filtered : raw; // 兜底：过滤后不能为空，防软锁
  /* 夜间固定选项：无论 AI 给什么，夜里总有「是否修炼」这一问（设定：凡俗睡眠是破绽，灵阶起打坐代眠） */
  if (S && !S.over && S.slot === 3 && !window.__inCombat && !S._suppressNightTrain
      && !list.some(c => /破境|斩！|^渡|^笑（|^退避/.test(c.label || ""))
      && !list.some(c => /打坐|修炼/.test((c.label || "") + (c.hint || "")))) { // 已有修炼类选项则不重复注入；「是否修炼」固定与就寝并列
    const mt0 = mainTechnique(); const sk0 = mt0 ? mt0.name : "乱拳";
    list = list.concat({ label: "夜里打坐修炼", hint: S.realm >= 7 ? `${sk0} 熟练+修为，打坐代眠` : `${sk0} 熟练+修为，代价：睡不安稳`, fn: () => runSpecial("nighttrain") });
  }
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
/* 从 S.place 提取所在城池/城镇名（"东荒 · 云州 · 青石城 · 市井"→青石城；"北地 · 渊口戍堡"→渊口戍堡）——再世身份地异，文案不得一律作青石城 */
function placeTown() {
  const segs = (S && S.place || "").split("·").map(x => x.trim()).filter(Boolean);
  if (!segs.length) return "青石城";
  return segs.length >= 3 ? segs[segs.length - 2] : segs[segs.length - 1];
}

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
  const tierNote = S.realm >= REALM_TOP ? "（境界之巅）" : S.realm === 6 ? "（凡阶圆满）" : S.realm > 6 ? `（${TABLES.REALMS.tierNames[S.realm]}）` : S.realm >= 1 ? `（修为 ${Math.round(S.cult)}/${REALM_NEED[S.realm + 1]}）` : "（未入流）";
  $("#whoRealm").textContent = `${S.sect ? S.sect + " · " : ""}${REALM_NAMES[S.realm]}${layerTxt}${tierNote} · 第${S.world}世 · ${idenNote}`;
  const need = REALM_NEED[S.realm + 1];
  $("#bars").innerHTML =
    bar("hp", S.hp, hpMax(), "气血") +
    bar("sta", S.sta, staMax(), "体力") +
    (S.realm >= 5 ? bar("mp", S.mp, mpMax(), "法力") : `<div class="bar-label"><span>法力</span><b>未开气海</b></div><div class="bar mp"><i style="transform:scaleX(0)"></i></div>`) +
    bar("hun", 100 - S.hunger, 100, "饱食") +
    bar("cult", S.realm >= REALM_TOP ? 1 : S.cult, S.realm >= REALM_TOP ? 1 : (need || 1), "修为");
  /* 五维属性、战力/道心/康健等状态行已整合进「人物」页签（renderTab · curTab 0） */
  const lv = sysLv();
  $("#pity").innerHTML =
    `<span>十抽保底 ${Math.floor(S.pity10)}/10（${lv >= 4 ? "紫" : "青"}↑）</span><span>五十抽保底 ${Math.floor(S.pity100)}/50（${lv >= 6 ? "金" : "紫"}↑）</span>${lv >= 8 ? `<span>百抽 ${Math.floor(S.pity1000 || 0)}/${lv >= 10 ? 50 : 100}（红）</span>` : ""}<span>累计 ${S.pulls} 抽 · 轮盘 Lv${lv}</span>`;
  $("#cal-date").innerHTML = `仙陨历 30000年 · 冬 · 第 <b>${S.day}</b> 日 · <b>${["晨", "午", "昏", "夜"][S.slot]}</b>`;
  $("#cal-place").textContent = S.place || "";
  $("#cal-weather").textContent = S.weather + (S.flags.coldSnap ? " · 寒潮" : "") + (AI.getCfg() && AI.getCfg().key ? " · AI 天道" : " · 推演天道");
  registerWound(); // 伤势升档登记受伤部位（人物页可见），痊愈自动销记
  renderTab();
}
let curTab = 0;
/* ---------- 详情弹窗 ---------- */
const ITEM_INFO = {
  heimu: { name: "黑馍", tier: "凡物", desc: "又冷又硬的黑面馍馍，乞丐的主食。磨牙，但顶饿。食用恢复饱食 22 点——点开即可直接吃，不必等剧情选项。" },
  wood: { name: "柴薪", tier: "凡物", desc: "城外矮林砍来的干柴。雪天柴贵，市集六文一捆；夜里生火可御风寒（柴薪 ×2）。" },
  mianao: { name: "老棉袄", tier: "凡物", desc: "厚实的老棉袄，浆洗得发硬。穿上它，风雪与寒潮夜不再冻伤气血。" },
  shuinang: { name: "水囊", tier: "凡物", desc: "牛皮水囊，西市杂货 40 文。带着它，西漠酷热、热风、沙暴之夜不再暑热伤气，也不会中暑。" },
  quhanTang: { name: "驱寒汤", tier: "凡药", desc: "姜桂熬的浓汤，一碗下肚寒气尽出。点开趁热喝下——对症【风寒】可立即痊愈；无病则暖胃（气血 +2）。" },
  huoxiangSan: { name: "藿香正气散", tier: "凡药", desc: "解暑化湿的散剂。点开温水送服——对症【中暑】可立即痊愈；无病则醒神（气血 +2）。" },
  jieduSan: { name: "解毒散", tier: "凡药", desc: "以毒攻毒的解毒散。点开服之——对症【丹毒侵脉】立即痊愈，兼化药蚀 -10；无病则清热解毒（气血 +3，药蚀 -5）。" },
  jinchuangYao: { name: "金疮药", tier: "凡药", desc: "外伤圣药，比跌打药更猛。点开敷用（气血 +10，重伤之人尤宜）。" },
  shengjiang: { name: "生姜", tier: "药草", desc: "辛温解表的药草，生食辛辣。点开嚼服——【风寒】病程 -1 日；无病则暖胃（气血 +1）。" },
  quzhangcao: { name: "驱瘴草", tier: "药草", desc: "南岭十万大山特有的苦涩药草，焚烧或含服皆可辟瘴。点开服之——对症【瘴毒侵体】立即痊愈；无病则清神（气血 +1）。带着它，瘴雨、山雾之夜瘴毒不侵。" },
  gancao: { name: "甘草", tier: "药草", desc: "调和百药的甜草根。点开嚼服（气血 +2，药蚀 -2）。" },
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
  huiLingDan: { name: "回灵丹", tier: "灵品丹药", desc: "灵品丹药，回气养元。点开服之（气血 +25，药蚀 10——灵品 8~12 之数）。" },
  xisuiDan: { name: "洗髓丹", tier: "玄品丹药", desc: "洗经伐髓，清除一道暗伤——玄品丹药中的硬通货，散修梦寐以求。点开服之（药蚀 20，玄品 15~25 之数）。" },
  dixinru: { name: "万年地心乳", tier: "圣品天材地宝", desc: "地脉万载凝一滴，乳白如玉，触手生温。设定集天材地宝名录圣品：重塑道基、修复暗伤药毒。点开服之——【道伤】减一（献祭亏空尽数回补），兼愈一道暗伤、药蚀 -20。此物有价无市，怀璧其罪。" },
  ludian: { name: "青铜丹炉", tier: "凡器", desc: "三足两耳的青铜小炉，火膛温驯。开炉时带在身边：品质「一分在器」的那一分，就押在它身上。" },
  lianchui: { name: "精铁炼锤", tier: "凡器", desc: "前人留下的一柄精铁炼锤，柄上满是岁月与汗渍的痕迹。抡它炼器：「一分在器」的那一分，就押在它身上。" },
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
/* ---------- 人物页：属性数值总汇（原侧栏五维/状态行整合于此） ----------
   新增：攻击力（=战力，普攻伤害同此数）、受伤部位、疾病状态、装备道具、药蚀程度。 */
function renderPersonTab(body) {
  const idenNote = S.iden ? `${S.iden.name} · ${S.iden.grade}档` : "青石城 · 乞丐";
  const layerTxt = miniLayer() >= 0 ? "·" + LAYER_NAMES[miniLayer()] : "";
  const A = [["str", "力量"], ["agi", "敏捷"], ["int", "智力"], ["con", "体质"], ["luck", "气运"]];
  body.innerHTML =
    `<div class="person-head"><b>${esc(S.name)}</b><span class="pg">${S.gender === "女" ? "女" : "男"}</span><span style="font-size:12px;color:var(--paper-60)">${esc(idenNote)}</span></div>
     <div class="person-sub">${esc(REALM_NAMES[S.realm])}${layerTxt} · 第 ${S.world} 世${S.place ? " · " + esc(S.place) : ""}</div>
     <div class="attrgrid">` + A.map(([k, n]) =>
      `<div class="attr${k === "luck" ? " luck" : ""}"><em>${n}</em><b>${attr(k)}</b></div>`).join("") + `</div>
     <div class="person-sec">身 手</div>
     <div class="p-row pv-row" data-pv="1"><span>攻击力</span><b>${attackPower()}</b></div>
     <div class="p-row dx-row" data-dx="1"><span>道心</span><b>${daoText()}${(S.xinmo || 0) >= 25 ? " ·【" + xinmoStage().name + "】" : ""}</b></div>
     <div class="p-row ht-row" data-ht="1"><span>康健</span><b>${injuryTier().name}${injuryTier().pen ? "（战力 -" + injuryTier().pen + "%）" : ""}${S.debuff === "weak" ? " ·【元气大伤】" : ""}${S.jinshuWeak > 0 ? ` ·【禁术虚耗 ${S.jinshuWeak} 日】` : ""}${S.daoShang ? ` ·【道伤 ×${S.daoShang}】` : ""}</b></div>
     <div class="p-row" data-wd="1"><span>受伤部位</span><b>${woundText()}</b></div>
     <div class="p-row" data-il="1"><span>疾病</span><b>${illText()}</b></div>
     <div class="p-row" data-gr="1"><span>装备</span><b>${gearText()}</b></div>
     <div class="p-row" data-ys="1"><span>药蚀</span><b>${Math.round(S.yaoshi || 0)}/100 · ${yaoshiState().name}</b></div>
     <div class="person-sec">身 家</div>
     <div class="p-row"><span>铜钱</span><b>${S.money} 文</b></div>
     <div class="p-row"><span>下品灵石</span><b>${S.stones} 枚</b></div>
     <div class="p-row"><span>万象点</span><b class="gold">${S.points}</b></div>
     <div class="p-row lg-row" data-lg="1"><span>灵根</span><b>${linggen().name}</b></div>
     <div class="p-row tt-row" data-tt="1"><span>称号</span><b>${S.wornTitle && TITLES[S.wornTitle] ? "「" + TITLES[S.wornTitle].name + "」" : (META.titles && META.titles.length ? "未佩戴 · " + META.titles.length + " 枚" : "无")}</b></div>
     ${(META.comments && META.comments.length) ? `<div class="p-row tt-row" data-cm="1"><span>前世评语</span><b>${META.comments[META.comments.length - 1].grade} · ${META.comments.length} 世留评</b></div>` : ""}
     ${profRowsHTML()}
     <div class="p-row"><span>状态</span><b>${S.debuff === "weak" ? "【元气大伤】" : S.hunger > 85 ? "【极度饥饿】" : S.hunger > 70 ? "【饥饿】" : "尚可"}</b></div>`;
  const lgRow = body.querySelector("[data-lg]"); // 灵根详情：五行亲和与实务规则
  if (lgRow) lgRow.onclick = () => {
    const wx = wxOf();
    const sum = wxSum();
    showInfo(`灵根 · ${linggen().name}`, `<span style="color:var(--gold-dim)">${linggen().variant ? "变异灵根" : "先天五行资质"}</span>`,
      esc(linggen().desc || "") + (linggen().bonus ? " " + esc(linggen().bonus) + "。" : ""),
      `五行亲和（总和 ${sum}${sum > 100 ? "，后天已破百" : " / 100"}）：` + WX_ELS.map(e => `${WX_NAMES[e]} ${wx[e]}`).join(" · ") +
      `<br>该行功法修炼速度 = 1 + 亲和×0.005；抗性 = 亲和×0.003（封顶 30%）；亲和不足 10 强行修炼该行减半<br>生克：金克木、木克土、土克水、水克火、火克金——克制方 +20%，被克方 -20%`);
  };
  const pvRow = body.querySelector("[data-pv]"); // 攻击力 = 战力：拆解与规则
  if (pvRow) pvRow.onclick = () => showInfo("攻击力", `<span style="color:var(--gold-dim)">等同战力 · 普攻之数</span>`,
    `当前 ${attackPower()} ｜ 对外威慑显示 ${displayPower()}<br>不运功法时，每记普通攻击皆造成等同攻击力之伤害（含五行生克、暴击/弱点的当场合乎判定之浮动）；运转功法、术法则另有伤害公式。`,
    powerBreakdown().join("<br>"));
  const ttRow = body.querySelector("[data-tt]"); // 称号：佩戴示人，效果永续
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
  const cmRow = body.querySelector("[data-cm]"); // 前世评语：钉在面板上的历世判词（轮回法则 15.2）
  if (cmRow) cmRow.onclick = () => showInfo("历世评语", `<span style="color:var(--gold-dim)">系统阅卷 · 随魂封存</span>`,
    META.comments.slice().reverse().map(c => `第${c.world}世 ·【${c.grade}】${c.text}`).join("<br><br>"),
    "评级解释权归系统所有。它偶尔毒舌，但从不克扣。");
  const htRow = body.querySelector("[data-ht]"); // 康健：伤病四级
  if (htRow) htRow.onclick = () => showInfo("康健 · 伤病四级", `<span style="color:var(--gold-dim)">世界会记住你受过的伤</span>`,
    `当前：${injuryTier().name}（气血 ${Math.round(S.hp)}/${hpMax()}）｜ 受伤部位：${woundText()}${(() => { const d = Object.keys(S.darkWounds || {}).filter(k => S.darkWounds[k] > 0); return d.length ? ` ｜ <span style="color:var(--blood-hi)">暗伤：${d.map(k => `${DARK_WOUND_NAMES[k]} -${S.darkWounds[k]}`).join("、")}</span>` : ""; })()}`,
    `轻伤 -10% ｜ 中伤 -30% ｜ 重伤 -50% ｜ 濒死 -80%。伤势按体质判定：同样的刀，体质高者皮开肉绽，体质低者当场透胸。<br>伤势升档时，身上会留下具体的伤（人物页可见）；痊愈即销记。治疗途径：凡俗医药、丹药、运功疗伤、灵物奇缘。带伤硬撑是有利息的——旧伤未愈再添新伤，落下【暗伤】便难逆转。解法：圣品疗伤丹、玄阶以上医道圣手、涅槃境重塑肉身、或「万年地心乳」。`);
  const wdRow = body.querySelector("[data-wd]"); // 受伤部位
  if (wdRow) wdRow.onclick = () => showInfo("受伤部位", `<span style="color:var(--gold-dim)">身体会记账</span>`,
    woundText(),
    `每一次伤势升档，都会在头面、肩臂、胸腹、腿脚间落下一处具体的伤，记在人物页上；伤愈自动销记。暗伤（永久损伤）另账：对应属性下降，此世难愈。`);
  const ilRow = body.querySelector("[data-il]"); // 疾病状态
  if (ilRow) ilRow.onclick = () => showInfo("疾病状态", `<span style="color:var(--gold-dim)">寒暑不等人</span>`,
    S.ill ? `${S.ill.name}（余 ${S.ill.days} 日）——${esc(S.ill.desc)}` : "无疾。气血充盈，百病不侵。",
    "病从何来：雪夜受寒可落【风寒】（夜间气血回复减半，三两日自愈）；丹毒爆发可落【丹毒侵脉】。丹药医道可提前拔除，硬扛着也能熬过去——只是难受。");
  const grRow = body.querySelector("[data-gr]"); // 装备道具
  if (grRow) grRow.onclick = () => showInfo("装备", `<span style="color:var(--gold-dim)">随身之物</span>`,
    gearText(),
    "随身兵器出自炼器（攻伐加成已实时结算）；老棉袄御寒；方寸戒认主后行囊各 +10。器物随身，不入行囊格。");
  const ysRow = body.querySelector("[data-ys]"); // 药蚀程度
  if (ysRow) ysRow.onclick = () => showInfo("药蚀", `<span style="color:var(--gold-dim)">是药三分毒</span>`,
    `当前 ${Math.round(S.yaoshi || 0)}/100 · ${yaoshiState().name}——${yaoshiState().desc}。`,
    `同种丹药递减（100% → 50% → 25% → 无效且药蚀翻倍）；异种累积计入药蚀度。每月自然代谢 -5（境界越高越快），排毒丹可解——以毒攻毒非长久之计。药蚀 60+ 蚀体损体，90+ 丹毒爆发：属性暴跌、境界松动，可能暴毙。`);
  const dxRow = body.querySelector("[data-dx]"); // 道心 × 心魔
  if (dxRow) dxRow.onclick = () => showInfo("道心 × 心魔", `<span style="color:var(--gold-dim)">心魔用你的声音说话</span>`,
    `道心 ${Math.round(S.daoXin)}/100 · ${daoText()} ｜ 心魔 ${Math.round(S.xinmo || 0)}/100 · ${xinmoStage().name}`,
    `${xinmoStage().desc}。<br>心魔的养料：执念、愧疚、恐惧（濒死与前世死亡记忆）、欲望、心境与修为不匹配（词条让你战力一夜暴涨，道心一步没走）、天地异动。道心的涨跌：红尘历练、问心无愧则涨；违心背信、临阵脱逃则跌。<br>四阶段：杂念（修炼 -5%）→ 执念成形（梦中低语）→ 心魔劫（破境时具现，斩/渡/笑三种过法）→ 化魔（神智沦丧）。<br>化解：打坐静心、道心 60+ 自净、渡劫直面。`);
  body.querySelectorAll(".prof-row").forEach(row => row.onclick = () => { // 职业详情（第三章 3.3~3.6）
    const pid = row.getAttribute("data-prof");
    if (pid === "__main") { // 主职业名分：凡人看活计，修士看功法/宗门
      showInfo(`主职业 · ${esc(mainJobTitle())}`, `<span style="color:var(--gold-dim)">职业管世界认不认你这个人（设定集 · 第三章）</span>`,
        esc(mainJobSource()),
        "主职业的名分由天道推演在剧情中为你所取（依功法、宗门、营生），会随身份变迁而更新；副职业是凡品行当（药庐、码头、账房……），各行当带一条特性，特性随级成长。");
      return;
    }
    const P = profDef(pid), q = S.professions[pid];
    if (!P || !q) return;
    const cap = profTierCap(P.tier), need = PROF_NEED[q.lv + 1];
    const bonus = Object.keys(P.attrs || {}).map(k => `${{ str: "力量", agi: "敏捷", int: "智力", con: "体质" }[k]} +${(P.attrs[k] * q.lv * (S.realm >= 7 ? 10 : 1)).toFixed(1)}`).join("、") || "—";
    showInfo(`${P.tierName} · ${P.name}（${q.lv} 级 ${PROF_LV_NAMES[q.lv]}）`, `<span style="color:var(--gold-dim)">${P.grey ? "灰色职业 · 不占副职名额，但占因果" : (S.realm <= 0 && q.primary) ? "主职业 · 本职行当" : "副职业"}</span>`,
      `${P.trait}<br>当前加成：${bonus}（品阶基数 × 等级 × 境界系数；天花板条款：不得突破当前境界单项天花板）<br>晋升进度：${q.lv >= cap ? "已至" + P.tierName + "之巅" : `经验 ${Math.floor(q.exp)} / ${need}（2/4/8/16/32 晋一级，须考核）`}`,
      `经验来源（3.3）：从业时长（每 3 日 +1）｜ 技艺印证（「${P.skill}」每满 10 熟练 +1）｜ 行业事件（完成任务 +2，主线 +3）｜ 口碑。<br>${Object.keys(S.professions).length > 1 ? "多职业并存：全部活跃职业经验 -30%（精力有限，天道公允）。" : ""}${q.lv >= cap && P.next ? "<br>【转轨】凡品封顶——须行当升品转轨（" + (profDef(P.next) ? "「" + profDef(P.next).name + "」" : "更高品阶") + "），修为境界与行业深度双到位。" : ""}`);
  });
}
/* ---------- 造化页：万象轮盘 · 炼丹 · 炼器 三卡合一（滑动可见，点卡看详情） ---------- */
let craftView = "cards"; // 内视图：cards 三卡轮播 ｜ dan 丹房 ｜ qi 器作
function renderZaohua(body) {
  if (craftView === "dan" || craftView === "qi") { renderCraftDetail(body, craftView); return; }
  const danGot = hasProfession("danshi"), qiGot = hasProfession("qishi");
  const danP = profDef("danshi"), qiP = profDef("qishi");
  body.innerHTML = `<div class="craft-cards">
    <div class="craft-card gold" data-cc="gacha"><span class="cc-ico">☯</span><b>万象轮盘</b><span>命格词条之源。凡至仙六档，保底随轮盘等级渐开；点数抽词条，词条改命格。</span><em>点击 转动轮盘 ›</em></div>
    <div class="craft-card${danGot ? "" : " locked"}" data-cc="dan"><span class="cc-ico">丹</span><b>炼 丹</b><span>${danGot ? `${esc(danP.name)} ${profList().danshi.lv} 级——丹房已开，七分在人。` : "丹炉尘封。机缘册未启，名号不显——前置登顶、瓶颈之期，自会寻你。"}</span><em>${danGot ? "点击 入丹房 ›" : "🔒 解锁后开启"}</em></div>
    <div class="craft-card${qiGot ? "" : " locked"}" data-cc="qi"><span class="cc-ico">器</span><b>炼 器</b><span>${qiGot ? `${esc(qiP.name)} ${profList().qishi.lv} 级——器作已开，百炼成兵。` : "器作尘封。机缘册未启，名号不显——前置登顶、瓶颈之期，自会寻你。"}</span><em>${qiGot ? "点击 入器作 ›" : "🔒 解锁后开启"}</em></div>
  </div>
  <div class="craft-dots"><i class="on"></i><i></i><i></i></div>
  <div class="pityline"><span>左右滑动，览盘、炉、锤三卡；点卡查看详情。</span></div>`;
  body.querySelectorAll("[data-cc]").forEach(el => el.onclick = () => {
    const k = el.dataset.cc;
    if (k === "gacha") { openGacha(); return; }
    craftView = k; renderTab(); // 未解锁时亦进详情页：上锁说明与解锁之道都在里头
  });
  const strip = body.querySelector(".craft-cards");
  if (strip) strip.addEventListener("scroll", () => { // 滑动圆点跟随
    const w = strip.querySelector(".craft-card");
    const step = w ? w.offsetWidth + 10 : strip.scrollWidth / 3;
    const idx = Math.max(0, Math.min(2, Math.round(strip.scrollLeft / step)));
    body.querySelectorAll(".craft-dots i").forEach((d, i) => d.classList.toggle("on", i === idx));
  });
}
/* ---------- 丹房 / 器作详情（原炼丹/炼器页签，上锁：解锁对应副职业后开启） ---------- */
function renderCraftDetail(body, kind) {
  const pid = kind === "dan" ? "danshi" : "qishi";
  const P = profDef(pid);
  const toolName = kind === "dan" ? "青铜丹炉" : "精铁炼锤";
  const word = kind === "dan" ? "炼丹" : "炼器";
  const back = `<span class="craft-back" data-craft-back>‹ 返回三卡</span>`;
  if (!hasProfession(pid)) {
    body.innerHTML = back + (P.dynamic
      ? `<div class="empty">🔒 ${word}炉尘封。<br>解锁${P.tierName}职业「${esc(P.name)}」，需云游师傅一脉——不系于固定门派：当前置职业熟练度登顶、瓶颈之期到来时，机缘册自会翻开他的名号（须手动承接进阶支线，熟练度满绝不自动进阶）。</div>`
      : `<div class="empty">🔒 ${word}炉尘封。<br>得${esc(P.master)}认可、拜师解锁${P.tierName}职业「${esc(P.name)}」后开启——机缘在缘分簿里，也在你的主线里。</div>`);
    body.querySelector("[data-craft-back]").onclick = () => { craftView = "cards"; renderTab(); };
    return;
  }
  S.mats = S.mats || {};
  const lv = profList()[pid].lv || 1;
  const rows = RECIPES[kind].map(rec => {
    const haveMain = S.mats[rec.main] || 0;
    const auxNeed = Object.keys(rec.aux).map(a => { const nm = auxName(a); return `${nm} ${Math.min(S.mats[nm] || 0, rec.aux[a])}/${rec.aux[a]}`; }).join(" · ");
    const ready = craftCan(rec);
    const chance = Math.round(craftChance(kind, rec));
    return `<div class="shop-row" data-craft="${rec.id}">
      <div class="shop-head"><b>${esc(rec.name)}</b><span class="shop-kind">${esc(rec.pin)}</span><span class="shop-price">成功率 ${chance}%</span></div>
      <div class="shop-desc">${esc(rec.desc)}</div>
      <div class="shop-desc">主材：${esc(rec.main)} ${haveMain}/1（任务 · 交易 · 取材三途，坊市无售）｜ 辅材：${auxNeed}</div>
      <button class="gbtn small" ${ready ? "" : "disabled"}>${word}</button></div>`;
  }).join("");
  body.innerHTML = back + `<div class="p-title"><b>${kind === "dan" ? "丹 房" : "器 作"}</b><span>${esc(P.name)} ${lv} 级 ｜ ${craftToolHeld(kind) ? `「${toolName}」在手——一分在器 ✓` : `无「${toolName}」——一分在器落空`} ｜ 品质：七分在人 · 两分在料 · 一分在器 · 一丝气运</span></div>` + rows
    + `<div class="pityline" style="margin-top:8px"><span>成功率与品质皆依设定：七分在人（境界+熟练度）、两分在料、一分在器、一丝气运；六品质瑕疵/下品/中品/上品/极品/绝品，效力五~六成至二十成。失手则材料尽损，经验照得。</span></div>`;
  body.querySelector("[data-craft-back]").onclick = () => { craftView = "cards"; renderTab(); };
  body.querySelectorAll("[data-craft]").forEach(el => el.querySelector("button").onclick = () => {
    const rec = RECIPES[kind].find(r => r.id === el.dataset.craft);
    if (rec) doCraft(kind, rec);
  });
}
function renderTab() {
  const body = $("#panelTabBody");
  document.querySelectorAll(".tabrow button").forEach((b, i) => b.classList.toggle("on", i === curTab));
  if (curTab === 0) {
    /* ---------- 人物（属性数值总汇：五维/攻击力/道心/康健/受伤部位/疾病/装备/药蚀/身家） ---------- */
    renderPersonTab(body);
  } else if (curTab === 1) {
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
  } else if (curTab === 2) {
    const inv = [];
    if (S.inv.heimu) inv.push(["heimu", `黑馍 ×${S.inv.heimu}`]);
    if (S.inv.wood) inv.push(["wood", `柴薪 ×${S.inv.wood}`]);
    if (S.inv.mianao) inv.push(["mianao", "老棉袄"]);
    if (S.inv.shuinang) inv.push(["shuinang", "水囊"]);
    if (S.inv.quhanTang) inv.push(["quhanTang", `驱寒汤 ×${S.inv.quhanTang}`]);
    if (S.inv.huoxiangSan) inv.push(["huoxiangSan", `藿香正气散 ×${S.inv.huoxiangSan}`]);
    if (S.inv.jieduSan) inv.push(["jieduSan", `解毒散 ×${S.inv.jieduSan}`]);
    if (S.inv.jinchuangYao) inv.push(["jinchuangYao", `金疮药 ×${S.inv.jinchuangYao}`]);
    if (S.inv.shengjiang) inv.push(["shengjiang", `生姜 ×${S.inv.shengjiang}`]);
    if (S.inv.quzhangcao) inv.push(["quzhangcao", `驱瘴草 ×${S.inv.quzhangcao}`]);
    if (S.inv.gancao) inv.push(["gancao", `甘草 ×${S.inv.gancao}`]);
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
    if (S.inv.huiLingDan) inv.push(["huiLingDan", `回灵丹 ×${S.inv.huiLingDan}`]);
    if (S.inv.xisuiDan) inv.push(["xisuiDan", `洗髓丹 ×${S.inv.xisuiDan}`]);
    if (S.inv.dixinru) inv.push(["dixinru", `万年地心乳 ×${S.inv.dixinru}`]);
    if (S.inv.ludian) inv.push(["ludian", "青铜丹炉"]);
    if (S.inv.lianchui) inv.push(["lianchui", "精铁炼锤"]);
    if (S.gear && S.gear.weapon) inv.push(["gear", `⚔ ${S.gear.weapon.name}（攻伐 +${S.gear.weapon.dmgP}%）`]);
    if (S.inv.fangcun && !S.flags.fangcunUsed) inv.push(["fangcun", "方寸戒"]);
    if (S.mats) for (const m in S.mats) if (S.mats[m] > 0) inv.push(["mat:" + m, `${m} ×${S.mats[m]}`]);
    body.innerHTML = inv.length
      ? `<div class="chips">${inv.map(([id, label]) => `<span class="chip" data-item="${id}" style="color:var(--paper-70);border-color:var(--line)">${label}</span>`).join("")}</div>`
      : `<div class="empty">两袖清风。破庙神像的裂缝里也许有东西。</div>`; // 技艺已迁入技能栏（curTab 9），行囊只装物
    body.querySelectorAll("[data-item]").forEach(el => el.onclick = () => {
      const id = el.dataset.item;
      if (id.startsWith("mat:")) { // 材料账（猎杀取材）：只读展示，折算走剧情
        showInfo(el.textContent, "材料", "妖兽内丹、灵药之流——硬通货。收购、炼丹、炼器的剧情里，它自会折算成该得的东西。", "材料不入轮回：这一世的账，这一世清。", []);
        return;
      }
      const it = ITEM_INFO[id];
      if (id === "gear") { // 随身兵器（炼器产出）：只读展示
        const w = S.gear.weapon;
        showInfo(w.name, `<span style="color:var(--gold-dim)">${esc(w.pin)} · ${esc(w.q)}品质</span>`, `随身佩用的兵器。攻伐 +${w.dmgP}%（品质效力：瑕疵五~六成、中品十成、绝品二十成）。炼出更好的兵刃会自动替换。`, "器物随身，不入行囊格。", []);
        return;
      }
      const acts = [];
      const busyGuard = () => {
        if (gmBusy) { toast("天道推演中，稍候片刻。"); return true; }
        if (window.__inCombat) { toast("生死相搏，无暇他顾。"); return true; }
        return false;
      };
      const closeAnd = fn => () => { if (busyGuard()) return; $("#infoModal").classList.remove("open"); fn(); computeMods(); renderPanel(); }; // 开局修改：行囊之物随手可用——不再惊动天道推演（不推进时辰，不触发 AI 剧情）
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
        if (hasSpecial("jiujian")) { S.flags.drunkSlots = 2; log("烈酒穿喉，一股火线落进胃里。雪夜似乎没那么冷了——【酒剑仙】酒意上头：两时辰内战意如火（战力 +15%），明日宿醉。", "good"); }
        else log("烈酒穿喉，一股火线落进胃里。雪夜似乎没那么冷了。", "good");
      })});
      if (id === "medicine" && (S.inv.medicine || 0) > 0) acts.push({ label: "敷药（气血 +6）", fn: closeAnd(() => {
        S.inv.medicine--;
        takeDrug("medicine", 0, 6);
        log("药粉洒在伤处，一阵清凉。气血回了些。", "good");
      })});
      /* 对症药品：风寒/中暑/丹毒侵脉可立即痊愈（伤病系统的「货」） */
      if (id === "quhanTang" && (S.inv.quhanTang || 0) > 0) acts.push({ label: "趁热喝下（对症风寒）", fn: closeAnd(() => {
        S.inv.quhanTang--;
        if (S.ill && S.ill.name === "风寒") { sys(`【驱寒汤】一碗滚汤下肚，寒气自百窍而出——【风寒】痊愈。`); S.ill = null; }
        else { S.hp = Math.min(hpMax(), S.hp + 2); log("姜桂浓汤暖了胃。气血 +2。", "good"); }
      })});
      if (id === "huoxiangSan" && (S.inv.huoxiangSan || 0) > 0) acts.push({ label: "温水送服（对症中暑）", fn: closeAnd(() => {
        S.inv.huoxiangSan--;
        if (S.ill && S.ill.name === "中暑") { sys(`【藿香正气散】散剂化开，烦渴顿解——【中暑】痊愈。`); S.ill = null; }
        else { S.hp = Math.min(hpMax(), S.hp + 2); log("药散醒神。气血 +2。", "good"); }
      })});
      if (id === "jieduSan" && (S.inv.jieduSan || 0) > 0) acts.push({ label: "服散（对症丹毒侵脉）", fn: closeAnd(() => {
        S.inv.jieduSan--;
        if (S.ill && S.ill.name === "丹毒侵脉") { sys(`【解毒散】以毒攻毒，丹毒尽化——【丹毒侵脉】痊愈，药蚀 -10。`); S.ill = null; S.yaoshi = Math.max(0, (S.yaoshi || 0) - 10); }
        else { S.hp = Math.min(hpMax(), S.hp + 3); S.yaoshi = Math.max(0, (S.yaoshi || 0) - 5); log("清热解毒。气血 +3，药蚀 -5。", "good"); }
      })});
      if (id === "jinchuangYao" && (S.inv.jinchuangYao || 0) > 0) acts.push({ label: "敷药（气血 +10）", fn: closeAnd(() => {
        S.inv.jinchuangYao--;
        takeDrug("jinchuangYao", 0, 10);
        log("金疮药敷在伤处，剧痛先是一炸，随即化作清凉。气血 +10。", "good");
      })});
      if (id === "shengjiang" && (S.inv.shengjiang || 0) > 0) acts.push({ label: "嚼服（风寒病程 -1 日）", fn: closeAnd(() => {
        S.inv.shengjiang--;
        if (S.ill && S.ill.name === "风寒") { S.ill.days = Math.max(0, S.ill.days - 1); sys(`【生姜】辛温解表——【风寒】病程 -1 日${S.ill.days <= 0 ? "，就此痊愈" : `（余 ${S.ill.days} 日）`}。`); if (S.ill.days <= 0) S.ill = null; }
        else { S.hp = Math.min(hpMax(), S.hp + 1); log("姜辣冲鼻，胃里一暖。气血 +1。", "good"); }
      })});
      if (id === "quzhangcao" && (S.inv.quzhangcao || 0) > 0) acts.push({ label: "服之（对症瘴毒侵体）", fn: closeAnd(() => {
        S.inv.quzhangcao--;
        if (S.ill && S.ill.name === "瘴毒侵体") { sys(`【驱瘴草】苦涩的草汁入喉，胸肺间的湿浊丝丝化去——【瘴毒侵体】痊愈。`); S.ill = null; }
        else { S.hp = Math.min(hpMax(), S.hp + 1); log("草汁清苦，神智一爽。气血 +1。", "good"); }
      })});
      if (id === "gancao" && (S.inv.gancao || 0) > 0) acts.push({ label: "嚼服（气血 +2，药蚀 -2）", fn: closeAnd(() => {
        S.inv.gancao--;
        S.hp = Math.min(hpMax(), S.hp + 2); S.yaoshi = Math.max(0, (S.yaoshi || 0) - 2);
        log("甘草回甜。气血 +2，药蚀 -2。", "good");
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
      if (id === "huiLingDan" && (S.inv.huiLingDan || 0) > 0) acts.push({ label: "服丹（气血 +25）", fn: closeAnd(() => {
        S.inv.huiLingDan--;
        takeDrug("huiLingDan", 0, 25);
        log("【回灵丹】灵品丹药化开，一股温润的药力淌过四肢百骸，气血回升。", "good");
      })});
      if (id === "xisuiDan" && (S.inv.xisuiDan || 0) > 0) acts.push({ label: "服丹（清除一道暗伤）", fn: closeAnd(() => {
        S.inv.xisuiDan--;
        takeDrug("xisuiDan", 0, 0);
        const ks = Object.keys(S.darkWounds || {}).filter(k => S.darkWounds[k] > 0);
        if (ks.length) {
          const k = ks[0];
          S.base[k] = Math.round((S.base[k] + S.darkWounds[k]) * 100) / 100;
          log(`【洗髓丹】药力如清泉冲刷周身，${DARK_WOUND_NAMES[k]}里沉积的旧伤一点点化开——暗伤尽去，此伤已愈。`, "good");
          delete S.darkWounds[k];
          computeMods();
        } else log("【洗髓丹】药力冲刷周身百脉，并无暗伤可洗——浊气随汗而出，倒也通体轻快。", "dim");
      })});
      if (id === "dixinru" && (S.inv.dixinru || 0) > 0) acts.push({ label: "服之（重塑道基）", fn: closeAnd(() => {
        S.inv.dixinru--;
        S.hp = Math.min(hpMax(), S.hp + 30); // 圣品天材地宝：不走丹药药蚀，温润回血即可
        S.yaoshi = Math.min(100, Math.max(0, (S.yaoshi || 0) - 20)); // 设定集名录：修复暗伤药毒
        const out = [];
        if ((S.daoShang || 0) > 0) { // 道伤回补：献祭禁术亏空，圣药可补（设定·禁术节）
          S.daoShang--;
          S.base.str = Math.round((S.base.str + 1) * 100) / 100; S.base.con = Math.round((S.base.con + 1) * 100) / 100; // 燃道献祭的力量/体质各回补 1
          out.push(`道基重塑——【道伤】减一（余 ${S.daoShang}），献祭亏空的力量与体质各回补 1`);
        }
        const ks = Object.keys(S.darkWounds || {}).filter(k => S.darkWounds[k] > 0);
        if (ks.length) {
          const k = ks[0];
          S.base[k] = Math.round((S.base[k] + S.darkWounds[k]) * 100) / 100;
          delete S.darkWounds[k];
          out.push(`${DARK_WOUND_NAMES[k]}里的暗伤一并化去`);
        }
        computeMods();
        log(`【万年地心乳】一滴入喉，温润如玉的凉意沉入丹田，漫向四肢百骸——${out.length ? out.join("，") : "周身百脉如洗，并无道伤暗伤可补"}。`, "good");
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
  } else if (curTab === 4) {
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
        <div class="p-title"><b>${d.type === "main" ? "主 线" : d.type === "xian" ? "仙 品" : "支 线"}</b><span>${esc(d.name)}</span></div>
        ${objs}<div class="q-desc">${esc(d.desc)}</div></div>`;
    };
    let html = q.active.length ? q.active.map(renderOne).join("") : `<div class="empty">卷宗空白。去活着，事会来找你。</div>`;
    if (q.done.length) html += `<div class="p-title" style="margin-top:16px"><b>已 了</b><span>${q.done.length} 项</span></div>
      <div class="q-done">${q.done.map(id => QU.DEFS[id] ? esc(QU.DEFS[id].name) : id).join(" · ")}</div>`;
    if (q.failed.length) html += `<div class="q-done" style="color:var(--blood-hi)">未成：${q.failed.map(id => QU.DEFS[id] ? esc(QU.DEFS[id].name) : id).join(" · ")}</div>`;
    body.innerHTML = html;
    body.querySelectorAll("[data-qid]").forEach(el => el.onclick = () => {
      const d = QU.DEFS[el.dataset.qid];
      showInfo(`「${d.name}」`, `<span style="color:var(--gold-dim)">${d.type === "main" ? "主线任务" : d.type === "xian" ? "仙品任务" : "支线任务"}</span>`,
        esc(d.desc), "目标随你的行动自动推进，完成即发放奖励。");
    });
  } else if (curTab === 3) {
    /* ---------- 商铺 · 地域集市（物价随产地） ---------- */
    const rg = (typeof regionOf === "function") ? regionOf(S.place) : null;
    let html = `<div class="p-title"><b>${rg && rg.key !== "yunzhou" ? esc(rg.name) + " 集 市" : "云 州 杂 货"}</b><span>铜钱 ${S.money} 文 · 灵石 ${S.stones} 枚</span></div>`;
    const unlocked = SHOP_UNLOCK.filter(it => { try { return it.cond(); } catch (e) { return false; } });
    const lockedN = SHOP_UNLOCK.length - unlocked.length;
    const foodMult = rg ? rg.foodMult : 1;
    const doomP = 1 + doomLevel() * 0.08; // 劫数通胀：灵物逐档涨价（+8%/档），进食断后回落
    const priceOf = it => { let p = it.kind === "食物" ? Math.round(it.price * foodMult) : it.price; p = Math.round(p * doomP); return hasTitle("caishen") ? Math.ceil(p * 0.9) : p; }; // 地域物价：食物按当地倍率（北原×1.5、中州×1.3、西漠×1.8、南岭×1.2）
    if (foodMult > 1) html += `<div class="pityline"><span>🗺 ${esc(rg.foodNote)}——本地食物价比云州贵 ${Math.round((foodMult - 1) * 100)}%。</span></div>`;
    const row = (it, isNew) => {
      const price = priceOf(it);
      const pay = it.stones ? `${it.stones} 枚灵石${price ? " + " + price + " 文" : ""}` : `${price} 文`;
      const afford = it.stones ? S.stones >= it.stones && S.money >= price : S.money >= price;
      return `<div class="shop-row${isNew ? " new" : ""}" data-buy="${it.id}">
        <div class="shop-head"><b>${esc(it.name)}</b><span class="shop-kind">${esc(it.kind)}${isNew ? " · 新" : ""}</span><span class="shop-price">${pay}</span></div>
        <div class="shop-desc">${esc(it.desc)}</div>
        <button class="gbtn small" ${afford ? "" : "disabled"}>买下</button></div>`;
    };
    html += SHOP_BASE.map(it => row(it, false)).join("");
    html += `<div class="p-title" style="margin-top:14px"><b>辅 材</b><span>坊市通贩 · 入材料账</span></div>`
      + CRAFT_AUX.map(a => { const afford = S.money >= a.price; return `<div class="shop-row" data-aux="${a.id}">
          <div class="shop-head"><b>${esc(a.name)}</b><span class="shop-kind">辅材</span><span class="shop-price">${a.price} 文</span></div>
          <div class="shop-desc">${esc(a.desc)}</div>
          <button class="gbtn small" ${afford ? "" : "disabled"}>买下</button></div>`; }).join("")
      + `<div class="pityline" style="margin-top:8px"><span>辅材随处可买；主材（赤血芝、玄铁之流）坊市无售——只走任务、交易、取材三途。</span></div>`;
    if (unlocked.length) html += `<div class="p-title" style="margin-top:14px"><b>奇 珍</b><span>闻你之名，店家从匣底取出的</span></div>` + unlocked.map(it => row(it, true)).join("")
      + `<div class="pityline" style="margin-top:8px"><span>修士物价与凡俗隔着重山——灵石是硬通货，一枚便值十万文，凡货灵石两不相找。</span></div>`;
    if (lockedN) html += `<div class="pityline" style="margin-top:10px"><span>尚有 ${lockedN} 件压箱底的东西——你的修为、缘分与身家，还差些火候。</span></div>`;
    body.innerHTML = html;
    body.querySelectorAll("[data-buy]").forEach(el => el.querySelector("button").onclick = () => {
      const all = SHOP_BASE.concat(SHOP_UNLOCK);
      const it = all.find(x => x.id === el.dataset.buy);
      if (!it) return;
      const price = priceOf(it);
      if (it.stones) { if (S.stones < it.stones) { toast("灵石不足。"); return; } S.stones -= it.stones; }
      if (S.money < price) { toast("铜钱不够。"); return; }
      S.money -= price;
      const had = (S.inv[it.id] || 0) > 0;
      S.inv[it.id] = (S.inv[it.id] || 0) + 1;
      if (!had && (typeof GONGFU_BY_ID !== "undefined") && GONGFU_BY_ID[it.id]) techniqueUnlockFx(it.id); // 功法解锁反哺
      sys(`【购得】${it.name}（-${it.stones ? it.stones + " 灵石" : ""}${price ? price + " 文" : ""}）`);
      chronicle(`购得「${it.name}」`, "evt");
      S.stats.maxMoney = Math.max(S.stats.maxMoney || 0, S.money);
      computeMods(); renderPanel();
    });
    body.querySelectorAll("[data-aux]").forEach(el => el.querySelector("button").onclick = () => {
      const a = CRAFT_AUX.find(x => x.id === el.dataset.aux);
      if (!a || S.money < a.price) { toast("铜钱不够。"); return; }
      S.money -= a.price;
      S.mats = S.mats || {};
      S.mats[a.name] = (S.mats[a.name] || 0) + 1;
      sys(`【购得】${a.name} ×1（-${a.price} 文，入材料账）`);
      renderPanel();
    });
  } else if (curTab === 5) {
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
  } else if (curTab === 6) {
    /* ---------- 千秋录（设定十三章：引擎机械成就 + AI 生成成就） ---------- */
    const dyn = META.dynAch || [];
    const total = META.ach.length + dyn.length;
    let chips = META.ach.map(id => {
      const a = ACHIEVEMENTS[id]; if (!a) return "";
      return `<span class="chip" data-ach="${id}" style="color:${TIERS[a.tier].css};border-color:${TIERS[a.tier].css}55">${a.name}</span>`;
    }).join("");
    chips += dyn.map((d, i) => `<span class="chip" data-dynach="${i}" style="color:${TIERS[d.tier].css};border-color:${TIERS[d.tier].css}55">✦${esc(d.name)}</span>`).join("");
    body.innerHTML = total ? `<div class="chips">` + chips + `</div><div class="pityline" style="margin-top:10px"><span>千秋录 · 此生所刻 · 已刻 ${total} 项（机械 ${META.ach.length} · 世情 ${dyn.length}）｜ 每满 ${TABLES.ACH.pageSize} 项翻页赠「天命一抽」｜ 再世重开，重新刻起</span></div>`
      : `<div class="empty">千秋录尚无一笔。去做成一件值得被记住的事。</div>`;
    body.querySelectorAll("[data-ach]").forEach(el => el.onclick = () => {
      const a = ACHIEVEMENTS[el.dataset.ach];
      showInfo(`「${a.name}」`, `<span style="color:${TIERS[a.tier].css}">${a.secret ? "隐藏成就" : "成就"}</span>`, esc(a.desc) + "。", "奖励：" + esc(a.reward));
    });
    body.querySelectorAll("[data-dynach]").forEach(el => el.onclick = () => {
      const d = dyn[+el.dataset.dynach];
      showInfo(`「${esc(d.name)}」`, `<span style="color:${TIERS[d.tier].css}">${TABLES.ACH.tierNames[d.tier]}成就 · 历世所刻</span>`, esc(d.desc || "此事值得被记住。") + "。", `刻于第 ${d.world} 世 · 第 ${d.day} 日`);
    });
  } else if (curTab === 8) {
    /* ---------- 造化：万象轮盘 · 炼丹 · 炼器（三卡合一，滑动可见，点卡看详情） ---------- */
    renderZaohua(body);
  } else if (curTab === 9) {
    /* ---------- 技能栏（01:19 补丁）：功法与技艺尽聚于此，点击看详情 ---------- */
    const TECH_LIST = [
      { sk: "乱拳", tier: "凡俗武技", el: null, desc: "没师父的野路子拳。谈不上招式，胜在敢打——挨打出真章，磨出来的也是功夫。", src: "开局随身的保命把式；武技磨砺与实战中积攒熟练度。" },
    ].concat(GONGFU.map(g => ({ sk: g.name, id: g.id, tier: g.tierName, el: g.el, desc: g.desc, src: g.src })));
    const techGot = t => t.sk === "乱拳" ? ("乱拳" in S.skills) : (S.inv[t.id] || 0) > 0;
    const owned = TECH_LIST.filter(techGot); // 未入手的功法不占栏位：没有就是没有，不预告
    let html = `<div class="p-title"><b>功 法</b><span>修行根本 · 熟练度满反哺五维</span></div>`;
    html += `<div class="p-row" data-meditate="1" style="cursor:pointer;color:var(--gold-dim)"><span>🧘 打坐参悟</span><b>耗一时辰 · 涨主修熟练</b></div>`; // 战斗外修炼入口（设定：打坐参悟/向 NPC 讨教）
    html += owned.length ? owned.map(t => {
      const cur = Math.round(S.skills[t.sk] || 0), cap = TECH_CAPS[t.sk];
      return `<div class="p-row" data-skill="${t.sk}"><span>${t.sk === "乱拳" ? t.sk : "《" + t.sk + "》"}</span><b>熟练 ${cur}/${cap}</b></div>`;
    }).join("") : `<div class="empty">尚无傍身功法。市井中的落魄武师、古籍摊的残卷、宗门的山门——求武之路，处处可起。</div>`;
    // 求法之路：有明确线索时给出指引（不空转——玩家知道下一步去哪求）
    const leads = (typeof gongfuLead === "function") ? gongfuLead() : [];
    if (leads.length) html += `<div class="pityline" style="margin-top:6px"><span>求法之路：${leads.map(l => `《${l.g.name}》${l.path}`).join(" ｜ ")}</span></div>`;
    else if (owned.some(t => t.id && Math.round(S.skills[t.sk] || 0) >= TECH_CAPS[t.sk])) html += `<div class="pityline" style="margin-top:6px"><span>功法已至尽头——玄品门槛在灵阶，先把修为垒上去。</span></div>`;
    /* 法术栏（设定·技能面板三标签：类型/主属性/消耗） */
    const spKnown = knownSpells();
    html += `<div class="p-title" style="margin-top:14px"><b>法 术</b><span>具名法术 · 耗法力 · 威力 = 基础 × 智力 × 存量</span></div>`;
    html += spKnown.length ? spKnown.map(sp => `<div class="p-row" data-spell="${sp.id}"${sp.kind === "jinshu" ? ` style="border:1px solid var(--blood-hi);padding-left:6px"` : ""}><span>「${sp.name}」${sp.kind === "jinshu" ? `<i style="color:var(--blood-hi);font-style:normal"> · 禁术</i>` : sp.linggen ? `<i style="color:var(--gold-dim);font-style:normal"> · ${linggen().name}专属</i>` : ""}</span><b>${sp.kind === "jinshu" ? "透支未来" : `熟练 ${Math.round(spellProf(sp.id))}/${spellCap(sp)}`}</b></div>`).join("")
      : (S.realm >= 5 ? `<div class="empty">气海已开，尚无具名法术。宗门传功、古籍玉简、游方货郎——法术之路处处可起。</div>` : `<div class="empty">聚气开海之后，方谈法术。</div>`);
    const life = Object.entries(S.skills).filter(([k]) => !(k in TECH_CAPS)).sort((a, b) => b[1] - a[1]);
    html += `<div class="p-title" style="margin-top:14px"><b>技 艺</b><span>生活技能 · 从业历练积攒</span></div>`;
    html += life.length ? life.map(([k, v]) => `<div class="p-row" data-skill="${esc(k)}"><span>${esc(k)}</span><b>熟练 ${Math.round(v)}/${TECH_CAPS[k] || 100}</b></div>`).join("")
      : `<div class="empty">尚无傍身技艺。去谋生、去历练——手艺是饿不死的底气。</div>`;
    body.innerHTML = html;
    // 战斗外修炼入口：打坐参悟 / 向 NPC 讨教（设定公式见 runSpecial("meditate")）
    body.querySelector("[data-meditate]") && (body.querySelector("[data-meditate]").onclick = () => {
      if (S.over) return;
      if (window.__inCombat) { toast("生死相搏，无暇打坐。"); return; }
      if (typeof gmBusy !== "undefined" && gmBusy) { toast("天道推演未歇，稍候再打坐。"); return; }
      const mt = mainTechnique(); const sk = mt ? mt.name : "乱拳"; const ak = mt ? mt.fb.a : "str";
      const wxm = sk === "乱拳" ? 1 : wxTrainMult(sk);
      const coef = medStateCoef();
      const base = 6 * (attr(ak) / (REALM_ATTR_BASE[S.realm] || 5)) * coef * (1 + (S.mods.trainP || 0) / 100) * wxm;
      const est = Math.round(base * 10) / 10;
      let teacher = null;
      const masters = (S.masters && Object.keys(S.masters).length) ? Object.values(S.masters) : [];
      const bondTop = Object.entries(S.npc || {}).filter(([n, v]) => typeof v === "number" && v >= 30).sort((a, b) => b[1] - a[1])[0];
      teacher = masters[0] || (bondTop ? bondTop[0] : null);
      const opts = [];
      if (teacher) opts.push({ label: `向「${teacher}」讨教「${sk}」关隘`, hint: `耗一时辰 · 讨教加成 ×1.5，约 +${Math.round(base * 1.5 * 10) / 10} 熟练 · 缘分 +2`, fn: () => runSpecial("meditate", { coef, teacher, focus: sk }) });
      opts.push({ label: `独坐参悟「${sk}」`, hint: `耗一时辰 · 熟练 +${est}（状态系数 ${coef}）· 体力 -3`, fn: () => runSpecial("meditate", { coef, focus: sk }) });
      opts.push({ label: "罢了", hint: "修行不急在一时。", fn: () => {} });
      setChoices(opts);
    });
    body.querySelectorAll("[data-skill]").forEach(el => el.onclick = () => {
      const k = el.dataset.skill;
      const t = TECH_LIST.find(x => x.sk === k);
      const cap = TECH_CAPS[k] || 100, cur = Math.round(S.skills[k] || 0);
      if (t) {
        const gd = (typeof GONGFU_BY_NAME !== "undefined") ? GONGFU_BY_NAME[k] : null;
        const fb = gd ? gd.fb : null;
        showInfo(`「${k}」`, `<span style="color:var(--gold-dim)">${t.tier} · ${t.el ? WX_NAMES[t.el] + "行" : "无行"}</span>`, esc(t.desc),
          `熟练度 ${cur}/${cap} ｜ ${fb ? `反哺：小成(${cap / 2}) ${fb.an} +${fb.half} · 圆满(${cap}) ${fb.an} +${fb.full}` : "圆满之时，野路子也能自推演出正经传承"} ｜ ${esc(t.src)}`);
      } else {
        const P = (typeof PROFESSIONS !== "undefined") ? Object.values(PROFESSIONS).find(p => p.skill === k) : null;
        showInfo(`「${esc(k)}」`, `<span style="color:var(--gold-dim)">生活技艺</span>`,
          "谋生的手艺，也是入世的路。从业、帮工、历练皆可积攒熟练度。",
          `熟练度 ${cur}/${cap} ｜ 每满 10 熟练，相关职业经验 +1（技艺印证）${P ? ` ｜ 对应职业：${esc(P.tierName)}「${esc(P.name)}」` : ""}`);
      }
    });
    body.querySelectorAll("[data-spell]").forEach(el => el.onclick = () => { // 法术详情：类型/主属性/消耗 + 威力公式拆解
      const sp = (typeof SPELLS_BY_ID !== "undefined") && SPELLS_BY_ID[el.dataset.spell];
      if (!sp) return;
      if (sp.kind === "jinshu") { // 禁术详情：红框标记，代价前置（设定·禁术节）
        showInfo(`「${sp.name}」 <span style="color:var(--blood-hi)">· 禁术</span>`, `<span style="color:var(--blood-hi)">${sp.tierName} · 类型：禁术（不入常态战力）</span>`, esc(sp.desc),
          `代价：${esc(sp.cost)} ｜ 威力预估 ≈${spellPowerJinshu(sp)}（智力系数 ×${spellIntCoef()}${sp.jsKind === "ranfa" ? "，随当前法力上涨" : ""}）｜ 释放前系统三次确认：此术不可逆，天道记账，概不退换。｜ ${esc(sp.src)}`);
        return;
      }
      showInfo(`「${sp.name}」`, `<span style="color:var(--gold-dim)">${sp.tierName} · ${sp.el ? WX_NAMES[sp.el] + "行" : "五行皆转"} · 类型：法术${sp.linggen ? " · " + linggen().name + "专属" : ""}</span>`, esc(sp.desc),
        `主属性：智力 ｜ 消耗：法力 ${sp.mp} ｜ 熟练度 ${Math.round(spellProf(sp.id))}/${spellCap(sp)}（施法积攒，瓶颈最后 10% 减半；小成/圆满反哺智力）｜ 基础威力 ${sp.base} ｜ 当前预估 ≈${spellPower(sp)}（智力系数 ×${spellIntCoef()} · 存量系数 ×${mpReserveCoef()}）${sp.trait && typeof SPELL_TRAIT_TEXT !== "undefined" ? "｜ " + SPELL_TRAIT_TEXT[sp.trait] : ""}｜ ${esc(sp.src)}`);
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

/* ---------- 动态成就（设定十三章 · 由 AI 依剧情生成，不拘泥引擎名录） ----------
   fx.ach = { name, tier(0~4 凡灵玄圣仙), desc, reward:"points:N|attr:N|dao:N|luck:1|title:名" } */
function gainDynAch(a) {
  META.dynAch = META.dynAch || [];
  if (META.dynAch.some(x => x.name === a.name)) return; // 同名成就先到先得
  META.achEver = META.achEver || {};
  const AC = TABLES.ACH;
  const tier = Math.max(0, Math.min(4, a.tier | 0));
  const everFirst = !META.achEver[a.name]; // 万古首达：历世从未有人做到
  if (everFirst) META.achEver[a.name] = 1;
  const mult = everFirst ? AC.everMult : AC.firstMult; // 当世首达 ×1.5 ／ 万古首达 ×2
  META.dynAch.push({ name: String(a.name).slice(0, 12), tier, desc: String(a.desc || "").slice(0, 60), day: S ? S.day : 0, world: S ? S.world : 0 });
  saveMeta();
  const rn = [];
  const m = /^(points|attr|dao|luck|title):(.+)$/.exec(String(a.reward || ""));
  if (m) {
    if (m[1] === "points") { const lo = AC.pointsRange[tier][0], hi = Math.max(lo, AC.pointsRange[tier][1]); const v = Math.round(Math.min(hi, Math.max(lo, +m[2] || lo)) * mult); S.points += v; rn.push(`万象点 ×${v}`); }
    if (m[1] === "attr") { const lo = AC.attrRange[tier][0], hi = Math.max(lo, AC.attrRange[tier][1]); const v = Math.round(Math.min(hi, Math.max(lo, +m[2] || lo)) * mult * 10) / 10; const ks = ["str", "agi", "int", "con"]; const k = ks[Math.floor(Math.random() * 4)]; S.base[k] = Math.min(attrCeiling(), Math.round((S.base[k] + v) * 10) / 10); rn.push(`${{ str: "力量", agi: "敏捷", int: "智力", con: "体质" }[k]} +${v}`); }
    if (m[1] === "dao") { const v = Math.min(5, Math.max(1, +m[2] || 1)); S.daoXin = Math.min(100, S.daoXin + v); rn.push(`道心 +${v}`); }
    if (m[1] === "luck") { if (tier >= 3 && S.base.luck < 10) { S.base.luck += 1; rn.push("气运 +1"); } else { const v = Math.round(20 * mult); S.points += v; rn.push(`气运唯圣品可动——折万象点 ×${v}`); } }
    if (m[1] === "title") { const tname = m[2].slice(0, 8); const tid = "dyn_" + a.name; if (!TITLES[tid]) TITLES[tid] = { name: tname, from: a.name, desc: String(a.desc || "").slice(0, 40), mod: {} }; gainTitle(tid); rn.push(`称号「${tname}」`); }
  }
  sys(`【千秋录 · 新刻成就】${AC.tierNames[tier]}「${a.name}」——${everFirst ? "万古首达！此名从未刻于任何一世" : "当世首达"}。${a.desc ? a.desc + "。" : ""}${rn.length ? "奖励：" + rn.join("、") + "。" : ""}`);
  if (everFirst) { const v = tier * 20; S.points += v; sys(`【万古首达 · 专属词条之约】专属词条折抵万象点 ×${v}——它已在命格里留了位置。`); }
  // 翻页奖励：千秋录（引擎成就 + AI 成就）每刻满 10 项翻过一页，赠「天命一抽」（必出灵品以上，不占保底）
  const total = META.ach.length + META.dynAch.length;
  if (total % AC.pageSize === 0) {
    const t = rollTier(AC.pagePullMinTier);
    const card = CARD_POOL[t][Math.floor(Math.random() * CARD_POOL[t].length)];
    sys(`【千秋录 · 翻页】刻满 ${total} 项成就，赠「天命一抽」——「${card.name}」（${TIERS[t].name}），不占保底。`);
    addCard(card, t);
  }
  try { chronicle(`千秋录刻下「${a.name}」`, "evt"); } catch (e) {}
  computeMods(); renderPanel();
}
/* ---------- AI 生成词条（23:59 补丁）：轮盘不局限引擎名录 ----------
   词条可由 AI 依设定集衍生生成（山川精怪、天材地宝、人物典故、功法武技皆可入词），
   定义随魂封存（META.dynCards），并注入轮盘奖池——后世抽卡亦可遇。
   fx.newcard = { name, tier(0~5), eff, mod }；mod 键白名单限幅，杜绝凭空捏造体系。 */
const DYN_MOD_KEYS = { strP:[-30,30], agiP:[-30,30], intP:[-30,30], conP:[-30,30], allP:[-15,15],
  luckFlat:[-3,3], hungerR:[0.5,1.5], foodP:[-30,30], hpRegenP:[-50,50], staRegen:[0.5,2],
  moneyP:[-30,30], socialP:[-30,30], trainP:[-30,30], dmgP:[-40,40], escapeP:[-30,30], pityR:[-50,50], defP:[-30,30] };
function dynCardInject(c) { if (CARD_POOL[c.tier] && !CARD_POOL[c.tier].some(x => x.id === c.id)) CARD_POOL[c.tier].push(c); }
if (META.dynCards) for (const id in META.dynCards) dynCardInject(META.dynCards[id]); // 读档重注入奖池
function gainDynCard(def, grant) { // def: {name, tier, eff, mod}；grant 默认 true（剧情中直接入手）
  META.dynCards = META.dynCards || {};
  const name = String(def.name || "").trim().slice(0, 8);
  if (!name) return null;
  const id = "dync_" + name;
  let c = META.dynCards[id];
  if (!c) {
    const tier = Math.max(0, Math.min(5, def.tier | 0));
    const mod = {};
    for (const k in (def.mod || {})) if (DYN_MOD_KEYS[k]) mod[k] = Math.max(DYN_MOD_KEYS[k][0], Math.min(DYN_MOD_KEYS[k][1], +def.mod[k] || 0));
    c = { id, name, tier, eff: String(def.eff || "命格微澜，天机未名。").slice(0, 60), mod };
    META.dynCards[id] = c; saveMeta();
    sys(`【万象轮盘 · 新词入盘】「${c.name}」（${TIERS[tier].name}）——${c.eff}轮盘自此多了一枚新词。`);
  }
  dynCardInject(c);
  if (grant !== false) { addCard(c, c.tier); computeMods(); renderPanel(); }
  return c;
}
function gainAch(id) {
  if (META.ach.includes(id)) return;
  META.ach.push(id); saveMeta();
  if (S && S.lifeAch && !S.lifeAch.includes(id)) S.lifeAch.push(id); // 当世首达名录（轮回结算 · 千秋录维度）
  const a = ACHIEVEMENTS[id];
  sys(`【千秋录 · 新刻成就】${a.secret ? "（隐藏）" : ""}「${a.name}」——${a.desc}。奖励：${a.reward}。`);
  if (id === "baonuan") S.points += 5;  if (id === "firstPot") S.points += 10;
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
  if (id === "qingtian") S.points += 500; // 倾天一击：万象点 ×500
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
/* ---------- 缘分簿（设定补丁 v5 · 第四章）：结算规则 ----------
   性格底色：记仇者 伤害×1.5／善意×0.7；重情者 善意×1.5。
   词条：情绪价值 +20%（socialP）、天生魅魔 善缘 ×1.4（情怨 ×2 由剧情承担）。
   当众（见证者在场）：恩怨 ×1.5。称号「义薄云天」：陌生人初始 +10。
   变动 ≥5 或跨档：必须给出可见信号（称呼/语气变化）——腹诽不可查。 */
function npcPersonality(name) {
  if (typeof NPC_CHAR !== "undefined" && NPC_CHAR[name]) return NPC_CHAR[name];
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NPC_CHAR_POOL[h % NPC_CHAR_POOL.length];
}
function npcTier(v) { return v >= 80 ? 4 : v >= 40 ? 3 : v >= 20 ? 2 : v > -20 ? 1 : v > -40 ? 0 : v > -70 ? -1 : v > -90 ? -2 : -3; }
/* NPC 性别：名号定性别（同一人此世恒定）。明示女名入女册，其余按字号哈希掷定（四六开）。 */
const FEMALE_NAMES = ["铁心兰", "祁红", "杏儿", "晚晚", "阿禾", "阿黎", "雪夜寡妇", "卖炭婆"];
function npcGender(name) {
  if (FEMALE_NAMES.some(x => name.indexOf(x) >= 0)) return "女";
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 10 < 4 ? "女" : "男";
}
function addNpc(name, v, opts) {
  opts = opts || {};
  // 【缘分日常 · 每日一次】日常行为（寒暄、帮工、馈赠一类）带来的善缘，同一 NPC 每日只结算一次；
  // 特殊剧情（任务酬谢、瓶颈现身、缘分突破等）以 opts.special 传入，不受此限
  if (v > 0 && opts.daily && !opts.special) {
    S.bondDaily = S.bondDaily || {};
    if (S.bondDaily[name] === S.day) return 0; // 今日这份缘已记过账了
    S.bondDaily[name] = S.day;
  }
  const firstMeet = !(name in S.npc);
  const pers = npcPersonality(name);
  let mult = 1 + (S.mods.socialP || 0) / 100;
  if (v > 0 && pers === "重情") mult *= 1.5;      // 重情者对善意 ×1.5 记
  if (v > 0 && pers === "记仇") mult *= 0.7;      // 记仇者对善意打折
  if (v < 0 && pers === "记仇") mult *= 1.5;      // 记仇者对伤害加倍
  if (v > 0 && hasSpecial("meihuo")) {
    if (npcGender(name) !== S.gender) mult *= 1.4; // 天生魅魔：只对异性 NPC 生效（同性面前魅力平常）
  }
  if (v < 0 && hasSpecial("pofang")) mult *= 1.2;   // 破防了：嘴上没把门，结怨深两成（结仇 +20%）
  if (opts.public) mult *= 1.5;                   // 当众事加倍（见证者传播略）
  if (!(name in S.npc) && S.flags.yibao) S.npc[name] = 10; // 称号「义薄云天」：陌生人初始好感 +10
  const before = S.npc[name] || 0;
  // 【边际递减 · 01:19】善缘越涨越难：性格/传播倍数结算后，再按当前缘分衰减（0 起步不打折；50→×0.625；80→×0.4）。仇恨不适用——怨只会发酵。
  if (v > 0 && before > 0) mult *= 1 - (Math.min(Math.abs(before), 100) / 100) * 0.75;
  // 【缘分天花板】±80 是凡俗手段的极致（生死之交）：再往上须「缘分突破」大剧情（共患难/托生死/解开心结），完成后以 fx.flag="bondbreak_名字" 解锁——AI 在线由 AI 编排，离线由 gm.js「bondbreak」遭遇兜底，两条通道同一旗标
  if (v > 0 && before >= 80 && !S.flags["bondbreak_" + name]) {
    mult *= 0.1;
    if (!S.flags["bondhint_" + name]) {
      S.flags["bondhint_" + name] = 1;
      sys(`【缘分瓶颈】与「${name}」已是生死之交（${before}），寻常走动、请客送礼再难让这段缘分更进一步——须有一场共患难、托生死的「缘分突破」之事（天道在线由 AI 执笔，离线则引擎自会送来契机），方可再进。`);
    }
  }
  v = Math.round(v * mult * 10) / 10;
  if (v > 0 && firstMeet && hasSpecial("meihuo") && npcGender(name) !== S.gender) v += 40; // 魅魔·异性初遇：初始好感 +40（初见之刻，目光便挪不开了）
  S.npc[name] = Math.max(-100, Math.min(100, Math.round((before + v) * 10) / 10));
  const after = S.npc[name];
  S.npcMin = S.npcMin || {};
  if (S.npcMin[name] == null || after < S.npcMin[name]) S.npcMin[name] = after;
  bondSignal(name, before, after, v, pers);
  if (before < 80 && after >= 80) { // 生死之交 + 人缘即天缘（隐藏任务：累计不问哪一世）
    chronicle(`与「${name}」结为生死之交`, "npc");
    sys(`【生死之交】${name}——你若开口，他愿以命相陪。人情是债，你攒的不是人情，是天看见你的次数。`);
    gainAch("shengsi");
    META.bond80 = META.bond80 || [];
    if (!META.bond80.includes(name)) {
      META.bond80.push(name); saveMeta();
      sys(`【人缘即天缘 · 隐】天看见你的次数：${META.bond80.length} / 10。`);
      if (META.bond80.length >= 10) { gainAttr("luck", 1); sys(`【人缘即天缘】十人愿以命相托——气运 +1。善缘的结构质量，计入轮回的因果账。`); }
    }
    if (S.flags["pet_" + name]) { // 【认魂】灵宠缘分至生死之交：妖兽寿元远长于人，可跨世等候
      META.soulPets = META.soulPets || [];
      if (!META.soulPets.includes(name)) {
        META.soulPets.push(name); saveMeta();
        sys(`【认魂】「${name}」认你之魂——妖兽寿元远长于人，生死之交可破一世之约，它或许会在你的下一世等候。`);
      }
    }
  }
  if ((S.npcMin[name] || 0) <= -90 && after > 0) { // 死仇化解为正缘
    sys(`【死仇化解】${name}盯着你看了很久，把刀放下了。不是信你，是记你的情。`);
    chronicle(`与「${name}」化干戈为玉帛`, "npc");
    sys(`【化干戈】一段不死不休的死仇，竟被你走回了正缘。说书人都不敢这么编。`);
    gainAch("huagan"); gainAttr("luck", 1);
    S.npcMin[name] = after;
  }
}
/* 缘分信号（执行细则 5）：变动 ≥5 或跨档必给可见信号 */
function bondSignal(name, before, after, raw, pers) {
  const t0 = npcTier(before), t1 = npcTier(after);
  if (t0 === t1 && Math.abs(raw) < 5) return;
  const up = after > before;
  let line = null;
  if (t1 >= 3 && t0 < 3) line = `${name}待你，从「认识」变成了「自己人」——有忙必帮，有好东西想着你。`;
  else if (t1 === 2 && t0 < 2 && up) line = `${name}记住了你的好，笑脸多了几分真心。`;
  else if (t1 === 0 && t0 > 0 && !up) line = `${name}对你冷了脸——夹枪带棒的寒暄，背后使绊子。`;
  else if (t1 === -1 && t0 > -1 && !up) line = `${name}开始处处跟你作对——落井下石，还披着「规矩」的皮。`;
  else if (t1 === -2 && t0 > -2 && !up) line = `${name}表面维持平静，暗中磨刀。你的行踪，可能已经被人标了价。`;
  else if (t1 === -3 && t0 > -3 && !up) line = `${name}与你，不死不休。见之即杀，不讲场面话。`;
  else if (Math.abs(raw) >= 5) line = up ? `${name}对你的态度，悄然热络了几分。` : `${name}看你的眼神，凉了下去。`;
  if (line) log(`【缘分 · ${relText(after)}】${line}${pers === "记仇" && !up ? "（记仇之人，怨加倍记。）" : pers === "重情" && up ? "（重情之人，恩深深记。）" : ""}`, "dim");
}
/* 社交判定修正（第四章·2）：生死之交 ±40%、挚友 ±20%、相识 ±10%、记恨 ∓10%；死仇锁死返回 null */
function bondSocialMod(name) {
  const v = (S.npc || {})[name];
  if (v == null) return 0;
  if (v >= 80) return 0.4;
  if (v >= 40) return 0.2;
  if (v >= 20) return 0.1;
  if (v <= -90) return null;
  if (v <= -40) return -0.1;
  return 0;
}
/* 交易让利（第四章·2）：挚友以上 80 折、相识 90 折；微怨以上 120；贪婪者善缘折扣减半（折现为利益开价） */
function tradePrice(name, base) {
  const v = (S.npc || {})[name];
  let m = 1;
  if (v >= 80) m = 0.75; else if (v >= 40) m = 0.8; else if (v >= 20) m = 0.9;
  else if (v <= -40) m = 1.2; else if (v <= -20) m = 1.1;
  if (npcPersonality(name) === "贪婪" && m < 1) m = 1 + (m - 1) * 0.5; // 贪婪者把情分折现：只让一半
  return Math.max(1, Math.round(base * m));
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
  const pRedNeed = lv >= 10 ? 50 : 100; // 百抽大保底必出红品；满级缩短为五十抽
  if (lv >= 8 && (S.pity1000 || 0) + speed >= pRedNeed) minT = 5;
  else if (S.pity100 + speed >= 50) minT = hunFloor; // 五十抽保底
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
  if (card.id === "leiyi" && S.cards[card.id] === 1) { // 一缕雷意：金行亲和 +10（雷为金之异）
    const wx = wxOf(); wx.jin = Math.min(100, (wx.jin || 0) + 10);
    setTimeout(() => sys(`【一缕雷意】一缕紫雷没入眉心，经久不散——金行亲和 +10（现 ${wx.jin}）。`), 600);
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
  info += lv >= 6 ? ` ｜ 五十抽必出金↑` : ` ｜ 五十抽必出紫↑`;
  if (lv >= 8) info += ` ｜ ${lv >= 10 ? "五十" : "百"}抽必出红`;
  if (lv >= 2) info += `<br>本月卡池倾向：「${META.poolTheme || "？"}」——青品以上大概率偏向`;
  $("#sysInfo").innerHTML = info;
  const ex = $("#stoneExch");
  if (lv >= 3) { // 以石易点：1 灵石 = 1 点，另收 10% 手续费，每月限兑 100 点（设定·万象点一节）
    ex.style.display = "";
    const left = Math.max(0, 100 - (S.stoneExch || 0));
    $("#btnStoneExch").disabled = S.stones < 11 || left < 10;
    $("#btnStoneExch").innerHTML = `以石易点<small style="opacity:.6">（11 灵石 → 10 万象点 · 本月余 ${left} 点）</small>`;
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
  if (S.flags.drunkSlots > 0) S.flags.drunkSlots--; // 酒剑仙：酒意两时辰
  if (S.hunger < 100 && !hasSpecial("bigu")) S.hunger = Math.min(100, S.hunger + 6 * (S.mods.hungerR || 1));
  if (S.slot >= 4) { night(); return; }
  renderPanel(); gmTurn();
}
function night() {
  let lines = [];
  if (S.ill) { // 疾病逐日痊愈
    S.ill.days--;
    if (S.ill.days <= 0) { lines.push(`【病愈】${S.ill.name}已去，周身轻快。`); S.ill = null; }
  }
  if (S.tempLuckDays > 0) S.tempLuckDays--;
  if (!hasSpecial("bigu")) S.hunger = Math.min(100, S.hunger + 4 * (S.mods.hungerR || 1));
  const ssCut = hasSpecial("shuishen") ? 0.7 : 1; // 睡神附体：眠中自警，夜间寒气/暑热之苦 -30%
  const cold = S.weather === "大雪" || S.weather === "风雪" || S.flags.coldSnap;
  if (cold && !S.inv.mianao && !S.flags.fireTonight) {
    const chk = attr("con") * 10 + attr("luck") * 4 + (S.mods.coldRes || 0); // 冻寒抗性（雪原弃工/烽堡病卒）：判定 +10
    if (chk < 45 + (S.flags.coldSnap ? 15 : 0)) {
      const dmg = Math.max(1, Math.round((2 + Math.floor(Math.random() * 2)) * (hasTitle("xiaoqiang") ? 0.9 : 1) * ssCut)); // 称号「小强」：环境伤害 -10%
      S.hp -= dmg; S.daoXin -= 0.5;
      lines.push(`<span style="color:var(--blood-hi)">寒气钻进骨头缝，你蜷缩着熬过一夜。气血 -${dmg}。</span>`);
      if (Math.random() < 0.3 && (!S.ill || S.ill.name !== "风寒")) setIll("风寒", 3, "寒气入体，夜间气血回复减半"); // 受寒成疾
    } else lines.push(`你把破毯裹紧了些，硬是扛过了这夜的寒。`);
  }
  /* 酷热地域（西漠）：酷热/热风/沙暴之夜无水囊且未生火，暑热伤气、可能中暑 */
  const rgNight = regionOf(S.place);
  const hot = rgNight.hazard === "heat" && ["酷热", "热风", "沙暴"].includes(S.weather);
  if (hot && !S.inv.shuinang && !S.flags.fireTonight) {
    const chk = attr("con") * 10 + attr("luck") * 4 + (S.mods.heatRes || 0); // 暑热抗性（沙海弃儿）：判定 +10
    if (chk < 50) {
      const dmg = Math.max(1, Math.round((2 + Math.floor(Math.random() * 2)) * (hasTitle("xiaoqiang") ? 0.9 : 1) * ssCut));
      S.hp -= dmg; S.daoXin -= 0.5;
      lines.push(`<span style="color:var(--blood-hi)">暑气整夜烙在身上，帐篷里闷得像口锅。你干熬到天亮，嘴唇裂了缝。气血 -${dmg}。</span>`);
      if (Math.random() < 0.3 && (!S.ill || S.ill.name !== "中暑")) setIll("中暑", 2, "酷热伤津，夜间气血回复减半"); // 受热成疾
    } else lines.push(`你把身体贴在帐篷背阴的一面，硬扛过了这夜的闷热。`);
  }
  /* 瘴气地域（南岭）：瘴雨/山雾之夜无驱瘴草且未生火，瘴毒侵体、可能成疾（百毒不侵免疫） */
  const miasma = rgNight.hazard === "miasma" && ["瘴雨", "山雾"].includes(S.weather);
  if (miasma && !hasSpecial("baidu") && !(S.inv.quzhangcao > 0) && !S.flags.fireTonight) {
    const chk = attr("con") * 10 + attr("luck") * 4 + (S.mods.poiRes || 0); // 瘴毒抗性（瘴林逃难人/病骨）：判定 +
    if (chk < 50) {
      const dmg = Math.max(1, Math.round((2 + Math.floor(Math.random() * 2)) * (hasTitle("xiaoqiang") ? 0.9 : 1) * ssCut));
      S.hp -= dmg; S.daoXin -= 0.5;
      lines.push(`<span style="color:var(--blood-hi)">湿瘴顺着呼吸往肺里钻，皮肤泛起细密的痒疹。你烧着冷汗熬到天亮。气血 -${dmg}。</span>`);
      if (Math.random() < 0.3 && (!S.ill || S.ill.name !== "瘴毒侵体")) setIll("瘴毒侵体", 3, "瘴气入体，夜间气血回复减半"); // 瘴毒成疾
    } else lines.push(`你用湿布捂住口鼻，屏息浅眠，硬是扛过了这夜的瘴。`);
  }
  if (hasSpecial("bigu")) { /* 辟谷 */ }
  else if (S.hunger >= 100) { S.hp -= 4; S.base.con = Math.max(1, Math.round((S.base.con - 0.05) * 100) / 100); computeMods(); lines.push(`<span style="color:var(--blood-hi)">胃里像有把钝刀在搅。气血 -4，长期饥饿啃食根本——体质 -0.05。</span>`); }
  else if (S.hunger > 85) { S.hp -= 2; lines.push(`【极度饥饿】啃噬着你。气血 -2。`); }
  if (S.hunger < 70 && S.hp > 0) S.hp = Math.min(hpMax(), S.hp + attr("con") * 0.8 * (1 + (S.mods.hpRegenP || 0) / 100) * (S.ill && (S.ill.name === "风寒" || S.ill.name === "中暑" || S.ill.name === "瘴毒侵体") ? 0.5 : 1) * ((S.flags.meditateTonight && S.realm < 7) ? 0.5 : 1)); // 风寒/中暑/瘴毒侵体：夜间气血回复减半 ｜ 夜里修炼睡不安稳：再减半（灵阶起打坐代眠，无妨）
  const sleepDebt = S.flags.meditateTonight && S.realm < 7;
  if (sleepDebt) S.flags.sleepDebtDay = S.day + 1; // 睡眠不足：明日智力敏捷 -10%
  delete S.flags.meditateTonight;
  if (S.flags.sleepDebtDay && S.flags.sleepDebtDay <= S.day) delete S.flags.sleepDebtDay;
  S.sta = staMax() * (S.mods.staRegen >= 2 ? 1 : sleepDebt ? 0.7 : 0.85);
  if (S.realm >= 5 && S.mp < mpMax() && !(S.jinshuWeak > 0)) S.mp = Math.min(mpMax(), S.mp + mpMax() * 0.3 * (S.linggen === "za" ? 1.5 : 1)); // 杂灵根：回蓝 ×1.5；禁术虚弱期间蓝锁 0
  if (S.debuff === "weak") { S.debuffDays = (S.debuffDays || 0) - 1; if (S.debuffDays <= 0) { S.debuff = null; lines.push(`元气终于回转，手脚重新有了力气。`); } }
  if (S.jinshuWeak > 0) { S.jinshuWeak--; if (S.jinshuWeak <= 0) { S.jinshuWeak = 0; lines.push(`禁术虚耗终于熬了过去——丹田重新传来暖意，法力回来了。`); } }
  if (S.flags.ateHot) { S.foodStreak++; S.flags.ateHot = false; if (S.foodStreak >= 100) gainAch("hotRice"); } // 设定集：连续百日热食
  else S.foodStreak = 0;
  if (S.daoXin >= 90) gainAch("wukui"); // 问心无愧：道心 90
  if (S.money + S.stones * TABLES.MONEY.wenPerStone >= 30000) gainAch("fujia"); // 富甲一方：身家三万文（灵石按汇率折算，1 枚 = 十万文）
  if (hasSpecial("meishen")) { S.flags.meishenDays = (S.flags.meishenDays || 0) + 1; if (S.flags.meishenDays >= 360) gainAch("dabusi"); } // 打不死的：霉神附体满一年
  if (hasSpecial("huaibi") && S.stones >= 15 && Math.random() < 0.08) { // 身怀重宝必被觊觎
    const stolen = Math.max(1, Math.floor(S.stones * 0.1)); S.stones -= stolen;
    lines.push(`<span style="color:var(--blood-hi)">【怀璧其罪】夜里有人摸进了破庙——灵石少了 ${stolen} 枚。财不外露，古人不欺你。</span>`);
  }
  /* 大冤种：被坑后三日内必有补偿机缘 */
  if (hasSpecial("yuanchang") && S.flags.yuanchangDay && S.day - S.flags.yuanchangDay <= 3) {
    const comp = 8 + Math.floor(Math.random() * 16); S.money += comp; delete S.flags.yuanchangDay;
    lines.push(`<span style="color:var(--gold-dim)">【大冤种 · 补偿机缘】应了「吃亏是福」那句老话——你白捡了一桩小机缘，铜钱 +${comp}。</span>`);
  }
  /* 气运之子：走路捡钱（每日 10%） */
  if (hasSpecial("lucky") && Math.random() < 0.1) {
    const g = 3 + Math.floor(Math.random() * 13); S.money += g;
    lines.push(`<span style="color:var(--gold-dim)">【气运之子】墙角一只鼓囊囊的钱袋在等人认领——你等了三息，没人来。铜钱 +${g}。</span>`);
  }
  /* 吉星高照：每日 5% 天降小机缘 */
  if (hasSpecial("jixing") && Math.random() < 0.05) {
    const rollG = Math.random();
    if (rollG < 0.45) { const g = 5 + Math.floor(Math.random() * 11); S.money += g;
      lines.push(`<span style="color:var(--gold-dim)">【吉星高照】夜半一颗流星坠在庙外——你循光寻去，雪窝里躺着一只冻硬的钱袋。铜钱 +${g}。</span>`); }
    else if (rollG < 0.8) {
      if (gainCult(3)) lines.push(`<span style="color:var(--gold-dim)">【吉星高照】梦里一位白须老者朝你眉心一点——醒来时灵气仍在经脉里打转。修为 +3。</span>`);
      else { S.money += 8; lines.push(`<span style="color:var(--gold-dim)">【吉星高照】梦里一位白须老者朝你眉心一点——你虽无功法留不住灵气，枕边却多了 8 文买功法的本。铜钱 +8。</span>`); }
    } else {
      const ks = Object.keys(S.npc || {}).filter(n => typeof S.npc[n] === "number" && S.npc[n] > -80);
      if (ks.length) { const n = ks[Math.floor(Math.random() * ks.length)]; addNpc(n, 3, { special: true });
        lines.push(`<span style="color:var(--gold-dim)">【吉星高照】清晨${n}差人给你捎来一句问候、一包吃食——缘故你摸不着头脑，情分是真落下了。（缘分 +3）</span>`); }
      else { S.money += 6; lines.push(`<span style="color:var(--gold-dim)">【吉星高照】雪地里一脚踢出个鼓囊的旧香囊。铜钱 +6。</span>`); }
    }
  }
  /* 梦中悟道：气运 6+ 者偶有预警之梦（每夜 4%） */
  if (hasSpecial("mengwu") && attr("luck") >= 6 && Math.random() < 0.04) {
    S.tempLuckDays = Math.max(S.tempLuckDays, 3);
    lines.push(`<span style="color:var(--gold-dim)">【梦中悟道】你梦见明日要走的桥上断了一根索——惊醒后心有余悸，却莫名觉得来日会顺些。气运临时 +1（三日）。</span>`);
  }
  /* 来财/小聚财库：露富招贼（身携 300 文以上） */
  const thiefP = hasSpecial("jucai") ? 0.06 : hasSpecial("laicai") ? 0.04 : 0;
  if (thiefP && S.money >= 300 && Math.random() < thiefP) {
    const stolen = Math.max(1, Math.round(S.money * 0.05)); S.money -= stolen;
    lines.push(`<span style="color:var(--blood-hi)">【露富招贼】你财名在外，夜里便有了惦记你的人——荷包里少了 ${stolen} 文。财不外露，古人不欺你。</span>`);
  }
  /* 酒剑仙：醉意随夜散去，次日宿醉（智力减半） */
  if (S.flags.hangoverDay && S.flags.hangoverDay <= S.day) delete S.flags.hangoverDay;
  if ((S.flags.drunkSlots || 0) > 0) { S.flags.drunkSlots = 0; S.flags.hangoverDay = S.day + 1;
    lines.push(`<span style="color:var(--paper-70,#cbb)">酒意上头，你睡得很沉。明早怕是不好受。（宿醉：明日智力减半）</span>`); }
  /* 真香定律：醒来恰逢月末（30 日）必然当众真香一次——气运临时 +1（三日），道心 -1 */
  if (hasSpecial("zhenxiang") && (S.day + 1) % 30 === 0) {
    S.tempLuckDays = 3; S.daoXin = Math.max(0, S.daoXin - 1);
    lines.push(`<span style="color:var(--gold-dim)">【真香定律】月初你立誓「宁死也不……」——今天你在众目睽睽之下做得比谁都香。气运临时 +1（三日），道心 -1。</span>`);
  }
  /* 我要验牌：每三日强制重检天道判定（醒来的这一日） */
  if (hasSpecial("yanpai") && (S.day + 1) % 3 === 0 && !S.flags["yp_d" + (S.day + 1)]) {
    S.flags["yp_d" + (S.day + 1)] = 1;
    const ok = attr("int") * 2 + Math.random() * 20 > 22;
    if (ok) { S.points += 5; lines.push(`<span style="color:var(--gold-dim)">【我要验牌】你掐诀重检了三日来的天道判定——账实相符。万象点 +5。</span>`); }
    else { S.daoXin = Math.max(0, S.daoXin - 1); lines.push(`<span style="color:var(--blood-hi)">【我要验牌】验牌的手势掐错了半式——你对自己起了疑。道心 -1。</span>`); }
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
    setIll("丹毒侵脉", 3, "丹毒走窜经脉，浑身如炙");
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
  if ((S.day - 1) % 30 === 0 && S.day > 1 && (S.stoneExch || 0) > 0) { // 每月（30 日）初一：以石易点兑额恢复（设定：每月限兑 100 点）
    S.stoneExch = 0;
    lines.push(`【初一】新一月伊始——以石易点的兑额恢复了（每月限兑 100 点）。`);
  }
  // 宗门月供（第六章 · 外门资源）：初一发放，内门弟子加倍——贡献欠奉（缺卯三次以上）者减半
  if (S.sect && (S.day - 1) % 30 === 0 && S.day > 1) {
    const neimen = !!S.flags.neimen;
    const slack = (S.flags.dianmaoMiss || 0) >= 3;
    const wen = neimen ? 400 : 150, stones = neimen ? 3 : 1;
    const gotWen = slack ? Math.floor(wen / 2) : wen, gotStones = slack ? 0 : stones;
    S.money += gotWen; S.stones = (S.stones || 0) + gotStones;
    if (neimen && !slack) { S.inv.juqiDan = (S.inv.juqiDan || 0) + 1; }
    lines.push(`【月供】${S.sect}初一放饷：${gotWen} 文${gotStones ? `、灵石 ${gotStones} 枚` : ""}${neimen && !slack ? "、聚气丹一枚" : ""}。${slack ? "（缺卯过多，执事房减半发放——贡献欠奉，宗门不养闲人。）" : ""}`);
    S.flags.dianmaoMiss = 0; // 月度清账
  }
  // 远行途中（第五章）：跨日递减脚程，抵达后落脚目标地域枢纽
  if (S.travel && S.travel.left > 0) {
    S.travel.left--;
    const rg = REGIONS[S.travel.to];
    if (S.travel.left <= 0) {
      S.place = REGION_HUBS[S.travel.to];
      lines.push(`【抵达】${rg.name}到了。${rg.desc ? rg.desc.slice(0, 30) : "风尘仆仆"}——你在${S.place}落了脚。`);
      chronicle("抵达" + rg.name, "evt");
      S.travel = null;
    } else {
      lines.push(`【旅途】前往${rg.name}的路上（余 ${S.travel.left} 日）。`);
    }
  }
  // 劫数渐强（第一章 · 断灵大劫将至）：升档当日压一行劫兆
  const dl = doomLevel();
  if (dl > (S.flags.doomLv || 0)) {
    S.flags.doomLv = dl;
    const omens = {
      1: "【劫兆 · 风起】近来城里的丹药似乎不如古方记载的药性了。老修士们没头没尾地感慨：「天，不如从前了。」",
      2: "【劫兆 · 灵物贵】灵脉又枯了两条。灵物的价一天一个样，商会掌柜们收货的手都在收紧。",
      3: "【劫兆 · 走火众】走火入魔的传闻一日多过一日——十倍于平日。茶棚里说书人压低了嗓子：上次这样，是赤霄大劫之前。",
      4: "【劫兆 · 前夜】灵气骤降，夜里妖兽发狂撞城的嚎叫再没停过。天罚将至，而你知道——天罚，是人招来的。",
    };
    lines.push(`<span style="color:var(--blood-hi)">${omens[dl]}</span>`);
  }
  if (S.flags.devourSlain && (S.flags.doomLv || 0) > 0) { S.flags.doomLv = 0; lines.push(`【天地一轻】进食既断，压在众生头顶的那口气，松了。`); }
  profDailyTick(); // 职业经验：从业时长 + 技艺印证（第三章 3.3）
  if (S.day % 30 === 0) { // 岁月发酵（第四章·4）：±40 以下的缘分每月向 0 衰减 10%；深仇与生死之交只会发酵
    let faded = 0;
    for (const n in (S.npc || {})) {
      const v = S.npc[n];
      if (Math.abs(v) >= 40 || v === 0) continue;
      const nv = Math.round(v * 0.9 * 10) / 10;
      if (Math.abs(nv - v) >= 0.5) { S.npc[n] = nv; faded++; }
    }
    if (faded) log(`【岁月】久不往来，${faded} 段恩怨淡了下去。深仇与生死之交，从不随时间褪色。`, "dim");
  }
  const spring = S.day >= 31; // 冬三十日而春（第一卷止于开春；自由漫游入春）
  const rg = (typeof regionOf === "function") ? regionOf(S.place) : null;
  const wxPool = rg ? (spring ? rg.weatherS : rg.weatherW) : (spring ? ["晴", "阴", "细雨", "微风", "扬沙"] : ["大雪", "阴晦", "风雪", "晴冷", "冻雨"]);
  S.weather = wxPool[Math.floor(Math.random() * wxPool.length)];
  if (S.day === 9 || S.day === 28) S.flags.coldSnap = true;
  if (S.day === 11 || S.day === 30) S.flags.coldSnap = false;
  S.flags.fireTonight = false;
  S.daySeen = [];
  log(`—— ${spring ? "春" : "冬"} · 第 ${S.day} 日 · ${S.weather} ——`, "daybreak");
  lines.forEach(l => log(l, "dim"));
  if (S.hp <= 0) { die("冻饿而死。破庙的角落里，你安静地蜷缩成了一尊冰雕。", "冻毙"); return; }
  if (S.day >= 31 && !S.flags.freeRoam) { ending(); return; }
  autoSave(); // 每天清晨自动落笔
  const foes = Object.entries(S.npc || {}).filter(([n, v]) => v <= -70); // 记恨以上：暗处等你失足
  if (foes.length && Math.random() < (hasSpecial("xianyan") ? 0.1 : 0.06)) { // 显眼包：仇家也更容易注意到你（6%→10%）
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
  try { turn = await AI.narrate(); } catch (e) { turn = (AI.getCfg() && AI.getCfg().key) ? { _offline: true, _reason: e && e.message } : GM.compose(); }
  loading.remove();
  gmBusy = false;
  if (S.over) return;
  // 天道失联：已配置 Key 但 AI 不可用——停止演算，弹窗由玩家决定，绝不静默降级（01:19 补丁）
  if (turn._offline) {
    showInfo("天道失联", `<span style="color:var(--blood-hi)">推演中断</span>`,
      `原因：${esc(turn._reason || "未知")}。剧情演算已停止，本回合未发生任何变化。`,
      "重试连接会再次请求 AI；「以离线模式继续」则本回合改由内置引擎推演（无 AI 创作的剧情，刷新页面后恢复在线尝试）。",
      [{ label: "重试连接", fn: () => { $("#infoModal").classList.remove("open"); gmTurn(); } },
       { label: "以离线模式继续", fn: () => {
           window.__allowOffline = true;
           $("#infoModal").classList.remove("open");
           toast("已进入离线模式：本轮由内置引擎推演，刷新页面后恢复在线尝试。");
           gmTurn();
         } }]);
    return;
  }
  // 填了 Key 但 AI 没接管：明确告知原因，不再静默降级（手动确认过离线的不再重复提示）
  if (turn._src === "gm" && AI.getCfg() && AI.getCfg().key && !window.__allowOffline) {
    const why = AI.failInfo && AI.failInfo();
    toast("AI 未接管：" + (why ? esc(why) : "未知原因") + "，本回合由离线引擎推演");
  }
  if (S.medScene) S.medScene = null; // 修行记事：本回合剧情（AI 或离线引擎）已承接参悟/讨教，钩子用完即焚
  if (S.trainScene) S.trainScene = null; // 历练之机：同理，砥砺余韵已被承接
  // 承接上文的引子
  if (S.echoLine) { log(esc(S.echoLine), "dim"); chronicle(S.echoLine, "evt"); S.echoLine = null; }
  const srcKey = turn._src === "ai" || turn._src === "server" ? turn._src : "gm";
  const srcName = { ai: "Kimi 执笔", server: "服务端执笔", gm: "离线推演" }[srcKey];
  log(esc(turn.scene) + `<span class="src-tag src-${srcKey}" title="本场景剧情来源">${srcName}</span>`);
  chronicle(turn.scene.slice(0, 46), "scene");
  S.gmRecent = (S.gmRecent || []).concat(["scene:" + turn.scene.slice(0, 48)]).slice(-8); // 脉络加长：连贯性记忆（01:42）
  S.lastScene = turn.scene.slice(0, 160); // 上回合场景节选，喂给 AI 作承接锚点
  const turnChoices = turn.choices.filter(c => !choiceBlocked(c.fx)); // 钱袋/物品门槛兜底：付不起的选项直接不出（规则19/21）
  const choices = turnChoices.map(c => ({
    label: c.label, hint: c.hint, free: true,
    fn: () => { S._choiceSet = false; S.lastPick = c.label; resolveFx(c.fx || {}, c.label); },
  }));
  if (checkBreakthrough()) {
    choices.unshift({ label: "【破境】积累已圆满", hint: "临门一脚。失败会元气大伤。", free: true, fn: () => askBreakthrough() });
  }
  // 三日历练：无论剧情来自 AI 还是离线引擎，每三天必有一次提升实力的机缘（AI 编排 + 引擎兜底双保险）
  if (trainDue()) injectTraining(choices);
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
/* 选项门槛引擎兜底（01:42 补丁）：付不起的钱不花、没有的东西不用 */
function choiceBlocked(fx) {
  if (!fx) return false;
  // 递归合计 fx 内的铜钱负值（跳过 check 分支，分支单独按最省路径计）
  const sumNeg = (o) => {
    if (!o || typeof o !== "object") return 0;
    let s = 0;
    for (const k in o) {
      if (k === "success" || k === "fail") continue;
      if (k === "money" && typeof o[k] === "number" && o[k] < 0) s += o[k];
      else if (o[k] && typeof o[k] === "object") s += sumNeg(o[k]);
    }
    return s;
  };
  let need = sumNeg(fx);
  if (fx.check && (fx.success || fx.fail)) need += Math.min(sumNeg(fx.success), sumNeg(fx.fail)); // 判定两分支取花费更省者
  if (need < 0 && S.money + need < 0) return true;
  // 物品门槛：fx.item 负数量=消耗，行囊不足则不给（呼应规则19）
  if (fx.item) {
    const m = /^([a-zA-Z]+):(-?\d+)$/.exec(fx.item);
    if (m && +m[2] < 0 && (S.inv[m[1]] || 0) < -m[2]) return true;
  }
  return false;
}
function applyCore(fx) {
  fx = fx || {};
  const out = [];
  const G = [], L = [], NT = []; // 收获 / 损失 / 变数（设定补充：每次选择后明示结算）
  const gain = s => { out.push(s); G.push(s); };
  const loss = s => { out.push(s); L.push(s); };
  const note = s => { out.push(s); NT.push(s); };
  const fmt1 = v => Math.round(v * 10) / 10; // 结算栏一律显示实到账差值（钳制/折算不再显示虚值）
  const num = (k, name, unit) => {
    if (!fx[k]) return;
    if (k === "cult") { // 无功法时修为机缘流失（gainCult 内有提示）
      const prev = S.cult;
      if (gainCult(fx[k])) { const d = fmt1(S.cult - prev);
        if (d > 0) { gain(`修为 +${d}`); if (d !== fx[k]) note(`修为 账面 +${fx[k]}，经灵根/药蚀/心魔折算实得 +${d}`); }
        else note(`修为无实际变动（本境修为已圆满，只待突破）`); }
      return;
    }
    const prev = k === "dao" ? S.daoXin : S[k];
    applyNum(k, fx[k]);
    let d = (k === "dao" ? S.daoXin : S[k]) - prev;
    if (k === "hunger") d = -d; // fx 饱食为正值 = 饿度下降
    d = fmt1(d);
    if (d === 0) { note(`${name} 无实际变动（${k === "hunger" && hasSpecial("bigu") ? "辟谷之躯不纳五谷" : "已达上限/存量不足"}）`); return; }
    const s = `${name} ${d > 0 ? "+" : ""}${d}${unit || ""}`; out.push(s); (d > 0 ? G : L).push(s);
    if (d !== fx[k]) note(`${name} 账面 ${fx[k] > 0 ? "+" : ""}${fx[k]}，实得 ${d > 0 ? "+" : ""}${d}（上限/存量钳制）`);
  };
  function applyNum(k, v) {
    if (k === "money") { S.money = Math.max(0, S.money + v); if (v <= -10 && hasSpecial("yuanchang")) { S.flags.yuanchangDay = S.day; } } // 大冤种：被坑 ≥10 文，三日内必有补偿机缘
    if (k === "stones") S.stones = Math.max(0, S.stones + v);
    if (k === "hp") S.hp = Math.min(hpMax(), S.hp + v); // 气血回复不得溢出上限
    if (k === "sta") S.sta = Math.max(0, Math.min(staMax(), S.sta + v));
    if (k === "mp" && (v < 0 || !(S.jinshuWeak > 0))) S.mp = Math.max(0, Math.min(mpMax(), S.mp + v)); // 禁术虚弱期间蓝锁 0（只锁回复，不锁消耗）
    if (k === "hunger") { if (!hasSpecial("bigu")) S.hunger = Math.max(0, S.hunger - v); }
    if (k === "dao") S.daoXin = Math.max(0, Math.min(100, S.daoXin + v));
    if (k === "xinmo") S.xinmo = Math.max(0, Math.min(100, (S.xinmo || 0) + v));
    if (k === "points") S.points = Math.max(0, S.points + v);
  }
  num("money", "铜钱", " 文"); num("stones", "灵石", " 枚"); num("hp", "气血"); num("sta", "体力");
  num("mp", "法力"); num("hunger", "饱食"); num("cult", "修为"); num("dao", "道心"); num("points", "万象点"); num("xinmo", "心魔");
  if (fx.attr) for (const k in fx.attr) { // 途径一·日常磨炼：日常成长有效
    const prev = S.base[k]; gainAttr(k, fx.attr[k]); const d = fmt1(S.base[k] - prev);
    const nm = { str: "力量", agi: "敏捷", int: "智力", con: "体质" }[k];
    if (d === 0) { note(`${nm} 无实际变动（已至本境磨炼上限）`); continue; }
    const s = `${nm} +${d}`; out.push(s); G.push(s);
    if (d !== fx.attr[k]) note(`${nm} 账面 +${fx.attr[k]}，高基数磨砺递减/加成折算实得 +${d}`);
  }
  if (fx.item) { const m = /^([a-zA-Z]+):(-?\d+)$/.exec(fx.item); if (m) { const id = m[1], n = +m[2];
    if (n > 0 && GONGFU_BY_ID[id] && !(S.inv[id] > 0)) techniqueUnlockFx(id); // 首次获得功法：解锁反哺（谱系通用）
    const prev = S.inv[id] || 0; S.inv[id] = Math.max(0, prev + n); const d = S.inv[id] - prev;
    const nm = (GONGFU_BY_ID[id] ? `《${GONGFU_BY_ID[id].name}》` : null) || {wood:"柴薪",heimu:"黑馍",mianao:"棉袄",shuinang:"水囊",quhanTang:"驱寒汤",huoxiangSan:"藿香正气散",jieduSan:"解毒散",jinchuangYao:"金疮药",shengjiang:"生姜",quzhangcao:"驱瘴草",gancao:"甘草",chaidao:"柴刀",jiansui:"玄铁剑穗",juqiDan:"聚气丹"}[id] || id;
    if (d === 0 && n !== 0) { note(`${nm} 无实际变动（行囊中没有可扣的存量）`); }
    else { const s = `${nm} ${d > 0 ? "+" : ""}${d}`; out.push(s); (d > 0 ? G : L).push(s); } } }
  if (fx.spell) learnSpell(fx.spell); // 具名法术：玉简/传功习得（入法术名册，不占行囊）
  if (fx.clearWood) { S.inv.wood = 0; }
  if (fx.skill) { const m = /^(.+):(-?\d+)$/.exec(fx.skill); if (m) { const cap = TECH_CAPS[m[1]] || 100; const prev = S.skills[m[1]] || 0; S.skills[m[1]] = Math.min(cap, prev + (+m[2])); checkSkillMilestone(m[1]); const d = S.skills[m[1]] - prev;
    if (d === 0 && +m[2] !== 0) note(`技艺「${m[1]}」无实际变动（已至技艺上限）`);
    else { const s = `技艺「${m[1]}」 ${d > 0 ? "+" : ""}${d}`; out.push(s); (d > 0 ? G : L).push(s); } } }
  if (fx.wx) { const m = /^(jin|mu|shui|huo|tu):(-?\d+)$/.exec(fx.wx); if (m) { const wx = wxOf(); const prev = wx[m[1]]; wx[m[1]] = Math.min(100, Math.max(0, prev + (+m[2]))); const d = wx[m[1]] - prev;
    if (d === 0 && +m[2] !== 0) note(`${WX_NAMES[m[1]]}行亲和无实际变动（已达 0/100 边界）`);
    else { const s = `${WX_NAMES[m[1]]}行亲和 ${d > 0 ? "+" : ""}${d}`; out.push(s); (d > 0 ? G : L).push(s); } } } // 后天亲和，可破先天总和
  if (fx.flag) { // 旗标先于缘分入账：缘分突破（bondbreak_）与缘分同帧结算时解锁先生效，方不被 ±80 天花板 ×0.1 衰减误伤
    S.flags[fx.flag] = 1;
    if (typeof fx.flag === "string" && fx.flag.indexOf("bondbreak_") === 0)
      sys(`【缘分突破】与「${fx.flag.slice(10)}」经此一事，这段缘分已非凡俗尺度可限——自此可向 ±100 推进。`);
  }
  if (fx.npc) for (const n in fx.npc) { // 剧情选项中的善缘属「日常行为」：同一 NPC 每日只入账一次（任务酬谢等特殊剧情走 special 通道）
    const bb = typeof fx.flag === "string" && fx.flag.indexOf("bondbreak_") === 0; // 缘分突破大剧情：特殊通道，不受每日一次限制
    const prev = S.npc[n] || 0; addNpc(n, fx.npc[n], { daily: fx.npc[n] > 0, special: bb }); const d = fmt1((S.npc[n] || 0) - prev);
    if (d === 0 && fx.npc[n] !== 0) { note(`与「${n}」缘分无实际变动（今日已记账/已达瓶颈）`); continue; }
    const s = `${n} 缘分 ${d > 0 ? "+" : ""}${d}`; out.push(s); (d > 0 ? G : L).push(s);
    if (d !== fx.npc[n]) note(`${n} 缘分 账面 ${fx.npc[n] > 0 ? "+" : ""}${fx.npc[n]}，性格/传播/递减折算实得 ${d > 0 ? "+" : ""}${d}`);
  }
  if (fx.pet) { S.flags["pet_" + fx.pet] = 1; gain(`「${fx.pet}」缔结灵宠之缘（认魂不认人，缘分至生死之交可跨世等候）`); }
  if (fx.drop) { S.mats = S.mats || {}; S.mats[fx.drop] = (S.mats[fx.drop] || 0) + 1; gain(`获得材料「${fx.drop}」（一身是宝，硬通货——可在收购/炼丹/炼器剧情中折算）`); }
  if (fx.slay) { // 猎杀有灵众生：道心受损、死仇钉死、认魂断绝
    S.daoXin = Math.max(0, Math.min(100, (S.daoXin || 0) - 2)); // 杀有灵智者，道心必颤（无杀孽计数，罪在道心）
    S.npc[fx.slay] = -100;
    S.npcMin = S.npcMin || {};
    if (S.npcMin[fx.slay] == null || -100 < S.npcMin[fx.slay]) S.npcMin[fx.slay] = -100;
    delete S.flags["pet_" + fx.slay]; delete S.flags["soulpet_" + fx.slay];
    let soulCut = "";
    if (typeof META !== "undefined" && META.soulPets && META.soulPets.includes(fx.slay)) {
      META.soulPets.splice(META.soulPets.indexOf(fx.slay), 1); saveMeta();
      soulCut = "——它曾认你之魂，跨世的羁绊就此断绝";
    }
    chronicle(`猎杀「${fx.slay}」取材`, "npc");
    gain(`猎杀「${fx.slay}」取材${soulCut}（材料可入账折现）`);
    loss(`道心 -2——剑上沾了通灵之血；与「${fx.slay}」一族结下不死不休之死仇，寻仇或在来日`);
  }
  if (fx.job) { S.mainJob = String(fx.job).replace(/[|｜]/g, "").trim().slice(0, 12); sys(`【名分】自今日起，世人提起你，有了新的称呼——「${S.mainJob}」。（人物页 · 主职业已更新）`); } // 主职业由 GM 依功法/宗门取名（引擎回退见 mainJobTitle）
  if (fx.ach) { if (typeof fx.ach === "string" && ACHIEVEMENTS[fx.ach]) gainAch(fx.ach); else if (typeof fx.ach === "object" && fx.ach && fx.ach.name) { gainDynAch(fx.ach); gain(`千秋录新刻「${fx.ach.name}」`); } }
  if (fx.newcard) { const c = gainDynCard(fx.newcard); if (c) gain(`新词条「${c.name}」入手（${TIERS[c.tier].name}）——${c.eff}`); }
  if (fx.fabao) { const d = Object.assign({}, fx.fabao, { name: String(fx.fabao.name || "").slice(0, 6) + "·法宝", eff: "【法宝·已认主入体】" + fx.fabao.eff }); const c = gainDynCard(d); if (c) gain(`法宝「${fx.fabao.name}」认主（${TIERS[c.tier].name}）——系统将其效力折算入命格（天机独闻，旁人之眼只见你气息微变）`); }
  if (fx.wuqi) { const m = /^([^|｜]{1,8})[|｜](-?\d{1,2})[|｜]([^|｜]{1,4})$/.exec(String(fx.wuqi)); if (m) { S.gear = S.gear || {}; S.gear.weapon = { name: m[1].trim(), baseDmg: 0, q: m[3].trim(), dmgP: Math.max(1, Math.min(40, +m[2])) }; computeMods(); gain(`随身兵器「${S.gear.weapon.name}」（${S.gear.weapon.q} · 攻伐 +${S.gear.weapon.dmgP}%）`); } }
  if (fx.card) { const r = pullOnce(1); gain(`天降词条「${r.card.name}」（${TIERS[r.t].name}）`); }
  if (fx.luckCharm) { S.tempLuckDays = Math.max(S.tempLuckDays, fx.luckCharm * 2); gain(`气运临时 +1（数日）`); }
  if (fx.coincidence) {
    S.flags.coincidence = (S.flags.coincidence || 0) + fx.coincidence;
    if (S.flags.coincidence >= 3) gainAch("hidden");
    note(`【你留意到这处「巧合」——棋盘似乎比你想象的大。】`);
  }
  // ---------- 连续性引子：挑一条最值得一记的后果，留给下一场景 ----------
  if (!S.echoLine) {
    if (fx.item) {
      const id = (String(fx.item).split(":")[0]) || "";
      const gf = GONGFU_BY_ID[id];
      if (gf && S.inv[id] > 0) S.echoLine = `怀里新得的《${gf.name}》，你还不敢相信是真的。`;
      else if (["jiansui", "mianao", "chaidao"].includes(id) && S.inv[id] > 0)
        S.echoLine = `怀里新得的${{ jiansui: "玄铁剑穗", mianao: "老棉袄", chaidao: "柴刀" }[id]}，你还不敢相信是真的。`;
    }
    if (!S.echoLine && fx.npc) for (const n in fx.npc) {
      if (fx.npc[n] >= 15) { S.echoLine = `${n}的事，你还搁在心里。`; break; }
      if (fx.npc[n] <= -15) { S.echoLine = `${n}临去时的眼神，让你后颈发凉。`; break; }
    }
    if (!S.echoLine && fx.money && fx.money < 0 && S.money < 8) S.echoLine = `荷包瘪了下去。雪天里，铜板比脸面重要。`;
    if (!S.echoLine && fx.hp && fx.hp <= -3) S.echoLine = `伤处的疼一阵紧似一阵，你咬着牙没吭声。`;
  }
  out.gains = G; out.losses = L; out.notes = NT;
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
  if (out.length) { // 选择后即时结算：收获 / 损失 / 变数 三栏对照（设定补充）
    const g = out.gains || [], l = out.losses || [], nt = out.notes || [];
    const row = (cls, tag, arr) => arr.length ? `<div class="fxl-row ${cls}"><b>${tag}</b><span>${arr.join("；")}</span></div>` : "";
    log(`<div class="fx-ledger">${row("g", "收获", g)}${row("l", "损失", l)}${row("n", "变数", nt)}</div>`);
  }
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

/* ---------- 三日历练：每三天必触发一次实力机缘 ----------
   玩家设定：剧情不推进、实力不涨不行——每 3 天必须出现一次可提升
   五维 / 功法 / 武技的剧情机缘。AI 模式由提示词要求它编排历练剧情，
   此处为引擎兜底：到期回合无论剧情来源，置顶注入历练选项。 */
const TRAIN_GAP = 3;
function trainDue() { return !S.over && S.day - (S.lastTrainDay || 0) >= TRAIN_GAP; }
function injectTraining(choices) {
  const gap = S.day - (S.lastTrainDay || 0);
  sys(`【三日之期】距上次砥砺已 ${gap} 日。风雪深处，有一次变强的机缘在等你——这一次，别错过。`);
  choices.unshift({ label: `【历练】抓住变强的机缘（已搁置 ${gap} 日）`, hint: "三日之期已至：五维、功法、武技，必有所得。", cls: "quest", free: true,
    fn: () => { S._choiceSet = false; trainingEvent(); } });
}
function trainingEvent() {
  S.lastTrainDay = S.day;
  S.sta = Math.max(0, S.sta - 2);
  let trainNote = null; // 历练之机：三个分支各自记账，喂给下一回合 AI 提示词与离线引擎（用完即焚）
  const ownedGf = GONGFU.filter(g => (S.inv[g.id] || 0) > 0).sort((a, b) => b.tier - a.tier);
  const hasGongfa = ownedGf.length > 0;
  const sk = hasGongfa ? ownedGf[0].name : "乱拳";
  const cap = TECH_CAPS[sk] || 100;
  const roll = Math.random() * 100;
  if (hasGongfa && roll < 40) {
    /* 功法精研（多线同修：兼修两门时各得 ÷n，摸鱼圣手减罚为 ÷√n） */
    const wxm = wxTrainMult(sk);
    const bothTech = ownedGf.length >= 2;
    const split = bothTech ? (hasSpecial("moyu") ? 1 / Math.SQRT2 : 0.5) : 1;
    const inc = Math.round((4 + Math.random() * 4) * (1 + (S.mods.trainP || 0) / 100) * wxm * split * 10) / 10;
    const tTechs = bothTech ? ownedGf.slice(0, 2).map(g => g.name) : [sk];
    for (const t of tTechs) { S.skills[t] = Math.min(TECH_CAPS[t] || 100, (S.skills[t] || 0) + inc); checkSkillMilestone(t); }
    const cultBase = { 0: 4, 1: 6, 2: 10, 3: 18, 4: 36 }[ownedGf[0].tier] || 6; // 高阶功法吞吐灵气更盛
    gainCult(cultBase * wxm); gainAttr("str", 0.05);
    log(`【历练 · 功法精研】你寻了处背风的石窝，把「${bothTech ? tTechs.join("与") : sk}」一式一式拆开重练。雪沫被劲气卷起，又纷纷落下。`, "dim");
    sys(`【功法精研】${bothTech ? "双功同修（" + (hasSpecial("moyu") ? "摸鱼减罚 ÷√2" : "多线分心 ÷2") + "），各" : "「" + sk + "」"}熟练度 +${inc}（${tTechs.map(t => `${t} ${Math.round(S.skills[t])}/${TECH_CAPS[t] || 100}`).join("、")}），修为 +${Math.round(cultBase * wxm)}，力量 +0.05。`);
    trainNote = { kind: "功法精研", techs: tTechs, inc, nearCap: tTechs.some(t => (S.skills[t] || 0) >= (TECH_CAPS[t] || 100) - 15) };
  } else if (roll < (hasGongfa ? 80 : 70)) {
    /* 五维打熬 */
    const pickAttr = [["str", "力量"], ["agi", "敏捷"], ["int", "智力"], ["con", "体质"]][Math.floor(Math.random() * 4)];
    const amt = Math.round((0.1 + Math.random() * 0.1) * 100) / 100;
    const scenes = {
      str: `【历练 · 熬力】你替卖炭婆把整车炭推过石桥，又抡了半个时辰的石锁。掌心火辣辣地疼——但臂膀里，力气在长。`,
      agi: `【历练 · 腾挪】你在覆雪的屋脊间腾挪起落，追着一道灰影穿过半座城。落地时膝弯一软，随即站稳——身法快了一丝。`,
      int: `【历练 · 明悟】你在茶楼外立了整整一个时辰，把柳先生那段「仙陨之战」从头到尾记下，回去对着雪光默诵三遍。心里透亮了一块。`,
      con: `【历练 · 淬体】你凿开冰面，把身子埋进刺骨的河水数息再冲出。牙齿打着颤，血脉却像被打通了——寒气再侵不进半分。`,
    };
    gainAttr(pickAttr[0], amt);
    if (hasGongfa) gainCult(2); // 未修功法者不懂吐纳炼化——打熬只长筋骨，不长修为
    log(scenes[pickAttr[0]], "dim");
    sys(`【五维打熬】${pickAttr[1]} +${amt}${hasGongfa ? "，修为 +2" : ""}。`);
    trainNote = { kind: "五维打熬", attr: pickAttr[0], attrName: pickAttr[1], amt };
  } else {
    /* 武技磨砺 */
    const inc = 3 + Math.floor(Math.random() * 4);
    S.skills["乱拳"] = Math.min(TECH_CAPS["乱拳"] || 100, (S.skills["乱拳"] || 0) + inc);
    gainAttr("str", 0.08);
    if (hasGongfa) gainCult(2); // 未修功法者不懂吐纳炼化——磨砺只长拳路与力气，不长修为
    log(`【历练 · 武技】你对着庙后老槐树出拳一千次。树皮上的霜震落又凝上，拳面渗血，拳路却越来越直。`, "dim");
    sys(`【武技磨砺】「乱拳」熟练度 +${inc}（${Math.round(S.skills["乱拳"])}/${TECH_CAPS["乱拳"] || 100}），力量 +0.08${hasGongfa ? "，修为 +2" : ""}。`);
    checkSkillMilestone("乱拳");
    trainNote = { kind: "武技磨砺", inc };
  }
  if (trainNote) S.trainScene = Object.assign({ slot: S.slot, day: S.day }, trainNote);
  S.stats.trains = (S.stats.trains || 0) + 1;
  computeMods(); renderPanel(); advanceSlot();
}

/* ---------- special 动作 ---------- */
// 远行脚程（第五章）：境界越高，日行越远——灵阶(7) 6 日，玄阶(13) 4 日，地阶(19) 3 日
function travelDaysFor(key) { return S.realm >= 19 ? 3 : S.realm >= 13 ? 4 : 6; }
/* 断灵大劫 · 劫数进度（第一章：按周期推算，不远了）——0 无感 ｜ 1 风起（120 日）｜ 2 灵物贵（240 日）｜ 3 走火众（360 日）｜ 4 大劫前夜（480 日）。
   终结进食（devourSlain）后劫云散去：归 0，只留「天地一轻」的余韵。 */
function doomLevel() {
  if (!S || S.flags.devourSlain) return 0;
  return S.day >= 480 ? 4 : S.day >= 360 ? 3 : S.day >= 240 ? 2 : S.day >= 120 ? 1 : 0;
}
function runSpecial(sp, fx) {
  if (sp.indexOf("end:") === 0) { // 终局抉择（第十一章 · 五结局）：由终局场景给出，endGame 结算
    const kind = sp.slice(4);
    if (ENDINGS[kind] && !S.flags.endingDone) { S.flags.endingDone = kind; endGame(kind); }
    return;
  }
  if (sp.indexOf("travel:") === 0) {
    const key = sp.slice(7);
    const rg = REGIONS[key];
    if (!rg || !REGION_HUBS[key]) { advanceSlot(); return; }
    const days = travelDaysFor(key);
    S.travel = { to: key, left: days };
    sys(`【远行】你收拾行囊，离开${regionOf(S.place).name}，踏上前往${rg.name}的驿道——约 ${days} 日脚程。`);
    chronicle("启程前往" + rg.name, "evt");
    advanceSlot(); return;
  }
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
    const laborM = hasSpecial("niuma") ? 1.5 : 1; // 先天牛马圣体：劳作磨炼收益 +50%
    const w = Math.round((1 + (attr("str") >= 4 ? 1 : 0) + (S.inv.chaidao ? 1 : 0) + ((S.skills["伐木"] || 0) >= 50 ? 1 : 0)) * laborM);
    S.inv.wood += w; gainAttr("str", Math.round(0.09 * laborM * 100) / 100); gainCult(2.5); S.sta = Math.max(0, S.sta - 3);
    log(`你在矮林里忙了一个${["晨", "午", "昏", "夜"][S.slot]}，柴薪 +${w}。臂膀酸胀——【力量】在缓慢增长。`, "dim");
    advanceSlot();
  } else if (sp === "rest") {
    S.hp = Math.min(hpMax(), S.hp + 3);
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
    /* 打坐：无锁定则吐纳静心（旧行为）；面板参悟入口传 fx.focus=功法名 → 按设定公式涨该功法熟练（fx.teacher=讨教 NPC ×1.5） */
    S.stats.meditates++;
    const focus = fx && fx.focus;
    const teacher = fx && fx.teacher;
    if (focus) {
      const mt = GONGFU_BY_NAME[focus]; const ak = mt ? mt.fb.a : "str";
      const coef = (fx && fx.coef) || medStateCoef();
      const wxm = focus === "乱拳" ? 1 : wxTrainMult(focus);
      const inc = Math.round(6 * (attr(ak) / (REALM_ATTR_BASE[S.realm] || 5)) * coef * (1 + (S.mods.trainP || 0) / 100) * wxm * (teacher ? 1.5 : 1) * 10) / 10;
      S.skills[focus] = Math.min(TECH_CAPS[focus] || 100, (S.skills[focus] || 0) + inc);
      checkSkillMilestone(focus);
      const cultBase = mt ? ({ 0: 2, 1: 5, 2: 9, 3: 15, 4: 30 }[mt.tier] || 2) : 2;
      const cultGain = cultBase * wxm * (teacher ? 1.5 : 1) * 0.5;
      gainCult(cultGain);
      let spLine = "";
      const sp0 = (S.realm >= 5) ? knownSpells()[0] : null; // 参悟法术：神识内视，已习法术的关窍随之透亮
      if (sp0) { const sinc = Math.round(inc * 0.4 * 10) / 10; S.spells[sp0.id] = Math.min(spellCap(sp0), spellProf(sp0.id) + sinc); spLine = `；「${sp0.name}」法术熟练 +${sinc}`; }
      if (teacher) addNpc(teacher, 2, { special: true }); // 讨教结缘
      // 修行记事：喂给下一回合的 AI 提示词与离线引擎，生成参悟/讨教专属后续剧情（用完即焚，不空转）
      S.medScene = { kind: teacher ? "讨教" : "独悟", focus, teacher: teacher || "", inc, slot: S.slot, day: S.day, nearCap: (S.skills[focus] || 0) >= (TECH_CAPS[focus] || 100) - 15 };
      log(teacher ? `你带着「${focus}」中三处想不通的关隘去寻「${teacher}」。对方听完你的比划，拈须点拨数语——如拨云见月。你当即依言独坐，将那数语在识海里翻来覆去地参。`
        : `你寻了处背风清净地，盘膝坐下，于识海中一遍一遍拆解「${focus}」的关窍。一个时辰倏忽而过。`, "dim");
      sys(`【参悟】「${focus}」熟练度 +${inc}（${Math.round(S.skills[focus])}/${TECH_CAPS[focus] || 100}），修为 +${Math.round(cultGain)}${spLine}。涨幅拆解：${{ str: "力量", agi: "敏捷", int: "智力", con: "体质" }[ak]} ${attr(ak)} ÷ 境界基准 ${REALM_ATTR_BASE[S.realm]} × 状态系数 ${coef}${wxm !== 1 ? ` × 五行契合 ${wxm}` : ""}${(S.mods.trainP || 0) ? ` × 悟性 ${1 + S.mods.trainP / 100}` : ""}${teacher ? " × 讨教 1.5" : ""}${teacher ? `。「${teacher}」缘分 +2` : ""}`);
    } else {
      gainCult(8); gainAttr("int", 0.03);
      log(`你五心朝天，感一丝凉意自鼻尖沉入丹田。灵气潮汐正涨。`, "dim");
    }
    if ((S.xinmo || 0) > 0) { addXinmo(-2); if (xinmoStage().name === "心境清明") log(`杂念尽去，灵台一片清明。`, "good"); }
    if (S.realm >= 5 && !(S.jinshuWeak > 0)) S.mp = Math.min(mpMax(), S.mp + mpMax() * 0.2 * (S.linggen === "za" ? 1.5 : 1)); // 杂灵根：回蓝 ×1.5；禁术虚弱期间蓝锁 0
    if (Math.random() < attr("luck") * 0.015) { gainCult(20); sys(`【顿悟】灵光毫无预兆地炸开，修为大涨一截！`); }
    S.sta = Math.max(0, S.sta - (focus ? 3 : 0)); // 参悟耗神三分；纯吐纳不耗
    advanceSlot();
  } else if (sp === "seeDoctor") {
    /* 寻医诊治（AI 剧情可给出的治病路径；30 文，药到病除） */
    if (S.money < 30) { log("你摸遍全身也凑不出诊金，只能干熬。", "hurt"); advanceSlot(); return; }
    S.money -= 30;
    if (S.ill) { sys(`【诊治】郎中指法老辣，一剂汤药下去，【${S.ill.name}】症结解开。`); S.ill = null; }
    else sys(`【诊治】郎中替你活络了经脉。无大恙。`);
    S.hp = Math.min(hpMax(), S.hp + 8);
    log("药香里，你长长舒了一口气。气血 +8。", "good");
    advanceSlot();
  } else if (sp === "sectGong") {
    /* 宗门贡献入账（宗门日常）：贡献是外门弟子的第二货币——藏经阁兑换、内门门路都从这里出 */
    const n = Math.max(1, Math.min(10, fx.num || 1));
    S.sectGong = (S.sectGong || 0) + n;
    sys(`【宗门贡献 +${n}】账上共 ${S.sectGong} 点（藏经阁可兑丹药/指点/内门推荐）。`);
    delete S.flags.dianmaoToday;
  } else if (sp === "sectSkip") {
    S.flags.dianmaoMiss = (S.flags.dianmaoMiss || 0) + 1;
    log(`你在卯簿上缺了一画。${(S.flags.dianmaoMiss >= 3) ? "执事房的人已经在打听你了——" : ""}（本月缺卯 ${S.flags.dianmaoMiss} 次${S.flags.dianmaoMiss >= 3 ? "，月供减半" : ""}）`, S.flags.dianmaoMiss >= 3 ? "hurt" : "dim");
  } else if (sp === "sectBuy") {
    /* 藏经阁兑换：扣贡献，给对应物（fx.item / fx.skill / fx.flag 由场景给出） */
    const cost = fx.num || 0;
    if ((S.sectGong || 0) < cost) { toast("贡献不足。"); advanceSlot(); return; }
    S.sectGong -= cost;
    sys(`【藏经阁】贡献 -${cost}（余 ${S.sectGong}）。`);
  } else if (sp === "sectClearMiss") {
    S.flags.dianmaoMiss = 0;
    sys(`【卯簿勾销】缺卯之账一笔勾销——月初放饷不再减半。`);
  } else if (sp === "castduel") {
    /* 名录人物讨教（世界角色谱 · boss 线）：切磋点到为止——胜则刮目相看，败亦受教 */
    const c = (typeof CAST_BY_ID !== "undefined") ? CAST_BY_ID[fx.castId] : null;
    if (!c) { advanceSlot(); return; }
    if (typeof castMeet === "function") castMeet(c); // 上台即是结识
    combat({ name: c.name, power: 6 + c.realm * 6, canBeg: false, desc: `（${c.title} · ${REALM_NAMES[c.realm]}——切磋讨教，点到为止）` }, res => {
      if (res === "win" || res === "cheated") {
        addNpc(c.name, 15, { special: true }); S.points += 5; S.daoXin = Math.min(100, S.daoXin + 1);
        sys(`【讨教 · 胜】${c.name}收了势，重新打量你：「有点东西。」（缘分 +15，万象点 +5）`);
        log("这一架点到为止——但「点到」的分量，彼此都清楚。", "good");
        try { chronicle(`讨教胜过「${c.name}」`, "evt"); } catch (e) {}
      } else {
        addNpc(c.name, 3, { special: true });
        log(`${c.name}收了九成力，你还是没撑过十招。「差得远，但敢上台——这一条就强过多数人。」（缘分 +3）`, "dim");
      }
      if (!S.over) advanceSlot();
    });
  } else if (sp === "neimenKaohe") {
    /* 宗门内门考核（功法谱系 · 宗门线 2 阶）：灵阶弟子演武较技，胜则授内门真传 */
    const g2 = (typeof GONGFU !== "undefined") ? GONGFU.find(g => g.line === "sect" && g.tier === 2 && g.sect === S.sect && !(S.inv[g.id] > 0)) : null;
    if (!g2) { advanceSlot(); return; }
    const rec = !!S.flags.neimenRec; // 藏经阁贡献推荐：教习手下留两分情面
    combat({ name: `${S.sect}内门教习`, power: rec ? 40 : 60, canBeg: false, desc: "（内门考核，点到为止）" }, res => {
      if (res === "win" || res === "cheated") {
        S.inv[g2.id] = 1; techniqueUnlockFx(g2.id); computeMods();
        S.flags.neimen = 1; // 内门弟子：月供加倍，外门俗务不再
        sys(`【内门考核 · 过】你自此是${S.sect}内门弟子——传功长老亲授《${g2.name}》。`);
        log("教习收势，拱手：「好俊的根基。内门有你一号。」", "good");
        try { chronicle(`通过${S.sect}内门考核，得授《${g2.name}》`, "quest"); } catch (e) {}
        gainAch("quest1");
      } else {
        log("教习摇摇头：「火候差一线。回去再练练——明年台子还在这。」", "hurt");
      }
      if (!S.over) advanceSlot();
    });
  } else if (sp === "train") {
    /* 演练：以所持最高阶功法为主修；兼持多门则两功同修（多线分心各得半份）——谱系通用（data.js GONGFU） */
    const owned = GONGFU.filter(g => (S.inv[g.id] || 0) > 0).sort((a, b) => b.tier - a.tier);
    const tTechs = owned.length ? owned.slice(0, 2).map(g => g.name) : ["乱拳"];
    const sk = tTechs[0];
    const mainG = GONGFU_BY_NAME[sk];
    const wxm = wxTrainMult(sk); // 功法五行修炼速度 = 1 + 亲和×0.005；亲和 <10 强行修炼减半
    const bothTech = tTechs.length >= 2;
    const split = bothTech ? (hasSpecial("moyu") ? 1 / Math.SQRT2 : 0.5) : 1; // 摸鱼圣手：多线惩罚 ÷n 变 ÷√n
    const inc = Math.round(8 * (1 + (S.mods.trainP || 0) / 100) * wxm * split * 10) / 10;
    for (const t of tTechs) { S.skills[t] = Math.min(TECH_CAPS[t] || 100, (S.skills[t] || 0) + inc); checkSkillMilestone(t); }
    const cultBase = mainG ? { 0: 4, 1: 7, 2: 12, 3: 20, 4: 40 }[mainG.tier] || 4 : 4; // 高阶功法吞吐灵气更盛
    gainCult(cultBase * wxm); gainAttr("str", 0.05); S.sta = Math.max(0, S.sta - 2);
    log(`你依着口诀演练「${bothTech ? tTechs.join("·") + "合参" : sk}」（${tTechs.map(t => `${t} ${Math.round(S.skills[t])}/${TECH_CAPS[t] || 100}`).join("、")}）${bothTech ? "——多线分心，各得半份" + (hasSpecial("moyu") ? "（摸鱼减罚 ÷√2）" : "") : ""}。${TECH_EL[sk] ? `此功法属${WX_NAMES[TECH_EL[sk]]}行，你的亲和 ${wxOf()[TECH_EL[sk]] || 0}${wxm < 1 ? "——亲和不足，事倍功半。" : wxm > 1 ? "——亲和加持，修行顺势。" : "。"}` : "气血随招式流转。"}`, "dim");
    advanceSlot();
  } else if (sp === "nighttrain") { // 夜间固定选项：打坐修炼（设定：灵阶起打坐替代睡眠，故灵阶起无睡眠代价）
    const owned = ownedTechs();
    const tTechs = owned.length ? owned.slice(0, 2).map(g => g.name) : ["乱拳"];
    const sk = tTechs[0];
    const wxm = sk === "乱拳" ? 1 : wxTrainMult(sk);
    const bothTech = tTechs.length >= 2;
    const split = bothTech ? (hasSpecial("moyu") ? 1 / Math.SQRT2 : 0.5) : 1;
    const inc = Math.round(6 * (1 + (S.mods.trainP || 0) / 100) * wxm * split * 10) / 10;
    for (const t of tTechs) { S.skills[t] = Math.min(TECH_CAPS[t] || 100, (S.skills[t] || 0) + inc); checkSkillMilestone(t); }
    const gd = GONGFU_BY_NAME[sk];
    const cultBase = gd ? { 0: 2, 1: 5, 2: 9, 3: 15, 4: 30 }[gd.tier] || 2 : 2;
    gainCult(cultBase * wxm);
    gainAttr(gd ? gd.fb.a : "str", 0.03);
    const ling = S.realm >= 7;
    if (ling && !(S.jinshuWeak > 0)) S.mp = Math.min(mpMax(), S.mp + mpMax() * 0.2 * (S.linggen === "za" ? 1.5 : 1)); // 灵阶：打坐代眠，法力亦随吐纳回补；禁术虚弱期间蓝锁 0
    S.flags.meditateTonight = 1; // 睡不安稳（灵阶起无妨）
    log(`万籁俱寂。你就着残雪月色行功，吐纳绵绵，直至东方泛白。`, "dim");
    sys(`【夜修】${bothTech ? tTechs.join("·") + "合参（" + (hasSpecial("moyu") ? "摸鱼减罚 ÷√2" : "多线分心 ÷2") + "），各" : "「" + sk + "」"}熟练度 +${inc}（${tTechs.map(t => `${t} ${Math.round(S.skills[t])}/${TECH_CAPS[t] || 100}`).join("、")}），修为 +${Math.round(cultBase * wxm)}${ling ? "。灵阶之躯，打坐即是睡眠——今夜无亏。" : "。代价：睡不安稳——今夜恢复减半，明日睡眠不足（智力敏捷 -10%、体力不满）。"}`);
    advanceSlot();
  } else if (sp === "gamble") {
    S.stats.gambles++;
    S.money -= 10;
    if (Math.random() < 0.25 + attr("luck") * 0.03) { const g = 15 + Math.floor(Math.random() * 10); S.money += g; log(`骰子落定——你赢了 ${g} 文！庄家脸黑得像锅底。`, "good"); } // 赌坊十赌九输：气运高者才博个微利
    else if (hasSpecial("yuanchang")) { S.flags.yuanchangDay = S.day; log(`输光了。但你摸了摸胸口——【大冤种】的账，天道记着：三日之内，必有一桩补偿机缘。`, "dim"); } // 被坑记账，夜间结算补偿
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
  } else if (sp === "shutong") { // 疏通经脉：点脉换修为感悟——灵根天定不可改（设定铁律三），改的是通畅，不是命
    const cost = tradePrice("瞎眼老者", 50); // 交易让利（第四章·2）：缘分定价格
    if (S.money < cost) { log(`你摸遍全身也凑不够 ${cost} 文。瞎眼老者叹了口气：「缘分不够，铜钱来凑。」`, "dim"); advanceSlot(); return; }
    S.money -= cost;
    const n = S.shutong || 0;
    const rate = [10, 25, 40, 60][Math.min(n, 3)];
    S.shutong = n + 1;
    if (Math.random() * 100 < rate) {
      S.hp = Math.max(1, S.hp - 8); S.daoXin = Math.max(0, S.daoXin - 1);
      log(`<span style="color:var(--blood-hi)">点脉失败——指尖真气走错经脉，胸口像挨了一锤。【气血 -8，道心 -1】</span>`);
      chronicle("瞎眼老者点脉失败，经脉受创", "evt");
    } else {
      const el = dominantWxEl(), wx = wxOf();
      wx[el] = Math.min(100, (wx[el] || 0) + 2); // 后天亲和微调（亲和可后天挪移，灵根资质不可动）
      gainCult(15);
      sys(`【疏通经脉 · 成】闭塞的支脉被一根根点开，${WX_NAMES[el]}行亲和 +2——灵根是天定的，路是自己走的。`);
      chronicle("瞎眼老者点脉疏通经脉，修为有感", "evt");
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
    if (r.success) { const g = Math.round((5 + Math.floor(Math.random() * 8)) * (hasSpecial("xiexiu") ? 1.5 : 1)); S.money += g; log(`你指尖一勾，对方的荷包到了你手里（+${g} 文${hasSpecial("xiexiu") ? "，【邪修】甜也 ×1.5" : ""}）。三只手的行当，三只手的因果。`, "dim"); S.daoXin -= 1; }
    else { const lose = Math.min(S.money, 4); S.money -= lose; log(`手生，被对方察觉，反丢了 ${lose} 文。`, "hurt"); }
    advanceSlot();
  } else if (d === "trace") {
    S.flags.coincidence = (S.flags.coincidence || 0) + 1;
    if (S.flags.coincidence >= 3) gainAch("hidden");
    log((S.inv.jiansui > 0)
      ? `你循迹查到城隍庙后墙，只找到一枚不该出现在此处的上古铜钱——纹路，和你怀里那枚玄铁剑穗隐隐共鸣。`
      : `你循迹查到城隍庙后墙，只找到一枚不该出现在此处的上古铜钱——纹路古拙，不似本朝之物。`, "dim");
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
  if (hasSpecial("laosou") && S.flags.laosouBounty) { // 虐菜过多：真正的强者寻上门（战力 +15%）
    delete S.flags.laosouBounty;
    enemy = Object.assign({}, enemy, { power: Math.round(enemy.power * 1.15) });
    sys(`【老叟戏顽童 · 报应】你欺凌弱小的名声传了出去——有位真正的强者，循声寻来了。（对方战力 +15%）`);
  }
  if (hasSpecial("pofang") && enemy.power > 1) { // 破防了：开战前戳中痛处，对方战力 -8%
    enemy = Object.assign({}, enemy, { power: Math.max(1, Math.round(enemy.power * 0.92)) });
    sys(`【破防了】兵刃未交，你先一句话戳中了它的痛处——对方气息一乱，方寸尽失。（战力 -8%）`);
  }
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
  const seen = ratio <= 1.2; // 可见规则（第十二章）：目标常态战力 ≤ 你的 1.2 倍才显示数字；超过则深不可测，系统建议：跑
  log(`<div class="foe-info"><b>${enemy.name}</b>${enemy.desc || ""}<br>${seen
    ? `战力约 ${enemy.power} ｜ ${WX_NAMES[eEl]}行 ｜ 对比你：${cmp}<br><span class="dim">五维评估：力≈${est[0]} 敏≈${est[1]} 智≈${est[2]} 体≈${est[3]}（推演所得，或有偏差）</span><br><span class="dim">${wxHint} ｜ 你的战力：${displayPower()}</span>`
    : `<span style="color:var(--blood-hi)">【？？？】深不可测——系统评估拒绝给出数字，只回了两个字：快跑。</span><br><span class="dim">你的战力：${displayPower()} ｜ 对手远在你感知之外</span>`}</div>`);
  setChoices(combatOpts(enemy, done));
}
/* 战斗选项：战/逃/智取/求饶 + 施法（具名法术：耗法力，威力 = 基础 × 智力系数 × 存量系数） */
function combatOpts(enemy, done) {
  const opts = [
    { label: "战！", hint: "狭路相逢。", fn: () => resolveCombat(enemy, "fight", done) },
    { label: "逃", hint: `敏捷 ${attr("agi")}，跑赢就算赢。`, fn: () => resolveCombat(enemy, "flee", done) },
  ];
  if (attr("int") >= 4) opts.push({ label: "智取", hint: "战局推演：找它的破绽。", fn: () => resolveCombat(enemy, "trick", done) });
  opts.push({ label: "护体", hint: "稳守门户：承伤 ×0.6，己伤 ×0.85。", fn: () => resolveCombat(enemy, "guard", done) }); // 护体：防守反击姿态
  if (attr("agi") >= 6 && attr("int") >= 6) opts.push({ label: "打断", hint: "敏智判定：成则敌方先失一手（开场不还击）；败则白挨一记。", fn: () => resolveCombat(enemy, "interrupt", done) }); // 打断：抢攻其行气节点
  if (enemy.canBeg) opts.push({ label: "求饶", hint: "尊严换命，有时值。", fn: () => resolveCombat(enemy, "beg", done) });
  const known = knownSpells();
  if (S.realm >= 5 && known.length) opts.push({ label: "施法", hint: `具名法术 ${known.length} 门 ｜ 法力 ${Math.round(S.mp)}/${mpMax()}。`, fn: () => spellMenu(enemy, done) });
  return opts;
}
/* 施法菜单：类型/主属性/消耗三标签（设定·技能面板）；法力不足可强行催动（遭反噬）；禁术红框、三次确认 */
function spellMenu(enemy, done) {
  const opts = knownSpells().map(sp => {
    if (sp.kind === "jinshu") { // 禁术：代价前置展示，释放前系统三次确认（设定·禁术节）
      const can = sp.jsKind !== "ranfa" || S.mp > 0; // 燃法须有余蓝可倾
      return { label: `【禁术】「${sp.name}」`,
        hint: `${sp.tierName} ｜ 代价：${sp.cost} ｜ 威力≈${spellPowerJinshu(sp)}${can ? "" : "——法力空空，无蓝可倾"}`,
        fn: () => can ? jinshuConfirm(enemy, sp, done, 1) : undefined };
    }
    const can = S.mp >= sp.mp;
    return { label: `「${sp.name}」`,
      hint: `${sp.tierName} · ${sp.el ? WX_NAMES[sp.el] + "行" : "五行皆转"} · 耗法 ${sp.mp} ｜ 主属性：智力 ｜ 威力≈${spellPower(sp)}（智力 ×${spellIntCoef()} · 存量 ×${mpReserveCoef()}）${can ? "" : "——法力不足：强行催动将遭反噬"}`,
      fn: () => resolveCombat(enemy, (can ? "cast:" : "force:") + sp.id, done) };
  });
  opts.push({ label: "返回", hint: "", fn: () => setChoices(combatOpts(enemy, done)) });
  setChoices(opts);
}
/* 禁术三次确认（设定原文：释放前系统三次确认——此术不可逆，天道记账，概不退换） */
function jinshuConfirm(enemy, sp, done, n) {
  const warns = [
    `【禁术】${sp.desc}`,
    `【代价】${sp.cost}。释放即付，概不退换。`,
    `【系统警告】此术不可逆。天道记账，概不退换。${sp.jsKind === "tonggui" ? "这一击之后，没有然后。" : ""}`,
  ];
  setChoices([
    { label: n >= 3 ? `释放禁术「${sp.name}」` : `确认（第 ${n} 次 / 共三次）`, hint: warns[n - 1],
      fn: () => n >= 3 ? resolveCombat(enemy, "jinshu:" + sp.id, done) : jinshuConfirm(enemy, sp, done, n + 1) },
    { label: "放弃", hint: "底牌之所以是底牌，正因为它还藏着。", fn: () => spellMenu(enemy, done) },
  ]);
}
function resolveCombat(enemy, mode, onEnd) {
  const myP = combatPower();
  const startHp = S.hp;
  if (mode === "flee") {
    const chk = attr("agi") * 8 + attr("luck") * 4 + Math.random() * 40 + (S.mods.escapeP || 0);
    if (chk > enemy.power * 4) { log(`你转身钻进窄巷，七拐八绕——甩掉了。`, "good"); S.daoXin = Math.max(0, S.daoXin - 1); addXinmo(2, "临阵脱逃，道心微裂"); onEnd("fled"); return; }
    log(`没跑掉，后背挨了一记狠的。`, "hurt"); S.hp -= hpMax() * 0.15;
  }
  if (mode === "beg") {
    const bm = bondSocialMod(enemy.name); // 社交判定修正（第四章·2）：缘分写进求饶判定；死仇直接锁死
    if (bm === null) log(`你刚弓下腰，${enemy.name}的眼里没有任何松动——不死不休之人，不听人言。`, "hurt");
    else {
      const chance = Math.min(0.85, (0.4 + attr("luck") * 0.03) * (1 + bm));
      if (Math.random() < chance) { log(`你趴得干脆利落。对方啐了一口，觉得没意思，走了。`, "dim"); S.daoXin -= 2; addXinmo(2, "摇尾乞怜，愧疚沉入识海"); onEnd("begged"); return; }
      log(`求饶换来的是变本加厉。`, "hurt"); S.hp -= hpMax() * 0.1;
    }
  }
  let trickWin = false;
  if (mode === "trick") {
    const chk = attr("int") * 10 + attr("luck") * 3 + Math.random() * 50;
    if (chk > enemy.power * 5) { log(`你佯装跌倒，引它扑空，反手一击正中要害。`, "good"); trickWin = true; } // 智取完胜：落入下方统一胜利结算（击杀数/首血/越阶/战利品一样不少）
    else log(`智取失败，对方比看起来精。`, "dim");
  }
  // 五行生克：克制方 +20%，被克方 -20%；该行抗性 = 亲和×0.003（封顶 30%）；杂灵根五行俱全，没有任何一系能克制你
  // 敌方五维评估：与 combat() 同式推演（同名敌人评估恒定）
  const seed = [...enemy.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const wave = i => { const x = Math.sin(seed * 7.13 + i * 91.7) * 10000; return x - Math.floor(x); };
  const wv = [0.3 + wave(0) * 0.3, 0.2 + wave(1) * 0.3, 0.1 + wave(2) * 0.25, 0.25 + wave(3) * 0.3];
  const wvSum = wv.reduce((a, b) => a + b, 0);
  const est = wv.map(x => Math.max(1, Math.round(enemy.power * 0.62 * (x / wvSum) * 10) / 10));
  const myEl = dominantWxEl();
  const eEl = enemy.el || ENEMY_EL[enemy.name] || "tu";
  const za = S.linggen === "za";
  let myDmg = 1, foeDmg = 1;
  if (WX_KE[myEl] === eEl) { myDmg *= 1.2; foeDmg *= 0.8; }
  else if (WX_KE[eEl] === myEl && !za) { myDmg *= 0.8; foeDmg *= 1.2; }
  if (hasTitle("yike") && enemy.power > myP) myDmg *= 1.05; // 称号「以下克上」：对高于己者伤害 +5%
  if (hasTitle("xisheng") && S.hp < hpMax() * 0.1) myDmg *= 1.3; // 「向死而生」：濒死攻伐 +30%
  let wudeFirst = hasSpecial("wude"); // 不讲武德：战斗首记出手伤害 +30%（偷袭抢先手）
  foeDmg *= Math.max(0.7, 1 - (wxOf()[eEl] || 0) * 0.003);
  if (S.weather === "大雪" || S.weather === "风雪" || S.flags.coldSnap) { // 环境即五行：雪天水旺火衰
    if (myEl === "shui") myDmg *= 1.1;
    else if (myEl === "huo") myDmg *= 0.9;
  }
  if (mode === "guard") { foeDmg *= 0.6; myDmg *= 0.85; } // 护体：稳守门户，承伤六成、己伤八成五
  // ———— 第十二章 · 生死判定：敌我同式（气血上限=体质×10，随境界放缩），一力=一基础攻击力（判定表演算） ————
  const pt = TABLES.COMBAT.powerTiers;
  const enemyTier = enemy.power >= pt[4] ? 4 : enemy.power >= pt[3] ? 3 : enemy.power >= pt[2] ? 2 : enemy.power >= pt[1] ? 1 : 0;
  const eStr = est[0], eAgi = est[1], eInt = est[2], eCon = est[3];
  const eLuck = Math.max(1, Math.round(enemy.power * 0.12) - (hasSpecial("lucky") ? 5 : 0)); // 气运不入战力（设定）：单独推演；气运之子：高运压场，敌方气运 -5（强敌也会降智）
  const eHpMax = Math.max(5, Math.round(eCon * TABLES.COMBAT.hpPerCon * (1 + enemyTier * TABLES.COMBAT.tierHpScale))); // 与玩家同式：体质×10×境界放缩
  const myStr = attr("str"), myAgi = attr("agi"), myInt = attr("int"), myLuck = attr("luck");
  const atkP = attackPower(); // 攻击力（=战力）：不运功法时，每记普攻皆此数之伤
  const mt = mainTechnique();
  const technique = (S.inv.yinqi > 0) && (S.inv.quanpu > 0) ? "引气锻骨合击" : mt ? mt.name : null; // 主修功法随谱系（高阶入手即为战术核心）
  const skillMult = TABLES.COMBAT.skillMultBase + S.realm * TABLES.COMBAT.skillMultPerRealm; // 技能伤害：功法加成，浮动不大
  const fl = TABLES.JUDGE.dmgFloat;
  const seen = enemy.power / Math.max(1, myP) <= 1.2; // 可见规则：超 1.2 倍则气血只显状态（设定：深不可测）
  const laosouWeak = hasSpecial("laosou") && myP >= enemy.power * 2; // 老叟戏顽童：战力碾压（≥2 倍）承伤减半
  const eHpState = () => { const r = eHp / eHpMax; return r >= 0.999 ? "毫发无损" : r > 0.7 ? "受了些伤" : r > 0.4 ? "伤势不轻" : r > 0.1 ? "摇摇欲坠" : "只剩一口气"; };
  let round = 0, myHp = S.hp, eHp = trickWin ? 0 : eHpMax; // 智取完胜：敌血直接归零，跳过回合战
  const lines = [`【气血】${enemy.name}：${seen ? `${eHpMax}/${eHpMax}` : "？？？（" + eHpState() + "）"} ｜ 你：${Math.round(myHp)}/${hpMax()} ｜ 你的攻击力=${atkP}（等同战力；不运功法，每记普攻皆此数）${technique ? ` ｜ 可运「${technique}」（运功另有伤害公式）` : ""}`];
  if (knownSpells().length) lines[0] += ` ｜ 具名法术 ${knownSpells().length} 门（战中可掐诀助战）`;
  if (WX_KE[myEl] === eEl) lines.push(`【五行生克】你的${WX_NAMES[myEl]}行克它的${WX_NAMES[eEl]}行——你伤害 +20%，它 -20%。`);
  else if (WX_KE[eEl] === myEl && !za) lines.push(`【五行生克】它的${WX_NAMES[eEl]}行克你的${WX_NAMES[myEl]}行——你伤害 -20%，小心。`);
  else if (za) lines.push(`【杂灵根】五行俱全，没有任何一系能克制你。`);
  if (mode === "guard") lines.push(`【护体】你沉肩坠肘，气机内敛——承伤六成，出手也留三分。`);
  let interruptWin = false; // 打断：抢攻其行气节点，成则敌方先失一手
  if (mode === "interrupt") {
    const chk = attr("agi") * 6 + attr("int") * 6 + attr("luck") * 2 + Math.random() * 30;
    if (chk > 60) { interruptWin = true; lines.push(`【打断】你抢先出手，直指它行气节点——它气息一滞，先失一手。`); }
    else {
      const back = Math.max(1, Math.round(hpMax() * 0.08));
      myHp -= back; S.hp = Math.max(1, Math.round(myHp)); // 失手不致死，但白挨一记
      lines.push(`【打断失手】你扑上去抢攻，它随手一格——你门户大开，白挨一记（气血 -${back}）。`);
    }
  }
  const jt = TABLES.JUDGE;
  const judge = (a, d) => { // 双方五维判定（设定：敏管闪避、运管暴击、智管弱点）；暴击与弱点各自独立判定，可叠加（×2×1.5=×3）
    const dodge = Math.max(jt.dodge.cap[0], Math.min(jt.dodge.cap[1], jt.dodge.base + (d.agi - a.agi) * jt.dodge.w));
    const crit = Math.max(jt.crit.cap[0], Math.min(jt.crit.cap[1], jt.crit.base + (a.luck - d.luck) * jt.crit.w));
    const weak = Math.max(jt.weak.cap[0], Math.min(jt.weak.cap[1], jt.weak.base + (a.int - d.int) * jt.weak.w));
    if (Math.random() * 100 < dodge) return { kind: "dodge", mult: 0 };
    let mult = 1, kind = "hit";
    const isCrit = Math.random() * 100 < crit;
    const isWeak = Math.random() * 100 < weak;
    if (isCrit) { mult *= jt.crit.mult; kind = "crit"; }
    if (isWeak) { mult *= jt.weak.mult; kind = isCrit ? "crit+weak" : "weak"; }
    return { kind, mult };
  };
  /* 具名法术 · 开场一击（施法菜单/强行催动）：结算后敌方反击一次，再入回合循环 */
  let spellWeaken = false; // 冰封诀：敌方下次攻击 -30%
  if (/^(cast|force):/.test(mode)) {
    const mc = /^(cast|force):(.+)$/.exec(mode);
    let sp = (typeof SPELLS_BY_ID !== "undefined") && SPELLS_BY_ID[mc[2]];
    if (sp && S.realm >= 5) {
      const rc0 = mpReserveCoef(), ic0 = spellIntCoef();
      let power = spellPower(sp); // 先算威力（存量系数按当前蓝量），再扣费
      if (mc[1] === "force") { // 强行催动：法力不足硬催——成则七折放出（法力清零），败则反噬
        S.mp = 0;
        const chk = attr("int") * 6 + attr("luck") * 2 + Math.random() * 30;
        if (chk > 55) { power *= 0.7; log(`你强行催动「${sp.name}」——经脉如遭火燎，法力见底，术法终究放了出去（威力七折）。`, "hurt"); }
        else {
          const back = Math.max(2, Math.round(hpMax() * 0.12));
          S.hp -= back; myHp = S.hp; addXinmo(2, "法力反噬，经脉受创");
          log(`你强行催动「${sp.name}」——法力逆冲经脉，反噬！气血 -${back}，术法溃散。`, "hurt");
          if (S.hp <= 0) { lethalCheck(enemy.name, onEnd); return; }
          sp = null;
        }
      } else S.mp = Math.max(0, S.mp - sp.mp);
      if (sp) {
        gainSpellProf(sp); // 施法积攒熟练（实战中掐诀求真知）
        const j0 = judge({ agi: myAgi, int: myInt, luck: myLuck }, { agi: eAgi, int: eInt, luck: eLuck });
        const hit = spellHit(sp, power * (fl[0] + Math.random() * (fl[1] - fl[0])), j0, eEl, za);
        if (hit.dodged) lines.push(`你掐诀催动「${sp.name}」（法力 -${sp.mp}）——它侧身闪开，术法落空。`);
        else {
          eHp -= hit.dmg;
          if (sp.trait === "weaken") spellWeaken = true;
          lines.push(`你掐诀催动「${sp.name}」，${sp.el ? WX_NAMES[hit.el] + "行" : ""}法力奔涌（法力 -${sp.mp}，智力 ×${ic0} · 存量 ×${rc0}），造成 ${hit.dmg} 点伤害${hit.kind === "crit" ? "（暴击×2）" : hit.kind === "weak" ? "（命中弱点×1.5）" : hit.kind === "crit+weak" ? "（暴击+弱点×3）" : ""}${hit.m > 1 ? "（五行相克 ×1.2）" : hit.m < 1 ? "（行属被克 ×0.8）" : ""}${hit.note}，${enemy.name} ${seen ? `余 ${Math.max(0, Math.round(eHp))}/${eHpMax}` : `【${eHpState()}】`}`);
        }
        if (eHp > 0 && sp.trait !== "noCounter" && !interruptWin) { // 敌方反击一次（风刃先制/打断得手：敌不及还手）
          const j2 = judge({ agi: eAgi, int: eInt, luck: eLuck }, { agi: myAgi, int: myInt, luck: myLuck });
          if (j2.kind === "dodge") lines.push(`你侧身避过它的反击`);
          else {
            const eSpell = enemy.power >= 30 && Math.random() < 0.25; // 敌方施法：强敌以术法攻伐（伤害 ×1.4，可闪避）
            let dmg = eStr * (eSpell ? 1.4 : 1) * (fl[0] + Math.random() * (fl[1] - fl[0])) * foeDmg * j2.mult * (enemyTier >= 1 && Math.random() < TABLES.COMBAT.enemySkillChance ? TABLES.COMBAT.enemySkillMult : 1) * (1 - (S.mods.defP || 0) / 100) * (laosouWeak ? 0.5 : 1) * (spellWeaken ? 0.7 : 1);
            if (spellWeaken) { lines.push(`【冰封】它血脉僵滞，这一击缓了三成。`); spellWeaken = false; }
            dmg = Math.max(1, Math.round(dmg));
            myHp -= dmg;
            lines.push(`${eSpell ? `它掐诀引动${WX_NAMES[eEl]}行灵气，一道术法轰至` : `它${j2.kind === "crit" ? "暴击" : j2.kind === "weak" ? "打中你的破绽" : j2.kind === "crit+weak" ? "暴击正中你的破绽" : "反击"}`}，你受 ${dmg} 点伤害，气血 ${Math.max(0, Math.round(myHp))}/${hpMax()}`);
          }
        }
        if (interruptWin) interruptWin = false;
      }
    }
  }
  /* 禁术 · 开场一击（施法菜单三次确认后）：代价释放即付、不可逆；不入熟练度、不自动掐诀、不计入常态战力 */
  let jinshuUsed = null, tonggui = false;
  if (/^jinshu:/.test(mode)) {
    const sp = (typeof SPELLS_BY_ID !== "undefined") && SPELLS_BY_ID[/^jinshu:(.+)$/.exec(mode)[1]];
    if (sp && sp.kind === "jinshu" && S.realm >= 5) {
      jinshuUsed = sp;
      S.stats.jinshuN = (S.stats.jinshuN || 0) + 1;
      const power = spellPowerJinshu(sp) * (fl[0] + Math.random() * (fl[1] - fl[0])); // 先算威力（燃法按当前蓝量），再付代价
      if (sp.jsKind === "ranfa") { // 一档 · 燃法（竭蓝型）：倾全部法力于一击，法力归零 +【虚弱】
        const poured = Math.round(S.mp);
        S.mp = 0;
        let days = 3 + Math.min(4, Math.floor(attr("con") / 2.5)); // 3~7 日，体质定恢复
        if (hasTitle("daokou")) days = Math.max(1, days - 1); // 称号「刀口舔蜜」：虚弱 -1 日
        S.jinshuWeak = days;
        lines.push(`【禁术 · 倾江】你倾尽 ${poured} 点法力于一击（法力归零）——【虚弱】${days} 日：全属性 -50%、法力锁 0。放禁术前，先找好藏身之处。`);
      } else if (sp.jsKind === "xianji") { // 二档 · 献祭道基：永久亏空记【道伤】，唯圣药可补
        S.base.str = Math.max(1, Math.round((S.base.str - 1) * 10) / 10); S.base.con = Math.max(1, Math.round((S.base.con - 1) * 10) / 10);
        S.daoShang = (S.daoShang || 0) + 1; computeMods();
        lines.push(`【禁术 · 燃道】你点燃道基换这一击——力量 -1、体质 -1，亏空记【道伤 ×${S.daoShang}】（唯圣药可补）。`);
      } else if (sp.jsKind === "ranyun") { // 二档 · 献祭气运：-1 气运，威力冠绝同档
        S.base.luck = Math.max(1, S.base.luck - 1);
        lines.push(`【禁术 · 偷天】你押上 1 点气运——此后经年，霉运缠身。`);
      } else if (sp.jsKind === "tonggui") { // 半档 · 同归于尽：燃尽道基与寿元，之后没有然后
        tonggui = true;
        lines.push(`【禁术 · 道消】你燃尽全部道基与剩余寿元——这一击之后，没有然后。`);
      }
      if (tonggui) eHp = 0; // 同归于尽：一击必杀，无从闪避
      else {
        const j0 = judge({ agi: myAgi, int: myInt, luck: myLuck }, { agi: eAgi, int: eInt, luck: eLuck });
        const hit = spellHit(sp, power, j0, eEl, za);
        if (hit.dodged) lines.push(`禁术「${sp.name}」轰出——它侧身闪开，术法落空。代价照付，概不退换。`);
        else { eHp -= hit.dmg; lines.push(`禁术「${sp.name}」命中，造成 ${hit.dmg} 点伤害，${enemy.name} ${seen ? `余 ${Math.max(0, Math.round(eHp))}/${eHpMax}` : `【${eHpState()}】`}`); }
      }
      if (S.stats.jinshuN % 3 === 0) { S.flags.jinshuMarked = 1; lines.push(`【？】道基燃过的气息散入夜色——像黑夜里的火炬。某些存在，似乎朝这边看了一眼。`); } // 隐藏风险：频繁使用献祭禁术者，会逐渐进入某些存在的视野
    }
  }
  while (round < 8 && myHp > 0 && eHp > 0) {
    round++;
    const parts = [];
    let lashTurn = false; // 五连鞭：快若闪电，出鞭之合敌方无暇反击
    const j1 = judge({ agi: myAgi, int: myInt, luck: myLuck }, { agi: eAgi, int: eInt, luck: eLuck }); // 你出手
    const isSpell = technique && technique.indexOf("引气") >= 0; // 引气诀系属功法（耗法 5）；锻骨拳是武技，不耗蓝
    const affordable = knownSpells().filter(x => !x.kind && S.mp >= x.mp); // 禁术不走战中自动掐诀——底牌只由你亲手揭
    const weave = affordable.length && Math.random() < 0.3 ? affordable[Math.floor(Math.random() * affordable.length)] : null; // 具名法术：战中掐诀（30%），存量系数按当前蓝量
    const cast = !weave && technique && Math.random() < 0.35 && (!isSpell || S.mp >= 5); // 法力不足则退为普攻
    let weavePower = 0, weaveRc = 1;
    if (weave) { weaveRc = mpReserveCoef(); weavePower = spellPower(weave); S.mp = Math.max(0, S.mp - weave.mp); } // 先算威力（含存量系数）再扣费
    else if (cast && isSpell) S.mp = Math.max(0, S.mp - 5);
    if (j1.kind === "dodge" && !(weave && weave.trait === "sure")) parts.push(`你的${weave ? "一式「" + weave.name + "」" : cast ? "一式「" + technique + "」" : "攻势"}被它闪开`);
    else if (weave) {
      gainSpellProf(weave); // 施法积攒熟练（实战中掐诀求真知）
      const hit = spellHit(weave, weavePower * (fl[0] + Math.random() * (fl[1] - fl[0])) * (wudeFirst ? 1.3 : 1), j1, eEl, za);
      wudeFirst = false;
      if (weave.trait === "weaken" && !hit.dodged) spellWeaken = true;
      eHp -= hit.dmg;
      parts.push(`你掐诀催动「${weave.name}」（法力 -${weave.mp}，存量 ×${weaveRc}），造成 ${hit.dmg} 点伤害${hit.kind === "crit" ? "（暴击×2）" : hit.kind === "weak" ? "（命中弱点×1.5）" : hit.kind === "crit+weak" ? "（暴击+弱点×3）" : ""}${hit.note}，${enemy.name} ${seen ? `余 ${Math.max(0, Math.round(eHp))}/${eHpMax}` : `【${eHpState()}】`}`);
    }
    else if (!cast && hasSpecial("wubian") && Math.random() < 0.4) {
      /* 闪电五连鞭（良品·强化）：出鞭概率 40%；五鞭各 35% 攻击力、逐鞭独立命中（55%+敏捷差×6%，25%~95%），全中=175% 总伤；出鞭之合敌方无法反击 */
      lashTurn = true;
      let hits = 0, total = 0;
      const lashP = Math.max(0.25, Math.min(0.95, 0.55 + (myAgi - eAgi) * 0.06));
      for (let w = 0; w < 5; w++) if (Math.random() < lashP) { total += Math.max(1, Math.round(atkP * 0.35)); hits++; }
      total = Math.round(total * myDmg * (wudeFirst ? 1.3 : 1)); wudeFirst = false;
      eHp -= total;
      parts.push(`【闪电五连鞭】五连击快若闪电，中 ${hits}/5 鞭（单鞭命中 ${Math.round(lashP * 100)}%），共 ${total} 点伤害${hits === 0 ? "——五鞭全空" : hits === 5 ? "，鞭鞭到肉" : ""}，${enemy.name} ${seen ? `余 ${Math.max(0, Math.round(eHp))}/${eHpMax}` : `【${eHpState()}】`}`);
    }
    else {
      let dmg = (cast ? myStr * skillMult : atkP) * (fl[0] + Math.random() * (fl[1] - fl[0])) * myDmg * j1.mult * (wudeFirst ? 1.3 : 1); // 普攻＝攻击力；运功另有公式（myStr×功法倍率）
      wudeFirst = false;
      dmg = Math.max(1, Math.round(dmg));
      eHp -= dmg;
      parts.push(`${cast ? `你运转「${technique}」，${isSpell ? "法力 -5，" : ""}` : ""}造成 ${dmg} 点伤害${j1.kind === "crit" ? "（暴击×2）" : j1.kind === "weak" ? "（命中弱点×1.5）" : j1.kind === "crit+weak" ? "（暴击+弱点×3）" : ""}，${enemy.name} ${seen ? `余 ${Math.max(0, Math.round(eHp))}/${eHpMax}` : `【${eHpState()}】`}`);
    }
    if (eHp > 0 && !lashTurn && !interruptWin) {
      const j2 = judge({ agi: eAgi, int: eInt, luck: eLuck }, { agi: myAgi, int: myInt, luck: myLuck }); // 它出手
      if (j2.kind === "dodge") parts.push(`你侧身避过它的反击`);
      else {
        const eSpell = enemy.power >= 30 && Math.random() < 0.25; // 敌方施法：强敌以术法攻伐（伤害 ×1.4，可闪避）
        let dmg = eStr * (eSpell ? 1.4 : 1) * (fl[0] + Math.random() * (fl[1] - fl[0])) * foeDmg * j2.mult * (enemyTier >= 1 && Math.random() < TABLES.COMBAT.enemySkillChance ? TABLES.COMBAT.enemySkillMult : 1) * (1 - (S.mods.defP || 0) / 100) * (laosouWeak ? 0.5 : 1) * (spellWeaken ? 0.7 : 1); // 老叟戏顽童：碾压局承伤减半
        if (spellWeaken) { parts.push(`【冰封】它血脉僵滞，这一击缓了三成。`); spellWeaken = false; }
        dmg = Math.max(1, Math.round(dmg));
        myHp -= dmg;
        parts.push(`${eSpell ? `它掐诀引动${WX_NAMES[eEl]}行灵气，一道术法轰至` : `它${j2.kind === "crit" ? "暴击" : j2.kind === "weak" ? "打中你的破绽" : j2.kind === "crit+weak" ? "暴击正中你的破绽" : "反击"}`}，你受 ${dmg} 点伤害，气血 ${Math.max(0, Math.round(myHp))}/${hpMax()}`);
      }
    } else if (interruptWin) { interruptWin = false; parts.push(`它行气未平，这一合没能还手。`); }
    lines.push(`第${round}合：${parts.join("；")}。`);
    if (round >= TABLES.COMBAT.quickRound && myHp > 0 && eHp > 0) { // 超过5回合：系统运算简化，快速结算（按双方每合期望伤害推完剩余回合）
      const myPer = Math.max(1, (atkP * 0.65 + myStr * skillMult * 0.35) * myDmg * TABLES.COMBAT.quickMyPerFactor); // 期望：普攻占 65%（攻击力），运功占 35%（myStr×功法倍率），含闪避折损
      const foePer = Math.max(1, eStr * foeDmg * TABLES.COMBAT.quickFoePerFactor * (1 - (S.mods.defP || 0) / 100));
      const need = Math.ceil(eHp / myPer);
      const foeRounds = Math.ceil(myHp / foePer);
      if (need <= foeRounds) { eHp = 0; lines.push(`【速算】战局已明，系统简化运算：你再补 ${need} 记重手，${enemy.name} 轰然倒地。`); }
      else { myHp = 0; lines.push(`【速算】系统简化运算：力竭不敌，你在第 ${TABLES.COMBAT.quickRound + foeRounds} 合被击倒在地。`); }
      break;
    }
  }
  S.hp = Math.max(0, Math.round(myHp));
  if (S.hp > 0 && S.hp < hpMax() * 0.4) maybeDarkWound(); // 重伤之下未妥善处理 → 永久损伤（设定：身体会记账）
  lines.forEach(l => log(l, "dim"));
  if (S.hp <= 0) { lethalCheck(enemy.name, onEnd); return; }
  if (jinshuUsed && (jinshuUsed.jsKind === "xianji" || jinshuUsed.jsKind === "ranyun")) gainAch("hupi"); // 与虎谋皮：首次使用献祭禁术且生还
  if (eHp <= 0) {
    log(`<span style="color:#9fc3a5">【胜】${enemy.name}倒下了。你扶着膝盖喘气，手心全是汗。</span>`);
    S.kills++; gainAch("firstBlood");
    if (jinshuUsed && enemy.power >= myP * 1.3) gainAch("qingtian"); // 倾天一击：以禁术击杀高于自己一个小境以上的对手
    if (laosouWeak) { // 老叟戏顽童：虐菜记账，每胜 5 名弱者引来一名强者
      S.stats.bully = (S.stats.bully || 0) + 1;
      if (S.stats.bully % 5 === 0) { S.flags.laosouBounty = 1; sys(`【老叟戏顽童】你又戏耍了一个不如你的对手（累计 ${S.stats.bully}）。名声这东西——快传到不该传的人耳朵里了。`); }
    }
    if (enemy.power >= myP * 1.3) { gainAch("yuejie"); S.stats.yuejieN = (S.stats.yuejieN || 0) + 1; } // 跨越一个小境界取胜（轮回结算：越阶战绩加成）
    if (startHp <= hpMax() * 0.2 && enemy.power >= myP) gainAch("juejing"); // 濒死反杀强敌
    if (enemy.loot) enemy.loot();
    if (tonggui) { die(`禁术「道消」燃尽了你的道基与寿元——${enemy.name}倒下的同时，你也随风散了。`, "禁术·同归于尽"); return; } // 同归于尽：敌死，你亡，没有然后
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
  if (!S.flags.allySaved) { // 挚友档站队（第四章·2）：缘分档 → 性格底色 → 气运，链式判定
    const ally = Object.entries(S.npc || {}).find(([n, v]) => v >= 40 && v < 80);
    if (ally) {
      const pers = npcPersonality(ally[0]);
      let p = 0.18;
      if (pers === "重情") p += 0.15; else if (pers === "豁达") p += 0.08;
      else if (pers === "记仇" || pers === "贪婪") p -= 0.08;
      p += attr("luck") * 0.02;
      if (Math.random() < p) {
        S.flags.allySaved = 1; S.hp = Math.max(1, Math.round(hpMax() * 0.25)); gainAch("mingbu");
        addNpc(ally[0], -5);
        sys(`【挚友援手】${ally[0]}${pers === "重情" ? "拼着受伤替你挡了一阵" : "设法引来人声吓退了对方"}——你捡回半条命。（人情是债：缘分 -5）`);
        renderPanel(); onEnd && onEnd("cheated"); return;
      }
    }
  }
  die(`死于「${killer}」。`, "战死");
}
function askBreakthrough() {
  const B = TABLES.BREAK; // 破境判定（判定表演算）
  let rate = B.base + attr("luck") * B.luckW + S.realmBreaks * -B.retryPenalty;
  if (hasTitle("renjiT")) rate += 10; // 称号「人极」：破境成功率永久 +10%
  if (hasSpecial("ding")) rate += B.mods.ding;
  if (hasSpecial("yinguo")) rate += B.mods.yinguo; // 因果赊账：债未清，天道卡你的门槛
  if (S.flags.coldSnap) rate += B.mods.coldSnap;
  rate = Math.max(B.clamp[0], Math.min(B.clamp[1], Math.round(rate)));
  if ((S.xinmo || 0) >= 50) return xinmoTribulation(rate); // 心魔劫：突破大境界时具现为幻境
  setChoices([
    { label: `破境！（成功率 ${rate}%）`, hint: "机不可失。涨潮期天地灵气正浓。", fn: () => resolveBreakthrough(rate) },
    { label: "再沉淀沉淀", hint: "失败的代价不轻。", fn: () => gmTurn() },
  ]);
}
function resolveBreakthrough(rate) {
  if (Math.random() * 100 < rate) {
    S.realm++; S.cult = 0; S.realmBreaks = 0;
    if (S.lastBreakDay && S.day - S.lastBreakDay <= TABLES.BREAK.yushiWindowDays) gainAch("yushi"); // 与天争时：十日之内连破两境
    S.lastBreakDay = S.day;
    const crossB = (TABLES.REALMS.crossTierBonus || {})[String(S.realm)]; // 跨大阶（入灵7/入玄13/入圣19）：全属性固定跃升（设定·破境规则）
    if (crossB) {
      for (const k of ["str", "agi", "int", "con"]) S.base[k] = Math.min(attrCeiling(), Math.round((S.base[k] + crossB) * 10) / 10);
      sys(`【破境反哺】大阶跨越，五维脱胎换骨——全属性 +${crossB}。`);
    } else {
      for (const k of ["str", "agi", "int", "con"]) S.base[k] = Math.min(attrCeiling(), Math.round(S.base[k] * TABLES.REALMS.breakAttrMult * 10) / 10); // 大境内突破，全属性约 +5%（不得破当前大阶天花板）
      sys(`【破境反哺】大境突破，五维随境跃升（+${Math.round((TABLES.REALMS.breakAttrMult - 1) * 100)}%）。`);
    }
    chronicle(`破境成功，踏入【${REALM_NAMES[S.realm]}】`, "break");
    checkSysLvUp();
    sys(`【破境成功】气血轰鸣，枷锁寸寸崩解——你踏入【${REALM_NAMES[S.realm]}】（${TABLES.REALMS.tierNames[S.realm]}）！`);
    if (S.realm >= 1) gainAch("tuotai");
    if (S.realm === 5) { gainAch("juqi"); S.mp = mpMax(); sys(`【气海初开，法力解锁。凡人眼中，你已是「仙师」之流。】`); }
    if (S.realm === 6) { S.mp = mpMax(); sys(`【丹田气海开辟】法力正式奔涌——你已脱去凡胎，立身凡阶之巅【开元境】。`); }
    if (S.realm === 7) sys(`【脱凡入灵】灵泉自涌，法力如溪——自此跻身${TABLES.REALMS.tierNames[7]}，凡俗官府的卷宗里，你的名字已不算凡人了。`);
    if (S.realm === 13) sys(`【化神登玄】神魂凝实，神识外放——${TABLES.REALMS.tierNames[13]}修士，一城之雄也要对你执礼。`);
    if (S.realm === 19) sys(`【涅槃入圣】旧躯尽焚，道体重塑——${TABLES.REALMS.tierNames[19]}大能，当世明面上的巅峰行列，有了你一个位置。`);
    if (S.realm === REALM_TOP) sys(`【传说之巅】登仙境——此界三万载无人踏足的层次。天道的目光，落在了你身上。`);
    S.hp = hpMax(); S.sta = staMax();
    if (hasSpecial("tangzhe")) { S.flags.tangzheLazy = S.day + 3; sys(`【躺者】破境虽成，一身懒骨却使不出劲——三日内修炼收益减半。`); } // 出关动力 -50%
  } else {
    S.realmBreaks++;
    if (hasSpecial("ding")) { S.cult *= TABLES.BREAK.failCultKeepDing; sys(`【破境失败——「助我破鼎」生效：道基未损，只折了些积累。】`); }
    else {
      S.debuff = "weak"; S.debuffDays = TABLES.BREAK.weakDays; S.cult *= TABLES.BREAK.failCultKeep; S.hp = Math.max(1, S.hp - hpMax() * 0.3);
      log(`<span style="color:var(--blood-hi)">气血逆冲，喉头一甜。【破境失败 · 元气大伤】全属性暂时 -20%，静养三日。</span>`);
      const zouhuoP = hasSpecial("tangzhe") ? 0.05 : 0.25; // 躺者：走火入魔率大降（25%→5%）
      if ((S.yaoshi || 0) >= 60 && Math.random() < zouhuoP) { // 药蚀 60+：破境走火入魔概率上升
        S.base.int = Math.max(1, Math.round((S.base.int - 0.3) * 10) / 10); S.daoXin = Math.max(0, S.daoXin - 6);
        sys(`【走火入魔】药蚀淤堵经脉，真气逆行——智力受损，道心震荡。（药蚀 ${Math.round(S.yaoshi)}/100，是时候排毒了）`);
        computeMods();
      }
    }
    if (hasSpecial("tangzhe")) S.cult = Math.min(S.cult * 1.2, S.cultNeed || Infinity); // 躺者：失败保留的修为 +20%（不越破境前存量）
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
    const echoCard = rb.echo ? findCard(rb.echo) : null;
    sys(`【下一世初始万象点：${rb.points}。${rb.echo ? "伴生残影：「" + echoCard.name + "」（半效）。" : "无伴生残影。"}身份掷骰中……「${rb.identity.name}」（${rb.identity.grade}档）。】`);
    showEnd({
      title: "此生结算", grade, color: rule.color, score: st.total,
      quote: comment,
      stats: [["修行高度", st.dims[0]], ["任务绩效", st.dims[1]], ["千秋录", st.dims[2]], ["因果质量", st.dims[3]], ["道心活法", st.dims[4]], ["寿数", st.dims[5]], ["加权总分", st.total]],
      note: `词条回收中……保底计数清零。称号与评语随魂封存；千秋录成就一笔勾销——新一世，重新刻起。<br>下一世：${rb.identity.name}（${rb.identity.grade}档）· 初始万象点 ${rb.points}${rb.attrMalus ? " · 属性折损 ×" + rb.attrMalus : ""}${rb.echo ? " · 伴生残影「" + echoCard.name + "」（半效）" : ""}`,
      btns: [{ label: "再入轮回", fn: () => { META.ach = []; META.dynAch = []; saveMeta(); closeEnd(); newLife(); startLife(); } }], // 开局修改：死亡再入轮回同样一笔勾销千秋录成就（此前漏清，成就跨世残留）
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
  if (poolGrade === "劣" && Math.random() < 0.05) pool = pool.concat(IDENTITIES.filter(i => i.grade === "狱")); // 狱档极低概率砸中（设定 15.5：败笔锁死，或极低概率）
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
      ? (S.flags.qingyan
        ? `${S.sect || "宗门"}的山门在春风里矗立。你握着身份木牌回头望了一眼来路——濒死的那一夜，都只是序章。「现在，你的每一次选择，都在改写这个世界的剧本。」`
        : `${S.sect || "仙门"}的山门在春风里矗立——它没收你，你也凭一己之力走到了今天。无门无派，濒死的那一夜，都只是序章。「现在，你的每一次选择，都在改写这个世界的剧本。」`)
      : "冬天过去了，你还活着。没有仙缘，没有奇遇，但命是自己的。下一个冬天到来之前，也许来得及变得更强。",
    stats: [["存活", S.day + " 日"], ["境界", REALM_NAMES[S.realm]], ["词条", S.cardOrder.length + " 条"], ["缘分", Object.keys(S.npc).length + " 人"], ["成就", META.ach.length + " 项"], ["周目", "第 " + S.world + " 世"]],
    note: "可继续在此世漫游（自由模式），或再入轮回开启下一世——身份随机，因果继承。",
    btns: [
      { label: "继续此世（自由漫游）", fn: () => { closeEnd(); S.over = false; S.flags.freeRoam = true; log("—— 自由漫游：冬天已过，青石城依旧。——", "daybreak"); gmTurn(); } },
      { label: "再入轮回", fn: () => { META.rebirth = { points: 100 + (win ? 50 : 0), attrBonus: win ? 2 : 0, identity: pickIdentity(win ? "吉" : "平") }; META.world++; META.ach = []; META.dynAch = []; saveMeta(); closeEnd(); newLife(); startLife(); } }, // 开局修改：重开新一世，千秋录成就（机械＋AI）一笔勾销，从新的人生重新刻起
    ],
  });
  renderPanel();
}
/* ================= 终局 · 五结局（设定集第十一章） =================
   一般「守界人」｜坏「炉鼎」｜完美「登仙超脱」｜特殊「弑天」「换天」｜隐藏「界外之路」。
   由终局抉择场景（gm.js）以 fx.special="end:<kind>" 触发；结局随魂封存于 META.endings，千秋录刻成就。 */
const ENDINGS = {
  shoujie: {
    name: "一般结局 · 守界人", grade: "守 界", color: "#6fa8a0", ach: "endShoujie",
    quote: "进食停了，归墟重归死寂。你没有拆穿那声「恭喜」，也没有力气拆穿——你留了下来，成了新一任守夜人。天还是那个天，劫还会再来，但至少这一世，是你把它挡在了门外。",
    rebirth: { points: 250, pool: "吉", dice: "adv" },
  },
  luding: {
    name: "坏结局 · 炉鼎", grade: "炉 鼎", color: "#a03c3c", ach: "endLuding",
    quote: "「做得好。」天道的声音第一次这么温柔。你承接吞世者全部因果的那一刻，它连你带战果一起炼化了——补全自身，超脱此界。刀用完了，是要回炉的。最坏的结局，离最好只差一步。",
    rebirth: { points: 100, pool: "平", dice: "nor", echoAny: true },
  },
  dengxian: {
    name: "完美结局 · 登仙超脱", grade: "超 脱", color: "#d4af6e", ach: "endDengxian",
    quote: "你抢在「恭喜」出口之前识破了它。界壁在你掌心合拢，断绝三万年的仙路重新亮起——登仙路的真相从来不是「断」，是「被藏」。你携所有羁绊跳出棋盘，身后传来棋局崩塌的声音。",
    rebirth: { points: 400, pool: "吉", dice: "adv" },
  },
  sitian: {
    name: "特殊结局 · 弑天", grade: "弑 天", color: "#8e5fb8", ach: "endSitian",
    quote: "先斩吞世者，再反手炼化天道——它算尽因果，唯独算漏了一件事：刀有了自己的意思。天塌下来的那一日，世人只看见极亮的雷。古往今来无人做到的事，被一个界外之人做成了。",
    rebirth: { points: 400, pool: "吉", dice: "adv" },
  },
  huantian: {
    name: "特殊结局 · 换天", grade: "换 天", color: "#5f8eb8", ach: "endHuantian",
    quote: "你没有坐上那个位置——你把它打碎了。天道与吞世者的棋盘一并崩解，天道碎片散入众生识海：从此人人头顶都有自己的一寸天。没有棋手的棋局，众生自己下。",
    rebirth: { points: 400, pool: "吉", dice: "adv" },
  },
  beyond: {
    name: "隐藏结局 · 界外之路", grade: "？？？", color: "#e8e0c8", ach: "endBeyond",
    quote: "面板上的字迹忽然乱了——【推演失败】【变量丢失】【路径不存在】。你没有杀谁，也没有救谁，只是转身，向「外面」走了一步。你来自界外。「界外」意味着什么，它从此再也没机会知道了。",
    rebirth: { points: 500, pool: "吉", dice: "adv" },
  },
};
function endGame(kind) {
  const E = ENDINGS[kind]; if (!E) return;
  S.over = true;
  if (!META.endings) META.endings = {};
  META.endings[kind] = { world: S.world, day: S.day, realm: REALM_NAMES[S.realm] };
  lifeRecord().push({ world: S.world, end: "ending:" + kind, days: S.day, realm: REALM_NAMES[S.realm], grade: E.grade });
  try { gainAch(E.ach); } catch (e) {}
  try { chronicle("达成结局「" + E.name + "」", "quest"); } catch (e) {}
  saveMeta();
  const known = !!S.flags.truthKnown;
  sys(kind === "luding" && !known
    ? "【宿主因果已回收。棋局继续。】"
    : `【结局达成：${E.name}。】`);
  const rb = E.rebirth;
  showEnd({
    title: E.name, grade: E.grade, color: E.color, score: "",
    quote: E.quote,
    stats: [["周目", "第 " + S.world + " 世"], ["境界", REALM_NAMES[S.realm]], ["存活", S.day + " 日"],
      ["先驱遗痕", (["pioneer_kezi", "pioneer_xinwu", "pioneer_fen"].filter(f => S.flags[f]).length) + " / 3"],
      ["真相", known ? "已知（天有二心）" : "未知"], ["千秋录", META.ach.length + " 项"]],
    note: `结局已随魂封存（千秋录 · 成就名录，死亡不回收）。轮回馈赠：初始万象点 ${rb.points}，身份掷骰「${rb.pool}」档${rb.dice === "adv" ? "（掷二取优）" : ""}。`,
    btns: [
      { label: "再入轮回", fn: () => {
        META.rebirth = { points: rb.points, attrBonus: 2, identity: pickIdentity(rb.pool, rb.dice),
          echo: rb.echoAny ? (() => { const c = (S.cardOrder || []).filter(id => !id.startsWith("echo_") && findCard(id)); return c.length ? "echo_" + c[Math.floor(Math.random() * c.length)] : null; })() : null };
        META.world++; META.ach = []; META.dynAch = []; saveMeta(); closeEnd(); newLife(); startLife();
      } },
      { label: "封盘留档", fn: () => { closeEnd(); sys("【此世封盘。可随时读档再启，或自轮回重来。】"); renderPanel(); } },
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
/* 存档结构版本：改动 S/META 字段结构时 +1，并在 migrateSave 里补对应迁移步骤 */
const SAVE_VER = 9;
const SLOT_WORDS = ["晨", "午", "昏", "夜"];
function saveSummary(s) { return `第${s.world}世 · ${s.name} · ${s.day >= 31 ? "春" : "冬"}第${s.day}日${SLOT_WORDS[s.slot] || ""} · ${REALM_NAMES[s.realm]}`; }
function canSave() { return !!(S && !S.over && !gmBusy && !window.__inCombat); }
function writeSave(key, quiet) {
  if (!canSave()) { if (!quiet) toast("此刻天道未稳（战斗或结算中），稍候再存。"); return false; }
  const logHtml = [...document.querySelectorAll("#log .logline")].slice(-120).map(d => d.outerHTML).join("");
  try {
    localStorage.setItem(key, JSON.stringify({ v: SAVE_VER, at: Date.now(), S, META, log: logHtml }));
    if (!quiet) toast("已写入存档：" + saveSummary(S));
    return true;
  } catch (e) { if (!quiet) toast("存档失败：浏览器存储不可用或已满。"); return false; }
}
function autoSave() { writeSave(SAVE_KEYS.auto, true); }
function readSave(key) {
  try { const d = JSON.parse(localStorage.getItem(key)); return d && d.S ? d : null; } catch (e) { return null; }
}
/* 存档版本迁移：从 fromV 逐版补字段/调结构，每步幂等。返回 null 表示无法迁移。 */
function migrateSave(d) {
  let v = d.v || 0;
  if (v > SAVE_VER) return null; // 来自更新版本的存档，旧客户端不认
  if (v < 2) { d.S.lastTrainDay = d.S.lastTrainDay || 0; v = 2; } // v1 → v2：新增三日历练计时
  if (v < 3) { d.S.professions = d.S.professions || {}; v = 3; } // v2 → v3：新增职业系统（第三章）
  if (v < 4) { d.S.darkWounds = d.S.darkWounds || {}; v = 4; } // v3 → v4：新增暗伤账（第十二章·永久损伤）
  if (v < 5) { d.S.gear = d.S.gear || {}; d.S.mats = d.S.mats || {}; v = 5; } // v4 → v5：新增随身兵器与材料账（炼丹炼器）
  if (v < 6) { d.S.masters = d.S.masters || {}; v = 6; } // v5 → v6：新增云游师傅名册（丹师/器火一脉随机 NPC）
  if (v < 7) { // v6 → v7：修为体系归正为四阶二十四境（凡/灵/玄/圣各六境）。旧粗三档「玄境/圣境/天人境」映射到新阶梯；修为需求曲线全变，当境进度清零
    const realmMap = { 8: 13, 9: 19, 10: 18 }; // 旧玄境→化神境（玄阶初）｜旧圣境→涅槃境（圣阶初）｜旧天人境→天人境（玄阶之巅，设定正解之位）
    if (d.S.realm >= 8) d.S.realm = realmMap[d.S.realm] || 7;
    d.S.cult = 0;
    v = 7;
  }
  if (v < 8) { // v7 → v8：新增性别/地点/缘分日常账/受伤/疾病字段
    d.S.gender = d.S.gender || "男";
    d.S.place = d.S.place || ((d.S.iden && d.S.iden.place) || (d.S.first ? null : "东荒 · 云州 · 青石城"));
    d.S.bondDaily = d.S.bondDaily || {};
    d.S.wound = d.S.wound || null; d.S.ill = d.S.ill || null;
    v = 8;
  }
  if (v < 9) { // v8 → v9：首世开局身份补录——随机惨境落定后身份/地点 UI 曾恒显「青石城 · 乞丐」，按开局背景回填 S.iden
    if (!d.S.iden && d.S.flags && d.S.flags.opening) {
      let iden = OP_IDEN[d.S.flags.opening] || null;
      if (!iden) for (const k in REGIONS) { // 区域惨境（北原/中州/西漠/南岭）自带身份
        const hit = (REGIONS[k].openings || []).find(o => o.id === d.S.flags.opening);
        if (hit && hit.iden) { iden = hit.iden; break; }
      }
      if (iden) { d.S.iden = iden; d.S.place = d.S.place || iden.place; }
    }
    v = 9;
  }
  d.v = SAVE_VER;
  return d;
}
function loadSaveData(d) {
  const m = migrateSave(d);
  if (!m) { toast("这份存档来自更新的游戏版本，请先刷新页面再读档。"); return; }
  S = m.S; META = m.META; saveMeta();
  gmBusy = false; window.__inCombat = false;
  closeEnd();
  $("#settings").classList.remove("open");
  $("#gacha").classList.remove("open");
  $("#saveModal").classList.remove("open");
  $("#nameModal").classList.remove("open");
  $("#log").innerHTML = m.log || "";
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
/* 首世命名（第十章：身份随机由天道掷定，姓名由玩家定，须合此界风物） */
function askName(then) {
  const modal = $("#nameModal"), input = $("#nameInput"), tip = $("#nameTip");
  let gender = META.gender || "男"; // 默认沿用随魂封存的性别选择
  document.querySelectorAll("#genderRow .gender-btn").forEach(b => {
    b.classList.toggle("on", b.dataset.g === gender);
    b.onclick = () => {
      gender = b.dataset.g;
      document.querySelectorAll("#genderRow .gender-btn").forEach(x => x.classList.toggle("on", x === b));
    };
  });
  const apply = (raw) => {
    const name = (raw || "").trim();
    if (name && !/^[\u4e00-\u9fa5·]{1,8}$/.test(name)) { tip.textContent = "须为汉字或间隔号，一至八字"; tip.style.color = "var(--hurt)"; return; }
    S.name = name || "阿七";
    S.gender = gender; META.gender = gender; saveMeta(); // 性别随魂：此后诸世不变，重开方可再选
    modal.classList.remove("open");
    renderPanel();
    if (typeof then === "function") then();
  };
  $("#nameConfirm").onclick = () => apply(input.value);
  input.onkeydown = e => { if (e.key === "Enter") apply(input.value); };
  tip.textContent = "的身份由天道掷定，名由你起"; tip.style.color = "";
  input.value = "";
  modal.classList.add("open");
  setTimeout(() => input.focus(), 50);
}
/* 首世开局惨境背景池（第十章铁律：际遇同型——惨境濒死之局；背景只是舞台，具体际遇由 AI 生成） */
const OPENING_QUEST = { pomiao: "活过这个冬天", laofang: "活过死牢寒夜", heikuang: "从矿道里爬出去", jitan: "挣脱祭坛，活过雪夜", yasong: "活着走到下一座城" };
const OPENINGS = [
  {
    id: "pomiao", place: "东荒 · 云州 · 青石城 · 城南破庙", title: "雪 夜 破 庙",
    lines: [
      "你睁开眼时，正躺在青石城南的破庙里。高烧三天，浑身滚烫，怀里揣着半个冻硬的黑馍。",
      (n) => `庙外有狼嚎。庙里有七个同样衣衫褴褛的乞丐，分食最后一点烤火余温——你是其中之一，排行最末，他们叫你「${n}」。`,
    ],
  },
  {
    id: "laofang", place: "东荒 · 云州 · 青石城 · 死囚牢", title: "寒 夜 死 牢",
    lines: [
      "你在刺骨的寒气里醒来——青石城大牢最深处，死囚牢。高烧三天，浑身滚烫，单衣结着霜。明日立冬，你的名字在秋决漏网的名单上，牢头说，熬不过今晚正好省一刀。",
      (n) => `隔壁的草堆里蜷着个老囚，咳得像具破风箱。他是这座牢里活得最久的人，囚犯们背后叫他「活阎王」——他问你名字，你报了「${n}」，他咧嘴笑了：「好，记住喽，阎王爷簿上添一笔。」`,
    ],
  },
  {
    id: "heikuang", place: "东荒 · 云州 · 青石城郊 · 黑矿窑", title: "矿 难 雪 夜",
    lines: [
      "你在煤尘与血腥气里醒来——城郊黑矿窑昨夜塌方，你被埋在支巷尽头，靠一条裂缝透气。高烧三天，浑身滚烫，怀里揣着半个冻硬的杂面饼。矿主的人在外头清点人数，多一个少一个，没人会知道。",
      (n) => `三步外，同巷的老矿工被压断了腿，正一声一声地念佛。他在这口窑里挖了二十年煤，是矿上唯一肯分你半张饼的人——他哑着嗓子喊你：「${n}，还在吗？」`,
    ],
  },
  {
    id: "jitan", place: "东荒 · 云州 · 青石城郊 · 荒祠", title: "祭 坛 雪 夜",
    lines: [
      "你在香火与血腥味里醒来——城郊荒祠，你被麻绳捆在祭坛上，高烧三天，浑身滚烫，是山民掳来「献给山神」的祭品。庙外大雪，篝火噼啪，守夜的巫祝喝得醉倒了一地。",
      (n) => `祭坛下还蜷着一个人——先你一步被掳来的货郎，腿上挨了一刀，烧得说胡话。巫祝们管你们叫「牲」——货郎迷迷糊糊抓住你的脚踝，唤你：「${n}……跑吗？」`,
    ],
  },
  {
    id: "yasong", place: "东荒 · 云州 · 青石城 · 出城雪道", title: "押 送 雪 道",
    lines: [
      "你在枷锁的冰冷里醒来——流放押送的队伍昨夜遇袭，解差死绝，押送的文书散了一地。高烧三天，浑身滚烫，你是队列里罪最轻的那个，枷锁钥匙就挂在死去的解差腰上。",
      (n) => `同枷的老犯人还有一口气，脚踝肿得发亮。他是队伍里唯一没欺负过你的人，分过你半壶水——他抬了抬眼皮：「${n}……钥匙……拿了就跑，别管我。」`,
    ],
  },
];
/* 首世惨境背景 → 身份对照：开局落定即写入 S.iden，身份/地点 UI 随随机结果同步，不再恒显「青石城 · 乞丐」 */
const OP_IDEN = {
  pomiao:   { grade: "狱", name: "破庙乞丐", desc: "雪夜破庙，高烧三天，排行最末的乞丐。", note: "「向死而生」此局本该死于当夜", place: "东荒 · 云州 · 青石城 · 城南破庙" },
  laofang:  IDENTITIES.find(i => i.name === "死囚"),
  heikuang: IDENTITIES.find(i => i.name === "矿奴"),
  jitan:    IDENTITIES.find(i => i.name === "祭品"),
  yasong:   { grade: "狱", name: "流犯", desc: "流放押送的队伍遇袭死绝，枷锁钥匙挂在死人腰上。", note: "「戴枷而行」脚程与体面，皆无", place: "东荒 · 云州 · 青石城 · 出城雪道" },
};
function startLife() {
  $("#log").innerHTML = "";
  gmBusy = false;
  if (S.first) {
    askName(() => {
    /* 首世开局：五域随机（设定铁律修订——首世不再恒定云州青石城；云州权重 50%，北原/中州/西漠/南岭均分其余） */
    const rr = Math.random();
    let rg = REGIONS.yunzhou, pool = OPENINGS;
    if (rr >= 0.5) {
      const others = [REGIONS.beiyuan, REGIONS.zhongzhou, REGIONS.ximo, REGIONS.nanling];
      rg = others[Math.min(others.length - 1, Math.floor((rr - 0.5) / 0.5 * others.length))];
      pool = rg.openings;
    }
    const op = pool[Math.floor(Math.random() * pool.length)]; // 惨境背景随机；际遇由 AI 生成
    S.flags.region = rg.key;
    S.flags.opening = op.id;
    S.iden = op.iden || OP_IDEN[op.id] || null; // 身份随开局落定（区域惨境自带身份；云州惨境查 OP_IDEN）
    S.place = (S.iden && S.iden.place) || op.place; // 随机开局落定，地点随之同步（顶栏常显）
    S.weather = rg.weatherW[Math.floor(Math.random() * rg.weatherW.length)]; // 初日天气随地域
    if (op.id === "rb_zhanglin") S.inv.quzhangcao = (S.inv.quzhangcao || 0) + 1; // 开局叙事「半把驱瘴草」落到实处（南岭瘴夜傍身之物）
    log(`<div class="scene-head"><div class="place">${op.place}</div>
      <h1>${op.title}</h1><div class="sub">仙陨历三万年 · 冬 · ${rg.name} · ${S.weather} —— 灵气潮汐三百年一涨一落，你穿越之时，正值涨潮之初。</div></div>`);
    [
      { t: "sys", s: "【万象轮盘已激活。】" },
      { t: "sys", s: "【开局赠礼：万象点 ×100（仅此一次，用完即止）。】" },
      { t: "sys", s: "【检测到宿主命格：天绝之命（原注定死于当夜）。】" },
      { t: "sys", s: "【检测到未知因果介入……命格已改写。】" },
      { t: "sys", s: "【宿魂来源：界外。此界因果：无。】" },
      { t: "sys", s: "【正在以宿主灵魂最熟悉的方式重构交互界面……完成。】" },
      ...op.lines.map(l => ({ t: "dim", s: typeof l === "function" ? l(S.name) : l })),
      { t: "sys", s: `【凡品任务已发布：${op.quest || OPENING_QUEST[op.id] || "活过眼前这一关"}。奖励：万象点 ×20。】` },
      { t: "sys", s: "【多余的话，没有。跑好你自己的。】" },
    ].filter(l => l.s).forEach(l => log(l.s, l.t));
    S.gmRecent = ["anchor"];
    renderPanel();
    QU.check(); // 激活主线（活过这个冬天），任务链随后由世界状态推进
    // 开局给生存方向的选项；此后的际遇由 AI 依设定集生成
    setChoices([
      { label: "摸摸索索找吃的", hint: "饿是眼下最大的死法。", fn: () => {
        S.hunger = Math.max(0, S.hunger - 12); S.hp = Math.max(1, S.hp - 1); S.sta = Math.max(0, S.sta - 1);
        log("你拖着滚烫的身子翻遍角落，找到几口能下咽的东西——胃里有了底，力气却更虚了。", "good");
        computeMods(); renderPanel(); gmTurn();
      } },
      { label: "寻个背风处蜷着", hint: "保存体力，熬过最冷的时辰。", fn: () => {
        S.sta = Math.min(staMax(), S.sta + 3); S.hp = Math.min(hpMax(), S.hp + 2); S.hunger = Math.min(100, S.hunger + 4);
        log("你缩进最背风的角落，把仅剩的体温抱成一团。风声远了些，你迷迷糊糊熬过了最难熬的时辰。", "dim");
        computeMods(); renderPanel(); gmTurn();
      } },
      { label: "睁着眼，想活的路", hint: "打量四周，记住每一条生路。", fn: () => {
        S.daoXin = Math.min(100, S.daoXin + 0.5); S.flags.watched = 1;
        log("你不肯闭眼。门在哪、缝在哪、谁手里有吃的、谁能求你——濒死的人把这一切看得格外清楚。", "dim");
        computeMods(); renderPanel(); gmTurn();
      } },
    ]);
    });
  } else {
    log(`<div class="scene-head"><div class="place">${esc(S.place || ("第 " + S.world + " 世 · 时间线继承"))}</div>
      <h1>再 世</h1><div class="sub">世界不为你回档。上一世你死去至今，已过了十余年。</div></div>`);
    const idenDesc = S.iden.desc.indexOf("新娘/新郎") >= 0 ? S.iden.desc.replace("新娘/新郎", S.gender === "女" ? "新娘" : "新郎") : S.iden.desc;
    log(`【序章 · 本地人生涯】十几年间，你以「${S.name}」的身份长大：${idenDesc}（${S.iden.note}）——不知系统，不知轮回，全情投入这一世的命。`, "dim");
    log(`直到今夜，命定的死局收紧，「不想死」烧到最烈的那一瞬间——`);
    sys(`【万象轮盘检测到宿主求生意志峰值。封印解除。欢迎回来。】`);
    const shockRate = Math.max(15, Math.min(95, Math.round(55 + S.daoXin * 0.4 + attr("int") * 2 - (S.world - 1) * 6))); // 融合冲击判定（15.4）：道心 × 智力 × 世数修正——世数越多，冲击越大
    if (Math.random() * 100 < shockRate) {
      sys(`【前世记忆决堤。称号、评语一次性涌入——千秋录已随上一世合上，等你重新刻下。融合冲击判定（${shockRate}%）：通过。这一世，你是第 ${S.world} 次睁眼。】`);
    } else {
      S.debuff = "weak"; S.debuffDays = 3; addXinmo(5, "记忆洪峰撕扯识海，心魔饱餐了一顿");
      sys(`【前世记忆决堤——融合冲击判定（${shockRate}%）：失败。】【意识混沌】人格撕裂，噩梦缠身，你抱头蜷了整整三日，才重新分清「我是谁」。（元气大伤 3 日 · 修炼停滞 · 心魔 +5）`);
    }
    sys(`【今生资质：${linggen().name}】${linggen().desc}${linggen().bonus ? "（" + linggen().bonus + "）" : ""}`);
    /* 地域风物：再世开局随出生地掷当地惨境（铁律一：际遇同型——惨境濒死，名随地域） */
    const rg = regionOf(S.place);
    S.flags.region = rg.key;
    if (rg.openings.length) {
      const op = rg.openings[Math.floor(Math.random() * rg.openings.length)];
      S.flags.opening = op.id;
      S.place = op.place;
      log(`<div class="scene-head"><div class="place">${esc(op.place)}</div>
        <h1>${op.title}</h1><div class="sub">${rg.name} · 命定死局收紧之夜——地域不同，死法各异，活路也各异。</div></div>`);
      op.lines.forEach(l => log(typeof l === "function" ? l(S.name) : l, "dim"));
      sys(`【凡品任务已发布：${op.quest}。奖励：万象点 ×20。】`);
    }
    S.weather = rg.weatherW[Math.floor(Math.random() * rg.weatherW.length)]; // 初日天气随地域
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

/* ================= 重开第一世 =================
   清空一切轮回进度（META、所有存档槽、当前人生），回到仙陨历三万年的雪夜破庙。
   AI 天道配置（Key 等）属于玩家设置，保留不动。 */
function askReset() {
  if (!S) return;
  const w = META.world, d = (META.deaths || 0), ach = (META.ach || []).length;
  showInfo("重开第一世", `<span style="color:var(--blood-hi)">不可逆 · 请三思</span>`,
    `将抹除：第 ${w} 世的当前人生${d ? `、${d} 次死亡轮回` : ""}、千秋录 ${ach} 项成就、全部称号与历世评语、四个存档槽——一切回到最初，你仍是那个高烧三天、怀里揣着半个黑馍的阿七。`,
    "「万象轮盘剥落，坠入虚空。雪，重新落了下来。」<br>AI 天道配置（Key / 模型）会保留。",
    [
      { label: "确认重开，万事归零", fn: () => { $("#infoModal").classList.remove("open"); resetToFirstLife(); } },
      { label: "再想想", fn: () => $("#infoModal").classList.remove("open") },
    ]);
}
function resetToFirstLife() {
  const oldDyn = (META && META.dynCards) || {}; // 记下历世 AI 生成词条，连内存里的奖池一并清空
  try {
    for (const k of Object.values(SAVE_KEYS)) localStorage.removeItem(k); // 所有存档槽
    localStorage.removeItem(META_KEY);
  } catch (e) {}
  META = { world: 1, deaths: 0, ach: [], dynAch: [], titles: [], rebirth: null, sysLv: 1, totalPulls: 0 }; // titles 必须显式初始化：gainTitle 直接 push，缺字段会崩
  // 内存痕迹一并抹去：AI 词条出盘、动态称号除名——重开即彻底重开，成就（机械与 AI）无一残留
  try {
    for (const id in oldDyn) {
      for (const tier of CARD_POOL) { const i = tier.findIndex(c => c.id === id); if (i >= 0) tier.splice(i, 1); }
      delete TITLES["dyn_" + oldDyn[id].name];
    }
  } catch (e) {}
  saveMeta();
  gmBusy = false; window.__inCombat = false;
  closeEnd();
  ["settings", "gacha", "saveModal", "infoModal", "nameModal"].forEach(id => $("#" + id).classList.remove("open"));
  newLife();
  startLife();
  sys(`【万象轮盘剥落，坠入虚空。雪，重新落了下来。】`);
  sys(`【宿主，你真的要再来一次？】`);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tabrow button").forEach((b, i) => b.onclick = () => { curTab = i; craftView = "cards"; renderTab(); });
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
  $("#btnReset").onclick = askReset;
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
