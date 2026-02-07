// Popup script for Claude UI/UX Extension
// Displays extension status and provides debug controls

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab) {
    const hostname = new URL(tab.url).hostname;
    const siteEl = document.getElementById('current-site');
    if (siteEl) {
      siteEl.textContent = hostname;
    }

    // Query content script for status
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
      updatePopupStatus(response);
    } catch (e) {
      // Content script not loaded or no response
      const statusEl = document.getElementById('status');
      if (statusEl) {
        statusEl.textContent = 'Not active on this page';
        statusEl.className = 'status-inactive';
      }
    }
  }

  // Set up debug toggle
  const debugToggle = document.getElementById('debug-toggle');
  if (debugToggle) {
    debugToggle.addEventListener('change', async (e) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      try {
        const action = e.target.checked ? 'enableDebug' : 'disableDebug';
        await chrome.tabs.sendMessage(tab.id, { action });
      } catch (err) {
        console.error('Failed to toggle debug mode:', err);
      }
    });
  }
});

function updatePopupStatus(status) {
  if (!status) return;

  const statusEl = document.getElementById('status');
  const adapterEl = document.getElementById('adapter');
  const containersEl = document.getElementById('containers');
  const darkModeEl = document.getElementById('dark-mode');

  if (status.active) {
    if (statusEl) {
      statusEl.textContent = 'Active';
      statusEl.className = 'status-active';
    }
    if (adapterEl) {
      adapterEl.textContent = status.adapter || 'Unknown';
    }
    if (containersEl) {
      containersEl.textContent = status.containerCount || 0;
    }
    if (darkModeEl) {
      darkModeEl.textContent = status.darkMode ? 'Yes' : 'No';
    }
  } else {
    if (statusEl) {
      statusEl.textContent = 'Not active';
      statusEl.className = 'status-inactive';
    }
    if (adapterEl) adapterEl.textContent = '-';
    if (containersEl) containersEl.textContent = '-';
    if (darkModeEl) darkModeEl.textContent = '-';
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'statusUpdate') {
    updatePopupStatus(message.status);
  }
});
