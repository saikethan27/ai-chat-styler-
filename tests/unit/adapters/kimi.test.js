/**
 * Kimi Adapter Tests
 * Tests for the Kimi-specific adapter
 */

const kimiAdapter = {
  name: 'kimi',
  hostMatch: /kimi\.(ai|com)/,

  responseContainerSelector: '.segment.segment-assistant .markdown-container',

  selectors: {
    headings: 'h1, h2, h3',
    codeBlocks: '.segment-code, pre code.segment-code-inline, .syntax-highlighter.segment-code-content',
    tables: '.table.markdown-table table, .table-container table',
    lists: 'ul[start], ol[start]'
  },

  excludeSelectors: [
    '.segment-user',
    '.loading-indicator',
    '.placeholder-content'
  ],

  initialDelayMs: 200,

  detectDarkMode() {
    const isDark = document.body.classList.contains('dark') ||
                   document.body.classList.contains('dark-mode') ||
                   document.documentElement.classList.contains('dark') ||
                   document.documentElement.getAttribute('data-theme') === 'dark' ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark;
  },

  handleStreamingState: true,

  getAllResponseContainers() {
    return document.querySelectorAll(this.responseContainerSelector);
  },

  isStreaming(container) {
    if (!container) return false;
    const segment = container.closest('.segment');
    return segment?.classList.contains('streaming') ||
           container.querySelector('.streaming-indicator') !== null;
  },

  async waitForStreamingComplete(container, timeout = 30000) {
    if (!this.isStreaming(container)) return;

    return new Promise((resolve) => {
      const segment = container.closest('.segment');
      if (!segment) {
        resolve();
        return;
      }

      const observer = new MutationObserver((mutations) => {
        if (!this.isStreaming(container)) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(segment, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });

      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
    });
  },

  getContainers() {
    return document.querySelectorAll(this.responseContainerSelector);
  },

  preProcess(container) {
    if (this.isStreaming(container)) {
      container.setAttribute('data-kimi-streaming', 'true');
    }

    const codeBlocks = container.querySelectorAll('.segment-code, pre code.segment-code-inline');
    codeBlocks.forEach(block => {
      block.setAttribute('data-kimi-code', 'true');
    });
  }
};

describe('Kimi Adapter', () => {
  describe('Basic Properties', () => {
    it('should have correct name', () => {
      expect(kimiAdapter.name).toBe('kimi');
    });

    it('should match kimi.ai hostname', () => {
      expect(kimiAdapter.hostMatch.test('kimi.ai')).toBe(true);
    });

    it('should match kimi.com hostname', () => {
      expect(kimiAdapter.hostMatch.test('kimi.com')).toBe(true);
    });

    it('should match subdomains', () => {
      expect(kimiAdapter.hostMatch.test('www.kimi.ai')).toBe(true);
      expect(kimiAdapter.hostMatch.test('app.kimi.com')).toBe(true);
    });

    it('should not match other hostnames', () => {
      expect(kimiAdapter.hostMatch.test('gemini.google.com')).toBe(false);
      expect(kimiAdapter.hostMatch.test('chatgpt.com')).toBe(false);
      expect(kimiAdapter.hostMatch.test('example.com')).toBe(false);
    });

    it('should have correct initial delay', () => {
      expect(kimiAdapter.initialDelayMs).toBe(200);
    });

    it('should have streaming state handling enabled', () => {
      expect(kimiAdapter.handleStreamingState).toBe(true);
    });
  });

  describe('Selector Configuration', () => {
    it('should have response container selector targeting assistant segments', () => {
      expect(kimiAdapter.responseContainerSelector).toBe('.segment.segment-assistant .markdown-container');
    });

    it('should have selectors for markdown elements', () => {
      expect(kimiAdapter.selectors.headings).toBe('h1, h2, h3');
      expect(kimiAdapter.selectors.codeBlocks).toContain('.segment-code');
      expect(kimiAdapter.selectors.tables).toContain('.table.markdown-table');
      expect(kimiAdapter.selectors.lists).toContain('ul[start]');
    });

    it('should have exclude selectors', () => {
      expect(kimiAdapter.excludeSelectors).toContain('.segment-user');
      expect(kimiAdapter.excludeSelectors).toContain('.loading-indicator');
      expect(kimiAdapter.excludeSelectors).toContain('.placeholder-content');
    });
  });

  describe('detectDarkMode', () => {
    beforeEach(() => {
      document.body.className = '';
      document.documentElement.className = '';
      document.documentElement.removeAttribute('data-theme');
    });

    it('should detect dark class on body', () => {
      document.body.classList.add('dark');
      expect(kimiAdapter.detectDarkMode()).toBe(true);
    });

    it('should detect dark-mode class on body', () => {
      document.body.classList.add('dark-mode');
      expect(kimiAdapter.detectDarkMode()).toBe(true);
    });

    it('should detect dark class on html element', () => {
      document.documentElement.classList.add('dark');
      expect(kimiAdapter.detectDarkMode()).toBe(true);
    });

    it('should detect data-theme="dark" on html element', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(kimiAdapter.detectDarkMode()).toBe(true);
    });

    it('should return false in light mode', () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: false });
      expect(kimiAdapter.detectDarkMode()).toBe(false);
    });
  });

  describe('isStreaming', () => {
    it('should return false for null container', () => {
      expect(kimiAdapter.isStreaming(null)).toBe(false);
    });

    it('should detect streaming class on parent segment', () => {
      document.body.innerHTML = `
        <div class="segment streaming">
          <div id="container" class="markdown-container">Streaming...</div>
        </div>
      `;
      const container = document.getElementById('container');
      expect(kimiAdapter.isStreaming(container)).toBe(true);
    });

    it('should detect streaming-indicator child', () => {
      document.body.innerHTML = `
        <div class="segment">
          <div id="container" class="markdown-container">
            <span class="streaming-indicator">...</span>
          </div>
        </div>
      `;
      const container = document.getElementById('container');
      expect(kimiAdapter.isStreaming(container)).toBe(true);
    });

    it('should return false when not streaming', () => {
      document.body.innerHTML = `
        <div class="segment segment-assistant">
          <div id="container" class="markdown-container">
            <p>Complete message</p>
          </div>
        </div>
      `;
      const container = document.getElementById('container');
      expect(kimiAdapter.isStreaming(container)).toBe(false);
    });
  });

  describe('waitForStreamingComplete', () => {
    it('should resolve immediately if not streaming', async () => {
      document.body.innerHTML = `
        <div class="segment segment-assistant">
          <div id="container" class="markdown-container">Done</div>
        </div>
      `;
      const container = document.getElementById('container');

      await kimiAdapter.waitForStreamingComplete(container);
      // Should resolve without error
    });

    it('should wait for streaming to complete', async () => {
      document.body.innerHTML = `
        <div id="segment" class="segment streaming">
          <div id="container" class="markdown-container">
            <span class="streaming-indicator">...</span>
          </div>
        </div>
      `;
      const container = document.getElementById('container');
      const segment = document.getElementById('segment');

      const promise = kimiAdapter.waitForStreamingComplete(container);

      // Simulate streaming completion
      setTimeout(() => {
        segment.classList.remove('streaming');
        container.innerHTML = '<p>Complete</p>';
      }, 100);

      await promise;
      expect(kimiAdapter.isStreaming(container)).toBe(false);
    });

    it('should timeout after specified duration', async () => {
      document.body.innerHTML = `
        <div class="segment streaming">
          <div id="container" class="markdown-container">
            <span class="streaming-indicator">...</span>
          </div>
        </div>
      `;
      const container = document.getElementById('container');

      const startTime = Date.now();
      await kimiAdapter.waitForStreamingComplete(container, 50);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  describe('getAllResponseContainers', () => {
    it('should return all assistant response containers', () => {
      document.body.innerHTML = `
        <div class="segment segment-user">
          <div class="markdown-container">User message</div>
        </div>
        <div class="segment segment-assistant">
          <div class="markdown-container">Assistant 1</div>
        </div>
        <div class="segment segment-assistant">
          <div class="markdown-container">Assistant 2</div>
        </div>
      `;

      const containers = kimiAdapter.getAllResponseContainers();
      expect(containers.length).toBe(2);
      expect(containers[0].textContent).toBe('Assistant 1');
      expect(containers[1].textContent).toBe('Assistant 2');
    });

    it('should return empty NodeList when no containers exist', () => {
      document.body.innerHTML = '<div>No containers here</div>';
      const containers = kimiAdapter.getAllResponseContainers();
      expect(containers.length).toBe(0);
    });
  });

  describe('preProcess', () => {
    it('should mark streaming containers', () => {
      document.body.innerHTML = `
        <div class="segment streaming">
          <div id="container" class="markdown-container">Streaming...</div>
        </div>
      `;

      const container = document.getElementById('container');
      kimiAdapter.preProcess(container);

      expect(container.getAttribute('data-kimi-streaming')).toBe('true');
    });

    it('should mark code blocks', () => {
      document.body.innerHTML = `
        <div id="container" class="markdown-container">
          <pre><code class="segment-code">const x = 1;</code></pre>
          <pre><code class="segment-code-inline">inline</code></pre>
        </div>
      `;

      const container = document.getElementById('container');
      kimiAdapter.preProcess(container);

      const codeBlocks = container.querySelectorAll('[data-kimi-code]');
      expect(codeBlocks.length).toBe(2);
    });

    it('should handle empty containers', () => {
      document.body.innerHTML = `
        <div id="container" class="markdown-container"></div>
      `;

      const container = document.getElementById('container');
      expect(() => kimiAdapter.preProcess(container)).not.toThrow();
    });
  });
});
