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
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
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
    const idleAfterMs = 1100;
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
      followBlend += (blendGoal - followBlend) * (isIdle ? 0.022 : 0.03);

      if (isIdle) {
        const dx = wanderTargetX - wanderX;
        const dy = wanderTargetY - wanderY;
        if (now > nextRetarget || dx * dx + dy * dy < 6400) {
          pickWanderTarget();
          nextRetarget = now + 2200 + Math.random() * 2800;
        }
      } else {
        // Keep wander near the live position so idle handoff stays soft
        wanderTargetX = currentX;
        wanderTargetY = currentY;
        nextRetarget = now + 900;
      }

      // More obvious random drift across the screen
      wanderX += (wanderTargetX - wanderX) * 0.014;
      wanderY += (wanderTargetY - wanderY) * 0.014;

      const desiredX = wanderX + (cursorX - wanderX) * followBlend;
      const desiredY = wanderY + (cursorY - wanderY) * followBlend;

      currentX += (desiredX - currentX) * 0.06;
      currentY += (desiredY - currentY) * 0.06;
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
})();
