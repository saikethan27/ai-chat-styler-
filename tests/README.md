# Claude UI/UX Extension Tests

This directory contains comprehensive unit tests for the Claude UI/UX Chrome Extension.

## Test Structure

```
tests/
├── setup.js                    # Jest configuration and global mocks
├── README.md                   # This file
└── unit/                       # Unit tests
    ├── background.test.js      # Background service worker tests
    ├── content/
    │   ├── inject.test.js     # Content script (inject.js) tests
    │   └── observer.test.js   # MutationObserver module tests
    ├── adapters/
    │   ├── gemini.test.js     # Gemini adapter tests
    │   ├── kimi.test.js       # Kimi adapter tests
    │   └── generic.test.js    # Generic adapter tests
    └── popup/
        └── popup.test.js      # Popup UI tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/background.test.js
```

## Test Coverage

The test suite covers:

### Background Script (`background.test.js`)
- Default state initialization
- Settings storage and retrieval
- Site state management (get/set)
- Badge updates (enabled/disabled states)
- Tab querying and hostname matching
- Message handling (getSiteState, setSiteState, etc.)

### Content Script (`content/inject.test.js`)
- Debug mode detection (localStorage, URL params)
- Adapter selection logic
- Exclusion checking
- Base styling application
- Enhanced styling (headings, code blocks, tables, lists)
- Theme override (light/dark/auto)
- Debouncing functionality

### MutationObserver (`content/observer.test.js`)
- Debouncing of mutation callbacks
- Container detection in added nodes
- Class change detection (dark mode, claude-styled)
- Observer lifecycle (create, disconnect)
- Performance tracking

### Adapters

#### Gemini Adapter (`adapters/gemini.test.js`)
- Hostname matching (gemini.google.com)
- Dark mode detection
- Thinking state detection and observation
- Shadow DOM handling
- Pre-processing of code and table blocks

#### Kimi Adapter (`adapters/kimi.test.js`)
- Hostname matching (kimi.ai, kimi.com)
- Dark mode detection
- Streaming state detection
- Container retrieval
- Pre-processing of streaming containers

#### Generic Adapter (`adapters/generic.test.js`)
- Universal hostname matching
- Multiple dark mode detection strategies
- Markdown content detection
- Confidence scoring for site matching
- Container validation

### Popup (`popup/popup.test.js`)
- DOM element caching
- Adapter name formatting
- Theme button state updates
- UI state synchronization
- Status display updates
- Error handling
- Site state loading
- Toggle change handling

## Mocks

The test suite includes comprehensive mocks for:

- **Chrome API**: `chrome.storage`, `chrome.tabs`, `chrome.runtime`, `chrome.action`, `chrome.scripting`
- **DOM APIs**: `localStorage`, `matchMedia`, `MutationObserver`
- **Browser APIs**: `performance.now`, `Node` constants

## Notes

- Some tests for the generic adapter's `detectDarkMode()` function are skipped due to
  persistent `matchMedia` mock issues across test boundaries. The function works correctly
  in actual browser environments.
- Tests use Jest's jsdom environment for DOM manipulation testing.
