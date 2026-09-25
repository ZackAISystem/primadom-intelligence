(() => {
  "use strict";

  const API =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const $ =
    id => document.getElementById(id);

  let currentPeriod = "7d";


  function activate(period) {
    document
      .querySelectorAll("[data-leads-period]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.leadsPeriod === period
        );
      });
  }


  function customVisible(show) {
    const el = $("leadsCustomRange");

    if (el) {
      el.style.display =
        show ? "flex" : "none";
    }
  }


  function formatNumber(value) {
    return Number(value || 0)
      .toLocaleString("en-US");
  }


  function render(payload) {
    const data =
      payload?.data || {};

    const kpis =
      data.kpis || {};

    const leads =
      Number(kpis.leads || 0);

    const visitors =
      Number(
        kpis.human_visitors || 0
      );

    const conversion =
      visitors > 0
        ? leads / visitors * 100
        : 0;

    if ($("leadsTotal")) {
      $("leadsTotal").textContent =
        formatNumber(leads);
    }

    if ($("leadsConversion")) {
      $("leadsConversion").textContent =
        `${conversion.toFixed(2)}%`;
    }

    const range =
      payload?.range || {};

    if ($("leadsRangeLabel")) {
      if (range.from && range.to) {
        $("leadsRangeLabel").textContent =
          `${range.from} → ${range.to}`;
      } else {
        $("leadsRangeLabel").textContent =
          "Selected period";
      }
    }
  }


  async function load(
    period = "7d",
    from = null,
    to = null
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "period",
      period
    );

    if (
      period === "custom" &&
      from &&
      to
    ) {
      params.set(
        "from",
        from
      );

      params.set(
        "to",
        to
      );
    }

    try {
      const response =
        await fetch(
          `${API}?${params.toString()}`,
          {
            method: "GET",
            mode: "cors",
            credentials: "omit",
            cache: "no-store",
            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const payload =
        await response.json();

      if (
        !payload ||
        payload.ok !== true
      ) {
        throw new Error(
          "Invalid API response"
        );
      }

      render(payload);

    } catch (error) {
      console.error(
        "[Leads & Conversions]",
        error
      );

      if ($("leadsTotal")) {
        $("leadsTotal").textContent =
          "—";
      }

      if ($("leadsConversion")) {
        $("leadsConversion").textContent =
          "—";
      }
    }
  }


  document
    .querySelectorAll("[data-leads-period]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const period =
            button.dataset.leadsPeriod;

          activate(period);

          if (period === "custom") {
            customVisible(true);
            return;
          }

          customVisible(false);

          currentPeriod =
            period;

          load(period);
        }
      );

    });


  $("leadsApplyCustom")
    ?.addEventListener(
      "click",
      () => {

        const from =
          $("leadsFrom")?.value;

        const to =
          $("leadsTo")?.value;

        if (!from || !to) {
          return;
        }

        currentPeriod =
          "custom";

        activate("custom");

        load(
          "custom",
          from,
          to
        );
      }
    );


  activate("7d");
  customVisible(false);
  load("7d");

})();
