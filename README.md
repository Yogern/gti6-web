# Vice Leonida · v0.2.0
Independent, non-explicit coastal browser sandbox. **Offline vertical slice, not GTA feature parity or a production release.**

## Run
Node 22+; `npm ci`, `npm run dev` (0.0.0.0:5173). `npm run build` emits dist. Local assets are bundled; no runtime hotlinks.

## Controls
WASD: move/drive; Shift: sprint; Space: jump/brake; E: enter/exit nearby car; mouse/touch drag: orbit; wheel: zoom; double-click: pointer lock if supported; M: map/fast travel; P: save manager; Esc: pause. On touch devices use the left stick and E button; drag elsewhere to look. Fullscreen icon is at top right. iOS may require Add to Home Screen.

## Working
Coastal procedural city, animated sample character and pedestrians, sports car, fictional campus hall, fixed-step Rapier collision, interpolated player render, uncapped requestAnimationFrame, camera obstruction pullback, radar, render scale, time/sun control, five local save slots and JSON backups. Browser storage can be cleared; export important saves.

## Experimental / omitted
`npm run server`: standalone Socket.io authoritative room/movement experiment at port 3001. Vite proxies `/socket.io` for future integration. The current client is OFFLINE ONLY. The server has no production auth, persistence, physics or anti-cheat guarantees.
No combat, police, missions, audio, sexual content, 1:1 real campus, WebGPU, advanced post-processing or massive-world streaming. Cars use simplified kinematic handling. The time slider changes sun lighting; no full day/night weather simulation. See PROJECT_MEMORY.md.

## Verify
`npm run typecheck`; `npm run build`; `npm test`.
Tests start Vite automatically and use npm-packaged headless Chromium with software WebGL. Telemetry is measured, not an FPS guarantee. Run real GPU/device benchmarks separately. Browser libraries are unpacked into /tmp, not committed.

## Assets
`npm run assets` refreshes sample GLBs via GitHub and validates GLB headers. Requires curl/system CA trust. No new compression is performed; Ferrari is upstream Draco-compressed, decoded locally. See ASSET_NOTICES.md. **Production distribution blocked pending license review**, especially Mixamo source redistribution. No claims that these assets are all CC0.

## Releases
`npm run release` runs quality gates and makes ignored build/source archives in artifacts/v0.2.0. It does not publish by default. `--publish` requires `ASSETS_CLEARED=1`, clean current branch and authenticated gh; publishes a prerelease only from the current branch, never main. `--drive` requires a preconfigured rclone remote in DRIVE_REMOTE; copies to projects/game/gta6-clone/v0.2.0. No credentials should be entered into chat or committed. Arena's Drive connection does not automatically configure rclone. Semver is intentionally 0.x until the prototype meets broader acceptance criteria.

## v0.2.0 controls and presentation
V (or the camera quick button) cycles chase, driver's-window and hood views while driving. The seated protagonist remains in the car; tinted glass permits external views. Walking/running now use distinct speed-blended clips and the correct model-facing axis. The local radar rotates with the camera and follows the player. Health/armor strips and inactive wanted stars are presentation-only until combat/police systems exist. This is an original GTA-inspired interface, not a pixel-perfect GTA 6 reproduction.
