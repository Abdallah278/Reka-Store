/* Reka Store theme JS — ports the storefront behaviour (header, cart,
   WhatsApp order flow, product gallery) from the React app to vanilla JS. */
(function () {
  "use strict";

  var fmt = new Intl.NumberFormat("en-EG");
  var S = (window.REKA && window.REKA.strings) || {};
  function t(key, fallback) { return S[key] || fallback; }
  function formatPrice(v) { return fmt.format(v) + " " + ((window.REKA && window.REKA.moneyFormat) || "EGP"); }
  function normalizePhone(p) { return String(p || "").replace(/\D/g, ""); }

  /* ---- toast ------------------------------------------------------- */
  var toastEl = null, toastTimer = null;
  function toast(msg, isError) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "rk-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle("rk-toast--error", Boolean(isError));
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2600);
  }

  /* ---- header ------------------------------------------------------ */
  var bar = document.querySelector("[data-header-bar]");
  if (bar) {
    var onScroll = function () { bar.classList.toggle("is-scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  var menuBtn = document.querySelector("[data-menu-toggle]");
  var menu = document.getElementById("mobile-menu");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      var open = menu.hasAttribute("hidden");
      if (open) menu.removeAttribute("hidden"); else menu.setAttribute("hidden", "");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.querySelector("[data-menu-icon-open]").hidden = open;
      menuBtn.querySelector("[data-menu-icon-close]").hidden = !open;
      if (bar) bar.classList.toggle("is-scrolled", open || window.scrollY > 24);
    });
  }

  function setCartCount(n) {
    var el = document.querySelector("[data-cart-count]");
    if (el) el.textContent = n > 0 ? (n > 99 ? "99+" : String(n)) : "";
  }

  /* ---- add to order (AJAX) ---------------------------------------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add-to-cart]");
    if (!btn) return;
    e.preventDefault();
    btn.disabled = true;
    fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(btn.getAttribute("data-add-to-cart")), quantity: 1 }),
    })
      .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error(j.description || "Could not add"); }); return r.json(); })
      .then(function () { return fetch("/cart.js").then(function (r) { return r.json(); }); })
      .then(function (cart) {
        setCartCount(cart.item_count);
        toast((btn.getAttribute("data-product-title") || "Added") + " — " + t("added", "added to your order"));
      })
      .catch(function (err) { toast(err.message || t("add_fail", "Could not add to your order"), true); })
      .finally(function () { btn.disabled = false; });
  });

  /* ---- cart page: quantity / remove; checkout is native Shopify ---- */
  var root = document.querySelector("[data-cart-root]");
  if (root) {
    function changeLine(line, qty) {
      fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: line, quantity: qty }),
      })
        .then(function (r) { return r.json(); })
        .then(function () { window.location.reload(); })
        .catch(function () { toast(t("update_fail", "Could not update the order"), true); });
    }

    root.addEventListener("click", function (e) {
      var minus = e.target.closest("[data-qty-minus]");
      var plus = e.target.closest("[data-qty-plus]");
      var remove = e.target.closest("[data-remove]");
      if (minus || plus || remove) {
        var el = minus || plus || remove;
        var line = Number(el.getAttribute("data-line-index"));
        if (remove) return changeLine(line, 0);
        var span = el.closest(".rk-qty").querySelector("span");
        var current = Number(span.textContent.trim());
        changeLine(line, Math.min(20, Math.max(0, current + (plus ? 1 : -1))));
      }
    });
  }

  /* ---- product gallery --------------------------------------------- */
  var gallery = document.querySelector("[data-gallery-main]");
  if (gallery) {
    var imgs = gallery.querySelectorAll("[data-gallery-img]");
    var thumbs = document.querySelectorAll("[data-gallery-thumb]");
    var note = document.querySelector("[data-gallery-note]");
    var idx = 0;
    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      imgs.forEach(function (img, j) { img.hidden = j !== idx; });
      thumbs.forEach(function (t, j) { t.setAttribute("aria-selected", String(j === idx)); });
      if (note) note.textContent = "Image " + (idx + 1) + " of " + imgs.length;
    }
    var prev = document.querySelector("[data-gallery-prev]");
    var next = document.querySelector("[data-gallery-next]");
    if (prev) prev.addEventListener("click", function () { show(idx - 1); });
    if (next) next.addEventListener("click", function () { show(idx + 1); });
    thumbs.forEach(function (t) { t.addEventListener("click", function () { show(Number(t.getAttribute("data-gallery-thumb"))); }); });
    document.addEventListener("keydown", function (e) {
      if (imgs.length < 2) return;
      if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "ArrowLeft") show(idx - 1);
    });
  }

  /* ---- department category filter (port of DepartmentPage chips) --- */
  var chipsWrap = document.querySelector("[data-cat-filter]");
  var grid = document.querySelector("[data-cat-grid]");
  if (chipsWrap && grid) {
    var buttons = chipsWrap.querySelectorAll("button[data-cat]");
    if (buttons.length > 1) chipsWrap.hidden = false;
    var noneEl = document.querySelector("[data-cat-none]");
    chipsWrap.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-cat]");
      if (!btn) return;
      var cat = btn.getAttribute("data-cat");
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var visible = 0;
      grid.querySelectorAll("[data-cat-item]").forEach(function (li) {
        var show = cat === "All" || li.getAttribute("data-cat-item") === cat;
        li.hidden = !show;
        if (show) visible++;
      });
      grid.hidden = visible === 0;
      if (noneEl) noneEl.hidden = visible !== 0;
    });
  }

  /* ---- perfume scroll bottle (port of ScrollBottle) ----------------- */
  var sb = document.querySelector("[data-scroll-bottle]");
  if (sb) {
    var bottle = sb.querySelector("[data-scroll-bottle-el]");
    var notes = sb.querySelectorAll("[data-note-at]");
    var onScrollBottle = function () {
      var rect = sb.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      var y = (progress - 0.5) * 260;
      var rot = (progress - 0.5) * 40;
      bottle.style.transform = "translate(-50%,-50%) translateY(" + y.toFixed(0) + "px) rotate(" + rot.toFixed(1) + "deg)";
      notes.forEach(function (n) {
        var at = Number(n.getAttribute("data-note-at"));
        n.style.opacity = String(Math.max(0, 1 - Math.abs(progress - at) * 4));
      });
    };
    onScrollBottle();
    window.addEventListener("scroll", onScrollBottle, { passive: true });
  }

  /* ---- reveal-on-scroll -------------------------------------------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  }
})();
