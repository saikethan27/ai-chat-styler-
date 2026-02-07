// Background service worker for Claude UI/UX Extension
// Phase 4: Full state management with per-site settings and badge updates

const LOG_PREFIX = '[Claude UI Extension]';

// Default state structure for new installations
const DEFAULT_STATE = {
  sites: {},  // Per-site settings: { "hostname": { enabled: true, theme: "auto" } }
  global: {
    defaultEnabled: true,  // New sites enabled by default
    defaultTheme: 'auto'   // "auto" | "light" | "dark"
  }
};

/**
 * Get the complete settings object from storage
 * @returns {Promise<Object>} The full settings object
 */
async function getAllSettings() {
  try {
    const result = await chrome.storage.sync.get('claudeUISettings');
    return result.claudeUISettings || DEFAULT_STATE;
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to get settings:', error);
    return DEFAULT_STATE;
  }
}

/**
 * Get the state for a specific hostname
 * @param {string} hostname - The hostname to get state for
 * @returns {Promise<{enabled: boolean, theme: string}>} Site state with defaults applied
 */
async function getSiteState(hostname) {
  try {
    const settings = await getAllSettings();
    const siteSettings = settings.sites[hostname];

    if (siteSettings) {
      return {
        enabled: siteSettings.enabled,
        theme: siteSettings.theme || settings.global.defaultTheme
      };
    }

    // Return global defaults for new sites
    return {
      enabled: settings.global.defaultEnabled,
      theme: settings.global.defaultTheme
    };
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to get site state for', hostname, ':', error);
    // Return safe defaults on error
    return { enabled: false, theme: 'auto' };
  }
}

/**
 * Set the state for a specific hostname
 * @param {string} hostname - The hostname to set state for
 * @param {Object} settings - The settings to apply
 * @param {boolean} [settings.enabled] - Whether the extension is enabled for this site
 * @param {string} [settings.theme] - The theme setting ("auto", "light", "dark")
 * @returns {Promise<boolean>} Success status
 */
async function setSiteState(hostname, settings) {
  try {
    const currentSettings = await getAllSettings();

    // Merge with existing site settings if any
    const existingSiteSettings = currentSettings.sites[hostname] || {};
    const newSiteSettings = {
      ...existingSiteSettings,
      ...settings
    };

    // Update sites object
    currentSettings.sites[hostname] = newSiteSettings;

    // Persist to storage
    await chrome.storage.sync.set({ claudeUISettings: currentSettings });

    console.log(LOG_PREFIX, 'Updated state for', hostname, ':', newSiteSettings);

    // Update badge for all tabs of this site
    await updateBadgeForHostname(hostname);

    // Broadcast state change to all tabs of this site
    await broadcastStateChange(hostname, newSiteSettings.enabled);

    return true;
  } catch (error) {
    // Handle storage quota exceeded
    if (error.message && error.message.includes('QUOTA_BYTES_PER_ITEM')) {
      console.error(LOG_PREFIX, 'Storage quota exceeded for', hostname, '. Consider cleaning up old site settings.');
    }
    console.error(LOG_PREFIX, 'Failed to set site state for', hostname, ':', error);
    return false;
  }
}

/**
 * Update badge for a specific tab
 * @param {number} tabId - The tab ID to update
 * @param {boolean} enabled - Whether the extension is enabled
 */
async function updateBadge(tabId, enabled) {
  try {
    if (enabled) {
      // Clear badge when enabled (show colored icon only)
      await chrome.action.setBadgeText({ text: '', tabId });
      // Set active icon
      await chrome.action.setIcon({
        tabId,
        path: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png'
        }
      });
    } else {
      // Show OFF badge when disabled
      await chrome.action.setBadgeText({ text: 'OFF', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#999999', tabId });
      // Set inactive icon
      await chrome.action.setIcon({
        tabId,
        path: {
          16: 'icons/icon16-inactive.png',
          48: 'icons/icon48-inactive.png',
          128: 'icons/icon128-inactive.png'
        }
      });
    }
    console.log(LOG_PREFIX, 'Badge updated for tab', tabId, '- enabled:', enabled);
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to update badge for tab', tabId, ':', error);
  }
}

/**
 * Update badge for all tabs of a specific hostname
 * @param {string} hostname - The hostname to update badges for
 */
async function updateBadgeForHostname(hostname) {
  try {
    const siteState = await getSiteState(hostname);

    // Get all tabs with this hostname
    const tabs = await getTabsForHostname(hostname);

    for (const tab of tabs) {
      if (tab.id) {
        await updateBadge(tab.id, siteState.enabled);
      }
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to update badge for hostname', hostname, ':', error);
  }
}

/**
 * Update badge for a specific tab based on its URL
 * @param {number} tabId - The tab ID to update
 */
async function updateBadgeForTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);

    if (!tab.url) {
      console.log(LOG_PREFIX, 'Tab', tabId, 'has no URL, skipping badge update');
      return;
    }

    // Skip non-HTTP(S) URLs
    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      console.log(LOG_PREFIX, 'Tab', tabId, 'has non-HTTP URL, clearing badge');
      await chrome.action.setBadgeText({ text: '', tabId });
      return;
    }

    const url = new URL(tab.url);
    const hostname = url.hostname;
    const siteState = await getSiteState(hostname);

    await updateBadge(tabId, siteState.enabled);
  } catch (error) {
    // Tab may not exist or we may not have permission
    console.log(LOG_PREFIX, 'Could not update badge for tab', tabId, ':', error.message);
  }
}

/**
 * Broadcast state change to all tabs of a specific hostname
 * @param {string} hostname - The hostname to broadcast to
 * @param {boolean} enabled - The new enabled state
 */
async function broadcastStateChange(hostname, enabled) {
  try {
    // Get all tabs with this hostname
    const tabs = await getTabsForHostname(hostname);

    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'stateChanged',
            enabled: enabled,
            hostname: hostname
          });
          console.log(LOG_PREFIX, 'Broadcast state change to tab', tab.id, '- enabled:', enabled);
        } catch (error) {
          // Content script may not be loaded on this tab
          console.log(LOG_PREFIX, 'Could not send message to tab', tab.id, ':', error.message);
        }
      }
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to broadcast state change for', hostname, ':', error);
  }
}

/**
 * Get all tabs for a specific hostname
 * @param {string} hostname - The hostname to query
 * @returns {Promise<Array>} Array of tab objects
 */
async function getTabsForHostname(hostname) {
  try {
    const tabs = await chrome.tabs.query({ url: `*://${hostname}/*` });
    return tabs;
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to query tabs for', hostname, ':', error);
    return [];
  }
}

// ==================== Event Listeners ====================

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(LOG_PREFIX, 'Received message:', message.action, 'from', sender.tab ? 'content script' : 'popup');

  const handleAsync = async () => {
    switch (message.action) {
      case 'getSiteState': {
        const state = await getSiteState(message.hostname);
        return { success: true, state };
      }

      case 'setSiteState': {
        const success = await setSiteState(message.hostname, {
          enabled: message.enabled,
          theme: message.theme
        });
        return { success };
      }

      case 'getAllSettings': {
        const settings = await getAllSettings();
        return { success: true, settings };
      }

      case 'updateBadge': {
        if (sender.tab && sender.tab.id) {
          await updateBadge(sender.tab.id, message.enabled);
        }
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown action: ' + message.action };
    }
  };

  // Handle async response
  handleAsync()
    .then(response => sendResponse(response))
    .catch(error => {
      console.error(LOG_PREFIX, 'Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });

  // Return true to indicate we will send a response asynchronously
  return true;
});

/**
 * Handle tab activation - update badge and ensure content script is injected
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log(LOG_PREFIX, 'Tab activated:', activeInfo.tabId);
  await updateBadgeForTab(activeInfo.tabId);

  // Ensure content script is injected when tab becomes active
  try {
    await chrome.tabs.sendMessage(activeInfo.tabId, { action: 'ping' });
  } catch (error) {
    // Content script not loaded, inject it
    console.log(LOG_PREFIX, 'Injecting into newly activated tab', activeInfo.tabId);
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeInfo.tabId },
        files: [
          'content/adapters/gemini.js',
          'content/adapters/kimi.js',
          'content/adapters/generic.js',
          'content/observer.js',
          'content/inject.js'
        ]
      });
    } catch (injectError) {
      console.log(LOG_PREFIX, 'Could not inject into tab', activeInfo.tabId, ':', injectError.message);
    }
  }
});

/**
 * Handle tab updates - update badge when URL changes and notify content script
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Update badge when page is fully loaded
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(LOG_PREFIX, 'Tab updated:', tabId, 'URL:', tab.url);
    await updateBadgeForTab(tabId);
  }

  // Notify content script when URL changes (for SPAs like Kimi)
  // This handles navigation within the same page
  if (changeInfo.url) {
    console.log(LOG_PREFIX, 'Tab URL changed:', tabId, 'new URL:', changeInfo.url);
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'urlChanged',
        url: changeInfo.url
      });
    } catch (error) {
      // Content script may not be loaded, will be injected on next activation
      console.log(LOG_PREFIX, 'Could not notify tab of URL change:', error.message);
    }
  }
});

// ==================== Initialization ====================

/**
 * Initialize storage on install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(LOG_PREFIX, 'Extension installed/updated:', details.reason);

  try {
    // Check if settings already exist
    const result = await chrome.storage.sync.get('claudeUISettings');

    if (!result.claudeUISettings) {
      // Set default state for new installations
      await chrome.storage.sync.set({ claudeUISettings: DEFAULT_STATE });
      console.log(LOG_PREFIX, 'Initialized default settings:', DEFAULT_STATE);
    } else {
      console.log(LOG_PREFIX, 'Existing settings found:', result.claudeUISettings);
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to initialize settings:', error);
  }
});

/**
 * Inject content scripts into all existing tabs on startup
 * This ensures the extension works on tabs that were open before the extension loaded
 */
async function injectIntoExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    console.log(LOG_PREFIX, 'Injecting into', tabs.length, 'existing tabs');

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      try {
        // Check if content script is already injected by sending a ping
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        console.log(LOG_PREFIX, 'Content script already in tab', tab.id);
      } catch (error) {
        // Content script not injected, inject it now
        console.log(LOG_PREFIX, 'Injecting into tab', tab.id, tab.url);
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'content/adapters/gemini.js',
              'content/adapters/kimi.js',
              'content/adapters/generic.js',
              'content/observer.js',
              'content/inject.js'
            ]
          });
          console.log(LOG_PREFIX, 'Successfully injected into tab', tab.id);
        } catch (injectError) {
          console.log(LOG_PREFIX, 'Could not inject into tab', tab.id, ':', injectError.message);
        }
      }
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed to inject into existing tabs:', error);
  }
}

// Inject into existing tabs when service worker starts
injectIntoExistingTabs();

console.log(LOG_PREFIX, 'Background service worker initialized');
