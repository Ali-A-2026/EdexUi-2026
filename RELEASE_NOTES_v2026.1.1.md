# EdexUi-2026 v2026.1.1

`EdexUi-2026` is a maintained fork of the original eDEX-UI project.

## Highlights

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

## Attribution

- Maintainer of this continuation: Ali-A-Alwahed
- Original creator of eDEX-UI: Gabriel "Squared" Saillard
- Special thanks: Hyder6112, Ahmed Adnan

## Packaging Notes

- Multi-format Linux packaging: `.AppImage`, `.deb`, and `.rpm`
- Windows `.exe` and macOS `.dmg` remain supported through Electron Builder and GitHub Actions
- No code-signing certificate is bundled in this repository, so signed releases require your own signing credentials

## License

This project remains licensed under `GPL-3.0-or-later` because it is derived from the original eDEX-UI codebase.
