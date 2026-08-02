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

    // Sit farther to the right of the cursor tip
    const offsetX = 120;
    let targetX = window.innerWidth * 0.5 + offsetX;
    let targetY = window.innerHeight * 0.5;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;

    const place = (x, y) => {
      aura.style.setProperty("--ax", `${x}px`);
      aura.style.setProperty("--ay", `${y}px`);
    };

    const tick = () => {
      // Heavier lag — ease toward the (offset) cursor each frame
      currentX += (targetX - currentX) * 0.045;
      currentY += (targetY - currentY) * 0.045;
      place(currentX, currentY);
      frame = requestAnimationFrame(tick);
    };

    place(currentX, currentY);
    frame = requestAnimationFrame(tick);

    window.addEventListener(
      "pointermove",
      (event) => {
        targetX = event.clientX + offsetX;
        targetY = event.clientY;
      },
      { passive: true }
    );

    document.documentElement.addEventListener(
      "mouseleave",
      () => {
        targetX = window.innerWidth * 0.5 + offsetX;
        targetY = window.innerHeight * 0.5;
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
