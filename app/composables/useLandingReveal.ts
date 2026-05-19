export function useLandingReveal(root: Ref<HTMLElement | null>) {
  onMounted(() => {
    const rootEl = root.value;

    if (!rootEl) {
      return;
    }

    const revealNodes = () =>
      Array.from(rootEl.querySelectorAll<HTMLElement>("[data-reveal]"));

    const showAll = () => {
      revealNodes().forEach((el) => el.classList.add("is-visible"));
    };

    const isNearViewport = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth;

      return (
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= viewportHeight * 1.12 &&
        rect.left <= viewportWidth
      );
    };

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      showAll();
      return;
    }

    let hasFallbackRevealed = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16,
      },
    );

    const revealElements = () => {
      revealNodes().forEach((el) => {
        if (hasFallbackRevealed || el.classList.contains("is-visible")) {
          el.classList.add("is-visible");
          return;
        }

        if (isNearViewport(el)) {
          el.classList.add("is-visible");
          return;
        }

        observer.observe(el);
      });
    };

    revealElements();

    // Hide only after first-paint visibility is handled, so JS timing cannot blank the page.
    requestAnimationFrame(() => {
      rootEl.classList.add("reveal-enhanced");
      revealElements();
    });

    const fallbackTimer = window.setTimeout(() => {
      hasFallbackRevealed = true;
      showAll();
    }, 1600);

    const mutationObserver = new MutationObserver(() => {
      revealElements();
    });

    mutationObserver.observe(rootEl, {
      childList: true,
      subtree: true,
    });

    onBeforeUnmount(() => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.clearTimeout(fallbackTimer);
      rootEl.classList.remove("reveal-enhanced");
    });
  });
}
