# EdexUi-2026

EdexUi-2026 is a maintained continuation of the original eDEX-UI project, updated for current Linux systems while preserving the classic sci-fi terminal experience.

This repository is intended to stay respectful to upstream:

- Original project creator: Gabriel "Squared" Saillard
- Current maintainer of this continuation: Ali-A-Alwahed
- Special thanks: Hyder6112, Ahmed Adnan

## Status

- Terminal overlay color issue fixed
- Original-style terminal appearance restored
- Globe module restored and working again
- Smoother rendering defaults enabled for the maintained build
- Linux release artifacts supported: `.AppImage`, `.deb`, `.rpm`
- Windows and macOS release automation prepared through GitHub Actions

## Project Goals

- Keep the original eDEX-UI feel
- Maintain compatibility with modern Electron and Linux desktops
- Ship cleaner release metadata and safer defaults
- Preserve original credit and GPL licensing

## Local Development

Install dependencies:

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

- Linux artifacts can be built on Linux.
- Windows and macOS artifacts are best produced by GitHub Actions on their native runners for the most reliable results.
- Public binaries are currently unsigned unless you add your own signing credentials.

## Release Files

Current release outputs are written to `dist/`.

Expected release artifacts:

- `EdexUi-2026-Linux-x86_64.AppImage`
- `EdexUi-2026-linux-amd64.deb`
- `EdexUi-2026-linux-x86_64.rpm`
- `EdexUi-2026-Windows-x64.exe`
- `EdexUi-2026-macOS-x64.dmg` when built on macOS CI

## Attribution

EdexUi-2026 is derived from the original eDEX-UI project by Gabriel "Squared" Saillard and upstream contributors.

This continuation is maintained by Ali-A-Alwahed.

Special thanks to Hyder6112 and Ahmed Adnan for helping with the project.

## License

Because this project is derived from the original GPL-licensed eDEX-UI codebase, it remains licensed under `GPL-3.0-or-later`.
