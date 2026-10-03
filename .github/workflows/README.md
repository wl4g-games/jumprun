# CI/CD Architecture

Two workflows cover the path from pull request validation to a versioned
GitHub Release and GitHub Pages deployment.

## Workflows

| File | Trigger | Responsibility |
|---|---|---|
| `ci.yml` | Pull request opened, updated, reopened, or marked ready | Install dependencies, run tests, and verify the production build |
| `release.yml` | Push to `main` (including a merged PR), or manual dispatch | Build once, package `dist`, publish a GitHub Release, and deploy the same output to Pages |

## Release pipeline

```text
main updated
  -> determine semantic version
  -> npm ci + npm test + Vite build
  -> jumprun-vX.Y.Z-dist.tar.gz
  -> GitHub Release
  -> GitHub Pages
```

The first release uses the stable version in `package.json`. Later releases
inspect all commits since the highest stable `vX.Y.Z` tag:

- a breaking-change marker or a `refactor:` subject bumps the major version;
- a `feat:` subject bumps the minor version;
- every other main update bumps the patch version.

If a workflow is rerun for a commit that is already tagged, it reuses that tag
instead of incrementing the version again.

## Required repository setting

For the first deployment, select **Settings -> Pages -> Build and deployment
-> Source -> GitHub Actions**. The workflow uses only the repository-scoped
`GITHUB_TOKEN`; no deployment secret is required.
