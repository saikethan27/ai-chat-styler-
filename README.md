# Claude UI/UX for AI Chats

A Chrome extension that brings Claude's beautiful, readable markdown styling to other AI chat platforms.

![Extension Icon](icons/icon128.png)

## Features

- **Beautiful Markdown Styling** — Apply Claude's clean typography and color palette to AI responses
- **Multi-Site Support** — Works on Gemini, Kimi, and other markdown-based chat platforms
- **Streaming Content** — Styles content as it streams in real-time, no flicker
- **Dark Mode** — Automatic dark mode detection with manual override option
- **Per-Site Control** — Enable/disable independently for each website
- **Lightweight** — <1ms overhead per mutation batch, minimal performance impact

## Supported Sites

| Site | Status | Features |
|------|--------|----------|
| [Gemini](https://gemini.google.com) | ✓ Supported | Full styling, thinking blocks, streaming |
| [Kimi](https://kimi.ai) | ✓ Supported | Full styling, streaming |
| Generic Markdown | ✓ Supported | Works on any site with markdown content |

## Installation

### From Chrome Web Store

_Coming soon..._

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon should appear in your toolbar

## Usage

1. **Navigate** to a supported AI chat site (Gemini, Kimi, etc.)
2. **Click** the extension icon in your toolbar
3. **Toggle** the switch to enable/disable styling for that site
4. **Select** theme (Auto/Light/Dark) as desired

The extension will automatically:
- Detect markdown content on the page
- Apply Claude's styling to AI responses
- Adapt to the site's light/dark mode
- Handle streaming content smoothly

## Development

### Project Structure

```
├── background.js          # Service worker for state management
├── manifest.json          # Extension manifest
├── claude_index.css       # Claude color palette and variables
├── content/
│   ├── inject.js         # Main content script
│   ├── observer.js       # MutationObserver for dynamic content
│   ├── claude-markdown.css # Markdown styling rules
│   └── adapters/         # Site-specific adapters
│       ├── gemini.js
│       ├── kimi.js
│       └── generic.js
├── popup/                # Extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/                # Extension icons
```

### Building

No build step required — this is a vanilla JavaScript extension.

### Testing

1. Load the extension in Chrome (see Manual Installation)
2. Open `test.html` in Chrome for comprehensive markdown element testing
3. Visit supported sites to verify functionality
4. Check the console for debug logs (enable debug mode with `?claude-ui-debug` URL param)

### Debug Mode

Enable debug logging by:
- Adding `?claude-ui-debug` to the URL
- Or running `localStorage.setItem('CLAUDE_UI_DEBUG', 'true')` in console

## Privacy

This extension:
- ✅ Runs entirely in your browser
- ✅ Does not send data to external servers
- ✅ Only accesses sites you visit (for styling)
- ✅ Uses Chrome's built-in storage sync for settings

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Adding New Site Support

To add support for a new AI chat site:

1. Create a new adapter in `content/adapters/` following the existing pattern
2. Implement `canHandle()`, `getSelectors()`, and `isDarkMode()` methods
3. Add the adapter to the list in `content/inject.js`
4. Test thoroughly on the target site
5. Submit a PR

## License

MIT License — see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Color palette and typography inspired by [Claude](https://claude.ai)
- Built with the [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)

---

**Note:** This is an unofficial extension and is not affiliated with Anthropic or Claude.
