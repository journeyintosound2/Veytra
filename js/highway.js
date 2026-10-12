'use strict';
/* The note highway: notes fall toward the strike line; hit them as they land. */
(function (V) {
  var SPEED_MS = { slow: 3000, normal: 2300, fast: 1700 };
  var DISPLAY = '"Unbounded", ui-rounded, system-ui, sans-serif';
  var BODY = '"Atkinson Hyperlegible", system-ui, sans-serif';

  function Highway(canvas, session) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.session = session;
    this.flash = {};      // lane -> perf time of last hit
    this.popups = [];
    this.hint = null;     // learn-mode prompt
    this.banner = null;   // {text, t0}
    this.resize();
  }

  Highway.prototype = {
    resize: function () {
      var r = this.canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var maxW = Math.min(this.w - 72, 820);
      this.laneW = maxW / V.HIGHWAY_LANES.length;
      this.x0 = (this.w - maxW) / 2;
      this.hitY = this.h - Math.max(56, this.h * 0.12);
      this.topY = 8;
    },

    laneX: function (lane) {
      var i = V.HIGHWAY_LANES.indexOf(lane);
      return this.x0 + this.laneW * i;
    },

    hitLane: function (lane) { this.flash[lane] = performance.now(); },

    feedback: function (ev) {
      var map = {
        perfect: { text: 'Perfect', color: '#E8B04B', size: 1 },
        good: { text: 'Good', color: '#F2F0FA', size: 0.85 },
        ok: { text: ev.offset < 0 ? 'Early' : 'Late', color: '#A9A3CF', size: 0.8 },
        miss: { text: 'Miss', color: '#FF6B6B', size: 0.8 },
        learn: { text: 'Yes', color: '#B8F35A', size: 0.85 },
        wrong: { text: 'Not that one', color: '#FF6B6B', size: 0.7 }
      };
      var m = map[ev.grade];
      if (!m) return;
      // One word per lane at a time, so feedback never piles up.
      this.popups = this.popups.filter(function (p) { return p.lane !== ev.lane; });
      this.popups.push({ lane: ev.lane, text: m.text, color: m.color, size: m.size, t0: performance.now() });
      if (this.popups.length > 14) this.popups.shift();
    },

    showBanner: function (text) { this.banner = { text: text, t0: performance.now() }; },

    draw: function (now) {
      var c = this.ctx, s = this.session;
      var w = this.w, h = this.h;
      var beat = s.beatAt(now);
      var mspb = s.msPerBeat();
      var visMs = SPEED_MS[V.store.settings.noteSpeed] || SPEED_MS.normal;
      var pxPerBeat = (this.hitY - this.topY) / visMs * mspb;
      var hitY = this.hitY, x0 = this.x0, lw = this.laneW;
      var hwW = lw * V.HIGHWAY_LANES.length;
      var self = this;
      var yOf = function (t) { return hitY - (t - beat) * pxPerBeat; };

      c.clearRect(0, 0, w, h);

      // Lane floors
      V.HIGHWAY_LANES.forEach(function (lane, i) {
        var x = x0 + lw * i;
        var used = s.usedLanes[lane];
        var g = c.createLinearGradient(0, self.topY, 0, hitY);
        g.addColorStop(0, 'rgba(42,37,80,0)');
        g.addColorStop(1, used ? hexA(V.LANE[lane].color, 0.10) : 'rgba(42,37,80,0.35)');
        c.fillStyle = g;
        c.fillRect(x + 2, self.topY, lw - 4, hitY - self.topY);
      });

      // Beat lines with counting
      var steps = 2; // show "&" lines
      var firstB = Math.floor(beat * steps) / steps;
      var lastB = beat + (hitY - this.topY) / pxPerBeat;
      c.textBaseline = 'middle';
      for (var b = firstB; b <= lastB; b += 1 / steps) {
        var y = yOf(b);
        if (y < this.topY || y > hitY + 40) continue;
        var whole = Math.abs(b - Math.round(b)) < 1e-6;
        var inBar = ((Math.round(b) % s.bpb) + s.bpb) % s.bpb;
        var barLine = whole && inBar === 0;
        c.fillStyle = barLine ? 'rgba(242,240,250,0.32)' : whole ? 'rgba(242,240,250,0.14)' : 'rgba(242,240,250,0.05)';
        c.fillRect(x0, y - (barLine ? 1 : 0.5), hwW, barLine ? 2 : 1);
        if (b >= 0 && x0 > 22) {
          c.font = (whole ? '700 ' : '400 ') + (whole ? 15 : 12) + 'px ' + BODY;
          c.fillStyle = whole ? 'rgba(242,240,250,0.6)' : 'rgba(242,240,250,0.3)';
          c.textAlign = 'right';
          c.fillText(whole ? String(inBar + 1) : '&', x0 - 8, y);
        }
      }

      // Strike line and receptors
      var kickFlash = flashAmt(this.flash.kick, now);
      c.fillStyle = kickFlash > 0 ? hexA(V.LANE.kick.color, 0.35 + 0.65 * kickFlash) : 'rgba(242,240,250,0.55)';
      roundRect(c, x0, hitY - 2, hwW, 4 + kickFlash * 6, 2);
      c.fill();
      V.HIGHWAY_LANES.forEach(function (lane, i) {
        var x = x0 + lw * i, col = V.LANE[lane].color;
        var f = flashAmt(self.flash[lane], now);
        var used = s.usedLanes[lane];
        c.globalAlpha = used ? 1 : 0.35;
        c.strokeStyle = col;
        c.lineWidth = 2;
        noteShape(c, lane, x + lw / 2, hitY, lw * 0.78, 22);
        if (f > 0) { c.fillStyle = hexA(col, 0.25 + 0.6 * f); c.fill(); }
        c.stroke();
        // Labels under the line
        c.font = '700 ' + (lw > 70 ? 14 : 12) + 'px ' + BODY;
        c.textAlign = 'center';
        c.fillStyle = used ? col : 'rgba(169,163,207,0.6)';
        c.fillText(lw > 80 ? V.LANE[lane].name : V.LANE[lane].short, x + lw / 2, hitY + 28);
        c.globalAlpha = 1;
      });
      c.font = '700 12px ' + BODY;
      c.textAlign = 'center';
      c.fillStyle = s.usedLanes.kick ? V.LANE.kick.color : 'rgba(169,163,207,0.6)';
      c.fillText('Kick: the wide bar', x0 + hwW / 2, hitY + 46);

      // Learn-mode target pulse
      var group = s.mode === 'learn' ? s.pendingGroup() : null;
      var pulse = 0.5 + 0.5 * Math.sin(now / 160);

      // Notes: kick bars first so the hand notes sit on top.
      var notes = s.notes;
      var i, n, y2;
      for (i = 0; i < notes.length; i++) {
        n = notes[i];
        if (n.lane !== 'kick') continue;
        y2 = yOf(n.t);
        if (y2 < this.topY - 20 || y2 > h + 20) continue;
        if (!this.drawable(n, now)) continue;
        c.globalAlpha = this.noteAlpha(n, y2);
        c.fillStyle = n.judged === 'miss' ? '#5B5585' : V.LANE.kick.color;
        roundRect(c, x0 + 4, y2 - 6, hwW - 8, 12, 6);
        c.fill();
        if (group && group.notes.indexOf(n) >= 0 && !n.judged) {
          c.strokeStyle = 'rgba(242,240,250,' + (0.4 + 0.6 * pulse) + ')';
          c.lineWidth = 3;
          c.stroke();
        }
        c.globalAlpha = 1;
      }
      for (i = 0; i < notes.length; i++) {
        n = notes[i];
        if (n.lane === 'kick') continue;
        y2 = yOf(n.t);
        if (y2 < this.topY - 20 || y2 > h + 20) continue;
        if (!this.drawable(n, now)) continue;
        var nx = this.laneX(n.lane) + lw / 2;
        var col = n.judged === 'miss' ? '#5B5585' : V.LANE[n.lane].color;
        c.globalAlpha = this.noteAlpha(n, y2);
        c.fillStyle = col;
        noteShape(c, n.lane, nx, y2, lw * 0.74, 20);
        c.fill();
        // top sheen
        c.fillStyle = 'rgba(255,255,255,0.28)';
        noteShape(c, n.lane, nx, y2 - 4, lw * 0.5, 6);
        c.fill();
        if (n.open) {
          c.strokeStyle = '#F2F0FA';
          c.lineWidth = 2;
          c.beginPath(); c.arc(nx, y2 - 20, 6, 0, Math.PI * 2); c.stroke();
        }
        if (n.stick) {
          c.fillStyle = '#1E1A3A';
          c.font = '900 12px ' + DISPLAY;
          c.textAlign = 'center';
          c.fillText(n.stick, nx, y2 + 1);
        }
        if (group && group.notes.indexOf(n) >= 0 && !n.judged) {
          c.strokeStyle = 'rgba(242,240,250,' + (0.4 + 0.6 * pulse) + ')';
          c.lineWidth = 3;
          noteShape(c, n.lane, nx, y2, lw * 0.74 + 8, 28);
          c.stroke();
        }
        c.globalAlpha = 1;
      }

      // Hit bursts
      for (i = 0; i < notes.length; i++) {
        n = notes[i];
        if (!n.judged || n.judged === 'miss') continue;
        var age = now - n.judgedAt;
        if (age > 260) continue;
        var k = age / 260;
        var bx = n.lane === 'kick' ? x0 + hwW / 2 : this.laneX(n.lane) + lw / 2;
        var bw = n.lane === 'kick' ? hwW : lw * 0.8;
        c.globalAlpha = 1 - k;
        c.strokeStyle = n.judged === 'perfect' ? '#E8B04B' : V.LANE[n.lane].color;
        c.lineWidth = 3;
        noteShape(c, n.lane === 'kick' ? 'snare' : n.lane, bx, hitY, bw * (1 + k * 0.5), 22 + k * 26);
        c.stroke();
        c.globalAlpha = 1;
      }

      // Feedback words
      this.popups = this.popups.filter(function (p) { return now - p.t0 < 650; });
      this.popups.forEach(function (p) {
        var a = (now - p.t0) / 650;
        var px = p.lane === 'kick' || !p.lane ? x0 + hwW / 2 : self.laneX(p.lane) + lw / 2;
        c.globalAlpha = 1 - a * a;
        c.fillStyle = p.color;
        c.font = '700 ' + Math.round(16 * p.size + (lw > 80 ? 4 : 0)) + 'px ' + DISPLAY;
        c.textAlign = 'center';
        c.fillText(p.text, px, hitY - 38 - a * 26 - (p.lane === 'kick' ? 26 : 0));
        c.globalAlpha = 1;
      });

      // Combo
      if (s.combo >= 4 && s.mode !== 'learn' && s.mode !== 'listen') {
        c.font = '900 ' + (w > 600 ? 34 : 26) + 'px ' + DISPLAY;
        c.textAlign = 'right';
        c.fillStyle = '#E8B04B';
        c.fillText(String(s.combo), x0 + hwW - 6, this.topY + 30);
        c.font = '700 12px ' + BODY;
        c.fillStyle = '#A9A3CF';
        c.fillText('in a row', x0 + hwW - 6, this.topY + 56);
      }

      // Count-in
      if (beat < 0 && s.running) {
        var num = Math.floor(beat) + s.leadIn + 1;
        var frac = beat - Math.floor(beat);
        c.globalAlpha = 1 - frac * 0.7;
        c.font = '900 ' + Math.round(Math.min(w, h) * 0.22) + 'px ' + DISPLAY;
        c.textAlign = 'center';
        c.fillStyle = '#F2F0FA';
        c.fillText(String(Math.max(1, num)), w / 2, h * 0.42);
        c.globalAlpha = 1;
      }

      // Learn-mode prompt
      if (s.mode === 'learn' && s.paused && group) {
        var want = group.notes.filter(function (x) { return !x.judged; }).map(function (x) { return x.lane; });
        var msg = 'Hit the ' + V.laneList(want);
        c.font = '700 ' + (w > 600 ? 22 : 18) + 'px ' + DISPLAY;
        c.textAlign = 'center';
        var tw = c.measureText(msg).width + 40, th = w > 600 ? 52 : 44, ty = h * 0.3;
        c.fillStyle = 'rgba(23,20,46,0.92)';
        roundRect(c, w / 2 - tw / 2, ty - th / 2, tw, th, th / 2);
        c.fill();
        c.strokeStyle = V.LANE[want[0]].color;
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = '#F2F0FA';
        c.fillText(msg, w / 2, ty + 1);
      }

      // Banner (tempo up, etc.)
      if (this.banner) {
        var ba = (now - this.banner.t0) / 1800;
        if (ba >= 1) this.banner = null;
        else {
          c.globalAlpha = ba < 0.8 ? 1 : (1 - ba) / 0.2;
          c.font = '700 ' + (w > 600 ? 24 : 18) + 'px ' + DISPLAY;
          c.textAlign = 'center';
          c.fillStyle = '#B8F35A';
          c.fillText(this.banner.text, w / 2, h * 0.22);
          c.globalAlpha = 1;
        }
      }
    },

    drawable: function (n, now) {
      if (!n.judged || n.judged === 'miss') return true;
      return false; // hit notes vanish into a burst
    },
    // Missed notes fade out as they slide past the line.
    noteAlpha: function (n, y) {
      if (n.judged !== 'miss') return 1;
      return Math.max(0, 0.45 * (1 - Math.max(0, y - this.hitY) / 18));
    }
  };

  function flashAmt(t, now) {
    if (!t) return 0;
    var a = (now - t) / 160;
    return a >= 1 ? 0 : 1 - a;
  }

  function hexA(hex, a) {
    var v = parseInt(hex.slice(1), 16);
    return 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',' + a + ')';
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Cymbals are lens-shaped, drums are rounded bars — shape carries meaning, not just colour.
  function noteShape(c, lane, cx, cy, w, h) {
    if (V.LANE[lane] && V.LANE[lane].cymbal) {
      c.beginPath();
      c.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else {
      roundRect(c, cx - w / 2, cy - h / 2, w, h, Math.min(8, h / 2));
    }
  }

  V.Highway = Highway;
  V.hexA = hexA;
})(window.V);
