/* views-hesabu.js: Funga siku. Mwenye duka anayehudumia peke yake hahitaji kuandika kila mauzo:
 * anahesabu bidhaa jioni, na mfumo unakokotoa mauzo yaliyokosekana (stoo ya mfumo - stoo halisi). */
(function () {
  "use strict";
  var U = window.U, App = window.App, Store = window.Store, esc = U.esc, money = U.money;
  var st = App.ui.hesabu = { q: "", only: false, counts: {} };

  function pending() {
    var out = [], pr = App.data().products;
    pr.forEach(function (p) {
      var v = st.counts[p.id];
      if (v === undefined || v === "") return;
      var n = App.num(v), diff = Math.round((p.stock - n) * 1000) / 1000;
      if (diff !== 0) out.push({ p: p, n: n, diff: diff });
    });
    return out;
  }
  function summary() {
    var ps = pending(), sold = ps.filter(function (x) { return x.diff > 0; }), over = ps.filter(function (x) { return x.diff < 0; });
    var tot = sold.reduce(function (a, x) { return a + x.diff * x.p.price; }, 0);
    return { sold: sold, over: over, tot: tot, n: Object.keys(st.counts).filter(function (k) { return st.counts[k] !== ""; }).length };
  }
  function box() {
    var s = summary();
    return '<div class="kpi hero"><div class="l">Mauzo yaliyokosekana</div><div class="v">' + money(s.tot) + '</div><div class="d">' + s.sold.length + " bidhaa zimepungua" + (s.over.length ? " · " + s.over.length + " zimeongezeka (zitarekebishwa)" : "") + "</div></div>" +
      '<button class="btn primary block" style="margin:10px 0" data-act="hesabuSave"' + (s.sold.length + s.over.length ? "" : " disabled") + ">Hifadhi hesabu</button>";
  }
  function rows() {
    var q = st.q.trim().toLowerCase();
    return App.data().products.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (p) {
      var v = st.counts[p.id] === undefined ? "" : st.counts[p.id], d = v === "" ? null : Math.round((p.stock - App.num(v)) * 1000) / 1000;
      return '<div class="li"><div class="main"><div class="t">' + esc(p.name) + '</div><div class="s">Mfumo: ' + U.int(p.stock) + (d ? " · " + (d > 0 ? "iliuzwa " + d : "ongezeko " + (-d)) : "") + '</div></div>' +
        '<input type="number" inputmode="decimal" style="width:84px;text-align:right" data-in="hesabuQty" data-id="' + p.id + '" value="' + esc(v) + '" placeholder="Hesabu"></div>';
    }).join("") || '<div class="empty">Hakuna bidhaa.</div>';
  }
  App.views.hesabu = {
    title: "Funga siku", back: "zaidi",
    render: function () {
      return '<div class="banner info">Hesabu kilichobaki dukani kwa kila bidhaa (acha tupu ambazo hujahesabu). Mfumo utaandika mauzo ya taslimu kwa bidhaa zilizopungua na kuzitoa stoo. Mauzo ya jumla yatakuwa sahihi; <b>saa ya kuuza</b> haitajulikana.</div>' +
        '<div id="hesBox">' + box() + '</div><div class="search"><input type="search" data-in="hesabuQ" placeholder="Tafuta bidhaa..." value="' + esc(st.q) + '"></div>' +
        '<div class="card flat"><div class="list" id="hesRows">' + rows() + "</div></div>";
    }
  };
  App.ins.hesabuQty = function (el) { st.counts[el.getAttribute("data-id")] = el.value; App.$("hesBox").innerHTML = box(); };
  App.ins.hesabuQ = function (el) { st.q = el.value; App.$("hesRows").innerHTML = rows(); };
  App.acts.hesabuSave = function () {
    var s = summary(), now = App.now();
    if (!s.sold.length && !s.over.length) return;
    App.confirm("Hifadhi hesabu? Mauzo ya " + money(s.tot) + " yataandikwa kama taslimu.", { ok: "Hifadhi" }).then(function (ok) {
      if (!ok) return;
      if (s.sold.length) {
        Store.put("sales", {
          id: U.id(), ts: now, inferred: true, pay: { method: "cash" }, payments: [], customer: "", phone: "", note: "Kutoka hesabu ya stoo (funga siku)",
          lines: s.sold.map(function (x) { return { pid: x.p.id, name: x.p.name, cat: x.p.cat || "Nyingine", qty: x.diff, price: x.p.price, cost: x.p.cost || 0 }; })
        });
      }
      s.sold.concat(s.over).forEach(function (x) {
        if (x.diff < 0) Store.put("purchases", { id: U.id(), ts: now, pid: x.p.id, qty: -x.diff, unitCost: x.p.cost, supplier: "", type: "adjust", note: "Hesabu ya jioni" });
        x.p.stock = x.n; Store.put("products", x.p);
      });
      st.counts = {}; App.toast("Hesabu imehifadhiwa"); App.go("leo");
    });
  };
})();
