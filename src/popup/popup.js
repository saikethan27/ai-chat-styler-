// Popup script for Claude UI/UX Extension
// Handles user interactions and state synchronization

const LOG_PREFIX = '[Claude UI Extension]';

// Current state
let currentTab = null;
let currentHostname = null;
let currentState = null;

// DOM element references (will be populated on load)
let elements = {};

/**
 * Initialize popup on DOM ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log(LOG_PREFIX, 'Popup opened');

  // Cache DOM element references
  cacheElements();

  // Set up event listeners
  setupEventListeners();

  // Load current tab and state
  await initializePopup();
});

/**
 * Cache DOM element references for performance
 */
function cacheElements() {
  elements = {
    // Site display
    currentSite: document.getElementById('current-site'),

    // Toggle
    enableToggle: document.getElementById('enable-toggle'),

    // Theme buttons
    themeAuto: document.getElementById('theme-auto'),
    themeLight: document.getElementById('theme-light'),
    themeDark: document.getElementById('theme-dark'),
    themeDescription: document.getElementById('theme-description'),

    // Status
    adapterName: document.getElementById('adapter-name'),
    containerCount: document.getElementById('container-count'),
    darkModeStatus: document.getElementById('dark-mode-status'),
    stateStatus: document.getElementById('state-status'),

    // Debug
    debugToggle: document.getElementById('debug-section-toggle'),
    debugContent: document.getElementById('debug-content'),
    debugMode: document.getElementById('debug-mode'),

    // Container
    popupContainer: document.querySelector('.popup-container')
  };
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Enable/disable toggle
  elements.enableToggle?.addEventListener('change', handleToggleChange);

  // Theme buttons
  elements.themeAuto?.addEventListener('click', () => setTheme('auto'));
  elements.themeLight?.addEventListener('click', () => setTheme('light'));
  elements.themeDark?.addEventListener('click', () => setTheme('dark'));

  // Debug section toggle
  elements.debugToggle?.addEventListener('click', toggleDebugSection);

  // Debug mode checkbox
  elements.debugMode?.addEventListener('change', handleDebugModeChange);

  // Footer links
  document.getElementById('settings-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    // TODO: Create options page when needed
    alert('Settings page coming soon!');
  });

  document.getElementById('help-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/your-repo/claude-ui-extension#readme' });
  });
}

/**
 * Initialize popup with current tab info and state
 */
async function initializePopup() {
  try {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];

    if (!currentTab?.url) {
      showError('Cannot access this page');
      return;
    }

    // Extract hostname
    currentHostname = new URL(currentTab.url).hostname;
    elements.currentSite.textContent = currentHostname;

    // Load state from background
    await loadSiteState();

    // Query content script for status
    await queryContentScript();

    // Start polling for updates
    startStatusPolling();

  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to initialize popup:', error);
    showError('Failed to load extension state');
  }
}

/**
 * Load site state from background service worker
 */
async function loadSiteState() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getSiteState',
      hostname: currentHostname
    });

    currentState = response?.state || { enabled: true, theme: 'auto' };

    // Update UI to match state
    updateUIFromState();

    console.log(LOG_PREFIX, 'Loaded state:', currentState);
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to load state:', error);
    // Use defaults
    currentState = { enabled: true, theme: 'auto' };
    updateUIFromState();
  }
}

/**
 * Update all UI elements to match current state
 */
function updateUIFromState() {
  // Update toggle
  if (elements.enableToggle) {
    elements.enableToggle.checked = currentState.enabled;
  }

  // Update theme buttons
  updateThemeButtons(currentState.theme);

  // Update disabled state styling
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

/**
 * Query content script for current status
 */
async function queryContentScript() {
  if (!currentTab?.id) return;

  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getStatus'
    });

    updateStatusDisplay(response);

    // Also update debug checkbox state
    if (response?.debug !== undefined && elements.debugMode) {
      elements.debugMode.checked = response.debug;
    }
  } catch (error) {
    // Content script not loaded or no response
    console.log(LOG_PREFIX, 'Content script not available:', error.message);
    if (elements.adapterName) elements.adapterName.textContent = 'Not available';
    if (elements.containerCount) elements.containerCount.textContent = '-';
    if (elements.darkModeStatus) elements.darkModeStatus.textContent = '-';
  }
}

/**
 * Update status display from content script response
 */
function updateStatusDisplay(status) {
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

/**
 * Format adapter name for display
 */
function formatAdapterName(name) {
  const names = {
    'gemini': 'Gemini',
    'kimi': 'Kimi',
    'generic': 'Generic'
  };
  return names[name] || name || 'Unknown';
}

/**
 * Handle enable/disable toggle change
 */
async function handleToggleChange(event) {
  const enabled = event.target.checked;

  console.log(LOG_PREFIX, 'Toggle changed:', enabled);

  // Ensure state is initialized
  if (!currentState) {
    currentState = { enabled: true, theme: 'auto' };
  }

  // Update local state
  currentState.enabled = enabled;

  // Update UI immediately for responsiveness
  updateUIFromState();

  // Save to background
  try {
    await chrome.runtime.sendMessage({
      action: 'setSiteState',
      hostname: currentHostname,
      enabled: enabled
    });

    // Notify content script to apply/remove styling dynamically
    const contentScriptResponding = await notifyContentScript('stateChanged', { enabled });

    if (contentScriptResponding) {
      console.log(LOG_PREFIX, 'Content script notified successfully');
    } else {
      console.log(LOG_PREFIX, 'Content script not responding, reloading page...');
      // Only reload if content script isn't responding
      await chrome.tabs.reload(currentTab.id);
      window.close();
    }

  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to save state:', error);
    // Revert UI on error
    currentState.enabled = !enabled;
    updateUIFromState();
  }
}

/**
 * Set theme for current site
 */
async function setTheme(theme) {
  console.log(LOG_PREFIX, 'Theme changed:', theme);

  // Ensure state is initialized
  if (!currentState) {
    currentState = { enabled: true, theme: 'auto' };
  }

  // Update local state
  currentState.theme = theme;

  // Update UI
  updateThemeButtons(theme);

  // Save to background
  try {
    await chrome.runtime.sendMessage({
      action: 'setSiteState',
      hostname: currentHostname,
      theme: theme
    });

    // Notify content script
    await notifyContentScript('themeChanged', { theme });

  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to save theme:', error);
  }
}

/**
 * Update theme button active states
 */
function updateThemeButtons(activeTheme) {
  const buttons = {
    auto: elements.themeAuto,
    light: elements.themeLight,
    dark: elements.themeDark
  };

  // Update button classes
  Object.entries(buttons).forEach(([theme, btn]) => {
    if (btn) {
      btn.classList.toggle('active', theme === activeTheme);
    }
  });

  // Update description
  const descriptions = {
    auto: 'Automatically detect site\'s color scheme',
    light: 'Always use light theme',
    dark: 'Always use dark theme'
  };

  if (elements.themeDescription) {
    elements.themeDescription.textContent = descriptions[activeTheme] || descriptions.auto;
  }
}

/**
 * Toggle debug section expand/collapse
 */
function toggleDebugSection() {
  const section = document.querySelector('.debug-section');
  section?.classList.toggle('open');
}

/**
 * Handle debug mode checkbox change
 */
async function handleDebugModeChange(event) {
  const enabled = event.target.checked;

  console.log(LOG_PREFIX, 'Debug mode:', enabled);

  if (!currentTab?.id) return;

  try {
    const action = enabled ? 'enableDebug' : 'disableDebug';
    await chrome.tabs.sendMessage(currentTab.id, { action });
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to toggle debug mode:', error);
  }
}

/**
 * Notify content script of state changes
 * @returns {Promise<boolean>} Whether the content script responded successfully
 */
async function notifyContentScript(action, data) {
  if (!currentTab?.id) return false;

  try {
    await chrome.tabs.sendMessage(currentTab.id, {
      action,
      ...data
    });
    return true;
  } catch (error) {
    // Content script may not be loaded or responding (e.g., after being disabled)
    // This is expected when turning the extension back on after it was off
    console.log(LOG_PREFIX, 'Content script not responding:', error.message);
    return false;
  }
}

/**
 * Show error message in popup
 */
function showError(message) {
  if (elements.currentSite) {
    elements.currentSite.textContent = message;
    elements.currentSite.style.color = '#d97757';
  }
  if (elements.enableToggle) {
    elements.enableToggle.disabled = true;
  }
}

/**
 * Listen for status updates from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'statusUpdate') {
    updateStatusDisplay(message.status);
  }
});

/**
 * Start polling for status updates while popup is open
 * This ensures the status display stays current with the page
 */
function startStatusPolling() {
  // Poll every 2 seconds while popup is open
  const pollInterval = setInterval(async () => {
    // Only poll if popup is visible (user hasn't closed it)
    if (document.hidden) return;

    try {
      await queryContentScript();
    } catch (error) {
      // Stop polling if content script is no longer available
      clearInterval(pollInterval);
    }
  }, 2000);

  // Store interval ID for cleanup
  window._statusPollInterval = pollInterval;
}

/**
 * Clean up polling when popup closes
 */
window.addEventListener('unload', () => {
  if (window._statusPollInterval) {
    clearInterval(window._statusPollInterval);
  }
});

/**
 * Handle visibility change (popup shown/hidden)
 */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && currentTab?.id) {
    // Refresh status when popup becomes visible again
    queryContentScript();
  }
});
