# Vice Leonida — v1.0.0

The first playable coastal sandbox milestone. Select a district, enter the world and approach your parked car. Take a delivery from the port to Шарага, or run the five-checkpoint Ocean Drive circuit. Progress and settings stay on the local device.

**Controls:** WASD / arrows move and steer, Shift sprints, Space jumps or brakes, E/F enters/exits, V changes camera, G greets, M opens GPS, P opens the phone, backtick opens sandbox settings and Escape returns to the hub. Drag or click for mouse look; scroll to zoom. Touch layouts and keyboard bindings are editable in Settings.

**Run:** the build ZIP is a static singleplayer client. Serve its contents over HTTP(S), not `file://`. For online rooms, use the source ZIP with Node 22: `npm ci && npm run build && npm start`. The client and Socket.IO server share one origin and port.

**Verification:** `npm run verify` runs physics/state tests, strict TypeScript, Vite production build, then actual Chromium desktop and touch-emulated gameplay. The attached `smoke.json` records measured frame throughput and GPU backend. The headless software renderer is not a hardware performance benchmark.

**Scope:** four compact districts, two vehicles, two contracts and session-based multiplayer. Original fictional campus and non-explicit character interactions. This is not a photorealistic GTA replica, AAA-complete game or production load-tested multiplayer service. Source URLs and model licenses are included in `public/assets/manifest.json` and the in-game credits.
