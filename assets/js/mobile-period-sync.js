(() => {
  "use strict";

  const mobile =
    window.matchMedia("(max-width: 768px)");

  const periodAttributes = [
    "data-period",
    "data-traffic-period",
    "data-bot-period",
    "data-search-period",
    "data-pages-period",
    "data-leads-period"
  ];

  const selector =
    periodAttributes
      .map(attr => `button[${attr}]`)
      .join(",");

  function periodAttribute(button) {
    return periodAttributes.find(attr =>
      button.hasAttribute(attr)
    ) || null;
  }

  function syncActiveButton(button) {
    if (!mobile.matches || !button) {
      return;
    }

    const attr =
      periodAttribute(button);

    if (!attr) {
      return;
    }

    const scope =
      button.closest(".screen") ||
      document;

    scope
      .querySelectorAll(`button[${attr}]`)
      .forEach(item => {
        item.classList.toggle(
          "active",
          item === button
        );
      });
  }

  document.addEventListener(
    "click",
    event => {
      if (!mobile.matches) {
        return;
      }

      const button =
        event.target.closest(selector);

      if (!button) {
        return;
      }

      /*
       * Existing screen scripts still control:
       * - API period
       * - localStorage
       * - Custom range
       * - data reload
       *
       * This fixes ONLY the final mobile visual state.
       * Run after their click handlers have finished.
       */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncActiveButton(button);
        });
      });
    }
  );
})();
