(() => {
  "use strict";

  const OVERVIEW =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const DETAIL =
    "https://analytics.primadom.ai/api/intelligence/search-detail";

  const $ = id =>
    document.getElementById(id);

  const number = value =>
    new Intl.NumberFormat("en-US")
      .format(Number(value || 0));

  const safe = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const percent = value => {
    const n =
      Number(value || 0);

    const v =
      Math.abs(n) <= 1
        ? n * 100
        : n;

    return `${v.toFixed(2)}%`;
  };

  const LANGUAGES = {
    en: "English",
    ru: "Russian",
    hi: "Hindi",
    zh: "Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
    ar: "Arabic"
  };

  const COUNTRIES = {
    usa: "United States",
    are: "United Arab Emirates",
    gbr: "United Kingdom",
    ind: "India",
    deu: "Germany",
    fra: "France",
    esp: "Spain",
    can: "Canada",
    aus: "Australia",
    sau: "Saudi Arabia",
    qat: "Qatar",
    kwt: "Kuwait",
    sgp: "Singapore",
    hkg: "Hong Kong",
    chn: "China",
    rus: "Russia",
    kaz: "Kazakhstan",
    pak: "Pakistan"
  };

  function normalizePeriod(value) {
    const p =
      String(value || "")
        .toLowerCase();

    if (
      p === "today" ||
      p === "1d"
    ) {
      return "today";
    }

    if (
      ["7d","30d","90d","custom"]
        .includes(p)
    ) {
      return p;
    }

    return "7d";
  }

  let period =
    normalizePeriod(
      localStorage.getItem(
        "primadom-intelligence-detail-period"
      ) || "7d"
    );

  function activate(value) {
    document
      .querySelectorAll(
        "[data-search-period]"
      )
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.searchPeriod === value
        );
      });
  }

  function showCustom(show) {
    if ($("searchCustomRange")) {
      $("searchCustomRange").style.display =
        show
          ? "flex"
          : "none";
    }
  }

  function dateLabel(value) {
    if (!value) {
      return "—";
    }

    const string =
      String(value);

    const match =
      string.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/
      );

    if (!match) {
      return string;
    }

    const months = [
      "Jan","Feb","Mar","Apr",
      "May","Jun","Jul","Aug",
      "Sep","Oct","Nov","Dec"
    ];

    const base =
      `${months[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;

    if (match[4]) {
      return `${base} · ${match[4]}:${match[5]} PT`;
    }

    return base;
  }

  function pageTypeLabel(value) {
    return String(value || "—")
      .replace(/_page$/i, "")
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        c => c.toUpperCase()
      );
  }

  function renderOverview(payload) {
    const data =
      payload.data || {};

    const live =
      data.google_search_live || {};

    const coverage =
      data.coverage?.google_search || {};

    const preliminary =
      Boolean(
        live.preliminary
      );

    $("searchImpressions").textContent =
      number(
        live.impressions
      );

    $("searchClicks").textContent =
      number(
        live.clicks
      );

    $("searchCtr").textContent =
      percent(
        live.ctr
      );

    const position =
      Number(
        live.avg_position
      );

    $("searchPosition").textContent =
      Number.isFinite(position)
        ? position.toFixed(1)
        : "—";

    const visible =
      data.lifecycle_contract
        ?.search_visible
        ?.value ??
      data.lifecycle
        ?.google_signal_pages ??
      null;

    $("searchVisiblePages").textContent =
      visible == null
        ? "—"
        : number(visible);

    const through =
      live.window_to ||
      live.latest_final_date ||
      coverage.latest_in_period ||
      coverage.latest_available ||
      null;

    $("searchLatestDate").textContent =
      dateLabel(
        through
      );

    $("searchFreshnessMeta").textContent =
      preliminary
        ? "Latest hourly data · preliminary"
        : "Final Google Search Console data";

    const selected =
      payload.range?.from &&
      payload.range?.to
        ? `${payload.range.from} → ${payload.range.to}`
        : "Selected period";

    $("searchCoverageNotice").innerHTML =
      preliminary
        ? `<b>Google Search Console Property API</b> · ${safe(selected)} · hourly headline data through <b>${safe(dateLabel(through))}</b> · preliminary. Final page/query/language breakdowns appear after daily GSC finalization.`
        : `<b>Google Search Console Property API</b> · selected period <b>${safe(selected)}</b> · final search data available through <b>${safe(dateLabel(through))}</b>.`;

    $("searchRangeLabel").textContent =
      preliminary
        ? `${selected} · preliminary hourly headline`
        : `${selected} · GSC through ${dateLabel(through)}`;

    renderChart(
      data,
      preliminary,
      through
    );

    renderLanguages(
      data,
      preliminary
    );

    renderContext(
      data
    );
  }

  function renderChart(
    data,
    preliminary,
    through
  ) {
    const root =
      $("searchVisibilityChart");

    if (preliminary) {
      root.innerHTML =
        '<div style="height:100%;display:grid;place-items:center;color:#77859a;text-align:center;padding:30px">Hourly headline metrics are available now.<br>Daily Search Visibility chart appears when Google finalizes the day.</div>';

      return;
    }

    let rows =
      Array.isArray(
        data.traffic_daily
      )
        ? [...data.traffic_daily]
        : [];

    if (through) {
      rows =
        rows.filter(
          row =>
            String(
              row.data_date || ""
            ) <=
            String(through).slice(0,10)
        );
    }

    if (!rows.length) {
      root.textContent =
        "No final GSC observations in this period.";

      return;
    }

    const width = 1120;
    const height = 300;

    const left = 68;
    const right = 62;
    const top = 25;
    const bottom = 45;

    const usableW =
      width - left - right;

    const usableH =
      height - top - bottom;

    const impressions =
      rows.map(
        r =>
          Number(
            r.search_impressions || 0
          )
      );

    const clicks =
      rows.map(
        r =>
          Number(
            r.search_clicks || 0
          )
      );

    const nice = value => {
      const v =
        Math.max(
          value,
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

      const step =
        scaled <= 1
          ? 1
          : scaled <= 2
            ? 2
            : scaled <= 5
              ? 5
              : 10;

      return step * power;
    };

    const maxI =
      nice(
        Math.max(
          ...impressions,
          1
        )
      );

    const maxC =
      nice(
        Math.max(
          ...clicks,
          1
        )
      );

    const x = index =>
      left +
      (
        rows.length === 1
          ? usableW / 2
          : index /
            (rows.length - 1) *
            usableW
      );

    const yI = value =>
      top +
      usableH -
      (
        Number(value || 0) /
        maxI *
        usableH
      );

    const yC = value =>
      top +
      usableH -
      (
        Number(value || 0) /
        maxC *
        usableH
      );

    const grid =
      Array.from(
        { length: 5 },
        (_, index) => {
          const ratio =
            index / 4;

          const y =
            top +
            usableH *
            ratio;

          return `
            <line
              x1="${left}"
              y1="${y}"
              x2="${width - right}"
              y2="${y}"
              stroke="#e8edf4"
            />
            <text
              x="${left - 10}"
              y="${y + 4}"
              text-anchor="end"
              font-size="10"
              fill="#7a8698"
            >${number(Math.round(maxI * (1 - ratio)))}</text>
            <text
              x="${width - right + 10}"
              y="${y + 4}"
              font-size="10"
              fill="#7a8698"
            >${number(Math.round(maxC * (1 - ratio)))}</text>
          `;
        }
      ).join("");

    const barWidth =
      Math.max(
        10,
        Math.min(
          46,
          usableW /
          rows.length *
          0.46
        )
      );

    const bars =
      rows.map(
        (row, index) => {
          const value =
            Number(
              row.search_impressions || 0
            );

          const y =
            yI(value);

          return `
            <rect
              x="${x(index) - barWidth / 2}"
              y="${y}"
              width="${barWidth}"
              height="${Math.max(top + usableH - y, 1)}"
              rx="3"
              fill="#dce8ff"
            >
              <title>${safe(row.data_date)} · ${number(value)} impressions</title>
            </rect>
          `;
        }
      ).join("");

    const points =
      rows.map(
        (row, index) => ({
          x: x(index),
          y: yC(
            row.search_clicks
          ),
          value:
            Number(
              row.search_clicks || 0
            ),
          date:
            row.data_date
        })
      );

    const line =
      points
        .map(
          point =>
            `${point.x},${point.y}`
        )
        .join(" ");

    const dots =
      points.map(
        point => `
          <circle
            cx="${point.x}"
            cy="${point.y}"
            r="4"
            fill="#16a36a"
          >
            <title>${safe(point.date)} · ${number(point.value)} clicks</title>
          </circle>
        `
      ).join("");

    const labels =
      rows.map(
        (row, index) => `
          <text
            x="${x(index)}"
            y="${height - 12}"
            text-anchor="middle"
            font-size="10"
            fill="#7a8698"
          >${safe(String(row.data_date).slice(5))}</text>
        `
      ).join("");

    root.innerHTML = `
      <div style="display:flex;gap:18px;margin:0 8px 8px;font-size:12px;color:#65758c">
        <span>▰ Impressions</span>
        <span style="color:#16a36a">● Clicks</span>
        <span style="margin-left:auto">
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
          points="${line}"
          fill="none"
          stroke="#16a36a"
          stroke-width="2.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        ${dots}
        ${labels}
      </svg>
    `;
  }

  function renderLanguages(
    data,
    preliminary
  ) {
    const body =
      $("searchLanguagesBody");

    if (preliminary) {
      body.innerHTML =
        '<tr><td colspan="5">Hourly language breakdown is not available yet. Final daily breakdown will appear after GSC finalization.</td></tr>';

      return;
    }

    const order =
      [
        "en","ru","hi","zh",
        "es","fr","de","ar"
      ];

    const rows =
      Array.isArray(
        data.languages
      )
        ? data.languages
        : [];

    const map =
      new Map(
        rows.map(
          row => [
            String(
              row.language_code || ""
            ).toLowerCase(),
            row
          ]
        )
      );

    const normalized =
      order.map(
        code =>
          map.get(code) || {
            language_code:
              code,
            search_impressions:
              0,
            search_clicks:
              0
          }
      );

    const total =
      normalized.reduce(
        (sum, row) =>
          sum +
          Number(
            row.search_impressions || 0
          ),
        0
      );

    body.innerHTML =
      normalized.map(
        row => {
          const code =
            String(
              row.language_code || ""
            ).toLowerCase();

          const impressions =
            Number(
              row.search_impressions || 0
            );

          const clicks =
            Number(
              row.search_clicks || 0
            );

          const ctr =
            impressions
              ? clicks /
                impressions *
                100
              : 0;

          const share =
            total
              ? impressions /
                total *
                100
              : 0;

          return `
            <tr>
              <td><b>${safe(LANGUAGES[code] || code.toUpperCase())}</b></td>
              <td>${number(impressions)}</td>
              <td>${number(clicks)}</td>
              <td>${ctr.toFixed(2)}%</td>
              <td>${share.toFixed(2)}%</td>
            </tr>
          `;
        }
      ).join("");
  }

  function renderContext(data) {
    const contract =
      data.lifecycle_contract || {};

    const indexed =
      contract.indexed?.value ??
      null;

    const sitemap =
      contract.sitemap?.value ??
      null;

    const registered =
      contract.registered?.value ??
      null;

    const visible =
      contract.search_visible?.value ??
      null;

    $("searchContextBody").innerHTML = `
      <tr>
        <td>Search-visible pages</td>
        <td style="text-align:right"><b>${visible == null ? "—" : number(visible)}</b></td>
      </tr>

      <tr>
        <td>Indexed snapshot</td>
        <td style="text-align:right"><b>${indexed == null ? "—" : "≈" + number(indexed)}</b></td>
      </tr>

      <tr>
        <td>Index snapshot date</td>
        <td style="text-align:right"><b>${safe(contract.indexed?.snapshot_date || "—")}</b></td>
      </tr>

      <tr>
        <td>Sitemap pages</td>
        <td style="text-align:right"><b>${sitemap == null ? "—" : number(sitemap)}</b></td>
      </tr>

      <tr>
        <td>Registered pages</td>
        <td style="text-align:right"><b>${registered == null ? "—" : number(registered)}</b></td>
      </tr>
    `;
  }

  function detailUnavailable(message) {
    $("searchPagesBody").innerHTML =
      `<tr><td colspan="7">${safe(message)}</td></tr>`;

    $("searchQueriesBody").innerHTML =
      `<tr><td colspan="5">${safe(message)}</td></tr>`;

    $("searchCountriesBody").innerHTML =
      `<tr><td colspan="4">${safe(message)}</td></tr>`;

    $("searchDevicesBody").innerHTML =
      `<tr><td colspan="4">${safe(message)}</td></tr>`;
  }

  function renderDetail(detail) {
    if (!detail?.available) {
      detailUnavailable(
        "Hourly breakdown is not available yet. Final GSC breakdowns appear after daily finalization."
      );

      return;
    }

    const pages =
      detail.top_search_pages || [];

    $("searchPagesBody").innerHTML =
      pages.length
        ? pages.map(
            row => `
              <tr>
                <td>
                  <a
                    class="page-live-link"
                    href="${safe(row.url)}"
                    target="_blank"
                    rel="noopener"
                  >${safe(row.url_path)}</a>
                </td>

                <td>${safe(pageTypeLabel(row.page_type_id))}</td>
                <td>${safe(String(row.language_code || "—").toUpperCase())}</td>
                <td>${number(row.impressions)}</td>
                <td>${number(row.clicks)}</td>
                <td>${percent(row.ctr)}</td>
                <td>${row.avg_position == null ? "—" : Number(row.avg_position).toFixed(1)}</td>
              </tr>
            `
          ).join("")
        : '<tr><td colspan="7">No final GSC page rows in this period.</td></tr>';

    const queries =
      detail.top_queries || [];

    $("searchQueriesBody").innerHTML =
      queries.length
        ? queries.map(
            row => `
              <tr>
                <td>${safe(row.key || "(unavailable)")}</td>
                <td>${number(row.impressions)}</td>
                <td>${number(row.clicks)}</td>
                <td>${percent(row.ctr)}</td>
                <td>${row.position == null ? "—" : Number(row.position).toFixed(1)}</td>
              </tr>
            `
          ).join("")
        : '<tr><td colspan="5">No final GSC query rows in this period.</td></tr>';

    const countries =
      detail.countries || [];

    $("searchCountriesBody").innerHTML =
      countries.length
        ? countries
            .slice(0, 30)
            .map(
              row => {
                const code =
                  String(
                    row.key || ""
                  ).toLowerCase();

                return `
                  <tr>
                    <td>${safe(COUNTRIES[code] || code.toUpperCase() || "Unknown")}</td>
                    <td>${number(row.impressions)}</td>
                    <td>${number(row.clicks)}</td>
                    <td>${percent(row.ctr)}</td>
                  </tr>
                `;
              }
            ).join("")
        : '<tr><td colspan="4">No country rows.</td></tr>';

    const devices =
      detail.devices || [];

    $("searchDevicesBody").innerHTML =
      devices.length
        ? devices.map(
            row => `
              <tr>
                <td>${safe(
                  String(row.key || "Unknown")
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, c => c.toUpperCase())
                )}</td>
                <td>${number(row.impressions)}</td>
                <td>${number(row.clicks)}</td>
                <td>${percent(row.ctr)}</td>
              </tr>
            `
          ).join("")
        : '<tr><td colspan="4">No device rows.</td></tr>';
  }

  async function load(
    value,
    from = "",
    to = ""
  ) {
    let suffix =
      `period=${encodeURIComponent(value)}`;

    if (
      value === "custom" &&
      from &&
      to
    ) {
      suffix +=
        `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }

    try {
      const [
        overviewResponse,
        detailResponse
      ] =
        await Promise.all([
          fetch(
            `${OVERVIEW}?${suffix}`
          ),
          fetch(
            `${DETAIL}?${suffix}`
          )
        ]);

      const overview =
        await overviewResponse.json();

      const detail =
        await detailResponse.json();

      if (
        !overviewResponse.ok ||
        !overview?.data
      ) {
        throw new Error(
          "overview failed"
        );
      }

      renderOverview(
        overview
      );

      if (
        detailResponse.ok &&
        detail?.ok
      ) {
        renderDetail(
          detail
        );
      } else {
        detailUnavailable(
          "Search detail data could not be loaded."
        );
      }

    } catch (error) {
      console.error(
        "Search Performance:",
        error
      );
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
          const value =
            normalizePeriod(
              button.dataset.searchPeriod
            );

          period =
            value;

          localStorage.setItem(
            "primadom-intelligence-detail-period",
            value
          );

          activate(
            value
          );

          if (
            value === "custom"
          ) {
            showCustom(
              true
            );

            return;
          }

          showCustom(
            false
          );

          load(
            value
          );
        }
      );
    });

  $("searchApplyCustom")
    ?.addEventListener(
      "click",
      () => {
        const from =
          $("searchFrom")?.value;

        const to =
          $("searchTo")?.value;

        if (
          !from ||
          !to
        ) {
          return;
        }

        period =
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

        activate(
          "custom"
        );

        load(
          "custom",
          from,
          to
        );
      }
    );

  function initial() {
    activate(
      period
    );

    if (
      period === "custom"
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
        $("searchFrom").value =
          from;

        $("searchTo").value =
          to;

        showCustom(
          true
        );

        load(
          "custom",
          from,
          to
        );

        return;
      }

      period =
        "7d";

      localStorage.setItem(
        "primadom-intelligence-detail-period",
        "7d"
      );
    }

    activate(
      period
    );

    showCustom(
      false
    );

    load(
      period
    );
  }

  initial();

})();
