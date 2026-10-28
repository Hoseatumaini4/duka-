/* demo.js: data ya mfano ya duka la mtaani (siku 120), kwa kujaribu programu.
 * Inatoa matokeo yale yale kila mara (seed thabiti). Futa kabla ya kutumia data halisi. */
(function (root) {
  "use strict";
  var U = (typeof require !== "undefined" && typeof module !== "undefined" && module.exports) ? require("./util.js") : root.U;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // [jina, aina, kipimo, bei ya kununua, bei ya kuuza, uzito wa kuuzwa, upendeleo wa saa, kiwango cha chini]
  var CATALOG = [
    ["Sukari (kg)", "Vyakula", "kg", 2600, 3000, 11, "m", 15],
    ["Mchele (kg)", "Vyakula", "kg", 2200, 2600, 9, "a", 20],
    ["Unga wa sembe (kg)", "Vyakula", "kg", 1600, 2000, 8, "a", 20],
    ["Unga wa ngano (kg)", "Vyakula", "kg", 2300, 2700, 4, "a", 10],
    ["Mafuta ya kula (lita)", "Vyakula", "lita", 5200, 6000, 6, "a", 8],
    ["Chumvi (pakti)", "Vyakula", "pakti", 500, 800, 6, "a", 10],
    ["Maharage (kg)", "Vyakula", "kg", 2400, 3000, 5, "a", 10],
    ["Yai (kimoja)", "Vyakula", "kimoja", 330, 400, 12, "m", 60],
    ["Mkate (kipande)", "Vyakula", "kipande", 1800, 2200, 9, "m", 15],
    ["Maziwa (pakti)", "Vyakula", "pakti", 1100, 1400, 6, "m", 12],
    ["Majani ya chai (pakti)", "Vyakula", "pakti", 400, 600, 5, "m", 10],
    ["Soda (chupa)", "Vinywaji", "chupa", 700, 1000, 13, "e", 24],
    ["Maji ya chupa", "Vinywaji", "chupa", 600, 1000, 10, "e", 24],
    ["Juisi (chupa)", "Vinywaji", "chupa", 900, 1500, 4, "e", 12],
    ["Sabuni ya kipande", "Usafi", "kipande", 1200, 1500, 7, "a", 10],
    ["Sabuni ya unga", "Usafi", "pakti", 1800, 2200, 5, "a", 8],
    ["Dawa ya meno", "Usafi", "kimoja", 1900, 2500, 3, "a", 6],
    ["Karatasi ya choo", "Usafi", "kimoja", 900, 1300, 3, "a", 8],
    ["Biskuti (pakti)", "Vitafunwa", "pakti", 400, 600, 9, "e", 20],
    ["Pipi (moja)", "Vitafunwa", "kimoja", 50, 100, 14, "e", 100],
    ["Chipsi (pakti)", "Vitafunwa", "pakti", 700, 1000, 5, "e", 10],
    ["Kibiriti", "Mengineyo", "kimoja", 100, 200, 8, "a", 20],
    ["Vocha ya simu", "Mengineyo", "kimoja", 970, 1000, 10, "a", 30],
    ["Betri", "Mengineyo", "jozi", 800, 1200, 2, "a", 4],
    ["Daftari", "Mengineyo", "kimoja", 900, 1500, 2, "a", 4]
  ];
  var CUSTOMERS = [
    ["Mama Neema", "0712345678"], ["Baba Juma", "0754111222"], ["Mzee Hassan", "0765222333"],
    ["Bi Asha", "0713999000"], ["Kaka Peter", "0688123456"], ["Mama Zuhura", "0622555777"]
  ];
  var PAY = [["cash", 0.62], ["mpesa", 0.17], ["airtel", 0.05], ["tigo", 0.04], ["halotel", 0.02], ["mkopo", 0.10]];

  function pick(r, pairs) {
    var x = r(), c = 0;
    for (var i = 0; i < pairs.length; i++) { c += pairs[i][1]; if (x < c) return pairs[i][0]; }
    return pairs[pairs.length - 1][0];
  }
  function hourOf(r) {
    // 6:30-22:00; kilele asubuhi (25%), mchana (30%) na jioni (45%)
    var x = r(), p = x < 0.25 ? [7.6, 0.9] : (x < 0.55 ? [13, 1.1] : [18.6, 1.5]);
    var h = p[0] + (r() + r() + r() - 1.5) * 2 * p[1];
    return Math.min(21.9, Math.max(6.5, h));
  }

  function generate(now, seed) {
    var r = rng(seed || 20261027);
    var today = U.startOf(now, "day");
    var DAYS = 120, start = U.addDays(today, -DAYS);
    var products = CATALOG.map(function (c, i) {
      return { id: "p" + (i + 1), name: c[0], cat: c[1], unit: c[2], cost: c[3], price: c[4], stock: 0, minStock: c[7], created: start, w: c[5], tod: c[6], baseCost: c[3], basePrice: c[4] };
    });
    var sales = [], expenses = [], purchases = [], n = 0, custPay = {};
    var stock = {};
    products.forEach(function (p) { stock[p.id] = Math.round(p.minStock * 4 + r() * p.minStock * 2); });

    var wdF = [0.95, 0.92, 0.95, 1.0, 1.1, 1.3, 0.9]; // Jumatatu..Jumapili
    for (var d = 0; d < DAYS; d++) {
      var day = U.addDays(start, d), dt = new Date(day), wd = (dt.getDay() + 6) % 7, dom = dt.getDate();
      // bei zinapanda taratibu: sukari/mafuta baada ya siku 60
      products.forEach(function (p) {
        if (d === 60 && p.name.indexOf("Sukari") === 0) { p.cost = 2800; p.price = 3200; }
        if (d === 85 && p.name.indexOf("Mafuta") === 0) { p.cost = 5600; p.price = 6300; }
      });
      var boost = (dom >= 25 || dom <= 3) ? 1.18 : 1;
      var trend = 1 + 0.0025 * d;
      var count = Math.max(8, Math.round(38 * wdF[wd] * boost * trend * (0.88 + r() * 0.24)));
      var eod = d === DAYS - 1 ? now : U.addDays(day, 1);
      for (var k = 0; k < count; k++) {
        var hr = hourOf(r), ts = day + Math.round(hr * 3600000) + Math.floor(r() * 60000);
        if (ts > now) continue;
        var nl = 1 + (r() < 0.55 ? 0 : (r() < 0.6 ? 1 : (r() < 0.6 ? 2 : 3)));
        var lines = [], used = {};
        for (var li = 0; li < nl; li++) {
          // chagua bidhaa kwa uzito na upendeleo wa saa
          var total = 0, ws = products.map(function (p) {
            var w = p.w;
            if (p.name === "Betri" || p.name === "Daftari") w = d > 70 ? 0 : 0.25;
            if (p.tod === "m" && hr < 10.5) w *= 2.2;
            if (p.tod === "e" && hr >= 16) w *= 1.9;
            if (used[p.id]) w = 0;
            total += w; return w;
          });
          var x = r() * total, idx = 0, c = 0;
          for (; idx < ws.length; idx++) { c += ws[idx]; if (x < c) break; }
          var p = products[Math.min(idx, products.length - 1)];
          used[p.id] = true;
          var q = 1 + (r() < 0.45 ? 0 : (r() < 0.6 ? 1 : 2));
          if (p.name.indexOf("Pipi") === 0) q = 1 + Math.floor(r() * 8);
          if (p.name.indexOf("Yai") === 0) q = 1 + Math.floor(r() * 6);
          if (p.name.indexOf("Vocha") === 0) q = r() < 0.7 ? 1 : 2 + Math.floor(r() * 4);
          var price = p.price;
          if (r() < 0.04) price = Math.round(price * 0.95 / 50) * 50; // punguzo kidogo
          lines.push({ pid: p.id, name: p.name, cat: p.cat, qty: q, price: price, cost: p.cost });
          stock[p.id] -= q;
        }
        var method = pick(r, PAY), cust = "", phone = "", paid = 0;
        if (method === "mkopo") {
          var cu = CUSTOMERS[Math.floor(Math.pow(r(), 1.6) * CUSTOMERS.length)];
          cust = cu[0]; phone = cu[1];
          if (r() < 0.25) paid = 1000 * Math.floor(r() * 3);
        }
        n++;
        sales.push({ id: "s" + n, ts: ts, lines: lines, pay: method === "mkopo" ? { method: method, paid: paid } : { method: method }, payments: [], customer: cust, phone: phone, note: "" });
      }
      // marejesho ya madeni (baadhi ya wateja hulipa, wengine hawalipi)
      if (wd === 5 && d > 10) {
        CUSTOMERS.forEach(function (cu, ci) {
          if (ci >= 4 && r() < 0.85) return; // Kaka Peter na Mama Zuhura hawalipi mara nyingi
          if (r() < 0.7) {
            var owed = sales.filter(function (s) { return s.customer === cu[0] && s.pay.method === "mkopo" && s.ts < day + 14 * 3600000; })
              .sort(function (a, b) { return a.ts - b.ts; });
            var amt = 20000 + 5000 * Math.floor(r() * 13), left = amt;
            for (var oi = 0; oi < owed.length && left > 0; oi++) {
              var s = owed[oi], o = outstandingLocal(s);
              if (o <= 0) continue;
              var a = Math.min(left, o);
              var pts = day + 15 * 3600000 + Math.floor(r() * 3600000);
              if (pts > now) break;
              s.payments.push({ ts: pts, amt: a, method: r() < 0.6 ? "cash" : "mpesa" });
              left -= a;
            }
          }
        });
      }
      // ununuzi (kuongeza stoo)
      products.forEach(function (p) {
        var skip = (d > DAYS - 9) && (p.name.indexOf("Sukari") === 0 || p.name.indexOf("Maji") === 0);
        if (stock[p.id] <= p.minStock && !skip && r() < 0.9) {
          var q = Math.round(p.minStock * (3 + r() * 2));
          if (p.name === "Betri" || p.name === "Daftari") q = d < 40 ? q : 0;
          if (q > 0) {
            purchases.push({ id: "b" + (purchases.length + 1), ts: day + 8 * 3600000 + Math.floor(r() * 3600000), pid: p.id, qty: q, unitCost: p.cost, supplier: "Jumla Mwanza Wholesalers", type: "restock", note: "" });
            stock[p.id] += q;
          }
        }
      });
      // matumizi
      var ex = function (cat, amt, note, hh) { expenses.push({ id: "e" + (expenses.length + 1), ts: day + (hh || 9) * 3600000, cat: cat, amount: amt, note: note || "" }); };
      if (dom === 1) ex("Kodi ya chumba", 150000, "Kodi ya mwezi");
      if (dom === 10) ex("Umeme", 38000 + Math.round(r() * 14000), "LUKU");
      if (dom === 12) ex("Maji", 9000 + Math.round(r() * 3000), "");
      if (dom === 28) ex("Mshahara", 200000, "Msaidizi wa duka");
      if (wd === 0 && r() < 0.8) ex("Usafiri", 12000 + 1000 * Math.floor(r() * 8), "Kwenda sokoni");
      if (dom === 15) ex("Intaneti na vocha", 12000, "");
      if (d === 20) ex("Leseni na ushuru", 50000, "Leseni ya biashara");
      if (r() < 0.05) ex("Mengineyo", 3000 + 1000 * Math.floor(r() * 8), "Mfuko wa plastiki / kalamu");
    }
    // salio la mwisho la stoo
    products.forEach(function (p) {
      p.stock = Math.max(0, Math.round(stock[p.id]));
      delete p.w; delete p.tod; delete p.baseCost; delete p.basePrice;
    });
    sales.sort(function (a, b) { return a.ts - b.ts; });
    purchases.sort(function (a, b) { return a.ts - b.ts; });
    expenses.sort(function (a, b) { return a.ts - b.ts; });
    return { products: products, sales: sales, expenses: expenses, purchases: purchases };
  }
  function outstandingLocal(s) {
    var t = 0; s.lines.forEach(function (l) { t += l.qty * l.price; });
    var p = 0; s.payments.forEach(function (x) { p += x.amt; });
    return t - (s.pay.paid || 0) - p;
  }

  var Demo = { generate: generate };
  if (typeof module !== "undefined" && module.exports) module.exports = Demo;
  root.Demo = Demo;
})(typeof window !== "undefined" ? window : globalThis);
