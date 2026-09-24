#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《苍玄界》判定演算表生成器
=============================
所有游戏内触发的数值判定（修为/破境、战斗五维判定、炼丹炼器品质、伤病药蚀、货币、成就奖励）
由本脚本依据《苍玄界世界设定集》演算生成，输出 js/tables.js 供引擎查表使用。

重算：  python tools/calc_tables.py
原则：  引擎内不再手写设定数值；凡设定相关的判定参数，一律以本表为准。
"""
import json, math, os, sys

T = {}

# ---------------------------------------------------------------- 修为体系（设定：凡阶六境 + 灵泉 + 玄/圣大阶 + 天人）
# 凡阶六境：淬体/炼皮/锻骨/通脉/聚气/开元（设定一致，名字不改）
# 修为需求曲线：凡阶境内等差递增（差值 40,50,60,70,80——吐纳难度随境抬升）；
# 大阶跨越倍数取战力锚点之比（设定·战力锚点：凡阶 10~50 → 灵阶 50~300 ≈ ×6；
# 灵阶 50~300 → 玄阶 300~2000 ≈ ×6.7；玄阶 → 圣阶 2000~10000 ≈ ×5），保守取 ×5.5/×6/×5.5/×5.5。
realm_names = ["凡躯", "淬体境", "炼皮境", "锻骨境", "通脉境", "聚气境", "开元境",  # 凡阶（0~6，0 为未入流）
               "灵泉境",   # 7 灵阶（设定命名）
               "玄境",     # 8 玄阶（设定未列细分名，以 AI 依设定合理扩充）
               "圣境",     # 9 圣阶
               "天人境"]   # 10 传说（设定一·「天人境以上突破者逐代递减」）
need = [0, 60]
diff = 40
for r in range(2, 7):            # 凡阶境内：等差 +10
    need.append(need[-1] + diff)
    diff += 10
jump = {7: 5.5, 8: 6.0, 9: 5.5, 10: 5.5}   # 大阶跨越倍数（战力锚点推演）
for r in range(7, 11):
    need.append(round(need[-1] * jump[r]))
REALM_TOP = 10
def realm_tier(r):
    return "凡" if r <= 0 else ("凡阶" if r <= 6 else ("灵阶" if r <= 7 else ("玄阶" if r <= 8 else ("圣阶" if r <= 9 else "天人"))))
T["REALMS"] = {
    "names": realm_names, "need": need, "top": REALM_TOP,
    "tierNames": [realm_tier(r) for r in range(len(realm_names))],
    "attrCeilingBase": 10, "attrCeilingPerRealm": 1,   # 属性天花板 = 10 + 境界（设定·属性标尺）
    "layers": 4, "layerThresholds": [0.25, 0.5, 0.75], # 每境四分（设定：初期/中期/后期/圆满）
    "layerBonus": 0.2,                                  # 小层突破全属性微涨
    "breakAttrMult": 1.05,                              # 大境突破全属性 +5%
    "realmDmgPerRealm": 0.45,                           # 战力境界加幅 ×(1+0.45·境)
}

# ---------------------------------------------------------------- 破境判定（设定：难度随境涨；气运改概率不改数值）
T["BREAK"] = {
    "base": 55, "luckW": 2, "retryPenalty": 5,          # 基础 55% + 气运×2，失败一次 -5
    "mods": {"ding": 15, "yinguo": -5, "coldSnap": -10},
    "clamp": [15, 92],
    "failCultKeep": 0.7, "failCultKeepDing": 0.85, "weakDays": 3,
    "yushiWindowDays": 10,                              # 「与天争时」：十日内连破两境
}

# ---------------------------------------------------------------- 战斗判定（设定第十二章：敏管闪避、运管暴击、智管弱点）
T["JUDGE"] = {
    "dodge": {"base": 8, "w": 5, "cap": [4, 38]},       # 闪避率 = 8 + (守敏-攻敏)×5
    "crit":  {"base": 5, "w": 4, "cap": [3, 28], "mult": 2.0},
    "weak":  {"base": 6, "w": 4, "cap": [4, 32], "mult": 1.5},
    "stack": True,                                       # 暴击与弱点独立判定，可叠加
    "dmgFloat": [0.9, 1.1],                              # 伤害浮动 ±10%（不大）
}
T["COMBAT"] = {
    "hpPerCon": 10, "tierHpScale": 0.5,                  # 敌我同式：气血 = 体质×10×(1+0.5×境界档)
    "powerTiers": [0, 10, 50, 300, 2000],                # 战力锚点（设定）：凡俗/凡阶/灵阶/玄阶/圣阶
    "skillMultBase": 1.6, "skillMultPerRealm": 0.1,     # 技能伤害 = 基础×(1.6+0.1×境)
    "enemySkillChance": 0.25, "enemySkillMult": 1.5,
    "wxKeMult": 1.2, "wxBeKeMult": 0.8,                  # 五行生克 ±20%
    "quickRound": 5,                                     # 超过 5 回合：系统简化快速结算
    "quickMyPerFactor": 0.55, "quickFoePerFactor": 0.85,
    "strIsAtk": 1,                                       # 一力 = 一基础攻击力
}

# ---------------------------------------------------------------- 炼丹炼器（设定第九章：七分在人、两分在料、一分在器、一丝气运）
T["CRAFT"] = {
    "qualityNames": ["瑕疵", "下品", "中品", "上品", "极品", "绝品"],
    "qualityMults": [0.55, 0.75, 1.0, 1.2, 1.5, 2.0],   # 效力五~六成 → 二十成
    "qualityBounds": [25, 45, 65, 85, 100],              # 品质分档（百分制）
    "humanRealmW": 8, "humanLvW": 6, "humanCap": 70,     # 七分在人 = 境界×8 + 熟练度×6（封顶 70）
    "materialScore": 20, "toolScore": 10,                # 两分在料 / 一分在器
    "luckJitter": 20,                                    # 气运抖动区间
    "chanceTool": 5, "chanceHumanCap": 25, "chanceCap": 95,
    "expGain": {"ok": 8, "fail": 4},
}

# ---------------------------------------------------------------- 伤病与药蚀（设定：伤病四级、是药三分毒）
T["INJURY"] = {
    "thresholds": [0.999, 0.7, 0.4, 0.1],                # 气血比 → 无恙/轻伤/中伤/重伤/濒死
    "penalties": [0, 10, 30, 50, 80],
    "darkWound": {"chanceBase": 0.35, "conFactor": 0.03, "cap": [0.08, 0.6], "dmgLo": 0.1, "dmgHi": 0.25},
}
T["DRUG"] = {
    "shiByPin": {"凡": 4, "灵": 10, "玄": 20, "圣": 35}, # 凡品3~5 / 灵品8~12 / 玄品15~25 / 圣品30+
    "shiRanges": {"凡": [3, 5], "灵": [8, 12], "玄": [15, 25], "圣": [30, 40]},
    "decayMults": [1, 0.5, 0.25, 0], "doubleFromUse": 4,  # 同种递减；第四次起药蚀翻倍
    "trainPenaltyAt": 30, "trainPenalty": 0.9, "absorbPenaltyAt": 30, "absorbPenalty": 0.85,
    "states": [[90, "丹毒爆发边缘"], [60, "丹毒蚀体"], [30, "药蚀渐积"], [0, "无碍"]],
}

# ---------------------------------------------------------------- 货币（设定第七章）
T["MONEY"] = {"wenPerLiang": 1000, "liangPerGold": 10, "wenPerStone": 100000,
              "stoneTierMult": 100, "stoneAltWen": 200}

# ---------------------------------------------------------------- 成就（设定第十三章）
T["ACH"] = {
    "tierNames": ["凡品", "灵品", "玄品", "圣品", "仙品"],
    "pointsRange": [[10, 30], [50, 50], [150, 150], [500, 500], [0, 0]],   # 万象点为辅
    "attrRange":   [[0.5, 2], [3, 8], [20, 50], [100, 300], [0, 0]],       # 自由属性为主
    "firstMult": 1.5, "everMult": 2.0,                   # 当世首达 ×1.5 / 万古首达 ×2
    "pageSize": 10, "pagePullMinTier": 1,                # 翻页：每 10 项赠「天命一抽」（必出灵品以上）
}

# ---------------------------------------------------------------- 职业（设定第三章）
T["PROF"] = {"tierCaps": {"0": 3, "1": 5}, "need": {"2": 2, "3": 4, "4": 8, "5": 16},
             "sideExp": 2, "mainExp": 3, "multiProfPenalty": 0.7}

# ---------------------------------------------------------------- 输出
out = "/* ============================================================\n"
out += " * 判定演算表 · 由 tools/calc_tables.py 依《苍玄界世界设定集》演算生成\n"
out += " * 请勿手改本文件；调整数值请改 tools/calc_tables.py 后重新生成。\n"
out += " * 重算：python tools/calc_tables.py\n"
out += " * ============================================================ */\n"
out += "const TABLES = " + json.dumps(T, ensure_ascii=False, indent=2) + ";\n"

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
target = os.path.join(root, "js", "tables.js")
old = None
if os.path.exists(target):
    with open(target, encoding="utf-8") as f: old = f.read()
if old == out:
    print("tables.js 已是最新，无需更新。")
else:
    with open(target, "w", encoding="utf-8", newline="\n") as f: f.write(out)
    print("已生成 js/tables.js（%d 字节）。" % len(out.encode("utf-8")))
# 自检
assert need[1] == 60 and need[6] == 360 and need[7] == round(360 * 5.5)
print("境界阶梯:", " → ".join(n for n in realm_names))
print("修为需求:", need)
print("演算完成。")
