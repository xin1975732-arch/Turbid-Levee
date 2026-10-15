/* 《浊堤》分章加载 loader.js
 * 正文在 chapters/ch01.md … ch20.md，人物、时间线、前情提要、简介在 data/ 里，都可以直接在 GitHub 上改。
 * 网页打开时读取这些文件、排好版，再启动 reader.js、zd.js、features.js。
 * 写法：第一行 “## 第一章　章名”；一段一行（段间空一行）；单独一行 --- 是分节的三个小圆点。
 * 抄录的文书、竹纸、批语（楷体加朱线）按“整段原文”对应 data/book.json 里的 chao 列表；
 * 改了这类段落的字，要把 chao 里同样的那句也改成一样，否则它会按普通段落排（不会白屏）。
 * 任何一个文件没读到或格式写错，就用 index.html 里原来的那份。
 */
(function () {
  "use strict";
  var box = document.getElementById("book-data");
  var D = JSON.parse(box.textContent);
  var COUNT = D.chapters.length;
  var CHAO = {};
  (D.chao || []).forEach(function (t) { CHAO[t] = 1; });
  var NUMS = "零一二三四五六七八九";

  function cn(n) {
    if (n < 10) return NUMS[n];
    if (n < 20) return "十" + (n % 10 ? NUMS[n % 10] : "");
    return NUMS[Math.floor(n / 10)] + "十" + (n % 10 ? NUMS[n % 10] : "");
  }
  function E(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function count(s) { return Array.from(s.replace(/\s/g, "")).length; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // 直引号换成弯引号（成对才换）
  function quotes(s) {
    if ((s.match(/"/g) || []).length % 2) return s;
    var open = true;
    s = s.replace(/"/g, function () { var q = open ? "“" : "”"; open = !open; return q; });
    if ((s.match(/'/g) || []).length % 2) return s;
    open = true;
    return s.replace(/'/g, function () { var q = open ? "‘" : "’"; open = !open; return q; });
  }

  var markRe = null, markId = {};
  function setMarks(people) {
    var ms = [];
    (people || []).forEach(function (p) { (p.mark && p.mark.length ? p.mark : [p.name]).forEach(function (m) { ms.push([m, p.id]); }); });
    ms.sort(function (a, b) { return b[0].length - a[0].length; });
    markRe = ms.length ? new RegExp(ms.map(function (m) { return m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|"), "g") : null;
    markId = {};
    ms.forEach(function (m) { markId[m[0]] = m[1]; });
  }
  function mark(text, used) {
    var s = E(text);
    if (!markRe) return s;
    return s.replace(markRe, function (m) {
      var id = markId[m];
      if (used[id]) return m;
      used[id] = 1;
      return '<b class="rn" data-c="' + id + '">' + m + "</b>";
    });
  }

  function parse(md) {
    var ls = md.replace(/\r\n?/g, "\n").replace(/^﻿/, "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
    var head = "";
    if (ls.length && /^#+\s/.test(ls[0])) head = ls.shift().replace(/^#+\s*/, "").trim();
    var m = /^第(.+?)章[\s　]*(.+)$/.exec(head);
    return { title: m ? m[2].trim() : head, lines: ls };
  }

  function build(n, md, old) {
    var c = parse(md), used = {}, paras = [], out = [], chars = 0;
    c.lines.forEach(function (raw) {
      if (/^(-{3,}|\*{3,}|\* \* \*)$/.test(raw)) { out.push('<div class="brk" aria-hidden="true"><i></i><i></i><i></i></div>'); return; }
      var t = quotes(raw), k = paras.length;
      chars += count(t);
      paras.push(t);
      var cls = (CHAO[raw] || CHAO[t]) ? ' class="chao"' : "";
      out.push("<p" + cls + ' data-p="' + k + '">' + mark(t, used) + "</p>");
    });
    return { n: n, cn: cn(n), title: c.title || (old && old.title) || "", era: "", chars: chars,
      mins: Math.max(1, Math.ceil(chars / 400)), html: out.join("\n"), paras: paras, recap: (old && old.recap) || "" };
  }

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.body.appendChild(s);
    });
  }
  function get1(f, type) {
    return fetch(f, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(f); return type === "json" ? r.json() : r.text(); });
  }
  // 先找 chapters/、data/ 文件夹里的；网页上传时文件夹被拆平了，就在根目录找同名文件
  function get(f, type) {
    return get1(f, type).catch(function (e) { var b = f.split("/").pop(); if (b === f) throw e; return get1(b, type); });
  }
  function opt(f, type) { return get(f, type).catch(function (e) { if (window.console) console.warn("没读到 " + f + "，用网页里原来的那份。", e); return null; }); }

  function start() {
    delete D.chao;
    box.textContent = JSON.stringify(D);
    window.READER_WAIT = true;   // 等 features.js 加载完再启动
    return load("reader.js").then(function () { return load("zd.js"); }).then(function () { return load("features.js"); });
  }

  Promise.all([opt("data/book.json", "json"), opt("data/characters.json", "json"), opt("data/timeline.json", "json"), opt("data/recaps.json", "json")]).then(function (r) {
    var B = r[0];
    if (B) {
      ["title", "series", "series_no", "desc", "blurb", "epigraph", "foot", "toc_note_extra", "series_nav"].forEach(function (k) { if (B[k] !== undefined) D[k] = B[k]; });
      if (Array.isArray(B.chao)) { CHAO = {}; B.chao.forEach(function (t) { CHAO[t] = 1; }); }
    }
    if (r[1] && r[1].people) D.people = r[1];
    if (r[2] && r[2].events) D.timeline = r[2];
    if (D.timeline && B && B.timeline_lede) D.timeline.lede = B.timeline_lede;
    var recaps = r[3];
    setMarks((D.people || {}).people);
    var files = [];
    for (var i = 1; i <= COUNT; i++) files.push(opt("chapters/ch" + pad(i) + ".md"));
    return Promise.all(files).then(function (texts) {
      D.chapters = texts.map(function (t, i) {
        var old = D.chapters[i];
        var c = t ? build(i + 1, t, old) : old;
        if (recaps && recaps[String(i + 1)] !== undefined) c.recap = recaps[String(i + 1)];
        return c;
      });
      D.total = D.chapters.reduce(function (s, c) { return s + c.chars; }, 0);
    });
  }).catch(function (e) { if (window.console) console.warn("分章加载出错，用网页里原来的那份。", e); })
    .then(start)
    .catch(function (e) {
      var v = document.getElementById("view");
      if (v) v.innerHTML = '<p style="padding:40px 20px;text-align:center">网页没有加载出来（' + String(e && e.message || e) + '）。请刷新一下；如果是直接双击打开的本地文件，需要放到网站上才能读取。</p>';
    });
})();
