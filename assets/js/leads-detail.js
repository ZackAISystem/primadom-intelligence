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



  function renderLeadsChart(data) {

    const root =
      $("leadsChart");

    if (!root) {
      return;
    }


    const rows =
      Array.isArray(
        data?.traffic_daily
      )
        ? data.traffic_daily
        : [];


    if (!rows.length) {
      root.innerHTML =
        '<div class="leads-chart-empty">No lead observations in this period.</div>';

      return;
    }


    const values =
      rows.map(
        row =>
          Number(
            row.leads || 0
          )
      );


    const width = 1100;
    const height = 290;

    const left = 52;
    const right = 28;
    const top = 30;
    const bottom = 48;

    const usableW =
      width - left - right;

    const usableH =
      height - top - bottom;


    const rawMax =
      Math.max(
        1,
        ...values
      );


    function niceMax(value) {
      if (value <= 5) {
        return 5;
      }

      if (value <= 10) {
        return 10;
      }

      return (
        Math.ceil(
          value / 5
        ) * 5
      );
    }


    const max =
      niceMax(rawMax);


    function xFor(index) {

      if (rows.length === 1) {
        return (
          left +
          usableW / 2
        );
      }

      return (
        left +
        (
          index /
          (rows.length - 1)
        ) *
        usableW
      );
    }


    function yFor(value) {
      return (
        top +
        usableH -
        (
          value /
          max
        ) *
        usableH
      );
    }


    const points =
      values.map(
        (value, index) => ({
          x: xFor(index),
          y: yFor(value),
          value
        })
      );


    let linePath = "";

    if (points.length === 1) {

      const p =
        points[0];

      linePath =
        `M ${left} ${p.y} L ${width - right} ${p.y}`;

    } else {

      linePath =
        points
          .map(
            (p, index) =>
              `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`
          )
          .join(" ");

    }


    const areaPath =
      points.length === 1
        ? `
          M ${left} ${points[0].y}
          L ${width - right} ${points[0].y}
          L ${width - right} ${top + usableH}
          L ${left} ${top + usableH}
          Z
        `
        : `
          M ${points[0].x} ${top + usableH}
          ${points
            .map(
              p =>
                `L ${p.x} ${p.y}`
            )
            .join(" ")
          }
          L ${points[points.length - 1].x} ${top + usableH}
          Z
        `;


    const gridLines = [];

    for (
      let i = 0;
      i <= 4;
      i++
    ) {

      const value =
        max -
        (
          max / 4
        ) *
        i;

      const y =
        top +
        (
          usableH / 4
        ) *
        i;

      gridLines.push(`
        <line
          class="leads-chart-grid"
          x1="${left}"
          x2="${width - right}"
          y1="${y}"
          y2="${y}"
        />

        <text
          class="leads-chart-axis"
          x="${left - 12}"
          y="${y + 4}"
          text-anchor="end"
        >${Math.round(value)}</text>
      `);
    }


    const xLabels =
      rows.map(
        (row, index) => {

          const raw =
            row.data_date ||
            row.date ||
            row.day ||
            "";

          let label =
            raw;

          if (
            /^\d{4}-\d{2}-\d{2}$/
              .test(raw)
          ) {

            const [
              year,
              month,
              day
            ] =
              raw.split("-");

            label =
              `${month}/${day}`;

          }

          return `
            <text
              class="leads-chart-axis"
              x="${xFor(index)}"
              y="${height - 16}"
              text-anchor="middle"
            >${label}</text>
          `;
        }
      )
      .join("");


    const dots =
      points.map(
        point => `
          <circle
            class="leads-chart-dot"
            cx="${point.x}"
            cy="${point.y}"
            r="5"
          />

          <text
            class="leads-chart-value"
            x="${point.x}"
            y="${point.y - 12}"
            text-anchor="middle"
          >${point.value}</text>
        `
      )
      .join("");


    root.innerHTML = `
      <svg
        class="leads-chart-svg"
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="Confirmed leads over time"
      >

        ${gridLines.join("")}

        <path
          class="leads-chart-area"
          d="${areaPath}"
        />

        <path
          class="leads-chart-line"
          d="${linePath}"
        />

        ${dots}

        ${xLabels}

      </svg>
    `;

  }


  function render(payload) {
    const data =
      payload?.data || {};

    const kpis =
      data.kpis || {};


    renderLeadsChart(
      data
    );

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


      if ($("leadsChart")) {
        $("leadsChart").innerHTML =
          '<div class="leads-chart-empty">Lead chart unavailable.</div>';
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
