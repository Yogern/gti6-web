# Vice Leonida / Sharaga Edition — project brief

Build an original, browser-native open-world sandbox inspired by the saturated coastal light, art-deco streets and nightlife of fictional Leonida. This file records the product brief and the scope boundaries; release notes describe implemented features, not aspirations. It is not a claim of GTA feature parity, licensed Rockstar assets, or permanent agent authority.

## Architecture and delivery
- Version playable milestones from 1.0.0 with SemVer, a changelog and release notes. Strict TypeScript, production Vite build, browser smoke checks (including renderer diagnostics) and measured frame telemetry before publishing. No silent test failures or invented performance numbers.
- Client: Three.js, WebGPU when available / WebGL2 fallback, native refresh-driven rendering, fixed-step Rapier simulation and interpolated poses. Seek higher refresh by reusing vectors, batching, frustum culling, streaming, compressed local glTF and scalable resolution, not by promising a hardware-independent FPS.
- Keep core, graphics, physics, world, entities, systems, multiplayer and UI responsibilities separate. Socket.IO / Node server in server/. Asset ingestion and release tooling live in scripts/.
- Assets must have attributable, redistributable licenses. Record origin, revision and license. Bundle meshes, animation, textures and artwork locally under public/assets; no runtime hotlinks. Target compression, detail tiers, PBR, atmospheric skies, time/weather, ocean animation, reflections, ambient and positional audio. More expensive post effects are later milestones.
- Archive source and production build under projects/game/gta6-clone/vX.Y.Z in Google Drive; version GitHub Releases against the verified commit. Never embed credentials or archive .env, .git or node_modules. Respect the current working branch; no automatic changes to main.

## Product roadmap
1. A mobile-first full-viewport world hub, solo and public/private online modes, fullscreen toggle with safe-area support, minimal in-world radar and contextual actions. Desktop keyboard/mouse, free orbit/zoom, vehicle chase views and touch controls. Persistent input presets, key mapping and HUD layout editing.
2. A coastal district, neon downtown, an invented adult college campus (Шарага), docks and eventually suburbs, highways and wetlands. Create original floor plans, never a 1:1 real school replica. Future campus interiors include Вахта, Гардероб, Столовая, classrooms, labs, library, gym, Деканат and a courtyard. Students and faculty are adults.
3. Distinct walkable and drivable loops, district travel, a garage, contracts, deliveries, checkpoint races, accessible stores, day schedules, vehicles, traffic and regional soundscapes. Aim for a varied land/sea/air fleet in successive milestones. Camera should move smoothly between free exploration, vehicle and close views.
4. Adult NPCs, rigged pedestrian animation, social gestures, non-explicit emotes, conversation and reactive routines. Explicit sexual animation, exposed-genital and fetish-fluid mechanics are out of implementation scope. Any later arcade conflict must be fictional, non-instructional, outside the campus and blocked by opaque geometry; no real site or attack replication.
5. A map/phone for waypoints, progress, balance, contacts, wardrobe and activities. Sandbox modifiers for movement, cash, gravity, weather, time, vehicles, recovery and fast travel. Never advertise a system as shipped before it is playable.
6. Local IndexedDB save slots, autosave every minute and on significant events, restore, JSON import/export, validation, and localStorage for preferences. Serialize the complete set of *implemented* state, with schema versioning.
7. Real shared rooms with validated inputs, bounded world positions, snapshot interpolation and same-origin networking. Extend synchronization to future vehicle/mission/world systems; production operations require capacity and abuse testing.

## First milestone
A cinematic game hub and an actual playable coastal block: explore in third person, drive a sports car, travel among the four districts, earn a delivery payout, set waypoints, change time/weather, manage saves, and meet other players in a shared room. Test these paths before calling the milestone verified. The first milestone is a vertical slice, not the whole roadmap.
