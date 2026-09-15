const status = document.getElementById("status");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isRestricted(url = "") {
  return url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("https://chromewebstore.google.com/") ||
    url.startsWith("https://chrome.google.com/webstore/");
}

async function isInjected(tabId) {
  const [{ result: active }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => Boolean(window.__RULR__)
  });
  return active;
}

async function ensureInjected(tabId) {
  if (await isInjected(tabId)) return;
  await chrome.scripting.insertCSS({ target: { tabId }, files: ["src/content.css"] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content.js"] });
}

async function activate(mode) {
  try {
    const tab = await getActiveTab();
    if (!tab?.id || isRestricted(tab.url)) {
      status.textContent = "Chrome blocks extensions on this page.";
      return;
    }
    await ensureInjected(tab.id);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [mode],
      func: (nextMode) => window.__RULR__?.setMode(nextMode)
    });
    window.close();
  } catch (error) {
    status.textContent = "RULR could not start on this page.";
    console.error(error);
  }
}

async function runOnRulr(fn, args = []) {
  try {
    const tab = await getActiveTab();
    if (!tab?.id || isRestricted(tab.url) || !(await isInjected(tab.id))) {
      status.textContent = "Turn on a RULR mode first.";
      return null;
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args,
      func: fn
    });
    return result;
  } catch (error) {
    status.textContent = "RULR is not active here.";
    return null;
  }
}

async function stopRulr() {
  await runOnRulr(() => window.__RULR__?.stop());
  window.close();
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => activate(button.dataset.mode));
});

document.getElementById("stop").addEventListener("click", stopRulr);

document.getElementById("clear-guides").addEventListener("click", async () => {
  await runOnRulr(() => window.__RULR__?.clearGuides());
  status.textContent = "Guides cleared.";
});

document.getElementById("snap").addEventListener("change", async (event) => {
  await runOnRulr((enabled) => window.__RULR__?.setSnapToElements(enabled), [event.target.checked]);
});

document.getElementById("show-guides").addEventListener("change", async (event) => {
  await runOnRulr((visible) => window.__RULR__?.setGuidesVisible(visible), [event.target.checked]);
});

document.getElementById("guide-color").addEventListener("input", async (event) => {
  await runOnRulr((color) => window.__RULR__?.setGuideStyle({ color }), [event.target.value]);
});

document.getElementById("guide-width").addEventListener("change", async (event) => {
  await runOnRulr((width) => window.__RULR__?.setGuideStyle({ width }), [Number(event.target.value)]);
});

(async function hydrateControls() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id || isRestricted(tab.url) || !(await isInjected(tab.id))) return;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__RULR__?.getState()
    });
    if (!result) return;
    document.getElementById("snap").checked = result.snapToElements;
    document.getElementById("show-guides").checked = result.guidesVisible;
    document.getElementById("guide-color").value = result.guideColor;
    document.getElementById("guide-width").value = String(result.guideWidth);
  } catch {
    // Controls simply keep their defaults until RULR is active.
  }
})();
