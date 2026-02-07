/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock matchMedia with a factory that returns fresh mocks each time
const createMatchMediaMock = (matches = false) => {
  return jest.fn().mockImplementation(query => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }));
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: createMatchMediaMock(false)
});

// Mock Node constants
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  COMMENT_NODE: 8
};

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  debug: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
  table: jest.fn(),
  count: jest.fn(),
  countReset: jest.fn()
};

// Reset DOM after each test
afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  jest.clearAllMocks();
});
