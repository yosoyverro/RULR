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
    lastY: 0,
    spacingFirst: null,
    spacingSecond: null,
    spacingPinned: false
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

  const outline2 = document.createElement("div");
  outline2.className = "rulr-outline-secondary";
  outline2.style.display = "none";
  root.appendChild(outline2);

  const gapH = document.createElement("div");
  gapH.className = "rulr-gap-line horizontal";
  gapH.style.display = "none";
  root.appendChild(gapH);

  const gapV = document.createElement("div");
  gapV.className = "rulr-gap-line vertical";
  gapV.style.display = "none";
  root.appendChild(gapV);

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

  function setRect(node, r) {
    node.style.display = "block";
    node.style.left = `${r.left}px`;
    node.style.top = `${r.top}px`;
    node.style.width = `${r.width}px`;
    node.style.height = `${r.height}px`;
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
    outline2.style.display = "none";
    gapH.style.display = "none";
    gapV.style.display = "none";
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
    setRect(outline, r);

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

  function renderSpacing(first, second, x, y) {
    if (!first?.isConnected || !second?.isConnected || first === second) return;

    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    setRect(outline, a);
    setRect(outline2, b);

    const gapX = b.left > a.right ? b.left - a.right : a.left > b.right ? a.left - b.right : 0;
    const gapY = b.top > a.bottom ? b.top - a.bottom : a.top > b.bottom ? a.top - b.bottom : 0;

    gapH.style.display = "none";
    gapV.style.display = "none";

    if (gapX > 0) {
      const left = b.left > a.right ? a.right : b.right;
      const right = b.left > a.right ? b.left : a.left;
      const overlapTop = Math.max(a.top, b.top);
      const overlapBottom = Math.min(a.bottom, b.bottom);
      const yLine = overlapBottom >= overlapTop ? (overlapTop + overlapBottom) / 2 : (a.top + a.height / 2 + b.top + b.height / 2) / 2;
      gapH.style.display = "block";
      gapH.style.left = `${left}px`;
      gapH.style.top = `${yLine}px`;
      gapH.style.width = `${right - left}px`;
    }

    if (gapY > 0) {
      const top = b.top > a.bottom ? a.bottom : b.bottom;
      const bottom = b.top > a.bottom ? b.top : a.top;
      const overlapLeft = Math.max(a.left, b.left);
      const overlapRight = Math.min(a.right, b.right);
      const xLine = overlapRight >= overlapLeft ? (overlapLeft + overlapRight) / 2 : (a.left + a.width / 2 + b.left + b.width / 2) / 2;
      gapV.style.display = "block";
      gapV.style.left = `${xLine}px`;
      gapV.style.top = `${top}px`;
      gapV.style.height = `${bottom - top}px`;
    }

    const relation = gapX === 0 && gapY === 0 ? "Elements overlap" : `Horizontal gap ${px(gapX)} · Vertical gap ${px(gapY)}`;
    const status = state.spacingPinned ? "Pinned pair · click to start a new measurement" : "Click second element to pin pair";
    const text = `${elementName(first)} ↔ ${elementName(second)}\n${relation}\n${status}`;
    state.lastMeasurement = `${elementName(first)} to ${elementName(second)} — horizontal gap ${px(gapX)}, vertical gap ${px(gapY)}`;
    positionLabel(x, y, text);
  }

  function spacingAt(x, y) {
    if (!state.spacingFirst) return;
    const second = state.spacingPinned ? state.spacingSecond : elementAt(x, y);
    if (!second || second === state.spacingFirst || second === document.body || second === document.documentElement) return;
    renderSpacing(state.spacingFirst, second, x, y);
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
    if (state.mode === "spacing" && state.spacingFirst && !state.spacingPinned) spacingAt(e.clientX, e.clientY);
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

    if (state.mode === "spacing") {
      const el = elementAt(e.clientX, e.clientY);
      if (!el || el === document.documentElement || el === document.body) return;

      if (!state.spacingFirst || state.spacingPinned) {
        clearTransient();
        state.spacingFirst = el;
        state.spacingSecond = null;
        state.spacingPinned = false;
        setRect(outline, el.getBoundingClientRect());
        positionLabel(e.clientX, e.clientY, `${elementName(el)} selected\nHover another element to measure spacing`);
        showToast("First element selected");
      } else if (el !== state.spacingFirst) {
        state.spacingSecond = el;
        state.spacingPinned = true;
        renderSpacing(state.spacingFirst, el, e.clientX, e.clientY);
        showToast("Spacing pinned");
      }

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
    if (!["inspect", "spacing", "box", "distance"].includes(mode)) return;
    state.mode = mode;
    state.pinned = false;
    state.pinnedElement = null;
    state.spacingFirst = null;
    state.spacingSecond = null;
    state.spacingPinned = false;
    clearTransient();
    const names = {
      inspect: "What size is this?",
      spacing: "Spacing measure",
      box: "Box measure",
      distance: "Distance measure"
    };
    showToast(names[mode]);
  }

  function onKeyDown(e) {
    state.shift = e.shiftKey;
    if (e.key === "Escape") stop();
    if (e.key.toLowerCase() === "i") setMode("inspect");
    if (e.key.toLowerCase() === "s") setMode("spacing");
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
    if (state.mode === "spacing" && state.spacingFirst?.isConnected) {
      if (state.spacingPinned && state.spacingSecond?.isConnected) {
        renderSpacing(state.spacingFirst, state.spacingSecond, state.lastX, state.lastY);
      } else {
        setRect(outline, state.spacingFirst.getBoundingClientRect());
      }
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
