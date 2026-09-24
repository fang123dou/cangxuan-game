/* 苍玄界 · 天道推演引擎（程序化动态 GM）
   剧情无任何固定脚本：由素材库依据游戏状态实时编排。
   有 AI Key 时由 ai.js 优先接管，本引擎作为兜底与离线模式。 */
"use strict";

const GM = (() => {

  /* ---------- 素材库 ---------- */
  const NPCS = [
    { n: "老丐头", tag: "外冷内热的老乞丐", want: "有人给庙里添一把柴" },
    { n: "周先生", tag: "回春堂坐堂药师", want: "找个识药的学徒" },
    { n: "说书人柳先生", tag: "茶楼说书人，消息比天机楼还快", want: "有人听他讲完一整段" },
    { n: "商会管事钱三", tag: "福源商会管事，算盘成精", want: "找个可靠的短工" },
    { n: "瞎眼老者", tag: "城隍庙前的神秘老者", want: "没人知道" },
    { n: "小贼细猴", tag: "手脚比脑子快的半大孩子", want: "一顿饱饭" },
    { n: "码头工头蛮牛", tag: "胳膊比常人大腿粗的工头", want: "肯下力气的人" },
    { n: "青岩门外门弟子陆沉", tag: "佩剑的年轻修士", want: "一个值得出剑的对手" },
    { n: "赌档庄家笑面佛", tag: "笑得越甜手越黑", want: "你的铜钱" },
    { n: "卖炭婆", tag: "推独轮车的老妇", want: "有人帮她推过石桥" },
    { n: "游方郎中", tag: "背着药箱的行脚医者", want: "一个肯听他讲古方的人" },
    { n: "雪夜寡妇", tag: "守着一间茶棚的女人", want: "棚里多点人气" },
  ];
  const PLACES = ["破庙", "城隍庙前", "回春堂药铺", "码头", "福源商会门前", "茶楼外", "赌巷", "桥洞下", "城墙根", "青岩山脚"];

  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
  function makeRng() { let s = (Date.now() ^ (Math.random() * 1e9)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---------- 境遇库 ----------
     每个境遇：cond(state) 是否可触发；w(state) 权重；
     build(rng, ctx) -> {scene, choices:[{label,hint,fx}]}
     ctx = {npc, place, weather, hungry, rich, realmLow, hasJob, luckHigh} */
  const SITUATIONS = [
    {
      id: "beg_copper", cond: c => c.hungry || c.poor, w: () => 3,
      build(r, c) {
        const p = pick(["绸缎铺的伙计", "挎篮的老妇", "醉醺醺的脚夫", "抱着孩子的妇人", "系围裙的厨娘"], r);
        const give = 2 + Math.floor(r() * 8);
        return {
          scene: `${p}在你碗前停住，打量你${c.hungry ? "凹陷的脸颊" : "单薄的衣裳"}。风雪天里，肯停下来的人不多。`,
          choices: [
            { label: "哑着嗓子道谢", hint: "姿态越低，铜钱越稳。", fx: { money: give, npc: { 路人缘: 2 } } },
            { label: "讲讲自己的凄惨", hint: "嘴皮子与运气的事：讨得多些，也讨人嫌些。", fx: { check: "int*4+luck*2+d30>34",
              success: { money: give + 4, dao: -0.3 }, fail: { dao: -0.6, npc: { 路人缘: -3 } },
              successText: "你把自己说得连自己都快信了。她眼圈一红，多搁了几枚铜钱，转身快步走开。",
              failText: "对方听得眉头越皱越紧，丢下一句「晦气」，拂袖而去。" } },
            { label: "不要了，去别处", hint: "骨气不能当饭吃——但气运可能会。", fx: { luckCharm: 1 } },
          ],
        };
      },
    },
    {
      id: "laogaitou", cond: c => true, w: c => c.npcKind("老丐头") ? 0 : 2,
      build(r, c) {
        return {
          scene: `老丐头把半碗热汤推给你：「喝。我这把老骨头，吃不吃都是这个冬天。」他的手抖得厉害，咳得像要散架。`,
          choices: [
            { label: "推回去，分他一半", hint: "善缘：雪中送炭。", fx: { hunger: 10, dao: 2, npc: { 老丐头: 40 } } },
            { label: "接过来吃掉", hint: "活着的人才配谈体面。", fx: { hunger: 20, dao: -1, npc: { 老丐头: -10 } } },
            { label: "把汤让给更小的乞儿", hint: "庙里最瘦的那个孩子正看着你。", fx: { hunger: 5, dao: 3, npc: { 老丐头: 20 } } },
          ],
        };
      },
    },
    {
      id: "laogaitou_return", cond: c => c.npcKind("老丐头") > 20, w: c => c.npcKind("老丐头") > 20 ? 3 : 0,
      build(r, c) {
        const s = c.npcKind("老丐头") >= 60;
        return {
          scene: s
            ? `老丐头朝你招手，从怀里摸出一枚磨得发亮的铜钱：「拿着。庙里神像的裂缝，白天摸，夜里别摸。」他浑浊的眼睛里有什么化了。`
            : `老丐头往火里添了根柴，没看你，但把最暖的位置让了出来。`,
          choices: [
            { label: "收下铜钱，记他这份情", hint: s ? "两枚前朝铜钱，不止值两文。" : "", fx: { money: 2, dao: 1, npc: { 老丐头: 10 } } },
            { label: "把铜钱换成黑馍分给大家", hint: "独食难肥。", fx: { hunger: 12, dao: 2, npc: { 老丐头: 15, 路人缘: 5 } } },
          ],
        };
      },
    },
    {
      id: "dock_work", cond: c => attr("str") >= 4, w: c => c.poor ? 3 : 1,
      build(r, c) {
        const pay = Math.round((22 + Math.floor(r() * 8)) * (S.job === "码头脚夫" ? 1.3 : 1));
        return {
          scene: `码头的麻袋比人高。工头蛮牛打量你的胳膊：「扛得动就二十五一趟，扛不动别挡道。」旁边几个苦力等着看你的笑话。`,
          choices: [
            ...(S.job || c.npcKind("码头工头蛮牛") < 30 ? [] : [{ label: "拜他做长期脚夫", hint: "职业：码头脚夫。工钱 +30%。", fx: { special: "dockjob" } }]),
            { label: "咬牙扛到底", hint: `力气与筋骨的考验。工钱约 ${pay} 文。`, fx: { check: "str*8+con*4+d20>55",
              success: { money: pay, attr: { str: 0.06, con: 0.05 }, sta: -4, npc: { 码头工头蛮牛: 4 } },
              fail: { money: Math.round(pay * 0.5), hp: -2, sta: -5, attr: { str: 0.03 } },
              successText: "最后一趟麻袋压弯了腰，但你直着走了回来。蛮牛上下打量你：「行啊，小子。」",
              failText: "搬到一半眼前发黑，被麻袋带着栽进雪里。蛮牛嗤笑一声，还是给了半份工钱。" } },
            { label: "挑轻的扛，偷个懒", hint: "摸鱼圣手附体？没有就老实点。", fx: { money: Math.round(pay * 0.6), attr: { str: 0.02 } } },
            { label: "不干了，腰要紧", hint: "", fx: { dao: 0.3 } },
          ],
        };
      },
    },
    {
      id: "chop_wood", cond: () => true, w: c => c.poor ? 2 : 1,
      build(r, c) {
        const w = 1 + (attr("str") >= 4 ? 1 : 0) + (S.inv.chaidao ? 1 : 0);
        return {
          scene: `城外矮林，枯枝覆雪。${c.weather === "风雪" ? "风卷着雪粒子打脸，" : ""}你抡起${S.inv.chaidao ? "柴刀" : "捡来的断枝"}，一下一下，呼出的白气散进林子里。`,
          choices: [
            { label: "砍满一担才回去", hint: `柴薪 ×${w}，磨炼力量。`, fx: { item: "wood:" + w, attr: { str: 0.08 }, sta: -3, cult: 2 } },
            { label: "砍一半，去林深处看看", hint: "深山有风险，机缘也是。", fx: { item: "wood:1", attr: { str: 0.04 }, danger: "deep" } },
          ],
        };
      },
    },
    {
      id: "sell_wood", cond: () => S.inv.wood > 0, w: () => 2,
      build(r) {
        const g = Math.round(S.inv.wood * 6 * (1 + (S.mods.moneyP || 0) / 100));
        return {
          scene: `你背着 ${S.inv.wood} 捆柴沿街问价。一户人家开了门缝：「雪天柴贵，六文一捆，少一分不要。」`,
          choices: [
            { label: "成交", hint: `+${g} 文。`, fx: { money: g, clearWood: 1 } },
            { label: "再磨一磨，讨个高价", hint: "嘴皮子功夫。", fx: { check: "int*5+d20>30",
              success: { money: g + 6, clearWood: 1, dao: 0.2 }, fail: { money: g, clearWood: 1, npc: { 路人缘: -2 } },
              successText: "你把柴火的干湿、雪天的行情说得头头是道。对方咂咂嘴，多给了六文。",
              failText: "对方把门一关：「爱卖不卖。」你只好按原价出手。" } },
          ],
        };
      },
    },
    {
      id: "steal_listen", cond: () => true, w: c => c.realmLow ? 2 : 1,
      build(r) {
        return {
          scene: `私塾窗根下，先生的声音隔着纸窗漏出来：「……天行健，君子以自强不息。」几个孩童摇头晃脑。你缩在墙根，听得入神。`,
          choices: [
            { label: "站着听完这一课", hint: "学识渐长，私塾先生对你青眼有加。", fx: { skill: "读书:6", npc: { 私塾先生: 3 }, cult: 1 } },
            { label: "替先生劈好院里那堆柴再走", hint: "力气换人情。", fx: { skill: "读书:4", npc: { 私塾先生: 10 } } },
          ],
        };
      },
    },
    {
      id: "yaopu", cond: c => !c.hasJob && (attr("int") >= 4 || (S.skills["读书"] || 0) >= 30), w: c => c.npcKind("周先生") ? 0 : 3,
      build(r) {
        return {
          scene: `回春堂里，周先生正为一个药童分不清黄芪当归发火：「朽木！」你瞥见柜上的药斗——这些名字，你在私塾窗外听过。`,
          choices: [
            { label: "上前辨药应试", hint: "读书有成，或智力 ≥4。这是你的机会。", fx: { special: "yaopu" } },
            { label: "默默走开", hint: "机会像雪，落在别人头上也是化。", fx: {} },
          ],
        };
      },
    },
    {
      id: "yaopu_work", cond: c => c.hasJob, w: () => 3,
      build(r) {
        const pay = Math.round((16 + Math.floor(r() * 8)) * (S.job === "药庐学徒" ? 1.3 : 1));
        return {
          scene: `药铺里药香苦涩。捣药、晾药、记药性。周先生偶尔指点两句：「这味要后下，那味需蜜炙。」胜过你瞎琢磨三天。`,
          choices: [
            { label: "老老实实帮工", hint: `工钱 +${pay} 文，识药 +，周先生缘 +。`, fx: { money: pay, skill: "识药:6", attr: { int: 0.05 }, npc: { 周先生: 3 } } },
            { label: "偷偷记下药方", hint: "邪修行径？或许只是好学。风险自负。", fx: { skill: "识药:10", attr: { int: 0.08 }, dao: -0.5, danger: "caught" } },
          ],
        };
      },
    },
    {
      id: "liushuren", cond: c => true, w: () => 2,
      build(r) {
        return {
          scene: `茶楼外，说书人柳先生一拍醒木：「话说三万年前仙陨之战，登仙路一夜断绝——」围观的人里三层外三层。`,
          choices: [
            { label: "站着听完一整段", hint: "智力 +，这个世界比你想象的深。", fx: { attr: { int: 0.08 }, npc: { "说书人柳先生": 5 }, cult: 1 } },
            { label: "花 2 文进茶楼听全套", hint: "连茶带水，还有座。", disabled: S.money < 2, fx: { money: -2, attr: { int: 0.12 }, npc: { "说书人柳先生": 10 }, flag: "heardStory" } },
            { label: "趁乱捏走旁边人的钱袋", hint: "身法要快，心要静。三只手的行当，三只手的因果。", fx: { check: "agi*8+d40>42",
              success: { money: 9, dao: -1, npc: { 路人缘: -2 } }, fail: { money: -4, dao: -1 },
              successText: "指尖一勾，钱袋到手。你垂着眼挤出人堆，心跳如鼓。",
              failText: "手腕被人一把攥住——你赔着笑丢下几文钱才脱身。" } },
          ],
        };
      },
    },
    {
      id: "blind_man", cond: c => c.luckHigh && !c.flag("metBlind"), w: c => c.luckHigh ? 2 : 0,
      build() {
        return {
          scene: `城隍庙前，一个瞎眼老者忽然「看」向你：「小娃娃，你身上的味道不对——不是这世的人，也不是这界的人。」`,
          choices: [
            { label: "请他指点（5 文）", hint: "江湖骗子还是世外高人，天知道。", disabled: S.money < 5, fx: { check: "luck*10+d40>55", money: -5,
              success: { cult: 15, npc: { 瞎眼老者: 30 }, flag: "metBlind", coincidence: 1 },
              fail: { npc: { 瞎眼老者: 5 }, flag: "metBlind", dao: -0.5 },
              successText: "老者枯指在你眉心轻轻一点。一瞬间，你「看」到了雪落在灵气上的样子。",
              failText: "老者收下钱，只慢悠悠说了句「天冷，多穿衣」。你觉得自己像个冤种。" } },
            { label: "当作耳旁风，快步走开", hint: "", fx: { dao: 0.2, flag: "metBlind" } },
          ],
        };
      },
    },
    {
      id: "gamble", cond: c => !c.flag("gambled"), w: c => c.poor ? 2 : 1,
      build() {
        return {
          scene: `赌巷深处骰子声哗啦。庄家笑面佛朝你招手：「小兄弟，手气这东西，不试怎么知道？」`,
          choices: [
            { label: "押一把（10 文）", hint: "气运管这种时候。", disabled: S.money < 10, fx: { special: "gamble" } },
            { label: "绕开走", hint: "赌档是吞钱的渊。", fx: { flag: "gambled", dao: 0.3 } },
          ],
        };
      },
    },
    {
      id: "old_woman", cond: c => true, w: () => 2,
      build() {
        return {
          scene: `石桥上坡，卖炭婆的独轮车陷在雪辙里，怎么推都纹丝不动。她喘着白气回头看你。`,
          choices: [
            { label: "帮她推过石桥", hint: "善缘 +，可能不止善缘。", fx: { sta: -2, npc: { 卖炭婆: 25 }, attr: { con: 0.04 } } },
            { label: "装作没看见", hint: "", fx: { dao: -0.5 } },
          ],
        };
      },
    },
    {
      id: "stray_dog", cond: c => c.weatherBad, w: c => c.weatherBad ? 3 : 0,
      build() {
        if (hasSpecial("hajimi")) return {
          scene: `寒潮里一条瘦狗拦路，红着眼涎水结冰——可它凑近你嗅了嗅，忽然摇起尾巴，趴在你脚边不动了。【哈基米】词条在发烫。`,
          choices: [{ label: "收了这个跟班", hint: "缘分簿上多了一条命的羁绊。", fx: { flag: "dog", dao: 2 } }],
        };
        return {
          scene: `一条饿疯的野狗拦在巷口，红着眼，涎水在下巴冻成冰凌。它盯上了你怀里的干粮。`,
          choices: [
            { label: "战", hint: "战力不足就先跑。", fx: { special: "combat:野狗:5" } },
            { label: "丢半块干粮引开它", hint: "破财免灾。", disabled: S.inv.heimu < 1, fx: { item: "heimu:-1", dao: 0.5 } },
            { label: "转身就跑", hint: "身法要快，心跳要稳。", fx: { danger: "fleeDog" } },
          ],
        };
      },
    },
    {
      id: "thief", cond: c => S.money >= 5 && !c.flag("thiefMet"), w: () => 2,
      build() {
        return {
          scene: `人潮里，一只脏手悄悄探向你的衣兜——是个比你还瘦的小贼，手快，眼神更快。`,
          choices: [
            { label: "反手拿住他", hint: "眼明手快，机不可失。", fx: { danger: "catchThief" } },
            { label: "由他去，装作不知", hint: "都是破庙里爬出来的命。", fx: { money: -3, npc: { 小贼细猴: 15 }, dao: 1 } },
          ],
        };
      },
    },
    {
      id: "winter_fox", cond: c => c.luckHigh && c.weatherBad, w: c => c.luckHigh ? 2 : 0,
      build() {
        return {
          scene: `雪地里一道白影掠过——通体雪白的狐，叼着一枚红彤彤的果子，回头看了你一眼，竟把果子放在你脚边，转身窜入林中。`,
          choices: [
            { label: "吃下灵果", hint: "天材地宝，入口即化。", fx: { plot: true, attr: { con: 0.4 }, hp: 3, dao: 1, coincidence: 1, wx: "huo:2" } },
            { label: "把果子供在城隍庙", hint: "敬天者，天或有应。", fx: { luckCharm: 2, dao: 2, coincidence: 1 } },
          ],
        };
      },
    },
    {
      id: "aura_spot", cond: c => c.realm >= 1 && !c.flag("auraSpot"), w: c => c.realm >= 1 ? 3 : 0,
      build() {
        return {
          scene: `你在青岩山脚打坐时，忽觉周身灵气一滞——某处岩缝里的灵气比别处浓了三成，像雪地里一口看不见的温泉。`,
          choices: [
            { label: "占据此处苦修", hint: "修为大涨。但福地会不会有主？", fx: { plot: true, cult: 22, attr: { int: 0.05 }, flag: "auraSpot", wx: "shui:2" } },
            { label: "记下位置，日后再来", hint: "稳妥。", fx: { cult: 8, flag: "auraSpot" } },
          ],
        };
      },
    },
    {
      id: "xiuxiu", cond: c => c.realm >= 2, w: c => c.realm >= 2 ? 2 : 0,
      build() {
        return {
          scene: `一个佩剑的年轻修士拦住你，抱拳：「在下陆沉，青岩门外门。看道友气血沉稳，可愿切磋一二？」`,
          choices: [
            { label: "应战", hint: "赢了涨声望，输了涨记性。", fx: { special: "combat:陆沉:" + (7 + S.realm * 2) } },
            { label: "拱手推辞", hint: "多一事不如少一事。", fx: { npc: { "青岩门外门弟子陆沉": 5 } } },
          ],
        };
      },
    },
    {
      id: "corpse_road", cond: c => !c.flag("corpseMet"), w: c => c.weatherBad ? 2 : 1,
      build() {
        return {
          scene: `雪地里半埋着一个冻僵的旅人，行囊还系在背上。以青石城的规矩，死人身上的东西，谁先翻到就是谁的。`,
          choices: [
            { label: "搜他的行囊", hint: "发死人财，有伤阴德。", fx: { money: 15, item: "heimu:1", dao: -2, flag: "corpseMet" } },
            { label: "挖个雪坑埋了他", hint: "费时费力。天地记得。", fx: { sta: -2, dao: 2, cult: 3, flag: "corpseMet", luckCharm: 1 } },
          ],
        };
      },
    },
    {
      id: "shanghui", cond: c => S.day >= 8 && !c.flag("huoDan"), w: () => 2,
      build() {
        return {
          scene: `福源商会门前，管事钱三贴出悬赏：「押货去邻镇，风雪天，三十文另加赏。有胆的报名。」脚夫们缩着脖子没人应。`,
          choices: [
            { label: "接下这单", hint: "战力不足者，慎。", fx: { special: "escort" } },
            { label: "看看热闹就走", hint: "", fx: { flag: "huoDan" } },
          ],
        };
      },
    },
    {
      id: "qingyan_rumor", cond: c => S.day >= 10 && !c.flag("qingyanRumor"), w: () => 2,
      build() {
        return {
          scene: `城门口新贴了榜文，里三层外三层——三流小宗「青岩门」大开山门收徒。涨潮之初，连小宗门都在抢人。有人说这是大世将启的征兆。`,
          choices: [
            { label: "去凑近看看榜文", hint: "记下规矩：测灵碑、问心、演武。", fx: { flag: "qingyanRumor", cult: 2, attr: { int: 0.03 } } },
            { label: "宗门与我何干", hint: "散修也有散修的路。", fx: { flag: "qingyanRumor", dao: 0.5 } },
          ],
        };
      },
    },
    {
      id: "hunger_craving", cond: c => c.hungry, w: c => c.hungry ? 4 : 0,
      build() {
        return {
          scene: `胃里像有把钝刀在搅。街角的馍铺蒸笼掀开，白汽腾起，麦香顺着风钻进你脑子里。`,
          choices: [
            { label: "买两个黑馍（4 文）", hint: "先活下去。", disabled: S.money < 4, fx: { money: -4, hunger: 24, item: "heimu:1" } },
            { label: "买一碗热汤面（5 文）", hint: "从舌尖暖到脚尖。【饱暖】不过如此。", disabled: S.money < 5, fx: { money: -5, hunger: 42, hp: 2, special: "hotmeal" } },
            { label: "咽咽口水，继续挨饿", hint: "挨饿抗冻是磨炼，但有暗伤风险。", fx: { attr: { con: 0.05 }, hp: -2, dao: -0.3 } },
          ],
        };
      },
    },
    {
      id: "train_moment", cond: c => c.realmLow, w: () => 2,
      build() {
        const sk = S.inv.yinqi ? "引气诀" : S.inv.quanpu ? "锻骨拳谱" : "乱拳";
        return {
          scene: `无人处，你按着心中所学演练「${sk}」。招式一遍又一遍，汗气在冷风里凝成白雾。${S.inv.yinqi ? "丹田里那丝凉意，似乎比昨日壮了一分。" : "气血随招式流转，筋骨隐隐发烫。"}`,
          choices: [
            { label: "练到力竭为止", hint: "修为 +，力量 +，体力 -。", fx: { cult: 7, attr: { str: 0.06 }, sta: -3, skill: sk + ":8" } },
            { label: "见好就收", hint: "修为 +。", fx: { cult: 4, sta: -1, skill: sk + ":4" } },
          ],
        };
      },
    },
    {
      id: "shop_visit", cond: () => true, w: c => c.poor ? 2 : 1,
      build() {
        return {
          scene: `城东「云州杂货」的铺面不大会儿前排起了队。掌柜拨着算盘，眼皮都不抬：「雪天的价，一天的价。要什么都自己看。」`,
          choices: [
            { label: "进店逛一逛", hint: "打开商铺面板，日用百货应有尽有。", fx: { flag: "shopHint" } },
            { label: "只看不买", hint: "", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    {
      id: "rest_fire", cond: c => c.slotNight || true, w: () => 1,
      build() {
        return {
          scene: `回到破庙，七张枯瘦的脸围着将熄的火堆。${S.inv.wood >= 2 ? "墙角堆着你砍的柴。" : "柴堆见了底，火舌一缩一缩。"}庙外风雪声一阵紧似一阵。`,
          choices: [
            { label: S.inv.wood >= 2 ? "添柴生火，让大家烤暖" : "捡点庙里的碎木生火", hint: S.inv.wood >= 2 ? "柴薪 -2，今夜不寒。" : "火小，聊胜于无。", fx: S.inv.wood >= 2 ? { item: "wood:-2", special: "fire" } : { special: "fire" } },
            { label: "挤在最暖的角落睡下", hint: "恢复些气血。", fx: { special: "rest" } },
          ],
        };
      },
    },
    {
      id: "weird_detail", cond: c => true, w: () => 1,
      build() {
        return {
          scene: `你在雪地里看见一串脚印，从城外一直延伸到城隍庙后墙，却在墙根处戛然而止——像那个人走到那里，忽然就消失了。`,
          choices: [
            { label: "循着痕迹查一查", hint: "好奇心是修士的第一块垫脚石，也是第一口棺材。", fx: { plot: true, coincidence: 1, attr: { int: 0.05 }, danger: "trace" } },
            { label: "不去管它", hint: "世界很大，怪事很多。", fx: { dao: 0.3 } },
          ],
        };
      },
    },
    {
      id: "wudao_teacher", cond: c => typeof QU !== "undefined" && QU.isActive("mq_wudao") && !S.flags.wudaoGifted, w: () => 8,
      build() {
        return {
          scene: `雪霁的清晨，一个断腿的落魄武师蜷在墙根晒太阳，面前摆着个缺口的粗瓷碗。见你盯着他碗边那两卷旧册子看，他嗤笑一声：「想看？拿去。一部吐纳炼气，一部淬体熬力——都是不入流的货色，练到顶也就是个凡阶把式。」他把两卷油布包着的册子往你面前一推，「老子的腿废了，传人不能断。择一部，别贪心。」`,
          choices: [
            { label: "选《引气诀》", hint: "吐纳炼气，炼气士的正路（1 阶功法）。", fx: { item: "yinqi:1", flag: "wudaoGifted", dao: 1 } },
            { label: "选《锻骨拳谱》", hint: "淬体熬力，武夫的路子（1 阶功法）。", fx: { item: "quanpu:1", flag: "wudaoGifted", dao: 1 } },
          ],
        };
      },
    },
    {
      id: "gaimai", cond: c => S.flags.metBlind && S.realm >= 1 && ["za", "san"].includes(S.linggen) && (S.gaimai || 0) < 4, w: () => 2,
      build(r) {
        const n = S.gaimai || 0;
        const rate = [10, 25, 40, 60][Math.min(n, 3)];
        return {
          scene: `城隍庙前，瞎眼老者拦下你：「你这灵根，淤塞得厉害。」他枯指隔空一搭你的脉门，「老夫替你洗一洗——五十文。洗脉如改命，这是你第 ${["一", "二", "三", "四"][Math.min(n, 3)]} 回改脉，失败率 ${rate}%。敢么？」`,
          choices: [
            { label: "洗髓改脉（50 文）", hint: `改脉痕：失败率 ${rate}%。成则灵根提纯一档。`, disabled: S.money < 50, fx: { special: "gaimai" } },
            { label: "告辞", hint: "灵根是天定的，命是自己的。", fx: { dao: 0.3 } },
          ],
        };
      },
    },

  ];

  /* ---------- 上下文 ---------- */
  function buildCtx() {
    return {
      weather: S.weather,
      weatherBad: S.weather === "大雪" || S.weather === "风雪" || S.flags.coldSnap,
      hungry: S.hunger > 65,
      poor: S.money < 15,
      realm: S.realm, realmLow: S.realm <= 1,
      luckHigh: attr("luck") >= 5,
      hasJob: S.job === "药庐学徒",
      slotNight: S.slot === 3,
      npcKind: n => S.npc[n] || 0,
      flag: f => S.flags[f],
    };
  }

  /* ---------- 场景编排 ---------- */
  function compose() {
    const rng = makeRng();
    const ctx = buildCtx();
    // 防重复：近期 8 次 + 当日全部（同一天内剧情不重复）
    const seen = new Set((S.gmRecent || []).slice(-8).concat(S.daySeen || []));
    let pool = SITUATIONS.filter(s => {
      if (seen.has(s.id)) return false;
      try { return s.cond(ctx); } catch (e) { return false; }
    });
    // 当日耗尽才放宽到「近期不重复」
    if (!pool.length) pool = SITUATIONS.filter(s => {
      if ((S.gmRecent || []).slice(-8).includes(s.id)) return false;
      try { return s.cond(ctx); } catch (e) { return false; }
    });
    if (!pool.length) pool = SITUATIONS.filter(s => { try { return s.cond(ctx); } catch (e) { return false; } });
    if (!pool.length) return fallbackScene(ctx);
    let tot = pool.reduce((a, s) => a + Math.max(0.1, s.w(ctx)), 0);
    let r = rng() * tot, sit = pool[0];
    for (const s of pool) { r -= Math.max(0.1, s.w(ctx)); if (r <= 0) { sit = s; break; } }
    const built = sit.build(rng, ctx);
    built.scene = polish(built.scene, ctx);
    // 压入记忆 + 当日已见
    S.gmRecent = (S.gmRecent || []).slice(-7).concat([sit.id]);
    S.daySeen = (S.daySeen || []).concat([sit.id]);
    return built;
  }
  function polish(text, ctx) {
    // 按时段与天气润色开头
    const slotWord = ["清晨", "午后", "黄昏", "夜里"][S.slot];
    const head = ctx.weatherBad ? `${slotWord}，风雪未歇。` : `${slotWord}，天色${S.slot >= 2 ? "渐沉" : "灰白"}。`;
    return head + text;
  }
  function fallbackScene(ctx) {
    return {
      scene: `${["清晨", "午后", "黄昏", "夜里"][S.slot]}，${S.weather}。青石城的一天又翻过一页，你继续熬着。`,
      choices: [
        { label: "去讨饭", hint: "智力定你讨不讨得到，气运定你遇上什么人。", fx: { special: "beg" } },
        { label: "进山砍柴", hint: "柴薪能卖钱，也能夜里生火。", fx: { special: "chop" } },
        { label: "跑步翻墙", hint: "敏捷磨炼。", fx: { attr: { agi: 0.09 }, sta: -2, cult: 2 } },
        { label: "烤火歇息", hint: "恢复气血体力。", fx: { special: "rest" } },
      ],
    };
  }
  return { compose };
})();
