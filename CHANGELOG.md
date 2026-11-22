# Changelog

## 0.1.0 — 2026-11-22
### Added
- First offline coastal sandbox: batched procedural city, beach, water, palms and fictional Шарага campus hall.
- Local animated character and Draco-compressed sports car; Rapier movement and collisions; simplified driving.
- Cinematic menu, mobile-friendly HUD, minimap, fast travel, orbital camera and fullscreen control.
- Five save slots, autosave, JSON import/export, quality/time controls and FPS telemetry.
- Experimental standalone authoritative movement/room server; client integration deferred.
- TypeScript/build/browser smoke gates and versioned release packaging.
### Scope
Pre-release evaluation prototype, not GTA 6 feature parity. See PROJECT_MEMORY.md for omissions and asset-license review requirements.

## 0.2.0 — 2026-11-22
### Fixed
- Correct Soldier's local -Z facing, including pedestrians; smooth shortest-path turns instead of backwards locomotion.
- Separate Walk/Run/Idle animation blending with speed-matched playback.
- Keep the protagonist visible inside the car as a skeleton-posed seated driver; translucent cabin glass.
- Update vehicle collider orientation and show wheel rotation while driving.
- Clear seated driver state consistently on exit, save restore and fast travel.
### Added
- Original neon-accented crime-sandbox HUD: heading-up neighbourhood radar, status strips, contextual vehicle action, district label and quick map/save buttons.
- Three V-key vehicle camera modes: chase, driver's window and hood; touch-accessible camera button.
- Regression coverage for entering/exiting, driver visibility and movement/facing alignment.
### Limitations
- Not a pixel-identical GTA 6 interface. Status strips are static full-health indicators in this non-combat slice; stars indicate inactive wanted state, not a working police system.
- Driver uses a procedurally posed existing clothed rig, not a new motion-captured entry/seating animation. Prototype handling remains simplified.
