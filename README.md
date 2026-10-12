# Veytra

Learn to play drums with a real electronic drum kit. Notes fall down coloured lanes; hit the matching pad as they reach the line. Lessons build from finding each drum to full grooves and fills, with stars, tempo goals and a player profile for each person in the house.

This first prototype is drums only. Keyboard lessons can be added later on the same engine.

## Play it

### 1. Put it on GitHub Pages (once)

1. Push this folder to a GitHub repository (for example with GitHub Desktop).
2. On GitHub, open the repository, then **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/Veytra/`.

Every time you push changes, the site updates. If a device keeps showing an old version, bump `VERSION` in `sw.js`.

### 2. Plug in the kit

1. Connect the USB port on the back of the Alesis Turbo module to the computer. The module has a square USB-B port, so you need a USB-B to USB-C (or USB-A) cable, the same kind printers use.
2. Turn the module on.
3. Open the site in **Chrome** or **Edge**. Go to **Your kit** and tap **Connect kit**. Allow MIDI devices when the browser asks.
4. Hit each pad. The matching drum lights up on screen. If a pad lights the wrong drum, use **Map my kit**.
5. Run **Check my timing** once. It measures any delay in your setup and corrects for it.

The kit's own sound still comes from the module (its headphone or output jack). By default Veytra only plays its own drum sounds for the on-screen pads, so you don't hear everything twice. Change this in Settings.

### The iPad question

Safari, and every other browser on iPad and iPhone, doesn't support Web MIDI, so a web app on the iPad can't hear the kit. Apple hasn't committed to adding it. Options, from easiest to most work:

| Option | What it takes | Kit works? |
|---|---|---|
| Chrome on a Mac, Windows PC, Chromebook or Android tablet | Nothing extra | Yes |
| iPad with on-screen pads | Nothing extra. Good for trying lessons without the kit | No, touch only |
| Native iPad wrapper (Capacitor or a small Swift app around this web app) | A Mac with Xcode. Free Apple ID installs to your own iPad but must be re-installed every 7 days; the Apple Developer Program removes that limit | Yes |

The app is built for the wrapper route: any native shell only needs to forward MIDI bytes by calling `window.veytraMidi(status, note, velocity, performance.now())`. Nothing else changes.

### Without a kit

On a computer keyboard: **A S D F G H J** play hi-hat, crash, snare, tom 1, tom 2, floor tom and ride. **Space** is the kick. On a tablet, the on-screen pads appear automatically when no kit is connected.

### Running it locally

Web MIDI needs a secure page, so open it through a small local server rather than double-clicking the file:

```
cd Veytra
python3 -m http.server 8000
```

Then open `http://localhost:8000` in Chrome.

## How the lessons work

Each lesson has four ways to play:

- **Listen** plays the pattern so you can hear it.
- **Learn slowly** stops each note on the line until you hit the right pad. No timing pressure.
- **Practice** loops the pattern. With auto speed-up on, every loop at 90% or better adds 5 BPM until full speed.
- **Play for stars** is one scored run. 60% earns one star, 80% two, 92% three. The third star needs full speed.

Earning one star unlocks the next lesson. **Unlock every lesson** in Settings is there for grown-ups.

### Writing new lessons

Lessons live in `js/lessons.js`. Each bar is a drum grid, one character per step:

```js
{
  id: 'my-groove', title: 'My groove', bpm: 90, startBpm: 65,
  steps: ['First instruction.', 'Second.', 'Third.'],
  tip: 'A coaching tip.',
  patterns: {
    groove: { hihat: 'xxxxxxxx', snare: '--x---x-', kick: 'x---x---' },
    fill:   { snare: 'RL------', tom1: '--RL----', tom2: '----RL--', tom3: '------RL' }
  },
  form: ['groove', 'groove', 'groove', 'fill'],
  chords: ['C', 'G', 'Am', 'F'], style: 'eighths'
}
```

- String length sets the grid: 4 = quarter notes, 8 = eighths, 16 = sixteenths, 12 = triplets.
- `x` hit, `R` / `L` hit with that hand (shown on the note), `o` open hi-hat, `-` rest.
- Lanes: `hihat`, `crash`, `snare`, `tom1`, `tom2`, `tom3`, `ride`, `kick`.
- `chords` (one per bar) and `style` (`eighths`, `pulse`, `dance`, `half`) drive the backing band. Leave them out for click only.

All grooves are original or are basic patterns every drummer learns. To keep clear of copyright, don't add lessons that recreate a specific recorded song's drum part or melody.

## Files

```
index.html            page shell
css/styles.css        all styling
js/core.js            lanes, colours, helpers
js/storage.js         players, progress, settings (saved in the browser)
js/input.js           USB-MIDI, on-screen pads, keyboard; note mapping
js/audio.js           synthesised drums, click, backing band
js/lessons.js         the course
js/engine.js          song clock, timing judge, learn/practice/perform modes
js/highway.js         the falling-note display
js/app.js             screens
sw.js, manifest.webmanifest, icons/   install-to-home-screen and offline support
fonts/                Unbounded and Atkinson Hyperlegible (SIL Open Font Licence)
```

No build step and no dependencies. Progress is stored per browser, so each device keeps its own players and stars.

## Ideas for next steps

- Native iPad wrapper so the kit works on the iPad.
- Keyboard (piano) lessons: a second lane layout keyed to MIDI note numbers, same engine.
- Hit strength (velocity) lessons for accents and dynamics.
- A lesson editor so kids can write grooves for each other.
- Practice streaks and a weekly goal.
