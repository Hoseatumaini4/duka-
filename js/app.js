/* app.js: kipanga njia, uanzishaji, mwonekano (usiku/mchana), usakinishaji na service worker. */
(function () {
  "use strict";
  var U = window.U, App = window.App, Store = window.Store;
  var $ = App.$, TABS = ["leo", "uza", "stoo", "ripoti", "zaidi"];
  var deferredInstall = null;

  function parse() {
    var h = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
    return App.views[h] ? h : "leo";
  }
  function tabOf(route) {
    if (TABS.indexOf(route) >= 0) return route;
    var v = App.views[route];
    return v && v.back ? tabOf(v.back) : "leo";
  }
  function header() {
    $("shopName").textContent = App.shop().name || "Duka Mahiri";
    var n = new Date(App.now());
    $("todayLine").textContent = U.DAYS[n.getDay()] + ", " + U.fmtDate(n.getTime());
  }
  var current = null;

  App.render = function (opt) {
    opt = opt || {};
    var v = App.views[App.route] || App.views.leo, view = $("view");
    // Usivuruge ujazaji wa fomu au dirisha lililo wazi (isipokuwa uonyeshaji upya wa lazima)
    if (opt.soft) {
      var ae = document.activeElement;
      if (App.sheetOpen() || !$("dialog").classList.contains("hidden")) return;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && view.contains(ae)) return;
    }
    var y = window.scrollY;
    try { view.innerHTML = v.render(); }
    catch (e) { console.error(e); view.innerHTML = '<div class="card"><div class="empty">Hitilafu imetokea kwenye skrini hii. Rudi nyuma au pakia upya.</div></div>'; }
    if (v.after) try { v.after(view); } catch (e2) { console.error(e2); }
    var tab = tabOf(App.route);
    document.querySelectorAll(".tabbar [data-tab]").forEach(function (b) {
      var on = b.getAttribute("data-tab") === tab;
      b.classList.toggle("on", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    $("backBtn").classList.toggle("hidden", !v.back);
    document.title = (v.title ? v.title + " · " : "") + "Duka Mahiri";
    header();
    if (opt.keepScroll || opt.soft) window.scrollTo(0, y);
  };

  App.go = function (route, o) {
    if (!App.views[route]) route = "leo";
    if (location.hash === "#/" + route) { navigate(); return; }
    location.hash = "#/" + route;
  };
  function navigate() {
    var r = parse();
    if (current && current !== r) {
      var old = App.views[current];
      if (old && old.leave) try { old.leave(); } catch (e) {}
      if (App.sheetOpen()) App.closeSheet();
      window.scrollTo(0, 0);
    }
    App.route = r; current = r;
    App.render();
  }
  window.addEventListener("hashchange", navigate);

  App.acts.go = function (el) {
    var to = el.getAttribute("data-to"), t2 = el.getAttribute("data-tab2");
    if (t2 && to === "ripoti" && App.ui.rep) App.ui.rep.tab = t2;
    App.go(to);
  };
  App.acts.back = function () {
    var v = App.views[App.route];
    App.go(v && v.back ? v.back : "leo");
  };

  /* ---------- Mwonekano ---------- */
  function applyMode(m) {
    if (m) document.documentElement.setAttribute("data-mode", m); else document.documentElement.removeAttribute("data-mode");
    var dark = m ? m === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (x) { x.removeAttribute("media"); });
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = dark ? "#0c1411" : "#f3f5f2";
  }
  try { var sm = localStorage.getItem("dm_mode"); if (sm) applyMode(sm); } catch (e) {}
  App.acts.mode = function () {
    var cur = document.documentElement.getAttribute("data-mode") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var nx = cur === "dark" ? "light" : "dark";
    applyMode(nx);
    try { localStorage.setItem("dm_mode", nx); } catch (e) {}
  };

  /* ---------- Usakinishaji ---------- */
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferredInstall = e; $("installBtn").classList.remove("hidden");
  });
  window.addEventListener("appinstalled", function () { deferredInstall = null; $("installBtn").classList.add("hidden"); App.toast("Imesakinishwa"); });
  App.acts.install = function () {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    deferredInstall.userChoice.finally(function () { deferredInstall = null; $("installBtn").classList.add("hidden"); });
  };

  /* ---------- Kuanza ---------- */
  Store.onError(function () { App.toast("Imeshindikana kuhifadhi. Nafasi ya simu inaweza kuwa imejaa. Pakua nakala sasa.", { bad: true, ms: 7000 }); });
  Store.init().then(function () {
    Store.on(function () { App.render({ soft: true }); });
    navigate();
    setInterval(function () { App.render({ soft: true }); }, 60000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) App.render({ soft: true }); });
  }).catch(function (e) {
    console.error(e);
    $("view").innerHTML = '<div class="card"><div class="empty">Imeshindikana kufungua hifadhi ya data. Funga dirisha la faragha au ruhusu hifadhi ya tovuti.</div></div>';
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
