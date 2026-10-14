/* 浊堤 · scene.js —— 章首的斜雨，和“听雨”的雨声（檐水一滴一滴落在阶石上）。在 reader.js 之前加载。 */
(function () {
  var S = window.READER_SCENES = window.READER_SCENES || {};
  S.heads = S.heads || {};
  S.sounds = S.sounds || {};

  // 伪随机，同一个下标每帧都一样，雨丝才连得上
  function rnd(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }

  S.heads.rain = function (ctx, w, h, t, cols) {
    var n = Math.round((w * h) / 5200);
    ctx.lineCap = "round";
    for (var i = 0; i < n; i++) {
      var z = rnd(i, 1), len = 9 + z * 20, sp = 300 + z * 540, span = h + len + 40;
      var y = (rnd(i, 2) * span + t * sp) % span - len;
      var x = rnd(i, 3) * (w + 120) - 60 - (y + len) * 0.14;
      ctx.strokeStyle = z > 0.5 ? cols[0] : cols[1];
      ctx.lineWidth = 0.6 + z * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * 0.14, y - len);
      ctx.stroke();
    }
  };

  S.sounds.rain = function (ac, out, api) {
    // 雨幕：粉噪声，高低各一层
    var s1 = ac.createBufferSource(); s1.buffer = api.noise(4); s1.loop = true;
    var hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 450;
    var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2800;
    var g1 = ac.createGain(); g1.gain.value = 0.55;
    s1.connect(hp); hp.connect(lp); lp.connect(g1); g1.connect(out);
    var s2 = ac.createBufferSource(); s2.buffer = api.noise(5); s2.loop = true;
    var lp2 = ac.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 420;
    var g2 = ac.createGain(); g2.gain.value = 0.9;
    s2.connect(lp2); lp2.connect(g2); g2.connect(out);
    var lfo = ac.createOscillator(); lfo.frequency.value = 0.06;
    var lg = ac.createGain(); lg.gain.value = 0.15; lfo.connect(lg); lg.connect(g1.gain);
    s1.start(); s2.start(); lfo.start();

    // 雨点打在瓦上：短促的噼啪
    function patter() {
      if (!api.on()) return;
      var t0 = ac.currentTime, len = Math.floor(ac.sampleRate * 0.025), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
      var s = ac.createBufferSource(); s.buffer = b;
      var bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800 + Math.random() * 3800; bp.Q.value = 1.2;
      var g = ac.createGain(); g.gain.value = 0.04 + Math.random() * 0.1;
      s.connect(bp); bp.connect(g);
      if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8; g.connect(p); p.connect(out); } else g.connect(out);
      s.start(t0);
      api.later(patter, 25 + Math.random() * 140);
    }
    // 檐水
    function eave() {
      if (!api.on()) return;
      var t0 = ac.currentTime + 0.02, o = ac.createOscillator(), g = ac.createGain(), f = 700 + Math.random() * 500;
      o.type = "sine"; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 0.45, t0 + 0.09);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.2);
      api.later(eave, 1100 + Math.random() * 2600);
    }
    patter(); eave();
    return [s1, s2, lfo];
  };
})();
