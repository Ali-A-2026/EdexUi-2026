# Signing Guide

EdexUi-2026 does not include any trusted signing certificate in the repository.

## Important

- Self-signed certificates are suitable for local testing only.
- Public Windows signing requires a trusted code-signing certificate from a certificate authority.
- Public macOS signing requires an Apple Developer signing identity and notarization credentials.
- Do not commit certificate files, private keys, or filled environment files to the repository.

## Recommended Local Setup

1. Copy `.env.signing.example` to `.env.signing.local`
2. Fill in your real certificate path and secrets
3. Export the variables in your shell before building

Example:

```bash
set -a
source .env.signing.local
set +a
```

## Common Variables

- `CSC_LINK`: path or secure reference to a trusted `.p12`/`.pfx` certificate
- `CSC_KEY_PASSWORD`: password for the signing certificate
- `CSC_NAME`: optional certificate subject override for Windows signing
- `APPLE_ID`: Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password for notarization
- `APPLE_TEAM_ID`: Apple developer team identifier

## Current Project Status

- Linux release files can be built without code signing
- Windows `.exe` can be packaged unsigned today
- macOS `.dmg` can be packaged, but trusted signing still requires Apple credentials

## Reminder

This repository is prepared for future trusted signing, but public release trust depends on real CA-issued or Apple-issued credentials.
