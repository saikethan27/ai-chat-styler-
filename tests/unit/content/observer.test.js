/**
 * MutationObserver Module Tests
 * Tests for the observer functionality
 */

// Mock performance.now
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.observing = false;
  }

  observe(target, options) {
    this.target = target;
    this.options = options;
    this.observing = true;
  }

  disconnect() {
    this.observing = false;
  }

  trigger(mutations) {
    if (this.observing) {
      this.callback(mutations);
    }
  }
};

// Observer module implementation (extracted for testing)
const DEBOUNCE_MS = 100;

function debounce(func, wait) {
  let debounceTimer = null;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(debounceTimer);
      func(...args);
    };
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(later, wait);
  };
}

function handleMutations(mutations, options) {
  const startTime = performance.now();

  let shouldNotify = false;
  let newContainerCount = 0;

  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node;
          if (element.matches?.(options.selector)) {
            shouldNotify = true;
            newContainerCount++;
            break;
          }

          if (element.querySelector?.(options.selector)) {
            shouldNotify = true;
            newContainerCount++;
            break;
          }
        }
      }
    }

    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target;
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

  return {
    shouldNotify,
    newContainerCount,
    processingTime
  };
}

function createObserver(options) {
  if (!options.selector) {
    if (options.logger?.warn) {
      options.logger.warn('No selector provided to observer');
    }
    return null;
  }

  const debouncedHandler = debounce((mutations) => {
    handleMutations(mutations, options);
  }, DEBOUNCE_MS);

  const observer = new MutationObserver((mutations) => {
    debouncedHandler(mutations);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-theme']
  });

  return {
    disconnect: () => observer.disconnect(),
    isObserving: () => observer.observing,
    getStats: () => ({ debounceMs: DEBOUNCE_MS })
  };
}

function disconnectObserver(observer) {
  if (observer) {
    observer.disconnect();
  }
}

describe('MutationObserver Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('debounce', () => {
    it('should delay function execution', (done) => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 50);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      setTimeout(() => {
        expect(fn).toHaveBeenCalled();
        done();
      }, 60);
    });

    it('should reset timer on multiple calls', (done) => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 50);

      debouncedFn();
      setTimeout(() => debouncedFn(), 30);
      setTimeout(() => debouncedFn(), 50);

      setTimeout(() => {
        expect(fn).toHaveBeenCalledTimes(1);
        done();
      }, 120);
    });

    it('should pass arguments to debounced function', (done) => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 10);

      debouncedFn('arg1', 'arg2');

      setTimeout(() => {
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
        done();
      }, 20);
    });
  });

  describe('handleMutations', () => {
    it('should detect matching container added', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const mutation = {
        type: 'childList',
        addedNodes: [{
          nodeType: Node.ELEMENT_NODE,
          matches: jest.fn((selector) => selector === '.markdown-container'),
          querySelector: jest.fn()
        }]
      };

      const result = handleMutations([mutation], options);

      expect(result.shouldNotify).toBe(true);
      expect(result.newContainerCount).toBe(1);
      expect(options.onContainersFound).toHaveBeenCalled();
    });

    it('should detect container with matching child', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const mutation = {
        type: 'childList',
        addedNodes: [{
          nodeType: Node.ELEMENT_NODE,
          matches: jest.fn(() => false),
          querySelector: jest.fn((selector) => selector === '.markdown-container' ? {} : null)
        }]
      };

      const result = handleMutations([mutation], options);

      expect(result.shouldNotify).toBe(true);
      expect(result.newContainerCount).toBe(1);
    });

    it('should detect class changes to dark', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const element = document.createElement('div');
      element.classList.add('dark');

      const mutation = {
        type: 'attributes',
        attributeName: 'class',
        target: element
      };

      const result = handleMutations([mutation], options);

      expect(result.shouldNotify).toBe(true);
    });

    it('should detect class changes to claude-styled', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const element = document.createElement('div');
      element.classList.add('claude-styled');

      const mutation = {
        type: 'attributes',
        attributeName: 'class',
        target: element
      };

      const result = handleMutations([mutation], options);

      expect(result.shouldNotify).toBe(true);
    });

    it('should ignore non-class attribute changes', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const mutation = {
        type: 'attributes',
        attributeName: 'style',
        target: document.createElement('div')
      };

      const result = handleMutations([mutation], options);

      expect(result.shouldNotify).toBe(false);
      expect(options.onContainersFound).not.toHaveBeenCalled();
    });

    it('should ignore text nodes', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const mutation = {
        type: 'childList',
        addedNodes: [{
          nodeType: Node.TEXT_NODE
        }]
      };

      const result = handleMutations([mutation], options);

      expect(result.shouldNotify).toBe(false);
      expect(result.newContainerCount).toBe(0);
    });

    it('should handle multiple mutations', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const mutations = [
        {
          type: 'childList',
          addedNodes: [{
            nodeType: Node.TEXT_NODE
          }]
        },
        {
          type: 'childList',
          addedNodes: [{
            nodeType: Node.ELEMENT_NODE,
            matches: jest.fn((selector) => selector === '.markdown-container'),
            querySelector: jest.fn()
          }]
        }
      ];

      const result = handleMutations(mutations, options);

      expect(result.shouldNotify).toBe(true);
      expect(result.newContainerCount).toBe(1);
    });

    it('should not call onContainersFound when no containers found', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const mutation = {
        type: 'childList',
        addedNodes: [{
          nodeType: Node.ELEMENT_NODE,
          matches: jest.fn(() => false),
          querySelector: jest.fn(() => null)
        }]
      };

      const result = handleMutations([mutation], options);

      expect(result.shouldNotify).toBe(false);
      expect(options.onContainersFound).not.toHaveBeenCalled();
    });

    it('should not call onContainersFound if not provided', () => {
      const options = {
        selector: '.markdown-container'
      };

      const mutation = {
        type: 'childList',
        addedNodes: [{
          nodeType: Node.ELEMENT_NODE,
          matches: jest.fn(() => true),
          querySelector: jest.fn()
        }]
      };

      expect(() => handleMutations([mutation], options)).not.toThrow();
    });

    it('should track processing time', () => {
      // Reset performance.now mock for this test
      const originalPerformanceNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 100 : 150;
      });

      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const mutation = {
        type: 'childList',
        addedNodes: [{
          nodeType: Node.ELEMENT_NODE,
          matches: jest.fn(() => true),
          querySelector: jest.fn()
        }]
      };

      const result = handleMutations([mutation], options);

      expect(result.processingTime).toBe(50);

      // Restore original
      performance.now = originalPerformanceNow;
    });
  });

  describe('createObserver', () => {
    it('should return null if no selector provided', () => {
      const logger = { warn: jest.fn() };
      const result = createObserver({ logger });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('No selector provided to observer');
    });

    it('should create observer with correct configuration', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const observer = createObserver(options);

      expect(observer).not.toBeNull();
      expect(observer.isObserving()).toBe(true);
    });

    it('should return control interface', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const observer = createObserver(options);

      expect(typeof observer.disconnect).toBe('function');
      expect(typeof observer.isObserving).toBe('function');
      expect(typeof observer.getStats).toBe('function');
    });

    it('should disconnect observer', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const observer = createObserver(options);
      expect(observer.isObserving()).toBe(true);

      observer.disconnect();
      expect(observer.isObserving()).toBe(false);
    });

    it('should provide stats', () => {
      const options = {
        selector: '.markdown-container',
        onContainersFound: jest.fn()
      };

      const observer = createObserver(options);
      const stats = observer.getStats();

      expect(stats.debounceMs).toBe(DEBOUNCE_MS);
    });
  });

  describe('disconnectObserver', () => {
    it('should disconnect without error', () => {
      const mockObserver = {
        disconnect: jest.fn()
      };

      disconnectObserver(mockObserver);

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should handle null observer', () => {
      expect(() => disconnectObserver(null)).not.toThrow();
    });

    it('should handle undefined observer', () => {
      expect(() => disconnectObserver(undefined)).not.toThrow();
    });
  });
});
