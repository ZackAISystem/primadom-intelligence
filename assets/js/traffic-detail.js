(() => {
  "use strict";

  const API =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const STORAGE_KEY =
    "primadom-intelligence-detail-period";

  const LANGUAGE_NAMES = {
    en: "English",
    ru: "Russian",
    hi: "Hindi",
    zh: "Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
    ar: "Arabic"
  };

  const COUNTRY_NAMES = {
    AE: "United Arab Emirates",
    US: "United States",
    GB: "United Kingdom",
    IN: "India",
    RU: "Russia",
    DE: "Germany",
    FR: "France",
    ES: "Spain",
    CN: "China",
    SA: "Saudi Arabia",
    QA: "Qatar",
    KW: "Kuwait",
    BH: "Bahrain",
    OM: "Oman",
    CA: "Canada",
    AU: "Australia",
    SG: "Singapore"
  };

  const $ = id =>
    document.getElementById(id);

  const num = value =>
    Number(value || 0).toLocaleString("en-US");

  const pct = value =>
    `${Number(value || 0).toFixed(2)}%`;

  const safe = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function countryFlag(code) {
    const value =
      String(code || "").toUpperCase();

    if (!/^[A-Z]{2}$/.test(value)) {
      return "◎";
    }

    return String.fromCodePoint(
      ...[...value].map(
        c => 127397 + c.charCodeAt()
      )
    );
  }

  function countryName(code) {
    const value =
      String(code || "").toUpperCase();

    return COUNTRY_NAMES[value] || value || "Unknown";
  }

  function channelLabel(row) {
    const raw =
      String(
        row.channel_group ||
        row.channel ||
        ""
      ).toLowerCase();

    const labels = {
      direct: "Direct",
      organic_search: "Organic Search",
      paid_search: "Paid Search",
      llm_referral: "LLM Referral",
      llm_campaign: "LLM Campaign",
      referral: "Referral",
      social: "Social",
      paid_social: "Paid Social",
      email: "Email"
    };

    return labels[raw] ||
      raw.replaceAll("_", " ")
         .replace(/\b\w/g, x => x.toUpperCase()) ||
      "Other";
  }

  function periodLabel(range, fallback) {
    if (!range) return fallback || "Selected period";

    if (range.from && range.to) {
      if (range.from === range.to) {
        return `${range.from} · 1 day`;
      }

      return `${range.from} → ${range.to} · ${Number(
        range.days || 0
      )} days`;
    }

    return fallback || "Selected period";
  }

  function conversion(leads, visitors) {
    const l = Number(leads || 0);
    const v = Number(visitors || 0);

    return v > 0
      ? (l / v) * 100
      : 0;
  }

  function renderKpis(data) {
    const k = data.kpis || {};

    const visitors =
      Number(k.human_visitors || 0);

    const sessions =
      Number(k.sessions || 0);

    const pageviews =
      Number(k.pageviews || 0);

    const engaged =
      Number(k.engaged_sessions || 0);

    const leads =
      Number(k.leads || 0);

    const engagementRate =
      Number.isFinite(Number(k.engagement_rate))
        ? Number(k.engagement_rate)
        : sessions > 0
          ? (engaged / sessions) * 100
          : 0;

    setText(
      "trafficVisitors",
      num(visitors)
    );

    setText(
      "trafficSessions",
      num(sessions)
    );

    setText(
      "trafficSessionsMeta",
      visitors > 0
        ? `${(sessions / visitors).toFixed(2)} sessions / visitor`
        : "—"
    );

    setText(
      "trafficPageviews",
      num(pageviews)
    );

    setText(
      "trafficPageviewsMeta",
      sessions > 0
        ? `${(pageviews / sessions).toFixed(2)} pageviews / session`
        : "—"
    );

    setText(
      "trafficEngagedSessions",
      num(engaged)
    );

    setText(
      "trafficEngagementRate",
      `${engagementRate.toFixed(2)}% engagement rate`
    );

    setText(
      "trafficLeads",
      num(leads)
    );

    setText(
      "trafficConversion",
      pct(conversion(leads, visitors))
    );
  }

  function renderSources(data) {
    const body =
      $("trafficSourcesBody");

    if (!body) return;

    const rows =
      Array.isArray(data.top_sources)
        ? data.top_sources
        : [];

    if (!rows.length) {
      body.innerHTML =
        '<tr><td colspan="6">No attributed sources in this period.</td></tr>';
      return;
    }

    body.innerHTML =
      rows.map(row => {
        const visitors =
          Number(row.visitors || 0);

        const leads =
          Number(row.leads || 0);

        return `
          <tr>
            <td><b>${safe(row.source_name || "Unknown")}</b></td>
            <td>${safe(channelLabel(row))}</td>
            <td>${num(visitors)}</td>
            <td>${num(row.sessions)}</td>
            <td>${num(leads)}</td>
            <td>${pct(conversion(leads, visitors))}</td>
          </tr>
        `;
      }).join("");
  }

  function renderChannelMix(data) {
    const root =
      $("trafficChannelMix");

    if (!root) return;

    const rows =
      Array.isArray(data.top_sources)
        ? data.top_sources
        : [];

    const groups = new Map();

    rows.forEach(row => {
      const label =
        channelLabel(row);

      groups.set(
        label,
        (groups.get(label) || 0) +
        Number(row.visitors || 0)
      );
    });

    const result =
      [...groups.entries()]
        .sort((a, b) => b[1] - a[1]);

    const total =
      result.reduce(
        (sum, row) => sum + row[1],
        0
      );

    if (!result.length || total <= 0) {
      root.innerHTML =
        '<div style="color:var(--muted);font-size:12px">No attributed channel activity in this period.</div>';
      return;
    }

    root.innerHTML =
      result.map(([label, visitors]) => {
        const share =
          (visitors / total) * 100;

        return `
          <div class="bar-row">
            <span>${safe(label)}</span>
            <div class="bar">
              <i style="width:${Math.max(
                1,
                Math.min(100, share)
              )}%"></i>
            </div>
            <b>${share.toFixed(1)}%</b>
          </div>
        `;
      }).join("");
  }

  function renderLlm(data) {
    const body =
      $("trafficLlmBody");

    if (!body) return;

    const rows =
      Array.isArray(data.llm_referrals)
        ? data.llm_referrals
        : [];

    if (!rows.length) {
      body.innerHTML =
        '<tr><td colspan="6">No proven human LLM referrals in this period.</td></tr>';
      return;
    }

    body.innerHTML =
      rows.map(row => {
        const visitors =
          Number(row.visitors || 0);

        const leads =
          Number(row.leads || 0);

        const sessions =
          row.sessions == null
            ? "—"
            : num(row.sessions);

        return `
          <tr>
            <td><b>${safe(row.source_name || "Unknown")}</b></td>
            <td>${num(visitors)}</td>
            <td>${sessions}</td>
            <td>${num(leads)}</td>
            <td>${pct(conversion(leads, visitors))}</td>
            <td>—</td>
          </tr>
        `;
      }).join("");
  }

  function renderLanguages(data) {
    const body =
      $("trafficLanguagesBody");

    if (!body) return;

    const rows =
      Array.isArray(data.languages)
        ? data.languages
        : [];

    if (!rows.length) {
      body.innerHTML =
        '<tr><td colspan="10">No language activity in this period.</td></tr>';
      return;
    }

    const order = [
      "en", "ru", "hi", "zh",
      "es", "fr", "de", "ar"
    ];

    const sorted =
      [...rows].sort((a, b) => {
        const aa =
          order.indexOf(
            String(a.language_code || "").toLowerCase()
          );

        const bb =
          order.indexOf(
            String(b.language_code || "").toLowerCase()
          );

        return (
          (aa === -1 ? 999 : aa) -
          (bb === -1 ? 999 : bb)
        );
      });

    body.innerHTML =
      sorted.map(row => {
        const code =
          String(
            row.language_code || ""
          ).toLowerCase();

        const visitors =
          Number(row.visitors || 0);

        const leads =
          Number(row.leads || 0);

        return `
          <tr>
            <td>
              <b>${safe(code.toUpperCase())}</b>
              — ${safe(
                LANGUAGE_NAMES[code] ||
                code.toUpperCase()
              )}
            </td>

            <td>${num(visitors)}</td>
            <td>${num(row.sessions)}</td>
            <td>${num(row.pageviews)}</td>
            <td>${num(row.engaged_pageviews)}</td>
            <td>${num(leads)}</td>
            <td>${pct(conversion(leads, visitors))}</td>
            <td>${num(row.search_clicks)}</td>
            <td>${num(row.ai_requests)}</td>
            <td>—</td>
          </tr>
        `;
      }).join("");
  }

  function renderCountries(data) {
    const body =
      $("trafficCountriesBody");

    const note =
      $("trafficGeoCoverage");

    if (!body) return;

    const rows =
      Array.isArray(data.countries)
        ? data.countries
        : [];

    if (!rows.length) {
      body.innerHTML =
        '<tr><td colspan="4">Country dimension is collecting. No known geo observations in this period.</td></tr>';

      if (note) {
        note.textContent =
          "Historical sessions created before geo collection remain unknown and are not backfilled.";
      }

      return;
    }

    body.innerHTML =
      rows.map(row => {
        const code =
          String(
            row.country_code || ""
          ).toUpperCase();

        return `
          <tr>
            <td>
              <span style="margin-right:7px">${countryFlag(code)}</span>
              <b>${safe(countryName(code))}</b>
            </td>

            <td>${num(row.visitors)}</td>
            <td>${num(row.sessions)}</td>
            <td>${Number(
              row.share_of_known_geo_pct || 0
            ).toFixed(1)}%</td>
          </tr>
        `;
      }).join("");

    const first =
      rows[0] || {};

    if (note) {
      note.textContent =
        `Geo coverage: ${Number(
          first.geo_coverage_pct || 0
        ).toFixed(2)}% · ${num(
          first.geo_known_visitors
        )} known of ${num(
          first.all_visitors
        )} visitors · country shares are calculated only across known geo.`;
    }
  }

  function renderChart(data) {
    const root =
      $("trafficDetailChart");

    if (!root) return;

    const rows =
      Array.isArray(data.traffic_daily)
        ? data.traffic_daily
        : [];

    if (!rows.length) {
      root.innerHTML =
        '<div style="padding:70px 10px;text-align:center;color:var(--muted)">No traffic observations in this period.</div>';
      return;
    }

    const W = 1000;
    const H = 300;

    const left = 48;
    const right = 970;
    const top = 24;
    const bottom = 245;

    const values =
      rows.map(row =>
        Number(row.visitors || 0)
      );

    const max =
      Math.max(1, ...values);

    const x = index =>
      rows.length === 1
        ? (left + right) / 2
        : left +
          (index / (rows.length - 1)) *
          (right - left);

    const y = value =>
      bottom -
      (Number(value || 0) / max) *
      (bottom - top);

    const points =
      rows.map(
        (row, i) =>
          `${x(i)},${y(row.visitors)}`
      ).join(" ");

    const grid =
      [0, .25, .5, .75, 1]
        .map(ratio => {
          const yy =
            bottom -
            ratio * (bottom - top);

          const label =
            Math.round(max * ratio);

          return `
            <line
              x1="${left}"
              y1="${yy}"
              x2="${right}"
              y2="${yy}"
              stroke="currentColor"
              opacity=".08"
            />
            <text
              x="4"
              y="${yy + 4}"
              font-size="11"
              fill="currentColor"
              opacity=".55"
            >${num(label)}</text>
          `;
        }).join("");

    const labels =
      rows.map((row, i) => {
        if (
          rows.length > 12 &&
          i !== 0 &&
          i !== rows.length - 1 &&
          i % Math.ceil(rows.length / 6) !== 0
        ) {
          return "";
        }

        const date =
          String(
            row.date ||
            row.day ||
            row.metric_date ||
            ""
          );

        return `
          <text
            x="${x(i)}"
            y="278"
            text-anchor="middle"
            font-size="10"
            fill="currentColor"
            opacity=".55"
          >${safe(date.slice(5))}</text>
        `;
      }).join("");

    root.innerHTML = `
      <div style="
        display:flex;
        gap:18px;
        align-items:center;
        margin:0 0 10px 48px;
        font-size:11px;
        color:var(--muted)
      ">
        <span><b style="color:var(--text)">Human Visitors</b> · daily observations</span>
      </div>

      <svg
        viewBox="0 0 ${W} ${H}"
        width="100%"
        role="img"
        aria-label="Human visitors over time"
        style="overflow:visible;color:var(--text)"
      >
        ${grid}

        <polyline
          points="${points}"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        ${rows.map(
          (row, i) => `
            <circle
              cx="${x(i)}"
              cy="${y(row.visitors)}"
              r="4"
              fill="currentColor"
            >
              <title>${safe(
                row.date ||
                row.day ||
                row.metric_date ||
                ""
              )}: ${num(row.visitors)} visitors</title>
            </circle>
          `
        ).join("")}

        ${labels}
      </svg>
    `;
  }

  function renderAll(data, requestedPeriod) {
    renderKpis(trafficData);
    renderChart(trafficData);
    renderSources(trafficData);
    renderChannelMix(trafficData);
    renderLlm(trafficData);
    renderLanguages(trafficData);
    renderCountries(trafficData);

    setText(
      "trafficRangeLabel",
      periodLabel(trafficRange,
        requestedPeriod.toUpperCase()
      )
    );
  }

  function setLoading() {
    [
      "trafficVisitors",
      "trafficSessions",
      "trafficPageviews",
      "trafficEngagedSessions",
      "trafficLeads",
      "trafficConversion"
    ].forEach(id =>
      setText(id, "…")
    );
  }

  function setError(message) {
    console.error(
      "[Traffic & Analytics]",
      message
    );

    const chart =
      $("trafficDetailChart");

    if (chart) {
      chart.innerHTML =
        `<div style="padding:70px 10px;text-align:center;color:var(--muted)">
          Traffic data could not be loaded.
        </div>`;
    }
  }

  async function loadTraffic(
    period = "7d",
    from = null,
    to = null
  ) {
    setLoading();

    const url =
      new URL(API);

    url.searchParams.set(
      "period",
      period
    );

    if (
      period === "custom" &&
      from &&
      to
    ) {
      url.searchParams.set(
        "from",
        from
      );

      url.searchParams.set(
        "to",
        to
      );
    }

    try {
      const response =
        await fetch(
          url.toString(),
          {
            headers: {
              Accept: "application/json"
            }
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

    // Production overview API envelope:
    // { ok, service, version, range, data }
    const trafficEnvelope = data;
    const trafficData =
      trafficEnvelope && trafficEnvelope.data
        ? trafficEnvelope.data
        : data;

    const trafficRange =
      trafficEnvelope && trafficEnvelope.range
        ? trafficEnvelope.range
        : null;


      renderAll(
        data,
        period
      );
    } catch (error) {
      setError(error);
    }
  }

  function activateButton(period) {
    document
      .querySelectorAll(
        "[data-traffic-period]"
      )
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.trafficPeriod === period
        );
      });
  }

  function saveState(state) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (_) {}
  }

  function readState() {
    try {
      const value =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          ) || "{}"
        );

      if (
        ["1d", "7d", "30d", "90d", "custom"]
          .includes(value.period)
      ) {
        return value;
      }
    } catch (_) {}

    return {
      period: "7d",
      from: null,
      to: null
    };
  }

  function init() {
    if (!$("traffic")) return;

    const customBox =
      $("trafficCustomRange");

    const fromInput =
      $("trafficFrom");

    const toInput =
      $("trafficTo");

    const apply =
      $("trafficApplyCustom");

    let state =
      readState();

    if (
      state.period === "custom" &&
      (!state.from || !state.to)
    ) {
      state = {
        period: "7d",
        from: null,
        to: null
      };
    }

    activateButton(
      state.period
    );

    if (
      state.period === "custom" &&
      customBox
    ) {
      customBox.style.display =
        "flex";

      if (fromInput) {
        fromInput.value =
          state.from || "";
      }

      if (toInput) {
        toInput.value =
          state.to || "";
      }
    }

    document
      .querySelectorAll(
        "[data-traffic-period]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            const period =
              button.dataset.trafficPeriod;

            activateButton(period);

            if (period === "custom") {
              if (customBox) {
                customBox.style.display =
                  "flex";
              }

              return;
            }

            if (customBox) {
              customBox.style.display =
                "none";
            }

            state = {
              period,
              from: null,
              to: null
            };

            saveState(state);

            loadTraffic(period);
          }
        );
      });

    if (apply) {
      apply.addEventListener(
        "click",
        () => {
          const from =
            fromInput?.value || "";

          const to =
            toInput?.value || "";

          if (!from || !to) {
            alert(
              "Select both From and To dates."
            );
            return;
          }

          if (from > to) {
            alert(
              "From date cannot be after To date."
            );
            return;
          }

          state = {
            period: "custom",
            from,
            to
          };

          saveState(state);
          activateButton("custom");

          loadTraffic(
            "custom",
            from,
            to
          );
        }
      );
    }

    loadTraffic(
      state.period,
      state.from,
      state.to
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

  // Traffic detail uses the exact Dashboard period component styling.
  function syncTrafficPeriodUI(value) {
    document
      .querySelectorAll("#traffic .period [data-traffic-period]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          String(button.dataset.trafficPeriod || "").toLowerCase() ===
          String(value || "").toLowerCase()
        );
      });
  }

})();
