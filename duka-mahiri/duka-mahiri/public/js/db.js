/* db.js: hifadhi ya data kwenye simu (IndexedDB), na nakala kamili kwenye kumbukumbu kwa kasi.
 * Ikiwa IndexedDB haipatikani, hutumia localStorage kama dharura. */
(function (root) {
  "use strict";

  var NAMES = ["products", "sales", "expenses", "purchases"];
  var st = { products: [], sales: [], expenses: [], purchases: [] };
  var meta = {};
  var idb = null, fallback = false, listeners = [], version = 0, notifyQueued = false, saveTimer = null;
  var onError = function () {};

  function open() {
    return new Promise(function (res) {
      if (!root.indexedDB) return res(null);
      var rq;
      try { rq = root.indexedDB.open("duka-mahiri", 1); } catch (e) { return res(null); }
      rq.onupgradeneeded = function (e) {
        var db = e.target.result;
        NAMES.forEach(function (n) { if (!db.objectStoreNames.contains(n)) db.createObjectStore(n, { keyPath: "id" }); });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { res(null); };
      rq.onblocked = function () { res(null); };
    });
  }
  function getAll(store) {
    return new Promise(function (res, rej) {
      var rq = idb.transaction(store, "readonly").objectStore(store).getAll();
      rq.onsuccess = function () { res(rq.result || []); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  function run(store, fn) {
    if (!idb) return;
    try {
      var tx = idb.transaction(store, "readwrite");
      fn(tx.objectStore(store));
      tx.onerror = tx.onabort = function () { onError(tx.error); };
    } catch (e) { onError(e); }
  }
  function loadFallback() {
    try {
      var b = JSON.parse(localStorage.getItem("dm_blob") || "null");
      if (b) { NAMES.forEach(function (n) { st[n] = b[n] || []; }); meta = b.meta || {}; }
    } catch (e) {}
  }
  function saveFallback() {
    if (!fallback) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem("dm_blob", JSON.stringify({ products: st.products, sales: st.sales, expenses: st.expenses, purchases: st.purchases, meta: meta })); }
      catch (e) { onError(e); }
    }, 400);
  }
  function changed() {
    version++;
    saveFallback();
    if (notifyQueued) return;
    notifyQueued = true;
    Promise.resolve().then(function () {
      notifyQueued = false;
      listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
    });
  }

  function init() {
    return open().then(function (db) {
      idb = db;
      if (!idb) { fallback = true; loadFallback(); return; }
      return Promise.all(NAMES.concat(["meta"]).map(getAll)).then(function (rs) {
        NAMES.forEach(function (n, i) { st[n] = rs[i]; });
        rs[4].forEach(function (m) { meta[m.key] = m.value; });
      });
    }).then(function () {
      if (root.navigator && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    });
  }

  function idx(arr, id) { for (var i = arr.length - 1; i >= 0; i--) if (arr[i].id === id) return i; return -1; }
  function put(store, obj) {
    var a = st[store], i = idx(a, obj.id);
    if (i >= 0) a[i] = obj; else a.push(obj);
    run(store, function (s) { s.put(obj); });
    changed();
    return obj;
  }
  function del(store, id) {
    var a = st[store], i = idx(a, id);
    if (i >= 0) a.splice(i, 1);
    run(store, function (s) { s.delete(id); });
    changed();
  }
  function setMeta(key, value) {
    meta[key] = value;
    run("meta", function (s) { s.put({ key: key, value: value }); });
    changed();
  }
  function getMeta(key, dflt) { return meta[key] === undefined ? dflt : meta[key]; }

  // Badilisha data yote (kuingiza nakala au data ya mfano)
  function replaceAll(data, newMeta) {
    return new Promise(function (resolve) {
      NAMES.forEach(function (n) { st[n] = (data[n] || []).slice(); });
      if (newMeta) { Object.keys(newMeta).forEach(function (k) { meta[k] = newMeta[k]; }); }
      if (!idb) { changed(); return resolve(); }
      try {
        var tx = idb.transaction(NAMES.concat(["meta"]), "readwrite");
        NAMES.forEach(function (n) {
          var s = tx.objectStore(n); s.clear();
          st[n].forEach(function (o) { s.put(o); });
        });
        var ms = tx.objectStore("meta"); ms.clear();
        Object.keys(meta).forEach(function (k) { ms.put({ key: k, value: meta[k] }); });
        tx.oncomplete = function () { changed(); resolve(); };
        tx.onerror = tx.onabort = function () { onError(tx.error); changed(); resolve(); };
      } catch (e) { onError(e); changed(); resolve(); }
    });
  }
  function clearAll(keepMeta) {
    var keep = {};
    (keepMeta || []).forEach(function (k) { if (meta[k] !== undefined) keep[k] = meta[k]; });
    Object.keys(meta).forEach(function (k) { delete meta[k]; });
    return replaceAll({}, keep);
  }

  function snapshot() {
    return {
      app: "duka-mahiri", v: 1, exported: Date.now(),
      shop: getMeta("shop", {}), settings: getMeta("settings", {}),
      products: st.products, sales: st.sales, expenses: st.expenses, purchases: st.purchases
    };
  }

  root.Store = {
    init: init, data: st, put: put, del: del, meta: getMeta, setMeta: setMeta,
    replaceAll: replaceAll, clearAll: clearAll, snapshot: snapshot,
    on: function (f) { listeners.push(f); },
    onError: function (f) { onError = f; },
    version: function () { return version; },
    mode: function () { return fallback ? "localStorage" : "IndexedDB"; }
  };
})(typeof window !== "undefined" ? window : globalThis);
