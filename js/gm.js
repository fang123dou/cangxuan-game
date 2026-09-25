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
          scene: `城隍庙前，一个瞎眼老者忽然「看」向你：「小娃娃，你的命格不对——死气里透着活气，像极了已死之人在走路。」`,
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
      id: "old_woman", cond: c => true, w: () => 2, social: true,
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
      id: "stray_dog", cond: c => true, w: c => c.weatherBad ? 3 : 1, social: true, // 哈基米：任何天气都可能撞见这条狗（坏天气更频）
      build() {
        if (hasSpecial("hajimi")) return {
          scene: `寒潮里一条瘦狗拦路，红着眼涎水结冰——可它凑近你嗅了嗅，忽然摇起尾巴，趴在你脚边不动了。【哈基米】词条在发烫。`,
          choices: [{ label: "收了这个跟班", hint: "缘分簿上多了一条命的羁绊。", fx: { flag: "dog", dao: 2, pet: "瘦狗", npc: { 瘦狗: 30 } } }],
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
      id: "thief", cond: c => S.money >= 5 && !c.flag("thiefMet"), w: () => 2, social: true,
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
        const sect = (typeof regionOf === "function" ? regionOf(S.place) : REGIONS.yunzhou).sect || REGIONS.yunzhou.sect; // 宗门随出生地地域
        return {
          scene: `你在${sect.name}后山山脚打坐时，忽觉周身灵气一滞——某处岩缝里的灵气比别处浓了三成，像雪地里一口看不见的温泉。`,
          choices: [
            { label: "占据此处苦修", hint: "修为大涨。但福地会不会有主？", fx: { plot: true, cult: 22, attr: { int: 0.05 }, flag: "auraSpot", wx: "shui:2" } },
            { label: "记下位置，日后再来", hint: "稳妥。", fx: { cult: 8, flag: "auraSpot" } },
          ],
        };
      },
    },
    {
      id: "xiuxiu", cond: c => c.realm >= 2, w: c => c.realm >= 2 ? 2 : 0, social: true,
      build() {
        const sect = (typeof regionOf === "function" ? regionOf(S.place) : REGIONS.yunzhou).sect || REGIONS.yunzhou.sect; // 切磋者随出生地宗门
        const short = sect.npc.replace(/^.*(?:弟子|勇士|沙弥|巫徒)/, ""); // 道号：陆沉/乌勒/沈青梧/了尘/蓝朵
        return {
          scene: `一个佩剑的年轻修士拦住你，抱拳：「在下${short}，${sect.name}外门。看道友气血沉稳，可愿切磋一二？」`,
          choices: [
            { label: "应战", hint: "赢了涨声望，输了涨记性。", fx: { special: "combat:" + short + ":" + (7 + S.realm * 2) } },
            { label: "拱手推辞", hint: "多一事不如少一事。", fx: { npc: { [sect.npc]: 5 } } },
          ],
        };
      },
    },
    {
      id: "corpse_road", cond: c => !c.flag("corpseMet"), w: c => c.weatherBad ? 2 : 1,
      build() {
        return {
          scene: `雪地里半埋着一个冻僵的旅人，行囊还系在背上。以${placeTown()}的规矩，死人身上的东西，谁先翻到就是谁的。`,
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
        const sect = (typeof regionOf === "function" ? regionOf(S.place) : REGIONS.yunzhou).sect || REGIONS.yunzhou.sect; // 收徒榜文随出生地宗门
        return {
          scene: `城门口新贴了榜文，里三层外三层——三流小宗「${sect.name}」大开山门收徒。涨潮之初，连小宗门都在抢人。有人说这是大世将启的征兆。也有老人撇嘴：测灵碑择根，杂灵根的娃娃连门槛都摸不着——年年贴榜，年年有人白跑一趟。`,
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
      id: "rest_fire", cond: c => c.slotNight, w: () => 1,
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
      id: "shutong", cond: c => S.flags.metBlind && S.realm >= 1 && (S.shutong || 0) < 4, w: () => 2,
      build(r) {
        const n = S.shutong || 0;
        const rate = [10, 25, 40, 60][Math.min(n, 3)];
        return {
          scene: `城隍庙前，瞎眼老者拦下你：「你这经脉，淤堵得厉害。」他枯指隔空一搭你的脉门，「灵根是天生的，老夫改不了，也不该改——但替你通一通闭塞的支脉，五十文。这是你第 ${["一", "二", "三", "四"][Math.min(n, 3)]} 回点脉，失手率 ${rate}%。敢么？」`,
          choices: [
            { label: "疏通经脉（50 文）", hint: `失手率 ${rate}%。成则修为有感、主行亲和 +2。`, disabled: S.money < 50, fx: { special: "shutong" } },
            { label: "告辞", hint: "灵根是天定的，命是自己的。", fx: { dao: 0.3 } },
          ],
        };
      },
    },
    /* ---------- 功法谱系获取剧情（功法谱系见 data.js GONGFU）：求法不空转 ----------
       宗门线：锻骨境外门弟子领本门 1 阶根本法；灵阶弟子内门考核领 2 阶内篇。
       散修线：灵品功法圆满后（seekGongfu=2），按灵根主行于古籍摊/自悟求得玄品。 */
    {
      id: "sect_chuangong",
      cond: c => S.sect && S.realm >= 3 && (typeof GONGFU !== "undefined") && GONGFU.some(g => g.line === "sect" && g.tier === 1 && g.sect === S.sect && !(S.inv[g.id] > 0)),
      w: () => 9,
      build() {
        const g = GONGFU.find(g => g.line === "sect" && g.tier === 1 && g.sect === S.sect && !(S.inv[g.id] > 0));
        const rg = (typeof regionOf === "function") ? regionOf(S.place) : null;
        const rn = (rg && rg.sect && rg.sect.name === S.sect) ? rg.sect.npc : "传功执事";
        const SECT_SPELL = { 青岩门: "sp_dici", 灰狼图腾殿: "sp_huoqiu", 落霞剑宗: "sp_gengjin", 枯泉寺: "sp_shuijian", 百苗巫寨: "sp_qingteng" }; // 本门护道法术：随根本法同授（data.js SPELLS）
        const spId = SECT_SPELL[S.sect];
        const spNew = spId && (typeof SPELLS_BY_ID !== "undefined") && SPELLS_BY_ID[spId] && !((S.spells || {})[spId] > 0);
        return {
          scene: `${S.sect}传功殿前，${rn}拦住你：「境界已至锻骨，筋骨里却还没有本门心法——空有一身气力，灵气从哪条脉走？」他上下打量你，「按门规，外门弟子锻骨境可领一部根本法。随我来。」`,
          choices: [
            { label: `拜领《${g.name}》`, hint: `${g.tierName} · ${WX_NAMES[g.el]}行。${g.desc}${spNew ? "——本门护道法术同授。" : ""}`, fx: Object.assign({ item: g.id + ":1", dao: 1, npc: { [rn]: 5 } }, spNew ? { spell: spId } : {}) },
            { label: "再想想", hint: "功法择一而修，慎重点没错。", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    {
      id: "sect_neimen",
      cond: c => S.sect && S.realm >= 7 && (typeof GONGFU !== "undefined") && GONGFU.some(g => g.line === "sect" && g.tier === 2 && g.sect === S.sect && !(S.inv[g.id] > 0)),
      w: () => 8,
      build() {
        const g = GONGFU.find(g => g.line === "sect" && g.tier === 2 && g.sect === S.sect && !(S.inv[g.id] > 0));
        const rg = (typeof regionOf === "function") ? regionOf(S.place) : null;
        const rn = (rg && rg.sect && rg.sect.name === S.sect) ? rg.sect.npc : "内门执事";
        return {
          scene: `${S.sect}的钟声响了九响——内门考核开台。${rn}找到你：「灵阶弟子可入内门一试。过了，本门真传《${g.name}》有你一部。」台下外门弟子黑压压一片，都看向你。`,
          choices: [
            { label: "登台应考", hint: `演武较技：胜则入内门，领《${g.name}》（${g.tierName} · ${WX_NAMES[g.el]}行）。`, fx: { special: "neimenKaohe" } },
            { label: "再备几日", hint: "内门考核年年有，不必急于一时。", fx: { dao: 0.3 } },
          ],
        };
      },
    },
    {
      id: "sanxiu_qiufa",
      cond: c => !S.sect && (S.flags.seekGongfu || 0) >= 2 && S.realm >= 7 && (typeof GONGFU !== "undefined") && GONGFU.some(g => g.line === "sanxiu" && g.el === dominantWxEl() && !(S.inv[g.id] > 0)),
      w: () => 8,
      build() {
        const el = dominantWxEl();
        const g = GONGFU.find(g => g.line === "sanxiu" && g.el === el && !(S.inv[g.id] > 0));
        return {
          scene: `功法推演至尽头已有些时日。城里古籍摊的跛脚掌柜招呼你：「客官身上有股子${WX_NAMES[el]}气——前几日收了半匣前朝残卷，里头或有你求的东西。三百文，淘不淘随你。」`,
          choices: [
            { label: "花三百文淘残卷", hint: `玄品功法《${g.name}》或在此匣中。钱货两讫，童叟无欺。`, disabled: S.money < 300, fx: { money: -300, item: g.id + ":1" } },
            { label: "凭自身感悟硬推", hint: "判定：以圆满功法为基，自衍下一阶。败则灵气逆行、经脉受损。", fx: { check: "int*6+luck*3+d30>60",
                success: { item: g.id + ":1" }, fail: { hp: -15, dao: -1 },
                successText: `七日七夜的推演在某一刻豁然贯通——《${g.name}》的字句，竟与你胸中推演严丝合缝。`,
                failText: "灵气逆行，你哇地喷出一口血——越阶强推，经脉吃不住。" } },
            { label: "离开", hint: "机缘不等人，但也不会一夜跑光。", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    /* ---------- 具名法术 · 古籍玉简（散修线）：气海既开，法术可求 ----------
       1 阶灵品聚气境可修（铜钱可购）；2 阶玄品灵阶可修（灵石计价）——与功法谱系三源同理（data.js SPELLS 名录） */
    {
      id: "spell_tome", cond: () => S.realm >= 5 && (typeof SPELLS !== "undefined") && SPELLS.some(sp => S.realm >= sp.gate && !((S.spells || {})[sp.id] > 0) && !sp.kind && (!sp.linggen || sp.linggen === S.linggen)),
      w: () => 3,
      build(r) {
        // 灵根专属法术不入玉简池（设定：唯对应灵根可修，由灵根支线授予）；禁术亦不入（设定：唯残页/剧情可遇）
        const pool = SPELLS.filter(sp => S.realm >= sp.gate && !((S.spells || {})[sp.id] > 0) && !sp.kind && (!sp.linggen || sp.linggen === S.linggen));
        const sp = pick(pool, r);
        const isT1 = sp.tier === 1;
        const canPay = isT1 ? S.money >= 120 : S.stones >= 8;
        const elName = sp.el ? WX_NAMES[sp.el] + "行" : "五行轮转";
        return {
          scene: `城隍庙外的旧书摊，跛脚掌柜从匣底抽出一枚玉简——${elName}灵气隐隐流动：「『${sp.name}』，${sp.tierName}。气海开了的人，才配谈这个。」他瞥你一眼，「${isT1 ? "一百二十文" : "八枚灵石"}，爱要不要。」`,
          choices: [
            { label: `买下「${sp.name}」`, hint: `${sp.tierName} · ${elName} · 耗法 ${sp.mp}。`, disabled: !canPay, fx: isT1 ? { money: -120, spell: sp.id } : { stones: -8, spell: sp.id } },
            { label: "看看就走", hint: "玉简不会跑，铜钱会。", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    /* ---------- 禁术残页（设定集·禁术：威力强大的代价）——灵阶可遇，低权重，高危 ----------
       不入古籍玉简池；燃法/献祭/同归于尽唯残页与特殊剧情授予。收下时道心微震——你早知道它不简单。 */
    {
      id: "jinshu_page", cond: () => S.realm >= 7 && (typeof SPELLS !== "undefined") && SPELLS.some(sp => sp.kind === "jinshu" && !((S.spells || {})[sp.id] > 0)),
      w: () => 1,
      build(r) {
        const pool = SPELLS.filter(sp => sp.kind === "jinshu" && !((S.spells || {})[sp.id] > 0));
        const sp = pick(pool, r);
        return {
          scene: `黑市最里的角落摊位，摊主蒙着面，推来一页焦边残纸——纸上的字像用血写的，看久了眼睛发涩：「『${sp.name}』。禁术。威力是真的，代价也是真的。」他不等你还价，只补了一句：「用不用随你。用了，就别想退。」`,
          choices: [
            { label: `收下「${sp.name}」残页`, hint: `代价：${sp.cost}`, fx: { spell: sp.id, dao: -1 } },
            { label: "烧掉它", hint: "有些东西，不碰为好。", fx: { dao: 0.5 } },
          ],
        };
      },
    },
    /* ---------- 圣药线 · 万年地心乳（设定集天材地宝名录圣品：重塑道基、修复暗伤药毒）——道伤救赎回路 ----------
       两段式：先买传闻（灵阶后期起、须身负道伤/暗伤），再深入地脉溶洞夺乳。此物有价无市，一世只得一滴。 */
    {
      id: "shengyao_rumor", cond: () => S.realm >= 9 && !S.flags.shengYaoClue && !S.flags.shengYaoDone && !S.inv.dixinru
        && ((S.daoShang || 0) > 0 || Object.keys(S.darkWounds || {}).some(k => S.darkWounds[k] > 0)),
      w: () => 2,
      build() {
        return {
          scene: `听雨楼的后堂，说书人歇了嗓子，茶客却压低了声音：「……西漠地底有座万年溶洞，地脉之气凝了一滴『地心乳』——重塑道基的圣物。前朝有个道基受损的老修士，为了一滴乳，把全副身家都折进去了。」他瞥见你杯中的茶凉透了，「客官对这等传说，倒听得认真。」`,
          choices: [
            { label: "买下这条消息", hint: "三枚灵石，买溶洞的方位与进去的路。童叟无欺。", disabled: S.stones < 3, fx: { stones: -3, flag: "shengYaoClue" } },
            { label: "只当听个故事", hint: "圣物有价无市——故事免费，路要自己蹚。", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    {
      id: "shengyao_hunt", cond: () => S.realm >= 9 && !!S.flags.shengYaoClue && !S.flags.shengYaoDone && !S.inv.dixinru,
      w: () => 5,
      build() {
        return {
          scene: `西漠腹地，沙海之下。你循着买来的方位掘开塌陷的洞口，阴冷的地气扑面而来——溶洞深处，石笋倒悬，一点乳白的微光在黑暗里一明一灭，像大地的心跳。光晕之下，盘踞着一头被地气滋养了不知多少年的岩甲螭，甲壳与溶洞长在了一起。`,
          choices: [
            { label: "硬闯（体质/力量判定）", hint: "判定：从岩甲螭的眼皮下取乳。败则重创。",
              fx: { check: "con*8+str*4+luck*2+d30>85",
                success: { item: "dixinru:1", flag: "shengYaoDone" }, fail: { hp: -40 },
                successText: `你贴着石壁的阴影挪到石笋下，指尖触到那一点温润——地心乳入手的一瞬，整个溶洞的地气都为之一滞。岩甲螭睁开眼时，你只余一道背影。`,
                failText: `岩甲螭的尾巴横扫过来，你像破布袋一样撞在石壁上——乳没取着，肋骨断了两根。` } },
            { label: "以智取（智力判定）", hint: "判定：观地气潮汐，待螭蜕甲换气的一瞬取之。败则被地气所伤。",
              fx: { check: "int*9+luck*3+d30>80",
                success: { item: "dixinru:1", flag: "shengYaoDone" }, fail: { hp: -20, dao: -1 },
                successText: `你在洞口守了两天两夜，看准地气退潮、岩甲螭蜕甲换气的半个时辰——乳已在你怀中，它还未察觉。`,
                failText: `地气潮汐比你推演的早了半刻——阴寒之气倒灌经脉，你狼狈退出，只余一身内伤。` } },
            { label: "退出去", hint: "圣药不会跑，命只有一条。改日再来。", fx: { dao: 0.3 } },
          ],
        };
      },
    },
    /* ---------- 仙品任务「雪泥鸿爪」兜底剧情（第十一章：只留痕，不点破） ----------
       寻信物 → 了断去留；两场景串起目标二、三，AI 在线时亦可自行演绎（fx.flag 同名） */
    {
      id: "xian_relic",
      cond: c => (typeof QU !== "undefined") && QU.isActive("xian_henji") && !S.flags.xianRelic,
      w: () => 9,
      build() {
        return {
          scene: `城隍庙后墙塌了一角。积雪里露出半截石匣，匣身没有锁，却严丝合缝——你拂开雪，看见匣盖上刻着一圈纹样：不属于这一朝，不属于任何一朝。四周很静，静得连风声都绕开了这里。`,
          choices: [
            { label: "取出匣中信物", hint: "一片非金非玉的残牌。它不该在这里。", fx: { flag: "xianRelic", coincidence: 1, dao: -0.5 } },
            { label: "请瞎眼老者过目再取", hint: "他摸过的老物件比你见过的多。", disabled: !S.flags.metBlind, fx: { flag: "xianRelic", coincidence: 1, npc: { 瞎眼老者: 8 } } },
            { label: "把雪推回去，当没看见", hint: "有些东西，看见了就是债。", fx: { dao: 1 } },
          ],
        };
      },
    },
    {
      id: "xian_follow",
      cond: c => (typeof QU !== "undefined") && QU.isActive("xian_henji") && !!S.flags.xianRelic && !S.flags.xianChoice,
      w: () => 9,
      build() {
        return {
          scene: `夜里。你枕边的残牌微微发烫——不是错觉。窗外没有脚印，门闩没有动过，可你就是知道：有「什么」来过了，又走了，只在桌上留了一小撮灰，灰里埋着三枚灵石。`,
          choices: [
            { label: "收下灵石，把残牌留在桌上", hint: "两讫。谁也不欠谁。", fx: { flag: "xianChoice", stones: 3, dao: 0.5 } },
            { label: "把残牌收进怀里，谁也不给", hint: "既然找上你，就是你的因果。", fx: { flag: "xianChoice", luckCharm: 1, coincidence: 1 } },
            { label: "对着空屋子问一句「是谁」", hint: "判定：问，未必有答；但问本身会被记住。", fx: { check: "int*7+luck*3+d30>55",
                success: { flag: "xianChoice", coincidence: 1, dao: 1 }, fail: { flag: "xianChoice", hp: -5 },
                successText: "没有回答。但那一瞬，你识海里掠过一句没有来源的话：「跑好你自己的。」",
                failText: "没有回答。当夜你做了个很长的梦，醒来时太阳穴突突地疼。" } },
          ],
        };
      },
    },
    /* ---------- 修行记事（打坐参悟/向 NPC 讨教的专属后续剧情） ----------
       设定依据：打坐一时辰约回一成（体质定恢复）、灵阶起打坐替代睡眠；名录人物可讨教。
       参悟/讨教结算后由引擎记下 S.medScene，下一回合 AI 提示词（修行记事）与离线引擎（本二景）
       双双承接——或写余韵，或让点拨者现身考校；build 时即焚，不空转不滞留。 */
    {
      id: "med_teacher",
      cond: () => !!(S.medScene && S.medScene.teacher),
      w: () => 12,
      build() {
        const m = S.medScene; S.medScene = null; // 用完即焚
        const t = m.teacher;
        return {
          scene: `${["清晨", "午后", "黄昏", "夜里"][S.slot]}，${t}负手而来，目光在你周身一落：「昨日点拨的「${m.focus}」，练给我看看。」${m.nearCap ? `你起手演式，气机贯通——连你自己都听见了那层薄膜将破未破的声响。${t}眼中精光一闪：「瓶颈要破了。就差一层窗户纸。」` : `你依言演完一套，${t}点点头，又挑出两处瑕疵，一一拆给你听。`}`,
          choices: [
            { label: `请${t}再点拨一二`, hint: `再耗一时辰：讨教参悟「${m.focus}」（×1.5 熟练），缘分 +2。`, fx: { special: "meditate", focus: m.focus, teacher: t } },
            { label: "谢过先生，各行其是", hint: "师徒缘深一分，道心稳一分。", fx: { npc: { [t]: 2 }, dao: 0.5 } },
            { label: `向${t}讨教行走江湖的经验`, hint: "判定：口聪心诚，则得几句要紧的叮嘱。", fx: { check: "int*6+dao*0.3+d20>30",
                success: { npc: { [t]: 4 }, attr: { int: 0.05 } }, fail: { npc: { [t]: 1 } },
                successText: `${t}提点你三句话，字字是老江湖用命换来的。`,
                failText: `${t}笑了笑：「路要自己走。」还是多嘱咐了你两句。` } },
          ],
        };
      },
    },
    {
      id: "med_after",
      cond: () => !!(S.medScene && !S.medScene.teacher),
      w: () => 12,
      build() {
        const m = S.medScene; S.medScene = null; // 用完即焚
        if (m.nearCap) return { // 逼近瓶颈：突破在望
          scene: `「${m.focus}」的关隘在识海里咯吱作响——你昨日参到的那层薄膜，此刻薄得透光。气机每运转一周天，它就松一分。破与不破，只在你一念之间。`,
          choices: [
            { label: "一鼓作气，再参一时", hint: `趁热打铁：独坐参悟「${m.focus}」。瓶颈在望。`, fx: { special: "meditate", focus: m.focus } },
            { label: "强压下悸动，暂且按下", hint: "心急易生心魔。道心 +1，心魔 -2。", fx: { dao: 1, xinmo: -2 } },
          ],
        };
        if ((S.xinmo || 0) >= 50) return { // 心魔扰神：硬修有险（设定：心魔高涨时修行受扰）
          scene: `本该澄明的识海里浮起一层油腻的黑。昨日参「${m.focus}」时压下去的杂念，趁你神思疲惫又翻涌上来——心魔在笑。`,
          choices: [
            { label: "以道心镇之，继续参悟", hint: "判定：道心够硬，杂念自退；压不住，则反受其噬。", fx: { check: "dao*1.2+d20>55",
                success: { special: "meditate", focus: m.focus, xinmo: -3 }, fail: { xinmo: 6, hp: -4 },
                successText: "你守定灵台，任它千般幻象，我自不动。一个时辰下来，杂念竟退了大半。",
                failText: "幻象趁虚而入。你闷哼一声喷出一口浊气，胸口火辣辣地疼。" } },
            { label: "起身走走，散散心神", hint: "心魔正盛时硬修易伤。体力 +4，道心 +0.3。", fx: { sta: 4, dao: 0.3 } },
          ],
        };
        return { // 默认：参悟余韵
          scene: `昨日参「${m.focus}」的余韵还在筋骨里流转。行气一周天，你察觉那几处昨日想不通的关窍，竟在睡梦间悄悄松了两分——原来识海从不睡。`,
          choices: [
            { label: "趁热打铁，再参一时", hint: `独坐参悟「${m.focus}」，熟练照设定公式入账。`, fx: { special: "meditate", focus: m.focus } },
            { label: "把心得默记成册", hint: "温故知新。「读书」技艺 +3，修为 +2。", fx: { skill: "读书:3", cult: 2 } },
            { label: "起身谋生去", hint: "修行不碍饭碗。体力 +3，道心 +0.2。", fx: { sta: 3, dao: 0.2 } },
          ],
        };
      },
    },
    /* ---------- 宗门日常（第六章 · 外门弟子三千，资源只向强者倾斜） ----------
       点卯（每日清晨）：到卯记贡献，缺卯三次以上月供减半；
       宗门任务：执事派活，贡献与赏钱并行；贡献兑换：聚气丹/功法指点/内门推荐。 */
    {
      id: "sect_dianmao",
      cond: c => S.sect && S.slot === 0 && !S.flags.neimen, // 内门弟子不再点卯（规则26c）
      w: () => 4,
      build() {
        const miss = S.flags.dianmaoMiss || 0;
        const rg = (typeof regionOf === "function") ? regionOf(S.place) : null;
        const rn = (rg && rg.sect && rg.sect.name === S.sect) ? rg.sect.npc : "外门教习";
        if (miss >= 3) return { // 缺卯三次：执事房问责（第六章：宗门不养闲人）
          scene: `${S.sect}执事房前，${rn}把卯簿拍在案上：「这个月，你缺了 ${miss} 次卯。宗门的月供不是雨落的——规矩，你懂。」`,
          choices: [
            { label: "认罚，补缴五十文", hint: "破财免灾，卯簿勾销。", disabled: S.money < 50, fx: { money: -50, special: "sectClearMiss" } },
            { label: "据理力争", hint: "判定：把缺的卯说成情有可原——看口才，也看情面。", fx: { check: "int*6+dao*0.2+d20>34",
                success: { special: "sectClearMiss", npc: { [rn]: 3 } }, fail: { money: -30, npc: { [rn]: -5 } },
                successText: "你把缺卯那几日的差事一桩桩报上来，执事听完，哼了一声把簿子合上了。",
                failText: "执事冷笑：「理由编圆了再来。」罚俸三十文，同门看你眼神都淡了。" } },
            { label: "低头听着", hint: "挨顿训，记在账上。", fx: { dao: -0.5, npc: { [rn]: -3 } } },
          ],
        };
        return {
          scene: `${S.sect}演武场的晨钟响了。外门弟子列队点卯，${rn}执簿而立——卯时三刻，过时不候。（当前贡献 ${S.sectGong || 0}）`,
          choices: [
            { label: "准时点卯", hint: "到卯记贡献 +1。宗门的账，一日一日攒。", fx: { special: "sectGong", num: 1, npc: { [rn]: 2 } } },
            { label: "主动代管演武器械", hint: "多出一份力，贡献 +2，耗些体力。", fx: { special: "sectGong", num: 2, sta: -2, npc: { [rn]: 3 } } },
            { label: "告假一日", hint: "缺卯一次。三次以上，执事房要找你说话。", fx: { dao: -0.3, special: "sectSkip" } },
          ],
        };
      },
    },
    {
      id: "sect_renwu",
      cond: c => S.sect && S.slot !== 3,
      w: () => 2.5,
      build() {
        return {
          scene: `${S.sect}执事房外贴了告示：药圃缺人采收、后山需人巡哨、库房需人值守。外门弟子各领一件——办得好，贡献与赏钱都不是虚的。（当前贡献 ${S.sectGong || 0}）`,
          choices: [
            { label: "药圃采收一日", hint: "贡献 +2、赏钱 15 文，顺带长点识药。", fx: { special: "sectGong", num: 2, money: 15, skill: "识药:4" } },
            { label: "后山巡哨缉盗", hint: "判定：撞见盗匪要动手。胜则贡献 +4、赏钱 40 文；败则挂彩。", fx: { check: "str*5+agi*3+d30>42",
                success: { special: "sectGong", num: 4, money: 40, attr: { str: 0.05 } }, fail: { hp: -8, money: 5 },
                successText: "你在山道转角截住那两个盗匪，拳脚比他们还熟——捆了送执事房，赏钱当场结清。",
                failText: "盗匪比你预想的扎手，你挨了两刀才把人惊走。执事房给了五文汤药钱。" } },
            { label: "库房值守一夜", hint: "清净差事。贡献 +1，值守时吐纳片刻。", fx: { special: "sectGong", num: 1, cult: 2 } },
          ],
        };
      },
    },
    {
      id: "sect_exchange",
      cond: c => S.sect && (S.sectGong || 0) >= 5,
      w: () => 1.5,
      build() {
        const sk = (typeof GONGFU !== "undefined") ? (GONGFU.filter(g => (S.inv[g.id] || 0) > 0).sort((a, b) => b.tier - a.tier)[0] || {}).name : null;
        return {
          scene: `${S.sect}藏经阁的执事拨着算盘：「贡献攒着不下崽。换点什么？丹药、指点、还是——内门的门路？」（当前贡献 ${S.sectGong || 0}）`,
          choices: [
            { label: "5 贡献换聚气丹一枚", hint: "破境资粮，硬通货。", disabled: (S.sectGong || 0) < 5, fx: { special: "sectBuy", num: 5, item: "juqiDan:1" } },
            { label: "10 贡献换传功长老一次指点", hint: sk ? `主修功法「${sk}」熟练 +8。` : "需先修有功法。", disabled: (S.sectGong || 0) < 10 || !sk, fx: { special: "sectBuy", num: 10, skill: sk ? sk + ":8" : "" } },
            { label: "20 贡献换内门推荐", hint: "内门考核时，教习会手下留两分情面。", disabled: (S.sectGong || 0) < 20 || !!S.flags.neimenRec || !!S.flags.neimen, fx: { special: "sectBuy", num: 20, flag: "neimenRec" } },
            { label: "再攒攒", hint: "贡献在账上，跑不了。", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    /* ---------- 世界角色谱 · 接触剧情（data.js WORLDCAST） ----------
       boss 可拜谒/讨教（切磋点到为止），中立人物可攀谈结缘，hidden 只可远观留痕——缘法（伏笔≥2）具足方可上前 */
    {
      id: "worldcast_meet",
      cond: c => (typeof castHere === "function") && castHere().some(x => !castMet(x.id) && x.kind !== "hidden"),
      w: () => 2,
      build() {
        const cands = castHere().filter(x => !castMet(x.id) && x.kind !== "hidden");
        const c = cands[Math.floor(Math.random() * cands.length)];
        const realmName = (typeof REALM_NAMES !== "undefined") ? REALM_NAMES[c.realm] : "";
        if (c.kind === "boss") return {
          scene: `${c.hook}——是「${c.name}」，${c.title}（${realmName}）。${c.desc} 这样的大人物，平日你连远远看一眼的资格都没有。`,
          choices: [
            { label: "备一份薄礼上前拜谒", hint: "二十文的礼数。大人物未必收，但会记住懂规矩的人。", disabled: S.money < 20, fx: { flag: "metcast_" + c.id, money: -20, npc: { [c.name]: 6 } } },
            { label: "请赐教一二", hint: `切磋讨教，点到为止。对方是${realmName}——胜则刮目相看，败亦受教。`, fx: { special: "castduel", castId: c.id } },
            { label: "绕道走", hint: "大人物的因果，穷人沾不起。", fx: { dao: 0.2 } },
          ],
        };
        return {
          scene: `${c.hook}——你认出那是${c.title}「${c.name}」（${realmName}）。${c.desc}`,
          choices: [
            { label: "上前攀谈，结个善缘", hint: "中立人物的消息与门路，往往比铜钱值钱。", fx: { flag: "metcast_" + c.id, npc: { [c.name]: 6 } } },
            { label: "敬而远之", hint: "不深交，也不得罪。", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    {
      id: "worldcast_hidden",
      cond: c => (typeof castHere === "function") && castHere().some(x => x.kind === "hidden" && !castMet(x.id)),
      w: () => 1, // 隐藏角色可遇不可求：低权重掠过
      build() {
        const cands = castHere().filter(x => x.kind === "hidden" && !castMet(x.id));
        const c = cands[Math.floor(Math.random() * cands.length)];
        const fateReady = (S.flags.coincidence || 0) >= 2; // 缘法具足：伏笔攒过两笔，方可上前
        return {
          scene: `${c.hook}。${c.desc} 你心里莫名一紧——这一眼，像被什么东西隔着很远看了一眼回来。`,
          choices: [
            { label: "远远记下这一幕", hint: "有些存在，看见本身就是一笔账。", fx: { flag: "metcast_" + c.id, coincidence: 1 } },
            { label: "上前搭话", hint: fateReady ? "缘法已具——这一步，也许有人等了很久。" : "缘法未具：你与他之间，还隔着几场机缘。", disabled: !fateReady, fx: { flag: "metcast_" + c.id, npc: { [c.name]: 10 }, coincidence: 1 } },
            { label: "转身离开", hint: "不该看的别看，长寿之道。", fx: { dao: 0.2 } },
          ],
        };
      },
    },

    /* ---------- 缘分突破兜底（离线模式） ----------
       ±80 是凡俗手段的天花板，「缘分突破」大剧情原本只有 AI 会写——离线玩家缘分到 80 后
       永久 ×0.1 衰减，再无寸进。此处引擎兜底：任一有名 NPC 缘分 ≥80 且未 bondbreak 时，
       高权重触发共患难 / 托生死 / 解开心结大剧情；完成后 fx.flag="bondbreak_名字" 解锁上限，
       与 AI 通道同一旗标。突破成功后 cond 自然落空，不再触发。 */
    {
      id: "bondbreak",
      cond: () => bondCandidates().length > 0,
      w: () => 12,
      build(r) {
        const name = pick(bondCandidates(), r);
        const ta = npcGender(name) === "女" ? "她" : "他";
        const B = "bondbreak_" + name;
        const up = v => ({ [name]: v });
        const v = Math.floor(r() * 3);
        if (v === 0) return {
          scene: `长街尽头忽然杀出几条黑影——${name}的旧仇家寻来了，刀刀都冲着${ta}去。${ta}背靠断墙，哑声冲你喊：「走！这事与你无关！」风雪中刀光已至。寻常走动、请客送礼，到这儿就是头了——今日要么并肩，要么陌路。`,
          choices: [
            { label: "并肩，战！", hint: "力量/体质判定。胜则共患难，破 80 之限。", fx: { check: "str*6+con*5+luck*2+d30>62",
              success: { flag: B, npc: up(45), dao: 2, coincidence: 1 },
              fail: { hp: -12, sta: -4, npc: up(12) },
              successText: `你替${ta}挡下背后那一刀，反身踹翻为首的汉子。仇家退去时，${ta}捂着伤口看了你很久——什么也没说。但从今日起，这条命有你一半。`,
              failText: `你冲上去，却被人一刀撂翻。${ta}拖着你杀出重围，替你包扎时手一直在抖：「傻子。」${ta}记得你没有跑。` } },
            { label: `替${ta}挡刀，以命相托`, hint: "不需判定。气血大损，但生死之义直达 80 之上。", fx: { hp: -16, sta: -6, flag: B, npc: up(35), dao: 2 } },
            { label: "转身离开", hint: "生死之交，亦有陌路一日。", fx: { npc: up(-10), dao: -1 } },
          ],
        };
        if (v === 1) return {
          scene: `夜半，${name}拎着酒壶来找你，眼里布满血丝。${ta}讲了许多年不肯讲的事——旧年的亏心债、没能救下的人。讲到天边发白，${ta}把壶一扔：「这些话，我本来打算带进棺材。」心结在此，解不解得开，看你。`,
          choices: [
            { label: `陪${ta}守到天亮，把话说透`, hint: "智力/气运判定。解开心结，破 80 之限。", fx: { check: "int*6+luck*4+d30>58",
              success: { flag: B, npc: up(40), dao: 1 },
              fail: { sta: -3, npc: up(10) },
              successText: `你没有劝，只是听。天亮时${ta}长长吐出一口浊气，像卸下了背了半辈子的东西：「原来这话，是可以说的。」`,
              failText: `你搜肠刮肚的劝慰都显得轻飘。${ta}摆摆手笑笑：「不说了，喝酒。」但${ta}记得你陪了这一夜。` } },
            { label: "以自身秘密相换", hint: "掏心换心。道心微损，缘分直进。", fx: { dao: -1, flag: B, npc: up(30) } },
            { label: "岔开话题，只说风月", hint: "", fx: { npc: up(-6), dao: -0.5 } },
          ],
        };
        return {
          scene: `${name}要走一趟必死之路——${ta}只说「办件事」，你却从${ta}交代后事般的语气里听出来了。${ta}把贴身之物塞给你：「若我回不来，替我烧了它。」寻常人情到此已尽，剩下的，是命与命的事。`,
          choices: [
            { label: "「我陪你去。」", hint: "敏捷/气运判定。同赴死地，破 80 之限。", fx: { check: "agi*6+con*4+luck*3+d30>60",
              success: { flag: B, npc: up(45), dao: 2, coincidence: 1 },
              fail: { hp: -14, npc: up(12) },
              successText: `你替${ta}引开了最险的那一路。回来时两人都是一身血，${ta}把那件贴身之物又要了回去——「烧什么烧，晦气。留着。往后每年今日，你我都得喝酒。」`,
              failText: `事情到底没办成，你俩互相搀着逃回来。${ta}咳着血笑：「让你别来。」可${ta}握着你胳膊的手，一直没松。` } },
            { label: `接下遗物，守${ta}归来`, hint: "不涉险。守诺，亦是托生死。", fx: { sta: -4, flag: B, npc: up(30), dao: 1 } },
            { label: `劝${ta}别去`, hint: "", fx: { npc: up(-8), dao: -0.5 } },
          ],
        };
      },
    },

    /* ---------- 远行（第五章 · 疆域） ----------
       灵阶(7) 解锁：择一地远行，脚程 6/4/3 日（玄阶 13、地阶 19 提速），
       旅途中由 travel_road 接管场景；抵达由引擎跨日结算（game.js），落脚该域枢纽。
       五域枢纽皆可远行抵达（四海走海路，落脚潮间 · 珠蚌埠；设定集第五章：海外仙山在东海之外，归墟仍不可及）。 */
    {
      id: "travel_start",
      cond: () => S.realm >= 7 && !S.travel && S.slot !== 3 && (typeof REGION_HUBS === "object"),
      w: () => 1.5,
      build(r) {
        const cur = regionOf(S.place).key;
        const dests = Object.keys(REGIONS).filter(k => k !== cur && REGION_HUBS[k]);
        const days = travelDaysFor("");
        const choices = dests.map(k => {
          const rg = REGIONS[k];
          return { label: `启程 · ${rg.name}`, hint: `约 ${days} 日脚程，路上有村镇补给，也有劫道的。抵达后落脚${REGION_HUBS[k]}。`,
            fx: { special: "travel:" + k, sta: -4, hunger: 10 } };
        });
        choices.push({ label: "再盘桓几日", hint: "此地还有放不下的事。", fx: { dao: 0.1 } });
        return {
          scene: `你在${S.place}的驿道口驻足。界碑上刻着四方路引——修行到了你这境界，一城一池已经圈不住了。远方或有功法传承，或有旧识故人，或有命里该见的劫。`,
          choices,
        };
      },
    },
    {
      id: "travel_road",
      cond: () => !!S.travel,
      w: () => 10, // 旅途中压过日常场景：人在路上，不能照常过镇上的日子
      build(r) {
        const rg = REGIONS[S.travel.to];
        const v = Math.floor(r() * 3);
        const sea = S.travel.to === "sihai"; // 赴四海走海路：场景随舟行换皮
        if (v === 0) return {
          scene: sea ? `海上遇着一支往${rg.name}去的商船队，桅杆上的帆吃饱了风。船主打量你：「同航？船上的活计搭把手，到埠头管饭。」`
            : `驿道上遇着一支往${rg.name}去的商队，骡马打着响鼻，货垛苫布被风掀起一角。押队的汉子打量你：「同路？搭把手，到地头管饭。」`,
          choices: [
            { label: sea ? "搭船同行" : "搭把手同行", hint: "饱腹 +20，路人缘 +4。", fx: { hunger: -20, npc: { "路人缘": 4 }, sta: -2 } },
            { label: sea ? "独自摇橹" : "独自赶路", hint: "不欠人情，也不多是非。", fx: { sta: -2 } },
          ],
        };
        if (v === 1) return {
          scene: sea ? `暮色里水雾升起，几条快舷从雾里包抄过来——是吃水路饭的。水匪的挠钩搭上船舷：「货留下，人跳海！」他们没看出你是修行中人。`
            : `山道拐角，几块滚石拦路——是劫道的。三条汉子从坡上下来，刀尖朝下：「过路的，留买路钱！」他们没看出你是修行中人。`,
          choices: [
            { label: "动手打发", hint: "境界/气运判定。胜则吓退，败则破财挂彩。", fx: { check: "realm*10+luck*3+d20>50",
              success: { npc: { "路人缘": 2 }, dao: 0.5 },
              fail: { hp: -8, money: -30 },
              successText: sea ? "你只抬了抬手，灵压一放，几条快舷掉头就散，雾里只剩水匪的叫骂。" : "你只抬了抬手，灵压一放，三条汉子腿肚子转筋，连滚带爬跑了。",
              failText: sea ? "甲板湿滑，你挨了两篙子，被水匪摸走了钱袋。" : "双拳难敌六手，你挨了两刀，被摸走了钱袋。" } },
            { label: "破财免灾", hint: "给钱脱身，气血不伤。", fx: { money: -20 } },
          ],
        };
        return {
          scene: sea ? `夜海无风，前不着村后不着埠。你在甲板上盘膝坐下——四野只有涛声，灵气倒比岸上清冽几分。`
            : `暮色四合，前不着村后不着店。你寻了处背风的山坳打坐——荒郊野岭，灵气反倒比城中清冽几分。`,
          choices: [
            { label: "吐纳一夜", hint: "修为 +4，打坐代眠。", fx: { cult: 4, sta: -2 } },
            { label: "生火睡下", hint: "恢复气血体力。", fx: { special: "rest" } },
          ],
        };
      },
    },
    /* ---------- 四海 · 北海归墟入耳（设定集第五章：归墟是仙路断绝之处，只可作遥远的禁忌方向） ----------
       卷一特色与卷二四海线的交汇点：潮间埠头的老人把「北边」列为禁语——第一次听闻，只留痕、不可往。 */
    {
      id: "sea_guixu_rumor",
      cond: () => regionOf(S.place).key === "sihai" && S.realm >= 7 && !S.flags.seaGuixuHeard,
      w: () => 2,
      build() {
        return {
          scene: `珠蚌埠的老茶棚里，跑了一辈子北水的老船主压着嗓子：「……再往北，海就没有了。不是到头，是没有了——水往一个窟窿里淌，连声音都被吸进去。打鱼的把那儿叫『归墟』，龙王爷的兵都不敢去。」他忽然住了口，把茶碗一扣，「问这个做什么？记住喽——出海的人，字可以不识，北边的星，不能认。」`,
          choices: [
            { label: "默记这个方向", hint: "北海归墟——第一次入耳。禁忌，也是线索。", fx: { flag: "seaGuixuHeard", dao: 0.5 } },
            { label: "追问「为什么不敢去」", hint: "判定：老船主知道的比他肯说的多。", fx: { check: "int*7+luck*3+d30>55",
              success: { flag: "seaGuixuHeard", coincidence: 1, dao: 1 },
              fail: { flag: "seaGuixuHeard", dao: 0.3 },
              successText: "老船主盯着你看了很久，忽然换了乡音低声道：「我爹的船上……回来过一个人。他说海底下有东西在吃东西，吃了三万年了。」说完他起身就走，茶钱都没付。",
              failText: "老船主把头摇得像拨浪鼓：「知道得越少，活得越长。」他起身就走，茶钱都没付。" } },
            { label: "只当老人吓唬后生", hint: "海上的怪话，十有八九是酒话。", fx: { dao: 0.2 } },
          ],
        };
      },
    },

    /* ---------- 终局 · 三方棋局（第十一章：真相分层揭开，五结局由引擎结算） ----------
       链序：先驱遗痕 ×3（pioneer_*）→ 裂缝低语（devourWhisper）→ 问天（sysQuestioned）
       → 仙品「天有二心」完成立 truthKnown → 仙品「归墟终局」：入缝（guixuEnter）→ 终结进食（devourSlain）→ 终局抉择（end:*）。 */
    {
      id: "pioneer_trace", // 先驱宿主遗痕：牢房刻字 / 半张信物 / 无名坟——「你不是第一个宿主」
      cond: () => S.realm >= 13 && (S.flags.coincidence || 0) >= 3
        && !(S.flags.pioneer_kezi && S.flags.pioneer_xinwu && S.flags.pioneer_fen),
      w: () => 2,
      build() {
        const TRACES = [
          { flag: "pioneer_kezi", scene: "途经一座废弃多年的牢城，断墙内侧有一行刻字，笔画深得不像凡人留的：「别信它的恭喜。」落款没有名字，只有一个被磨平的印。你盯着那行字看了很久——刻它的人，似乎也看得见你看得见的东西。" },
          { flag: "pioneer_xinwu", scene: "旧货摊上，半张上古信物躺在不起眼的角落。摊主说它「邪性」，历任主人都死得蹊跷。你入手一瞬，面板罕见地闪烁了一下——像有什么东西认得它，又不想让你知道它认得。" },
          { flag: "pioneer_fen", scene: "荒野一座无名坟，碑上没有字。可你行囊里的什么物件忽然微微发烫——冥冥中有声音说：这里埋着一位「先行者」。他的结局无人知晓。你上了三炷香，风把烟吹成了两个字：快逃。" },
        ];
        const left = TRACES.filter(t => !S.flags[t.flag]);
        const t0 = left[Math.floor(Math.random() * left.length)];
        return {
          scene: t0.scene,
          choices: [
            { label: "记下这一笔", hint: "先驱的遗痕。伏笔 +1，遗痕入册。", fx: { flag: t0.flag, coincidence: 1 } },
            { label: "不多管闲事", hint: "有些东西，看见了就当没看见。", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    {
      id: "devour_whisper", // 渊口裂缝的低语：吞世者想让你知道的，永远要打折再打折地听
      cond: () => regionOf(S.place).key === "beiyuan" && S.realm >= 19 && (typeof castMet === "function") && castMet("shouyeren")
        && !S.flags.devourWhisper && (S.flags.pioneer_kezi || S.flags.pioneer_xinwu || S.flags.pioneer_fen),
      w: () => 3,
      build() {
        return {
          scene: "渊口裂缝边缘，守夜人的背影破天荒地侧了半分：「它快来了。你想听的，裂缝里都有——但听过的东西，就塞不回去了。」裂缝深处，渊声忽然不再是风声。它叫了你的名字。它说：你以为的那把刀柄，握在谁手里？它说了一个三万年没人敢说的故事——关于天，关于炉，关于刀用完之后的归宿。",
          choices: [
            { label: "听完它", hint: "真相的一半（另一半要自己问）。心魔 +5，伏笔 +1。", fx: { flag: "devourWhisper", coincidence: 1, xinmo: 5 } },
            { label: "捂耳退去", hint: "敌人想让你知道的事，一个字都不白听。道心 +2。", fx: { dao: 2 } },
          ],
        };
      },
    },
    {
      id: "sys_question", // 问天：它从不解释，只在你问及时回一句【跑好你自己的。】
      cond: () => S.flags.devourWhisper && !S.flags.sysQuestioned,
      w: () => 2,
      build() {
        return {
          scene: "夜深，四下无人。你盯着眼前那层只有你能看见的光幕——任务、评级、保底、千秋录，三万年来它俯下身，用你听得懂的话对你说话。你忽然想问它一句话。问出口，就再也装不了糊涂。",
          choices: [
            { label: "问：「我到底是你造的第几把刀？」", hint: "它从不解释。但你会记住它回答的方式。道心 +3。", fx: { flag: "sysQuestioned", dao: 3 } },
            { label: "把话咽回去", hint: "还没到掀桌的时候。", fx: { dao: 1 } },
          ],
        };
      },
    },
    {
      id: "guixu_gate", // 守夜人引路：踏入渊口裂缝（归墟终局 · 目标二）
      cond: () => (S.quests && (S.quests.active || []).includes("mq_guixu")) && !S.flags.guixuEnter && regionOf(S.place).key === "beiyuan",
      w: () => 20,
      build() {
        return {
          scene: "守夜人第一次转过身来。他看了你很久，像在核对一件等了很多年的东西：「缝开了。进去的人没有一个回来过——包括上一个像你这样的人。」他让开半步，露出裂缝里深不见底的黑：「路，我引到头了。剩下的是你的。」",
          choices: [
            { label: "踏入裂缝", hint: "归墟深处，终结进食——进去了就没有退路。", fx: { flag: "guixuEnter" } },
            { label: "再备几日", hint: "终局之前，把该了结的都了结。", fx: { dao: 0.5 } },
          ],
        };
      },
    },
    {
      id: "devour_fight", // 终结进食：吞世者从不现身——你斩的是它探进此界的「口器」
      cond: () => S.flags.guixuEnter && !S.flags.devourSlain,
      w: () => 30,
      build() {
        return {
          scene: "裂缝尽头没有路，只有「进食」本身：天地本源如百川倒灌，汇入一片看不见底的黑暗。那黑暗察觉到你，三万年来第一次「看」了过来——它不怒，不惧，只是分出一缕，化作你此生见过的每一个死敌的模样。斩了它，这场进食就断了。",
          choices: [
            { label: "正面硬撼，斩断进食", hint: "境界/力量/体质判定（极难）。胜则终结进食。", fx: { check: "realm*8+str*4+con*3+luck*2+d30>220",
              success: { flag: "devourSlain", hp: -20, coincidence: 1 },
              fail: { hp: -40, sta: -10, xinmo: 8 },
              successText: "你的全力一击贯入黑暗最深处。三万年的「进食」发出一声不属于任何生灵的闷响——断了。裂缝里第一次漏下光。",
              failText: "黑暗只晃了晃。你被本源洪流掀飞，浑身经脉如被碾过——它还远远没有被伤到根本。" } },
            { label: "借裂缝地势，以巧断流", hint: "道心 60+ 方可：不斩口器，断其与界外的呼应（判定较易）。", disabled: S.daoXin < 60, fx: { check: "realm*6+int*5+luck*3+d20>190",
              success: { flag: "devourSlain", coincidence: 1 },
              fail: { hp: -30, xinmo: 10 },
              successText: "你看懂了裂缝的呼吸。不与它争力，只在那声呼应最弱的刹那，替天地合上了嘴。进食，断了。",
              failText: "呼应的节律算错了半拍。黑暗反扑，你的道心被它「看」出了一道裂纹。" } },
            { label: "暂退裂缝之外", hint: "它不会追出来——它只在乎进食。气血不损，但终局仍等你回来。", fx: { sta: -5 } },
          ],
        };
      },
    },
    /* ---------- 隐藏结局暗线 · 界外三瞥（第十一章：「界外」意味着什么，它比你更想知道） ----------
       只惊鸿一瞥、绝不解释：面板错字 / 故乡语言的梦 / 世界边缘的「框」。
       每幕伏笔 +1——配合遗痕与低语线，伏笔攒到 10 的路由此有迹可循。 */
    {
      id: "beyond_glint1",
      cond: () => (S.flags.coincidence || 0) >= 4 && !S.flags.beyond1,
      w: () => 1.5,
      build() {
        return {
          scene: "擦身而过的一瞬间，你眼角的光幕忽然错了一行字——【变量不明】四个字一闪而过，快得像错觉。再看时，一切如常。你的心跳却漏了半拍：它也会……看走眼？",
          choices: [
            { label: "记住这一瞬", hint: "稍纵即逝的异样。伏笔 +1。", fx: { flag: "beyond1", coincidence: 1 } },
            { label: "晃神而已", hint: "装作没看见。", fx: { dao: 0.2 } },
          ],
        };
      },
    },
    {
      id: "beyond_glint2",
      cond: () => (S.flags.coincidence || 0) >= 7 && S.flags.beyond1 && !S.flags.beyond2,
      w: () => 1.5,
      build() {
        return {
          scene: "梦里有两个声音在吵架。一个说：「跑好你自己的。」——是它，你认得。另一个声音很轻，说的竟是……你故乡的语言。它说了一句什么，你没听清，醒来时只记得尾音，像一声叹息。",
          choices: [
            { label: "把那句尾音默念三遍", hint: "穿越者两世记忆，梦里双倍素材。伏笔 +1。", fx: { flag: "beyond2", coincidence: 1, dao: 1 } },
            { label: "翻个身接着睡", hint: "梦里的事，醒了就散了。", fx: { sta: 2 } },
          ],
        };
      },
    },
    {
      id: "beyond_glint3",
      cond: () => (S.flags.coincidence || 0) >= 9 && S.flags.beyond2 && !S.flags.beyond3,
      w: () => 1.5,
      build() {
        return {
          scene: "登高处，云海尽头忽然「齐」得反常——天与地在那条线上收边，像一幅画裱到了框。你鬼使神差地伸出手。指尖什么也没碰到，可面板上的字齐齐一颤，像被风吹皱的水面。【推演失败】——又一闪而过。",
          choices: [
            { label: "再往前，探半步", hint: "框的后面是什么？伏笔 +1，道心 +2。", fx: { flag: "beyond3", coincidence: 1, dao: 2 } },
            { label: "收手，下山", hint: "天边的框，不是给人碰的。", fx: { dao: 1 } },
          ],
        };
      },
    },
    {
      id: "final_choice", // 终局抉择：五结局分岔（第十一章：取决于你的每一步）
      cond: () => S.flags.devourSlain && !S.flags.endingDone,
      w: () => 99,
      build() {
        const known = !!S.flags.truthKnown;
        const bonds = Object.values(S.npc || {}).filter(v => v >= 80).length;
        const broad = Object.values(S.npc || {}).filter(v => v >= 60).length;
        const hiddenAll = ["duobaoCi", "shouyeren", "jianzheng", "shoumu", "shujing", "chuixianzhe"].every(id => (typeof castMet === "function") && castMet(id));
        const beyond = (S.flags.coincidence || 0) >= 10 && hiddenAll && known;
        const choices = [
          { label: "承接战果，听它道一声「恭喜」", hint: known ? "你已经知道这句话意味着什么。" : "赢了吞世者，天道该论功行赏了。", fx: { special: "end:luding" } },
          { label: "留在归墟，做新一任守夜人", hint: "不拆穿，也不离开。世界续命，你镇裂缝。", fx: { special: "end:shoujie" } },
          { label: "识破回炉之局，修补界壁，重开仙路", hint: `需要：已知真相 + 生死羁绊×3（当前 ${bonds}）+ 伏笔≥8（当前 ${S.flags.coincidence || 0}）。完美结局。`,
            disabled: !(known && bonds >= 3 && (S.flags.coincidence || 0) >= 8), fx: { special: "end:dengxian" } },
          { label: "反手，弑天", hint: `需要：已知真相 + 听过低语 + 道心 60+（当前 ${Math.round(S.daoXin)}）。古往今来无人做到。`,
            disabled: !(known && S.flags.devourWhisper && S.daoXin >= 60), fx: { special: "end:sitian" } },
          { label: "打碎棋盘，让众生共掌天道", hint: `需要：已知真相 + 广结善缘×5（缘分 60+，当前 ${broad}）。从此没有棋手。`,
            disabled: !(known && broad >= 5), fx: { special: "end:huantian" } },
        ];
        if (beyond) choices.push({ label: "什么也不选——转身，向「外面」走一步", hint: "面板上的字开始乱。这条路，它推演不到。", fx: { special: "end:beyond" } });
        return {
          scene: `进食断了。归墟深处静得能听见界壁的裂纹在合拢。这时，天道的声音落下来——三万年来它第一次这么近、这么温和：「做得好。承接它的因果吧，那是你应得的。」${known ? "你听得懂这句话。刀用完了，是要回炉的。" : "有什么东西在你心底一闪而过，快得抓不住。"} 终局在此，路在你脚下。`,
          choices,
        };
      },
    },

    /* ---------- 断灵大劫 · 劫兆事件（第一章：走火入魔者十倍于平日、妖兽发狂、灵脉枯死） ----------
       权重随 doomLevel 升档：劫数越深，末世征兆越密。进食断后（doomLevel 归 0）不再出现。 */
    {
      id: "doom_omen",
      cond: () => doomLevel() >= 1,
      w: () => doomLevel() * 1.5,
      build(r) {
        const v = Math.floor(r() * 3);
        if (v === 0) return {
          scene: "街角一阵骚动——一个散修当众走火入魔，双目赤红，见人就扑。围观者退开一圈，没人敢上前。近来这样的疯子，越来越多了。",
          choices: [
            { label: "上前替他导顺灵力", hint: "境界判定。成则救人一命，结份善缘。", fx: { check: "realm*6+int*4+d20>55",
              success: { npc: { "路人缘": 5 }, dao: 1 },
              fail: { hp: -6, xinmo: 3 },
              successText: "你一掌抵住他后心，逆冲的灵力被你生生导回经脉。他瘫软下去，醒来时冲你深深一揖。",
              failText: "他的灵力乱得超乎预料，反震得你气血翻涌——旁人七手八脚把他按住了，你默默退开。" } },
            { label: "远远绕开", hint: "乱世先顾己。", fx: { dao: 0.1 } },
          ],
        };
        if (v === 1) return {
          scene: "城郊传来消息：又一条灵脉枯了。前去碰运气的修士扑了个空，回程时个个脸色灰败。有老人喃喃：「洞天崩、灵脉枯、古阵废……这天，是真的不如从前了。」",
          choices: [
            { label: "去枯脉看一眼", hint: "也许能捡到枯脉余烬；也许什么都剩不下。", fx: { check: "luck*6+d20>60",
              success: { stones: 2, coincidence: 1 },
              fail: { sta: -3 },
              successText: "枯脉深处，你捡到两枚未及消散的灵石——还有一道说不清的、被「抽干」的痕迹，不像自然枯竭。",
              failText: "枯脉里只剩灰白的石头，连苔藓都死透了。" } },
            { label: "记下这桩事", hint: "末世的症状，多记一笔是一笔。", fx: { coincidence: 1 } },
          ],
        };
        return {
          scene: "夜里城外妖兽嚎叫连成一片，比往年凶了数倍。守夜的更夫说，兽群的眼睛红得反常——像被什么东西从界壁外头撩拨着。",
          choices: [
            { label: "上城头帮着守一夜", hint: "气血小损，路人缘 +3。", fx: { hp: -4, npc: { "路人缘": 3 } } },
            { label: "关紧门窗", hint: "天塌下来，有个高的顶着——暂时还轮不到你。", fx: { sta: 1 } },
          ],
        };
      },
    },

    /* ---------- 历练之机（三日之期【历练】选项的专属后续剧情） ----------
       设定依据：规则14——每三日必有一次提升实力的机缘；五维打熬/功法精研/武技磨砺三分支。
       trainingEvent 结算后由引擎记下 S.trainScene，下一回合 AI 提示词（历练之机）与离线引擎（本景）
       双双承接——写打熬余韵、进境被瞧见、瓶颈契机；build 时即焚，不空转不滞留。 */
    {
      id: "train_after",
      cond: () => !!S.trainScene,
      w: () => 12,
      build() {
        const m = S.trainScene; S.trainScene = null; // 用完即焚
        if (m.kind === "五维打熬") {
          const flavor = {
            str: "你捏了捏拳，指节咯咯作响——卖炭婆那车炭，今日你推得格外轻。",
            agi: "你下意识垫了垫脚，身子竟比念头先动——屋檐那道灰影，再落不到你眼里。",
            int: "柳先生今日的段子，你只听过一遍便在心里排出了脉络——通透的感觉还在。",
            con: "冰水淬过的血脉仍在低鸣，寒气侵到三寸之外便自行溃散。",
          }[m.attr] || "血肉里发烫的感觉还在。";
          return {
            scene: `打熬的余韵还在筋骨里发烫。${flavor}街坊看你的眼神，已与昨日不同。`,
            choices: [
              { label: "趁热再练一轮", hint: `体力 -2，${m.attrName}再进半分。`, fx: { attr: { [m.attr]: Math.round(m.amt * 50) / 100 }, sta: -2 } },
              { label: "见好就收，好生将养", hint: "张弛有度。体力 +4，气血 +3。", fx: { sta: 4, hp: 3 } },
            ],
          };
        }
        if (m.kind === "武技磨砺") return {
          scene: `拳面上的血痂结了又裂。老槐树下，一个路过的瘸腿老卒驻足看了半晌，忽然开口：「拳是直的，意是浮的。你这一千拳，有三百拳在赌气。」`,
          choices: [
            { label: "拜请老卒指点", hint: "判定：诚心求教——乱拳熟练大涨，缘分 +5。", fx: { check: "dao*0.5+d20>18",
                success: { skill: "乱拳:5", npc: { "瘸腿老卒": 5 }, attr: { str: 0.03 } }, fail: { skill: "乱拳:2", npc: { "瘸腿老卒": 2 } },
                successText: "老卒捡起一根枯枝，替你拆了半套拳。「记住这个劲。」",
                failText: "老卒摇摇头，还是顺手替你扶正了一处肘架。" } },
            { label: "不服，再打一千拳", hint: "乱拳 +2，体力 -3，气血 -2。", fx: { skill: "乱拳:2", sta: -3, hp: -2 } },
            { label: "敷药歇息", hint: "拳面要紧。气血 +5。", fx: { hp: 5 } },
          ],
        };
        if (m.nearCap) return { // 功法精研·逼近瓶颈：破关契机
          scene: `石窝里的雪沫被你劲气卷成了旋儿。「${(m.techs || []).join("与")}」行至此处，关隘薄得只剩一纸——路过的云游修士忽然驻足，眯眼看了你许久：「小友的功法，要破关了。」`,
          choices: [
            { label: "当场再练，一鼓作气", hint: `「${(m.techs || [])[0]}」熟练 +3，修为 +3。瓶颈在望。`, fx: { skill: `${(m.techs || [])[0]}:3`, cult: 3, sta: -2 } },
            { label: "向修士请教破关之法", hint: "判定：投缘则得一句真言。", fx: { check: "int*5+luck*4+d20>42",
                success: { cult: 8, dao: 0.5 }, fail: { cult: 2 },
                successText: "修士拈须一笑，只说了八个字。你如遭雷击，识海一片透亮。",
                failText: "修士摇摇头：「时候未到。」却也祝你早日破关。" } },
          ],
        };
        return { // 功法精研·默认：精研余韵
          scene: `精研的余韵还在经脉里流转。「${(m.techs || []).join("与")}」的招式拆过了、重练了，此刻一招一式都像长进了筋骨里。你抬手起式——雪沫未扬，气已先至。`,
          choices: [
            { label: "趁热再研一式", hint: `「${(m.techs || [])[0]}」熟练 +2，修为 +2。`, fx: { skill: `${(m.techs || [])[0]}:2`, cult: 2, sta: -2 } },
            { label: "温养气机，水到渠成", hint: "修为 +4。", fx: { cult: 4 } },
            { label: "记下今日心得", hint: "「读书」技艺 +2，道心 +0.3。", fx: { skill: "读书:2", dao: 0.3 } },
          ],
        };
      },
    },

  ];

  /* ---------- 十大仙器 · 寻器场景（设定集第十六章：卷二留名 → 卷三现世） ----------
     前置任务完成 + 未入手 + 地域相符（region 为 null 者随处可遇）→ 器应主而动。 */
  if (typeof XIANQI !== "undefined") for (const x of XIANQI) SITUATIONS.push({
    id: "xq_get_" + x.id,
    cond: () => (!x.region || regionOf(S.place).key === x.region) && (typeof QU !== "undefined") && QU.isDone("xq_" + x.id)
      && !(S.gear && (S.gear.xianqiOwned || []).includes(x.id)),
    w: () => 6,
    build() {
      return {
        scene: x.scene,
        choices: [
          { label: `取之——「${x.name}」`, hint: "仙器入手，随身入装备栏；佩戴之益即刻生效。", fx: { special: "xianqi:" + x.id, coincidence: 1, dao: 2 } },
          { label: "还不是时候", hint: "器已应你，跑不了。", fx: { dao: 0.5 } },
        ],
      };
    },
  });

  /* ---------- 上下文 ---------- */
  /* 缘分突破候选：缘分 ≥80 且尚未 bondbreak 的有名 NPC（「路人缘」是汇总池，除外） */
  function bondCandidates() {
    return Object.keys(S.npc || {}).filter(n => n !== "路人缘" && (S.npc[n] || 0) >= 80 && !S.flags["bondbreak_" + n]);
  }
  function buildCtx() {
    return {
      weather: S.weather,
      weatherBad: ((typeof regionOf === "function") ? regionOf(S.place).badWx : ["大雪", "风雪"]).includes(S.weather) || S.flags.coldSnap,
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
    /* 显眼包：结缘类（social）遭遇权重 ×1.5——贵人更容易注意到你 */
    const wOf = s => Math.max(0.1, s.w(ctx)) * (s.social && hasSpecial("xianyan") ? 1.5 : 1);
    // 防重复：近期 8 次 + 当日全部（同一天内剧情不重复）
    const seen = new Set((S.gmRecent || []).slice(-8).concat(S.daySeen || []));
    // 待承接的专属剧情不受当日去重限制——修行记事（med_*）与历练之机（train_after）：
    // 一日多次参悟/砥砺，每次都要有回响
    const repeatOK = new Set();
    if (S.medScene) ["med_teacher", "med_after"].forEach(i => repeatOK.add(i));
    if (S.trainScene) repeatOK.add("train_after");
    let pool = SITUATIONS.filter(s => {
      if (seen.has(s.id) && !repeatOK.has(s.id)) return false;
      try { return s.cond(ctx); } catch (e) { return false; }
    });
    // 当日耗尽才放宽到「近期不重复」
    if (!pool.length) pool = SITUATIONS.filter(s => {
      if ((S.gmRecent || []).slice(-8).includes(s.id)) return false;
      try { return s.cond(ctx); } catch (e) { return false; }
    });
    if (!pool.length) pool = SITUATIONS.filter(s => { try { return s.cond(ctx); } catch (e) { return false; } });
    if (!pool.length) return fallbackScene(ctx);
    let tot = pool.reduce((a, s) => a + wOf(s), 0);
    let r = rng() * tot, sit = pool[0];
    for (const s of pool) { r -= wOf(s); if (r <= 0) { sit = s; break; } }
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
      scene: `${["清晨", "午后", "黄昏", "夜里"][S.slot]}，${S.weather}。${placeTown()}的一天又翻过一页，你继续熬着。`,
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
