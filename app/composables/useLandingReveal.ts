export function useLandingReveal(root: Ref<HTMLElement | null>) {
  onMounted(() => {
    const rootEl = root.value;

    if (!rootEl) {
      return;
    }

    const revealElements = () => {
      rootEl.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (!("IntersectionObserver" in window)) {
          el.classList.add("is-visible");
          return;
        }

        observer?.observe(el);
      });
    };

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
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
          )
        : null;

    revealElements();

    const mutationObserver = new MutationObserver(() => {
      revealElements();
    });

    mutationObserver.observe(rootEl, {
      childList: true,
      subtree: true,
    });

    onBeforeUnmount(() => {
      observer?.disconnect();
      mutationObserver.disconnect();
    });
  });
}
