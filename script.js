/* =========================================================
   Alex Rivera — AI Video Specialist Portfolio
   Interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky nav shadow ---------- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    nav.classList.toggle("is-scrolled", window.scrollY > 20);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  var closeMenu = function () {
    links.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("is-open");
    toggle.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMenu);
  });

  /* ---------- Portfolio data ---------- */
  var projects = [
    { title: "ELOIX Tallow Balm — UGC Ad", cat: "ugc", tag: "UGC Ad", c1: "#3a1c71", c2: "#0c0c16", meta: "Native UGC · Meta / TikTok" },
    { title: "ELOIX Berberine — VSL", cat: "vsl", tag: "VSL", c1: "#0f4c81", c2: "#0c0c16", meta: "Direct-response · supplement" },
    { title: "AI Spokesperson — HemoFlow", cat: "influencer", tag: "AI Influencer", c1: "#642B73", c2: "#0c0c16", meta: "AI avatar · lip-sync" },
    { title: "Tallow Balm — 3D Pixar Ad", cat: "3d", tag: "3D Pixar", c1: "#f7971e", c2: "#0c0c16", meta: "Stylized 3D product spot" },
    { title: "Skincare Routine — UGC", cat: "ugc", tag: "UGC Ad", c1: "#16a085", c2: "#0c0c16", meta: "Testimonial-style · vertical" },
    { title: "Berberine — AI Creator", cat: "influencer", tag: "AI Influencer", c1: "#8E2DE2", c2: "#0c0c16", meta: "Talking-head · Veo + Omniflash" },
    { title: "Wellness Offer — VSL", cat: "vsl", tag: "VSL", c1: "#1a2980", c2: "#0c0c16", meta: "Long-form · hook to offer" },
    { title: "Product Reveal — 3D Pixar", cat: "3d", tag: "3D Pixar", c1: "#e52d27", c2: "#0c0c16", meta: "Playful 3D animation" },
    { title: "Founder Story — UGC", cat: "ugc", tag: "UGC Ad", c1: "#0575E6", c2: "#0c0c16", meta: "Authentic · brand story" }
  ];

  var grid = document.getElementById("workGrid");
  function renderProjects() {
    grid.innerHTML = projects.map(function (p) {
      return (
        '<article class="work-item reveal" data-cat="' + p.cat + '" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '" data-open-reel>' +
          '<div class="work-item__shine"></div>' +
          '<span class="work-item__badge">' + p.tag + '</span>' +
          '<div class="work-item__play"><span>&#9654;</span></div>' +
          '<div class="work-item__meta"><h3>' + p.title + '</h3><p>' + p.meta + '</p></div>' +
        '</article>'
      );
    }).join("");
    observeReveals();
    bindReelTriggers();
  }

  /* ---------- Filters ---------- */
  var filters = document.querySelectorAll(".filter");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var f = btn.getAttribute("data-filter");
      grid.querySelectorAll(".work-item").forEach(function (item) {
        var show = f === "all" || item.getAttribute("data-cat") === f;
        item.classList.toggle("is-hidden", !show);
      });
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealObserver;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            revealObserver.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 });
    }
    document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 6, 5) * 0.06 + "s";
      revealObserver.observe(el);
    });
  }

  /* ---------- Animate skill bars ---------- */
  if ("IntersectionObserver" in window) {
    var barObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); barObs.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll(".skillbar").forEach(function (el) { barObs.observe(el); });
  }

  /* ---------- Showreel modal ---------- */
  var modal = document.getElementById("reelModal");
  function openReel() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeReel() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  function bindReelTriggers() {
    document.querySelectorAll("[data-open-reel]").forEach(function (el) {
      if (el.__bound) return;
      el.__bound = true;
      el.addEventListener("click", openReel);
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openReel(); }
      });
    });
  }
  document.querySelectorAll("[data-close-reel]").forEach(function (el) {
    el.addEventListener("click", closeReel);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeReel();
  });

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var valid = true;
    ["name", "email", "message"].forEach(function (id) {
      var input = document.getElementById(id);
      var field = input.closest(".field");
      var ok = input.value.trim() !== "" && (id !== "email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value));
      field.classList.toggle("invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) return;
    note.hidden = false;
    form.querySelector("button[type=submit]").textContent = "Sent ✓";
    setTimeout(function () {
      form.reset();
      note.hidden = true;
      form.querySelector("button[type=submit]").textContent = "Send message →";
    }, 4000);
  });

  /* ---------- Init ---------- */
  renderProjects();
  observeReveals();
  bindReelTriggers();
})();
