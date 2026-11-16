<p align="center">
  <img src="icons/icon128.png" width="96" alt="Night Watch icon" />
</p>

<h1 align="center">Night Watch</h1>

<p align="center">Dim Twitch and YouTube videos, or the whole page, with one slider.<br/>
Works in Chromium-based browsers (Chrome, Edge, Brave, Thorium, Opera) and Firefox.</p>

---

## Features

- **Brightness slider** (5–100%) with quick presets
- **Video only** (dims just the player) or **Whole page** (a click-through dark layer over everything)
- **Per-page settings:** by default Night Watch only dims the page you set it on, such as one
  Twitch channel or one YouTube video. Other pages are left alone.
- **Dev mode** (⚙ icon → Dev mode) for more control: settings for **This page**, **This site** or
  **All sites**, where the most specific one wins. Normal and dev mode keep separate settings.
- **Toolbar icon shows the state** of the current tab: colored = dimming, gray + `OFF` = off for
  this page, gray = site not supported
- Popup colors match the site: purple on Twitch, red on YouTube
- Changes apply instantly, with no page reload (even right after installing)
- Works in fullscreen and when switching channels or videos
- Keyboard shortcuts: `Alt+Shift+↓` dim more, `Alt+Shift+↑` dim less


## Install

### From the stores

Store links will be added here once the listings are approved:

- **Firefox**: Firefox Add-ons (addons.mozilla.org). Needs Firefox 140 or newer (Firefox for Android 142+).
- **Chrome and Chromium-based browsers**: Chrome Web Store. Edge, Brave, Opera, Vivaldi and Thorium can
  install from the Chrome Web Store too.

### Manually (from a release zip or your own build)

Download the latest files from the [Releases](../../releases) page.

### Chromium-based browsers (Chrome, Edge, Brave, Thorium, Opera)
1. Download `night-watch-chromium.zip` and unzip it.
2. Go to `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and pick the unzipped folder.
5. Pin Night Watch to your toolbar.

### Firefox (140 or newer)
- **Quick test:** go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**
  and pick `night-watch-firefox.xpi` (or `manifest.json` in the `Firefox` folder of the source).
  It's removed when Firefox closes.
- **Permanent:** Firefox only installs signed add-ons. Upload `night-watch-firefox.xpi` to
  [addons.mozilla.org](https://addons.mozilla.org/developers/) as an *unlisted* add-on to get it
  signed for free, or use Firefox Developer Edition with `xpinstall.signatures.required` set to
  `false` in `about:config`.
- In `about:addons` → Night Watch → **Permissions**, make sure access to twitch.tv and
  youtube.com is on.

## Development

The main folder is the Chromium version and the one to edit. The `Firefox` folder is generated
from it.

```
python build.py
```

This updates `Firefox/` and creates release packages in `dist/`:
`night-watch-chromium.zip` and `night-watch-firefox.xpi`.

| File | What it does |
| --- | --- |
| `manifest.json` | Extension settings (name, version, permissions) |
| `common.js` | Shared settings logic for both modes |
| `content.js` | Runs on Twitch/YouTube and applies the dimming |
| `background.js` | Keyboard shortcuts, toolbar icon state, setup on install |
| `popup.html` / `popup.js` | The popup window |
| `icons/` | Icons (`icon.svg` is the editable source) |

## License

[MIT](LICENSE)
