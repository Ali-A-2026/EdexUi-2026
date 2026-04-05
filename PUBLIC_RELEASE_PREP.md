# Public Release Prep (EdexUi-2026)

This project is configured for:

- Private development repo: `Ali-A-2026/EdexUi_2026` (`origin`)
- Public release repo: `Ali-A-2026/EdexUi-2026` (`public`)

## Current Git Remotes

- `origin`: private development repository
- `public`: public release repository

## When You Are Ready To Publish

1. Rename your local folder (optional, for consistency):
   - `EdexUi_2026` -> `EdexUi-2026`
2. Create the public GitHub repository:
   - `Ali-A-2026/EdexUi-2026`
3. Push source code to public:
   - `git push public main`
4. Run GitHub Action workflow:
   - `Build packaged binaries`
5. Download release artifacts from Actions and publish in GitHub Releases.

## Notes

- Keep private repo for development history and daily work.
- Use public repo for published source and release assets.
- Do not commit `dist/`, `node_modules/`, or `prebuild-src/`.
