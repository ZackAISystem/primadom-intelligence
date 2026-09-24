(() => {
  "use strict";

  const API =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const $ = id => document.getElementById(id);

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

  const conversion = (leads, visitors) =>
    Number(visitors || 0) > 0
      ? (Number(leads || 0) / Number(visitors)) * 100
      : 0;

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function channelLabel(row) {
    const raw =
      row.channel_name ||
      row.channel_group ||
      row.channel ||
      row.source_channel ||
      "—";

    return String(raw)
      .replaceAll("_", " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function rangeLabel(range) {
    if (!range) return "Selected period";

    const from = range.from || "";
    const to = range.to || "";
    const days = range.days;

    if (from && to && days) {
      return `${from} → ${to} · ${days} day${Number(days) === 1 ? "" : "s"}`;
    }

    return from && to
      ? `${from} → ${to}`
      : "Selected period";
  }

  /* ========================================================
     LOADING / ERROR
     ======================================================== */

  function setLoading() {
    [
      "trafficVisitors",
      "trafficSessions",
      "trafficPageviews",
      "trafficEngagedSessions",
      "trafficLeads",
      "trafficConversion"
    ].forEach(id => setText(id, "Loading…"));

    setText("trafficSessionsMeta", "—");
    setText("trafficPageviewsMeta", "—");
    setText("trafficEngagementRate", "—");
    setText("trafficRangeLabel", "Loading…");

    const chart = $("trafficDetailChart");
    if (chart) {
      chart.innerHTML =
        '<div style="display:grid;place-items:center;height:100%;color:#71809a">Loading traffic data…</div>';
    }

    const sources = $("trafficSourcesBody");
    if (sources) {
      sources.innerHTML =
        '<tr><td colspan="6">Loading…</td></tr>';
    }

    const llm = $("trafficLlmBody");
    if (llm) {
      llm.innerHTML =
        '<tr><td colspan="6">Loading…</td></tr>';
    }

    const languages = $("trafficLanguagesBody");
    if (languages) {
      languages.innerHTML =
        '<tr><td colspan="10">Loading…</td></tr>';
    }

    const countries = $("trafficCountriesBody");
    if (countries) {
      countries.innerHTML =
        '<tr><td colspan="4">Loading…</td></tr>';
    }

    const mix = $("trafficChannelMix");
    if (mix) mix.textContent = "Loading…";
  }

  function setError(error) {
    console.error("[Traffic & Analytics]", error);

    [
      "trafficVisitors",
      "trafficSessions",
      "trafficPageviews",
      "trafficEngagedSessions",
      "trafficLeads",
      "trafficConversion"
    ].forEach(id => setText(id, "—"));

    setText("trafficSessionsMeta", "—");
    setText("trafficPageviewsMeta", "—");
    setText("trafficEngagementRate", "—");
    setText("trafficRangeLabel", "Data unavailable");

    const chart = $("trafficDetailChart");
    if (chart) {
      chart.innerHTML =
        '<div style="display:grid;place-items:center;height:100%;color:#71809a">Traffic data could not be loaded.</div>';
    }

    const sources = $("trafficSourcesBody");
    if (sources) {
      sources.innerHTML =
        '<tr><td colspan="6">Data unavailable.</td></tr>';
    }

    const llm = $("trafficLlmBody");
    if (llm) {
      llm.innerHTML =
        '<tr><td colspan="6">Data unavailable.</td></tr>';
    }

    const languages = $("trafficLanguagesBody");
    if (languages) {
      languages.innerHTML =
        '<tr><td colspan="10">Data unavailable.</td></tr>';
    }

    const countries = $("trafficCountriesBody");
    if (countries) {
      countries.innerHTML =
        '<tr><td colspan="4">Data unavailable.</td></tr>';
    }

    const mix = $("trafficChannelMix");
    if (mix) mix.textContent = "Data unavailable.";
  }

  /* ========================================================
     KPI
     ======================================================== */

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
      Number(k.engagement_rate || 0);

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

  /* ========================================================
     TRAFFIC CHART
     ======================================================== */

  function renderChart(data) {
    const root = $("trafficDetailChart");
    if (!root) return;

    const rows =
      Array.isArray(data.traffic_daily)
        ? data.traffic_daily
        : [];

    if (!rows.length) {
      root.innerHTML =
        '<div style="display:grid;place-items:center;height:100%;color:#71809a">No traffic observations in this period.</div>';
      return;
    }

    const values =
      rows.map(row =>
        Number(
          row.visitors ??
          row.human_visitors ??
          0
        )
      );

    const max =
      Math.max(...values, 1);

    const width = 1000;
    const height = 260;
    const left = 48;
    const right = 22;
    const top = 24;
    const bottom = 42;

    const usableW =
      width - left - right;

    const usableH =
      height - top - bottom;

    const points =
      values.map((value, index) => {
        const x =
          left +
          (
            rows.length === 1
              ? usableW / 2
              : (index / (rows.length - 1)) * usableW
          );

        const y =
          top +
          usableH -
          (value / max) * usableH;

        return { x, y, value };
      });

    const polyline =
      points
        .map(p => `${p.x},${p.y}`)
        .join(" ");

    const labels =
      rows.map((row, index) => {
        const x =
          left +
          (
            rows.length === 1
              ? usableW / 2
              : (index / (rows.length - 1)) * usableW
          );

        const raw =
          row.date ||
          row.day ||
          row.metric_date ||
          "";

        const label =
          String(raw).slice(5);

        return `
          <text
            x="${x}"
            y="${height - 12}"
            text-anchor="middle"
            font-size="10"
            fill="#7a8698"
          >${safe(label)}</text>
        `;
      }).join("");

    const dots =
      points.map(p => `
        <circle
          cx="${p.x}"
          cy="${p.y}"
          r="4"
          fill="#2d75f0"
        >
          <title>${num(p.value)} visitors</title>
        </circle>
      `).join("");

    root.innerHTML = `
      <svg
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        style="width:100%;height:100%;display:block"
        aria-label="Human visitors over time"
      >
        <line
          x1="${left}"
          y1="${top + usableH}"
          x2="${width - right}"
          y2="${top + usableH}"
          stroke="#e6ebf2"
        />

        <polyline
          points="${polyline}"
          fill="none"
          stroke="#2d75f0"
          stroke-width="3"
          vector-effect="non-scaling-stroke"
        />

        ${dots}
        ${labels}
      </svg>
    `;
  }

  /* ========================================================
     ACQUISITION
     ======================================================== */

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
            <td><b>${safe(row.source_name || row.source || "Unknown")}</b></td>
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

    if (!rows.length) {
      root.textContent =
        "No attributed channel activity in this period.";
      return;
    }

    const groups =
      new Map();

    rows.forEach(row => {
      const channel =
        channelLabel(row);

      const visitors =
        Number(row.visitors || 0);

      groups.set(
        channel,
        (groups.get(channel) || 0) + visitors
      );
    });

    const total =
      [...groups.values()]
        .reduce((sum, value) => sum + value, 0);

    root.innerHTML =
      [...groups.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([channel, visitors]) => {
          const share =
            total > 0
              ? (visitors / total) * 100
              : 0;

          return `
            <div class="bar-row">
              <span>${safe(channel)}</span>
              <div class="bar">
                <i style="width:${Math.min(100, share).toFixed(1)}%"></i>
              </div>
              <b>${share.toFixed(1)}%</b>
            </div>
          `;
        }).join("");
  }

  /* ========================================================
     LLM REFERRALS
     ======================================================== */

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

        return `
          <tr>
            <td><b>${safe(row.source_name || row.source || "Unknown")}</b></td>
            <td>${num(visitors)}</td>
            <td>${num(row.sessions)}</td>
            <td>${num(leads)}</td>
            <td>${pct(conversion(leads, visitors))}</td>
            <td>—</td>
          </tr>
        `;
      }).join("");
  }

  /* ========================================================
     LANGUAGES
     ======================================================== */

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

    body.innerHTML =
      rows.map(row => {
        const visitors =
          Number(row.visitors || 0);

        const leads =
          Number(row.leads || 0);

        return `
          <tr>
            <td><b>${safe(
              row.language_code ||
              row.language ||
              "—"
            ).toUpperCase()}</b></td>

            <td>${num(visitors)}</td>
            <td>${num(row.sessions)}</td>
            <td>${num(row.pageviews)}</td>
            <td>${num(
              row.engaged_pageviews ??
              row.engaged ??
              0
            )}</td>
            <td>${num(leads)}</td>
            <td>${pct(conversion(leads, visitors))}</td>
            <td>${num(
              row.search_clicks ??
              row.google_clicks ??
              0
            )}</td>
            <td>${num(
              row.ai_requests ??
              row.ai_bot_requests ??
              0
            )}</td>
            <td>—</td>
          </tr>
        `;
      }).join("");
  }

  /* ========================================================
     COUNTRIES
     ======================================================== */

  function renderCountries(data) {
    const body =
      $("trafficCountriesBody");

    if (!body) return;

    const rows =
      Array.isArray(data.countries)
        ? data.countries
        : [];

    if (!rows.length) {
      body.innerHTML =
        '<tr><td colspan="4">Country dimension is collecting. No known geo observations in this period.</td></tr>';

      setText(
        "trafficGeoCoverage",
        "Historical sessions created before geo collection remain unknown and are not backfilled."
      );

      return;
    }

    body.innerHTML =
      rows.map(row => {
        const share =
          Number(
            row.share_of_known_geo_pct ??
            row.share_pct ??
            row.share ??
            0
          );

        return `
          <tr>
            <td><b>${safe(
              row.country_name ||
              row.country_code ||
              row.country ||
              "Unknown"
            )}</b></td>
            <td>${num(row.visitors)}</td>
            <td>${num(row.sessions)}</td>
            <td>${share.toFixed(2)}%</td>
          </tr>
        `;
      }).join("");

    const first =
      rows[0] || {};

    const coverage =
      first.geo_coverage_pct ??
      data.geo_coverage_pct;

    const known =
      first.geo_known_visitors ??
      data.geo_known_visitors;

    const all =
      first.all_visitors ??
      data.all_visitors;

    if (
      coverage !== undefined &&
      coverage !== null
    ) {
      setText(
        "trafficGeoCoverage",
        `Geo coverage: ${Number(coverage).toFixed(2)}%${
          known !== undefined && all !== undefined
            ? ` · ${num(known)} known of ${num(all)} visitors`
            : ""
        } · shares are based on known geo only.`
      );
    } else {
      setText(
        "trafficGeoCoverage",
        "Shares are based on visitors with known geo only."
      );
    }
  }

  /* ========================================================
     MASTER RENDER
     ======================================================== */

  function renderAll(data, range) {
    renderKpis(data);
    renderChart(data);
    renderSources(data);
    renderChannelMix(data);
    renderLlm(data);
    renderLanguages(data);
    renderCountries(data);

    setText(
      "trafficRangeLabel",
      rangeLabel(range)
    );
  }

  /* ========================================================
     API
     ======================================================== */

  let requestId = 0;

  async function loadTraffic(
    period = "7d",
    customFrom = null,
    customTo = null
  ) {
    const thisRequest =
      ++requestId;

    setLoading();

    try {
      const params =
        new URLSearchParams();

      params.set(
        "period",
        period
      );

      if (period === "custom") {
        if (!customFrom || !customTo) {
          throw new Error(
            "Custom range requires From and To dates"
          );
        }

        params.set(
          "from",
          customFrom
        );

        params.set(
          "to",
          customTo
        );
      }

      const response =
        await fetch(
          `${API}?${params.toString()}`,
          {
            method: "GET",
            mode: "cors",
            credentials: "omit",
            headers: {
              Accept: "application/json"
            }
          }
        );

      if (!response.ok) {
        throw new Error(
          `Overview HTTP ${response.status}`
        );
      }

      const payload =
        await response.json();

      if (
        !payload ||
        payload.ok !== true ||
        !payload.data
      ) {
        throw new Error(
          "Invalid overview payload"
        );
      }

      if (
        thisRequest !==
        requestId
      ) {
        return;
      }

      renderAll(
        payload.data,
        payload.range
      );

      console.info(
        "[Traffic & Analytics] live",
        payload.range,
        payload.data.kpis
      );

    } catch (error) {
      if (
        thisRequest ===
        requestId
      ) {
        setError(error);
      }
    }
  }

  /* ========================================================
     PERIOD CONTROL
     ======================================================== */

  const validPeriods =
    new Set([
      "today",
      "7d",
      "30d",
      "90d",
      "custom"
    ]);

  let currentPeriod =
    localStorage.getItem(
      "primadom-intelligence-detail-period"
    ) || "7d";

  currentPeriod =
    String(currentPeriod).toLowerCase();

  if (!validPeriods.has(currentPeriod)) {
    currentPeriod = "7d";
  }

  function activateButton(period) {
    document
      .querySelectorAll(
        "#traffic [data-traffic-period]"
      )
      .forEach(button => {
        button.classList.toggle(
          "active",
          String(
            button.dataset.trafficPeriod
          ).toLowerCase() === period
        );
      });
  }

  function showCustom(show) {
    const root =
      $("trafficCustomRange");

    if (root) {
      root.style.display =
        show ? "" : "none";
    }
  }

  document
    .querySelectorAll(
      "#traffic [data-traffic-period]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const period =
            String(
              button.dataset.trafficPeriod
            ).toLowerCase();

          if (
            !validPeriods.has(period)
          ) {
            return;
          }

          activateButton(period);

          if (period === "custom") {
            showCustom(true);
            return;
          }

          showCustom(false);

          currentPeriod =
            period;

          localStorage.setItem(
            "primadom-intelligence-detail-period",
            period
          );

          loadTraffic(period);
        }
      );
    });

  const applyCustom =
    $("trafficApplyCustom");

  if (applyCustom) {
    applyCustom.addEventListener(
      "click",
      () => {
        const from =
          $("trafficFrom")?.value;

        const to =
          $("trafficTo")?.value;

        if (!from || !to) {
          return;
        }

        currentPeriod =
          "custom";

        localStorage.setItem(
          "primadom-intelligence-detail-period",
          "custom"
        );

        activateButton("custom");

        loadTraffic(
          "custom",
          from,
          to
        );
      }
    );
  }

  /* ========================================================
     INITIAL LOAD
     ======================================================== */

  activateButton(currentPeriod);

  if (currentPeriod === "custom") {
    currentPeriod = "7d";

    localStorage.setItem(
      "primadom-intelligence-detail-period",
      "7d"
    );

    activateButton("7d");
  }

  showCustom(false);

  loadTraffic(currentPeriod);

})();
