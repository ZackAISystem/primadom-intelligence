(() => {
  "use strict";

  const API =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const $ = id =>
    document.getElementById(id);

  const num = value =>
    new Intl.NumberFormat("en-US").format(
      Number(value || 0)
    );

  const safe = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const languageNames = {
    en: "English",
    ru: "Russian",
    hi: "Hindi",
    zh: "Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
    ar: "Arabic"
  };

  const languageOrder = [
    "en",
    "ru",
    "hi",
    "zh",
    "es",
    "fr",
    "de",
    "ar"
  ];

  function pctFromRatio(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return "—";
    }

    const percent =
      Math.abs(n) <= 1
        ? n * 100
        : n;

    return `${percent.toFixed(2)}%`;
  }

  function ctr(clicks, impressions) {
    const i = Number(impressions || 0);

    if (!i) {
      return "0.00%";
    }

    return `${(
      Number(clicks || 0) /
      i *
      100
    ).toFixed(2)}%`;
  }

  function normalizePeriod(value) {
    const p =
      String(value || "")
        .toLowerCase();

    if (p === "1d" || p === "today")
      return "today";

    if (
      p === "7d" ||
      p === "30d" ||
      p === "90d" ||
      p === "custom"
    ) {
      return p;
    }

    return "7d";
  }

  let currentPeriod =
    normalizePeriod(
      localStorage.getItem(
        "primadom-intelligence-detail-period"
      ) || "7d"
    );

  function activateButton(period) {
    document
      .querySelectorAll(
        "[data-search-period]"
      )
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.searchPeriod === period
        );
      });
  }

  function showCustom(show) {
    const root =
      $("searchCustomRange");

    if (root) {
      root.style.display =
        show ? "flex" : "none";
    }
  }

  function setLoading() {
    [
      "searchImpressions",
      "searchClicks",
      "searchCtr",
      "searchPosition",
      "searchVisiblePages",
      "searchLatestDate"
    ].forEach(id => {
      const el = $(id);
      if (el) el.textContent = "—";
    });

    if ($("searchCoverageNotice")) {
      $("searchCoverageNotice").textContent =
        "Loading Google Search Console coverage…";
    }

    if ($("searchVisibilityChart")) {
      $("searchVisibilityChart").textContent =
        "Loading search visibility…";
    }

    if ($("searchLanguagesBody")) {
      $("searchLanguagesBody").innerHTML =
        '<tr><td colspan="5">Loading…</td></tr>';
    }

    if ($("searchContextBody")) {
      $("searchContextBody").innerHTML =
        '<tr><td colspan="2">Loading…</td></tr>';
    }
  }

  function searchCoverage(data) {
    return (
      data.coverage?.google_search ||
      {}
    );
  }

  function latestSearchDate(data) {
    const c =
      searchCoverage(data);

    const live =
      data.google_search_live ||
      {};

    return (
      c.latest_in_period ||
      live.window_to ||
      live.latest_final_date ||
      c.latest_available ||
      null
    );
  }

  function hasPeriodSearchData(data) {
    const c =
      searchCoverage(data);

    const live =
      data.google_search_live ||
      {};

    if (
      c.has_data_for_period === false
    ) {
      return false;
    }

    return Boolean(
      latestSearchDate(data) &&
      live.available !== false
    );
  }

  function renderKpis(data) {
    const live =
      data.google_search_live ||
      {};

    const hasData =
      hasPeriodSearchData(data);

    const visible =
      data.lifecycle_contract
        ?.search_visible
        ?.value ??
      data.lifecycle
        ?.google_signal_pages ??
      null;

    if (!hasData) {
      $("searchImpressions").textContent = "—";
      $("searchClicks").textContent = "—";
      $("searchCtr").textContent = "—";
      $("searchPosition").textContent = "—";
    } else {
      $("searchImpressions").textContent =
        num(live.impressions);

      $("searchClicks").textContent =
        num(live.clicks);

      $("searchCtr").textContent =
        pctFromRatio(live.ctr);

      const pos =
        Number(live.avg_position);

      $("searchPosition").textContent =
        Number.isFinite(pos)
          ? pos.toFixed(1)
          : "—";
    }

    $("searchVisiblePages").textContent =
      visible === null
        ? "—"
        : num(visible);

    const latest =
      latestSearchDate(data);

    $("searchLatestDate").textContent =
      latest || "—";
  }

  function renderCoverage(
    data,
    range
  ) {
    const c =
      searchCoverage(data);

    const live =
      data.google_search_live ||
      {};

    const latest =
      latestSearchDate(data);

    const source =
      c.source_system ===
      "google_search_console_property_api"
        ? "Google Search Console Property API"
        : "Google Search Console";

    const selected =
      range?.from && range?.to
        ? `${range.from} → ${range.to}`
        : "selected period";

    if (
      c.has_data_for_period === false
    ) {
      $("searchCoverageNotice").innerHTML =
        `<b>No final GSC data is available inside ${safe(selected)}.</b> ` +
        `Latest available Google Search Console date: ` +
        `<b>${safe(c.latest_available || "—")}</b>.`;

      $("searchFreshnessMeta").textContent =
        "No final GSC data in selected period";

      return;
    }

    const state =
      live.data_state ||
      c.data_state ||
      "final";

    $("searchCoverageNotice").innerHTML =
      `<b>${safe(source)}</b> · selected period ` +
      `<b>${safe(selected)}</b> · final search data available through ` +
      `<b>${safe(latest || "—")}</b>` +
      (
        range?.to &&
        latest &&
        latest < range.to
          ? ` · the remaining selected days are not treated as zero`
          : ""
      ) +
      `.`;

    $("searchFreshnessMeta").textContent =
      `${state === "final" ? "Final" : safe(state)} Google Search Console data`;

    $("searchRangeLabel").textContent =
      latest
        ? `${selected} · GSC through ${latest}`
        : selected;
  }

  function renderLanguages(data) {
    const body =
      $("searchLanguagesBody");

    const hasData =
      hasPeriodSearchData(data);

    const rows =
      Array.isArray(data.languages)
        ? data.languages
        : [];

    if (
      !hasData ||
      !rows.length
    ) {
      body.innerHTML =
        '<tr><td colspan="5">No final Google Search Console data in this selected period.</td></tr>';
      return;
    }

    const byCode =
      new Map(
        rows.map(row => [
          String(
            row.language_code || ""
          ).toLowerCase(),
          row
        ])
      );

    const ordered =
      languageOrder.map(code => {
        return (
          byCode.get(code) || {
            language_code: code,
            search_impressions: 0,
            search_clicks: 0
          }
        );
      });

    const total =
      ordered.reduce(
        (sum, row) =>
          sum +
          Number(
            row.search_impressions ||
            0
          ),
        0
      );

    body.innerHTML =
      ordered.map(row => {
        const code =
          String(
            row.language_code || ""
          ).toLowerCase();

        const impressions =
          Number(
            row.search_impressions ||
            0
          );

        const clicks =
          Number(
            row.search_clicks ||
            0
          );

        const share =
          total > 0
            ? impressions / total * 100
            : 0;

        return `
          <tr>
            <td>
              <b>${safe(
                languageNames[code] ||
                code.toUpperCase()
              )}</b>
            </td>
            <td>${num(impressions)}</td>
            <td>${num(clicks)}</td>
            <td>${ctr(clicks, impressions)}</td>
            <td>${share.toFixed(2)}%</td>
          </tr>
        `;
      }).join("");
  }

  function renderContext(data) {
    const contract =
      data.lifecycle_contract ||
      {};

    const indexing =
      data.indexing_snapshot ||
      {};

    const registered =
      contract.registered?.value ??
      data.kpis?.registered_pages ??
      null;

    const sitemap =
      contract.sitemap?.value ??
      data.kpis?.sitemap_pages ??
      null;

    const visible =
      contract.search_visible?.value ??
      data.lifecycle?.google_signal_pages ??
      null;

    const indexed =
      contract.indexed?.value ??
      indexing.indexed_pages ??
      null;

    const snapshotDate =
      contract.indexed?.snapshot_date ??
      indexing.snapshot_date ??
      null;

    const indexedLabel =
      indexed === null
        ? "—"
        : `≈${num(indexed)}`;

    $("searchContextBody").innerHTML = `
      <tr>
        <td>Search-visible pages</td>
        <td style="text-align:right"><b>${visible === null ? "—" : num(visible)}</b></td>
      </tr>

      <tr>
        <td>Indexed snapshot</td>
        <td style="text-align:right"><b>${indexedLabel}</b></td>
      </tr>

      <tr>
        <td>Index snapshot date</td>
        <td style="text-align:right"><b>${safe(snapshotDate || "—")}</b></td>
      </tr>

      <tr>
        <td>Sitemap pages</td>
        <td style="text-align:right"><b>${sitemap === null ? "—" : num(sitemap)}</b></td>
      </tr>

      <tr>
        <td>Registered pages</td>
        <td style="text-align:right"><b>${registered === null ? "—" : num(registered)}</b></td>
      </tr>
    `;
  }

  function niceMax(value) {
    const v =
      Math.max(
        Number(value || 0),
        1
      );

    const power =
      Math.pow(
        10,
        Math.floor(
          Math.log10(v)
        )
      );

    const scaled =
      v / power;

    let nice = 1;

    if (scaled <= 1) nice = 1;
    else if (scaled <= 2) nice = 2;
    else if (scaled <= 5) nice = 5;
    else nice = 10;

    return nice * power;
  }

  function renderChart(data) {
    const root =
      $("searchVisibilityChart");

    const latest =
      latestSearchDate(data);

    const hasData =
      hasPeriodSearchData(data);

    let rows =
      Array.isArray(data.traffic_daily)
        ? [...data.traffic_daily]
        : [];

    if (latest) {
      rows =
        rows.filter(row => {
          const date =
            row.data_date ||
            row.date ||
            "";

          return (
            !date ||
            date <= latest
          );
        });
    }

    rows.sort((a, b) =>
      String(
        a.data_date ||
        a.date ||
        ""
      ).localeCompare(
        String(
          b.data_date ||
          b.date ||
          ""
        )
      )
    );

    if (
      !hasData ||
      !rows.length
    ) {
      root.innerHTML =
        '<div style="height:100%;display:grid;place-items:center;color:#77859a">No final Google Search Console observations in this selected period.</div>';
      return;
    }

    const width = 1120;
    const height = 310;

    const left = 68;
    const right = 62;
    const top = 30;
    const bottom = 48;

    const usableW =
      width - left - right;

    const usableH =
      height - top - bottom;

    const impressions =
      rows.map(row =>
        Number(
          row.search_impressions ||
          0
        )
      );

    const clicks =
      rows.map(row =>
        Number(
          row.search_clicks ||
          0
        )
      );

    const maxI =
      niceMax(
        Math.max(
          ...impressions,
          1
        )
      );

    const maxC =
      niceMax(
        Math.max(
          ...clicks,
          1
        )
      );

    const x =
      index =>
        left +
        (
          rows.length === 1
            ? usableW / 2
            : (
                index /
                (rows.length - 1)
              ) * usableW
        );

    const yI =
      value =>
        top +
        usableH -
        (
          Number(value || 0) /
          maxI
        ) * usableH;

    const yC =
      value =>
        top +
        usableH -
        (
          Number(value || 0) /
          maxC
        ) * usableH;

    const grid =
      Array.from(
        { length: 5 },
        (_, i) => {
          const ratio =
            i / 4;

          const valueI =
            Math.round(
              maxI *
              (1 - ratio)
            );

          const valueC =
            Math.round(
              maxC *
              (1 - ratio)
            );

          const y =
            top +
            usableH * ratio;

          return `
            <line
              x1="${left}"
              y1="${y}"
              x2="${width-right}"
              y2="${y}"
              stroke="#e8edf4"
            />

            <text
              x="${left-10}"
              y="${y+4}"
              text-anchor="end"
              font-size="10"
              fill="#7a8698"
            >${num(valueI)}</text>

            <text
              x="${width-right+10}"
              y="${y+4}"
              text-anchor="start"
              font-size="10"
              fill="#7a8698"
            >${num(valueC)}</text>
          `;
        }
      ).join("");

    const barWidth =
      Math.max(
        10,
        Math.min(
          46,
          usableW /
          Math.max(
            rows.length,
            1
          ) *
          .46
        )
      );

    const bars =
      rows.map(
        (row, index) => {
          const value =
            Number(
              row.search_impressions ||
              0
            );

          const y =
            yI(value);

          const h =
            top +
            usableH -
            y;

          const date =
            row.data_date ||
            row.date ||
            "";

          return `
            <rect
              x="${x(index)-barWidth/2}"
              y="${y}"
              width="${barWidth}"
              height="${Math.max(h,1)}"
              rx="3"
              fill="#dce8ff"
            >
              <title>${safe(date)} · ${num(value)} impressions</title>
            </rect>
          `;
        }
      ).join("");

    const clickPoints =
      rows.map(
        (row, index) => ({
          x: x(index),
          y: yC(
            row.search_clicks
          ),
          value: Number(
            row.search_clicks ||
            0
          ),
          date:
            row.data_date ||
            row.date ||
            ""
        })
      );

    const clickLine =
      clickPoints
        .map(
          point =>
            `${point.x},${point.y}`
        )
        .join(" ");

    const dots =
      clickPoints.map(point => `
        <circle
          cx="${point.x}"
          cy="${point.y}"
          r="4"
          fill="#16a36a"
        >
          <title>${safe(point.date)} · ${num(point.value)} clicks</title>
        </circle>
      `).join("");

    const labels =
      rows.map(
        (row, index) => {
          const date =
            row.data_date ||
            row.date ||
            "";

          return `
            <text
              x="${x(index)}"
              y="${height-14}"
              text-anchor="middle"
              font-size="10"
              fill="#7a8698"
            >${safe(String(date).slice(5))}</text>
          `;
        }
      ).join("");

    root.innerHTML = `
      <div style="
        display:flex;
        gap:18px;
        align-items:center;
        margin:0 8px 8px;
        font-size:12px;
        color:#65758c
      ">
        <span>
          <i style="
            display:inline-block;
            width:10px;
            height:10px;
            border-radius:3px;
            background:#dce8ff;
            margin-right:6px
          "></i>
          Impressions
        </span>

        <span>
          <i style="
            display:inline-block;
            width:10px;
            height:10px;
            border-radius:50%;
            background:#16a36a;
            margin-right:6px
          "></i>
          Clicks
        </span>

        <span style="margin-left:auto;font-size:11px">
          Left axis: impressions · Right axis: clicks
        </span>
      </div>

      <svg
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        style="width:100%;height:290px;display:block"
      >
        ${grid}
        ${bars}

        <polyline
          points="${clickLine}"
          fill="none"
          stroke="#16a36a"
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
      payload?.data ||
      {};

    const range =
      payload?.range ||
      {};

    renderKpis(data);
    renderCoverage(
      data,
      range
    );
    renderChart(data);
    renderLanguages(data);
    renderContext(data);
  }

  function showError(error) {
    console.error(
      "Search Performance:",
      error
    );

    if ($("searchCoverageNotice")) {
      $("searchCoverageNotice").textContent =
        "Google Search Console data could not be loaded.";
    }

    if ($("searchVisibilityChart")) {
      $("searchVisibilityChart").textContent =
        "Search visibility data could not be loaded.";
    }

    if ($("searchLanguagesBody")) {
      $("searchLanguagesBody").innerHTML =
        '<tr><td colspan="5">Data could not be loaded.</td></tr>';
    }
  }

  async function loadSearch(
    period,
    from = "",
    to = ""
  ) {
    setLoading();

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
            credentials: "omit",
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

      renderAll(payload);

    } catch (error) {
      showError(error);
    }
  }

  document
    .querySelectorAll(
      "[data-search-period]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const period =
            normalizePeriod(
              button.dataset.searchPeriod
            );

          currentPeriod =
            period;

          localStorage.setItem(
            "primadom-intelligence-detail-period",
            period
          );

          activateButton(period);

          if (
            period === "custom"
          ) {
            showCustom(true);
            return;
          }

          showCustom(false);
          loadSearch(period);
        }
      );
    });

  const applyCustom =
    $("searchApplyCustom");

  if (applyCustom) {
    applyCustom.addEventListener(
      "click",
      () => {
        const from =
          $("searchFrom")?.value;

        const to =
          $("searchTo")?.value;

        if (!from || !to) {
          return;
        }

        currentPeriod =
          "custom";

        localStorage.setItem(
          "primadom-intelligence-detail-period",
          "custom"
        );

        localStorage.setItem(
          "primadom-intelligence-search-custom-from",
          from
        );

        localStorage.setItem(
          "primadom-intelligence-search-custom-to",
          to
        );

        activateButton(
          "custom"
        );

        showCustom(true);

        loadSearch(
          "custom",
          from,
          to
        );
      }
    );
  }

  function initialLoad() {
    activateButton(
      currentPeriod
    );

    if (
      currentPeriod === "custom"
    ) {
      const from =
        localStorage.getItem(
          "primadom-intelligence-search-custom-from"
        );

      const to =
        localStorage.getItem(
          "primadom-intelligence-search-custom-to"
        );

      if (
        from &&
        to
      ) {
        if ($("searchFrom"))
          $("searchFrom").value = from;

        if ($("searchTo"))
          $("searchTo").value = to;

        showCustom(true);

        loadSearch(
          "custom",
          from,
          to
        );

        return;
      }

      currentPeriod =
        "7d";

      localStorage.setItem(
        "primadom-intelligence-detail-period",
        "7d"
      );
    }

    activateButton(
      currentPeriod
    );

    showCustom(false);

    loadSearch(
      currentPeriod
    );
  }

  window.addEventListener(
    "primadom:screenchange",
    event => {
      if (
        event.detail?.screen ===
        "search"
      ) {
        activateButton(
          currentPeriod
        );
      }
    }
  );

  initialLoad();

})();
