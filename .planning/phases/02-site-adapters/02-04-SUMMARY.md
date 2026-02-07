---
phase: 02
plan: 02-04
subsystem: adapters
tags: [javascript, adapter, generic, markdown-detection, confidence-scoring]
dependency-graph:
  requires:
    - 01-01 (Extension foundation)
    - 01-02 (Claude CSS)
    - 01-03 (Content script)
    - 01-04 (Adapter pattern)
  provides:
    - Smart markdown detection
    - Confidence-based activation
    - Container validation
    - Site-specific enhancements
  affects:
    - 02-05 (Logging and visual indicators)
    - 03-XX (Dynamic content handling)
tech-stack:
  added: []
  patterns:
    - Smart adapter activation with hasMarkdownContent()
    - Confidence scoring for false-positive prevention
    - Container validation to exclude navigation elements
    - Site-specific enhancement helpers
key-files:
  created: []
  modified:
    - content/adapters/generic.js
decisions:
  - id: D-02-04-001
    description: "Smart detection prevents activation on non-markdown pages"
    context: "Generic adapter matches any host, so must validate content before styling"
    alternatives:
      - "Always activate (would cause false positives)"
      - "Require explicit site list (defeats purpose of generic adapter)"
    tradeoffs: "Adds overhead of DOM queries, but prevents broken UX on non-markdown sites"
  - id: D-02-04-002
    description: "Confidence scoring enables gradual activation thresholds"
    context: "Different sites need different certainty levels before applying styles"
    alternatives:
      - "Binary yes/no detection"
    tradeoffs: "More complex but allows fine-tuning activation sensitivity"
  - id: D-02-04-003
    description: "Luminance-based dark mode detection as fallback"
    context: "Some sites don't use standard dark mode classes/attributes"
    alternatives:
      - "Only check classes and attributes"
    tradeoffs: "May have false positives on sites with dark backgrounds for other reasons"
  - id: D-02-04-004
    description: "Site-specific helpers add CSS classes for targeted styling"
    context: "GitHub, ChatGPT, Perplexity may need slight CSS adjustments"
    alternatives:
      - "Pure generic approach with no site knowledge"
    tradeoffs: "Slight coupling to site specifics, but enables better UX"
metrics:
  duration: "15 minutes"
  completed: "2026-02-07"
---

# Phase 02 Plan 04: Enhance Generic Adapter Summary

**One-liner:** Enhanced generic adapter with smart markdown detection, confidence scoring, and site-specific optimizations for GitHub, ChatGPT, and Perplexity.

## What Was Built

### Enhanced Generic Adapter (`content/adapters/generic.js`)

Comprehensive upgrade to the basic generic adapter with intelligent activation:

#### Smart Detection Features

1. **`hasMarkdownContent()`** - Validates that containers contain actual markdown elements (headings, code blocks, tables, lists) before activation

2. **`getConfidence()`** - Returns a score (0-100+) indicating certainty that the page should be styled:
   - GitHub: +50 for `.markdown-body`, +30 for `.readme`
   - ChatGPT: +50 for `.markdown`
   - Perplexity: +50 for `.prose`
   - Generic: +10 per container (max 30)
   - Content: +20 if markdown patterns detected

3. **`validateContainer()`** - Filters containers to exclude:
   - Navigation elements (nav, header, footer, aside, sidebar)
   - Empty containers (< 10 chars)
   - Containers without markdown elements

#### Enhanced Selectors

**Response container selectors** now cover:
- GitHub: `.markdown-body`, `.readme article`
- ChatGPT: `.markdown`, `[data-testid="conversation-turn"] .markdown`
- Perplexity: `.prose`, `.answer-content`
- Generic: `.markdown`, `.md-content`, `[class*="markdown"]`, `article.markdown`
- Documentation: `.doc-content`, `.documentation`, `.content-body`
- Common patterns: `.msg-text`, `.message-content`, `article`

**Markdown element selectors** for content validation:
- `headings`: `h1, h2, h3, h4, h5, h6`
- `codeBlocks`: `pre code, .highlight pre, .code-block`
- `tables`: `table`
- `lists`: `ul, ol`
- `blockquotes`: `blockquote`

#### Enhanced Dark Mode Detection

Multiple detection strategies (returns true if any match):
- Class-based: `dark`, `dark-mode`, `dark-theme` on body or html
- Attribute-based: `data-theme="dark"`, `data-color-mode="dark"`
- Media query: `prefers-color-scheme: dark`
- GitHub specific: `[data-color-mode="dark"]` element exists
- Luminance check: Computes body background color luminance, returns true if < 0.5

#### Site-Specific Helpers

```javascript
const siteHelpers = {
  github: { match: /github\.com/, enhance: (c) => c.classList.add('claude-ui-github') },
  chatgpt: { match: /chat\.openai\.com|chatgpt\.com/, enhance: (c) => c.classList.add('claude-ui-chatgpt') },
  perplexity: { match: /perplexity\.ai/, enhance: (c) => c.classList.add('claude-ui-perplexity') }
};
```

Exported `applySiteEnhancements()` function for use in `inject.js` to add site-specific CSS classes.

## Verification Results

All verification criteria met:

- [x] `hasMarkdownContent()` - Smart detection implemented
- [x] Multiple selector strategies - GitHub, ChatGPT, Perplexity, generic, documentation
- [x] `getConfidence()` - Confidence scoring for activation decisions
- [x] `validateContainer()` - Container validation before processing
- [x] Site-specific helpers - GitHub, ChatGPT, Perplexity with CSS class enhancement

## Architecture Decisions

### Decision: Smart Detection Required (D-02-04-001)

The generic adapter matches `/.*/` (any host), making it a catch-all fallback. Without smart detection, it would attempt to style every website, causing broken UX on non-markdown sites. The `hasMarkdownContent()` function ensures we only activate when actual markdown containers with content are found.

### Decision: Confidence Scoring (D-02-04-002)

Instead of binary yes/no, the adapter returns a confidence score. This allows the adapter loader to:
- Require higher confidence for unknown sites
- Accept lower confidence for known sites
- Gradually adjust thresholds based on real-world usage

### Decision: Luminance-Based Dark Mode (D-02-04-003)

Some sites (especially AI chat platforms) use dynamic theming that doesn't follow standard class/attribute conventions. The luminance check computes the actual background color and detects dark themes that might otherwise be missed.

### Decision: Site-Specific CSS Classes (D-02-04-004)

While the adapter is "generic," adding site-specific CSS classes (`claude-ui-github`, `claude-ui-chatgpt`, `claude-ui-perplexity`) allows the CSS to make minor adjustments per site without breaking the generic abstraction.

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| Task 2 | Enhance generic adapter with smart detection | d603ad9 |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

The enhanced generic adapter is ready for:

1. **Integration with adapter loader** - `getConfidence()` and `hasMarkdownContent()` can be called by the loader to decide activation
2. **Logging integration** - Confidence scores and detection results can be logged for debugging
3. **Visual indicators** - Site-specific CSS classes enable targeted visual indicator placement

## Self-Check: PASSED

- File `content/adapters/generic.js` exists and has been modified
- Commit `d603ad9` exists in git history
- All required functions implemented: `hasMarkdownContent()`, `getConfidence()`, `validateContainer()`, `detectDarkMode()`, `applySiteEnhancements()`
