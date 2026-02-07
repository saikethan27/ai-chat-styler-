Based on the browser HTML you provided, here is the **corrected and aligned** JSON with accurate DOM selectors for Claude and Gemini. The Kimi selectors remain as verified since you didn't provide new HTML for it.

---

## Corrected JSON Data

```json
[
  {
    "siteName": "Kimi",
    "url": "https://www.kimi.com/share/19c36ff1-bcf2-822a-8000-0000a49feb7d",
    "selectors": {
      "markdownContainer": ".segment.segment-assistant .markdown-container",
      "headings": "h1, h2, h3",
      "codeBlock": ".segment-code, pre code.segment-code-inline, .syntax-highlighter.segment-code-content",
      "table": ".table.markdown-table table, .table-container table",
      "list": "ul[start], ol[start]"
    }
  },
  {
    "siteName": "Claude",
    "url": "https://claude.ai/share/dda52341-ec62-44df-a15d-a44672eef1df",
    "selectors": {
      "markdownContainer": "[data-is-streaming] .font-claude-response, .standard-markdown",
      "headings": "h1.text-text-100, h2.text-text-100, h3.text-text-100",
      "codeBlock": "pre.code-block__code, .group\\/copy pre",
      "table": "table.min-w-full, .overflow-x-auto table",
      "list": "ol.list-decimal, ul.list-disc, ol.flex, ul.flex"
    }
  },
  {
    "siteName": "Gemini",
    "url": "https://gemini.google.com/share/28e0ae4b91b0",
    "selectors": {
      "markdownContainer": "structured-content-container .markdown.markdown-main-panel, .message-content .markdown",
      "headings": "h1, h2, h3",
      "codeBlock": "code-block pre code.code-container, .formatted-code-block-internal-container code",
      "table": "table-block table, .table-content table",
      "list": "ol[start], ul"
    }
  }
]
```

---

## Detailed Analysis & Corrections

### ✅ Claude (Browser-Verified Corrections)

**Key findings from your HTML:**

| Element | Actual DOM Selector | Notes |
|---------|-------------------|-------|
| **Container** | `[data-is-streaming] .font-claude-response` or `.standard-markdown` | Assistant content uses `data-is-streaming="false"` attribute. Avoid `data-message-author-role` (not present in this structure). |
| **Headings** | `h1.text-text-100, h2.text-text-100, h3.text-text-100` | Uses utility classes `text-text-100` with specific font sizes (h1: `1.375rem`, h2: `1.125rem`, h3: `text-base`) |
| **Paragraphs** | `p.font-claude-response-body` | Has specific class `font-claude-response-body` |
| **Inline Code** | `code.border-border-300` or `code.rounded-\[0\.4rem\]` | Specific styling: `bg-text-200/5 border border-0.5 border-border-300 text-danger-000` |
| **Code Blocks** | `pre.code-block__code` | Wrapped in `.group\\/copy.bg-bg-000\\/50.border-border-400` container |
| **Blockquotes** | `blockquote.border-l-4.border-border-300\\/10` | Left border style: `ml-2 border-l-4 border-border-300/10 pl-4` |
| **Lists** | `ol.list-decimal, ul.list-disc` | Tailwind utility classes `list-decimal` / `list-disc` with `flex flex-col gap-1 pl-8` |
| **Tables** | `table.min-w-full` | Has `border-collapse text-sm leading-[1.7]`, headers use `<th>` with `border-b-0.5 border-border-300/60` |
| **HR** | `hr.border-border-200` | Class: `border-t-0.5 my-3 mx-1.5` |

**Verification Script:**
```javascript
// Claude - Highlight all assistant content
const selector = '[data-is-streaming="false"] .font-claude-response';
const els = document.querySelectorAll(selector);
console.log(`Found ${els.length} Claude response containers`);
els.forEach(el => { el.style.outline = "3px solid lime"; });
```

---

### ✅ Gemini (Browser-Verified Corrections)

**Key findings from your HTML:**

| Element | Actual DOM Selector | Notes |
|---------|-------------------|-------|
| **Container** | `structured-content-container .markdown.markdown-main-panel` | Main class is `markdown markdown-main-panel stronger enable-updated-hr-color` |
| **Headings** | `h1, h2, h3` | Plain semantic, but have `data-path-to-node` attributes |
| **Paragraphs** | `p[data-path-to-node]` | All content elements have `data-path-to-node` tracking attributes |
| **Bold/Italic** | `b[data-path-to-node], i[data-path-to-node]` | Inline formatting uses semantic `<b>` and `<i>` with data attributes |
| **Inline Code** | `code[data-path-to-node]` | Plain `<code>` tags within paragraphs |
| **Code Blocks** | `code-block .code-container` | Custom element `<code-block>` with class `code-container formatted` inside `<pre>` |
| **Blockquotes** | `blockquote` | Standard semantic, contains `p[data-path-to-node]` |
| **Lists** | `ol[start], ul` | Ordered lists have `start="1"` attribute; nested lists are inside `<li>` |
| **Tables** | `table-block table` | Custom element `<table-block>` wrapping standard `<table>` with `data-path-to-node` |
| **Links** | `a[externallink]` | Have `_nghost` attributes and `externallink` directive |

**Verification Script:**
```javascript
// Gemini - Highlight all response content
const selector = 'structured-content-container .markdown-main-panel';
const els = document.querySelectorAll(selector);
console.log(`Found ${els.length} Gemini markdown containers`);
els.forEach(el => { el.style.outline = "3px solid cyan"; });
```

---

### ✅ Kimi (No Change - Playwright Verified)

Your original Kimi selectors remain accurate based on the Playwright verification:
- Container: `.segment.segment-assistant` excludes user messages via `.segment-user`
- Uses Vue.js scoped styles (`data-v-*`) which are relatively stable
- Tables: `.table.markdown-table` wrapper structure confirmed

---

## Stability Recommendations

1. **Claude**: Use `[data-is-streaming]` attribute for assistant message detection rather than class names, as Tailwind utility classes (`text-text-100`, `bg-bg-000`) change frequently.

2. **Gemini**: The `data-path-to-node` attributes are stable for content traversal but may change on page reloads. Use structural selectors like `code-block > div > pre > code` for code blocks.

3. **All Sites**: Use `:not()` to exclude UI elements:
   ```css
   /* Exclude copy buttons, headers, etc */
   .font-claude-response pre:not(.copy-button),
   code-block pre:not(.copy-button)
   ```

Would you like me to generate the specific CSS rules for styling each platform based on these corrected selectors?