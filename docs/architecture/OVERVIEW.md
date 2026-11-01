# Animal Jump Run architecture overview

## Purpose and scope

Animal Jump Run is a static, browser-only 3D endless runner for children. A
player chooses one of sixteen animals, starts or jumps by body movement or
protected manual controls, collects carrots, clears obstacles, and can be
paused by a local quiz lock. The application has no application server, API,
database, account system, or telemetry service.

This document describes the implementation represented by the current source
tree. It is an architectural map, not a product roadmap. Proposed work belongs
in [the development handover](../development/HARDCOVER.md).

## System at a glance

```text
index.html + src/main.js
        |
        +-- setup, accessibility, language, fullscreen, sharing, local state
        |
        +-- camera mode -----------------------------------------------+
        |  getUserMedia -> MediaPipe Pose -> local MLP -> game.jump()  |
        |                                                              |
        +-- manual mode -> ManualQuizTimer -> quiz dialog -> session --+
        |                                                              |
        v                                                              v
  createDinoGame() <-------------------------------------------- game state
        |                                                    phase/score/speed
        v
  createRunnerScene(canvas)
        |
        +-- Three.js scene, lights, terrain, scenery, carrots, obstacles
        +-- local GLB -> runtime skinner -> gait / coat / audio profile
        v
     WebGL canvas + Web Audio
```

The only network-like browser request required for play is camera permission in
motion mode. Motion model files, MediaPipe WASM, GLB assets, texture, and audio
are emitted as static site assets. Camera frames stay in the browser.

## Runtime lifecycle

1. `index.html` loads `src/main.js`; Vite resolves and bundles the ESM graph.
2. `main.js` loads local preferences, creates the quiz-lock store and timer,
   builds the setup and admin dialogs, creates the pure game state, and starts
   the request-animation-frame loop.
3. The first-run setup chooses an animal and either camera or manual controls.
   Until it is completed, game interaction is blocked.
4. `createRunnerScene()` asynchronously loads the chosen animal visual. The
   local GLB pipeline is preferred; a procedural model is a rendering fallback.
5. During active play, `dino-game.js` advances the deterministic-enough game
   state; `runner-scene.js` projects that state into Three.js.
6. In camera mode, `main.js` runs pose inference from
   `requestVideoFrameCallback` when available, otherwise animation frames. The
   local learned detector yields a calibrated jump signal.
7. In manual mode, only active gameplay decrements `ManualQuizTimer`. On
   expiry, a modal quiz pauses play. Required correct answers unlock the next
   interval.
8. A frame pauses gameplay whenever setup, parent admin, quiz, or share UI is
   open. Rendering may continue in its paused visual state.

## Source directory and primary responsibilities

```text
.
├── index.html                    Semantic shell, canvases, dialogs, controls
├── src/
│   ├── main.js                   Composition root and browser event loop
│   ├── style.css                 Responsive, landscape, dialog, and game UI
│   ├── dino-game.js              Game rules and mutable runtime state
│   ├── runner-scene.js           Three.js renderer and world synchronisation
│   ├── animal-*.js               Animal catalog, assets, rigging, gait, coat,
│   │                              morphology, accents, audio, and loading
│   ├── obstacle-*.js             Spawn progression and obstacle geometry
│   ├── carrot.js, cactus.js,
│   │   forest-*.js, desert-scene.js,
│   │   cloud-*.js, sun-light.js  Individual world/scenery constructors
│   ├── learned-jump-detector.js,
│   │   jump-features.js,
│   │   motion-startup.js,
│   │   person-ready.js,
│   │   pose-overlay.js           Local pose-to-jump pipeline and UI feedback
│   ├── question-bank*.js,
│   │   question-options.js,
│   │   quiz-session.js,
│   │   quiz-dialog.js            Question data, rotation, selection, modal UI
│   ├── manual-quiz-timer.js,
│   │   quiz-lock-state.js,
│   │   game-settings.js,
│   │   admin-lock*.js            Local parent policy and persistent lock state
│   ├── i18n.js                   Chinese-first static translation dictionary
│   ├── fullscreen-controller.js,
│   │   share-score.js,
│   │   share-card.js             Platform integration and image sharing
│   └── vendor/                   Checked-in Three.js and GLTFLoader modules
├── public/
│   ├── models/                   Pose task, MLP JSON, and local animal GLBs
│   ├── vendor/mediapipe/wasm/    Copied by postinstall for offline runtime use
│   ├── audio/                    Calls and game sound assets
│   └── textures/                 Static rendering texture(s)
├── test/                         Node built-in test-runner unit/integration tests
├── scripts/sync-wasm.mjs         Copies MediaPipe WASM after npm install
├── Dockerfile                    Multi-stage Vite build + unprivileged NGINX
└── .github/workflows/            Pull-request CI and main-branch release flow
```

### Composition, game state, and rendering

| Module(s) | Primary logic | Contract / change boundary |
|---|---|---|
| `main.js` | Owns DOM queries, mode switching, camera lifecycle, dialogs, the RAF loop, audio events, and persistence wiring. | Keep it as the composition root. Put new domain rules in a focused module, then wire them here. |
| `dino-game.js` | Defines world constants, difficulty, spawn gaps/patterns, jump physics, rewards, collision and score state. | Should remain DOM- and Three.js-free so it is inexpensive to test. |
| `runner-scene.js` | Owns renderer, camera, lighting, ground, world-object pools, animation-time updates, and game-state-to-visual mapping. | Rendering consumes state; it must not independently change score, collision, or quiz state. |
| `obstacle-catalog.js`, `obstacle-model.js` | Define unlock/progression choices and build obstacle visuals. | Add a species/configuration in the catalog before adding specialised geometry. |
| scenery modules | Each small module builds one visual concern: clouds, forest cards/edge, desert, sun, carrot, finish toy, etc. | Prefer a new focused constructor over growing `runner-scene.js` with unrelated mesh code. |

### Animal visual pipeline

`animal-catalog.js` is the user-facing roster. `animal-assets.js` maps a roster
id to local source files and coat configuration. `animal-model-loader.js` loads
and caches a source GLB, then applies the runtime pipeline:

```text
local GLB
  -> skinAnimalScene()             (normalises mesh + creates small skeleton)
  -> attachAnimalCoat()            (optional instanced fur/feather shells)
  -> animateAnimalGait()           (species-aware ground/air pose every frame)
  -> animal audio profile          (call timing and playback parameters)
```

`animal-skinner.js` is deliberately the specialised seam between imperfect
static assets and the shared runtime rig. It uses morphology/anatomy/accents
data rather than per-frame asset guessing. `animal-model.js` is a fully local
procedural fallback; loading failure must degrade visual fidelity, not prevent
the game from starting. Dispose an old instance through
`disposeAnimalModel()` before replacing it.

### Motion input

`main.js` requests a front-facing stream at an ideal 640×480 / 30 fps. It loads
the local MediaPipe Pose Landmarker task plus `jump-visible-mlp.json`, samples
visible landmark groups in `jump-features.js`, and passes feature windows to
`LearnedJumpDetector`. Calibration and missing-person states prevent an
immediate false jump. `pose-overlay.js` draws only the browser-local preview.

Camera mode requires HTTPS or `localhost`; no server receives a video frame.
Manual mode bypasses this pipeline entirely.

### Learning lock and persistence

The quiz subsystem is intentionally separate from gameplay mechanics:

- `question-bank.js` is the authoritative Chinese data, answer indices, topic
  weights, and IDs. `question-bank.en.js` provides matching English text.
  `question-options.js` rotates option order deterministically from the ID.
- `createWeightedQuestionPicker()` exhausts all question pools before it resets
  and maintains a short recent-question guard. `createQuizSession()` counts
  correct answers; a wrong answer leads to another question rather than
  unlocking play.
- `ManualQuizTimer` measures only active manual gameplay. Its persistent store
  carries remaining time, lock state, and the duration of the active cycle.
- Parent-admin password data is salted PBKDF2 output in `localStorage`, not a
  server credential. It gates UI changes only and is not a security boundary.
- `storage` events merge remote parent policy and lock-state changes across
  same-origin tabs without overwriting a local animal/control preference.

Current browser storage keys are `jump-run-settings-v2`,
`jump-run-quiz-lock-state-v1`, `jump-run-quiz-admin-v1`, and the best-score key
`bunny-run-accuracy-stars-best`. Schema changes must retain a migration path or
use new versioned keys.

### UI/platform services

| Module(s) | Role |
|---|---|
| `i18n.js` | Applies static Chinese/English text and refreshes dynamic UI. Question localization is delegated to the paired question bank. |
| `fullscreen-controller.js` | Uses native Fullscreen and optional orientation APIs where available; falls back to a CSS immersive class. |
| `share-score.js`, `share-card.js` | Build text/share data and a locally generated canvas image; use Web Share when supported. |
| `game-audio.js`, `animal-audio.js` | Lazy Web Audio setup, game effects, animal calls, mute and active-running call timing. |
| `ready-animal.js`, `menu-jump.js`, `person-ready.js` | Start/restart affordances and calibrated person readiness. |

## Data and state ownership

| State | Owner | Persistence | Notes |
|---|---|---|---|
| Phase, velocity, entities, score, speed | `createDinoGame()` | None | Reset by a new round. |
| Three.js objects and current animal instance | `createRunnerScene()` | None | Dispose GPU/object resources on replacement. |
| Current animal and manual policy | `game-settings.js` | `localStorage` | Sanitised on load and migrated from v1. |
| Timer/expired lock | `quiz-lock-state.js` + `ManualQuizTimer` | `localStorage` | Shared across same-origin tabs. |
| Parent password digest | `admin-lock.js` | `localStorage` | Convenience gate only; clearing site data bypasses it. |
| Best score | `main.js` | `localStorage` | Independent of settings migration. |
| Camera stream, pose model, tracking | `main.js` | None | Released by `stopCamera()` and page lifecycle handlers. |

## Build, test, and delivery topology

`npm ci` installs Vite and MediaPipe, then `postinstall` copies the required
WASM files from the package into `public/vendor/mediapipe/wasm`. `npm run build`
creates `dist/`; Vite is configured with a relative base by default, while CI
passes a GitHub Pages base. The production Docker image builds `dist` with
Node 22 Alpine and serves it through unprivileged NGINX on port 8080.

```text
pull request -> npm ci -> npm test -> Vite production build

main push -> version calculation -> same build -> dist archive -> GitHub Release
                                              |-> GHCR linux/amd64 image
                                              +-> GitHub Pages deployment
```

The release workflow is the deployment source of truth. Exact public endpoints
and operational commands are maintained in
[HARDCOVER.md](../development/HARDCOVER.md).

## Test strategy

Tests use Node's built-in runner (`node --test`) and cover:

- game mechanics, obstacles, score/reward math, settings and localization;
- every animal's anatomy, gait, morphology, coat behavior, and fallback-safe
  renderer construction;
- question-bank count, ID order, option validity, answer-position distribution,
  English alignment, and picker cycle behavior;
- quiz lock persistence and cross-tab semantics;
- fullscreen state transitions, dialog behavior, and static UI contracts.

Browser/device behavior still needs real-device checks: camera permission,
MediaPipe performance, audio unlock, iOS fullscreen fallback, and Web Share.

## Architectural invariants

1. The game must remain playable without camera input and without a successful
   high-fidelity GLB load.
2. Camera processing must remain local unless a future, explicit privacy design
   changes that guarantee.
3. Rules live in testable modules, not in DOM or Three.js code.
4. A quiz, setup, parent-admin, or sharing modal must block gameplay time and
   manual input consistently.
5. Local parent controls must never be described as account-level or
   tamper-proof parental controls.
6. Question IDs, order, and Chinese/English pairing are data contracts; change
   them together and update tests in the same patch.
7. New visual assets must preserve license/attribution records and retain the
   graceful procedural fallback.
