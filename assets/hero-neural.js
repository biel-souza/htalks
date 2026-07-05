/* ============================================================
   H-TALKS — Hero neural network (canvas) — 2026
   Rede neural viva: nós à deriva, conexões por proximidade,
   pulsos de dados convergindo ao núcleo. Respeita reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var wrap = document.getElementById("neuralHero");
    if (!wrap) return;
    var canvas = wrap.querySelector(".neural-canvas");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");

    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ambient = wrap.getAttribute("data-mode") === "ambient";

    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, cx = 0, cy = 0;
    var nodes = [], pulses = [];
    var LINK = 132;        // distância máxima de conexão
    var CORE_PULL = 168;   // raio de ligação ao núcleo
    var t = 0;

    function rand(a, b) { return a + Math.random() * (b - a); }

    function resize() {
      var r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      cx = W / 2; cy = H / 2;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildNodes();
    }

    function buildNodes() {
      var area = W * H;
      var density = ambient ? 15000 : 9000;
      var cap = ambient ? 84 : 96;
      var count = Math.max(30, Math.min(cap, Math.round(area / density)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        var x, y;
        if (ambient) {
          x = rand(0, W); y = rand(0, H);
        } else {
          var ang = Math.random() * Math.PI * 2;
          var rad = rand(70, Math.min(W, H) * 0.52);
          x = cx + Math.cos(ang) * rad + rand(-40, 40);
          y = cy + Math.sin(ang) * rad + rand(-40, 40);
        }
        nodes.push({
          x: x, y: y,
          vx: rand(-0.18, 0.18),
          vy: rand(-0.18, 0.18),
          r: rand(1.1, 2.6),
          hot: Math.random() < 0.18
        });
      }
    }

    function spawnPulse() {
      if (!nodes.length) return;
      var n = nodes[(Math.random() * nodes.length) | 0];
      pulses.push({ x: n.x, y: n.y, p: 0, sp: rand(0.012, 0.024) });
      if (pulses.length > 14) pulses.shift();
    }

    function step() {
      ctx.clearRect(0, 0, W, H);
      t += 1;

      // --- conexões entre nós ---
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += a.vx; a.y += a.vy;

        var dx = a.x - cx, dy = a.y - cy;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (ambient) {
          // colisão suave com as bordas do retângulo
          if (a.x < -20) a.vx += 0.02; else if (a.x > W + 20) a.vx -= 0.02;
          if (a.y < -20) a.vy += 0.02; else if (a.y > H + 20) a.vy -= 0.02;
        } else {
          // mantém dentro de um círculo suave
          var maxR = Math.min(W, H) * 0.56;
          if (d > maxR) { a.vx -= (dx / d) * 0.02; a.vy -= (dy / d) * 0.02; }
          if (d < 56)   { a.vx += (dx / d) * 0.03; a.vy += (dy / d) * 0.03; }
        }
        a.vx *= 0.995; a.vy *= 0.995;

        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var ddx = a.x - b.x, ddy = a.y - b.y;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < LINK) {
            var al = (1 - dist / LINK) * 0.42 * (ambient ? 0.7 : 1);
            ctx.strokeStyle = "rgba(56,154,222," + al + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // --- ligação ao núcleo ---
        if (!ambient && d < CORE_PULL) {
          var ac = (1 - d / CORE_PULL) * 0.5;
          ctx.strokeStyle = "rgba(34,211,238," + ac + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(cx, cy);
          ctx.stroke();
        }

        // --- nó ---
        var glow = (a.hot ? 0.95 : 0.5) * (ambient ? 0.72 : 1);
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = a.hot
          ? "rgba(34,211,238," + glow + ")"
          : "rgba(147,197,253," + glow + ")";
        ctx.fill();
        if (a.hot) {
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.r + 3, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(34,211,238,0.12)";
          ctx.fill();
        }
      }

      // --- pulsos de dados convergindo ao núcleo ---
      for (var k = pulses.length - 1; k >= 0; k--) {
        var pu = pulses[k];
        pu.p += pu.sp;
        if (pu.p >= 1) { pulses.splice(k, 1); continue; }
        var ease = pu.p * pu.p;
        var px = pu.x + (cx - pu.x) * ease;
        var py = pu.y + (cy - pu.y) * ease;
        var a2 = 1 - pu.p;
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(125,232,255," + a2 + ")";
        ctx.shadowColor = "rgba(34,211,238,0.9)";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (!ambient && (t % 26) === 0) spawnPulse();

      raf = requestAnimationFrame(step);
    }

    var raf = null;
    function start() { if (!raf && !reduce) raf = requestAnimationFrame(step); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    resize();
    window.addEventListener("resize", function () { resize(); });

    if (reduce) {
      // quadro estático único (sem loop de animação)
      requestAnimationFrame(function () { step(); stop(); });
    } else {
      // pausa quando fora da tela (economia)
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
        }, { threshold: 0.05 }).observe(wrap);
      } else {
        start();
      }
    }

    /* contadores de telemetria (count-up sutil) */
    var counted = false;
    function countUp() {
      if (counted) return; counted = true;
      wrap.querySelectorAll(".ntag .nt-v[data-to]").forEach(function (el) {
        var to = parseFloat(el.getAttribute("data-to"));
        var suf = el.getAttribute("data-suffix") || "";
        var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
        var dur = 1300, t0 = performance.now();
        function tick(now) {
          var p = Math.min(1, (now - t0) / dur);
          var ev = 1 - Math.pow(1 - p, 3);
          el.textContent = (to * ev).toFixed(dec) + suf;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = to.toFixed(dec) + suf;
        }
        requestAnimationFrame(tick);
      });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) countUp(); });
      }, { threshold: 0.4 }).observe(wrap);
    } else { countUp(); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
