// Night Watch — background: keyboard shortcuts, toolbar icon state, injection on install.
if (typeof importScripts === "function") importScripts("common.js"); // Chromium service worker

const supportedUrl = (url) => (url && NW.siteKey(url) ? url : null);

// ----- Keyboard shortcuts: ±10% on the setting the current tab uses -----
const STEPS = { "dim-more": -10, "dim-less": 10 };

chrome.commands.onCommand.addListener(async (command) => {
  const step = STEPS[command];
  if (!step) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = supportedUrl(tab?.url);
  const s = await NW.load(url);
  const scope = s.dev ? s.activeScope : "normal";
  if (scope !== "all" && !url) return;
  const current = s.dev ? s.view[scope] : s.normal;
  await NW.save(scope, url, { ...current, brightness: current.brightness + step, enabled: true });
});

// ----- Toolbar icon -----
// Colored = dimming this page · gray + "OFF" = off for this page · gray = unsupported site.
const icons = (suffix) => ({
  16: `icons/icon16${suffix}.png`,
  48: `icons/icon48${suffix}.png`,
  128: `icons/icon128${suffix}.png`,
});
const ICON_ON = icons("");
const ICON_OFF = icons("-off");

async function updateIcon(tab) {
  if (!(tab?.id >= 0)) return;
  const url = supportedUrl(tab.url);
  let active = false;
  if (url) {
    const { enabled, brightness } = (await NW.load(url)).effective;
    active = enabled && brightness < 100;
  }
  const title = !url
    ? "Night Watch (not available on this site)"
    : `Night Watch (${active ? "on" : "off"} for this page)`;
  try {
    await Promise.all([
      chrome.action.setIcon({ tabId: tab.id, path: active ? ICON_ON : ICON_OFF }),
      chrome.action.setBadgeText({ tabId: tab.id, text: url && !active ? "OFF" : "" }),
      chrome.action.setTitle({ tabId: tab.id, title }),
    ]);
  } catch {
    /* tab closed meanwhile */
  }
}

// Settings changes (e.g. dragging the slider) can come in bursts: update once they settle.
let allTimer = null;
function updateAllIcons() {
  clearTimeout(allTimer);
  allTimer = setTimeout(async () => {
    for (const tab of await chrome.tabs.query({ url: NW.MATCHES })) updateIcon(tab);
  }, 150);
}

chrome.action.setBadgeBackgroundColor({ color: "#5c5c66" });
chrome.tabs.onActivated.addListener(({ tabId }) => chrome.tabs.get(tabId).then(updateIcon, () => {}));
chrome.tabs.onUpdated.addListener((_id, info, tab) => {
  if (info.url || info.status === "complete") updateIcon(tab); // also catches in-page navigation
});
chrome.storage.onChanged.addListener(updateAllIcons);
chrome.runtime.onStartup.addListener(updateAllIcons);

// ----- Install / update / reload -----
// Add Night Watch to Twitch/YouTube tabs that are already open, so no refresh is needed.
chrome.runtime.onInstalled.addListener(async () => {
  updateAllIcons();
  for (const tab of await chrome.tabs.query({ url: NW.MATCHES })) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: ["common.js", "content.js"] })
      .catch(() => {}); // discarded or not-ready tabs are fine to skip
  }
});
