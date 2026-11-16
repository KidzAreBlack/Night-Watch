// Night Watch — content script: applies the current settings to the page.
(() => {
  // IDs kept from v1 so an updated extension reuses these elements instead of adding more.
  const STYLE_ID = "tbr-style";
  const OVERLAY_ID = "tbr-overlay";

  let settings = null;
  let lastUrl = location.href;
  let styleEl = null;
  let overlayEl = null;

  const alive = () => !!chrome.runtime?.id; // false once the extension is reloaded/removed

  function ensureStyle() {
    if (!styleEl?.isConnected) {
      styleEl = document.getElementById(STYLE_ID) || Object.assign(document.createElement("style"), { id: STYLE_ID });
      (document.head || document.documentElement).appendChild(styleEl);
    }
    return styleEl;
  }

  // Created only when "Whole page" is used.
  function ensureOverlay() {
    if (!overlayEl?.isConnected) {
      overlayEl = document.getElementById(OVERLAY_ID);
      if (!overlayEl) {
        if (!document.body) return null;
        overlayEl = document.createElement("div");
        overlayEl.id = OVERLAY_ID;
        overlayEl.style.cssText =
          "position:fixed;inset:0;background:#000;pointer-events:none;z-index:2147483647;transition:opacity 120ms linear;opacity:0";
      }
      (document.fullscreenElement || document.body)?.appendChild(overlayEl);
    }
    return overlayEl;
  }

  function apply() {
    if (!settings) return;
    const level = NW.clamp(settings.brightness);
    const on = settings.enabled && level < 100;

    const css = on && settings.mode === "video" ? `video{filter:brightness(${level / 100})!important}` : "";
    const style = ensureStyle();
    if (style.textContent !== css) style.textContent = css;

    const opacity = on && settings.mode === "page" ? String(1 - level / 100) : "0";
    const overlay = opacity !== "0" ? ensureOverlay() : overlayEl || document.getElementById(OVERLAY_ID);
    if (overlay && overlay.style.opacity !== opacity) overlay.style.opacity = opacity;
  }

  async function refresh() {
    if (!alive()) return stop();
    try {
      settings = (await NW.load(location.href)).effective;
      apply();
    } catch {
      /* extension reloaded mid-call */
    }
  }

  // Re-add our elements if the site removes them. Only direct children of
  // <html>, <head> and <body> are watched, so busy chat doesn't trigger this.
  const watched = new WeakSet();
  const observer = new MutationObserver(() => {
    if (!alive()) return stop();
    watchParents();
    if (!styleEl?.isConnected || (overlayEl && !overlayEl.isConnected)) apply();
  });
  function watchParents() {
    for (const node of [document.documentElement, document.head, document.body]) {
      if (node && !watched.has(node)) {
        watched.add(node);
        observer.observe(node, { childList: true });
      }
    }
  }

  // Twitch and YouTube change pages without reloading; each page can have its own setting.
  function onNavigate() {
    if (!alive()) return stop();
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      refresh();
    }
  }
  window.navigation?.addEventListener("navigatesuccess", onNavigate);
  document.addEventListener("yt-navigate-finish", onNavigate);
  window.addEventListener("popstate", onNavigate);
  const timer = window.navigation ? null : setInterval(onNavigate, 1000); // fallback (Firefox)

  // Keep the overlay visible in fullscreen by moving it into the fullscreen element.
  function onFullscreen() {
    if (!overlayEl) return;
    const target = document.fullscreenElement || document.body;
    if (target && overlayEl.parentElement !== target) target.appendChild(overlayEl);
  }
  document.addEventListener("fullscreenchange", onFullscreen);

  function stop() {
    observer.disconnect();
    clearInterval(timer);
    window.navigation?.removeEventListener("navigatesuccess", onNavigate);
    document.removeEventListener("yt-navigate-finish", onNavigate);
    window.removeEventListener("popstate", onNavigate);
    document.removeEventListener("fullscreenchange", onFullscreen);
  }

  watchParents();
  chrome.storage.onChanged.addListener(refresh);
  refresh();
})();
