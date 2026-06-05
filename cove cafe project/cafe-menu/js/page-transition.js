const TRANSITION_DELAY = 280;

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  body.classList.add("page-transition", "fade-in");
  requestAnimationFrame(() => body.classList.remove("fade-in"));

  document.querySelectorAll("a[data-transition]").forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      if (!href || anchor.target === "_blank" || href.startsWith("#")) return;
      event.preventDefault();
      body.classList.add("fade-out");
      setTimeout(() => {
        window.location.href = href;
      }, TRANSITION_DELAY);
    });
  });
});
