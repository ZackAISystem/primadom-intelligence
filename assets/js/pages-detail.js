(() => {
  "use strict";


  const OVERVIEW =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const PAGES =
    "https://analytics.primadom.ai/api/intelligence/pages";


  const $ =
    id =>
      document.getElementById(
        id
      );


  const num =
    value =>
      new Intl.NumberFormat(
        "en-US"
      ).format(
        Number(
          value || 0
        )
      );


  const safe =
    value =>
      String(
        value ?? ""
      )
        .replaceAll(
          "&",
          "&amp;"
        )
        .replaceAll(
          "<",
          "&lt;"
        )
        .replaceAll(
          ">",
          "&gt;"
        )
        .replaceAll(
          '"',
          "&quot;"
        )
        .replaceAll(
          "'",
          "&#039;"
        );


  const TYPES = {
    project_page:
      "Project",

    district_page:
      "District",

    developer_page:
      "Developer",

    intent_page:
      "Intent",

    budget_page:
      "Budget",

    property_type_page:
      "Property",

    buyer_scenario_page:
      "Buyer",

    origin_buyer_page:
      "Origin",

    ai_answer_page:
      "AI Answer",

    project_comparison_page:
      "Project Compare",

    district_comparison_page:
      "District Compare",

    developer_comparison_page:
      "Developer Compare"
  };


  const ACTIVITY_LABELS = {
    any:
      "pages with activity",

    human:
      "pages with human traffic",

    search:
      "pages visible in Google",

    clicks:
      "pages with Google clicks",

    ai:
      "pages crawled by AI / bots",

    leads:
      "pages with leads",

    all:
      "canonical pages"
  };


  let period =
    normalizePeriod(
      localStorage.getItem(
        "primadom-intelligence-detail-period"
      ) ||
      "7d"
    );


  let page =
    1;


  const pageSize =
    50;


  let hasMore =
    false;


  let searchTimer =
    null;


  function normalizePeriod(
    value
  ) {
    const p =
      String(
        value || ""
      ).toLowerCase();


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
    ].includes(
      p
    )
      ? p
      : "7d";
  }


  function activatePeriod(
    value
  ) {
    document
      .querySelectorAll(
        "[data-pages-period]"
      )
      .forEach(
        button => {
          button.classList.toggle(
            "active",
            button.dataset.pagesPeriod ===
              value
          );
        }
      );
  }


  function showCustom(
    show
  ) {
    if (
      $("pagesCustomRange")
    ) {
      $("pagesCustomRange")
        .style.display =
          show
            ? "flex"
            : "none";
    }
  }


  function periodParams() {
    const params =
      new URLSearchParams();


    params.set(
      "period",
      period
    );


    if (
      period === "custom"
    ) {
      const from =
        $("pagesFrom")
          ?.value;

      const to =
        $("pagesTo")
          ?.value;


      if (
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
    }


    return params;
  }


  function metric(
    value
  ) {
    const n =
      Number(
        value || 0
      );


    if (!n) {
      return '<span class="pages-metric-zero">0</span>';
    }


    return `<b>${num(n)}</b>`;
  }


  function shortDate(
    value
  ) {
    if (!value) {
      return "—";
    }


    const match =
      String(
        value
      ).match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );


    if (!match) {
      return String(
        value
      );
    }


    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];


    return `${months[Number(match[2])-1]} ${Number(match[3])}`;
  }


  function lifeBadge(
    value
  ) {
    if (!value) {
      return "";
    }


    const normalized =
      String(
        value
      ).toLowerCase();


    const good =
      (
        normalized ===
          "published" ||
        normalized ===
          "indexed" ||
        normalized ===
          "submitted" ||
        normalized ===
          "deployed"
      );


    const label =
      String(
        value
      )
        .replaceAll(
          "_",
          " "
        );


    return `
      <span class="pages-life-badge${good ? " good" : ""}">
        ${safe(label)}
      </span>
    `;
  }


  function renderKpis(
    payload
  ) {
    const data =
      payload.data ||
      {};


    const contract =
      data.lifecycle_contract ||
      {};


    $("pagesRegistered").textContent =
      contract.registered
        ?.value == null
          ? "—"
          : num(
              contract.registered.value
            );


    $("pagesSitemap").textContent =
      contract.sitemap
        ?.value == null
          ? "—"
          : num(
              contract.sitemap.value
            );


    $("pagesIndexed").textContent =
      contract.indexed
        ?.value == null
          ? "—"
          : `≈${num(contract.indexed.value)}`;


    $("pagesIndexedMeta").textContent =
      contract.indexed
        ?.snapshot_date
          ? `Approximate snapshot · ${contract.indexed.snapshot_date}`
          : "Approximate GSC snapshot";


    $("pagesSearchVisible").textContent =
      contract.search_visible
        ?.value == null
          ? "—"
          : num(
              contract.search_visible.value
            );
  }


  function renderCatalog(
    payload
  ) {
    const items =
      payload.items ||
      [];


    hasMore =
      Boolean(
        payload.has_more
      );


    const activity =
      payload.activity ||
      "any";


    $("pagesCatalogMeta").textContent =
      `${num(payload.total)} ${ACTIVITY_LABELS[activity] || "matching pages"} · selected period ${payload.range?.from || "—"} → ${payload.range?.to || "—"}`;


    $("pagesPagination").textContent =
      payload.total_pages
        ? `Page ${num(payload.page)} of ${num(payload.total_pages)} · ${num(payload.total)} pages`
        : "No matching pages";


    $("pagesPrev").disabled =
      Number(
        payload.page || 1
      ) <= 1;


    $("pagesNext").disabled =
      !hasMore;


    $("pagesCatalogBody").innerHTML =
      items.length
        ? items.map(
            row => {

              const path =
                row.canonical_url_path ||
                row.url_path ||
                "";


              const entity =
                row.entity
                  ? `
                    <span class="pages-page-entity">
                      ${safe(row.entity)}
                    </span>
                  `
                  : "";


              const lifecycle = `
                <div class="pages-life">
                  ${lifeBadge(row.publish_status)}
                  ${lifeBadge(row.indexation_status)}
                </div>
              `;


              return `
                <tr>

                  <td>
                    <a
                      class="pages-page-url"
                      href="https://primadom.ai${safe(path)}"
                      target="_blank"
                      rel="noopener"
                      title="${safe(row.url_path)}"
                    >
                      ${safe(row.url_path)}
                    </a>

                    ${entity}
                  </td>


                  <td>
                    ${safe(
                      TYPES[row.page_type_id] ||
                      String(
                        row.page_type_id ||
                        "—"
                      )
                        .replace(
                          /_page$/,
                          ""
                        )
                        .replaceAll(
                          "_",
                          " "
                        )
                    )}
                  </td>


                  <td>
                    <b>
                      ${safe(
                        String(
                          row.language_code ||
                          "—"
                        ).toUpperCase()
                      )}
                    </b>
                  </td>


                  <td>
                    ${lifecycle}
                  </td>


                  <td>
                    ${metric(row.visitors)}
                  </td>


                  <td>
                    ${metric(row.pageviews)}
                  </td>


                  <td>
                    ${metric(row.leads)}
                  </td>


                  <td>
                    ${metric(row.google_impressions)}
                  </td>


                  <td>
                    ${metric(row.google_clicks)}
                  </td>


                  <td>
                    ${metric(row.ai_bot_requests)}
                  </td>


                  <td>
                    ${safe(shortDate(row.last_activity))}
                  </td>

                </tr>
              `;
            }
          ).join("")
        : `
          <tr>
            <td colspan="11">
              No pages match these filters for the selected period.
            </td>
          </tr>
        `;
  }


  async function loadOverview() {
    try {
      const params =
        periodParams();


      const response =
        await fetch(
          `${OVERVIEW}?${params.toString()}`
        );


      const payload =
        await response.json();


      if (
        response.ok &&
        payload?.data
      ) {
        renderKpis(
          payload
        );
      }

    } catch (error) {
      console.error(
        "Pages overview:",
        error
      );
    }
  }


  const PERFORMANCE = {

    visited: {
      activity: "human",
      sort: "visitors"
    },

    viewed: {
      activity: "human",
      sort: "pageviews"
    },

    search: {
      activity: "search",
      sort: "google_impressions"
    },

    clicks: {
      activity: "clicks",
      sort: "google_clicks"
    },

    ai: {
      activity: "ai",
      sort: "ai_requests"
    },

    leads: {
      activity: "leads",
      sort: "leads"
    },

    recent: {
      activity: "any",
      sort: "last_activity"
    },

    active: {
      activity: "any",
      sort: "visitors"
    },

    all: {
      activity: "all",
      sort: "visitors"
    }

  };


  async function loadCatalog() {
    $("pagesCatalogBody").innerHTML =
      '<tr><td colspan="11">Loading…</td></tr>';


    const params =
      periodParams();


    params.set(
      "page",
      String(
        page
      )
    );


    params.set(
      "page_size",
      String(
        pageSize
      )
    );


    const query =
      $("pagesSearchInput")
        ?.value
        .trim();


    const language =
      $("pagesLanguageFilter")
        ?.value;


    const type =
      $("pagesTypeFilter")
        ?.value;


    const performance =
      $("pagesPerformanceFilter")
        ?.value ||
      "visited";


    const config =
      PERFORMANCE[performance] ||
      PERFORMANCE.visited;


    const activity =
      config.activity;


    const sort =
      config.sort;


    if (query) {
      params.set(
        "q",
        query
      );
    }


    if (language) {
      params.set(
        "language",
        language
      );
    }


    if (type) {
      params.set(
        "type",
        type
      );
    }


    params.set(
      "activity",
      activity
    );


    params.set(
      "sort",
      sort
    );


    try {
      const response =
        await fetch(
          `${PAGES}?${params.toString()}`
        );


      const payload =
        await response.json();


      if (
        !response.ok ||
        !payload?.ok
      ) {
        throw new Error(
          "pages catalog failed"
        );
      }


      renderCatalog(
        payload
      );


    } catch (error) {
      console.error(
        "Pages & Content:",
        error
      );


      $("pagesCatalogBody").innerHTML =
        `
          <tr>
            <td colspan="11">
              Page catalog could not be loaded.
            </td>
          </tr>
        `;
    }
  }


  function reloadAll() {
    return Promise.all([
      loadOverview(),
      loadCatalog()
    ]);
  }


  function resetAndLoad() {
    page =
      1;

    loadCatalog();
  }


  document
    .querySelectorAll(
      "[data-pages-period]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            period =
              normalizePeriod(
                button.dataset.pagesPeriod
              );


            localStorage.setItem(
              "primadom-intelligence-detail-period",
              period
            );


            activatePeriod(
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

            page =
              1;

            reloadAll();
          }
        );
      }
    );


  $("pagesApplyCustom")
    ?.addEventListener(
      "click",
      () => {

        const from =
          $("pagesFrom")
            ?.value;

        const to =
          $("pagesTo")
            ?.value;


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
          "primadom-intelligence-pages-custom-from",
          from
        );


        localStorage.setItem(
          "primadom-intelligence-pages-custom-to",
          to
        );


        activatePeriod(
          "custom"
        );


        page =
          1;

        reloadAll();
      }
    );


  [
    "pagesLanguageFilter",
    "pagesTypeFilter",
    "pagesPerformanceFilter"
  ].forEach(
    id => {
      $(id)
        ?.addEventListener(
          "change",
          resetAndLoad
        );
    }
  );


  $("pagesSearchInput")
    ?.addEventListener(
      "input",
      () => {

        clearTimeout(
          searchTimer
        );


        searchTimer =
          setTimeout(
            resetAndLoad,
            300
          );
      }
    );


  $("pagesPrev")
    ?.addEventListener(
      "click",
      () => {

        if (
          page <= 1
        ) {
          return;
        }


        page -=
          1;


        loadCatalog();
      }
    );


  $("pagesNext")
    ?.addEventListener(
      "click",
      () => {

        if (
          !hasMore
        ) {
          return;
        }


        page +=
          1;


        loadCatalog();
      }
    );


  function initial() {
    activatePeriod(
      period
    );


    $("pagesPerformanceFilter").value =
      "visited";


    if (
      period === "custom"
    ) {
      const from =
        localStorage.getItem(
          "primadom-intelligence-pages-custom-from"
        );


      const to =
        localStorage.getItem(
          "primadom-intelligence-pages-custom-to"
        );


      if (
        from &&
        to
      ) {
        $("pagesFrom").value =
          from;

        $("pagesTo").value =
          to;

        showCustom(
          true
        );

        reloadAll();

        return;
      }


      period =
        "7d";


      localStorage.setItem(
        "primadom-intelligence-detail-period",
        "7d"
      );
    }


    activatePeriod(
      period
    );


    showCustom(
      false
    );


    reloadAll();
  }


  initial();

})();
