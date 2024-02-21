!(function () {
  "use strict";
  if ("undefined" != typeof window && void 0 === e) {
    var e = {
      constants: { mode: { INLINE: "inline", FULL_PAGE: "fullPage" } },
      forms: [],
      flags: {
        isInitialized: !1,
        isInitOnReadyFired: !1,
        shouldBeShown: !1,
        shouldBePreloaded: !1,
      },
      initOnReady() {
        e.flags.isInitOnReadyFired || e.onInit(window, e.init);
      },
      onInit(t, i) {
        if (
          t.document &&
          ("complete" === t.document.readyState ||
            "interactive" === t.document.readyState)
        ) {
          i();
          return;
        }
        e.addEvent(t, "load", i),
          t.document &&
            (e.addEvent(t.document, "DOMContentLoaded", i),
            e.addEvent(t.document, "readystatechange", function () {
              "complete" === t.document.readyState && i();
            }));
      },
      init() {
        e.flags.isInitialized ||
          ((e.flags.isInitialized = !0),
          e.setupVisme(),
          e.addEvent(window, "message", e.onMessageHandler, !1));
      },
      getWidth: (e) => (e ? "100vw" : "100%"),
      getHeight: (e) => (e ? "100vh" : "100%"),
      getStyle(e) {
        let t = "border: none; max-width: 100vw; ";
        return (
          e &&
            (t +=
              "position: fixed; z-index: 999999; top: 0; left: 0; background: rgba(255, 255, 255, 0.78); "),
          t
        );
      },
      async getPopupSettings({ vismeDiv: e, formId: t, origin: i }) {
        if (t && i) {
          let e = await fetch(`${i}/ajax/forms/settings/${t}?type=fullPage`),
            r = await e.json();
          if (r?.settings) return JSON.parse(r.settings);
        }
        if (
          (console.warn(
            "VISME_FORMS: Popup settings are not loaded. Please update your embed code."
          ),
          e.getAttribute("data-trigger-page-load"))
        )
          return { afterPageLoad: !0 };
        if (e.getAttribute("data-trigger-user-interaction"))
          return { afterUserInteraction: !0 };
        let r = parseInt(e.getAttribute("data-trigger-scroll"));
        if (!Number.isNaN(r)) return { afterScrollDown: r };
        if (e.getAttribute("data-trigger-leave")) return { beforeLeave: !0 };
        let s = parseInt(e.getAttribute("data-trigger-timer"));
        return Number.isNaN(s) ? null : { afterTime: s };
      },
      addOnUserInteractionListener(t, i) {
        let r = () => {
          e.flags[i] || (t(), (e.flags[i] = !0));
        };
        [
          "keydown",
          "mousedown",
          "mousemove",
          "touchmove",
          "touchstart",
          "touchend",
          "wheel",
        ].forEach((e) => {
          document.addEventListener(e, r, { once: !0 });
        });
      },
      popupHandlers: {
        onAfterTime(e, t) {
          setTimeout(() => {
            t();
          }, 1e3 * e);
        },
        onPageScroll(e, t) {
          let i = document.documentElement.scrollHeight - window.innerHeight;
          i <= 0
            ? t()
            : ((e) => {
                let r = (e / 100) * i,
                  s = () => {
                    window.scrollY >= r &&
                      (t(), window.removeEventListener("scroll", s));
                  };
                window.addEventListener("scroll", s);
              })(e);
        },
        onUserInteraction(t) {
          e.addOnUserInteractionListener(t, "shouldBeShown");
        },
        onPageLeave(e) {
          document.body.addEventListener("mouseleave", e, { once: !0 });
        },
      },
      setPopupListener(t, i) {
        let r = t.settings;
        if (r?.afterPageLoad || !r) {
          i();
          return;
        }
        let {
            afterUserInteraction: s,
            afterScrollDown: o,
            beforeLeave: a,
            afterTime: n,
          } = r,
          { popupHandlers: d } = e;
        n
          ? d.onAfterTime(n, i)
          : o
          ? d.onPageScroll(o, i)
          : s
          ? d.onUserInteraction(i)
          : a && d.onPageLeave(i);
      },
      defineEmbedMode(t) {
        let { INLINE: i, FULL_PAGE: r } = e.constants.mode;
        return "true" === t.getAttribute("data-full-page") ? r : i;
      },
      preloadForm(t) {
        e.createIframe(t, !0),
          e.setPopupListener(t, () => {
            let i = e.getFormByIframeId(t.iframeId);
            if (!i.ref) {
              console.warn("VISME_FORMS: form.ref not found");
              return;
            }
            (i.ref.style.opacity = 1),
              (i.ref.style.zIndex = 999999),
              i.ref.contentWindow.postMessage(
                { type: "vismeForms:play", id: t.formId },
                "*"
              ),
              e.increaseNumberOfVisits(t.formId),
              e.updateLastVisit(t.formId);
          });
      },
      async setupVisme() {
        let t = document.getElementsByClassName("visme_d"),
          i = [],
          r = 1;
        for (let s = 0; s < t.length; s++) {
          let o = t[s],
            a = "true" === o.getAttribute("data-full-page"),
            n = o.getAttribute("data-form-id") || "",
            d = e.getOrigin(o),
            l = e.defineEmbedMode(o),
            m = null;
          a &&
            (m =
              (await e.getPopupSettings({
                vismeDiv: o,
                formId: n,
                origin: d,
              })) || null);
          let g = {
            vismeDiv: o,
            width: e.getWidth(a),
            height: e.getHeight(a),
            style: e.getStyle(a),
            origin: d,
            formId: n,
            mode: l,
            iframeId: r,
            settings: m,
          };
          i.push(g),
            e.forms.push({ formId: n, ref: null, mode: l, iframeId: r }),
            r++;
        }
        i.forEach(async (t) => {
          let i = t.mode === e.constants.mode.FULL_PAGE,
            r = !0;
          if (t.settings?.showing)
            switch (t.settings.showing.type) {
              case "everySession":
                r = !window.sessionStorage.getItem(
                  `vismeforms_${t.formId}_closed`
                );
                break;
              case "submission":
                r = !window.localStorage.getItem(
                  `vismeforms_${t.formId}_submitted`
                );
                break;
              case "closingForm":
                r = !window.localStorage.getItem(
                  `vismeforms_${t.formId}_closed`
                );
                break;
              case "visit":
                r = e.getNumberOfVisits(t.formId) < t.settings.showing.value;
                break;
              case "onceEvery": {
                let e =
                    parseInt(
                      window.localStorage.getItem(
                        `vismeforms_${t.formId}_lastVisit`
                      )
                    ) || 0,
                  [i, s] = t.settings.showing.value.split("*");
                e &&
                  i &&
                  s &&
                  (r =
                    Date.now() >
                    e +
                      parseInt(i) *
                        { hours: 36e5, days: 864e5, weeks: 6048e5 }[s]);
              }
            }
          if (i && !r) {
            console.warn(
              "VISME_FORMS: Full page form not shown because of showing settings"
            );
            return;
          }
          i
            ? e.addOnUserInteractionListener(() => {
                e.preloadForm(t);
              }, "shouldBePreloaded")
            : e.createIframe(t);
        });
      },
      getOrigin(e) {
        let t = e.getAttribute("data-domain") || "my",
          i = "local.visme.co" === t,
          r = "file://" === window.location.origin,
          s = "";
        return (
          r && (s = i ? "http:" : "https:"),
          s + "//" + t + (i ? "" : ".visme.co")
        );
      },
      addEvent(e, t, i) {
        e.addEventListener && e.addEventListener(t, i, !1);
      },
      getFormByIframeId: (t) => e.forms.find((e) => e.iframeId === t),
      getFormByIdAndMode: (t, i) =>
        e.forms.find((e) => e.formId === t && e.mode === i),
      createIframe(
        {
          vismeDiv: t,
          width: i,
          height: r,
          style: s,
          iframeId: o,
          mode: a,
          origin: n,
        },
        d = !1
      ) {
        let l = e.getFormByIframeId(o);
        if (!l || l.ref) return;
        let m = document.createElement("IFRAME"),
          g =
            "/formsPlayer/_embed/" +
            t.getAttribute("data-url") +
            "?embedIframeId=" +
            o;
        (m.style.cssText = s),
          (m.style.minHeight = t.getAttribute("data-min-height")),
          (m.style.width = i),
          (m.style.height = r),
          (m.style.border = "none"),
          d &&
            ((m.style.transition = "opacity 0.2s"),
            (m.style.opacity = 0),
            (m.style.zIndex = -999)),
          m.setAttribute("webkitallowfullscreen", !0),
          m.setAttribute("mozallowfullscreen", !0),
          m.setAttribute("allowfullScreen", !0),
          m.setAttribute("scrolling", "no"),
          m.setAttribute("src", n + g),
          m.setAttribute("title", t.getAttribute("data-title")),
          a === e.constants.mode.INLINE && m.setAttribute("loading", "lazy"),
          (m.className = "vismeForms"),
          t.parentNode.replaceChild(m, t),
          (l.ref = m);
      },
      onMessageHandler(t) {
        if (-1 === t.origin.indexOf("visme")) return;
        let i = t.data.type,
          r = t.data.id;
        if ("vismeForms:shouldClose" === i) {
          let t = e.getFormByIdAndMode(r, e.constants.mode.FULL_PAGE);
          t?.ref.parentNode.removeChild(t.ref),
            window.sessionStorage.setItem(`vismeforms_${r}_closed`, "true"),
            window.localStorage.setItem(`vismeforms_${r}_closed`, "true");
        }
        if (
          ("vismeForms:submitSuccess" === i &&
            window.localStorage.setItem(`vismeforms_${r}_submitted`, "true"),
          "vismeForms:formRectUpdated" === i)
        ) {
          let i = e.getFormByIframeId(parseInt(t.data.iframeId));
          if (!i || i.iframeSizeAdjusted) return;
          let r = JSON.parse(t.data.data.formRect);
          (i.ref.style.minHeight =
            Math.min(Math.max(r.height, 500), 600) +
            Number(t.data.data.badgeHeight) +
            "px"),
            (i.iframeSizeAdjusted = !0);
        }
      },
      getNumberOfVisits: (e) =>
        parseInt(window.localStorage.getItem(`vismeforms_${e}_visits`)) || 0,
      increaseNumberOfVisits(t) {
        let i = e.getNumberOfVisits(t);
        window.localStorage.setItem(`vismeforms_${t}_visits`, i + 1);
      },
      updateLastVisit(e) {
        window.localStorage.setItem(`vismeforms_${e}_lastVisit`, Date.now());
      },
    };
    e.initOnReady();
  }
})();
z