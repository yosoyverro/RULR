(() => {
  if (window.__RULR__) return;

  const state = {
    mode: "inspect",
    dragging: false,
    startX: 0,
    startY: 0,
    shift: false,
    lastMeasurement: ""
  };

  const root = document.createElement("div");
  root.id = "rulr-root";

  const crosshair = document.createElement("div");
  crosshair.id = "rulr-crosshair";
  root.appendChild(crosshair);

  const outline = document.createElement("div");
  outline.className = "rulr-outline";
  outline.style.display = "none";
  root.appendChild(outline);

  const box = document.createElement("div");
  box.className = "rulr-box";
  box.style.display = "none";
  root.appendChild(box);

  const line = document.createElement("div");
  line.id = "rulr-distance-line";
  line.style.display = "none";
  root.appendChild(line);

  const label = document.createElement("div");
  label.className = "rulr-label";
  label.style.display = "none";
  root.appendChild(label);

  document.documentElement.appendChild(root);
  document.documentElement.classList.add("rulr-active");

  const px = (n) => `${Math.round(n)}px`;

  function viewportPercent(value, axis) {
    const basis = axis === "x" ? window.innerWidth : window.innerHeight;
    return basis ? `${((value / basis) * 100).toFixed(1)}%` : "0%";
  }

  function positionLabel(x, y, text) {
    label.textContent = text;
    label.style.display = "block";
    const pad = 14;
    const width = label.offsetWidth || 160;
    const height = label.offsetHeight || 28;
    label.style.left = `${Math.min(x + 12, window.innerWidth - width - pad)}px`;
    label.style.top = `${Math.min(y + 12, window.innerHeight - height - pad)}px`;
  }

  function clearTransient() {
    outline.style.display = "none";
    box.style.display = "none";
    line.style.display = "none";
    label.style.display = "none";
  }

  function inspectAt(x, y) {
    root.style.display = "none";
    const el = document.elementFromPoint(x, y);
    root.style.display = "block";
    if (!el || el === document.documentElement || el === document.body) {
      outline.style.display = "none";
      label.style.display = "none";
      return;
    }

    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    outline.style.display = "block";
    outline.style.left = `${r.left}px`;
    outline.style.top = `${r.top}px`;
    outline.style.width = `${r.width}px`;
    outline.style.height = `${r.height}px`;

    const text = `${px(r.width)} × ${px(r.height)} · ${viewportPercent(r.width, "x")} vw · pad ${cs.paddingTop}/${cs.paddingRight}/${cs.paddingBottom}/${cs.paddingLeft}`;
    state.lastMeasurement = text;
    positionLabel(x, y, text);
  }

  function normalizedEnd(x, y) {
    if (!state.shift) return { x, y };
    const dx = Math.abs(x - state.startX);
    const dy = Math.abs(y - state.startY);
    return dx >= dy ? { x, y: state.startY } : { x: state.startX, y };
  }

  function drawBox(x, y) {
    const end = normalizedEnd(x, y);
    const left = Math.min(state.startX, end.x);
    const top = Math.min(state.startY, end.y);
    const width = Math.abs(end.x - state.startX);
    const height = Math.abs(end.y - state.startY);
    box.style.display = "block";
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
    const text = `${px(width)} × ${px(height)} · ${viewportPercent(width, "x")} vw × ${viewportPercent(height, "y")} vh`;
    state.lastMeasurement = text;
    positionLabel(end.x, end.y, text);
  }

  function drawDistance(x, y) {
    const end = normalizedEnd(x, y);
    const dx = end.x - state.startX;
    const dy = end.y - state.startY;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    line.style.display = "block";
    line.style.left = `${state.startX}px`;
    line.style.top = `${state.startY}px`;
    line.style.width = `${distance}px`;
    line.style.transform = `rotate(${angle}deg)`;
    const text = `${px(distance)} · ${angle.toFixed(1)}° · Δx ${px(Math.abs(dx))} · Δy ${px(Math.abs(dy))}`;
    state.lastMeasurement = text;
    positionLabel(end.x, end.y, text);
  }

  function onMove(e) {
    crosshair.style.left = `${e.clientX}px`;
    crosshair.style.top = `${e.clientY}px`;

    if (state.mode === "inspect" && !state.dragging) inspectAt(e.clientX, e.clientY);
    if (state.dragging && state.mode === "box") drawBox(e.clientX, e.clientY);
    if (state.dragging && state.mode === "distance") drawDistance(e.clientX, e.clientY);
  }

  function onDown(e) {
    if (e.button !== 0 || state.mode === "inspect") return;
    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    e.preventDefault();
    e.stopPropagation();
  }

  function onUp(e) {
    if (!state.dragging) return;
    state.dragging = false;
    if (state.mode === "box") drawBox(e.clientX, e.clientY);
    if (state.mode === "distance") drawDistance(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  }

  function showToast(text) {
    let toast = document.getElementById("rulr-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "rulr-toast";
      root.appendChild(toast);
    }
    toast.textContent = text;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.remove(), 1200);
  }

  async function copyMeasurement() {
    if (!state.lastMeasurement) return;
    try {
      await navigator.clipboard.writeText(state.lastMeasurement);
      showToast("Measurement copied");
    } catch {
      showToast("Could not copy on this page");
    }
  }

  function setMode(mode) {
    if (!["inspect", "box", "distance"].includes(mode)) return;
    state.mode = mode;
    clearTransient();
    showToast(mode === "inspect" ? "What size is this?" : mode === "box" ? "Box measure" : "Distance measure");
  }

  function onKeyDown(e) {
    state.shift = e.shiftKey;
    if (e.key === "Escape") stop();
    if (e.key.toLowerCase() === "i") setMode("inspect");
    if (e.key.toLowerCase() === "b") setMode("box");
    if (e.key.toLowerCase() === "d") setMode("distance");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && state.lastMeasurement) {
      e.preventDefault();
      copyMeasurement();
    }
  }

  function onKeyUp(e) {
    state.shift = e.shiftKey;
  }

  function stop() {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("mouseup", onUp, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    document.documentElement.classList.remove("rulr-active");
    root.remove();
    delete window.__RULR__;
  }

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("mousedown", onDown, true);
  document.addEventListener("mouseup", onUp, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);

  window.__RULR__ = { setMode, stop, copyMeasurement };
})();
