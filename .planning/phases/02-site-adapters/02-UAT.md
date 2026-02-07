---
status: testing
phase: 02-site-adapters
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md
started: 2026-02-07
updated: 2026-02-07
---

## Current Test

number: 1
name: Gemini Adapter Detection
expected: |
  When visiting gemini.google.com, the extension console shows "Using adapter: gemini"
  and styled containers have the left border gradient indicator on hover.
awaiting: user response

## Tests

### 1. Gemini Adapter Detection
expected: When visiting gemini.google.com, console shows "Using adapter: gemini" and styled containers have left border gradient indicator on hover
result: pending

### 2. Gemini Thinking State Handling
expected: When Gemini shows "Thinking..." state, the container has reduced opacity and a "Thinking..." badge appears in top-right corner. When thinking completes, badge disappears and full styling applies with a flash animation
result: pending

### 3. Kimi Adapter Detection
expected: When visiting kimi.ai or kimi.com, console shows "Using adapter: kimi" and assistant responses (not user messages) get styled
result: pending

### 4. Kimi Streaming State Handling
expected: When Kimi is streaming a response, the container gets base styling immediately. When streaming completes, enhanced styling (headings, code blocks) is applied
result: pending

### 5. Generic Adapter on GitHub
expected: When viewing a GitHub README or markdown file, the extension activates and styles the markdown content with Claude styling
result: pending

### 6. Console Logging
expected: Opening browser dev console shows "[Claude UI Extension]" prefixed logs showing adapter selection, container discovery, and styling application
result: pending

### 7. Visual Indicators
expected: Hovering over styled containers shows a subtle left border gradient. In debug mode (add ?claude-ui-debug to URL), styled elements have colored outlines
result: pending

### 8. Popup Status Display
expected: Clicking the extension icon shows popup with current site hostname, adapter name, styled container count, and dark mode status
result: pending

### 9. Debug Mode Toggle
expected: In the popup, toggling debug mode enables/disables debug logging. Debug mode persists when reloading the page
result: pending

### 10. Status Badge
expected: When extension is active, a brief status badge appears showing adapter name and container count, then auto-hides after 5 seconds
result: pending

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
