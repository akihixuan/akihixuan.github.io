(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const storage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Page works without storage. */
      }
    },
  };
  let language = storage.get("yz-language") === "zh" ? "zh" : "en";
  let toastTimer;
  const menu = $("#main-nav");
  const menuButton = $("#menu-toggle");
  const citationDialog = $("#citation-dialog");

  function closeMenu() {
    menu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", window.siteContent[language].menuLabel);
  }
  function applyLanguage(nextLanguage) {
    language = nextLanguage;
    const copy = window.siteContent[language];
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = copy.pageTitle;
    $('meta[name="description"]').content = copy.pageDescription;
    $('meta[property="og:title"]').content = copy.pageTitle;
    $('meta[property="og:description"]').content = copy.pageDescription;
    $$("[data-i18n]").forEach((el) => {
      el.textContent = copy[el.dataset.i18n];
    });
    // HTML translations are authored locally in content.js, never taken from visitor input.
    $$("[data-i18n-html]").forEach((el) => {
      el.innerHTML = copy[el.dataset.i18nHtml];
    });
    $("#language-switch").setAttribute("aria-label", copy.languageLabel);
    $(".lang-en").classList.toggle("active", language === "en");
    $(".lang-zh").classList.toggle("active", language === "zh");
    $("#copy-email").setAttribute("aria-label", copy.contactCopy);
    $("#theme-toggle").setAttribute("aria-label", copy.themeLabel);
    $("#close-citation").setAttribute("aria-label", copy.citationClose);
    menu.setAttribute("aria-label", language === "zh" ? "主导航" : "Main navigation");
    storage.set("yz-language", language);
    closeMenu();
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('meta[name="theme-color"]').content = theme === "dark" ? "#141e19" : "#f8f9f4";
    $("#theme-toggle").setAttribute("aria-pressed", String(theme === "dark"));
    storage.set("yz-theme", theme);
  }
  function toast(message) {
    clearTimeout(toastTimer);
    if (citationDialog.open) {
      $("#citation-status").textContent = message;
      toastTimer = setTimeout(() => {
        $("#citation-status").textContent = "";
      }, 3500);
      return;
    }
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast(window.siteContent[language].copied);
    } catch {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.cssText = "position:fixed;opacity:0;inset:0;pointer-events:none";
      (citationDialog.open ? citationDialog : document.body).append(input);
      input.focus();
      input.select();
      let success = false;
      try {
        success = document.execCommand("copy");
      } catch {
        /* Fall through to the manual copy message. */
      }
      input.remove();
      toast(window.siteContent[language][success ? "copied" : "copyError"]);
      if (citationDialog.open) $("#copy-citation").focus();
    }
  }

  $("#language-switch").addEventListener("click", () => applyLanguage(language === "en" ? "zh" : "en"));
  $("#theme-toggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  menuButton.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", window.siteContent[language][isOpen ? "closeMenuLabel" : "menuLabel"]);
  });
  $$(".main-nav a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  window.matchMedia("(min-width: 701px)").addEventListener("change", closeMenu);

  $("#bibtex-code").textContent = window.siteConfig.bibtex;
  const bibtexBlob = new Blob([window.siteConfig.bibtex + "\n"], { type: "application/x-bibtex;charset=utf-8" });
  $("#download-citation").href = URL.createObjectURL(bibtexBlob);
  $("#cite-button").addEventListener("click", () => citationDialog.showModal());
  $("#close-citation").addEventListener("click", () => citationDialog.close());
  citationDialog.addEventListener("close", () => {
    $("#citation-status").textContent = "";
  });
  citationDialog.addEventListener("click", (event) => {
    if (event.target !== citationDialog) return;
    const box = citationDialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) citationDialog.close();
  });
  $("#copy-citation").addEventListener("click", () => copyText(window.siteConfig.bibtex));
  $("#copy-email").addEventListener("click", () => copyText(window.siteConfig.email));

  let scrollScheduled = false;
  function updateNavigation() {
    const sections = ["about", "research", "projects", "publications", "education"];
    let active = "about";
    sections.forEach((id) => {
      if (document.getElementById(id).getBoundingClientRect().top <= 175) active = id;
    });
    $$(".main-nav a").forEach((link) => {
      const isActive = link.getAttribute("href") === "#" + active;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    scrollScheduled = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollScheduled) {
        requestAnimationFrame(updateNavigation);
        scrollScheduled = true;
      }
    },
    { passive: true }
  );
  applyLanguage(language);
  setTheme(storage.get("yz-theme") === "dark" ? "dark" : "light");
  updateNavigation();
})();
