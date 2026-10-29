/* views-main.js: skrini kuu: Leo (dashibodi), Uza (mauzo), Stoo (bidhaa). */
(function () {
  "use strict";
  var U = window.U, BI = window.BI, App = window.App, Store = window.Store, Charts = window.Charts;
  var esc = U.esc, money = U.money;

  function mny(n) { return Math.abs(n) >= 1e8 ? "TSh " + U.compact(n) : money(n); }
  App.mny = mny;

  // Badiliko dhidi ya kipindi cha kulinganisha. invert=true: ongezeko ni baya (matumizi)
  function deltaHtml(cur, prev, label, invert) {
    var d = U.delta(cur, prev);
    if (d == null) return label ? '<div class="d">' + esc(label) + ": hakuna msingi</div>" : "";
    if (Math.abs(d) < 0.005) return '<div class="d">Sawa na ' + esc(label || "kipindi kilichopita") + "</div>";
    var up = d > 0, good = invert ? !up : up;
    return '<div class="d ' + (good ? "pos" : "neg") + '">' + (up ? "▲ " : "▼ ") + Math.round(Math.abs(d) * 100) + "% " + (up ? "juu" : "chini") + " ya " + esc(label || "kipindi kilichopita") + "</div>";
  }
  App.deltaHtml = deltaHtml;
  function kpi(label, val, extra, cls) {
    return '<div class="kpi ' + (cls || "") + '"><div class="l">' + esc(label) + '</div><div class="v num">' + val + "</div>" + (extra || "") + "</div>";
  }
  App.kpi = kpi;

  function insightHtml(list) {
    return list.map(function (i) {
      var ic = { up: "↗", down: "↘", clock: "◷", cal: "▦", star: "★", pct: "%", coin: "$", box: "▣", lock: "⌛", book: "☰", wallet: "◈", i: "i" }[i.icon] || "i";
      return '<div class="ins ' + esc(i.type) + '"><div class="ic">' + ic + "</div><div><h3>" + esc(i.title) + "</h3><p>" + esc(i.text) + "</p></div></div>";
    }).join("");
  }
  App.insightHtml = insightHtml;

  /* ================= LEO ================= */
  App.views.leo = {
    title: "Leo",
    render: function () {
      var d = App.data(), now = App.now(), set = App.settings();
      var parts = [];
      if (Store.meta("demo", false)) {
        parts.push('<div class="banner"><span>Hii ni <b>data ya mfano</b>, si ya duka lako.</span><button class="btn sm" data-act="clearDemo">Futa na uanze</button></div>');
      }
      var lastB = Store.meta("lastBackup", 0);
      if (!Store.meta("demo", false) && d.sales.length > 20 && now - lastB > 7 * U.DAY) {
        parts.push('<div class="banner info"><span>Hifadhi nakala ya data yako ili usipoteze rekodi.</span><button class="btn sm" data-act="go" data-to="data">Hifadhi</button></div>');
      }
      if (!d.products.length && !d.sales.length) {
        parts.push('<div class="card"><h2 style="margin-bottom:8px">Karibu Duka Mahiri</h2><p class="muted" style="margin:0 0 14px">Rekodi mauzo yako kila siku, kisha upate faida, bidhaa bora, saa za mauzo mengi, madeni na makadirio, vyote bila mtandao.</p>' +
          '<div class="list"><div class="li"><span class="badge info">1</span><div class="main"><div class="t">Ongeza bidhaa zako</div><div class="s">Jina, bei ya kununua, bei ya kuuza na stoo</div></div><button class="btn sm primary" data-act="newProduct">Ongeza</button></div>' +
          '<div class="li"><span class="badge info">2</span><div class="main"><div class="t">Rekodi mauzo</div><div class="s">Bonyeza bidhaa, chagua malipo, hifadhi</div></div><button class="btn sm" data-act="go" data-to="uza">Uza</button></div>' +
          '<div class="li"><span class="badge info">3</span><div class="main"><div class="t">Angalia ripoti</div><div class="s">Taarifa za akili huonekana baada ya siku chache</div></div></div></div>' +
          '<button class="btn block" style="margin-top:12px" data-act="loadDemo">Jaribu kwa data ya mfano</button></div>');
        return parts.join("");
      }

      var ty = BI.todayVsYesterday(d, now), t = ty.today, y = ty.yest;
      var mp = BI.monthPace(d, now);
      var cr = BI.credits(d, now), owed = cr.reduce(function (a, c) { return a + c.owed; }, 0);
      var sd = U.startOf(now, "day");
      var hrT = BI.series(d, sd, sd + U.DAY, "hour"), hrY = BI.series(d, sd - U.DAY, sd, "hour");
      var rows = [], h0 = 6, h1 = 22;
      for (var h = h0; h <= h1; h++) rows.push({ key: h, label: U.p2(h) + ":00", short: String(h), v: hrT[h].sales, ghost: hrY[h].sales, cls: h === new Date(now).getHours() ? "cur" : "" });

      parts.push('<div class="kpis">' +
        kpi("Mauzo ya leo", '<span>' + mny(t.sales) + "</span>", deltaHtml(t.sales, y.sales, "jana kufikia saa hii"), "hero") +
        kpi("Faida ya jumla", mny(t.gross), deltaHtml(t.gross, y.gross, "jana")) +
        kpi("Risiti", U.int(t.count), deltaHtml(t.count, y.count, "jana")) +
        kpi("Pesa zilizopokelewa", mny(t.received), '<div class="d">Taslimu na simu, pamoja na malipo ya madeni</div>') +
        kpi("Wastani wa risiti", mny(t.avgBasket), deltaHtml(t.avgBasket, y.avgBasket, "jana")) +
        kpi("Faida halisi, mwezi huu", '<span class="' + (mp.cur.net < 0 ? "neg" : "") + '">' + mny(mp.cur.net) + "</span>", deltaHtml(mp.cur.net, mp.prev.net, "kipindi kama hiki mwezi uliopita")) +
        kpi("Madeni ya wateja", mny(owed), '<div class="d">Wateja ' + cr.length + "</div>") +
        kpi("Thamani ya stoo", mny(BI.inventoryValue(d.products)), '<div class="d">Kwa bei ya kununua</div>') +
        "</div>");

      parts.push('<div class="card"><div class="card-h"><h2>Mauzo kwa saa, leo na jana</h2></div>' +
        '<div class="legend"><span><i style="background:var(--primary)"></i>Leo</span><span><i style="background:transparent;border:1.5px dashed var(--faint)"></i>Jana</span></div>' +
        Charts.bars(rows, { h: 170, maxLabels: 9, aria: "Mauzo kwa saa leo na jana" }) + "</div>");

      var ins = BI.insights(d, now, set).slice(0, 5);
      parts.push('<div class="card"><div class="card-h"><h2>Taarifa za akili</h2><button class="btn sm ghost" data-act="go" data-to="ripoti" data-tab2="mbele">Zote</button></div>' + insightHtml(ins) + "</div>");

      var info = BI.stockInfo(d, now, 28, set.leadDays).filter(function (x) { return x.status !== "ok" && (x.daily > 0 || x.status === "out"); })
        .sort(function (a, b) { return (a.status === "out" ? -1 : 0) - (b.status === "out" ? -1 : 0) || a.daysLeft - b.daysLeft; }).slice(0, 5);
      if (info.length) {
        parts.push('<div class="card"><div class="card-h"><h2>Bidhaa za kuagiza</h2><button class="btn sm ghost" data-act="go" data-to="stoo">Stoo</button></div><div class="list">' +
          info.map(function (x) {
            return '<div class="li"><div class="main"><div class="t">' + esc(x.product.name) + '</div><div class="s">' +
              (x.status === "out" ? "Imeisha" : "Zimebaki " + U.int(x.product.stock) + ", zitaisha ~siku " + Math.max(0, Math.round(x.daysLeft))) +
              (x.suggest ? " · agiza ~" + U.int(x.suggest) : "") + '</div></div><button class="btn sm" data-act="restock" data-id="' + x.product.id + '">Ongeza stoo</button></div>';
          }).join("") + "</div></div>");
      }

      parts.push('<div class="grid2 noprint"><button class="btn primary" data-act="go" data-to="uza">Rekodi mauzo</button><button class="btn" data-act="newExpense">Rekodi matumizi</button></div>' +
        '<button class="btn block ghost noprint" style="margin-top:8px" data-act="shareToday">Tuma muhtasari wa leo (WhatsApp)</button>');
      return parts.join("");
    }
  };
  App.acts.shareToday = function () {
    var d = App.data(), now = App.now(), sd = U.startOf(now, "day");
    var t = BI.summary(d, sd, now + 1), owed = BI.credits(d, now).reduce(function (a, c) { return a + c.owed; }, 0);
    var txt = "📊 " + App.shop().name + " · " + U.fmtDate(now) + "\n" +
      "Mauzo: " + money(t.sales) + "\nFaida ya jumla: " + money(t.gross) + "\nRisiti: " + t.count + "\nMatumizi: " + money(t.expenses) +
      "\nPesa zilizopokelewa: " + money(t.received) + "\nMadeni yaliyopo: " + money(owed);
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank", "noopener");
  };
  App.acts.loadDemo = function () {
    App.confirm("Pakia data ya mfano ya siku 120? Unaweza kuifuta baadaye ili uanze na data yako.", { ok: "Pakia" }).then(function (ok) {
      if (ok) App.loadDemo();
    });
  };
  App.loadDemo = function () {
    var data = Demo.generate(App.now(), 20261027);
    return Store.replaceAll(data, { demo: true }).then(function () { App.toast("Data ya mfano imepakiwa"); });
  };
  App.acts.clearDemo = function () {
    App.confirm("Futa data ya mfano yote na uanze na duka lako?", { ok: "Futa", danger: true }).then(function (ok) {
      if (ok) Store.clearAll(["shop", "settings"]).then(function () { Store.setMeta("demo", false); App.toast("Umeanza upya"); });
    });
  };

  /* ================= UZA (mauzo) ================= */
  var CART_KEY = "dm_cart";
  function emptyCart() { return { lines: [], method: "cash", customer: "", phone: "", deposit: "", when: "", mode: "items", q: { amount: "", cat: "", note: "", cost: "" } }; }
  function loadCart() { try { var c = JSON.parse(localStorage.getItem(CART_KEY)); if (c && c.lines) return Object.assign(emptyCart(), c); } catch (e) {} return emptyCart(); }
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(App.ui.cart)); } catch (e) {} }
  App.ui.cart = loadCart();
  App.ui.posQ = ""; App.ui.posCat = "";
  var cart = function () { return App.ui.cart; };

  function cartTotal() { return cart().lines.reduce(function (a, l) { return a + l.qty * l.price; }, 0); }
  function popularity() {
    return App.memo("pop", function () {
      var since = App.now() - 30 * U.DAY, m = {};
      App.data().sales.forEach(function (s) { if (s.ts >= since) s.lines.forEach(function (l) { if (l.pid) m[l.pid] = (m[l.pid] || 0) + l.qty; }); });
      return m;
    });
  }
  function categories() {
    var m = {};
    App.data().products.forEach(function (p) { if (p.cat) m[p.cat] = 1; });
    return Object.keys(m).sort();
  }
  function posGrid() {
    var pop = popularity(), q = App.ui.posQ.trim().toLowerCase(), c = App.ui.posCat;
    var list = App.data().products.filter(function (p) {
      return (!c || p.cat === c) && (!q || p.name.toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return (pop[b.id] || 0) - (pop[a.id] || 0) || a.name.localeCompare(b.name); });
    if (!list.length) return '<div class="empty">' + (App.data().products.length ? "Hakuna bidhaa inayolingana." : "Bado hujaongeza bidhaa.") + '<br><br><button class="btn sm primary" data-act="newProduct">Ongeza bidhaa</button></div>';
    var inCart = {};
    cart().lines.forEach(function (l) { if (l.pid) inCart[l.pid] = l.qty; });
    return '<div class="tiles">' + list.map(function (p) {
      var st = p.stock <= 0 ? '<span class="st out">Imeisha</span>' : (p.minStock && p.stock <= p.minStock ? '<span class="st low">Zimebaki ' + U.int(p.stock) + "</span>" : '<span class="st">Stoo ' + U.int(p.stock) + "</span>");
      return '<button type="button" class="tile' + (inCart[p.id] ? " in" : "") + '" data-act="addItem" data-id="' + p.id + '">' +
        (inCart[p.id] ? '<span class="q">' + inCart[p.id] + "</span>" : "") +
        '<span class="n">' + esc(p.name) + '</span><span class="p num">' + U.int(p.price) + "</span>" + st + "</button>";
    }).join("") + "</div>";
  }
  function cartBar() {
    var c = cart();
    if (App.route !== "uza" || App.ui.posMode === "quick" || !c.lines.length) return "";
    var n = c.lines.reduce(function (a, l) { return a + l.qty; }, 0);
    return '<div class="cartbar" id="cartbar" style="display:flex;gap:8px"><button class="btn" style="flex:0 0 34%;box-shadow:none" data-act="openCart"><span>Kapu · ' + U.int(n) + '</span></button><button class="btn primary" style="flex:1" data-act="payNow"><span>Pokea taslimu</span><span class="num">' + money(cartTotal()) + "</span></button></div>";
  }
  function refreshPos() {
    var g = App.$("posGrid"); if (g) g.innerHTML = posGrid();
    var old = App.$("cartbar"); if (old) old.remove();
    var h = cartBar(); if (h) document.body.insertAdjacentHTML("beforeend", h);
  }

  App.views.uza = {
    title: "Uza",
    render: function () {
      var mode = App.ui.posMode || "items", c = cart();
      var h = '<div class="seg"><button class="' + (mode === "items" ? "on" : "") + '" data-act="posMode" data-m="items">Chagua bidhaa</button><button class="' + (mode === "quick" ? "on" : "") + '" data-act="posMode" data-m="quick">Mauzo ya haraka</button></div>';
      if (mode === "items") {
        h += '<div class="search"><input type="search" id="posSearch" data-in="posSearch" placeholder="Tafuta bidhaa..." value="' + esc(App.ui.posQ) + '" autocomplete="off"></div>';
        var cats = categories();
        if (cats.length > 1) h += '<div class="chips"><button class="chip ' + (!App.ui.posCat ? "on" : "") + '" data-act="posCat" data-c="">Zote</button>' + cats.map(function (x) { return '<button class="chip ' + (App.ui.posCat === x ? "on" : "") + '" data-act="posCat" data-c="' + esc(x) + '">' + esc(x) + "</button>"; }).join("") + "</div>";
        h += '<div id="posGrid">' + posGrid() + "</div>";
      } else {
        h += quickForm();
      }
      h += todaySales();
      return h;
    },
    after: function () {
      var old = App.$("cartbar"); if (old) old.remove();
      var h = cartBar(); if (h) document.body.insertAdjacentHTML("beforeend", h);
    },
    leave: function () { var old = App.$("cartbar"); if (old) old.remove(); }
  };
  function todaySales() {
    var sd = U.startOf(App.now(), "day");
    var list = App.data().sales.filter(function (s) { return s.ts >= sd; }).sort(function (a, b) { return b.ts - a.ts; });
    var tot = list.reduce(function (a, s) { return a + BI.calc(s).total; }, 0);
    return '<div class="sec-title">Mauzo ya leo · ' + list.length + " · " + money(tot) + '</div><div class="card flat"><div class="list">' +
      (list.slice(0, 6).map(saleRow).join("") || '<div class="empty">Bado hakuna mauzo leo.</div>') + "</div>" +
      (list.length > 6 ? '<button class="btn block ghost sm" data-act="go" data-to="mauzo">Ona yote</button>' : "") + "</div>";
  }
  function saleRow(s) {
    var c = BI.calc(s), first = s.lines[0] ? s.lines[0].name : "-";
    var more = s.lines.length > 1 ? " +" + (s.lines.length - 1) : "";
    var m = s.pay && s.pay.method || "cash";
    return '<button type="button" class="li tap" data-act="showSale" data-id="' + s.id + '"><div class="main"><div class="t">' + esc(first) + esc(more) + '</div><div class="s">' + U.fmtDT(s.ts) + " · " + esc(App.methodShort[m] || m) + (s.customer ? " · " + esc(s.customer) : "") + '</div></div><div class="amt num">' + money(c.total) + "</div></button>";
  }
  App.saleRow = saleRow;

  App.acts.posMode = function (el) { App.ui.posMode = el.getAttribute("data-m"); App.render(); };
  App.acts.posCat = function (el) { App.ui.posCat = el.getAttribute("data-c"); App.render(); };
  App.ins.posSearch = function (el) { App.ui.posQ = el.value; var g = App.$("posGrid"); if (g) g.innerHTML = posGrid(); };
  App.acts.addItem = function (el) {
    var p = App.data().products.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0];
    if (!p) return;
    var c = cart(), l = c.lines.filter(function (x) { return x.pid === p.id; })[0];
    if (l) l.qty += 1; else c.lines.push({ pid: p.id, name: p.name, cat: p.cat || "Nyingine", qty: 1, price: p.price, cost: p.cost || 0 });
    saveCart(); refreshPos();
  };

  /* ----- Kapu ----- */
  var methods = ["cash", "mpesa", "airtel", "tigo", "halotel", "mkopo"];
  function payChips(sel, act) {
    return '<div class="pay-chips">' + methods.map(function (m) { return '<button type="button" class="chip ' + (sel === m ? "on" : "") + '" data-act="' + act + '" data-m="' + m + '">' + esc(App.methodNames[m]) + "</button>"; }).join("") + "</div>";
  }
  function creditFields() {
    var c = cart(), custs = BI.credits(App.data(), App.now()).map(function (x) { return x.name; });
    App.data().sales.forEach(function (s) { if (s.customer && custs.indexOf(s.customer) < 0) custs.push(s.customer); });
    return '<div class="card flat" style="background:var(--card2)">' +
      App.field("Jina la mteja (lazima)", '<input type="text" id="cCust" data-in="cCust" list="custList" value="' + esc(c.customer) + '" autocomplete="off" placeholder="Mfano: Mama Neema"><datalist id="custList">' + custs.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + "</datalist>") +
      App.field("Simu ya mteja (hiari)", '<input type="tel" id="cPhone" data-in="cPhone" value="' + esc(c.phone) + '" placeholder="07xxxxxxxx">') +
      App.field("Amelipa sasa (amana, hiari)", '<input type="number" inputmode="decimal" id="cDep" data-in="cDep" value="' + esc(c.deposit) + '" placeholder="0">') + "</div>";
  }
  function whenField() {
    var c = cart();
    return '<details style="margin-bottom:12px"><summary class="muted" style="cursor:pointer;font-size:.84rem;font-weight:700">Tarehe na saa (hiari, kwa mauzo ya zamani)</summary><div style="margin-top:8px"><input type="datetime-local" id="cWhen" data-in="cWhen" value="' + esc(c.when) + '"><small class="muted">Acha tupu kutumia saa ya sasa.</small></div></details>';
  }
  function cartSheetHtml() {
    var c = cart();
    var lines = c.lines.map(function (l, i) {
      return '<div class="cartline"><div><div class="nm">' + esc(l.name) + '</div><div class="row" style="margin-top:6px"><div class="stepper"><button type="button" data-act="cQty" data-i="' + i + '" data-d="-1" aria-label="Punguza">−</button>' +
        '<input type="number" inputmode="decimal" data-in="cQtyIn" data-i="' + i + '" value="' + l.qty + '" aria-label="Idadi"><button type="button" data-act="cQty" data-i="' + i + '" data-d="1" aria-label="Ongeza">+</button></div>' +
        '<span class="muted">×</span><input type="number" inputmode="decimal" class="priceinp" data-in="cPrice" data-i="' + i + '" value="' + l.price + '" aria-label="Bei"></div></div>' +
        '<div style="text-align:right"><button type="button" class="icon-btn" style="width:32px;height:32px" data-act="cDel" data-i="' + i + '" aria-label="Ondoa"><svg width="16" height="16"><use href="#i-x"/></svg></button><div class="tot num" id="lt' + i + '" style="margin-top:6px">' + money(l.qty * l.price) + "</div></div></div>";
    }).join("");
    return lines + '<div class="totalbox"><span>Jumla</span><span class="v num" id="cTotal">' + money(cartTotal()) + "</span></div>" +
      '<div class="sec-title" style="margin-top:4px">Malipo</div>' + payChips(c.method, "cPay") +
      (c.method === "mkopo" ? creditFields() : "") + whenField() +
      '<button class="btn primary block" data-act="saveSale">Hifadhi mauzo</button>' +
      '<button class="btn ghost block" style="margin-top:8px" data-act="clearCart">Futa kapu</button>';
  }
  function openCart() { App.sheet("Kapu la mauzo", cartSheetHtml()); }
  function rerenderCart() { if (App.sheetOpen()) { var b = App.$("sheetBody"), top = b.scrollTop; b.innerHTML = cartSheetHtml(); b.scrollTop = top; } refreshPos(); }
  App.acts.openCart = openCart;
  App.acts.cQty = function (el) {
    var i = +el.getAttribute("data-i"), d = +el.getAttribute("data-d"), l = cart().lines[i];
    if (!l) return;
    l.qty = Math.max(0, Math.round((l.qty + d) * 1000) / 1000);
    if (l.qty <= 0) cart().lines.splice(i, 1);
    saveCart();
    if (!cart().lines.length) { App.closeSheet(); refreshPos(); } else rerenderCart();
  };
  App.acts.cDel = function (el) { cart().lines.splice(+el.getAttribute("data-i"), 1); saveCart(); if (!cart().lines.length) { App.closeSheet(); refreshPos(); } else rerenderCart(); };
  App.ins.cQtyIn = function (el) {
    var i = +el.getAttribute("data-i"), l = cart().lines[i]; if (!l) return;
    l.qty = Math.max(0, App.num(el.value)); saveCart(); updTotals(i);
  };
  App.ins.cPrice = function (el) {
    var i = +el.getAttribute("data-i"), l = cart().lines[i]; if (!l) return;
    l.price = Math.max(0, App.num(el.value)); saveCart(); updTotals(i);
  };
  function updTotals(i) {
    var l = cart().lines[i], e = App.$("lt" + i); if (l && e) e.textContent = money(l.qty * l.price);
    var t = App.$("cTotal"); if (t) t.textContent = money(cartTotal());
    var old = App.$("cartbar"); if (old) { old.remove(); var h = cartBar(); if (h) document.body.insertAdjacentHTML("beforeend", h); }
  }
  App.acts.cPay = function (el) { cart().method = el.getAttribute("data-m"); saveCart(); rerenderCart(); };
  App.ins.cCust = function (el) { cart().customer = el.value; saveCart(); };
  App.ins.cPhone = function (el) { cart().phone = el.value; saveCart(); };
  App.ins.cDep = function (el) { cart().deposit = el.value; saveCart(); };
  App.ins.cWhen = function (el) { cart().when = el.value; saveCart(); };
  App.acts.clearCart = function () { App.ui.cart = emptyCart(); saveCart(); App.closeSheet(); App.render(); };

  function whenTs(c) {
    if (!c.when) return App.now();
    var t = U.parseDT(c.when);
    return isFinite(t) ? t : App.now();
  }
  // Hifadhi mauzo: kapu la bidhaa au mauzo ya haraka
  function commitSale(lines, c, ts) {
    var method = c.method, total = lines.reduce(function (a, l) { return a + l.qty * l.price; }, 0);
    if (!lines.length || total <= 0) { App.toast("Weka bidhaa au kiasi kwanza", { bad: true }); return false; }
    var pay = { method: method };
    if (method === "mkopo") {
      if (!String(c.customer || "").trim()) { App.toast("Andika jina la mteja kwa mkopo", { bad: true }); return false; }
      var dep = App.num(c.deposit);
      if (dep < 0 || dep > total) { App.toast("Amana haiwezi kuzidi jumla", { bad: true }); return false; }
      pay.paid = dep;
    }
    var sale = { id: U.id(), ts: ts, lines: lines, pay: pay, payments: [], customer: method === "mkopo" ? String(c.customer).trim() : "", phone: method === "mkopo" ? String(c.phone || "").trim() : "", note: "" };
    var neg = [];
    lines.forEach(function (l) {
      if (!l.pid) return;
      var p = App.data().products.filter(function (x) { return x.id === l.pid; })[0];
      if (p) { p.stock = Math.round((p.stock - l.qty) * 1000) / 1000; if (p.stock < 0) neg.push(p.name); Store.put("products", p); }
    });
    Store.put("sales", sale);
    App.toast("Mauzo yamehifadhiwa · " + money(total) + (neg.length ? " (stoo ya " + neg[0] + " ni hasi, ihakiki)" : ""), { action: function () { App.deleteSale(sale.id, true); }, label: "Tendua", ms: 6000 });
    return true;
  }
  // Mauzo kwa gusa moja: taslimu, bila kufungua kapu (kwa mwenye duka anayehudumia peke yake)
  App.acts.payNow = function () {
    var c = cart(); c.method = "cash";
    var lines = c.lines.filter(function (l) { return l.qty > 0; }).map(function (l) { return { pid: l.pid, name: l.name, cat: l.cat, qty: l.qty, price: l.price, cost: l.cost }; });
    if (commitSale(lines, c, App.now())) { var keep = c.mode; App.ui.cart = emptyCart(); App.ui.cart.mode = keep; saveCart(); App.render(); }
  };
  App.acts.saveSale = function () {
    var c = cart();
    var lines = c.lines.filter(function (l) { return l.qty > 0; }).map(function (l) { return { pid: l.pid, name: l.name, cat: l.cat, qty: l.qty, price: l.price, cost: l.cost }; });
    if (commitSale(lines, c, whenTs(c))) {
      var keep = c.mode; App.ui.cart = emptyCart(); App.ui.cart.mode = keep; saveCart();
      App.closeSheet(); App.render();
    }
  };

  /* ----- Mauzo ya haraka (bila bidhaa) ----- */
  function quickForm() {
    var c = cart(), q = c.q, cats = categories();
    if (cats.indexOf("Mauzo ya jumla") < 0) cats.unshift("Mauzo ya jumla");
    var set = App.settings();
    return '<div class="card"><p class="muted" style="margin:0 0 12px;font-size:.84rem">Kwa mauzo ambayo huna muda wa kuchagua bidhaa. Faida itakadiriwa kwa ' + set.marginPct + "% (badilisha kwenye Mipangilio), au weka gharama kamili hapa chini.</p>" +
      App.field("Kiasi cha mauzo (TSh)", '<input type="number" inputmode="decimal" id="qAmt" data-in="qAmt" value="' + esc(q.amount) + '" placeholder="0" autofocus>') +
      App.field("Aina", '<select id="qCat" data-in="qCat">' + cats.map(function (x) { return "<option" + (q.cat === x ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select>") +
      App.field("Maelezo (hiari)", '<input type="text" id="qNote" data-in="qNote" value="' + esc(q.note) + '" placeholder="Mfano: mauzo ya jioni">') +
      App.field("Gharama ya bidhaa (hiari)", '<input type="number" inputmode="decimal" id="qCost" data-in="qCost" value="' + esc(q.cost) + '" placeholder="Acha tupu kukadiria">') +
      '<div class="sec-title" style="margin-top:0">Malipo</div>' + payChips(c.method, "qPay") + (c.method === "mkopo" ? creditFields() : "") + whenField() +
      '<button class="btn primary block" data-act="saveQuick">Hifadhi mauzo</button></div>';
  }
  App.ins.qAmt = function (el) { cart().q.amount = el.value; saveCart(); };
  App.ins.qCat = function (el) { cart().q.cat = el.value; saveCart(); };
  App.ins.qNote = function (el) { cart().q.note = el.value; saveCart(); };
  App.ins.qCost = function (el) { cart().q.cost = el.value; saveCart(); };
  App.acts.qPay = function (el) { cart().method = el.getAttribute("data-m"); saveCart(); App.render(); };
  App.acts.saveQuick = function () {
    var c = cart(), q = c.q, amt = App.num(q.amount);
    if (!(amt > 0)) { App.toast("Andika kiasi cha mauzo", { bad: true }); return; }
    var cat = q.cat || "Mauzo ya jumla", est = !String(q.cost).trim();
    var cost = est ? Math.round(amt * (1 - App.settings().marginPct / 100)) : Math.max(0, App.num(q.cost));
    var lines = [{ pid: null, name: String(q.note || "").trim() || cat, cat: cat, qty: 1, price: amt, cost: cost, est: est }];
    if (commitSale(lines, c, whenTs(c))) {
      var mode = App.ui.posMode; App.ui.cart = emptyCart(); saveCart(); App.ui.posMode = mode; App.render();
    }
  };

  /* ----- Maelezo ya mauzo, kufuta ----- */
  App.deleteSale = function (id, silent) {
    var s = App.data().sales.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    s.lines.forEach(function (l) {
      if (!l.pid) return;
      var p = App.data().products.filter(function (x) { return x.id === l.pid; })[0];
      if (p) { p.stock = Math.round((p.stock + l.qty) * 1000) / 1000; Store.put("products", p); }
    });
    Store.del("sales", id);
    if (!silent) App.toast("Mauzo yamefutwa");
    else App.toast("Imetenduliwa");
  };
  function receiptText(s) {
    var c = BI.calc(s), m = s.pay && s.pay.method || "cash";
    return App.shop().name + "\nRisiti · " + U.fmtDT(s.ts) + "\n\n" +
      s.lines.map(function (l) { return U.int(l.qty) + " x " + l.name + " @ " + U.int(l.price) + " = " + U.int(l.qty * l.price); }).join("\n") +
      "\n\nJUMLA: " + money(c.total) + "\nMalipo: " + (App.methodNames[m] || m) +
      (m === "mkopo" ? "\nDeni: " + money(BI.outstanding(s)) : "") + "\nAsante, karibu tena!";
  }
  App.acts.showSale = function (el) {
    var id = el.getAttribute("data-id"), s = App.data().sales.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var c = BI.calc(s), m = s.pay && s.pay.method || "cash";
    var h = '<div class="kv"><span>Tarehe</span><b>' + U.fmtDT(s.ts) + '</b></div><div class="kv"><span>Malipo</span><b>' + esc(App.methodNames[m] || m) + "</b></div>" +
      (s.customer ? '<div class="kv"><span>Mteja</span><b>' + esc(s.customer) + "</b></div>" : "") +
      '<div class="card flat" style="margin:12px 0"><table class="tbl"><thead><tr><th>Bidhaa</th><th>Idadi</th><th>Bei</th><th>Jumla</th></tr></thead><tbody>' +
      s.lines.map(function (l) { return "<tr><td>" + esc(l.name) + (l.est ? ' <span class="badge">makadirio</span>' : "") + "</td><td>" + U.int(l.qty) + "</td><td>" + U.int(l.price) + "</td><td>" + U.int(l.qty * l.price) + "</td></tr>"; }).join("") +
      '</tbody></table></div><div class="kv"><span>Jumla</span><b>' + money(c.total) + '</b></div><div class="kv"><span>Faida</span><b class="' + (c.profit < 0 ? "neg" : "pos") + '">' + money(c.profit) + "</b></div>" +
      (m === "mkopo" ? '<div class="kv"><span>Deni lililobaki</span><b>' + money(BI.outstanding(s)) + "</b></div>" : "") +
      '<div class="grid2" style="margin-top:14px"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(receiptText(s)) + '">Tuma risiti</a><button class="btn danger" data-act="delSale" data-id="' + s.id + '">Futa mauzo</button></div>';
    App.sheet("Mauzo", h);
  };
  App.acts.delSale = function (el) {
    var id = el.getAttribute("data-id");
    App.confirm("Futa mauzo haya? Stoo itarudishwa.", { ok: "Futa", danger: true }).then(function (ok) { if (ok) { App.closeSheet(); App.deleteSale(id); } });
  };

  /* ================= STOO ================= */
  App.ui.stooQ = ""; App.ui.stooF = "all";
  function stockRows() {
    var d = App.data(), now = App.now(), set = App.settings();
    var info = App.memo("stock-info", function () { return BI.stockInfo(d, now - (now % 60000), 28, set.leadDays); });
    var q = App.ui.stooQ.trim().toLowerCase(), f = App.ui.stooF;
    var rows = info.filter(function (x) {
      if (q && x.product.name.toLowerCase().indexOf(q) < 0 && String(x.product.cat || "").toLowerCase().indexOf(q) < 0) return false;
      if (f === "low") return x.status === "low";
      if (f === "out") return x.status === "out";
      if (f === "dead") return BI.deadStock([x], now, 30).length > 0;
      return true;
    });
    var rank = { out: 0, low: 1, ok: 2 };
    rows.sort(function (a, b) { return rank[a.status] - rank[b.status] || a.product.name.localeCompare(b.product.name); });
    return rows;
  }
  function stockList() {
    var rows = stockRows();
    if (!rows.length) return '<div class="empty">Hakuna bidhaa.</div>';
    return '<div class="list">' + rows.map(function (x) {
      var p = x.product, mg = p.price ? (p.price - p.cost) / p.price : 0;
      var badge = x.status === "out" ? '<span class="badge bad">Imeisha</span>' : (x.status === "low" ? '<span class="badge warn">Inaisha</span>' : "");
      return '<button type="button" class="li tap" data-act="openProduct" data-id="' + p.id + '"><div class="main"><div class="t">' + esc(p.name) + " " + badge + '</div><div class="s">' + esc(p.cat || "") + " · nunua " + U.int(p.cost) + " → uza " + U.int(p.price) + " · faida " + Math.round(mg * 100) + "%" +
        (x.daily > 0 ? " · " + x.daily.toFixed(1) + "/siku" : "") + '</div></div><div class="amt num">' + U.int(p.stock) + "<small>" + esc(p.unit || "") + (isFinite(x.daysLeft) && p.stock > 0 ? " · siku " + Math.round(x.daysLeft) : "") + "</small></div></button>";
    }).join("") + "</div>";
  }
  App.views.stoo = {
    title: "Stoo",
    render: function () {
      var d = App.data(), now = App.now();
      var info = BI.stockInfo(d, now, 28, App.settings().leadDays);
      var low = info.filter(function (x) { return x.status === "low"; }).length, out = info.filter(function (x) { return x.status === "out"; }).length, dead = BI.deadStock(info, now, 30).length;
      var f = App.ui.stooF;
      var chip = function (k, l) { return '<button class="chip ' + (f === k ? "on" : "") + '" data-act="stooF" data-f="' + k + '">' + l + "</button>"; };
      return '<div class="kpis">' + kpi("Bidhaa", U.int(d.products.length)) + kpi("Thamani ya stoo", mny(BI.inventoryValue(d.products)), '<div class="d">Kwa bei ya kununua</div>') + "</div>" +
        '<div class="search"><input type="search" id="stooSearch" data-in="stooSearch" placeholder="Tafuta bidhaa au aina..." value="' + esc(App.ui.stooQ) + '" autocomplete="off"></div>' +
        '<div class="chips">' + chip("all", "Zote") + chip("low", "Zinaisha (" + low + ")") + chip("out", "Zimeisha (" + out + ")") + chip("dead", "Hazijauzwa 30 (" + dead + ")") + "</div>" +
        '<div class="card" id="stooList">' + stockList() + '</div><button class="btn primary block" data-act="newProduct"><svg width="18" height="18"><use href="#i-plus"/></svg> Bidhaa mpya</button>';
    }
  };
  App.ins.stooSearch = function (el) { App.ui.stooQ = el.value; var l = App.$("stooList"); if (l) l.innerHTML = stockList(); };
  App.acts.stooF = function (el) { App.ui.stooF = el.getAttribute("data-f"); App.render(); };

  function findProduct(id) { return App.data().products.filter(function (x) { return x.id === id; })[0]; }
  App.acts.openProduct = function (el) {
    var p = findProduct(el.getAttribute("data-id")); if (!p) return;
    var info = BI.stockInfo(App.data(), App.now(), 28, App.settings().leadDays).filter(function (x) { return x.product.id === p.id; })[0];
    var hist = App.data().purchases.filter(function (x) { return x.pid === p.id; }).sort(function (a, b) { return b.ts - a.ts; }).slice(0, 6);
    var h = '<div class="kv"><span>Stoo ya sasa</span><b>' + U.int(p.stock) + " " + esc(p.unit || "") + '</b></div>' +
      '<div class="kv"><span>Bei ya kununua / kuuza</span><b>' + U.int(p.cost) + " / " + U.int(p.price) + "</b></div>" +
      '<div class="kv"><span>Faida kwa kimoja</span><b>' + U.int(p.price - p.cost) + " (" + Math.round((p.price ? (p.price - p.cost) / p.price : 0) * 100) + "%)</b></div>" +
      '<div class="kv"><span>Inauzwa (wastani)</span><b>' + (info.daily > 0 ? info.daily.toFixed(1) + " kwa siku" : "-") + "</b></div>" +
      '<div class="kv"><span>Itaisha ndani ya</span><b>' + (isFinite(info.daysLeft) && p.stock > 0 ? "siku " + Math.round(info.daysLeft) : "-") + "</b></div>" +
      (info.suggest ? '<div class="kv"><span>Pendekezo la kuagiza</span><b>' + U.int(info.suggest) + " " + esc(p.unit || "") + "</b></div>" : "") +
      '<div class="grid2" style="margin:14px 0 8px"><button class="btn primary" data-act="restock" data-id="' + p.id + '">Ongeza stoo</button><button class="btn" data-act="adjust" data-id="' + p.id + '">Rekebisha stoo</button></div>' +
      '<div class="grid2"><button class="btn" data-act="editProduct" data-id="' + p.id + '">Hariri</button><button class="btn danger" data-act="delProduct" data-id="' + p.id + '">Futa</button></div>' +
      (hist.length ? '<div class="sec-title">Historia ya stoo</div><div class="list">' + hist.map(function (x) {
        return '<div class="li"><div class="main"><div class="t">' + (x.type === "adjust" ? "Marekebisho" : "Ununuzi") + '</div><div class="s">' + U.fmtDT(x.ts) + (x.supplier ? " · " + esc(x.supplier) : "") + (x.note ? " · " + esc(x.note) : "") + '</div></div><div class="amt num">' + (x.qty > 0 ? "+" : "") + U.int(x.qty) + "</div></div>";
      }).join("") + "</div>" : "");
    App.sheet(p.name, h);
  };

  function productForm(p) {
    var isNew = !p; p = p || { name: "", cat: "", unit: "", cost: "", price: "", stock: "", minStock: "" };
    var cats = categories();
    return App.field("Jina la bidhaa", '<input type="text" id="pName" value="' + esc(p.name) + '" autocomplete="off" autofocus placeholder="Mfano: Sukari (kg)">') +
      '<div class="grid2">' + App.field("Aina", '<input type="text" id="pCat" list="catList" value="' + esc(p.cat) + '" placeholder="Vyakula" autocomplete="off"><datalist id="catList">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>") +
      App.field("Kipimo", '<input type="text" id="pUnit" value="' + esc(p.unit) + '" placeholder="kg, chupa, pakti">') + "</div>" +
      '<div class="grid2">' + App.field("Bei ya kununua", '<input type="number" inputmode="decimal" id="pCost" value="' + esc(p.cost) + '" placeholder="0">') +
      App.field("Bei ya kuuza", '<input type="number" inputmode="decimal" id="pPrice" value="' + esc(p.price) + '" placeholder="0">') + "</div>" +
      '<div class="grid2">' + (isNew ? App.field("Stoo ya sasa", '<input type="number" inputmode="decimal" id="pStock" value="' + esc(p.stock) + '" placeholder="0">') : "") +
      App.field("Kiwango cha chini (tahadhari)", '<input type="number" inputmode="decimal" id="pMin" value="' + esc(p.minStock) + '" placeholder="0">') + "</div>" +
      '<button class="btn primary block" data-act="saveProduct" data-id="' + (isNew ? "" : p.id) + '">Hifadhi</button>';
  }
  App.acts.newProduct = function () { App.sheet("Bidhaa mpya", productForm(null)); };
  App.acts.editProduct = function (el) { var p = findProduct(el.getAttribute("data-id")); if (p) App.sheet("Hariri bidhaa", productForm(p)); };
  App.acts.saveProduct = function (el) {
    var id = el.getAttribute("data-id"), name = App.$("pName").value.trim();
    if (!name) { App.toast("Andika jina la bidhaa", { bad: true }); return; }
    var price = App.num(App.$("pPrice").value), cost = App.num(App.$("pCost").value);
    if (!(price > 0)) { App.toast("Weka bei ya kuuza", { bad: true }); return; }
    var p = id ? findProduct(id) : { id: U.id(), created: App.now(), stock: App.num(App.$("pStock") && App.$("pStock").value) };
    p.name = name; p.cat = App.$("pCat").value.trim() || "Nyingine"; p.unit = App.$("pUnit").value.trim();
    p.cost = cost; p.price = price; p.minStock = App.num(App.$("pMin").value);
    Store.put("products", p);
    App.closeSheet(); App.toast(id ? "Imesasishwa" : "Bidhaa imeongezwa");
  };
  App.acts.delProduct = function (el) {
    var id = el.getAttribute("data-id"), p = findProduct(id);
    App.confirm("Futa " + (p ? p.name : "bidhaa hii") + "? Mauzo ya zamani yatabaki kwenye ripoti.", { ok: "Futa", danger: true }).then(function (ok) { if (ok) { Store.del("products", id); App.closeSheet(); App.toast("Imefutwa"); } });
  };

  App.acts.restock = function (el) {
    var p = findProduct(el.getAttribute("data-id")); if (!p) return;
    var h = '<p class="muted" style="margin:0 0 12px">Stoo ya sasa: <b>' + U.int(p.stock) + " " + esc(p.unit || "") + "</b></p>" +
      '<div class="grid2">' + App.field("Idadi iliyoongezwa", '<input type="number" inputmode="decimal" id="rQty" autofocus placeholder="0">') +
      App.field("Bei ya kununua (kila kimoja)", '<input type="number" inputmode="decimal" id="rCost" value="' + esc(p.cost) + '">') + "</div>" +
      App.field("Muuzaji (hiari)", '<input type="text" id="rSup" placeholder="Jina la muuzaji wa jumla">') +
      App.field("Bei mpya ya kuuza (hiari)", '<input type="number" inputmode="decimal" id="rPrice" value="' + esc(p.price) + '">') +
      App.field("Tarehe", '<input type="datetime-local" id="rWhen" value="' + U.dtValue(App.now()) + '">') +
      '<button class="btn primary block" data-act="saveRestock" data-id="' + p.id + '">Hifadhi</button>';
    App.sheet("Ongeza stoo: " + p.name, h);
  };
  App.acts.saveRestock = function (el) {
    var p = findProduct(el.getAttribute("data-id")); if (!p) return;
    var q = App.num(App.$("rQty").value), uc = App.num(App.$("rCost").value);
    if (!(q > 0)) { App.toast("Andika idadi", { bad: true }); return; }
    var ts = U.parseDT(App.$("rWhen").value); if (!isFinite(ts)) ts = App.now();
    // Gharama ya wastani (weighted average) ili faida ibaki sahihi
    var old = Math.max(0, p.stock);
    p.cost = old + q > 0 ? Math.round((old * p.cost + q * uc) / (old + q)) : uc;
    p.stock = Math.round((p.stock + q) * 1000) / 1000;
    var np = App.num(App.$("rPrice").value); if (np > 0) p.price = np;
    Store.put("products", p);
    Store.put("purchases", { id: U.id(), ts: ts, pid: p.id, qty: q, unitCost: uc, supplier: App.$("rSup").value.trim(), type: "restock", note: "" });
    App.closeSheet(); App.toast("Stoo imeongezwa: " + p.name + " → " + U.int(p.stock));
  };
  App.acts.adjust = function (el) {
    var p = findProduct(el.getAttribute("data-id")); if (!p) return;
    var h = '<p class="muted" style="margin:0 0 12px">Stoo kwenye mfumo: <b>' + U.int(p.stock) + "</b>. Andika idadi uliyohesabu dukani.</p>" +
      App.field("Idadi halisi", '<input type="number" inputmode="decimal" id="aQty" value="' + p.stock + '" autofocus>') +
      App.field("Sababu", '<select id="aWhy"><option>Imehesabiwa upya</option><option>Imeharibika / imeisha muda</option><option>Imepotea / imeibwa</option><option>Matumizi binafsi</option></select>') +
      '<button class="btn primary block" data-act="saveAdjust" data-id="' + p.id + '">Hifadhi</button>';
    App.sheet("Rekebisha stoo: " + p.name, h);
  };
  App.acts.saveAdjust = function (el) {
    var p = findProduct(el.getAttribute("data-id")); if (!p) return;
    var nq = App.num(App.$("aQty").value), diff = Math.round((nq - p.stock) * 1000) / 1000;
    if (diff === 0) { App.closeSheet(); return; }
    p.stock = nq; Store.put("products", p);
    Store.put("purchases", { id: U.id(), ts: App.now(), pid: p.id, qty: diff, unitCost: p.cost, supplier: "", type: "adjust", note: App.$("aWhy").value });
    App.closeSheet(); App.toast("Stoo imerekebishwa");
  };
})();
