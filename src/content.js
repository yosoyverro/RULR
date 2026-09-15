(() => {
  if (window.__RULR__) return;

  const state = {
    mode: "inspect",
    dragging: false,
    startX: 0,
    startY: 0,
    shift: false,
    lastMeasurement: "",
    pinned: false,
    pinnedElement: null,
    lastX: 0,
    lastY: 0
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
  const edges = (cs, prefix) => [
    cs[`${prefix}Top`],
    cs[`${prefix}Right`],
    cs[`${prefix}Bottom`],
    cs[`${prefix}Left`]
  ].join(" ");

  function viewportPercent(value, axis) {
    const basis = axis === "x" ? window.innerWidth : window.innerHeight;
    return basis ? `${((value / basis) * 100).toFixed(1)}%` : "0%";
  }

  function elementName(el) {
    if (!el) return "element";
    let name = el.tagName.toLowerCase();
    if (el.id) return `${name}#${el.id}`;
    const classes = [...el.classList].filter(Boolean).slice(0, 2);
    if (classes.length) name += `.${classes.join(".")}`;
    return name;
  }

  function positionLabel(x, y, text) {
    label.textContent = text;
    label.style.display = "block";
    const pad = 14;
    const width = label.offsetWidth || 220;
    const height = label.offsetHeight || 64;
    label.style.left = `${Math.max(pad, Math.min(x + 12, window.innerWidth - width - pad))}px`;
    label.style.top = `${Math.max(pad, Math.min(y + 12, window.innerHeight - height - pad))}px`;
  }

  function clearTransient() {
    outline.style.display = "none";
    box.style.display = "none";
    line.style.display = "none";
    label.style.display = "none";
  }

  function elementAt(x, y) {
    root.style.display = "none";
    const el = document.elementFromPoint(x, y);
    root.style.display = "block";
    return el;
  }

  function renderElement(el, x, y) {
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

    const summary = `${px(r.width)} × ${px(r.height)}`;
    const text = `${elementName(el)}  ${summary}\n${viewportPercent(r.width, "x")} viewport wide · x ${px(r.left)} · y ${px(r.top)}\npadding ${edges(cs, "padding")} · margin ${edges(cs, "margin")}${state.pinned ? "\nPinned · click anywhere to inspect another element" : "\nClick to pin · Ctrl/Cmd+C to copy"}`;
    state.lastMeasurement = `${elementName(el)} — ${summary}; viewport width ${viewportPercent(r.width, "x")}; position x ${px(r.left)}, y ${px(r.top)}; padding ${edges(cs, "padding")}; margin ${edges(cs, "margin")}`;
    positionLabel(x, y, text);
  }

  function inspectAt(x, y) {
    if (state.pinned && state.pinnedElement) {
      renderElement(state.pinnedElement, x, y);
      return;
    }
    renderElement(elementAt(x, y), x, y);
  }

  function pinInspect(x, y) {
    const el = elementAt(x, y);
    if (!el || el === document.documentElement || el === document.body) return;
    state.pinned = true;
    state.pinnedElement = el;
    renderElement(el, x, y);
    showToast("Measurement pinned");
  }

  function unpinInspect(x, y) {
    state.pinned = false;
    state.pinnedElement = null;
    inspectAt(x, y);
    showToast("Inspecting page");
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
    const text = `${px(width)} × ${px(height)}\n${viewportPercent(width, "x")} viewport wide × ${viewportPercent(height, "y")} viewport high`;
    state.lastMeasurement = `${px(width)} × ${px(height)}; ${viewportPercent(width, "x")} viewport wide × ${viewportPercent(height, "y")} viewport high`;
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
    const text = `${px(distance)} · ${angle.toFixed(1)}°\nΔx ${px(Math.abs(dx))} · Δy ${px(Math.abs(dy))}`;
    state.lastMeasurement = `${px(distance)} at ${angle.toFixed(1)}°; Δx ${px(Math.abs(dx))}; Δy ${px(Math.abs(dy))}`;
    positionLabel(end.x, end.y, text);
  }

  function onMove(e) {
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    crosshair.style.left = `${e.clientX}px`;
    crosshair.style.top = `${e.clientY}px`;

    if (state.mode === "inspect" && !state.dragging && !state.pinned) inspectAt(e.clientX, e.clientY);
    if (state.dragging && state.mode === "box") drawBox(e.clientX, e.clientY);
    if (state.dragging && state.mode === "distance") drawDistance(e.clientX, e.clientY);
  }

  function onDown(e) {
    if (e.button !== 0) return;

    if (state.mode === "inspect") {
      if (state.pinned) unpinInspect(e.clientX, e.clientY);
      else pinInspect(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

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
    state.pinned = false;
    state.pinnedElement = null;
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

  function onViewportChange() {
    if (state.mode === "inspect" && state.pinned && state.pinnedElement?.isConnected) {
      renderElement(state.pinnedElement, state.lastX, state.lastY);
    }
  }

  function stop() {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("mouseup", onUp, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("scroll", onViewportChange, true);
    window.removeEventListener("resize", onViewportChange, true);
    document.documentElement.classList.remove("rulr-active");
    root.remove();
    delete window.__RULR__;
  }

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("mousedown", onDown, true);
  document.addEventListener("mouseup", onUp, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("scroll", onViewportChange, true);
  window.addEventListener("resize", onViewportChange, true);

  window.__RULR__ = { setMode, stop, copyMeasurement };
})();
