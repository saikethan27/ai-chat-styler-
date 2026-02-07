/**
 * Content Script Entry Point
 * Detects site, loads appropriate adapter, and injects Claude styling
 *
 * Note: This file is loaded as a classic script (not ES module) by Chrome.
 * Dependencies (adapters, observer) are loaded via manifest.json and expose globals.
 */

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

    /* Thinking state styling - more subtle */
    .claude-ui-thinking {
      opacity: 0.7;
      filter: grayscale(30%);
    }

    .claude-ui-thinking .claude-ui-heading {
      opacity: 0.8;
    }

    .claude-ui-thinking .claude-ui-code {
      opacity: 0.8;
    }

    /* Thinking indicator badge */
    .claude-ui-thinking::after {
      content: 'Thinking...';
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(217, 119, 87, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 100;
      pointer-events: none;
    }

    /* Hide thinking indicator when enhanced styling applied */
    .claude-ui-enhanced::after {
      display: none;
    }

    /* Transition from thinking to done */
    .claude-ui-styled {
      transition: opacity 0.3s ease, filter 0.3s ease;
    }

    /* Debug mode: show thinking state */
    .claude-ui-debug .claude-ui-thinking {
      outline: 2px dashed #d97757 !important;
      outline-offset: 4px;
    }
  `;

  document.head.appendChild(style);
  trackInjectedStyle(styleId);  // Track for cleanup
  logger.debug('Visual indicator styles injected (with thinking state)');
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
// Theme Override
// ============================================================================

/**
 * Apply theme override (light/dark/auto)
 * @param {string} theme - 'auto', 'light', or 'dark'
 */
function applyThemeOverride(theme) {
  logger.info('Applying theme override:', theme);

  const html = document.documentElement;
  const body = document.body;

  // Remove existing override classes
  html.classList.remove('claude-force-light', 'claude-force-dark');
  body.classList.remove('claude-force-light', 'claude-force-dark');

  if (theme === 'light') {
    html.classList.add('claude-force-light');
    body.classList.add('claude-force-light');

    // Remove dark mode from all styled containers
    const containers = document.querySelectorAll('.claude-ui-dark');
    containers.forEach(c => c.classList.remove('claude-ui-dark'));

  } else if (theme === 'dark') {
    html.classList.add('claude-force-dark');
    body.classList.add('claude-force-dark');

    // Add dark mode to all styled containers
    const containers = document.querySelectorAll('.claude-ui-styled');
    containers.forEach(c => {
      if (!c.classList.contains('claude-ui-dark')) {
        c.classList.add('claude-ui-dark');
      }
    });
  }

  // For 'auto', we just removed the overrides - let natural detection take over
  if (theme === 'auto') {
    // Re-apply dark mode detection to all containers
    const containers = document.querySelectorAll('.claude-ui-styled');
    containers.forEach(container => {
      const isDark = currentAdapter?.detectDarkMode?.() || false;
      if (isDark) {
        container.classList.add('claude-ui-dark');
      } else {
        container.classList.remove('claude-ui-dark');
      }
    });
  }

  logger.info('Theme override applied:', theme);
}

/**
 * Check if there's a theme override and apply it
 * Called during initialization
 */
async function checkAndApplyThemeOverride() {
  try {
    const hostname = window.location.hostname;
    const response = await chrome.runtime.sendMessage({
      action: 'getSiteState',
      hostname: hostname
    });

    const theme = response?.theme || 'auto';
    if (theme !== 'auto') {
      applyThemeOverride(theme);
    }
  } catch (error) {
    logger.debug('No theme override to apply');
  }
}

// ============================================================================
// Adapter Registry
// ============================================================================

/**
 * Registry of site-specific adapters
 * Priority order: specific adapters first, generic fallback last
 * Note: Adapters are loaded via manifest.json and expose globals
 */
const adapterRegistry = [
  window.geminiAdapter,  // gemini.google.com
  window.kimiAdapter,    // kimi.ai / kimi.com
  window.genericAdapter, // Fallback - must be last
];

// Current adapter instance
let currentAdapter = null;

// ============================================================================
// State Management
// ============================================================================

let isEnabled = true;  // Current enabled state for this site
let injectedStyles = [];  // Track injected style elements for cleanup

/**
 * Check if extension is enabled for current site
 * Queries background service worker for per-site state
 */
async function checkEnabledState() {
  try {
    const hostname = window.location.hostname;
    const response = await chrome.runtime.sendMessage({
      action: 'getSiteState',
      hostname: hostname
    });

    isEnabled = response?.enabled !== false;  // Default to true
    logger.info('Extension enabled for this site:', isEnabled);

    return isEnabled;
  } catch (error) {
    logger.warn('Failed to check enabled state, defaulting to enabled:', error);
    isEnabled = true;
    return true;
  }
}

/**
 * Disable all styling on the page
 * Removes classes, injected styles, and disconnects observer
 */
function disableStyling() {
  logger.info('Disabling styling...');

  isEnabled = false;

  // 1. Disconnect observer to stop processing mutations
  if (window.claudeUIObserver) {
    window.claudeUIObserver.disconnectObserver();
  }

  // 2. Remove all injected style elements
  injectedStyles.forEach(styleId => {
    const style = document.getElementById(styleId);
    if (style) {
      style.remove();
      logger.debug('Removed style:', styleId);
    }
  });
  injectedStyles = [];

  // 3. Remove all styling classes from containers
  const styledContainers = document.querySelectorAll('.claude-ui-styled, .claude-styled');
  styledContainers.forEach(container => {
    container.classList.remove(
      'claude-ui-styled',
      'claude-styled',
      'claude-ui-dark',
      'claude-ui-enhanced',
      'claude-ui-thinking',
      'claude-ui-thinking-complete'
    );

    // Remove data attributes
    container.removeAttribute('data-claude-styled-at');
  });

  // 4. Remove element-level classes
  const styledElements = document.querySelectorAll(
    '.claude-ui-heading, .claude-ui-code, .claude-ui-table, .claude-ui-list'
  );
  styledElements.forEach(el => {
    el.classList.remove('claude-ui-heading', 'claude-ui-code', 'claude-ui-table', 'claude-ui-list');
  });

  // 5. Remove debug class from body
  document.body.classList.remove('claude-ui-debug');

  // 6. Remove status badge
  if (statusBadge) {
    statusBadge.remove();
    statusBadge = null;
  }

  // 7. Remove theme override classes
  document.documentElement.classList.remove('claude-force-light', 'claude-force-dark');
  document.body.classList.remove('claude-force-light', 'claude-force-dark');

  logger.info('Styling disabled successfully');
}

/**
 * Re-enable styling on the page
 * Re-runs initialization but skips the enabled check
 */
async function enableStyling() {
  logger.info('Enabling styling...');

  isEnabled = true;

  // Re-run initialization with skip check flag
  await initialize(true);  // true = skip enabled check

  logger.info('Styling enabled successfully');
}

/**
 * Track injected style element for later cleanup
 */
function trackInjectedStyle(styleId) {
  if (!injectedStyles.includes(styleId)) {
    injectedStyles.push(styleId);
  }
}

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
  return window.genericAdapter;
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
    const styleId = `claude-ui-${url.replace(/[^a-zA-Z0-9]/g, '-')}`;

    // Skip if already injected
    if (document.getElementById(styleId)) {
      logger.debug('CSS already injected, skipping:', url);
      return;
    }

    const cssUrl = chrome.runtime.getURL(url);
    const response = await fetch(cssUrl);

    if (!response.ok) {
      logger.error('Failed to fetch CSS:', url);
      return;
    }

    const cssText = await response.text();

    // Create style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssText;

    // Inject into document head
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
      trackInjectedStyle(styleId);  // Track for cleanup
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
  logger.info('Container classes before:', container.className);

  // Add styled classes
  if (!container.classList.contains('claude-styled')) {
    container.classList.add('claude-styled');
    logger.info('Added claude-styled class');
  }
  if (!container.classList.contains('claude-ui-styled')) {
    container.classList.add('claude-ui-styled');
    logger.info('Added claude-ui-styled class');
  }

  logger.info('Container classes after:', container.className);

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
 * Handle the visual transition from thinking to done state
 * Adds a subtle animation to indicate content is now final
 * @param {HTMLElement} container
 */
function handleThinkingTransition(container) {
  logger.debug('Handling thinking transition for container:', container);

  // Add transition class for animation
  container.classList.add('claude-ui-thinking-complete');

  // Flash effect to indicate completion
  const flashOverlay = document.createElement('div');
  flashOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(217, 119, 87, 0.1), transparent);
    pointer-events: none;
    z-index: 10;
    animation: claude-thinking-flash 0.5s ease-out;
  `;

  // Add keyframes if not already present
  if (!document.getElementById('claude-thinking-animation')) {
    const style = document.createElement('style');
    style.id = 'claude-thinking-animation';
    style.textContent = `
      @keyframes claude-thinking-flash {
        0% { opacity: 0; transform: translateX(-100%); }
        50% { opacity: 1; }
        100% { opacity: 0; transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }

  // Only add flash if container is positioned
  const computedStyle = window.getComputedStyle(container);
  if (computedStyle.position === 'static') {
    container.style.position = 'relative';
  }

  container.appendChild(flashOverlay);

  // Remove flash overlay after animation
  setTimeout(() => {
    flashOverlay.remove();
    container.classList.remove('claude-ui-thinking-complete');
  }, 500);

  // Update status badge with transition info
  if (statusBadge) {
    const originalText = statusBadge.textContent;
    statusBadge.textContent = 'Thinking complete ✓';
    statusBadge.classList.add('visible');

    setTimeout(() => {
      if (statusBadge) {
        statusBadge.textContent = originalText;
        if (!window.CLAUDE_UI_DEBUG) {
          statusBadge.classList.remove('visible');
        }
      }
    }, 2000);
  }

  logger.debug('Thinking transition animation applied');
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

    // Check thinking/streaming state
    const isThinking = currentAdapter.handleThinkingState && currentAdapter.isThinking?.(container);
    const isStreaming = currentAdapter.isStreaming?.(container);

    // PHASE 1: Always apply base styling immediately
    const isNewContainer = !container.classList.contains('claude-ui-styled');
    if (isNewContainer) {
      logger.info(`Container ${index}: applying base styling`);
      applyBaseStyling(container);

      // Mark as thinking if in thinking state
      if (isThinking) {
        container.classList.add('claude-ui-thinking');
        logger.info(`Container ${index}: marked as thinking`);
      }

      styledCount++;
    }

    // PHASE 2: Handle thinking state transitions
    if (isThinking) {
      logger.info(`Container ${index}: waiting for thinking to complete`);
      pendingCount++;

      // Use callback version if available, otherwise fall back to Promise
      if (currentAdapter.observeThinkingState) {
        // Set up observer that will trigger when thinking completes
        currentAdapter.observeThinkingState(container, {
          onThinkingComplete: (el) => {
            logger.info(`Container ${index}: thinking complete (via observer)`);

            // Remove thinking class
            el.classList.remove('claude-ui-thinking');

            // Apply enhanced styling
            applyEnhancedStyling(el);

            // Trigger transition animation
            handleThinkingTransition(el);

            updateCounts();
          }
        });
      } else {
        // Fall back to Promise-based waiting
        currentAdapter.waitForThinkingComplete(container, {
          onComplete: (el) => {
            logger.info(`Container ${index}: thinking complete (via promise)`);

            // Remove thinking class
            el.classList.remove('claude-ui-thinking');

            // Apply enhanced styling
            applyEnhancedStyling(el);

            // Trigger transition animation
            handleThinkingTransition(el);

            updateCounts();
          }
        });
      }
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

let injectDebounceTimer = null;

/**
 * Debounces a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function}
 */
function debounce(func, wait) {
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(injectDebounceTimer);
      func(...args);
    };
    clearTimeout(injectDebounceTimer);
    injectDebounceTimer = setTimeout(later, wait);
  };
}

/**
 * Sets up MutationObserver to watch for new markdown containers
 * Uses currentAdapter for selector matching
 */
function setupMutationObserver() {
  // Disconnect any existing observer
  if (window.claudeUIObserver) {
    window.claudeUIObserver.disconnectObserver();
  }

  // Create new observer with current adapter config
  const observer = window.claudeUIObserver?.createObserver({
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
  if (window.claudeUIObserver) {
    window.claudeUIObserver.disconnectObserver();
  }
  if (injectDebounceTimer) {
    clearTimeout(injectDebounceTimer);
  }
}

// ============================================================================
// Message Handler (Popup Communication)
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    const containers = document.querySelectorAll('.claude-ui-styled');
    const thinkingContainers = document.querySelectorAll('.claude-ui-thinking');
    const enhancedContainers = document.querySelectorAll('.claude-ui-enhanced');

    const status = {
      active: isEnabled && !!currentAdapter,
      adapter: currentAdapter?.name,
      containerCount: containers.length,
      thinkingCount: thinkingContainers.length,
      enhancedCount: enhancedContainers.length,
      darkMode: currentAdapter?.detectDarkMode?.() || false,
      url: window.location.href,
      hostname: window.location.hostname,
      debug: window.CLAUDE_UI_DEBUG
    };

    logger.debug('Status requested:', status);
    sendResponse(status);
  }

  // Ping handler for background to check if content script is loaded
  if (request.action === 'ping') {
    sendResponse({ pong: true, adapter: currentAdapter?.name });
    return;
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

  // NEW: State change handler (toggle ON/OFF)
  if (request.action === 'stateChanged') {
    logger.info('Received state change:', request.enabled);

    // Handle async operations properly
    (async () => {
      if (request.enabled) {
        await enableStyling();
      } else {
        disableStyling();
      }
      sendResponse({ success: true, enabled: request.enabled });
    })();

    return true;  // Keep channel open for async response
  }

  // NEW: Theme change handler
  if (request.action === 'themeChanged') {
    logger.info('Received theme change:', request.theme);

    applyThemeOverride(request.theme);

    sendResponse({ success: true, theme: request.theme });
    return true;
  }

  // Handle URL changes (for SPAs like Kimi)
  if (request.action === 'urlChanged') {
    logger.info('URL changed, re-applying styling:', request.url);

    // Re-apply styling after a short delay to let the SPA render
    setTimeout(() => {
      if (isEnabled && currentAdapter) {
        applyStyling();
      }
    }, 500);

    sendResponse({ success: true });
    return true;
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
 * @param {boolean} skipEnabledCheck - If true, skip the enabled state check (used when re-enabling)
 */
async function initialize(skipEnabledCheck = false) {
  logger.group('Initializing Claude UI Extension');

  try {
    // Check if enabled for this site FIRST (unless skipped)
    if (!skipEnabledCheck) {
      const enabled = await checkEnabledState();
      if (!enabled) {
        logger.info('Extension disabled for this site, skipping initialization');
        logger.groupEnd();
        return;
      }
    } else {
      logger.info('Skipping enabled check (re-enabling)');
    }

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

    // NEW: Apply theme override if set
    await checkAndApplyThemeOverride();

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
