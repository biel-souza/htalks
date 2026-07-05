/* ============================================================
   H-TALKS — enhancements (shared) — 2026
   Menu mobile, estado de nav ao rolar, scroll-reveal.
   Funciona em ambas as páginas sem depender de markup extra.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("js-ready");

  /* -------------------------------------------------------
     1) Menu mobile — construído a partir do nav existente
     ------------------------------------------------------- */
  function buildMobileMenu() {
    var nav = document.querySelector(".nav .nav-inner");
    if (!nav) return;
    var links = nav.querySelector(".nav-links");
    var cta = nav.querySelector(".nav-cta");
    if (!links) return;

    // botão hamburger
    var burger = document.createElement("button");
    burger.className = "nav-burger";
    burger.setAttribute("aria-label", "Abrir menu");
    burger.setAttribute("aria-expanded", "false");
    burger.innerHTML = "<span></span>";
    nav.appendChild(burger);

    // painel
    var panel = document.createElement("div");
    panel.className = "mobile-menu";
    panel.id = "mobileMenu";

    var arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

    // clona links
    links.querySelectorAll("a").forEach(function (a) {
      var m = document.createElement("a");
      m.className = "m-link" + (a.classList.contains("active") ? " active" : "");
      m.href = a.getAttribute("href");
      m.innerHTML = "<span>" + a.textContent.trim() + "</span>" + arrow;
      panel.appendChild(m);
    });

    // clona CTAs
    if (cta) {
      var box = document.createElement("div");
      box.className = "m-cta";
      cta.querySelectorAll(".btn").forEach(function (b) {
        var c = b.cloneNode(true);
        box.appendChild(c);
      });
      panel.appendChild(box);
    }

    document.body.appendChild(panel);

    function close() {
      panel.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Abrir menu");
      document.body.classList.remove("menu-open");
    }
    function open() {
      panel.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Fechar menu");
      document.body.classList.add("menu-open");
    }
    burger.addEventListener("click", function () {
      panel.classList.contains("is-open") ? close() : open();
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a, .btn")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    // fecha ao voltar pro desktop
    window.matchMedia("(min-width: 981px)").addEventListener("change", function (m) {
      if (m.matches) close();
    });
  }

  /* -------------------------------------------------------
     2) Nav ganha sombra/borda ao rolar
     ------------------------------------------------------- */
  function navScrollState() {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* -------------------------------------------------------
     3) Scroll reveal suave (respeita reduced-motion)
     ------------------------------------------------------- */
  function scrollReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var selectors = [
      ".sec-head", ".feat", ".svc", ".plan", ".case", ".step",
      ".stack-card", ".stack-extra", ".metric", ".compare",
      ".product-frame", ".seg-wrap", ".form-card", ".form-side",
      ".final-cta", ".network", ".faq details"
    ];
    var targets = document.querySelectorAll(selectors.join(","));
    if (!targets.length) return;

    targets.forEach(function (el, i) {
      el.classList.add("reveal");
      // leve stagger entre irmãos próximos
      var d = (i % 4) * 70;
      el.style.transitionDelay = d + "ms";
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });

    // failsafe: tudo visível após 2.5s
    setTimeout(function () {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
    }, 2500);
  }

  /* -------------------------------------------------------
     4) Botão flutuante de WhatsApp (reusa o link da página)
     ------------------------------------------------------- */
  function buildWhatsAppFloat() {
    if (document.querySelector(".wa-float")) return;
    var src = document.querySelector('a[href^="https://wa.me"]');
    var href = src ? src.getAttribute("href") : "https://wa.me/5547991053840";
    var a = document.createElement("a");
    a.className = "wa-float";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Falar no WhatsApp");
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/></svg>';
    document.body.appendChild(a);
  }

  function init() {
    buildMobileMenu();
    navScrollState();
    scrollReveal();
    buildWhatsAppFloat();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
