# EdexUi-2026 Release Checklist

This project is prepared for GitHub upload and cross-platform packaging.

## Maintainer And Credits

- Maintainer of this continuation: `Ali-A-Alwahed`
- Original creator of eDEX-UI: `Gabriel "Squared" Saillard`
- Special thanks: `Hyder6112`, `Ahmed Adnan`

These credits appear in:

- `README.md`
- `CHANGELOG.md`
- `RELEASE_NOTES_v2026.4.22.md`
- `package.json`
- `src/package.json`
- In-app Settings modal

## Local Build Artifacts Ready

Built locally in `dist/`:

- `EdexUi-2026-Linux-x86_64.AppImage`
- `EdexUi-2026-linux-amd64.deb`
- `EdexUi-2026-linux-x86_64.rpm`
- `EdexUi-2026-Windows-x64.exe`
- `latest-linux.yml`
- `latest.yml`

## macOS DMG

The project is configured for `.dmg` output, but a valid macOS `.dmg` cannot be built on this Linux machine because the Electron DMG toolchain depends on Darwin-only native modules.

To generate the `.dmg`, use one of these:

1. GitHub Actions macOS runner via `.github/workflows/build-binaries.yaml`
2. A local Mac with Node.js and project dependencies installed

## Signing Certificates

No signing certificate is stored in this repository.

Current builds are unsigned until you add your own release-signing credentials for:

- Windows code signing
- macOS code signing / notarization

## GitHub Upload Readiness

Before uploading, confirm:

1. Private development repo remains `Ali-A-2026/EdexUi_2026`
2. Public release repo is `Ali-A-2026/EdexUi-2026`
3. URLs in `package.json`, `src/package.json`, and `src/classes/updateChecker.class.js` target the public repo
4. Commit source files only; do not commit `dist/`, `node_modules/`, or `prebuild-src/`

## Public Changelog Policy

Keep public release notes and `CHANGELOG.md` focused on notable user-facing changes only.

Mention these publicly:

- major new features
- critical bug fixes
- security or dependency fixes
- meaningful design or behavior changes
- fixes that respond to public issues or reported regressions

Do not add small internal maintenance by default:

- silent polishing
- local cleanup
- explorer/file filtering cleanup
- internal config handling cleanup
- packaging prep that users do not directly notice

If a small fix becomes release-critical or changes visible user behavior, then it can be promoted into the public changelog.

## Verification Summary

- Terminal overlay issue fixed
- Globe restored
- Smoothness improved
- `npm audit --omit=dev` passed in root
- `npm audit --omit=dev` passed in `src`
