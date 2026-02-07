# Requirements: Claude UI/UX Chrome Extension

**Defined:** 2026-02-07
**Core Value:** Users can enjoy Claude's beautiful, readable markdown styling on any AI chat platform with a single toggle

## v1 Requirements

### Core Extension

- [x] **CORE-01**: Extension manifest (V3) with proper permissions (activeTab, scripting, storage)
- [x] **CORE-02**: Claude color palette CSS variables injected into pages via content script
- [x] **CORE-03**: Universal markdown restyling CSS covering: headings (h1-h6), bold/strong text, inline code, code blocks, lists (ul/ol), blockquotes, tables, links, horizontal rules
- [x] **CORE-04**: Content script entry point that detects site and loads appropriate adapter

### Site Adapters

- [x] **ADPT-01**: Gemini adapter with browser-verified DOM selectors
- [x] **ADPT-02**: Kimi adapter with browser-verified DOM selectors
- [x] **ADPT-03**: Generic adapter for universal markdown support (GitHub, ChatGPT, Perplexity, etc.)

### Dynamic Content

- [x] **OBSV-01**: MutationObserver with debouncing (100ms) for streaming content
- [x] **OBSV-02**: Re-apply styling when new markdown containers appear
- [x] **OBSV-03**: Handle "thinking" → "done" transitions on Gemini

### Popup UI

- [x] **POPUP-01**: ON/OFF toggle for current site
- [x] **POPUP-02**: Light/Dark theme selector (override auto-detection)
- [x] **POPUP-03**: Status indicator showing "Active on [site]" or "No markdown detected"

### Background Service

- [x] **BKGD-01**: Service worker managing extension state
- [x] **BKGD-02**: Per-site enabled/disabled state in chrome.storage.sync
- [x] **BKGD-03**: Badge icon updates (active/inactive state)

### Testing & Quality

- [ ] **TEST-01**: Local test page (test.html) with all markdown elements
- [ ] **TEST-02**: Verified working on Gemini with streaming responses
- [ ] **TEST-03**: Verified working on Kimi with streaming responses
- [ ] **TEST-04**: Dark mode detection and switching works correctly
- [ ] **TEST-05**: Toggle OFF cleanly removes all styling

## v2 Requirements

### Additional Adapters

- **ADPT-04**: ChatGPT-specific adapter (if generic doesn't work perfectly)
- **ADPT-05**: Perplexity-specific adapter
- **ADPT-06**: DeepSeek-specific adapter

### Enhanced Features

- **FEAT-01**: Copy button styling that matches Claude
- **FEAT-02**: Smooth transitions when toggling styles
- **FEAT-03**: Keyboard shortcut to toggle extension

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaboration | Not core to styling functionality |
| Custom user themes | Claude palette only for v1 |
| Mobile browser support | Chrome desktop only |
| Firefox/Safari ports | Chrome-only for v1 |
| Automatic prompt enhancement | Purely a styling extension |
| Content filtering/blocking | Out of scope |
| Math rendering (KaTeX/MathJax) styling | Complex, may conflict with site renderers |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Complete |
| CORE-02 | Phase 1 | Complete |
| CORE-03 | Phase 1 | Complete |
| CORE-04 | Phase 1 | Complete |
| ADPT-01 | Phase 2 | Complete |
| ADPT-02 | Phase 2 | Complete |
| ADPT-03 | Phase 2 | Complete |
| OBSV-01 | Phase 3 | Complete |
| OBSV-02 | Phase 3 | Complete |
| OBSV-03 | Phase 3 | Complete |
| POPUP-01 | Phase 4 | Complete |
| POPUP-02 | Phase 4 | Complete |
| POPUP-03 | Phase 4 | Complete |
| BKGD-01 | Phase 4 | Complete |
| BKGD-02 | Phase 4 | Complete |
| BKGD-03 | Phase 4 | Complete |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |
| TEST-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after Phase 4 completion*
