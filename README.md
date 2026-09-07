# PIUKISTAN: THE TRUTH OF PIUU

A static, browser-first atmospheric action investigation game. The player follows the canon of Piuu—Princess of Piulandia, cursed into the Sovereign of Piukistan—and ultimately breaks the curse rather than defeating her.

## Run

```sh
npm start
```

Open `http://localhost:4173`. The project has no runtime package dependency and is suitable for static hosting such as GitHub Pages.

## Controls

- **WASD / arrow keys:** move
- **Shift:** dodge / sprint
- **Space:** attack
- **E:** inspect or interact
- **J:** journal

## Content state

The playable compact campaign implements all eight canonical realms as data-driven transitions. Each realm has a distinct palette, named opposition, landmark, lore discovery, Piuu memory, puzzle objective, journal entry, checkpoint transition, and the canonical objective shift from **Find Piuu** to **Free Piuu**. The procedural Canvas renderer is deliberately dependency-free so this foundation loads reliably from static hosting; it provides an atmospheric presentation while leaving a clear modular route to replace procedural elements with locally packaged GLB/audio assets.

## Verification

```sh
npm run check
```
