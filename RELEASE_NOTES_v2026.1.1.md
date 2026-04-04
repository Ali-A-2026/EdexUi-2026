# EdexUi-2026 v2026.1.1

`EdexUi-2026` v2026.1.1 is a release-readiness update for the maintained continuation of the original eDEX-UI project.

## Highlights

- Fixed the terminal color overlay issue
- Restored the terminal styling closer to the original eDEX-UI look
- Restored the working earth globe module
- Improved smoothness with better renderer defaults
- Cleaned release metadata, attribution, and GitHub-facing documentation

## Attribution

- Maintainer of this continuation: Ali-A-Alwahed
- Original creator of eDEX-UI: Gabriel "Squared" Saillard
- Special thanks: Hayder61112

## Packaging Notes

- Linux release outputs are intended to be regenerated as `.AppImage`, `.deb`, and `.rpm`
- Windows `.exe` and macOS `.dmg` remain supported through Electron Builder and GitHub Actions
- No code-signing certificate is bundled in this repository, so signed releases require your own signing credentials

## License

This project remains licensed under `GPL-3.0-or-later` because it is derived from the original eDEX-UI codebase.
