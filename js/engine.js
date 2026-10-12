'use strict';
/*
 * Game engine: turns a lesson into timed notes, runs the song clock,
 * judges hits, and schedules clicks, backing and demo drums.
 *
 * Song position is measured in beats. Beat 0 is the first beat after the count-in.
 */
(function (V) {
  function clean(s) { return String(s).replace(/[\s|]/g, ''); }

  // Lesson patterns are drum-grid strings, one character per step:
  //   x = hit   R / L = hit with right / left hand   o = open hi-hat   - = rest
  // The string length sets the grid: 4 = quarters, 8 = eighths, 16 = sixteenths, 12 = triplets.
  V.buildChart = function (lesson) {
    var bpb = lesson.beatsPerBar || 4;
    var notes = [];
    var bars = [];
    var beat = 0;
    lesson.form.forEach(function (name) {
      var pat = lesson.patterns[name];
      if (!pat) { console.warn('Missing pattern', name, 'in', lesson.id); return; }
      var lanes = Object.keys(pat).filter(function (k) { return V.LANE[k]; });
      var steps = clean(pat[lanes[0]]).length;
      lanes.forEach(function (lane) {
        var s = clean(pat[lane]);
        if (s.length !== steps) console.warn('Uneven pattern lengths in', lesson.id, name, lane);
        for (var i = 0; i < s.length; i++) {
          var ch = s[i];
          if (ch === '-' || ch === '.') continue;
          notes.push({
            t: beat + i * (bpb / s.length),
            lane: lane,
            stick: (ch === 'R' || ch === 'L') ? ch : null,
            open: ch === 'o'
          });
        }
      });
      bars.push({ start: beat, name: name, steps: steps });
      beat += bpb;
    });
    notes.sort(function (a, b) {
      return (a.t - b.t) || (V.LANES.indexOf(a.lane) - V.LANES.indexOf(b.lane));
    });
    return { notes: notes, bars: bars, totalBeats: beat, beatsPerBar: bpb };
  };

  var STRICT = { relaxed: 1.4, normal: 1, strict: 0.75 };

  function Session(opts) {
    var s = V.store.settings;
    this.lesson = opts.lesson;
    this.mode = opts.mode;               // listen | learn | practice | perform | calibrate
    this.bpm = opts.bpm;
    this.startBpm = opts.bpm;
    this.autoSpeed = opts.autoSpeed !== false;
    this.chart = V.buildChart(this.lesson);
    this.bpb = this.chart.beatsPerBar;
    this.loopBeats = this.chart.totalBeats;
    this.loops = this.mode === 'practice';

    var events = V.events();
    this.on = events.on;
    this._emit = events.emit;

    this.notes = [];
    this.loopsBuilt = 0;
    this.loopAgg = [];
    this.loopDone = [];
    this.loopResults = [];
    this.offsets = [];
    this.combo = 0;
    this.maxCombo = 0;
    this.wrong = 0;
    this.addLoop();
    if (this.loops) this.addLoop();

    this.leadIn = this.bpb;               // one bar of count-in
    this.baseBeat = -this.leadIn;
    this.basePerf = 0;
    this.schedBeat = -this.leadIn;
    this.running = false;
    this.paused = false;
    this.done = false;

    this.latency = this.mode === 'calibrate' ? 0 : (s.latencyMs || 0);
    var k = STRICT[s.strictness] || 1;
    this.win = this.mode === 'calibrate'
      ? { perfect: 40, good: 85, ok: 280 }
      : { perfect: 40 * k, good: 85 * k, ok: 135 * k };

    var used = {};
    this.chart.notes.forEach(function (n) { used[n.lane] = true; });
    this.usedLanes = used;
  }

  Session.prototype = {
    addLoop: function () {
      var k = this.loopsBuilt++;
      var off = k * this.loopBeats;
      var self = this;
      this.chart.notes.forEach(function (n) {
        self.notes.push({
          t: n.t + off, lane: n.lane, stick: n.stick, open: n.open,
          loop: k, judged: null, offset: null, judgedAt: 0, scheduled: false
        });
      });
      this.loopAgg[k] = { perfect: 0, good: 0, ok: 0, miss: 0, extra: 0 };
    },

    msPerBeat: function () { return 60000 / this.bpm; },
    beatAt: function (perf) {
      if (!this.running || this.paused) return this.baseBeat;
      return this.baseBeat + (perf - this.basePerf) / this.msPerBeat();
    },
    perfAtBeat: function (b) { return this.basePerf + (b - this.baseBeat) * this.msPerBeat(); },

    start: function () {
      V.audio.ensure();
      this.basePerf = performance.now() + 120;
      this.running = true;
      this._emit('start');
    },

    setBpm: function (bpm) {
      var now = performance.now();
      this.baseBeat = this.beatAt(now);
      this.basePerf = now;
      this.bpm = V.clamp(Math.round(bpm), 30, 220);
      this.schedBeat = Math.max(this.schedBeat, Math.ceil(this.baseBeat * 2) / 2);
      this._emit('tempo', this.bpm);
    },

    pendingGroup: function () {
      var t = null, group = [];
      for (var i = 0; i < this.notes.length; i++) {
        var n = this.notes[i];
        if (n.judged) continue;
        if (t === null) t = n.t;
        if (Math.abs(n.t - t) < 1e-6) group.push(n);
        else if (n.t > t) break;
      }
      return t === null ? null : { t: t, notes: group };
    },

    progress: function (now) {
      if (this.loops) return ((this.beatAt(now) % this.loopBeats) + this.loopBeats) % this.loopBeats / this.loopBeats;
      return V.clamp(this.beatAt(now) / this.loopBeats, 0, 1);
    },

    /* ---------- per-frame update ---------- */
    update: function (now) {
      if (!this.running || this.done) return;
      var beat = this.beatAt(now);
      var mspb = this.msPerBeat();
      var self = this;

      if (this.mode === 'learn') {
        var g = this.pendingGroup();
        if (g && !this.paused && beat >= g.t) {
          this.baseBeat = g.t;
          this.paused = true;
          this._emit('wait', g);
        }
      } else if (this.mode === 'listen') {
        this.notes.forEach(function (n) {
          if (!n.judged && beat >= n.t) { n.judged = 'demo'; n.judgedAt = now; self._emit('judge', { note: n, lane: n.lane, grade: 'demo' }); }
        });
      } else {
        var lateBeat = this.beatAt(now - this.latency);
        this.notes.forEach(function (n) {
          if (!n.judged && (lateBeat - n.t) * mspb > self.win.ok) {
            n.judged = 'miss';
            n.judgedAt = now;
            self.loopAgg[n.loop].miss++;
            self.combo = 0;
            self._emit('judge', { note: n, lane: n.lane, grade: 'miss' });
          }
        });
      }

      if (this.loops) this.manageLoops(beat);
      else if (beat >= this.loopBeats + 0.5 && this.notes.every(function (n) { return n.judged; })) this.finish();

      this.schedule(now);
    },

    manageLoops: function (beat) {
      var cur = Math.floor(Math.max(0, beat) / this.loopBeats);
      while (this.loopsBuilt < cur + 2) this.addLoop();
      for (var k = 0; k < cur; k++) {
        if (this.loopDone[k]) continue;
        var pending = this.notes.some(function (n) { return n.loop === k && !n.judged; });
        if (pending) continue;
        this.loopDone[k] = true;
        var a = this.loopAgg[k];
        var acc = accuracy(a);
        this.loopResults.push({ loop: k, acc: acc, bpm: this.bpm });
        var info = { loop: k, acc: acc, bpm: this.bpm, sped: false, atTarget: this.bpm >= this.lesson.bpm };
        if (this.autoSpeed && acc >= 0.9 && this.bpm < this.lesson.bpm) {
          this.setBpm(Math.min(this.lesson.bpm, this.bpm + 5));
          info.sped = true;
          info.bpm = this.bpm;
        }
        this._emit('loop', info);
      }
      // Drop notes from loops that are well behind us.
      var keepFrom = cur - 1;
      if (this.notes.length && this.notes[0].loop < keepFrom) {
        this.notes = this.notes.filter(function (n) { return n.loop >= keepFrom; });
      }
    },

    /* ---------- audio scheduling ---------- */
    schedule: function (now) {
      var A = V.audio;
      if (!A.ctx) return;
      var s = V.store.settings;
      var horizon = this.beatAt(now + 150);
      var mspb = this.msPerBeat();
      var musicMode = this.mode === 'perform' || this.mode === 'practice' || this.mode === 'listen';
      while (this.schedBeat < horizon) {
        var b = this.schedBeat;
        var when = A.perfToCtx(this.perfAtBeat(b));
        if (when >= A.ctx.currentTime - 0.03) {
          var isBeat = Math.abs(b - Math.round(b)) < 1e-6;
          if (isBeat) {
            var countIn = b < 0;
            var clickOn = countIn || this.mode === 'calibrate' || (s.metronome && this.mode !== 'learn');
            var inBar = ((Math.round(b) % this.bpb) + this.bpb) % this.bpb;
            if (clickOn) A.click(when, inBar === 0);
          }
          if (b >= 0 && musicMode && s.backing && (this.loops || b < this.loopBeats)) {
            V.backing.step(this.lesson, b, when, mspb / 1000, this.bpb, this.loopBeats);
          }
        }
        this.schedBeat += 0.5;
      }
      if (this.mode === 'listen') {
        for (var i = 0; i < this.notes.length; i++) {
          var n = this.notes[i];
          if (n.scheduled || n.t >= horizon) continue;
          n.scheduled = true;
          A.drum(n.lane, A.perfToCtx(this.perfAtBeat(n.t)), 100, n.open);
        }
      }
    },

    /* ---------- hits ---------- */
    hit: function (h) {
      if (!this.running || this.done) return;
      if (this.mode === 'listen') return;
      if (this.mode === 'learn') return this.learnHit(h);
      var t = h.t - this.latency;
      var beat = this.beatAt(t);
      if (beat < -0.6) return; // ignore count-in noodling
      var mspb = this.msPerBeat();
      var best = null, bestD = 0;
      for (var i = 0; i < this.notes.length; i++) {
        var n = this.notes[i];
        if (n.judged || n.lane !== h.lane) continue;
        var d = (beat - n.t) * mspb;
        if (Math.abs(d) <= this.win.ok && (!best || Math.abs(d) < Math.abs(bestD))) { best = n; bestD = d; }
      }
      if (best) {
        var a = Math.abs(bestD);
        var grade = a <= this.win.perfect ? 'perfect' : a <= this.win.good ? 'good' : 'ok';
        best.judged = grade;
        best.offset = bestD;
        best.judgedAt = performance.now();
        this.loopAgg[best.loop][grade]++;
        this.offsets.push(bestD);
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this._emit('judge', { note: best, lane: h.lane, grade: grade, offset: bestD });
      } else {
        var loop = this.loops ? Math.floor(Math.max(0, beat) / this.loopBeats) : 0;
        if (this.loopAgg[loop]) this.loopAgg[loop].extra++;
        this._emit('judge', { lane: h.lane, grade: 'extra' });
      }
    },

    learnHit: function (h) {
      var g = this.pendingGroup();
      if (!g) return;
      var beat = this.beatAt(h.t);
      var near = this.paused || (g.t - beat) * this.msPerBeat() <= 300;
      if (!near) return;
      var n = g.notes.find(function (x) { return !x.judged && x.lane === h.lane; });
      if (n) {
        n.judged = 'perfect';
        n.judgedAt = performance.now();
        this.loopAgg[n.loop].perfect++;
        this._emit('judge', { note: n, lane: h.lane, grade: 'learn' });
        if (g.notes.every(function (x) { return x.judged; }) && this.paused) {
          this.basePerf = performance.now();
          this.paused = false;
          this._emit('resume');
        }
      } else {
        this.wrong++;
        this._emit('judge', {
          lane: h.lane, grade: 'wrong',
          want: g.notes.filter(function (x) { return !x.judged; }).map(function (x) { return x.lane; })
        });
      }
    },

    stop: function () { this.finish(); },

    finish: function () {
      if (this.done) return;
      this.done = true;
      this.running = false;
      this._emit('end', this.result());
    },

    result: function () {
      var c = { perfect: 0, good: 0, ok: 0, miss: 0, extra: 0 };
      this.loopAgg.forEach(function (a) { Object.keys(c).forEach(function (k) { c[k] += a[k]; }); });
      var total = c.perfect + c.good + c.ok + c.miss;
      var acc = accuracy(c);
      var stars = acc >= 0.92 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0;
      var capped = false;
      if (this.mode === 'perform' && this.bpm < this.lesson.bpm && stars > 2) { stars = 2; capped = true; }
      var sorted = this.offsets.slice().sort(function (a, b) { return a - b; });
      var median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
      var mean = sorted.length ? sorted.reduce(function (s, x) { return s + x; }, 0) / sorted.length : 0;
      return {
        mode: this.mode, lessonId: this.lesson.id, bpm: this.bpm, startBpm: this.startBpm,
        acc: acc, stars: stars, capped: capped, counts: c, total: total,
        maxCombo: this.maxCombo, meanOffset: mean, medianOffset: median, hitsTimed: sorted.length,
        wrong: this.wrong, loops: this.loopResults.slice()
      };
    }
  };

  function accuracy(c) {
    var total = c.perfect + c.good + c.ok + c.miss;
    if (!total) return 0;
    return V.clamp((c.perfect + 0.75 * c.good + 0.4 * c.ok - 0.25 * c.extra) / total, 0, 1);
  }

  V.Session = Session;
})(window.V);
