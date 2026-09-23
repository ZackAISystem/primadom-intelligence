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

    const label =
      periodLabel(range);

    setKpi(
      "Page Network",
      num(kpis.registered_pages),
      "Registered · all languages"
    );

    setKpi(
      "Human Visitors",
      num(kpis.human_visitors),
      `${escapeHtml(label)} · first-party`
    );

    const visitors =
      Number(kpis.human_visitors || 0);

    const leads =
      Number(kpis.leads || 0);

    const conversion =
      visitors > 0
        ? (leads / visitors) * 100
        : 0;

    setKpi(
      "Leads",
      num(leads),
      `${percentValue(conversion)} visitor → lead`
    );

    if (edge.available) {
      setKpi(
        "Total Edge Requests",
        num(edge.requests),
        `Cloudflare Edge · ${num(edge.available_days)} day coverage`
      );
    } else {
      setKpi(
        "Total Edge Requests",
        "—",
        "Cloudflare Edge syncing"
      );
    }

    setKpi(
      "AI & Bot Requests",
      num(kpis.ai_bot_requests),
      `${escapeHtml(label)} · crawler layer`
    );


    // Google Search special KPI

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

      if (numbers[0]) {
        numbers[0].textContent =
          num(kpis.google_impressions);
      }

      if (numbers[1]) {
        numbers[1].textContent =
          num(kpis.google_clicks);
      }

      if (trends[0]) {
        trends[0].textContent =
          `CTR ${percentDecimal(
            kpis.google_ctr
          )}`;
      }

      if (trends[1]) {
        trends[1].textContent =
          Number.isFinite(
            Number(
              kpis.google_avg_position
            )
          )
            ? `Avg pos. ${Number(
                kpis.google_avg_position
              ).toFixed(1)}`
            : "Avg pos. —";
      }
    }


    // AI Assistant special KPI

    const assistant =
      kpi("AI Assistant");

    if (assistant) {
      const main =
        assistant.querySelector(
          ".assistant-kpi-main b"
        );

      const stats =
        assistant.querySelectorAll(
          ".assistant-kpi-stats b"
        );

      if (main) {
        main.textContent =
          num(
            kpis.assistant_conversations
          );
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


    // Lifecycle special KPI

    const lifecycle =
      data.lifecycle || {};

    const lifecycleCard =
      kpi("Index / Lifecycle Coverage");

    if (lifecycleCard) {
      const rows =
        lifecycleCard.querySelectorAll(
          ".lifecycle-values > div"
        );

      const registered =
        Number(
          lifecycle.registered_pages ??
          kpis.registered_pages ??
          0
        );

      const sitemap =
        Number(
          lifecycle.sitemap_pages ??
          kpis.sitemap_pages ??
          0
        );

      const crawled =
        Number(
          lifecycle.ai_crawled_pages ??
          0
        );

      const visible =
        Number(
          lifecycle.google_signal_pages ??
          lifecycle.impression_pages ??
          0
        );

      const values = [
        registered,
        sitemap,
        crawled,
        visible
      ];

      values.forEach(
        (value, index) => {
          const row =
            rows[index];

          if (!row) {
            return;
          }

          const b =
            row.querySelector("b");

          const bar =
            row.querySelector(
              ".mini-progress i"
            );

          if (b) {
            b.textContent =
              num(value);
          }

          if (bar) {
            const width =
              registered > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      (
                        value /
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

    if (edge.available) {
      edgeText =
        `Cloudflare recorded <b>${num(
          edge.requests
        )}</b> edge requests in the selected period.`;
    } else {
      edgeText =
        "Cloudflare full-edge totals are syncing; crawler intelligence remains live.";
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
    granularity =
      document.getElementById(
        "granularity"
      )?.value ||
      "Daily"
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

    const rows =
      aggregateTraffic(
        raw,
        granularity
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

    const pageviews =
      rows.map(row =>
        Number(
          row.pageviews || 0
        )
      );


    /*
     * Daily LLM-referral series is not yet
     * part of overview_v1_fast.
     */
    const hasLlmDaily =
      rows.some(row =>
        Object.prototype.hasOwnProperty.call(
          row,
          "llm_referrals"
        )
      );

    const llm =
      rows.map(row =>
        Number(
          row.llm_referrals || 0
        )
      );


    const maxLeft =
      Math.max(
        1,
        ...visitors,
        ...ai,
        ...(hasLlmDaily
          ? llm
          : [])
      );

    const maxLeads =
      Math.max(
        1,
        ...leads
      );

    const maxBars =
      Math.max(
        1,
        ...pageviews
      );


    const left = 38;
    const right = 958;
    const chartBottom = 272;
    const chartTop = 30;

    const usable =
      right - left;

    const count =
      rows.length;

    const step =
      count > 1
        ? usable / count
        : 50;

    const barWidth =
      Math.max(
        5,
        Math.min(
          22,
          step * 0.55
        )
      );

    const bars =
      pageviews
        .map(
          (value, index) => {

            const x =
              count === 1
                ? 500 -
                  barWidth / 2
                : left +
                  index *
                  (
                    usable /
                    count
                  ) +
                  (
                    usable /
                    count -
                    barWidth
                  ) / 2;

            const height =
              (
                value /
                maxBars
              ) *
              205;

            const y =
              chartBottom -
              height;

            return `
              <rect
                x="${x.toFixed(1)}"
                y="${y.toFixed(1)}"
                width="${barWidth.toFixed(1)}"
                height="${height.toFixed(1)}"
              />
            `;
          }
        )
        .join("");


    const humanPath =
      chartPath(
        visitors,
        maxLeft,
        chartTop,
        chartBottom
      );

    const aiPath =
      chartPath(
        ai,
        maxLeft,
        chartTop,
        chartBottom
      );

    const leadPath =
      chartPath(
        leads,
        maxLeads,
        chartTop,
        chartBottom
      );

    const llmPath =
      hasLlmDaily
        ? chartPath(
            llm,
            maxLeft,
            chartTop,
            chartBottom
          )
        : "";


    svg.innerHTML = `
      <defs>
        <linearGradient
          id="bargrad"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0"
            stop-color="#c0dbff"
            stop-opacity=".92"
          />
          <stop
            offset="1"
            stop-color="#edf5ff"
            stop-opacity=".36"
          />
        </linearGradient>
      </defs>

      <g fill="url(#bargrad)">
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

      ${
        hasLlmDaily
          ? `
            <path
              d="${llmPath}"
              fill="none"
              stroke="#7b5be7"
              stroke-width="3.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          `
          : ""
      }

      <path
        d="${aiPath}"
        fill="none"
        stroke="#d59631"
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
      [
        0,
        Math.floor(
          (rows.length - 1) * 0.25
        ),
        Math.floor(
          (rows.length - 1) * 0.5
        ),
        Math.floor(
          (rows.length - 1) * 0.75
        ),
        rows.length - 1
      ]
      .filter(
        (value, index, array) =>
          array.indexOf(value) ===
          index
      );

    dates.innerHTML =
      labelIndexes
        .map(index =>
          `<span>${escapeHtml(
            dateLabel(
              rows[index]
                ?.data_date
            )
          )}</span>`
        )
        .join("");


    const legendItems =
      panel.querySelectorAll(
        ".legend span"
      );

    if (legendItems[1]) {
      legendItems[1].innerHTML =
        '<i class="dot" style="background:#7b5be7"></i>' +
        (
          hasLlmDaily
            ? "LLM Referrals"
            : "LLM Referrals · summary"
        );

      legendItems[1].style.opacity =
        hasLlmDaily
          ? ""
          : ".55";
    }
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
      "Total Edge Requests",
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
        "Total Edge Requests",
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
    renderChart(data);

    document.documentElement
      .dataset
      .intelligenceStatus =
        "live";
  }


  // ==========================================================
  // FETCH
  // ==========================================================

  async function loadDashboard(
    period = "7d"
  ) {
    const thisRequest =
      ++requestId;

    try {
      const response =
        await fetch(
          `${API}?period=${encodeURIComponent(
            period
          )}`,
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

  document
    .querySelectorAll(
      ".period button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          loadDashboard(
            periodKey(
              button.dataset.period
            )
          );
        }
      );
    });


  // ==========================================================
  // GRANULARITY CONTROL
  // ==========================================================

  const granularity =
    document.getElementById(
      "granularity"
    );

  if (granularity) {
    granularity.addEventListener(
      "change",
      () => {
        if (lastPayload) {
          renderChart(
            lastPayload,
            granularity.value
          );
        }
      }
    );
  }


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

  initialLoadingState();

  const activePeriod =
    document.querySelector(
      ".period button.active"
    )?.dataset.period ||
    "7D";

  loadDashboard(
    periodKey(
      activePeriod
    )
  );

})();
