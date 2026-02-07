
# Claude UI/UX Chrome Extension — Plan

## Goal

Build a Chrome extension that re-styles **rendered markdown** on any website to match Claude's distinctive UI aesthetic. Primary targets are **Gemini** (`gemini.google.com`) and **Kimi** (`kimi.ai`), but the extension must work universally on any site that renders markdown in the DOM (ChatGPT, Perplexity, DeepSeek, etc.).

> We are **not** replacing entire chat layouts. We are re-skinning the **markdown output area** — headings, code blocks, lists, bold text, inline code, blockquotes, tables, and callout sections — using the Claude color palette and typography defined in `claude_index.css`.

---

## Claude's Signature Markdown Style (What We Replicate)

| Element | Claude Style |
|---|---|
| **Headings** | Warm dark foreground, heavier weight, extra spacing |
| **Bold text** | Orange-amber accent (`--primary`) instead of plain bold |
| **Inline code** | Warm cream bg (`--secondary`), rounded, orange-tinted border |
| **Code blocks** | Dark card bg (`--card` dark), warm border, clean mono font |
| **Bullet / numbered lists** | Orange bullet markers, indented with breathing room |
| **Blockquotes** | Left orange border, muted warm bg, italic feel |
| **Tables** | Warm border grid, header row with accent bg |
| **Links** | Orange-amber underline, hover glow |
| **Horizontal rules** | Subtle warm gradient line |
| **Paragraphs** | Warm foreground, generous line-height (1.6–1.75) |

---

## Project Structure

```
claude_ui-ux_in_other_websites/
├── manifest.json              # Chrome Extension Manifest V3
├── claude_index.css            # 🎨 Master Claude palette (CSS custom properties) — ALREADY EXISTS
├── content/
│   ├── inject.js              # Main content script — detects markdown, injects styles
│   ├── claude-markdown.css    # Universal markdown restyling rules (uses vars from palette)
│   ├── observer.js            # MutationObserver — handles streaming/dynamic content
│   └── adapters/
│       ├── generic.js         # Default adapter — works on any site
│       ├── gemini.js          # Gemini-specific DOM selectors & quirks
│       └── kimi.js            # Kimi-specific DOM selectors & quirks
├── popup/
│   ├── popup.html             # Toggle ON/OFF, site status, theme (light/dark)
│   ├── popup.css
│   └── popup.js
├── background.js              # Service worker — manages extension state
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── plan.md                    # This file
```

---

## ✅ Verified Web Elements (Browser-Tested)

> **Reference file:** [`web_elements.md`](./web_elements.md)

The DOM selectors for all three primary target sites have been **scraped and tested** directly in the browser. These verified selectors are the **source of truth** for adapter implementations.

### Verified Selectors Summary

| Site | Container Selector | Status |
|------|-------------------|--------|
| **Kimi** | `.segment.segment-assistant .markdown-container` | ✅ Playwright verified |
| **Claude** | `[data-is-streaming] .font-claude-response, .standard-markdown` | ✅ Browser verified |
| **Gemini** | `structured-content-container .markdown.markdown-main-panel, .message-content .markdown` | ✅ Browser verified |

### Verified Element Selectors

| Element | Kimi | Claude | Gemini |
|---------|------|--------|--------|
| **Headings** | `h1, h2, h3` | `h1.text-text-100, h2.text-text-100, h3.text-text-100` | `h1, h2, h3` |
| **Code Blocks** | `.segment-code, pre code.segment-code-inline` | `pre.code-block__code, .group\/copy pre` | `code-block pre code.code-container` |
| **Tables** | `.table.markdown-table table, .table-container table` | `table.min-w-full, .overflow-x-auto table` | `table-block table, .table-content table` |
| **Lists** | `ul[start], ol[start]` | `ol.list-decimal, ul.list-disc` | `ol[start], ul` |

### Stability Notes (from testing)

1. **Claude**: Use `[data-is-streaming]` attribute for assistant message detection — Tailwind utility classes change frequently
2. **Gemini**: The `data-path-to-node` attributes are stable; use structural selectors like `code-block > div > pre > code` for code blocks
3. **Kimi**: Vue.js scoped styles (`data-v-*`) are relatively stable

---

## Architecture

### 1. `claude_index.css` — The Single Source of Truth

This file **already exists** and contains the full Claude palette as CSS custom properties (light + `.dark` variants). All styling rules in `claude-markdown.css` reference these variables. **No hardcoded colors anywhere else.**

Key variables used:
- `--primary` → Orange-amber accent (bold text, borders, bullets)
- `--background` → Warm cream page bg
- `--foreground` → Warm dark text
- `--secondary` → Soft warm bg for inline code / highlights
- `--muted` / `--muted-foreground` → Subdued elements
- `--card` / `--card-foreground` → Code block backgrounds
- `--border` → Table/blockquote borders
- `--font-sans`, `--font-mono` → Typography

### 2. `content/inject.js` — Content Script Entry Point

```
Flow:
1. On page load → detect which site we're on (hostname)
2. Load the correct adapter (gemini.js / kimi.js / generic.js)
3. Adapter returns: { containerSelector, markdownSelector, darkModeDetector }
4. Inject claude_index.css variables onto a scoped wrapper class
5. Inject claude-markdown.css rules targeting markdown elements inside that scope
6. Start MutationObserver to re-apply on new streamed content
```

### 3. Adapter Pattern — Site-Specific Selectors (Using Verified Elements)

Each adapter exports a config object using the **browser-verified selectors** from `web_elements.md`:

```js
// adapters/gemini.js — VERIFIED SELECTORS
export default {
  name: 'gemini',
  hostMatch: /gemini\.google\.com/,
  // ✅ Browser-verified container selector
  responseContainerSelector: 'structured-content-container .markdown.markdown-main-panel, .message-content .markdown',
  selectors: {
    headings: 'h1, h2, h3',
    codeBlock: 'code-block pre code.code-container, .formatted-code-block-internal-container code',
    table: 'table-block table, .table-content table',
    list: 'ol[start], ul',
  },
  detectDarkMode: () => document.documentElement.classList.contains('dark-theme'),
  excludeSelectors: ['.code-execution-result'],
  initialDelayMs: 500,
};
```

```js
// adapters/kimi.js — VERIFIED SELECTORS
export default {
  name: 'kimi',
  hostMatch: /kimi\.(ai|com)/,
  // ✅ Playwright-verified container selector
  responseContainerSelector: '.segment.segment-assistant .markdown-container',
  selectors: {
    headings: 'h1, h2, h3',
    codeBlock: '.segment-code, pre code.segment-code-inline, .syntax-highlighter.segment-code-content',
    table: '.table.markdown-table table, .table-container table',
    list: 'ul[start], ol[start]',
  },
  detectDarkMode: () => document.body.getAttribute('data-theme') === 'dark',
  excludeSelectors: ['.segment-user'], // Exclude user messages
  initialDelayMs: 300,
};
```

```js
// adapters/claude.js — VERIFIED SELECTORS (for reference/testing)
export default {
  name: 'claude',
  hostMatch: /claude\.ai/,
  // ✅ Browser-verified container selector
  responseContainerSelector: '[data-is-streaming] .font-claude-response, .standard-markdown',
  selectors: {
    headings: 'h1.text-text-100, h2.text-text-100, h3.text-text-100',
    codeBlock: 'pre.code-block__code, .group\\/copy pre',
    table: 'table.min-w-full, .overflow-x-auto table',
    list: 'ol.list-decimal, ul.list-disc, ol.flex, ul.flex',
    inlineCode: 'code.border-border-300, code.rounded-\\[0\\.4rem\\]',
    blockquote: 'blockquote.border-l-4.border-border-300\\/10',
  },
  detectDarkMode: () => document.documentElement.classList.contains('dark'),
  excludeSelectors: [],
  initialDelayMs: 200,
};
```

```js
// adapters/generic.js (fallback — works on any site)
export default {
  name: 'generic',
  hostMatch: /.*/,
  responseContainerSelector: [
    '.markdown-body',        // GitHub, many apps
    '.markdown',             // Common class
    '[class*="markdown"]',   // Fuzzy match
    '.prose',                // Tailwind prose
    '.msg-text',             // Various chat UIs
    '.message-content',      // Common pattern
  ].join(', '),
  detectDarkMode: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      || document.documentElement.classList.contains('dark')
      || document.body.classList.contains('dark');
  },
  excludeSelectors: [],
  initialDelayMs: 200,
};
```

### 4. `content/claude-markdown.css` — The Core Restyling

All rules scoped under `.claude-styled` class (injected by `inject.js`):

```css
.claude-styled h1, .claude-styled h2, .claude-styled h3 { ... }
.claude-styled strong, .claude-styled b { color: var(--primary); }
.claude-styled code:not(pre code) { /* inline code */ }
.claude-styled pre { /* code blocks */ }
.claude-styled ul li::marker, .claude-styled ol li::marker { color: var(--primary); }
.claude-styled blockquote { border-left: 3px solid var(--primary); }
.claude-styled table { ... }
.claude-styled a { color: var(--primary); }
```

Uses `!important` sparingly and only where site CSS uses high-specificity selectors.

### 5. `content/observer.js` — MutationObserver for Streaming

AI chat apps stream responses token-by-token. The observer:
- Watches the response container for `childList` and `subtree` changes
- Debounces (100ms) to avoid thrashing during streaming
- Re-applies `.claude-styled` class to new markdown containers
- Handles Gemini's "thinking" → "done" transition
- Handles Kimi's progressive rendering

### 6. `popup/` — User Controls

Simple popup with:
- **ON/OFF toggle** for current site
- **Light/Dark theme** selector (overrides site detection)
- **Status indicator** — "Active on gemini.google.com" / "No markdown detected"
- Settings stored in `chrome.storage.sync`

### 7. `background.js` — Service Worker

- Listens for tab updates to badge the icon (active/inactive)
- Manages per-site enabled/disabled state
- Handles extension install/update lifecycle

---

## CSS Injection Strategy

```
Step 1: Inject claude_index.css variables into a :root-level <style> tag
Step 2: Inject claude-markdown.css rules into a second <style> tag
Step 3: For each markdown container found by the adapter:
        → Add class "claude-styled"
        → If dark mode detected → also add class "dark" to the container
Step 4: MutationObserver keeps new containers styled
```

**Why scoped class instead of global?**
- Avoids breaking site navigation, menus, inputs
- Only affects markdown output areas
- Can be toggled per-container if needed

---

## Testing & Refinement Strategy

### Phase 1: Static Validation (Before loading on real sites)

1. Create a local `test.html` with every markdown element (h1–h6, bold, italic, code, code blocks, lists, nested lists, blockquotes, tables, links, images, hr)
2. Open in browser, inject the CSS manually, screenshot and compare against real Claude output
3. Iterate on `claude-markdown.css` until parity is close

### Phase 2: Gemini Testing (`gemini.google.com`)

| Step | Action | What to Check |
|------|--------|---------------|
| 2.1 | Load extension, open Gemini, send a prompt that generates rich markdown | Headings, bold, code blocks render with Claude palette |
| 2.2 | Check streaming — send a long response | Styles apply smoothly during streaming, no flicker |
| 2.3 | Check dark mode — toggle Gemini's dark theme | `.dark` variables kick in, no color clashing |
| 2.4 | Check code blocks with syntax highlighting | Extension styles don't break Gemini's syntax highlighter |
| 2.5 | Check multi-turn conversation | Older messages stay styled after new messages stream in |
| 2.6 | Check Gemini Canvas / artifacts | Exclude canvas areas — only style chat markdown |
| 2.7 | Test toggle OFF via popup | All Claude styling removed cleanly, original Gemini look restored |

**Gemini-Specific Gotchas to Handle:**
- Gemini uses Shadow DOM in some components → may need `::part()` or injecting into shadow roots
- Response containers change class names between Gemini versions → use fallback selectors
- "Show more" / collapsed responses need re-observation after expand

### Phase 3: Kimi Testing (`kimi.ai`)

| Step | Action | What to Check |
|------|--------|---------------|
| 3.1 | Load extension, open Kimi, generate rich markdown response | All markdown elements styled |
| 3.2 | Test streaming | Smooth style application during token-by-token rendering |
| 3.3 | Test dark/light toggle | Theme detection works via `data-theme` attribute |
| 3.4 | Test code blocks | Kimi's code block copy button still works, syntax highlighting coexists |
| 3.5 | Test file/image responses | Non-markdown content not affected |
| 3.6 | Test long conversations with scrolling | Performance OK, no layout shift |
| 3.7 | Toggle OFF | Clean removal |

**Kimi-Specific Gotchas to Handle:**
- Kimi uses `.markdown-body` (GitHub-flavored CSS) → high specificity battles
- Math rendering (KaTeX/MathJax) should not be affected
- Kimi's search results panel vs chat panel — only style chat

### Phase 4: Cross-Site Smoke Test

Test on 3–5 additional sites to validate the generic adapter:
- `chat.openai.com` (ChatGPT)
- `perplexity.ai`
- `github.com` (README markdown)
- `deepseek.com`

For each: load → generate markdown → check styling → check dark mode → toggle off.

### Phase 5: Performance & Edge Cases

| Test | Target |
|------|--------|
| MutationObserver overhead | < 1ms per mutation batch (measured via Performance API) |
| Memory usage | < 5MB additional after 1hr session |
| CSS injection size | Both CSS files combined < 15KB |
| No layout shifts (CLS) | Styles must not cause visible layout jumps |
| Works with other extensions | Test alongside uBlock Origin, Dark Reader (potential conflicts!) |
| CSP (Content Security Policy) | Some sites block injected styles → use `chrome.scripting.insertCSS` API |

### Phase 6: Refinement Loop

```
For each site:
  1. Screenshot BEFORE extension
  2. Screenshot AFTER extension
  3. Screenshot of real Claude with same prompt
  4. Compare AFTER vs Claude → identify gaps
  5. Adjust claude-markdown.css
  6. Re-test
  7. Repeat until satisfactory
```

---

## Prompt to Generate `claude-markdown.css` (for reference)

> "Using only CSS custom properties from `claude_index.css`, write a complete stylesheet that re-styles standard HTML markdown elements (h1-h6, p, strong, em, code, pre, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, a, hr, img) to match Claude's chat interface design. All rules must be scoped under `.claude-styled`. Use `!important` only where necessary. Support both light and dark mode via the existing `:root` / `.dark` variable sets. Prioritize: orange accent on bold text and borders, warm cream backgrounds, generous spacing, clean mono font for code."

---

## Key Technical Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Manifest version | V3 | Required for Chrome Web Store, modern APIs |
| CSS variables source | `claude_index.css` | Single source of truth, easy to update palette |
| Scoping strategy | `.claude-styled` class | Non-destructive, toggleable, won't break site UI |
| Site detection | Hostname regex in adapters | Simple, extensible, no over-engineering |
| Dynamic content | MutationObserver + debounce | Standard approach for SPA chat apps |
| Dark mode | Detect per-site + class toggle | Each site signals dark mode differently |
| Style injection | `chrome.scripting.insertCSS` + `<style>` tags | CSP-safe, works on most sites |

---

## Development Order

1. **`manifest.json`** + basic scaffold
2. **`claude-markdown.css`** + `test.html` → nail the styling first
3. **`inject.js`** + `generic.js` adapter → works on `test.html`
4. **`gemini.js` adapter** → test on Gemini, iterate selectors
5. **`kimi.js` adapter** → test on Kimi, iterate selectors
6. **`observer.js`** → handle streaming on both sites
7. **`popup/`** → toggle + status UI
8. **`background.js`** → badge, state management
9. **Phase 4–6** → cross-site testing, performance, polish

---

## File Reference

- **`claude_index.css`** — Color palette & design tokens (light + dark). **DO NOT modify** unless updating the Claude palette itself. All other CSS references these variables.











