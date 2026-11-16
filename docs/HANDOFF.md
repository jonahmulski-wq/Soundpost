# Soundpost – Dev Handoff

Last updated November 16, 2026, after Version 7 went live.

## What Soundpost is

A simple phone app where people record a short sound bite (Native American flute first, then acoustic guitar, voice, any instrument), add easy effects, and share it as an MP3 or as a video over a picture for Instagram and messaging apps. It is built for everyday, non-technical people, so every control should be simple.

Right now it is a single-page web app hosted free on GitHub Pages. The plan is to wrap it with Capacitor and publish to Google Play first, then the Apple App Store.

## Where the code lives

- GitHub repo: `jonahmulski-wq/Soundpost` (renamed from `Flute-booth`), branch `main`.
- `index.html` is the whole live app (HTML, CSS and JavaScript in one file).
- `test/index.html` is the test page. Every change goes here first. Right now it is identical to `index.html` (V7).
- `README.md` is GitHub's default readme.
- `docs/HANDOFF.md` is a copy of this handoff.
- Live app: https://jonahmulski-wq.github.io/Soundpost/
- Test page: https://jonahmulski-wq.github.io/Soundpost/test/
- (Neither address has been opened from Claude's side to confirm, because the container can't reach the site. The user tests on the phone.)
- Claude can push to the repo directly (GitHub connector and the Claude GitHub app are set up). The GitHub CLI (`gh`) is not logged in, so pull requests are opened from the GitHub website.
- The MP3 encoder (lamejs 1.2.1) loads from cdnjs. Fonts load from Google Fonts. Everything else is in the one file.

## What works now (Version 7)

Recording and trimming
- Record from the phone mic (up to 2 minutes), with the phone's voice processing turned off so instruments sound natural, or choose an audio file.
- While recording, a live waveform scrolls from right to left. Bars turn red when the sound is loud enough to distort.
- After recording: Start and End trim sliders under the waveform. While you drag, it shows the whole clip with the cut parts gray. When you let go, it zooms in to show only the part you are keeping.
- A warning appears if the recording distorted, pointing to "Tame harsh notes".
- Top row: timer and Rec on the left; Preview and Stop on the right (spaced apart so Rec isn't hit by accident). "or choose an audio file" sits under it, left aligned with the timer.

Clean up the sound
- Low cut (wind and rumble): checkbox only, fixed steep cut below 70 Hz (keeps a guitar's low E at 82 Hz).
- Tame harsh notes: one Amount slider (a compressor).
- Volume: checkbox that opens an Amount slider, -12 to +12 dB.

Add effects (each opens its controls when checked)
- Echo (Delay, Repeats, Amount), Reverb (Small room, Hall, Cathedral, plus Amount), Repeat the clip (2 to 4 times), Octave layer (lower or higher, plus Amount).

Share Soundpost audio or video
- Soundpost audio: Preview and Stop, then the audio bar, then Share MP3 and Download MP3.
- Preview plays through the audio bar. Stop rewinds to the start. The bar's own play/pause pauses in place, and you can drag to any spot. Mute and the ⋮ menu are hidden on the bar (Chrome only; iPhone ignores this).
- Preview is not required: Share, Download and Make Video apply the effects themselves. If a phone blocks the share sheet because preparing took too long, it says to tap Share again.
- Loudness is evened out to a normal listening level (RMS target with a peak cap), then the Volume setting is applied with a soft clip.
- If the MP3 encoder fails to load, the file is WAV and the buttons switch to "Share WAV" and "Download WAV".
- Files are named `Soundpost.mp3` / `Soundpost.mp4`; with the person's own photo the video is `Soundpost <photo name>.mp4`. Share title: "My Soundpost recording".
- Soundpost video: numbered steps 1 to 5 (Choose A Photo Or Upload Your Own; Adjust Video Settings; Make Video; Share or Download; Changed a Video Setting? Tap "Make Video" again).
  - Four drawn scenes (desert sunset, misty forest, starry night, ocean dawn) or your own photo.
  - Shape: Square or Tall. Motion: Zoom in, Zoom out, Pan left, Pan right, Pan up, Pan down, Still. Motion Speed: Slow, Medium, Fast. Motion eases in and out and moves by fractions of a pixel (smooth).
  - Make Video records the canvas plus the sound in real time (takes as long as the clip). MP4 where the browser supports it, otherwise WebM.
  - The video section has its own message box under the buttons. The page scrolls to the progress message when you tap Make Video and to the finished video when it's done.
  - Changing a setting after a video exists shows "Settings changed. Tap Make Video to update your video."

## Key decisions and why

- Web app first, then Capacitor: fastest way to build and test on a real phone; Capacitor reuses the same page for the store apps.
- GitHub Pages hosting: free, and the Claude preview blocks the mic and file picker.
- Test page inside the same repo: lets the user try changes on the phone without touching the live app.
- No new version for every small fix: changes collect on the test page until the user says "make a version". Claude should say when a batch looks ready.
- Recording cap 2 minutes: keeps files and video export manageable.
- Auto-remove silence was removed: no single setting can tell silence from background sound (freeway, creek). The trim sliders do the job better.
- Low cut became a fixed 70 Hz filter: the old slider went up to 400 Hz and cut into the flute itself.
- Preview no longer required: people kept getting stuck because Make Video needed a preview first.
- Loudness: one shared video measured -3.9 LUFS (far too loud). Normalizing to a peak after the compressor was boosting everything. Now it targets a normal level.
- Hoop drum and nature sounds set aside: synthesized versions didn't sound good. Waiting for real recorded samples.
- Crossfade for loops: wanted later, not now.
- Video section uses numbered instructions as a first try; may change to something more intuitive.
- Audience: flute players first, then guitar, voices, anyone.
- Company name: JonahAppArt (not registered yet).

## Known issues and things not yet confirmed

- Not yet tested on the phone after V7 changes: the new playback bar, the trim zoom, the 2x2 audio buttons, the video motion choices, and the scroll to the finished video. The user tests on a Samsung Galaxy S24+ in Chrome.
- Recordings can come out quiet (two test MP3s measured -24 and -27 LUFS). A few sharp peaks hit the cap. Fix idea: a gentle limiter (on the to-do list).
- On narrower phones, Download Video wraps below Share Video. The user found the layout a bit clunky; stacking all three video buttons in one column is the fallback idea.
- Make Video once made the page jump up on the phone. The auto-scroll should cover it; not confirmed.
- Some browsers can only make WebM video, which Instagram may reject. Chrome on a recent Android and Safari on iPhone should make MP4.
- iPhone has not been tested at all. The hidden mute/menu on the audio bar won't apply there (idea: build our own player bar).
- Drive archive files are still named "Sound Post V1" to "V7" (two words); the app name is Soundpost (one word). Renaming was offered, not decided.
- Version History entries for V1 and V2 were reconstructed from memory and may be slightly off.
- Low cut does little on recordings without wind or rumble; that is expected.

## How we work (routine)

1. Make changes in `test/index.html` and push to `main` so the test page updates. Tell the user to reload in about a minute.
2. Test in the container with Playwright and a fake microphone (Chromium flags `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`). The container has no internet, so the MP3 encoder never loads there and the buttons show WAV; that is expected.
3. When the user says "make a version" (next is V8):
   - Copy `test/index.html` to `index.html` and push.
   - Upload the file to Google Drive as `Sound Post V8.html` in the "HTML archive files" folder.
   - Add a V8 section at the top of the "Soundpost Version History" doc.
   - Move finished items in "Soundpost: Ideas and To-Do" to the Done section, struck through.
4. Keep replies short and plain. The user is not a programmer, works mostly from the phone, and wants to save usage. Save longer notes into docs instead of the chat.

## Documents in Google Drive

All are in Google Drive under "Being Jonah" > "Jonah App Art" (folder id 1NjYwmH6VNy_1bwFKGdwQ69THLUEWeO7H). Open them at drive.google.com, or with the Google Drive and Google Docs connectors.

- Soundpost: Ideas and To-Do (Google Doc)
  - https://docs.google.com/document/d/1yctgE8cv5xrqy1-sISdz7fojIkMCTvvgpG7vniB2-ww/edit
  - The to-do and ideas checklist: Built then set aside (hoop drum, nature sounds), Next up, Sound quality, Sound/picture/video packs, Turning it into a store app, Branding and marketing, and Done (struck through).
- HTML archive files (folder)
  - https://drive.google.com/drive/folders/1X-ZgBwhNHnB-qLZMt57nFvrNg6FTiUJP
  - Holds every saved version of the app as an HTML file: Sound Post V1.html to Sound Post V7.html. Any of these can be opened in Chrome or pasted back into GitHub to restore that version.
- Soundpost Version History (Google Doc, inside HTML archive files)
  - https://docs.google.com/document/d/1akkPD3IxDnnN0uw3BKsQ_T2jfJkreFpg2fMde9xfylg/edit
  - What changed in each version, newest first (V1 to V7).

## Business side

Business questions (developer accounts, pricing, registering JonahAppArt, store listings) are moving to a separate chat in this same Soundpost project. This chat and future dev chats are for building the app.
