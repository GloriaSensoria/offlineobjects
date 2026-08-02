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

  document.querySelectorAll("[data-notify-form]").forEach((form) => {
    const note =
      form.parentElement?.querySelector("[data-note]") ||
      form.nextElementSibling;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = new FormData(form).get("email");
      if (!email) return;

      if (note && "hidden" in note) {
        note.hidden = false;
        note.textContent = "You're on the list. We'll be in touch.";
      }
      form.reset();
    });
  });

  const contactForm = document.querySelector("[data-contact-form]");
  const contactNote = document.querySelector("[data-contact-note]");

  if (contactForm && contactNote) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      contactNote.hidden = false;
      contactNote.textContent =
        "Thanks — your message is ready to send once email is wired up.";
      contactForm.reset();
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
