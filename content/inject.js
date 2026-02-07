/**
 * Content Script Entry Point
 * Detects site, loads appropriate adapter, and injects Claude styling
 */

import geminiAdapter from './adapters/gemini.js';
import kimiAdapter from './adapters/kimi.js';
import genericAdapter from './adapters/generic.js';
import { createObserver, disconnectObserver, getObserverStats } from './observer.js';

// ============================================================================
// Logging Utility
// ============================================================================

const LOG_PREFIX = '[Claude UI Extension]';

const logger = {
  debug: (...args) => {
    if (window.CLAUDE_UI_DEBUG) {
      console.debug(LOG_PREFIX, ...args);
    }
  },
  info: (...args) => console.info(LOG_PREFIX, ...args),
  log: (...args) => console.log(LOG_PREFIX, ...args),
  warn: (...args) => console.warn(LOG_PREFIX, ...args),
  error: (...args) => console.error(LOG_PREFIX, ...args),

  // Group related logs
  group: (label) => console.group(LOG_PREFIX, label),
  groupEnd: () => console.groupEnd(),

  // Table output for structured data
  table: (data) => console.table(data),

  // Count occurrences
  count: (label) => console.count(`${LOG_PREFIX} ${label}`),
  countReset: (label) => console.countReset(`${LOG_PREFIX} ${label}`)
};

// Enable debug mode via localStorage or URL param
function checkDebugMode() {
  const urlParams = new URLSearchParams(window.location.search);
  window.CLAUDE_UI_DEBUG =
    localStorage.getItem('CLAUDE_UI_DEBUG') === 'true' ||
    urlParams.has('claude-ui-debug');

  if (window.CLAUDE_UI_DEBUG) {
    logger.info('Debug mode enabled');
  }
}

checkDebugMode();

// ============================================================================
// Visual Indicators
// ============================================================================

let statusBadge = null;
let styledContainerCount = 0;

function injectVisualIndicatorStyles() {
  const styleId = 'claude-ui-visual-indicators';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Visual indicator for styled containers */
    .claude-ui-styled {
      position: relative;
    }

    /* Subtle left border indicator */
    .claude-ui-styled::before {
      content: '';
      position: absolute;
      left: -4px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(180deg, #d97757 0%, #e8956c 100%);
      border-radius: 2px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .claude-ui-styled:hover::before {
      opacity: 1;
    }

    /* Badge showing extension is active */
    .claude-ui-badge {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #d97757;
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 10000;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .claude-ui-badge.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Debug mode: always show indicators */
    .claude-ui-debug .claude-ui-styled::before {
      opacity: 1 !important;
    }

    /* Debug outlines */
    .claude-ui-debug .claude-ui-styled {
      outline: 1px dashed #d97757;
      outline-offset: 2px;
    }

    .claude-ui-debug .claude-ui-heading {
      outline: 1px solid #4a9eff;
    }

    .claude-ui-debug .claude-ui-code {
      outline: 1px solid #50c878;
    }

    .claude-ui-debug .claude-ui-table {
      outline: 1px solid #ffd700;
    }

    .claude-ui-debug .claude-ui-list {
      outline: 1px solid #ff6b6b;
    }
  `;

  document.head.appendChild(style);
  logger.debug('Visual indicator styles injected');
}

function createStatusBadge() {
  if (statusBadge) return;

  statusBadge = document.createElement('div');
  statusBadge.className = 'claude-ui-badge';
  statusBadge.textContent = 'Claude UI Active';
  document.body.appendChild(statusBadge);

  logger.debug('Status badge created');
}

function updateStatusBadge() {
  if (!statusBadge) return;

  const adapter = currentAdapter?.name || 'unknown';
  const count = styledContainerCount;
  const darkMode = currentAdapter?.detectDarkMode?.() ? 'Dark' : 'Light';

  statusBadge.textContent = `Claude UI: ${adapter} (${count}) ${darkMode}`;
  statusBadge.classList.add('visible');

  // Hide after 5 seconds unless in debug mode
  if (!window.CLAUDE_UI_DEBUG) {
    setTimeout(() => {
      statusBadge?.classList.remove('visible');
    }, 5000);
  }
}

function showStatusBadge() {
  statusBadge?.classList.add('visible');
}

// ============================================================================
// Adapter Registry
// ============================================================================

/**
 * Registry of site-specific adapters
 * Priority order: specific adapters first, generic fallback last
 */
const adapterRegistry = [
  geminiAdapter,  // gemini.google.com
  kimiAdapter,    // kimi.ai / kimi.com
  genericAdapter, // Fallback - must be last
];

// Current adapter instance
let currentAdapter = null;

/**
 * Select appropriate adapter for current site
 * @returns {Object|null} The selected adapter or null if none matches
 */
function selectAdapter() {
  const hostname = window.location.hostname;

  // Find first matching adapter (specific adapters first)
  for (const adapter of adapterRegistry) {
    if (adapter.hostMatch && adapter.hostMatch.test(hostname)) {
      logger.info('Using adapter:', adapter.name);
      return adapter;
    }
  }

  // Fallback to generic adapter (should always match due to /.*/)
  logger.info('Using generic adapter');
  return genericAdapter;
}

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
      logger.error('Failed to fetch CSS:', url);
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

    logger.info('Injected CSS:', url);
  } catch (error) {
    logger.error('Error injecting CSS', url, error);
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
 * Legacy alias for selectAdapter()
 * @returns {Object} The adapter for the current site
 */
function detectSite() {
  return selectAdapter();
}

// ============================================================================
// Styling Functions
// ============================================================================

/**
 * Check if element is excluded based on adapter's excludeSelectors
 * @param {HTMLElement} element - The element to check
 * @returns {boolean}
 */
function isExcluded(element) {
  if (!currentAdapter || !currentAdapter.excludeSelectors) return false;

  return currentAdapter.excludeSelectors.some(selector => {
    return element.matches(selector) || element.closest(selector);
  });
}

/**
 * Apply base styling immediately to a container
 * This is called even during streaming to prevent unstyled content
 * @param {HTMLElement} container
 */
function applyBaseStyling(container) {
  logger.debug('Applying base styling to container:', container);

  // Add styled classes
  if (!container.classList.contains('claude-styled')) {
    container.classList.add('claude-styled');
  }
  if (!container.classList.contains('claude-ui-styled')) {
    container.classList.add('claude-ui-styled');
  }

  // Apply dark mode detection immediately
  const isDark = currentAdapter?.detectDarkMode?.() || false;
  logger.debug('Dark mode detected:', isDark);

  if (isDark) {
    if (!container.classList.contains('claude-ui-dark')) {
      container.classList.add('claude-ui-dark');
    }
  } else {
    container.classList.remove('claude-ui-dark');
  }

  // Mark container with timestamp for debugging
  container.setAttribute('data-claude-styled-at', Date.now().toString());

  logger.debug('Base styling applied');
}

/**
 * Apply enhanced styling to a container
 * Called after streaming/thinking completes or immediately if not streaming
 * @param {HTMLElement} container
 */
function applyEnhancedStyling(container) {
  logger.debug('Applying enhanced styling to container:', container);

  // Mark as enhanced to prevent re-processing
  if (!container.classList.contains('claude-ui-enhanced')) {
    container.classList.add('claude-ui-enhanced');
  }

  // Style specific elements based on adapter selectors
  const { selectors } = currentAdapter || {};
  if (selectors) {
    // Style headings
    if (selectors.headings) {
      const headings = container.querySelectorAll(selectors.headings);
      headings.forEach(el => {
        if (!el.classList.contains('claude-ui-heading')) {
          el.classList.add('claude-ui-heading');
        }
      });
      if (headings.length) logger.debug('Styled headings:', headings.length);
    }

    // Style code blocks
    if (selectors.codeBlocks) {
      const codeBlocks = container.querySelectorAll(selectors.codeBlocks);
      codeBlocks.forEach(el => {
        if (!el.classList.contains('claude-ui-code')) {
          el.classList.add('claude-ui-code');
        }
      });
      if (codeBlocks.length) logger.debug('Styled code blocks:', codeBlocks.length);
    }

    // Style tables
    if (selectors.tables) {
      const tables = container.querySelectorAll(selectors.tables);
      tables.forEach(el => {
        if (!el.classList.contains('claude-ui-table')) {
          el.classList.add('claude-ui-table');
        }
      });
      if (tables.length) logger.debug('Styled tables:', tables.length);
    }

    // Style lists
    if (selectors.lists) {
      const lists = container.querySelectorAll(selectors.lists);
      lists.forEach(el => {
        if (!el.classList.contains('claude-ui-list')) {
          el.classList.add('claude-ui-list');
        }
      });
      if (lists.length) logger.debug('Styled lists:', lists.length);
    }
  }

  logger.info('Enhanced styling applied successfully');
}

/**
 * Legacy alias for applyEnhancedStyling
 * Maintains backward compatibility with existing code
 * @param {HTMLElement} container - The container to style
 */
function applyStylingToContainer(container) {
  applyBaseStyling(container);
  applyEnhancedStyling(container);
}

/**
 * Applies styling to all matching containers with adapter-specific handling
 * Handles thinking states (Gemini) and streaming (Kimi)
 */
function updateCounts() {
  styledContainerCount = document.querySelectorAll('.claude-ui-styled').length;
  updateStatusBadge();
}

function applyStyling() {
  if (!currentAdapter) {
    logger.warn('No adapter selected');
    return;
  }

  logger.group('Applying styling');
  logger.info('Adapter:', currentAdapter.name);
  logger.info('Selector:', currentAdapter.responseContainerSelector);

  const containers = document.querySelectorAll(currentAdapter.responseContainerSelector);
  logger.info('Found containers:', containers.length);

  let styledCount = 0;
  let skippedCount = 0;
  let pendingCount = 0;

  containers.forEach((container, index) => {
    // Skip excluded elements
    if (isExcluded(container)) {
      logger.debug(`Container ${index}: excluded`);
      skippedCount++;
      return;
    }

    // Validate container (generic adapter)
    if (currentAdapter.validateContainer && !currentAdapter.validateContainer(container)) {
      logger.debug(`Container ${index}: failed validation`);
      skippedCount++;
      return;
    }

    // PHASE 1: Always apply base styling immediately
    const isNewContainer = !container.classList.contains('claude-ui-styled');
    if (isNewContainer) {
      logger.info(`Container ${index}: applying base styling`);
      applyBaseStyling(container);
      styledCount++;
    }

    // PHASE 2: Apply enhanced styling or set up watcher
    const isThinking = currentAdapter.handleThinkingState && currentAdapter.isThinking?.(container);
    const isStreaming = currentAdapter.isStreaming?.(container);

    if (isThinking) {
      logger.info(`Container ${index}: waiting for thinking to complete`);
      pendingCount++;
      currentAdapter.waitForThinkingComplete(container).then(() => {
        logger.info(`Container ${index}: thinking complete, applying enhanced styling`);
        applyEnhancedStyling(container);
        updateCounts();
      });
    } else if (isStreaming) {
      logger.info(`Container ${index}: streaming detected, will enhance when complete`);
      pendingCount++;
      currentAdapter.waitForStreamingComplete(container).then(() => {
        logger.info(`Container ${index}: streaming complete, applying enhanced styling`);
        applyEnhancedStyling(container);
        updateCounts();
      });
    } else {
      // Not streaming/thinking - apply enhanced styling immediately
      if (!container.classList.contains('claude-ui-enhanced')) {
        applyEnhancedStyling(container);
      }
    }
  });

  logger.info('Base styled:', styledCount, 'Skipped:', skippedCount, 'Pending:', pendingCount);
  logger.groupEnd();

  styledContainerCount += styledCount;
  updateStatusBadge();
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
    logger.warn('No adapter or selector available');
    return;
  }

  // Use the enhanced applyStyling function
  applyStyling();
}

// ============================================================================
// MutationObserver for Dynamic Content
// ============================================================================

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
 * Uses currentAdapter for selector matching
 */
function setupMutationObserver() {
  // Disconnect any existing observer
  disconnectObserver();

  // Create new observer with current adapter config
  const observer = createObserver({
    selector: currentAdapter?.responseContainerSelector,
    onContainersFound: () => {
      logger.debug('New containers detected, re-applying styling');
      applyStyling();
    },
    logger: logger
  });

  // Store reference for cleanup
  window.__claudeUiObserver = observer;

  logger.info('MutationObserver set up');
}

/**
 * Cleans up the observer when needed
 */
function cleanup() {
  disconnectObserver();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
}

// ============================================================================
// Message Handler (Popup Communication)
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    const status = {
      active: !!currentAdapter,
      adapter: currentAdapter?.name,
      containerCount: document.querySelectorAll('.claude-ui-styled').length,
      darkMode: currentAdapter?.detectDarkMode?.() || false,
      url: window.location.href,
      hostname: window.location.hostname
    };

    logger.debug('Status requested:', status);
    sendResponse(status);
  }

  if (request.action === 'enableDebug') {
    window.CLAUDE_UI_DEBUG = true;
    localStorage.setItem('CLAUDE_UI_DEBUG', 'true');
    document.body.classList.add('claude-ui-debug');
    showStatusBadge();
    sendResponse({ debug: true });
  }

  if (request.action === 'disableDebug') {
    window.CLAUDE_UI_DEBUG = false;
    localStorage.setItem('CLAUDE_UI_DEBUG', 'false');
    document.body.classList.remove('claude-ui-debug');
    sendResponse({ debug: false });
  }

  return true; // Keep channel open for async
});

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Determine if adapter should activate on this page
 * Generic adapter only activates if markdown containers are found
 * @returns {boolean}
 */
function shouldActivate() {
  // Generic adapter: only activate if markdown containers found
  if (currentAdapter.name === 'generic') {
    const containers = document.querySelectorAll(currentAdapter.responseContainerSelector);
    if (containers.length === 0) {
      return false;
    }
    logger.info('Found', containers.length, 'markdown containers');
  }

  return true;
}

/**
 * Main initialization function
 */
async function initialize() {
  logger.group('Initializing Claude UI Extension');

  try {
    // Inject visual styles
    injectVisualIndicatorStyles();

    // Create status badge
    createStatusBadge();

    // Select adapter for current site
    currentAdapter = selectAdapter();

    if (!currentAdapter) {
      logger.error('No adapter found');
      logger.groupEnd();
      return;
    }

    logger.info('Selected adapter:', currentAdapter.name);

    // Check if adapter should activate on this page
    if (!shouldActivate()) {
      logger.info('Adapter not activating on this page');
      logger.groupEnd();
      return;
    }

    logger.info('Adapter activating');

    // Apply debug mode class if enabled
    if (window.CLAUDE_UI_DEBUG) {
      document.body.classList.add('claude-ui-debug');
    }

    // Wait for initial delay (allows page to settle)
    const delay = currentAdapter.initialDelayMs || 200;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Inject CSS
    await injectVariables();
    await injectMarkdownStyles();

    // Apply styling to existing containers
    styleMarkdownContainers(currentAdapter);

    // Set up observer for dynamic content
    setupMutationObserver();

    // Listen for dark mode changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', () => {
      styleMarkdownContainers(currentAdapter);
    });

    // Show status badge
    updateStatusBadge();

    logger.info('Initialization complete');
    logger.groupEnd();
  } catch (error) {
    logger.error('Initialization failed:', error);
    logger.groupEnd();
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
