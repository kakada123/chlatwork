export function useLandingReveal(root: Ref<HTMLElement | null>) {
  onMounted(() => {
    const rootEl = root.value;

    if (!rootEl || !("IntersectionObserver" in window)) {
      rootEl
        ?.querySelectorAll<HTMLElement>("[data-reveal]")
        .forEach((el) => el.classList.add("is-visible"));
      return;
    }

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

    rootEl
      .querySelectorAll<HTMLElement>("[data-reveal]")
      .forEach((el) => observer.observe(el));

    onBeforeUnmount(() => observer.disconnect());
  });
}
