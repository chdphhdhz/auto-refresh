# Random Range Auto Refresh

[中文](README.md)

A lightweight Chrome extension that refreshes a target tab at random intervals within a user-defined range. The extension uses Manifest V3 and shows the remaining seconds on the extension badge.

## Features

- Random refresh interval between a minimum and maximum number of seconds.
- Default interval range: 8 to 10 seconds.
- Badge countdown on the extension icon.
- Persistent settings with `chrome.storage.local`.
- Manifest V3 service worker scheduling with local timers and `chrome.alarms`.
- Start and stop controls from the popup.
- No external dependencies or build step.

## Project Structure

```text
auto-refresh/
├── AGENTS.md
├── README.md
├── README.en.md
├── README.zh.md
├── background.js
├── manifest.json
├── popup.html
├── popup.js
└── refresh.png
```

## Files

- `manifest.json`: Chrome extension manifest, permissions, popup, icons, and service worker registration.
- `background.js`: Core scheduling logic, tab refresh handling, badge countdown, and persisted runtime state.
- `popup.html`: Extension popup UI.
- `popup.js`: Popup input handling, validation, saved settings, and background messaging.
- `refresh.png`: Extension icon.
- `AGENTS.md`: Project notes and collaboration instructions.

## Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. The extension should appear in the Chrome toolbar.

## Usage

1. Click the extension icon.
2. Enter a minimum and maximum refresh interval in seconds.
3. Click **Start Random Refresh**.
4. The popup closes, and the extension badge shows the countdown.
5. When the countdown reaches zero, the target tab is refreshed.
6. Click the extension icon again and choose **Stop Refresh** to stop the loop.

## Runtime Behavior

When refresh starts, the extension records the currently active tab as the target tab. Future refreshes prefer that recorded tab. If the target tab is closed or unavailable, the extension falls back to the active tab in the last focused window.

The extension stores its running state, interval range, target tab information, and next refresh timestamp in `chrome.storage.local`. It also uses `chrome.alarms` to help recover scheduling when the Manifest V3 service worker is suspended by Chrome.

## Validation

This project has no automated test suite. Use these commands for basic syntax checks:

```powershell
node --check background.js
node --check popup.js
Get-Content -Encoding UTF8 manifest.json | ConvertFrom-Json | Out-Null
```

Then reload the unpacked extension in Chrome and verify the popup, countdown badge, start action, refresh behavior, and stop action manually.

## Notes

- Refreshing a page can discard unsaved form data.
- Very short intervals rely on the service worker staying alive long enough for local timers to fire.
- `chrome.alarms` is used as a persistence and recovery mechanism for Manifest V3 service worker lifecycle behavior.
- The extension is designed to run without npm, bundlers, or third-party libraries.
