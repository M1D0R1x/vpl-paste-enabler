<p align="center">
  <img src="icons/icon128.png" width="72" alt="VPL Paste Enabler logo" />
</p>

<h1 align="center">VPL Paste Enabler</h1>

<p align="center">
  A Chrome / Chromium extension that bypasses copy-paste restrictions and auto-types clipboard content character-by-character into <strong>Ace Editor</strong> based coding portals (Moodle VPL, HackerRank, etc.)
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-v3-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/version-3.1-informational?style=flat-square" />
  <img src="https://img.shields.io/github/v/release/M1D0R1x/vpl-paste-enabler?style=flat-square&label=latest" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/contributions-welcome-brightgreen?style=flat-square" />
</p>

---

## ⬇️ Download

**Don't want to clone?** Grab the latest zip from the [Releases page](https://github.com/M1D0R1x/vpl-paste-enabler/releases/latest), unzip it, and load it via Chrome's developer mode.

> **Quick install:**
> 1. Download `vpl-paste-enabler-vX.Y.zip` from [Releases](https://github.com/M1D0R1x/vpl-paste-enabler/releases/latest)
> 2. Unzip it anywhere
> 3. Go to `chrome://extensions` → Enable **Developer mode** → **Load unpacked** → select the unzipped folder

---

## ✨ Features

| Feature | Details |
|---|---|
| **Paste Bypass** | Intercepts `paste`, `copy`, `cut`, `beforepaste` and `contextmenu` events — even on pages that block them — and lets your clipboard data through to the Ace Editor input |
| **Auto-Typer** | Reads your clipboard and types each character one-by-one into the editor at a configurable speed, defeating keystroke-logger style restrictions |
| **Copy from Editor** | Intercepts Ctrl+C / Cmd+C at the `keydown` level — bypasses Ace Editor's internal copy block and writes selected text (or full file) directly to clipboard |
| **Real-time speed control** | Change typing speed from the popup while a session is in progress — takes effect on the very next keystroke |
| **Randomize speed** | Adds ±20% jitter per keystroke for natural, human-like typing rhythm |
| **Progress bar** | Live character counter and percentage bar in the popup during auto-typing |
| **Cancel anytime** | Press `Esc` or click **Stop Typing** in the popup to abort immediately |
| **Custom shortcuts** | Remap Paste, Copy, and Auto-Typer shortcuts independently for Windows/Linux and macOS via the Settings page |
| **Visual indicator** | Subtle floating dot in the page corner shows Active / Typing / Done / Copied state |
| **Bookmarklet fallback** | For portals that block extension content scripts entirely, a standalone bookmarklet copies editor content with zero extension dependency |
| **All frames** | Content script runs in every iframe — works inside embedded VPL editors |
| **Manifest v3** | Fully MV3 compliant; no background service worker needed |

---

## 📦 Installation (Developer Mode)

> The extension is not on the Chrome Web Store. Load it manually.

**From a release zip (easiest):**
1. Go to [Releases](https://github.com/M1D0R1x/vpl-paste-enabler/releases/latest) and download `vpl-paste-enabler-vX.Y.zip`
2. Unzip it
3. Open Chrome → `chrome://extensions` → Enable **Developer mode**
4. Click **Load unpacked** → select the unzipped folder

**From source:**
```bash
git clone https://github.com/M1D0R1x/vpl-paste-enabler.git
```
Then follow steps 3–4 above, pointing to the cloned folder.

---

## 🚀 Usage

### Paste Bypass (automatic)
Just use `Ctrl + V` / `Cmd + V` as you normally would inside the editor. The extension silently intercepts the browser's paste block and inserts the clipboard text.

### Copy from Editor
Select text in the Ace editor and press `Ctrl + C` / `Cmd + C`. The extension intercepts at the `keydown` level before Ace can block it, reads the selection directly from the Ace API, and writes it to the clipboard. A purple **"✓ Copied"** flash appears on the indicator dot to confirm.

If nothing is selected, the full file contents are copied.

### Auto-Typer (popup)
1. Copy the code you want to type to your clipboard.
2. Click the extension icon to open the popup.
3. Choose a typing speed preset or enter a custom ms/char value.
4. Click **Start Auto-Typer** — it will begin typing into the focused editor.
5. To stop early, press `Esc` or click **Stop Typing**.

### Auto-Typer (keyboard shortcut)
| Platform | Default shortcut |
|---|---|
| Windows / Linux | `Ctrl + Shift + Y` |
| macOS | `Cmd + Shift + Y` |

> Shortcuts are fully remappable in **Settings → Custom Shortcuts**.

---

## 🔖 Bookmarklet Fallback

Some institutional portals (e.g. corporate Moodle deployments) block Chrome extension content scripts via strict security policies. In those cases the extension popup still works for **Auto-Typer** (paste direction), but copy from the editor needs the bookmarklet below.

**Save this as a browser bookmark** (right-click bookmarks bar → Add page → paste as URL):

```
javascript:(function(){const e=document.querySelectorAll('.ace_editor');if(!e.length){alert('No Ace editor found');return;}const ed=e[0].env&&e[0].env.editor;if(!ed){alert('Ace instance not found');return;}const sel=ed.getSelectedText()||ed.getValue();if(!sel){alert('Nothing to copy');return;}const t=document.createElement('textarea');t.value=sel;t.style.cssText='position:fixed;top:0;left:0;opacity:0.01;width:1px;height:1px;';document.body.appendChild(t);t.focus();t.select();const ok=document.execCommand('copy');document.body.removeChild(t);if(ok){console.log('VPL: Copied '+sel.length+' chars');}else{alert('Copy failed — try again');}})();
```

**How to use:**
1. Select code in the Ace editor (or select nothing to copy the entire file)
2. Click the `VPL Copy` bookmark in your bookmarks bar
3. Paste anywhere with `Ctrl + V` / `Cmd + V`

> The bookmarklet runs as the page itself so it is never blocked by extension content script restrictions.

---

## ⚙️ Settings

Open Settings via the gear icon in the popup footer or navigate to `chrome-extension://<id>/options.html`.

| Setting | Default | Description |
|---|---|---|
| Enable extension | On | Master switch — disables all behavior when off |
| Show visual indicator | On | Floating dot in the page corner |
| Typing speed | 75 ms/char | Delay between each keystroke |
| Randomize speed | Off | Adds ±20% jitter for human-like rhythm |
| Custom shortcuts | See above | Per-action, per-platform shortcut recorder |

---

## 📁 Project Structure

```
vpl-paste-enabler/
├── content.js        # All extension logic (content script + popup + options init)
├── manifest.json     # MV3 manifest
├── popup.html        # Toolbar popup UI
├── options.html      # Full settings page
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── .github/
    └── workflows/
        └── release.yml   # Auto-builds zip and publishes GitHub Release on tag push
```

---

## 🗺️ Roadmap

- [ ] Chrome Web Store release
- [ ] Firefox / WebExtensions port
- [ ] Dark / light theme toggle in popup
- [ ] Per-site enable/disable rules
- [ ] Export / import settings
- [ ] Keyboard shortcut conflict detection

---

## 📋 Changelog

### v3.1
- **Copy from editor fixed** — intercept Ctrl+C / Cmd+C at `keydown` (capture phase) before Ace Editor or page wrappers can block it; reads selection directly from Ace API and writes to clipboard via `navigator.clipboard.writeText` with `execCommand` fallback
- **Bookmarklet fallback** — added a zero-dependency bookmarklet for portals that block extension content scripts entirely (e.g. corporate Moodle / tekstac deployments); copies selected text or full file via `execCommand('copy')` from a temporary textarea
- **Copy indicator** — new purple "✓ Copied (N)" flash on the visual indicator dot confirms clipboard write succeeded
- **Cut shortcut** — same keydown intercept applied to Ctrl+X / Cmd+X
- **`copyEditorContent` message** — content script now handles a new message action from the popup to copy the entire editor value programmatically

### v3.0
- Full MV3 rewrite — single `content.js` file serves popup, options page, and content script
- Real-time speed sync: changing speed mid-session takes effect immediately without page reload
- Added randomize speed toggle (±20% jitter)
- Progress bar with char count and percentage in popup
- Cancel auto-typing via `Esc` key or Stop button
- Per-platform (Win/Mac) shortcut recorder in Settings
- Visual indicator now shows Typing (orange pulse) and Done (blue, fades after 2 s) states
- Grace period fix: popup no longer flickers back to idle right after clicking Start

### v2.x
- Introduced Auto-Typer with configurable speed presets
- Added popup UI with dark theme

### v1.x
- Initial release: basic paste bypass for Moodle VPL Ace Editor

---

## 🤝 Contributing

Contributions are welcome and appreciated! Whether it's a bug report, a feature idea, or a pull request — all of it helps.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR. For cutting a new release, see [RELEASING.md](RELEASING.md).

---

## 📄 License

[MIT](LICENSE) — free to use, modify, and distribute.
