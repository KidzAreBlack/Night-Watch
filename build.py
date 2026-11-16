#!/usr/bin/env python3
"""
Night Watch build script.

The main folder is the Chromium version (Chrome, Edge, Brave, Thorium, Opera) and
is the one to edit. This script:
  1. copies the code into Firefox/ and writes its Firefox manifest
  2. packages both versions into dist/ for a GitHub release:
       dist/night-watch-chromium.zip
       dist/night-watch-firefox.xpi

Usage:  python build.py        (Python 3.8+, no extra packages needed)
"""
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FIREFOX = ROOT / "Firefox"
DIST = ROOT / "dist"
CODE = ["common.js", "content.js", "background.js", "popup.html", "popup.js"]

FIREFOX_SETTINGS = {
    "id": "night-watch@local",  # change this before submitting to addons.mozilla.org
    "strict_min_version": "140.0",
    "data_collection_permissions": {"required": ["none"]},
}


def extension_files(folder):
    """Files that belong in the packaged extension (no docs, sources or tooling)."""
    yield folder / "manifest.json"
    for name in CODE:
        yield folder / name
    yield from sorted((folder / "icons").glob("*.png"))


def build_firefox(manifest):
    (FIREFOX / "icons").mkdir(parents=True, exist_ok=True)
    for name in CODE:
        shutil.copy2(ROOT / name, FIREFOX / name)
    for icon in (ROOT / "icons").glob("*.png"):
        shutil.copy2(icon, FIREFOX / "icons" / icon.name)

    ff = dict(manifest)
    ff["background"] = {"scripts": ["common.js", "background.js"]}
    ff["browser_specific_settings"] = {"gecko": FIREFOX_SETTINGS}
    (FIREFOX / "manifest.json").write_text(json.dumps(ff, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def pack(folder, dest):
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for f in extension_files(folder):
            z.write(f, f.relative_to(folder).as_posix())


def main():
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    build_firefox(manifest)
    DIST.mkdir(exist_ok=True)
    pack(ROOT, DIST / "night-watch-chromium.zip")
    pack(FIREFOX, DIST / "night-watch-firefox.xpi")
    print(f"Night Watch {manifest['version']} built:")
    print("  Firefox/  (updated)")
    print("  dist/night-watch-chromium.zip")
    print("  dist/night-watch-firefox.xpi")


if __name__ == "__main__":
    main()
