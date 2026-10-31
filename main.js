/* Nara Educational Society — shared site script */
(function () {
  "use strict";
  var WA = "923013467491";
  var EMAIL = "naraedusociety@gmail.com";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  function waLink(text) { return "https://wa.me/" + WA + (text ? "?text=" + encodeURIComponent(text) : ""); }

  /* Menu panel (mobile / tablet) */
  var mb = $("#menuBtn"), panel = $("#panel");
  if (mb && panel) {
    mb.addEventListener("click", function () {
      var open = panel.classList.toggle("open");
      mb.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { panel.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); }
    });
  }

  /* Announcement ticker: tap to pause */
  var tv = $("#tickerView");
  if (tv) {
    var tog = function () { tv.classList.toggle("paused"); tv.setAttribute("aria-pressed", tv.classList.contains("paused")); };
    tv.addEventListener("click", tog);
    tv.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } });
  }

  /* Scroll reveal */
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("js-anim");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    $$(".card,.person,.tile,.ann,.step,.cc,.g-item,.contact-card,.cta").forEach(function (el, i) {
      el.classList.add("rv"); el.style.setProperty("--d", (i % 4) * 70 + "ms"); io.observe(el);
    });
  }

  /* WhatsApp popup */
  var fab = $("#waFab"), pop = $("#waPop");
  if (fab && pop) {
    var badge = $(".badge", fab);
    var setOpen = function (o) {
      pop.classList.toggle("open", o);
      fab.setAttribute("aria-expanded", o ? "true" : "false");
      if (o && badge) { badge.remove(); badge = null; }
      if (o) { var i = $("input", pop); if (i && window.innerWidth > 700) setTimeout(function () { i.focus(); }, 300); }
    };
    fab.addEventListener("click", function () { setOpen(!pop.classList.contains("open")); store.set("nes-wa", "1"); });
    $(".wa-x", pop).addEventListener("click", function () { setOpen(false); store.set("nes-wa", "1"); });
    var send = function () {
      var v = ($("input", pop).value || "").trim();
      window.open(waLink(v || "Assalam o Alaikum! I would like to know more about Nara Educational Society."), "_blank", "noopener");
    };
    $(".wa-go", pop).addEventListener("click", send);
    $("input", pop).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } });
    if (!store.get("nes-wa")) {
      setTimeout(function () { if (!pop.classList.contains("open")) { setOpen(true); store.set("nes-wa", "1"); } }, 6000);
    }
  }

  /* Prefilled WhatsApp / email links: <a data-wa="message"> */
  $$("[data-wa]").forEach(function (a) { a.href = waLink(a.getAttribute("data-wa")); a.target = "_blank"; a.rel = "noopener noreferrer"; });

  /* Save contact (vCard) */
  $$("[data-vcard]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var v = ["BEGIN:VCARD", "VERSION:3.0", "FN:Nara Educational Society", "ORG:Nara Educational Society",
        "TITLE:Education Society", "TEL;TYPE=CELL,WORK,VOICE:+" + WA, "EMAIL;TYPE=INTERNET,WORK:" + EMAIL,
        "ADR;TYPE=WORK:;;Nara;Sindh;;;Pakistan", "NOTE:Education builds a brighter future", "END:VCARD"].join("\r\n");
      var blob = new Blob([v], { type: "text/vcard" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "Nara-Educational-Society.vcf";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  });

  /* Contact form: send via WhatsApp or email */
  var form = $("#contactForm");
  if (form) {
    var compose = function () {
      var f = new FormData(form);
      return {
        name: (f.get("name") || "").toString().trim(),
        phone: (f.get("phone") || "").toString().trim(),
        topic: (f.get("topic") || "").toString(),
        msg: (f.get("message") || "").toString().trim()
      };
    };
    var text = function (d) {
      return "Assalam o Alaikum, I am " + (d.name || "(name)") + ".\nTopic: " + d.topic + "\n" + d.msg + (d.phone ? "\nMy phone: " + d.phone : "");
    };
    var ok = function () { if (!form.reportValidity()) return null; return compose(); };
    $("#sendWa").addEventListener("click", function () { var d = ok(); if (d) window.open(waLink(text(d)), "_blank", "noopener"); });
    $("#sendMail").addEventListener("click", function () {
      var d = ok(); if (!d) return;
      location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("NES enquiry: " + d.topic) + "&body=" + encodeURIComponent(text(d));
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); });
  }

  /* Gallery: filter + lightbox */
  var chips = $$(".chip[data-f]");
  if (chips.length) {
    var items = $$(".g-item");
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        chips.forEach(function (x) { x.classList.remove("on"); });
        c.classList.add("on");
        var f = c.getAttribute("data-f");
        items.forEach(function (it) { it.hidden = !(f === "all" || it.getAttribute("data-c") === f); it.classList.add("in"); });
      });
    });
    var lb = $("#lb"), lbImg = $("img", lb), lbCap = $("p", lb), cur = 0, list = [];
    var show = function (i) {
      cur = (i + list.length) % list.length;
      lbImg.src = list[cur].getAttribute("data-src"); lbImg.alt = list[cur].getAttribute("data-cap");
      lbCap.textContent = list[cur].getAttribute("data-cap");
    };
    items.forEach(function (it) {
      if (!it.getAttribute("data-src")) return;
      it.addEventListener("click", function () {
        list = items.filter(function (x) { return x.getAttribute("data-src") && !x.hidden; });
        show(list.indexOf(it)); lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
      });
    });
    var close = function () { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); };
    $(".x", lb).addEventListener("click", close);
    $(".pv", lb).addEventListener("click", function () { show(cur - 1); });
    $(".nx", lb).addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
    });
  }
})();
