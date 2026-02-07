---
phase: "04"
plan: "01"
subsystem: "background"
tags: ["chrome-extension", "service-worker", "state-management", "chrome-storage", "badge-api"]
dependencies:
  requires: ["manifest-v3"]
  provides: ["per-site-state", "badge-updates", "storage-persistence"]
  affects: ["04-02", "04-03", "05-01"]
tech-stack:
  added: []
  patterns: ["async-await", "chrome-storage-sync", "message-passing", "event-listeners"]
key-files:
  created: []
  modified:
    - background.js
decisions:
  - id: "D0401-001"
    text: "Use chrome.storage.sync for cross-device persistence"
    context: "Users expect settings to sync across their Chrome profile"
  - id: "D0401-002"
    text: "Badge shows 'OFF' text when disabled, clear when enabled"
    context: "Visual indicator of current site state without requiring popup open"
  - id: "D0401-003"
    text: "State structure uses nested sites object with global defaults"
    context: "Allows per-site overrides while maintaining consistent defaults"
  - id: "D0401-004"
    text: "Broadcast state changes to all tabs of same hostname"
    context: "Ensures consistent UI across multiple tabs of same site"
  - id: "D0401-005"
    text: "Graceful degradation on storage errors - return safe defaults"
    context: "Extension should not crash if storage fails"
metrics:
  duration: "15 minutes"
  completed: "2026-02-07"
---

# Phase 04 Plan 01: Background Service Worker State Management Summary

**One-liner:** Implemented full background service worker with per-site state management, chrome.storage.sync persistence, and automatic badge synchronization across tabs.

## What Was Built

### Core State Management API

The background.js now provides a complete state management system:

1. **getAllSettings()** - Retrieves complete settings object from chrome.storage.sync
2. **getSiteState(hostname)** - Returns { enabled, theme } for a specific hostname with global defaults fallback
3. **setSiteState(hostname, settings)** - Persists site settings and triggers badge/broadcast updates
4. **getTabsForHostname(hostname)** - Helper to query all tabs matching a hostname

### Badge Control System

- **updateBadge(tabId, enabled)** - Shows 'OFF' badge when disabled, clears when enabled
- **updateBadgeForTab(tabId)** - Updates badge based on tab's URL hostname
- **updateBadgeForHostname(hostname)** - Updates all tabs of a specific site
- Badge background color set to gray (#999999) when showing OFF

### Message Handlers

The service worker responds to these actions:
- `getSiteState` - Returns state for specific hostname
- `setSiteState` - Updates state and triggers updates
- `getAllSettings` - Returns complete settings object
- `updateBadge` - Direct badge control

### Event Listeners

- **chrome.tabs.onActivated** - Updates badge when user switches tabs
- **chrome.tabs.onUpdated** - Updates badge when page navigation completes
- **chrome.runtime.onInstalled** - Initializes default settings on first install
- **chrome.runtime.onMessage** - Handles all message passing

### State Broadcast System

When state changes via setSiteState:
1. Settings persisted to chrome.storage.sync
2. All matching tabs receive `stateChanged` message
3. All matching tabs have badge updated
4. Content scripts can react to state changes in real-time

## State Structure

```javascript
{
  sites: {
    "gemini.google.com": { enabled: true, theme: "auto" },
    "chat.openai.com": { enabled: false, theme: "dark" }
  },
  global: {
    defaultEnabled: true,
    defaultTheme: "auto"
  }
}
```

## Key Implementation Details

### Error Handling
- Storage operations wrapped in try/catch
- Graceful fallback to DEFAULT_STATE on errors
- Specific handling for QUOTA_BYTES_PER_ITEM errors
- Silent handling for tabs without content scripts

### Edge Cases Handled
- Non-HTTP(S) URLs (chrome://, file://) - badge cleared
- Tabs without URLs - skipped gracefully
- Missing permissions - logged but not thrown
- Content script not loaded - message fails silently

### Logging
All operations log with `[Claude UI Extension]` prefix:
- State changes logged with hostname and new settings
- Badge updates logged with tab ID and enabled state
- Tab activation/updates logged for debugging
- Errors logged with context

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | f2145b3 | Core state management with getSiteState, setSiteState, storage persistence |
| 2 | 0de81e5 | Tab tracking, badge synchronization, error handling |

## Files Modified

- **background.js** - Complete implementation replacing placeholder (296 lines)

## Verification Steps

1. Load extension in Chrome
2. Check service worker console for initialization log
3. Verify Application → Storage → Sync shows default settings
4. Test message: `chrome.runtime.sendMessage({ action: 'getSiteState', hostname: 'example.com' }, console.log)`
5. Toggle state and verify badge updates
6. Open multiple tabs to same site, verify state change broadcasts

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

This plan provides the foundation for:
- **04-02:** Popup UI for toggling site state
- **04-03:** Content script integration to query and react to state
- **05-01:** End-to-end testing of state flow

The background service worker is now ready to serve as the central state authority for the extension.

## Self-Check: PASSED

- [x] background.js exists and has complete implementation
- [x] Commit f2145b3 exists (Task 1)
- [x] Commit 0de81e5 exists (Task 2)
- [x] All functions documented with JSDoc
- [x] Error handling implemented throughout
- [x] LOG_PREFIX used for all console output
