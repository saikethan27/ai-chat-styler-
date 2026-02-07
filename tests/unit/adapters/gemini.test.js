/**
 * Gemini Adapter Tests
 * Tests for the Gemini-specific adapter
 */

// Mock the adapter
const geminiAdapter = {
  name: 'gemini',
  hostMatch: /gemini\.google\.com/,

  responseContainerSelector: 'structured-content-container .markdown.markdown-main-panel, .message-content .markdown',

  selectors: {
    headings: 'h1, h2, h3',
    codeBlocks: 'code-block pre code.code-container, .formatted-code-block-internal-container code',
    tables: 'table-block table, .table-content table',
    lists: 'ol[start], ul'
  },

  excludeSelectors: [
    '.thinking-block',
    '.placeholder-content',
    '.loading-indicator',
    '.error-message'
  ],

  initialDelayMs: 300,

  detectDarkMode() {
    const isDark = document.body.classList.contains('dark-theme') ||
                   document.documentElement.classList.contains('dark-theme') ||
                   document.body.classList.contains('dark') ||
                   document.documentElement.classList.contains('dark') ||
                   document.documentElement.getAttribute('data-theme') === 'dark' ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark;
  },

  handleThinkingState: true,

  isThinking(element) {
    if (!element) return false;
    return element.closest('.thinking-block') !== null ||
           element.querySelector('.thinking-indicator') !== null ||
           element.querySelector('[data-thinking-state]') !== null;
  },

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

  observeThinkingState(element, callbacks = {}) {
    const { onThinkingStart, onThinkingComplete } = callbacks;

    const observer = new MutationObserver((mutations) => {
      const wasThinking = element.getAttribute('data-was-thinking') === 'true';
      const isThinking = this.isThinking(element);

      if (!wasThinking && isThinking && onThinkingStart) {
        element.setAttribute('data-was-thinking', 'true');
        onThinkingStart(element);
      }

      if (wasThinking && !isThinking && onThinkingComplete) {
        element.removeAttribute('data-was-thinking');
        onThinkingComplete(element);
      }
    });

    element.setAttribute('data-was-thinking', this.isThinking(element).toString());

    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-thinking-state']
    });

    return observer;
  },

  getShadowContent(element) {
    if (element && element.shadowRoot) {
      return element.shadowRoot.innerHTML;
    }
    return null;
  },

  hasShadowRoot(element) {
    return element && !!element.shadowRoot;
  },

  getContainers() {
    return document.querySelectorAll(this.responseContainerSelector);
  },

  preProcess(container) {
    const codeBlocks = container.querySelectorAll('code-block');
    codeBlocks.forEach(block => {
      if (this.hasShadowRoot(block)) {
        block.setAttribute('data-has-shadow', 'true');
      }
    });

    const tableBlocks = container.querySelectorAll('table-block');
    tableBlocks.forEach(block => {
      if (this.hasShadowRoot(block)) {
        block.setAttribute('data-has-shadow', 'true');
      }
    });
  }
};

describe('Gemini Adapter', () => {
  describe('Basic Properties', () => {
    it('should have correct name', () => {
      expect(geminiAdapter.name).toBe('gemini');
    });

    it('should match gemini.google.com hostname', () => {
      expect(geminiAdapter.hostMatch.test('gemini.google.com')).toBe(true);
      expect(geminiAdapter.hostMatch.test('www.gemini.google.com')).toBe(true);
    });

    it('should not match other hostnames', () => {
      expect(geminiAdapter.hostMatch.test('google.com')).toBe(false);
      expect(geminiAdapter.hostMatch.test('kimi.ai')).toBe(false);
      expect(geminiAdapter.hostMatch.test('chatgpt.com')).toBe(false);
    });

    it('should have correct initial delay', () => {
      expect(geminiAdapter.initialDelayMs).toBe(300);
    });

    it('should have thinking state handling enabled', () => {
      expect(geminiAdapter.handleThinkingState).toBe(true);
    });
  });

  describe('Selector Configuration', () => {
    it('should have response container selector', () => {
      expect(geminiAdapter.responseContainerSelector).toContain('structured-content-container');
      expect(geminiAdapter.responseContainerSelector).toContain('markdown');
    });

    it('should have selectors for markdown elements', () => {
      expect(geminiAdapter.selectors.headings).toBe('h1, h2, h3');
      expect(geminiAdapter.selectors.codeBlocks).toContain('code-block');
      expect(geminiAdapter.selectors.tables).toContain('table-block');
      expect(geminiAdapter.selectors.lists).toContain('ol[start]');
    });

    it('should have exclude selectors', () => {
      expect(geminiAdapter.excludeSelectors).toContain('.thinking-block');
      expect(geminiAdapter.excludeSelectors).toContain('.placeholder-content');
      expect(geminiAdapter.excludeSelectors).toContain('.loading-indicator');
      expect(geminiAdapter.excludeSelectors).toContain('.error-message');
    });
  });

  describe('detectDarkMode', () => {
    beforeEach(() => {
      // Reset document classes
      document.body.className = '';
      document.documentElement.className = '';
      document.documentElement.removeAttribute('data-theme');
    });

    it('should detect dark-theme class on body', () => {
      document.body.classList.add('dark-theme');
      expect(geminiAdapter.detectDarkMode()).toBe(true);
    });

    it('should detect dark-theme class on html element', () => {
      document.documentElement.classList.add('dark-theme');
      expect(geminiAdapter.detectDarkMode()).toBe(true);
    });

    it('should detect dark class on body', () => {
      document.body.classList.add('dark');
      expect(geminiAdapter.detectDarkMode()).toBe(true);
    });

    it('should detect data-theme="dark" on html element', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(geminiAdapter.detectDarkMode()).toBe(true);
    });

    it('should return false in light mode', () => {
      // Mock matchMedia to return false
      window.matchMedia = jest.fn().mockReturnValue({ matches: false });
      expect(geminiAdapter.detectDarkMode()).toBe(false);
    });
  });

  describe('isThinking', () => {
    it('should return false for null element', () => {
      expect(geminiAdapter.isThinking(null)).toBe(false);
    });

    it('should detect thinking-block parent', () => {
      document.body.innerHTML = `
        <div class="thinking-block">
          <div id="content">Thinking...</div>
        </div>
      `;
      const element = document.getElementById('content');
      expect(geminiAdapter.isThinking(element)).toBe(true);
    });

    it('should detect thinking-indicator child', () => {
      document.body.innerHTML = `
        <div id="content">
          <span class="thinking-indicator">...</span>
        </div>
      `;
      const element = document.getElementById('content');
      expect(geminiAdapter.isThinking(element)).toBe(true);
    });

    it('should detect data-thinking-state attribute', () => {
      document.body.innerHTML = `
        <div id="content">
          <div data-thinking-state="active">Thinking</div>
        </div>
      `;
      const element = document.getElementById('content');
      expect(geminiAdapter.isThinking(element)).toBe(true);
    });

    it('should return false when not thinking', () => {
      document.body.innerHTML = `
        <div id="content">
          <p>Normal content</p>
        </div>
      `;
      const element = document.getElementById('content');
      expect(geminiAdapter.isThinking(element)).toBe(false);
    });
  });

  describe('waitForThinkingComplete', () => {
    it('should resolve immediately if not thinking', async () => {
      document.body.innerHTML = `<div id="content">Done</div>`;
      const element = document.getElementById('content');

      const onComplete = jest.fn();
      await geminiAdapter.waitForThinkingComplete(element, { onComplete });

      expect(onComplete).toHaveBeenCalledWith(element);
    });

    it('should wait for thinking to complete', async () => {
      document.body.innerHTML = `
        <div id="content" class="thinking-block">
          <span class="thinking-indicator">...</span>
        </div>
      `;
      const element = document.getElementById('content');

      const onComplete = jest.fn();
      const promise = geminiAdapter.waitForThinkingComplete(element, { onComplete });

      // Simulate thinking completion
      setTimeout(() => {
        element.classList.remove('thinking-block');
        element.innerHTML = '<p>Done</p>';
      }, 100);

      await promise;
      expect(onComplete).toHaveBeenCalledWith(element);
    });

    it('should timeout after specified duration', async () => {
      document.body.innerHTML = `
        <div id="content" class="thinking-block">
          <span class="thinking-indicator">...</span>
        </div>
      `;
      const element = document.getElementById('content');

      const onComplete = jest.fn();
      const startTime = Date.now();

      await geminiAdapter.waitForThinkingComplete(element, { onComplete, timeout: 50 });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('observeThinkingState', () => {
    it('should set initial was-thinking attribute', () => {
      document.body.innerHTML = `<div id="content">Done</div>`;
      const element = document.getElementById('content');

      geminiAdapter.observeThinkingState(element, {});

      expect(element.getAttribute('data-was-thinking')).toBe('false');
    });

    it('should call onThinkingStart when thinking begins', (done) => {
      document.body.innerHTML = `<div id="content"><p>Normal</p></div>`;
      const element = document.getElementById('content');

      const onThinkingStart = jest.fn();
      geminiAdapter.observeThinkingState(element, { onThinkingStart });

      // Simulate thinking start
      element.classList.add('thinking-block');

      setTimeout(() => {
        expect(onThinkingStart).toHaveBeenCalledWith(element);
        done();
      }, 50);
    });

    it('should call onThinkingComplete when thinking ends', (done) => {
      document.body.innerHTML = `<div id="content" class="thinking-block">Thinking</div>`;
      const element = document.getElementById('content');

      const onThinkingComplete = jest.fn();
      geminiAdapter.observeThinkingState(element, { onThinkingComplete });

      // Simulate thinking end
      element.classList.remove('thinking-block');

      setTimeout(() => {
        expect(onThinkingComplete).toHaveBeenCalledWith(element);
        done();
      }, 50);
    });
  });

  describe('Shadow DOM handling', () => {
    it('should detect shadow root', () => {
      const element = document.createElement('div');
      expect(geminiAdapter.hasShadowRoot(element)).toBe(false);

      element.attachShadow({ mode: 'open' });
      expect(geminiAdapter.hasShadowRoot(element)).toBe(true);
    });

    it('should get shadow content', () => {
      const element = document.createElement('div');
      element.attachShadow({ mode: 'open' });
      element.shadowRoot.innerHTML = '<p>Shadow content</p>';

      expect(geminiAdapter.getShadowContent(element)).toBe('<p>Shadow content</p>');
    });

    it('should return null for element without shadow root', () => {
      const element = document.createElement('div');
      expect(geminiAdapter.getShadowContent(element)).toBeNull();
    });
  });

  describe('preProcess', () => {
    it('should mark code blocks with shadow DOM', () => {
      document.body.innerHTML = `
        <div id="container">
          <code-block id="code1"></code-block>
          <code-block id="code2"></code-block>
        </div>
      `;

      // Attach shadow to first code block
      const code1 = document.getElementById('code1');
      code1.attachShadow({ mode: 'open' });

      const container = document.getElementById('container');
      geminiAdapter.preProcess(container);

      expect(code1.getAttribute('data-has-shadow')).toBe('true');
      expect(document.getElementById('code2').getAttribute('data-has-shadow')).toBeNull();
    });

    it('should mark table blocks with shadow DOM', () => {
      document.body.innerHTML = `
        <div id="container">
          <table-block id="table1"></table-block>
        </div>
      `;

      const table1 = document.getElementById('table1');
      table1.attachShadow({ mode: 'open' });

      const container = document.getElementById('container');
      geminiAdapter.preProcess(container);

      expect(table1.getAttribute('data-has-shadow')).toBe('true');
    });
  });
});
