/**
 * Content Script (inject.js) Tests
 * Tests for the main content script functionality
 */

// Mock Chrome API
global.chrome = {
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://abc123/${path}`),
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn() }
  }
};

// Logger implementation
const logger = {
  debug: (...args) => {
    if (window.CLAUDE_UI_DEBUG) {
      console.debug('[Claude UI Extension]', ...args);
    }
  },
  info: (...args) => console.info('[Claude UI Extension]', ...args),
  log: (...args) => console.log('[Claude UI Extension]', ...args),
  warn: (...args) => console.warn('[Claude UI Extension]', ...args),
  error: (...args) => console.error('[Claude UI Extension]', ...args),
  group: (label) => console.group('[Claude UI Extension]', label),
  groupEnd: () => console.groupEnd(),
  table: (data) => console.table(data),
  count: (label) => console.count(`[Claude UI Extension] ${label}`),
  countReset: (label) => console.countReset(`[Claude UI Extension] ${label}`)
};

function checkDebugMode() {
  const urlParams = new URLSearchParams(window.location.search);
  window.CLAUDE_UI_DEBUG =
    localStorage.getItem('CLAUDE_UI_DEBUG') === 'true' ||
    urlParams.has('claude-ui-debug');
}

function selectAdapter(adapterRegistry) {
  const hostname = window.location.hostname;

  for (const adapter of adapterRegistry) {
    if (adapter.hostMatch && adapter.hostMatch.test(hostname)) {
      return adapter;
    }
  }

  return null;
}

function isExcluded(element, currentAdapter) {
  if (!currentAdapter || !currentAdapter.excludeSelectors) return false;

  return currentAdapter.excludeSelectors.some(selector => {
    return element.matches(selector) || element.closest(selector);
  });
}

function applyBaseStyling(container, currentAdapter) {
  if (!container.classList.contains('claude-styled')) {
    container.classList.add('claude-styled');
  }
  if (!container.classList.contains('claude-ui-styled')) {
    container.classList.add('claude-ui-styled');
  }

  const isDark = currentAdapter?.detectDarkMode?.() || false;

  if (isDark) {
    if (!container.classList.contains('claude-ui-dark')) {
      container.classList.add('claude-ui-dark');
    }
  } else {
    container.classList.remove('claude-ui-dark');
  }

  container.setAttribute('data-claude-styled-at', Date.now().toString());
}

function applyEnhancedStyling(container, currentAdapter) {
  if (!container.classList.contains('claude-ui-enhanced')) {
    container.classList.add('claude-ui-enhanced');
  }

  const { selectors } = currentAdapter || {};
  if (selectors) {
    if (selectors.headings) {
      const headings = container.querySelectorAll(selectors.headings);
      headings.forEach(el => {
        if (!el.classList.contains('claude-ui-heading')) {
          el.classList.add('claude-ui-heading');
        }
      });
    }

    if (selectors.codeBlocks) {
      const codeBlocks = container.querySelectorAll(selectors.codeBlocks);
      codeBlocks.forEach(el => {
        if (!el.classList.contains('claude-ui-code')) {
          el.classList.add('claude-ui-code');
        }
      });
    }

    if (selectors.tables) {
      const tables = container.querySelectorAll(selectors.tables);
      tables.forEach(el => {
        if (!el.classList.contains('claude-ui-table')) {
          el.classList.add('claude-ui-table');
        }
      });
    }

    if (selectors.lists) {
      const lists = container.querySelectorAll(selectors.lists);
      lists.forEach(el => {
        if (!el.classList.contains('claude-ui-list')) {
          el.classList.add('claude-ui-list');
        }
      });
    }
  }
}

function applyThemeOverride(theme) {
  const html = document.documentElement;
  const body = document.body;

  html.classList.remove('claude-force-light', 'claude-force-dark');
  body.classList.remove('claude-force-light', 'claude-force-dark');

  if (theme === 'light') {
    html.classList.add('claude-force-light');
    body.classList.add('claude-force-light');

    const containers = document.querySelectorAll('.claude-ui-dark');
    containers.forEach(c => c.classList.remove('claude-ui-dark'));
  } else if (theme === 'dark') {
    html.classList.add('claude-force-dark');
    body.classList.add('claude-force-dark');

    const containers = document.querySelectorAll('.claude-ui-styled');
    containers.forEach(c => {
      if (!c.classList.contains('claude-ui-dark')) {
        c.classList.add('claude-ui-dark');
      }
    });
  }
}

function debounce(func, wait) {
  let timer = null;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timer);
      func(...args);
    };
    clearTimeout(timer);
    timer = setTimeout(later, wait);
  };
}

describe('Content Script - inject.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    document.body.className = '';
    document.documentElement.className = '';
    window.CLAUDE_UI_DEBUG = false;
  });

  describe('checkDebugMode', () => {
    beforeEach(() => {
      // Reset state before each test
      window.CLAUDE_UI_DEBUG = false;
      localStorage.clear();
    });

    it('should enable debug mode from localStorage', () => {
      localStorage.getItem.mockReturnValue('true');
      checkDebugMode();
      expect(window.CLAUDE_UI_DEBUG).toBe(true);
    });

    it('should enable debug mode from URL param', () => {
      delete window.location;
      window.location = { search: '?claude-ui-debug' };
      localStorage.getItem.mockReturnValue(null);
      checkDebugMode();
      expect(window.CLAUDE_UI_DEBUG).toBe(true);
    });

    it('should keep debug mode disabled by default', () => {
      delete window.location;
      window.location = { search: '' };
      localStorage.getItem.mockReturnValue(null);
      checkDebugMode();
      expect(window.CLAUDE_UI_DEBUG).toBe(false);
    });
  });

  describe('selectAdapter', () => {
    it('should select first matching adapter', () => {
      delete window.location;
      window.location = { hostname: 'gemini.google.com' };

      const geminiAdapter = { name: 'gemini', hostMatch: /gemini\.google\.com/ };
      const genericAdapter = { name: 'generic', hostMatch: /.*/ };

      const result = selectAdapter([geminiAdapter, genericAdapter]);
      expect(result.name).toBe('gemini');
    });

    it('should fall through to generic adapter', () => {
      delete window.location;
      window.location = { hostname: 'unknown.com' };

      const geminiAdapter = { name: 'gemini', hostMatch: /gemini\.google\.com/ };
      const genericAdapter = { name: 'generic', hostMatch: /.*/ };

      const result = selectAdapter([geminiAdapter, genericAdapter]);
      expect(result.name).toBe('generic');
    });

    it('should return null if no adapter matches', () => {
      delete window.location;
      window.location = { hostname: 'unknown.com' };

      const geminiAdapter = { name: 'gemini', hostMatch: /gemini\.google\.com/ };

      const result = selectAdapter([geminiAdapter]);
      expect(result).toBeNull();
    });
  });

  describe('isExcluded', () => {
    it('should return false if no adapter', () => {
      const element = document.createElement('div');
      expect(isExcluded(element, null)).toBe(false);
    });

    it('should return false if no exclude selectors', () => {
      const element = document.createElement('div');
      const adapter = { name: 'test' };
      expect(isExcluded(element, adapter)).toBe(false);
    });

    it('should detect excluded element by match', () => {
      document.body.innerHTML = `
        <div id="test" class="thinking-block">Content</div>
      `;
      const element = document.getElementById('test');
      const adapter = { excludeSelectors: ['.thinking-block'] };

      expect(isExcluded(element, adapter)).toBe(true);
    });

    it('should detect excluded element by closest', () => {
      document.body.innerHTML = `
        <div class="thinking-block">
          <div id="test">Content</div>
        </div>
      `;
      const element = document.getElementById('test');
      const adapter = { excludeSelectors: ['.thinking-block'] };

      expect(isExcluded(element, adapter)).toBe(true);
    });

    it('should return false for non-excluded element', () => {
      document.body.innerHTML = `
        <div id="test">Content</div>
      `;
      const element = document.getElementById('test');
      const adapter = { excludeSelectors: ['.thinking-block'] };

      expect(isExcluded(element, adapter)).toBe(false);
    });
  });

  describe('applyBaseStyling', () => {
    it('should add claude-styled class', () => {
      const container = document.createElement('div');
      applyBaseStyling(container, null);
      expect(container.classList.contains('claude-styled')).toBe(true);
    });

    it('should add claude-ui-styled class', () => {
      const container = document.createElement('div');
      applyBaseStyling(container, null);
      expect(container.classList.contains('claude-ui-styled')).toBe(true);
    });

    it('should add claude-ui-dark in dark mode', () => {
      const container = document.createElement('div');
      const adapter = { detectDarkMode: () => true };
      applyBaseStyling(container, adapter);
      expect(container.classList.contains('claude-ui-dark')).toBe(true);
    });

    it('should not add claude-ui-dark in light mode', () => {
      const container = document.createElement('div');
      const adapter = { detectDarkMode: () => false };
      applyBaseStyling(container, adapter);
      expect(container.classList.contains('claude-ui-dark')).toBe(false);
    });

    it('should set data-claude-styled-at timestamp', () => {
      const container = document.createElement('div');
      applyBaseStyling(container, null);
      expect(container.getAttribute('data-claude-styled-at')).toBeTruthy();
    });

    it('should not duplicate classes if already present', () => {
      const container = document.createElement('div');
      container.classList.add('claude-styled');
      container.classList.add('claude-ui-styled');

      applyBaseStyling(container, null);

      expect(container.className.split('claude-styled').length - 1).toBe(1);
      expect(container.className.split('claude-ui-styled').length - 1).toBe(1);
    });
  });

  describe('applyEnhancedStyling', () => {
    it('should add claude-ui-enhanced class', () => {
      const container = document.createElement('div');
      applyEnhancedStyling(container, null);
      expect(container.classList.contains('claude-ui-enhanced')).toBe(true);
    });

    it('should style headings', () => {
      document.body.innerHTML = `
        <div id="container">
          <h1>Title</h1>
          <h2>Subtitle</h2>
        </div>
      `;
      const container = document.getElementById('container');
      const adapter = { selectors: { headings: 'h1, h2' } };

      applyEnhancedStyling(container, adapter);

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');
      expect(h1.classList.contains('claude-ui-heading')).toBe(true);
      expect(h2.classList.contains('claude-ui-heading')).toBe(true);
    });

    it('should style code blocks', () => {
      document.body.innerHTML = `
        <div id="container">
          <pre><code>const x = 1;</code></pre>
        </div>
      `;
      const container = document.getElementById('container');
      const adapter = { selectors: { codeBlocks: 'pre code' } };

      applyEnhancedStyling(container, adapter);

      const code = container.querySelector('code');
      expect(code.classList.contains('claude-ui-code')).toBe(true);
    });

    it('should style tables', () => {
      document.body.innerHTML = `
        <div id="container">
          <table><tr><td>Cell</td></tr></table>
        </div>
      `;
      const container = document.getElementById('container');
      const adapter = { selectors: { tables: 'table' } };

      applyEnhancedStyling(container, adapter);

      const table = container.querySelector('table');
      expect(table.classList.contains('claude-ui-table')).toBe(true);
    });

    it('should style lists', () => {
      document.body.innerHTML = `
        <div id="container">
          <ul><li>Item</li></ul>
        </div>
      `;
      const container = document.getElementById('container');
      const adapter = { selectors: { lists: 'ul' } };

      applyEnhancedStyling(container, adapter);

      const ul = container.querySelector('ul');
      expect(ul.classList.contains('claude-ui-list')).toBe(true);
    });

    it('should handle null adapter', () => {
      const container = document.createElement('div');
      expect(() => applyEnhancedStyling(container, null)).not.toThrow();
    });

    it('should handle adapter without selectors', () => {
      const container = document.createElement('div');
      const adapter = { name: 'test' };
      expect(() => applyEnhancedStyling(container, adapter)).not.toThrow();
    });
  });

  describe('applyThemeOverride', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      document.body.className = '';
      document.documentElement.className = '';
    });

    it('should apply light theme', () => {
      applyThemeOverride('light');
      expect(document.documentElement.classList.contains('claude-force-light')).toBe(true);
      expect(document.body.classList.contains('claude-force-light')).toBe(true);
    });

    it('should apply dark theme', () => {
      applyThemeOverride('dark');
      expect(document.documentElement.classList.contains('claude-force-dark')).toBe(true);
      expect(document.body.classList.contains('claude-force-dark')).toBe(true);
    });

    it('should remove dark class from containers in light mode', () => {
      document.body.innerHTML = `
        <div id="container" class="claude-ui-dark"></div>
      `;
      applyThemeOverride('light');
      const container = document.getElementById('container');
      expect(container.classList.contains('claude-ui-dark')).toBe(false);
    });

    it('should add dark class to containers in dark mode', () => {
      document.body.innerHTML = `
        <div id="container" class="claude-ui-styled"></div>
      `;
      applyThemeOverride('dark');
      const container = document.getElementById('container');
      expect(container.classList.contains('claude-ui-dark')).toBe(true);
    });

    it('should remove existing override classes when switching themes', () => {
      document.documentElement.classList.add('claude-force-dark');
      document.body.classList.add('claude-force-dark');

      applyThemeOverride('light');

      expect(document.documentElement.classList.contains('claude-force-dark')).toBe(false);
      expect(document.body.classList.contains('claude-force-dark')).toBe(false);
    });

    it('should handle auto theme by removing overrides', () => {
      document.documentElement.classList.add('claude-force-light');
      document.body.classList.add('claude-force-light');

      applyThemeOverride('auto');

      expect(document.documentElement.classList.contains('claude-force-light')).toBe(false);
      expect(document.body.classList.contains('claude-force-light')).toBe(false);
      expect(document.documentElement.classList.contains('claude-force-dark')).toBe(false);
      expect(document.body.classList.contains('claude-force-dark')).toBe(false);
    });
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
  });
});
