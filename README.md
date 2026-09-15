# RULR

Measure anything on the web.

RULR is a lightweight Chrome extension for measuring element sizes, distances, spacing, and positions directly on any webpage. It is designed to be useful for both everyday users and developers without requiring DevTools.

## V0.1 MVP

- **What size is this?** — hover over a page element to see its width and height
- **Box measure** — click and drag to measure any rectangular area
- **Distance measure** — measure distance, angle, horizontal offset, and vertical offset between two points
- **Viewport context** — see measurements as a percentage of the viewport
- **Padding inspection** — inspect computed padding for hovered elements
- **High-contrast guides** — white measurement guides with dark edging plus a contrast-aware crosshair for visibility over light, dark, image, and gradient backgrounds
- **Axis lock** — hold `Shift` while measuring
- **Copy measurement** — press `Ctrl/Cmd + C`
- **Quick modes** — `I` for inspect, `B` for box, `D` for distance
- **Exit** — press `Esc`

## Privacy

RULR performs measurements locally in your browser. The extension does not require an account, analytics, tracking, ads, or external network requests.

## Install locally

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the root `RULR` folder containing `manifest.json`.
6. Pin RULR to the Chrome toolbar if desired.

## Use

Click the RULR extension icon and choose a measurement mode. You can switch modes while RULR is active with the keyboard shortcuts above.

Chrome does not allow extensions to inject scripts into certain protected pages such as `chrome://` pages or the Chrome Web Store.

## Roadmap

Planned improvements include spacing detection between neighboring elements, richer element metadata, screenshot export, snap-to-element behavior, unit conversion, and additional accessibility refinements.

## License

MIT
