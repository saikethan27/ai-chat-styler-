/**
 * MutationObserver Module
 * Handles dynamic content detection with debouncing and performance monitoring
 */

// Performance tracking
const perfMetrics = {
  mutationCount: 0,
  batchCount: 0,
  totalProcessingTime: 0,
  avgProcessingTime: 0
};

let observer = null;
let debounceTimer = null;
let isObserving = false;
const DEBOUNCE_MS = 100; // From decisions log

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
 * Handles mutation records with performance tracking
 * @param {MutationRecord[]} mutations - Array of mutation records
 * @param {Object} options - Configuration options
 */
function handleMutations(mutations, options) {
  const startTime = performance.now();
  perfMetrics.mutationCount += mutations.length;
  perfMetrics.batchCount++;

  let shouldNotify = false;

  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = /** @type {HTMLElement} */ (node);
          // Check if added node matches or contains the selector
          if (element.matches?.(options.selector) ||
              element.querySelector?.(options.selector)) {
            shouldNotify = true;
            break;
          }
        }
      }
    }

    // Handle class changes (theme changes)
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = /** @type {HTMLElement} */ (mutation.target);
      if (target.classList.contains('dark') ||
          target.classList.contains('claude-styled')) {
        shouldNotify = true;
      }
    }

    if (shouldNotify) break;
  }

  if (shouldNotify && options.onContainersFound) {
    options.onContainersFound();
  }

  const endTime = performance.now();
  const processingTime = endTime - startTime;
  perfMetrics.totalProcessingTime += processingTime;
  perfMetrics.avgProcessingTime =
    perfMetrics.totalProcessingTime / perfMetrics.batchCount;

  if (options.logger?.debug) {
    options.logger.debug(`Mutation batch processed: ${processingTime.toFixed(2)}ms`, {
      mutations: mutations.length,
      avgTime: perfMetrics.avgProcessingTime.toFixed(2) + 'ms'
    });
  }
}

/**
 * Create and start the MutationObserver
 * @param {Object} options - Configuration options
 * @param {Function} options.onContainersFound - Callback when new containers are found
 * @param {string} options.selector - CSS selector for containers to watch
 * @param {Object} options.logger - Logger instance
 * @returns {Object} Observer control interface
 */
export function createObserver(options) {
  // Disconnect any existing observer first
  disconnectObserver();

  if (!options.selector) {
    if (options.logger?.warn) {
      options.logger.warn('No selector provided to observer');
    }
    return null;
  }

  // Create debounced handler
  const debouncedHandler = debounce((mutations) => {
    handleMutations(mutations, options);
  }, DEBOUNCE_MS);

  // Create the MutationObserver
  observer = new MutationObserver((mutations) => {
    debouncedHandler(mutations);
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-theme']
  });

  isObserving = true;

  if (options.logger?.info) {
    options.logger.info('MutationObserver started', {
      selector: options.selector,
      debounceMs: DEBOUNCE_MS
    });
  }

  // Return control interface
  return {
    disconnect: disconnectObserver,
    isObserving: () => isObserving,
    getStats: getObserverStats
  };
}

/**
 * Disconnect the observer and clean up
 */
export function disconnectObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  isObserving = false;
}

/**
 * Get performance statistics
 * @returns {Object} Performance metrics
 */
export function getObserverStats() {
  return {
    ...perfMetrics,
    isObserving,
    debounceMs: DEBOUNCE_MS
  };
}

/**
 * Reset performance statistics
 */
export function resetObserverStats() {
  perfMetrics.mutationCount = 0;
  perfMetrics.batchCount = 0;
  perfMetrics.totalProcessingTime = 0;
  perfMetrics.avgProcessingTime = 0;
}

/**
 * Check if observer is currently active
 * @returns {boolean}
 */
export function isObserverActive() {
  return isObserving;
}
