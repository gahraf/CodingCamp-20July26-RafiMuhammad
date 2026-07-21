# Project Structure

```
/
├── index.html          # Single HTML page — all markup and DOM structure
├── css/
│   └── style.css       # All styles (design tokens, layout, components)
└── js/
    └── app.js          # All application logic
```

## File Responsibilities

### `index.html`
- Defines the full DOM structure: header, balance card, spending limit control, transaction form, transaction list, and chart
- Loads Chart.js and Inter font from CDN
- Includes an inline `<script>` in `<head>` to apply the saved theme before first paint (prevents flash)
- Loads `app.js` at the end of `<body>`

### `css/style.css`
Organized in numbered sections (mirrors `app.js` convention):
1. Design tokens — CSS custom properties for light mode (`:root`)
2. Design tokens — dark mode overrides (`[data-theme="dark"]`)
3. Reset & base styles
4. Layout (app shell)
5–16. Component styles (header, cards, form, list, chart, responsive breakpoints)

All visual values are CSS custom properties — nothing is hardcoded in component rules.

### `js/app.js`
Organized in numbered sections with clear single-responsibility functions:
1. Constants (`STORAGE_KEY_*`, `CATEGORY_COLORS`, `SORT_OPTIONS`)
2. State object (single source of truth)
3. Storage helpers (`loadStateFromStorage`, `saveTransactions`, etc.)
4. Pure helper/utility functions (formatting, sorting, grouping)
5. DOM references (`dom` object — all `getElementById` calls centralized here)
6. Chart.js instance variable
7–12. Render functions (one per UI section + `renderAll`)
13. State mutation functions (`addTransaction`, `deleteTransaction`, etc.)
14. Validation (pure, no DOM access)
15. Form UI helpers (error display/clear)
16. Security helper (`escapeHtml`)
17. Event handlers (one per user action)
18. Event listener registration (`attachEventListeners`)
19. `init()` — entry point

## Architecture Pattern
Unidirectional data flow: **user action → mutate state → save to storage → renderAll**

- `state` is the single source of truth; the DOM is always a reflection of it
- Event handlers never mutate state directly — they call mutation functions
- Render functions only read from state; they never write to it
- All `localStorage` access is isolated in the storage section (section 3)
- User input inserted into `innerHTML` must always be passed through `escapeHtml()`

## Naming Conventions
- **CSS**: BEM-style — block (`transaction-item`), element (`transaction-item__name`), modifier (`transaction-item__delete`)
- **CSS custom properties**: `--color-*`, `--space-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--transition-*`
- **JS functions**: camelCase, verb-prefixed (`renderBalance`, `handleFormSubmit`, `saveTransactions`)
- **JS constants**: SCREAMING_SNAKE_CASE
- **Transaction IDs**: `${Date.now()}-${random}` string

## Adding New Categories
1. Add the option to the `<select id="category">` in `index.html`
2. Add a color entry to `CATEGORY_COLORS` in `app.js`
3. Add CSS custom properties for the badge (light bg + text color) in both `:root` and `[data-theme="dark"]` blocks in `style.css`
4. Add a `.category-badge--<slug>` rule in the category badge section of `style.css`
