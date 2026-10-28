/* charts.js: chati za SVG/HTML bila maktaba za nje (zinafanya kazi offline). */
(function (root) {
  "use strict";
  var U = root.U;

  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * p;
  }

  /* Nguzo za mauzo. rows: [{key,label,v,v2?,ghost?}]. v2 huchorwa kama mstari (faida). */
  function bars(rows, o) {
    o = o || {};
    if (!rows.length) return '<div class="empty">Hakuna data kwenye kipindi hiki.</div>';
    var W = 640, H = o.h || 210, pl = 46, pr = 8, pt = 12, pb = 28, n = rows.length;
    var max = 0;
    rows.forEach(function (r) { max = Math.max(max, r.v || 0, r.v2 || 0, r.ghost || 0, r.high || 0); });
    max = niceMax(max);
    var iw = W - pl - pr, ih = H - pt - pb, bw = iw / n, gap = Math.min(bw * 0.22, 6), x0 = pl;
    var y = function (v) { return pt + ih - (Math.max(0, v) / max) * ih; };
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + U.esc(o.aria || "Chati") + '">';
    for (var t = 0; t <= 4; t++) {
      var gv = max * t / 4, gy = y(gv);
      s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + gy + '" y2="' + gy + '"/>' +
           '<text class="ax" x="' + (pl - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + U.compact(gv) + "</text>";
    }
    var step = Math.max(1, Math.ceil(n / (o.maxLabels || 8)));
    var pts = [];
    rows.forEach(function (r, i) {
      var x = x0 + i * bw, cx = x + bw / 2, h = ih - (y(r.v || 0) - pt);
      var act = o.act ? ' data-act="' + o.act + '" data-key="' + U.esc(r.key) + '"' : "";
      s += '<g class="col"' + act + ">" +
           '<rect class="hit" x="' + x + '" y="' + pt + '" width="' + bw + '" height="' + ih + '"/>';
      if (r.ghost != null) s += '<rect class="bar ghost" x="' + (x + gap) + '" y="' + y(r.ghost) + '" width="' + Math.max(1, bw - gap * 2) + '" height="' + Math.max(0, ih - (y(r.ghost) - pt)) + '"/>';
      s += '<rect class="bar' + (r.cls ? " " + r.cls : "") + '" x="' + (x + gap) + '" y="' + y(r.v || 0) + '" width="' + Math.max(1, bw - gap * 2) + '" height="' + Math.max(0, h) + '" rx="2"/>';
      if (r.low != null && r.high != null) {
        s += '<line class="whisk" x1="' + cx + '" x2="' + cx + '" y1="' + y(r.low) + '" y2="' + y(r.high) + '"/>' +
             '<line class="whisk" x1="' + (cx - 4) + '" x2="' + (cx + 4) + '" y1="' + y(r.high) + '" y2="' + y(r.high) + '"/>' +
             '<line class="whisk" x1="' + (cx - 4) + '" x2="' + (cx + 4) + '" y1="' + y(r.low) + '" y2="' + y(r.low) + '"/>';
      }
      s += "<title>" + U.esc(r.label) + ": " + U.money(r.v || 0) + (r.v2 != null ? " · faida " + U.money(r.v2) : "") + "</title></g>";
      if (r.v2 != null) pts.push(cx + "," + y(r.v2));
      if (i % step === 0) s += '<text class="ax" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + U.esc(r.short || r.label) + "</text>";
    });
    if (pts.length > 1) s += '<polyline class="line" points="' + pts.join(" ") + '"/>';
    else if (pts.length === 1) { var q = pts[0].split(","); s += '<circle class="dot" cx="' + q[0] + '" cy="' + q[1] + '" r="3"/>'; }
    return s + "</svg>";
  }

  /* Orodha ya nguzo za mlalo (cheo cha bidhaa, aina, n.k.) */
  function hbars(items, o) {
    o = o || {};
    if (!items.length) return '<div class="empty">Hakuna data.</div>';
    var max = 0;
    items.forEach(function (i) { max = Math.max(max, i.v); });
    return '<div class="hbs">' + items.map(function (i) {
      var w = max ? Math.max(1.5, i.v / max * 100) : 0;
      var act = i.act ? ' data-act="' + i.act + '" data-key="' + U.esc(i.key || "") + '"' : "";
      return '<div class="hb' + (i.act ? " tap" : "") + '"' + act + '>' +
        '<div class="hb-top"><span class="hb-name">' + (i.badge ? '<b class="badge ' + (i.badgeCls || "") + '">' + U.esc(i.badge) + "</b> " : "") + U.esc(i.name) + '</span>' +
        '<span class="hb-val">' + U.esc(i.val) + "</span></div>" +
        '<div class="hb-track"><i class="' + (i.cls || "") + '" style="width:' + w.toFixed(1) + '%"></i></div>' +
        (i.sub ? '<div class="hb-sub">' + U.esc(i.sub) + "</div>" : "") + "</div>";
    }).join("") + "</div>";
  }

  /* Ramani ya joto: siku za wiki (Jumatatu..Jumapili) × saa 0..23 */
  function heat(matrix, o) {
    var max = 0;
    matrix.forEach(function (r) { r.forEach(function (v) { max = Math.max(max, v); }); });
    if (!max) return '<div class="empty">Hakuna data.</div>';
    var names = ["Jtatu", "Jnne", "Jtano", "Alh", "Ijum", "Jmosi", "Jpili"];
    var h = '<div class="heat" role="img" aria-label="Ramani ya joto ya mauzo kwa siku na saa"><div class="hz"></div>';
    for (var hr = 0; hr < 24; hr++) h += '<div class="hz hl">' + (hr % 3 === 0 ? hr : "") + "</div>";
    matrix.forEach(function (row, d) {
      h += '<div class="hz hd">' + names[d] + "</div>";
      row.forEach(function (v, hr2) {
        var a = v / max;
        h += '<i style="--a:' + (a < 0.02 && v > 0 ? 0.06 : a).toFixed(2) + '" title="' + names[d] + " " + U.p2(hr2) + ":00 · " + U.money(v) + '"></i>';
      });
    });
    return h + "</div>";
  }

  root.Charts = { bars: bars, hbars: hbars, heat: heat, niceMax: niceMax };
})(window);
