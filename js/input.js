'use strict';
/*
 * Input layer: turns USB-MIDI drum kits, on-screen pads and computer keys
 * into one stream of "hits": {lane, vel, t (performance.now ms), source, note}.
 *
 * A future native iPad wrapper only needs to call
 *   window.veytraMidi(statusByte, data1, data2, performanceNowMs)
 * for every incoming MIDI message, and the rest of the app works unchanged.
 */
(function (V) {
  // General MIDI drum notes, plus common alternates used by Alesis, Roland and Yamaha modules.
  var GM_MAP = {
    35: 'kick', 36: 'kick',
    37: 'snare', 38: 'snare', 39: 'snare', 40: 'snare',
    42: 'hihat', 46: 'hihat', 22: 'hihat', 26: 'hihat',
    49: 'crash', 57: 'crash', 55: 'crash', 52: 'crash',
    51: 'ride', 59: 'ride', 53: 'ride',
    48: 'tom1', 50: 'tom1',
    45: 'tom2', 47: 'tom2',
    41: 'tom3', 43: 'tom3', 58: 'tom3'
    // 44 (hi-hat pedal "chick") is left out on purpose so pressing the pedal isn't a hit.
  };

  var hits = V.emitter();
  var raw = V.emitter();
  var status = V.emitter();

  var input = V.input = {
    onHit: hits.on,
    onRaw: raw.on,
    onStatus: status.on,
    defaultMap: GM_MAP,
    midiSupported: typeof navigator.requestMIDIAccess === 'function',
    state: 'idle',          // idle | connecting | ready | denied | unsupported
    devices: [],
    access: null,
    lastSource: null,

    map: function () { return V.store.settings.noteMap || GM_MAP; },
    laneForNote: function (n) { return this.map()[n] || null; },
    hasKit: function () { return this.state === 'ready' && this.devices.length > 0; },

    emitHit: function (lane, vel, t, source, note) {
      this.lastSource = source;
      hits.emit({ lane: lane, vel: vel, t: t, source: source, note: note });
    },

    handleMidi: function (bytes, ts) {
      if (!bytes || bytes.length < 3) return;
      var cmd = bytes[0] & 0xf0;
      if (cmd !== 0x90 || bytes[2] === 0) return; // only note-on with velocity
      var now = performance.now();
      // MIDI timestamps share performance.now()'s clock; fall back if missing or odd.
      var t = (ts && Math.abs(now - ts) < 1000) ? ts : now;
      var note = bytes[1];
      var vel = bytes[2];
      var lane = this.laneForNote(note);
      raw.emit({ note: note, vel: vel, t: t, lane: lane });
      if (lane) this.emitHit(lane, vel, t, 'midi', note);
    },

    connectMidi: function () {
      var self = this;
      if (!this.midiSupported) { this.setState('unsupported'); return Promise.resolve(false); }
      if (this.access) { this.refresh(); return Promise.resolve(true); }
      this.setState('connecting');
      return navigator.requestMIDIAccess({ sysex: false }).then(function (access) {
        self.access = access;
        access.onstatechange = function () { self.refresh(); };
        self.refresh();
        return true;
      }).catch(function () {
        self.setState('denied');
        return false;
      });
    },

    refresh: function () {
      var self = this;
      var devs = [];
      this.access.inputs.forEach(function (inp) {
        inp.onmidimessage = function (e) { self.handleMidi(e.data, e.timeStamp); };
        if (inp.state !== 'disconnected') devs.push(inp.name || 'MIDI device');
      });
      this.devices = devs;
      this.setState('ready');
    },

    setState: function (s) { this.state = s; status.emit(s); },

    // Reconnect silently on load if the browser already granted MIDI access.
    autoConnect: function () {
      var self = this;
      if (!this.midiSupported) { this.setState('unsupported'); return; }
      try {
        navigator.permissions.query({ name: 'midi' }).then(function (p) {
          if (p.state === 'granted') self.connectMidi();
        }).catch(function () {});
      } catch (e) { /* permissions API missing */ }
    },

    statusLabel: function () {
      switch (this.state) {
        case 'ready': return this.devices.length ? this.devices[0] : 'No kit found';
        case 'connecting': return 'Connecting';
        case 'denied': return 'MIDI blocked';
        case 'unsupported': return 'On-screen pads';
        default: return 'Connect kit';
      }
    }
  };

  // Native bridge for a future iOS/Android wrapper.
  window.veytraMidi = function (s, d1, d2, ts) { input.handleMidi([s, d1, d2], ts); };

  // Computer keyboard: A S D F G H J for the lanes, Space for kick.
  window.addEventListener('keydown', function (e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var lane = V.KEY_TO_LANE[(e.key || '').toLowerCase()];
    if (!lane) return;
    var screen = document.body.dataset.screen;
    if (screen === 'play' || screen === 'kit') e.preventDefault();
    else if (lane === 'kick') return; // let Space work normally on menus
    input.emitHit(lane, 100, e.timeStamp || performance.now(), 'keys', null);
  });
})(window.V);
