/* Reka Store theme JS — ports the storefront behaviour (header, cart,
   WhatsApp order flow, product gallery) from the React app to vanilla JS. */
(function () {
  "use strict";

  var fmt = new Intl.NumberFormat("en-EG");
  function formatPrice(v) { return fmt.format(v) + " EGP"; }
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
        toast((btn.getAttribute("data-product-title") || "Added") + " — added to your order");
      })
      .catch(function (err) { toast(err.message || "Could not add to your order", true); })
      .finally(function () { btn.disabled = false; });
  });

  /* ---- cart page --------------------------------------------------- */
  var root = document.querySelector("[data-cart-root]");
  if (root) {
    var fee = Math.max(0, Number(root.getAttribute("data-delivery-fee")) || 0);
    var waNumber = normalizePhone(root.getAttribute("data-wa"));

    function changeLine(line, qty) {
      fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: line, quantity: qty }),
      })
        .then(function (r) { return r.json(); })
        .then(function () { window.location.reload(); })
        .catch(function () { toast("Could not update the order", true); });
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
      if (e.target.closest("[data-goto-step2]")) showStep(2);
      if (e.target.closest("[data-back-step1]")) showStep(1);
    });

    function showStep(n) {
      root.querySelectorAll("[data-step]").forEach(function (s) {
        s.hidden = s.getAttribute("data-step") !== String(n);
      });
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    /* delivery form — same validation rules as CheckoutPage.tsx */
    var form = root.querySelector("[data-checkout-form]");
    if (form) {
      var setErr = function (key, msg) {
        var field = form.querySelector('[data-field="' + key + '"]');
        if (!field) return;
        field.classList.toggle("has-error", Boolean(msg));
        var err = field.querySelector(".rk-field__err");
        if (err) err.textContent = msg || "";
      };
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = function (name) { return (form.elements[name] && form.elements[name].value || "").trim(); };
        var phoneRe = /^\+?[0-9 ()-]{8,32}$/;
        var ok = true;
        var name = v("name"), phone = v("phone"), whats = v("whatsapp"), city = v("city"), address = v("address");
        setErr("name", name.length < 2 ? (ok = false, "Please enter your full name.") : "");
        setErr("phone", !phoneRe.test(phone) ? (ok = false, "Enter a valid mobile number (digits, e.g. 010xxxxxxxx).") : "");
        setErr("whatsapp", whats && !phoneRe.test(whats) ? (ok = false, "Enter a valid WhatsApp number, or leave empty.") : "");
        setErr("city", city.length < 2 ? (ok = false, "Please enter your city or governorate.") : "");
        setErr("address", address.length < 8 ? (ok = false, "Please enter the full delivery address.") : "");
        setErr("consent", !form.elements.consent.checked ? (ok = false, "We need your OK to contact you on WhatsApp about this order.") : "");
        if (!ok) { toast("Please fix the highlighted fields.", true); return; }

        var btn = form.querySelector("[data-submit-order]");
        var label = form.querySelector("[data-submit-label]");
        btn.disabled = true; label.textContent = "Saving your order…";

        fetch("/cart.js")
          .then(function (r) { return r.json(); })
          .then(function (cart) {
            if (!cart.items.length) { window.location.reload(); return; }
            // Order reference — generated at order time (RKS-XXXXXX).
            var ref = "RKS-" + String(Date.now() % 1000000).padStart(6, "0");
            var subtotal = Math.round(cart.total_price / 100);
            var total = subtotal + fee;
            // Exact port of shared/whatsapp.ts buildOrderMessage().
            var lines = ["Hello " + (window.REKA.storeName || "Reka Store") + ", I would like to place an order.", "", "Order reference: " + ref, "Name: " + name, "Phone: " + phone];
            if (whats && normalizePhone(whats) !== normalizePhone(phone)) lines.push("WhatsApp: " + whats);
            lines.push("City: " + city, "Address: " + address);
            if (v("building")) lines.push("Building/Floor/Apt: " + v("building"));
            if (v("notes")) lines.push("Notes: " + v("notes"));
            lines.push("", "Items:");
            cart.items.forEach(function (item) {
              lines.push("- " + item.product_title + " x " + item.quantity + " — " + formatPrice(Math.round(item.price / 100)));
            });
            lines.push("", "Subtotal: " + formatPrice(subtotal), "Delivery: " + (fee > 0 ? formatPrice(fee) : "to be confirmed"), "Total: " + formatPrice(total), "", "Please confirm availability and send me the transfer instructions. I understand payment is confirmed manually by the store.");
            var url = "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(lines.join("\n"));

            // Save the order request as a Shopify cart note before handoff so
            // the reference survives, then open WhatsApp and show step 3.
            var message = lines.join("\n");
            var refEl = root.querySelector("[data-order-ref]");
            if (refEl) refEl.textContent = ref;
            var resend = root.querySelector("[data-wa-resend]");
            if (resend) resend.href = url;
            var msgEl = root.querySelector("[data-order-message]");
            if (msgEl) msgEl.textContent = message;
            var copyBtn = root.querySelector("[data-copy-message]");
            if (copyBtn) copyBtn.onclick = function () {
              navigator.clipboard.writeText(message).then(
                function () { toast("Order message copied"); },
                function () { toast("Could not copy — long-press the message to copy it manually.", true); }
              );
            };
            try { sessionStorage.setItem("reka-last-order", JSON.stringify({ reference: ref, whatsappUrl: url, total: total })); } catch (e2) {}
            return fetch("/cart/update.js", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ note: "Order request " + ref + " — " + name + " — " + phone + " — " + city }),
            }).then(function () {
              window.open(url, "_blank", "noopener");
              showStep(3);
            });
          })
          .catch(function () { toast("Could not create your order. Please try again.", true); })
          .finally(function () { btn.disabled = false; label.textContent = "Send order via WhatsApp"; });
      });
    }
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
