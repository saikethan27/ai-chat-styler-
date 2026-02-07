/**
 * Gemini Adapter
 * Specialized adapter for Google Gemini (gemini.google.com)
 * Handles thinking states, Shadow DOM components, and custom elements
 */

const geminiAdapter = {
  name: 'gemini',
  hostMatch: /gemini\.google\.com/,

  // Main container for markdown content
  // Verified selectors from web_elements.md
  responseContainerSelector: 'structured-content-container .markdown.markdown-main-panel, .message-content .markdown',

  // Selectors for markdown elements
  selectors: {
    headings: 'h1, h2, h3',
    codeBlocks: 'code-block pre code.code-container, .formatted-code-block-internal-container code',
    tables: 'table-block table, .table-content table',
    lists: 'ol[start], ul'
  },

  // Elements to exclude from processing
  excludeSelectors: [
    '.thinking-block',        // Exclude during thinking state
    '.placeholder-content',   // Loading placeholders
    '.loading-indicator',     // Loading spinners
    '.error-message'          // Error states
  ],

  // Initial delay for Gemini's dynamic content
  initialDelayMs: 300,

  /**
   * Detect dark mode on Gemini
   * @returns {boolean}
   */
  detectDarkMode() {
    // Check for dark mode class or computed style
    const isDark = document.body.classList.contains('dark-theme') ||
                   document.documentElement.classList.contains('dark-theme') ||
                   document.body.classList.contains('dark') ||
                   document.documentElement.classList.contains('dark') ||
                   document.documentElement.getAttribute('data-theme') === 'dark' ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark;
  },

  // Special handling for thinking state
  handleThinkingState: true,

  /**
   * Detect if element is in thinking state
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isThinking(element) {
    if (!element) return false;
    return element.closest('.thinking-block') !== null ||
           element.querySelector('.thinking-indicator') !== null ||
           element.querySelector('[data-thinking-state]') !== null;
  },

  /**
   * Wait for thinking to complete before applying final styling
   * @param {HTMLElement} element
   * @param {Object} options - Options object
   * @param {Function} options.onComplete - Callback when thinking completes
   * @param {number} options.timeout - Maximum wait time in ms
   * @returns {Promise<void>}
   */
  async waitForThinkingComplete(element, options = {}) {
    const { onComplete, timeout = 30000 } = options;

    if (!this.isThinking(element)) {
      if (onComplete) onComplete(element);
      return;
    }

    return new Promise((resolve) => {
      let resolved = false;

      const observer = new MutationObserver((mutations) => {
        if (!this.isThinking(element) && !resolved) {
          resolved = true;
          observer.disconnect();
          if (onComplete) onComplete(element);
          resolve();
        }
      });

      observer.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-thinking-state']
      });

      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          if (onComplete) onComplete(element);
          resolve();
        }
      }, timeout);
    });
  },

  /**
   * Observe thinking state changes on an element
   * @param {HTMLElement} element
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onThinkingStart - Called when thinking starts
   * @param {Function} callbacks.onThinkingComplete - Called when thinking completes
   * @returns {MutationObserver} The observer instance
   */
  observeThinkingState(element, callbacks = {}) {
    const { onThinkingStart, onThinkingComplete } = callbacks;

    const observer = new MutationObserver((mutations) => {
      const wasThinking = element.getAttribute('data-was-thinking') === 'true';
      const isThinking = this.isThinking(element);

      // Thinking started
      if (!wasThinking && isThinking && onThinkingStart) {
        element.setAttribute('data-was-thinking', 'true');
        onThinkingStart(element);
      }

      // Thinking completed
      if (wasThinking && !isThinking && onThinkingComplete) {
        element.removeAttribute('data-was-thinking');
        onThinkingComplete(element);
      }
    });

    // Set initial state
    element.setAttribute('data-was-thinking', this.isThinking(element).toString());

    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-thinking-state']
    });

    return observer;
  },

  /**
   * Handle Shadow DOM components
   * Some Gemini components use Shadow DOM for code blocks and tables
   * @param {HTMLElement} element
   * @returns {string|null} Shadow DOM content or null
   */
  getShadowContent(element) {
    if (element && element.shadowRoot) {
      return element.shadowRoot.innerHTML;
    }
    return null;
  },

  /**
   * Check if element has Shadow DOM
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  hasShadowRoot(element) {
    return element && !!element.shadowRoot;
  },

  /**
   * Get all markdown containers on the page
   * Override to handle Gemini's custom elements
   * @returns {NodeList}
   */
  getContainers() {
    return document.querySelectorAll(this.responseContainerSelector);
  },

  /**
   * Pre-process content before applying styles
   * Handles Gemini-specific transformations
   * @param {HTMLElement} container
   */
  preProcess(container) {
    // Handle code-block custom elements
    const codeBlocks = container.querySelectorAll('code-block');
    codeBlocks.forEach(block => {
      // Ensure code blocks are accessible for styling
      if (this.hasShadowRoot(block)) {
        // Shadow DOM content will be handled separately
        block.setAttribute('data-has-shadow', 'true');
      }
    });

    // Handle table-block custom elements
    const tableBlocks = container.querySelectorAll('table-block');
    tableBlocks.forEach(block => {
      if (this.hasShadowRoot(block)) {
        block.setAttribute('data-has-shadow', 'true');
      }
    });
  }
};

// Make adapter available globally
if (typeof window !== 'undefined') {
  window.geminiAdapter = geminiAdapter;
}
