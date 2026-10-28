/* util.js: zana za jumla (pesa, tarehe za Kiswahili, kutoroka HTML). Hakuna utegemezi. */
(function (root) {
  "use strict";

  var DAYS = ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"];
  var DAYS_S = ["Jpili", "Jtatu", "Jnne", "Jtano", "Alh", "Ijum", "Jmosi"];
  var MONTHS = ["Januari", "Februari", "Machi", "Aprili", "Mei", "Juni", "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba"];
  var MONTHS_S = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"];
  var HOUR = 3600000, DAY = 86400000;

  var seq = 0;
  function id() {
    seq = (seq + 1) % 1679616;
    return Date.now().toString(36) + seq.toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function int(n) { return Math.round(+n || 0).toLocaleString("en-US"); }
  function money(n) { n = Math.round(+n || 0); return (n < 0 ? "-" : "") + "TSh " + Math.abs(n).toLocaleString("en-US"); }
  function compact(n) {
    var a = Math.abs(n), s = n < 0 ? "-" : "";
    if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return s + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "K";
    return s + Math.round(a);
  }
  function pct(v, d) { return ((+v || 0) * 100).toFixed(d == null ? 0 : d) + "%"; }
  // Badiliko la asilimia: null ikiwa hakuna msingi wa kulinganisha
  function delta(cur, prev) {
    if (!prev) return cur ? null : 0;
    return (cur - prev) / Math.abs(prev);
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }

  // ---- Tarehe (saa za simu) ----
  function startOf(ts, unit) {
    var d = new Date(ts);
    switch (unit) {
      case "hour": d.setMinutes(0, 0, 0); break;
      case "day": d.setHours(0, 0, 0, 0); break;
      case "week": d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); break; // Jumatatu
      case "month": d.setHours(0, 0, 0, 0); d.setDate(1); break;
      case "quarter": d.setHours(0, 0, 0, 0); d.setDate(1); d.setMonth(Math.floor(d.getMonth() / 3) * 3); break;
      case "year": d.setHours(0, 0, 0, 0); d.setMonth(0, 1); break;
    }
    return d.getTime();
  }
  function next(ts, unit) {
    var d = new Date(ts);
    switch (unit) {
      case "hour": d.setHours(d.getHours() + 1); break;
      case "day": d.setDate(d.getDate() + 1); break;
      case "week": d.setDate(d.getDate() + 7); break;
      case "month": d.setMonth(d.getMonth() + 1); break;
      case "quarter": d.setMonth(d.getMonth() + 3); break;
      case "year": d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.getTime();
  }
  function addDays(ts, n) { var d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); }
  function addMonths(ts, n) { var d = new Date(ts); d.setMonth(d.getMonth() + n); return d.getTime(); }
  function label(ts, unit) {
    var d = new Date(ts);
    switch (unit) {
      case "hour": return p2(d.getHours()) + ":00";
      case "day": return DAYS_S[d.getDay()] + " " + d.getDate() + " " + MONTHS_S[d.getMonth()];
      case "week": return "Wiki ya " + d.getDate() + " " + MONTHS_S[d.getMonth()];
      case "month": return MONTHS_S[d.getMonth()] + " " + d.getFullYear();
      case "quarter": return "Robo " + (Math.floor(d.getMonth() / 3) + 1) + " · " + d.getFullYear();
      case "year": return String(d.getFullYear());
    }
    return "";
  }
  function fmtDate(ts) { var d = new Date(ts); return p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function fmtTime(ts) { var d = new Date(ts); return p2(d.getHours()) + ":" + p2(d.getMinutes()); }
  function fmtDT(ts) { return fmtDate(ts) + " " + fmtTime(ts); }
  function dateValue(ts) { var d = new Date(ts); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function dtValue(ts) { return dateValue(ts) + "T" + fmtTime(ts); }
  // "2026-10-27" -> ms (saa sita mchana ya siku hiyo haitumiki; ni mwanzo wa siku)
  function parseDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : NaN;
  }
  function parseDT(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : NaN;
  }

  // Vipindi vya haraka. Kila kimoja: [from, to) kwa ms.
  function presetRange(key, now, minTs) {
    var sd = startOf(now, "day");
    switch (key) {
      case "leo": return { from: sd, to: addDays(sd, 1), label: "Leo" };
      case "jana": return { from: addDays(sd, -1), to: sd, label: "Jana" };
      case "siku7": return { from: addDays(sd, -6), to: addDays(sd, 1), label: "Siku 7" };
      case "siku30": return { from: addDays(sd, -29), to: addDays(sd, 1), label: "Siku 30" };
      case "wiki": var w = startOf(now, "week"); return { from: w, to: addDays(w, 7), label: "Wiki hii" };
      case "mwezi": var m = startOf(now, "month"); return { from: m, to: next(m, "month"), label: "Mwezi huu" };
      case "mwezijana": var m0 = startOf(now, "month"); return { from: addMonths(m0, -1), to: m0, label: "Mwezi uliopita" };
      case "robo": var q = startOf(now, "quarter"); return { from: q, to: next(q, "quarter"), label: "Robo hii" };
      case "mwaka": var y = startOf(now, "year"); return { from: y, to: next(y, "year"), label: "Mwaka huu" };
      case "yote": return { from: startOf(minTs || now, "day"), to: addDays(sd, 1), label: "Yote" };
    }
    return presetRange("siku30", now, minTs);
  }

  var U = {
    DAYS: DAYS, DAYS_S: DAYS_S, MONTHS: MONTHS, MONTHS_S: MONTHS_S, HOUR: HOUR, DAY: DAY,
    id: id, esc: esc, int: int, money: money, compact: compact, pct: pct, delta: delta, p2: p2,
    startOf: startOf, next: next, addDays: addDays, addMonths: addMonths, label: label,
    fmtDate: fmtDate, fmtTime: fmtTime, fmtDT: fmtDT, dateValue: dateValue, dtValue: dtValue,
    parseDate: parseDate, parseDT: parseDT, presetRange: presetRange
  };
  if (typeof module !== "undefined" && module.exports) module.exports = U;
  root.U = U;
})(typeof window !== "undefined" ? window : globalThis);
