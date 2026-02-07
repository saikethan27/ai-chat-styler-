/**
 * Generic Adapter
 * Universal markdown detection for any site
 */

const genericAdapter = {
  name: 'generic',
  hostMatch: /.*/,
  responseContainerSelector: [
    '.markdown-body',        // GitHub, many apps
    '.markdown',             // Common class
    '[class*="markdown"]',   // Fuzzy match
    '.prose',                // Tailwind prose
    '.msg-text',             // Various chat UIs
    '.message-content',      // Common pattern
    'article',               // Generic article content
  ].join(', '),

  /**
   * Detect if the page is in dark mode
   * @returns {boolean}
   */
  detectDarkMode: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      || document.documentElement.classList.contains('dark')
      || document.body.classList.contains('dark')
      || document.documentElement.getAttribute('data-theme') === 'dark'
      || document.body.getAttribute('data-theme') === 'dark';
  },

  excludeSelectors: [],
  initialDelayMs: 200,
};

export default genericAdapter;
