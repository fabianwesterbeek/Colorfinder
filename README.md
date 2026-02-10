# Colorfinder

Colorfinder compares a hex color against curated named-color datasets and ranks the closest matches using Delta E (CIEDE2000).

## GitHub Pages

This repository is configured for deployment to GitHub Pages through GitHub Actions:

- Workflow: `.github/workflows/deploy-pages.yml`
- Trigger: push to `main` (and manual dispatch)
- Deployment URL: `https://fabianwesterbeek.github.io/Colorfinder/`

## Data Sources & Attribution

The generated datasets in `src/data/generated` are built from these sources:

- Large dataset (`large.json`): [`color-name-list`](https://www.npmjs.com/package/color-name-list), based on [`meodai/color-names`](https://github.com/meodai/color-names), licensed MIT.
- Medium dataset (`medium.json`): [`xkcd-colors`](https://www.npmjs.com/package/xkcd-colors), licensed MIT.
- Small dataset (`small.json`): [`color-name`](https://www.npmjs.com/package/color-name), licensed MIT.

MIT-licensed sources require preserving copyright and license notices in substantial copies/distributions.

## Fonts

This project self-hosts the following fonts via Fontsource:

- [`@fontsource/space-grotesk`](https://www.npmjs.com/package/@fontsource/space-grotesk) — SIL Open Font License 1.1 (OFL-1.1)
- [`@fontsource/ibm-plex-mono`](https://www.npmjs.com/package/@fontsource/ibm-plex-mono) — SIL Open Font License 1.1 (OFL-1.1)

These fonts are licensed for web embedding under OFL-1.1.

## Development

```bash
npm install
npm test
npm run build
```
