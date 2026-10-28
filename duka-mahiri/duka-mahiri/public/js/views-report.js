/* views-report.js: Ripoti za akili ya biashara (BI): mauzo, bidhaa, saa na siku, pesa, makadirio. */
(function () {
  "use strict";
  var U = window.U, BI = window.BI, App = window.App, Charts = window.Charts;
  var esc = U.esc, money = U.money, mny = function (n) { return App.mny(n); };

  var rep = App.ui.rep = { range: "siku30", cFrom: "", cTo: "", tab: "mauzo", unit: "auto", drill: [], sort: "rev" };
  var PRESETS = [["leo", "Leo"], ["jana", "Jana"], ["siku7", "Siku 7"], ["siku30", "Siku 30"], ["wiki", "Wiki hii"], ["mwezi", "Mwezi huu"], ["mwezijana", "Mwezi uliopita"], ["robo", "Robo hii"], ["mwaka", "Mwaka huu"], ["yote", "Yote"], ["maalum", "Maalum"]];
  var UNITS = [["auto", "Otomatiki"], ["hour", "Saa"], ["day", "Siku"], ["week", "Wiki"], ["month", "Mwezi"], ["quarter", "Robo"], ["year", "Mwaka"]];
  var TABS = [["mauzo", "Mauzo"], ["bidhaa", "Bidhaa"], ["saa", "Saa na siku"], ["pesa", "Pesa"], ["mbele", "Mbele"]];

  function baseRange() {
    var d = App.data(), now = App.now();
    if (rep.range === "maalum") {
      var f = U.parseDate(rep.cFrom), t = U.parseDate(rep.cTo);
      if (!isFinite(f)) f = U.addDays(U.startOf(now, "day"), -29);
      if (!isFinite(t)) t = U.startOf(now, "day");
      if (t < f) { var x = f; f = t; t = x; }
      return { from: f, to: U.addDays(t, 1), label: "Maalum" };
    }
    var minTs = d.sales.reduce(function (m, s) { return Math.min(m, s.ts); }, now);
    return U.presetRange(rep.range, now, minTs);
  }
  function curRange() {
    var b = baseRange();
    if (rep.drill.length) { var t = rep.drill[rep.drill.length - 1]; return { from: t.from, to: t.to, label: t.label }; }
    return b;
  }
  function curUnit(r) {
    if (rep.drill.length) return rep.drill[rep.drill.length - 1].unit;
    return rep.unit === "auto" ? BI.autoUnit(r.from, r.to) : rep.unit;
  }
  function prevRange(r) { var len = r.to - r.from; return { from: r.from - len, to: r.from }; }
  function memo(name, r, fn) { return App.memo(name + ":" + r.from + ":" + r.to + ":" + (rep.sort || ""), fn); }

  function table(head, rows, foot, tapAttr) {
    return '<div class="tscroll"><table class="tbl"><thead><tr>' + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.join("") + "</tbody>" + (foot ? "<tfoot><tr>" + foot.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr></tfoot>" : "") + "</table></div>";
  }

  /* ---------- Sehemu ya juu: vipindi na tabo ---------- */
  function header(r) {
    var h = '<div class="chips noprint">' + PRESETS.map(function (p) { return '<button class="chip ' + (rep.range === p[0] ? "on" : "") + '" data-act="repRange" data-r="' + p[0] + '">' + p[1] + "</button>"; }).join("") + "</div>";
    if (rep.range === "maalum") {
      var b = baseRange();
      h += '<div class="grid2 noprint" style="margin-bottom:10px"><label class="fld" style="margin:0"><span>Kuanzia</span><input type="date" data-chg="repCustom" id="rFrom" value="' + U.dateValue(b.from) + '"></label><label class="fld" style="margin:0"><span>Hadi</span><input type="date" data-chg="repCustom" id="rTo" value="' + U.dateValue(b.to - 1) + '"></label></div>';
    }
    h += '<div class="seg noprint">' + TABS.map(function (t) { return '<button class="' + (rep.tab === t[0] ? "on" : "") + '" data-act="repTab" data-t="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>";
    var span = U.fmtDate(r.from) + " – " + U.fmtDate(r.to - 1);
    h += '<div class="sub" style="margin:-2px 2px 10px">' + esc(span) + " · " + App.shop().name.replace(/</g, "") + "</div>";
    return h;
  }

  /* ---------- Tabo: Mauzo ---------- */
  function tabMauzo(r) {
    var d = App.data(), unit = curUnit(r), s = memo("sum", r, function () { return BI.summary(d, r.from, r.to); });
    var pr = prevRange(r), ps = memo("psum", pr, function () { return BI.summary(d, pr.from, pr.to); });
    var h = '<div class="kpis">' +
      App.kpi("Mauzo", mny(s.sales), App.deltaHtml(s.sales, ps.sales, "kipindi kilichotangulia"), "hero") +
      App.kpi("Faida ya jumla", mny(s.gross), App.deltaHtml(s.gross, ps.gross, "kilichotangulia") + '<div class="d">Faida ' + Math.round(s.margin * 100) + "% ya mauzo</div>") +
      App.kpi("Matumizi", mny(s.expenses), App.deltaHtml(s.expenses, ps.expenses, "kilichotangulia", true)) +
      App.kpi("Faida halisi", '<span class="' + (s.net < 0 ? "neg" : "") + '">' + mny(s.net) + "</span>", App.deltaHtml(s.net, ps.net, "kilichotangulia")) +
      App.kpi("Risiti", U.int(s.count), App.deltaHtml(s.count, ps.count, "kilichotangulia")) +
      App.kpi("Wastani wa risiti", mny(s.avgBasket), App.deltaHtml(s.avgBasket, ps.avgBasket, "kilichotangulia")) +
      App.kpi("Pesa zilizopokelewa", mny(s.received), '<div class="d">Mauzo ya mkopo: ' + mny(s.creditSales) + "</div>") +
      App.kpi("Gharama ya bidhaa", mny(s.cost), "") + "</div>";
    if (s.estShare > 0.05) h += '<div class="banner info noprint">' + Math.round(s.estShare * 100) + "% ya mauzo ni ya haraka bila bidhaa, kwa hiyo faida yake ni makadirio.</div>";

    var ser = memo("ser" + unit, r, function () { return BI.series(d, r.from, r.to, unit); });
    var rows = ser.map(function (b) { return { key: String(b.start), label: b.label, short: shortLabel(b, unit), v: b.sales, v2: b.profit }; });
    var crumbs = "";
    if (rep.drill.length) {
      var b = baseRange();
      crumbs = '<div class="crumbs noprint"><button data-act="repDrillTo" data-i="-1">' + esc(b.label) + "</button>" + rep.drill.map(function (t, i) {
        return "›" + '<button data-act="repDrillTo" data-i="' + i + '">' + esc(t.label) + "</button>";
      }).join("") + "</div>";
    }
    var unitChips = rep.drill.length ? "" : '<div class="chips noprint">' + UNITS.map(function (u) { return '<button class="chip ' + (rep.unit === u[0] ? "on" : "") + '" data-act="repUnit" data-u="' + u[0] + '">' + u[1] + "</button>"; }).join("") + "</div>";
    h += '<div class="card"><div class="card-h"><h2>Mauzo na faida kwa ' + ({ hour: "saa", day: "siku", week: "wiki", month: "mwezi", quarter: "robo", year: "mwaka" }[unit]) + '</h2></div>' + crumbs + unitChips +
      '<div class="legend"><span><i style="background:var(--primary)"></i>Mauzo</span><span><i style="background:var(--accent)"></i>Faida ya jumla</span></div>' +
      Charts.bars(rows, { act: "repDrill", aria: "Mauzo na faida" }) +
      '<p class="sub noprint" style="margin:6px 0 0">' + (unit === "hour" && rep.drill.length ? "Risiti za saa hii zipo chini." : "Bonyeza nguzo au safu ya jedwali kuchimba kwa undani zaidi (mwaka → mwezi → siku → saa → risiti).") + "</p></div>";

    var nz = ser.filter(function (b) { return b.sales > 0 || b.count > 0; });
    var tot = nz.reduce(function (a, b) { a.s += b.sales; a.p += b.profit; a.c += b.count; return a; }, { s: 0, p: 0, c: 0 });
    h += '<div class="card"><div class="card-h"><h2>Jedwali</h2></div>' + table(["Muda", "Mauzo", "Faida", "Risiti"], nz.slice().reverse().map(function (b) {
      return '<tr class="tap" data-act="repDrill" data-key="' + b.start + '"><td>' + esc(b.label) + "</td><td>" + U.int(b.sales) + "</td><td>" + U.int(b.profit) + "</td><td>" + b.count + "</td></tr>";
    }), ["Jumla", U.int(tot.s), U.int(tot.p), tot.c]) + "</div>";

    // Risiti za kipindi (wakati wa kuchimba hadi siku/saa)
    if (rep.drill.length && (unit === "hour" || (r.to - r.from) <= 2 * U.DAY)) {
      var list = d.sales.filter(function (x) { return x.ts >= r.from && x.ts < r.to; }).sort(function (a, b) { return a.ts - b.ts; });
      h += '<div class="card"><div class="card-h"><h2>Risiti (' + list.length + ')</h2></div><div class="list">' + (list.map(App.saleRow).join("") || '<div class="empty">Hakuna risiti.</div>') + "</div></div>";
    }
    return h;
  }
  function shortLabel(b, unit) {
    var d = new Date(b.start);
    if (unit === "hour") return U.p2(d.getHours());
    if (unit === "day") return d.getDate() + " " + U.MONTHS_S[d.getMonth()];
    if (unit === "week") return d.getDate() + " " + U.MONTHS_S[d.getMonth()];
    if (unit === "month") return U.MONTHS_S[d.getMonth()] + (d.getMonth() === 0 ? " " + String(d.getFullYear()).slice(2) : "");
    return b.label;
  }

  /* ---------- Tabo: Bidhaa ---------- */
  function tabBidhaa(r) {
    var d = App.data(), now = App.now(), set = App.settings();
    var prods = memo("prods", r, function () { return BI.byProduct(d, r.from, r.to); });
    var pr = prevRange(r), prevMap = {};
    memo("pprods", pr, function () { return BI.byProduct(d, pr.from, pr.to); }).forEach(function (p) { prevMap[p.key] = p; });
    var sortKey = rep.sort, arr = prods.slice().sort(function (a, b) { return b[sortKey] - a[sortKey]; });
    var h = '<div class="seg noprint"><button class="' + (sortKey === "rev" ? "on" : "") + '" data-act="repSort" data-s="rev">Kwa mauzo</button><button class="' + (sortKey === "profit" ? "on" : "") + '" data-act="repSort" data-s="profit">Kwa faida</button><button class="' + (sortKey === "qty" ? "on" : "") + '" data-act="repSort" data-s="qty">Kwa idadi</button></div>';
    var items = arr.slice(0, 15).map(function (p) {
      var pv = prevMap[p.key], dl = pv ? U.delta(p.rev, pv.rev) : null;
      var main = sortKey === "qty" ? U.int(p.qty) : (sortKey === "profit" ? p.profit : p.rev);
      return {
        name: p.name, v: main, val: sortKey === "qty" ? U.int(p.qty) : money(main), badge: p.abc, badgeCls: p.abc === "A" ? "good" : (p.abc === "B" ? "info" : ""),
        sub: "Mauzo " + money(p.rev) + " · faida " + money(p.profit) + " (" + Math.round(p.margin * 100) + "%) · idadi " + U.int(p.qty) + (dl != null && Math.abs(dl) >= 0.05 ? " · " + (dl > 0 ? "▲" : "▼") + Math.round(Math.abs(dl) * 100) + "%" : "") + (p.est ? " · makadirio" : ""),
        cls: p.margin < 0.1 ? "bad" : ""
      };
    });
    h += '<div class="card"><div class="card-h"><h2>Bidhaa bora (' + Math.min(15, arr.length) + " kati ya " + arr.length + ')</h2></div>' + Charts.hbars(items) +
      '<p class="sub" style="margin:10px 0 0"><b>A</b> = bidhaa zinazounda 80% ya kwanza ya mauzo, <b>B</b> = hadi 95%, <b>C</b> = iliyobaki. Mstari mwekundu = faida chini ya 10%.</p></div>';
    var ab = { A: 0, B: 0, C: 0 }; prods.forEach(function (p) { ab[p.abc]++; });
    if (prods.length) h += '<div class="kpis"><div class="kpi"><div class="l">Bidhaa A</div><div class="v">' + ab.A + '</div><div class="d">zinaleta 80% ya mauzo</div></div><div class="kpi"><div class="l">B / C</div><div class="v">' + ab.B + " / " + ab.C + '</div><div class="d">zilizobaki</div></div></div>';
    var cats = memo("cats", r, function () { return BI.byCategory(d, r.from, r.to); });
    h += '<div class="card"><div class="card-h"><h2>Kwa aina ya bidhaa</h2></div>' + Charts.hbars(cats.map(function (c) { return { name: c.name, v: c.rev, val: money(c.rev), sub: Math.round(c.share * 100) + "% ya mauzo · faida " + Math.round(c.margin * 100) + "%", cls: "info" }; })) + "</div>";

    var info = App.memo("sinfo-rep", function () { return BI.stockInfo(d, now, 28, set.leadDays); });
    var need = info.filter(function (x) { return x.status !== "ok" && (x.daily > 0 || x.status === "out"); }).sort(function (a, b) { return a.daysLeft - b.daysLeft; });
    h += '<div class="card"><div class="card-h"><h2>Za kuagiza sasa</h2></div><div class="list">' + (need.slice(0, 10).map(function (x) {
      return '<div class="li"><div class="main"><div class="t">' + esc(x.product.name) + '</div><div class="s">' + (x.status === "out" ? "Imeisha" : "Zimebaki " + U.int(x.product.stock) + " · ~siku " + Math.max(0, Math.round(x.daysLeft))) + " · inauzwa " + x.daily.toFixed(1) + "/siku" + (x.suggest ? " · agiza ~" + U.int(x.suggest) : "") + '</div></div><button class="btn sm noprint" data-act="restock" data-id="' + x.product.id + '">Ongeza</button></div>';
    }).join("") || '<div class="empty">Hakuna bidhaa zinazohitaji kuagizwa.</div>') + "</div></div>";

    var dead = BI.deadStock(info, now, 30);
    h += '<div class="card"><div class="card-h"><h2>Hazijauzwa siku 30+</h2><span class="sub">Mtaji: ' + money(dead.reduce(function (a, x) { return a + x.capital; }, 0)) + '</span></div><div class="list">' + (dead.slice(0, 10).map(function (x) {
      return '<div class="li"><div class="main"><div class="t">' + esc(x.product.name) + '</div><div class="s">Stoo ' + U.int(x.product.stock) + " · " + (x.lastSale ? "iliuzwa mwisho " + U.fmtDate(x.lastSale) : "haijawahi kuuzwa") + '</div></div><div class="amt num">' + money(x.capital) + "</div></div>";
    }).join("") || '<div class="empty">Hakuna. Bidhaa zote zinauzwa.</div>') + "</div></div>";
    return h;
  }

  /* ---------- Tabo: Saa na siku ---------- */
  function tabSaa(r) {
    var d = App.data(), now = App.now();
    var tp = memo("tp", r, function () { return BI.timeProfile(d, r.from, r.to, now); });
    var hrs = tp.hours.slice(5, 23).map(function (x) { return { key: x.hour, label: U.p2(x.hour) + ":00", short: String(x.hour), v: x.avg }; });
    var names = ["Jtatu", "Jnne", "Jtano", "Alh", "Ijum", "Jmosi", "Jpili"], full = ["Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi", "Jumapili"];
    var wk = tp.weekdays.map(function (x) { return { key: x.idx, label: full[x.idx], short: names[x.idx], v: x.avg }; });
    var tot = tp.hours.reduce(function (a, x) { return a + x.sales; }, 0);
    var h = "";
    if (!tot) return '<div class="card"><div class="empty">Hakuna mauzo kwenye kipindi hiki.</div></div>';
    var bestH = tp.hours.slice().sort(function (a, b) { return b.sales - a.sales; })[0];
    var bestW = tp.weekdays.filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.avg - a.avg; })[0];
    var worstW = tp.weekdays.filter(function (x) { return x.n > 0; }).sort(function (a, b) { return a.avg - b.avg; })[0];
    h += '<div class="kpis"><div class="kpi"><div class="l">Saa ya mauzo mengi</div><div class="v">' + U.p2(bestH.hour) + ":00</div><div class=\"d\">" + Math.round(bestH.sales / tot * 100) + "% ya mauzo</div></div>" +
      (bestW ? '<div class="kpi"><div class="l">Siku bora</div><div class="v">' + full[bestW.idx] + '</div><div class="d">Wastani ' + mny(bestW.avg) + "</div></div>" : "") +
      (worstW && worstW !== bestW ? '<div class="kpi"><div class="l">Siku dhaifu</div><div class="v">' + full[worstW.idx] + '</div><div class="d">Wastani ' + mny(worstW.avg) + "</div></div>" : "") + "</div>";
    h += '<div class="card"><div class="card-h"><h2>Wastani wa mauzo kwa saa</h2><span class="sub">kwa siku</span></div>' + Charts.bars(hrs, { h: 190, maxLabels: 9, aria: "Mauzo kwa saa" }) + "</div>";
    h += '<div class="card"><div class="card-h"><h2>Wastani wa mauzo kwa siku ya wiki</h2></div>' + Charts.bars(wk, { h: 190, maxLabels: 7, aria: "Mauzo kwa siku ya wiki" }) + "</div>";
    h += '<div class="card"><div class="card-h"><h2>Ramani ya joto</h2><span class="sub">giza = mauzo mengi</span></div>' + Charts.heat(tp.heat) + '<p class="sub" style="margin:10px 0 0">Tumia ramani hii kupanga zamu, kuagiza bidhaa kabla ya saa za kilele, na kuweka ofa kwenye saa tulivu.</p></div>';
    return h;
  }

  /* ---------- Tabo: Pesa ---------- */
  function tabPesa(r) {
    var d = App.data(), now = App.now();
    var s = memo("sum", r, function () { return BI.summary(d, r.from, r.to); });
    var mix = memo("mix", r, function () { return BI.payMix(d, r.from, r.to); });
    var ex = memo("ex", r, function () { return BI.expensesByCat(d, r.from, r.to); });
    var owed = BI.credits(d, now).reduce(function (a, c) { return a + c.owed; }, 0);
    var kv = function (a, b, cls) { return '<div class="kv"><span>' + a + '</span><b class="' + (cls || "") + '">' + b + "</b></div>"; };
    var h = '<div class="card"><div class="card-h"><h2>Faida na hasara</h2></div>' + kv("Mauzo", money(s.sales)) + kv("Gharama ya bidhaa", "− " + money(s.cost)) +
      kv("Faida ya jumla (" + Math.round(s.margin * 100) + "%)", money(s.gross), s.gross < 0 ? "neg" : "pos") + kv("Matumizi", "− " + money(s.expenses)) +
      '<div class="kv tot"><span>Faida halisi</span><b class="' + (s.net < 0 ? "neg" : "pos") + '">' + money(s.net) + "</b></div></div>";
    h += '<div class="card"><div class="card-h"><h2>Mtiririko wa pesa</h2></div>' + kv("Pesa zilizopokelewa", money(s.received)) + kv("Mauzo ya mkopo (hayajapokelewa)", money(s.creditSales)) + kv("Madeni yote yaliyopo sasa", money(owed), owed ? "neg" : "") +
      kv("Thamani ya stoo", money(BI.inventoryValue(d.products))) + "</div>";
    h += '<div class="card"><div class="card-h"><h2>Njia za malipo</h2></div>' + Charts.hbars(mix.map(function (m) { return { name: App.methodNames[m.method] || m.method, v: m.total, val: money(m.total), sub: Math.round(m.share * 100) + "%", cls: m.method === "mkopo" ? "bad" : "info" }; })) + "</div>";
    h += '<div class="card"><div class="card-h"><h2>Matumizi kwa aina</h2></div>' + Charts.hbars(ex.map(function (e) { return { name: e.name, v: e.total, val: money(e.total), sub: Math.round(e.share * 100) + "%", cls: "accent" }; })) + "</div>";
    // Miezi 6 ya mwisho
    var m0 = U.startOf(now, "month"), rows = [];
    for (var k = 5; k >= 0; k--) {
      var f = U.addMonths(m0, -k), t = U.next(f, "month"), x = BI.summary(d, f, t);
      rows.push('<tr><td>' + U.MONTHS_S[new Date(f).getMonth()] + " " + new Date(f).getFullYear() + "</td><td>" + U.int(x.sales) + "</td><td>" + U.int(x.gross) + "</td><td>" + U.int(x.expenses) + '</td><td class="' + (x.net < 0 ? "neg" : "") + '">' + U.int(x.net) + "</td></tr>");
    }
    h += '<div class="card"><div class="card-h"><h2>Miezi 6 ya mwisho</h2></div>' + table(["Mwezi", "Mauzo", "Faida", "Matumizi", "Halisi"], rows.reverse()) + "</div>";
    return h;
  }

  /* ---------- Tabo: Mbele (makadirio na ushauri) ---------- */
  function tabMbele() {
    var d = App.data(), now = App.now();
    var fc = App.memo("fc", function () { return BI.forecast(d, now, 7); });
    var h = "";
    if (fc) {
      var rows = fc.days.map(function (x) { var dt = new Date(x.ts); return { key: x.ts, label: x.label, short: U.DAYS_S[dt.getDay()] + " " + dt.getDate(), v: x.pred, low: x.low, high: x.high, cls: "fc" }; });
      h += '<div class="kpis"><div class="kpi hero"><div class="l">Mauzo yanayotarajiwa, siku 7 zijazo</div><div class="v">' + mny(fc.total) + '</div><div class="d">Wastani ' + mny(fc.total / 7) + " kwa siku</div></div></div>" +
        '<div class="card"><div class="card-h"><h2>Makadirio ya kila siku</h2></div>' + Charts.bars(rows, { h: 190, maxLabels: 7, aria: "Makadirio ya mauzo" }) +
        '<p class="sub" style="margin:8px 0 0">Mistari wima inaonyesha upana wa makadirio. Yanatokana na wastani wa siku 14 za mwisho na mwenendo wa kila siku ya wiki (siku ' + fc.basisDays + " za data). Ni makadirio ya kitakwimu, si ahadi.</p></div>";
    } else {
      h += '<div class="card"><div class="empty">Makadirio yanahitaji angalau siku 14 za mauzo. Endelea kurekodi.</div></div>';
    }
    h += '<div class="card"><div class="card-h"><h2>Taarifa zote za akili</h2></div>' + App.insightHtml(BI.insights(d, now, App.settings())) + "</div>";
    return h;
  }

  App.views.ripoti = {
    title: "Ripoti",
    render: function () {
      var r = curRange(), base = baseRange();
      var h = header(rep.tab === "mbele" ? base : r);
      if (rep.tab === "mauzo") h += tabMauzo(r);
      else if (rep.tab === "bidhaa") h += tabBidhaa(base);
      else if (rep.tab === "saa") h += tabSaa(base);
      else if (rep.tab === "pesa") h += tabPesa(base);
      else h += tabMbele();
      return h + '<button class="btn block ghost noprint" style="margin-top:6px" data-act="printReport2">Chapisha / hifadhi PDF</button>';
    }
  };

  App.acts.repRange = function (el) { rep.range = el.getAttribute("data-r"); rep.drill = []; App.render(); };
  App.acts.repTab = function (el) { rep.tab = el.getAttribute("data-t"); App.render(); };
  App.acts.repUnit = function (el) { rep.unit = el.getAttribute("data-u"); rep.drill = []; App.render(); };
  App.acts.repSort = function (el) { rep.sort = el.getAttribute("data-s"); App.render(); };
  App.chg.repCustom = function () { rep.cFrom = App.$("rFrom").value; rep.cTo = App.$("rTo").value; rep.drill = []; App.render(); };
  App.acts.repDrill = function (el) {
    var key = +el.getAttribute("data-key"), r = curRange(), unit = curUnit(r);
    if (!isFinite(key)) return;
    if (unit === "hour" && rep.drill.length) return;
    var from = key, to = U.next(key, unit), next = BI.DRILL[unit] || "hour";
    // Mwezi/wiki/siku/saa: chimba hadi kipimo kidogo
    rep.drill.push({ from: Math.max(from, r.from), to: Math.min(to, r.to), unit: unit === "hour" ? "hour" : next, label: U.label(from, unit) });
    App.render(); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  App.acts.repDrillTo = function (el) { var i = +el.getAttribute("data-i"); rep.drill = rep.drill.slice(0, i + 1); App.render(); };
  App.acts.printReport2 = function () { window.print(); };
})();
