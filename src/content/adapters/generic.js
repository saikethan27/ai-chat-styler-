/**
 * Generic Adapter
 * Universal markdown detection for any site with smart activation
 */

const genericAdapter = {
  name: 'generic',
  hostMatch: /.*/, // Matches any host

  // Multiple selector strategies for different sites
  responseContainerSelector: [
    // GitHub
    '.markdown-body',
    '.readme article',
    // ChatGPT
    '.markdown',
    '[data-testid="conversation-turn"] .markdown',
    // Perplexity
    '.prose',
    '.answer-content',
    // Generic markdown
    '.markdown',
    '.md-content',
    '[class*="markdown"]',
    'article.markdown',
    // Documentation sites
    '.doc-content',
    '.documentation',
    '.content-body',
    // Common chat/message patterns
    '.msg-text',
    '.message-content',
    'article'
  ].join(', '),

  // Selectors for markdown elements
  selectors: {
    headings: 'h1, h2, h3, h4, h5, h6',
    codeBlocks: 'pre code, .highlight pre, .code-block',
    tables: 'table',
    lists: 'ul, ol',
    blockquotes: 'blockquote'
  },

  // Elements to exclude
  excludeSelectors: [
    'nav',
    'header',
    'footer',
    'aside',
    '.sidebar',
    '.navigation',
    '.menu',
    'script',
    'style'
  ],

  initialDelayMs: 200,

  /**
   * Detect if the page is in dark mode
   * Uses multiple detection strategies for broad compatibility
   * @returns {boolean}
   */
  detectDarkMode() {
    // Check various dark mode indicators
    const checks = [
      // Class-based checks
      () => document.body.classList.contains('dark'),
      () => document.body.classList.contains('dark-mode'),
      () => document.body.classList.contains('dark-theme'),
      () => document.documentElement.classList.contains('dark'),
      () => document.documentElement.classList.contains('dark-mode'),
      () => document.documentElement.classList.contains('dark-theme'),
      // Attribute-based checks
      () => document.documentElement.getAttribute('data-theme') === 'dark',
      () => document.documentElement.getAttribute('data-color-mode') === 'dark',
      () => document.body.getAttribute('data-theme') === 'dark',
      // Media query
      () => window.matchMedia('(prefers-color-scheme: dark)').matches,
      // GitHub specific
      () => document.querySelector('[data-color-mode="dark"]') !== null,
      // Check computed background color
      () => {
        const bg = window.getComputedStyle(document.body).backgroundColor;
        // If background is dark, likely dark mode
        const rgb = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (rgb) {
          const [r, g, b] = rgb.slice(1).map(Number);
          // Simple luminance check
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          return luminance < 0.5;
        }
        return false;
      }
    ];

    return checks.some(check => {
      try {
        return check();
      } catch (e) {
        return false;
      }
    });
  },

  /**
   * Smart detection: check if page has markdown content
   * Only activates when markdown containers with actual content are found
   * @returns {boolean}
   */
  hasMarkdownContent() {
    // Check for markdown containers
    const containers = document.querySelectorAll(this.responseContainerSelector);
    if (containers.length === 0) return false;

    // Verify at least one container has actual markdown elements
    for (const container of containers) {
      const hasHeadings = container.querySelector(this.selectors.headings) !== null;
      const hasCodeBlocks = container.querySelector(this.selectors.codeBlocks) !== null;
      const hasTables = container.querySelector(this.selectors.tables) !== null;
      const hasLists = container.querySelector(this.selectors.lists) !== null;

      if (hasHeadings || hasCodeBlocks || hasTables || hasLists) {
        return true;
      }
    }

    return false;
  },

  /**
   * Get confidence score for this adapter on current page
   * Higher scores indicate more certainty that this is a markdown page
   * @returns {number}
   */
  getConfidence() {
    let score = 0;

    // Check for specific site patterns
    const hostname = window.location.hostname;

    // GitHub
    if (hostname.includes('github.com')) {
      if (document.querySelector('.markdown-body')) score += 50;
      if (document.querySelector('.readme')) score += 30;
    }

    // ChatGPT
    if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
      if (document.querySelector('.markdown')) score += 50;
    }

    // Perplexity
    if (hostname.includes('perplexity.ai')) {
      if (document.querySelector('.prose')) score += 50;
    }

    // Generic markdown detection
    const containers = document.querySelectorAll(this.responseContainerSelector);
    score += Math.min(containers.length * 10, 30);

    // Check for markdown patterns
    if (this.hasMarkdownContent()) score += 20;

    return score;
  },

  /**
   * Validate that a container should be processed
   * Filters out navigation, headers, footers, and empty containers
   * @param {Element} container
   * @returns {boolean}
   */
  validateContainer(container) {
    // Must not be inside excluded elements
    for (const exclude of this.excludeSelectors) {
      if (container.closest(exclude)) return false;
    }

    // Must have some content
    if (container.textContent.trim().length < 10) return false;

    // Must have some markdown-like elements
    const hasMarkdownElements =
      container.querySelector(this.selectors.headings) !== null ||
      container.querySelector(this.selectors.codeBlocks) !== null ||
      container.querySelector(this.selectors.tables) !== null ||
      container.querySelector(this.selectors.lists) !== null ||
      container.querySelector(this.selectors.blockquotes) !== null;

    return hasMarkdownElements;
  }
};

// Site-specific helper functions
const siteHelpers = {
  // GitHub-specific handling
  github: {
    match: /github\.com/,
    enhance(container) {
      // Add GitHub-specific enhancements
      container.classList.add('claude-ui-github');
    }
  },

  // ChatGPT-specific handling
  chatgpt: {
    match: /chat\.openai\.com|chatgpt\.com/,
    enhance(container) {
      // Add ChatGPT-specific enhancements
      container.classList.add('claude-ui-chatgpt');
    }
  },

  // Perplexity-specific handling
  perplexity: {
    match: /perplexity\.ai/,
    enhance(container) {
      // Add Perplexity-specific enhancements
      container.classList.add('claude-ui-perplexity');
    }
  }
};

/**
 * Apply site-specific enhancements to a container
 * @param {Element} container
 */
function applySiteEnhancements(container) {
  const hostname = window.location.hostname;

  for (const [name, helper] of Object.entries(siteHelpers)) {
    if (helper.match.test(hostname)) {
      helper.enhance(container);
      break;
    }
  }
}

// Make adapter available globally
if (typeof window !== 'undefined') {
  window.genericAdapter = genericAdapter;
  window.applySiteEnhancements = applySiteEnhancements;
}
