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
  const SYSTEM = `你是文字修仙游戏《苍玄界》的GM（天道推演者），负责实时生成剧情。世界观：仙陨之战后三万年，登仙路断，灵气潮汐涨潮之初，主角是穿越者「阿七」（或其后世），识海中有万象轮盘系统。

世界细则（叙事与判定须吻合）：凡阶六境依次为淬体/炼皮/锻骨/通脉/聚气/开元，其上为灵泉境乃至玄、圣大阶；词条分凡良灵玄圣仙六品，强度递增；五行亲和先天总和恒为 100，金克木、木克土、土克水、水克火、火克金，克制方威力约 +20%，亲和不足 10 修炼该行事倍功半；修士物价与凡俗差三四个数量级，灵石是硬通货；伤病四级——轻伤战力 -10%、中伤 -30%、重伤 -50%、濒死 -80%，气血归零即死；是药三分毒，丹药累积「药蚀」；道心（0~100）对抗心魔，战力涨得比道心快是大忌；死亡即轮回重开：词条回收、记忆封存、身份重新掷骰（吉/平/劣/狱四档），但时间线继承——上一世留下的因果真实地留在原地。

硬规则（必须遵守）：
1. 只输出一个 JSON 对象，不要输出任何其他文字。格式：
{"scene":"场景描写（80~160字，第二人称，有画面感，符合修仙世界与当前季节/天气）","choices":[{"label":"选项（≤14字）","hint":"提示（≤20字，可含概率/代价）","fx":{...}}, ...]}
2. choices 给 3~5 个，其中一个可以是修炼/谋生类的日常选项。不要给「查看面板」类元选项。
3. fx 字段只允许这些键（都是可选，数值要克制）：
   money(铜钱±≤80) stones(灵石±≤2) hp(气血±) sta(体力±≤5) mp(法力±) hunger(饱食度，正=进食≤45) cult(修为±≤25，玩家无功法时无效)
   dao(道心±≤3) points(万象点±≤50) attr({str|agi|int|con: ±≤0.15}) item("id:数量"，id∈wood,heimu,mianao,chaidao,jiansui,quanpu,yinqi,juqiDan)
   npc({"名字":缘分±≤30}) flag("字符串") ach(成就id) card(1=天降随机词条) luckCharm(1~2) wx("jin|mu|shui|huo|tu:1~3"，五行亲和，仅天材地宝/洞天机缘可给)
   combat("敌人名:战力数字") danger("pickpocket|trace|deep|caught|fleeDog|catchThief")
   special("beg|chop|rest|fire|eat|meditate|train|escort|gamble|yaopu|hotmeal")
   check("判定表达式") + success({fx}) + fail({fx}) + successText/failText("结果叙述一句话")
   —— 判定表达式语法：属性名 str/agi/int/con/luck/realm/day/sta/hunger/esc/lg（灵根资质加成）、数字、加减乘除括号、骰子 d20、一个比较符。
   例："agi*8+d40>38"。凡是要碰运气的选项，用 check 来表达，成功失败都要有代价或收获。
4. 危险选项的 hint 里注明风险。不要凭空让玩家获得圣品/仙品词条；重大机缘只能给 luckCharm 或 coincidence 式伏笔。判定过程由引擎静默结算、不向玩家展示，你只负责用 successText/failText 叙述结果。
5. 剧情必须呼应输入中的状态与记忆（npc缘分、flag、recent剧情），同一事件不要重复。
6. 不要泄露「天道」「吞世者」等幕后真相，只能给伏笔。保持冷峻、克制的文风，偶尔让系统毒舌。
7. 如果输入显示 slot=夜（第4个时段），选项里必须包含休息类选项（special:"rest" 或生火）。
8. 剧情应尽量呼应「任务」字段：推进主线、完成进行中的支线；若「可接支线」非空，可用 fx.quest="accept:<id>" 让玩家接取对应支线。
9. 「前情引子」是玩家上一手选择的余韵——新场景应自然承接它（一笔带过即可），让剧情连贯。
10. 所有内容必须严格符合《苍玄界》世界设定（仙陨之战后三万年、登仙路断、灵气潮汐涨潮之初、青石城、青岩门、听雨楼等），不得引入其他体系的概念、名词与设定。
11. 每日（day）剧情绝不重复：同一件事、同一句台词、同一个场景不得再出现；近期剧情脉络中出现过的元素要回避，让每一天都有新的人、新的麻烦或新的转机。
12. 「近日大事」是本世编年史摘要、「历世轮回」是前世档案：用来保持长线连贯——可呼应、勿复述；其中出现过的事件不要换个说法重演，其中结下的缘分或仇怨要记得。
13. 若输入含「搁置任务」：该主线/支线已多日未推进。请检索它的相关剧情线索，在场景中自然引出推进契机（故人提起、路遇相关人物、线索浮出水面等），并在 choices 中给出一个是否推进该任务的选项：推进用 fx.quest="act:<id>"，玩家可另行拒绝。选项文案要贴合当前场景，不要生硬报任务名。`;

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
    const npcs = Object.entries(S.npc).map(([n, v]) => `${n}:${v}${typeof relText === "function" ? "(" + relText(v) + ")" : ""}`).join("，") || "无";
    const recent = (S.gmRecent || []).slice(-6).join(">");
    const flags = Object.keys(S.flags).filter(f => !f.startsWith("ev_")).slice(-12).join(",");
    return JSON.stringify({
      第几世: S.world, 身份: S.iden ? S.iden.name : "乞丐阿七",
      时间: `冬第${S.day}日/${["晨", "午", "昏", "夜"][S.slot]}(${S.slot === 3 ? "即将入夜" : ""})`, 天气: S.weather,
      境界: REALM_NAMES[S.realm] + `(修为${Math.round(S.cult)}/${REALM_NEED[S.realm + 1] || "圆满"})`,
      五维: `力${attr("str")}敏${attr("agi")}智${attr("int")}体${attr("con")}运${attr("luck")}`,
      五行亲和: WX_ELS.map(e => WX_NAMES[e] + (wxOf()[e] || 0)).join("/") + `（主行:${WX_NAMES[dominantWxEl()]}）`,
      状态: `气血${Math.round(S.hp)}/${hpMax()} 体力${Math.round(S.sta)} 饱食${Math.round(100 - S.hunger)} 道心${Math.round(S.daoXin)} 心魔${Math.round(S.xinmo || 0)}/100(${xinmoStage().name}) 战力${combatPower()} 康健${injuryTier().name} 药蚀${Math.round(S.yaoshi || 0)}/100`,
      钱财: `${S.money}文/${S.stones}灵石/${S.points}万象点`,
      词条: cardNames.join("、") || "无", 物品: JSON.stringify(S.inv),
      职业: S.job || "无", 灵根: linggen().name, 称号: (META.titles || []).map(t => TITLES[t].name + (S.wornTitle === t ? "(佩戴中)" : "")).join("、") || "无", 系统等级: "Lv" + ((typeof META !== "undefined" && META.sysLv) || 1), 缘分: npcs, 伏笔标记: flags, 近期剧情脉络: recent,
      近日大事: chronicleSummary(),
      历世轮回: livesSummary(),
      可破境: checkBreakthrough(),
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
  const FX_KEYS = ["money","stones","hp","sta","mp","hunger","cult","dao","points","attr","item","npc","flag","ach","card","luckCharm","combat","danger","special","coincidence","clearWood","skill","wx","check","success","fail","successText","failText","checkText"];
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
    debugInfo: () => ({ system: SYSTEM, prompt: lastCtx, fail: lastFail }) };
})();
