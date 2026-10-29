// Hutengeneza data ya mfano, na kuandika matokeo ya injini ya BI kwa JSON ili yalinganishwe na hesabu huru ya Python.
const U = require("../js/util.js"), BI = require("../js/bi.js"), Demo = require("../js/demo.js");
const fs = require("fs");
const now = new Date(2026, 9, 27, 15, 20).getTime();       // 27 Okt 2026 15:20 (saa za mahali)
const data = Demo.generate(now, 20261027);
fs.writeFileSync(process.argv[2] + "/data.json", JSON.stringify({ now, data }));
const sd = U.startOf(now, "day");
const out = {};
// 1. Muhtasari wa kila mwezi
out.months = {};
const m0 = U.startOf(now, "month");
for (let k = 4; k >= 0; k--) {
  const from = U.addMonths(m0, -k), to = U.next(from, "month");
  const s = BI.summary(data, from, to);
  out.months[new Date(from).getFullYear() + "-" + U.p2(new Date(from).getMonth() + 1)] = s;
}
// 2. Siku 30 zilizopita
const r30 = { from: U.addDays(sd, -29), to: U.addDays(sd, 1) };
out.d30 = BI.summary(data, r30.from, r30.to);
out.top = BI.byProduct(data, r30.from, r30.to).slice(0, 8).map(p => ({ name: p.name, rev: p.rev, profit: p.profit, qty: p.qty, abc: p.abc }));
out.cats = BI.byCategory(data, r30.from, r30.to).map(c => ({ name: c.name, rev: c.rev, profit: c.profit }));
out.pay = BI.payMix(data, r30.from, r30.to).map(c => ({ method: c.method, total: c.total }));
const tp = BI.timeProfile(data, r30.from, r30.to, now);
out.hours = tp.hours.map(h => h.sales);
out.weekdays = tp.weekdays.map(w => ({ sales: w.sales, n: w.n }));
// 3. Madeni
out.credits = BI.credits(data, now).map(c => ({ name: c.name, owed: c.owed, ageDays: c.ageDays }));
// 4. Mfululizo wa siku, na jumla yake lazima ilingane na muhtasari
const ser = BI.series(data, r30.from, r30.to, "day");
out.seriesSum = ser.reduce((a, b) => a + b.sales, 0);
out.seriesLen = ser.length;
// 5. Stoo
const info = BI.stockInfo(data, now, 28, 7);
out.stock = info.map(x => ({ id: x.product.id, stock: x.product.stock, daily: x.daily, status: x.status }));
out.fc = BI.forecast(data, now, 7);
out.counts = { products: data.products.length, sales: data.sales.length, expenses: data.expenses.length, purchases: data.purchases.length };
fs.writeFileSync(process.argv[2] + "/bi.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.counts), "d30 sales:", Math.round(out.d30.sales), "insights:", BI.insights(data, now).length);
BI.insights(data, now).forEach(i => console.log(" -", i.type, "|", i.title, "|", i.text));
