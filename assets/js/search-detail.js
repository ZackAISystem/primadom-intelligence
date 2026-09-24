(() => {
  "use strict";

  const OVERVIEW =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const DETAIL =
    "https://analytics.primadom.ai/api/intelligence/search-detail";

  const $ =
    id =>
      document.getElementById(id);

  const num =
    value =>
      new Intl.NumberFormat("en-US")
        .format(Number(value || 0));

  const safe =
    value =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

  const pct =
    value => {
      const n =
        Number(value || 0);

      return `${
        (
          Math.abs(n) <= 1
            ? n * 100
            : n
        ).toFixed(2)
      }%`;
    };

  const LANGUAGES = {
    en:"English",
    ru:"Russian",
    hi:"Hindi",
    zh:"Chinese",
    es:"Spanish",
    fr:"French",
    de:"German",
    ar:"Arabic"
  };

  const COUNTRIES = {
    ARE:"United Arab Emirates",
    IND:"India",
    USA:"United States",
    GBR:"United Kingdom",
    PAK:"Pakistan",
    SAU:"Saudi Arabia",
    NLD:"Netherlands",
    UKR:"Ukraine",
    PHL:"Philippines",
    RUS:"Russia",
    ITA:"Italy",
    EGY:"Egypt",
    BRA:"Brazil",
    BGD:"Bangladesh",
    THA:"Thailand",
    DEU:"Germany",
    IDN:"Indonesia",
    CAN:"Canada",
    ESP:"Spain",
    KWT:"Kuwait",
    SWE:"Sweden",
    FRA:"France",
    QAT:"Qatar",
    ZAF:"South Africa",
    CHE:"Switzerland",
    ISR:"Israel",
    LKA:"Sri Lanka",
    NGA:"Nigeria",
    OMN:"Oman",
    POL:"Poland",
    TUR:"Türkiye",
    KAZ:"Kazakhstan",
    SGP:"Singapore",
    HKG:"Hong Kong",
    CHN:"China",
    JPN:"Japan",
    KOR:"South Korea",
    IRL:"Ireland",
    BEL:"Belgium",
    AUT:"Austria",
    DNK:"Denmark",
    NOR:"Norway",
    FIN:"Finland",
    PRT:"Portugal",
    GRC:"Greece",
    CZE:"Czechia",
    ROU:"Romania",
    HUN:"Hungary",
    MYS:"Malaysia",
    NZL:"New Zealand",
    AUS:"Australia",
    MEX:"Mexico",
    ARG:"Argentina",
    COL:"Colombia",
    CHL:"Chile"
  };

  let detailCache =
    null;

  let pagesSort =
    "clicks";

  let queriesSort =
    "clicks";

  let period =
    normalizePeriod(
      localStorage.getItem(
        "primadom-intelligence-detail-period"
      ) || "7d"
    );

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

    return [
      "7d",
      "30d",
      "90d",
      "custom"
    ].includes(p)
      ? p
      : "7d";
  }

  function activate(value) {
    document
      .querySelectorAll(
        "[data-search-period]"
      )
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.searchPeriod ===
            value
        );
      });
  }

  function showCustom(show) {
    if (
      $("searchCustomRange")
    ) {
      $("searchCustomRange")
        .style.display =
          show
            ? "flex"
            : "none";
    }
  }

  function dateLabel(value) {
    if (!value) {
      return "—";
    }

    const m =
      String(value).match(
        /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/
      );

    if (!m) {
      return String(value);
    }

    const months = [
      "Jan","Feb","Mar","Apr",
      "May","Jun","Jul","Aug",
      "Sep","Oct","Nov","Dec"
    ];

    const base =
      `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;

    return m[4]
      ? `${base} · ${m[4]}:${m[5]} PT`
      : base;
  }

  function axisDate(value) {
    const text =
      String(value || "");

    const match =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/
      );

    if (!match) {
      return text;
    }

    const months = [
      "Jan","Feb","Mar","Apr",
      "May","Jun","Jul","Aug",
      "Sep","Oct","Nov","Dec"
    ];

    if (match[4]) {
      let hour =
        Number(match[4]);

      const suffix =
        hour >= 12
          ? "PM"
          : "AM";

      hour =
        hour % 12 ||
        12;

      return `${hour} ${suffix}`;
    }

    return `${months[Number(match[2])-1]} ${Number(match[3])}`;
  }


  function rangeDate(value) {
    const text =
      String(value || "");

    const match =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (!match) {
      return text;
    }

    const months = [
      "Jan","Feb","Mar","Apr",
      "May","Jun","Jul","Aug",
      "Sep","Oct","Nov","Dec"
    ];

    return `${months[Number(match[2])-1]} ${Number(match[3])}`;
  }


  function tooltipDate(value) {
    const text =
      String(value || "");

    const match =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/
      );

    if (!match) {
      return text;
    }

    const months = [
      "Jan","Feb","Mar","Apr",
      "May","Jun","Jul","Aug",
      "Sep","Oct","Nov","Dec"
    ];

    const day =
      `${months[Number(match[2])-1]} ${Number(match[3])}`;

    if (!match[4]) {
      return day;
    }

    let hour =
      Number(match[4]);

    const suffix =
      hour >= 12
        ? "PM"
        : "AM";

    hour =
      hour % 12 ||
      12;

    return `${day} · ${hour} ${suffix}`;
  }


  function previousDay(value) {
    const m =
      String(value || "")
        .match(
          /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (!m) {
      return null;
    }

    const date =
      new Date(
        Date.UTC(
          Number(m[1]),
          Number(m[2]) - 1,
          Number(m[3])
        )
      );

    date.setUTCDate(
      date.getUTCDate() - 1
    );

    return date
      .toISOString()
      .slice(0,10);
  }

  function pageTypeLabel(value) {
    return String(value || "—")
      .replace(/_page$/i, "")
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        char =>
          char.toUpperCase()
      );
  }

  function countryLabel(value) {
    const code =
      String(value || "")
        .toUpperCase();

    return (
      COUNTRIES[code] ||
      code ||
      "Unknown"
    );
  }

  function sorter(metric) {
    return (a, b) => {
      if (
        metric === "position"
      ) {
        const av =
          a.avg_position ??
          a.position ??
          Number.POSITIVE_INFINITY;

        const bv =
          b.avg_position ??
          b.position ??
          Number.POSITIVE_INFINITY;

        if (av !== bv) {
          return av - bv;
        }

        return (
          Number(b.impressions || 0) -
          Number(a.impressions || 0)
        );
      }

      if (
        metric === "ctr"
      ) {
        const diff =
          Number(b.ctr || 0) -
          Number(a.ctr || 0);

        if (diff) {
          return diff;
        }

        return (
          Number(b.impressions || 0) -
          Number(a.impressions || 0)
        );
      }

      if (
        metric === "impressions"
      ) {
        const diff =
          Number(b.impressions || 0) -
          Number(a.impressions || 0);

        if (diff) {
          return diff;
        }

        return (
          Number(b.clicks || 0) -
          Number(a.clicks || 0)
        );
      }

      const diff =
        Number(b.clicks || 0) -
        Number(a.clicks || 0);

      if (diff) {
        return diff;
      }

      return (
        Number(b.impressions || 0) -
        Number(a.impressions || 0)
      );
    };
  }

  function fillTimeline(rows) {
    if (!rows.length) {
      return [];
    }

    const map =
      new Map(
        rows.map(
          row => [
            row.data_date,
            row
          ]
        )
      );

    const first =
      new Date(
        `${rows[0].data_date}T00:00:00Z`
      );

    const last =
      new Date(
        `${rows[rows.length - 1].data_date}T00:00:00Z`
      );

    const output = [];

    for (
      let d =
        new Date(first);

      d <= last;

      d.setUTCDate(
        d.getUTCDate() + 1
      )
    ) {
      const key =
        d.toISOString()
          .slice(0,10);

      output.push(
        map.get(key) || {
          data_date:
            key,
          impressions:
            0,
          clicks:
            0,
          ctr:
            0,
          position:
            null
        }
      );
    }

    return output;
  }

  function renderOverview(
    payload
  ) {
    const data =
      payload.data || {};

    const live =
      data.google_search_live || {};

    $("searchImpressions").textContent =
      num(
        live.impressions
      );

    $("searchClicks").textContent =
      num(
        live.clicks
      );

    $("searchCtr").textContent =
      pct(
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
        : num(visible);

    renderContext(
      data
    );
  }

  function renderDetail(
    detail,
    range
  ) {
    detailCache =
      detail;

    if (
      !detail?.available
    ) {
      const message =
        "Hourly breakdown is not available yet. Final GSC breakdowns appear after daily finalization.";

      $("searchPagesBody").innerHTML =
        `<tr><td colspan="7">${message}</td></tr>`;

      $("searchQueriesBody").innerHTML =
        `<tr><td colspan="5">${message}</td></tr>`;

      $("searchCountriesBody").innerHTML =
        `<tr><td colspan="4">${message}</td></tr>`;

      $("searchDevicesBody").innerHTML =
        `<tr><td colspan="4">${message}</td></tr>`;

      $("searchVisibilityChart").innerHTML =
        '<div style="height:100%;display:grid;place-items:center;color:#77859a;text-align:center;padding:30px">Hourly headline metrics are available now.<br>Daily Search Visibility chart appears when Google finalizes the day.</div>';

      $("searchRangeLabel").textContent =
        `${range.from} → ${range.to} · preliminary hourly headline`;

      return;
    }

    const summary =
      detail.summary || {};

    $("searchImpressions").textContent =
      num(
        summary.impressions
      );

    $("searchClicks").textContent =
      num(
        summary.clicks
      );

    $("searchCtr").textContent =
      pct(
        summary.ctr
      );

    $("searchPosition").textContent =
      summary.avg_position == null
        ? "—"
        : Number(
            summary.avg_position
          ).toFixed(1);

    $("searchLatestDate").textContent =
      dateLabel(
        detail.latest_date
      );

    const preliminary =
      Boolean(
        detail.preliminary
      );

    $("searchFreshnessMeta").textContent =
      preliminary
        ? "Latest data includes preliminary GSC observations"
        : "Final Google Search Console data";

    const timeline =
      detail.timeline || [];

    const firstAvailable =
      timeline[0]?.data_date ||
      null;

    const lastAvailable =
      timeline.at(-1)?.data_date ||
      detail.latest_date ||
      null;

    let coverageText;

    if (
      period === "today"
    ) {
      coverageText =
        `<b>Google Search Console Property API</b> · last 24 hours · hourly preliminary data <b>${safe(dateLabel(detail.window_from))} → ${safe(dateLabel(detail.window_to))}</b>. Newest values may still change.`;

      $("searchRangeLabel").textContent =
        `Last 24 hours · ${dateLabel(detail.window_from)} → ${dateLabel(detail.window_to)} · preliminary`;

    } else {
      coverageText =
        `<b>Google Search Console Property API</b> · selected period <b>${safe(rangeDate(range.from))} → ${safe(rangeDate(range.to))}</b>`;

      if (
        firstAvailable &&
        String(firstAvailable).slice(0,10) >
        String(range.from).slice(0,10)
      ) {
        coverageText +=
          ` · available GSC history <b>${safe(rangeDate(firstAvailable))} → ${safe(rangeDate(lastAvailable))}</b>`;
      } else {
        coverageText +=
          ` · data through <b>${safe(rangeDate(lastAvailable))}</b>`;
      }

      coverageText += ".";

      if (
        preliminary &&
        detail.first_incomplete_date
      ) {
        coverageText +=
          ` Preliminary from <b>${safe(rangeDate(detail.first_incomplete_date))}</b>; newest values may still change.`;

        const finalThrough =
          previousDay(
            detail.first_incomplete_date
          );

        if (finalThrough) {
          coverageText +=
            ` Final through <b>${safe(rangeDate(finalThrough))}</b>.`;
        }
      }

      if (
        firstAvailable &&
        String(firstAvailable).slice(0,10) >
        String(range.from).slice(0,10)
      ) {
        $("searchRangeLabel").textContent =
          `Selected ${rangeDate(range.from)} → ${rangeDate(range.to)} · available history ${rangeDate(firstAvailable)} → ${rangeDate(lastAvailable)}`;
      } else {
        $("searchRangeLabel").textContent =
          preliminary
            ? `${rangeDate(range.from)} → ${rangeDate(range.to)} · latest through ${rangeDate(lastAvailable)} · includes preliminary`
            : `${rangeDate(range.from)} → ${rangeDate(range.to)} · GSC through ${rangeDate(lastAvailable)}`;
      }
    }

    $("searchCoverageNotice").innerHTML =
      coverageText;

    renderTimeline(
      timeline,
      range
    );

    renderPages();
    renderQueries();

    renderFreshLanguages(
      detail.top_search_pages || []
    );

    const countries =
      [...(detail.countries || [])]
        .sort(
          sorter(
            "impressions"
          )
        )
        .slice(
          0,
          30
        );

    $("searchCountriesBody").innerHTML =
      countries.length
        ? countries.map(
            row => `
              <tr>
                <td>${safe(countryLabel(row.key))}</td>
                <td>${num(row.impressions)}</td>
                <td>${num(row.clicks)}</td>
                <td>${pct(row.ctr)}</td>
              </tr>
            `
          ).join("")
        : '<tr><td colspan="4">No country rows.</td></tr>';

    const devices =
      detail.devices || [];

    $("searchDevicesBody").innerHTML =
      devices.length
        ? devices.map(
            row => `
              <tr>
                <td>${safe(String(row.key || "Unknown").replaceAll("_"," "))}</td>
                <td>${num(row.impressions)}</td>
                <td>${num(row.clicks)}</td>
                <td>${pct(row.ctr)}</td>
              </tr>
            `
          ).join("")
        : '<tr><td colspan="4">No device rows.</td></tr>';
  }

  function renderPages() {
    if (!detailCache) {
      return;
    }

    const rows =
      [
        ...(detailCache
          .top_search_pages || [])
      ]
        .sort(
          sorter(
            pagesSort
          )
        )
        .slice(
          0,
          30
        );

    $("searchPagesBody").innerHTML =
      rows.length
        ? rows.map(
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
                <td>${num(row.impressions)}</td>
                <td><b>${num(row.clicks)}</b></td>
                <td>${pct(row.ctr)}</td>
                <td>${row.avg_position == null ? "—" : Number(row.avg_position).toFixed(1)}</td>
              </tr>
            `
          ).join("")
        : '<tr><td colspan="7">No GSC page rows.</td></tr>';
  }

  function renderQueries() {
    if (!detailCache) {
      return;
    }

    const rows =
      [
        ...(detailCache
          .top_queries || [])
      ]
        .sort(
          sorter(
            queriesSort
          )
        )
        .slice(
          0,
          30
        );

    $("searchQueriesBody").innerHTML =
      rows.length
        ? rows.map(
            row => `
              <tr>
                <td>${safe(row.key || "(unavailable)")}</td>
                <td>${num(row.impressions)}</td>
                <td><b>${num(row.clicks)}</b></td>
                <td>${pct(row.ctr)}</td>
                <td>${row.position == null ? "—" : Number(row.position).toFixed(1)}</td>
              </tr>
            `
          ).join("")
        : '<tr><td colspan="5">No GSC query rows.</td></tr>';
  }

  function renderTimeline(
    rawRows,
    range
  ) {
    const root =
      $("searchVisibilityChart");

    const source =
      [...rawRows]
        .filter(
          row =>
            row.data_date
        )
        .sort(
          (a,b) =>
            (
              Date.parse(
                a.data_date
              ) || 0
            ) -
            (
              Date.parse(
                b.data_date
              ) || 0
            )
        );

    if (!source.length) {
      root.innerHTML =
        '<div style="height:100%;display:grid;place-items:center;color:#77859a">No GSC observations in this period.</div>';

      return;
    }


    let rows = [];


    /*
     * TODAY
     * Keep exact hourly observations.
     */
    if (
      period === "today"
    ) {
      rows =
        source.map(
          row => ({
            ...row,
            has_data:
              true
          })
        );

    } else {

      /*
       * 7D / 30D / 90D / Custom
       *
       * X-axis always spans the SELECTED period.
       *
       * Dates before GSC collection began are NULL / no-data,
       * never fake zeroes.
       *
       * Missing dates BETWEEN first and last real observation
       * are valid zero-search days.
       */
      const actualByDate =
        new Map();

      for (
        const row of source
      ) {
        const key =
          String(
            row.data_date
          ).slice(
            0,
            10
          );

        actualByDate.set(
          key,
          row
        );
      }

      const firstActual =
        String(
          source[0].data_date
        ).slice(
          0,
          10
        );

      const lastActual =
        String(
          source.at(-1).data_date
        ).slice(
          0,
          10
        );

      const from =
        range?.from ||
        firstActual;

      const to =
        range?.to ||
        lastActual;

      const fromDate =
        new Date(
          `${from}T00:00:00Z`
        );

      const toDate =
        new Date(
          `${to}T00:00:00Z`
        );

      for (
        let date =
          new Date(
            fromDate
          );

        date <= toDate;

        date.setUTCDate(
          date.getUTCDate() + 1
        )
      ) {
        const key =
          date
            .toISOString()
            .slice(
              0,
              10
            );

        const actual =
          actualByDate.get(
            key
          );

        if (actual) {
          rows.push({
            ...actual,
            data_date:
              key,
            has_data:
              true
          });

          continue;
        }

        /*
         * We only convert gaps to 0 AFTER telemetry began
         * and BEFORE the latest actual observation.
         */
        if (
          key >= firstActual &&
          key <= lastActual
        ) {
          rows.push({
            data_date:
              key,
            impressions:
              0,
            clicks:
              0,
            ctr:
              0,
            position:
              null,
            has_data:
              true
          });

          continue;
        }

        rows.push({
          data_date:
            key,
          impressions:
            null,
          clicks:
            null,
          ctr:
            null,
          position:
            null,
          has_data:
            false
        });
      }
    }


    const width =
      1120;

    const height =
      300;

    const left =
      72;

    const right =
      66;

    const top =
      25;

    const bottom =
      50;

    const usableW =
      width -
      left -
      right;

    const usableH =
      height -
      top -
      bottom;


    const dataRows =
      rows.filter(
        row =>
          row.has_data
      );


    const impressions =
      dataRows.map(
        row =>
          Number(
            row.impressions || 0
          )
      );

    const clicks =
      dataRows.map(
        row =>
          Number(
            row.clicks || 0
          )
      );


    const nice =
      value => {
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

        return (
          step *
          power
        );
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


    /*
     * Extra X padding prevents first/last bar
     * colliding with Y-axis labels.
     */
    const plotPadding =
      24;

    const plotWidth =
      usableW -
      plotPadding * 2;


    const x =
      index =>
        left +
        plotPadding +
        (
          rows.length === 1
            ? plotWidth / 2
            : index /
              (
                rows.length -
                1
              ) *
              plotWidth
        );


    const yI =
      value =>
        top +
        usableH -
        (
          Number(
            value || 0
          ) /
          maxI *
          usableH
        );


    const yC =
      value =>
        top +
        usableH -
        (
          Number(
            value || 0
          ) /
          maxC *
          usableH
        );


    const grid =
      Array.from(
        {
          length: 5
        },
        (_,index) => {
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
              x2="${width-right}"
              y2="${y}"
              stroke="#e8edf4"
            />

            <text
              x="${left-12}"
              y="${y+4}"
              text-anchor="end"
              font-size="10"
              fill="#7a8698"
            >${num(Math.round(maxI*(1-ratio)))}</text>

            <text
              x="${width-right+12}"
              y="${y+4}"
              font-size="10"
              fill="#7a8698"
            >${num(Math.round(maxC*(1-ratio)))}</text>
          `;
        }
      ).join("");


    const barWidth =
      Math.max(
        4,
        Math.min(
          42,
          plotWidth /
          Math.max(
            rows.length,
            1
          ) *
          0.58
        )
      );


    const bars =
      rows.map(
        (row,index) => {

          if (
            !row.has_data
          ) {
            return "";
          }

          const value =
            Number(
              row.impressions || 0
            );

          const y =
            yI(
              value
            );

          return `
            <rect
              x="${x(index)-barWidth/2}"
              y="${y}"
              width="${barWidth}"
              height="${Math.max(top+usableH-y,1)}"
              rx="3"
              fill="#dce8ff"
            >
              <title>${safe(tooltipDate(row.data_date))} · ${num(value)} impressions · ${num(row.clicks)} clicks</title>
            </rect>
          `;
        }
      ).join("");


    /*
     * Click line begins only when actual GSC history exists.
     * No line through the pre-collection no-data zone.
     */
    const points =
      rows
        .map(
          (row,index) => ({
            row,
            index
          })
        )
        .filter(
          item =>
            item.row.has_data
        )
        .map(
          item => ({
            x:
              x(
                item.index
              ),

            y:
              yC(
                item.row.clicks
              ),

            clicks:
              Number(
                item.row.clicks || 0
              ),

            date:
              item.row.data_date
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
            <title>${safe(tooltipDate(point.date))} · ${num(point.clicks)} clicks</title>
          </circle>
        `
      ).join("");


    /*
     * Make each selected period visually distinct.
     */
    const desiredLabels =
      period === "today"
        ? 8
        : period === "7d"
          ? 7
          : period === "30d"
            ? 7
            : period === "90d"
              ? 9
              : 9;


    const tickStep =
      Math.max(
        1,
        Math.ceil(
          (
            rows.length -
            1
          ) /
          (
            desiredLabels -
            1
          )
        )
      );


    const labels =
      rows.map(
        (row,index) => {
          const show =
            index === 0 ||
            index ===
              rows.length - 1 ||
            index %
              tickStep ===
              0;

          if (!show) {
            return "";
          }

          return `
            <text
              x="${x(index)}"
              y="${height-11}"
              text-anchor="middle"
              font-size="10"
              fill="#7a8698"
            >${safe(axisDate(row.data_date))}</text>
          `;
        }
      ).join("");


    /*
     * Optional visual marker where actual GSC history starts.
     * Especially useful on 30D / 90D.
     */
    let historyStartMarker =
      "";

    if (
      period !== "today"
    ) {
      const firstRealIndex =
        rows.findIndex(
          row =>
            row.has_data
        );

      if (
        firstRealIndex > 0
      ) {
        const markerX =
          x(
            firstRealIndex
          );

        historyStartMarker = `
          <line
            x1="${markerX}"
            y1="${top}"
            x2="${markerX}"
            y2="${top+usableH}"
            stroke="#c8d1de"
            stroke-width="1"
            stroke-dasharray="4 5"
          />

          <text
            x="${markerX+7}"
            y="${top+13}"
            font-size="9"
            fill="#8a96a8"
          >GSC history starts ${safe(axisDate(rows[firstRealIndex].data_date))}</text>
        `;
      }
    }


    root.innerHTML = `
      <div
        style="
          display:flex;
          gap:18px;
          margin:0 8px 8px;
          font-size:12px;
          color:#65758c
        "
      >
        <span>▰ Impressions</span>

        <span style="color:#16a36a">
          ● Clicks
        </span>

        <span style="margin-left:auto">
          Left axis: impressions · Right axis: clicks
        </span>
      </div>

      <svg
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        style="
          width:100%;
          height:290px;
          display:block
        "
      >
        ${grid}
        ${historyStartMarker}
        ${bars}

        ${
          points.length
            ? `
              <polyline
                points="${line}"
                fill="none"
                stroke="#16a36a"
                stroke-width="2.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            `
            : ""
        }

        ${dots}
        ${labels}
      </svg>
    `;
  }


  function renderLanguages(
    data,
    today
  ) {
    const body =
      $("searchLanguagesBody");

    if (today) {
      body.innerHTML =
        '<tr><td colspan="5">Hourly language breakdown is not available yet. Final daily attribution appears after GSC finalization.</td></tr>';

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
        (sum,row) =>
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
              <td>${num(impressions)}</td>
              <td>${num(clicks)}</td>
              <td>${ctr.toFixed(2)}%</td>
              <td>${share.toFixed(2)}%</td>
            </tr>
          `;
        }
      ).join("");
  }

  function renderFreshLanguages(
    pageRows
  ) {
    const body =
      $("searchLanguagesBody");

    const order = [
      "en",
      "ru",
      "hi",
      "zh",
      "es",
      "fr",
      "de",
      "ar"
    ];

    const totals =
      new Map(
        order.map(
          code => [
            code,
            {
              impressions: 0,
              clicks: 0
            }
          ]
        )
      );

    const global = {
      impressions: 0,
      clicks: 0
    };


    for (
      const row of pageRows
    ) {
      const path =
        String(
          row.url_path || ""
        );

      let code =
        String(
          row.language_code || ""
        ).toLowerCase();


      /*
       * Prefer explicit page language.
       * Fallback to URL prefix.
       */
      if (
        !totals.has(code)
      ) {
        const match =
          path.match(
            /^\/([a-z]{2})\//
          );

        code =
          match
            ? match[1]
            : "";
      }


      if (
        totals.has(code)
      ) {
        const item =
          totals.get(code);

        item.impressions +=
          Number(
            row.impressions || 0
          );

        item.clicks +=
          Number(
            row.clicks || 0
          );

      } else {
        /*
         * Homepage "/" and any genuinely non-language route.
         * Never force these into English.
         */
        global.impressions +=
          Number(
            row.impressions || 0
          );

        global.clicks +=
          Number(
            row.clicks || 0
          );
      }
    }


    const allImpressions =
      [
        ...totals.values(),
        global
      ]
        .reduce(
          (sum,item) =>
            sum +
            item.impressions,
          0
        );


    const languageRows =
      order.map(
        code => {
          const item =
            totals.get(code);

          const ctr =
            item.impressions
              ? item.clicks /
                item.impressions *
                100
              : 0;

          const share =
            allImpressions
              ? item.impressions /
                allImpressions *
                100
              : 0;

          return `
            <tr>
              <td>
                <b>${safe(LANGUAGES[code])}</b>
              </td>

              <td>
                ${num(item.impressions)}
              </td>

              <td>
                ${num(item.clicks)}
              </td>

              <td>
                ${ctr.toFixed(2)}%
              </td>

              <td>
                ${share.toFixed(2)}%
              </td>
            </tr>
          `;
        }
      );


    if (
      global.impressions > 0 ||
      global.clicks > 0
    ) {
      const ctr =
        global.impressions
          ? global.clicks /
            global.impressions *
            100
          : 0;

      const share =
        allImpressions
          ? global.impressions /
            allImpressions *
            100
          : 0;

      languageRows.push(`
        <tr>
          <td>
            <b>Global / Homepage</b>
          </td>

          <td>
            ${num(global.impressions)}
          </td>

          <td>
            ${num(global.clicks)}
          </td>

          <td>
            ${ctr.toFixed(2)}%
          </td>

          <td>
            ${share.toFixed(2)}%
          </td>
        </tr>
      `);
    }


    body.innerHTML =
      languageRows.join("");
  }


  function renderContext(
    data
  ) {
    const c =
      data.lifecycle_contract || {};

    const visible =
      c.search_visible?.value ??
      null;

    const indexed =
      c.indexed?.value ??
      null;

    const sitemap =
      c.sitemap?.value ??
      null;

    const registered =
      c.registered?.value ??
      null;

    $("searchContextBody").innerHTML = `
      <tr><td>Search-visible pages</td><td style="text-align:right"><b>${visible == null ? "—" : num(visible)}</b></td></tr>
      <tr><td>Indexed snapshot</td><td style="text-align:right"><b>${indexed == null ? "—" : "≈"+num(indexed)}</b></td></tr>
      <tr><td>Index snapshot date</td><td style="text-align:right"><b>${safe(c.indexed?.snapshot_date || "—")}</b></td></tr>
      <tr><td>Sitemap pages</td><td style="text-align:right"><b>${sitemap == null ? "—" : num(sitemap)}</b></td></tr>
      <tr><td>Registered pages</td><td style="text-align:right"><b>${registered == null ? "—" : num(registered)}</b></td></tr>
    `;
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
          detail,
          overview.range
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
          period =
            normalizePeriod(
              button.dataset.searchPeriod
            );

          localStorage.setItem(
            "primadom-intelligence-detail-period",
            period
          );

          activate(
            period
          );

          if (
            period === "custom"
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
            period
          );
        }
      );
    });

  $("searchPagesSort")
    ?.addEventListener(
      "change",
      event => {
        pagesSort =
          event.target.value;

        renderPages();
      }
    );

  $("searchQueriesSort")
    ?.addEventListener(
      "change",
      event => {
        queriesSort =
          event.target.value;

        renderQueries();
      }
    );

  $("searchApplyCustom")
    ?.addEventListener(
      "click",
      () => {
        const from =
          $("searchFrom")?.value;

        const to =
          $("searchTo")?.value;

        if (!from || !to) {
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
