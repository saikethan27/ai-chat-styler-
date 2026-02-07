/**
 * Popup Script Tests
 * Tests for the popup UI functionality
 */

// Mock Chrome API
global.chrome = {
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    reload: jest.fn()
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn() }
  }
};

// Mock DOM
document.body.innerHTML = `
  <div class="popup-container">
    <span id="current-site">example.com</span>
    <input type="checkbox" id="enable-toggle" />
    <button id="theme-auto">Auto</button>
    <button id="theme-light">Light</button>
    <button id="theme-dark">Dark</button>
    <span id="theme-description"></span>
    <span id="adapter-name"></span>
    <span id="container-count"></span>
    <span id="dark-mode-status"></span>
    <span id="state-status"></span>
    <button id="debug-section-toggle">Debug</button>
    <div id="debug-content"></div>
    <input type="checkbox" id="debug-mode" />
    <a id="settings-link" href="#">Settings</a>
    <a id="help-link" href="#">Help</a>
  </div>
`;

// Popup functions (extracted for testing)
function cacheElements() {
  return {
    currentSite: document.getElementById('current-site'),
    enableToggle: document.getElementById('enable-toggle'),
    themeAuto: document.getElementById('theme-auto'),
    themeLight: document.getElementById('theme-light'),
    themeDark: document.getElementById('theme-dark'),
    themeDescription: document.getElementById('theme-description'),
    adapterName: document.getElementById('adapter-name'),
    containerCount: document.getElementById('container-count'),
    darkModeStatus: document.getElementById('dark-mode-status'),
    stateStatus: document.getElementById('state-status'),
    debugToggle: document.getElementById('debug-section-toggle'),
    debugContent: document.getElementById('debug-content'),
    debugMode: document.getElementById('debug-mode'),
    popupContainer: document.querySelector('.popup-container')
  };
}

function formatAdapterName(name) {
  const names = {
    'gemini': 'Gemini',
    'kimi': 'Kimi',
    'generic': 'Generic'
  };
  return names[name] || name || 'Unknown';
}

function updateThemeButtons(activeTheme, elements) {
  const buttons = {
    auto: elements.themeAuto,
    light: elements.themeLight,
    dark: elements.themeDark
  };

  Object.entries(buttons).forEach(([theme, btn]) => {
    if (btn) {
      btn.classList.toggle('active', theme === activeTheme);
    }
  });

  const descriptions = {
    auto: "Automatically detect site's color scheme",
    light: 'Always use light theme',
    dark: 'Always use dark theme'
  };

  if (elements.themeDescription) {
    elements.themeDescription.textContent = descriptions[activeTheme] || descriptions.auto;
  }
}

function updateUIFromState(currentState, elements) {
  if (elements.enableToggle) {
    elements.enableToggle.checked = currentState.enabled;
  }

  updateThemeButtons(currentState.theme, elements);

  if (currentState.enabled) {
    elements.popupContainer?.classList.remove('disabled');
    if (elements.stateStatus) {
      elements.stateStatus.textContent = 'Active';
      elements.stateStatus.className = 'status-value active';
    }
  } else {
    elements.popupContainer?.classList.add('disabled');
    if (elements.stateStatus) {
      elements.stateStatus.textContent = 'Disabled';
      elements.stateStatus.className = 'status-value inactive';
    }
  }
}

function updateStatusDisplay(status, elements) {
  if (!status) return;

  if (elements.adapterName) {
    elements.adapterName.textContent = formatAdapterName(status.adapter);
  }
  if (elements.containerCount) {
    elements.containerCount.textContent = status.containerCount ?? '-';
  }
  if (elements.darkModeStatus) {
    elements.darkModeStatus.textContent = status.darkMode ? 'Yes' : 'No';
  }
}

function showError(message, elements) {
  if (elements.currentSite) {
    elements.currentSite.textContent = message;
    elements.currentSite.style.color = '#d97757';
  }
  if (elements.enableToggle) {
    elements.enableToggle.disabled = true;
  }
}

async function loadSiteState(currentHostname) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getSiteState',
      hostname: currentHostname
    });

    return response?.state || { enabled: true, theme: 'auto' };
  } catch (error) {
    return { enabled: true, theme: 'auto' };
  }
}

async function setTheme(currentHostname, theme, currentState) {
  if (!currentState) {
    currentState = { enabled: true, theme: 'auto' };
  }

  currentState.theme = theme;

  await chrome.runtime.sendMessage({
    action: 'setSiteState',
    hostname: currentHostname,
    theme: theme
  });

  return currentState;
}

async function handleToggleChange(event, currentHostname, currentState, currentTab) {
  const enabled = event.target.checked;

  if (!currentState) {
    currentState = { enabled: true, theme: 'auto' };
  }

  currentState.enabled = enabled;

  await chrome.runtime.sendMessage({
    action: 'setSiteState',
    hostname: currentHostname,
    enabled: enabled
  });

  try {
    await chrome.tabs.sendMessage(currentTab.id, {
      action: 'stateChanged',
      enabled
    });
    return { success: true, reloaded: false };
  } catch (error) {
    await chrome.tabs.reload(currentTab.id);
    return { success: true, reloaded: true };
  }
}

describe('Popup Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = `
      <div class="popup-container">
        <span id="current-site">example.com</span>
        <input type="checkbox" id="enable-toggle" />
        <button id="theme-auto">Auto</button>
        <button id="theme-light">Light</button>
        <button id="theme-dark">Dark</button>
        <span id="theme-description"></span>
        <span id="adapter-name"></span>
        <span id="container-count"></span>
        <span id="dark-mode-status"></span>
        <span id="state-status"></span>
        <button id="debug-section-toggle">Debug</button>
        <div id="debug-content"></div>
        <input type="checkbox" id="debug-mode" />
        <a id="settings-link" href="#">Settings</a>
        <a id="help-link" href="#">Help</a>
      </div>
    `;
  });

  describe('cacheElements', () => {
    it('should cache all DOM elements', () => {
      const elements = cacheElements();

      expect(elements.currentSite).not.toBeNull();
      expect(elements.enableToggle).not.toBeNull();
      expect(elements.themeAuto).not.toBeNull();
      expect(elements.themeLight).not.toBeNull();
      expect(elements.themeDark).not.toBeNull();
      expect(elements.themeDescription).not.toBeNull();
      expect(elements.adapterName).not.toBeNull();
      expect(elements.containerCount).not.toBeNull();
      expect(elements.darkModeStatus).not.toBeNull();
      expect(elements.stateStatus).not.toBeNull();
      expect(elements.debugToggle).not.toBeNull();
      expect(elements.debugContent).not.toBeNull();
      expect(elements.debugMode).not.toBeNull();
      expect(elements.popupContainer).not.toBeNull();
    });
  });

  describe('formatAdapterName', () => {
    it('should format known adapter names', () => {
      expect(formatAdapterName('gemini')).toBe('Gemini');
      expect(formatAdapterName('kimi')).toBe('Kimi');
      expect(formatAdapterName('generic')).toBe('Generic');
    });

    it('should return unknown adapter names as-is', () => {
      expect(formatAdapterName('custom')).toBe('custom');
      expect(formatAdapterName('test')).toBe('test');
    });

    it('should return Unknown for null/undefined', () => {
      expect(formatAdapterName(null)).toBe('Unknown');
      expect(formatAdapterName(undefined)).toBe('Unknown');
    });
  });

  describe('updateThemeButtons', () => {
    it('should set active class on auto button', () => {
      const elements = cacheElements();
      updateThemeButtons('auto', elements);

      expect(elements.themeAuto.classList.contains('active')).toBe(true);
      expect(elements.themeLight.classList.contains('active')).toBe(false);
      expect(elements.themeDark.classList.contains('active')).toBe(false);
    });

    it('should set active class on light button', () => {
      const elements = cacheElements();
      updateThemeButtons('light', elements);

      expect(elements.themeAuto.classList.contains('active')).toBe(false);
      expect(elements.themeLight.classList.contains('active')).toBe(true);
      expect(elements.themeDark.classList.contains('active')).toBe(false);
    });

    it('should set active class on dark button', () => {
      const elements = cacheElements();
      updateThemeButtons('dark', elements);

      expect(elements.themeAuto.classList.contains('active')).toBe(false);
      expect(elements.themeLight.classList.contains('active')).toBe(false);
      expect(elements.themeDark.classList.contains('active')).toBe(true);
    });

    it('should update theme description for auto', () => {
      const elements = cacheElements();
      updateThemeButtons('auto', elements);

      expect(elements.themeDescription.textContent).toContain('Automatically detect');
    });

    it('should update theme description for light', () => {
      const elements = cacheElements();
      updateThemeButtons('light', elements);

      expect(elements.themeDescription.textContent).toBe('Always use light theme');
    });

    it('should update theme description for dark', () => {
      const elements = cacheElements();
      updateThemeButtons('dark', elements);

      expect(elements.themeDescription.textContent).toBe('Always use dark theme');
    });
  });

  describe('updateUIFromState', () => {
    it('should update toggle for enabled state', () => {
      const elements = cacheElements();
      const state = { enabled: true, theme: 'auto' };

      updateUIFromState(state, elements);

      expect(elements.enableToggle.checked).toBe(true);
    });

    it('should update toggle for disabled state', () => {
      const elements = cacheElements();
      const state = { enabled: false, theme: 'auto' };

      updateUIFromState(state, elements);

      expect(elements.enableToggle.checked).toBe(false);
    });

    it('should add disabled class when disabled', () => {
      const elements = cacheElements();
      const state = { enabled: false, theme: 'auto' };

      updateUIFromState(state, elements);

      expect(elements.popupContainer.classList.contains('disabled')).toBe(true);
    });

    it('should remove disabled class when enabled', () => {
      const elements = cacheElements();
      elements.popupContainer.classList.add('disabled');
      const state = { enabled: true, theme: 'auto' };

      updateUIFromState(state, elements);

      expect(elements.popupContainer.classList.contains('disabled')).toBe(false);
    });

    it('should update status to Active when enabled', () => {
      const elements = cacheElements();
      const state = { enabled: true, theme: 'auto' };

      updateUIFromState(state, elements);

      expect(elements.stateStatus.textContent).toBe('Active');
      expect(elements.stateStatus.className).toBe('status-value active');
    });

    it('should update status to Disabled when disabled', () => {
      const elements = cacheElements();
      const state = { enabled: false, theme: 'auto' };

      updateUIFromState(state, elements);

      expect(elements.stateStatus.textContent).toBe('Disabled');
      expect(elements.stateStatus.className).toBe('status-value inactive');
    });
  });

  describe('updateStatusDisplay', () => {
    it('should update adapter name', () => {
      const elements = cacheElements();
      const status = { adapter: 'gemini', containerCount: 5, darkMode: true };

      updateStatusDisplay(status, elements);

      expect(elements.adapterName.textContent).toBe('Gemini');
    });

    it('should update container count', () => {
      const elements = cacheElements();
      const status = { adapter: 'gemini', containerCount: 5, darkMode: true };

      updateStatusDisplay(status, elements);

      expect(elements.containerCount.textContent).toBe('5');
    });

    it('should show dash for undefined container count', () => {
      const elements = cacheElements();
      const status = { adapter: 'gemini', darkMode: true };

      updateStatusDisplay(status, elements);

      expect(elements.containerCount.textContent).toBe('-');
    });

    it('should show Yes for dark mode', () => {
      const elements = cacheElements();
      const status = { adapter: 'gemini', containerCount: 5, darkMode: true };

      updateStatusDisplay(status, elements);

      expect(elements.darkModeStatus.textContent).toBe('Yes');
    });

    it('should show No for light mode', () => {
      const elements = cacheElements();
      const status = { adapter: 'gemini', containerCount: 5, darkMode: false };

      updateStatusDisplay(status, elements);

      expect(elements.darkModeStatus.textContent).toBe('No');
    });

    it('should do nothing if status is null', () => {
      const elements = cacheElements();
      expect(() => updateStatusDisplay(null, elements)).not.toThrow();
    });
  });

  describe('showError', () => {
    it('should display error message', () => {
      const elements = cacheElements();
      showError('Cannot access this page', elements);

      expect(elements.currentSite.textContent).toBe('Cannot access this page');
      // Color might be returned as rgb() or hex depending on browser
      expect(elements.currentSite.style.color).toMatch(/#d97757|rgb\(217,\s*119,\s*87\)/);
    });

    it('should disable toggle', () => {
      const elements = cacheElements();
      showError('Error', elements);

      expect(elements.enableToggle.disabled).toBe(true);
    });
  });

  describe('loadSiteState', () => {
    it('should load state from background', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        state: { enabled: true, theme: 'dark' }
      });

      const state = await loadSiteState('example.com');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'getSiteState',
        hostname: 'example.com'
      });
      expect(state).toEqual({ enabled: true, theme: 'dark' });
    });

    it('should return defaults if response is empty', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({});

      const state = await loadSiteState('example.com');

      expect(state).toEqual({ enabled: true, theme: 'auto' });
    });

    it('should return defaults on error', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('Connection failed'));

      const state = await loadSiteState('example.com');

      expect(state).toEqual({ enabled: true, theme: 'auto' });
    });
  });

  describe('setTheme', () => {
    it('should save theme to background', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });

      const state = { enabled: true, theme: 'auto' };
      const newState = await setTheme('example.com', 'dark', state);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'setSiteState',
        hostname: 'example.com',
        theme: 'dark'
      });
      expect(newState.theme).toBe('dark');
    });

    it('should initialize state if null', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });

      const newState = await setTheme('example.com', 'light', null);

      expect(newState.enabled).toBe(true);
      expect(newState.theme).toBe('light');
    });
  });

  describe('handleToggleChange', () => {
    it('should save enabled state to background', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });
      chrome.tabs.sendMessage.mockResolvedValue({});

      const event = { target: { checked: false } };
      const currentState = { enabled: true, theme: 'auto' };
      const currentTab = { id: 123 };

      await handleToggleChange(event, 'example.com', currentState, currentTab);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'setSiteState',
        hostname: 'example.com',
        enabled: false
      });
    });

    it('should notify content script when content script responds', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });
      chrome.tabs.sendMessage.mockResolvedValue({});

      const event = { target: { checked: false } };
      const currentState = { enabled: true, theme: 'auto' };
      const currentTab = { id: 123 };

      const result = await handleToggleChange(event, 'example.com', currentState, currentTab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        action: 'stateChanged',
        enabled: false
      });
      expect(result.reloaded).toBe(false);
    });

    it('should reload tab when content script does not respond', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });
      chrome.tabs.sendMessage.mockRejectedValue(new Error('No response'));

      const event = { target: { checked: true } };
      const currentState = { enabled: false, theme: 'auto' };
      const currentTab = { id: 123 };

      const result = await handleToggleChange(event, 'example.com', currentState, currentTab);

      expect(chrome.tabs.reload).toHaveBeenCalledWith(123);
      expect(result.reloaded).toBe(true);
    });
  });
});
