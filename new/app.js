(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Optional preference. */ } },
  };
  const dialog = $("#citation-dialog");
  let language = storage.get("yz-language") === "zh" ? "zh" : "en";
  let theme = storage.get("yz-theme") === "dark" ? "dark" : "light";
  let toastTimer;
  const copy = () => window.siteContent[language];

  function updateThemeControl() {
    $("#theme-toggle").setAttribute("aria-label", copy()[theme === "dark" ? "themeLight" : "themeDark"] + " · " + copy().themeLabel);
    $("#theme-toggle").setAttribute("aria-pressed", String(theme === "dark"));
    $("#theme-label").textContent = copy()[theme === "dark" ? "themeLight" : "themeDark"];
  }
  function setTheme(next) {
    theme = next;
    document.documentElement.dataset.theme = theme;
    $('meta[name="theme-color"]').content = theme === "dark" ? "#1c1e20" : "#ffffff";
    updateThemeControl();
    storage.set("yz-theme", theme);
  }
  function setLanguage(next) {
    language = next;
    const content = copy();
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = content.pageTitle;
    $('meta[name="description"]').content = content.pageDescription;
    $('meta[property="og:title"]').content = content.pageTitle;
    $('meta[property="og:description"]').content = content.pageDescription;
    $$("[data-i18n]").forEach((el) => { el.textContent = content[el.dataset.i18n]; });
    // Translations are trusted, locally authored copy, not visitor input.
    $$("[data-i18n-html]").forEach((el) => { el.innerHTML = content[el.dataset.i18nHtml]; });
    $("#language-switch").setAttribute("aria-label", content.languageLabel);
    $(".lang-en").classList.toggle("active", language === "en");
    $(".lang-zh").classList.toggle("active", language === "zh");
    $("#copy-email").setAttribute("aria-label", content.contactCopy);
    $("#close-citation").setAttribute("aria-label", content.citationClose);
    $("#main-nav").setAttribute("aria-label", language === "zh" ? "主导航" : "Main navigation");
    $(".profile").setAttribute("aria-label", language === "zh" ? "个人资料" : "Profile");
    updateThemeControl();
    storage.set("yz-language", language);
    document.dispatchEvent(new CustomEvent("yz:language-change", { detail: { language } }));
  }
  function announce(message) {
    clearTimeout(toastTimer);
    const target = dialog.open ? $("#citation-status") : $("#toast");
    target.textContent = message;
    target.classList.add("show");
    toastTimer = setTimeout(() => { target.textContent = ""; target.classList.remove("show"); }, 3500);
  }
  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      announce(copy().copied);
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      input.style.cssText = "position:fixed;opacity:0;inset:0;pointer-events:none";
      (dialog.open ? dialog : document.body).append(input);
      input.focus();
      input.select();
      let success = false;
      try { success = document.execCommand("copy"); } catch { /* Manual copy remains available. */ }
      input.remove();
      (dialog.open ? $("#copy-citation") : $("#copy-email")).focus();
      announce(copy()[success ? "copied" : "copyError"]);
    }
  }

  $("#language-switch").addEventListener("click", () => setLanguage(language === "en" ? "zh" : "en"));
  $("#theme-toggle").addEventListener("click", () => setTheme(theme === "dark" ? "light" : "dark"));
  $("#copy-email").addEventListener("click", () => copyText(window.siteConfig.email));
  $("#bibtex-code").textContent = window.siteConfig.bibtex;
  $("#cite-button").addEventListener("click", (event) => {
    // The real .bib link also works without JavaScript or dialog support.
    if (typeof dialog.showModal !== "function" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.showModal();
  });
  $("#close-citation").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { $("#citation-status").textContent = ""; });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  $("#copy-citation").addEventListener("click", () => copyText(window.siteConfig.bibtex));
  function markCurrentSection() {
    const hash = location.hash || "#about";
    $$(".main-nav a").forEach((link) => {
      if (link.getAttribute("href") === hash) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", markCurrentSection);
  setLanguage(language);
  setTheme(theme);
  markCurrentSection();
  document.documentElement.classList.add("js");
})();
