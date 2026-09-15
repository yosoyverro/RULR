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

async function ensureInjected(tabId) {
  const [{ result: active }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => Boolean(window.__RULR__)
  });

  if (!active) {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["src/content.css"]
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content.js"]
    });
  }
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

async function stopRulr() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id || isRestricted(tab.url)) return;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__RULR__?.stop()
    });
    window.close();
  } catch (error) {
    status.textContent = "RULR is not active here.";
  }
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => activate(button.dataset.mode));
});

document.getElementById("stop").addEventListener("click", stopRulr);
