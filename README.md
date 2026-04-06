# EdexUi-2026

EdexUi-2026 is a maintained continuation of the original eDEX-UI project, updated for current Linux systems while preserving the classic sci-fi terminal experience.

This repository is intended to stay respectful to upstream:

- Original project creator: Gabriel "Squared" Saillard
- Current maintainer of this continuation: Ali-A-Alwahed
- Special thanks: Hyder6112, Ahmed Adnan

## Status

- Renamed and repackaged as `EdexUi-2026`
- Added an integrated Application Manager utility
- Hardened dependencies and verified `0 vulnerabilities` with `npm audit --omit=dev`
- Updated dependencies for current Electron support
- Improved Linux startup, screen-fit behavior, and terminal clarity
- Improved the earth globe module and presentation
- Cleaned release metadata, attribution, and GitHub-facing documentation
- Added Vulkan optimizations
- Improved overall responsiveness
- Removed deprecated code paths
- Improved robust cross-platform support

## Project Goals

- Keep the original eDEX-UI feel
- Maintain compatibility with modern Electron and Linux desktops
- Ship cleaner release metadata and safer defaults
- Preserve original credit and GPL licensing

## How to run or build from source

Install dependencies:

```bash
# Debian
sudo apt install npm

# Fedora
sudo dnf install npm
```

Clone the repository and enter the project folder, then install dependencies:

```bash
npm install
cd src && npm install && cd ..
```

Run the app normally:

```bash
npm start
```

Run the app with the intro skipped:

```bash
npm run start:fast
```

## Building Releases

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

Note:

- Windows artifacts can be built on Linux as well.
- macOS artifacts are best produced by GitHub Actions on native macOS runners for the most reliable results.
- Public binaries are currently unsigned unless you add your own signing credentials.

## Attribution

EdexUi-2026 is a fork of the original eDEX-UI project by Gabriel "Squared" Saillard and upstream contributors.

This continuation is maintained by Ali-A-Alwahed.

Special thanks to Hyder6112 and Ahmed Adnan for helping with the project.

## License

Because this project is derived from the original GPL-licensed eDEX-UI codebase, it remains licensed under `GPL-3.0-or-later`.
