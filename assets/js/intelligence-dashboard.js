(() => {
  "use strict";

  const dashboard = document.getElementById("dashboard");

  if (!dashboard) {
    console.error("[Primadom Intelligence] Dashboard screen not found.");
    return;
  }

  const API =
    "https://analytics.primadom.ai/api/intelligence/overview";

  const NUMBER =
    new Intl.NumberFormat("en-US");

  const LANGUAGE_NAMES = {
    en: "English",
    ru: "Russian",
    ar: "Arabic",
    es: "Spanish",
    de: "German",
    fr: "French",
    hi: "Hindi",
    zh: "Chinese"
  };

  const PERIODS = {
    TODAY: "today",
    "7D": "7d",
    "30D": "30d",
    "90D": "90d"
  };

  let requestId = 0;
  let lastPayload = null;
  let lastRange = null;


  // ==========================================================
  // HELPERS
  // ==========================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function num(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return "—";
    }

    return NUMBER.format(Math.round(n));
  }


  function percentDecimal(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return "—";
    }

    const p = n * 100;

    return (
      p < 1
        ? p.toFixed(2)
        : p.toFixed(1)
    ) + "%";
  }


  function percentValue(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return "—";
    }

    return (
      n < 1
        ? n.toFixed(2)
        : n.toFixed(1)
    ) + "%";
  }


  function periodKey(raw) {
    const key =
      String(raw || "7D")
        .trim()
        .toUpperCase();

    return PERIODS[key] || "7d";
  }


  function periodLabel(range) {
    if (!range) {
      return "Live";
    }

    if (range.period === "today") {
      return "Today";
    }

    return String(range.period || "7d").toUpperCase();
  }


  function findPanel(title) {
    return [...dashboard.querySelectorAll(".panel")]
      .find(panel => {
        const heading =
          panel.querySelector("h2, h3");

        return (
          heading &&
          heading.textContent.trim() === title
        );
      });
  }


  function kpi(title) {
    return dashboard.querySelector(
      `.kpi[data-title="${title}"]`
    );
  }


  function setKpi(title, value, sub) {
    const card = kpi(title);

    if (!card) {
      return;
    }

    const valueNode =
      card.querySelector(".kpi-value");

    const subNode =
      card.querySelector(".kpi-sub");

    if (valueNode) {
      valueNode.textContent = value;
    }

    if (subNode && sub !== undefined) {
      subNode.innerHTML = sub;
    }

    const spark =
      card.querySelector(".spark");

    if (spark) {
      /*
       * Previous-period trend is not yet in the API.
       * Keep layout identical but do not show fake trend data.
       */
      spark.style.visibility = "hidden";
    }
  }


  function pageType(value) {
    const map = {
      project_page: ["Project", "blue"],
      district_page: ["District", "green"],
      developer_page: ["Developer", "gold"],
      project_comparison_page: ["Comparison", "violet"],
      district_comparison_page: ["Comparison", "violet"],
      developer_comparison_page: ["Comparison", "violet"],
      budget_page: ["Budget", "green"],
      ai_answer_page: ["AI Answer", "gold"],
      property_type_page: ["Property Type", "blue"],
      buyer_scenario_page: ["Buyer Scenario", "green"],
      origin_buyer_page: ["Origin Buyer", "violet"],
      intent_page: ["Intent", "blue"]
    };

    if (map[value]) {
      return map[value];
    }

    const label =
      String(value || "Page")
        .replace(/_page$/i, "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, c => c.toUpperCase());

    return [label, "blue"];
  }


  function channelPresentation(row) {
    const group =
      String(row.channel_group || "");

    if (group === "llm_referral") {
      return ["LLM Referral", "llm"];
    }

    if (group === "llm_campaign") {
      return ["LLM Campaign", "llm"];
    }

    if (
      group === "organic_search" ||
      group === "paid_search"
    ) {
      return [
        group === "paid_search"
          ? "Paid Search"
          : "Search",
        "search"
      ];
    }

    if (group === "direct") {
      return ["Direct", "human"];
    }

    return [
      row.traffic_kind === "human"
        ? "Human"
        : "Other",
      "human"
    ];
  }


  function sourceBrand(row) {
    const key =
      String(row.source_key || "")
        .toLowerCase();

    const name =
      String(row.source_name || "")
        .toLowerCase();

    if (
      key === "chatgpt" ||
      name.includes("chatgpt")
    ) {
      return ["logo-chatgpt", "◎"];
    }

    if (
      key === "google" ||
      name.includes("google")
    ) {
      return ["logo-google", "G"];
    }

    if (
      key === "perplexity" ||
      name.includes("perplexity")
    ) {
      return ["logo-perplexity", "P"];
    }

    if (
      key === "claude" ||
      name.includes("claude")
    ) {
      return ["logo-claude", "✳"];
    }

    if (key === "direct") {
      return ["logo-direct", "↗"];
    }

    return ["logo-bot", "AI"];
  }


  function crawlerBrand(row) {
    const op =
      String(row.operator_key || "")
        .toLowerCase();

    if (op === "openai") {
      return ["logo-openai", "◎"];
    }

    if (op === "google") {
      return ["logo-google", "G"];
    }

    if (op === "anthropic") {
      return ["logo-claude", "✳"];
    }

    if (op === "perplexity") {
      return ["logo-perplexity", "P"];
    }

    if (op === "microsoft") {
      return ["logo-bing", "b"];
    }

    if (op === "semrush") {
      return ["logo-bot", "S"];
    }

    if (op === "amazon") {
      return ["logo-bot", "A"];
    }

    if (op === "baidu") {
      return ["logo-bot", "B"];
    }

    return ["logo-bot", "AI"];
  }


  function countryFlag(code) {
    const c =
      String(code || "")
        .toUpperCase();

    if (!/^[A-Z]{2}$/.test(c)) {
      return "◉";
    }

    return [...c]
      .map(char =>
        String.fromCodePoint(
          127397 + char.charCodeAt(0)
        )
      )
      .join("");
  }


  function countryName(code) {
    const c =
      String(code || "")
        .toUpperCase();

    try {
      const names =
        new Intl.DisplayNames(
          ["en"],
          { type: "region" }
        );

      return names.of(c) || c;
    } catch {
      return c;
    }
  }


  function bindLiveRows(container) {
    if (!container) {
      return;
    }

    container
      .querySelectorAll(
        '[data-live-row="1"]'
      )
      .forEach(row => {

        row.addEventListener(
          "click",
          event => {

            if (
              event.target.closest("a")
            ) {
              return;
            }

            if (
              typeof window.openModal ===
              "function"
            ) {
              window.openModal(
                row.dataset.name ||
                  "Details",

                row.dataset.detail ||
                  "Live Primadom Intelligence data for the selected period."
              );
            }
          }
        );
      });
  }


  // ==========================================================
  // KPI CARDS
  // ==========================================================

  function renderKpis(data, range) {
    const kpis =
      data.kpis || {};

    const edge =
      data.cloudflare_edge || {};

    const coverage =
      data.coverage || {};

    const lifecycleContract =
      data.lifecycle_contract || {};

    const label =
      periodLabel(range);


    function shortDate(value) {
      if (!value) {
        return "—";
      }

      const d =
        new Date(
          `${value}T00:00:00Z`
        );

      if (
        Number.isNaN(
          d.getTime()
        )
      ) {
        return value;
      }

      return d.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        }
      );
    }


    function coverageText(
      object,
      fallback
    ) {
      if (
        !object ||
        !object.from ||
        !object.to
      ) {
        return fallback;
      }

      const days =
        Number(
          object.days || 0
        );

      if (
        object.from === object.to
      ) {
        return `${shortDate(
          object.from
        )} · 1 day coverage`;
      }

      return `${shortDate(
        object.from
      )}–${shortDate(
        object.to
      )} · ${days} day coverage`;
    }


    // ========================================================
    // TOTAL PAGES
    // ========================================================

    setKpi(
      "Page Network",
      num(
        kpis.deployed_pages ??
        kpis.sitemap_pages
      ),
      "Active production"
    );


    // ========================================================
    // HUMAN VISITORS — EXACT DISTINCT visitor_id
    // ========================================================

    setKpi(
      "Human Visitors",
      num(kpis.human_visitors),
      `${escapeHtml(label)} · exact first-party unique`
    );


    // ========================================================
    // LEADS
    // ========================================================

    const visitors =
      Number(
        kpis.human_visitors || 0
      );

    const leads =
      Number(
        kpis.leads || 0
      );

    const conversion =
      visitors > 0
        ? (
            leads /
            visitors
          ) * 100
        : 0;

    setKpi(
      "Leads",
      num(leads),
      `${percentValue(
        conversion
      )} visitor → lead`
    );


    // ========================================================
    // CLOUDFLARE EDGE UNIQUE VISITORS
    // ========================================================

    if (
      Number.isFinite(
        Number(
          kpis.edge_unique_visitors
        )
      )
    ) {
      setKpi(
        "Edge Unique Visitors",
        num(
          kpis.edge_unique_visitors
        ),
        `Cloudflare · exact ${escapeHtml(label)} unique`
      );
    } else {
      setKpi(
        "Edge Unique Visitors",
        "—",
        "Cloudflare unique data syncing"
      );
    }


    // ========================================================
    // AI / BOT REQUESTS
    // ========================================================

    setKpi(
      "AI & Bot Requests",
      num(
        kpis.ai_bot_requests
      ),
      coverageText(
        coverage.ai_bots,
        `${label} · crawler layer`
      )
    );


    // ========================================================
    // GOOGLE SEARCH
    // ========================================================

    const google =
      kpi("Google Search");

    if (google) {
      const numbers =
        google.querySelectorAll(
          ".google-number"
        );

      const trends =
        google.querySelectorAll(
          ".google-trend"
        );

      const gscCoverage =
        coverage.google_search ||
        {};

      const hasPeriodData =
        gscCoverage
          .has_data_for_period === true;

      const latest =
        gscCoverage
          .latest_available;

      if (hasPeriodData) {
        if (numbers[0]) {
          numbers[0].textContent =
            num(
              kpis.google_impressions
            );
        }

        if (numbers[1]) {
          numbers[1].textContent =
            num(
              kpis.google_clicks
            );
        }

        if (trends[0]) {
          trends[0].textContent =
            `CTR ${percentDecimal(
              kpis.google_ctr
            )}`;
        }

        if (trends[1]) {
          const avg =
            Number(
              kpis.google_avg_position
            );

          const googlePeriodLabel =
            range?.period === "today"
              ? "Today"
              : range?.period === "7d"
                ? "Week"
                : range?.period === "30d"
                  ? "Month"
                  : range?.period === "90d"
                    ? "90D"
                    : range?.period === "custom"
                      ? "Custom"
                      : label;

          trends[1].textContent =
            Number.isFinite(avg)
              ? `Avg pos. ${avg.toFixed(
                  1
                )} · ${googlePeriodLabel}`
              : `Avg pos. — · ${googlePeriodLabel}`;
        }

      } else {
        if (numbers[0]) {
          numbers[0].textContent =
            "—";
        }

        if (numbers[1]) {
          numbers[1].textContent =
            "—";
        }

        if (trends[0]) {
          trends[0].textContent =
            latest
              ? `Latest ${shortDate(
                  latest
                )}`
              : "No finalized GSC data";
        }

        if (trends[1]) {
          trends[1].textContent =
            "GSC finalized data";
        }
      }
    }


    // ========================================================
    // AI ASSISTANT
    // ========================================================

    const assistant =
      kpi("AI Assistant");

    if (assistant) {
      const main =
        assistant.querySelector(
          ".assistant-kpi-main b"
        );

      const mainLabel =
        assistant.querySelector(
          ".assistant-kpi-main span"
        );

      const stats =
        assistant.querySelectorAll(
          ".assistant-kpi-stats b"
        );

      const conversationTracking =
        data?.assistant
          ?.instrumentation
          ?.conversation_tracking === true;

      if (main) {
        main.textContent =
          conversationTracking
            ? num(
                kpis
                  .assistant_conversations
              )
            : "—";
      }

      if (mainLabel) {
        mainLabel.textContent =
          conversationTracking
            ? "Conversations"
            : "Conversations · pending";
      }

      if (stats[0]) {
        stats[0].textContent =
          num(
            kpis.assistant_messages
          );
      }

      if (stats[1]) {
        stats[1].textContent =
          num(
            kpis.assistant_voice
          );
      }
    }


    // ========================================================
    // INDEX / LIFECYCLE
    // ========================================================

    const lifecycleCard =
      kpi(
        "Index / Lifecycle Coverage"
      );

    if (lifecycleCard) {
      const rows =
        lifecycleCard.querySelectorAll(
          ".lifecycle-values > div"
        );

      const registered =
        Number(
          lifecycleContract
            ?.registered
            ?.value || 0
        );

      const sitemap =
        Number(
          lifecycleContract
            ?.sitemap
            ?.value || 0
        );

      const indexed =
        Number(
          lifecycleContract
            ?.indexed
            ?.value || 0
        );

      const searchVisible =
        Number(
          lifecycleContract
            ?.search_visible
            ?.value || 0
        );

      const values = [
        {
          value: registered,
          label: "Registered",
          approximate: false
        },
        {
          value: sitemap,
          label: "Sitemap",
          approximate: false
        },
        {
          value: indexed,
          label: "Indexed",
          approximate:
            lifecycleContract
              ?.indexed
              ?.approximate === true
        },
        {
          value: searchVisible,
          label: "Search-visible",
          approximate: false
        }
      ];

      values.forEach(
        (
          item,
          index
        ) => {
          const row =
            rows[index];

          if (!row) {
            return;
          }

          const b =
            row.querySelector("b");

          const span =
            row.querySelector("span");

          const bar =
            row.querySelector(
              ".mini-progress i"
            );

          if (b) {
            b.textContent =
              item.approximate
                ? `≈${num(
                    item.value
                  )}`
                : num(
                    item.value
                  );
          }

          if (span) {
            span.textContent =
              item.label;
          }

          if (bar) {
            const width =
              registered > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      (
                        item.value /
                        registered
                      ) * 100
                    )
                  )
                : 0;

            bar.style.width =
              `${width}%`;
          }
        }
      );
    }
  }

  // ==========================================================
  // TOP SOURCES
  // ==========================================================

  function renderSources(data) {
    const container =
      document.getElementById(
        "sourceRows"
      );

    if (!container) {
      return;
    }

    const rows =
      Array.isArray(data.top_sources)
        ? data.top_sources
        : [];

    if (!rows.length) {
      container.innerHTML =
        '<div style="padding:18px 4px;color:#7a8698;font-size:11px">No attributed sources in this period.</div>';

      return;
    }

    container.innerHTML =
      rows
        .slice(0, 10)
        .map((row, index) => {
          const [brandClass, glyph] =
            sourceBrand(row);

          const [channel, pill] =
            channelPresentation(row);

          return `
            <div
              class="source-row detail-row"
              data-live-row="1"
              data-name="${escapeHtml(
                row.source_name
              )}"
            >
              <span class="rank">${index + 1}.</span>

              <span class="brand-logo ${brandClass}">
                ${escapeHtml(glyph)}
              </span>

              <b>${escapeHtml(
                row.source_name
              )}</b>

              <span class="pill ${pill}">
                ${escapeHtml(channel)}
              </span>

              <b>${num(
                row.visitors
              )}</b>

              <span class="mini-trend">
                —
              </span>
            </div>
          `;
        })
        .join("");

    bindLiveRows(container);
  }


  // ==========================================================
  // TOP PAGES
  // ==========================================================

  function renderPages(data) {
    const panel =
      findPanel("Top Pages");

    const tbody =
      panel?.querySelector(
        "tbody"
      );

    if (!tbody) {
      return;
    }

    const rows =
      Array.isArray(data.top_pages)
        ? data.top_pages
        : [];

    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="6">No page activity in this period.</td></tr>';

      return;
    }

    tbody.innerHTML =
      rows
        .slice(0, 8)
        .map((row, index) => {
          const [
            label,
            colour
          ] =
            pageType(
              row.page_type_id
            );

          const path =
            String(
              row.url_path || ""
            );

          const href =
            `https://primadom.ai${path}`;

          return `
            <tr
              class="detail-row"
              data-live-row="1"
              data-name="${escapeHtml(path)}"
            >
              <td>${index + 1}</td>

              <td>
                <a
                  class="page-live-link"
                  href="${escapeHtml(href)}"
                  target="_blank"
                  rel="noopener"
                >${escapeHtml(path)}</a>
              </td>

              <td>
                <span class="type ${colour}">
                  ${escapeHtml(label)}
                </span>
              </td>

              <td>${num(
                row.visitors
              )}</td>

              <td>${num(
                row.leads
              )}</td>

              <td>—</td>
            </tr>
          `;
        })
        .join("");

    bindLiveRows(tbody);
  }


  // ==========================================================
  // LLM REFERRALS
  // ==========================================================

  function renderLlm(data) {
    const panel =
      findPanel("LLM Referrals");

    const tbody =
      panel?.querySelector(
        "tbody"
      );

    if (!tbody) {
      return;
    }

    const rows =
      Array.isArray(data.llm_referrals)
        ? data.llm_referrals
        : [];

    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="4">No LLM referrals in this period.</td></tr>';

      return;
    }

    tbody.innerHTML =
      rows
        .slice(0, 5)
        .map(row => {
          const [
            brandClass,
            glyph
          ] =
            sourceBrand(row);

          return `
            <tr
              class="detail-row"
              data-live-row="1"
              data-name="${escapeHtml(
                row.source_name
              )}"
            >
              <td>
                <span
                  class="brand-logo ${brandClass}"
                  style="display:inline-grid;vertical-align:middle;margin-right:6px"
                >${escapeHtml(glyph)}</span>

                ${escapeHtml(
                  row.source_name
                )}
              </td>

              <td>${num(
                row.visitors
              )}</td>

              <td>${num(
                row.leads
              )}</td>

              <td>—</td>
            </tr>
          `;
        })
        .join("");

    bindLiveRows(tbody);
  }


  // ==========================================================
  // CRAWLERS
  // ==========================================================

  function renderCrawlers(data) {
    const panel =
      findPanel(
        "Crawler Intelligence"
      );

    const tbody =
      panel?.querySelector(
        "tbody"
      );

    if (!tbody) {
      return;
    }

    const rows =
      Array.isArray(data.crawlers)
        ? data.crawlers
        : [];

    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="4">No crawler activity in this period.</td></tr>';

      return;
    }

    tbody.innerHTML =
      rows
        .slice(0, 5)
        .map(row => {
          const [
            brandClass,
            glyph
          ] =
            crawlerBrand(row);

          return `
            <tr
              class="detail-row"
              data-live-row="1"
              data-name="${escapeHtml(
                row.bot_name
              )}"
            >
              <td>
                <span
                  class="brand-logo ${brandClass}"
                  style="display:inline-grid;vertical-align:middle;margin-right:6px"
                >${escapeHtml(glyph)}</span>

                ${escapeHtml(
                  row.bot_name
                )}
              </td>

              <td>${num(
                row.requests
              )}</td>

              <td>${num(
                row.pages
              )}</td>

              <td>—</td>
            </tr>
          `;
        })
        .join("");

    bindLiveRows(tbody);
  }


  // ==========================================================
  // PAGES NEEDING ATTENTION
  // ==========================================================

  function renderAttention() {
    const panel =
      findPanel(
        "Pages Needing Attention"
      );

    if (!panel) {
      return;
    }

    panel
      .querySelectorAll(".issue")
      .forEach(issue => {

        const count =
          issue.querySelector(
            ".count"
          );

        const small =
          issue.querySelector(
            "small"
          );

        if (count) {
          count.textContent = "—";
        }

        if (small) {
          small.textContent =
            "Production rule aggregate pending";
        }
      });
  }


  // ==========================================================
  // LANGUAGES
  // ==========================================================

  function renderLanguages(data) {
    const panel =
      findPanel(
        "Language Performance"
      );

    if (!panel) {
      return;
    }

    const head =
      panel.querySelector(
        ".language-head"
      );

    if (!head) {
      return;
    }

    panel
      .querySelectorAll(
        ".language-row"
      )
      .forEach(row =>
        row.remove()
      );

    const rows =
      Array.isArray(data.languages)
        ? data.languages
        : [];

    const html =
      rows
        .slice(0, 5)
        .map(row => {
          const code =
            String(
              row.language_code ||
              ""
            ).toLowerCase();

          return `
            <div class="language-row">
              <div>
                <span class="lang-code">
                  ${escapeHtml(
                    code.toUpperCase()
                  )}
                </span>

                <b>${escapeHtml(
                  LANGUAGE_NAMES[code] ||
                  code.toUpperCase()
                )}</b>
              </div>

              <span>${num(
                row.visitors
              )}</span>

              <span>${num(
                row.leads
              )}</span>

              <span>—</span>
            </div>
          `;
        })
        .join("");

    head.insertAdjacentHTML(
      "afterend",
      html ||
      '<div class="language-row"><div><b>No language activity</b></div><span>—</span><span>—</span><span>—</span></div>'
    );
  }


  // ==========================================================
  // ASSISTANT PANEL
  // ==========================================================

  function renderAssistant(data) {
    const panel =
      findPanel(
        "AI Assistant Intelligence"
      );

    if (!panel) {
      return;
    }

    const assistant =
      data.assistant || {};

    const metrics =
      panel.querySelectorAll(
        ".assistant-mini b"
      );

    if (metrics[0]) {
      metrics[0].textContent =
        num(
          assistant.conversations
        );
    }

    if (metrics[1]) {
      metrics[1].textContent =
        num(
          assistant.messages
        );
    }

    if (metrics[2]) {
      metrics[2].textContent =
        num(
          assistant.voice
        );
    }

    /*
     * We do not yet have a trusted
     * assistant → lead linkage.
     */
    if (metrics[3]) {
      metrics[3].textContent =
        "—";
    }

    const topics =
      panel.querySelectorAll(
        ".assistant-topic"
      );

    topics.forEach(
      (topic, index) => {

        if (index === 0) {
          const span =
            topic.querySelector(
              "span"
            );

          const b =
            topic.querySelector(
              "b"
            );

          if (span) {
            span.textContent =
              "Topic classification collecting";
          }

          if (b) {
            b.textContent =
              "—";
          }

          topic.style.display = "";
        } else {
          topic.style.display =
            "none";
        }
      });
  }


  // ==========================================================
  // COUNTRIES
  // ==========================================================

  function renderCountries(data) {
    const panel =
      findPanel(
        "Top Countries"
      );

    if (!panel) {
      return;
    }

    const list =
      panel.querySelector(
        ".country-list"
      );

    const map =
      panel.querySelector(
        ".map"
      );

    if (!list) {
      return;
    }

    const rows =
      Array.isArray(data.countries)
        ? data.countries
        : [];

    if (!rows.length) {
      list.innerHTML = `
        <div class="country-line">
          <span>
            <span class="flag">◎</span>
            Country dimension collecting
          </span>
          <b>—</b>
          <span>—</span>
        </div>
      `;

      if (map) {
        map.style.opacity =
          "0.18";
      }

      return;
    }

    if (map) {
      map.style.opacity = "";
    }

    const total =
      rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.visitors || 0
          ),
        0
      );

    list.innerHTML =
      rows
        .slice(0, 5)
        .map(row => {
          const code =
            row.country_code;

          const visitors =
            Number(
              row.visitors || 0
            );

          const share =
            total > 0
              ? (
                  visitors /
                  total
                ) * 100
              : 0;

          return `
            <div class="country-line">
              <span>
                <span class="flag">
                  ${countryFlag(code)}
                </span>
                ${escapeHtml(
                  countryName(code)
                )}
              </span>

              <b>${share.toFixed(
                1
              )}%</b>

              <span>${num(
                visitors
              )}</span>
            </div>
          `;
        })
        .join("");
  }


  // ==========================================================
  // QUICK INSIGHTS
  // ==========================================================

  function renderInsights(
    data,
    range
  ) {
    const panel =
      findPanel(
        "Quick Insights"
      );

    const list =
      panel?.querySelector(
        ".insight-list"
      );

    if (!list) {
      return;
    }

    const k =
      data.kpis || {};

    const lifecycle =
      data.lifecycle || {};

    const edge =
      data.cloudflare_edge || {};

    const label =
      periodLabel(range);

    const sourceCount =
      Array.isArray(
        data.top_sources
      )
        ? data.top_sources.length
        : 0;

    let edgeText;

    if (
      Number.isFinite(
        Number(
          k.edge_unique_visitors
        )
      )
    ) {
      edgeText =
        `Cloudflare recorded <b>${num(
          k.edge_unique_visitors
        )}</b> edge unique visitors in the selected period.`;
    } else {
      edgeText =
        "Cloudflare edge unique visitors are syncing; crawler intelligence remains live.";
    }

    list.innerHTML = `
      <div class="insight">
        <span class="insight-icon g">↗</span>
        <span>
          <b>${num(
            k.human_visitors
          )}</b> first-party visitor observations and
          <b>${num(
            k.sessions
          )}</b> sessions were recorded in ${escapeHtml(label)}.
        </span>
      </div>

      <div class="insight">
        <span class="insight-icon b">☆</span>
        <span>
          <b>${num(
            k.leads
          )}</b> confirmed leads are present across
          <b>${num(
            sourceCount
          )}</b> active attribution sources.
        </span>
      </div>

      <div class="insight">
        <span class="insight-icon b">AI</span>
        <span>
          <b>${num(
            k.ai_bot_requests
          )}</b> crawler / bot requests were recorded across
          <b>${num(
            k.ai_operators
          )}</b> operators.
        </span>
      </div>

      <div class="insight">
        <span class="insight-icon r">G</span>
        <span>
          Google Search recorded
          <b>${num(
            k.google_impressions
          )}</b> impressions and
          <b>${num(
            k.google_clicks
          )}</b> clicks
          (CTR ${percentDecimal(
            k.google_ctr
          )}).
        </span>
      </div>

      <div class="insight">
        <span class="insight-icon o">✦</span>
        <span>
          ${edgeText}
          Lifecycle currently shows
          <b>${num(
            lifecycle.ai_crawled_pages
          )}</b> AI-crawled pages.
        </span>
      </div>
    `;
  }


  // ==========================================================
  // CHART
  // ==========================================================

  function aggregateTraffic(
    rows,
    granularity
  ) {
    if (
      granularity === "Daily" ||
      rows.length <= 1
    ) {
      return rows;
    }

    if (granularity === "Monthly") {
      const groups =
        new Map();

      rows.forEach(row => {
        const key =
          String(
            row.data_date
          ).slice(0, 7);

        if (!groups.has(key)) {
          groups.set(key, {
            data_date:
              `${key}-01`,
            visitors: 0,
            sessions: 0,
            pageviews: 0,
            leads: 0,
            ai_requests: 0,
            edge_requests: 0,
            search_clicks: 0,
            search_impressions: 0
          });
        }

        const target =
          groups.get(key);

        Object.keys(target)
          .forEach(field => {
            if (
              field !== "data_date"
            ) {
              target[field] +=
                Number(
                  row[field] || 0
                );
            }
          });
      });

      return [...groups.values()];
    }


    // Weekly = sequential seven-day groups
    const groups = [];

    for (
      let i = 0;
      i < rows.length;
      i += 7
    ) {
      const chunk =
        rows.slice(i, i + 7);

      const target = {
        data_date:
          chunk[0]?.data_date,
        visitors: 0,
        sessions: 0,
        pageviews: 0,
        leads: 0,
        ai_requests: 0,
        edge_requests: 0,
        search_clicks: 0,
        search_impressions: 0
      };

      chunk.forEach(row => {
        Object.keys(target)
          .forEach(field => {
            if (
              field !== "data_date"
            ) {
              target[field] +=
                Number(
                  row[field] || 0
                );
            }
          });
      });

      groups.push(target);
    }

    return groups;
  }


  function chartPath(
    values,
    maxValue,
    top,
    bottom
  ) {
    if (!values.length) {
      return "";
    }

    const left = 38;
    const right = 958;

    const width =
      right - left;

    const height =
      bottom - top;

    const safeMax =
      Math.max(
        1,
        Number(maxValue || 0)
      );

    const points =
      values.map(
        (value, index) => {

          const x =
            values.length === 1
              ? (
                  left +
                  right
                ) / 2
              : left +
                (
                  index /
                  (
                    values.length -
                    1
                  )
                ) *
                width;

          const y =
            bottom -
            (
              Number(value || 0) /
              safeMax
            ) *
            height;

          return [
            x.toFixed(1),
            y.toFixed(1)
          ];
        }
      );

    if (points.length === 1) {
      return (
        `M${points[0][0]} ${points[0][1]} ` +
        `L${(
          Number(points[0][0]) +
          1
        ).toFixed(1)} ${points[0][1]}`
      );
    }

    return points
      .map(
        (point, index) =>
          `${
            index === 0
              ? "M"
              : "L"
          }${point[0]} ${point[1]}`
      )
      .join(" ");
  }


  function dateLabel(value) {
    if (!value) {
      return "";
    }

    const d =
      new Date(
        `${value}T00:00:00Z`
      );

    if (
      Number.isNaN(
        d.getTime()
      )
    ) {
      return value;
    }

    return d.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      }
    );
  }


  function renderChart(
    data,
    range = null
  ) {
    const panel =
      findPanel(
        "Traffic & Visibility Overview"
      );

    const svg =
      panel?.querySelector(
        ".chart-wrap svg"
      );

    const dates =
      panel?.querySelector(
        ".chart-dates"
      );

    if (!svg || !dates) {
      return;
    }

    const raw =
      Array.isArray(
        data.traffic_daily
      )
        ? data.traffic_daily
        : [];

    const requestedDays =
      Number(
        range?.days ||
        raw.length ||
        1
      );

    const effectiveGranularity =
      requestedDays > 45
        ? "Weekly"
        : "Daily";

    const rows =
      aggregateTraffic(
        raw,
        effectiveGranularity
      );

    if (!rows.length) {
      svg.innerHTML = "";
      dates.innerHTML =
        "<span>No data</span>";
      return;
    }


    const visitors =
      rows.map(row =>
        Number(
          row.visitors || 0
        )
      );

    const ai =
      rows.map(row =>
        Number(
          row.ai_requests || 0
        )
      );

    const leads =
      rows.map(row =>
        Number(
          row.leads || 0
        )
      );


    const maxVisitors =
      Math.max(
        1,
        ...visitors,
        ...leads
      );

    const maxAi =
      Math.max(
        1,
        ...ai
      );


    const left =
      55;

    const right =
      945;

    const top =
      25;

    const bottom =
      265;

    const width =
      right - left;

    const height =
      bottom - top;


    function niceMax(value) {
      const n =
        Math.max(
          1,
          Number(value || 0)
        );

      const magnitude =
        Math.pow(
          10,
          Math.floor(
            Math.log10(n)
          )
        );

      return (
        Math.ceil(
          n /
          magnitude
        ) *
        magnitude
      );
    }


    function axisNumber(value) {
      const n =
        Number(value || 0);

      if (
        Math.abs(n) >= 1000000
      ) {
        return (
          n / 1000000
        ).toFixed(
          n % 1000000 === 0
            ? 0
            : 1
        ) + "M";
      }

      if (
        Math.abs(n) >= 1000
      ) {
        return (
          n / 1000
        ).toFixed(
          n % 1000 === 0
            ? 0
            : 1
        ) + "K";
      }

      return Math.round(
        n
      ).toString();
    }


    const leftMax =
      niceMax(
        maxVisitors
      );

    const rightMax =
      niceMax(
        maxAi
      );


    const count =
      rows.length;

    const slot =
      count > 0
        ? width /
          count
        : width;

    const barWidth =
      Math.max(
        7,
        Math.min(
          34,
          slot * 0.55
        )
      );


    const bars =
      ai.map(
        (
          value,
          index
        ) => {

          const x =
            left +
            index *
              slot +
            (
              slot -
              barWidth
            ) / 2;

          const barHeight =
            (
              value /
              rightMax
            ) *
            height;

          const y =
            bottom -
            barHeight;

          return `
            <rect
              x="${x.toFixed(1)}"
              y="${y.toFixed(1)}"
              width="${barWidth.toFixed(1)}"
              height="${Math.max(
                0,
                barHeight
              ).toFixed(1)}"
              rx="2"
              fill="#d59631"
              opacity=".18"
            />
          `;
        }
      )
      .join("");


    function linePath(
      values
    ) {
      if (!values.length) {
        return "";
      }

      const points =
        values.map(
          (
            value,
            index
          ) => {

            const x =
              count === 1
                ? (
                    left +
                    right
                  ) / 2
                : left +
                  (
                    index /
                    (
                      count -
                      1
                    )
                  ) *
                  width;

            const y =
              bottom -
              (
                Number(
                  value || 0
                ) /
                leftMax
              ) *
              height;

            return [
              x.toFixed(1),
              y.toFixed(1)
            ];
          }
        );

      if (
        points.length === 1
      ) {
        return (
          `M${points[0][0]} ${points[0][1]} ` +
          `L${(
            Number(
              points[0][0]
            ) + 1
          ).toFixed(1)} ${points[0][1]}`
        );
      }

      return points
        .map(
          (
            point,
            index
          ) =>
            `${
              index === 0
                ? "M"
                : "L"
            }${point[0]} ${point[1]}`
        )
        .join(" ");
    }


    const humanPath =
      linePath(
        visitors
      );

    const leadPath =
      linePath(
        leads
      );


    const ticks =
      4;

    let grid = "";

    for (
      let i = 0;
      i <= ticks;
      i++
    ) {
      const ratio =
        i / ticks;

      const y =
        bottom -
        ratio *
        height;

      const leftValue =
        leftMax *
        ratio;

      const rightValue =
        rightMax *
        ratio;

      grid += `
        <line
          x1="${left}"
          y1="${y.toFixed(1)}"
          x2="${right}"
          y2="${y.toFixed(1)}"
          stroke="#edf1f5"
          stroke-width="1"
        />

        <text
          x="${left - 9}"
          y="${(
            y + 3
          ).toFixed(1)}"
          text-anchor="end"
          font-size="9"
          fill="#7a8698"
        >${axisNumber(
          leftValue
        )}</text>

        <text
          x="${right + 9}"
          y="${(
            y + 3
          ).toFixed(1)}"
          text-anchor="start"
          font-size="9"
          fill="#7a8698"
        >${axisNumber(
          rightValue
        )}</text>
      `;
    }


    svg.innerHTML = `
      ${grid}

      <g>
        ${bars}
      </g>

      <path
        d="${humanPath}"
        fill="none"
        stroke="#2d6cdf"
        stroke-width="3.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <path
        d="${leadPath}"
        fill="none"
        stroke="#14a36a"
        stroke-width="3.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    `;


    const labelIndexes =
      rows.length <= 10
        ? rows.map(
            (
              _,
              index
            ) => index
          )
        : [
            0,

            Math.floor(
              (
                rows.length -
                1
              ) * 0.25
            ),

            Math.floor(
              (
                rows.length -
                1
              ) * 0.5
            ),

            Math.floor(
              (
                rows.length -
                1
              ) * 0.75
            ),

            rows.length -
              1
          ]
          .filter(
            (
              value,
              index,
              array
            ) =>
              array.indexOf(
                value
              ) === index
          );


    dates.innerHTML =
      labelIndexes
        .map(
          index =>
            `<span>${escapeHtml(
              dateLabel(
                rows[index]
                  ?.data_date
              )
            )}</span>`
        )
        .join("");
  }

  // ==========================================================
  // INITIAL / ERROR STATES
  // ==========================================================

  function initialLoadingState() {
    setKpi(
      "Page Network",
      "—",
      "Loading live data…"
    );

    setKpi(
      "Human Visitors",
      "—",
      "Loading live data…"
    );

    setKpi(
      "Leads",
      "—",
      "Loading live data…"
    );

    setKpi(
      "Edge Unique Visitors",
      "—",
      "Loading Cloudflare…"
    );

    setKpi(
      "AI & Bot Requests",
      "—",
      "Loading live data…"
    );

    renderAttention();
  }


  function errorState(error) {
    console.error(
      "[Primadom Intelligence]",
      error
    );

    if (!lastPayload) {
      setKpi(
        "Page Network",
        "—",
        "Data unavailable"
      );

      setKpi(
        "Human Visitors",
        "—",
        "Data unavailable"
      );

      setKpi(
        "Leads",
        "—",
        "Data unavailable"
      );

      setKpi(
        "Edge Unique Visitors",
        "—",
        "Cloudflare data unavailable"
      );

      setKpi(
        "AI & Bot Requests",
        "—",
        "Data unavailable"
      );
    }

    if (
      typeof window.showToast ===
      "function"
    ) {
      window.showToast(
        "Live data temporarily unavailable"
      );
    }
  }


  // ==========================================================
  // MASTER RENDER
  // ==========================================================

  function renderDashboard(
    data,
    range
  ) {
    renderKpis(
      data,
      range
    );

    renderSources(data);
    renderPages(data);
    renderLlm(data);
    renderCrawlers(data);
    renderAttention();
    renderLanguages(data);
    renderAssistant(data);
    renderCountries(data);
    renderInsights(
      data,
      range
    );
    renderChart(
      data,
      range
    );

    document.documentElement
      .dataset
      .intelligenceStatus =
        "live";
  }


  // ==========================================================
  // FETCH
  // ==========================================================

  async function loadDashboard(
    period = "7d",
    customFrom = null,
    customTo = null
  ) {
    const thisRequest =
      ++requestId;

    try {
      const params =
        new URLSearchParams();

      params.set(
        "period",
        period
      );

      if (
        period === "custom"
      ) {
        if (
          !customFrom ||
          !customTo
        ) {
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
              Accept:
                "application/json"
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

      lastPayload =
        payload.data;

      lastRange =
        payload.range;

      renderDashboard(
        lastPayload,
        lastRange
      );

      if (
        typeof window.showToast ===
        "function"
      ) {
        window.showToast(
          `Live data · ${periodLabel(
            lastRange
          )}`
        );
      }

    } catch (error) {
      if (
        thisRequest ===
        requestId
      ) {
        errorState(error);
      }
    }
  }


  // ==========================================================
  // PERIOD CONTROL
  // ==========================================================

  // ==========================================================
  // GLOBAL PERIOD CONTROL
  // Today / 7D / 30D / 90D / Custom
  // One selected period drives the WHOLE dashboard.
  // ==========================================================

  const periodButtons =
    [
      ...document.querySelectorAll(
        ".period button"
      )
    ];

  const customButton =
    periodButtons.find(
      button =>
        button.dataset.period ===
        "Custom"
    );

  let lastPresetPeriod =
    document.querySelector(
      '.period button.active:not([data-period="Custom"])'
    )?.dataset.period ||
    "7D";


  function activatePeriodButton(
    target
  ) {
    periodButtons.forEach(
      button =>
        button.classList.toggle(
          "active",
          button === target
        )
    );
  }


  function utcTodayString() {
    return new Date()
      .toISOString()
      .slice(
        0,
        10
      );
  }


  function shiftIsoDate(
    iso,
    deltaDays
  ) {
    const date =
      new Date(
        `${iso}T00:00:00Z`
      );

    date.setUTCDate(
      date.getUTCDate() +
      deltaDays
    );

    return date
      .toISOString()
      .slice(
        0,
        10
      );
  }


  function formatCustomButtonLabel(
    from,
    to
  ) {
    function shortDate(
      iso
    ) {
      const d =
        new Date(
          `${iso}T00:00:00Z`
        );

      return d.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        }
      );
    }

    return (
      shortDate(from) +
      "–" +
      shortDate(to)
    );
  }


  // ----------------------------------------------------------
  // Build Custom Range modal.
  // ----------------------------------------------------------

  const customRangeStyle =
    document.createElement(
      "style"
    );

  customRangeStyle.textContent = `
    .pi-custom-range {
      position: fixed;
      inset: 0;
      z-index: 10050;
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 110px;
      background: rgba(15,31,56,.18);
      backdrop-filter: blur(3px);
    }

    .pi-custom-range.open {
      display: flex;
    }

    .pi-custom-range__card {
      width: min(440px, calc(100vw - 32px));
      background: #fff;
      border: 1px solid #e3e8ef;
      border-radius: 16px;
      box-shadow: 0 24px 70px rgba(15,31,56,.18);
      padding: 20px;
      color: #13203a;
    }

    .pi-custom-range__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
    }

    .pi-custom-range__top h3 {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
    }

    .pi-custom-range__close {
      border: 0;
      background: transparent;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      color: #7b8798;
    }

    .pi-custom-range__dates {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 10px;
      align-items: end;
    }

    .pi-custom-range__field label {
      display: block;
      margin-bottom: 6px;
      color: #778398;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .pi-custom-range__field input {
      box-sizing: border-box;
      width: 100%;
      height: 42px;
      border: 1px solid #dce3ec;
      border-radius: 10px;
      background: #fff;
      color: #13203a;
      padding: 0 10px;
      font: inherit;
      outline: none;
    }

    .pi-custom-range__arrow {
      padding-bottom: 11px;
      color: #8895a7;
    }

    .pi-custom-range__error {
      min-height: 18px;
      margin-top: 9px;
      color: #d94d4d;
      font-size: 11px;
    }

    .pi-custom-range__actions {
      display: flex;
      justify-content: flex-end;
      gap: 9px;
      margin-top: 12px;
    }

    .pi-custom-range__actions button {
      height: 38px;
      border-radius: 9px;
      padding: 0 16px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
    }

    .pi-custom-range__cancel {
      border: 1px solid #dce3ec;
      background: #fff;
      color: #526078;
    }

    .pi-custom-range__apply {
      border: 1px solid #0f1f38;
      background: #0f1f38;
      color: #fff;
    }

    @media (max-width: 620px) {
      .pi-custom-range {
        padding-top: 70px;
      }

      .pi-custom-range__dates {
        grid-template-columns: 1fr;
      }

      .pi-custom-range__arrow {
        display: none;
      }
    }
  `;

  document.head.appendChild(
    customRangeStyle
  );


  const customRange =
    document.createElement(
      "div"
    );

  customRange.className =
    "pi-custom-range";

  customRange.innerHTML = `
    <div
      class="pi-custom-range__card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="piCustomRangeTitle"
    >
      <div class="pi-custom-range__top">
        <h3 id="piCustomRangeTitle">
          Custom date range
        </h3>

        <button
          class="pi-custom-range__close"
          type="button"
          aria-label="Close"
        >×</button>
      </div>

      <div class="pi-custom-range__dates">

        <div class="pi-custom-range__field">
          <label for="piCustomFrom">
            From
          </label>

          <input
            id="piCustomFrom"
            type="date"
          >
        </div>

        <div class="pi-custom-range__arrow">
          →
        </div>

        <div class="pi-custom-range__field">
          <label for="piCustomTo">
            To
          </label>

          <input
            id="piCustomTo"
            type="date"
          >
        </div>

      </div>

      <div
        class="pi-custom-range__error"
        aria-live="polite"
      ></div>

      <div class="pi-custom-range__actions">

        <button
          class="pi-custom-range__cancel"
          type="button"
        >
          Cancel
        </button>

        <button
          class="pi-custom-range__apply"
          type="button"
        >
          Apply
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(
    customRange
  );


  const customFrom =
    customRange.querySelector(
      "#piCustomFrom"
    );

  const customTo =
    customRange.querySelector(
      "#piCustomTo"
    );

  const customError =
    customRange.querySelector(
      ".pi-custom-range__error"
    );


  function closeCustomRange(
    restorePreset = false
  ) {
    customRange.classList.remove(
      "open"
    );

    if (
      restorePreset &&
      customButton?.classList.contains(
        "active"
      )
    ) {
      const previous =
        periodButtons.find(
          button =>
            button.dataset.period ===
            lastPresetPeriod
        );

      if (previous) {
        activatePeriodButton(
          previous
        );
      }
    }
  }


  function openCustomRange() {
    const today =
      utcTodayString();

    customFrom.max =
      today;

    customTo.max =
      today;

    if (!customTo.value) {
      customTo.value =
        today;
    }

    if (!customFrom.value) {
      customFrom.value =
        shiftIsoDate(
          customTo.value,
          -6
        );
    }

    customError.textContent =
      "";

    customRange.classList.add(
      "open"
    );

    setTimeout(
      () =>
        customFrom.focus(),
      0
    );
  }


  customRange
    .querySelector(
      ".pi-custom-range__close"
    )
    .addEventListener(
      "click",
      () =>
        closeCustomRange(
          true
        )
    );


  customRange
    .querySelector(
      ".pi-custom-range__cancel"
    )
    .addEventListener(
      "click",
      () =>
        closeCustomRange(
          true
        )
    );


  customRange.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        customRange
      ) {
        closeCustomRange(
          true
        );
      }
    }
  );


  customRange
    .querySelector(
      ".pi-custom-range__apply"
    )
    .addEventListener(
      "click",
      () => {

        const from =
          customFrom.value;

        const to =
          customTo.value;

        if (
          !from ||
          !to
        ) {
          customError.textContent =
            "Choose both dates.";
          return;
        }

        const fromMs =
          Date.parse(
            `${from}T00:00:00Z`
          );

        const toMs =
          Date.parse(
            `${to}T00:00:00Z`
          );

        const todayMs =
          Date.parse(
            `${utcTodayString()}T00:00:00Z`
          );

        if (
          !Number.isFinite(fromMs) ||
          !Number.isFinite(toMs)
        ) {
          customError.textContent =
            "Invalid date range.";
          return;
        }

        if (
          toMs <
          fromMs
        ) {
          customError.textContent =
            "To date cannot be before From date.";
          return;
        }

        if (
          toMs >
          todayMs
        ) {
          customError.textContent =
            "Future dates are not available.";
          return;
        }

        const days =
          Math.floor(
            (
              toMs -
              fromMs
            ) /
            86400000
          ) +
          1;

        if (
          days >
          120
        ) {
          customError.textContent =
            "Maximum custom range is 120 days.";
          return;
        }

        customError.textContent =
          "";

        activatePeriodButton(
          customButton
        );

        if (customButton) {
          customButton.textContent =
            formatCustomButtonLabel(
              from,
              to
            );
        }

        closeCustomRange(
          false
        );

        loadDashboard(
          "custom",
          from,
          to
        );
      }
    );


  // ----------------------------------------------------------
  // Preset period buttons.
  // ----------------------------------------------------------

  periodButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const rawPeriod =
            button.dataset.period;

          if (
            rawPeriod ===
            "Custom"
          ) {
            openCustomRange();
            return;
          }

          lastPresetPeriod =
            rawPeriod;

          if (customButton) {
            customButton.textContent =
              "Custom ◫";
          }

          loadDashboard(
            periodKey(
              rawPeriod
            )
          );
        }
      );
    }
  );


  // ==========================================================
  // DYNAMIC LIVE LINKS
  // ==========================================================

  dashboard.addEventListener(
    "click",
    event => {
      const link =
        event.target.closest(
          ".page-live-link"
        );

      if (link) {
        event.stopPropagation();
      }
    }
  );


  // ==========================================================
  // START
  // ==========================================================

  // ==========================================================
  // PERSIST GLOBAL DASHBOARD PERIOD
  // ==========================================================

  const PERIOD_STORAGE_KEY =
    "primadom_intelligence_period_v1";


  document
    .querySelectorAll(
      ".period button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const value =
            button.dataset.period;

          if (
            [
              "Today",
              "7D",
              "30D",
              "90D"
            ].includes(value)
          ) {
            try {
              localStorage.setItem(
                PERIOD_STORAGE_KEY,
                value
              );
            } catch (_) {}
          }
        }
      );
    });


  initialLoadingState();


  let activePeriod =
    "7D";


  try {
    const storedPeriod =
      localStorage.getItem(
        PERIOD_STORAGE_KEY
      );

    if (
      [
        "Today",
        "7D",
        "30D",
        "90D"
      ].includes(storedPeriod)
    ) {
      activePeriod =
        storedPeriod;
    }
  } catch (_) {}


  document
    .querySelectorAll(
      ".period button"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.period ===
          activePeriod
      );
    });


  loadDashboard(
    periodKey(
      activePeriod
    )
  );

})();
