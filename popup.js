// Night Watch — popup
const $ = (id) => document.getElementById(id);
const els = {
  enabled: $("enabled"),
  brightness: $("brightness"),
  value: $("value"),
  devMode: $("devMode"),
  scopeInfo: $("scopeInfo"),
  reset: $("reset"),
  modes: document.querySelectorAll("[data-mode]"),
  scopes: document.querySelectorAll("[data-scope]"),
};

let url = null; // current tab URL, only if it's a supported site
let state = null; // NW.load() result
let scope = "all"; // level being edited in dev mode
let showSettings = false;
let dragging = false;

const shown = () => (state.dev ? state.view[scope] : state.normal);
const canEdit = () => !!url || (state.dev && scope === "all");

// ----- Rendering -----
function render() {
  const { dev } = state;
  const s = shown();
  const editable = canEdit();

  $("devBadge").hidden = !dev;
  $("mainView").hidden = showSettings;
  $("settingsView").hidden = !showSettings;
  $("gear").classList.toggle("active", showSettings);
  els.devMode.checked = dev;
  $("devInfo").textContent = dev
    ? "On: choose This page, This site or All sites. Dev mode keeps its own settings, separate from normal mode."
    : "Off: Night Watch only changes the page you're on. Turn on for per-site and all-sites settings.";

  document.body.classList.toggle("unsupported", !editable);
  document.body.classList.toggle("off", !s.enabled);
  $("unsupportedNote").hidden = editable;
  els.enabled.disabled = !editable;
  els.enabled.checked = editable && s.enabled;
  if (!dragging) els.brightness.value = s.brightness;
  els.value.textContent = s.brightness + "%";
  els.modes.forEach((b) => b.classList.toggle("active", b.dataset.mode === s.mode));

  $("scopeSection").hidden = !dev;
  if (dev) renderScope();
}

function renderScope() {
  const st = state;
  els.scopes.forEach((b) => {
    const sc = b.dataset.scope;
    b.disabled = sc !== "all" && !url;
    b.classList.toggle("active", sc === scope);
    b.classList.toggle("custom", !!st[sc] && sc !== "all");
  });

  const B = (text) => ({ b: text });
  let info;
  if (!url) {
    info = ["Only All sites can be changed here."];
  } else if (scope === "page") {
    info = st.page
      ? ["Custom for ", B(st.pageKey)]
      : [B(st.pageKey), ` follows the ${st.site ? "site" : "all-sites"} setting. Change anything to give it its own.`];
  } else if (scope === "site") {
    info = st.site
      ? ["Custom for all of ", B(st.siteKey)]
      : [B(st.siteKey), " follows the all-sites setting. Change anything to give it its own."];
    if (st.page) info.push(" (This page has its own setting, so it won't change here.)");
  } else {
    info = ["Default for every site and page without its own setting."];
    if (st.activeScope !== "all") info.push(" (This tab uses its own setting.)");
  }
  els.scopeInfo.replaceChildren(
    ...info.map((part) =>
      typeof part === "string"
        ? document.createTextNode(part)
        : Object.assign(document.createElement("b"), { textContent: part.b })
    )
  );
  els.reset.hidden = scope === "all" || !st[scope];
}

// ----- Data -----
async function reload() {
  state = await NW.load(url);
  render();
}

function update(changes) {
  if (!canEdit()) return;
  const next = { ...shown(), ...changes };
  if (state.dev) state.view[scope] = next;
  else state.normal = next;
  render(); // optimistic; storage listener confirms
  return NW.save(state.dev ? scope : "normal", url, next);
}

// ----- Controls -----
// Slider: live preview, throttled writes (sync storage has write limits).
let writeTimer = null;
els.brightness.addEventListener("input", () => {
  dragging = true;
  const v = Number(els.brightness.value);
  els.value.textContent = v + "%";
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => update({ brightness: v, enabled: true }), state.dev && scope === "all" ? 250 : 40);
});
els.brightness.addEventListener("change", () => {
  dragging = false;
  clearTimeout(writeTimer);
  update({ brightness: Number(els.brightness.value), enabled: true });
});

els.enabled.addEventListener("change", () => update({ enabled: els.enabled.checked }));
document.querySelectorAll("[data-v]").forEach((b) =>
  b.addEventListener("click", () => update({ brightness: Number(b.dataset.v), enabled: true }))
);
els.modes.forEach((b) => b.addEventListener("click", () => update({ mode: b.dataset.mode })));
els.scopes.forEach((b) =>
  b.addEventListener("click", () => {
    if (b.disabled) return;
    scope = b.dataset.scope;
    render();
  })
);
els.reset.addEventListener("click", () => NW.clear(scope, url));

$("gear").addEventListener("click", () => {
  showSettings = !showSettings;
  render();
});
els.devMode.addEventListener("change", async () => {
  await NW.setDev(els.devMode.checked);
  await reload();
  scope = state.activeScope;
  render();
});

let reloadTimer = null;
chrome.storage.onChanged.addListener(() => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => !dragging && reload(), 50);
});

// ----- Start -----
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const site = tab?.url ? NW.siteKey(tab.url) : null;
  url = site ? tab.url : null;
  if (site) document.body.classList.add(site === "youtube.com" ? "youtube" : "twitch");
  state = await NW.load(url);
  scope = state.activeScope;
  render();
})();
