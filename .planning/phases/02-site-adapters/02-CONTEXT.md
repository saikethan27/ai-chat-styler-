# Phase 2: Site Adapters - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Create site-specific DOM adapters for Gemini (gemini.google.com) and Kimi (kimi.ai) that correctly identify markdown containers using verified selectors from web_elements.md. Update the generic adapter for universal markdown support. The adapters must handle site-specific quirks like Gemini's Shadow DOM and thinking states, Kimi's Vue.js scoped styles, and provide intelligent detection for the generic fallback.

</domain>

<decisions>
## Implementation Decisions

### Verification & Testing
- **Console logging**: Extension logs when it finds containers, applies styling, detects dark mode
- **Visual indicators**: Subtle borders or badges showing which elements are styled
- **Popup status**: Shows 'Active on [site]' with markdown container count
- **Testing tool**: Use Vercel's agent-browser CLI for automated browser testing

### Gemini-Specific Handling
- Style thinking blocks differently from final response
- Distinguish between thinking content and final response with different styling
- Handle Shadow DOM components that Gemini uses
- Wait for thinking → done transition before applying final styling

### Generic Adapter Scope
- **Smart detection**: Only activate if markdown containers are actually found on the page
- Don't style blindly — verify selectors match real elements
- Graceful fallback when no markdown detected

### Adapter Selection Strategy
- Hostname matching for specific sites (Gemini, Kimi)
- Generic adapter as fallback for unmatched sites
- Priority: specific adapters > generic adapter

### Claude's Discretion
- Exact selector specificity strategy
- Debounce timing for MutationObserver
- How to handle edge cases (empty containers, malformed markdown)

</decisions>

<specifics>
## Specific Ideas

- Use verified selectors from web_elements.md as source of truth
- Gemini adapter needs special handling for `code-block` custom elements
- Kimi adapter should use `.segment.segment-assistant .markdown-container` pattern
- Generic adapter should detect common markdown classes: `.markdown-body`, `.prose`, `.markdown`

</specifics>

<deferred>
## Deferred Ideas

- ChatGPT-specific adapter — Phase 5 or v2
- Perplexity adapter — Phase 5 or v2
- DeepSeek adapter — add to backlog
- User-configurable site selectors — future enhancement

</deferred>

---

*Phase: 02-site-adapters*
*Context gathered: 2026-02-07*
