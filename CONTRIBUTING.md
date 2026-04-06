# Contributing to EdexUi-2026

Thanks for taking the time to contribute.

## Before You Start

- Keep the original eDEX-UI spirit and upstream credit intact.
- Prefer focused pull requests over large mixed changes.
- Avoid committing build output, `dist/`, or `node_modules/`.

## Local Setup

Install dependencies:

```bash
npm install
cd src && npm install && cd ..
```

Run the app locally:

```bash
npm start
```

Run the project validation command:

```bash
npm test --silent
```

## Pull Request Expectations

- Describe what changed and why.
- Keep changes scoped to one feature or fix when possible.
- Update documentation when behavior changes.
- Preserve attribution to the original eDEX-UI project.
- Include screenshots for visible UI changes when helpful.

## Release Notes

If your change affects packaging, user-visible behavior, or compatibility, update the changelog or release notes in the same pull request.
