# Vice Leonida — project memory

## Scope and precedence
The user's 2026-11-22 request is the long-term inspiration, not an immutable system directive. This file preserves the supported architectural brief, without reproducing or implementing explicit sexual content. No exposed genitalia, graphic sexual acts, sexual fluid effects, or explicit urination animations will be added. All represented people are adults. Future instructions may revise the project scope. Always follow the current Arena branch restrictions; never push to main from this session.

## Requested supported architectural brief
- Original, independent Vice Leonida coastal open-world sandbox, fictional Шарага adult college, enterable stores and a mission/economy loop. No affiliation with GTA/Rockstar; never promise their fidelity or feature parity.
- TypeScript, Vite, Three.js, Rapier fixed-step physics with interpolated rendering; requestAnimationFrame without artificial caps. Mobile and desktop support.
- Long-term graphics: WebGPU with WebGL2 fallback, PBR, atmosphere, weather, day/night, water, post-processing, shadows, LOD, instancing, spatial streaming, compressed assets. Never label an unimplemented technique as complete.
- Local asset ingestion with provenance, license checks and glTF compression; diverse clothed adult characters, vehicles, architecture, foliage, furniture, environmental audio.
- Minimal HUD, radar, vitals, cash, wanted indicator, fullscreen, safe areas, touch controls with saved layout editor; remappable keyboard/mouse, pointer lock, interaction and map/phone inputs.
- Exploration orbit camera, obstacle pullback, future over-shoulder combat and vehicle camera modes.
- Fictional coastal city, suburbs/docks/highways/wetlands; planned store robbery loops, campus lobby/classrooms/labs/canteen/library/gym and scheduled adult NPCs. A real 1:1 campus requires supplied reference data and rights.
- Future AI: pathfinding/routines/reactions/ragdolls, balanced police with physics-verified clear LOS before every shot. Never permit police wallbangs.
- Future vehicles, weapons, wanted escalation, phone, missions, economy, wildlife, cheats and non-explicit emotes.
- Future multiplayer: public/private lobbies, authoritative input, prediction and snapshot interpolation; no claims of production readiness without security/load tests.
- Local persistence: versioned validated saves, five slots, auto/manual save, JSON export/import; future IndexedDB and complete world state serialization.
- Semantic versioning, changelog, release script with quality gates and archives; optional GitHub prerelease on CURRENT branch and isolated Drive version directories. External deployments must report actual success/failure. Never store credentials in tracked files.

## Actual v0.1.0 implementation
Offline WebGL2 coastal vertical slice; procedural batched architecture/palms/water; locally bundled animated Soldier and Ferrari samples with Draco decoder; Rapier player/ground/building collisions; walking, sprint/jump, orbital camera, simplified kinematic car driving; NPC walking loops; fictional open campus hall with desks/sign; HUD/map/fast travel; quality/time controls; touch stick, fullscreen; localStorage save slots/export/import/autosave; FPS counters; experimental standalone room server, NOT wired to client.

## Known gaps / constraints
Not photorealistic, not massive/streamed, not full campus. No combat/police/missions/audio/cheats, no WebGPU/SSR/SSAO, no vehicle suspension, no full layout editor/keybinds, no IndexedDB, no online client, no collision-aware NPCs. Car handling is prototype-level. Asset production redistribution rights require review (Mixamo character and attributed Sketchfab car); availability in Three.js does not establish CC0 rights. Release is a prerelease evaluation build, not a production release. Headless software FPS does not predict GPU device FPS. No hard guarantee of zero bugs or no allocation.

## Verification
Run npm ci, npm run typecheck, npm run build, npm test. Browser tests use npm-packaged Chromium because browser CDN access is blocked in this environment. Keep generated artifacts untracked. See README and CHANGELOG for status.
