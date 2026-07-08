/* ===================================================================
   Competitor Audit — Results Page
   Matches the visual system established by SEO Audit / GEO Audit:
   repeating banner+card sections, teal palette, DM Sans/DM Mono.

   CONFIG: update API_BASE once this repo is deployed to Vercel.
   =================================================================== */
(function () {
  var API_BASE = "https://competitor-analysis-westwardmarketinglab.vercel.app"; 
  var MOUNT_ID = "cmp-mount";

  var POSITION_COLORS = {
    ahead: { color: "#2d7a4f", bg: "#e3f2ea", label: "Ahead" },
    even: { color: "#e07b2c", bg: "#fff3e0", label: "Even" },
    behind: { color: "#c44b3a", bg: "#fdecea", label: "Behind" },
  };

  var SWOT_META = {
    strengths: { label: "Strengths", color: "#2d7a4f" },
    weaknesses: { label: "Weaknesses", color: "#c44b3a" },
    opportunities: { label: "Opportunities", color: "#055671" },
    threats: { label: "Threats", color: "#e07b2c" },
  };

  function esc(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function hostname(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return url; }
  }

  function getParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function renderLoading(mount) {
    mount.innerHTML = '<div class="cmp-loading">Running the comparison&hellip; this reads every site closely, so it can take a minute or two.</div>';
  }

  function renderError(mount, message) {
    mount.innerHTML = '<div class="cmp-error"><strong>Something went wrong.</strong><br>' + esc(message) + "</div>";
  }

  function pageBanner(brandUrl, dateStr) {
    return (
      '<div class="cmp-banner-row">' +
      '<div class="cmp-banner-left">COMPETITOR AUDIT REPORT &mdash; ' + esc(hostname(brandUrl).toUpperCase()) + "</div>" +
      '<div class="cmp-banner-right">' + dateStr.toUpperCase() + "</div>" +
      "</div>"
    );
  }

  function wrapCard(bannerHtml, innerHtml) {
    return bannerHtml + '<div class="cmp-card">' + innerHtml + "</div>";
  }

  // ---------- SEO Visibility comparison (mechanical scores) ----------
  function renderSeoScoreRows(brandUrl, seoScores) {
    var rows = [{ url: brandUrl, score: seoScores.brand, isBrand: true }].concat(
      (seoScores.competitors || []).map(function (c) { return { url: c.url, score: c.score, isBrand: false }; })
    );
    var maxScore = Math.max.apply(null, rows.map(function (r) { return r.score || 0; })) || 100;

    return (
      '<div class="cmp-score-rows">' +
      rows
        .map(function (r) {
          if (r.score == null) {
            return (
              '<div class="cmp-score-row">' +
              '<div class="cmp-score-row-label">' + esc(hostname(r.url)) + (r.isBrand ? " (you)" : "") + "</div>" +
              '<div class="cmp-score-row-error">Couldn\'t score this site.</div>' +
              "</div>"
            );
          }
          var pct = maxScore > 0 ? (r.score / maxScore) * 100 : 0;
          var color = r.isBrand ? "#055671" : r.score >= 70 ? "#2d7a4f" : r.score >= 45 ? "#e07b2c" : "#c44b3a";
          return (
            '<div class="cmp-score-row' + (r.isBrand ? " cmp-score-row-brand" : "") + '">' +
            '<div class="cmp-score-row-label">' + esc(hostname(r.url)) + (r.isBrand ? " (you)" : "") + "</div>" +
            '<div class="cmp-score-row-track"><div class="cmp-score-row-fill" style="width:' + pct + "%;background:" + color + ';"></div></div>' +
            '<div class="cmp-score-row-value" style="color:' + color + '">' + r.score + "</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  // ---------- Comparative dimension accordion ----------
  function renderDimensionRow(dim) {
    var pos = POSITION_COLORS[dim.brandPosition] || POSITION_COLORS.even;
    return (
      '<details class="cmp-dim-row">' +
      '<summary class="cmp-dim-summary">' +
      '<div class="cmp-dim-label">' + esc(dim.label) + "</div>" +
      '<div class="cmp-dim-position" style="background:' + pos.bg + ';color:' + pos.color + '">' + pos.label.toUpperCase() + "</div>" +
      '<div class="cmp-dim-chevron">&#8250;</div>' +
      "</summary>" +
      '<div class="cmp-dim-detail">' +
      '<div class="cmp-dim-brand"><span class="cmp-dim-who">You</span>' + esc(dim.brandAssessment) + "</div>" +
      (dim.competitorAssessments || [])
        .map(function (c) {
          return '<div class="cmp-dim-competitor"><span class="cmp-dim-who">' + esc(hostname(c.url)) + '</span>' + esc(c.assessment) + "</div>";
        })
        .join("") +
      "</div></details>"
    );
  }

  // ---------- SWOT grid ----------
  function renderSwotCard(key, items) {
    var meta = SWOT_META[key];
    return (
      '<div class="cmp-swot-card" style="border-left-color:' + meta.color + '">' +
      '<div class="cmp-swot-title" style="color:' + meta.color + '">' + esc(meta.label) + "</div>" +
      '<ul class="cmp-swot-list">' +
      (items || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") +
      "</ul></div>"
    );
  }

  function render(mount, data) {
    var result = data.result;
    var branding = data.branding || {};
    var calendarUrl = branding.calendarUrl || "#";
    var dateStr = new Date(data.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    var brandUrl = result.brandUrl;
    var comparative = result.comparative;

    var html =
      '<div class="report-page">' +
      '<div class="report-header">' +
      '<div class="report-title">Competitor Audit Report</div>' +
      '<div class="report-subject">' + esc(hostname(brandUrl)) + "</div>" +
      "</div>" +
      '<div class="report-banner">' +
      '<div class="report-banner-left">COMPETITOR AUDIT REPORT &mdash; ' + esc(hostname(brandUrl).toUpperCase()) + "</div>" +
      '<div class="report-banner-right">' + dateStr.toUpperCase() + "</div>" +
      "</div>" +

      '<div class="cmp-section">' +
      '<div class="cmp-section-label">SEO Visibility</div>' +
      '<p class="cmp-section-intro">A real, comparable 0&ndash;100 score across crawlability, technical performance, on-page optimization, site architecture, content quality, structured data, and off-site authority &mdash; run identically against your site and each competitor.</p>' +
      renderSeoScoreRows(brandUrl, result.seoScores) +
      "</div>" +

      (comparative
        ? wrapCard(
            pageBanner(brandUrl, dateStr),
            '<div class="cmp-card-title">Comparative Analysis</div>' +
            '<p class="cmp-section-intro">Expand any dimension to see how your site and each named competitor were assessed.</p>' +
            '<div class="cmp-dims">' +
            comparative.dimensions.map(renderDimensionRow).join("") +
            "</div>"
          )
        : "") +

      (comparative
        ? wrapCard(
            pageBanner(brandUrl, dateStr),
            '<div class="cmp-card-title">SWOT Summary</div>' +
            '<p class="cmp-section-intro">Grounded in the comparison above, not generic template language.</p>' +
            '<div class="cmp-swot-grid">' +
            renderSwotCard("strengths", comparative.swot.strengths) +
            renderSwotCard("weaknesses", comparative.swot.weaknesses) +
            renderSwotCard("opportunities", comparative.swot.opportunities) +
            renderSwotCard("threats", comparative.swot.threats) +
            "</div>"
          )
        : wrapCard(
            pageBanner(brandUrl, dateStr),
            '<div class="cmp-card-title">Comparative Analysis</div>' +
            '<p class="cmp-section-intro">The qualitative comparison and SWOT summary aren\'t available for this audit &mdash; this requires the comparative analysis engine to be configured. The SEO Visibility score above is still a real, mechanical comparison.</p>'
          )) +

      wrapCard(
        pageBanner(brandUrl, dateStr),
        '<div class="cmp-card-title">How This Audit Fits Into the Brand DNA Biome</div>' +
        '<p class="cmp-biome-intro">Competitor Audit sits at the Competitors domain of the Environment component &mdash; alongside Market, Audiences, External AI, Industry Trends, and Regulatory.</p>' +
        '<div class="diagram">' +
        '<svg viewBox="56 -41 538 502" role="img" aria-label="Environment component diagram with six domains, including Competitors." class="exec-mol" xmlns="http://www.w3.org/2000/svg">' +
        '<g class="exec-mol-bonds" aria-hidden="true">' +
        '<line x1="365.5" y1="195.2" x2="387.8" y2="11.7" class="exec-mol-bond"/>' +
        '<line x1="338.0" y1="200.3" x2="248.3" y2="38.9" class="exec-mol-bond"/>' +
        '<line x1="393.6" y1="203.9" x2="516.7" y2="71.7" class="exec-mol-bond"/>' +
        '<line x1="300.0" y1="212.1" x2="151.5" y2="143.0" class="exec-mol-bond"/>' +
        '<line x1="285.0" y1="254.6" x2="134.3" y2="284.1" class="exec-mol-bond"/>' +
        '<line x1="326.4" y1="276.1" x2="203.3" y2="408.3" class="exec-mol-bond"/>' +
        "</g>" +
        '<g class="exec-mol-core">' +
        '<polygon points="360.0,193.5 435.0,216.75 435.0,263.25 360.0,286.5 285.0,263.25 285.0,216.75" class="exec-mol-core-shape"/>' +
        '<text x="360" y="230" text-anchor="middle" class="exec-mol-core-num">02</text>' +
        '<text x="360" y="254" text-anchor="middle" class="exec-mol-core-label">ENVIRONMENT</text>' +
        "</g>" +
        '<g class="exec-mol-sub">' +
        '<polygon points="387.8,-23.3 447.8,-5.8 447.8,29.2 387.8,46.7 327.8,29.2 327.8,-5.8" class="exec-mol-sub-shape"/>' +
        '<text x="387.8" y="16.7" text-anchor="middle" class="exec-mol-sub-label"><tspan x="387.8" dy="0">MARKET</tspan></text>' +
        "</g>" +
        '<g class="exec-mol-sub">' +
        '<polygon points="248.3,3.9 308.3,21.4 308.3,56.4 248.3,73.9 188.3,56.4 188.3,21.4" class="exec-mol-sub-shape"/>' +
        '<text x="248.3" y="43.9" text-anchor="middle" class="exec-mol-sub-label"><tspan x="248.3" dy="0">AUDIENCES</tspan></text>' +
        "</g>" +
        '<g class="exec-mol-sub exec-mol-sub-highlight">' +
        '<polygon points="516.7,36.7 576.7,54.2 576.7,89.2 516.7,106.7 456.7,89.2 456.7,54.2" class="exec-mol-sub-shape"/>' +
        '<text x="516.7" y="76.7" text-anchor="middle" class="exec-mol-sub-label"><tspan x="516.7" dy="0">COMPETITORS</tspan></text>' +
        "</g>" +
        '<g class="exec-mol-sub">' +
        '<polygon points="151.5,108.0 211.5,125.5 211.5,160.5 151.5,178.0 91.5,160.5 91.5,125.5" class="exec-mol-sub-shape"/>' +
        '<text x="151.5" y="141.0" text-anchor="middle" class="exec-mol-sub-label"><tspan x="151.5" dy="-7">EXTERNAL</tspan><tspan x="151.5" dy="17">AI</tspan></text>' +
        "</g>" +
        '<g class="exec-mol-sub">' +
        '<polygon points="134.3,249.1 194.3,266.6 194.3,301.6 134.3,319.1 74.3,301.6 74.3,266.6" class="exec-mol-sub-shape"/>' +
        '<text x="134.3" y="281.1" text-anchor="middle" class="exec-mol-sub-label"><tspan x="134.3" dy="-7">INDUSTRY</tspan><tspan x="134.3" dy="17">TRENDS</tspan></text>' +
        "</g>" +
        '<g class="exec-mol-sub">' +
        '<polygon points="203.3,373.3 263.3,390.8 263.3,425.8 203.3,443.3 143.3,425.8 143.3,390.8" class="exec-mol-sub-shape"/>' +
        '<text x="203.3" y="413.3" text-anchor="middle" class="exec-mol-sub-label"><tspan x="203.3" dy="0">REGULATORY</tspan></text>' +
        "</g>" +
        "</svg></div>"
      ) +

      wrapCard(
        pageBanner(brandUrl, dateStr),
        '<div class="cmp-cta">' +
        '<div class="cmp-cta-content">' +
        '<div class="cmp-cta-tag">Next Step</div>' +
        '<div class="cmp-cta-headline">See the full picture. Define your complete Brand DNA Biome.</div>' +
        '<div class="cmp-cta-body">Competitors are one domain inside the Environment component. The full audit assesses your Brand DNA at the nucleus, plus all four orbital components &mdash; Goals, Environment, Strategies, and Execution.</div>' +
        "</div>" +
        '<a class="cmp-cta-btn" href="' + esc(calendarUrl) + '">Contact the Lab</a>' +
        "</div>"
      ) +

      '<div class="cmp-pdf"><a href="' + API_BASE + '/api/pdf/' + encodeURIComponent(data.id) + '" target="_blank">&#8595; Download PDF report</a></div>' +
      "</div>";

    mount.innerHTML = html;
  }

  function init() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    var auditId = getParam("auditId") || getParam("id");
    if (!auditId) {
      renderError(mount, "No audit ID found in the URL. Run a new audit to see your results.");
      return;
    }

    renderLoading(mount);

    fetch(API_BASE + "/api/audit-data/" + encodeURIComponent(auditId))
      .then(function (res) {
        if (!res.ok) throw new Error("Audit not found (it may have expired or the link is incorrect).");
        return res.json();
      })
      .then(function (data) {
        render(mount, data);
      })
      .catch(function (err) {
        renderError(mount, err.message || "Couldn't load this audit.");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
