(() => {
  "use strict";

  document.querySelectorAll(".method-explorer").forEach((explorer) => {
    const buttons = [...explorer.querySelectorAll("[data-method-step]")];
    const panels = [...explorer.querySelectorAll("[data-method-panel]")];
    if (buttons.length !== 3 || panels.length !== 3) return;

    function select(stage, announce = true) {
      if (!Number.isInteger(stage) || stage < 0 || stage > 2) return;
      const previous = explorer.dataset.step;
      explorer.dataset.step = String(stage);
      buttons.forEach((button) => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.methodStep) === stage));
      });
      panels.forEach((panel) => {
        panel.hidden = Number(panel.dataset.methodPanel) !== stage;
      });
      if (announce && previous !== String(stage)) {
        explorer.dispatchEvent(new CustomEvent("yz:method-change", { bubbles: true, detail: { stage } }));
      }
    }

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => select(Number(button.dataset.methodStep)));
      button.addEventListener("keydown", (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft") next = (index + buttons.length - 1) % buttons.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next].focus();
        select(Number(buttons[next].dataset.methodStep));
      });
    });

    const initial = Number(explorer.dataset.step || 0);
    select(Number.isInteger(initial) && initial >= 0 && initial <= 2 ? initial : 0, false);
    explorer.classList.add("is-interactive");
  });
})();
