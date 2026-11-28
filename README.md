# Soundpost

Record a short sound, add easy effects, and share it as an MP3 or as a video over a picture.

- Live app: https://jonahmulski-wq.github.io/Soundpost/ (built from the newest version label: V7, V8, ...)
- Test page: https://jonahmulski-wq.github.io/Soundpost/test/ (built from `main` on every push, about 1–2 minutes)

## How it is built

The source is in `src/`. [Vite](https://vite.dev) builds it into one small web app, and GitHub Actions (`.github/workflows/pages.yml`) publishes it to GitHub Pages. Exact package versions are pinned by `package-lock.json`.

```
npm ci          # install (once)
npm run dev     # local test server
npm run build   # build into dist/
```

## Where things are

| File | What it does |
|---|---|
| `src/index.html` | Page layout only |
| `src/styles.css` | Look of the page |
| `src/main.js` | Starts the app and wires the shared controls |
| `src/util.js` | Small shared helpers, test-page flag and test version (TVER) |
| `src/features.js` | Which features are free / subscriber / pack, and `canUse()` (today: always yes) |
| `src/catalog.js` | Every sound and picture with its tier and file (`ASSET_BASE`, `MEDIA`) |
| `src/record.js` | Recording, choosing a file, the "Replace existing recording?" box |
| `src/trim.js` | Waveform, trim handles, magnifier, beat lines, "hear the cut" |
| `src/effects.js` | All effects; `render()` makes the finished sound |
| `src/preview.js` | Preview player, Share and Download MP3 |
| `src/repeat/repeat.js` | Smarter Repeat (in time, breathing room, keep my trim) |
| `src/repeat/beat.js` | Beat finding for Repeat |
| `src/pictures.js` | Built-in pictures and photo upload |
| `src/export/mp3.js` | MP3 (and WAV) files |
| `src/export/motion.js` | Video zoom and pan |
| `src/export/video.js` | Make, Share and Download Video |
| `src/export/mp4-writer.js` | Small MP4 file writer |
| `src/testlog.js` | Test log (test page only) |
| `public/lib/lame.min.js` | MP3 encoder (lamejs 1.2.1), shipped with the app |
| `public/sounds/` | Background sounds |
| `tests/clips/` | Real recordings for the Repeat beat tests |
| `docs/test-log-script.gs` | Google Apps Script for the test log |

The fonts (Fraunces, Figtree) and the MP3 encoder are bundled, so the app works offline and contacts no outside server (the test page also sends test-log rows).

## Versions

Every push is kept by git. Test versions get a label (V7.7, V7.8, ...) when a feature is added; releases get a whole number (V8, V9, ...) and a GitHub Release with notes.

History before the code split (V1–V7) stays in the Google Drive Version History and the HTML archive (frozen, no longer updated). The `V7` label holds the last one-file version.
