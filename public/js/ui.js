/* ui.js: vipengele vya pamoja (dirisha la chini, arifa fupi, uthibitisho, vitendo vya kubonyeza). */
(function (root) {
  "use strict";
  var U = root.U;
  var $ = function (id) { return document.getElementById(id); };

  var App = root.App = {
    ui: {},            // hali ya muda ya skrini (kapu, vichujio, n.k.)
    views: {},         // kila skrini: {title, render(), after()}
    acts: {},          // data-act="jina" -> function(el, event)
    ins: {},           // data-in="jina" -> function(el)   (input)
    chg: {},           // data-chg="jina" -> function(el)  (change)
    route: "leo",
    $: $,
    now: function () { return Date.now(); },
    num: function (v) {
      var n = parseFloat(String(v == null ? "" : v).replace(/,/g, "").trim());
      return isFinite(n) ? n : 0;
    },
    data: function () { return Store.data; },
    _memo: {},
    memo: function (key, fn) {
      var v = Store.version(), m = App._memo[key];
      if (m && m.v === v) return m.r;
      var r = fn();
      App._memo[key] = { v: v, r: r };
      return r;
    },
    shop: function () { return Object.assign({ name: "Duka langu" }, Store.meta("shop", {})); },
    settings: function () { return Object.assign({ marginPct: 20, leadDays: 7 }, Store.meta("settings", {})); }
  };

  /* ---------- Arifa fupi ---------- */
  var toastTimer;
  App.toast = function (msg, opt) {
    opt = opt || {};
    var t = $("toast");
    t.innerHTML = "<span>" + U.esc(msg) + "</span>" + (opt.action ? '<button type="button" data-act="toast-action">' + U.esc(opt.label || "Tendua") + "</button>" : "");
    t.className = "toast show" + (opt.bad ? " bad" : "");
    App._toastAction = opt.action || null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast"; }, opt.ms || 3200);
  };
  App.acts["toast-action"] = function () {
    var f = App._toastAction; App._toastAction = null;
    $("toast").className = "toast";
    if (f) f();
  };

  /* ---------- Dirisha la chini (sheet) ---------- */
  var lastFocus = null;
  App.sheet = function (title, html, onMount) {
    lastFocus = document.activeElement;
    $("sheetTitle").textContent = title;
    $("sheetBody").innerHTML = html;
    $("sheet").classList.remove("hidden");
    document.body.classList.add("noscroll");
    $("sheetBody").scrollTop = 0;
    if (onMount) onMount($("sheetBody"));
    var f = $("sheetBody").querySelector("[autofocus]");
    if (f) setTimeout(function () { f.focus(); }, 60);
  };
  App.closeSheet = function () {
    $("sheet").classList.add("hidden");
    $("sheetBody").innerHTML = "";
    if (!$("dialog") || $("dialog").classList.contains("hidden")) document.body.classList.remove("noscroll");
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  };
  App.sheetOpen = function () { return !$("sheet").classList.contains("hidden"); };
  App.acts["sheet-close"] = function () { App.closeSheet(); };

  /* ---------- Uthibitisho ---------- */
  App.confirm = function (msg, o) {
    o = o || {};
    return new Promise(function (resolve) {
      var d = $("dialog");
      d.innerHTML = '<div class="dlg" role="alertdialog" aria-modal="true"><p>' + U.esc(msg) + "</p>" +
        (o.type ? '<input id="dlgInput" type="text" autocomplete="off" placeholder="' + U.esc(o.type) + '">' : "") +
        '<div class="dlg-row"><button type="button" class="btn" id="dlgNo">Hapana</button>' +
        '<button type="button" class="btn ' + (o.danger ? "danger" : "primary") + '" id="dlgYes">' + U.esc(o.ok || "Ndiyo") + "</button></div></div>";
      d.classList.remove("hidden");
      var done = function (v) { d.classList.add("hidden"); d.innerHTML = ""; resolve(v); };
      $("dlgNo").onclick = function () { done(false); };
      $("dlgYes").onclick = function () {
        if (o.type && ($("dlgInput").value || "").trim().toUpperCase() !== o.type.toUpperCase()) { $("dlgInput").classList.add("err"); return; }
        done(true);
      };
      if ($("dlgInput")) $("dlgInput").focus(); else $("dlgNo").focus();
    });
  };

  /* ---------- Vitendo vya jumla ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!el) return;
    var h = App.acts[el.getAttribute("data-act")];
    if (h) { e.preventDefault(); h(el, e); }
  });
  document.addEventListener("input", function (e) {
    var el = e.target.closest ? e.target.closest("[data-in]") : null;
    if (el && App.ins[el.getAttribute("data-in")]) App.ins[el.getAttribute("data-in")](el);
  });
  document.addEventListener("change", function (e) {
    var el = e.target.closest ? e.target.closest("[data-chg]") : null;
    if (el && App.chg[el.getAttribute("data-chg")]) App.chg[el.getAttribute("data-chg")](el);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!$("dialog").classList.contains("hidden")) { $("dlgNo") && $("dlgNo").click(); return; }
      if (App.sheetOpen()) App.closeSheet();
    }
  });

  /* ---------- Zana za fomu na ujumbe ---------- */
  App.field = function (label, inner, hint) {
    return '<label class="fld"><span>' + U.esc(label) + "</span>" + inner + (hint ? '<small>' + U.esc(hint) + "</small>" : "") + "</label>";
  };
  App.methodNames = { cash: "Taslimu", mpesa: "M-Pesa", airtel: "Airtel Money", tigo: "Tigo Pesa", halotel: "Halotel", mkopo: "Mkopo (deni)", samehe: "Samehe" };
  App.methodShort = { cash: "Taslimu", mpesa: "M-Pesa", airtel: "Airtel", tigo: "Tigo", halotel: "Halotel", mkopo: "Mkopo" };

  // Namba ya simu ya Tanzania kwa wa.me (255...)
  App.phoneIntl = function (p) {
    var d = String(p || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
    if (/^0\d{9}$/.test(d)) d = "255" + d.slice(1);
    return /^\d{9,15}$/.test(d) ? d : "";
  };

  // Pakua faili (au shiriki kwenye simu ikiwa download haifanyi kazi)
  App.download = function (name, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    try {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    } catch (e) { App.toast("Imeshindikana kupakua", { bad: true }); }
  };
  App.csv = function (rows) {
    return "﻿" + rows.map(function (r) {
      return r.map(function (c) {
        c = c == null ? "" : String(c);
        return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(",");
    }).join("\r\n");
  };
})(window);
