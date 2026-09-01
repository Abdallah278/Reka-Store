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

  /* ---- cart page --------------------------------------------------- */
  var root = document.querySelector("[data-cart-root]");
  if (root) {
    var flatFee = Math.max(0, Number(root.getAttribute("data-delivery-fee")) || 0);
    var waNumber = normalizePhone(root.getAttribute("data-wa"));
    var freeAbove = Number((root.getAttribute("data-free-above") || "").replace(/[^\d.]/g, "")) || 0;

    /* Shipping zones from Theme settings: "Governorate | fee | delivery time" per line. */
    var zones = [];
    try {
      var zonesRaw = JSON.parse(document.querySelector("[data-shipping-zones]").textContent || '""');
      zones = String(zonesRaw).split("\n").map(function (line) {
        var parts = line.split("|").map(function (s) { return s.trim(); });
        if (!parts[0]) return null;
        var feeNum = parts[1] !== undefined && parts[1] !== "" ? Number(parts[1].replace(/[^\d.]/g, "")) : null;
        return { name: parts[0], fee: feeNum !== null && !isNaN(feeNum) ? feeNum : null, time: parts[2] || "" };
      }).filter(Boolean);
    } catch (e0) { zones = []; }

    var govSelect = root.querySelector("[data-gov-select]");
    var govHint = root.querySelector("[data-gov-hint]");
    if (govSelect && zones.length) {
      zones.forEach(function (z, i) {
        var opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = z.name + (z.fee !== null ? " — " + formatPrice(z.fee) : "");
        govSelect.insertBefore(opt, govSelect.lastElementChild);
      });
    }
    function selectedZone() {
      if (!govSelect || govSelect.value === "" || govSelect.value === "__other__") return null;
      return zones[Number(govSelect.value)] || null;
    }
    function govName() {
      if (!govSelect || govSelect.value === "") return "";
      if (govSelect.value === "__other__") return root.querySelector('[name="city"]').value.trim() || "Other";
      var z = selectedZone();
      return z ? z.name : "";
    }
    /* fee for current selection; null = confirmed on WhatsApp */
    function currentFee(subtotal) {
      if (freeAbove > 0 && subtotal >= freeAbove) return 0;
      var z = selectedZone();
      if (z) return z.fee; // may be null → confirmed in chat
      if (govSelect && govSelect.value === "__other__") return null;
      if (!zones.length) return flatFee > 0 ? flatFee : null;
      return null;
    }
    if (govSelect && govHint) {
      govSelect.addEventListener("change", function () {
        var z = selectedZone();
        if (z) {
          var bits = [];
          if (z.fee !== null) bits.push("Delivery " + formatPrice(z.fee)); else bits.push(t("fee_confirmed", "Delivery fee confirmed on WhatsApp"));
          if (z.time) bits.push("est. " + z.time);
          govHint.textContent = bits.join(" · ");
        } else if (govSelect.value === "__other__") {
          govHint.textContent = t("other_gov_hint", "Delivery fee & timing for your governorate are confirmed on WhatsApp.");
        } else { govHint.textContent = ""; }
      });
    }

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
      var phase = 1;
      form.addEventListener("input", function () {
        if (phase === 2) {
          phase = 1;
          var lbl = form.querySelector("[data-submit-label]");
          if (lbl) lbl.textContent = t("review_label", "Review delivery details");
        }
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = function (name) { return (form.elements[name] && form.elements[name].value || "").trim(); };
        var phoneRe = /^\+?[0-9 ()-]{8,32}$/;
        var ok = true;
        var name = v("name"), phone = v("phone"), whats = v("whatsapp"), city = v("city"), address = v("address"), building = v("building"), landmark = v("landmark");
        var gov = govName();
        setErr("name", name.length < 2 ? (ok = false, t("err_name", "Please enter your full name.")) : "");
        setErr("phone", !phoneRe.test(phone) ? (ok = false, t("err_phone", "Enter a valid mobile number (digits, e.g. 010xxxxxxxx).")) : "");
        setErr("whatsapp", whats && !phoneRe.test(whats) ? (ok = false, t("err_whatsapp", "Enter a valid WhatsApp number, or leave empty.")) : "");
        if (govSelect) setErr("governorate", govSelect.value === "" ? (ok = false, t("err_governorate", "Please choose your governorate.")) : "");
        setErr("city", city.length < 2 ? (ok = false, t("err_city", "Please enter your area or city.")) : "");
        setErr("building", building.length < 1 ? (ok = false, t("err_building", "Building / floor / apartment helps the courier find you.")) : "");
        setErr("address", address.length < 8 ? (ok = false, t("err_address", "Please enter the street address in detail.")) : "");
        setErr("consent", !form.elements.consent.checked ? (ok = false, t("err_consent", "We need your OK to contact you on WhatsApp about this order.")) : "");
        if (!ok) { toast(t("fix_fields", "Please fix the highlighted fields."), true); phase = 1; return; }

        var btn = form.querySelector("[data-submit-order]");
        var label = form.querySelector("[data-submit-label]");
        btn.disabled = true; label.textContent = phase === 1 ? t("preparing", "Preparing summary…") : t("saving", "Saving your order…");

        fetch("/cart.js")
          .then(function (r) { return r.json(); })
          .then(function (cart) {
            if (!cart.items.length) { window.location.reload(); return; }
            var subtotal = Math.round(cart.total_price / 100);
            var zone = selectedZone();
            var feeNow = currentFee(subtotal); // number or null (= confirmed on WhatsApp)
            var freeApplied = freeAbove > 0 && subtotal >= freeAbove;
            var deliveryText = freeApplied ? "Free (order above " + formatPrice(freeAbove) + ")" : feeNow !== null ? formatPrice(feeNow) : "Confirmed on WhatsApp";
            var etaText = zone && zone.time ? zone.time : "";
            var total = subtotal + (feeNow || 0);
            var totalText = feeNow !== null ? formatPrice(total) : formatPrice(subtotal) + " + delivery";

            /* ---- phase 1: show the shipping summary, wait for confirm ---- */
            if (phase === 1) {
              var box = root.querySelector("[data-ship-summary]");
              var flds = root.querySelector("[data-ship-summary-fields]");
              var rows = [["Name", name], ["Phone", phone]];
              if (whats && normalizePhone(whats) !== normalizePhone(phone)) rows.push(["WhatsApp", whats]);
              rows.push(["Governorate", gov || "—"], ["Area / city", city], ["Address", address], ["Building / apt", building]);
              if (landmark) rows.push(["Landmark", landmark]);
              if (v("notes")) rows.push(["Notes", v("notes")]);
              if (etaText) rows.push(["Estimated delivery", etaText]);
              flds.innerHTML = "";
              rows.forEach(function (r2) {
                var d = document.createElement("div");
                var dt = document.createElement("dt"); dt.textContent = r2[0];
                var dd = document.createElement("dd"); dd.textContent = r2[1];
                d.appendChild(dt); d.appendChild(dd); flds.appendChild(d);
              });
              root.querySelector("[data-sum-subtotal]").textContent = formatPrice(subtotal);
              root.querySelector("[data-sum-delivery]").textContent = deliveryText + (etaText ? " · " + etaText : "");
              root.querySelector("[data-sum-total]").textContent = totalText;
              root.querySelector("[data-sum-note]").textContent = feeNow === null || !etaText
                ? "Final delivery cost and timing are confirmed with you on WhatsApp before anything ships."
                : "We confirm availability on WhatsApp before anything ships.";
              box.hidden = false;
              box.scrollIntoView({ behavior: "smooth", block: "center" });
              label.textContent = t("confirm_label", "Confirm — send via WhatsApp");
              btn.disabled = false;
              phase = 2;
              return;
            }

            /* ---- phase 2: build the full WhatsApp message and hand off ---- */
            var ref = "RKS-" + String(Date.now() % 1000000).padStart(6, "0");
            var lines = ["Hello " + (window.REKA.storeName || "Reka Store") + ", I would like to place an order.", "", "Order reference: " + ref, "Name: " + name, "Phone: " + phone];
            if (whats && normalizePhone(whats) !== normalizePhone(phone)) lines.push("WhatsApp: " + whats);
            if (gov) lines.push("Governorate: " + gov);
            lines.push("Area/City: " + city, "Address: " + address, "Building/Floor/Apt: " + building);
            if (landmark) lines.push("Landmark: " + landmark);
            if (v("notes")) lines.push("Notes: " + v("notes"));
            lines.push("", "Items:");
            cart.items.forEach(function (item) {
              lines.push("- " + item.product_title + " x " + item.quantity + " — " + formatPrice(Math.round(item.price / 100)));
            });
            lines.push("", "Subtotal: " + formatPrice(subtotal));
            lines.push("Delivery: " + (freeApplied ? "Free (order above " + formatPrice(freeAbove) + ")" : feeNow !== null ? formatPrice(feeNow) : "to be confirmed on WhatsApp") + (etaText ? " (est. " + etaText + ")" : ""));
            lines.push("Total: " + (feeNow !== null ? formatPrice(total) : formatPrice(subtotal) + " + delivery"));
            lines.push("", "Please confirm availability" + (feeNow === null || !etaText ? ", the delivery cost/timing" : "") + " and send me the transfer instructions. I understand payment is confirmed manually by the store.");
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
                function () { toast(t("copied", "Order message copied")); },
                function () { toast(t("copy_fail", "Could not copy — long-press the message to copy it manually."), true); }
              );
            };
            try { sessionStorage.setItem("reka-last-order", JSON.stringify({ reference: ref, whatsappUrl: url, total: total })); } catch (e2) {}

            // Save everything on the cart (note = the full WhatsApp message;
            // attributes show on the Shopify order under "Additional details"),
            // then open WhatsApp in a new tab and send THIS tab to Shopify
            // checkout with the address prefilled. The customer places the
            // order with cash-on-delivery / manual payment, so it lands in the
            // Shopify admin as a pending order to confirm after the transfer.
            var attrs = { "Order reference": ref };
            if (whats && normalizePhone(whats) !== normalizePhone(phone)) attrs["WhatsApp"] = whats;
            if (gov) attrs["Governorate"] = gov;
            if (landmark) attrs["Landmark"] = landmark;
            if (v("notes")) attrs["Delivery notes"] = v("notes");
            attrs["Delivery"] = deliveryText + (etaText ? " (est. " + etaText + ")" : "");

            var nameParts = name.split(/\s+/);
            var prefill = {
              "checkout[shipping_address][first_name]": nameParts[0] || name,
              "checkout[shipping_address][last_name]": nameParts.slice(1).join(" ") || ".",
              "checkout[shipping_address][address1]": address,
              "checkout[shipping_address][address2]": building,
              "checkout[shipping_address][city]": city,
              "checkout[shipping_address][province]": gov,
              "checkout[shipping_address][country]": "Egypt",
              "checkout[shipping_address][phone]": phone,
            };
            var qs = Object.keys(prefill)
              .filter(function (k) { return prefill[k]; })
              .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(prefill[k]); })
              .join("&");

            return fetch("/cart/update.js", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ note: message, attributes: attrs }),
            }).then(function () {
              window.open(url, "_blank", "noopener");
              window.location.href = "/checkout?" + qs;
            });
          })
          .catch(function () { toast(t("order_fail", "Could not create your order. Please try again."), true); })
          .finally(function () { btn.disabled = false; label.textContent = t("send_label", "Send order via WhatsApp"); });
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
