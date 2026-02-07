# Roadmap: Claude UI/UX Chrome Extension

**Project:** Claude UI/UX Chrome Extension
**Created:** 2026-02-07
**Milestone:** v1.0 — Core Extension with Gemini & Kimi Support

---

## Phase 1: Foundation

**Goal:** Core extension scaffold, manifest, and CSS styling system

**Requirements:**
- CORE-01: Extension manifest (V3)
- CORE-02: Claude color palette injection
- CORE-03: Universal markdown restyling CSS
- CORE-04: Content script entry point

**Success Criteria:**
1. Extension loads in Chrome without errors
2. Local test page (test.html) displays all markdown elements with Claude styling
3. CSS variables from claude_index.css are properly injected
4. Scoped `.claude-styled` class applies correct styling

**Plans:**
1. Create manifest.json with V3 format and required permissions
2. Create content/claude-markdown.css with scoped styling rules
3. Create content/inject.js entry point
4. Create test.html with comprehensive markdown elements
5. Verify styling matches Claude aesthetic on test page

---

## Phase 2: Site Adapters

**Goal:** Site-specific DOM adapters for Gemini, Kimi, and generic fallback

**Requirements:**
- ADPT-01: Gemini adapter
- ADPT-02: Kimi adapter
- ADPT-03: Generic adapter

**Success Criteria:**
1. Gemini adapter correctly identifies markdown containers on gemini.google.com
2. Kimi adapter correctly identifies markdown containers on kimi.ai
3. Generic adapter works on GitHub READMEs and other markdown sites
4. Each adapter returns correct selectors and dark mode detection
5. Adapters are loaded based on hostname matching

**Plans:**
1. Create content/adapters/gemini.js with verified selectors from web_elements.md
2. Create content/adapters/kimi.js with verified selectors
3. Create content/adapters/generic.js with fallback selectors
4. Update inject.js to load appropriate adapter based on hostname
5. Test each adapter on target site

---

## Phase 3: Dynamic Content

**Goal:** Handle streaming content with MutationObserver

**Requirements:**
- OBSV-01: MutationObserver with debouncing
- OBSV-02: Re-apply on new containers
- OBSV-03: Handle Gemini thinking transitions

**Success Criteria:**
1. Styles apply immediately when page loads
2. Streaming content gets styled as it appears (no flicker)
3. New messages in multi-turn conversations are styled
4. Performance: < 1ms overhead per mutation batch
5. Observer disconnects cleanly when extension is disabled

**Plans:**
- [x] 03-01-PLAN.md — Create MutationObserver module with debouncing and performance monitoring
- [x] 03-02-PLAN.md — Implement streaming content handling with incremental styling
- [x] 03-03-PLAN.md — Add Gemini thinking state transitions with visual feedback

**Status:** ✓ Complete (2026-02-07)

---

## Phase 4: UI & State Management

**Goal:** Popup UI and background service worker

**Requirements:**
- POPUP-01: ON/OFF toggle
- POPUP-02: Light/Dark theme selector
- POPUP-03: Status indicator
- BKGD-01: Service worker state management
- BKGD-02: Per-site state persistence
- BKGD-03: Badge updates

**Success Criteria:**
1. Popup displays current site status correctly
2. Toggle ON/OFF immediately applies/removes styling
3. Theme selector overrides auto-detected dark mode
4. Per-site settings persist across browser sessions
5. Extension badge shows active/inactive state

**Plans:**
1. Create popup/popup.html with toggle, theme selector, and status
2. Create popup/popup.css with Claude-styled UI
3. Create popup/popup.js for interaction handling
4. Create background.js service worker
5. Implement chrome.storage.sync for settings
6. Add badge icon updates based on active state

---

## Phase 5: Testing & Polish

**Goal:** Cross-site testing, performance validation, bug fixes

**Requirements:**
- TEST-01: Local test page
- TEST-02: Gemini streaming test
- TEST-03: Kimi streaming test
- TEST-04: Dark mode test
- TEST-05: Toggle OFF test

**Success Criteria:**
1. All markdown elements render correctly on test page
2. Gemini streaming responses style smoothly
3. Kimi streaming responses style smoothly
4. Dark mode auto-detection works on both sites
5. Toggle OFF completely removes all traces of styling
6. No console errors on any target site
7. Extension icon set created (16px, 48px, 128px)

**Plans:**
1. Create comprehensive test.html if not done in Phase 1
2. Test on Gemini with various markdown-rich prompts
3. Test on Kimi with various markdown-rich prompts
4. Test dark/light mode switching
5. Test toggle on/off functionality
6. Create extension icons
7. Final bug fixes and polish

---

## Summary

| Phase | Name | Requirements | Focus |
|-------|------|--------------|-------|
| 1 | Foundation | 4 | Manifest, CSS, test page |
| 2 | Site Adapters | 3 | Gemini, Kimi, generic adapters |
| 3 | Dynamic Content | 3 | MutationObserver, streaming |
| 4 | UI & State | 6 | Popup, background, storage |
| 5 | Testing & Polish | 5 | Cross-site testing, icons |

**Total:** 5 phases | 21 requirements | Target: Working extension on Gemini & Kimi

---

## Post-v1 Ideas

- ChatGPT-specific adapter (if needed)
- Perplexity adapter
- Copy button styling
- Keyboard shortcut
- Firefox port

---
*Last updated: 2026-02-07*
