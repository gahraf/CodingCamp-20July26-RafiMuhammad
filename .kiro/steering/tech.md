# Tech Stack

## Runtime & Language
- Vanilla JavaScript (ES2020+) — no framework, no build step
- HTML5, CSS3
- Runs entirely in the browser

## External Dependencies (CDN)
- **Chart.js 4.4.0** — pie chart rendering (`https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`)
- **Inter** (Google Fonts) — primary typeface

## Storage
- `localStorage` only — no server, no database, no network requests at runtime

## Browser APIs Used
- `localStorage` for persistence
- `Intl.NumberFormat` with `id-ID` locale for IDR currency formatting
- `Date.toISOString()` for transaction timestamps

## No Build System
There is no bundler, transpiler, package manager, or test runner. Files are served directly as static assets.

## Common Commands
| Task | Command |
|------|---------|
| Run locally | Open `index.html` in a browser, or serve with any static file server |
| Quick static server (Python) | `python -m http.server 8080` |
| Quick static server (Node) | `npx serve .` |

No `npm install`, no compilation step, no build artifacts.
