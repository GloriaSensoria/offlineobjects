(() => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const revealTargets = document.querySelectorAll(
    ".passage, .notify, .reveal-section"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" }
    );

    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }

  const scriptUrl =
    (window.OFFLINE_OBJECTS_FORMS &&
      window.OFFLINE_OBJECTS_FORMS.googleScriptUrl) ||
    "";

  async function submitToSheet(payload, { form, note, successMessage }) {
    if (!note) return;

    note.hidden = false;

    if (!scriptUrl) {
      note.textContent =
        "Form isn’t connected yet. Add your Google Apps Script URL in form-config.js.";
      return;
    }

    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    note.textContent = "Sending…";

    try {
      // Apps Script web apps handle GET reliably; POST often 405s after redirect.
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        if (value != null && String(value) !== "") {
          params.set(key, String(value));
        }
      });

      const response = await fetch(`${scriptUrl}?${params.toString()}`, {
        method: "GET",
        redirect: "follow",
      });
      const text = await response.text();
      let result = null;
      try {
        result = JSON.parse(text);
      } catch (err) {
        throw new Error("Unexpected response from form service");
      }

      if (!result || result.ok !== true) {
        throw new Error((result && result.error) || "Submission failed");
      }

      // Never surface sheet/row debug text in the UI.
      note.textContent = String(successMessage || "")
        .split(/\s+Saved on\b/i)[0]
        .trim();
      form.reset();
    } catch (err) {
      note.textContent =
        "Something went wrong. Please try again or email dearofflineobjects@gmail.com.";
    } finally {
      if (button) button.disabled = false;
    }
  }

  document.querySelectorAll("[data-notify-form]").forEach((form) => {
    const note =
      form.parentElement?.querySelector("[data-note]") ||
      form.nextElementSibling;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = String(new FormData(form).get("email") || "").trim();
      if (!email) return;

      submitToSheet(
        { form: "updates", email },
        {
          form,
          note,
          successMessage: "You're on the list. We'll be in touch.",
        }
      );
    });
  });

  const contactForm = document.querySelector("[data-contact-form]");
  const contactNote = document.querySelector("[data-contact-note]");

  if (contactForm && contactNote) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(contactForm);

      submitToSheet(
        {
          form: "contact",
          name: String(data.get("name") || "").trim(),
          email: String(data.get("email") || "").trim(),
          topic: String(data.get("topic") || "").trim(),
          message: String(data.get("message") || "").trim(),
        },
        {
          form: contactForm,
          note: contactNote,
          successMessage: "Thanks — your message is on its way.",
        }
      );
    });
  }

  const aura = document.querySelector("[data-aura]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (aura && !reduceMotion) {
    document.body.prepend(aura);

    const offsetX = 120;
    const idleAfterMs = 1400;
    let cursorX = window.innerWidth * 0.5 + offsetX;
    let cursorY = window.innerHeight * 0.5;
    let currentX = cursorX;
    let currentY = cursorY;
    let wanderX = currentX;
    let wanderY = currentY;
    let wanderTargetX = currentX;
    let wanderTargetY = currentY;
    let followBlend = 1;
    let lastMove = performance.now();
    let nextRetarget = 0;
    let frame = 0;

    const place = (x, y) => {
      aura.style.setProperty("--ax", `${x}px`);
      aura.style.setProperty("--ay", `${y}px`);
    };

    const pickWanderTarget = () => {
      // Wider roam across the viewport so idle motion reads clearly
      wanderTargetX = window.innerWidth * (0.08 + Math.random() * 0.84);
      wanderTargetY = window.innerHeight * (0.1 + Math.random() * 0.8);
    };

    const tick = (now) => {
      const isIdle = now - lastMove > idleAfterMs;

      // Ease toward wander when idle; slowly return to cursor when active
      const blendGoal = isIdle ? 0 : 1;
      followBlend += (blendGoal - followBlend) * (isIdle ? 0.014 : 0.02);

      if (isIdle) {
        const dx = wanderTargetX - wanderX;
        const dy = wanderTargetY - wanderY;
        if (now > nextRetarget || dx * dx + dy * dy < 6400) {
          pickWanderTarget();
          nextRetarget = now + 3200 + Math.random() * 3600;
        }
      } else {
        // Keep wander near the live position so idle handoff stays soft
        wanderTargetX = currentX;
        wanderTargetY = currentY;
        nextRetarget = now + 1400;
      }

      // Slower random drift across the screen
      wanderX += (wanderTargetX - wanderX) * 0.008;
      wanderY += (wanderTargetY - wanderY) * 0.008;

      const desiredX = wanderX + (cursorX - wanderX) * followBlend;
      const desiredY = wanderY + (cursorY - wanderY) * followBlend;

      // Softer lag behind the cursor
      currentX += (desiredX - currentX) * 0.035;
      currentY += (desiredY - currentY) * 0.035;
      place(currentX, currentY);
      frame = requestAnimationFrame(tick);
    };

    place(currentX, currentY);
    frame = requestAnimationFrame(tick);

    window.addEventListener(
      "pointermove",
      (event) => {
        cursorX = event.clientX + offsetX;
        cursorY = event.clientY;
        lastMove = performance.now();
      },
      { passive: true }
    );

    document.documentElement.addEventListener(
      "mouseleave",
      () => {
        lastMove = 0;
      },
      { passive: true }
    );

    window.addEventListener(
      "pagehide",
      () => cancelAnimationFrame(frame),
      { once: true }
    );
  }

  const cookieKey = "oo-cookie-consent-v2";
  const defaultConsent = {
    necessary: true,
    analytics: false,
    decided: false,
  };

  const readConsent = () => {
    try {
      const raw = window.localStorage.getItem(cookieKey);
      if (!raw) return { ...defaultConsent };
      // Migrate previous simple "1" flag to accept-all
      if (raw === "1") {
        return { necessary: true, analytics: true, decided: true };
      }
      const parsed = JSON.parse(raw);
      return {
        necessary: true,
        analytics: Boolean(parsed.analytics),
        decided: Boolean(parsed.decided),
      };
    } catch (err) {
      return { ...defaultConsent };
    }
  };

  const writeConsent = (consent) => {
    const next = {
      necessary: true,
      analytics: Boolean(consent.analytics),
      decided: true,
    };
    window.localStorage.setItem(cookieKey, JSON.stringify(next));
    window.OfflineObjectsConsent = next;
    window.dispatchEvent(
      new CustomEvent("oo:consentchange", { detail: next })
    );
    return next;
  };

  const activateConsentScripts = (category) => {
    document
      .querySelectorAll(`script[type="text/plain"][data-consent="${category}"]`)
      .forEach((blocked) => {
        const active = document.createElement("script");
        Array.from(blocked.attributes).forEach((attr) => {
          if (attr.name === "type" || attr.name === "data-consent") return;
          active.setAttribute(attr.name, attr.value);
        });
        active.type = "text/javascript";
        if (blocked.textContent) active.textContent = blocked.textContent;
        blocked.replaceWith(active);
      });
  };

  const loadGoogleAnalytics = (measurementId) => {
    if (!measurementId || window.__ooAnalyticsLoaded) return;
    window.__ooAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true });

    const ga = document.createElement("script");
    ga.async = true;
    ga.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      measurementId
    )}`;
    document.head.appendChild(ga);
  };

  const applyConsent = (consent) => {
    window.OfflineObjectsConsent = consent;
    if (!consent.analytics) return;
    activateConsentScripts("analytics");
    const measurementId =
      (window.OFFLINE_OBJECTS_FORMS &&
        window.OFFLINE_OBJECTS_FORMS.analyticsId) ||
      window.OFFLINE_OBJECTS_ANALYTICS_ID ||
      "";
    if (measurementId) loadGoogleAnalytics(String(measurementId));
  };

  let consent = readConsent();
  applyConsent(consent);

  const showBanner = !consent.decided;
  if (showBanner) {
    const bar = document.createElement("div");
    bar.className = "cookie-bar";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-modal", "false");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.innerHTML = `
      <div class="cookie-bar-panel">
        <h2 class="cookie-bar-title">Cookies</h2>
        <p class="cookie-bar-copy">
          We use necessary cookies to run the site. Optional analytics cookies help us
          understand usage and only load if you allow them.
        </p>
        <div class="cookie-prefs" data-cookie-prefs hidden>
          <label class="cookie-pref">
            <span>
              <strong>Necessary</strong>
              <span>Required for basic site function. Always on.</span>
            </span>
            <span class="cookie-pref-toggle">
              <input type="checkbox" checked disabled aria-label="Necessary cookies always on" />
              <i aria-hidden="true"></i>
            </span>
          </label>
          <label class="cookie-pref">
            <span>
              <strong>Analytics</strong>
              <span>Helps us measure visits. Includes services like Google Analytics when configured.</span>
            </span>
            <span class="cookie-pref-toggle">
              <input type="checkbox" data-cookie-analytics aria-label="Allow analytics cookies" />
              <i aria-hidden="true"></i>
            </span>
          </label>
        </div>
        <div class="cookie-bar-actions">
          <button type="button" class="cookie-btn" data-cookie-accept-all>Accept All</button>
          <button type="button" class="cookie-btn cookie-btn-muted" data-cookie-reject-all>Reject All</button>
          <button type="button" class="cookie-btn cookie-btn-muted" data-cookie-manage>Manage Preferences</button>
          <button type="button" class="cookie-btn" data-cookie-save hidden>Save Preferences</button>
        </div>
      </div>
    `;
    document.body.appendChild(bar);

    const prefs = bar.querySelector("[data-cookie-prefs]");
    const analyticsToggle = bar.querySelector("[data-cookie-analytics]");
    const manageBtn = bar.querySelector("[data-cookie-manage]");
    const saveBtn = bar.querySelector("[data-cookie-save]");

    const closeBanner = () => {
      bar.classList.remove("is-visible");
      bar.classList.add("is-leaving");
      window.setTimeout(() => bar.remove(), 450);
    };

    const decide = (analytics) => {
      consent = writeConsent({ analytics });
      applyConsent(consent);
      closeBanner();
    };

    bar.querySelector("[data-cookie-accept-all]")?.addEventListener("click", () => {
      decide(true);
    });
    bar.querySelector("[data-cookie-reject-all]")?.addEventListener("click", () => {
      decide(false);
    });
    manageBtn?.addEventListener("click", () => {
      const open = prefs?.hasAttribute("hidden") ?? true;
      if (!prefs) return;
      if (open) {
        prefs.hidden = false;
        prefs.classList.add("is-open");
        manageBtn.hidden = true;
        if (saveBtn) saveBtn.hidden = false;
        if (analyticsToggle) analyticsToggle.checked = Boolean(consent.analytics);
      }
    });
    saveBtn?.addEventListener("click", () => {
      decide(Boolean(analyticsToggle?.checked));
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => bar.classList.add("is-visible"));
    });
  }



  document.querySelectorAll("[data-share-page]").forEach((button) => {
    const label = () => button.getAttribute("data-text") || "share article";
    const setLabel = (text) => {
      button.setAttribute("data-text", text);
      button.textContent = text;
    };

    button.addEventListener("click", async () => {
      const shareUrl =
        document.querySelector('link[rel="canonical"]')?.href ||
        window.location.href;
      const shareTitle = document.title;
      const shareText =
        document.querySelector('meta[name="description"]')?.content ||
        shareTitle;

      try {
        if (navigator.share) {
          await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
        const previous = label();
        setLabel("link copied");
        button.classList.add("is-shared");
        window.setTimeout(() => {
          setLabel(previous);
          button.classList.remove("is-shared");
        }, 1800);
      } catch (err) {
        window.prompt("Copy this link:", shareUrl);
      }
    });
  });


})();
