"""Hesabu huru ya Python (bila kutumia bi.js) kulinganisha na matokeo ya injini."""
import json, sys, collections, math
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
d = sys.argv[1]
tz = ZoneInfo("Africa/Dar_es_Salaam")
raw = json.load(open(d + "/data.json")); bi = json.load(open(d + "/bi.json"))
now = raw["now"]; data = raw["data"]
loc = lambda ms: datetime.fromtimestamp(ms / 1000, tz)
def tot(s): return sum(l["qty"] * l["price"] for l in s["lines"])
def cost(s): return sum(l["qty"] * (l.get("cost") or 0) for l in s["lines"])
fails = 0
def chk(name, a, b, tol=0.5):
    global fails
    ok = abs(a - b) <= tol
    if not ok: fails += 1
    print(("OK   " if ok else "FAIL ") + name + ": engine=%.2f independent=%.2f" % (a, b))

today = loc(now).replace(hour=0, minute=0, second=0, microsecond=0)
# miezi 5 ya mwisho
def month_start(dt, back):
    y, m = dt.year, dt.month - back
    while m <= 0: m += 12; y -= 1
    return datetime(y, m, 1, tzinfo=tz)
for key, s in bi["months"].items():
    y, m = map(int, key.split("-")); a = datetime(y, m, 1, tzinfo=tz)
    b = datetime(y + (m == 12), (m % 12) + 1, 1, tzinfo=tz)
    A, B = a.timestamp() * 1000, b.timestamp() * 1000
    sales = [x for x in data["sales"] if A <= x["ts"] < B]
    exps = [e for e in data["expenses"] if A <= e["ts"] < B]
    S = sum(map(tot, sales)); C = sum(map(cost, sales)); E = sum(e["amount"] for e in exps)
    chk(key + " mauzo", s["sales"], S); chk(key + " faida jumla", s["gross"], S - C)
    chk(key + " matumizi", s["expenses"], E); chk(key + " faida halisi", s["net"], S - C - E)
    chk(key + " idadi ya risiti", s["count"], len(sales), 0)
    # pesa zilizopokelewa
    recv = 0
    for x in data["sales"]:
        if x["pay"]["method"] == "mkopo":
            if A <= x["ts"] < B: recv += x["pay"].get("paid", 0)
        elif A <= x["ts"] < B: recv += tot(x)
        for p in x.get("payments", []):
            if A <= p["ts"] < B: recv += p["amt"]
    chk(key + " pesa zilizopokelewa", s["received"], recv)
# siku 30
A = (today - timedelta(days=29)).timestamp() * 1000; B = (today + timedelta(days=1)).timestamp() * 1000
s30 = [x for x in data["sales"] if A <= x["ts"] < B]
chk("d30 mauzo", bi["d30"]["sales"], sum(map(tot, s30)))
chk("d30 wastani wa risiti", bi["d30"]["avgBasket"], sum(map(tot, s30)) / len(s30))
chk("mfululizo wa siku (jumla)", bi["seriesSum"], sum(map(tot, s30))); chk("mfululizo (idadi ya siku)", bi["seriesLen"], 30, 0)
# bidhaa
prod = collections.defaultdict(lambda: [0, 0, 0])
cat = collections.defaultdict(lambda: [0, 0])
for x in s30:
    for l in x["lines"]:
        r = l["qty"] * l["price"]; c = l["qty"] * l["cost"]
        prod[l["name"]][0] += r; prod[l["name"]][1] += r - c; prod[l["name"]][2] += l["qty"]
        cat[l["cat"]][0] += r; cat[l["cat"]][1] += r - c
rank = sorted(prod.items(), key=lambda kv: -kv[1][0])[:8]
for i, (n, v) in enumerate(rank):
    t = bi["top"][i]
    if t["name"] != n: fails += 1; print("FAIL nafasi", i, t["name"], n)
    chk("bidhaa " + n + " mauzo", t["rev"], v[0]); chk("bidhaa " + n + " faida", t["profit"], v[1]); chk("bidhaa " + n + " idadi", t["qty"], v[2], 0)
for c in bi["cats"]: chk("aina " + c["name"], c["rev"], cat[c["name"]][0]); 
# ABC: bidhaa za A lazima zifikie >= 80% kwa jumla
tr = sum(v[0] for v in prod.values()); cum = 0; a_names = []
for n, v in sorted(prod.items(), key=lambda kv: -kv[1][0]):
    if cum / tr < 0.8: a_names.append(n)
    cum += v[0]
eng_a = [t["name"] for t in bi["top"] if t["abc"] == "A"]
print("OK   ABC (A) zinalingana" if eng_a == a_names[:len(eng_a)] and len(eng_a) <= len(a_names) else "FAIL ABC %s vs %s" % (eng_a, a_names))
if not (eng_a == a_names[:len(eng_a)]): fails += 1
# malipo
pm = collections.defaultdict(float)
for x in s30: pm[x["pay"]["method"]] += tot(x)
for p in bi["pay"]: chk("malipo " + p["method"], p["total"], pm[p["method"]])
# saa na siku za wiki
hs = [0] * 24; ws = [0] * 7
for x in s30:
    t = loc(x["ts"]); hs[t.hour] += tot(x); ws[t.weekday()] += tot(x)
for h in range(24): chk("saa %02d" % h, bi["hours"][h], hs[h])
for w in range(7): chk("siku ya wiki %d" % w, bi["weekdays"][w]["sales"], ws[w])
# idadi ya siku za wiki ndani ya dirisha (siku 30 hadi leo)
cnt = [0] * 7
for i in range(30): cnt[(today - timedelta(days=i)).weekday()] += 1
for w in range(7): chk("hesabu ya siku ya wiki %d" % w, bi["weekdays"][w]["n"], cnt[w], 0)
# madeni
owed = collections.defaultdict(float)
for x in data["sales"]:
    if x["pay"]["method"] == "mkopo":
        owed[x["customer"]] += max(0, tot(x) - x["pay"].get("paid", 0) - sum(p["amt"] for p in x.get("payments", [])))
for c in bi["credits"]: chk("deni " + c["name"], c["owed"], owed[c["name"]])
chk("idadi ya wadeni", len(bi["credits"]), len([k for k, v in owed.items() if v > 0]), 0)
# stoo: hakuna mauzo yaliyozidi kiasi kilichopo kwa makosa ya kuhesabu (angalia mtiririko wa stoo)
init = {}
# stoo ya mwisho = (ununuzi - mauzo) + stoo ya mwanzo; tunaangalia tu bidhaa zote zina stoo >= 0
neg = [x for x in bi["stock"] if x["stock"] < 0]
print("OK   stoo hasi: 0" if not neg else "FAIL stoo hasi %s" % neg); fails += bool(neg)
# makadirio: lazima yawe karibu na wastani wa siku 14 za mwisho
y = [sum(map(tot, [x for x in data["sales"] if (today - timedelta(days=k)).timestamp()*1000 <= x["ts"] < (today - timedelta(days=k-1)).timestamp()*1000])) for k in range(14, 0, -1)]
chk("makadirio: wastani wa siku 14 za mwisho", bi["fc"]["recent"], sum(y) / 14)
avgpred = bi["fc"]["total"] / 7
print("INFO makadirio ya siku 7: %.0f kwa siku (wastani wa hivi karibuni %.0f)" % (avgpred, sum(y) / 14))
print("\nMATOKEO:", "YOTE SAWA" if fails == 0 else "%d MAKOSA" % fails)
sys.exit(1 if fails else 0)
