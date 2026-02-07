# Claude UI/UX Chrome Extension

## What This Is

A Chrome extension that re-styles rendered markdown on any website to match Claude's distinctive UI aesthetic. Primary targets are Gemini (gemini.google.com) and Kimi (kimi.ai), with universal support for any site rendering markdown including ChatGPT, Perplexity, DeepSeek, and GitHub READMEs.

The extension does not replace entire chat layouts — it re-skins only the markdown output area (headings, code blocks, lists, bold text, inline code, blockquotes, tables) using Claude's warm orange-amber color palette and typography.

## Core Value

Users can enjoy Claude's beautiful, readable markdown styling on any AI chat platform or markdown-enabled site with a single toggle.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **CORE-01**: Extension manifest (V3) with proper permissions
- [ ] **CORE-02**: Claude color palette CSS variables injected into pages
- [ ] **CORE-03**: Universal markdown restyling CSS (headings, bold, code, lists, blockquotes, tables, links)
- [ ] **CORE-04**: Content script to detect markdown containers and apply styling
- [ ] **ADPT-01**: Gemini adapter with verified DOM selectors
- [ ] **ADPT-02**: Kimi adapter with verified DOM selectors
- [ ] **ADPT-03**: Generic adapter for universal markdown support
- [ ] **OBSV-01**: MutationObserver for streaming/dynamic content updates
- [ ] **POPUP-01**: Popup UI with ON/OFF toggle for current site
- [ ] **POPUP-02**: Popup UI with light/dark theme selector
- [ ] **POPUP-03**: Status indicator showing active site and markdown detection
- [ ] **BKGD-01**: Background service worker for state management
- [ ] **BKGD-02**: Per-site enabled/disabled state persistence
- [ ] **TEST-01**: Local test page with all markdown elements
- [ ] **TEST-02**: Verified working on Gemini with streaming content
- [ ] **TEST-03**: Verified working on Kimi with streaming content

### Out of Scope

- **Real-time collaboration features** — Not core to styling functionality
- **Custom user themes beyond light/dark** — Claude palette only
- **Mobile browser support** — Chrome desktop only for v1
- **Firefox/Safari ports** — Chrome-only for v1
- **Automatic prompt enhancement** — Purely a styling extension
- **Content filtering or blocking** — Out of scope for a styling tool

## Context

- **claude_index.css** already exists with complete color palette (light + dark modes)
- **web_elements.md** contains browser-verified DOM selectors for Kimi, Claude, and Gemini
- **plan.md** contains detailed architecture and development order
- Extension uses scoped `.claude-styled` class to avoid breaking site UIs
- Adapters use hostname regex matching for site detection
- MutationObserver with debouncing handles token-by-token streaming content

## Constraints

- **Tech stack**: Chrome Extension Manifest V3, vanilla JavaScript, CSS custom properties
- **Browser**: Chrome desktop only (V3 APIs)
- **CSS size**: Both CSS files combined < 15KB
- **Performance**: MutationObserver overhead < 1ms per batch
- **CSP compatibility**: Use `chrome.scripting.insertCSS` API where needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manifest V3 | Required for Chrome Web Store, modern APIs | — Pending |
| Scoped `.claude-styled` class | Non-destructive, toggleable, won't break site UI | — Pending |
| Adapter pattern for site detection | Simple, extensible, hostname regex matching | — Pending |
| CSS variables from claude_index.css | Single source of truth, easy palette updates | — Pending |
| MutationObserver + debounce | Standard approach for SPA chat apps with streaming | — Pending |

---
*Last updated: 2026-02-07 after initialization*
