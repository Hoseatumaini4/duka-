/* views-more.js: Zaidi, Matumizi, Madeni, Mauzo yote, Data na nakala, Mipangilio. */
(function () {
  "use strict";
  var U = window.U, BI = window.BI, App = window.App, Store = window.Store, Charts = window.Charts;
  var esc = U.esc, money = U.money, kpi = function () { return App.kpi.apply(null, arguments); };

  /* ================= ZAIDI ================= */
  App.views.zaidi = {
    title: "Zaidi",
    render: function () {
      var d = App.data(), owed = BI.credits(d, App.now()).reduce(function (a, c) { return a + c.owed; }, 0);
      var item = function (to, ic, t, s, right) {
        return '<button type="button" class="li tap" data-act="go" data-to="' + to + '"><span class="ic" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);font-weight:800">' + ic + '</span><div class="main"><div class="t">' + t + '</div><div class="s">' + s + "</div></div>" + (right || "") + "</button>";
      };
      return '<div class="card menu"><div class="list">' +
        item("mauzo", "☰", "Mauzo yote", "Tazama, tafuta na ufute mauzo ya zamani") +
        item("hesabu", "✓", "Funga siku (hesabu ya stoo)", "Hesabu bidhaa jioni; mfumo unakokotoa mauzo ambayo hukuandika") +
        item("matumizi", "−", "Matumizi", "Kodi, umeme, mshahara na mengine") +
        item("madeni", "◔", "Madeni ya wateja", owed ? "Wanadaiwa " + money(owed) : "Hakuna madeni", owed ? '<span class="badge warn">' + money(owed) + "</span>" : "") +
        item("data", "⇅", "Data na nakala", "Hifadhi nakala, pakua CSV, ingiza data") +
        item("mipangilio", "⚙", "Mipangilio", "Jina la duka, asilimia ya faida, tahadhari za stoo") +
        "</div></div>" +
        '<p class="sub" style="text-align:center;margin-top:18px">Duka Mahiri · inafanya kazi bila mtandao · data iko kwenye simu yako<br>Hifadhi: ' + esc(Store.mode()) + "</p>";
    }
  };

  /* ================= MATUMIZI ================= */
  var EXP_CATS = ["Kodi ya chumba", "Umeme", "Maji", "Mshahara", "Usafiri", "Intaneti na vocha", "Leseni na ushuru", "Ufungashaji", "Mengineyo"];
  App.ui.expMonth = U.startOf(Date.now(), "month");
  function expCats() {
    var m = {}; EXP_CATS.forEach(function (c) { m[c] = 1; });
    App.data().expenses.forEach(function (e) { if (e.cat) m[e.cat] = 1; });
    return Object.keys(m);
  }
  App.views.matumizi = {
    title: "Matumizi", back: "zaidi",
    render: function () {
      var from = App.ui.expMonth, to = U.next(from, "month"), d = App.data();
      var list = d.expenses.filter(function (e) { return e.ts >= from && e.ts < to; }).sort(function (a, b) { return b.ts - a.ts; });
      var total = list.reduce(function (a, e) { return a + e.amount; }, 0);
      var s = BI.summary(d, from, to);
      var by = BI.expensesByCat(d, from, to);
      var isNow = from === U.startOf(App.now(), "month");
      var h = '<div class="row sp" style="margin-bottom:12px"><button class="icon-btn" data-act="expMonth" data-d="-1" aria-label="Mwezi uliopita"><svg width="18" height="18"><use href="#i-back"/></svg></button><b style="font-size:1.05rem">' + U.MONTHS[new Date(from).getMonth()] + " " + new Date(from).getFullYear() + '</b><button class="icon-btn" data-act="expMonth" data-d="1" ' + (isNow ? "disabled" : "") + ' aria-label="Mwezi unaofuata"><svg width="18" height="18" style="transform:rotate(180deg)"><use href="#i-back"/></svg></button></div>';
      h += '<div class="kpis">' + kpi("Jumla ya matumizi", money(total), s.gross > 0 ? '<div class="d">' + Math.round(total / s.gross * 100) + "% ya faida ya jumla</div>" : "") +
        kpi("Faida halisi", '<span class="' + (s.net < 0 ? "neg" : "") + '">' + money(s.net) + "</span>", '<div class="d">Faida ya jumla ' + money(s.gross) + "</div>") + "</div>";
      if (by.length) h += '<div class="card"><div class="card-h"><h2>Kwa aina</h2></div>' + Charts.hbars(by.map(function (b) { return { name: b.name, val: money(b.total), v: b.total, sub: Math.round(b.share * 100) + "%", cls: "accent" }; })) + "</div>";
      h += '<button class="btn primary block" style="margin-bottom:12px" data-act="newExpense"><svg width="18" height="18"><use href="#i-plus"/></svg> Matumizi mapya</button>';
      h += '<div class="card"><div class="list">' + (list.map(function (e) {
        return '<button type="button" class="li tap" data-act="editExpense" data-id="' + e.id + '"><div class="main"><div class="t">' + esc(e.cat) + '</div><div class="s">' + U.fmtDT(e.ts) + (e.note ? " · " + esc(e.note) : "") + '</div></div><div class="amt num">' + money(e.amount) + "</div></button>";
      }).join("") || '<div class="empty">Hakuna matumizi mwezi huu.</div>') + "</div></div>";
      return h;
    }
  };
  App.acts.expMonth = function (el) { App.ui.expMonth = U.addMonths(App.ui.expMonth, +el.getAttribute("data-d")); App.ui.expMonth = U.startOf(App.ui.expMonth, "month"); App.render(); };
  function expenseForm(e) {
    var isNew = !e; e = e || { cat: "", amount: "", ts: App.now(), note: "" };
    return App.field("Aina", '<input type="text" id="eCat" list="eCats" value="' + esc(e.cat) + '" placeholder="Chagua au andika" autocomplete="off"><datalist id="eCats">' + expCats().map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>") +
      App.field("Kiasi (TSh)", '<input type="number" inputmode="decimal" id="eAmt" value="' + esc(e.amount) + '" autofocus placeholder="0">') +
      App.field("Tarehe", '<input type="datetime-local" id="eWhen" value="' + U.dtValue(e.ts) + '">') +
      App.field("Maelezo (hiari)", '<input type="text" id="eNote" value="' + esc(e.note) + '">') +
      '<button class="btn primary block" data-act="saveExpense" data-id="' + (isNew ? "" : e.id) + '">Hifadhi</button>' +
      (isNew ? "" : '<button class="btn danger block" style="margin-top:8px" data-act="delExpense" data-id="' + e.id + '">Futa</button>');
  }
  App.acts.newExpense = function () { App.sheet("Matumizi mapya", expenseForm(null)); };
  App.acts.editExpense = function (el) {
    var e = App.data().expenses.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0];
    if (e) App.sheet("Hariri matumizi", expenseForm(e));
  };
  App.acts.saveExpense = function (el) {
    var id = el.getAttribute("data-id"), cat = App.$("eCat").value.trim(), amt = App.num(App.$("eAmt").value);
    if (!cat) { App.toast("Andika aina ya matumizi", { bad: true }); return; }
    if (!(amt > 0)) { App.toast("Andika kiasi", { bad: true }); return; }
    var ts = U.parseDT(App.$("eWhen").value); if (!isFinite(ts)) ts = App.now();
    var e = id ? App.data().expenses.filter(function (x) { return x.id === id; })[0] : { id: U.id() };
    e.cat = cat; e.amount = amt; e.ts = ts; e.note = App.$("eNote").value.trim();
    Store.put("expenses", e);
    App.closeSheet(); App.toast("Matumizi yamehifadhiwa");
  };
  App.acts.delExpense = function (el) {
    var id = el.getAttribute("data-id");
    App.confirm("Futa matumizi haya?", { ok: "Futa", danger: true }).then(function (ok) { if (ok) { Store.del("expenses", id); App.closeSheet(); App.toast("Yamefutwa"); } });
  };

  /* ================= MADENI ================= */
  App.views.madeni = {
    title: "Madeni", back: "zaidi",
    render: function () {
      var list = BI.credits(App.data(), App.now());
      var owed = list.reduce(function (a, c) { return a + c.owed; }, 0), over = list.filter(function (c) { return c.ageDays > 30; });
      var h = '<div class="kpis">' + kpi("Jumla ya madeni", money(owed), '<div class="d">Wateja ' + list.length + "</div>", "hero") +
        kpi("Zaidi ya siku 30", String(over.length), '<div class="d">' + money(over.reduce(function (a, c) { return a + c.owed; }, 0)) + "</div>") +
        kpi("Deni kubwa", list[0] ? esc(list[0].name) : "-", list[0] ? '<div class="d">' + money(list[0].owed) + "</div>" : "") + "</div>";
      h += '<div class="card"><div class="list">' + (list.map(function (c) {
        var badge = c.ageDays > 60 ? '<span class="badge bad">siku ' + c.ageDays + "</span>" : (c.ageDays > 30 ? '<span class="badge warn">siku ' + c.ageDays + "</span>" : '<span class="badge">siku ' + c.ageDays + "</span>");
        return '<button type="button" class="li tap" data-act="openCustomer" data-k="' + esc(c.key) + '"><div class="main"><div class="t">' + esc(c.name) + " " + badge + '</div><div class="s">' + (c.phone ? esc(c.phone) + " · " : "") + "Deni kongwe: " + U.fmtDate(c.oldest) + '</div></div><div class="amt num">' + money(c.owed) + "</div></button>";
      }).join("") || '<div class="empty">Hakuna madeni. Mauzo ya "Mkopo" yataonekana hapa.</div>') + "</div></div>";
      return h;
    }
  };
  function findCustomer(key) { return BI.credits(App.data(), App.now()).filter(function (c) { return c.key === key; })[0]; }
  App.acts.openCustomer = function (el) {
    var c = findCustomer(el.getAttribute("data-k")); if (!c) return;
    var msg = "Habari " + c.name + ", ni " + App.shop().name + ". Unadaiwa " + money(c.owed) + " kwa bidhaa ulizochukua. Tafadhali lipa unapoweza. Asante.";
    var ph = App.phoneIntl(c.phone);
    var h = '<div class="kv"><span>Deni la sasa</span><b>' + money(c.owed) + '</b></div><div class="kv"><span>Deni kongwe</span><b>siku ' + c.ageDays + "</b></div>" +
      (c.phone ? '<div class="kv"><span>Simu</span><b>' + esc(c.phone) + "</b></div>" : "") +
      '<div class="sec-title">Pokea malipo</div>' +
      App.field("Kiasi (TSh)", '<input type="number" inputmode="decimal" id="dAmt" value="' + Math.round(c.owed) + '" autofocus>') +
      '<div class="grid2">' + App.field("Njia", '<select id="dMeth"><option value="cash">Taslimu</option><option value="mpesa">M-Pesa</option><option value="airtel">Airtel Money</option><option value="tigo">Tigo Pesa</option><option value="halotel">Halotel</option><option value="samehe">Samehe deni (si pesa)</option></select>') +
      App.field("Tarehe", '<input type="datetime-local" id="dWhen" value="' + U.dtValue(App.now()) + '">') + "</div>" +
      '<button class="btn primary block" data-act="payDebt" data-k="' + esc(c.key) + '">Hifadhi malipo</button>' +
      '<div class="grid2" style="margin-top:8px">' + (ph ? '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + ph + "?text=" + encodeURIComponent(msg) + '">Mkumbushe WhatsApp</a><a class="btn" href="sms:+' + ph + (/iPad|iPhone/.test(navigator.userAgent) ? "&" : "?") + "body=" + encodeURIComponent(msg) + '">Mkumbushe SMS</a>' : '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">Mkumbushe WhatsApp</a>') + "</div>" +
      '<div class="sec-title">Mauzo ambayo hayajalipwa</div><div class="list">' + c.sales.map(function (s) {
        return '<button type="button" class="li tap" data-act="showSale" data-id="' + s.id + '"><div class="main"><div class="t">' + U.fmtDate(s.ts) + '</div><div class="s">Jumla ' + money(s.total) + '</div></div><div class="amt num">' + money(s.outstanding) + "</div></button>";
      }).join("") + "</div>";
    App.sheet(c.name, h);
  };
  App.acts.payDebt = function (el) {
    var c = findCustomer(el.getAttribute("data-k")); if (!c) return;
    var amt = App.num(App.$("dAmt").value), method = App.$("dMeth").value;
    if (!(amt > 0)) { App.toast("Andika kiasi", { bad: true }); return; }
    if (amt > c.owed) { amt = c.owed; App.toast("Kiasi kimepunguzwa hadi deni lililopo"); }
    var ts = U.parseDT(App.$("dWhen").value); if (!isFinite(ts)) ts = App.now();
    var al = BI.allocate(c.sales, amt);
    al.parts.forEach(function (p) {
      var s = App.data().sales.filter(function (x) { return x.id === p.saleId; })[0];
      if (!s) return;
      s.payments = (s.payments || []).concat([{ ts: ts, amt: p.amt, method: method }]);
      Store.put("sales", s);
    });
    App.closeSheet();
    App.toast(method === "samehe" ? "Deni limesamehewa" : "Malipo yamehifadhiwa: " + money(amt));
  };

  /* ================= MAUZO YOTE ================= */
  App.ui.salesRange = "siku30"; App.ui.salesQ = ""; App.ui.salesLimit = 40;
  function salesListHtml() {
    var d = App.data(), now = App.now();
    var minTs = d.sales.reduce(function (m, s) { return Math.min(m, s.ts); }, now);
    var r = U.presetRange(App.ui.salesRange, now, minTs), q = App.ui.salesQ.trim().toLowerCase();
    var list = d.sales.filter(function (s) {
      if (s.ts < r.from || s.ts >= r.to) return false;
      if (!q) return true;
      return (s.customer || "").toLowerCase().indexOf(q) >= 0 || s.lines.some(function (l) { return l.name.toLowerCase().indexOf(q) >= 0; });
    }).sort(function (a, b) { return b.ts - a.ts; });
    var tot = list.reduce(function (a, s) { return a + BI.calc(s).total; }, 0);
    return '<div class="sub" style="margin:0 2px 8px">Mauzo ' + list.length + " · jumla " + money(tot) + '</div><div class="list">' +
      (list.slice(0, App.ui.salesLimit).map(App.saleRow).join("") || '<div class="empty">Hakuna mauzo.</div>') + "</div>" +
      (list.length > App.ui.salesLimit ? '<button class="btn block ghost sm" data-act="salesMore">Onyesha zaidi</button>' : "");
  }
  App.views.mauzo = {
    title: "Mauzo yote", back: "zaidi",
    render: function () {
      var rs = [["leo", "Leo"], ["jana", "Jana"], ["siku7", "Siku 7"], ["siku30", "Siku 30"], ["mwezi", "Mwezi huu"], ["yote", "Yote"]];
      return '<div class="chips">' + rs.map(function (x) { return '<button class="chip ' + (App.ui.salesRange === x[0] ? "on" : "") + '" data-act="salesRange" data-r="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>" +
        '<div class="search"><input type="search" id="salesSearch" data-in="salesSearch" placeholder="Tafuta bidhaa au mteja..." value="' + esc(App.ui.salesQ) + '"></div><div class="card" id="salesList">' + salesListHtml() + "</div>";
    }
  };
  App.acts.salesRange = function (el) { App.ui.salesRange = el.getAttribute("data-r"); App.ui.salesLimit = 40; App.render(); };
  App.acts.salesMore = function () { App.ui.salesLimit += 40; App.$("salesList").innerHTML = salesListHtml(); };
  App.ins.salesSearch = function (el) { App.ui.salesQ = el.value; App.ui.salesLimit = 40; App.$("salesList").innerHTML = salesListHtml(); };

  /* ================= DATA NA NAKALA ================= */
  App.views.data = {
    title: "Data na nakala", back: "zaidi",
    render: function () {
      var d = App.data(), lb = Store.meta("lastBackup", 0), demo = Store.meta("demo", false);
      return '<div class="card"><div class="card-h"><h2>Hifadhi nakala</h2></div><p class="sub" style="margin:0 0 10px">Pakua faili la nakala kamili (mauzo, stoo, matumizi, madeni). Lihifadhi kwenye WhatsApp, barua pepe au Google Drive. ' + (lb ? "Mara ya mwisho: <b>" + U.fmtDT(lb) + "</b>." : "Bado hujahifadhi nakala.") + '</p><button class="btn primary block" data-act="exportJson">Pakua nakala (JSON)</button></div>' +
        '<div class="card"><div class="card-h"><h2>Rudisha au unganisha nakala</h2></div><p class="sub" style="margin:0 0 10px">Chagua faili la nakala ulilopakua awali.</p><input type="file" id="importFile" accept=".json,application/json" data-chg="importFile"></div>' +
        '<div class="card"><div class="card-h"><h2>Pakua kwa Excel (CSV)</h2></div><div class="grid2"><button class="btn" data-act="exportCsv" data-w="sales">Mauzo</button><button class="btn" data-act="exportCsv" data-w="expenses">Matumizi</button><button class="btn" data-act="exportCsv" data-w="products">Bidhaa</button><button class="btn" data-act="printReport">Chapisha ripoti</button></div></div>' +
        '<div class="card"><div class="card-h"><h2>Data ya mfano</h2></div><p class="sub" style="margin:0 0 10px">' + (demo ? "Data ya mfano imepakiwa sasa. Ifute ili uanze na duka lako." : "Jaribu programu kwa data ya duka la mfano la siku 120. Hii itabadilisha data iliyopo.") + '</p>' + (demo ? '<button class="btn danger block" data-act="clearDemo">Futa data ya mfano</button>' : '<button class="btn block" data-act="loadDemo2">Pakia data ya mfano</button>') + "</div>" +
        '<div class="card"><div class="card-h"><h2>Hali ya hifadhi</h2></div><div class="kv"><span>Mauzo</span><b>' + U.int(d.sales.length) + '</b></div><div class="kv"><span>Bidhaa</span><b>' + U.int(d.products.length) + '</b></div><div class="kv"><span>Matumizi</span><b>' + U.int(d.expenses.length) + '</b></div><div class="kv"><span>Ununuzi/marekebisho</span><b>' + U.int(d.purchases.length) + '</b></div><div class="kv"><span>Mahali pa kuhifadhi</span><b>' + esc(Store.mode()) + '</b></div></div>' +
        '<div class="card" style="border-color:var(--bad)"><div class="card-h"><h2 style="color:var(--bad)">Futa data yote</h2></div><p class="sub" style="margin:0 0 10px">Hii haiwezi kutenduliwa. Pakua nakala kwanza.</p><button class="btn danger block" data-act="wipeAll">Futa data yote</button></div>';
    }
  };
  App.acts.exportJson = function () {
    var snap = Store.snapshot();
    App.download("duka-mahiri-nakala-" + U.dateValue(App.now()) + ".json", JSON.stringify(snap), "application/json");
    Store.setMeta("lastBackup", App.now());
    App.toast("Nakala imepakuliwa");
  };
  App.acts.exportCsv = function (el) {
    var w = el.getAttribute("data-w"), d = App.data(), rows;
    if (w === "sales") {
      rows = [["Tarehe", "Saa", "Risiti", "Bidhaa", "Aina", "Idadi", "Bei", "Jumla", "Gharama", "Faida", "Malipo", "Mteja", "Makadirio ya faida"]];
      d.sales.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (s) {
        s.lines.forEach(function (l) {
          rows.push([U.dateValue(s.ts), U.fmtTime(s.ts), s.id, l.name, l.cat || "", l.qty, l.price, l.qty * l.price, Math.round(l.qty * (l.cost || 0)), Math.round(l.qty * (l.price - (l.cost || 0))), (App.methodNames[s.pay && s.pay.method] || ""), s.customer || "", l.est ? "ndiyo" : ""]);
        });
      });
    } else if (w === "expenses") {
      rows = [["Tarehe", "Saa", "Aina", "Kiasi", "Maelezo"]];
      d.expenses.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (e) { rows.push([U.dateValue(e.ts), U.fmtTime(e.ts), e.cat, e.amount, e.note || ""]); });
    } else {
      rows = [["Jina", "Aina", "Kipimo", "Bei ya kununua", "Bei ya kuuza", "Stoo", "Kiwango cha chini"]];
      d.products.forEach(function (p) { rows.push([p.name, p.cat, p.unit, p.cost, p.price, p.stock, p.minStock]); });
    }
    App.download("duka-mahiri-" + w + "-" + U.dateValue(App.now()) + ".csv", App.csv(rows), "text/csv;charset=utf-8");
  };
  App.acts.printReport = function () { App.go("ripoti"); setTimeout(function () { window.print(); }, 400); };
  App.acts.loadDemo2 = function () { App.acts.loadDemo(); };
  App.acts.wipeAll = function () {
    App.confirm("Hii itafuta mauzo, bidhaa, matumizi na madeni yote. Andika FUTA kuthibitisha.", { ok: "Futa yote", danger: true, type: "FUTA" }).then(function (ok) {
      if (ok) Store.clearAll(["shop", "settings"]).then(function () { Store.setMeta("demo", false); App.ui.cart = null; try { localStorage.removeItem("dm_cart"); } catch (e) {} location.hash = "#/leo"; location.reload(); });
    });
  };
  App.chg.importFile = function (el) {
    var f = el.files && el.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var j;
      try { j = JSON.parse(rd.result); } catch (e) { App.toast("Faili si sahihi", { bad: true }); return; }
      var ok = j && j.app === "duka-mahiri" && Array.isArray(j.sales) && Array.isArray(j.products);
      if (!ok) { App.toast("Hili si faili la nakala ya Duka Mahiri", { bad: true }); return; }
      var bad = j.sales.some(function (s) { return !s || !isFinite(s.ts) || !Array.isArray(s.lines); });
      if (bad) { App.toast("Faili lina mauzo yasiyo sahihi", { bad: true }); return; }
      App.confirm("Nakala ina mauzo " + j.sales.length + ", bidhaa " + j.products.length + ". Badilisha data yote iliyopo? (Hapana = unganisha na iliyopo)", { ok: "Badilisha yote" }).then(function (replace) {
        var meta = { demo: false };
        if (j.shop) meta.shop = j.shop;
        if (j.settings) meta.settings = j.settings;
        if (replace) {
          Store.replaceAll({ products: j.products, sales: j.sales, expenses: j.expenses || [], purchases: j.purchases || [] }, meta).then(function () { App.toast("Nakala imerudishwa"); });
        } else {
          var cur = App.data(), merge = function (a, b) { var m = {}; a.forEach(function (x) { m[x.id] = x; }); b.forEach(function (x) { m[x.id] = x; }); return Object.keys(m).map(function (k) { return m[k]; }); };
          Store.replaceAll({ products: merge(cur.products, j.products), sales: merge(cur.sales, j.sales), expenses: merge(cur.expenses, j.expenses || []), purchases: merge(cur.purchases, j.purchases || []) }, { demo: false }).then(function () { App.toast("Nakala imeunganishwa"); });
        }
      });
    };
    rd.readAsText(f);
  };

  /* ================= MIPANGILIO ================= */
  App.views.mipangilio = {
    title: "Mipangilio", back: "zaidi",
    render: function () {
      var sh = App.shop(), st = App.settings();
      return '<div class="card">' + App.field("Jina la duka", '<input type="text" id="sName" value="' + esc(sh.name) + '" maxlength="40">') +
        App.field("Asilimia ya faida kwa mauzo ya haraka", '<input type="number" inputmode="decimal" id="sMargin" value="' + st.marginPct + '" min="0" max="90">', "Hutumika kukadiria faida pale usipoweka gharama.") +
        App.field("Siku za kuagiza bidhaa (lead time)", '<input type="number" inputmode="numeric" id="sLead" value="' + st.leadDays + '" min="1" max="60">', "Bidhaa itaonyeshwa 'inaisha' ikitarajiwa kuisha ndani ya siku hizi.") +
        '<button class="btn primary block" data-act="saveSettings">Hifadhi</button></div>';
    }
  };
  App.acts.saveSettings = function () {
    var name = App.$("sName").value.trim() || "Duka langu";
    var m = Math.min(90, Math.max(0, App.num(App.$("sMargin").value))), l = Math.min(60, Math.max(1, Math.round(App.num(App.$("sLead").value) || 7)));
    Store.setMeta("shop", { name: name }); Store.setMeta("settings", { marginPct: m, leadDays: l });
    App.toast("Mipangilio imehifadhiwa");
  };
})();
