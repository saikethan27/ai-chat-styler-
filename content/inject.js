/**
 * Content Script Entry Point
 * Detects site, loads appropriate adapter, and injects Claude styling
 */

import geminiAdapter from './adapters/gemini.js';
import kimiAdapter from './adapters/kimi.js';
import genericAdapter from './adapters/generic.js';

// ============================================================================
// Adapter Registry
// ============================================================================

/**
 * Registry of site-specific adapters
 * Add new adapters here as they're created
 */
const adapterRegistry = [
  // Future site-specific adapters will be added here
  // { name: 'gemini', adapter: geminiAdapter },
  // { name: 'kimi', adapter: kimiAdapter },
  genericAdapter, // Fallback - must be last
];

// ============================================================================
// CSS Injection
// ============================================================================

/**
 * Injects CSS from a URL into the page
 * @param {string} url - URL of the CSS file to inject
 * @returns {Promise<void>}
 */
async function injectCSS(url) {
  try {
    const cssUrl = chrome.runtime.getURL(url);
    const response = await fetch(cssUrl);

    if (!response.ok) {
      console.error(`[Claude UI] Failed to fetch CSS: ${url}`);
      return;
    }

    const cssText = await response.text();

    // Create style element
    const style = document.createElement('style');
    style.id = `claude-ui-${url.replace(/[^a-zA-Z0-9]/g, '-')}`;
    style.textContent = cssText;

    // Inject into document head
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }

    console.log(`[Claude UI] Injected CSS: ${url}`);
  } catch (error) {
    console.error(`[Claude UI] Error injecting CSS ${url}:`, error);
  }
}

/**
 * Injects CSS variables (claude_index.css)
 */
async function injectVariables() {
  await injectCSS('claude_index.css');
}

/**
 * Injects markdown styles (claude-markdown.css)
 */
async function injectMarkdownStyles() {
  await injectCSS('content/claude-markdown.css');
}

// ============================================================================
// Site Detection
// ============================================================================

/**
 * Detects which site we're on and returns the appropriate adapter
 * @returns {Object} The adapter for the current site
 */
function detectSite() {
  const hostname = window.location.hostname;

  // Find matching adapter based on hostname
  for (const adapter of adapterRegistry) {
    if (adapter.hostMatch.test(hostname)) {
      console.log(`[Claude UI] Using adapter: ${adapter.name} for ${hostname}`);
      return adapter;
    }
  }

  // Fallback to generic adapter (should always match due to /.*/)
  console.log(`[Claude UI] No specific adapter found, using generic for ${hostname}`);
  return genericAdapter;
}

// ============================================================================
// Styling Functions
// ============================================================================

/**
 * Applies .claude-styled class to a container
 * @param {HTMLElement} container - The container to style
 */
function applyStyling(container) {
  if (!container) return;

  if (!container.classList.contains('claude-styled')) {
    container.classList.add('claude-styled');
  }
}

/**
 * Detects dark mode and applies .dark class if needed
 * @param {HTMLElement} container - The container to check
 * @param {Object} adapter - The current adapter
 */
function detectAndApplyDarkMode(container, adapter) {
  if (!container || !adapter) return;

  const isDarkMode = adapter.detectDarkMode ? adapter.detectDarkMode() : false;

  if (isDarkMode) {
    if (!container.classList.contains('dark')) {
      container.classList.add('dark');
    }
  } else {
    container.classList.remove('dark');
  }
}

/**
 * Finds and styles all markdown containers on the page
 * @param {Object} adapter - The current adapter
 */
function styleMarkdownContainers(adapter) {
  if (!adapter || !adapter.responseContainerSelector) {
    console.warn('[Claude UI] No adapter or selector available');
    return;
  }

  const containers = document.querySelectorAll(adapter.responseContainerSelector);

  containers.forEach(container => {
    // Skip excluded elements
    if (adapter.excludeSelectors && adapter.excludeSelectors.length > 0) {
      const isExcluded = adapter.excludeSelectors.some(selector =>
        container.matches(selector) || container.closest(selector)
      );
      if (isExcluded) return;
    }

    applyStyling(container);
    detectAndApplyDarkMode(container, adapter);
  });

  if (containers.length > 0) {
    console.log(`[Claude UI] Styled ${containers.length} markdown container(s)`);
  }
}

// ============================================================================
// MutationObserver for Dynamic Content
// ============================================================================

let observer = null;
let debounceTimer = null;

/**
 * Debounces a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function}
 */
function debounce(func, wait) {
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(debounceTimer);
      func(...args);
    };
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(later, wait);
  };
}

/**
 * Sets up MutationObserver to watch for new markdown containers
 * @param {Object} adapter - The current adapter
 */
function setupMutationObserver(adapter) {
  if (observer) {
    observer.disconnect();
  }

  const debouncedStyle = debounce(() => {
    styleMarkdownContainers(adapter);
  }, 100);

  observer = new MutationObserver((mutations) => {
    let shouldRestyle = false;

    for (const mutation of mutations) {
      // Check if nodes were added
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is or contains a markdown container
            const element = /** @type {HTMLElement} */ (node);
            if (element.matches && element.matches(adapter.responseContainerSelector)) {
              shouldRestyle = true;
              break;
            }
            if (element.querySelector && element.querySelector(adapter.responseContainerSelector)) {
              shouldRestyle = true;
              break;
            }
          }
        }
      }

      // Check for class changes that might indicate theme changes
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = /** @type {HTMLElement} */ (mutation.target);
        if (target.classList.contains('dark') || target.classList.contains('claude-styled')) {
          shouldRestyle = true;
        }
      }

      if (shouldRestyle) break;
    }

    if (shouldRestyle) {
      debouncedStyle();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });

  console.log('[Claude UI] MutationObserver set up');
}

/**
 * Cleans up the observer when needed
 */
function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Main initialization function
 */
async function initialize() {
  console.log('[Claude UI] Initializing...');

  try {
    // Detect site and get appropriate adapter
    const adapter = detectSite();

    // Wait for initial delay (allows page to settle)
    const delay = adapter.initialDelayMs || 200;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Inject CSS
    await injectVariables();
    await injectMarkdownStyles();

    // Apply styling to existing containers
    styleMarkdownContainers(adapter);

    // Set up observer for dynamic content
    setupMutationObserver(adapter);

    // Listen for dark mode changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', () => {
      styleMarkdownContainers(adapter);
    });

    console.log('[Claude UI] Initialization complete');
  } catch (error) {
    console.error('[Claude UI] Initialization failed:', error);
  }
}

// Handle cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
