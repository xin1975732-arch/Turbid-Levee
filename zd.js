/* 浊堤 · zd.js —— 这本书自己的几处：章号、目录序号写成账簿大写（壹贰叁……），书封上落雨。
 * 在 reader.js 之后、features.js 之前加载。 */
(function () {
  "use strict";
  var R = window.Reader;
  if (!R) return;
  var DX = "壹贰叁肆伍陆柒捌玖";
  function daxie(n) {
    if (n < 10) return DX[n - 1];
    if (n === 10) return "拾";
    if (n < 20) return "拾" + DX[n - 11];
    if (n === 20) return "贰拾";
    return String(n);
  }

  R.on("view", function (name, arg, box) {
    if (name !== "timeline" || !box) return;
    var lede = box.querySelector(".vw-h .lede");
    if (lede) lede.textContent = "从嘉靖二十二年两个生员同一天进衙门，到四十年十一月的头一场霜。还没读到的事先模糊着，点一下才显示。";
  });

  R.on("chapter", function (n, v) {
    var b = v.querySelector(".ch-head .tag b");
    if (b) b.textContent = daxie(n);
  });

  /* 书封：斜雨落在书上 */
  var stopRain = null, cols = ["", ""];
  function colors() {
    var cs = getComputedStyle(document.documentElement);
    cols = [cs.getPropertyValue("--scene-1").trim(), cs.getPropertyValue("--scene-2").trim()];
  }
  R.on("tone", function () { setTimeout(colors, 0); });
  R.on("leave", function () { if (stopRain) { stopRain(); stopRain = null; } });
  R.on("home", function (v) {
    v.querySelectorAll(".toc a").forEach(function (a) {
      var no = a.querySelector(".toc-no");
      if (no) no.textContent = daxie(parseInt(a.getAttribute("data-n"), 10));
    });
    var hero = v.querySelector(".hero");
    var paint = window.READER_SCENES && READER_SCENES.heads && READER_SCENES.heads.rain;
    if (!hero || !paint) return;
    var cv = document.createElement("canvas");
    cv.className = "hero-rain";
    cv.setAttribute("aria-hidden", "true");
    hero.insertBefore(cv, hero.firstChild);
    var ctx = cv.getContext("2d"), w = 0, h = 0, raf = 0, t0 = 0;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function size() {
      var dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(ts) {
      if (!t0) t0 = ts;
      ctx.clearRect(0, 0, w, h);
      if (!document.hidden && document.documentElement.getAttribute("data-wave") !== "off") paint(ctx, w, h, (ts - t0) / 1000, cols);
      raf = reduce ? 0 : requestAnimationFrame(frame);
    }
    function onResize() { size(); }
    colors(); size(); raf = requestAnimationFrame(frame);
    window.addEventListener("resize", onResize);
    stopRain = function () { if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  });
})();
