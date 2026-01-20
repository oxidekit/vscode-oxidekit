# OxideKit VS Code Extension

First-class VS Code support for [OxideKit](https://oxidekit.com) - a Rust-native application platform.

## Features

### Language Support

- **Syntax Highlighting** for `.oui` files
- **Autocomplete** for components, props, design tokens, and translation keys
- **Diagnostics** for invalid props, missing keys, and deprecated APIs
- **Hover Information** with component documentation
- **Jump to Definition** for components, tokens, and translations
- **Code Actions** for quick fixes and refactoring

### Commands

Access commands via the Command Palette (`Cmd/Ctrl + Shift + P`):

- `OxideKit: Start Dev Server` - Start the development server
- `OxideKit: Stop Dev Server` - Stop the development server
- `OxideKit: Build Desktop App` - Build for desktop release
- `OxideKit: Build Static Site` - Build as static site
- `OxideKit: Validate Project` - Run project diagnostics
- `OxideKit: Add Plugin` - Add a plugin to your project
- `OxideKit: i18n Check` - Check translation coverage
- `OxideKit: Import from Figma` - Import designs from Figma

### Sidebar Views

- **Components** - Browse available components
- **Design Tokens** - Explore colors, spacing, and other tokens
- **Translations** - View and manage i18n keys

### Code Snippets

Quick snippets for common patterns:

| Prefix | Description |
|--------|-------------|
| `app` | Create new app |
| `col` | Column layout |
| `row` | Row layout |
| `txt` | Text component |
| `box` | Styled container |
| `btn` | Button component |
| `card` | Card component |
| `grid` | Grid layout |

## Requirements

- VS Code 1.85.0 or later
- OxideKit CLI (`oxide`) installed (for commands)
- `oxide-lsp` binary (bundled or installed separately)

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Cmd/Ctrl + Shift + X`)
3. Search for "OxideKit"
4. Click Install

### From Source

```bash
cd vscode-oxidekit
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `oxidekit.lsp.path` | `""` | Path to oxide-lsp binary |
| `oxidekit.lsp.trace.server` | `"off"` | LSP trace level |
| `oxidekit.preview.enabled` | `true` | Enable live preview |
| `oxidekit.comServer.autoStart` | `false` | Auto-start dev server |
| `oxidekit.diagnostics.deprecated` | `true` | Show deprecation warnings |

## Development

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm test
```

### Packaging

```bash
npm run package
```

## Architecture

The extension delegates all parsing, validation, and analysis to `oxide-lsp`, a Rust-native Language Server that shares code with the OxideKit compiler. This ensures:

- Consistent behavior between editor and CLI
- No duplicate validation logic
- Version-accurate completions and diagnostics

## Contributing

Contributions welcome! Please read the [contributing guide](CONTRIBUTING.md) first.

## License

Apache-2.0 - see [LICENSE](LICENSE) for details.
