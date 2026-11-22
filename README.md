# Vice Leonida · Sharaga Edition

An original browser-native, third-person coastal sandbox. The **Play** hub features original generated location art; **Enter world** loads the real 3D game. The hub art is not a gameplay screenshot.

## Play locally

Requires Node.js 22.12+ and npm. Assets are checked in; no runtime downloads from third parties, account, API key or asset-ingestion step is needed to play.

```sh
npm ci
npm run dev            # Vite + rooms, same HTTP server
# or production:
npm run build
npm start              # 0.0.0.0:4173, override PORT as needed
```

Serve over HTTPS on the public internet. The application prefers WebGPU when a GPU adapter is available, falling back to WebGL2. A static deployment supports singleplayer. Multiplayer requires a persistent Node host with WebSocket support, not a static host or a short-lived function. Reverse-proxy the whole origin, including `/socket.io/`, to the same server. Offline mode means no multiplayer connection; this is not an installable offline service worker.

### What to do

- **Choose your district** or resume from the autosave. Vice Beach, Neon Strip, the invented Шарага campus and Port Leonida are on one continuous map. Visit the college lobby, lecture and canteen wings. Adult pedestrians walk, sit, clap and greet.
- **Take a drive.** E/F beside the parked car; W/S accelerates/reverses, A/D steers, Space brakes, V changes camera. The garage has two distinct vehicle models and five paint finishes.
- **Explore on foot.** WASD or arrows, Shift sprint, Space jump, free-orbit drag/pointer-lock look, scroll zoom, G greeting. A physics ray shortens the camera arm at solid geometry.
- **Work a contract.** P → Contracts. Collect the parcel at port dispatch and deliver it to the campus for $750, or drive all five circuit checkpoints for $1,200. Follow the marker and minimap. Car radio plays original synthesized music after audio is enabled.
- **GPS & sandbox.** M opens the coordinate-based map. Tap to set a waypoint, or select a district and travel. The phone or backtick opens time, weather, movement, gravity, cash and travel controls. Time and weather are server-controlled in a room.
- **Meet others.** Pick Public lobby, or Private room and leave its code blank to host. Give friends the six-character HUD code. Eight players per room; shared poses, car selection, social gestures, clock/weather and chat. Room progress is ephemeral; saves, contracts and parked vehicles are local. All routes are same-origin.
- **Touch & preferences.** Automatic input detection, mirrored touch presets and an editor for position, size, opacity and visibility. Keyboard remaps, audio and graphics choices persist. Fullscreen uses the browser API when allowed; embedded/iOS contexts can require opening the preview directly or adding it to the home screen.
- **Back up progress.** Settings → Save data has five manual slots and an autosave. Export JSON before clearing browser data. Import previews the save before replacing the session. Autosave runs every minute and on significant actions. Saves restore poses, not transient velocity/particle effects.

## Architecture

| Directory | Responsibility |
| --- | --- |
| `src/core` | Lazy-loaded game engine, bounded fixed-step accumulator, interpolated poses, assets, validated saves |
| `src/physics` | Rapier world, collision bodies, four spring/damper wheel rays, camera occlusion |
| `src/world` | Seeded architecture, instanced props, spatial cells, original campus, street grid and coast |
| `src/graphics` | Renderer negotiation, PBR/HDR, environment, rain, vehicle showroom, vertex-lit fast tier |
| `src/entities` | Real rigged character assets, animation blending, adults and interpolated peers |
| `src/systems` | Input, synthesized audio, courier/circuit activities |
| `src/ui` | World hub, map/radar, contextual HUD, phone, settings and layout editor |
| `src/multiplayer`, `server` | Validated Socket.IO protocol, bounded rooms, snap correction, interpolation and limited extrapolation |

Rendering follows `requestAnimationFrame` without a software FPS cap. A 60 Hz Rapier step is independent of render frequency. Background/pause resets the accumulator instead of attempting unbounded catch-up. Instance batches, local Draco geometry, Meshoptimizer simplification, WebP textures and adaptive pixel ratio reduce bandwidth and draw cost. High/Ultra enable shadow maps. Max FPS uses cheaper vertex-lit materials. FPS depends on device, viewport and quality; no specific refresh rate is guaranteed.

## Verify and reproduce

```sh
npm test                 # validation, contracts and fixed-step physics
npm run typecheck        # strict, no emit
npm run build            # production client
npm run smoke            # temporary production server + real headless Chromium
npm run verify           # all of the above gates
npm run assets           # re-ingest licensed sources at pinned revisions
node scripts/surface-textures.mjs # reproduce 2K asphalt maps
```

Linux x64 smoke tests use npm-packaged Chromium and SwiftShader. Elsewhere set `CHROMIUM_PATH` to a local Chromium executable. Smoke checks include district assets, layout persistence, save import/export, garage meshes, nonblank 3D frames, drive/camera input, contract payout, weather, autosave restore, isolated public/private rooms, chat, touch movement and fullscreen. `.release/smoke.json` contains the actual renderer, target size, timing window, frame count and mean FPS. This is a smoke run, not certification on physical mobile/high-refresh devices.

## Versioned releases

Update `CHANGELOG.md` and `RELEASE_NOTES.md` with what actually shipped. Use a new SemVer; never overwrite an existing release. `--version=X.Y.Z` applies `npm version` without an implicit commit/tag. The in-game build number comes from `package.json`.

```sh
npm run release                                      # verify + local archives only
npm run release -- --publish                         # verified GitHub + rclone Drive
npm run release -- --publish --drive=connector        # Arena: upload archives via Drive connector
```

The script refuses a detached/default branch and pushes **only the current working branch**, never `main`. It verifies before committing, excludes caches/secrets/dependencies from source, creates the commit's annotated release tag, and attaches production/source ZIPs, checksums and the browser report to a GitHub Release. It uses `git` and an authenticated `gh` CLI. No secrets are stored in this repository.

For automated Drive sync on a release machine, set `DRIVE_REMOTE` in the environment or ignored `.env` to an existing rclone Google Drive remote name. Configure its OAuth/service account outside the checkout. Files go to `projects/game/gta6-clone/vX.Y.Z/` with immutable copy behavior. In Arena, `--drive=connector` generates an explicit handoff; the release is not considered Drive-synced until the connector returns uploaded file IDs. After an interrupted publish, `--resume` accepts an existing tag only for the same clean commit. Inspect partial remote state; never force-move tags.

## Scope and attribution

This is a verified first vertical slice, **not full GTA 6 parity**. Larger biomes, traffic, a wider vehicle fleet, expanded interiors, combat/pursuit, advanced post-processing, persistent server authority and capacity testing are not shipped. The college is a fictional noncombat setting, not a copy of a real school's layout. Interactions are non-explicit. See `PROJECT_MEMORY.md`, `CHANGELOG.md` and `public/assets/CREDITS.md`. Third-party assets keep their own licenses; no Rockstar assets or affiliation.
