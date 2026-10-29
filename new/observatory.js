/* Original procedural artwork. The geometry is illustrative, not research data. */
(() => {
  "use strict";

  const canvas = document.getElementById("observatory-canvas");
  const stage = canvas?.closest(".observatory-stage");
  if (!canvas || !stage) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const motionButton = document.getElementById("field-motion");
  const motionText = document.getElementById("field-motion-text");
  const resetButton = document.getElementById("field-reset");
  const status = document.getElementById("field-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 700px)").matches;
  const strandCount = compact ? 19 : 29;
  const strandSteps = compact ? 180 : 228;
  const pointCount = strandCount * strandSteps;
  const depthLevels = 12;
  const positions = new Float32Array(pointCount * 3);
  const screenX = new Float32Array(pointCount);
  const screenY = new Float32Array(pointCount);
  const screenZ = new Float32Array(pointCount);
  const depthBuckets = Array.from({ length: depthLevels }, () => new Uint16Array(pointCount));
  const depthCounts = new Uint16Array(depthLevels);
  const lineColors = Array.from({ length: depthLevels }, (_, i) => `rgba(220,232,173,${(0.045 + (i / (depthLevels - 1)) ** 1.8 * 0.42).toFixed(3)})`);
  const dotColors = Array.from({ length: depthLevels }, (_, i) => `rgba(237,240,211,${(0.1 + (i / (depthLevels - 1)) ** 1.6 * 0.64).toFixed(3)})`);
  const tau = Math.PI * 2;
  const initialYaw = 0.44;
  const initialPitch = 0.72;
  let yaw = initialYaw;
  let pitch = initialPitch;
  let width = 520;
  let height = 520;
  let scale = 96;
  let frame = 0;
  let lastFrameTime = 0;
  let lastDrawTime = 0;
  let dirty = true;
  let inView = true;
  let motionEnabled = !reducedMotion.matches;
  let pointerId = null;
  let pointerKind = "";
  let gesture = "";
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;

  // A bundle of offset torus-knot filaments. Fixed coordinates avoid frame allocations.
  for (let strand = 0; strand < strandCount; strand++) {
    const phase = (strand / strandCount) * tau;
    for (let step = 0; step < strandSteps; step++) {
      const t = (step / strandSteps) * tau;
      const tube = 0.55 + 0.145 * Math.cos(phase + t);
      const radial = 1.42 + tube * Math.cos(3 * t);
      const at = (strand * strandSteps + step) * 3;
      positions[at] = radial * Math.cos(2 * t);
      positions[at + 1] = radial * Math.sin(2 * t);
      positions[at + 2] = tube * Math.sin(3 * t) + 0.145 * Math.sin(phase + t);
    }
  }

  function language() {
    return document.documentElement.lang.startsWith("zh") ? "zh" : "en";
  }

  function announce(english, chinese) {
    if (status) status.textContent = language() === "zh" ? chinese : english;
  }

  function updateControls() {
    const key = reducedMotion.matches ? "fieldReduced" : motionEnabled ? "fieldPause" : "fieldPlay";
    const fallback = {
      en: { fieldReduced: "Reduced motion", fieldPause: "Pause motion", fieldPlay: "Resume motion" },
      zh: { fieldReduced: "减少动态效果", fieldPause: "暂停动态", fieldPlay: "继续动态" },
    };
    const label = window.siteContent?.[language()]?.[key] || fallback[language()][key];
    if (motionText) {
      motionText.dataset.i18n = key;
      motionText.textContent = label;
    }
    if (motionButton) {
      motionButton.disabled = reducedMotion.matches;
      motionButton.setAttribute("aria-label", label);
      motionButton.setAttribute("aria-pressed", String(!motionEnabled));
    }
    stage.dataset.motion = motionEnabled && !reducedMotion.matches ? "running" : "paused";
  }

  function canAnimate() {
    return motionEnabled && !reducedMotion.matches && inView && !document.hidden && pointerId === null;
  }

  function requestDraw() {
    dirty = true;
    if (!frame && inView && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    const sx = Math.sin(pitch);
    const cx = Math.cos(pitch);
    const sr = -0.2474;
    const cr = 0.9689;
    depthCounts.fill(0);
    for (let i = 0; i < pointCount; i++) {
      const offset = i * 3;
      const x = positions[offset] * cy + positions[offset + 2] * sy;
      const z = -positions[offset] * sy + positions[offset + 2] * cy;
      const y = positions[offset + 1] * cx - z * sx;
      const depth = positions[offset + 1] * sx + z * cx;
      const perspective = 6.8 / (6.8 - depth);
      screenX[i] = width / 2 + (x * cr - y * sr) * scale * perspective;
      screenY[i] = height / 2 + (x * sr + y * cr) * scale * perspective;
      screenZ[i] = depth;
      const bucket = Math.max(0, Math.min(depthLevels - 1, Math.floor(((depth + 2.5) / 5) * depthLevels)));
      depthBuckets[bucket][depthCounts[bucket]++] = i;
    }

    // A broad, very quiet orbit makes the silhouette legible without a card or glow.
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(-0.58);
    context.strokeStyle = "rgba(220,232,173,0.12)";
    context.lineWidth = 0.65;
    context.beginPath();
    context.ellipse(0, 0, scale * 2.42, scale * 0.91, 0, 0, tau);
    context.stroke();
    context.restore();

    for (let bucket = 0; bucket < depthLevels; bucket++) {
      const indices = depthBuckets[bucket];
      const count = depthCounts[bucket];
      context.strokeStyle = lineColors[bucket];
      context.lineWidth = bucket > 7 ? 0.72 : 0.55;
      context.beginPath();
      for (let j = 0; j < count; j++) {
        const i = indices[j];
        const next = i % strandSteps === strandSteps - 1 ? i - strandSteps + 1 : i + 1;
        context.moveTo(screenX[i], screenY[i]);
        context.lineTo(screenX[next], screenY[next]);
      }
      context.stroke();
      context.fillStyle = dotColors[bucket];
      context.beginPath();
      for (let j = 0; j < count; j++) {
        const i = indices[j];
        if (i % 7 !== 0) continue;
        const radius = bucket > 7 ? 1.0 : 0.65;
        context.moveTo(screenX[i] + radius, screenY[i]);
        context.arc(screenX[i], screenY[i], radius, 0, tau);
      }
      context.fill();
    }

    // Three restrained signal points connect the otherwise continuous strands.
    for (let node = 0; node < 3; node++) {
      const index = Math.floor(strandSteps * (0.11 + node * 0.295));
      if (screenZ[index] < -0.6) continue;
      const x = screenX[index];
      const y = screenY[index];
      context.fillStyle = node === 0 ? "#c7a477" : "#e6edc2";
      context.beginPath();
      context.arc(x, y, node === 0 ? 2.9 : 2.2, 0, tau);
      context.fill();
      context.strokeStyle = "rgba(220,232,173,0.25)";
      context.lineWidth = 0.65;
      context.beginPath();
      context.arc(x, y, 7.5, 0, tau);
      context.stroke();
    }
  }

  function tick(time) {
    frame = 0;
    const elapsed = lastFrameTime ? Math.min(time - lastFrameTime, 80) : 0;
    lastFrameTime = time;
    if (canAnimate()) yaw += elapsed * 0.000075;
    if (time - lastDrawTime >= 1000 / 30) {
      draw();
      lastDrawTime = time;
      dirty = false;
    }
    if ((dirty || canAnimate()) && inView && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function resize() {
    const box = stage.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    width = box.width;
    height = box.height;
    scale = Math.min(width, height) * 0.187;
    const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestDraw();
  }

  function toggleMotion() {
    if (reducedMotion.matches) return;
    motionEnabled = !motionEnabled;
    updateControls();
    announce(motionEnabled ? "Motion resumed." : "Motion paused.", motionEnabled ? "已继续动态。" : "已暂停动态。");
    requestDraw();
  }

  function reset() {
    yaw = initialYaw;
    pitch = initialPitch;
    announce("View reset.", "已复位视角。");
    requestDraw();
  }

  motionButton?.addEventListener("click", toggleMotion);
  resetButton?.addEventListener("click", reset);
  document.addEventListener("yz:language-change", updateControls);
  stage.addEventListener("keydown", (event) => {
    if (event.target !== stage) return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      toggleMotion();
      return;
    }
    const increment = 0.14;
    if (event.key === "ArrowLeft") yaw -= increment;
    else if (event.key === "ArrowRight") yaw += increment;
    else if (event.key === "ArrowUp") pitch = Math.max(-1.3, pitch - increment);
    else if (event.key === "ArrowDown") pitch = Math.min(1.3, pitch + increment);
    else if (event.key === "Home") {
      event.preventDefault();
      reset();
      return;
    } else return;
    event.preventDefault();
    requestDraw();
  });

  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0) || event.target.closest("button, a")) return;
    pointerId = event.pointerId;
    pointerKind = event.pointerType;
    gesture = pointerKind === "touch" ? "pending" : "drag";
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    if (gesture === "drag") {
      stage.setPointerCapture(pointerId);
      stage.focus({ preventScroll: true });
      stage.classList.add("is-dragging");
    }
  });
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    if (gesture === "pending") {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        finishPointer(event);
        return;
      }
      gesture = "drag";
      stage.setPointerCapture(pointerId);
      stage.classList.add("is-dragging");
    }
    if (gesture !== "drag") return;
    yaw += (event.clientX - lastX) * 0.008;
    if (pointerKind !== "touch") pitch = Math.max(-1.3, Math.min(1.3, pitch + (event.clientY - lastY) * 0.006));
    lastX = event.clientX;
    lastY = event.clientY;
    requestDraw();
  });
  function finishPointer(event) {
    if (event.pointerId !== pointerId) return;
    const released = pointerId;
    pointerId = null;
    gesture = "";
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(released)) stage.releasePointerCapture(released);
    requestDraw();
  }
  stage.addEventListener("pointerup", finishPointer);
  stage.addEventListener("pointercancel", finishPointer);
  stage.addEventListener("lostpointercapture", finishPointer);

  document.addEventListener("visibilitychange", () => {
    lastFrameTime = 0;
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else requestDraw();
  });
  reducedMotion.addEventListener("change", () => {
    motionEnabled = !reducedMotion.matches;
    updateControls();
    requestDraw();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        lastFrameTime = 0;
        if (!inView && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else requestDraw();
      },
      { threshold: 0 }
    ).observe(stage);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize, { passive: true });

  resize();
  draw();
  lastDrawTime = performance.now();
  updateControls();
  canvas.setAttribute("aria-hidden", "true");
  stage.classList.add("is-live");
})();
