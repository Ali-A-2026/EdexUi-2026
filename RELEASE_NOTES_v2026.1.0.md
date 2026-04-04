# EdexUi-2026 v2026.1.0

`EdexUi-2026` is the first public release of a maintained continuation of the original eDEX-UI project.

This release keeps the original eDEX-UI experience, while updating compatibility, packaging, security, and usability for current systems.

## Highlights

- Renamed and repackaged as `EdexUi-2026`
- Updated to a modern Electron-compatible stack
- Added an App Manager to launch installed apps directly from the UI
- Improved Linux startup, screen-fit behavior, and terminal clarity
- Hardened dependencies and verified `0 vulnerabilities` with `npm audit --omit=dev`
- Built release artifacts for Windows and Linux packaging targets

## Main changes

- Added a built-in App Manager with search and launcher support for installed Linux desktop apps
- Moved the App Manager to a clear top-of-terminal action button
- Updated visible UI labels and app identity to `EdexUi-2026`
- Added compatibility fixes for current Electron behavior and remote-process handling
- Improved smoothness by reducing heavy default terminal rendering features
- Updated the PDF reader and key runtime dependencies to safer maintained versions

## Security

- Runtime and packaging dependency trees were updated and hardened
- `npm audit --omit=dev` reports `0 vulnerabilities` for both:
  - the root project
  - the `src` application package

## Attribution

`EdexUi-2026` is derived from the original eDEX-UI project by Gabriel "Squared" Saillard and preserves upstream credit.

## License

Because this project is derived from the original GPL-licensed eDEX-UI codebase, it remains licensed under `GPL-3.0-or-later`.
