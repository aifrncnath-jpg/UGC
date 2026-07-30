/* =========================================================
   Nathaniel — AI Video Specialist Portfolio
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

  /* ---------- Portfolio data ----------
     These demo cards show ONLY until you add real files.
     Drop videos/images named like "ugc-1.mp4", "podcast-1.mp4" into the
     matching folder in assets/work/<category>/ and they appear automatically
     (the page auto-detects them — no build step, works locally too). */
  var fallbackProjects = [
    { title: "ELOIX Tallow Balm — UGC Ad", cat: "ugc", tag: "UGC Ad", c1: "#3a1c71", c2: "#0c0c16", meta: "Native UGC · Meta / TikTok" },
    { title: "ELOIX Berberine — VSL", cat: "vsl", tag: "VSL", c1: "#0f4c81", c2: "#0c0c16", meta: "Direct-response · supplement" },
    { title: "AI Spokesperson — HemoFlow", cat: "influencer", tag: "AI Influencer", c1: "#642B73", c2: "#0c0c16", meta: "AI avatar · lip-sync" },
    { title: "Tallow Balm — 3D Pixar Ad", cat: "3d", tag: "3D Pixar", c1: "#f7971e", c2: "#0c0c16", meta: "Stylized 3D product spot" },
    { title: "Skincare Routine — UGC", cat: "ugc", tag: "UGC Ad", c1: "#16a085", c2: "#0c0c16", meta: "Testimonial-style · vertical" },
    { title: "Berberine — AI Creator", cat: "influencer", tag: "AI Influencer", c1: "#8E2DE2", c2: "#0c0c16", meta: "Talking-head · Veo + Omniflash" },
    { title: "Wellness Offer — VSL", cat: "vsl", tag: "VSL", c1: "#1a2980", c2: "#0c0c16", meta: "Long-form · hook to offer" },
    { title: "Product Reveal — 3D Pixar", cat: "3d", tag: "3D Pixar", c1: "#e52d27", c2: "#0c0c16", meta: "Playful 3D animation" },
    { title: "Founder Story — UGC", cat: "ugc", tag: "UGC Ad", c1: "#0575E6", c2: "#0c0c16", meta: "Authentic · brand story" },
    { title: "Wellness Talk — Podcast Style", cat: "podcast", tag: "Podcast Style", c1: "#0e7c66", c2: "#0c0c16", meta: "AI podcast clip · captions" }
  ];

  var grid = document.getElementById("workGrid");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderProjects(list) {
    grid.innerHTML = list.map(function (p) {
      var playable = !p.link && (p.video || p.img);
      var tag = p.link ? "a" : "article";
      var attrs = "";
      if (p.link) {
        attrs = ' href="' + esc(p.link) + '" target="_blank" rel="noopener"';
      } else if (playable) {
        attrs = ' role="button" tabindex="0"' +
                ' data-media="' + esc(p.video || p.img) + '"' +
                ' data-type="' + (p.video ? "video" : "image") + '"';
      }
      var media = "";
      if (p.video) {
        // #t=0.1 nudges browsers to show a first frame instead of black
        media = '<video class="work-item__thumb" src="' + esc(p.video) + '#t=0.1" muted loop playsinline preload="metadata"></video>';
      } else if (p.img) {
        media = '<img class="work-item__thumb" src="' + esc(p.img) + '" alt="' + esc(p.title) + '" loading="lazy" />';
      }
      var showPlay = p.video || p.link;
      var playIcon = showPlay ? '<div class="work-item__play"><span>&#9654;</span></div>' : "";
      var cls = "work-item reveal" + (playable ? " work-item--playable" : "");
      return (
        "<" + tag + ' class="' + cls + '" data-cat="' + esc(p.cat) + '" style="--c1:' + esc(p.c1 || "#1a1a2e") + ';--c2:' + esc(p.c2 || "#0c0c16") + '"' + attrs + ">" +
          media +
          '<div class="work-item__shine"></div>' +
          '<span class="work-item__badge">' + esc(p.tag) + '</span>' +
          playIcon +
          '<div class="work-item__meta"><h3>' + esc(p.title) + '</h3><p>' + esc(p.meta) + '</p></div>' +
        "</" + tag + ">"
      );
    }).join("");

    // Play videos on hover (muted preview), reset on leave
    grid.querySelectorAll("video.work-item__thumb").forEach(function (v) {
      var card = v.closest(".work-item");
      card.addEventListener("mouseenter", function () { v.play().catch(function () {}); });
      card.addEventListener("mouseleave", function () { v.pause(); v.currentTime = 0; });
    });

    // Click a card to open it full-size WITH sound + controls
    grid.querySelectorAll(".work-item--playable").forEach(function (card) {
      function open() {
        openLightbox(card.getAttribute("data-media"), card.getAttribute("data-type"));
      }
      card.addEventListener("click", open);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });

    observeReveals();
  }

  /* ---------- Lightbox (full-size player with sound) ---------- */
  var lightbox = document.getElementById("lightbox");
  var lbStage = document.getElementById("lightboxStage");

  function openLightbox(src, type) {
    if (!src) return;
    if (type === "image") {
      lbStage.innerHTML = '<img src="' + esc(src) + '" alt="" />';
    } else {
      lbStage.innerHTML =
        '<video src="' + esc(src) + '" controls autoplay playsinline></video>';
    }
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lbStage.innerHTML = ""; // stops playback
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }
  document.querySelectorAll("[data-close-lb]").forEach(function (el) {
    el.addEventListener("click", closeLightbox);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  });

  /* ---------- Auto-discover the gallery ----------
     No build step. The page probes for files named <category>-<n> (also
     <category><n> or just <n>) inside assets/work/<category>/ and shows any
     it finds. Works on Netlify AND locally. */
  var WORK_CATS = [
    { key: "ugc",        tag: "UGC Ad",        c1: "#3a1c71", c2: "#0c0c16" },
    { key: "vsl",        tag: "VSL",           c1: "#0f4c81", c2: "#0c0c16" },
    { key: "influencer", tag: "AI Influencer", c1: "#642B73", c2: "#0c0c16" },
    { key: "3d",         tag: "3D Pixar",      c1: "#f7971e", c2: "#0c0c16" },
    { key: "podcast",    tag: "Podcast Style", c1: "#0e7c66", c2: "#0c0c16" }
  ];
  var VIDEO_EXT = ["mp4", "webm", "mov", "m4v"];
  var IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
  var MAX_ITEMS = 40; // per category
  var MAX_GAP = 3;    // stop scanning after this many missing numbers in a row

  // Resolves true if a media file loads, false if missing. Works on file:// + http.
  function probe(url, isVideo) {
    return new Promise(function (resolve) {
      var el = isVideo ? document.createElement("video") : new Image();
      var settled = false;
      function finish(val) {
        return function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(val);
        };
      }
      var timer = setTimeout(finish(false), 8000);
      if (isVideo) {
        el.preload = "metadata";
        el.muted = true;
        el.onloadedmetadata = finish(true);
        el.onerror = finish(false);
      } else {
        el.onload = finish(true);
        el.onerror = finish(false);
      }
      el.src = url;
    });
  }

  // Try the naming variants + extensions for one slot number; resolve a hit or null.
  function findSlot(cat, n) {
    var names = [cat.key + "-" + n, cat.key + n, "" + n];
    var candidates = [];
    names.forEach(function (nm) {
      VIDEO_EXT.forEach(function (ext) {
        candidates.push({ url: "assets/work/" + cat.key + "/" + nm + "." + ext, isVideo: true });
      });
      IMAGE_EXT.forEach(function (ext) {
        candidates.push({ url: "assets/work/" + cat.key + "/" + nm + "." + ext, isVideo: false });
      });
    });
    return (function tryNext(i) {
      if (i >= candidates.length) return Promise.resolve(null);
      return probe(candidates[i].url, candidates[i].isVideo).then(function (ok) {
        return ok ? candidates[i] : tryNext(i + 1);
      });
    })(0);
  }

  function scanCategory(cat) {
    var items = [];
    var n = 1;
    var gap = 0;
    function step() {
      if (n > MAX_ITEMS || gap >= MAX_GAP) return Promise.resolve(items);
      return findSlot(cat, n).then(function (hit) {
        if (hit) {
          items.push({
            title: cat.tag + " " + n,
            cat: cat.key, tag: cat.tag, c1: cat.c1, c2: cat.c2, meta: cat.tag,
            video: hit.isVideo ? hit.url : undefined,
            img: hit.isVideo ? undefined : hit.url
          });
          gap = 0;
        } else {
          gap++;
        }
        n++;
        return step();
      });
    }
    return step();
  }

  function loadWork() {
    if (!("Promise" in window)) { renderProjects(fallbackProjects); return; }
    Promise.all(WORK_CATS.map(scanCategory)).then(function (groups) {
      var found = [];
      groups.forEach(function (g) { found = found.concat(g); });
      renderProjects(found.length ? found : fallbackProjects);
    }).catch(function () { renderProjects(fallbackProjects); });
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
  loadWork();
  observeReveals();
})();
