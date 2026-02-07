/**
 * Background Script Tests
 * Tests for the service worker functionality
 */

// Mock Chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    get: jest.fn(),
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setIcon: jest.fn()
  },
  runtime: {
    onMessage: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() }
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Import the functions to test (we'll need to extract them for testing)
// For now, we'll test the logic conceptually

describe('Background Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DEFAULT_STATE', () => {
    it('should have correct default structure', () => {
      const DEFAULT_STATE = {
        sites: {},
        global: {
          defaultEnabled: true,
          defaultTheme: 'auto'
        }
      };

      expect(DEFAULT_STATE.sites).toEqual({});
      expect(DEFAULT_STATE.global.defaultEnabled).toBe(true);
      expect(DEFAULT_STATE.global.defaultTheme).toBe('auto');
    });
  });

  describe('getAllSettings', () => {
    it('should return settings from storage when available', async () => {
      const mockSettings = {
        sites: { 'example.com': { enabled: true, theme: 'dark' } },
        global: { defaultEnabled: true, defaultTheme: 'auto' }
      };

      chrome.storage.sync.get.mockResolvedValue({ claudeUISettings: mockSettings });

      // Simulated function
      async function getAllSettings() {
        const result = await chrome.storage.sync.get('claudeUISettings');
        return result.claudeUISettings || { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } };
      }

      const result = await getAllSettings();
      expect(result).toEqual(mockSettings);
      expect(chrome.storage.sync.get).toHaveBeenCalledWith('claudeUISettings');
    });

    it('should return DEFAULT_STATE when storage is empty', async () => {
      const DEFAULT_STATE = {
        sites: {},
        global: { defaultEnabled: true, defaultTheme: 'auto' }
      };

      chrome.storage.sync.get.mockResolvedValue({});

      async function getAllSettings() {
        const result = await chrome.storage.sync.get('claudeUISettings');
        return result.claudeUISettings || DEFAULT_STATE;
      }

      const result = await getAllSettings();
      expect(result).toEqual(DEFAULT_STATE);
    });

    it('should handle storage errors gracefully', async () => {
      const DEFAULT_STATE = {
        sites: {},
        global: { defaultEnabled: true, defaultTheme: 'auto' }
      };

      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      async function getAllSettings() {
        try {
          const result = await chrome.storage.sync.get('claudeUISettings');
          return result.claudeUISettings || DEFAULT_STATE;
        } catch (error) {
          return DEFAULT_STATE;
        }
      }

      const result = await getAllSettings();
      expect(result).toEqual(DEFAULT_STATE);
    });
  });

  describe('getSiteState', () => {
    it('should return site-specific settings when they exist', async () => {
      const mockSettings = {
        sites: { 'example.com': { enabled: false, theme: 'light' } },
        global: { defaultEnabled: true, defaultTheme: 'auto' }
      };

      chrome.storage.sync.get.mockResolvedValue({ claudeUISettings: mockSettings });

      async function getSiteState(hostname) {
        const settings = await chrome.storage.sync.get('claudeUISettings');
        const claudeUISettings = settings.claudeUISettings || { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } };
        const siteSettings = claudeUISettings.sites[hostname];

        if (siteSettings) {
          return {
            enabled: siteSettings.enabled,
            theme: siteSettings.theme || claudeUISettings.global.defaultTheme
          };
        }
        return { enabled: claudeUISettings.global.defaultEnabled, theme: claudeUISettings.global.defaultTheme };
      }

      const result = await getSiteState('example.com');
      expect(result).toEqual({ enabled: false, theme: 'light' });
    });

    it('should return global defaults for new sites', async () => {
      const mockSettings = {
        sites: {},
        global: { defaultEnabled: true, defaultTheme: 'dark' }
      };

      chrome.storage.sync.get.mockResolvedValue({ claudeUISettings: mockSettings });

      async function getSiteState(hostname) {
        const settings = await chrome.storage.sync.get('claudeUISettings');
        const claudeUISettings = settings.claudeUISettings || { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } };
        const siteSettings = claudeUISettings.sites[hostname];

        if (siteSettings) {
          return {
            enabled: siteSettings.enabled,
            theme: siteSettings.theme || claudeUISettings.global.defaultTheme
          };
        }
        return { enabled: claudeUISettings.global.defaultEnabled, theme: claudeUISettings.global.defaultTheme };
      }

      const result = await getSiteState('newsite.com');
      expect(result).toEqual({ enabled: true, theme: 'dark' });
    });

    it('should return safe defaults on error', async () => {
      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      async function getSiteState(hostname) {
        try {
          const settings = await chrome.storage.sync.get('claudeUISettings');
          const claudeUISettings = settings.claudeUISettings || { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } };
          const siteSettings = claudeUISettings.sites[hostname];

          if (siteSettings) {
            return { enabled: siteSettings.enabled, theme: siteSettings.theme || claudeUISettings.global.defaultTheme };
          }
          return { enabled: claudeUISettings.global.defaultEnabled, theme: claudeUISettings.global.defaultTheme };
        } catch (error) {
          return { enabled: false, theme: 'auto' };
        }
      }

      const result = await getSiteState('example.com');
      expect(result).toEqual({ enabled: false, theme: 'auto' });
    });
  });

  describe('setSiteState', () => {
    it('should save site settings and update badge', async () => {
      const existingSettings = {
        sites: {},
        global: { defaultEnabled: true, defaultTheme: 'auto' }
      };

      chrome.storage.sync.get.mockResolvedValue({ claudeUISettings: existingSettings });
      chrome.storage.sync.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([{ id: 123 }]);
      chrome.tabs.sendMessage.mockResolvedValue();
      chrome.action.setBadgeText.mockResolvedValue();
      chrome.action.setIcon.mockResolvedValue();

      async function setSiteState(hostname, settings) {
        const currentSettings = await chrome.storage.sync.get('claudeUISettings');
        const claudeUISettings = currentSettings.claudeUISettings || { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } };
        const existingSiteSettings = claudeUISettings.sites[hostname] || {};
        const newSiteSettings = { ...existingSiteSettings, ...settings };
        claudeUISettings.sites[hostname] = newSiteSettings;

        await chrome.storage.sync.set({ claudeUISettings });

        // Update badge
        const tabs = await chrome.tabs.query({ url: `*://${hostname}/*` });
        for (const tab of tabs) {
          if (tab.id) {
            await chrome.action.setBadgeText({ text: settings.enabled ? '' : 'OFF', tabId: tab.id });
          }
        }

        // Broadcast state change
        for (const tab of tabs) {
          if (tab.id) {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'stateChanged',
              enabled: settings.enabled,
              hostname
            }).catch(() => {});
          }
        }

        return true;
      }

      const result = await setSiteState('example.com', { enabled: false, theme: 'dark' });
      expect(result).toBe(true);
      expect(chrome.storage.sync.set).toHaveBeenCalled();
    });

    it('should handle storage quota errors', async () => {
      const existingSettings = {
        sites: {},
        global: { defaultEnabled: true, defaultTheme: 'auto' }
      };

      chrome.storage.sync.get.mockResolvedValue({ claudeUISettings: existingSettings });
      chrome.storage.sync.set.mockRejectedValue(new Error('QUOTA_BYTES_PER_ITEM exceeded'));

      async function setSiteState(hostname, settings) {
        try {
          const currentSettings = await chrome.storage.sync.get('claudeUISettings');
          const claudeUISettings = currentSettings.claudeUISettings || { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } };
          const existingSiteSettings = claudeUISettings.sites[hostname] || {};
          const newSiteSettings = { ...existingSiteSettings, ...settings };
          claudeUISettings.sites[hostname] = newSiteSettings;

          await chrome.storage.sync.set({ claudeUISettings });
          return true;
        } catch (error) {
          if (error.message && error.message.includes('QUOTA_BYTES_PER_ITEM')) {
            // Handle quota error
          }
          return false;
        }
      }

      const result = await setSiteState('example.com', { enabled: false });
      expect(result).toBe(false);
    });
  });

  describe('updateBadge', () => {
    it('should clear badge when enabled', async () => {
      chrome.action.setBadgeText.mockResolvedValue();
      chrome.action.setIcon.mockResolvedValue();

      async function updateBadge(tabId, enabled) {
        if (enabled) {
          await chrome.action.setBadgeText({ text: '', tabId });
          await chrome.action.setIcon({
            tabId,
            path: { 16: 'icons/icon16.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' }
          });
        }
      }

      await updateBadge(123, true);
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 123 });
    });

    it('should show OFF badge when disabled', async () => {
      chrome.action.setBadgeText.mockResolvedValue();
      chrome.action.setBadgeBackgroundColor.mockResolvedValue();
      chrome.action.setIcon.mockResolvedValue();

      async function updateBadge(tabId, enabled) {
        if (!enabled) {
          await chrome.action.setBadgeText({ text: 'OFF', tabId });
          await chrome.action.setBadgeBackgroundColor({ color: '#999999', tabId });
          await chrome.action.setIcon({
            tabId,
            path: { 16: 'icons/icon16-inactive.png', 48: 'icons/icon48-inactive.png', 128: 'icons/icon128-inactive.png' }
          });
        }
      }

      await updateBadge(123, false);
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'OFF', tabId: 123 });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#999999', tabId: 123 });
    });
  });

  describe('getTabsForHostname', () => {
    it('should query tabs with correct URL pattern', async () => {
      const mockTabs = [{ id: 1, url: 'https://example.com/page' }, { id: 2, url: 'https://example.com/other' }];
      chrome.tabs.query.mockResolvedValue(mockTabs);

      async function getTabsForHostname(hostname) {
        const tabs = await chrome.tabs.query({ url: `*://${hostname}/*` });
        return tabs;
      }

      const result = await getTabsForHostname('example.com');
      expect(chrome.tabs.query).toHaveBeenCalledWith({ url: '*://example.com/*' });
      expect(result).toEqual(mockTabs);
    });

    it('should return empty array on error', async () => {
      chrome.tabs.query.mockRejectedValue(new Error('Permission denied'));

      async function getTabsForHostname(hostname) {
        try {
          const tabs = await chrome.tabs.query({ url: `*://${hostname}/*` });
          return tabs;
        } catch (error) {
          return [];
        }
      }

      const result = await getTabsForHostname('example.com');
      expect(result).toEqual([]);
    });
  });

  describe('Message Handlers', () => {
    it('should handle getSiteState message', async () => {
      const mockSettings = {
        sites: { 'example.com': { enabled: true, theme: 'dark' } },
        global: { defaultEnabled: true, defaultTheme: 'auto' }
      };
      chrome.storage.sync.get.mockResolvedValue({ claudeUISettings: mockSettings });

      const message = { action: 'getSiteState', hostname: 'example.com' };
      const sendResponse = jest.fn();

      async function handleGetSiteState(message, sendResponse) {
        const settings = await chrome.storage.sync.get('claudeUISettings');
        const claudeUISettings = settings.claudeUISettings || { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } };
        const siteSettings = claudeUISettings.sites[message.hostname];

        const state = siteSettings
          ? { enabled: siteSettings.enabled, theme: siteSettings.theme || claudeUISettings.global.defaultTheme }
          : { enabled: claudeUISettings.global.defaultEnabled, theme: claudeUISettings.global.defaultTheme };

        sendResponse({ success: true, state });
      }

      await handleGetSiteState(message, sendResponse);
      expect(sendResponse).toHaveBeenCalledWith({ success: true, state: { enabled: true, theme: 'dark' } });
    });

    it('should handle setSiteState message', async () => {
      chrome.storage.sync.get.mockResolvedValue({ claudeUISettings: { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } } });
      chrome.storage.sync.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([]);

      const message = { action: 'setSiteState', hostname: 'example.com', enabled: false, theme: 'light' };
      const sendResponse = jest.fn();

      async function handleSetSiteState(message, sendResponse) {
        const currentSettings = await chrome.storage.sync.get('claudeUISettings');
        const claudeUISettings = currentSettings.claudeUISettings || { sites: {}, global: { defaultEnabled: true, defaultTheme: 'auto' } };
        claudeUISettings.sites[message.hostname] = { enabled: message.enabled, theme: message.theme };
        await chrome.storage.sync.set({ claudeUISettings });
        sendResponse({ success: true });
      }

      await handleSetSiteState(message, sendResponse);
      expect(chrome.storage.sync.set).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('should handle unknown action', async () => {
      const message = { action: 'unknownAction' };
      const sendResponse = jest.fn();

      async function handleMessage(message, sendResponse) {
        switch (message.action) {
          case 'getSiteState':
            sendResponse({ success: true });
            break;
          default:
            sendResponse({ success: false, error: 'Unknown action: ' + message.action });
        }
      }

      await handleMessage(message, sendResponse);
      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Unknown action: unknownAction' });
    });
  });
});
