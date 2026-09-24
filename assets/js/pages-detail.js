(() => {
  "use strict";

  const OVERVIEW =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const PAGES =
    "https://analytics.primadom.ai/api/intelligence/pages";

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

  const metric = value =>
    value == null
      ? "—"
      : number(value);

  const TYPES = {
    project_page: "Project",
    district_page: "District",
    developer_page: "Developer",
    intent_page: "Intent",
    budget_page: "Budget",
    property_type_page: "Property Type",
    buyer_scenario_page: "Buyer Scenario",
    origin_buyer_page: "Origin Buyer",
    ai_answer_page: "AI Answer",
    project_comparison_page: "Project Comparison",
    district_comparison_page: "District Comparison",
    developer_comparison_page: "Developer Comparison"
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

  let page =
    1;

  const pageSize =
    50;

  let totalPages =
    null;

  let hasMore =
    false;

  let searchTimer =
    null;

  function activate(value) {
    document
      .querySelectorAll(
        "[data-pages-period]"
      )
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.pagesPeriod === value
        );
      });
  }

  function showCustom(show) {
    if ($("pagesCustomRange")) {
      $("pagesCustomRange").style.display =
        show
          ? "flex"
          : "none";
    }
  }

  function overviewSuffix() {
    let suffix =
      `period=${encodeURIComponent(period)}`;

    if (
      period === "custom"
    ) {
      const from =
        $("pagesFrom")?.value;

      const to =
        $("pagesTo")?.value;

      if (
        from &&
        to
      ) {
        suffix +=
          `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      }
    }

    return suffix;
  }

  function renderKpis(payload) {
    const data =
      payload.data || {};

    const contract =
      data.lifecycle_contract || {};

    $("pagesRegistered").textContent =
      metric(
        contract.registered?.value
      );

    $("pagesSitemap").textContent =
      metric(
        contract.sitemap?.value
      );

    $("pagesIndexed").textContent =
      contract.indexed?.value == null
        ? "—"
        : `≈${number(contract.indexed.value)}`;

    $("pagesIndexedMeta").textContent =
      contract.indexed?.snapshot_date
        ? `Approximate snapshot · ${contract.indexed.snapshot_date}`
        : "Approximate GSC snapshot";

    $("pagesSearchVisible").textContent =
      metric(
        contract.search_visible?.value
      );
  }

  function renderCatalog(payload) {
    const items =
      payload.items || [];

    totalPages =
      payload.total_pages == null
        ? null
        : Number(
            payload.total_pages
          );

    hasMore =
      Boolean(
        payload.has_more
      );

    if (
      payload.total != null
    ) {
      $("pagesCatalogMeta").textContent =
        `${number(payload.total)} canonical pages · selected period ${payload.range?.from || "—"} → ${payload.range?.to || "—"}`;
    } else {
      $("pagesCatalogMeta").textContent =
        `Filtered canonical pages · selected period ${payload.range?.from || "—"} → ${payload.range?.to || "—"}`;
    }

    if (
      totalPages != null
    ) {
      $("pagesPagination").textContent =
        `Page ${payload.page} of ${number(totalPages)} · ${number(payload.total)} pages`;
    } else {
      $("pagesPagination").textContent =
        `Page ${payload.page}`;
    }

    $("pagesPrev").disabled =
      payload.page <= 1;

    $("pagesNext").disabled =
      !hasMore;

    $("pagesCatalogBody").innerHTML =
      items.length
        ? items.map(
            row => `
              <tr>

                <td>
                  <a
                    class="page-live-link"
                    href="https://primadom.ai${safe(row.canonical_url_path || row.url_path)}"
                    target="_blank"
                    rel="noopener"
                  >${safe(row.url_path)}</a>
                </td>

                <td>
                  ${safe(
                    TYPES[row.page_type_id] ||
                    String(row.page_type_id || "—")
                      .replaceAll("_", " ")
                  )}
                </td>

                <td>
                  ${safe(
                    String(
                      row.language_code || "—"
                    ).toUpperCase()
                  )}
                </td>

                <td>
                  ${safe(
                    row.entity || "—"
                  )}
                </td>

                <td>
                  ${safe(
                    row.lifecycle || "—"
                  )}
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
                  ${safe(
                    row.last_activity || "—"
                  )}
                </td>

              </tr>
            `
          ).join("")
        : '<tr><td colspan="12">No canonical pages match these filters.</td></tr>';
  }

  async function loadOverview() {
    const response =
      await fetch(
        `${OVERVIEW}?${overviewSuffix()}`
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
  }

  async function loadCatalog() {
    $("pagesCatalogBody").innerHTML =
      '<tr><td colspan="12">Loading…</td></tr>';

    const params =
      new URLSearchParams();

    params.set(
      "period",
      period
    );

    params.set(
      "page",
      String(page)
    );

    params.set(
      "page_size",
      String(pageSize)
    );

    if (
      period === "custom"
    ) {
      const from =
        $("pagesFrom")?.value;

      const to =
        $("pagesTo")?.value;

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
        '<tr><td colspan="12">Page catalog could not be loaded.</td></tr>';
    }
  }

  async function reload() {
    await Promise.all([
      loadOverview(),
      loadCatalog()
    ]);
  }

  document
    .querySelectorAll(
      "[data-pages-period]"
    )
    .forEach(button => {
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

          page =
            1;

          reload();
        }
      );
    });

  $("pagesApplyCustom")
    ?.addEventListener(
      "click",
      () => {
        const from =
          $("pagesFrom")?.value;

        const to =
          $("pagesTo")?.value;

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

        activate(
          "custom"
        );

        page =
          1;

        reload();
      }
    );

  $("pagesLanguageFilter")
    ?.addEventListener(
      "change",
      () => {
        page =
          1;

        loadCatalog();
      }
    );

  $("pagesTypeFilter")
    ?.addEventListener(
      "change",
      () => {
        page =
          1;

        loadCatalog();
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
            () => {
              page =
                1;

              loadCatalog();
            },
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

        page -= 1;

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

        page += 1;

        loadCatalog();
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

        reload();

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

    reload();
  }

  initial();

})();
