# Changelog

All notable changes to `EdexUi-2026` will be documented in this file.

Only significant user-facing changes should be listed here:
- major features
- critical bug fixes
- dependency or security fixes
- notable design or behavior changes
- fixes tied to reported public issues

Small internal cleanup, packaging prep, or silent polish updates should stay out of the public changelog unless they materially change the release for users.

This project is a maintained continuation of the original eDEX-UI codebase.
It preserves upstream credit and remains licensed under `GPL-3.0-or-later`.

## [2026.1.1] - 2026-04-04

Release-readiness update focused on polish, packaging, attribution, and smoother runtime behavior.

### Changed

- Restored the terminal shell styling closer to the original eDEX-UI presentation while keeping the terminal overlay fix.
- Re-enabled smoother GPU-backed rendering defaults for the maintained build.
- Switched the terminal to the canvas renderer for better responsiveness.
- Updated default startup so `npm start` launches the normal intro flow.
- Added clearer maintainer and upstream attribution across package metadata and docs.

### Fixed

- Fixed the colored overlay sitting over the terminal.
- Fixed the globe module by restoring the original rendering path in the maintained build.
- Fixed placeholder release metadata such as repository URLs, maintainer fields, and update-checker references.
- Fixed old branding leftovers in the boot log and release-facing docs.

### Performance

- Enabled terminal hardware acceleration by default for current builds.
- Reduced unnecessary globe redraw work when the window is hidden.
- Added safer globe resize guards to avoid renderer errors during layout changes.

### Packaging

- Refreshed release outputs for `.AppImage`, `.deb`, `.rpm`, `.exe`, and `.dmg`.
- Aligned GitHub Actions and repository metadata so cross-platform packaging succeeds against the correct repository owner.

### Attribution

- Maintainer for this continuation: `Ali-A-Alwahed`
- Original creator of eDEX-UI: Gabriel "Squared" Saillard
- Special thanks: `Hyder6112`, `Ahmed Adnan`

## [2026.1.0] - 2026-04-03

First public `EdexUi-2026` release based on the original eDEX-UI codebase, updated for current systems and modern packaging.

### Added

- Added an integrated App Manager for launching installed Linux desktop applications from inside the UI.
- Added backend scanning of installed `.desktop` entries and app launch support.
- Added keyboard navigation and search support inside the App Manager.
- Added a top-of-terminal App Manager button for faster access.
- Added `SECURITY.md` for GitHub security reporting.
- Added release/update metadata generation for packaged builds.

### Changed

- Renamed the application from `eDEX-UI` to `EdexUi-2026`.
- Updated visible app naming in the boot screen, renderer UI, packaged app title, and metadata.
- Bumped the project version to `2026.1.0`.
- Updated the project to run on a modern Electron stack.
- Updated remote-process compatibility using `@electron/remote`.
- Updated the internal updater flow so it can target the `EdexUi-2026` fork instead of upstream eDEX-UI.
- Updated packaging metadata for Windows and Linux distributions.

### Fixed

- Fixed Electron startup in environments where `ELECTRON_RUN_AS_NODE=1` caused the app to fail.
- Fixed multiple Linux launch/session issues on modern desktop setups.
- Fixed screen-fit and window-state behavior so the UI works better on current displays.
- Fixed terminal readability by moving toward a clearer and more standard terminal palette.
- Fixed old UI labels so the visible shell now reflects `EdexUi-2026`.
- Fixed legacy config handling by adding migration support from older eDEX-UI user-data locations.
- Fixed PDF viewing integration to work with the newer maintained `pdfjs-dist` package.
- Removed the extra App Manager entry from the terminal tab strip and kept the launcher at the top of the terminal area.

### Performance

- Reduced forced heavy terminal rendering features by disabling WebGL terminal acceleration by default.
- Disabled terminal ligatures by default for smoother rendering on more systems.
- Reduced startup contention by delaying update checks.
- Improved general smoothness on Linux with safer default rendering behavior.

### Security

- Upgraded vulnerable runtime dependencies, including:
  - `systeminformation`
  - `ws`
  - `nanoid`
  - `smoothie`
  - `geolite2-redist`
  - `pdfjs-dist`
- Replaced the old rebuild toolchain with `@electron/rebuild`.
- Verified `npm audit --omit=dev` reports `0 vulnerabilities` for:
  - the root project
  - the `src` application package

### Packaging

- Built Windows installer output as `.exe`.
- Built Linux distribution outputs as `.AppImage` and `.deb`.
- Prepared Linux `.rpm` packaging flow for Fedora-style distributions.

### Notes

- `EdexUi-2026` is a continuation of the original Electron/eDEX-UI codebase, not the React/Vite rewrite path that was explored earlier in development.
- Original project credit remains with Gabriel "Squared" Saillard and the upstream eDEX-UI contributors.
