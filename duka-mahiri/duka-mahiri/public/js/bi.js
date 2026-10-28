/* bi.js: injini ya uchambuzi wa biashara. Kazi safi (hakuna DOM), inaweza kujaribiwa kwenye Node.
 *
 * Muundo wa data:
 *  product : {id,name,cat,unit,cost,price,stock,minStock,created}
 *  sale    : {id,ts,lines:[{pid,name,cat,qty,price,cost,est}],pay:{method,paid},payments:[{ts,amt,method}],customer,phone,note}
 *  expense : {id,ts,cat,amount,note}
 *  purchase: {id,ts,pid,qty,unitCost,supplier,type:'restock'|'adjust',note}
 * Mauzo huhesabiwa siku ya kuuza (accrual). Pesa zilizopokelewa huhesabiwa siku zilipoingia. */
(function (root) {
  "use strict";
  var U = (typeof require !== "undefined" && typeof module !== "undefined" && module.exports) ? require("./util.js") : root.U;
  var DAY = U.DAY;

  var cache = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function calc(s) {
    var c = cache && cache.get(s);
    if (c) return c;
    var total = 0, cost = 0, qty = 0;
    for (var i = 0; i < s.lines.length; i++) {
      var l = s.lines[i];
      total += l.qty * l.price; cost += l.qty * (l.cost || 0); qty += l.qty;
    }
    c = { total: total, cost: cost, profit: total - cost, qty: qty };
    if (cache) cache.set(s, c);
    return c;
  }
  function isCredit(s) { return !!(s.pay && s.pay.method === "mkopo"); }
  function paidLater(s) { var p = 0; (s.payments || []).forEach(function (x) { p += x.amt; }); return p; }
  function deposit(s) { return isCredit(s) ? (s.pay.paid || 0) : 0; }
  function outstanding(s) {
    if (!isCredit(s)) return 0;
    return Math.max(0, calc(s).total - deposit(s) - paidLater(s));
  }
  function inR(ts, from, to) { return ts >= from && ts < to; }
  function sum(a) { var t = 0; for (var i = 0; i < a.length; i++) t += a[i]; return t; }
  function avg(a) { return a.length ? sum(a) / a.length : 0; }

  /* ---------- Muhtasari wa kipindi ---------- */
  function summary(data, from, to) {
    var S = 0, C = 0, N = 0, Q = 0, recv = 0, creditSales = 0, est = 0, E = 0;
    data.sales.forEach(function (s) {
      var c = calc(s);
      if (inR(s.ts, from, to)) {
        S += c.total; C += c.cost; N++; Q += c.qty;
        if (isCredit(s)) { creditSales += c.total; recv += deposit(s); } else recv += c.total;
        s.lines.forEach(function (l) { if (l.est) est += l.qty * l.price; });
      }
      // "samehe" (deni lililofutwa) si pesa iliyopokelewa
      if (s.payments) s.payments.forEach(function (p) { if (inR(p.ts, from, to) && p.method !== "samehe") recv += p.amt; });
    });
    data.expenses.forEach(function (e) { if (inR(e.ts, from, to)) E += e.amount; });
    return {
      sales: S, cost: C, gross: S - C, expenses: E, net: S - C - E,
      count: N, qty: Q, avgBasket: N ? S / N : 0, received: recv,
      creditSales: creditSales, estShare: S ? est / S : 0,
      margin: S ? (S - C) / S : 0
    };
  }

  /* ---------- Mfululizo wa muda (saa/siku/wiki/mwezi/robo/mwaka) ---------- */
  var UNIT_MS = { hour: 3600000, day: DAY, week: 7 * DAY, month: 30 * DAY, quarter: 91 * DAY, year: 365 * DAY };
  function series(data, from, to, unit) {
    var start = U.startOf(from, unit), out = [], idx = {};
    var guard = 0;
    for (var t = start; t < to && guard < 4000; t = U.next(t, unit), guard++) {
      var b = { start: t, end: U.next(t, unit), label: U.label(t, unit), sales: 0, cost: 0, profit: 0, count: 0, expenses: 0, qty: 0 };
      idx[t] = b; out.push(b);
    }
    data.sales.forEach(function (s) {
      if (!inR(s.ts, from, to)) return;
      var b = idx[U.startOf(s.ts, unit)];
      if (!b) return;
      var c = calc(s);
      b.sales += c.total; b.cost += c.cost; b.profit += c.profit; b.count++; b.qty += c.qty;
    });
    data.expenses.forEach(function (e) {
      if (!inR(e.ts, from, to)) return;
      var b = idx[U.startOf(e.ts, unit)];
      if (b) b.expenses += e.amount;
    });
    return out;
  }
  // Kipimo kinachofaa kwa urefu wa kipindi
  function autoUnit(from, to) {
    var d = (to - from) / DAY;
    if (d <= 1.01) return "hour";
    if (d <= 45) return "day";
    if (d <= 200) return "week";
    if (d <= 800) return "month";
    return "quarter";
  }
  // Kipimo kidogo zaidi cha kuchimba (drill-down)
  var DRILL = { year: "month", quarter: "month", month: "day", week: "day", day: "hour" };

  /* ---------- Bidhaa na makundi ---------- */
  function byProduct(data, from, to) {
    var map = {}, total = 0;
    data.sales.forEach(function (s) {
      if (!inR(s.ts, from, to)) return;
      s.lines.forEach(function (l) {
        var key = l.pid || ("n:" + l.name);
        var p = map[key] || (map[key] = { key: key, pid: l.pid || null, name: l.name, cat: l.cat || "Nyingine", qty: 0, rev: 0, cost: 0, profit: 0, count: 0, est: false });
        var rev = l.qty * l.price, cost = l.qty * (l.cost || 0);
        p.qty += l.qty; p.rev += rev; p.cost += cost; p.profit += rev - cost; p.count++;
        if (l.est) p.est = true;
        total += rev;
      });
    });
    var arr = Object.keys(map).map(function (k) { return map[k]; });
    arr.sort(function (a, b) { return b.rev - a.rev; });
    var cum = 0;
    arr.forEach(function (p) {
      p.margin = p.rev ? p.profit / p.rev : 0;
      p.share = total ? p.rev / total : 0;
      var before = total ? cum / total : 0;
      cum += p.rev;
      p.cum = total ? cum / total : 0;
      // ABC: A = bidhaa zinazounda 80% ya kwanza ya mauzo, B = hadi 95%, C = iliyobaki
      p.abc = before < 0.8 ? "A" : (before < 0.95 ? "B" : "C");
    });
    return arr;
  }
  function byCategory(data, from, to) {
    var map = {}, total = 0;
    data.sales.forEach(function (s) {
      if (!inR(s.ts, from, to)) return;
      s.lines.forEach(function (l) {
        var k = l.cat || "Nyingine";
        var c = map[k] || (map[k] = { name: k, rev: 0, cost: 0, profit: 0, qty: 0 });
        var rev = l.qty * l.price, cost = l.qty * (l.cost || 0);
        c.rev += rev; c.cost += cost; c.profit += rev - cost; c.qty += l.qty; total += rev;
      });
    });
    var arr = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.rev - a.rev; });
    arr.forEach(function (c) { c.share = total ? c.rev / total : 0; c.margin = c.rev ? c.profit / c.rev : 0; });
    return arr;
  }
  function payMix(data, from, to) {
    var map = {}, total = 0;
    data.sales.forEach(function (s) {
      if (!inR(s.ts, from, to)) return;
      var m = (s.pay && s.pay.method) || "cash", t = calc(s).total;
      map[m] = (map[m] || 0) + t; total += t;
    });
    return Object.keys(map).map(function (k) { return { method: k, total: map[k], share: total ? map[k] / total : 0 }; })
      .sort(function (a, b) { return b.total - a.total; });
  }
  function expensesByCat(data, from, to) {
    var map = {}, total = 0;
    data.expenses.forEach(function (e) {
      if (!inR(e.ts, from, to)) return;
      map[e.cat] = (map[e.cat] || 0) + e.amount; total += e.amount;
    });
    return Object.keys(map).map(function (k) { return { name: k, total: map[k], share: total ? map[k] / total : 0 }; })
      .sort(function (a, b) { return b.total - a.total; });
  }

  /* ---------- Saa na siku za wiki ---------- */
  function countDays(from, to, now) {
    var end = Math.min(to, U.addDays(U.startOf(now, "day"), 1));
    var n = 0, wd = [0, 0, 0, 0, 0, 0, 0];
    for (var t = U.startOf(from, "day"); t < end; t = U.addDays(t, 1)) { n++; wd[(new Date(t).getDay() + 6) % 7]++; }
    return { days: Math.max(1, n), weekdays: wd };
  }
  // Jumatatu = 0 ... Jumapili = 6
  function timeProfile(data, from, to, now) {
    var hours = [], wk = [], heat = [];
    for (var h = 0; h < 24; h++) hours.push({ hour: h, sales: 0, count: 0 });
    for (var d = 0; d < 7; d++) { wk.push({ idx: d, sales: 0, count: 0 }); heat.push(new Array(24).fill(0)); }
    data.sales.forEach(function (s) {
      if (!inR(s.ts, from, to)) return;
      var dt = new Date(s.ts), hh = dt.getHours(), dd = (dt.getDay() + 6) % 7, t = calc(s).total;
      hours[hh].sales += t; hours[hh].count++;
      wk[dd].sales += t; wk[dd].count++;
      heat[dd][hh] += t;
    });
    var cd = countDays(from, to, now);
    hours.forEach(function (x) { x.avg = x.sales / cd.days; });
    wk.forEach(function (x) { x.n = cd.weekdays[x.idx]; x.avg = x.n ? x.sales / x.n : 0; });
    return { hours: hours, weekdays: wk, heat: heat, days: cd.days };
  }

  /* ---------- Stoo ---------- */
  function stockInfo(data, now, windowDays, leadDays) {
    windowDays = windowDays || 28; leadDays = leadDays == null ? 7 : leadDays;
    var since = now - windowDays * DAY, first = {}, last = {}, sold = {};
    data.sales.forEach(function (s) {
      s.lines.forEach(function (l) {
        if (!l.pid) return;
        if (first[l.pid] == null || s.ts < first[l.pid]) first[l.pid] = s.ts;
        if (last[l.pid] == null || s.ts > last[l.pid]) last[l.pid] = s.ts;
        if (s.ts >= since && s.ts <= now) sold[l.pid] = (sold[l.pid] || 0) + l.qty;
      });
    });
    return data.products.map(function (p) {
      var cover = first[p.id] != null ? Math.min(windowDays, Math.max(1, (now - first[p.id]) / DAY)) : windowDays;
      var daily = (sold[p.id] || 0) / cover;
      var left = daily > 0 ? p.stock / daily : Infinity;
      var status = "ok";
      if (p.stock <= 0) status = "out";
      else if ((p.minStock && p.stock <= p.minStock) || left <= leadDays) status = "low";
      return {
        product: p, daily: daily, daysLeft: left, status: status,
        lastSale: last[p.id] == null ? null : last[p.id],
        capital: Math.max(0, p.stock) * (p.cost || 0),
        // kiasi cha kuagiza ili kutosha siku za (lead + 14)
        suggest: daily > 0 ? Math.max(0, Math.ceil(daily * (leadDays + 14) - Math.max(0, p.stock))) : 0
      };
    });
  }
  function deadStock(info, now, days) {
    days = days || 30;
    return info.filter(function (x) {
      if (x.product.stock <= 0) return false;
      var ref = x.lastSale != null ? x.lastSale : (x.product.created || 0);
      return ref < now - days * DAY;
    }).sort(function (a, b) { return b.capital - a.capital; });
  }
  function inventoryValue(products) {
    var v = 0;
    products.forEach(function (p) { v += Math.max(0, p.stock) * (p.cost || 0); });
    return v;
  }

  /* ---------- Madeni ---------- */
  function custKey(n) { return String(n || "").trim().toLowerCase().replace(/\s+/g, " "); }
  function credits(data, now) {
    var map = {};
    data.sales.forEach(function (s) {
      if (!isCredit(s)) return;
      var key = custKey(s.customer) || "(bila jina)";
      var c = map[key] || (map[key] = { key: key, name: (s.customer || "").trim() || "(Bila jina)", phone: "", owed: 0, oldest: null, sales: [], lastPay: null, total: 0 });
      c.total += calc(s).total;
      if (s.phone) c.phone = s.phone;
      var o = outstanding(s);
      (s.payments || []).forEach(function (p) { if (c.lastPay == null || p.ts > c.lastPay) c.lastPay = p.ts; });
      if (o > 0) {
        c.owed += o;
        c.sales.push({ id: s.id, ts: s.ts, total: calc(s).total, outstanding: o });
        if (c.oldest == null || s.ts < c.oldest) c.oldest = s.ts;
      }
    });
    var arr = Object.keys(map).map(function (k) { return map[k]; }).filter(function (c) { return c.owed > 0; });
    arr.forEach(function (c) {
      c.sales.sort(function (a, b) { return a.ts - b.ts; });
      c.ageDays = c.oldest != null ? Math.floor((now - c.oldest) / DAY) : 0;
    });
    arr.sort(function (a, b) { return b.owed - a.owed; });
    return arr;
  }
  // Gawa malipo kwenye madeni kuanzia kongwe zaidi
  function allocate(custSales, amount) {
    var left = amount, out = [];
    for (var i = 0; i < custSales.length && left > 0; i++) {
      var a = Math.min(left, custSales[i].outstanding);
      if (a > 0) { out.push({ saleId: custSales[i].id, amt: a }); left -= a; }
    }
    return { parts: out, unallocated: left };
  }

  /* ---------- Makadirio ya mauzo (siku 7 zijazo) ---------- */
  function forecast(data, now, horizon) {
    horizon = horizon || 7;
    var today = U.startOf(now, "day"), first = null;
    data.sales.forEach(function (s) { if (first == null || s.ts < first) first = s.ts; });
    if (first == null) return null;
    var from = Math.max(U.startOf(first, "day"), U.addDays(today, -56));
    var ndays = Math.round((today - from) / DAY);
    if (ndays < 14) return null;
    var ser = series(data, from, today, "day");
    var vals = ser.map(function (b) { return b.sales; });
    var mean = avg(vals), recent = avg(vals.slice(-14));
    var ws = [0, 0, 0, 0, 0, 0, 0], wc = [0, 0, 0, 0, 0, 0, 0];
    ser.forEach(function (b) { var w = (new Date(b.start).getDay() + 6) % 7; ws[w] += b.sales; wc[w]++; });
    var factor = ws.map(function (v, w) { return wc[w] >= 3 && mean > 0 ? (v / wc[w]) / mean : 1; });
    var err = ser.map(function (b) {
      var w = (new Date(b.start).getDay() + 6) % 7, p = mean * factor[w];
      return (b.sales - p) * (b.sales - p);
    });
    var sd = Math.sqrt(avg(err));
    var days = [], total = 0;
    for (var i = 1; i <= horizon; i++) {
      var ts = U.addDays(today, i), w = (new Date(ts).getDay() + 6) % 7;
      var pred = Math.max(0, recent * factor[w]);
      days.push({ ts: ts, label: U.label(ts, "day"), pred: pred, low: Math.max(0, pred - sd), high: pred + sd });
      total += pred;
    }
    return { days: days, total: total, recent: recent, sd: sd, basisDays: ndays };
  }

  /* ---------- Ulinganisho ---------- */
  // Leo hadi sasa dhidi ya jana kufikia saa hii hii
  function todayVsYesterday(data, now) {
    var sd = U.startOf(now, "day"), el = now - sd;
    var a = summary(data, sd, now + 1), b = summary(data, sd - DAY, sd - DAY + el + 1);
    return { today: a, yest: b };
  }
  function monthPace(data, now) {
    var m0 = U.startOf(now, "month"), pm0 = U.addMonths(m0, -1);
    var el = now - m0, pEnd = Math.min(m0, pm0 + el);
    return { cur: summary(data, m0, now + 1), prev: summary(data, pm0, pEnd + 1), prevFull: summary(data, pm0, m0) };
  }

  /* ---------- Taarifa za akili (maelezo ya Kiswahili) ---------- */
  function insights(data, now, cfg) {
    cfg = cfg || {};
    var out = [], money = U.money;
    var sd = U.startOf(now, "day");
    if (!data.sales.length) return [{ type: "info", icon: "i", title: "Anza kurekodi", text: "Rekodi mauzo kwa siku chache, kisha taarifa za akili zitaonekana hapa." }];

    // 1. Mwenendo wa siku 7
    var a7 = summary(data, U.addDays(sd, -7), sd), b7 = summary(data, U.addDays(sd, -14), U.addDays(sd, -7));
    if (b7.sales > 0) {
      var d = (a7.sales - b7.sales) / b7.sales;
      if (Math.abs(d) >= 0.05) {
        out.push({
          type: d > 0 ? "good" : "warn", icon: d > 0 ? "up" : "down", pri: d > 0 ? 3 : 1,
          title: d > 0 ? "Mauzo yanapanda" : "Mauzo yanashuka",
          text: "Mauzo ya siku 7 zilizopita yamekuwa " + money(a7.sales) + ", " + (d > 0 ? "juu" : "chini") + " ya " + Math.round(Math.abs(d) * 100) + "% kuliko siku 7 zilizotangulia (" + money(b7.sales) + ")." + (d < 0 ? " Angalia bidhaa zinazokosekana au wateja waliopungua." : "")
        });
      }
    }

    // 2. Saa za mauzo mengi (siku 30)
    var r30 = { from: U.addDays(sd, -30), to: sd };
    var tp = timeProfile(data, r30.from, r30.to, now);
    var totalH = sum(tp.hours.map(function (x) { return x.sales; }));
    if (totalH > 0) {
      var best = null;
      for (var h = 0; h < 23; h++) {
        var v = tp.hours[h].sales + tp.hours[h + 1].sales;
        if (!best || v > best.v) best = { h: h, v: v };
      }
      out.push({
        type: "info", icon: "clock", pri: 5, title: "Saa za mauzo mengi",
        text: "Mauzo mengi hutokea saa " + U.p2(best.h) + ":00 hadi " + U.p2(best.h + 2) + ":00, yakiwa " + Math.round(best.v / totalH * 100) + "% ya mauzo. Hakikisha bidhaa zipo na kuna mtu wa kuhudumia muda huo."
      });
      // 3. Siku bora/dhaifu (wiki 8)
      var tp8 = timeProfile(data, U.addDays(sd, -56), sd, now);
      var wk = tp8.weekdays.filter(function (x) { return x.n >= 3 && x.avg > 0; });
      if (wk.length >= 5) {
        wk.sort(function (x, y) { return y.avg - x.avg; });
        var bw = wk[0], ww = wk[wk.length - 1];
        out.push({
          type: "info", icon: "cal", pri: 6, title: "Siku bora na dhaifu",
          text: "Siku bora ni " + U.DAYS[(bw.idx + 1) % 7] + " (wastani " + money(bw.avg) + "), dhaifu ni " + U.DAYS[(ww.idx + 1) % 7] + " (" + money(ww.avg) + "). Jaribu ofa ndogo siku ya " + U.DAYS[(ww.idx + 1) % 7] + "."
        });
      }
    }

    // 4. Bidhaa 5 bora
    var bp = byProduct(data, r30.from, r30.to);
    if (bp.length >= 6) {
      var top5 = bp.slice(0, 5), sh = sum(top5.map(function (x) { return x.share; }));
      out.push({
        type: "info", icon: "star", pri: 4, title: "Bidhaa bora",
        text: "Bidhaa 5 bora zinaleta " + Math.round(sh * 100) + "% ya mauzo ya siku 30: " + top5.map(function (x) { return x.name; }).join(", ") + ". Usiziache zikaisha."
      });
      // 5. Faida ndogo
      var lowM = bp.filter(function (x) { return x.margin < 0.1 && x.share >= 0.02 && !x.est; });
      if (lowM.length) {
        out.push({
          type: "warn", icon: "pct", pri: 2, title: "Faida ndogo",
          text: "Bidhaa hizi zinauzwa kwa faida chini ya 10%: " + lowM.slice(0, 4).map(function (x) { return x.name + " (" + Math.round(x.margin * 100) + "%)"; }).join(", ") + ". Pandisha bei kidogo au tafuta bei nafuu ya kununua."
        });
      }
      var bm = bp.filter(function (x) { return x.rev > 0 && x.count >= 5 && !x.est; }).sort(function (a, b) { return b.profit - a.profit; })[0];
      if (bm) out.push({ type: "good", icon: "coin", pri: 5, title: "Bidhaa inayoleta faida zaidi", text: bm.name + " imeleta faida ya " + money(bm.profit) + " (siku 30), faida " + Math.round(bm.margin * 100) + "% ya mauzo yake." });
    }

    // 6. Stoo
    var info = stockInfo(data, now, 28, cfg.leadDays == null ? 7 : cfg.leadDays);
    var out0 = info.filter(function (x) { return x.status === "out" && x.daily > 0; });
    var low = info.filter(function (x) { return x.status === "low" && isFinite(x.daysLeft); }).sort(function (a, b) { return a.daysLeft - b.daysLeft; });
    if (out0.length) out.push({ type: "bad", icon: "box", pri: 0, title: "Bidhaa zimeisha", text: out0.slice(0, 5).map(function (x) { return x.product.name; }).join(", ") + (out0.length > 5 ? " na nyingine " + (out0.length - 5) : "") + " zimeisha, na zilikuwa zinauzwa. Ziagize leo." });
    if (low.length) {
      var x0 = low[0];
      out.push({ type: "warn", icon: "box", pri: 1, title: "Stoo inaisha", text: x0.product.name + " itaisha ndani ya siku " + Math.max(0, Math.round(x0.daysLeft)) + " (zimebaki " + U.int(x0.product.stock) + ", zinauzwa " + x0.daily.toFixed(1) + " kwa siku)." + (low.length > 1 ? " Pia: " + low.slice(1, 4).map(function (x) { return x.product.name; }).join(", ") + "." : "") });
    }
    var dead = deadStock(info, now, 30);
    if (dead.length) {
      out.push({ type: "warn", icon: "lock", pri: 3, title: "Mtaji uliokwama", text: "Bidhaa " + dead.length + " hazijauzwa kwa siku 30 au zaidi; mtaji wa " + money(sum(dead.map(function (x) { return x.capital; }))) + " umekaa (mfano " + dead.slice(0, 3).map(function (x) { return x.product.name; }).join(", ") + "). Punguza bei au acha kuagiza." });
    }

    // 7. Madeni
    var cr = credits(data, now);
    if (cr.length) {
      var owed = sum(cr.map(function (c) { return c.owed; }));
      var s30 = summary(data, r30.from, r30.to).sales;
      var old = cr.slice().sort(function (a, b) { return b.ageDays - a.ageDays; })[0];
      var overdue = cr.filter(function (c) { return c.ageDays > 30; }).length;
      out.push({
        type: overdue ? "warn" : "info", icon: "book", pri: overdue ? 1 : 4, title: "Madeni ya wateja",
        text: "Wateja " + cr.length + " wanadaiwa jumla " + money(owed) + (s30 ? " (" + Math.round(owed / s30 * 100) + "% ya mauzo ya siku 30)" : "") + ". Deni kongwe: " + old.name + ", siku " + old.ageDays + "." + (overdue ? " Wateja " + overdue + " wamezidi siku 30; wakumbushe." : "")
      });
    }

    // 8. Matumizi na faida halisi (mwezi huu)
    var m0 = U.startOf(now, "month"), ms = summary(data, m0, now + 1);
    if (ms.expenses > 0 && ms.gross > 0) {
      var ratio = ms.expenses / ms.gross;
      out.push({
        type: ms.net < 0 ? "bad" : (ratio > 0.7 ? "warn" : "info"), icon: "wallet", pri: ms.net < 0 ? 0 : 3,
        title: ms.net < 0 ? "Faida halisi ni hasi" : "Matumizi ya mwezi",
        text: "Mwezi huu: faida ya jumla " + money(ms.gross) + ", matumizi " + money(ms.expenses) + " (" + Math.round(ratio * 100) + "% ya faida), faida halisi " + money(ms.net) + "." + (ms.net < 0 ? " Punguza matumizi au ongeza bei." : "")
      });
    }

    // 9. Ubora wa data
    var s30s = summary(data, r30.from, r30.to);
    if (s30s.sales > 0 && s30s.estShare > 0.3) {
      out.push({ type: "info", icon: "i", pri: 7, title: "Boresha data", text: Math.round(s30s.estShare * 100) + "% ya mauzo yamerekodiwa kwa haraka bila bidhaa, kwa hiyo faida ni makadirio. Tumia 'Uza' kwa bidhaa ili uchambuzi uwe sahihi." });
    }

    out.sort(function (a, b) { return (a.pri == null ? 9 : a.pri) - (b.pri == null ? 9 : b.pri); });
    return out;
  }

  var BI = {
    calc: calc, isCredit: isCredit, outstanding: outstanding, deposit: deposit, paidLater: paidLater,
    summary: summary, series: series, autoUnit: autoUnit, DRILL: DRILL,
    byProduct: byProduct, byCategory: byCategory, payMix: payMix, expensesByCat: expensesByCat,
    timeProfile: timeProfile, stockInfo: stockInfo, deadStock: deadStock, inventoryValue: inventoryValue,
    credits: credits, allocate: allocate, custKey: custKey, forecast: forecast,
    todayVsYesterday: todayVsYesterday, monthPace: monthPace, insights: insights
  };
  if (typeof module !== "undefined" && module.exports) module.exports = BI;
  root.BI = BI;
})(typeof window !== "undefined" ? window : globalThis);
