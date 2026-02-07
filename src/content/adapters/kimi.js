/**
 * Kimi Adapter
 * Specialized adapter for Kimi AI (kimi.ai / kimi.com)
 * Handles streaming states and segment-based message organization
 */

const kimiAdapter = {
  name: 'kimi',
  hostMatch: /kimi\.(ai|com)/,

  // Main container for markdown content in assistant responses
  // Verified selectors from web_elements.md
  responseContainerSelector: '.segment.segment-assistant .markdown-container',

  // Selectors for markdown elements
  selectors: {
    headings: 'h1, h2, h3',
    codeBlocks: '.segment-code, pre code.segment-code-inline, .syntax-highlighter.segment-code-content',
    tables: '.table.markdown-table table, .table-container table',
    lists: 'ul[start], ol[start]'
  },

  // Elements to exclude from processing
  excludeSelectors: [
    '.segment-user',          // User messages
    '.loading-indicator',     // Loading spinners
    '.placeholder-content'    // Loading placeholders
  ],

  // Initial delay for Kimi's dynamic content
  initialDelayMs: 200,

  /**
   * Detect dark mode on Kimi
   * @returns {boolean}
   */
  detectDarkMode() {
    // Check for dark mode class or computed style
    const isDark = document.body.classList.contains('dark') ||
                   document.body.classList.contains('dark-mode') ||
                   document.documentElement.classList.contains('dark') ||
                   document.documentElement.getAttribute('data-theme') === 'dark' ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark;
  },

  // Special handling for streaming state
  handleStreamingState: true,

  /**
   * Get all assistant response containers
   * @returns {NodeList}
   */
  getAllResponseContainers() {
    return document.querySelectorAll(this.responseContainerSelector);
  },

  /**
   * Check if content is still streaming
   * @param {HTMLElement} container
   * @returns {boolean}
   */
  isStreaming(container) {
    if (!container) return false;
    const segment = container.closest('.segment');
    return segment?.classList.contains('streaming') ||
           container.querySelector('.streaming-indicator') !== null;
  },

  /**
   * Wait for streaming to complete before applying final styling
   * @param {HTMLElement} container
   * @param {number} timeout - Maximum wait time in ms
   * @returns {Promise<void>}
   */
  async waitForStreamingComplete(container, timeout = 30000) {
    if (!this.isStreaming(container)) return;

    return new Promise((resolve) => {
      const segment = container.closest('.segment');
      if (!segment) {
        resolve();
        return;
      }

      const observer = new MutationObserver((mutations) => {
        if (!this.isStreaming(container)) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(segment, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });

      // Timeout fallback
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
    });
  },

  /**
   * Get all markdown containers on the page
   * @returns {NodeList}
   */
  getContainers() {
    return document.querySelectorAll(this.responseContainerSelector);
  },

  /**
   * Pre-process content before applying styles
   * Handles Kimi-specific transformations
   * @param {HTMLElement} container
   */
  preProcess(container) {
    // Mark streaming containers for special handling
    if (this.isStreaming(container)) {
      container.setAttribute('data-kimi-streaming', 'true');
    }

    // Ensure code blocks are properly marked
    const codeBlocks = container.querySelectorAll('.segment-code, pre code.segment-code-inline');
    codeBlocks.forEach(block => {
      block.setAttribute('data-kimi-code', 'true');
    });
  }
};

// Make adapter available globally
if (typeof window !== 'undefined') {
  window.kimiAdapter = kimiAdapter;
}
