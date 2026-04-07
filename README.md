# EdexUi-2026

EdexUi-2026 is a maintained continuation of the original eDEX-UI project, updated for current Linux systems while preserving the classic sci-fi terminal experience.

[![Download Latest Release](https://img.shields.io/badge/Download-Latest%20Release-2ea043?style=for-the-badge)](https://github.com/Ali-A-2026/EdexUi-2026/releases/latest)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Ali-A-2026/EdexUi-2026/build-binaries.yaml?branch=main&label=build)](https://github.com/Ali-A-2026/EdexUi-2026/actions/workflows/build-binaries.yaml)
[![Latest Release](https://img.shields.io/github/v/release/Ali-A-2026/EdexUi-2026?label=release)](https://github.com/Ali-A-2026/EdexUi-2026/releases/latest)
[![License](https://img.shields.io/github/license/Ali-A-2026/EdexUi-2026)](LICENSE)

## Quick Navigation

- [Latest Release](https://github.com/Ali-A-2026/EdexUi-2026/releases/latest)
- [Screenshots](#screenshots)
- [Run From Source](#run-from-source)
- [Build Packages](#build-packages)
- [Contributing](#contributing)
- [Security](#security)

Latest public release: [v2026.1.1](https://github.com/Ali-A-2026/EdexUi-2026/releases/tag/v2026.1.1)

This continuation stays respectful to upstream:

- Original project creator: Gabriel "Squared" Saillard
- Current maintainer of this continuation: Ali-A-Alwahed
- Special thanks: Hyder6112, Ahmed Adnan

## Upstream Relationship

- Original upstream project: [GitSquared/eDEX-UI](https://github.com/GitSquared/edex-ui)
- Maintained public continuation: [Ali-A-2026/EdexUi-2026](https://github.com/Ali-A-2026/EdexUi-2026)
- Downloads, issue reports, and release tracking for this maintained continuation should use this repository.

## Screenshots

### Main Interface

![EdexUi-2026 Main Interface](docs/screenshots/main-interface.png)

### Application Manager

![EdexUi-2026 Application Manager](docs/screenshots/application-manager.png)

### Startup Screen

![EdexUi-2026 Startup Screen](docs/screenshots/startup-screen.png)

## Highlights

- Maintained continuation of the original eDEX-UI experience
- Updated for current Electron and modern Linux desktop environments
- Improved terminal startup, screen-fit behavior, and runtime responsiveness
- Restored and improved the world-view globe module
- Packaged release outputs for `.AppImage`, `.deb`, `.rpm`, `.exe`, and `.dmg`
- Public repository metadata, changelog, and security policy prepared for GitHub

## Release Assets

Published builds should be distributed through GitHub Releases rather than committed into the repository.

Current release formats:

| Platform | Format |
| --- | --- |
| Linux | `.AppImage`, `.deb`, `.rpm` |
| Windows | `.exe` |
| macOS | `.dmg` |

## Run From Source

Install dependencies:

```bash
# Debian / Ubuntu
sudo apt install npm

# Fedora
sudo dnf install npm
```

Install project packages:

```bash
npm install
cd src && npm install && cd ..
```

Run the app:

```bash
npm start
```

Skip the intro animation:

```bash
npm run start:fast
```

## Build Packages

Linux:

```bash
npm run prebuild-linux
npm run build-linux
```

Windows:

```bash
npm run build-windows
```

macOS:

```bash
npm run build-darwin
```

Notes:

- Windows artifacts can also be built from Linux.
- macOS artifacts are best produced by GitHub Actions on native macOS runners.
- Public binaries are unsigned unless you add your own signing credentials.

## Repository Layout

- `src/` application source
- `media/` icons and packaging assets
- `.github/` workflows and community files
- `dist/` local build output only

## Project Goals

- Preserve the original eDEX-UI feel
- Maintain compatibility with modern Electron and Linux desktops
- Ship cleaner release metadata and safer defaults
- Preserve original credit and GPL licensing

## Contributing

Contributions, fixes, and packaging improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Issues And Downloads

- Download the maintained builds from the [latest release page](https://github.com/Ali-A-2026/EdexUi-2026/releases/latest).
- Report bugs or packaging issues in the [issue tracker](https://github.com/Ali-A-2026/EdexUi-2026/issues).
- Follow development and maintenance updates in this repository.

## Security

Please review [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## Attribution

EdexUi-2026 is a fork of the original eDEX-UI project by Gabriel "Squared" Saillard and upstream contributors.

This continuation is maintained by Ali-A-Alwahed.

Special thanks to Hyder6112 and Ahmed Adnan for helping with the project.

## License

Because this project is derived from the original GPL-licensed eDEX-UI codebase, it remains licensed under `GPL-3.0-or-later`.
