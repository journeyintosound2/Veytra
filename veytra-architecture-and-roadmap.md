# Veytra: architecture, decisions and roadmap

Last updated: 12 Oct 2026

## What exists (prototype v1, drums)
- Static web app, no build step, in `Documents/GitHub/Veytra` on Jeff's Mac. Intended host: GitHub Pages. Installable as a home-screen web app, works offline.
- Kit: Alesis Turbo drum module (USB-MIDI out, USB-B port). Pieces: snare, 3 toms, hi-hat, crash, ride, kick, hi-hat pedal.
- 19 original lessons in 4 worlds: Meet the kit, First grooves, Around the toms, Dance floor.
- Modes per lesson: Listen, Learn slowly (wait mode), Practice (loops, auto speed-up +5 BPM at 90% or better), Play for stars (60/80/92% for 1/2/3 stars; the 3rd star needs full tempo). One star unlocks the next lesson.
- Player profiles per device (localStorage). Settings: timing strictness, note speed, click, backing, app drum sounds, on-screen pads, unlock all.
- Your kit page: connect, live pad test, Map my kit wizard, Check my timing (latency calibration).

## Key technical decisions
- **iPad limitation:** Safari/WebKit on iPad and iPhone has no Web MIDI API (WebKit bug 107250 still open as of Oct 2026). So the web app can't hear the kit on the iPad. It works in Chrome or Edge on Mac/Windows/Chromebook/Android. The iPad gets touch pads only.
- **Path to iPad:** wrap the same web app in a native shell (Capacitor or a small Swift WKWebView app) on the Mac with Xcode. The shell forwards CoreMIDI bytes with `window.veytraMidi(status, note, velocity, performance.now())`. No other app changes are needed.
- Timing: the song clock is in beats from performance.now(). MIDI event timestamps are used for judging. Audio is scheduled on the Web Audio clock through getOutputTimestamp. Judging windows at Normal: perfect ±40 ms, good ±85 ms, ok ±135 ms.
- Sounds are synthesised in Web Audio (no samples). Fonts (Unbounded, Atkinson Hyperlegible, OFL) are self-hosted.
- Copyright stance: original grooves and basic shared patterns only. No recreating recorded songs. Melodics is the reference for the experience, not for any assets or names.

## Lesson format (js/lessons.js)
- Each bar is a set of grid strings per lane. String length sets the grid: 4/8/16/12. Symbols: `x` hit, `R`/`L` sticking, `o` open hi-hat, `-` rest.
- `form` sets the bar order. `bpm` is full speed, `startBpm` is where practice starts. `chords` + `style` drive the backing band.

## Roadmap ideas
1. Test on the real Alesis Turbo in Chrome on the Mac. Check the default note map and the timing calibration.
2. Native iPad wrapper.
3. MIDI keyboard / piano track on the same engine.
4. Velocity/accent lessons, a lesson editor, practice streaks.
