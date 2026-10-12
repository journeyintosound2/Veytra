'use strict';
/*
 * Audio: synthesised drums (no samples, so nothing to license), metronome
 * and a simple backing band. Everything is scheduled on the Web Audio clock.
 */
(function (V) {
  var A = V.audio = {
    ctx: null,
    master: null,
    buses: {},
    noise: null,
    _offset: null,

    ensure: function () {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        var c = this.ctx = new AC({ latencyHint: 'interactive' });
        this.master = c.createGain();
        this.master.gain.value = V.store.settings.volume;
        var comp = c.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.ratio.value = 4;
        this.master.connect(comp);
        comp.connect(c.destination);
        var self = this;
        ['drums', 'click', 'music'].forEach(function (n) {
          var g = c.createGain();
          g.connect(self.master);
          self.buses[n] = g;
        });
        this.buses.drums.gain.value = 0.9;
        this.buses.click.gain.value = 0.55;
        this.buses.music.gain.value = 0.45;
        this.noise = makeNoise(c);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },

    setVolume: function (v) {
      V.store.settings.volume = v;
      if (this.master) this.master.gain.value = v;
    },

    // Convert a performance.now() time to the audio clock, so a sound
    // scheduled for "beat 3" leaves the speakers when beat 3 crosses the line.
    perfToCtx: function (perfMs) {
      var c = this.ctx;
      var sample = null;
      if (c.getOutputTimestamp) {
        var ts = c.getOutputTimestamp();
        if (ts && ts.performanceTime > 0) sample = ts.contextTime - ts.performanceTime / 1000;
      }
      if (sample === null) {
        var lat = c.outputLatency || c.baseLatency || 0;
        sample = c.currentTime - performance.now() / 1000 - lat;
      }
      // Smooth jitter between calls.
      if (this._offset === null || Math.abs(sample - this._offset) > 0.04) this._offset = sample;
      else this._offset = this._offset * 0.9 + sample * 0.1;
      return perfMs / 1000 + this._offset;
    },

    drum: function (lane, when, vel, open) {
      var c = this.ensure();
      if (!c) return;
      var t = Math.max(when == null ? c.currentTime : when, c.currentTime);
      var v = V.clamp((vel == null ? 100 : vel) / 127, 0.15, 1);
      var out = this.buses.drums;
      switch (lane) {
        case 'kick': kick(c, out, t, v); break;
        case 'snare': snare(c, out, t, v); break;
        case 'hihat': noiseHit(c, out, t, 0.32 * v, open ? 0.32 : 0.05, 'highpass', 7500); break;
        case 'crash':
          noiseHit(c, out, t, 0.38 * v, 1.3, 'highpass', 4800);
          noiseHit(c, out, t, 0.16 * v, 0.6, 'bandpass', 3200, 0.8);
          break;
        case 'ride':
          noiseHit(c, out, t, 0.18 * v, 0.7, 'bandpass', 8200, 1.4);
          tone(c, out, t, 'triangle', 2450, 2450, 0.07 * v, 0.45);
          tone(c, out, t, 'sine', 3700, 3700, 0.04 * v, 0.3);
          break;
        case 'tom1': tom(c, out, t, v, 250); break;
        case 'tom2': tom(c, out, t, v, 190); break;
        case 'tom3': tom(c, out, t, v, 130); break;
      }
    },

    click: function (when, accent) {
      var c = this.ensure();
      if (!c) return;
      var t = Math.max(when, c.currentTime);
      tone(c, this.buses.click, t, 'triangle', accent ? 1760 : 1320, accent ? 1760 : 1320, accent ? 0.7 : 0.45, 0.045);
    },

    bass: function (when, midi, dur, level) {
      var c = this.ctx;
      var t = Math.max(when, c.currentTime);
      var o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(midi);
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(260, t + dur);
      f.Q.value = 2;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level || 0.4, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(this.buses.music);
      o.start(t); o.stop(t + dur + 0.05);
    },

    chord: function (when, midis, dur, level) {
      var c = this.ctx;
      var t = Math.max(when, c.currentTime);
      var self = this;
      midis.forEach(function (m, i) {
        [-6, 6].forEach(function (det) {
          var o = c.createOscillator();
          o.type = 'triangle';
          o.frequency.value = mtof(m);
          o.detune.value = det + i;
          var g = c.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime((level || 0.06), t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g); g.connect(self.buses.music);
          o.start(t); o.stop(t + dur + 0.05);
        });
      });
    }
  };

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function makeNoise(c) {
    var len = c.sampleRate * 2;
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function envGain(c, t, peak, decay, dest) {
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.002 + decay);
    g.connect(dest);
    return g;
  }

  function noiseHit(c, out, t, peak, decay, type, freq, q) {
    var s = c.createBufferSource();
    s.buffer = A.noise;
    var f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q || 0.7;
    var g = envGain(c, t, peak, decay, out);
    s.connect(f); f.connect(g);
    s.start(t, Math.random() * 1.5);
    s.stop(t + decay + 0.05);
  }

  function tone(c, out, t, type, f0, f1, peak, decay) {
    var o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
    var g = envGain(c, t, peak, decay, out);
    o.connect(g);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  function kick(c, out, t, v) {
    tone(c, out, t, 'sine', 155, 46, 1.0 * v, 0.42);
    noiseHit(c, out, t, 0.18 * v, 0.012, 'highpass', 2500);
  }
  function snare(c, out, t, v) {
    noiseHit(c, out, t, 0.6 * v, 0.17, 'highpass', 1700);
    tone(c, out, t, 'triangle', 200, 150, 0.45 * v, 0.1);
  }
  function tom(c, out, t, v, f) {
    tone(c, out, t, 'sine', f, f * 0.68, 0.85 * v, 0.38);
    noiseHit(c, out, t, 0.06 * v, 0.05, 'bandpass', f * 4, 1);
  }

  /* ---------- Backing band ---------- */
  var NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

  function parseChord(name) {
    var m = /^([A-G](?:#|b)?)(m?)/.exec(name || 'C');
    var root = NOTE_IDX[m ? m[1] : 'C'];
    var minor = !!(m && m[2] === 'm');
    var bass = 40 + ((root - 4 + 12) % 12);        // E2..D#3
    var voices = [root, root + (minor ? 3 : 4), root + 7].map(function (n) {
      var midi = 60 + n;
      while (midi > 70) midi -= 12;
      return midi;
    });
    return { bass: bass, voices: voices };
  }

  V.backing = {
    // Called for every half-beat (eighth note) from beat 0 onwards.
    step: function (lesson, beat, when, secPerBeat, beatsPerBar, loopBeats) {
      if (!lesson.chords || !lesson.chords.length || !A.ctx) return;
      var inLoop = ((beat % loopBeats) + loopBeats) % loopBeats;
      var bar = Math.floor(inLoop / beatsPerBar);
      var bb = inLoop - bar * beatsPerBar; // beat within bar, 0, 0.5, 1 ...
      var ch = parseChord(lesson.chords[bar % lesson.chords.length]);
      var on = Math.abs(bb - Math.round(bb)) < 1e-6;
      switch (lesson.style || 'eighths') {
        case 'dance':
          if (!on) { A.bass(when, ch.bass + 12, secPerBeat * 0.4, 0.42); A.chord(when, ch.voices, secPerBeat * 0.35, 0.05); }
          break;
        case 'pulse':
          if (bb === 0 || bb === 1.5 || bb === 2) A.bass(when, ch.bass, secPerBeat * 0.8, 0.42);
          if (bb === 1 || bb === 3) A.chord(when, ch.voices, secPerBeat * 0.45, 0.06);
          break;
        case 'half':
          if (bb === 0 || bb === 1.5) A.bass(when, ch.bass, secPerBeat * 1.2, 0.42);
          if (bb === 0) A.chord(when, ch.voices, secPerBeat * beatsPerBar * 0.95, 0.045);
          break;
        default: // eighths
          A.bass(when, ch.bass, secPerBeat * 0.42, on ? 0.4 : 0.28);
          if (bb === 0) A.chord(when, ch.voices, secPerBeat * beatsPerBar * 0.95, 0.04);
      }
    }
  };
})(window.V);
