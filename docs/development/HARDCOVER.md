# Coding Agent handover: Animal Jump Run

> Snapshot date: 2026-11-01. Refresh the commit, release tag, and public
> availability status when handing this file to another team or agent.

## Start here

Read these documents before changing behaviour:

1. [Architecture overview](../architecture/OVERVIEW.md) — system boundaries and ownership.
2. [中文架构总览](../architecture/OVERVIEW_CN.md) — Chinese equivalent.
3. [`README.md`](../../README.md) — player-facing usage, assets, and release summary.
4. [CI/CD architecture](../../.github/workflows/README.md) — release/version rules.

The current branch snapshot is `dev` at `1613ab8` when this document was
written. Treat source and tests—not this hash—as the authority after any new
checkout.

## Access, source, and deployment endpoints

| Use | Address / command | Notes |
|---|---|---|
| Configured public game address | <https://wl4g-games.github.io/jumprun/> | GitHub Pages target configured in `package.json`, README, and release workflow. Verify live availability separately before announcing an incident/status. |
| Source repository | <https://github.com/wl4g-games/jumprun> | Canonical remote recorded in `package.json`. |
| Pull-request CI | <https://github.com/wl4g-games/jumprun/actions/workflows/ci.yml> | PR validation: install, test, build, plus non-blocking status comment. |
| Release/deploy workflow | <https://github.com/wl4g-games/jumprun/actions/workflows/release.yml> | Triggered by `main` push or manual dispatch. |
| Container image | `ghcr.io/wl4g-games/jumprun:latest` | Each release also pushes immutable `:vX.Y.Z` tags for `linux/amd64`. |
| Local development | `npm ci && npm run dev` | Vite binds to `127.0.0.1`; camera features require `localhost` or HTTPS. |
| Local production preview | `npm run build && npm run preview` | Use for static bundle checks; do not treat it as a camera HTTPS test. |
| Local container | `docker run --rm -p 8080:8080 ghcr.io/wl4g-games/jumprun:latest` | Visit <http://localhost:8080/>. Remote camera use needs TLS in front of the container. |

There are no application API endpoints, database connections, secrets, user
accounts, or remote runtime services. A browser's camera permission is the only
interactive capability required by motion mode; all inference stays local.

## Current implementation inventory

### Player experience

- Static browser game with a Three.js world and 16 selectable runners.
- Two inputs:
  - camera motion (default): front-camera Pose Landmarker + bundled MLP jump
    detector;
  - manual: Space, Arrow Up, or canvas tap.
- Endless-runner loop with increasing speed, carrots, progressive obstacles,
  multiple obstacle patterns, accuracy-based rewards, score, best score,
  failure/restart flow, sound, sharing, bilingual UI, fullscreen, and mobile
  CSS immersive fallback.
- Animal GLBs are locally bundled, transformed into small runtime rigs, given
  species-aware gait, optional fur/feathers, and individual call profiles.
  A procedural model is the deliberate fallback if a GLB cannot load.

### Learning and parent-policy behavior

- The current source has **150** bilingual questions across Chinese language,
  mathematics, English, geography, physical science, chemistry, Chinese
  history, world history, and finance.
- Every question has a stable ID, four rotated options, Chinese authoritative
  answer index, English equivalent text, explanation, and test coverage for
  alignment.
- Manual mode defaults to a three-minute, one-correct-answer quiz lock. Parent
  settings can choose 1/3/5/10/15/20/30 minute intervals and 1/2/3 correct
  answers; default camera mode has no quiz timer.
- The timer counts only active manual gameplay. It persists across refreshes,
  setting changes, and same-origin tabs; reducing a duration can tighten the
  active period, but a longer duration must not add time to it.
- The parent password is a local salted PBKDF2 digest, not authentication. It
  prevents accidental UI changes but is bypassable via site-data clearing,
  private browsing, or developer tools.

### Build and release

- Runtime: Node 22, Vite 7, vendored Three.js/GLTFLoader, and
  `@mediapipe/tasks-vision`.
- `postinstall` copies the required MediaPipe WASM assets under `public/`.
- PR CI runs `npm ci`, `npm test`, and a production Vite build.
- `main` release computes a semantic tag, builds a reproducible `dist` archive,
  creates/updates a GitHub Release, then publishes a GHCR `linux/amd64` image
  and deploys the same static output to GitHub Pages in parallel.
- Docker builds Vite output and serves it via `nginxinc/nginx-unprivileged` on
  port 8080 with a root-page healthcheck.

## Important ownership boundaries

| Area | Own it here | Do not do this |
|---|---|---|
| Game rules | `src/dino-game.js` | Put collisions, reward math, or spawn logic in Three.js / DOM handlers. |
| Rendering | `src/runner-scene.js` plus focused scenery modules | Let renderer code authoritatively mutate score or quiz state. |
| App wiring | `src/main.js` | Turn it into a second game-rules engine; wire focused modules instead. |
| Animal pipeline | `animal-assets`, `animal-skinner`, `animal-gait`, `animal-coat`, `animal-morphology` | Patch per-frame model geometry in `main.js` or bypass disposal. |
| Questions | `question-bank.js` + `question-bank.en.js` + `test/question-bank.test.js` | Change an ID/order/options in only one language. |
| Parent policy | `game-settings`, `manual-quiz-timer`, `quiz-lock-state`, `admin-lock` | Claim localStorage state is secure or reset active time on a settings update. |
| I18n | `i18n.js`, paired question bank | Add visible Chinese text without an English key/translation. |

## Local data and privacy

| Key | Owner | Contents / care |
|---|---|---|
| `jump-run-settings-v2` | `game-settings.js` | Animal choice and manual mode/policy. A v1 migration exists. |
| `jump-run-quiz-lock-state-v1` | `quiz-lock-state.js` | Remaining seconds, current cycle duration, expiry/lock status. Coordinate multi-tab changes through the provided store. |
| `jump-run-quiz-admin-v1` | `admin-lock.js` | Salt and PBKDF2 digest. Never log it or promote it to a security guarantee. |
| `bunny-run-accuracy-stars-best` | `main.js` | Best-score number. |

No storage is synced to a service. Do not add analytics, video uploads, cloud
profiles, or remote question fetching without a deliberate privacy, consent,
retention, and failure-mode design.

## Developer workflow

```sh
npm ci
npm test
npm run build
npm run dev
```

Use `npm run preview` for a production-bundle smoke check. `dist/` is build
output, not a hand-edited source-of-truth directory. The project is not Rust,
so no Cargo workflow applies.

Before handing off a functional change:

1. Run `npm test`.
2. Run `npm run build` for changes affecting modules, assets, Vite paths, or
   static resources.
3. Check `git diff --check` and `git status --short`.
4. For camera, audio, fullscreen, sharing, or responsive CSS changes, test on
   at least one supported desktop browser and one mobile browser/device.
5. For question edits, preserve ID pairing, exactly four unique options, stable
   answer mapping, and Chinese/English parity. Update bank-specific tests.
6. For a release, use conventional commit subjects carefully: the workflow
   treats `refactor:` as a major bump, `feat:` as minor, and other changes as
   patch (see workflow documentation).

## Known facts and current gaps

These are observed limitations or cleanup items; they are not claims that an
implementation is already scheduled.

1. **Player-facing count copy is stale.** Source and tests define 150
   questions, while some text in `README.md`, `index.html`, and `i18n.js`
   still says 100. Update all localized copy in one focused documentation/UI
   patch before presenting the curriculum count publicly.
2. **Parent controls are not security controls.** They are intentionally local
   convenience controls. Any requirement for tamper resistance, account policy,
   family sharing, or reporting needs a server-backed product design.
3. **No browser E2E suite is present.** Node tests cover logic and many DOM
   contracts but do not grant a camera, exercise native fullscreen, or validate
   device-specific Web Share behavior.
4. **No service worker/PWA layer is present.** The static bundle is cacheable by
   the browser/CDN but does not explicitly provide offline installation or
   update management.
5. **No remote observability exists.** There is no privacy-safe error signal,
   performance measurement, or deployment health dashboard beyond platform
   workflow status and the container healthcheck.
6. **Asset loading is intentionally local and fallback-safe, but no loading
   budget/performance telemetry exists.** Test lower-memory mobile devices when
   adding GLBs, audio, fur shells, or higher resolution textures.

## Enhancement backlog for a future agent

Priorities are suggestions, not commitments. Keep each change independent and
avoid mixing product, security, asset, and infrastructure migrations in one PR.

### P0 — correctness, consistency, and confidence

- Reconcile all `100`-question wording with the actual 150-question bank in
  Chinese and English UI/readme copy; add a regression test for visible count
  copy if it remains intentionally explicit.
- Add Playwright or equivalent browser smoke coverage for setup, manual jump,
  quiz lock/unlock, language switch, and basic canvas load. Mock camera and
  Web Share; keep true camera verification as a device checklist.
- Add a concise release smoke checklist: Pages URL, current image tag, local
  container healthcheck, desktop camera mode, iOS/Safari fullscreen fallback.
- Add an asset-budget test or manifest checks for GLB/audio sizes and expected
  licenses before new animal assets are accepted.

### P1 — quality and accessibility

- Respect `prefers-reduced-motion`; add a low-motion scene mode and ensure
  keyboard focus is visible when dialogs open/close.
- Offer input calibration guidance and a configurable inference-rate/quality
  preset for low-end devices, while preserving local-only processing.
- Improve screen-reader narration of score, timer, game-over, quiz feedback,
  and fullscreen fallback. Verify focus trapping/restoration on every dialog.
- Add localization schema checks so new `data-i18n` strings and question
  subjects cannot ship without English mappings.
- Create a curriculum authoring checklist: age band, evidence source, neutral
  wording for active events, explanation quality, and bilingual review.

### P2 — product and platform extensions

- Add an opt-in service worker/PWA install flow with versioned caches and a
  clear update/rollback policy. Ensure the large MediaPipe and GLB assets do
  not make first install unexpectedly expensive.
- Add locally stored accessibility/profile presets (muted sound, reduced
  motion, chosen control mode, sensitivity), with schema migration and a reset
  control.
- Add additional game modes only by extending the pure game-state contract
  first: timed rounds, obstacle practice, animal gallery, or quiz practice.
- Add a content manifest or offline authoring tool for question review. Do not
  fetch unsigned live questions into a child-facing page without validation and
  caching design.
- If account-level parent controls are required, define backend threat model,
  consent, minimal data model, password reset, authorization, audit logging,
  regional privacy requirements, and offline behavior before implementation.

### P3 — operational maturity

- Add privacy-preserving, explicitly opt-in client error/performance reporting
  with no camera frames, landmarks, personal identifiers, or raw quiz answers.
- Publish image SBOM/provenance and vulnerability scans as release artifacts.
- Consider multi-architecture container publishing only after testing both
  images and documenting the added release cost.
- Add a deployment status page/checker that distinguishes workflow success from
  public Pages reachability and CDN propagation.

## Safe modification recipes

### Add or change a question

1. Add the Chinese item in `src/question-bank.js` with a stable prefixed ID.
2. Add exactly the matching English item, options in the same source order, in
   `src/question-bank.en.js`.
3. Update expected totals, subjects/prefixes, and picker-cycle assertions in
   `test/question-bank.test.js`; update the related total assertion in
   `test/core.test.js`.
4. Do not reorder existing IDs casually: deterministic option rotation and
   bilingual answer alignment depend on them.
5. Run tests and review both language versions.

### Add an animal or replace an asset

1. Define catalog metadata, asset mapping, audio profile, morphology, gait,
   and coat profile as appropriate; do not rely on a catalog-only addition.
2. Use a local licensed GLB and update asset license/attribution documentation.
3. Validate the realistic pipeline and deliberately test procedural fallback.
4. Extend anatomy, gait, morphology, coat, and audio tests for the new species.
5. Measure a target mobile device before raising geometry, texture, or shell
   density budgets.

### Change manual quiz policy

1. Keep game mechanics separate from policy and reuse `ManualQuizTimer`.
2. Preserve active-cycle semantics: no setting change may grant extra time or
   silently clear an expired lock.
3. Update normalization, storage migration, cross-tab behavior, UI, i18n, and
   tests together.
4. Do not turn local PBKDF2 data into a claim of secure parental enforcement.

### Change camera/motion behavior

1. Keep stream cleanup, model cleanup, stale-generation guards, calibration,
   and hidden-document checks intact.
2. Preserve `localhost`/HTTPS constraints and front-camera preference.
3. Benchmark inference and test missing-person, permission-denied, camera-busy,
   track-ended, pause/resume, and manual-mode paths.
4. Never export or log raw frames/landmarks without explicit product approval.

## What to avoid

- Do not put secret values in the static site, localStorage, README, test
  fixtures, or GitHub workflow logs.
- Do not commit generated `dist/` as source unless repository policy changes.
- Do not delete named container images as generic cleanup. This project does
  not need a local Kubernetes deployment for its normal test/build path.
- Do not use destructive Git reset/checkout to hide an unrelated dirty tree.
- Do not add a new animal/audio/texture without its license trail.
- Do not represent the configured Pages URL as live-verified unless it was
  actually checked at the time of communication.
