/* ============================================================
 * 判定演算表 · 由 tools/calc_tables.py 依《苍玄界世界设定集》演算生成
 * 请勿手改本文件；调整数值请改 tools/calc_tables.py 后重新生成。
 * 重算：python tools/calc_tables.py
 * ============================================================ */
const TABLES = {
  "REALMS": {
    "names": [
      "凡躯",
      "淬体境",
      "炼皮境",
      "锻骨境",
      "通脉境",
      "聚气境",
      "开元境",
      "灵泉境",
      "玄境",
      "圣境",
      "天人境"
    ],
    "need": [
      0,
      60,
      100,
      150,
      210,
      280,
      360,
      1980,
      11880,
      65340,
      359370
    ],
    "top": 10,
    "tierNames": [
      "凡",
      "凡阶",
      "凡阶",
      "凡阶",
      "凡阶",
      "凡阶",
      "凡阶",
      "灵阶",
      "玄阶",
      "圣阶",
      "天人"
    ],
    "attrCeilingBase": 10,
    "attrCeilingPerRealm": 1,
    "layers": 4,
    "layerThresholds": [
      0.25,
      0.5,
      0.75
    ],
    "layerBonus": 0.2,
    "breakAttrMult": 1.05,
    "realmDmgPerRealm": 0.45
  },
  "BREAK": {
    "base": 55,
    "luckW": 2,
    "retryPenalty": 5,
    "mods": {
      "ding": 15,
      "yinguo": -5,
      "coldSnap": -10
    },
    "clamp": [
      15,
      92
    ],
    "failCultKeep": 0.7,
    "failCultKeepDing": 0.85,
    "weakDays": 3,
    "yushiWindowDays": 10
  },
  "JUDGE": {
    "dodge": {
      "base": 8,
      "w": 5,
      "cap": [
        4,
        38
      ]
    },
    "crit": {
      "base": 5,
      "w": 4,
      "cap": [
        3,
        28
      ],
      "mult": 2.0
    },
    "weak": {
      "base": 6,
      "w": 4,
      "cap": [
        4,
        32
      ],
      "mult": 1.5
    },
    "stack": true,
    "dmgFloat": [
      0.9,
      1.1
    ]
  },
  "COMBAT": {
    "hpPerCon": 10,
    "tierHpScale": 0.5,
    "powerTiers": [
      0,
      10,
      50,
      300,
      2000
    ],
    "skillMultBase": 1.6,
    "skillMultPerRealm": 0.1,
    "enemySkillChance": 0.25,
    "enemySkillMult": 1.5,
    "wxKeMult": 1.2,
    "wxBeKeMult": 0.8,
    "quickRound": 5,
    "quickMyPerFactor": 0.55,
    "quickFoePerFactor": 0.85,
    "strIsAtk": 1
  },
  "CRAFT": {
    "qualityNames": [
      "瑕疵",
      "下品",
      "中品",
      "上品",
      "极品",
      "绝品"
    ],
    "qualityMults": [
      0.55,
      0.75,
      1.0,
      1.2,
      1.5,
      2.0
    ],
    "qualityBounds": [
      25,
      45,
      65,
      85,
      100
    ],
    "humanRealmW": 8,
    "humanLvW": 6,
    "humanCap": 70,
    "materialScore": 20,
    "toolScore": 10,
    "luckJitter": 20,
    "chanceTool": 5,
    "chanceHumanCap": 25,
    "chanceCap": 95,
    "expGain": {
      "ok": 8,
      "fail": 4
    }
  },
  "INJURY": {
    "thresholds": [
      0.999,
      0.7,
      0.4,
      0.1
    ],
    "penalties": [
      0,
      10,
      30,
      50,
      80
    ],
    "darkWound": {
      "chanceBase": 0.35,
      "conFactor": 0.03,
      "cap": [
        0.08,
        0.6
      ],
      "dmgLo": 0.1,
      "dmgHi": 0.25
    }
  },
  "DRUG": {
    "shiByPin": {
      "凡": 4,
      "灵": 10,
      "玄": 20,
      "圣": 35
    },
    "shiRanges": {
      "凡": [
        3,
        5
      ],
      "灵": [
        8,
        12
      ],
      "玄": [
        15,
        25
      ],
      "圣": [
        30,
        40
      ]
    },
    "decayMults": [
      1,
      0.5,
      0.25,
      0
    ],
    "doubleFromUse": 4,
    "trainPenaltyAt": 30,
    "trainPenalty": 0.9,
    "absorbPenaltyAt": 30,
    "absorbPenalty": 0.85,
    "states": [
      [
        90,
        "丹毒爆发边缘"
      ],
      [
        60,
        "丹毒蚀体"
      ],
      [
        30,
        "药蚀渐积"
      ],
      [
        0,
        "无碍"
      ]
    ]
  },
  "MONEY": {
    "wenPerLiang": 1000,
    "liangPerGold": 10,
    "wenPerStone": 100000,
    "stoneTierMult": 100,
    "stoneAltWen": 200
  },
  "ACH": {
    "tierNames": [
      "凡品",
      "灵品",
      "玄品",
      "圣品",
      "仙品"
    ],
    "pointsRange": [
      [
        10,
        30
      ],
      [
        50,
        50
      ],
      [
        150,
        150
      ],
      [
        500,
        500
      ],
      [
        0,
        0
      ]
    ],
    "attrRange": [
      [
        0.5,
        2
      ],
      [
        3,
        8
      ],
      [
        20,
        50
      ],
      [
        100,
        300
      ],
      [
        0,
        0
      ]
    ],
    "firstMult": 1.5,
    "everMult": 2.0,
    "pageSize": 10,
    "pagePullMinTier": 1
  },
  "PROF": {
    "tierCaps": {
      "0": 3,
      "1": 5
    },
    "need": {
      "2": 2,
      "3": 4,
      "4": 8,
      "5": 16
    },
    "sideExp": 2,
    "mainExp": 3,
    "multiProfPenalty": 0.7
  }
};
