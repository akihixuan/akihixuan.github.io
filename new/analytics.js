(() => {
  "use strict";
  const config = window.academicAnalytics || {};
  const root = document.querySelector("[data-site-analytics]");
  const messages = {
    en: {
      label: "Visits",
      pending: "Statistics pending",
      preview: "Preview · not counted",
      privacy: "Tracking disabled in this browser",
      loading: "Loading visits…",
      ready: "Since activation · updated periodically",
      unavailable: "Statistics temporarily unavailable",
      dashboard: "Analytics ↗",
      dashboardTitle: "Owner dashboard · sign-in required",
      countTitle: "Visits to this homepage. Repeat visits within a session are counted once. Public totals may take up to four hours to update.",
    },
    zh: {
      label: "访问次数",
      pending: "统计待启用",
      preview: "预览不计入统计",
      privacy: "此浏览器已关闭追踪",
      loading: "正在获取访问次数…",
      ready: "自启用起统计 · 定期更新",
      unavailable: "统计暂时不可用",
      dashboard: "统计后台 ↗",
      dashboardTitle: "站主统计后台 · 需要登录",
      countTitle: "本主页的访问次数，同一会话内重复访问仅计一次。公开计数最长可能延迟四小时更新。",
    },
  };
  let state = "pending";
  let count = "—";
  let site;
  function render() {
    if (!root) return;
    const copy = messages[document.documentElement.lang.startsWith("zh") ? "zh" : "en"];
    const set = (selector, text) => {
      const element = root.querySelector(selector);
      if (element) element.textContent = text;
    };
    root.dataset.analyticsState = state;
    set("[data-analytics-label]", copy.label);
    set("[data-analytics-count]", count);
    set("[data-analytics-note]", copy[state]);
    const number = root.querySelector("[data-analytics-count]");
    if (number) number.title = copy.countTitle;
    const dashboard = root.querySelector("[data-analytics-dashboard]");
    if (dashboard) {
      dashboard.hidden = !site;
      dashboard.textContent = copy.dashboard;
      dashboard.title = copy.dashboardTitle;
      dashboard.setAttribute("aria-label", copy.dashboardTitle);
      if (site) dashboard.href = site.origin;
    }
  }
  function show(nextState) {
    state = nextState;
    render();
  }
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  render();

  // A public collection address is enough; the private API is never used here.
  try {
    site = new URL(config.site);
    if (
      site.protocol !== "https:" ||
      !/^[a-z0-9][a-z0-9-]*\.goatcounter\.com$/.test(site.hostname) ||
      site.username ||
      site.password ||
      site.port ||
      site.pathname !== "/" ||
      site.search ||
      site.hash
    ) {
      site = undefined;
      return;
    }
  } catch {
    site = undefined;
    return;
  }
  render();
  // Development, copies of the site, and other paths never produce visits.
  if (
    location.protocol !== "https:" ||
    location.origin !== config.productionOrigin ||
    ![config.pagePath, config.pagePath + "index.html", config.pagePath.replace(/\/$/, "")].includes(location.pathname)
  ) {
    show("preview");
    return;
  }
  const doNotTrack = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (doNotTrack === "1" || doNotTrack === "yes" || navigator.globalPrivacyControl === true) {
    show("privacy");
    return;
  }

  function safeReferrer() {
    try {
      const referrer = new URL(document.referrer);
      return ["https:", "http:"].includes(referrer.protocol) ? referrer.origin : "";
    } catch {
      return "";
    }
  }
  let trackerReady = false;
  let pageCounted = false;
  const queued = new Set();
  const eventTitles = {
    "click-cv": "CV link",
    "click-thesis": "Thesis record",
    "click-github": "GitHub profile",
    "click-email": "Email link",
    "copy-email": "Copy email",
    "open-citation": "Open citation",
    "copy-citation": "Copy citation",
    "download-citation": "Download citation",
    "open-method": "Open project method",
  };
  function sendEvent(name) {
    if (!eventTitles[name]) return;
    if (!trackerReady) {
      queued.add(name);
      return;
    }
    try {
      // GoatCounter deduplicates the same event within a visitor session.
      window.goatcounter.count({ path: name, title: eventTitles[name], event: true, referrer: "" });
    } catch {
      // Analytics must never interfere with navigation or other interactions.
    }
  }
  function onClick(event) {
    if (event.type === "auxclick" && event.button !== 1) return;
    const target = event.target.closest?.("a, button");
    if (!target) return;
    const actionById = {
      "copy-email": "copy-email",
      "cite-button": "open-citation",
      "copy-citation": "copy-citation",
      "download-citation": "download-citation",
    };
    if (actionById[target.id]) return sendEvent(actionById[target.id]);
    const href = target.getAttribute("href");
    if (!href) return;
    try {
      const url = new URL(href, location.href);
      if (url.protocol === "mailto:") sendEvent("click-email");
      else if (url.origin === location.origin && url.pathname.endsWith("/Yunxuan_Zou_CV.pdf")) sendEvent("click-cv");
      else if (url.hostname === "hdl.handle.net" && url.pathname === "/10356/214385") sendEvent("click-thesis");
      else if (url.hostname === "github.com" && url.pathname.replace(/\/$/, "") === "/akihixuan") sendEvent("click-github");
    } catch {
      // Unknown links are not collected.
    }
  }
  document.addEventListener("click", onClick);
  document.addEventListener("auxclick", onClick);
  const openedDetails = new WeakSet();
  document.addEventListener(
    "toggle",
    (event) => {
      const details = event.target;
      if (details.matches?.("details.project-details") && details.open && !openedDetails.has(details)) {
        openedDetails.add(details);
        sendEvent("open-method");
      }
    },
    true
  );

  async function readCounter(retry = true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(site.origin + "/counter/" + encodeURIComponent(config.pagePath) + ".json", {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      if (response.status === 404 && retry) {
        // A new site's first visit can take a few seconds to become available.
        setTimeout(() => readCounter(false), 12000);
        return;
      }
      if (!response.ok) throw new Error("Counter unavailable");
      const data = await response.json();
      const value = String(data.count ?? "");
      if (value.length > 32 || !/^\d[\d,.\s\u00a0\u202f]*$/.test(value)) throw new Error("Invalid counter");
      count = value;
      show("ready");
    } catch {
      show("unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  // Disable automatic counting: one canonical visit is sent only when visible.
  window.goatcounter = { no_onload: true, no_events: true, endpoint: site.origin + "/count" };
  function countPage() {
    if (pageCounted || !trackerReady || document.visibilityState === "hidden" || document.visibilityState === "prerender") return;
    pageCounted = true;
    try {
      window.goatcounter.count({ path: config.pagePath, title: "Yunxuan Zou — Academic Homepage", referrer: safeReferrer() });
      queued.forEach(sendEvent);
      queued.clear();
    } catch {
      // Storage restrictions and blockers may prevent a visit from being counted.
    }
  }
  document.addEventListener("visibilitychange", countPage);
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.v5.js";
  script.crossOrigin = "anonymous";
  script.referrerPolicy = "no-referrer";
  script.integrity = "sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ";
  script.setAttribute("data-goatcounter", site.origin + "/count");
  script.addEventListener("load", () => {
    if (typeof window.goatcounter.get_data !== "function" || typeof window.goatcounter.count !== "function") return;
    const originalGetData = window.goatcounter.get_data;
    window.goatcounter.get_data = (vars) => {
      const data = originalGetData(vars);
      // v5 includes the page query separately even with a canonical path.
      data.q = "";
      return data;
    };
    trackerReady = true;
    countPage();
  });
  // The public counter is independent of the tracker, so existing totals can
  // remain visible even when a content blocker stops the collection script.
  document.head.appendChild(script);
  if (config.publicCounter) {
    show("loading");
    readCounter();
  }
})();
