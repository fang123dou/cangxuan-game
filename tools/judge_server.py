#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《苍玄界》判定演算服务端
==========================
游戏内所有「判定」（fx.check 表达式、骰子、设定锚点校验）由本服务端依设定集演算：
  - 载入 tools/calc_tables.py 演算出的判定表（修为/战斗/炼制/伤病/药蚀/成就/货币），
    判定表达式可直接引用其中常量（如 need7、shiLing、firstMult）；
  - 支持 dN 骰子（如 d100<38）；
  - 仅允许白名单 AST 节点，拒绝任意代码执行；
  - 无服务端时引擎自动回退本地 JS 兜底（见 js/ai.js judge()）。

启动：  python tools/judge_server.py        （默认 0.0.0.0:8317）
环境：  仅标准库。
"""
import ast, json, math, os, random, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calc_tables  # 复用设定表演算（ import 即完成全部演算与自检 ）

T = calc_tables.T

# 判定表达式可见的常量环境（全部来自设定集演算表）
ENV = {}
for i, n in enumerate(T["REALMS"]["need"]):
    ENV["need%d" % i] = n
ENV["realmTop"] = T["REALMS"]["top"]
ENV.update({"critMult": T["JUDGE"]["crit"]["mult"], "weakMult": T["JUDGE"]["weak"]["mult"],
            "quickRound": T["COMBAT"]["quickRound"], "hpPerCon": T["COMBAT"]["hpPerCon"]})
ENV.update({"firstMult": T["ACH"]["firstMult"], "everMult": T["ACH"]["everMult"], "achPage": T["ACH"]["pageSize"]})
for pin, v in T["DRUG"]["shiByPin"].items():
    ENV["shi" + {"凡": "Fan", "灵": "Ling", "玄": "Xuan", "圣": "Sheng"}[pin]] = v
ENV.update({"breakBase": T["BREAK"]["base"], "breakClampLo": T["BREAK"]["clamp"][0], "breakClampHi": T["BREAK"]["clamp"][1]})

ALLOWED_NODES = (ast.Expression, ast.BoolOp, ast.And, ast.Or, ast.UnaryOp, ast.Not, ast.USub, ast.UAdd,
                 ast.BinOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow, ast.FloorDiv,
                 ast.Compare, ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
                 ast.Constant, ast.Name, ast.Load)
DICE_MAX = 100000


def roll_dice(expr):
    """掷骰：把 dN 替换为 1~N 的随机整数。仅当 d 前不是字母时才算骰子（避免误伤 need7 这类常量名）。"""
    out, i = [], 0
    while i < len(expr):
        prev = expr[i - 1] if i > 0 else ""
        if expr[i] in "dD" and i + 1 < len(expr) and expr[i + 1].isdigit() and not prev.isalpha():
            j = i + 1
            while j < len(expr) and expr[j].isdigit(): j += 1
            out.append(str(random.randint(1, min(DICE_MAX, int(expr[i + 1:j])))))
            i = j
        else:
            out.append(expr[i]); i += 1
    return "".join(out)


def judge(expr, state):
    """安全演算：白名单 AST + 骰子 + 状态变量 + 设定常量。返回 dict 或 None。"""
    if not isinstance(expr, str) or len(expr) > 400: return None
    if not any(op in expr for op in "<>!=&|"): return None
    e = roll_dice(expr)
    try:
        tree = ast.parse(e, mode="eval")
    except SyntaxError:
        return None
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED_NODES): return None
        if isinstance(node, ast.Constant) and not isinstance(node.value, (int, float, bool)): return None
    env = dict(ENV)
    for k, v in (state or {}).items():
        if isinstance(k, str) and k.isidentifier() and isinstance(v, (int, float, bool)):
            env[k] = v
    try:
        code = compile(tree, "<judge>", "eval")
        v = bool(eval(code, {"__builtins__": {}}, env))
    except Exception:
        return None
    return {"success": v, "detail": e.replace(" ", ""), "src": "python"}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self): self._send(204, {})

    def do_GET(self):
        if self.path.startswith("/api/tables"):
            return self._send(200, {"ok": True, "tables": T})
        if self.path.startswith("/api/health"):
            return self._send(200, {"ok": True, "realms": calc_tables.realm_names})
        self._send(404, {"ok": False})

    def do_POST(self):
        if not self.path.startswith("/api/judge"):
            return self._send(404, {"ok": False})
        try:
            n = int(self.headers.get("Content-Length", 0))
            d = json.loads(self.rfile.read(n).decode("utf-8") or "{}")
            r = judge(d.get("expr", ""), d.get("state", {}))
            if r is None: return self._send(400, {"ok": False, "error": "invalid expr"})
            self._send(200, r)
        except Exception as ex:
            self._send(500, {"ok": False, "error": str(ex)})

    def log_message(self, *a):  # 静默
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8317
    print("《苍玄界》判定演算服务端 · 依设定集演算 · http://0.0.0.0:%d" % port)
    print("接口: POST /api/judge  GET /api/tables  GET /api/health")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
