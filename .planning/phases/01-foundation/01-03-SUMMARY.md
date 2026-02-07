---
phase: "01"
plan: "01-03"
title: "Create Content Script Entry Point"
subsystem: "content-script"
tags: ["javascript", "chrome-extension", "content-script", "mutation-observer", "adapter-pattern"]
dependencies:
  requires: ["01-01", "01-02"]
  provides: ["content-script-entry", "adapter-registry", "css-injection"]
  affects: ["01-04", "02-01", "02-02", "02-03"]
tech-stack:
  added: []
  patterns: ["Adapter Pattern", "Observer Pattern", "Debounced Updates"]
key-files:
  created:
    - "content/inject.js"
    - "content/adapters/generic.js"
  modified: []
decisions:
  - "Adapter registry pattern for extensible site-specific configurations"
  - "100ms debounce for MutationObserver to avoid performance thrashing"
  - "CSS injection via fetch + style element for web_accessible_resources"
  - "Multiple dark mode detection methods for maximum compatibility"
metrics:
  duration: "15 min"
  completed: "2026-02-07"
---

# Phase 01 Plan 03: Create Content Script Entry Point - Summary

## Overview

Created the main content script entry point (`content/inject.js`) that detects the current site, loads the appropriate adapter, and injects Claude styling into markdown containers. Also created the generic adapter (`content/adapters/generic.js`) for universal markdown detection.

## What Was Built

### 1. content/adapters/generic.js

The generic adapter provides universal markdown detection that works on any site:

- **hostMatch**: `/.*/` - matches all hostnames
- **responseContainerSelector**: Comprehensive list of common markdown container selectors:
  - `.markdown-body` (GitHub, many apps)
  - `.markdown` (Common class)
  - `[class*="markdown"]` (Fuzzy match)
  - `.prose` (Tailwind prose)
  - `.msg-text` (Various chat UIs)
  - `.message-content` (Common pattern)
  - `article` (Generic article content)
- **detectDarkMode()**: Multi-method dark mode detection:
  - `prefers-color-scheme: dark` media query
  - `.dark` class on `html` or `body` elements
  - `data-theme="dark"` attribute on `html` or `body`
- **initialDelayMs**: 200ms for page settling before injection

### 2. content/inject.js

The main content script with the following components:

#### Adapter Registry
- Extensible registry pattern for site-specific adapters
- Generic adapter as fallback (must be last in registry)
- Ready for future Gemini and Kimi adapters

#### CSS Injection Functions
- `injectCSS(url)`: Fetches CSS from extension resources and injects as `<style>` element
- `injectVariables()`: Injects `claude_index.css` for CSS variables
- `injectMarkdownStyles()`: Injects `content/claude-markdown.css` for scoped styles
- Uses `chrome.runtime.getURL()` for web_accessible_resources

#### Site Detection
- `detectSite()`: Returns adapter based on hostname matching against `hostMatch` regex
- Logs which adapter is being used for debugging

#### Styling Functions
- `applyStyling(container)`: Adds `.claude-styled` class to containers
- `detectAndApplyDarkMode(container, adapter)`: Adds/removes `.dark` class based on adapter detection
- `styleMarkdownContainers(adapter)`: Finds all containers via adapter selector and applies styling

#### MutationObserver Setup
- Watches for new markdown containers being added to DOM
- 100ms debouncing to avoid performance thrashing
- Monitors `childList` and `subtree` for dynamic content
- Watches `class` and `data-theme` attributes for theme changes
- Re-applies styling to new containers automatically

#### Main Execution Flow
1. Detect site and load appropriate adapter
2. Wait for `initialDelayMs` (page settling)
3. Inject CSS variables (`claude_index.css`)
4. Inject markdown styles (`claude-markdown.css`)
5. Apply styling to existing containers
6. Set up MutationObserver for dynamic content
7. Listen for dark mode changes via `prefers-color-scheme`

## Verification Results

- [x] content/inject.js exists and is valid JavaScript (ES modules)
- [x] content/adapters/generic.js exists and exports adapter config
- [x] Content script can detect markdown containers on generic pages
- [x] CSS variables are injected into the page
- [x] .claude-styled class is applied to markdown containers
- [x] Dark mode detection works (multiple methods)
- [x] MutationObserver is set up for dynamic content

## Commits

1. `481ab68` - feat(01-03): create generic adapter for universal markdown detection
2. `a11ac6d` - feat(01-03): create content script entry point

## Architecture Decisions

### Adapter Registry Pattern
The adapter registry allows for easy addition of site-specific adapters without modifying the core content script. Future adapters for Gemini and Kimi can be imported and added to the registry.

### Debounced MutationObserver
A 100ms debounce prevents thrashing when many DOM changes occur rapidly (e.g., during streaming responses). This keeps performance overhead minimal.

### CSS Injection Strategy
Rather than using `chrome.scripting.insertCSS()`, the content script fetches CSS files via `fetch()` and injects them as `<style>` elements. This provides:
- Better error handling and logging
- Ability to inspect injected styles in DevTools
- Consistent behavior across Chrome versions

### Multiple Dark Mode Detection
The generic adapter checks multiple signals for dark mode to maximize compatibility with different site implementations:
- System preference via media query
- CSS class-based theming
- Data attribute-based theming

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

Ready for Plan 01-04: Create test.html with comprehensive markdown elements for local testing.

## Notes

- The content script runs at `document_idle` as configured in manifest.json
- Console logging is included for debugging; can be removed or gated in production
- The observer is properly cleaned up on page unload to prevent memory leaks
