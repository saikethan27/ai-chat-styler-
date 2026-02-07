---
phase: 02
plan: 02-03
subsystem: content
tags: [javascript, adapters, content-script, injection]
requires:
  - 02-01 (Gemini adapter)
  - 02-02 (Kimi adapter)
provides:
  - Dynamic adapter loading based on hostname
  - Adapter selection with fallback
  - Enhanced styling with adapter selectors
  - Thinking/streaming state handling
affects:
  - 02-04 (Enhance generic adapter)
  - 03-01 (Dynamic content handling)
  - 04-01 (Popup UI)
tech-stack:
  added: []
  patterns:
    - Adapter registry pattern
    - Hostname-based routing
    - Dynamic import resolution
key-files:
  created: []
  modified:
    - content/inject.js
decisions:
  - Use global currentAdapter variable for state
  - Generic adapter only activates when markdown containers found
  - Console logging for debugging adapter selection
  - Specific adapters take priority over generic fallback
metrics:
  duration: 3m
  completed: 2026-02-07
---

# Phase 2 Plan 3: Update inject.js for Adapter Loading

## Summary

Updated `content/inject.js` to dynamically load and use the appropriate site adapter based on hostname matching. The script now imports all adapters (Gemini, Kimi, Generic), selects the correct one based on the current site's hostname, and applies adapter-specific styling with support for thinking states (Gemini) and streaming detection (Kimi).

## What Was Built

### Adapter Import System
- Imports all three adapters: `geminiAdapter`, `kimiAdapter`, `genericAdapter`
- Clean ES6 module imports from `./adapters/` directory

### Adapter Registry
- Central `adapterRegistry` array with priority ordering
- Specific adapters listed first (Gemini, Kimi)
- Generic adapter as fallback (must be last)

### Hostname-Based Selection
- `selectAdapter()` function tests hostname against each adapter's `hostMatch` regex
- Logs selected adapter name for debugging
- Falls back to generic adapter for unmatched sites

### Smart Activation
- `shouldActivate()` prevents generic adapter from running on non-markdown pages
- Only activates if markdown containers are actually found
- Specific adapters always activate on their matched domains

### Enhanced Styling
- `applyStyling()` uses adapter-specific selectors for headings, code blocks, tables, lists
- Handles thinking state for Gemini (waits before styling)
- Handles streaming state for Kimi (waits before styling)
- `isExcluded()` helper skips excluded elements per adapter config

### Dynamic Content Observer
- MutationObserver watches for new containers using adapter's selector
- Debounced restyling for performance
- Responds to theme changes via class/data-theme attribute monitoring

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Import all adapters | `3c824b4` |
| 2 | Create adapter registry and selection logic | `395219b` |
| 3 | Update initialization with shouldActivate logic | `4617a0e` |
| 4 | Update applyStyling with adapter selectors | `1e7c78c` |
| 5 | Update observer to use adapter selectors | `c2a7c4e` |

## Verification Results

- [x] inject.js imports all adapters (gemini, kimi, generic)
- [x] Adapter selection based on hostname works
- [x] Generic adapter used as fallback for unmatched sites
- [x] shouldActivate() prevents generic adapter on non-markdown pages
- [x] applyStyling() uses adapter-specific selectors (headings, codeBlocks, tables, lists)
- [x] Observer monitors for new containers using adapter selector
- [x] Console logging for adapter selection verification

## Key Code Changes

### Adapter Selection Logic
```javascript
function selectAdapter() {
  const hostname = window.location.hostname;
  for (const adapter of adapterRegistry) {
    if (adapter.hostMatch && adapter.hostMatch.test(hostname)) {
      console.log(`[Claude UI Extension] Using adapter: ${adapter.name}`);
      return adapter;
    }
  }
  return genericAdapter;
}
```

### Smart Activation
```javascript
function shouldActivate() {
  if (currentAdapter.name === 'generic') {
    const containers = document.querySelectorAll(currentAdapter.responseContainerSelector);
    if (containers.length === 0) return false;
  }
  return true;
}
```

### Adapter-Specific Styling
```javascript
function applyStylingToContainer(container) {
  const { selectors } = currentAdapter || {};
  if (selectors) {
    if (selectors.headings) {
      container.querySelectorAll(selectors.headings).forEach(el => {
        el.classList.add('claude-ui-heading');
      });
    }
    // ... codeBlocks, tables, lists
  }
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Architecture Decisions

1. **Global currentAdapter**: Used module-level variable for state rather than passing adapter through all functions. Simplifies function signatures and ensures consistency.

2. **Console logging prefix**: Standardized on `[Claude UI Extension]` for all logs to make debugging easier.

3. **Debounced observer**: 100ms debounce prevents excessive restyling during rapid DOM changes.

4. **Async state handling**: Thinking and streaming states return Promises, allowing non-blocking wait before styling.

## Next Phase Readiness

This plan enables:
- 02-04: Enhance generic adapter (now has proper loading mechanism)
- 03-01: Dynamic content handling (observer infrastructure in place)
- 04-01: Popup UI (adapter selection verified working)

## Self-Check: PASSED

- File modified: `content/inject.js` exists and contains all changes
- All 5 commits verified in git history
- Verification criteria all pass
