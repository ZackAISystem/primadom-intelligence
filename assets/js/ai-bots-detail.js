(() => {
  "use strict";

  const API =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const $ = id => document.getElementById(id);

  const num = value =>
    new Intl.NumberFormat("en-US").format(
      Number(value || 0)
    );

  const pct = value =>
    `${Number(value || 0).toFixed(2).replace(/\.00$/, "")}%`;

  const safe = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const titleCase = value =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, c => c.toUpperCase());

  const operatorNames = {
    openai: "OpenAI",
    google: "Google",
    anthropic: "Anthropic",
    perplexity: "Perplexity",
    microsoft: "Microsoft",
    amazon: "Amazon",
    baidu: "Baidu",
    common_crawl: "Common Crawl",
    semrush: "Semrush",
    ahrefs: "Ahrefs"
  };

  const languageNames = {
    en: "English",
    ru: "Russian",
    ar: "Arabic",
    es: "Spanish",
    de: "German",
    fr: "French",
    hi: "Hindi",
    zh: "Chinese"
  };

  let currentPeriod =
    localStorage.getItem(
      "primadom-intelligence-detail-period"
    ) || "7d";

  function normalizePeriod(value) {
    const p = String(value || "").toLowerCase();

    if (p === "today" || p === "1d") return "today";
    if (p === "7d") return "7d";
    if (p === "30d") return "30d";
    if (p === "90d") return "90d";
    if (p === "custom") return "custom";

    return "7d";
  }

  currentPeriod = normalizePeriod(currentPeriod);

  function activateButton(period) {
    document
      .querySelectorAll("[data-bot-period]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.botPeriod === period
        );
      });
  }

  function showCustom(show) {
    const root = $("botCustomRange");
    if (root) root.style.display = show ? "flex" : "none";
  }

  function resetView() {
    [
      "botRequests",
      "botPages",
      "botErrors",
      "botOperators"
    ].forEach(id => {
      if ($(id)) $(id).textContent = "—";
    });

    if ($("botRequestsMeta"))
      $("botRequestsMeta").textContent = "Loading data…";

    if ($("botErrorRate"))
      $("botErrorRate").textContent = "—";

    if ($("botOperatorsMeta"))
      $("botOperatorsMeta").textContent = "—";

    if ($("botActivityChart"))
      $("botActivityChart").textContent = "Loading data…";

    if ($("botPurposeBody"))
      $("botPurposeBody").innerHTML =
        '<tr><td colspan="4">Loading data…</td></tr>';

    if ($("botLanguagesBody"))
      $("botLanguagesBody").innerHTML =
        '<tr><td colspan="3">Loading data…</td></tr>';

    if ($("botRegistryBody"))
      $("botRegistryBody").innerHTML =
        '<tr><td colspan="7">Loading data…</td></tr>';
  }

  function renderKpis(data) {
    const k = data.kpis || {};
    const rows =
      Array.isArray(data.crawlers)
        ? data.crawlers
        : [];

    const requests =
      Number(k.ai_bot_requests || 0);

    const pages =
      Number(k.ai_crawled_pages || 0);

    const operators =
      Number(k.ai_operators || 0);

    const errors =
      rows.reduce(
        (sum, row) =>
          sum + Number(row.errors || 0),
        0
      );

    const crawlerRequests =
      rows.reduce(
        (sum, row) =>
          sum + Number(row.requests || 0),
        0
      );

    const errorRate =
      crawlerRequests > 0
        ? (errors / crawlerRequests) * 100
        : 0;

    $("botRequests").textContent =
      num(requests);

    $("botPages").textContent =
      num(pages);

    $("botErrors").textContent =
      num(errors);

    $("botOperators").textContent =
      num(operators);

    $("botErrorRate").textContent =
      `${pct(errorRate)} of crawler requests`;

    const uniqueOperators =
      [...new Set(
        rows
          .map(row => row.operator_key)
          .filter(Boolean)
      )];

    $("botOperatorsMeta").textContent =
      uniqueOperators.length
        ? uniqueOperators
            .slice(0, 4)
            .map(key =>
              operatorNames[key] ||
              titleCase(key)
            )
            .join(", ") +
          (uniqueOperators.length > 4 ? "…" : "")
        : "—";
  }

  function renderCoverage(data, range) {
    const coverage =
      data.coverage?.ai_bots || {};

    const requested =
      data.coverage?.requested || {};

    const actualDays =
      Number(coverage.days || 0);

    const requestedDays =
      Number(requested.days || range?.days || 0);

    let text = "";

    if (coverage.from && coverage.to) {
      text =
        `Bot telemetry available ${coverage.from} → ${coverage.to}`;

      if (
        actualDays &&
        requestedDays &&
        actualDays < requestedDays
      ) {
        text +=
          ` · ${actualDays} of ${requestedDays} requested days`;
      }
    } else {
      text = "Bot telemetry coverage unavailable";
    }

    $("botCoverageLabel").textContent = text;

    $("botRequestsMeta").textContent =
      actualDays
        ? `${actualDays} day${actualDays === 1 ? "" : "s"} of bot telemetry`
        : "Selected period";

    if (range?.from && range?.to) {
      $("botRangeLabel").textContent =
        `${range.from} → ${range.to}`;
    }
  }

  function renderPurpose(data) {
    const rows =
      Array.isArray(data.crawlers)
        ? data.crawlers
        : [];

    const grouped = {};

    rows.forEach(row => {
      const key =
        row.bot_purpose || "other";

      if (!grouped[key]) {
        grouped[key] = {
          requests: 0,
          pages: 0,
          errors: 0
        };
      }

      grouped[key].requests +=
        Number(row.requests || 0);

      grouped[key].pages +=
        Number(row.pages || 0);

      grouped[key].errors +=
        Number(row.errors || 0);
    });

    const out =
      Object.entries(grouped)
        .map(([purpose, values]) => ({
          purpose,
          ...values
        }))
        .sort(
          (a, b) =>
            b.requests - a.requests
        );

    $("botPurposeBody").innerHTML =
      out.length
        ? out.map(row => `
          <tr>
            <td>${safe(titleCase(row.purpose))}</td>
            <td>${num(row.requests)}</td>
            <td>${num(row.pages)}</td>
            <td>${num(row.errors)}</td>
          </tr>
        `).join("")
        : '<tr><td colspan="4">No crawler activity for this period.</td></tr>';
  }

  function renderLanguages(data) {
    const rows =
      Array.isArray(data.languages)
        ? data.languages
        : [];

    const total =
      rows.reduce(
        (sum, row) =>
          sum + Number(row.ai_requests || 0),
        0
      );

    const out =
      rows
        .map(row => ({
          code: row.language_code,
          requests: Number(
            row.ai_requests || 0
          )
        }))
        .sort(
          (a, b) =>
            b.requests - a.requests
        );

    $("botLanguagesBody").innerHTML =
      out.length
        ? out.map(row => `
          <tr>
            <td>
              ${safe(
                languageNames[row.code] ||
                String(row.code || "").toUpperCase()
              )}
            </td>
            <td>${num(row.requests)}</td>
            <td>${
              total
                ? pct(
                    (row.requests / total) * 100
                  )
                : "0%"
            }</td>
          </tr>
        `).join("")
        : '<tr><td colspan="3">No language bot activity for this period.</td></tr>';
  }

  function renderRegistry(data) {
    const rows =
      Array.isArray(data.crawlers)
        ? [...data.crawlers]
        : [];

    rows.sort(
      (a, b) =>
        Number(b.requests || 0) -
        Number(a.requests || 0)
    );

    $("botRegistryCount").textContent =
      `${num(rows.length)} crawler${rows.length === 1 ? "" : "s"}`;

    $("botRegistryBody").innerHTML =
      rows.length
        ? rows.map(row => `
          <tr>
            <td>
              ${safe(
                operatorNames[row.operator_key] ||
                titleCase(row.operator_key)
              )}
            </td>
            <td>${safe(row.bot_name || row.bot_key)}</td>
            <td>${safe(titleCase(row.bot_purpose))}</td>
            <td>${safe(titleCase(row.machine_channel))}</td>
            <td>${num(row.requests)}</td>
            <td>${num(row.pages)}</td>
            <td>${num(row.errors)}</td>
          </tr>
        `).join("")
        : '<tr><td colspan="7">No crawler activity for this period.</td></tr>';
  }

  function renderChart(data) {
    const root =
      $("botActivityChart");

    const rows =
      Array.isArray(data.traffic_daily)
        ? data.traffic_daily
        : [];

    if (!rows.length) {
      root.textContent =
        "No bot activity data for this period.";
      return;
    }

    const values =
      rows.map(row =>
        Number(row.ai_requests || 0)
      );

    const width = 1100;
    const height = 290;
    const left = 64;
    const right = 24;
    const top = 22;
    const bottom = 46;

    const usableW =
      width - left - right;

    const usableH =
      height - top - bottom;

    const rawMax =
      Math.max(...values, 1);

    const magnitude =
      Math.pow(
        10,
        Math.floor(
          Math.log10(rawMax)
        )
      );

    const scaled =
      rawMax / magnitude;

    let step;

    if (scaled <= 1) step = 1;
    else if (scaled <= 2) step = 2;
    else if (scaled <= 5) step = 5;
    else step = 10;

    const max =
      step * magnitude;

    const xFor = index =>
      left +
      (
        rows.length === 1
          ? usableW / 2
          : (
              index /
              (rows.length - 1)
            ) * usableW
      );

    const yFor = value =>
      top +
      usableH -
      (value / max) * usableH;

    const gridCount = 4;

    const grid =
      Array.from(
        { length: gridCount + 1 },
        (_, i) => {
          const value =
            (max / gridCount) * i;

          const y =
            yFor(value);

          return `
            <line
              x1="${left}"
              y1="${y}"
              x2="${width - right}"
              y2="${y}"
              stroke="#e8edf4"
              stroke-width="1"
            />
            <text
              x="${left - 11}"
              y="${y + 4}"
              text-anchor="end"
              font-size="11"
              fill="#7a8698"
            >${num(Math.round(value))}</text>
          `;
        }
      ).join("");

    const points =
      rows.map(
        (row, index) => ({
          x: xFor(index),
          y: yFor(
            Number(
              row.ai_requests || 0
            )
          ),
          value: Number(
            row.ai_requests || 0
          ),
          date:
            row.data_date ||
            row.date ||
            ""
        })
      );

    const polyline =
      points
        .map(
          p => `${p.x},${p.y}`
        )
        .join(" ");

    const labelEvery =
      rows.length > 45 ? 7 :
      rows.length > 20 ? 4 :
      rows.length > 10 ? 2 : 1;

    const labels =
      points.map(
        (p, index) => {
          if (
            index % labelEvery !== 0 &&
            index !== points.length - 1
          ) {
            return "";
          }

          return `
            <text
              x="${p.x}"
              y="${height - 15}"
              text-anchor="middle"
              font-size="10"
              fill="#7a8698"
            >${safe(String(p.date).slice(5))}</text>
          `;
        }
      ).join("");

    const dots =
      points.map(p => `
        <circle
          cx="${p.x}"
          cy="${p.y}"
          r="3.5"
          fill="#d59631"
        >
          <title>${safe(p.date)} · ${num(p.value)} AI & bot requests</title>
        </circle>
      `).join("");

    root.innerHTML = `
      <svg
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        style="width:100%;height:100%;display:block"
        aria-label="AI and bot requests over time"
      >
        ${grid}

        <polyline
          points="${polyline}"
          fill="none"
          stroke="#d59631"
          stroke-width="2.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />

        ${dots}
        ${labels}
      </svg>
    `;
  }

  function renderAll(payload) {
    const data =
      payload?.data || {};

    renderKpis(data);
    renderCoverage(
      data,
      payload?.range || {}
    );
    renderPurpose(data);
    renderLanguages(data);
    renderRegistry(data);
    renderChart(data);
  }

  function showError(error) {
    console.error(
      "AI & Bot Intelligence:",
      error
    );

    if ($("botRequestsMeta"))
      $("botRequestsMeta").textContent =
        "Data could not be loaded";

    if ($("botActivityChart"))
      $("botActivityChart").textContent =
        "Bot activity data could not be loaded.";

    if ($("botPurposeBody"))
      $("botPurposeBody").innerHTML =
        '<tr><td colspan="4">Data could not be loaded.</td></tr>';

    if ($("botLanguagesBody"))
      $("botLanguagesBody").innerHTML =
        '<tr><td colspan="3">Data could not be loaded.</td></tr>';

    if ($("botRegistryBody"))
      $("botRegistryBody").innerHTML =
        '<tr><td colspan="7">Data could not be loaded.</td></tr>';
  }

  async function loadBots(
    period,
    from = "",
    to = ""
  ) {
    resetView();

    let url =
      `${API}?period=${encodeURIComponent(period)}`;

    if (
      period === "custom" &&
      from &&
      to
    ) {
      url +=
        `&from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}`;
    }

    try {
      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const payload =
        await response.json();

      if (
        !payload ||
        typeof payload !== "object"
      ) {
        throw new Error(
          "Invalid API response"
        );
      }

      renderAll(payload);
    } catch (error) {
      showError(error);
    }
  }

  document
    .querySelectorAll("[data-bot-period]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const period =
            normalizePeriod(
              button.dataset.botPeriod
            );

          currentPeriod = period;

          localStorage.setItem(
            "primadom-intelligence-detail-period",
            period
          );

          activateButton(period);

          if (period === "custom") {
            showCustom(true);
            return;
          }

          showCustom(false);
          loadBots(period);
        }
      );
    });

  const applyCustom =
    $("botApplyCustom");

  if (applyCustom) {
    applyCustom.addEventListener(
      "click",
      () => {
        const from =
          $("botFrom")?.value;

        const to =
          $("botTo")?.value;

        if (!from || !to) {
          return;
        }

        currentPeriod = "custom";

        localStorage.setItem(
          "primadom-intelligence-detail-period",
          "custom"
        );

        activateButton("custom");

        loadBots(
          "custom",
          from,
          to
        );
      }
    );
  }

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
  loadBots(currentPeriod);

})();


/* ==========================================================
   PRIMADOM BOT COMPANY COLOR GROUPING V1
   Visual grouping only. Row order and data stay untouched.
   ========================================================== */

(() => {
  "use strict";

  const BRAND_COLORS = {
    "openai": "#10a37f",
    "anthropic": "#d97757",
    "google": "#4285f4",
    "microsoft": "#00a4ef",
    "perplexity": "#20808d",
    "semrush": "#ff642d",
    "amazon": "#ff9900",
    "baidu": "#4e6cef",
    "common crawl": "#7c63c7",
    "ahrefs": "#e65f2b"
  };


  function normalizeOperator(
    value
  ) {
    return String(
      value || ""
    )
      .trim()
      .toLowerCase();
  }


  function getBrandColor(
    operator
  ) {
    return (
      BRAND_COLORS[
        normalizeOperator(
          operator
        )
      ] ||
      "#718096"
    );
  }


  function addBrandDot(
    cell,
    color
  ) {
    if (
      cell.querySelector(
        ".bot-company-dot"
      )
    ) {
      return;
    }

    const dot =
      document.createElement(
        "span"
      );

    dot.className =
      "bot-company-dot";

    dot.style
      .setProperty(
        "--bot-company-color",
        color
      );

    cell.prepend(
      dot
    );
  }


  function decorateCrawlerRegistry() {
    const body =
      document.getElementById(
        "botRegistryBody"
      );

    if (!body) {
      return;
    }

    const rows =
      body.querySelectorAll(
        "tr"
      );

    rows.forEach(
      row => {
        const cells =
          row.querySelectorAll(
            "td"
          );

        if (
          cells.length < 2
        ) {
          return;
        }

        const operator =
          cells[0]
            .textContent
            .trim();

        if (
          !operator ||
          operator === "—"
        ) {
          return;
        }

        const color =
          getBrandColor(
            operator
          );

        row.style
          .setProperty(
            "--bot-company-color",
            color
          );

        addBrandDot(
          cells[0],
          color
        );

        addBrandDot(
          cells[1],
          color
        );
      }
    );
  }


  function initBotCompanyGrouping() {
    const body =
      document.getElementById(
        "botRegistryBody"
      );

    if (!body) {
      return;
    }

    decorateCrawlerRegistry();

    const observer =
      new MutationObserver(
        decorateCrawlerRegistry
      );

    observer.observe(
      body,
      {
        childList:
          true,
        subtree:
          true
      }
    );
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initBotCompanyGrouping,
      {
        once: true
      }
    );
  } else {
    initBotCompanyGrouping();
  }

})();
