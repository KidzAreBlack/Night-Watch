// Night Watch — shared helpers for the content script, popup and background.
//
// Two independent modes, each with its own saved settings:
//   Normal (default)       only pages you set are dimmed      local  "n:page:<key>"
//   Dev (sync "devMode")   most specific level wins:
//                            page                             local  "page:<key>"
//                            site                             local  "site:<key>"
//                            all sites                        sync   enabled/brightness/mode
//
// Page keys look like "twitch.tv/<path>" or "youtube.com/watch?v=<id>".
// Always (re)defined so a re-injected script never uses a stale copy.
globalThis.NW = (() => {
  const DEFAULTS = Object.freeze({ enabled: true, brightness: 70, mode: "video" });
  const NORMAL_OFF = Object.freeze({ ...DEFAULTS, enabled: false });
  const SITES = ["twitch.tv", "youtube.com"];
  const MATCHES = SITES.map((s) => `*://*.${s}/*`);

  const clamp = (n) => Math.min(100, Math.max(5, Math.round(Number(n)) || 100));
  const pick = ({ enabled, brightness, mode }) => ({ enabled, brightness: clamp(brightness), mode });

  function siteKey(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return SITES.find((s) => host === s || host.endsWith("." + s)) || null;
    } catch {
      return null;
    }
  }

  function pageKey(url) {
    const site = siteKey(url);
    if (!site) return null;
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (site === "youtube.com" && path === "/watch" && u.searchParams.has("v")) {
      return `${site}/watch?v=${u.searchParams.get("v")}`;
    }
    return site + (site === "twitch.tv" ? path.toLowerCase() : path);
  }

  // Everything both modes need for a URL, in one read per storage area.
  async function load(url) {
    const site = url ? siteKey(url) : null;
    const page = site ? pageKey(url) : null;
    const [sync, local] = await Promise.all([
      chrome.storage.sync.get({ ...DEFAULTS, devMode: false }),
      page ? chrome.storage.local.get([`site:${site}`, `page:${page}`, `n:page:${page}`]) : {},
    ]);
    const siteSet = local[`site:${site}`] || null;
    const pageSet = local[`page:${page}`] || null;
    const all = pick(sync);
    const forSite = { ...all, ...siteSet };
    const forPage = { ...forSite, ...pageSet };
    const normal = { ...NORMAL_OFF, ...local[`n:page:${page}`] };
    return {
      dev: sync.devMode,
      siteKey: site,
      pageKey: page,
      site: siteSet, // dev: this site's own setting, if any
      page: pageSet, // dev: this page's own setting, if any
      view: { all, site: forSite, page: forPage }, // dev: values at each level
      activeScope: pageSet ? "page" : siteSet ? "site" : "all",
      normal, // normal mode: this page's values
      effective: sync.devMode ? forPage : normal, // what applies right now
    };
  }

  // scope: "all" | "site" | "page" (dev mode) or "normal"
  function keyFor(scope, url) {
    const site = siteKey(url || "");
    if (!site) return null;
    if (scope === "site") return `site:${site}`;
    if (scope === "page") return `page:${pageKey(url)}`;
    if (scope === "normal") return `n:page:${pageKey(url)}`;
    return null;
  }

  function save(scope, url, values) {
    if (scope === "all") return chrome.storage.sync.set(pick(values));
    const key = keyFor(scope, url);
    return key ? chrome.storage.local.set({ [key]: pick(values) }) : Promise.resolve();
  }

  function clear(scope, url) {
    const key = keyFor(scope, url);
    return key ? chrome.storage.local.remove(key) : Promise.resolve();
  }

  const setDev = (on) => chrome.storage.sync.set({ devMode: !!on });

  return { DEFAULTS, SITES, MATCHES, clamp, siteKey, pageKey, load, save, clear, setDev };
})();
