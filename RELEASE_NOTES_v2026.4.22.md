# EdexUi-2026 v2026.4.22

`EdexUi-2026` continues as a maintained fork of the original eDEX-UI project.

## Highlights

- Updated project versioning and release metadata to `v2026.4.22`
- Fixed CI packaging flow so macOS `.dmg` uploads target the active release tag
- Reworked build scripts to avoid recursive `npm install` behavior in GitHub Actions
- Kept Linux (`.AppImage`, `.deb`, `.rpm`) and Windows (`.exe`) packaging aligned with the same release version naming

## Attribution

- Maintainer of this continuation: Ali-A-Alwahed
- Original creator of eDEX-UI: Gabriel "Squared" Saillard
- Special thanks: Hyder6112, Ahmed Adnan

## Packaging Notes

- Linux packaging: `.AppImage`, `.deb`, and `.rpm`
- Windows packaging: `.exe`
- macOS packaging: `.dmg` via native macOS GitHub runners
- No code-signing certificate is bundled in this repository, so signed releases require your own signing credentials

## License

This project remains licensed under `GPL-3.0-or-later` because it is derived from the original eDEX-UI codebase.
